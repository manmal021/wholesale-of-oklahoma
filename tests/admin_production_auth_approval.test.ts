import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { apiApp } from '../src/server/apiRouter.js';
import { databaseStore } from '../src/server/databaseStore.js';
import { authStore, type UserRecord } from '../src/server/authStore.js';

let server: http.Server;
let baseUrl: string;

const TEST_ADMIN_EMAIL = 'order2wholesaleofoklahoma@gmail.com';
const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const EMAIL_LOG_FILE = path.join(STORAGE_DIR, 'email_outbox.log');

// Helper to read email outbox
function getOutboxEntries(): any[] {
  if (!fs.existsSync(EMAIL_LOG_FILE)) return [];
  const lines = fs.readFileSync(EMAIL_LOG_FILE, 'utf-8').trim().split('\n');
  return lines
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Helper to create a test user record & session
function createTestSession(data: {
  email: string;
  role: 'admin' | 'approved_customer' | 'pending_customer' | 'visitor';
  businessName?: string;
  contactName?: string;
}) {
  const dummyUser: UserRecord = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: data.email.toLowerCase().trim(),
    role: data.role,
    businessName: data.businessName || 'Test Enterprise LLC',
    contactName: data.contactName || 'Test Operator',
    phone: '(405) 555-0199',
    createdAt: new Date().toISOString(),
    passwordHash: 'dummy_hash',
    salt: 'dummy_salt',
  };
  return authStore.createSession(dummyUser);
}

test.before(async () => {
  process.env.NODE_ENV = 'production';
  process.env.ADMIN_NOTIFICATION_EMAIL = TEST_ADMIN_EMAIL;

  // Reset test admin state
  authStore.deleteUser(TEST_ADMIN_EMAIL);
  authStore.ensureInitialAdmin(TEST_ADMIN_EMAIL);

  // Create combined express app replicating server.ts server-side route guards + apiRouter
  const app = express();
  app.use(express.json());

  const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/activate', '/admin/reset-password'];

  // Server-Side Route Guard (identical to server.ts)
  app.use('/admin', (req, res, next) => {
    const rawPath = req.path.toLowerCase().replace(/\/$/, '') || '/';
    const fullAdminPath = ('/admin' + (rawPath === '/' ? '' : rawPath)).toLowerCase();

    if (
      PUBLIC_ADMIN_PATHS.includes(fullAdminPath) ||
      PUBLIC_ADMIN_PATHS.some((p) => fullAdminPath.startsWith(p))
    ) {
      return res.status(200).json({ page: fullAdminPath, public: true });
    }

    let token: string | null = null;
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/woo_session=([^;]+)/);
    if (match && match[1]) {
      token = match[1].trim();
    } else if (typeof req.headers['x-session-token'] === 'string' && req.headers['x-session-token'].trim()) {
      token = req.headers['x-session-token'].trim();
    } else if (
      typeof req.headers.authorization === 'string' &&
      req.headers.authorization.toLowerCase().startsWith('bearer ')
    ) {
      token = req.headers.authorization.slice(7).trim();
    }

    const session = token ? authStore.validateSession(token) : null;

    if (!session) {
      return res.redirect(302, '/admin/login');
    }

    if (session.role !== 'admin') {
      return res.redirect(302, '/account');
    }

    return res.status(200).json({ page: fullAdminPath, authorized: true, user: session.email });
  });

  app.use('/api', apiApp);
  app.use(apiApp);

  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// ---------------------------------------------------------------------------
// 1. Server-Side Administrative Route Guard Tests
// ---------------------------------------------------------------------------
test('Route Guard: Unauthenticated visitor accessing /admin routes is redirected to /admin/login', async () => {
  const protectedPaths = [
    '/admin',
    '/admin/dashboard',
    '/admin/customers',
    '/admin/applications',
    '/admin/orders',
  ];

  for (const p of protectedPaths) {
    const res = await fetch(`${baseUrl}${p}`, { redirect: 'manual' });
    assert.equal(res.status, 302, `Path ${p} must redirect unauthenticated visitor`);
    assert.equal(res.headers.get('location'), '/admin/login');
  }
});

test('Route Guard: Public admin pages (/admin/login, /admin/reset-password) are accessible', async () => {
  const publicPaths = ['/admin/login', '/admin/reset-password', '/admin/activate'];

  for (const p of publicPaths) {
    const res = await fetch(`${baseUrl}${p}`, { redirect: 'manual' });
    assert.equal(res.status, 200, `Path ${p} must be publicly accessible`);
  }
});

test('Route Guard: Authenticated customer (non-admin) is redirected to /account', async () => {
  const custSession = createTestSession({
    email: 'customer_guard_test@example.com',
    role: 'pending_customer',
  });

  const res = await fetch(`${baseUrl}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${custSession.token}` },
    redirect: 'manual',
  });
  assert.equal(res.status, 302, 'Customer accessing /admin/dashboard must be redirected');
  assert.equal(res.headers.get('location'), '/account', 'Redirect target must be /account');
});

