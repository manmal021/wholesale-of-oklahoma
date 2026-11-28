import 'dotenv/config';
import fs from 'node:fs';
import { Pool } from 'pg';
import { Signer } from '@aws-sdk/rds-signer';
import { attachDatabasePool } from '@vercel/functions';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';

function createPostgresPool(): Pool | null {
  if (process.env.WOO_TEST_MODE === 'true') {
    return process.env.WOO_TEST_DATABASE_URL
      ? new Pool({ connectionString: process.env.WOO_TEST_DATABASE_URL })
      : null;
  }

  if (process.env.NODE_ENV === 'test') return null;

  if (process.env.PGHOST) {
    const region = process.env.AWS_REGION;
    const roleArn = process.env.AWS_ROLE_ARN;
    const username = process.env.PGUSER;
    const hostname = process.env.PGHOST;
    const port = Number(process.env.PGPORT || 5432);

    if (!region || !roleArn || !username) {
      throw new Error('Aurora IAM auth requires PGHOST, PGUSER, AWS_REGION, and AWS_ROLE_ARN.');
    }

    const signer = new Signer({
      hostname,
      port,
      username,
      region,
      credentials: awsCredentialsProvider({ roleArn }),
    });

    const rootCertPath = process.env.PGSSLROOTCERT;
    if (!rootCertPath) {
      throw new Error('PGSSLROOTCERT is required for Aurora PostgreSQL TLS certificate verification.');
    }

    const pool = new Pool({
      host: hostname,
      port,
      user: username,
      database: process.env.PGDATABASE || 'wholesale_of_oklahoma',
      password: () => signer.getAuthToken(),
      ssl: { ca: fs.readFileSync(rootCertPath), rejectUnauthorized: true },
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    if (process.env.VERCEL) attachDatabasePool(pool);
    return pool;
  }

  return process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.PG_POOL_MAX || 10),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      })
    : null;
}

export const postgresPool = createPostgresPool();

export function requirePostgresPool(): Pool {
  if (!postgresPool) {
    throw new Error('DATABASE_URL or Vercel Aurora environment variables are required for PostgreSQL operations.');
  }
  return postgresPool;
}

export async function checkPostgresConnection(): Promise<void> {
  await requirePostgresPool().query('SELECT 1');
}
