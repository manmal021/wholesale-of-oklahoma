import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.WOO_TEST_MODE === 'true'
  ? process.env.WOO_TEST_DATABASE_URL
  : process.env.NODE_ENV === 'test'
    ? undefined
    : process.env.DATABASE_URL;

export const postgresPool = connectionString
  ? new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

export function requirePostgresPool(): Pool {
  if (!postgresPool) {
    throw new Error('DATABASE_URL is required for PostgreSQL operations.');
  }
  return postgresPool;
}

export async function checkPostgresConnection(): Promise<void> {
  await requirePostgresPool().query('SELECT 1');
}
