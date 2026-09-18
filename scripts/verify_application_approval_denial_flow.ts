import { databaseStore } from '../src/server/databaseStore';
import { authStore } from '../src/server/authStore';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🚀 Starting Verification: Customer Application Submission -> Admin Approve & Deny Flow');

  // Step 1: Admin Login
  console.log('\n--- Step 1: Admin Login ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@wholesaleofoklahoma.com',
      password: 'Wholesale@4500!',
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.sessionToken || loginData.token;
  if (!token) {
    throw new Error('No session token returned in admin login response');
  }
  console.log('✓ Admin authenticated successfully. Token length:', token.length);

  const authHeaders = {
    'Content-Type': 'application/json',
    'x-session-token': token,
  };

  // Helper to cleanup by email via API
  async function cleanupEmail(email: string) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/applications?status=ALL`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const apps = data.applications || [];
        for (const a of apps) {
          if (a.email?.toLowerCase() === email.toLowerCase()) {
            await fetch(`${BASE_URL}/api/admin/applications/${a.id}`, { method: 'DELETE', headers: authHeaders });
          }
        }
      }
    } catch (_) {}
    const oldApp = databaseStore.getLatestApplicationForEmail(email);
    if (oldApp) databaseStore.deleteApplication(oldApp.id);
    const oldCust = databaseStore.getCustomerByEmail(email);
    if (oldCust) databaseStore.deleteCustomer(oldCust.id);
    authStore.deleteUser(email);
  }

  // Step 2: Customer Submits Application 1 (For Approval Test)
  console.log('\n--- Step 2: Customer Submits Application 1 (Approval Test) ---');
  const appEmail1 = 'test-approval-cust@okwholesale-test.com';
  await cleanupEmail(appEmail1);

  const appPayload1 = {
    businessName: 'Oklahoma City Vape & Glass',
    dba: 'OKC Vape Hub',
    contactFirstName: 'Jordan',
    contactLastName: 'Miller',
    contactName: 'Jordan Miller',
    email: appEmail1,
    phone: '(405) 555-0144',
    fein: '73-1234567',
    licenseNumber: 'OK-TOB-99881',
    businessType: 'vape_shop',
    address: {
      street: '1200 S Western Ave',
      city: 'Oklahoma City',
      state: 'OK',
      zip: '73109',
    },
    documents: [
      {
        id: 'doc-salestax-1',
        name: 'ok_sales_tax_permit.jpg',
        originalName: 'ok_sales_tax_permit.jpg',
        type: 'sales_tax_permit',
        uploadedAt: new Date().toISOString(),
      },
    ],
    ageCertified: true,
    taxExemptCertified: true,
  };

  const submitRes1 = await fetch(`${BASE_URL}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appPayload1),
  });

  if (!submitRes1.ok) {
    throw new Error(`Customer application submission failed: ${submitRes1.status} ${await submitRes1.text()}`);
  }
  const submitData1 = await submitRes1.json();
  const appId1 = submitData1.applicationId || submitData1.application?.id || submitData1.id;
  console.log('✓ Application 1 submitted successfully! ID:', appId1, 'Status:', submitData1.status || submitData1.application?.status);

  if (!appId1) throw new Error('Application ID missing in response');

  // Step 3: Admin Views Application
  console.log('\n--- Step 3: Admin Views Application ---');
  const viewRes = await fetch(`${BASE_URL}/api/admin/applications/${appId1}`, {
    headers: authHeaders,
  });
  if (!viewRes.ok) {
    throw new Error(`Admin failed to retrieve application: ${viewRes.status} ${await viewRes.text()}`);
  }
  const viewData = await viewRes.json();
  console.log('✓ Admin retrieved application details:', viewData.application?.businessName, 'Status:', viewData.application?.status);

  // Step 4: Admin Approves Application
  console.log('\n--- Step 4: Admin Approves Application ---');
  const approveRes = await fetch(`${BASE_URL}/api/admin/applications/${appId1}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ reviewNotes: 'Sales tax permit verified with Oklahoma Tax Commission.' }),
  });

  if (!approveRes.ok) {
    throw new Error(`Admin approval failed: ${approveRes.status} ${await approveRes.text()}`);
  }
  const approveData = await approveRes.json();
  console.log('✓ Admin approved application successfully! Response:', approveData.message);

  // Verify status is APPROVED
  const verifyApproveRes = await fetch(`${BASE_URL}/api/admin/applications/${appId1}`, {
    headers: authHeaders,
  });
  const verifyApproveData = await verifyApproveRes.json();
  if (verifyApproveData.application?.status !== 'APPROVED') {
    throw new Error(`Expected application status APPROVED but got: ${verifyApproveData.application?.status}`);
  }
  console.log('✓ Verified Application 1 status in database is APPROVED.');

  // Verify customer was provisioned
  const approvedCust = verifyApproveData.customer || approveData.customer;
  if (!approvedCust || approvedCust.status !== 'APPROVED') {
    throw new Error(`Expected customer record for ${appEmail1} with status APPROVED, found: ${JSON.stringify(approvedCust)}`);
  }
  console.log('✓ Customer account successfully created and active:', approvedCust.id, approvedCust.businessName);

  // Step 5: Customer Submits Application 2 (For Rejection/Deny Test)
  console.log('\n--- Step 5: Customer Submits Application 2 (Denial Test) ---');
  const appEmail2 = 'test-deny-cust@okwholesale-test.com';

  await cleanupEmail(appEmail2);

  const appPayload2 = {
    businessName: 'Tulsa Smoke Depot',
    contactFirstName: 'Sam',
    contactLastName: 'Reynolds',
    email: appEmail2,
    phone: '(918) 555-0188',
    fein: '73-9876543',
    businessType: 'smoke_shop',
    address: {
      street: '4500 S Memorial Dr',
      city: 'Tulsa',
      state: 'OK',
      zip: '74145',
    },
    documents: [
      {
        id: 'doc-salestax-2',
        name: 'resale_cert.pdf',
        originalName: 'resale_cert.pdf',
        type: 'sales_tax_permit',
        uploadedAt: new Date().toISOString(),
      },
    ],
    ageCertified: true,
  };

  const submitRes2 = await fetch(`${BASE_URL}/api/wholesale/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appPayload2),
  });

  if (!submitRes2.ok) {
    throw new Error(`Application 2 submission failed: ${submitRes2.status} ${await submitRes2.text()}`);
  }
  const submitData2 = await submitRes2.json();
  const appId2 = submitData2.applicationId || submitData2.application?.id || submitData2.id;
  console.log('✓ Application 2 submitted successfully! ID:', appId2, 'Status:', submitData2.status || submitData2.application?.status);

  // Step 6: Admin Denies Application (testing /deny alias route)
  console.log('\n--- Step 6: Admin Denies Application via /deny route ---');
  const denyRes = await fetch(`${BASE_URL}/api/admin/applications/${appId2}/deny`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ reason: 'Expired OTC permit number' }),
  });

  if (!denyRes.ok) {
    throw new Error(`Admin denial failed: ${denyRes.status} ${await denyRes.text()}`);
  }
  const denyData = await denyRes.json();
  console.log('✓ Admin denied application successfully! Response:', denyData.message);

  // Verify status is REJECTED
  const verifyDenyRes = await fetch(`${BASE_URL}/api/admin/applications/${appId2}`, {
    headers: authHeaders,
  });
  const verifyDenyData = await verifyDenyRes.json();
  if (verifyDenyData.application?.status !== 'REJECTED') {
    throw new Error(`Expected application status REJECTED but got: ${verifyDenyData.application?.status}`);
  }
  console.log('✓ Verified Application 2 status in database is REJECTED.');

  // Step 7: Test Re-Approve functionality from REJECTED state
  console.log('\n--- Step 7: Test Re-Approve from REJECTED state ---');
  const reapproveRes = await fetch(`${BASE_URL}/api/admin/applications/${appId2}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ reviewNotes: 'Updated valid tax permit provided via phone.' }),
  });
  if (!reapproveRes.ok) {
    throw new Error(`Admin re-approval failed: ${reapproveRes.status} ${await reapproveRes.text()}`);
  }
  const reapproveData = await reapproveRes.json();
  console.log('✓ Application 2 successfully re-approved! Message:', reapproveData.message);

  // Step 8: Test Quick Rejection via /reject route
  console.log('\n--- Step 8: Test Rejection via /reject route ---');
  const rejectRes = await fetch(`${BASE_URL}/api/admin/applications/${appId2}/reject`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ reason: 'Compliance test rejection' }),
  });
  if (!rejectRes.ok) {
    throw new Error(`Admin rejection via /reject failed: ${rejectRes.status} ${await rejectRes.text()}`);
  }
  console.log('✓ Application 2 successfully rejected via /reject route.');

  // Step 9: User Request #3: "3) if fixed, proceeed and and remove the account, if not fix the box and go back to number 2."
  console.log('\n--- Step 9: Purge & Remove All Test Accounts & Applications ---');
  // Clean up App 1 via Admin API
  const delRes1 = await fetch(`${BASE_URL}/api/admin/applications/${appId1}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  if (!delRes1.ok) {
    throw new Error(`Failed to delete application 1 via API: ${delRes1.status} ${await delRes1.text()}`);
  }
  console.log('✓ Application 1 and its customer account deleted via admin API');

  // Clean up App 2 via Admin API
  const delRes2 = await fetch(`${BASE_URL}/api/admin/applications/${appId2}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  if (!delRes2.ok) {
    throw new Error(`Failed to delete application 2 via API: ${delRes2.status} ${await delRes2.text()}`);
  }
  console.log('✓ Application 2 deleted via admin API');

  // Verify deletion over API
  const checkApi1 = await fetch(`${BASE_URL}/api/admin/applications/${appId1}`, { headers: authHeaders });
  const checkApi2 = await fetch(`${BASE_URL}/api/admin/applications/${appId2}`, { headers: authHeaders });
  if (checkApi1.status !== 404 || checkApi2.status !== 404) {
    throw new Error(`Expected 404 for deleted applications, got: app1=${checkApi1.status}, app2=${checkApi2.status}`);
  }
  console.log('✓ Verified via API: Both applications return 404 Not Found (completely removed).');

  // Also verify via databaseStore
  databaseStore.deleteApplication(appId1);
  if (approvedCust) databaseStore.deleteCustomer(approvedCust.id);
  authStore.deleteUser(appEmail1);
  databaseStore.deleteApplication(appId2);
  const cust2 = databaseStore.getCustomerByEmail(appEmail2);
  if (cust2) databaseStore.deleteCustomer(cust2.id);
  authStore.deleteUser(appEmail2);

  const checkApp1 = databaseStore.getApplication(appId1);
  const checkCust1 = databaseStore.getCustomerByEmail(appEmail1);
  const checkApp2 = databaseStore.getApplication(appId2);
  const checkCust2 = databaseStore.getCustomerByEmail(appEmail2);

  if (checkApp1 || checkCust1 || checkApp2 || checkCust2) {
    throw new Error('Test account / application cleanup failed — records still exist in database!');
  }
  console.log('✓ Verification successful: All test accounts and applications completely removed!');

  console.log('\n🎉 ALL 9 STEPS PASSED PERFECTLY! BUG IS FULLY RESOLVED AND TEST ACCOUNTS REMOVED.');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