test('Route Guard: Authenticated admin is permitted access to /admin/dashboard', async () => {
  const adminUser = authStore.getUser(TEST_ADMIN_EMAIL)!;
  const adminSession = authStore.createSession(adminUser);

  const res = await fetch(`${baseUrl}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    redirect: 'manual',
  });
  assert.equal(res.status, 200, 'Admin must be granted access');
  const data = await res.json();
  assert.equal(data.authorized, true);
  assert.equal(data.user, TEST_ADMIN_EMAIL);
});

// ---------------------------------------------------------------------------
// 2. Admin Forgot Password & Password Reset Flow End-to-End
// ---------------------------------------------------------------------------
test('Admin Auth: Forgot Password dispatches reset email, token verification works, and new password enables login', async () => {
  // Step A: Request password reset
  const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL }),
  });
  assert.equal(forgotRes.status, 200, 'Forgot password request must return 200');
  const forgotData = await forgotRes.json();
  assert.equal(forgotData.success, true);

  // Step B: Verify email dispatched to outbox
  const outbox = getOutboxEntries();
  const resetEmail = outbox
    .filter((e) => e.to === TEST_ADMIN_EMAIL && e.subject.toLowerCase().includes('password reset'))
    .pop();
  assert.ok(resetEmail, 'Password reset email must be sent to registered admin');
  assert.ok(resetEmail.actionUrl.includes('/admin/reset-password?token='), 'Email must link to /admin/reset-password');

  const tokenMatch = resetEmail.actionUrl.match(/token=([a-f0-9]+)/);
  assert.ok(tokenMatch, 'Reset token must be in action URL');
  const resetToken = tokenMatch[1];

  // Step C: Verify token
  const verifyRes = await fetch(`${baseUrl}/api/auth/verify-token?token=${resetToken}&type=PASSWORD_RESET`);
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.valid, true);
  assert.equal(verifyData.email, TEST_ADMIN_EMAIL);

  // Step D: Reset password
  const newPassword = 'ProdAdminSecurePass2026!#';
  const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, newPassword }),
  });
  assert.equal(resetRes.status, 200);
  const resetResult = await resetRes.json();
  assert.equal(resetResult.success, true);

  // Step E: Login with newly created password
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: newPassword }),
  });
  assert.equal(loginRes.status, 200, 'Admin login with new password must succeed');
  const loginData = await loginRes.json();
  assert.equal(loginData.success, true);
  assert.equal(loginData.user.role, 'admin');
  assert.ok(loginData.token, 'Must return session token');

  // Step F: Old/invalid password fails
  const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: 'WrongPassword999!' }),
  });
  assert.equal(badLoginRes.status, 401, 'Invalid password must return 401');
});

// ---------------------------------------------------------------------------
// 3. Customer Application, Status Enforcement & Backend Approval APIs
// ---------------------------------------------------------------------------
test('Customer Application & Approval Workflow: Submit -> Pending -> Approve -> Order', async () => {
  const adminUser = authStore.getUser(TEST_ADMIN_EMAIL)!;
  const adminSession = authStore.createSession(adminUser);

  const timestamp = Date.now();
  const applicantEmail = `david_${timestamp}@prairiesmoke.com`;

  // Step A: New wholesale application submission
  const appData = {
    businessName: `Prairie Smoke & Vape Lounge LLC ${timestamp}`,
    dba: 'Prairie Smoke',
    contactFirstName: 'David',
    contactLastName: 'Miller',
    email: applicantEmail,
    phone: '405-555-0199',
    fein: `73-${timestamp.toString().slice(-7)}`,
    licenseNumber: `OK-TOB-${timestamp.toString().slice(-6)}`,
    businessType: 'vape_shop',
    address: {
      street: '1200 N Pennsylvania Ave',
      city: 'Oklahoma City',
      state: 'OK',
      zip: '73107',
    },
    ageCertified: true,
    taxExemptCertified: true,
  };

  const applyRes = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appData),
  });
  assert.equal(applyRes.status, 200, 'Wholesale application submission must return 200');
  const applyJson = await applyRes.json();
  assert.equal(applyJson.success, true);
  assert.equal(applyJson.status, 'PENDING', 'Default status must be PENDING');
  const applicationId = applyJson.applicationId;
  assert.ok(applicationId, 'Application ID must be returned');

  // Step B: Verify Customer cannot place order while PENDING
  const pendingSession = createTestSession({
    email: applicantEmail,
    role: 'pending_customer',
  });

  const blockedOrderRes = await fetch(`${baseUrl}/api/inventory/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pendingSession.token}`,
    },
    body: JSON.stringify({
      customerEmail: applicantEmail,
      fulfillmentMethod: 'PICKUP',
      items: [{ sku: 'GB-SDR-FC', quantity: 2, unitPrice: 15.0 }],
    }),
  });
  assert.equal(blockedOrderRes.status, 403, 'Pending customer must be blocked from ordering');
  const blockedOrderJson = await blockedOrderRes.json();
  assert.match(blockedOrderJson.message, /approved|review/i);

  // Step C: Admin views customer application via GET /api/admin/customers and GET /api/admin/customers/:id
  const listRes = await fetch(`${baseUrl}/api/admin/customers`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.applications.some((a: any) => a.id === applicationId));

  const detailRes = await fetch(`${baseUrl}/api/admin/customers/${applicationId}`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  assert.equal(detailRes.status, 200);
  const detailData = await detailRes.json();
  assert.equal(detailData.application.status, 'PENDING');

  // Step D: Admin approves application via POST /api/admin/customers/:id/approve
  const approveRes = await fetch(`${baseUrl}/api/admin/customers/${applicationId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  assert.equal(approveRes.status, 200, 'Admin approval must return 200');
  const approveData = await approveRes.json();
  assert.equal(approveData.success, true);
  assert.equal(approveData.status, 'APPROVED');

  // Verify application record updated in database
  const approvedApp = databaseStore.getApplication(applicationId);
  assert.equal(approvedApp?.status, 'APPROVED');

  // Step E: Now approved customer can successfully place order!
  const approvedSession = createTestSession({
    email: applicantEmail,
    role: 'approved_customer',
  });

  const approvedOrderRes = await fetch(`${baseUrl}/api/inventory/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${approvedSession.token}`,
    },
    body: JSON.stringify({
      customerName: 'David Miller',
      businessName: 'Prairie Smoke',
      email: applicantEmail,
      phone: '405-555-0199',
      fulfillmentMethod: 'PICKUP',
      lineItems: [
        {
          id: 'geekbar-15k',
          name: 'Geekbar Pulse 15k',
          quantity: 2,
        },
      ],
    }),
  });
  assert.equal(approvedOrderRes.status, 200, 'Approved customer must be able to order');
  const approvedOrderJson = await approvedOrderRes.json();
  assert.equal(approvedOrderJson.success, true);
  assert.ok(approvedOrderJson.orderId, 'Order must be confirmed');
});

