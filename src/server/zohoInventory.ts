/**
 * zohoInventory.ts
 * Zoho Inventory data service for Wholesale of Oklahoma.
 *
 * Fetches items directly from Zoho Inventory REST API v1.
 * Uses zohoAuth.ts for token management — never stores credentials here.
 *
 * Features:
 *  - In-memory cache with 60-second TTL (configurable via ZOHO_CACHE_TTL_SECONDS)
 *  - Stale-while-revalidate: if Zoho is temporarily unreachable, returns cached data
 *  - Full pagination (fetches all pages up to ZOHO_MAX_PAGES)
 *  - Normalizes Zoho raw item shapes into our clean InventoryItem schema
 */

import { getValidToken } from './zohoAuth.js';
import type { InventoryItem, StockStatus, InventoryVariant } from '../types/inventory.js';

// ---------------------------------------------------------------------------
// Config from environment variables
// ---------------------------------------------------------------------------
const ORG_ID          = () => process.env.ZOHO_ORG_ID || process.env.ZOHO_ORGANIZATION_ID || '';
const DC              = () => process.env.ZOHO_DC || 'com';
const CACHE_TTL_MS    = Number(process.env.ZOHO_CACHE_TTL_SECONDS || 60) * 1000;
const MAX_PAGES       = Number(process.env.ZOHO_MAX_PAGES || 10);
const PER_PAGE        = 200; // Zoho max items per page

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------
interface CacheEntry {
  items:      InventoryItem[];
  fetchedAt:  number;
  isStale:    boolean;
}

let _cache: CacheEntry | null = null;
let _isFetching = false; // prevents concurrent stampedes

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function apiBase(): string {
  return `https://www.zohoapis.${DC()}/inventory/v1`;
}

