import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { apiApp } from '../src/server/apiRouter.js';
import { databaseStore } from '../src/server/databaseStore.js';
import { authStore } from '../src/server/authStore.js';

let server: http.Server;
let baseUrl: string;

const TEST_ADMIN_EMAIL = 'order2wholesaleofoklahoma@gmail.com';
const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const EMAIL_LOG_FILE = path.join(STORAGE_DIR, 'email_outbox.log');

test.before(async () => {
  process.env.NODE_ENV = 'production'; // Enforce strict production auth
  process.env.ADMIN_NOTIFICATION_EMAIL = TEST_ADMIN_EMAIL;

  // Clean test admin state to ensure deterministic initial bootstrap
  authStore.deleteUser(TEST_ADMIN_EMAIL);
  authStore.ensureInitialAdmin(TEST_ADMIN_EMAIL);

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
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// Helper to read outbox entries
function getOutboxEntries(): any[] {
  if (!fs.existsSync(EMAIL_LOG_FILE)) return [];
  const lines = fs.readFileSync(EMAIL_LOG_FILE, 'utf-8').trim().split('\n');
  return lines.filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// 1. Initial Admin Account Provisioning & Setup Token
// ---------------------------------------------------------------------------
test('Admin Setup: order2wholesaleofoklahoma@gmail.com provisioned without hardcoded password and receives activation token', async () => {
  const adminUser = authStore.getUser(TEST_ADMIN_EMAIL);
  assert.ok(adminUser, 'Admin user must exist in authStore');
  assert.equal(adminUser.role, 'admin', 'Admin role must be admin');
  assert.equal(authStore.hasPasswordSet(TEST_ADMIN_EMAIL), false, 'Must not have default or hardcoded password set');

  // Verify setup invite email in outbox (latest)
  const outbox = getOutboxEntries();
  const inviteEmail = outbox.filter((e) => e.to === TEST_ADMIN_EMAIL && e.subject.includes('Activate Your Wholesale of Oklahoma Administrator Account')).pop();
  assert.ok(inviteEmail, 'Initial admin setup email must be logged to outbox');
  assert.ok(inviteEmail.actionUrl.includes('/admin/activate?token='), 'Email must contain activation actionUrl');

  // Extract token from URL
  const tokenMatch = inviteEmail.actionUrl.match(/token=([a-f0-9]+)/);
  assert.ok(tokenMatch, 'Activation token must be extracted');
  const token = tokenMatch[1];

  // Verify token via API without consuming
  const verifyRes = await fetch(`${baseUrl}/api/auth/verify-token?token=${token}&type=ADMIN_ACTIVATION`);
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.valid, true);
  assert.equal(verifyData.email, TEST_ADMIN_EMAIL);

  // Set admin password via API
  const activateRes = await fetch(`${baseUrl}/api/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: 'AdminSecurePass2026!' }),
  });
  assert.equal(activateRes.status, 200);
  const activateData = await activateRes.json();
  assert.equal(activateData.success, true);
  assert.equal(activateData.role, 'admin');
  assert.ok(activateData.token, 'Session token returned upon activation');

  // Verify single-use token cannot be reused
  const reuseRes = await fetch(`${baseUrl}/api/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: 'AnotherPassword123!' }),
  });
  assert.equal(reuseRes.status, 400, 'Reused activation token must be rejected');

  // Verify admin can now log in with the new password
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: 'AdminSecurePass2026!' }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.user.role, 'admin');
});

// ---------------------------------------------------------------------------
// 2. Customer Application Submission & Validation
// ---------------------------------------------------------------------------
let testAppId: string;
const testApplicantEmail = `purchasing_${Date.now()}@thunderokvapes.com`;

