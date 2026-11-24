import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FULFILLMENT_CONFIG, DEFAULT_TAX_SETTINGS, type DatabaseState, type WholesaleApplicationRecord } from '../../server/src/repositories/databaseStore.js';
import { persistRelationalDiff } from '../../server/src/repositories/relationalPersistence.js';

const blankState = (): DatabaseState => ({
  applications: [], customers: [], users: [], tokens: [], auditLogs: [], orders: [],
  inventoryOverrides: [], productAdminOverrides: [], inventoryMismatches: [], customerAddresses: [],
  fulfillmentConfig: DEFAULT_FULFILLMENT_CONFIG, taxSettings: DEFAULT_TAX_SETTINGS,
});

test('relational persistence writes only changed rows to normalized tables', async () => {
  const record: WholesaleApplicationRecord = {
    id: 'WOA-APP-UNIT-1', businessName: 'Relational Retail', contactFirstName: 'Rae',
    contactLastName: 'Buyer', contactName: 'Rae Buyer', email: 'rae@example.com', phone: '4055550100',
    fein: '73-1234567', licenseNumber: 'OK-123', businessType: 'vape_shop',
    address: { street: '1 Main', city: 'Oklahoma City', state: 'OK', zip: '73101' },
    ageCertified: true, taxExemptCertified: true, status: 'PENDING',
    submittedAt: '2026-01-01T00:00:00.000Z',
    applicationAnswers: { yearsInBusiness: 3, previousLocations: ['one', { city: 'Oklahoma City' }] },
    documents: [{ documentId: 'doc_0123456789abcdef0123456789abcdef', documentType: 'business_license', filename: 'license.pdf' }],
  };
  const before = blankState();
  const after = blankState();
  after.applications.push(record);
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const client = {
    query: async (sql: string, values: unknown[] = []) => {
      statements.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
      return { rows: [], rowCount: 1 };
    },
  };

  await persistRelationalDiff(client as any, before, after);

  assert.ok(statements.some(({ sql }) => sql.startsWith('INSERT INTO woo_applications')));
  const answerInserts = statements.filter(({ sql }) => sql.startsWith('INSERT INTO woo_application_answers'));
  assert.equal(answerInserts.length, 5);
  assert.ok(answerInserts.some(({ values }) => values.includes('number') && values.includes(3)));
  assert.ok(answerInserts.some(({ values }) => values.includes('object')));
  assert.ok(statements.some(({ sql }) => sql.startsWith('INSERT INTO woo_application_documents')));
  assert.ok(statements.every(({ sql }) => !/\bTRUNCATE\b|\bdata\s+jsonb\b|jsonb_to_recordset|answer_value|detail_value/i.test(sql)));
  assert.equal(statements.filter(({ sql }) => sql.startsWith('INSERT INTO woo_applications')).length, 1);
});

test('relational persistence deletes overrides by their product keys', async () => {
  const before = blankState();
  before.inventoryOverrides = [{
    productId: 'product-1', sku: 'SKU-1', name: 'Product', isOutOfStockOnline: true,
    reportedBy: 'admin', reportedAt: '2026-01-01T00:00:00.000Z', reason: 'Unavailable', active: true,
  }];
  before.productAdminOverrides = [{
    productId: 'product-2', sku: 'SKU-2', localStockQuantity: 4, wholesalePrice: 3,
    retailPrice: 5, updatedBy: 'admin', updatedAt: '2026-01-01T00:00:00.000Z',
  }];
  const after = structuredClone(before);
  after.inventoryOverrides = [];
  after.productAdminOverrides = [];
  const statements: string[] = [];
  const client = {
    query: async (sql: string) => {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      return { rows: [], rowCount: 1 };
    },
  };

  await persistRelationalDiff(client as any, before, after);

  assert.ok(statements.includes('DELETE FROM woo_inventory_overrides WHERE product_id = $1'));
  assert.ok(statements.includes('DELETE FROM woo_product_admin_overrides WHERE product_id = $1'));
});
