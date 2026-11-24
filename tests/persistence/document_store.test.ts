import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const storagePath = path.resolve('storage', `.document-store-test-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
process.env.WOO_STORAGE_DIR = storagePath;

const { documentStore } = await import('../../server/src/services/documentStore.js');

test('local document blobs use private files and metadata lookup without a JSON index', async () => {
  const contents = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  try {
    const saved = await documentStore.saveDocument(contents, 'test license.pdf', 'business_license');
    assert.equal(saved.storageProvider, 'local');
    assert.equal(saved.originalName, 'test_license.pdf');
    assert.equal((await documentStore.getDocument(saved.id))?.objectKey, saved.objectKey);
    const retrieved = await documentStore.getDocumentBuffer(saved.id);
    assert.deepEqual(retrieved?.buffer, contents);
    await assert.rejects(fs.access(path.join(storagePath, 'documents', 'document-index.json')));
  } finally {
    await fs.rm(storagePath, { recursive: true, force: true });
  }
});