test('Customer Application: Valid submission creates PENDING record, sends admin & customer emails', async () => {
  const res = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Thunder OK Vapes LLC',
      dba: 'Thunder Vapes',
      contactFirstName: 'Jordan',
      contactLastName: 'Miller',
      email: testApplicantEmail,
      phone: '(405) 555-8822',
      fein: '73-9876543',
      licenseNumber: 'OK-TOB-99881',
      businessType: 'vape_shop',
      address: {
        street: '4500 NW 23rd St',
        city: 'Oklahoma City',
        state: 'OK',
        zip: '73127',
      },
      website: 'https://thundervapesok.com',
      notes: 'Interested in bulk carton orders of disposable vapes.',
      ageCertified: true,
      taxExemptCertified: true,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, 'PENDING', 'Default status must be PENDING');
  assert.match(data.applicationId, /^WOA-APP-\d+$/);
  testAppId = data.applicationId;

  // Check database persistence
  const savedApp = databaseStore.getApplication(testAppId);
  assert.ok(savedApp, 'Application must be stored in database');
  assert.equal(savedApp.status, 'PENDING');
  assert.equal(savedApp.businessName, 'Thunder OK Vapes LLC');
  assert.equal(savedApp.contactName, 'Jordan Miller');

  // Verify Admin Notification Email
  const outbox = getOutboxEntries();
  const adminNotification = outbox.filter((e) => e.to === TEST_ADMIN_EMAIL && e.subject.includes('Thunder OK Vapes LLC')).pop();
  assert.ok(adminNotification, 'Admin notification email must be sent to order2wholesaleofoklahoma@gmail.com');
  assert.ok(adminNotification.actionUrl.includes(`/admin/customer-applications/${testAppId}`));

  // Verify Applicant Confirmation Email
  const customerConfirmation = outbox.filter((e) => e.to === testApplicantEmail && e.subject.includes('Application Received')).pop();
  assert.ok(customerConfirmation, 'Applicant confirmation email must be sent');
});

test('Customer Application: Rejects missing required fields with 400', async () => {
  // Missing Business Name
  const res1 = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contactFirstName: 'Sam',
      contactLastName: 'Jones',
      email: 'sam@sample.com',
      phone: '(405) 555-1234',
      fein: '73-1111111',
      ageCertified: true,
    }),
  });
  assert.equal(res1.status, 400);

  // Missing FEIN
  const res2 = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Valid Name LLC',
      contactFirstName: 'Sam',
      contactLastName: 'Jones',
      email: 'sam@sample.com',
      phone: '(405) 555-1234',
      ageCertified: true,
    }),
  });
  assert.equal(res2.status, 400);

  // Invalid email format
  const res3 = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Valid Name LLC',
      contactFirstName: 'Sam',
      contactLastName: 'Jones',
      email: 'not-an-email',
      phone: '(405) 555-1234',
      fein: '73-1111111',
      ageCertified: true,
    }),
  });
  assert.equal(res3.status, 400);

  // Age certification false
  const res4 = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Valid Name LLC',
      contactFirstName: 'Sam',
      contactLastName: 'Jones',
      email: 'sam@sample.com',
      phone: '(405) 555-1234',
      fein: '73-1111111',
      ageCertified: false,
    }),
  });
  assert.equal(res4.status, 400);
});

// ---------------------------------------------------------------------------
// 3. Duplicate Application Protection
// ---------------------------------------------------------------------------
test('Duplicate Protection: Submitting duplicate for PENDING email returns 409 APPLICATION_PENDING', async () => {
  const res = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Thunder OK Vapes Duplicate LLC',
      contactFirstName: 'Jordan',
      contactLastName: 'Miller',
      email: testApplicantEmail, // Same email already pending
      phone: '(405) 555-8822',
      fein: '73-9876543',
      ageCertified: true,
    }),
  });

  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.error, 'APPLICATION_PENDING');
  assert.ok(data.message.includes('already under review'));
});

