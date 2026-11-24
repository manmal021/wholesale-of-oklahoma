import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresPool } from '../server/src/repositories/postgres.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'server', 'migrations');

try {
  if (!postgresPool) throw new Error('DATABASE_URL is required for PostgreSQL migrations.');

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS woo_schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const filename of migrationFiles) {
    const alreadyApplied = await postgresPool.query(
      'SELECT 1 FROM woo_schema_migrations WHERE filename = $1',
      [filename]
    );
    if (alreadyApplied.rowCount) continue;

    const sql = await fs.readFile(path.join(migrationsDir, filename), 'utf8');
    const client = await postgresPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO woo_schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log(`[PostgreSQL] Applied migration ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
} catch (error) {
  console.error('[PostgreSQL] Migration failed:', error);
  process.exitCode = 1;
} finally {
  await postgresPool?.end();
}