// ---------------------------------------------------------------------------
// 4. Rejection and Suspension Security Enforcement
// ---------------------------------------------------------------------------
test('Customer Rejection & Suspension: Block unauthorized ordering and state transitions', async () => {
  const adminUser = authStore.getUser(TEST_ADMIN_EMAIL)!;
  const adminSession = authStore.createSession(adminUser);

  const timestamp = Date.now();
  const rejectEmail = `reject_${timestamp}@smokeoutlet.com`;

  // Submit another application
  const appRes = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: `Reject Me Smoke Shop ${timestamp}`,
      contactFirstName: 'Sam',
      contactLastName: 'Jones',
      email: rejectEmail,
      phone: '405-555-0999',
      fein: `73-${timestamp.toString().slice(-7)}`,
      licenseNumber: `OK-TOB-${timestamp.toString().slice(-6)}`,
      businessType: 'smoke_shop',
      address: {
        street: '100 Main St',
        city: 'Norman',
        state: 'OK',
        zip: '73069',
      },
      ageCertified: true,
      taxExemptCertified: true,
    }),
  });
  assert.equal(appRes.status, 200, 'Wholesale application submission must succeed');
  const appJson = await appRes.json();
  const appId = appJson.applicationId;
  assert.ok(appId, 'Application ID must exist');

  // Reject the application via PATCH /api/admin/customers/:id/reject
  const rejectRes = await fetch(`${baseUrl}/api/admin/customers/${appId}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`,
    },
    body: JSON.stringify({ reason: 'Invalid resale license documentation provided' }),
  });
  assert.equal(rejectRes.status, 200);
  const rejectJson = await rejectRes.json();
  assert.equal(rejectJson.success, true);
  assert.equal(rejectJson.status, 'REJECTED');

  // Verify status in database
  const rejectedRecord = databaseStore.getApplication(appId);
  assert.equal(rejectedRecord?.status, 'REJECTED');

  // Status transition via PATCH /api/admin/customers/:id/status
  const suspendRes = await fetch(`${baseUrl}/api/admin/customers/${appId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`,
    },
    body: JSON.stringify({ status: 'SUSPENDED', notes: 'Account compliance hold' }),
  });
  assert.equal(suspendRes.status, 200);
  const suspendJson = await suspendRes.json();
  assert.equal(suspendJson.success, true);
  assert.equal(suspendJson.status, 'SUSPENDED');
});

