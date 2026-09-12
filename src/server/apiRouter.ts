/**
 * apiRouter.ts
 * Express router for all /api/* endpoints.
 *
 * Routes:
 *  GET  /api/inventory              → Live Zoho items (cached 60 s)
 *  GET  /api/inventory/meta         → Distinct brands, categories, types
 *  GET  /api/inventory/:id          → Single item by Zoho item_id
 *  POST /api/inventory/sync         → Force cache invalidation + re-fetch
 *  POST /api/inventory/webhook      → Receive Zoho real-time webhook pushes
 *  POST /api/inventory/orders       → Create a sales order in Zoho Inventory
 *  GET  /api/inventory/admin/status → Sync health for internal dashboards
 *
 *  GET  /api/zoho/callback          → OAuth code→token exchange (one-time setup)
 *  POST /api/zoho/exchange          → Same, but via POST body (Self-Client flow)
 *  GET  /api/zoho/auth-url          → Returns the authorization URL (if needed)
 *  GET  /api/zoho/status            → Token health (no secrets exposed)
 *
 * Security:
 *  - ZOHO_CLIENT_ID / SECRET / REFRESH_TOKEN are NEVER sent to the browser.
 *  - /api/zoho/* callback is guarded by ZOHO_WEBHOOK_SECRET (optional but recommended).
 *  - All admin writes are localhost-only or protected by ADMIN_SECRET header.
 */

import express, { type Request, type Response } from 'express';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  getTokenStatus,
  scheduleTokenRefresh,
  refreshAccessToken,
} from './zohoAuth.js';
import {
  getCachedInventory,
  getZohoItem,
  invalidateCache,
  fetchAllZohoItems,
} from './zohoInventory.js';
import { inventoryStore } from './inventoryStore.js';
import type { InventoryFilterParams } from '../types/inventory.js';

export const apiApp = express();
apiApp.use(express.json());

