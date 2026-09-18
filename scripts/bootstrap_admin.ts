/**
 * scripts/bootstrap_admin.ts
 *
 * Wholesale of Oklahoma — Administrator Bootstrap Utility
 *
 * Usage:
 *   npx tsx scripts/bootstrap_admin.ts
 *   npx tsx scripts/bootstrap_admin.ts custom_admin@yourdomain.com
 *   npm run admin:bootstrap
 *
 * Purpose:
 *   Securely provisions the administrator account, ensures ADMIN role authorization,
 *   generates a single-use 24-hour cryptographic activation token, dispatches the invitation email,
 *   and outputs the direct password creation link.
 */

import dotenv from 'dotenv';
dotenv.config();

import { authStore } from '../src/server/authStore.js';
import { databaseStore } from '../src/server/databaseStore.js';
import { ADMIN_EMAIL } from '../src/server/emailService.js';

async function bootstrap() {
  const targetEmail = (process.argv[2] || process.env.ADMIN_NOTIFICATION_EMAIL || ADMIN_EMAIL).trim().toLowerCase();

  console.log('\n================================================================');
  console.log('  🛡 WHOLESALE OF OKLAHOMA — SECURE ADMIN BOOTSTRAP');
  console.log('================================================================\n');
  console.log(`  Target Admin Email : ${targetEmail}`);

  // 1. Ensure user record exists with admin role
  const { user } = authStore.ensureInitialAdmin(targetEmail);
  console.log(`  User ID            : ${user.id}`);
  console.log(`  Authorization Role : ${user.role.toUpperCase()}`);

  // 2. Generate a fresh 24-hour single-use cryptographic activation token
  const { token, activationUrl } = await authStore.createAdminActivationToken(targetEmail);

  // 3. Log audit event
  databaseStore.addAuditLog({
    event: 'ADMIN_ACTIVATION_REQUESTED' as any,
    targetEmail,
    adminId: 'cli_bootstrap',
    details: { method: 'CLI_BOOTSTRAP' },
  });

  console.log('\n  ✅ Administrator account initialized and authorized.');
  console.log('  📧 Setup email dispatched via configured provider (or queued in storage/email_outbox.log).');
  console.log('\n----------------------------------------------------------------');
  console.log('  🔗 DIRECT ADMIN ACTIVATION LINK (Valid for 24 Hours):');
  console.log(`     ${activationUrl}`);
  console.log('----------------------------------------------------------------\n');
  console.log('  NEXT STEPS:');
  console.log('  1. Open the activation link in your web browser.');
  console.log('  2. Enter a strong password (minimum 8 characters).');
  console.log('  3. Submit to activate your credentials and unlock the admin portal.');
  console.log('  4. You will be redirected directly to: /admin');
  console.log('  5. In the future, sign in at: /admin/login\n');
  console.log('================================================================\n');
}

bootstrap().catch((err) => {
  console.error('\n❌ Bootstrap failed:', err.message);
  process.exit(1);
});
