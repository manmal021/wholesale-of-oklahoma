import { checkPostgresConnection, postgresPool } from '../server/src/repositories/postgres.js';

try {
  if (!postgresPool) throw new Error('DATABASE_URL is required to check PostgreSQL.');
  await checkPostgresConnection();
  console.log('[PostgreSQL] Connection successful.');
} catch (error) {
  console.error('[PostgreSQL] Connection failed:', error);
  process.exitCode = 1;
} finally {
  await postgresPool?.end();
}
