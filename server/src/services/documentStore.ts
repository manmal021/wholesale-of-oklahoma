/**
 * documentStore.ts
 * Secure document storage service for business licenses & tax resale certificates.
 * Follows OWASP File Upload Guidance:
 *  - Validates magic bytes & MIME signatures
 *  - Enforces 10MB maximum upload limit
 *  - Generates cryptographic random filenames (prevents path traversal)
 *  - Stores files outside public web root in private directory
 *  - Prohibits public static access; requires admin authorization to download
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import os from 'os';

export interface DocumentRecord {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  documentType: 'sales_tax_permit' | 'resale_certificate' | 'business_license' | 'driver_license' | 'id' | 'generated_application_pdf' | 'other' | string;
  storedPath: string;
  uploadedAt: string;
}

const STORAGE_ROOT = process.env.WOO_STORAGE_DIR
  ? path.resolve(process.env.WOO_STORAGE_DIR)
  : process.env.VERCEL
    ? path.join(os.tmpdir(), 'storage')
    : path.resolve(process.cwd(), 'storage');
const STORAGE_DIR = path.join(STORAGE_ROOT, 'documents');
const INDEX_PATH = path.join(STORAGE_DIR, 'document-index.json');

// Ensure private storage directory exists without crashing on read-only environments
try {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
  }
} catch (e) {
  console.warn('[DocumentStore] Storage directory init skipped (read-only filesystem):', e);
}

class DocumentStore {
  private documents: Map<string, DocumentRecord> = new Map();
  private fileBuffers: Map<string, Buffer> = new Map();

  constructor() {
    try {
      if (!fs.existsSync(INDEX_PATH)) return;
      const records = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')) as DocumentRecord[];
      for (const record of records) {
        const extension = record.mimeType === 'application/pdf'
          ? 'pdf'
          : record.mimeType === 'image/jpeg'
            ? 'jpg'
            : record.mimeType === 'image/png'
              ? 'png'
              : record.mimeType === 'image/webp'
                ? 'webp'
                : '';
        if (!/^doc_[a-f0-9]{32}$/.test(record.id) || !extension) continue;
        this.documents.set(record.id, {
          ...record,
          storedPath: path.join(STORAGE_DIR, `${record.id}.${extension}`),
        });
      }
    } catch (error) {
      console.warn('[DocumentStore] Could not load document metadata index:', error);
    }
  }

  private persistIndex(): void {
    const temporaryPath = `${INDEX_PATH}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, JSON.stringify(Array.from(this.documents.values())), { mode: 0o600 });
      fs.renameSync(temporaryPath, INDEX_PATH);
    } catch (error) {
      try {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      } catch {
        // Preserve the original persistence error.
      }
      throw error;
    }
  }

  /**
   * Validates file buffer magic bytes to ensure file content matches allowed types.
   */
  public validateMagicBytes(buffer: Buffer): { isValid: boolean; detectedMime?: string; ext?: string } {
    if (buffer.length < 8) return { isValid: false };

    // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return { isValid: true, detectedMime: 'application/pdf', ext: 'pdf' };
    }

    // JPEG magic bytes: 0xFF 0xD8 0xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, detectedMime: 'image/jpeg', ext: 'jpg' };
    }

    // PNG magic bytes: 0x89 0x50 0x4E 0x47 (0x89 'P' 'N' 'G')
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { isValid: true, detectedMime: 'image/png', ext: 'png' };
    }

    // WebP magic bytes: RIFF....WEBP (0x52 0x49 0x46 0x46 .... 0x57 0x45 0x42 0x50)
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return { isValid: true, detectedMime: 'image/webp', ext: 'webp' };
    }

    return { isValid: false };
  }

  /**
   * Securely saves an uploaded document buffer after strict validation.
   */
  public saveDocument(
    buffer: Buffer,
    originalName: string,
    documentType: 'sales_tax_permit' | 'resale_certificate' | 'business_license' | 'driver_license' | 'id' | 'generated_application_pdf' | 'other' | string
  ): DocumentRecord {
    // 1. Enforce size limit (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new Error('File exceeds the maximum allowed size of 10MB.');
    }

    // 2. Validate magic bytes
    const validation = this.validateMagicBytes(buffer);
    if (!validation.isValid || !validation.detectedMime || !validation.ext) {
      throw new Error('Invalid file type. Only genuine PDF, JPG, PNG, and WebP documents are accepted.');
    }

    // 3. Cryptographically random filename (prevents directory traversal & filename spoofing)
    const docId = `doc_${crypto.randomBytes(16).toString('hex')}`;
    const safeFilename = `${docId}.${validation.ext}`;
    const targetPath = path.join(STORAGE_DIR, safeFilename);

    // 4. Save to the private directory before making the document available.
    const docRecord: DocumentRecord = {
      id: docId,
      originalName: originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100),
      mimeType: validation.detectedMime,
      size: buffer.length,
      documentType,
      storedPath: targetPath,
      uploadedAt: new Date().toISOString(),
    };

    fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(targetPath, buffer, { mode: 0o600 });
    this.documents.set(docId, docRecord);
    this.fileBuffers.set(docId, buffer);
    try {
      this.persistIndex();
    } catch (error) {
      this.documents.delete(docId);
      this.fileBuffers.delete(docId);
      try {
        fs.unlinkSync(targetPath);
      } catch {
        // Preserve the original persistence error.
      }
      throw new Error('Could not securely save the uploaded document. Please try again.');
    }
    return docRecord;
  }

  public getDocument(id: string): DocumentRecord | undefined {
    return this.documents.get(id);
  }

  public getDocumentBuffer(id: string): { record: DocumentRecord; buffer: Buffer } | null {
    const record = this.documents.get(id);
    if (!record) return null;

    if (this.fileBuffers.has(id)) {
      return { record, buffer: this.fileBuffers.get(id)! };
    }

    try {
      if (fs.existsSync(record.storedPath)) {
        const buffer = fs.readFileSync(record.storedPath);
        return { record, buffer };
      }
    } catch (e) {
      console.warn('[DocumentStore] Failed to read stored document:', e);
    }

    return null;
  }
}

export const documentStore = new DocumentStore();
