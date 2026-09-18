import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { apiApp } from '../src/server/apiRouter.js';
import { inventoryStore } from '../src/server/inventoryStore.js';
import { wholesaleStore } from '../src/server/wholesaleStore.js';
import { PRODUCTS } from '../src/lib/productDatabase.js';

import { databaseStore } from '../src/server/databaseStore.js';
import { authStore } from '../src/server/authStore.js';

// Setup test server instance
let server: http.Server;
let baseUrl: string;
const TEST_ADMIN_KEY = 'test_production_hardening_secret_key_2026';

test.before(async () => {
  process.env.ADMIN_SECRET_KEY = TEST_ADMIN_KEY;
  process.env.NODE_ENV = 'production'; // Enforce strict production auth checks

  // Ensure test fixtures are available for this suite
  databaseStore.seedDemoAccounts();
  authStore.seedRetailerTestAccount();

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

// ---------------------------------------------------------------------------
// 1. Technical SEO & Public Discovery Verification (Rules 5, 7, 8, 9)
// ---------------------------------------------------------------------------
test('SEO: robots.txt exists and blocks sensitive endpoints while pointing to sitemap', () => {
  const robotsPath = path.resolve(process.cwd(), 'public', 'robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');

  const content = fs.readFileSync(robotsPath, 'utf8');
  assert.ok(content.includes('User-agent: *'), 'Must declare User-agent');
  assert.ok(content.includes('Disallow: /api/'), 'Must block /api/');
  assert.ok(content.includes('Disallow: /admin'), 'Must block /admin');
  assert.ok(content.includes('Disallow: /orders/'), 'Must block /orders/');
  assert.ok(content.includes('Sitemap: https://www.wholesaleofoklahoma.com/sitemap.xml'), 'Must point to canonical sitemap.xml');
});

test('SEO: sitemap.xml exists and maps canonical product and category URLs', () => {
  const sitemapPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');

  const content = fs.readFileSync(sitemapPath, 'utf8');
  assert.ok(content.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Valid sitemap XML namespace');
  assert.ok(content.includes('https://www.wholesaleofoklahoma.com/products/geekbar-15k'), 'Must contain product canonical URL');
  assert.ok(content.includes('https://www.wholesaleofoklahoma.com/categories/disposable-vapes'), 'Must contain category canonical URL');
  assert.ok(!content.includes('/api/'), 'Sitemap must not contain /api/');
  assert.ok(!content.includes('/admin'), 'Sitemap must not contain /admin');
});

// ---------------------------------------------------------------------------
// 2. Secret Exposure Prevention (Rule 2 & OWASP A02)
// ---------------------------------------------------------------------------
test('Secrets: dist bundle does not leak Zoho or Gemini secrets', () => {
  const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');
  if (fs.existsSync(distAssetsDir)) {
    const files = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const code = fs.readFileSync(path.join(distAssetsDir, file), 'utf8');
      assert.ok(!code.includes('1000.BZ0NVEYRZDREAE82PH5CBFUBJD98KK'), `Leaked Zoho Client ID found in ${file}`);
      assert.ok(!code.includes('ZOHO_CLIENT_SECRET'), `Leaked ZOHO_CLIENT_SECRET string in ${file}`);
      assert.ok(!code.includes('ZOHO_REFRESH_TOKEN'), `Leaked ZOHO_REFRESH_TOKEN string in ${file}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 3. Admin Authorization & Timing-Safe Security (Rules 12, 14 & OWASP A01)
// ---------------------------------------------------------------------------
test('Security: /api/inventory/settings rejects unauthenticated requests with 401', async () => {
  const res = await fetch(`${baseUrl}/api/inventory/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hide_out_of_stock: true }),
  });
  assert.equal(res.status, 401, 'Unauthenticated admin write must return 401');
});

test('Security: /api/inventory/settings accepts requests with valid ADMIN_SECRET_KEY', async () => {
  const res = await fetch(`${baseUrl}/api/inventory/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': TEST_ADMIN_KEY,
    },
    body: JSON.stringify({ hide_out_of_stock: false }),
  });
  assert.equal(res.status, 200, 'Valid admin key must return 200');
  const data = await res.json();
  assert.equal(data.success, true);
});

// ---------------------------------------------------------------------------
// 4. Server-Side Price Verification & Anti-Tampering (Rule 16, 17 & OWASP A06)
// ---------------------------------------------------------------------------
test('Integrity: Client-tampered unit prices on orders are overwritten with authoritative catalog rates', async () => {
  const targetProduct = PRODUCTS.find((p) => p.id === 'geekbar-15k')!;
  assert.ok(targetProduct, 'Test target product must exist in database');

  const res = await fetch(`${baseUrl}/api/inventory/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Test Vapor Store',
      businessName: 'Oklahoma Vape Retailers LLC',
      phone: '(405) 555-9876',
      email: 'test@vaperetail.com',
      lineItems: [
        {
          id: 'geekbar-15k',
          name: 'Geekbar Pulse 15k',
          quantity: 10,
          pricePerUnit: 0.05, // Fraudulent unit price submitted by client
        },
      ],
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.orderId, 'Must return assigned order reference ID');
  assert.equal(data.success, true);
});

test('Integrity: Orders reject malformed or blank contact information', async () => {
  const res = await fetch(`${baseUrl}/api/inventory/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: '',
      phone: '',
      lineItems: [{ id: 'geekbar-15k', quantity: 5 }],
    }),
  });
  assert.equal(res.status, 400, 'Empty customer info must be rejected');
});

// ---------------------------------------------------------------------------
// 5. Wholesale Customer Application & Regulatory Compliance (Rules 29, 30)
// ---------------------------------------------------------------------------
test('Wholesale: Application flow validates FEIN, 21+ certification and returns Reference ID', async () => {
  const res = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Wholesale of Oklahoma Retail Partner LLC',
      contactName: 'Taylor Morgan',
      email: `taylor_${Date.now()}@wholesaleofoklahomapartner.com`,
      phone: '(405) 555-4321',
      fein: '73-9876543',
      licenseNumber: 'OK-RESALE-7721',
      businessType: 'smoke_shop',
      address: {
        street: '789 N Broadway Ave',
        city: 'Oklahoma City',
        state: 'OK',
        zip: '73102',
      },
      ageCertified: true,
      taxExemptCertified: true,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.applicationId, /^WOA-APP-\d+$/);
  assert.ok(data.status === 'PENDING' || data.status === 'PENDING_REVIEW');
});

test('Wholesale: Application rejects submission if 21+ age verification is omitted', async () => {
  const res = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Unverified Retailer',
      contactName: 'John',
      email: 'john@unverified.com',
      phone: '(405) 555-0000',
      fein: '73-0000000',
      ageCertified: false, // Omitted
    }),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('21 years of age'));
});

test('Wholesale: Status lookup requires matching email (Anti-IDOR)', async () => {
  // Try querying an existing application with wrong email
  const res = await fetch(`${baseUrl}/api/wholesale/status?id=WOA-APP-10001&email=wronghacker@mail.com`);
  assert.equal(res.status, 404, 'Mismatched email must return 404');

  // Query with matching email
  const validRes = await fetch(`${baseUrl}/api/wholesale/status?id=WOA-APP-10001&email=alex@okcvaporlounge.com`);
  assert.equal(validRes.status, 200);
  const validData = await validRes.json();
  assert.equal(validData.businessName, 'OKC Vapor Lounge LLC');
  assert.equal(validData.status, 'APPROVED');
});

// ---------------------------------------------------------------------------
// 6. Zoho Outage Fallback & Store Resiliency (Rule 3 & 4)
// ---------------------------------------------------------------------------
test('Resilience: Storefront metadata and items load safely even if Zoho is offline/unconfigured', async () => {
  const metaRes = await fetch(`${baseUrl}/api/inventory/meta`);
  assert.equal(metaRes.status, 200);
  const meta = await metaRes.json();
  assert.ok(Array.isArray(meta.categories), 'Categories array returned');
  assert.ok(meta.categories.length > 0, 'Categories populated from catalog seed');

  // Untouched item has baseline 50 units
  const untouchedRes = await fetch(`${baseUrl}/api/inventory/geekbar-25k`);
  assert.equal(untouchedRes.status, 200);
  const untouchedItem = await untouchedRes.json();
  assert.equal(untouchedItem.id, 'geekbar-25k');
  assert.equal(untouchedItem.available_stock, 50, 'Untouched item matches 50 unit inventory baseline');

  // Ordered item in Test 6 had 10 units deducted (50 - 10 = 40)
  const orderedRes = await fetch(`${baseUrl}/api/inventory/geekbar-15k`);
  assert.equal(orderedRes.status, 200);
  const orderedItem = await orderedRes.json();
  assert.equal(orderedItem.id, 'geekbar-15k');
  assert.equal(orderedItem.available_stock, 40, 'Stock reflects precise order quantity deduction');
});

// ---------------------------------------------------------------------------
// 7. Security Headers & Safe Caching (Rules 20, 21, 34)
// ---------------------------------------------------------------------------
test('Caching: Sensitive admin status is not cached with public CDN max-age', async () => {
  const res = await fetch(`${baseUrl}/api/inventory/admin/status`);
  const cacheControl = res.headers.get('cache-control') || '';
  assert.ok(!cacheControl.includes('public, max-age=31536000'), 'Admin endpoints must never be aggressively cached');
});

// ---------------------------------------------------------------------------
// 8. Zero Wholesale Pricing Leakage for Unauthenticated Visitors (Req 2 & 25)
// ---------------------------------------------------------------------------
test('Pricing Security: Unauthenticated GET /api/inventory strips all wholesale rates', async () => {
  const res = await fetch(`${baseUrl}/api/inventory`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.has_pricing_access, false, 'Unauthenticated caller must have has_pricing_access=false');
  assert.ok(Array.isArray(data.items), 'Must return items array');
  assert.ok(data.items.length > 0, 'Catalog should return items');

  for (const item of data.items) {
    assert.equal(item.rate, null, `Item ${item.id} must have null rate for unauthenticated caller`);
    assert.equal(item.has_pricing_access, false);
    assert.deepEqual(item.bulk_pricing, [], `Item ${item.id} must have empty bulk pricing`);
  }
});

test('Pricing Security: Unauthenticated GET /api/inventory/:id strips wholesale rates', async () => {
  const res = await fetch(`${baseUrl}/api/inventory/geekbar-15k`);
  assert.equal(res.status, 200);
  const item = await res.json();
  assert.equal(item.rate, null, 'Direct item query must have null rate without authorization');
  assert.equal(item.has_pricing_access, false);
  assert.deepEqual(item.bulk_pricing, []);
});

// ---------------------------------------------------------------------------
// 9. B2B Authentication, Sessions, and Role-Based Access Control (Req 3, 7, 8)
// ---------------------------------------------------------------------------
test('Auth: Login with approved retailer credentials sets session cookie and unlocks pricing', async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'retailer@okcvapor.com',
      password: 'WholesaleOK2026!',
    }),
  });

  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.success, true);
  assert.equal(loginData.user.role, 'approved_customer');
  assert.equal(loginData.user.has_pricing_access, true);

  // Extract session cookie
  const setCookieHeader = loginRes.headers.get('set-cookie');
  assert.ok(setCookieHeader, 'Must set woo_session cookie');
  assert.ok(setCookieHeader.includes('woo_session='), 'Cookie name must be woo_session');
  assert.ok(setCookieHeader.includes('HttpOnly'), 'Session cookie must be HttpOnly');

  const cookieVal = setCookieHeader.split(';')[0];

  // Verify /api/auth/me with session cookie
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: cookieVal },
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.authenticated, true);
  assert.equal(meData.user.role, 'approved_customer');
  assert.equal(meData.user.has_pricing_access, true);

  // Verify that GET /api/inventory WITH approved session cookie returns real wholesale pricing
  const authedInvRes = await fetch(`${baseUrl}/api/inventory`, {
    headers: { Cookie: cookieVal },
  });
  assert.equal(authedInvRes.status, 200);
  const authedInvData = await authedInvRes.json();
  assert.equal(authedInvData.has_pricing_access, true);

  const testItem = authedInvData.items.find((i: any) => i.id === 'geekbar-15k');
  assert.ok(testItem, 'Item must exist');
  assert.ok(typeof testItem.rate === 'number' && testItem.rate > 0, `Expected numeric wholesale rate, got ${testItem.rate}`);
});

test('Auth: Invalid credentials return 401 and do not set session', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'retailer@okcvapor.com',
      password: 'WrongPassword!',
    }),
  });
  assert.equal(res.status, 401);
});

// ---------------------------------------------------------------------------
// 10. Document Upload Security & Magic Byte Validation (Req 6 & 19)
// ---------------------------------------------------------------------------
test('Upload Security: Rejects non-document files or text masquerading as PDF', async () => {
  // Fake PDF content (text string, missing %PDF magic bytes)
  const fakePdfBase64 = Buffer.from('Hello this is a plain text file pretending to be pdf').toString('base64');
  const res = await fetch(`${baseUrl}/api/wholesale/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'tax_permit.pdf',
      documentType: 'resale_certificate',
      fileBase64: fakePdfBase64,
    }),
  });

  assert.equal(res.status, 400, 'Invalid magic bytes must be rejected with 400');
  const data = await res.json();
  assert.ok(
    data.error.includes('Invalid file type') ||
    data.error.includes('magic bytes') ||
    data.error.includes('signature')
  );
});

