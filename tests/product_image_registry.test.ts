import { test } from 'node:test';
import assert from 'node:assert';
import { productImageRegistry } from '../src/server/productImageRegistry';
import { inventoryStore } from '../src/server/inventoryStore';

test('Image Registry: All 35 catalog items return exact verified URLs and never generic gallery fallbacks', () => {
  const audits = productImageRegistry.getAllAudits();
  assert.strictEqual(audits.length, 35, 'Catalog must contain 35 audited products');

  for (const audit of audits) {
    const url = productImageRegistry.getVerifiedImageUrl(audit.productId);

    assert.ok(url, `Item ${audit.productId} should have a verified image URL`);
    assert.strictEqual(audit.confidence, 'EXACT_VERIFIED', `Item ${audit.productId} should be EXACT_VERIFIED`);
    assert.strictEqual(audit.manuallyApproved, true, `Item ${audit.productId} must be manuallyApproved`);
    assert.ok(audit.sourceDomain, `Item ${audit.productId} must have a valid sourceDomain`);
    assert.ok(audit.sourceUrl, `Item ${audit.productId} must have a valid sourceUrl`);
    assert.ok(audit.matchNotes, `Item ${audit.productId} must have verification matchNotes`);
    // Strict rule: must NEVER be a generic /gallery/img_(1).jpg
    assert.strictEqual(url.includes('/gallery/img_'), false, `Item ${audit.productId} must not use generic showroom fallback`);
  }
});

test('Image Registry: Storefront inventory queryItems strips generic showroom fallbacks and respects verified image registry', () => {
  const { items } = inventoryStore.queryItems({ limit: 100 });
  assert.strictEqual(items.length, 35, 'Storefront queryItems should return all 35 catalog items');

  for (const item of items) {
    assert.ok(item.image_url, `Item ${item.name} (${item.id}) must have an image_url populated`);
    assert.strictEqual(
      item.image_url.includes('/gallery/img_'),
      false,
      `Item ${item.name} (${item.id}) must not have generic showroom fallback ${item.image_url}`
    );
  }
});

test('Image Registry: Admin can review, update, or remove image assignment (leaves unassigned item undefined)', () => {
  const targetId = 'test-review-item';

  // Add a temporary test audit
  productImageRegistry.reviewProductImage(
    'vozol-50k',
    'UPDATE_URL',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    'Admin updated image'
  );

  const updated = productImageRegistry.getAudit('vozol-50k');
  assert.ok(updated);
  assert.strictEqual(updated.imageUrl, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800');

  // Admin removes image
  productImageRegistry.reviewProductImage(
    'vozol-50k',
    'REMOVE',
    undefined,
    'Admin removed image for test'
  );

  assert.strictEqual(productImageRegistry.getVerifiedImageUrl('vozol-50k'), undefined);
  const removedAudit = productImageRegistry.getAudit('vozol-50k');
  assert.strictEqual(removedAudit?.imageUrl, undefined);
  assert.strictEqual(removedAudit?.confidence, 'NO_MATCH');

  // Restore the verified asset
  productImageRegistry.reviewProductImage(
    'vozol-50k',
    'UPDATE_URL',
    '/products/vozol-50k.png',
    'Restored verified asset'
  );
  assert.strictEqual(productImageRegistry.getVerifiedImageUrl('vozol-50k'), '/products/vozol-50k.png');
});