async function zohoGet(path: string): Promise<any> {
  const token = await getValidToken();
  const orgId = ORG_ID();

  if (!orgId) {
    throw new Error('ZOHO_ORG_ID is not set in .env');
  }

  const url = path.includes('?')
    ? `${path}&organization_id=${orgId}`
    : `${path}?organization_id=${orgId}`;

  const res = await fetch(`${apiBase()}${url}`, {
    method: 'GET',
    headers: {
      Authorization:                              `Zoho-oauthtoken ${token}`,
      'X-com-zoho-inventory-organizationid':      orgId,
      Accept:                                     'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoho API ${res.status} on ${path}: ${body}`);
  }

  const data = await res.json();

  // Zoho returns code=0 for success
  if (typeof data.code === 'number' && data.code !== 0) {
    throw new Error(`Zoho API error code ${data.code}: ${data.message}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** Maps Zoho's raw item object to our clean InventoryItem shape. */
function normalizeItem(raw: any): InventoryItem {
  const threshold    = Number(process.env.ZOHO_LOW_STOCK_THRESHOLD || 15);
  const stockOnHand  = Number(raw.stock_on_hand  ?? raw.actual_available_stock ?? 0);
  const available    = Number(raw.available_stock ?? raw.actual_available_stock ?? stockOnHand);

  let status: StockStatus = 'in_stock';
  if (available <= 0)         status = 'out_of_stock';
  else if (available <= threshold) status = 'low_stock';

  // Build variants if the item is part of an item group
  const variants: InventoryVariant[] = Array.isArray(raw.variants)
    ? raw.variants.map((v: any, idx: number) => {
        const vStock = Number(v.available_stock ?? v.stock_on_hand ?? 0);
        let vStatus: StockStatus = 'in_stock';
        if (vStock <= 0)          vStatus = 'out_of_stock';
        else if (vStock <= threshold) vStatus = 'low_stock';

        return {
          variant_id:      String(v.item_id   || `${raw.item_id}-v${idx}`),
          variant_sku:     String(v.sku        || `${raw.sku}-${idx}`),
          variant_name:    String(v.name       || `Variant ${idx + 1}`),
          attribute_name:  v.attribute_name    || 'Option',
          attribute_value: v.attribute_value   || v.name,
          stock_on_hand:   vStock,
          available_stock: vStock,
          stock_status:    vStatus,
          rate:            v.rate ? Number(v.rate) : Number(raw.rate || 0),
        };
      })
    : [];

  const rate = Number(raw.rate || raw.purchase_rate || 0);

  return {
    id:                String(raw.item_id),
    zoho_item_id:      String(raw.item_id),
    sku:               String(raw.sku || `SKU-${raw.item_id}`),
    name:              String(raw.name || 'Unnamed Product'),
    brand:             String(raw.brand || raw.cf_brand || raw.manufacturer || 'Wholesale of OK'),
    category:          String(raw.category_name || raw.category || 'General'),
    subcategory:       raw.subcategory || raw.cf_subcategory || undefined,
    description:       String(raw.description || raw.item_description || ''),
    image_url:         raw.image_document_id
                         ? `https://inventory.zoho.${DC()}/api/v1/items/${raw.item_id}/images/main`
                         : (raw.image_url || raw.image_name || ''),
    gallery_images:    Array.isArray(raw.documents)
                         ? raw.documents.map((d: any) => d.file_url).filter(Boolean)
                         : undefined,
    rate,
    retail_msrp:       raw.sales_rate  ? Number(raw.sales_rate)  : undefined,
    purchase_rate:     raw.purchase_rate ? Number(raw.purchase_rate) : undefined,
    available_stock:   available,
    stock_on_hand:     stockOnHand,
    stock_status:      status,
    status:            raw.status === 'active' ? 'active' : 'inactive',
    upc:               raw.upc || raw.ean || raw.isbn || undefined,
    unit:              raw.unit || 'Pack',
    min_order_qty:     Number(raw.reorder_level || 1),
    bulk_pricing:      [],           // Zoho price lists can be added here later
    specs:             {
      size:     raw.cf_size     || undefined,
      nicotine: raw.cf_nicotine || undefined,
      puffs:    raw.cf_puffs    || undefined,
      origin:   'USA Distributed · Licensed OK Warehouse',
    },
    features:          [],
    variants:          variants.length > 0 ? variants : undefined,
    badge:             raw.cf_badge || undefined,
    last_modified_time: raw.last_modified_time,
  };
}

// ---------------------------------------------------------------------------
// Core fetch functions
// ---------------------------------------------------------------------------

/**
 * Fetches ALL items from Zoho Inventory (paginated).
 * Returns normalized InventoryItem[].
 */
export async function fetchAllZohoItems(): Promise<InventoryItem[]> {
  const allItems: InventoryItem[] = [];
  let page    = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    const data = await zohoGet(`/items?page=${page}&per_page=${PER_PAGE}&filter_by=Status.Active`);
    const rawItems: any[] = data.items || [];

    for (const raw of rawItems) {
      try {
        allItems.push(normalizeItem(raw));
      } catch (err) {
        console.warn(`[ZohoInventory] Skipping item ${raw.item_id}:`, err);
      }
    }

    hasMore = data.page_context?.has_more_page ?? false;
    page++;
  }

  console.log(`[ZohoInventory] Fetched ${allItems.length} items from Zoho (${page - 1} pages).`);
  return allItems;
}

/**
 * Returns inventory with in-memory caching + stale-while-revalidate.
 * Safe to call on every request — will only hit Zoho every CACHE_TTL_MS.
 */
export async function getCachedInventory(): Promise<{
  items: InventoryItem[];
  fromCache: boolean;
  fetchedAt: string;
}> {
  const now = Date.now();

  // Serve fresh cache without hitting Zoho
  if (_cache && !_cache.isStale && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return { items: _cache.items, fromCache: true, fetchedAt: new Date(_cache.fetchedAt).toISOString() };
  }

  // Concurrent request guard — don't stampede Zoho
  if (_isFetching) {
    if (_cache) {
      // Return stale cache while a refresh is in flight
      return { items: _cache.items, fromCache: true, fetchedAt: new Date(_cache.fetchedAt).toISOString() };
    }
    // Wait briefly for the in-flight request
    await new Promise(r => setTimeout(r, 800));
    return getCachedInventory();
  }

  _isFetching = true;

  try {
    const items = await fetchAllZohoItems();
    _cache = { items, fetchedAt: now, isStale: false };
    return { items, fromCache: false, fetchedAt: new Date(now).toISOString() };
  } catch (err) {
    console.error('[ZohoInventory] ❌ Failed to fetch from Zoho:', err);

    if (_cache) {
      // Stale-while-revalidate: return old cache, mark as stale
      _cache.isStale = true;
      console.warn('[ZohoInventory] ⚠ Returning stale cache.');
      return { items: _cache.items, fromCache: true, fetchedAt: new Date(_cache.fetchedAt).toISOString() };
    }

    throw err; // No cache at all — propagate error to caller
  } finally {
    _isFetching = false;
  }
}

/**
 * Fetches a single item by Zoho item ID.
 */
export async function getZohoItem(itemId: string): Promise<InventoryItem | null> {
  try {
    const data = await zohoGet(`/items/${encodeURIComponent(itemId)}`);
    return data.item ? normalizeItem(data.item) : null;
  } catch (err) {
    console.error(`[ZohoInventory] Failed to fetch item ${itemId}:`, err);
    return null;
  }
}

/**
 * Invalidates the in-memory cache, forcing the next request to hit Zoho.
 * Call this from webhook handlers when Zoho pushes an update.
 */
export function invalidateCache(): void {
  if (_cache) {
    _cache.isStale = true;
  }
  console.log('[ZohoInventory] Cache invalidated.');
}