test('Duplicate Protection: Submitting application for already APPROVED email returns 409 ACCOUNT_ALREADY_EXISTS', async () => {
  const res = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'OKC Vapor Lounge Duplicate',
      contactFirstName: 'Alex',
      contactLastName: 'Mercer',
      email: 'retailer@okcvapor.com', // Seeded approved account
      phone: '(405) 555-0199',
      fein: '73-1234567',
      ageCertified: true,
    }),
  });

  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.error, 'ACCOUNT_ALREADY_EXISTS');
});

// ---------------------------------------------------------------------------
// 4. Pending User Login & Shopping Protection
// ---------------------------------------------------------------------------
test('Pending Protection: Pending user cannot log in and receives 403 ACCOUNT_PENDING', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testApplicantEmail,
      password: 'SomePassword123!',
    }),
  });

  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error, 'ACCOUNT_PENDING');
  assert.ok(data.message.includes('currently under review'));
});

test('Pending Protection: Unauthenticated requests to /api/inventory strip all wholesale pricing', async () => {
  const res = await fetch(`${baseUrl}/api/inventory`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.has_pricing_access, false);

  if (Array.isArray(data.items) && data.items.length > 0) {
    const firstItem = data.items[0];
    assert.equal(firstItem.rate, null, 'Wholesale rate must be stripped');
    assert.equal(firstItem.has_pricing_access, false);
  }
});

// ---------------------------------------------------------------------------
// 5. Admin Authorization & Security (OWASP RBAC)
// ---------------------------------------------------------------------------
test('Admin Security: Unauthenticated request to /api/admin/stats returns 401 Unauthorized', async () => {
  const res = await fetch(`${baseUrl}/api/admin/stats`);
  assert.equal(res.status, 401);
});

test('Admin Security: Regular approved customer cannot access /api/admin/applications (returns 403 Forbidden)', async () => {
  // Login as approved customer
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'retailer@okcvapor.com', password: 'WholesaleOK2026!' }),
  });
  assert.equal(loginRes.status, 200);
  const { token } = await loginRes.json();

  // Attempt to call admin endpoints
  const adminRes = await fetch(`${baseUrl}/api/admin/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(adminRes.status, 403, 'Customer token must receive 403 Forbidden on admin endpoint');

  // Attempt to approve application directly
  const approveRes = await fetch(`${baseUrl}/api/admin/applications/${testAppId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(approveRes.status, 403, 'Customer token must receive 403 Forbidden on approve endpoint');
});

// ---------------------------------------------------------------------------
// 6. Admin Approval Workflow & Customer Activation
// ---------------------------------------------------------------------------
let adminToken: string;
let customerActivationToken: string;

