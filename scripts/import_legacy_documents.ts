import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { requirePostgresPool } from '../server/src/repositories/postgres.js';

interface LegacyDocument {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  documentType: string;
  uploadedAt: string;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storage = path.resolve(process.env.WOO_STORAGE_DIR || path.join(root, 'storage'));
const documentDirectory = path.join(storage, 'documents');
const indexPath = path.join(documentDirectory, 'document-index.json');
const bucket = process.env.S3_BUCKET;
const s3 = bucket ? new S3Client({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION }) : null;
const extensionByMime: Record<string, string> = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};

async function main(): Promise<void> {
  if ((process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') && !bucket) {
    throw new Error('S3_BUCKET is required to import attachments in production.');
  }
  const raw = await fs.readFile(indexPath, 'utf8');
  const records = JSON.parse(raw) as LegacyDocument[];
  if (!Array.isArray(records)) throw new Error('Legacy document index must contain an array.');
  const pool = requirePostgresPool();
  const client = await pool.connect();
  const uploadedKeys: string[] = [];
  try {
    await client.query('BEGIN');
    for (const record of records) {
      const extension = extensionByMime[record.mimeType];
      if (!/^doc_[a-f0-9]{32}$/.test(record.id) || !extension) continue;
      const filename = `${record.id}.${extension}`;
      const localPath = path.join(documentDirectory, filename);
      const bytes = await fs.readFile(localPath);
      if (bytes.length !== record.size) throw new Error(`Stored size mismatch for ${record.id}; import stopped.`);
      const objectKey = `documents/${filename}`;
      const provider = bucket ? 's3' : 'local';
      const existing = await client.query('SELECT object_key, storage_provider FROM woo_documents WHERE id=$1', [record.id]);
      if (existing.rowCount) {
        if (existing.rows[0].object_key !== objectKey || existing.rows[0].storage_provider !== provider) {
          throw new Error(`Document ${record.id} already exists with different storage metadata.`);
        }
        continue;
      }
      if (bucket) {
        await s3!.send(new PutObjectCommand({
          Bucket: bucket, Key: objectKey, Body: bytes, ContentType: record.mimeType,
          ServerSideEncryption: 'AES256',
        }));
        uploadedKeys.push(objectKey);
      }
      await client.query(
        `INSERT INTO woo_documents
          (id,original_name,mime_type,size_bytes,document_type,object_key,storage_provider,uploaded_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [record.id, record.originalName, record.mimeType, record.size, record.documentType,
          objectKey, provider, record.uploadedAt]
      );
    }
    await client.query('COMMIT');
    console.log(`[PostgreSQL] Imported legacy attachment metadata${bucket ? ' and uploaded blobs to S3' : ''}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    if (bucket) {
      await Promise.all(uploadedKeys.map((Key) =>
        s3!.send(new DeleteObjectCommand({ Bucket: bucket, Key })).catch(() => undefined)
      ));
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[PostgreSQL] Legacy document import failed:', error);
  process.exitCode = 1;
});
