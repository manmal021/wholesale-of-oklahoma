import { test } from 'node:test';
import assert from 'node:assert';
import { productImageRegistry } from '../src/server/productImageRegistry';
import { inventoryStore } from '../src/server/inventoryStore';

test('Image Registry: Verified SKU assets return exact verified URLs and never generic gallery fallbacks', () => {
  const verifiedItems = [
    'geekbar-15k',
    'geekbar-25k',
    'geekbar-60k',
    'raz-25k',
  ];

  for (const id of verifiedItems) {
    const url = productImageRegistry.getVerifiedImageUrl(id);
    const audit = productImageRegistry.getAudit(id);

    assert.ok(url, `Item ${id} should have a verified image URL`);
    assert.ok(
      audit?.confidence === 'EXACT_VERIFIED' || audit?.confidence === 'HIGH_CONFIDENCE',
      `Item ${id} should have verified confidence`
    );
    assert.strictEqual(audit?.manuallyApproved, true);
    // Strict rule: must NEVER be a generic /gallery/img_(1).jpg
    assert.strictEqual(url.includes('/gallery/img_'), false, `Item ${id} must not use generic showroom fallback`);
  }
});

test('Image Registry: Unverified items return undefined (no guess / random assignment)', () => {
  const unverifiedItems = [
    'vozol-50k',
    'foger-30k',
    'vaporesso-xros-4',
    'smok-nord-coils',
    'cookies-510-battery-display',
  ];

  for (const id of unverifiedItems) {
    const url = productImageRegistry.getVerifiedImageUrl(id);
    const audit = productImageRegistry.getAudit(id);

    assert.strictEqual(url, undefined, `Unverified item ${id} must have undefined imageUrl`);
    assert.ok(audit, `Audit record must exist for ${id}`);
    assert.strictEqual(audit?.manuallyApproved, false);
    assert.ok(
      audit?.confidence === 'IMAGE_REVIEW_REQUIRED' || audit?.confidence === 'NO_MATCH',
      `Audit confidence should require review for ${id}`
    );
  }
});

test('Image Registry: Storefront inventory queryItems strips generic showroom fallbacks and respects verified image registry', () => {
  const { items } = inventoryStore.queryItems({ limit: 100 });

  for (const item of items) {
    if (item.image_url) {
      assert.strictEqual(
        item.image_url.includes('/gallery/img_'),
        false,
        `Item ${item.name} (${item.id}) must not have generic showroom fallback ${item.image_url}`
      );
    }
  }
});

test('Image Registry: Admin can review, approve or update product image assignment', () => {
  const targetId = 'vozol-50k';
  const initialAudit = productImageRegistry.getAudit(targetId);
  assert.strictEqual(initialAudit?.manuallyApproved, false);

  // Admin approves a verified packaging asset
  const updated = productImageRegistry.reviewProductImage(
    targetId,
    'UPDATE_URL',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    'Admin verified manufacturer packaging barcode'
  );

  assert.ok(updated);
  assert.strictEqual(updated?.confidence, 'EXACT_VERIFIED');
  assert.strictEqual(updated?.manuallyApproved, true);
  assert.strictEqual(productImageRegistry.getVerifiedImageUrl(targetId), updated?.imageUrl);

  // Roll back to unassigned state
  productImageRegistry.reviewProductImage(
    targetId,
    'REMOVE',
    undefined,
    'Reset to unassigned test state'
  );

  const resetAudit = productImageRegistry.getAudit(targetId);
  assert.strictEqual(resetAudit?.imageUrl, undefined);
  assert.strictEqual(resetAudit?.manuallyApproved, false);
});