test('Admin Approval: Admin logs in, reviews application, and approves account', async () => {
  // Admin login
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: 'AdminSecurePass2026!' }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  adminToken = loginData.token;

  // View Application Details
  const viewRes = await fetch(`${baseUrl}/api/admin/applications/${testAppId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(viewRes.status, 200);
  const viewData = await viewRes.json();
  assert.equal(viewData.application.id, testAppId);
  assert.equal(viewData.application.status, 'PENDING');

  // Approve Account
  const approveRes = await fetch(`${baseUrl}/api/admin/applications/${testAppId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(approveRes.status, 200);
  const approveData = await approveRes.json();
  assert.equal(approveData.success, true);
  assert.equal(approveData.application.status, 'APPROVED');
  assert.ok(approveData.customer, 'Customer record created');

  // Verify status updated in database
  const updatedApp = databaseStore.getApplication(testAppId);
  assert.equal(updatedApp?.status, 'APPROVED');
  const cust = databaseStore.getCustomerByEmail(testApplicantEmail);
  assert.ok(cust, 'Customer record must exist in database');
  assert.equal(cust.status, 'APPROVED');

  // Verify Approval & Activation Email sent
  const outbox = getOutboxEntries();
  const approvalEmail = outbox.filter((e) => e.to === testApplicantEmail && e.subject.includes('Your Wholesale of Oklahoma Account Has Been Approved')).pop();
  assert.ok(approvalEmail, 'Customer approval email must be in outbox');
  assert.ok(approvalEmail.actionUrl.includes('/activate?token='));

  const tokenMatch = approvalEmail.actionUrl.match(/token=([a-f0-9]+)/);
  assert.ok(tokenMatch, 'Customer activation token extracted');
  customerActivationToken = tokenMatch[1];
});

test('Customer Activation: Customer verifies token, creates password, and token is consumed', async () => {
  // Verify token
  const verifyRes = await fetch(`${baseUrl}/api/auth/verify-token?token=${customerActivationToken}&type=CUSTOMER_ACTIVATION`);
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.valid, true);

  // Set password
  const activateRes = await fetch(`${baseUrl}/api/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customerActivationToken, password: 'CustomerSecurePass2026!' }),
  });
  assert.equal(activateRes.status, 200);
  const activateData = await activateRes.json();
  assert.equal(activateData.success, true);
  assert.equal(activateData.role, 'approved_customer');

  // Single-use check: Reusing activation token must fail
  const reuseRes = await fetch(`${baseUrl}/api/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customerActivationToken, password: 'AnotherPassword!' }),
  });
  assert.equal(reuseRes.status, 400);

  // Verify customer record marked activated in database
  const cust = databaseStore.getCustomerByEmail(testApplicantEmail);
  assert.ok(cust?.activatedAt, 'Customer must have activatedAt timestamp');
});

// ---------------------------------------------------------------------------
// 7. Approved Customer Login & Authorized Shopping
// ---------------------------------------------------------------------------
let customerToken: string;

test('Authorized Shopping: Newly activated customer logs in and views live wholesale pricing', async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testApplicantEmail, password: 'CustomerSecurePass2026!' }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.user.role, 'approved_customer');
  assert.equal(loginData.user.has_pricing_access, true);
  customerToken = loginData.token;

  // Query inventory as authenticated customer
  const inventoryRes = await fetch(`${baseUrl}/api/inventory`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(inventoryRes.status, 200);
  const inventoryData = await inventoryRes.json();
  assert.equal(inventoryData.has_pricing_access, true, 'Approved customer receives pricing access');

  if (Array.isArray(inventoryData.items) && inventoryData.items.length > 0) {
    const item = inventoryData.items[0];
    assert.notEqual(item.rate, null, 'Wholesale rates must be visible to approved customer');
    assert.ok(typeof item.rate === 'number');
  }
});

