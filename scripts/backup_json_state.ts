import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storageDir = process.env.WOO_STORAGE_DIR
  ? path.resolve(process.env.WOO_STORAGE_DIR)
  : path.join(root, 'storage');
const defaultSources = [
  path.join(storageDir, 'database_state.json'),
  path.join(root, 'data', 'seed_database_state.json'),
];

async function findSourceFile(explicitPath?: string): Promise<string> {
  if (explicitPath) {
    const resolved = path.resolve(explicitPath);
    await fs.access(resolved);
    return resolved;
  }

  for (const candidate of defaultSources) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`No JSON database file found. Checked: ${defaultSources.join(', ')}`);
}

async function backupJsonState(sourcePath: string): Promise<string> {
  const backupDir = path.join(storageDir, 'backups');
  await fs.mkdir(backupDir, { recursive: true, mode: 0o700 });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = crypto.randomBytes(4).toString('hex');
  const backupPath = path.join(backupDir, `database_state.${timestamp}.${suffix}.json`);

  await fs.copyFile(sourcePath, backupPath, fs.constants.COPYFILE_EXCL);
  try {
    await fs.chmod(backupPath, 0o600);
  } catch (error) {
    await fs.unlink(backupPath);
    throw error;
  }

  const [source, backup] = await Promise.all([fs.stat(sourcePath), fs.stat(backupPath)]);
  if (source.size !== backup.size) {
    await fs.unlink(backupPath);
    throw new Error('Backup verification failed: source and backup sizes differ.');
  }

  return backupPath;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    throw new Error('Usage: npm run db:backup-json [path/to/database_state.json]');
  }

  const sourcePath = await findSourceFile(args[0]);
  const backupPath = await backupJsonState(sourcePath);
  console.log(`[PostgreSQL] JSON state backed up to ${backupPath}`);
}

main().catch((error) => {
  console.error('[PostgreSQL] JSON backup failed:', error);
  process.exitCode = 1;
});
