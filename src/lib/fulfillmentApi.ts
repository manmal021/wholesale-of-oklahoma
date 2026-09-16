/**
 * fulfillmentApi.ts
 * Client-side API service for Wholesale of Oklahoma order fulfillment,
 * pickup/delivery configurations, customer addresses, order tracking, and admin preparation workspace.
 */

export type FulfillmentMethod = 'PICKUP' | 'DELIVERY';

export type GeneralOrderStatus =
  | 'ORDER_RECEIVED'
  | 'PROCESSING'
  | 'INVENTORY_ISSUE'
  | 'CUSTOMER_ACTION_REQUIRED'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ItemFulfillmentStatus =
  | 'PENDING_CHECK'
  | 'AVAILABLE'
  | 'OUT_OF_STOCK'
  | 'PARTIALLY_AVAILABLE'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'SUBSTITUTION_AVAILABLE'
  | 'FULFILLED';

export interface PickupLocationInfo {
  locationId: string;
  locationName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  hours: string;
  phone: string;
  instructions: string;
}

export interface DeliveryEligibilityConfig {
  enabled: boolean;
  eligibleZipCodes: string[];
  eligibleCities: string[];
  minimumDeliveryOrder: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  instructions: string;
}

export interface FulfillmentConfig {
  pickupLocation: PickupLocationInfo;
  delivery: DeliveryEligibilityConfig;
}

export interface CustomerSavedAddress {
  id: string;
  customerId: string;
  type: 'billing' | 'delivery';
  isDefault: boolean;
  recipientName: string;
  businessName?: string;
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  deliveryInstructions?: string;
  createdAt: string;
}

export interface OrderItemRecord {
  id: string;
  productId: string;
  sku: string;
  name: string;
  flavor?: string;
  quantityOrdered: number;
  pricePerUnit: number;
  totalPrice: number;
  zoho_item_id?: string;
  systemInventory: number;
  physicalQuantityAvailable: number;
  unavailableQuantity: number;
  itemFulfillmentStatus: ItemFulfillmentStatus;
  substituteProductId?: string;
  substituteProductName?: string;
  substitutePrice?: number;
  customerResolutionChoice?: string;
  resolutionNotes?: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  businessName: string;
  email: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  status: GeneralOrderStatus;
  paymentStatus: 'PENDING' | 'PAID' | 'INVOICED' | 'ADJUSTED' | 'REFUNDED';
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  originalSubtotal: number;
  originalTotal: number;
  createdAt: string;
  updatedAt: string;
  pickupInfo?: {
    locationId: string;
    locationSnapshot: PickupLocationInfo;
    requestedPickupDate?: string;
    requestedPickupTime?: string;
    pickupStatus: string;
    readyForPickupAt?: string;
    pickedUpAt?: string;
    pickedUpByStaff?: string;
  };
  deliveryInfo?: {
    addressSnapshot: {
      recipientName: string;
      businessName?: string;
      street: string;
      unit?: string;
      city: string;
      state: string;
      zip: string;
      phone: string;
      deliveryInstructions?: string;
    };
    deliveryFee: number;
    deliveryStatus: string;
    outForDeliveryAt?: string;
    deliveredAt?: string;
    deliveredByStaff?: string;
  };
  lineItems: OrderItemRecord[];
  customerNotes?: string;
  internalNotes?: Array<{
    id: string;
    note: string;
    authorId: string;
    authorName: string;
    createdAt: string;
  }>;
  hasInventoryIssue?: boolean;
  customerActionRequired?: boolean;
  actionRequiredReason?: string;
  timeline: Array<{
    status: string;
    timestamp: string;
    note: string;
    updatedBy?: string;
  }>;
}

export interface InventoryMismatchRecord {
  id: string;
  orderId: string;
  productId: string;
  sku: string;
  productName: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  reportedBy: string;
  reportedAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export type ProductAvailabilityState = 'AVAILABLE' | 'LOW_STOCK' | 'TEMPORARILY_UNAVAILABLE' | 'OUT_OF_STOCK';

export interface InventoryOverrideRecord {
  productId: string;
  sku: string;
  name: string;
  isOutOfStockOnline: boolean;
  statusOverride?: ProductAvailabilityState;
  reportedBy: string;
  reportedAt: string;
  reason: string;
  active: boolean;
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('woo_session_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-session-token'] = token;
    }
  }
  return headers;
}

// ── Public / Fulfillment Config ─────────────────────────────────────────────

export async function fetchFulfillmentConfig(): Promise<FulfillmentConfig> {
  const res = await fetch('/api/fulfillment/config');
  if (!res.ok) throw new Error('Failed to load fulfillment configuration.');
  const data = await res.json();
  return data.config;
}

export async function validateDeliveryAddress(
  address: { streetAddress: string; suiteUnit?: string; city: string; state: string; zipCode: string; recipientName?: string; phone?: string },
  subtotal: number
): Promise<{
  eligible: boolean;
  reason?: string;
  deliveryFee: number;
  subtotal: number;
  total: number;
}> {
  const res = await fetch('/api/fulfillment/validate-delivery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, subtotal }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to validate delivery address.');
  return data;
}

// ── Customer Saved Addresses ────────────────────────────────────────────────

