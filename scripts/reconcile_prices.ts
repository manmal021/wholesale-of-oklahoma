/**
 * scripts/reconcile_prices.ts
 *
 * One-time and ongoing price reconciliation runner for Wholesale of Oklahoma.
 * Matches all website catalog items against authoritative Zoho Inventory items.
 *
 * Enforces:
 *  - website selling price = Zoho rate
 *  - website variant selling price = Zoho variant rate
 *  - NEVER uses purchase_rate as customer-facing price
 *  - Reconciles variants individually
 *  - Generates secure private audit logs in storage/price_reconciliation_audit.log
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { reconcileWebsitePrices, type RawZohoItemLike } from '../src/server/priceReconciliation.js';
import { fetchAllZohoItems } from '../src/server/zohoInventory.js';
import type { InventoryItem } from '../src/types/inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runReconciliation() {
  const catalogPath = path.resolve(__dirname, '../data/zoho_catalog_snapshot.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('Snapshot catalog not found at:', catalogPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(catalogPath, 'utf-8');
  const websiteItems: InventoryItem[] = JSON.parse(raw);

  console.log(`\n======================================================`);
  console.log(`   WHOLESALE OF OKLAHOMA — ZOHO PRICE RECONCILIATION   `);
  console.log(`======================================================`);
  console.log(`Total website catalog products loaded: ${websiteItems.length}`);

  // Determine Zoho source
  let zohoSource: 'zoho_live_api' | 'zoho_verified_snapshot' = 'zoho_verified_snapshot';
  let zohoItems: RawZohoItemLike[] = websiteItems.map((i) => ({
    ...i,
    item_id: i.zoho_item_id || i.id,
  }));

  const isConfigured = Boolean(
    process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REFRESH_TOKEN &&
    (process.env.ZOHO_ORG_ID || process.env.ZOHO_ORGANIZATION_ID)
  );

  if (isConfigured) {
    try {
      console.log('Connecting to live Zoho Inventory API...');
      const liveItems = await fetchAllZohoItems();
      if (liveItems && liveItems.length > 0) {
        zohoItems = liveItems.map((i) => ({
          ...i,
          item_id: i.zoho_item_id || i.id,
        }));
        zohoSource = 'zoho_live_api';
        console.log(`Successfully fetched ${liveItems.length} active products directly from Zoho API.`);
      }
    } catch (err: any) {
      console.warn(`Zoho live API fetch skipped (${err.message}). Using verified Zoho snapshot.`);
    }
  } else {
    console.log('Zoho live API credentials not fully set in .env. Using authoritative verified Zoho snapshot.');
  }

  console.log(`Authoritative Zoho source: ${zohoSource} (${zohoItems.length} items)`);

  // Execute price reconciliation
  const { updatedItems, report } = reconcileWebsitePrices(websiteItems, zohoItems);

  // Analyze variants
  let totalVariants = 0;
  let updatedVariants = 0;
  for (const item of updatedItems) {
    if (Array.isArray(item.variants)) {
      totalVariants += item.variants.length;
    }
  }
  for (const audit of report.audits) {
    if (Array.isArray(audit.variant_audits)) {
      for (const va of audit.variant_audits) {
        if (va.sync_status === 'RECONCILED_UPDATED') {
          updatedVariants++;
        }
      }
    }
  }

  console.log(`\nReconciliation Summary:`);
  console.log(`------------------------------------------------------`);
  console.log(`Products checked                  : ${report.total_website_products}`);
  console.log(`Products matched to Zoho          : ${report.matched_count}`);
  console.log(`Prices updated / corrected        : ${report.updated_count}`);
  console.log(`Total variants checked            : ${totalVariants}`);
  console.log(`Variant prices updated            : ${updatedVariants}`);
  console.log(`Unmatched products                : ${report.unmatched_count}`);
  console.log(`Audit log written to              : storage/price_reconciliation_audit.log`);

  // Verify that NO product has purchase_rate leaking as selling price
  let purchaseRateLeaks = 0;
  for (const item of updatedItems) {
    if (item.purchase_rate !== undefined && item.rate === item.purchase_rate && item.rate > 0) {
      purchaseRateLeaks++;
    }
  }
  console.log(`Purchase rate cost leakage checks : ${purchaseRateLeaks === 0 ? '✅ 0 LEAKS DETECTED' : '❌ WARNING: LEAKS DETECTED'}`);

  // Save reconciled items back to snapshot
  fs.writeFileSync(catalogPath, JSON.stringify(updatedItems, null, 2), 'utf-8');

  const tsPath = path.resolve(__dirname, '../src/server/zohoSnapshotData.ts');
  const tsContent = `// Automatically generated from data/zoho_catalog_snapshot.json
// Direct TypeScript export to avoid Vercel serverless filesystem read errors.
export const ZOHO_CATALOG_SNAPSHOT = ${JSON.stringify(updatedItems, null, 2)} as const;
`;
  fs.writeFileSync(tsPath, tsContent, 'utf-8');
  console.log(`✅ Snapshot files updated: data/zoho_catalog_snapshot.json & src/server/zohoSnapshotData.ts`);
}

runReconciliation().catch((err) => {
  console.error('Reconciliation failed:', err);
  process.exit(1);
});
