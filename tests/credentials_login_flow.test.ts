import test from 'node:test';
import assert from 'node:assert';
import {
  generateCustomerPassword,
  authStore
} from '../src/server/authStore.js';
import { databaseStore } from '../src/server/databaseStore.js';

test('Customer Credentials & Login Flow: Password generation rules strictly met', () => {
  for (let i = 0; i < 50; i++) {
    const pwd = generateCustomerPassword(10);
    assert.strictEqual(pwd.length, 10, `Password length must be 10, got ${pwd.length} (${pwd})`);
    assert(/[A-Z]/.test(pwd), `Password must contain uppercase: ${pwd}`);
    assert(/[a-z]/.test(pwd), `Password must contain lowercase: ${pwd}`);
    assert(/[0-9]/.test(pwd), `Password must contain digit: ${pwd}`);
    assert(/[!@#$%&*?]/.test(pwd), `Password must contain symbol: ${pwd}`);
  }
});

test('Customer Credentials & Login Flow: Denied applicant login is completely blocked', async () => {
  const testEmailDenied = `test_deny_${Date.now()}@example.com`;
  const appDenied = databaseStore.createApplication({
    businessName: 'Denied Smoke Shop LLC',
    dba: 'Denied Smoke',
    contactFirstName: 'Jane',
    contactLastName: 'Denied',
    contactName: 'Jane Denied',
    email: testEmailDenied,
    phone: '4055550199',
    fein: '12-3456789',
    licenseNumber: 'OK-PERMIT-DENY',
    businessType: 'smoke_shop',
    address: {
      street: '123 Denied St',
      city: 'Oklahoma City',
      state: 'OK',
      zip: '73102'
    },
    ageCertified: true,
    taxExemptCertified: true,
    documents: [{
      documentId: 'doc_deny',
      documentType: 'SALES_TAX_PERMIT',
      filename: 'permit.pdf'
    }]
  });

  databaseStore.updateApplicationStatus(appDenied.id, 'REJECTED', 'admin_tester', 'Compliance verification rejected.');

  let loginDeniedFailed = false;
  try {
    await authStore.login(testEmailDenied, 'AnyPassword123!');
  } catch (err: any) {
    loginDeniedFailed = true;
    assert(
      err.message.includes('ACCOUNT_REJECTED') || err.message.includes('Invalid email or password'),
      `Expected rejection error, got: ${err.message}`
    );
  }
  assert.strictEqual(loginDeniedFailed, true, 'Denied applicant must not be able to log in.');

  databaseStore.deleteApplication(appDenied.id);
});

test('Customer Credentials & Login Flow: Approved customer receives 10-char password, logs in, and browses wholesale catalog', async () => {
  const testEmailApproved = `approved_retailer_${Date.now()}@oklahomashop.com`;
  const appApproved = databaseStore.createApplication({
    businessName: 'Thunder Wholesale Dispensary',
    dba: 'Thunder Wholesale',
    contactFirstName: 'Bob',
    contactLastName: 'Thunder',
    contactName: 'Bob Thunder',
    email: testEmailApproved,
    phone: '4055550144',
    fein: '98-7654321',
    licenseNumber: 'OK-TAX-PERMIT-4412',
    businessType: 'dispensary',
    address: {
      street: '456 Wholesale Blvd',
      city: 'Tulsa',
      state: 'OK',
      zip: '74103'
    },
    ageCertified: true,
    taxExemptCertified: true,
    documents: [{
      documentId: 'doc_tax_permit',
      documentType: 'SALES_TAX_PERMIT',
      filename: 'salestaxpermit.jpg'
    }]
  });

  const assignedPassword = generateCustomerPassword(10);
  assert.strictEqual(assignedPassword.length, 10);
  assert(/[A-Z]/.test(assignedPassword) && /[a-z]/.test(assignedPassword) && /[0-9]/.test(assignedPassword) && /[!@#$%&*?]/.test(assignedPassword));

  databaseStore.updateApplicationStatus(appApproved.id, 'APPROVED', 'admin_tester');
  appApproved.assignedPassword = assignedPassword;

  const customerRecord = databaseStore.createOrUpdateCustomerFromApplication(appApproved, 'admin_tester', assignedPassword);
  assert(customerRecord, 'Customer record must be created');
  assert.strictEqual(customerRecord.temporaryPassword, assignedPassword);

  authStore.provisionCustomer(
    {
      id: customerRecord.id,
      email: customerRecord.email,
      businessName: customerRecord.businessName,
      contactName: customerRecord.contactName,
      phone: customerRecord.phone,
      applicationId: customerRecord.applicationId
    },
    assignedPassword
  );

  // Authenticate using assigned password
  const loginResult = await authStore.login(customerRecord.email, assignedPassword);
  assert(loginResult && loginResult.token, 'Login must return valid session');
  assert.strictEqual(loginResult.user.role, 'approved_customer');
  assert.strictEqual(loginResult.user.email, customerRecord.email);

  // Validate session token unlocks catalog
  const verifiedUser = authStore.validateSession(loginResult.token);
  assert(verifiedUser, 'Session token must be valid');
  assert.strictEqual(verifiedUser.role, 'approved_customer');

  // Verify wrong password fails
  let wrongPasswordFailed = false;
  try {
    await authStore.login(customerRecord.email, 'WrongPass123!');
  } catch (err: any) {
    wrongPasswordFailed = true;
  }
  assert.strictEqual(wrongPasswordFailed, true);

  // Clean up
  databaseStore.deleteApplication(appApproved.id);
  databaseStore.deleteCustomer(customerRecord.id);
  databaseStore.deleteUser(testEmailApproved);
});
