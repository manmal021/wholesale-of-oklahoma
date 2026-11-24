import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { persistRelationalDiff } from '../server/src/repositories/relationalPersistence.js';
import type { DatabaseState } from '../server/src/repositories/databaseStore.js';
import { requirePostgresPool } from '../server/src/repositories/postgres.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storageDir = process.env.WOO_STORAGE_DIR ? path.resolve(process.env.WOO_STORAGE_DIR) : path.join(root, 'storage');
const candidates = [path.join(storageDir, 'database_state.json'), path.join(root, 'data', 'seed_database_state.json')];

async function findSourceFile(): Promise<string> {
  for (const candidate of candidates) {
    try { await fs.access(candidate); return candidate; } catch { /* try next source */ }
  }
  throw new Error(`No JSON database file found. Checked: ${candidates.join(', ')}`);
}

async function main(): Promise<void> {
  const resolvedSource = await findSourceFile();
  const raw = await fs.readFile(resolvedSource, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid database state: expected a JSON object at the root.');
  }
  const state = parsed as DatabaseState;
  const checksum = crypto.createHash('sha256').update(raw).digest('hex');
  const pool = requirePostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const sourceKey = path.relative(root, resolvedSource);
    const existingImport = await client.query(
      'SELECT checksum FROM woo_data_imports WHERE source_key = $1 FOR UPDATE', [sourceKey]
    );
    if (existingImport.rowCount) {
      if (existingImport.rows[0].checksum !== checksum) {
        throw new Error(`Source ${sourceKey} was already imported with a different checksum. Refusing to overwrite PostgreSQL data.`);
      }
      await client.query('ROLLBACK');
      console.log(`[PostgreSQL] ${sourceKey} was already imported; no changes made.`);
      return;
    }

    const occupied = await client.query(`
      SELECT
        (SELECT count(*) FROM woo_applications) +
        (SELECT count(*) FROM woo_customers) +
        (SELECT count(*) FROM woo_users) +
        (SELECT count(*) FROM woo_security_tokens) +
        (SELECT count(*) FROM woo_audit_logs) +
        (SELECT count(*) FROM woo_orders) +
        (SELECT count(*) FROM woo_inventory_overrides) +
        (SELECT count(*) FROM woo_product_admin_overrides) +
        (SELECT count(*) FROM woo_inventory_mismatches) +
        (SELECT count(*) FROM woo_customer_addresses) AS row_count
    `);
    if (Number(occupied.rows[0].row_count) > 0) {
      throw new Error('PostgreSQL already contains application records. Import was aborted without changing data.');
    }

    const empty: DatabaseState = {
      applications: [], customers: [], users: [], tokens: [], auditLogs: [], orders: [],
      inventoryOverrides: [], productAdminOverrides: [], inventoryMismatches: [], customerAddresses: [],
    };
    const imported: DatabaseState = {
      applications: state.applications || [], customers: state.customers || [], users: state.users || [],
      tokens: state.tokens || [], auditLogs: state.auditLogs || [], orders: state.orders || [],
      inventoryOverrides: state.inventoryOverrides || [], productAdminOverrides: state.productAdminOverrides || [],
      inventoryMismatches: state.inventoryMismatches || [], customerAddresses: state.customerAddresses || [],
      fulfillmentConfig: state.fulfillmentConfig,
      taxSettings: state.taxSettings,
    };
    await persistRelationalDiff(client, empty, imported);
    await client.query('INSERT INTO woo_data_imports (source_key, checksum) VALUES ($1, $2)', [sourceKey, checksum]);
    await client.query('COMMIT');
    console.log(`[PostgreSQL] Imported normalized JSON state from ${sourceKey}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[PostgreSQL] JSON import failed:', error);
  process.exitCode = 1;
});
