/**
 * Private document storage with relational metadata and interchangeable S3/local blobs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { postgresPool } from '../repositories/postgres.js';

export interface DocumentRecord {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  documentType: 'sales_tax_permit' | 'resale_certificate' | 'business_license' | 'driver_license' | 'id' | 'generated_application_pdf' | 'other' | string;
  objectKey: string;
  storageProvider: 'local' | 's3';
  uploadedAt: string;
}

const storageRoot = path.resolve(process.env.WOO_STORAGE_DIR || path.join(process.cwd(), 'storage'));
const localDocumentDirectory = path.join(storageRoot, 'documents');
const s3Bucket = process.env.WOO_TEST_MODE === 'true' ? undefined : process.env.S3_BUCKET;
const isProduction = process.env.WOO_TEST_MODE !== 'true' &&
  (process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL_ENV === 'production'));
const s3 = s3Bucket ? new S3Client({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION }) : null;
const testMetadata = new Map<string, DocumentRecord>();

function extensionForMime(mime: string): string | undefined {
  return ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[mime];
}

function recordFromRow(row: Record<string, any>): DocumentRecord {
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: Number(row.size_bytes),
    documentType: row.document_type,
    objectKey: row.object_key,
    storageProvider: row.storage_provider,
    uploadedAt: new Date(row.uploaded_at).toISOString(),
  };
}

class DocumentStore {
  public validateMagicBytes(buffer: Buffer): { isValid: boolean; detectedMime?: string; ext?: string } {
    if (buffer.length < 8) return { isValid: false };
    if (buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) return { isValid: true, detectedMime: 'application/pdf', ext: 'pdf' };
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { isValid: true, detectedMime: 'image/jpeg', ext: 'jpg' };
    if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return { isValid: true, detectedMime: 'image/png', ext: 'png' };
    if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') {
      return { isValid: true, detectedMime: 'image/webp', ext: 'webp' };
    }
    return { isValid: false };
  }

  public async saveDocument(
    buffer: Buffer,
    originalName: string,
    documentType: DocumentRecord['documentType']
  ): Promise<DocumentRecord> {
    if (buffer.length > 10 * 1024 * 1024) throw new Error('File exceeds the maximum allowed size of 10MB.');
    const validation = this.validateMagicBytes(buffer);
    if (!validation.isValid || !validation.detectedMime || !validation.ext) {
      throw new Error('Invalid file type. Only genuine PDF, JPG, PNG, and WebP documents are accepted.');
    }
    if (isProduction && !s3Bucket) throw new Error('S3_BUCKET is required for production document storage.');

    const id = `doc_${crypto.randomBytes(16).toString('hex')}`;
    const objectKey = `documents/${id}.${validation.ext}`;
    const storageProvider = s3Bucket ? 's3' : 'local';
    const record: DocumentRecord = {
      id,
      originalName: originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100),
      mimeType: validation.detectedMime,
      size: buffer.length,
      documentType,
      objectKey,
      storageProvider,
      uploadedAt: new Date().toISOString(),
    };

    if (storageProvider === 's3') {
      await s3!.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: record.mimeType,
        ServerSideEncryption: 'AES256',
      }));
    } else {
      await fs.mkdir(localDocumentDirectory, { recursive: true, mode: 0o700 });
      await fs.writeFile(path.join(localDocumentDirectory, path.basename(objectKey)), buffer, { mode: 0o600, flag: 'wx' });
    }

    try {
      if (postgresPool) {
        await postgresPool.query(
          `INSERT INTO woo_documents
             (id, original_name, mime_type, size_bytes, document_type, object_key, storage_provider, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [record.id, record.originalName, record.mimeType, record.size, record.documentType,
            record.objectKey, record.storageProvider, record.uploadedAt]
        );
      } else {
        testMetadata.set(id, record);
      }
    } catch (error) {
      if (storageProvider === 's3') {
        await s3!.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: objectKey })).catch(() => undefined);
      } else {
        await fs.unlink(path.join(localDocumentDirectory, path.basename(objectKey))).catch(() => undefined);
      }
      throw new Error('Could not securely save the uploaded document. Please try again.', { cause: error });
    }
    return record;
  }

  public async getDocument(id: string): Promise<DocumentRecord | undefined> {
    if (!/^doc_[a-f0-9]{32}$/.test(id)) return undefined;
    if (postgresPool) {
      const { rows } = await postgresPool.query('SELECT * FROM woo_documents WHERE id = $1', [id]);
      return rows[0] ? recordFromRow(rows[0]) : undefined;
    }
    return testMetadata.get(id);
  }

  public async getDocumentBuffer(id: string): Promise<{ record: DocumentRecord; buffer: Buffer } | null> {
    const record = await this.getDocument(id);
    if (!record) return null;
    try {
      if (record.storageProvider === 's3') {
        if (!s3 || !s3Bucket) return null;
        const response = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: record.objectKey }));
        const bytes = await response.Body?.transformToByteArray();
        return bytes ? { record, buffer: Buffer.from(bytes) } : null;
      }
      const buffer = await fs.readFile(path.join(localDocumentDirectory, path.basename(record.objectKey)));
      return { record, buffer };
    } catch (error) {
      console.warn('[DocumentStore] Failed to read stored document:', error);
      return null;
    }
  }
}

export const documentStore = new DocumentStore();
