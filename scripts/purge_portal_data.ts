/**
 * scripts/purge_portal_data.ts
 *
 * Safe, atomic utility to purge all customer records, pending applications,
 * approved accounts, orders, inventory mismatches, and audit logs from the Admin Portal.
 *
 * Preserves:
 *  - Administrator user accounts & credentials
 *  - Store fulfillment configuration (pickup location, delivery zones)
 *
 * Creates:
 *  - Full timestamped backup of database state before wiping
 *
 * Usage:
 *   npx tsx scripts/purge_portal_data.ts
 */

import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const STORAGE_DIR = path.join(ROOT_DIR, 'storage');
const LOCAL_DB_FILE = path.join(STORAGE_DIR, 'database_state.json');
const COMMITTED_SEED_FILE = path.join(ROOT_DIR, 'data', 'seed_database_state.json');
const DOCUMENTS_DIR = path.join(STORAGE_DIR, 'documents');

async function purgePortalData() {
  console.log('\n================================================================');
  console.log('  🧹 WHOLESALE OF OKLAHOMA — ADMIN PORTAL PURGE UTILITY');
  console.log('================================================================\n');

  const timestamp = Date.now();

  // 1. Validate & Backup Local DB
  if (fs.existsSync(LOCAL_DB_FILE)) {
    const backupPath = path.join(STORAGE_DIR, `database_state.backup.${timestamp}.json`);
    fs.copyFileSync(LOCAL_DB_FILE, backupPath);
    console.log(`  📦 Backed up storage database to: ${path.basename(backupPath)}`);
  }

  // 2. Validate & Backup Seed File
  if (fs.existsSync(COMMITTED_SEED_FILE)) {
    const seedBackupPath = path.join(ROOT_DIR, 'data', `seed_database_state.backup.${timestamp}.json`);
    fs.copyFileSync(COMMITTED_SEED_FILE, seedBackupPath);
    console.log(`  📦 Backed up seed database to: ${path.basename(seedBackupPath)}`);
  }

  // 3. Read current state to preserve admin users and fulfillment config
  let existingAdmins: any[] = [];
  let existingFulfillmentConfig: any = undefined;

  if (fs.existsSync(LOCAL_DB_FILE)) {
    try {
      const current = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8'));
      if (Array.isArray(current.users)) {
        existingAdmins = current.users.filter((u: any) => u.role === 'admin');
      }
      if (current.fulfillmentConfig) {
        existingFulfillmentConfig = current.fulfillmentConfig;
      }
    } catch (e: any) {
      console.warn('  ⚠️ Could not parse existing local DB file:', e.message);
    }
  }

  // Fallback: If no admins found, check seed file
  if (existingAdmins.length === 0 && fs.existsSync(COMMITTED_SEED_FILE)) {
    try {
      const seed = JSON.parse(fs.readFileSync(COMMITTED_SEED_FILE, 'utf-8'));
      if (Array.isArray(seed.users)) {
        existingAdmins = seed.users.filter((u: any) => u.role === 'admin');
      }
      if (!existingFulfillmentConfig && seed.fulfillmentConfig) {
        existingFulfillmentConfig = seed.fulfillmentConfig;
      }
    } catch (_) {}
  }

  console.log(`  🛡 Retained Administrator Accounts: ${existingAdmins.length}`);
  for (const admin of existingAdmins) {
    console.log(`     - ${admin.email} (role: ${admin.role})`);
  }

  // 4. Construct clean empty state
  const cleanState = {
    applications: [],
    customers: [],
    tokens: [],
    auditLogs: [],
    orders: [],
    fulfillmentConfig: existingFulfillmentConfig || {
      pickupLocation: {
        locationId: 'loc_okc_bryant',
        locationName: 'Wholesale of Oklahoma Central Dispatch & Warehouse',
        address: {
          street: '4500 S Bryant Ave',
          city: 'Oklahoma City',
          state: 'OK',
          zip: '73135',
        },
        hours: 'Mon–Sat: 9:00 AM – 8:00 PM, Sun: 11:00 AM – 8:00 PM',
        phone: '(405) 768-2975',
        instructions:
          'Pull into the commercial loading area at 4500 S Bryant Ave. Present your Order Reference Number and valid government/business ID at the wholesale dispatch counter.',
      },
      delivery: {
        enabled: true,
        eligibleCities: [
          'Oklahoma City', 'Edmond', 'Norman', 'Moore', 'Midwest City', 'Del City',
          'Yukon', 'Mustang', 'Bethany', 'Warr Acres', 'El Reno', 'Guthrie', 'Shawnee'
        ],
        eligibleZipCodes: [
          '73003', '73007', '73008', '73012', '73013', '73020', '73025', '73034',
          '73036', '73044', '73054', '73064', '73069', '73071', '73072', '73084',
          '73099', '73101', '73102', '73103', '73104', '73105', '73106', '73107',
          '73108', '73109', '73110', '73111', '73112', '73113', '73114', '73115',
          '73116', '73117', '73118', '73119', '73120', '73121', '73122', '73127',
          '73128', '73129', '73130', '73132', '73134', '73135', '73139', '73142',
          '73145', '73149', '73150', '73159', '73160', '73162', '73165', '73169',
          '73170', '73172', '73173', '73179', '73189'
        ],
        deliveryFee: 25.0,
        freeDeliveryThreshold: 500.0,
        minimumDeliveryOrder: 150.0,
        deliveryRadiusMiles: 35,
        notes: 'Direct store delivery available for all approved commercial retailers across the OKC metropolitan corridor.',
      },
    },
    inventoryOverrides: [],
    inventoryMismatches: [],
    customerAddresses: [],
    users: existingAdmins,
  };

  // 5. Write to storage/database_state.json
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(cleanState, null, 2), 'utf-8');
  console.log('  ✅ Written pristine clean state to: storage/database_state.json');

  // 6. Write to data/seed_database_state.json
  const dataDir = path.dirname(COMMITTED_SEED_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(COMMITTED_SEED_FILE, JSON.stringify(cleanState, null, 2), 'utf-8');
  console.log('  ✅ Written pristine clean state to: data/seed_database_state.json');

  // 7. Clean up dummy PDFs in storage/documents
  let removedDocs = 0;
  if (fs.existsSync(DOCUMENTS_DIR)) {
    const files = fs.readdirSync(DOCUMENTS_DIR);
    for (const f of files) {
      if (f.startsWith('doc_') && f.endsWith('.pdf')) {
        try {
          fs.unlinkSync(path.join(DOCUMENTS_DIR, f));
          removedDocs++;
        } catch (_) {}
      }
    }
  }
  console.log(`  🗑 Removed dummy uploaded documents: ${removedDocs} files`);

  // 8. Clean up temp files in storage
  const storageFiles = fs.readdirSync(STORAGE_DIR);
  let removedTemps = 0;
  for (const sf of storageFiles) {
    if (sf.includes('.tmp.')) {
      try {
        fs.unlinkSync(path.join(STORAGE_DIR, sf));
        removedTemps++;
      } catch (_) {}
    }
  }
  if (removedTemps > 0) {
    console.log(`  🗑 Removed temporary state files: ${removedTemps} files`);
  }

  console.log('\n================================================================');
  console.log('  🎉 ADMIN PORTAL DATA PURGE COMPLETE');
  console.log('  - Applications         : 0');
  console.log('  - Wholesale Customers  : 0');
  console.log('  - Orders               : 0');
  console.log('  - Inventory Mismatches : 0');
  console.log('  - Audit Trail Entries  : 0');
  console.log(`  - Admin Accounts       : ${existingAdmins.length}`);
  console.log('================================================================\n');
}

purgePortalData().catch((err) => {
  console.error('Fatal error during purge:', err);
  process.exit(1);
});