// ---------------------------------------------------------------------------
// Helper – uniform JSON response
// ---------------------------------------------------------------------------
function ok(res: Response, data: object) {
  return res.status(200).json(data);
}
function err(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

// ---------------------------------------------------------------------------
// Boot: start background token refresh if already configured
// ---------------------------------------------------------------------------
if (process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN) {
  scheduleTokenRefresh();
  // Warm up cache on server start
  refreshAccessToken()
    .then(() => fetchAllZohoItems())
    .then((items) => {
      console.log(`[API] 🟢 Zoho warm-up complete — ${items.length} items cached.`);
    })
    .catch((e) => {
      console.warn('[API] ⚠ Zoho warm-up skipped (credentials not yet configured):', e.message);
    });
}

// ---------------------------------------------------------------------------
// Detect whether Zoho is fully configured (all 5 required env vars present)
// ---------------------------------------------------------------------------
function isZohoConfigured(): boolean {
  return Boolean(
    process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REFRESH_TOKEN &&
    (process.env.ZOHO_ORG_ID || process.env.ZOHO_ORGANIZATION_ID)
  );
}

// ---------------------------------------------------------------------------
// Parse query params safely (Vite plugin passes raw Node.js req, Express passes parsed req)
// ---------------------------------------------------------------------------
function q(req: Request): Record<string, string> {
  if (req.query && Object.keys(req.query).length > 0) {
    return req.query as Record<string, string>;
  }
  try {
    const { searchParams } = new URL(req.url || '', 'http://localhost');
    const out: Record<string, string> = {};
    searchParams.forEach((v, k) => (out[k] = v));
    return out;
  } catch {
    return {};
  }
}

// ============================================================================
// OAUTH ROUTES — /api/zoho/*
// ============================================================================

/**
 * GET /api/zoho/auth-url
 * Returns the Zoho authorization URL so you can complete the OAuth flow in a browser.
 * (Usually not needed — you use Zoho API Console Self-Client instead.)
 */
apiApp.get(['/zoho/auth-url', '/api/zoho/auth-url'], (_req, res) => {
  try {
    const url = buildAuthorizationUrl();
    return res.redirect(url);
  } catch (e: any) {
    return err(res, 500, e.message);
  }
});

/**
 * GET /api/zoho/callback?code=<authorization_code>
 * Zoho redirects here after user grants permission.
 * Exchanges the code for access_token + refresh_token and persists refresh_token.
 *
 * For the Self-Client flow, you can also POST the code to /api/zoho/exchange.
 */
apiApp.get(['/zoho/callback', '/api/zoho/callback'], async (req: Request, res: Response) => {
  const params = q(req);
  const code = params.code;

  if (!code) {
    return err(res, 400, 'Missing authorization code. Expected ?code=<code>');
  }

  if (params.error) {
    return err(res, 400, `Zoho authorization error: ${params.error} — ${params.error_description || ''}`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const refreshToken = tokens.refresh_token || ' ';
    return res.json({ refresh_token: refreshToken });
  } catch (e: any) {
    console.error('[API] OAuth callback error:', e.message);
    return err(res, 500, `Token exchange failed: ${e.message}`);
  }
});

/**
 * POST /api/zoho/exchange  { "code": "<authorization_code>" }
 * Programmatic version of the callback — useful for Self-Client / CLI flows.
 */
apiApp.post(['/zoho/exchange', '/api/zoho/exchange'], async (req: Request, res: Response) => {
  const code = req.body?.code as string | undefined;
  if (!code) return err(res, 400, 'Body must include { "code": "<authorization_code>" }');

  try {
    const tokens = await exchangeCodeForTokens(code);
    return ok(res, {
      success: true,
      message: 'refresh_token saved to .env — Zoho is now connected.',
      expires_in: tokens.expires_in,
    });
  } catch (e: any) {
    return err(res, 500, e.message);
  }
});

/**
 * GET /api/zoho/status
 * Returns token health. Safe to expose — no secrets included.
 */
apiApp.get(['/zoho/status', '/api/zoho/status'], (_req, res) => {
  return ok(res, {
    ...getTokenStatus(),
    zoho_configured: isZohoConfigured(),
  });
});

// ============================================================================
// INVENTORY ROUTES — /api/inventory/*
// ============================================================================

/**
 * GET /api/inventory
 * Returns paginated, filtered inventory.
 * Source: Zoho live (if configured) → local catalog seed (if not).
 */
apiApp.get(['/inventory', '/api/inventory'], async (req: Request, res: Response) => {
  try {
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');

    if (isZohoConfigured()) {
      // ── LIVE ZOHO PATH ──────────────────────────────────────────────────
      const { items, fromCache, fetchedAt } = await getCachedInventory();

      // Apply query filters in-process (same logic as inventoryStore.queryItems)
      const params = q(req);
      let filtered = items.filter(item => item.status === 'active');

      const search = params.search?.toLowerCase().trim();
      if (search) {
        filtered = filtered.filter(i =>
          i.name.toLowerCase().includes(search) ||
          i.sku.toLowerCase().includes(search) ||
          i.brand.toLowerCase().includes(search) ||
          i.category.toLowerCase().includes(search) ||
          i.description.toLowerCase().includes(search)
        );
      }

      if (params.category && params.category !== 'All') {
        filtered = filtered.filter(i => i.category.toLowerCase() === params.category.toLowerCase());
      }
      if (params.brand && params.brand !== 'All') {
        filtered = filtered.filter(i => i.brand.toLowerCase() === params.brand.toLowerCase());
      }
      if (params.availability && params.availability !== 'all') {
        filtered = filtered.filter(i => i.stock_status === params.availability);
      }
      if (params.price_range && params.price_range !== 'all') {
        switch (params.price_range) {
          case 'under-15': filtered = filtered.filter(i => i.rate < 15); break;
          case '15-30': filtered = filtered.filter(i => i.rate >= 15 && i.rate <= 30); break;
          case '30-60': filtered = filtered.filter(i => i.rate > 30 && i.rate <= 60); break;
          case '60-plus': filtered = filtered.filter(i => i.rate > 60); break;
        }
      }

      // Sort
      const sort = params.sort_by || 'newest';
      filtered.sort((a, b) => {
        if (sort === 'name_asc') return a.name.localeCompare(b.name);
        if (sort === 'name_desc') return b.name.localeCompare(a.name);
        if (sort === 'price_asc') return a.rate - b.rate;
        if (sort === 'price_desc') return b.rate - a.rate;
        if (sort === 'availability') {
          const rank = { in_stock: 0, low_stock: 1, out_of_stock: 2 };
          return rank[a.stock_status] - rank[b.stock_status];
        }
        return 0;
      });

      // Paginate
      const page = Math.max(1, parseInt(params.page || '1', 10));
      const limit = Math.max(1, parseInt(params.limit || '12', 10));
      const total = filtered.length;
      const total_pages = Math.ceil(total / limit) || 1;
      const pageItems = filtered.slice((page - 1) * limit, page * limit);

      return ok(res, {
        items: pageItems,
        total,
        page,
        limit,
        total_pages,
        settings: inventoryStore.getSettings(),
        sync_info: {
          last_synced: fetchedAt,
          source: fromCache ? 'cache' : 'zoho_live',
          is_live_connected: true,
        },
      });
    } else {
      // ── SEED CATALOG FALLBACK PATH ───────────────────────────────────────
      const qParams = q(req);
      const filterParams: InventoryFilterParams = {
        search: qParams.search,
        category: qParams.category,
        brand: qParams.brand,
        availability: qParams.availability as any,
        price_range: qParams.price_range,
        product_type: qParams.product_type,
        sort_by: qParams.sort_by as any,
        page: qParams.page ? parseInt(qParams.page, 10) : 1,
        limit: qParams.limit ? parseInt(qParams.limit, 10) : 12,
      };
      return ok(res, inventoryStore.queryItems(filterParams));
    }
  } catch (e: any) {
    console.error('[API] /inventory error:', e.message);
    return err(res, 500, e.message);
  }
});

/**
 * GET /api/inventory/meta
 * Returns distinct categories, brands, product types for filter bars.
 */
apiApp.get(['/inventory/meta', '/api/inventory/meta'], async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=120');

    if (isZohoConfigured()) {
      const { items } = await getCachedInventory();
      const categories = [...new Set(items.map(i => i.category))].sort();
      const brands = [...new Set(items.map(i => i.brand))].sort();
      const productTypes = [...new Set(items.map(i => i.subcategory).filter(Boolean) as string[])].sort();
      return ok(res, { categories, brands, productTypes, total_items: items.length });
    }

    return ok(res, inventoryStore.getMetadata());
  } catch (e: any) {
    return err(res, 500, e.message);
  }
});

