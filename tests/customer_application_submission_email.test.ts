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
import { emailService } from '../src/server/emailService.js';

let server: http.Server;
let baseUrl: string;

const TEST_ADMIN_EMAIL = 'order2wholesaleofoklahoma@gmail.com';
const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const EMAIL_LOG_FILE = path.join(STORAGE_DIR, 'email_outbox.log');
const ATTACHMENTS_DIR = path.join(STORAGE_DIR, 'outbox_attachments');

const TEST_ADMIN_KEY = 'test_wholesale_app_submission_admin_key_2026';

test.before(async () => {
  process.env.NODE_ENV = 'production';
  process.env.ADMIN_NOTIFICATION_EMAIL = TEST_ADMIN_EMAIL;
  process.env.ADMIN_SECRET_KEY = TEST_ADMIN_KEY;

  if (fs.existsSync(EMAIL_LOG_FILE)) {
    try { fs.unlinkSync(EMAIL_LOG_FILE); } catch {}
  }

  databaseStore.seedDemoAccounts();

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

test('Customer Application Submission Flow: Complete End-to-End Audit & Verification', async () => {
  // 1. Create dummy Driver License (1x1 valid PNG) and Oklahoma Sales Tax Permit (valid 1-page PDF)
  const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const testPdfDoc = await PDFDocument.create();
  const testPage = testPdfDoc.addPage([600, 400]);
  testPage.drawText('OKLAHOMA TAX COMMISSION - SALES TAX PERMIT DUMMY', { x: 50, y: 350, size: 14 });
  const testPdfBytes = await testPdfDoc.save();
  const testPdfBase64 = Buffer.from(testPdfBytes).toString('base64');

  // Upload Driver License
  const dlUploadRes = await fetch(`${baseUrl}/api/wholesale/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64: dummyPngBase64,
      filename: 'driver_license.png',
      documentType: 'driver_license',
    }),
  });
  assert.equal(dlUploadRes.status, 200, 'Driver License upload must succeed');
  const dlUploadData = await dlUploadRes.json();
  assert.ok(dlUploadData.documentId, 'Driver License upload must return documentId');

  // Upload Sales Tax Permit
  const permitUploadRes = await fetch(`${baseUrl}/api/wholesale/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64: testPdfBase64,
      filename: 'oklahoma_sales_tax_permit.pdf',
      documentType: 'sales_tax_permit',
    }),
  });
  assert.equal(permitUploadRes.status, 200, 'Sales Tax Permit upload must succeed');
  const permitUploadData = await permitUploadRes.json();
  assert.ok(permitUploadData.documentId, 'Sales Tax Permit upload must return documentId');

  // 2. Submit application with complete customer information
  const testApplicantEmail = `purchasing_${Date.now()}@soonersmokeok.com`;
  const applicationPayload = {
    businessName: 'Sooner Wholesale Distributors LLC',
    dba: 'Sooner Smoke & Vape',
    businessEntity: 'Limited Liability Company (LLC)',
    contactFirstName: 'Caleb',
    contactLastName: 'Montgomery',
    email: testApplicantEmail,
    phone: '(405) 555-0199',
    businessPhone: '(405) 555-0100',
    fein: '84-1234567',
    salesTaxPermitNumber: 'OK-STP-987654',
    businessType: 'distributor',
    address: {
      street: '1200 S Meridian Ave',
      city: 'Oklahoma City',
      state: 'OK',
      zip: '73108',
    },
    billingAddress: {
      street: '1200 S Meridian Ave STE B',
      city: 'Oklahoma City',
      state: 'OK',
      zip: '73108',
    },
    shippingAddress: {
      street: '1200 S Meridian Ave Dock 4',
      city: 'Oklahoma City',
      state: 'OK',
      zip: '73108',
    },
    website: 'https://soonersmokeok.com',
    notes: 'Interested in bulk master carton discount tiers and recurring weekly orders.',
    ageCertified: true,
    taxExemptCertified: true,
    applicationAnswers: {
      yearsInBusiness: '6',
      estimatedMonthlyVolume: '$50,000+',
      referralSource: 'Industry Trade Referral',
    },
    documents: [
      { id: dlUploadData.documentId, type: 'driver_license', filename: 'driver_license.png' },
      { id: permitUploadData.documentId, type: 'sales_tax_permit', filename: 'oklahoma_sales_tax_permit.pdf' },
    ],
  };

  const applyRes = await fetch(`${baseUrl}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(applicationPayload),
  });

  assert.equal(applyRes.status, 200, 'Submission must return 200 OK');
  const applyData = await applyRes.json();

  // Customer Confirmation Check
  assert.equal(applyData.success, true);
  assert.equal(applyData.status, 'PENDING', 'Default status must strictly be PENDING');
  assert.equal(
    applyData.message,
    'Thank you. Your wholesale account application has been submitted and is currently under review. We will contact you after your application has been reviewed.',
    'Confirmation message must match the exact required string'
  );
  assert.ok(!applyData.message.toLowerCase().includes('approved'), 'Customer must not be told their account is approved');
  assert.ok(applyData.applicationId, 'Must return applicationId');
  const applicationId = applyData.applicationId;

  // 3. Database Record Verification
  const dbRecord = databaseStore.getApplication(applicationId);
  assert.ok(dbRecord, 'Application must be saved in database');
  assert.equal(dbRecord.status, 'PENDING');
  assert.equal(dbRecord.businessName, 'Sooner Wholesale Distributors LLC');
  assert.equal(dbRecord.contactName, 'Caleb Montgomery');
  assert.equal(dbRecord.email, testApplicantEmail);
  assert.equal(dbRecord.phone, '(405) 555-0199');
  assert.equal(dbRecord.businessPhone, '(405) 555-0100');
  assert.equal(dbRecord.businessEntity, 'Limited Liability Company (LLC)');
  assert.equal(dbRecord.fein, '84-1234567');
  assert.equal(dbRecord.salesTaxPermitNumber, 'OK-STP-987654');
  assert.equal(dbRecord.address.city, 'Oklahoma City');
  assert.equal(dbRecord.billingAddress?.street, '1200 S Meridian Ave STE B');
  assert.equal(dbRecord.shippingAddress?.street, '1200 S Meridian Ave Dock 4');
  assert.equal(dbRecord.emailStatus, 'sent', 'Email delivery status must be recorded as sent');
  assert.ok(dbRecord.emailSentAt, 'emailSentAt timestamp must be recorded');
  assert.equal(dbRecord.documents.length, 2, 'All 2 uploaded documents must be preserved');
  assert.ok(dbRecord.generatedPdfFilename, 'generatedPdfFilename must be recorded');
  assert.ok(dbRecord.generatedPdfDocumentId, 'generatedPdfDocumentId must be recorded');

  // 4. PDF Generation & Readability Verification
  assert.match(
    dbRecord.generatedPdfFilename!,
    /^Wholesale-Application-.*\.pdf$/,
    'PDF filename must follow Wholesale-Application-[BusinessName]-[ApplicantName]-[ID].pdf convention'
  );

  const storedPdf = documentStore.getDocumentBuffer(dbRecord.generatedPdfDocumentId!);
  assert.ok(storedPdf?.buffer, 'PDF buffer must exist in document store');
  assert.ok(storedPdf.buffer.length > 500, 'PDF buffer must not be empty');

  // Load and verify PDF structure with pdf-lib
  const parsedPdf = await PDFDocument.load(storedPdf.buffer);
  assert.ok(parsedPdf.getPageCount() >= 2, 'Generated PDF must contain multiple pages for info and attachments');

  // 5. Email Dispatch to order2wholesaleofoklahoma@gmail.com Verification
  const outbox = getOutboxEntries();
  const adminNotification = outbox
    .filter((e) => e.to === TEST_ADMIN_EMAIL && e.subject.includes('Sooner Wholesale Distributors LLC'))
    .pop();
  assert.ok(adminNotification, 'Email must be dispatched to order2wholesaleofoklahoma@gmail.com');
  assert.equal(
    adminNotification.subject,
    `New Customer Application - Sooner Wholesale Distributors LLC - ${applicationId}`,
    'Subject must follow: New Customer Application - [Business Name] - [Application ID]'
  );

  // Email Content Verification: clean summary of all submitted fields
  const body = adminNotification.body || adminNotification.html || '';
  assert.ok(body.includes('Caleb Montgomery'), 'Email must contain Applicant Name');
  assert.ok(body.includes('Sooner Wholesale Distributors LLC'), 'Email must contain Business Name');
  assert.ok(body.includes(testApplicantEmail), 'Email must contain Email');
  assert.ok(body.includes('(405) 555-0199'), 'Email must contain Phone');
  assert.ok(body.includes('(405) 555-0100'), 'Email must contain Business Phone');
  assert.ok(body.includes('1200 S Meridian Ave'), 'Email must contain Business Address');
  assert.ok(body.includes('1200 S Meridian Ave STE B'), 'Email must contain Billing Address');
  assert.ok(body.includes('1200 S Meridian Ave Dock 4'), 'Email must contain Shipping Address');
  assert.ok(body.includes('84-1234567'), 'Email must contain FEIN');
  assert.ok(body.includes('OK-STP-987654'), 'Email must contain Sales Tax Permit Number');
  assert.ok(body.includes('Limited Liability Company (LLC)'), 'Email must contain Business Entity');

  // Attachments verification
  assert.ok(adminNotification.attachments && adminNotification.attachments.length >= 1, 'Email must have attachments');
  const attachedFilename = typeof adminNotification.attachments[0] === 'string'
    ? adminNotification.attachments[0]
    : adminNotification.attachments[0].filename;
  assert.equal(attachedFilename, dbRecord.generatedPdfFilename);

  const savedAttachmentPath = path.join(ATTACHMENTS_DIR, attachedFilename);
  assert.ok(fs.existsSync(savedAttachmentPath), 'Saved attachment file must exist in outbox_attachments');
  const attachmentBuffer = fs.readFileSync(savedAttachmentPath);
  assert.ok(attachmentBuffer.length > 500, 'Attachment file size must be valid');

  // 6. Security Check
  assert.ok(!body.toLowerCase().includes('password'), 'Password must never appear in email content');
  const pdfString = storedPdf.buffer.toString('utf-8');
  assert.ok(!pdfString.toLowerCase().includes('assignedpassword'), 'No auth credentials in generated PDF');

  // Unauthenticated access to private document must be rejected
  const unauthDocRes = await fetch(`${baseUrl}/api/wholesale/documents/${dlUploadData.documentId}`);
  assert.equal(unauthDocRes.status, 401, 'Unauthenticated access to document must be rejected (401)');

  // Unauthenticated access to PDF must be rejected
  const unauthPdfRes = await fetch(`${baseUrl}/api/admin/applications/${applicationId}/pdf`);
  assert.equal(unauthPdfRes.status, 401, 'Unauthenticated access to admin PDF stream must be rejected (401)');

  // Authenticated admin can stream PDF
  const authPdfRes = await fetch(`${baseUrl}/api/admin/applications/${applicationId}/pdf`, {
    headers: { 'x-admin-key': TEST_ADMIN_KEY },
  });
  assert.equal(authPdfRes.status, 200, 'Authenticated admin PDF download must return 200 OK');
  assert.equal(authPdfRes.headers.get('content-type'), 'application/pdf');

  // 7. Admin Portal Status Flow Verification
  // Check application retrieval via admin endpoint
  const adminAppRes = await fetch(`${baseUrl}/api/admin/applications/${applicationId}`, {
    headers: { 'x-admin-key': TEST_ADMIN_KEY },
  });
  assert.equal(adminAppRes.status, 200);
  const adminAppData = await adminAppRes.json();
  assert.equal(adminAppData.application.id, applicationId);
  assert.equal(adminAppData.application.emailStatus, 'sent');
  assert.equal(adminAppData.application.status, 'PENDING');

  // Transition to NEEDS_INFORMATION
  const needsInfoRes = await fetch(`${baseUrl}/api/admin/applications/${applicationId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': TEST_ADMIN_KEY,
    },
    body: JSON.stringify({
      status: 'needs_information',
      reason: 'Please provide secondary verification of business location',
    }),
  });
  assert.equal(needsInfoRes.status, 200);
  const needsInfoData = await needsInfoRes.json();
  assert.equal(needsInfoData.status, 'NEEDS_INFORMATION');
  assert.equal(databaseStore.getApplication(applicationId)?.status, 'NEEDS_INFORMATION');

  // Re-send Email Notification via Admin Portal
  const resendRes = await fetch(`${baseUrl}/api/admin/applications/${applicationId}/resend-email`, {
    method: 'POST',
    headers: { 'x-admin-key': TEST_ADMIN_KEY },
  });
  assert.equal(resendRes.status, 200);
  const resendData = await resendRes.json();
  assert.equal(resendData.success, true);
  assert.equal(resendData.emailStatus, 'sent');

  // Transition back to PENDING
  const pendingRes = await fetch(`${baseUrl}/api/admin/applications/${applicationId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': TEST_ADMIN_KEY,
    },
    body: JSON.stringify({ status: 'pending' }),
  });
  assert.equal(pendingRes.status, 200);
  assert.equal(databaseStore.getApplication(applicationId)?.status, 'PENDING');

  // Transition to APPROVED
  const approveRes = await fetch(`${baseUrl}/api/admin/applications/${applicationId}/approve`, {
    method: 'POST',
    headers: { 'x-admin-key': TEST_ADMIN_KEY },
  });
  assert.equal(approveRes.status, 200);
  assert.equal(databaseStore.getApplication(applicationId)?.status, 'APPROVED');
});

test('Email Failure Handling: Database submission succeeds and is preserved if email dispatch fails', async () => {
  // Mock sendAdminNewApplicationNotification to simulate provider outage
  const originalSender = emailService.sendAdminNewApplicationNotification.bind(emailService);
  emailService.sendAdminNewApplicationNotification = async () => {
    return {
      success: false,
      error: 'SMTP provider timeout (simulated network failure)',
      recipient: TEST_ADMIN_EMAIL,
      subject: 'Failed Subject',
      provider: 'smtp',
    };
  };

  try {
    const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await fetch(`${baseUrl}/api/wholesale/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: dummyPngBase64,
        filename: 'tax_permit.png',
        documentType: 'sales_tax_permit',
      }),
    });
    const uploadData = await uploadRes.json();

    const applicantEmail = `resilience_${Date.now()}@testcompany.com`;
    const res = await fetch(`${baseUrl}/api/wholesale/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Resilience Tobacco LLC',
        contactFirstName: 'Sarah',
        contactLastName: 'Connor',
        email: applicantEmail,
        phone: '(405) 555-4321',
        fein: '73-1234999',
        businessType: 'smoke_shop',
        address: { street: '500 Main St', city: 'Norman', state: 'OK', zip: '73069' },
        ageCertified: true,
        taxExemptCertified: true,
        documents: [{ id: uploadData.documentId, type: 'sales_tax_permit', filename: 'tax_permit.png' }],
      }),
    });

    assert.equal(res.status, 200, 'Customer submission must succeed even if email dispatch fails');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.status, 'PENDING');
    assert.equal(
      data.message,
      'Thank you. Your wholesale account application has been submitted and is currently under review. We will contact you after your application has been reviewed.'
    );

    // Database record must exist with status PENDING and emailStatus 'failed'
    const app = databaseStore.getApplication(data.applicationId);
    assert.ok(app, 'Application must be preserved in database');
    assert.equal(app.status, 'PENDING');
    assert.equal(app.emailStatus, 'failed', 'emailStatus must reflect failure');
    assert.ok(app.emailError?.includes('SMTP provider timeout'));

    // Admin can resend once email provider is restored
    emailService.sendAdminNewApplicationNotification = originalSender;

    const resendRes = await fetch(`${baseUrl}/api/admin/applications/${app.id}/resend-email`, {
      method: 'POST',
      headers: { 'x-admin-key': TEST_ADMIN_KEY },
    });
    assert.equal(resendRes.status, 200);
    const resendData = await resendRes.json();
    assert.equal(resendData.success, true);
    assert.equal(resendData.emailStatus, 'sent');
    assert.equal(databaseStore.getApplication(app.id)?.emailStatus, 'sent');
  } finally {
    emailService.sendAdminNewApplicationNotification = originalSender;
  }
});
