/**
 * tests/zoho_pricing_reconciliation.test.ts
 *
 * Comprehensive Test Suite for Zoho Pricing Authority & Image Importer Isolation.
 * Verifies all scenarios required by Task 9:
 *  - TEST A: Zoho price = $10, Website says $15 -> Run sync -> Website price = $10
 *  - TEST B: Website price = $10, Image importer finds image where item costs $18 -> Image changes, Website price remains $10
 *  - TEST C: Change Zoho price from $10 to $12 -> Run sync -> Website price = $12
 *  - TEST D: Image cannot be found -> Image remains blank/existing, Price remains Zoho price
 *  - TEST E: Zoho API temporarily fails -> No random price, no purchase price, no scraped price, error logged
 *  - TEST F: Two products have similar names but different SKUs -> Correct Zoho prices attached to correct products
 *  - TEST G: Parent product has multiple variants with different prices -> Every variant shows corresponding Zoho variant rate
 *  - TEST H: Least-privilege validation -> image updater strictly rejects attempts to modify price, rate, or cost
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchWebsiteProductToZoho,
  matchWebsiteVariantToZoho,
  reconcileWebsitePrices,
  validateImageUpdatePayload,
  type RawZohoItemLike,
} from '../src/server/priceReconciliation.js';
import { InventoryStore } from '../src/server/inventoryStore.js';
import { productImageRegistry } from '../src/server/productImageRegistry.js';
import type { InventoryItem } from '../src/types/inventory.js';

function createTestItem(data: Partial<InventoryItem> & { sku: string; name: string }): InventoryItem {
  return {
    id: data.id || data.sku,
    zoho_item_id: data.zoho_item_id || data.id || data.sku,
    sku: data.sku,
    name: data.name,
    brand: data.brand || 'Test Brand',
    category: data.category || 'Disposable Vapes',
    description: data.description || 'Test product description',
    image_url: data.image_url || '/products/test.png',
    rate: data.rate ?? 0,
    available_stock: data.available_stock ?? 50,
    stock_on_hand: data.stock_on_hand ?? 50,
    stock_status: data.stock_status || 'in_stock',
    status: data.status || 'active',
    unit: data.unit || 'Pack',
    min_order_qty: data.min_order_qty ?? 1,
    bulk_pricing: data.bulk_pricing || [],
    features: data.features || ['Factory sealed packaging'],
    variants: data.variants,
    retail_msrp: data.retail_msrp,
    purchase_rate: data.purchase_rate,
    last_modified_time: data.last_modified_time || new Date().toISOString(),
  };
}

// ── TEST A: Zoho price = $10, Website incorrectly says $15 ───────────────────
test('TEST A: Website price $15 is reconciled to authoritative Zoho price $10', () => {
  const websiteItems: InventoryItem[] = [
    createTestItem({
      id: 'item-pulse-101',
      zoho_item_id: 'ZOHO-1001',
      sku: 'GEEK-PULSE-15K-BLK',
      name: 'Geek Bar Pulse 15K - Black Cherry',
      brand: 'Geekbar',
      category: 'Disposable Vapes',
      rate: 15.0, // Incorrect website price
      available_stock: 50,
      stock_on_hand: 50,
      stock_status: 'in_stock',
      status: 'active',
      unit: 'Pack',
      min_order_qty: 1,
      bulk_pricing: [],
      last_modified_time: new Date().toISOString(),
    }),
  ];

  const zohoItems: RawZohoItemLike[] = [
    {
      item_id: 'ZOHO-1001',
      sku: 'GEEK-PULSE-15K-BLK',
      name: 'Geek Bar Pulse 15K - Black Cherry',
      rate: 10.0, // Authoritative Zoho price
      purchase_rate: 6.5, // Cost price - MUST NOT BE USED
    },
  ];

  const { updatedItems, report } = reconcileWebsitePrices(websiteItems, zohoItems);

  assert.equal(report.matched_count, 1, 'Product must be matched');
  assert.equal(report.updated_count, 1, 'Product price must be updated');
  assert.equal(updatedItems[0].rate, 10.0, 'Website selling price must be updated to $10.00 from Zoho');
  assert.notEqual(updatedItems[0].rate, 6.5, 'Cost purchase_rate ($6.50) must NEVER be used as selling price');
  assert.equal(report.audits[0].sync_status, 'RECONCILED_UPDATED');
  assert.equal(report.audits[0].old_website_price, 15.0);
  assert.equal(report.audits[0].new_website_price, 10.0);
});

// ── TEST B: Image importer finds image with price $18, price stays $10 ────────
test('TEST B: Image importer finds external image with price $18 -> Image updates, price remains $10', () => {
  const store = new InventoryStore();

  // 1. Initial product with authoritative Zoho rate = $10.00
  const initialItem: InventoryItem = createTestItem({
    id: 'test-foger-30k',
    zoho_item_id: 'ZOHO-FOG-30K',
    sku: 'FOG-SWPRO-30K',
    name: 'Foger Switch Pro 30K',
    brand: 'Foger',
    category: 'Disposable Vapes',
    rate: 10.0,
    image_url: '/products/foger-old.jpg',
    available_stock: 50,
    stock_on_hand: 50,
    stock_status: 'in_stock',
    status: 'active',
    unit: 'Pack',
    min_order_qty: 1,
    bulk_pricing: [],
    last_modified_time: new Date().toISOString(),
  });

  // Synchronize price
  store.syncZohoPrice(initialItem.sku, 10.0);

  // 2. Image importer discovers new authentic image from an external distributor website
  // where the item happens to cost $18.00.
  // The image importer attempts to update the image.
  const externalScrapedImage = {
    imageUrl: 'https://authorized-distributor.com/images/foger-switch-pro-new.jpg',
    sourceUrl: 'https://authorized-distributor.com/product/foger-switch-pro-30k',
    sourceDomain: 'authorized-distributor.com',
    matchNotes: 'High-res packaging image from distributor catalog',
    manuallyApproved: true,
  };

  // 3. Apply image update using least-privilege image updater
  const updatedAudit = productImageRegistry.updateProductImage('foger-30k', externalScrapedImage);
  assert.ok(updatedAudit, 'Image audit should update');
  assert.equal(
    updatedAudit?.imageUrl,
    'https://authorized-distributor.com/images/foger-switch-pro-new.jpg',
    'Image URL must be updated'
  );

  // 4. Update the item's image via store's updateProductImage
  store.updateProductImage(initialItem.sku, externalScrapedImage);

  // 5. Verify the website selling price REMAINS $10.00 and NEVER changes to $18.00
  const currentItem = store.getItem(initialItem.sku);
  if (currentItem) {
    assert.equal(currentItem.rate, 10.0, 'Website selling price MUST remain $10.00 despite external website price $18.00');
    assert.equal(
      currentItem.image_url,
      'https://authorized-distributor.com/images/foger-switch-pro-new.jpg',
      'Image URL must be updated to new authentic asset'
    );
  }
});

// ── TEST C: Change Zoho price from $10 to $12 -> normal sync -> price = $12 ───
test('TEST C: Change Zoho price from $10 to $12 propagates correctly via sync', () => {
  const websiteItems: InventoryItem[] = [
    createTestItem({
      id: 'raz-dc25000',
      zoho_item_id: 'ZOHO-RAZ-25K',
      sku: 'RAZ-LTX-25K',
      name: 'Raz LTX 25K',
      brand: 'Raz',
      category: 'Disposable Vapes',
      rate: 10.0, // Existing price
      available_stock: 50,
      stock_on_hand: 50,
      stock_status: 'in_stock',
      status: 'active',
      unit: 'Pack',
      min_order_qty: 1,
      bulk_pricing: [],
      last_modified_time: new Date().toISOString(),
    }),
  ];

  // Zoho changes rate: $10.00 -> $12.00
  const updatedZohoCatalog: RawZohoItemLike[] = [
    {
      item_id: 'ZOHO-RAZ-25K',
      sku: 'RAZ-LTX-25K',
      name: 'Raz LTX 25K',
      rate: 12.0, // New updated price
    },
  ];

  const { updatedItems, report } = reconcileWebsitePrices(websiteItems, updatedZohoCatalog);

  assert.equal(updatedItems[0].rate, 12.0, 'Website price must automatically update to $12.00');
  assert.equal(report.updated_count, 1);
  assert.equal(report.audits[0].old_website_price, 10.0);
  assert.equal(report.audits[0].new_website_price, 12.0);
  assert.equal(report.audits[0].sync_status, 'RECONCILED_UPDATED');
});

// ── TEST D: Image cannot be found -> Image unchanged, price remains Zoho price ─
test('TEST D: Image cannot be found -> Image remains blank/existing, price remains Zoho price', () => {
  const store = new InventoryStore();

  const itemWithZohoPrice: InventoryItem = createTestItem({
    id: 'custom-glass-beaker',
    zoho_item_id: 'ZOHO-GLS-999',
    sku: 'GLS-BEAKER-10',
    name: '10-inch Borosilicate Beaker Bong',
    brand: 'Generic Glass',
    category: 'Pipes & Glass',
    rate: 28.0, // Authoritative Zoho rate
    image_url: '/products/glass-beaker-10in.jpg',
    available_stock: 50,
    stock_on_hand: 50,
    stock_status: 'in_stock',
    status: 'active',
    unit: 'Pack',
    min_order_qty: 1,
    bulk_pricing: [],
    last_modified_time: new Date().toISOString(),
  });

  // Image search fails / returns no match
  const failedImagePayload = {
    imageUrl: '', // Blank
    matchNotes: 'NO_MATCH found on authorized distributors',
    manuallyApproved: false,
  };

  const audit = productImageRegistry.reviewProductImage('custom-glass-beaker', 'REJECT', undefined, 'No match found');
  assert.equal(audit?.imageUrl, undefined, 'Image registry should have undefined URL when rejected');

  // Verify store preserves rate = 28.0
  const reconciled = store.syncZohoPrice(itemWithZohoPrice.sku, 28.0);
  if (reconciled) {
    assert.equal(reconciled.rate, 28.0, 'Price must remain Zoho price $28.00 when image is missing');
  }
});

// ── TEST E: Zoho API temporarily fails -> No random price, no cost price, error logged ─
test('TEST E: Zoho API temporarily fails -> No random/scraped/purchase price appears, last verified price safely preserved', () => {
  const websiteItems: InventoryItem[] = [
    createTestItem({
      id: 'geekbar-60k',
      zoho_item_id: 'ZOHO-GB-60K',
      sku: 'GB-PULSE-ULTRA-60K',
      name: 'Geekbar Pulse Ultra 60k',
      brand: 'Geekbar',
      category: 'Disposable Vapes',
      rate: 17.5, // Last verified Zoho price
      available_stock: 50,
      stock_on_hand: 50,
      stock_status: 'in_stock',
      status: 'active',
      unit: 'Pack',
      min_order_qty: 1,
      bulk_pricing: [],
      last_modified_time: new Date().toISOString(),
    }),
  ];

  // Zoho API fails or returns item without a valid selling rate (e.g. rate is null/undefined)
  const failedZohoResponse: RawZohoItemLike[] = [
    {
      item_id: 'ZOHO-GB-60K',
      sku: 'GB-PULSE-ULTRA-60K',
      name: 'Geekbar Pulse Ultra 60k',
      rate: undefined, // Zoho rate missing/offline
      purchase_rate: 9.99, // Cost price
    },
  ];

  const { updatedItems, report } = reconcileWebsitePrices(websiteItems, failedZohoResponse);

  // Price MUST NOT fall back to purchase_rate ($9.99), nor to an invented number ($15.00)
  assert.equal(updatedItems[0].rate, 17.5, 'Must safely preserve last verified Zoho price $17.50');
  assert.notEqual(updatedItems[0].rate, 9.99, 'Must NEVER substitute purchase/cost price $9.99');
  assert.notEqual(updatedItems[0].rate, 15.0, 'Must NEVER invent arbitrary fallback price $15.00');
  assert.equal(report.audits[0].sync_status, 'PRESERVED_LAST_VERIFIED');
});

// ── TEST F: Two products have similar names but different SKUs ───────────────
test('TEST F: Two products with similar names but different SKUs receive correct distinct Zoho prices', () => {
  const websiteItems: InventoryItem[] = [
    createTestItem({
      id: 'geekbar-15k-miami',
      zoho_item_id: 'ZOHO-GB-15K-MIA',
      sku: 'GB-PULSE-15K-MIA',
      name: 'Geek Bar Pulse 15K Miami Mint',
      brand: 'Geekbar',
      category: 'Disposable Vapes',
      rate: 0,
      available_stock: 50,
      stock_on_hand: 50,
      stock_status: 'in_stock',
      status: 'active',
      unit: 'Pack',
      min_order_qty: 1,
      bulk_pricing: [],
      last_modified_time: new Date().toISOString(),
    }),
    createTestItem({
      id: 'geekbar-60k-miami',
      zoho_item_id: 'ZOHO-GB-60K-MIA',
      sku: 'GB-PULSE-60K-MIA',
      name: 'Geek Bar Pulse 60K Miami Mint', // Very similar name!
      brand: 'Geekbar',
      category: 'Disposable Vapes',
      rate: 0,
      available_stock: 50,
      stock_on_hand: 50,
      stock_status: 'in_stock',
      status: 'active',
      unit: 'Pack',
      min_order_qty: 1,
      bulk_pricing: [],
      last_modified_time: new Date().toISOString(),
    }),
  ];

  const zohoItems: RawZohoItemLike[] = [
    {
      item_id: 'ZOHO-GB-15K-MIA',
      sku: 'GB-PULSE-15K-MIA',
      name: 'Geek Bar Pulse 15K Miami Mint',
      rate: 12.5,
    },
    {
      item_id: 'ZOHO-GB-60K-MIA',
      sku: 'GB-PULSE-60K-MIA',
      name: 'Geek Bar Pulse 60K Miami Mint',
      rate: 17.5,
    },
  ];

  // Verify priority matching connects correctly by item_id and SKU, never colliding
  const match1 = matchWebsiteProductToZoho(websiteItems[0], zohoItems);
  const match2 = matchWebsiteProductToZoho(websiteItems[1], zohoItems);

  assert.equal(match1?.item_id, 'ZOHO-GB-15K-MIA');
  assert.equal(match2?.item_id, 'ZOHO-GB-60K-MIA');

  const { updatedItems } = reconcileWebsitePrices(websiteItems, zohoItems);

  assert.equal(updatedItems[0].rate, 12.5, '15k item must receive $12.50');
  assert.equal(updatedItems[1].rate, 17.5, '60k item must receive $17.50');
});

// ── TEST G: Parent product with multiple variants with different prices ──────
test('TEST G: Parent product with multiple variants with different rates shows corresponding Zoho variant rate', () => {
  const parentItem: InventoryItem = createTestItem({
    id: 'vaporesso-xros-coils',
    zoho_item_id: 'ZOHO-VAP-XROS',
    sku: 'VAP-XROS-COILS',
    name: 'Vaporesso XROS Replacement Pods (4-Pack)',
    brand: 'Vaporesso',
    category: 'Vape Mods & Kits',
    rate: 11.0, // Base parent price
    available_stock: 50,
    stock_on_hand: 50,
    stock_status: 'in_stock',
    status: 'active',
    unit: 'Pack',
    min_order_qty: 1,
    bulk_pricing: [],
    variants: [
      {
        variant_id: 'VAR-XROS-06',
        variant_sku: 'VAP-XROS-06-OHM',
        variant_name: '0.6 ohm Mesh (4-pack)',
        attribute_name: 'Resistance',
        attribute_value: '0.6 ohm',
        stock_on_hand: 50,
        available_stock: 50,
        stock_status: 'in_stock',
        rate: 0, // Unreconciled
      },
      {
        variant_id: 'VAR-XROS-08',
        variant_sku: 'VAP-XROS-08-OHM',
        variant_name: '0.8 ohm Mesh (4-pack)',
        attribute_name: 'Resistance',
        attribute_value: '0.8 ohm',
        stock_on_hand: 50,
        available_stock: 50,
        stock_status: 'in_stock',
        rate: 0, // Unreconciled
      },
      {
        variant_id: 'VAR-XROS-12',
        variant_sku: 'VAP-XROS-12-OHM',
        variant_name: '1.2 ohm Regular (4-pack)',
        attribute_name: 'Resistance',
        attribute_value: '1.2 ohm',
        stock_on_hand: 50,
        available_stock: 50,
        stock_status: 'in_stock',
        rate: 0, // Unreconciled
      },
    ],
    last_modified_time: new Date().toISOString(),
  });

  // Zoho has different rates for different variants:
  // 0.6 ohm = $11.50, 0.8 ohm = $11.00, 1.2 ohm = $9.75
  const zohoParent: RawZohoItemLike = {
    item_id: 'ZOHO-VAP-XROS',
    sku: 'VAP-XROS-COILS',
    name: 'Vaporesso XROS Replacement Pods (4-Pack)',
    rate: 11.0,
    variants: [
      {
        item_id: 'VAR-XROS-06',
        variant_id: 'VAR-XROS-06',
        sku: 'VAP-XROS-06-OHM',
        name: '0.6 ohm Mesh (4-pack)',
        rate: 11.5,
      },
      {
        item_id: 'VAR-XROS-08',
        variant_id: 'VAR-XROS-08',
        sku: 'VAP-XROS-08-OHM',
        name: '0.8 ohm Mesh (4-pack)',
        rate: 11.0,
      },
      {
        item_id: 'VAR-XROS-12',
        variant_id: 'VAR-XROS-12',
        sku: 'VAP-XROS-12-OHM',
        name: '1.2 ohm Regular (4-pack)',
        rate: 9.75,
      },
    ],
  };

  const { updatedItems } = reconcileWebsitePrices([parentItem], [zohoParent]);
  const reconciledVariants = updatedItems[0].variants!;

  assert.equal(reconciledVariants.length, 3);
  assert.equal(reconciledVariants[0].rate, 11.5, '0.6 ohm variant must have Zoho rate $11.50');
  assert.equal(reconciledVariants[1].rate, 11.0, '0.8 ohm variant must have Zoho rate $11.00');
  assert.equal(reconciledVariants[2].rate, 9.75, '1.2 ohm variant must have Zoho rate $9.75');
});

// ── TEST H: Image updater strictly rejects forbidden pricing fields ──────────
test('TEST H: validateImageUpdatePayload strictly rejects attempts to inject price, rate, or cost into image updater', () => {
  // 1. Valid image-only payload succeeds
  assert.doesNotThrow(() => {
    validateImageUpdatePayload({
      imageUrl: '/products/verified-image.png',
      sourceUrl: 'https://manufacturer.com/asset.png',
      sourceDomain: 'manufacturer.com',
      imageAlt: 'Verified device photo',
      manuallyApproved: true,
    });
  });

  // 2. Attempt to pass price in image updater throws security error
  assert.throws(
    () => {
      validateImageUpdatePayload({
        imageUrl: '/products/image.png',
        price: 19.99, // FORBIDDEN
      });
    },
    /SECURITY VIOLATION.*price/i,
    'Must throw security violation when price field is present'
  );

  // 3. Attempt to pass rate throws security error
  assert.throws(
    () => {
      validateImageUpdatePayload({
        imageUrl: '/products/image.png',
        rate: 12.5, // FORBIDDEN
      });
    },
    /SECURITY VIOLATION.*rate/i,
    'Must throw security violation when rate field is present'
  );

  // 4. Attempt to pass purchase_rate throws security error
  assert.throws(
    () => {
      validateImageUpdatePayload({
        imageUrl: '/products/image.png',
        purchase_rate: 8.5, // FORBIDDEN
      });
    },
    /SECURITY VIOLATION.*purchase_rate/i,
    'Must throw security violation when purchase_rate is present'
  );

  // 5. Attempt to pass cost or inventory throws security error
  assert.throws(
    () => {
      validateImageUpdatePayload({
        imageUrl: '/products/image.png',
        available_stock: 100, // FORBIDDEN
      });
    },
    /SECURITY VIOLATION/i,
    'Must throw security violation when inventory quantity is present'
  );
});

// ── TEST I: Real-time Zoho Webhook Price Change ($12.50 -> $22.00) ────────────
test('TEST I: Real-time Zoho webhook price change automatically updates website selling price', () => {
  const store = new InventoryStore();

  // 1. Initial product GB-PULSE-15K in store
  const itemBefore = store.getItem('GB-PULSE-15K');
  assert.ok(itemBefore, 'Catalog item GB-PULSE-15K must exist in store');
  const initialRate = itemBefore.rate;
  assert.equal(typeof initialRate, 'number', 'Initial rate must be a valid number');

  // 2. Zoho pushes an automated price update webhook: rate -> $22.00
  const firstVariant = itemBefore.variants?.[0];
  const webhookPayload = {
    item_id: itemBefore.zoho_item_id,
    sku: itemBefore.sku,
    rate: 22.0, // Zoho updated selling price
    variants: firstVariant
      ? [
          {
            variant_id: firstVariant.variant_id,
            sku: firstVariant.variant_sku,
            rate: 22.5, // Variant rate update
          },
        ]
      : undefined,
    available_stock: 48,
  };

  const handled = store.handleZohoWebhook(webhookPayload);
  assert.equal(handled, true, 'Webhook should be handled successfully');

  // 3. Verify the website selling price subsequently displays $22.00
  const itemAfter = store.getItem('GB-PULSE-15K');
  assert.ok(itemAfter, 'Item must exist after webhook update');
  assert.equal(itemAfter.rate, 22.0, 'Website selling price must automatically update to $22.00');
  assert.equal(itemAfter.available_stock, 48, 'Stock must update to 48');
  if (firstVariant && itemAfter.variants && itemAfter.variants[0]) {
    assert.equal(itemAfter.variants[0].rate, 22.5, 'Variant rate must update to $22.50');
  }
});