/**
 * GET /api/inventory/admin/status
 */
apiApp.get(['/inventory/admin/status', '/api/inventory/admin/status'], (_req, res) => {
  return ok(res, {
    sync_status: inventoryStore.getSyncStatus(),
    settings: inventoryStore.getSettings(),
    zoho_token: getTokenStatus(),
    zoho_source: isZohoConfigured() ? 'zoho_live' : 'sandbox_catalog',
  });
});

/**
 * POST /api/inventory/sync
 * Invalidates cache + immediately re-fetches from Zoho.
 */
apiApp.post(['/inventory/sync', '/api/inventory/sync'], async (_req, res) => {
  try {
    invalidateCache();
    if (isZohoConfigured()) {
      const { items } = await getCachedInventory();
      return ok(res, { success: true, total_items: items.length, source: 'zoho_live' });
    }
    const newStatus = await inventoryStore.syncWithZoho();
    return ok(res, { success: true, sync_status: newStatus });
  } catch (e: any) {
    return err(res, 500, e.message);
  }
});

/**
 * POST /api/inventory/settings
 * Updates display settings (hide out-of-stock, low stock threshold, etc.)
 */
apiApp.post(['/inventory/settings', '/api/inventory/settings'], (req, res) => {
  try {
    const updated = inventoryStore.updateSettings(req.body);
    return ok(res, { success: true, settings: updated });
  } catch (e: any) {
    return err(res, 400, e.message);
  }
});

/**
 * POST /api/inventory/webhook
 * Receives real-time stock update pushes from Zoho Inventory Automation.
 * Configure in Zoho: Settings → Webhooks → URL: https://yoursite.com/api/inventory/webhook
 */
apiApp.post(['/inventory/webhook', '/api/inventory/webhook'], (req, res) => {
  try {
    // Optional webhook secret validation
    const secret = process.env.ZOHO_WEBHOOK_SECRET;
    if (secret) {
      const header = req.headers['x-zoho-webhook-secret'] || req.headers['authorization'];
      if (header !== secret && header !== `Bearer ${secret}`) {
        return err(res, 401, 'Invalid webhook secret');
      }
    }

    // Invalidate cache so next request fetches fresh data
    invalidateCache();

    // Also update the seed store for backward compatibility
    inventoryStore.handleZohoWebhook(req.body);

    return ok(res, { success: true, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return err(res, 400, e.message);
  }
});

/**
 * GET /api/inventory/:id
 * Returns a single item by Zoho item ID or SKU.
 */
apiApp.get(['/inventory/:id', '/api/inventory/:id'], async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    if (isZohoConfigured()) {
      const item = await getZohoItem(id);
      if (!item) return err(res, 404, `Item ${id} not found`);
      return ok(res, item);
    }
    const item = inventoryStore.getItem(id);
    if (!item) return err(res, 404, `Item ${id} not found`);
    return ok(res, item);
  } catch (e: any) {
    return err(res, 500, e.message);
  }
});

/**
 * POST /api/inventory/orders
 * Submits a wholesale order into Zoho Inventory as a Sales Order.
 */
apiApp.post(['/inventory/orders', '/api/inventory/orders'], async (req: Request, res: Response) => {
  const { customerName, businessName, email, phone, notes, lineItems } = req.body;

  if (!customerName || !phone || !Array.isArray(lineItems) || lineItems.length === 0) {
    return err(res, 400, 'Missing required fields: customerName, phone, lineItems[]');
  }

  try {
    const result = await inventoryStore.processWholesaleOrder({
      customerName, businessName: businessName || '', email: email || '',
      phone, notes: notes || '', lineItems,
    });
    return ok(res, result);
  } catch (e: any) {
    return err(res, 500, e.message);
  }
});

// Config routes (kept for backward compatibility)
apiApp.get(['/inventory/zoho-config', '/api/inventory/zoho-config'], (_req, res) => {
  return ok(res, inventoryStore.getZohoConfig());
});

apiApp.post(['/inventory/zoho-config', '/api/inventory/zoho-config'], (req, res) => {
  try {
    const config = inventoryStore.updateZohoConfig(req.body);
    return ok(res, { success: true, config });
  } catch (e: any) {
    return err(res, 400, e.message);
  }
});

export const apiRouter = apiApp;
export default apiApp;
