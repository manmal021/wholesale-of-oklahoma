import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAllZohoItems } from '../src/server/zohoInventory.js';
import { reconcileWebsitePrices } from '../src/server/priceReconciliation.js';
import type { InventoryItem } from '../src/types/inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('================================================================');
  console.log('   WHOLESALE OF OKLAHOMA — DIRECT ZOHO CATALOG SYNC RUNNER      ');
  console.log('================================================================');

  const catalogPath = path.resolve(__dirname, '../data/zoho_catalog_snapshot.json');
  let existingCatalog: InventoryItem[] = [];
  if (fs.existsSync(catalogPath)) {
    existingCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    console.log(`Existing curated catalog snapshot: ${existingCatalog.length} items`);
  }

  console.log('Connecting directly to Zoho Inventory REST API with persistent token...');
  let liveZohoItems: InventoryItem[] = [];
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      liveZohoItems = await fetchAllZohoItems();
      break;
    } catch (err: any) {
      console.warn(`Attempt ${attempts} failed: ${err.message}`);
      if (err.message.includes('too many requests') || err.message.includes('Access Denied')) {
        console.log('Waiting 20 seconds for Zoho rate limit cooldown...');
        await new Promise(r => setTimeout(r, 20000));
      } else {
        throw err;
      }
    }
  }

  if (liveZohoItems.length === 0) {
    console.warn('⚠️ No items returned from Zoho. Aborting catalog update.');
    return;
  }

  console.log(`\nSuccessfully retrieved ${liveZohoItems.length} active products from Zoho!`);

  // Match against existing catalog
  const skuMap = new Map<string, InventoryItem>();
  const idMap = new Map<string, InventoryItem>();
  const nameMap = new Map<string, InventoryItem>();

  for (const item of existingCatalog) {
    if (item.sku) skuMap.set(item.sku.toLowerCase().trim(), item);
    if (item.id) idMap.set(item.id.toLowerCase().trim(), item);
    if (item.zoho_item_id) idMap.set(item.zoho_item_id.toLowerCase().trim(), item);
    if (item.name) nameMap.set(item.name.toLowerCase().trim(), item);
  }

  const addedNewProducts: InventoryItem[] = [];
  let updatedExistingCount = 0;

  for (const zohoItem of liveZohoItems) {
    const skuKey = zohoItem.sku ? zohoItem.sku.toLowerCase().trim() : '';
    const idKey = (zohoItem.zoho_item_id || zohoItem.id || '').toLowerCase().trim();
    const nameKey = zohoItem.name ? zohoItem.name.toLowerCase().trim() : '';

    const matchedExisting = (skuKey && skuMap.get(skuKey)) ||
                            (idKey && idMap.get(idKey)) ||
                            (nameKey && nameMap.get(nameKey));

    if (matchedExisting) {
      matchedExisting.zoho_rate = zohoItem.zoho_rate;
      matchedExisting.rate = zohoItem.rate;
      matchedExisting.available_stock = zohoItem.available_stock;
      matchedExisting.stock_on_hand = zohoItem.stock_on_hand;
      matchedExisting.stock_status = zohoItem.stock_status;
      if (zohoItem.retail_msrp) matchedExisting.retail_msrp = zohoItem.retail_msrp;
      if (zohoItem.purchase_rate) matchedExisting.purchase_rate = zohoItem.purchase_rate;
      updatedExistingCount++;
    } else {
      addedNewProducts.push(zohoItem);
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Sync Results:`);
  console.log(`  Existing curated items updated from Zoho : ${updatedExistingCount}`);
  console.log(`  New products added from Zoho            : ${addedNewProducts.length}`);
  console.log(`  Total active Zoho items                 : ${liveZohoItems.length}`);
  console.log('----------------------------------------------------------------\n');

  if (addedNewProducts.length > 0) {
    console.log('Sample of NEW products added from Zoho:');
    addedNewProducts.slice(0, 10).forEach(p => {
      console.log(`  + [${p.brand || 'General'}] ${p.name} | Zoho Rate: $${p.zoho_rate} | Web Price: $${p.rate} | Stock: ${p.available_stock}`);
    });
  }

  // Preserve curated order at the top + append all new products
  const finalCatalog = [...existingCatalog, ...addedNewProducts];

  // Run price reconciliation
  console.log('\nRunning price reconciliation on complete catalog...');
  const { updatedItems: reconciledCatalog, report } = reconcileWebsitePrices(finalCatalog, liveZohoItems as any);
  console.log(`Reconciled: ${report.matched_count} matched, ${report.updated_count} updated.`);

  // Write back to data/zoho_catalog_snapshot.json and src/server/zohoSnapshotData.ts
  fs.writeFileSync(catalogPath, JSON.stringify(reconciledCatalog, null, 2), 'utf-8');

  const tsPath = path.resolve(__dirname, '../src/server/zohoSnapshotData.ts');
  const tsContent = `// Automatically generated from data/zoho_catalog_snapshot.json\n// Direct TypeScript export to avoid Vercel serverless filesystem read errors.\nexport const ZOHO_CATALOG_SNAPSHOT = ${JSON.stringify(reconciledCatalog, null, 2)} as const;\n`;
  fs.writeFileSync(tsPath, tsContent, 'utf-8');

  console.log(`\n✅ Saved ${reconciledCatalog.length} products to data/zoho_catalog_snapshot.json`);
  console.log(`✅ Saved ${reconciledCatalog.length} products to src/server/zohoSnapshotData.ts`);
  console.log('\nSync finished successfully!');
}

main().catch(err => {
  console.error('\n❌ Sync failed:', err.message || err);
  process.exit(1);
});
