/**
 * inventoryApi.ts
 * Client-side service for querying the website backend /api/inventory endpoints.
 * Never connects directly to Zoho with exposed credentials.
 */

import type {
  InventoryFilterParams,
  InventoryResponse,
  InventoryItem,
  AdminInventorySettings,
  ZohoSyncStatus,
} from '../types/inventory';

const BASE_URL = '/api/inventory';

export async function fetchInventory(params: InventoryFilterParams = {}): Promise<InventoryResponse> {
  const query = new URLSearchParams();

  if (params.search) query.set('search', params.search);
  if (params.category && params.category !== 'All') query.set('category', params.category);
  if (params.brand && params.brand !== 'All') query.set('brand', params.brand);
  if (params.availability && params.availability !== 'all') query.set('availability', params.availability);
  if (params.price_range && params.price_range !== 'all') query.set('price_range', params.price_range);
  if (params.product_type && params.product_type !== 'All') query.set('product_type', params.product_type);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const url = `${BASE_URL}?${query.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load inventory: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchInventoryItem(idOrSku: string): Promise<InventoryItem> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(idOrSku)}`);
  if (!response.ok) {
    throw new Error(`Product ${idOrSku} not found`);
  }
  return response.json();
}

export async function fetchInventoryMeta(): Promise<{
  categories: string[];
  brands: string[];
  productTypes: string[];
  total_items: number;
}> {
  const response = await fetch(`${BASE_URL}/meta`);
  if (!response.ok) {
    throw new Error('Failed to load inventory metadata');
  }
  return response.json();
}

export async function fetchAdminStatus(): Promise<{
  sync_status: ZohoSyncStatus;
  settings: AdminInventorySettings;
}> {
  const response = await fetch(`${BASE_URL}/admin/status`);
  if (!response.ok) {
    throw new Error('Failed to fetch Zoho sync status');
  }
  return response.json();
}

export async function triggerZohoSync(): Promise<{
  success: boolean;
  sync_status: ZohoSyncStatus;
}> {
  const response = await fetch(`${BASE_URL}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to trigger Zoho synchronization');
  }
  return response.json();
}

export async function updateAdminSettings(settings: Partial<AdminInventorySettings>): Promise<{
  success: boolean;
  settings: AdminInventorySettings;
}> {
  const response = await fetch(`${BASE_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error('Failed to update inventory settings');
  }
  return response.json();
}

export async function submitWholesaleOrder(orderData: {
  customerName: string;
  businessName?: string;
  email?: string;
  phone: string;
  notes?: string;
  lineItems: Array<{
    id?: string;
    sku?: string;
    name: string;
    quantity: number;
    pricePerUnit: number;
    zoho_item_id?: string;
  }>;
}): Promise<{ success: boolean; orderId: string; message: string }> {
  const response = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!response.ok) {
    throw new Error('Failed to submit wholesale order');
  }
  return response.json();
}

