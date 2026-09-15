/**
 * scripts/reconcile_prices.ts
 *
 * One-time price reconciliation runner for Wholesale of Oklahoma.
 * Matches all website catalog items against Zoho Inventory items.
 * Enforces: website selling price = Zoho rate (and variant rate).
 * NEVER uses purchase_rate.
 * Generates secure audit logs in storage/price_reconciliation_audit.log.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { reconcileWebsitePrices } from '../src/server/priceReconciliation.js';
import type { InventoryItem } from '../src/types/inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runReconciliation() {
  const catalogPath = path.resolve(__dirname, '../data/zoho_catalog_snapshot.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('Snapshot catalog not found at:', catalogPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(catalogPath, 'utf-8');
  const items: InventoryItem[] = JSON.parse(raw);

  console.log(`\n======================================================`);
  console.log(`   WHOLESALE OF OKLAHOMA — ZOHO PRICE RECONCILIATION   `);
  console.log(`======================================================`);
  console.log(`Total website catalog products loaded: ${items.length}`);

  // Reconcile prices
  const { updatedItems, report } = reconcileWebsitePrices(items, items);

  console.log(`\nReconciliation Summary:`);
  console.log(`------------------------------------------------------`);
  console.log(`Products checked                  : ${report.total_website_products}`);
  console.log(`Products matched to Zoho          : ${report.matched_count}`);
  console.log(`Prices updated / corrected        : ${report.updated_count}`);
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

runReconciliation();
