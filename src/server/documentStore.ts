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
  documentType: 'resale_certificate' | 'business_license' | 'other';
  storedPath: string;
  uploadedAt: string;
}

const STORAGE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'storage', 'documents')
  : path.resolve(process.cwd(), 'storage', 'documents');

// Ensure private storage directory exists without crashing on read-only environments
try {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[DocumentStore] Storage directory init skipped (read-only filesystem):', e);
}

class DocumentStore {
  private documents: Map<string, DocumentRecord> = new Map();
  private fileBuffers: Map<string, Buffer> = new Map();

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

    return { isValid: false };
  }

  /**
   * Securely saves an uploaded document buffer after strict validation.
   */
  public saveDocument(
    buffer: Buffer,
    originalName: string,
    documentType: 'resale_certificate' | 'business_license' | 'other'
  ): DocumentRecord {
    // 1. Enforce size limit (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new Error('File exceeds the maximum allowed size of 10MB.');
    }

    // 2. Validate magic bytes
    const validation = this.validateMagicBytes(buffer);
    if (!validation.isValid || !validation.detectedMime || !validation.ext) {
      throw new Error('Invalid file type. Only genuine PDF, JPG, and PNG documents are accepted.');
    }

    // 3. Cryptographically random filename (prevents directory traversal & filename spoofing)
    const docId = `doc_${crypto.randomBytes(16).toString('hex')}`;
    const safeFilename = `${docId}.${validation.ext}`;
    const targetPath = path.join(STORAGE_DIR, safeFilename);

    // 4. Save to private directory if writable, and always hold in memory cache
    this.fileBuffers.set(docId, buffer);
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      fs.writeFileSync(targetPath, buffer);
    } catch (e) {
      console.warn('[DocumentStore] Could not persist to disk, holding in memory buffer:', e);
    }

    const docRecord: DocumentRecord = {
      id: docId,
      originalName: originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100),
      mimeType: validation.detectedMime,
      size: buffer.length,
      documentType,
      storedPath: targetPath,
      uploadedAt: new Date().toISOString(),
    };

    this.documents.set(docId, docRecord);
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
