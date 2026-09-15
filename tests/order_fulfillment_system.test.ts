import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { apiApp } from '../src/server/apiRouter.js';
import { databaseStore } from '../src/server/databaseStore.js';
import { authStore } from '../src/server/authStore.js';
import { emailService } from '../src/server/emailService.js';

let server: http.Server;
let baseUrl: string;
const TEST_ADMIN_SECRET = 'test_fulfillment_admin_secret_2026';

let customerA_token: string;
let customerA_id: string;
let customerB_token: string;
let customerB_id: string;
let admin_token: string;

test.before(async () => {
  process.env.ADMIN_SECRET_KEY = TEST_ADMIN_SECRET;
  process.env.NODE_ENV = 'production';

  await new Promise<void>((resolve) => {
    server = http.createServer(apiApp);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // Create test customer A (Approved wholesale retailer)
  const appA = databaseStore.createApplication({
    businessName: 'Alpha Smoke & Vape OKC LLC',
    contactFirstName: 'Alex',
    contactLastName: 'Alpha',
    contactName: 'Alex Alpha',
    email: 'retailer_okc_alpha@testsmoke.com',
    phone: '(405) 555-0101',
    fein: '73-9876543',
    licenseNumber: 'OK-TOB-11111',
    businessType: 'vape_shop',
    address: {
      street: '1000 N Western Ave',
      city: 'Oklahoma City',
      state: 'OK',
      zip: '73106',
    },
    ageCertified: true,
    taxExemptCertified: true,
  });
  const custA = databaseStore.createOrUpdateCustomerFromApplication(appA, 'admin_master');
  customerA_id = custA.id;
  const sessA = authStore.createSession({
    id: custA.id,
    userId: custA.id,
    email: custA.email,
    role: 'approved_customer',
    businessName: custA.businessName,
    contactName: custA.contactName,
  });
  customerA_token = sessA.token;

  // Create test customer B (Another retailer for IDOR verification)
  const appB = databaseStore.createApplication({
    businessName: 'Beta Vapor Lounge Edmond',
    contactFirstName: 'Brian',
    contactLastName: 'Beta',
    contactName: 'Brian Beta',
    email: 'retailer_edmond_beta@testsmoke.com',
    phone: '(405) 555-0202',
    fein: '73-9876544',
    licenseNumber: 'OK-TOB-22222',
    businessType: 'vape_shop',
    address: {
      street: '500 S Broadway',
      city: 'Edmond',
      state: 'OK',
      zip: '73034',
    },
    ageCertified: true,
    taxExemptCertified: true,
  });
  const custB = databaseStore.createOrUpdateCustomerFromApplication(appB, 'admin_master');
  customerB_id = custB.id;
  const sessB = authStore.createSession({
    id: custB.id,
    userId: custB.id,
    email: custB.email,
    role: 'approved_customer',
    businessName: custB.businessName,
    contactName: custB.contactName,
  });
  customerB_token = sessB.token;

  // Create admin session
  const adminSess = authStore.createSession({
    id: 'admin_fulfillment_master',
    userId: 'admin_fulfillment_master',
    email: 'order2wholesaleofoklahoma@gmail.com',
    role: 'admin',
    businessName: 'Wholesale of Oklahoma Dispatch',
    contactName: 'Dispatch Manager',
  });
  admin_token = adminSess.token;
});

test.after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// Helper for fetch requests
async function apiRequest(endpoint: string, options: { method?: string; body?: any; token?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
    headers['x-session-token'] = options.token;
  }
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// ---------------------------------------------------------------------------
// 1. Centralized Fulfillment Configuration Test
// ---------------------------------------------------------------------------
test('Fulfillment Config: Exposes centralized OKC pickup warehouse and metro delivery eligibility', async () => {
  const { status, ok, data } = await apiRequest('/api/fulfillment/config');
  assert.equal(status, 200);
  assert.ok(ok);
  assert.ok(data.config);
  assert.equal(data.config.pickupLocation.address.street, '4500 S Bryant Ave');
  assert.equal(data.config.pickupLocation.address.city, 'Oklahoma City');
  assert.equal(data.config.pickupLocation.address.zip, '73135');
  assert.equal(data.config.pickupLocation.phone, '(405) 768-2975');
  assert.ok(data.config.delivery.eligibleCities.includes('Oklahoma City'));
  assert.ok(data.config.delivery.eligibleCities.includes('Edmond'));
  assert.ok(data.config.delivery.eligibleZipCodes.includes('73135'));
  assert.equal(data.config.delivery.minimumDeliveryOrder, 150);
  assert.equal(data.config.delivery.deliveryFee, 25);
  assert.equal(data.config.delivery.freeDeliveryThreshold, 500);
});

// ---------------------------------------------------------------------------
// 2. Pickup Order Lifecycle Scenario
// ---------------------------------------------------------------------------
test('Pickup Scenario: Approved customer places PICKUP order -> Admin prepares -> Ready for Pickup notification -> Picked Up complete', async () => {
  // Step 1: Customer A places PICKUP order
  const orderRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerA_token,
    body: {
      fulfillmentMethod: 'PICKUP',
      pickupInfo: {
        requestedPickupDate: '2026-09-20',
        requestedPickupTime: '14:00',
      },
      lineItems: [
        {
          id: 'prod_vozol_1',
          sku: 'VOZOL-BLUE-RAZZ',
          name: 'Vozol Gear 10000 Blue Razz Ice',
          quantity: 10,
          pricePerUnit: 12.5,
        },
      ],
      notes: 'Dock pickup at warehouse counter',
    },
  });

  assert.equal(orderRes.status, 200);
  assert.ok(orderRes.data.orderId);
  const orderId = orderRes.data.orderId;

  // Step 2: Verify order permanently stored in databaseStore
  const storedOrder = databaseStore.getOrder(orderId);
  assert.ok(storedOrder, 'Order must be permanently stored in database');
  assert.equal(storedOrder.fulfillmentMethod, 'PICKUP');
  assert.equal(storedOrder.deliveryFee, 0.0, 'Pickup delivery fee must be $0.00');
  assert.equal(storedOrder.status, 'ORDER_RECEIVED');
  assert.equal(storedOrder.pickupInfo?.locationSnapshot.address.street, '4500 S Bryant Ave');
  assert.equal(storedOrder.pickupInfo?.pickupStatus, 'PENDING');

  // Step 3: Admin views order queue and opens order
  const adminListRes = await apiRequest('/api/admin/orders?fulfillmentMethod=PICKUP', {
    token: admin_token,
  });
  assert.equal(adminListRes.status, 200);
  const foundInAdmin = adminListRes.data.orders.find((o: any) => o.id === orderId);
  assert.ok(foundInAdmin, 'Order must appear in admin orders queue');

  // Step 4: Admin starts processing
  const procRes = await apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'PROCESSING' },
  });
  assert.equal(procRes.status, 200);
  assert.equal(procRes.data.order.status, 'PROCESSING');

  // Step 5: Staff verifies item as AVAILABLE and marks READY_FOR_PICKUP
  const itemId = storedOrder.lineItems[0].id;
  const itemStatusRes = await apiRequest(`/api/admin/orders/${orderId}/items/${itemId}/status`, {
    method: 'POST',
    token: admin_token,
    body: {
      status: 'AVAILABLE',
      physicalQuantityAvailable: 10,
    },
  });
  assert.equal(itemStatusRes.status, 200);
  assert.equal(itemStatusRes.data.item.itemFulfillmentStatus, 'AVAILABLE');

  // Staff marks READY_FOR_PICKUP
  const readyRes = await apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'READY_FOR_PICKUP' },
  });
  assert.equal(readyRes.status, 200);
  assert.equal(readyRes.data.order.status, 'READY_FOR_PICKUP');
  assert.ok(readyRes.data.order.pickupInfo.readyForPickupAt);

  // Customer checks order status online
  const custViewRes = await apiRequest(`/api/customer/orders/${orderId}`, {
    token: customerA_token,
  });
  assert.equal(custViewRes.status, 200);
  assert.equal(custViewRes.data.order.status, 'READY_FOR_PICKUP');
  assert.equal(custViewRes.data.order.internalNotes, undefined, 'Internal notes must never leak to customer');

  // Step 6: Customer arrives, staff marks PICKED_UP
  const pickupRes = await apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'PICKED_UP' },
  });
  assert.equal(pickupRes.status, 200);
  assert.equal(pickupRes.data.order.status, 'COMPLETED');
  assert.equal(pickupRes.data.order.pickupInfo.pickupStatus, 'PICKED_UP');
  assert.ok(pickupRes.data.order.pickupInfo.pickedUpAt);
});