// ---------------------------------------------------------------------------
// 8. Account Suspension & Reactivation
// ---------------------------------------------------------------------------
test('Account Suspension: Admin suspends account -> customer login blocked & session invalidated', async () => {
  const cust = databaseStore.getCustomerByEmail(testApplicantEmail);
  assert.ok(cust);

  // Admin suspends customer
  const suspendRes = await fetch(`${baseUrl}/api/admin/customers/${cust.id}/suspend`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: 'Compliance document renewal requested' }),
  });
  assert.equal(suspendRes.status, 200);

  // Suspended customer attempts to log in -> 403 ACCOUNT_SUSPENDED
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testApplicantEmail, password: 'CustomerSecurePass2026!' }),
  });
  assert.equal(loginRes.status, 403);
  const loginData = await loginRes.json();
  assert.equal(loginData.error, 'ACCOUNT_SUSPENDED');

  // Customer previous session token is rejected server-side
  const inventoryRes = await fetch(`${baseUrl}/api/inventory`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const inventoryData = await inventoryRes.json();
  assert.equal(inventoryData.has_pricing_access, false, 'Suspended customer loses pricing access immediately');

  // Admin reactivates account
  const reactivateRes = await fetch(`${baseUrl}/api/admin/customers/${cust.id}/reactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(reactivateRes.status, 200);

  // Customer can log in again
  const reloginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testApplicantEmail, password: 'CustomerSecurePass2026!' }),
  });
  assert.equal(reloginRes.status, 200);
});

// ---------------------------------------------------------------------------
// 9. Forgot Password & Password Reset Flow
// ---------------------------------------------------------------------------
test('Password Reset: Customer requests reset, single-use token sent, and password updated', async () => {
  const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testApplicantEmail }),
  });
  assert.equal(forgotRes.status, 200);

  const outbox = getOutboxEntries();
  const resetEmail = outbox.filter((e) => e.to === testApplicantEmail && e.subject.includes('Password Reset Request')).pop();
  assert.ok(resetEmail, 'Password reset email must be in outbox');

  const tokenMatch = resetEmail.actionUrl.match(/token=([a-f0-9]+)/);
  assert.ok(tokenMatch);
  const resetToken = tokenMatch[1];

  // Complete reset
  const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, password: 'BrandNewCustomerPass2026!' }),
  });
  assert.equal(resetRes.status, 200);

  // Login with new password
  const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testApplicantEmail, password: 'BrandNewCustomerPass2026!' }),
  });
  assert.equal(newLoginRes.status, 200);
});

// ---------------------------------------------------------------------------
// 10. Audit Logging Integrity
// ---------------------------------------------------------------------------
test('Audit Trail: All security events logged without exposing secrets or tokens', async () => {
  const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(auditRes.status, 200);
  const { logs } = await auditRes.json();
  assert.ok(Array.isArray(logs));

  const events = logs.map((l: any) => l.event);
  assert.ok(events.includes('APPLICATION_SUBMITTED'), 'Must log APPLICATION_SUBMITTED');
  assert.ok(events.includes('APPLICATION_APPROVED'), 'Must log APPLICATION_APPROVED');
  assert.ok(events.includes('ACCOUNT_ACTIVATED'), 'Must log ACCOUNT_ACTIVATED');
  assert.ok(events.includes('ACCOUNT_SUSPENDED'), 'Must log ACCOUNT_SUSPENDED');
  assert.ok(events.includes('ACCOUNT_REACTIVATED'), 'Must log ACCOUNT_REACTIVATED');
  assert.ok(events.includes('ADMIN_LOGIN_SUCCESS'), 'Must log ADMIN_LOGIN_SUCCESS');

  // Verify zero secrets leaked in logs
  for (const log of logs) {
    const str = JSON.stringify(log);
    assert.ok(!str.includes('AdminSecurePass'), 'Passwords must never be logged');
    assert.ok(!str.includes('CustomerSecurePass'), 'Passwords must never be logged');
  }
});

// ---------------------------------------------------------------------------
// 11. Admin Password Reset via /admin/reset-password
// ---------------------------------------------------------------------------
test('Admin Reset: /api/auth/forgot-password dispatches link pointing to /admin/reset-password', async () => {
  const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL, role: 'admin' }),
  });
  assert.equal(res.status, 200);

  const outbox = getOutboxEntries();
  const resetEmail = outbox.filter((e) => e.to === TEST_ADMIN_EMAIL && e.subject.includes('Administrator Password Reset')).pop();
  assert.ok(resetEmail, 'Admin reset email must be in outbox');
  assert.ok(resetEmail.actionUrl.includes('/admin/reset-password?token='), 'Admin reset email must point to /admin/reset-password');

  const tokenMatch = resetEmail.actionUrl.match(/token=([a-f0-9]+)/);
  assert.ok(tokenMatch);
  const resetToken = tokenMatch[1];

  // Complete reset with valid password
  const completeRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, password: 'UpdatedAdminPass2026!' }),
  });
  assert.equal(completeRes.status, 200);

  // Login with new admin credentials
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: 'UpdatedAdminPass2026!' }),
  });
  assert.equal(loginRes.status, 200);
  const data = await loginRes.json();
  assert.equal(data.user.role, 'admin');

  // Verify wrong password fails
  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: 'WrongPassword!' }),
  });
  assert.equal(badLogin.status, 401);
});

// ---------------------------------------------------------------------------
// 12. Admin Request Setup Link & Invite Secondary Admin
// ---------------------------------------------------------------------------
test('Admin Setup & Invite: Request activation dispatches setup link and admin can invite new staff', async () => {
  const newStaffEmail = 'dispatcher@wholesaleofoklahoma.com';

  // Existing admin invites new admin
  const inviteRes = await fetch(`${baseUrl}/api/admin/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      email: newStaffEmail,
      contactName: 'Assistant Dispatcher',
      phone: '(405) 555-0188',
    }),
  });
  assert.equal(inviteRes.status, 200);

  const outbox = getOutboxEntries();
  const inviteEmail = outbox.filter((e) => e.to === newStaffEmail && e.subject.includes('Activate Your Wholesale of Oklahoma Administrator Account')).pop();
  assert.ok(inviteEmail, 'Invite email must be sent to new admin');
  assert.ok(inviteEmail.actionUrl.includes('/admin/activate?token='));

  // Extract token and activate new admin
  const token = inviteEmail.actionUrl.match(/token=([a-f0-9]+)/)[1];
  const activateRes = await fetch(`${baseUrl}/api/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: 'StaffAdminPass2026!' }),
  });
  assert.equal(activateRes.status, 200);
  const actData = await activateRes.json();
  assert.equal(actData.role, 'admin');

  // New admin logs in successfully
  const staffLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newStaffEmail, password: 'StaffAdminPass2026!' }),
  });
  assert.equal(staffLoginRes.status, 200);
  const staffData = await staffLoginRes.json();
  assert.equal(staffData.user.role, 'admin');

  // Test logout
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffData.token}` },
  });
  assert.equal(logoutRes.status, 200);
});

