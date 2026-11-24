import test from 'node:test';
import assert from 'node:assert/strict';
import { postgresPool } from '../../server/src/repositories/postgres.js';
import { loadRelationalState, persistRelationalDiff } from '../../server/src/repositories/relationalPersistence.js';

test.after(async () => {
  await postgresPool?.end();
});

test('PostgreSQL adapter hydrates and persists normalized application rows', {
  skip: !postgresPool,
}, async () => {
  const client = await postgresPool!.connect();
  try {
    await client.query('BEGIN');
    const initial = await loadRelationalState(client);
    const baselineId = `WOA-REL-BASE-${process.pid}`;
    const seeded = structuredClone(initial);
    seeded.applications.push({
      id: baselineId, businessName: 'Relational Baseline Shop',
      contactFirstName: 'Baseline', contactLastName: 'Buyer', contactName: 'Baseline Buyer',
      email: `relational-baseline-${process.pid}@example.test`, phone: '4055550100',
      fein: '73-1234567', licenseNumber: 'OK-BASE', businessType: 'vape_shop',
      address: { street: '1 Baseline Way', city: 'Oklahoma City', state: 'OK', zip: '73101' },
      ageCertified: true, taxExemptCertified: true, status: 'PENDING',
      submittedAt: new Date().toISOString(),
    });
    await persistRelationalDiff(client, initial, seeded);

    const before = await loadRelationalState(client);
    const after = structuredClone(before);
    const baseline = after.applications.find((app) => app.id === baselineId);
    assert.ok(baseline);
    baseline.notes = 'Updated during relational integration validation';
    after.applications.push({
      id: `WOA-REL-${process.pid}`, businessName: 'Relational Integration Shop',
      contactFirstName: 'Test', contactLastName: 'Buyer', contactName: 'Test Buyer',
      email: `relational-${process.pid}@example.test`, phone: '4055550100',
      fein: '73-1234567', licenseNumber: 'OK-TEST', businessType: 'vape_shop',
      address: { street: '1 Test Way', city: 'Oklahoma City', state: 'OK', zip: '73101' },
      applicationAnswers: { yearsInBusiness: 4, previousLocations: ['one', { city: 'Oklahoma City' }] },
      documents: [{ documentId: 'doc_0123456789abcdef0123456789abcdef', documentType: 'business_license', filename: 'license.pdf' }],
      ageCertified: true, taxExemptCertified: true, status: 'PENDING',
      submittedAt: new Date().toISOString(),
    });
    after.auditLogs.push({
      id: `AUDIT-REL-${process.pid}`, event: 'ORDER_ADJUSTED', targetId: 'order-1',
      timestamp: new Date().toISOString(),
      details: { resolution: { itemId: 'item-1', options: ['replace', 'refund'] }, successful: true },
    });

    await persistRelationalDiff(client, before, after);
    const reloaded = await loadRelationalState(client);
    const created = reloaded.applications.find((app) => app.id === `WOA-REL-${process.pid}`);
    assert.equal(created?.businessName, 'Relational Integration Shop');
    assert.deepEqual(created?.applicationAnswers, { yearsInBusiness: 4, previousLocations: ['one', { city: 'Oklahoma City' }] });
    assert.equal(created?.documents?.[0].filename, 'license.pdf');
    assert.equal(reloaded.applications.find((app) => app.id === baselineId)?.notes, 'Updated during relational integration validation');
    assert.deepEqual(reloaded.auditLogs.find((log) => log.id === `AUDIT-REL-${process.pid}`)?.details, after.auditLogs.at(-1)?.details);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