export async function fetchCustomerAddresses(): Promise<CustomerSavedAddress[]> {
  const res = await fetch('/api/customer/addresses', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load saved addresses.');
  const data = await res.json();
  return data.addresses || [];
}

export async function addCustomerAddress(addressData: {
  label?: string;
  type?: 'billing' | 'delivery';
  recipientName: string;
  streetAddress: string;
  suiteUnit?: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  deliveryInstructions?: string;
  isDefaultDelivery?: boolean;
}): Promise<CustomerSavedAddress> {
  const res = await fetch('/api/customer/addresses', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(addressData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save address.');
  return data.address;
}

export async function deleteCustomerAddress(addressId: string): Promise<void> {
  const res = await fetch(`/api/customer/addresses/${addressId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete address.');
}

export async function setDefaultDeliveryAddress(addressId: string): Promise<void> {
  const res = await fetch(`/api/customer/addresses/${addressId}/set-default`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to set default address.');
}

// ── Customer Orders ─────────────────────────────────────────────────────────

export async function fetchCustomerOrders(): Promise<OrderRecord[]> {
  const res = await fetch('/api/customer/orders', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load customer orders.');
  const data = await res.json();
  return data.orders || [];
}

export async function fetchCustomerOrder(orderId: string): Promise<OrderRecord> {
  const res = await fetch(`/api/customer/orders/${orderId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load order details.');
  const data = await res.json();
  return data.order;
}

export async function submitCustomerOrderAction(params: {
  orderId: string;
  itemId: string;
  resolution: 'ACCEPT_PARTIAL' | 'REMOVE_ITEM' | 'WAIT_FOR_PRODUCT' | 'REQUEST_SUBSTITUTE';
  notes?: string;
}): Promise<OrderRecord> {
  const res = await fetch(`/api/customer/orders/${params.orderId}/action`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      itemId: params.itemId,
      resolution: params.resolution,
      notes: params.notes,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit action resolution.');
  return data.order;
}

// ── Admin Orders Workspace ──────────────────────────────────────────────────

export async function fetchAdminOrders(params?: {
  status?: string;
  fulfillmentMethod?: string;
  search?: string;
}): Promise<{ orders: OrderRecord[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
  if (params?.fulfillmentMethod && params.fulfillmentMethod !== 'ALL') searchParams.set('fulfillmentMethod', params.fulfillmentMethod);
  if (params?.search) searchParams.set('search', params.search);

  const res = await fetch(`/api/admin/orders?${searchParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load admin orders.');
  const data = await res.json();
  return { orders: data.orders || [], total: data.total || 0 };
}

export async function fetchAdminOrder(orderId: string): Promise<OrderRecord> {
  const res = await fetch(`/api/admin/orders/${orderId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load order ${orderId}.`);
  const data = await res.json();
  return data.order;
}

export async function updateAdminOrderStatus(params: {
  orderId: string;
  status: GeneralOrderStatus;
  notes?: string;
  force?: boolean;
}): Promise<OrderRecord> {
  const res = await fetch(`/api/admin/orders/${params.orderId}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      status: params.status,
      notes: params.notes,
      force: params.force,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update order status.');
  return data.order;
}

export async function updateAdminOrderItemStatus(params: {
  orderId: string;
  itemId: string;
  status: ItemFulfillmentStatus;
  physicalQuantityAvailable?: number;
  blockProductOnline?: boolean;
  reason?: string;
}): Promise<{ order: OrderRecord; item: OrderItemRecord; productBlocked: boolean }> {
  const res = await fetch(`/api/admin/orders/${params.orderId}/items/${params.itemId}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      status: params.status,
      physicalQuantityAvailable: params.physicalQuantityAvailable,
      blockProductOnline: params.blockProductOnline,
      reason: params.reason,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update item fulfillment status.');
  return data;
}

export async function resolveAdminOrderIssue(params: {
  orderId: string;
  itemId?: string;
  resolution: 'ACCEPT_PARTIAL' | 'REMOVE_ITEM' | 'SUBSTITUTION' | 'CUSTOMER_WILL_WAIT' | 'CANCEL_ORDER';
  notes?: string;
  substituteItem?: { productId: string; sku: string; name: string; price: number; quantity: number };
}): Promise<OrderRecord> {
  const res = await fetch(`/api/admin/orders/${params.orderId}/resolve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to resolve order issue.');
  return data.order;
}

export async function addAdminInternalNote(orderId: string, note: string): Promise<OrderRecord> {
  const res = await fetch(`/api/admin/orders/${orderId}/internal-notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add internal note.');
  return data.order;
}

// ── Admin Online Overrides & Mismatches ──────────────────────────────────────

export async function setAdminProductOverride(params: {
  productId: string;
  sku?: string;
  productName?: string;
  isOutOfStockOnline?: boolean;
  statusOverride?: ProductAvailabilityState;
  reason: string;
}): Promise<void> {
  const res = await fetch(`/api/admin/products/${params.productId}/temporary-override`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update product online override.');
}

export async function fetchAdminInventoryMismatches(resolved?: boolean): Promise<InventoryMismatchRecord[]> {
  const url = typeof resolved === 'boolean'
    ? `/api/admin/inventory-mismatches?resolved=${resolved}`
    : '/api/admin/inventory-mismatches';
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load inventory mismatches.');
  const data = await res.json();
  return data.mismatches || [];
}

export async function resolveAdminInventoryMismatch(id: string, notes: string): Promise<void> {
  const res = await fetch(`/api/admin/inventory-mismatches/${id}/resolve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error('Failed to resolve mismatch record.');
}
