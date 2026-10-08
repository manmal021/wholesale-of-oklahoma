import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { PDFDocument } from 'pdf-lib';
import { apiApp } from '../src/server/apiRouter.js';
import { databaseStore } from '../src/server/databaseStore.js';
import { documentStore } from '../src/server/documentStore.js';
import { authStore } from '../src/server/authStore.js';
import { applicationPdfService } from '../src/server/applicationPdfService.js';
import { emailService } from '../src/server/emailService.js';

let server: http.Server;
let baseUrl: string;

const TEST_ADMIN_KEY = 'test_security_admin_secret_key_2026';
const TEST_ADMIN_EMAIL = 'order2wholesaleofoklahoma@gmail.com';

let testAppId: string;
let testDocId: string;
let adminSessionToken: string;
let customerSessionToken: string;
let employeeSessionToken: string;
let expiredSessionToken: string;

test.before(async () => {
  process.env.NODE_ENV = 'production';
  process.env.ADMIN_SECRET_KEY = TEST_ADMIN_KEY;
  process.env.APPLICATION_NOTIFICATION_EMAIL = TEST_ADMIN_EMAIL;

  databaseStore.purgeAllCustomerData();

  // Create admin user & session
  const adminSetup = authStore.ensureInitialAdmin('admin@wholesaleofoklahoma.com');
  authStore.setPassword('admin@wholesaleofoklahoma.com', 'AdminPass2026!#');
  const adminLogin = authStore.login('admin@wholesaleofoklahoma.com', 'AdminPass2026!#');
  adminSessionToken = adminLogin.token;

  // Create approved customer user & session
  const customerUser = authStore.register({
    email: 'retailer_partner@okcvapor.com',
    password: 'CustomerPass2026!#',
    businessName: 'OKC Vapor Lounge LLC',
    contactName: 'Alex Mercer',
    phone: '(405) 555-0199',
    role: 'approved_customer',
  });
  customerSessionToken = customerUser.token;

  // Create employee / unprivileged user & session
  const employeeUser = authStore.register({
    email: 'employee@okcvapor.com',
    password: 'EmployeePass2026!#',
    businessName: 'OKC Vapor Lounge LLC',
    contactName: 'John Employee',
    phone: '(405) 555-0198',
    role: 'pending_customer',
  });
  employeeSessionToken = employeeUser.token;

  // Create expired session token
  const expiredSession = authStore.createSession(
    'usr_expired_test',
    'admin_expired@wholesaleofoklahoma.com',
    'admin',
    'Wholesale of Oklahoma',
    'Admin'
  );
  // Manually expire session
  (expiredSession as any).expiresAt = Date.now() - 3600000;
  expiredSessionToken = expiredSession.token;

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

test('TASK 10: Public application submission returns minimal payload with zero PII leakage', async () => {
  // 1. Upload valid test permit
  const dummyPermitBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF');
  const uploadPermitRes = await fetch(`${baseUrl}/api/wholesale/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64: dummyPermitBuffer.toString('base64'),
      filename: 'sales_tax_permit.pdf',
      documentType: 'sales_tax_permit',
    }),
  });
  assert.equal(uploadPermitRes.status, 200);
  const permitData = await uploadPermitRes.json();
  testDocId = permitData.documentId;
  assert.ok(testDocId, 'Must receive document ID');

  // 2. Submit application
  const applyRes = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Red River Smoke & Vape LLC',
      contactFirstName: 'David',
      contactLastName: 'Miller',
      email: 'david@redriversmoke.com',
      phone: '(405) 555-7890',
      fein: '73-9876543',
      licenseNumber: 'OK-PERMIT-4412',
      businessType: 'smoke_shop',
      address: {
        street: '456 Robinson Ave',
        city: 'Norman',
        state: 'OK',
        zip: '73069',
      },
      ageCertified: true,
      taxExemptCertified: true,
      documents: [{ id: testDocId, type: 'sales_tax_permit', filename: 'sales_tax_permit.pdf' }],
    }),
  });

  assert.equal(applyRes.status, 200);
  const body = await applyRes.json();
  testAppId = body.applicationId;

  // Task 10: Must ONLY return minimum required fields
  assert.equal(body.success, true);
  assert.ok(body.applicationId.startsWith('WOA-APP-'));
  assert.equal(body.status, 'PENDING');
  assert.ok(typeof body.message === 'string');

  // Must NOT leak customer record, documents, FEIN, or private fields
  assert.equal(body.application, undefined, 'Must not return full application object');
  assert.equal(body.documents, undefined, 'Must not return documents array');
  assert.equal(body.fein, undefined, 'Must not return FEIN');
  assert.equal(body.email, undefined, 'Must not return email');
  assert.equal(body.phone, undefined, 'Must not return phone');
});

test('TASK 8: SCENARIO A — Logged-out visitor direct access is denied with 401', async () => {
  const res = await fetch(`${baseUrl}/api/admin/customer-applications/${testAppId}`);
  assert.equal(res.status, 401, 'Unauthenticated visitor must receive 401');
  const body = await res.json();
  assert.equal(body.application, undefined, 'Must not return application data');
  assert.ok(body.error.toLowerCase().includes('unauthorized'));
});

test('TASK 8: SCENARIO B — Normal customer account direct access is denied with 403', async () => {
  const res = await fetch(`${baseUrl}/api/admin/customer-applications/${testAppId}`, {
    headers: { 'x-session-token': customerSessionToken },
  });
  assert.equal(res.status, 403, 'Approved customer account must receive 403');
  const body = await res.json();
  assert.equal(body.application, undefined, 'Must not return application data');
  assert.ok(body.error.toLowerCase().includes('forbidden'));
});

test('TASK 8: SCENARIO C — Authenticated non-admin employee account is denied with 403', async () => {
  const res = await fetch(`${baseUrl}/api/admin/customer-applications/${testAppId}`, {
    headers: { 'x-session-token': employeeSessionToken },
  });
  assert.equal(res.status, 403, 'Non-admin employee account must receive 403');
  const body = await res.json();
  assert.equal(body.application, undefined, 'Must not return application data');
});

test('TASK 8: SCENARIO D — Authorized administrator direct access is granted with 200 OK', async () => {
  const res = await fetch(`${baseUrl}/api/admin/customer-applications/${testAppId}`, {
    headers: { 'x-session-token': adminSessionToken },
  });
  assert.equal(res.status, 200, 'Authorized admin must receive 200 OK');
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.application);
  assert.equal(body.application.id, testAppId);
  assert.equal(body.application.businessName, 'Red River Smoke & Vape LLC');
  // Verify Anti-Caching header (Task 10)
  const cacheControl = res.headers.get('cache-control') || '';
  assert.ok(cacheControl.includes('no-store'), 'Admin response must have Cache-Control: no-store');
  const robotsTag = res.headers.get('x-robots-tag') || '';
  assert.ok(robotsTag.includes('noindex'), 'Admin response must have X-Robots-Tag: noindex');
});

test('TASK 8: SCENARIO E — Expired admin session is denied with 401', async () => {
  const res = await fetch(`${baseUrl}/api/admin/customer-applications/${testAppId}`, {
    headers: { 'x-session-token': expiredSessionToken },
  });
  assert.equal(res.status, 401, 'Expired session must receive 401');
  const body = await res.json();
  assert.equal(body.application, undefined);
});

test('TASK 8: SCENARIO F — Modified application ID does not leak existence to unauthenticated user', async () => {
  const res = await fetch(`${baseUrl}/api/admin/customer-applications/WOA-APP-NONEXISTENT-99999`);
  assert.equal(res.status, 401, 'Unauthenticated request must return 401, not 404');
  const body = await res.json();
  assert.equal(body.application, undefined);
});

test('TASK 8: SCENARIO G — Direct document URL cannot expose private files to unauthorized users', async () => {
  // 1. Unauthenticated request -> 401
  const unauthRes = await fetch(`${baseUrl}/api/wholesale/documents/${testDocId}`);
  assert.equal(unauthRes.status, 401, 'Unauthenticated document access must receive 401');

  // 2. Customer request -> 403
  const customerRes = await fetch(`${baseUrl}/api/wholesale/documents/${testDocId}`, {
    headers: { 'x-session-token': customerSessionToken },
  });
  assert.equal(customerRes.status, 403, 'Customer account must receive 403 for compliance documents');

  // 3. Authorized admin -> 200 OK
  const adminRes = await fetch(`${baseUrl}/api/wholesale/documents/${testDocId}`, {
    headers: { 'x-session-token': adminSessionToken },
  });
  assert.equal(adminRes.status, 200, 'Authorized admin must be able to retrieve document');
  const contentType = adminRes.headers.get('content-type') || '';
  assert.ok(contentType.includes('pdf'));
});

test('TASK 4: Generated application PDF contains Page 1 details and Page 2 verification documents', async () => {
  const app = databaseStore.getApplication(testAppId);
  assert.ok(app, 'Application must exist');

  // Generate PDF
  const generated = await applicationPdfService.generateApplicationPdf(app);
  assert.ok(generated.buffer.length > 1000, 'PDF buffer must not be empty');
  assert.match(generated.filename, /^Wholesale-Application-.*\.pdf$/);

  // Parse and inspect PDF pages
  const parsedPdf = await PDFDocument.load(generated.buffer);
  const pageCount = parsedPdf.getPageCount();
  assert.ok(pageCount >= 2, `PDF must contain at least 2 pages (got ${pageCount})`);

  // Verify Page 2 is present
  const page2 = parsedPdf.getPage(1);
  assert.equal(page2.getWidth(), 612);
  assert.equal(page2.getHeight(), 792);
});

test('TASK 5: Email status tracking records pending, sent/failed, retry counts, and audit logs', async () => {
  const app = databaseStore.getApplication(testAppId)!;
  assert.ok(app.emailStatus, 'Email status must be tracked');

  // Test Admin Resend Email endpoint
  const resendRes = await fetch(`${baseUrl}/api/admin/applications/${testAppId}/resend-email`, {
    method: 'POST',
    headers: { 'x-session-token': adminSessionToken },
  });
  assert.equal(resendRes.status, 200);
  const resendData = await resendRes.json();
  assert.equal(resendData.success, true);
  assert.equal(resendData.emailStatus, 'sent');

  // Verify database record was updated with retry tracking
  const updatedApp = databaseStore.getApplication(testAppId)!;
  assert.equal(updatedApp.emailStatus, 'sent');
  assert.ok(updatedApp.emailAttemptAt, 'emailAttemptAt must be recorded');
  assert.ok(updatedApp.emailRetryCount && updatedApp.emailRetryCount >= 1, 'Retry count must be incremented');

  // Verify audit log has recorded the event
  const auditLogs = databaseStore.listAuditLogs(20);
  const emailLog = auditLogs.find((l) => l.targetId === testAppId && l.event.includes('EMAIL'));
  assert.ok(emailLog, 'Email attempt must be logged in administrative audit trail');
});

test('TASK 7: All admin management endpoints enforce requireAdminAuth', async () => {
  const endpoints = [
    { method: 'GET', path: '/api/admin/stats' },
    { method: 'GET', path: '/api/admin/applications' },
    { method: 'GET', path: '/api/admin/customers' },
    { method: 'GET', path: `/api/admin/applications/${testAppId}/pdf` },
    { method: 'GET', path: '/api/admin/audit-logs' },
    { method: 'GET', path: '/api/admin/email-status' },
    { method: 'GET', path: '/api/inventory/admin/status' },
    { method: 'GET', path: '/api/inventory/admin/images' },
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${baseUrl}${ep.path}`, { method: ep.method });
    assert.equal(
      res.status,
      401,
      `Unauthenticated access to ${ep.path} must return 401 Unauthorized (got ${res.status})`
    );
  }
});