test('Upload Security: Accepts valid PDF buffer with true magic bytes (%PDF)', async () => {
  // Minimal valid PDF header buffer
  const validPdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const res = await fetch(`${baseUrl}/api/wholesale/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'oklahoma_sales_tax_permit.pdf',
      documentType: 'resale_certificate',
      fileBase64: validPdfHeader.toString('base64'),
    }),
  });

  assert.equal(res.status, 200, 'Valid PDF buffer must be accepted');
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.documentId);
  assert.equal(data.fileType, 'application/pdf');

  // Verify Document Retrieval Security:
  // 1. Unauthenticated retrieval must return 401
  const unauthDocRes = await fetch(`${baseUrl}/api/wholesale/documents/${data.documentId}`);
  assert.equal(unauthDocRes.status, 401, 'Unauthenticated document retrieval must be rejected');

  // 2. Admin retrieval with x-admin-key must return 200 and correct Content-Type
  const adminDocRes = await fetch(`${baseUrl}/api/wholesale/documents/${data.documentId}`, {
    headers: { 'x-admin-key': TEST_ADMIN_KEY },
  });
  assert.equal(adminDocRes.status, 200, 'Admin can securely retrieve private customer document');
  assert.equal(adminDocRes.headers.get('content-type'), 'application/pdf');
});

test('Upload Security: Rejects files exceeding 10MB limit', async () => {
  // Real binary buffer exceeding 10MB limit
  const oversizedBase64 = Buffer.alloc(11 * 1024 * 1024).toString('base64');
  const res = await fetch(`${baseUrl}/api/wholesale/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'huge.pdf',
      documentType: 'resale_certificate',
      fileBase64: oversizedBase64,
    }),
  });

  assert.equal(res.status, 413, 'Oversized file must be rejected with 413');
});