// ---------------------------------------------------------------------------
// 3. Delivery Order Lifecycle & Fee Calculation Scenario
// ---------------------------------------------------------------------------
test('Delivery Scenario: Server validates OKC metro address -> Server computes $25 fee -> Out for Delivery -> Delivered', async () => {
  // Step 1: Validate delivery fee calculation for $200 order (below $500 threshold -> $25 fee)
  const valRes = await apiRequest('/api/fulfillment/validate-delivery', {
    method: 'POST',
    body: {
      address: {
        streetAddress: '1200 N Pennsylvania Ave',
        city: 'Oklahoma City',
        state: 'OK',
        zipCode: '73107',
      },
      subtotal: 200,
    },
  });
  assert.equal(valRes.status, 200);
  assert.equal(valRes.data.eligible, true);
  assert.equal(valRes.data.deliveryFee, 25);

  // Step 2: Customer places DELIVERY order
  const orderRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerA_token,
    body: {
      fulfillmentMethod: 'DELIVERY',
      deliveryInfo: {
        addressSnapshot: {
          recipientName: 'Alex Alpha Storefront',
          street: '1200 N Pennsylvania Ave',
          unit: 'Suite A',
          city: 'Oklahoma City',
          state: 'OK',
          zip: '73107',
          phone: '(405) 555-0101',
          deliveryInstructions: 'Rear alley commercial bay door',
        },
        deliveryInstructions: 'Rear alley commercial bay door',
      },
      lineItems: [
        {
          id: 'prod_geek_bar_1',
          sku: 'GEEK-BAR-PULSE-WTM',
          name: 'Geek Bar Pulse 15000 Watermelon Ice',
          quantity: 20,
          pricePerUnit: 12.0, // Subtotal: $240 -> Fee: $25
        },
      ],
    },
  });

  assert.equal(orderRes.status, 200);
  const orderId = orderRes.data.orderId;
  const storedOrder = databaseStore.getOrder(orderId)!;
  assert.equal(storedOrder.fulfillmentMethod, 'DELIVERY');
  assert.equal(storedOrder.deliveryFee, 25.0, 'Server must enforce $25 delivery fee');
  assert.equal(storedOrder.total, 265.0, 'Subtotal $240 + Delivery $25 = $265');
  assert.equal(storedOrder.deliveryInfo?.addressSnapshot.street, '1200 N Pennsylvania Ave');

  // Step 3: Staff moves to PROCESSING then OUT_FOR_DELIVERY
  await apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'PROCESSING' },
  });

  // Verify item is checked as available
  const itemId = storedOrder.lineItems[0].id;
  await apiRequest(`/api/admin/orders/${orderId}/items/${itemId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'AVAILABLE', physicalQuantityAvailable: 20 },
  });

  const outRes = await apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'OUT_FOR_DELIVERY' },
  });
  assert.equal(outRes.status, 200);
  assert.equal(outRes.data.order.status, 'OUT_FOR_DELIVERY');
  assert.ok(outRes.data.order.deliveryInfo.outForDeliveryAt);

  // Step 4: Staff marks DELIVERED
  const delivRes = await apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'DELIVERED' },
  });
  assert.equal(delivRes.status, 200);
  assert.equal(delivRes.data.order.status, 'COMPLETED');
  assert.equal(delivRes.data.order.deliveryInfo.deliveryStatus, 'DELIVERED');
  assert.ok(delivRes.data.order.deliveryInfo.deliveredAt);
});

// ---------------------------------------------------------------------------
// 4. Delivery Ineligibility and Minimum Order Protection
// ---------------------------------------------------------------------------
test('Delivery Restrictions: Rejects addresses outside Oklahoma service area and enforces $150 minimum', async () => {
  // Out of state address (Dallas, TX)
  const texasRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerA_token,
    body: {
      fulfillmentMethod: 'DELIVERY',
      deliveryInfo: {
        addressSnapshot: {
          recipientName: 'Out of State Buyer',
          street: '100 Main St',
          city: 'Dallas',
          state: 'TX',
          zip: '75201',
          phone: '(214) 555-9999',
        },
      },
      lineItems: [{ id: 'item_1', sku: 'TEST-SKU', name: 'Vape Pod', quantity: 20, pricePerUnit: 15 }],
    },
  });
  assert.equal(texasRes.status, 400);
  assert.ok(texasRes.data.error.includes('restricted to Oklahoma') || texasRes.data.error.includes('unavailable to this address'));

  // Order below $150 minimum delivery threshold (e.g. $50)
  const minOrderRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerA_token,
    body: {
      fulfillmentMethod: 'DELIVERY',
      deliveryInfo: {
        addressSnapshot: {
          recipientName: 'OKC Retailer',
          street: '1000 N Western Ave',
          city: 'Oklahoma City',
          state: 'OK',
          zip: '73106',
          phone: '(405) 555-0101',
        },
      },
      lineItems: [{ id: 'item_1', sku: 'TEST-SKU', name: 'Vape Pod', quantity: 4, pricePerUnit: 12.5 }], // Subtotal: $50
    },
  });
  assert.equal(minOrderRes.status, 400);
  assert.ok(minOrderRes.data.error.includes('Minimum delivery order is $150.00'));
});

// ---------------------------------------------------------------------------
// 5. Out of Stock Physical Inventory Test & Temporary Online Override
// ---------------------------------------------------------------------------
test('Physical Out of Stock Test: Physical 0 count triggers mismatch log, blocks online ordering, and flags order issue', async () => {
  // Ensure product starts unblocked for test reproducibility
  databaseStore.removeProductOnlineOverride('prod_foger_shortage', 'test_setup');
  databaseStore.removeProductOnlineOverride('FOGER-PRO-SOUR-APPLE', 'test_setup');

  // Step 1: Customer places order for 5 units
  const orderRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerA_token,
    body: {
      fulfillmentMethod: 'PICKUP',
      lineItems: [
        {
          id: 'prod_foger_shortage',
          sku: 'FOGER-PRO-SOUR-APPLE',
          name: 'Foger CT10000 Sour Apple Ice',
          quantity: 5,
          pricePerUnit: 14.0,
        },
      ],
    },
  });
  assert.equal(orderRes.status, 200);
  const orderId = orderRes.data.orderId;
  const storedOrder = databaseStore.getOrder(orderId)!;
  const itemId = storedOrder.lineItems[0].id;

  // Step 2: Staff physically checks warehouse shelf and discovers 0 units available.
  // Staff sets status: OUT_OF_STOCK and blockProductOnline: true
  const staffUpdateRes = await apiRequest(`/api/admin/orders/${orderId}/items/${itemId}/status`, {
    method: 'POST',
    token: admin_token,
    body: {
      status: 'OUT_OF_STOCK',
      physicalQuantityAvailable: 0,
      blockProductOnline: true,
      reason: 'Physical count 0 found on warehouse shelf during fulfillment preparation',
    },
  });
  assert.equal(staffUpdateRes.status, 200);
  assert.equal(staffUpdateRes.data.order.status, 'INVENTORY_ISSUE');
  assert.equal(staffUpdateRes.data.order.hasInventoryIssue, true);
  assert.equal(staffUpdateRes.data.order.customerActionRequired, true);
  assert.equal(staffUpdateRes.data.item.physicalQuantityAvailable, 0);
  assert.equal(staffUpdateRes.data.item.unavailableQuantity, 5);
  assert.equal(staffUpdateRes.data.productBlocked, true);

  // Step 3: Verify Inventory Mismatch record was automatically created
  const mismatches = databaseStore.listInventoryMismatches(false);
  const matchingLog = mismatches.find((m) => m.orderId === orderId && m.sku === 'FOGER-PRO-SOUR-APPLE');
  assert.ok(matchingLog, 'Discrepancy log must be recorded');
  assert.equal(matchingLog.physicalQuantity, 0);
  assert.ok(matchingLog.difference < 0);

  // Step 4: Verify Product is blocked from new online orders
  assert.equal(databaseStore.isProductBlockedOnline('prod_foger_shortage'), true);
  assert.equal(databaseStore.isProductBlockedOnline('FOGER-PRO-SOUR-APPLE'), true);

  // Attempting new order for this item must be rejected
  const blockedOrderRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerB_token,
    body: {
      fulfillmentMethod: 'PICKUP',
      lineItems: [
        {
          id: 'prod_foger_shortage',
          sku: 'FOGER-PRO-SOUR-APPLE',
          name: 'Foger CT10000 Sour Apple Ice',
          quantity: 2,
          pricePerUnit: 14.0,
        },
      ],
    },
  });
  assert.equal(blockedOrderRes.status, 400);
  assert.ok(blockedOrderRes.data.error.includes('temporarily unavailable online'));

  // Step 5: Verify Order CANNOT be moved to READY_FOR_PICKUP with unresolved shortage
  const illegalTransitionRes = await apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'READY_FOR_PICKUP' },
  });
  assert.equal(illegalTransitionRes.status, 400);
  assert.ok(illegalTransitionRes.data.error.includes('unresolved inventory issues'));

  // Step 6: Customer self-resolves by choosing REMOVE_ITEM
  const custActionRes = await apiRequest(`/api/customer/orders/${orderId}/action`, {
    method: 'POST',
    token: customerA_token,
    body: {
      itemId,
      resolution: 'REMOVE_ITEM',
      notes: 'Please remove out of stock item from order.',
    },
  });
  assert.equal(custActionRes.status, 200);

  // After resolution, order has no remaining issues
  const resolvedOrder = databaseStore.getOrder(orderId)!;
  assert.equal(resolvedOrder.hasInventoryIssue, false);
  assert.equal(resolvedOrder.status, 'PROCESSING');
});

// ---------------------------------------------------------------------------
// 6. Partial Inventory Availability Test
// ---------------------------------------------------------------------------
test('Partial Inventory Test: Customer orders 10, staff finds 6 -> Unavailable 4 -> Customer accepts partial -> Totals recalculated', async () => {
  const orderRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerA_token,
    body: {
      fulfillmentMethod: 'PICKUP',
      lineItems: [
        {
          id: 'prod_partial_pod',
          sku: 'POD-PARTIAL-100',
          name: 'Vaporesso Pod Refills 4pk',
          quantity: 10,
          pricePerUnit: 10.0, // Original subtotal: $100
        },
      ],
    },
  });
  assert.equal(orderRes.status, 200);
  const orderId = orderRes.data.orderId;
  const initialOrder = databaseStore.getOrder(orderId)!;
  const itemId = initialOrder.lineItems[0].id;
  assert.equal(initialOrder.originalSubtotal, 100.0);

  // Staff discovers only 6 available
  const staffRes = await apiRequest(`/api/admin/orders/${orderId}/items/${itemId}/status`, {
    method: 'POST',
    token: admin_token,
    body: {
      status: 'PARTIALLY_AVAILABLE',
      physicalQuantityAvailable: 6,
      reason: 'Shelf count 6 of 10 available',
    },
  });
  assert.equal(staffRes.status, 200);
  assert.equal(staffRes.data.item.itemFulfillmentStatus, 'PARTIALLY_AVAILABLE');
  assert.equal(staffRes.data.item.physicalQuantityAvailable, 6);
  assert.equal(staffRes.data.item.unavailableQuantity, 4);

  // Customer accepts available quantity: 6 units
  const resolveRes = await apiRequest(`/api/customer/orders/${orderId}/action`, {
    method: 'POST',
    token: customerA_token,
    body: {
      itemId,
      resolution: 'ACCEPT_PARTIAL',
      notes: '6 units is fine, thank you',
    },
  });
  assert.equal(resolveRes.status, 200);

  // Check recalculated totals
  const updatedOrder = databaseStore.getOrder(orderId)!;
  assert.equal(updatedOrder.subtotal, 60.0, 'Subtotal must recalculate to 6 * $10.00 = $60.00');
  assert.equal(updatedOrder.total, 60.0);
  assert.equal(updatedOrder.paymentStatus, 'ADJUSTED');
  assert.equal(updatedOrder.originalSubtotal, 100.0, 'Historical original subtotal must remain preserved');
  assert.equal(updatedOrder.lineItems[0].quantityOrdered, 10, 'Historical quantity ordered must remain preserved');
});

// ---------------------------------------------------------------------------
// 7. Multiple Item Fulfillment Exceptions Test
// ---------------------------------------------------------------------------
test('Multiple Items Test: Product A (Available), Product B (Out of Stock), Product C (Partially Available), Product D (Available)', async () => {
  const orderRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerA_token,
    body: {
      fulfillmentMethod: 'PICKUP',
      lineItems: [
        { id: 'pA', sku: 'SKU-A', name: 'Product A', quantity: 5, pricePerUnit: 10 },
        { id: 'pB', sku: 'SKU-B', name: 'Product B', quantity: 4, pricePerUnit: 15 },
        { id: 'pC', sku: 'SKU-C', name: 'Product C', quantity: 8, pricePerUnit: 12 },
        { id: 'pD', sku: 'SKU-D', name: 'Product D', quantity: 2, pricePerUnit: 20 },
      ],
    },
  });
  assert.equal(orderRes.status, 200);
  const orderId = orderRes.data.orderId;
  const ord = databaseStore.getOrder(orderId)!;

  // Staff updates each item independently
  await apiRequest(`/api/admin/orders/${orderId}/items/${ord.lineItems[0].id}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'AVAILABLE', physicalQuantityAvailable: 5 },
  });

  await apiRequest(`/api/admin/orders/${orderId}/items/${ord.lineItems[1].id}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'OUT_OF_STOCK', physicalQuantityAvailable: 0 },
  });

  await apiRequest(`/api/admin/orders/${orderId}/items/${ord.lineItems[2].id}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'PARTIALLY_AVAILABLE', physicalQuantityAvailable: 4 },
  });

  await apiRequest(`/api/admin/orders/${orderId}/items/${ord.lineItems[3].id}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'AVAILABLE', physicalQuantityAvailable: 2 },
  });

  const checkOrd = databaseStore.getOrder(orderId)!;
  assert.equal(checkOrd.status, 'INVENTORY_ISSUE');
  assert.equal(checkOrd.hasInventoryIssue, true);

  // Cannot mark ready for pickup
  const blockedRes = await apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'READY_FOR_PICKUP' },
  });
  assert.equal(blockedRes.status, 400);

  // Admin resolves B (remove) and C (accept partial 4)
  await apiRequest(`/api/admin/orders/${orderId}/resolve`, {
    method: 'POST',
    token: admin_token,
    body: { itemId: ord.lineItems[1].id, resolution: 'REMOVE_ITEM' },
  });

  await apiRequest(`/api/admin/orders/${orderId}/resolve`, {
    method: 'POST',
    token: admin_token,
    body: { itemId: ord.lineItems[2].id, resolution: 'ACCEPT_PARTIAL' },
  });

  // Now all items resolved -> Order returned to PROCESSING
  const finalOrd = databaseStore.getOrder(orderId)!;
  assert.equal(finalOrd.hasInventoryIssue, false);
  assert.equal(finalOrd.status, 'PROCESSING');

  // Now staff CAN mark ready for pickup
  const okReady = await apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    token: admin_token,
    body: { status: 'READY_FOR_PICKUP' },
  });
  assert.equal(okReady.status, 200);
  assert.equal(okReady.data.order.status, 'READY_FOR_PICKUP');
});

// ---------------------------------------------------------------------------
// 8. Customer Saved Addresses (CRUD & IDOR Protection)
// ---------------------------------------------------------------------------
test('Customer Saved Addresses: Add, list, default toggle, and strict IDOR boundary protection', async () => {
  // Customer A adds address
  const addRes = await apiRequest('/api/customer/addresses', {
    method: 'POST',
    token: customerA_token,
    body: {
      recipientName: 'Alpha Dock 1',
      streetAddress: '1000 N Western Ave',
      suiteUnit: 'Dock 4',
      city: 'Oklahoma City',
      state: 'OK',
      zipCode: '73106',
      phone: '(405) 555-0101',
      deliveryInstructions: 'Ring bell on dock door',
      isDefaultDelivery: true,
    },
  });
  assert.equal(addRes.status, 200);
  assert.ok(addRes.data.address.id);
  const addressA_id = addRes.data.address.id;

  // Customer A lists addresses
  const listA = await apiRequest('/api/customer/addresses', {
    token: customerA_token,
  });
  assert.equal(listA.status, 200);
  assert.equal(listA.data.addresses.length, 1);
  assert.equal(listA.data.addresses[0].isDefault, true);

  // IDOR check: Customer B CANNOT update or delete Customer A's address
  const deleteByB = await apiRequest(`/api/customer/addresses/${addressA_id}`, {
    method: 'DELETE',
    token: customerB_token,
  });
  assert.equal(deleteByB.status, 404, 'Customer B must not delete Customer A address');

  // Customer A can delete their own address
  const deleteByA = await apiRequest(`/api/customer/addresses/${addressA_id}`, {
    method: 'DELETE',
    token: customerA_token,
  });
  assert.equal(deleteByA.status, 200);
});

// ---------------------------------------------------------------------------
// 9. Internal Staff Notes & Confidentiality
// ---------------------------------------------------------------------------
test('Internal Staff Notes: Visible strictly to authorized business staff, never leaked to customers', async () => {
  const orderRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerA_token,
    body: {
      fulfillmentMethod: 'PICKUP',
      lineItems: [{ id: 'p1', sku: 'SKU-1', name: 'Item 1', quantity: 2, pricePerUnit: 10 }],
    },
  });
  const orderId = orderRes.data.orderId;

  // Admin adds internal staff note
  const noteRes = await apiRequest(`/api/admin/orders/${orderId}/internal-notes`, {
    method: 'POST',
    token: admin_token,
    body: {
      note: 'Confidential staff note: Spoke with store manager regarding discount on next carton.',
    },
  });
  assert.equal(noteRes.status, 200);

  // Admin GET /api/admin/orders/:id sees internal note
  const adminView = await apiRequest(`/api/admin/orders/${orderId}`, {
    token: admin_token,
  });
  assert.equal(adminView.status, 200);
  assert.ok(adminView.data.order.internalNotes.length > 0);
  assert.ok(adminView.data.order.internalNotes[0].note.includes('Confidential staff note'));

  // Customer GET /api/customer/orders/:id NEVER receives internal notes
  const custView = await apiRequest(`/api/customer/orders/${orderId}`, {
    token: customerA_token,
  });
  assert.equal(custView.status, 200);
  assert.equal(custView.data.order.internalNotes, undefined, 'Customer view must omit internal notes');

  // Customer list view GET /api/customer/orders also omits internal notes
  const custListView = await apiRequest('/api/customer/orders', {
    token: customerA_token,
  });
  assert.equal(custListView.status, 200);
  const foundCustOrd = custListView.data.orders.find((o: any) => o.id === orderId);
  assert.equal(foundCustOrd.internalNotes, undefined);
});

// ---------------------------------------------------------------------------
// 10. Security: RBAC & IDOR Protection
// ---------------------------------------------------------------------------
test('Security & RBAC: Regular customer cannot access admin order endpoints or manipulate other customer orders', async () => {
  // Customer A tries to access admin orders queue -> 403 Forbidden
  const adminQueueRes = await apiRequest('/api/admin/orders', {
    token: customerA_token,
  });
  assert.equal(adminQueueRes.status, 403);

  // Customer A tries to access admin inventory mismatches -> 403 Forbidden
  const mismatchRes = await apiRequest('/api/admin/inventory-mismatches', {
    token: customerA_token,
  });
  assert.equal(mismatchRes.status, 403);

  // Customer A creates an order
  const orderRes = await apiRequest('/api/inventory/orders', {
    method: 'POST',
    token: customerA_token,
    body: {
      fulfillmentMethod: 'PICKUP',
      lineItems: [{ id: 'p1', sku: 'SKU-1', name: 'Item 1', quantity: 2, pricePerUnit: 10 }],
    },
  });
  const orderA_id = orderRes.data.orderId;

  // IDOR: Customer B tries to view Customer A's order -> 404
  const idorViewRes = await apiRequest(`/api/customer/orders/${orderA_id}`, {
    token: customerB_token,
  });
  assert.equal(idorViewRes.status, 404);

  // IDOR: Customer B tries to submit action on Customer A's order -> 404
  const idorActionRes = await apiRequest(`/api/customer/orders/${orderA_id}/action`, {
    method: 'POST',
    token: customerB_token,
    body: { itemId: 'p1', resolution: 'REMOVE_ITEM' },
  });
  assert.equal(idorActionRes.status, 404);
});