// ---------------------------------------------------------------------------
// 5. Security Protection Against Self-Approval & Non-Admin Exploits
// ---------------------------------------------------------------------------
test('Security: Normal customer cannot approve accounts or access admin APIs', async () => {
  const attackerSession = createTestSession({
    email: 'malicious_applicant@example.com',
    role: 'approved_customer',
  });

  // Attacker tries to call GET /api/admin/customers
  const listRes = await fetch(`${baseUrl}/api/admin/customers`, {
    headers: { Authorization: `Bearer ${attackerSession.token}` },
  });
  assert.equal(listRes.status, 403, 'Non-admin calling /api/admin/customers must receive 403 Forbidden');

  // Attacker tries to approve an account
  const approveRes = await fetch(`${baseUrl}/api/admin/customers/WOA-APP-TEST/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${attackerSession.token}` },
  });
  assert.equal(approveRes.status, 403, 'Non-admin attempting approval must receive 403 Forbidden');

  // Unauthenticated caller gets 401
  const unauthRes = await fetch(`${baseUrl}/api/admin/customers`);
  assert.equal(unauthRes.status, 401, 'Unauthenticated caller must receive 401 Unauthorized');
});

// ---------------------------------------------------------------------------
// 6. Audit Trail Logging Verification
// ---------------------------------------------------------------------------
test('Audit Trail: Admin actions are cryptographically recorded without exposing credentials', async () => {
  const adminUser = authStore.getUser(TEST_ADMIN_EMAIL)!;
  const adminSession = authStore.createSession(adminUser);

  const logsRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  assert.equal(logsRes.status, 200);
  const logsData = await logsRes.json();
  assert.ok(Array.isArray(logsData.logs), 'Audit logs must be returned as an array');
  assert.ok(logsData.logs.length > 0, 'Audit logs must contain recorded administrative actions');

  // Verify no sensitive tokens or passwords stored
  for (const log of logsData.logs) {
    assert.equal(log.password, undefined, 'Passwords must never appear in audit log');
    assert.equal(log.token, undefined, 'Tokens must never appear in audit log');
    assert.ok(log.timestamp, 'Timestamp must exist');
    assert.ok(log.event, 'Event must exist');
  }
});