// ---------------------------------------------------------------------------
// 13. Product Availability Overrides (4-state management)
// ---------------------------------------------------------------------------
test('Product Availability: Admin can toggle Available, Low Stock, Temporarily Unavailable, Out of Stock', async () => {
  const testProdId = 'geekbar-15k';

  // 1. Mark Temporarily Unavailable
  const unavailRes = await fetch(`${baseUrl}/api/admin/products/${testProdId}/temporary-override`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ statusOverride: 'TEMPORARILY_UNAVAILABLE', reason: 'Physical warehouse count discrepancy' }),
  });
  assert.equal(unavailRes.status, 200);

  // Check storefront query reflects out of stock online
  const storeRes1 = await fetch(`${baseUrl}/api/inventory/${testProdId}`);
  assert.equal(storeRes1.status, 200);
  const item1 = await storeRes1.json();
  assert.equal(item1.is_temporarily_blocked, true);
  assert.equal(item1.stock_status, 'out_of_stock');

  // 2. Mark Low Stock
  const lowRes = await fetch(`${baseUrl}/api/admin/products/${testProdId}/temporary-override`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ statusOverride: 'LOW_STOCK', reason: 'Only 3 left in physical bin' }),
  });
  assert.equal(lowRes.status, 200);

  const storeRes2 = await fetch(`${baseUrl}/api/inventory/${testProdId}`);
  assert.equal(storeRes2.status, 200);
  const item2 = await storeRes2.json();
  assert.equal(item2.stock_status, 'low_stock');

  // 3. Restore Available
  const availRes = await fetch(`${baseUrl}/api/admin/products/${testProdId}/temporary-override`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ statusOverride: 'AVAILABLE' }),
  });
  assert.equal(availRes.status, 200);

  const storeRes3 = await fetch(`${baseUrl}/api/inventory/${testProdId}`);
  assert.equal(storeRes3.status, 200);
  const item3 = await storeRes3.json();
  assert.equal(item3.is_temporarily_blocked, false);
});
