import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { apiApp } from '../src/server/apiRouter.js';
import { databaseStore } from '../src/server/databaseStore.js';
import { authStore } from '../src/server/authStore.js';

let server: http.Server;
let baseUrl: string;

test.before(async () => {
  process.env.NODE_ENV = 'production';
  process.env.ADMIN_SECRET_KEY = 'test-admin-secret-key-12345';
  process.env.DISABLE_RATE_LIMIT = 'true';

  await new Promise<void>((resolve) => {
    server = http.createServer(apiApp);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  databaseStore.purgeAllCustomerData();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// ============================================================================
// ACCEPTANCE TEST 1 & 3:
// Logged-out visitor calling catalog APIs directly receives HTTP 401 Unauthorized
// ============================================================================
test('Acceptance Test 1 & 3: Logged-out visitor calling catalog APIs receives 401 Unauthorized', async () => {
  // 1. GET /api/inventory
  const res1 = await fetch(`${baseUrl}/api/inventory`);
  assert.equal(res1.status, 401, 'Unauthenticated GET /api/inventory must return 401');
  const data1 = await res1.json();
  assert.equal(data1.error, 'UNAUTHORIZED');
  assert.equal(data1.items, undefined, 'No items array leaked to unauthenticated caller');

  // 2. GET /api/inventory/meta
  const res2 = await fetch(`${baseUrl}/api/inventory/meta`);
  assert.equal(res2.status, 401, 'Unauthenticated GET /api/inventory/meta must return 401');

  // 3. GET /api/inventory/geekbar-15k
  const res3 = await fetch(`${baseUrl}/api/inventory/geekbar-15k`);
  assert.equal(res3.status, 401, 'Unauthenticated GET /api/inventory/:id must return 401');

  // 4. POST /api/inventory/orders
  const res4 = await fetch(`${baseUrl}/api/inventory/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [] }),
  });
  assert.equal(res4.status, 401, 'Unauthenticated POST /api/inventory/orders must return 401');

  // 5. Caching headers must be strictly private / no-store to prevent CDN/browser cache leak
  const cacheControl = res1.headers.get('cache-control') || '';
  assert.ok(cacheControl.includes('no-store'), 'Must include no-store');
  assert.ok(cacheControl.includes('private'), 'Must include private cache directive');
});

// ============================================================================
// ACCEPTANCE TEST 4:
// Logged-in user with approved account: catalog works normally (HTTP 200 with pricing)
// ============================================================================
test('Acceptance Test 4: Logged-in approved customer receives HTTP 200 with full pricing and master SKUs', async () => {
  const approvedEmail = `approved_${Date.now()}@okcretailer.com`;
  const app = databaseStore.createApplication({
    businessName: 'Approved OK Smoke Shop LLC',
    contactFirstName: 'Sam',
    contactLastName: 'Approved',
    contactName: 'Sam Approved',
    email: approvedEmail,
    phone: '4055558888',
    fein: '73-1234567',
    licenseNumber: 'OK-TOB-12345',
    businessType: 'smoke_shop',
    address: { street: '100 NW 23rd St', city: 'Oklahoma City', state: 'OK', zip: '73103' },
    ageCertified: true,
    taxExemptCertified: true,
  });

  const cust = databaseStore.createOrUpdateCustomerFromApplication(app, 'admin_master');
  authStore.provisionCustomer(cust, 'ApprovedRetailerPass2026!');
  const { token } = authStore.login(approvedEmail, 'ApprovedRetailerPass2026!');

  // Verify /api/auth/me confirms catalog and pricing access
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.authenticated, true);
  assert.equal(meData.user.role, 'approved_customer');
  assert.equal(meData.user.has_catalog_access, true);
  assert.equal(meData.user.has_pricing_access, true);

  // Call /api/inventory with session token
  const invRes = await fetch(`${baseUrl}/api/inventory`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(invRes.status, 200, 'Approved customer receives 200 OK');
  const invData = await invRes.json();
  assert.equal(invData.has_pricing_access, true);
  assert.ok(Array.isArray(invData.items) && invData.items.length > 0, 'Items populated');
  assert.ok(typeof invData.items[0].rate === 'number', 'Wholesale rates are visible');

  // Call /api/inventory/:id
  const itemRes = await fetch(`${baseUrl}/api/inventory/geekbar-15k`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(itemRes.status, 200);
  const itemData = await itemRes.json();
  assert.equal(itemData.id, 'geekbar-15k');
  assert.equal(itemData.has_pricing_access, true);
  assert.ok(typeof itemData.rate === 'number');
});

// ============================================================================
// ACCEPTANCE TEST 5:
// Logged-in user with pending or suspended account: catalog access is denied (HTTP 403)
// ============================================================================
test('Acceptance Test 5: Pending or suspended accounts receive HTTP 403 Forbidden', async () => {
  // 1. Pending application user attempts login -> receives 403 ACCOUNT_PENDING
  const pendingEmail = `pending_${Date.now()}@okcpending.com`;
  databaseStore.createApplication({
    businessName: 'Pending Smoke Shop LLC',
    contactFirstName: 'Pat',
    contactLastName: 'Pending',
    contactName: 'Pat Pending',
    email: pendingEmail,
    phone: '4055557777',
    fein: '73-7654321',
    licenseNumber: 'OK-TOB-54321',
    businessType: 'smoke_shop',
    address: { street: '200 NW 10th St', city: 'Oklahoma City', state: 'OK', zip: '73103' },
    ageCertified: true,
    taxExemptCertified: true,
  });

  const pendingLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: pendingEmail, password: 'PendingPass2026!' }),
  });
  assert.equal(pendingLogin.status, 403);
  const pendingLoginData = await pendingLogin.json();
  assert.equal(pendingLoginData.error, 'ACCOUNT_PENDING');

  // 2. Suspended user test:
  // Create approved account, obtain token, then suspend customer
  const suspendEmail = `suspend_${Date.now()}@okcsuspend.com`;
  const suspApp = databaseStore.createApplication({
    businessName: 'Suspendable Smoke Shop LLC',
    contactFirstName: 'Steve',
    contactLastName: 'Suspend',
    contactName: 'Steve Suspend',
    email: suspendEmail,
    phone: '4055556666',
    fein: '73-5555555',
    licenseNumber: 'OK-TOB-55555',
    businessType: 'smoke_shop',
    address: { street: '300 NW 50th St', city: 'Oklahoma City', state: 'OK', zip: '73118' },
    ageCertified: true,
    taxExemptCertified: true,
  });

  const suspCust = databaseStore.createOrUpdateCustomerFromApplication(suspApp, 'admin_master');
  authStore.provisionCustomer(suspCust, 'SuspendRetailerPass2026!');
  const { token: activeToken } = authStore.login(suspendEmail, 'SuspendRetailerPass2026!');

  // Verify access before suspension
  const preRes = await fetch(`${baseUrl}/api/inventory`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });
  assert.equal(preRes.status, 200, 'Approved customer has catalog access before suspension');

  // Now suspend the customer account
  databaseStore.suspendCustomer(suspCust.id, 'admin_master', 'State resale license audit');

  // Attempt to query catalog with token -> MUST return 403 Forbidden!
  const postSuspRes = await fetch(`${baseUrl}/api/inventory`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });
  assert.equal(postSuspRes.status, 403, 'Suspended account must receive 403 Forbidden');
  const postSuspData = await postSuspRes.json();
  assert.ok(['ACCOUNT_SUSPENDED', 'FORBIDDEN', 'CATALOG_ACCESS_FORBIDDEN'].includes(postSuspData.error));

  // Verify /api/auth/me shows no catalog access
  const suspMeRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });
  const suspMeData = await suspMeRes.json();
  assert.equal(suspMeData.user.has_catalog_access, false);
});

// ============================================================================
// ACCEPTANCE TEST 6:
// User logs out -> session is revoked, subsequent requests return HTTP 401
// ============================================================================
test('Acceptance Test 6: User logs out, session token is revoked, subsequent requests return 401', async () => {
  const logoutEmail = `logout_${Date.now()}@okclogout.com`;
  const logoutApp = databaseStore.createApplication({
    businessName: 'Logout Smoke Shop LLC',
    contactFirstName: 'Larry',
    contactLastName: 'Logout',
    contactName: 'Larry Logout',
    email: logoutEmail,
    phone: '4055554444',
    fein: '73-4444444',
    licenseNumber: 'OK-TOB-44444',
    businessType: 'smoke_shop',
    address: { street: '400 NW 39th St', city: 'Oklahoma City', state: 'OK', zip: '73112' },
    ageCertified: true,
    taxExemptCertified: true,
  });

  const logoutCust = databaseStore.createOrUpdateCustomerFromApplication(logoutApp, 'admin_master');
  authStore.provisionCustomer(logoutCust, 'LogoutRetailerPass2026!');
  const { token: sessionToken } = authStore.login(logoutEmail, 'LogoutRetailerPass2026!');

  // Verify access before logout
  const preLogout = await fetch(`${baseUrl}/api/inventory`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  assert.equal(preLogout.status, 200, 'Customer has catalog access before logout');

  // Perform logout
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'x-session-token': sessionToken,
    },
  });
  assert.equal(logoutRes.status, 200);
  const clearSiteData = logoutRes.headers.get('clear-site-data') || '';
  assert.ok(clearSiteData.includes('cache'), 'Clear-Site-Data header present');

  // Subsequent call with revoked token MUST return 401 Unauthorized
  const postLogout = await fetch(`${baseUrl}/api/inventory`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  assert.equal(postLogout.status, 401, 'Revoked token returns 401 Unauthorized');
  const postLogoutData = await postLogout.json();
  assert.equal(postLogoutData.error, 'UNAUTHORIZED');
});
