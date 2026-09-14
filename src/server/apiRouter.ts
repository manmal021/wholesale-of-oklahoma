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
import crypto from 'crypto';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  getTokenStatus,
  scheduleTokenRefresh,
  refreshAccessToken,
  getValidToken,
} from './zohoAuth.js';
import {
  getCachedInventory,
  getZohoItem,
  invalidateCache,
  fetchAllZohoItems,
} from './zohoInventory.js';
import { inventoryStore } from './inventoryStore.js';
import { wholesaleStore } from './wholesaleStore.js';
import { authStore, type UserRole, type SessionRecord } from './authStore.js';
import { documentStore } from './documentStore.js';
import { productImageRegistry } from './productImageRegistry.js';
import { PRODUCTS } from '../lib/productDatabase.js';
import type { InventoryFilterParams } from '../types/inventory.js';

export const apiApp = express();
apiApp.use(express.json({ limit: '15mb' }));

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
// Session & Wholesale Pricing Authorization (OWASP A01 / Rules 2, 3, 12)
// ---------------------------------------------------------------------------
function getSessionUser(req: Request): SessionRecord | null {
  let token = '';
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/woo_session=([^;]+)/);
  if (match) {
    token = match[1];
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  } else if (typeof req.headers['x-session-token'] === 'string') {
    token = req.headers['x-session-token'];
  }
  return authStore.validateSession(token);
}

function hasApprovedPricingAccess(req: Request): boolean {
  const session = getSessionUser(req);
  return session?.role === 'approved_customer' || session?.role === 'admin';
}

function sanitizeItemForClient(item: any, hasPricingAccess: boolean) {
  if (hasPricingAccess) {
    return {
      ...item,
      has_pricing_access: true,
    };
  }
  const safe = { ...item };
  delete safe.rate;
  delete safe.pricePerUnit;
  delete safe.bulk_pricing;
  delete safe.bulkPricing;
  delete safe.purchase_rate;
  delete safe.retail_msrp;
  if (Array.isArray(safe.variants)) {
    safe.variants = safe.variants.map((v: any) => {
      const vSafe = { ...v };
      delete vSafe.rate;
      return { ...vSafe, rate: null };
    });
  }
  return {
    ...safe,
    rate: null,
    bulk_pricing: [],
    bulkPricing: [],
    has_pricing_access: false,
    pricing_notice: 'Login to View Wholesale Pricing',
  };
}

// ---------------------------------------------------------------------------
// Rate Limiter Middleware (OWASP A04 / A10 / Rule 22)
// ---------------------------------------------------------------------------
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: () => void) => {
    const ip = req.ip || req.socket?.remoteAddress || 'client';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    record.count++;
    return next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}, 60000).unref();

// ---------------------------------------------------------------------------
// Administrative Authorization Middleware (OWASP A01 / Rule 12 & 14)
// ---------------------------------------------------------------------------
function validateAdminKey(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET_KEY;
  const rawProvided = req.headers['x-admin-key'] || req.headers['authorization'];
  const provided = typeof rawProvided === 'string' ? rawProvided.replace(/^Bearer\s+/i, '').trim() : '';

  if (secret && provided) {
    const bufProvided = Buffer.from(provided);
    const bufSecret = Buffer.from(secret);
    if (bufProvided.length === bufSecret.length && crypto.timingSafeEqual(bufProvided, bufSecret)) {
      return true;
    }
  }
  return false;
}

function requireAdminAuth(req: Request, res: Response, next: () => void) {
  if (validateAdminKey(req)) {
    return next();
  }

  const session = getSessionUser(req);
  if (session?.role === 'admin') {
    return next();
  }

  // In non-production environments allow localhost without admin key
  const clientIp = req.socket?.remoteAddress || req.ip || '';
  if (process.env.NODE_ENV !== 'production' && (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('127.0.0.1'))) {
    return next();
  }

  return err(res, 401, 'Unauthorized: Administrative key required');
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
apiApp.get(['/zoho/auth-url', '/api/zoho/auth-url'], (req: Request, res: Response) => {
  try {
    const url = buildAuthorizationUrl();
    const params = q(req);
    if (params.format === 'json' || (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html'))) {
      return ok(res, { url });
    }
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

    // If client requested JSON response
    if (params.format === 'json' || (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html'))) {
      return res.json({
        success: true,
        message: 'Zoho connected and authorized successfully. Token is stored server-side.',
        expires_in: tokens.expires_in,
      });
    }

    // Render clean confirmation HTML page (NEVER output raw secret tokens)
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zoho Connected Successfully</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; max-width: 580px; width: 100%; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
    h2 { color: #10b981; margin-top: 0; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 24px; }
    p { color: #cbd5e1; line-height: 1.6; font-size: 14px; margin: 16px 0; }
    .status-badge { display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; font-weight: 600; padding: 6px 14px; rounded: 9999px; font-size: 13px; border-radius: 9999px; }
    .btn-group { display: flex; gap: 10px; margin-top: 24px; justify-content: center; flex-wrap: wrap; }
    a.btn { display: inline-block; background: #f97316; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; transition: background 0.2s; }
    a.btn:hover { background: #ea580c; }
    a.btn-secondary { background: #334155; color: #f8fafc; }
    a.btn-secondary:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <h2>✅ Zoho Connected Successfully!</h2>
    <div class="status-badge">OAuth 2.0 Credentials Authenticated</div>
    <p>Your server has securely completed the authorization flow. Live inventory synchronization is now active and tokens are secured server-side.</p>
    <div class="btn-group">
      <a href="/api/zoho/status" class="btn btn-secondary">Verify API Health</a>
      <a href="/" class="btn">Return to Store</a>
    </div>
  </div>
</body>
</html>`);
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
apiApp.get(['/zoho/status', '/api/zoho/status'], async (_req, res) => {
  let zohoFetchError: string | null = null;
  let zohoItemCount: number | null = null;
  let zohoRawStatus: number | null = null;
  let zohoSampleItem: any = null;

  if (isZohoConfigured()) {
    try {
      const token = await getValidToken();
      const orgId = process.env.ZOHO_ORG_ID || process.env.ZOHO_ORGANIZATION_ID || '';
      const dc = process.env.ZOHO_DC || 'com';
      const testRes = await fetch(`https://www.zohoapis.${dc}/inventory/v1/items?organization_id=${orgId}&page=1&per_page=5`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'X-com-zoho-inventory-organizationid': orgId,
          Accept: 'application/json',
        },
      });
      zohoRawStatus = testRes.status;
      const testData = await testRes.json() as any;
      if (!testRes.ok || (typeof testData.code === 'number' && testData.code !== 0)) {
        zohoFetchError = `Code ${testData.code}: ${testData.message || JSON.stringify(testData)}`;
      } else {
        zohoItemCount = testData.page_context?.total || testData.items?.length || 0;
        if (testData.items && testData.items.length > 0) {
          zohoSampleItem = {
            name: testData.items[0].name,
            sku: testData.items[0].sku,
            item_id: testData.items[0].item_id,
            status: testData.items[0].status,
          };
        }
      }
    } catch (e: any) {
      zohoFetchError = e.message;
    }
  }

  return ok(res, {
    has_client_id: Boolean(process.env.ZOHO_CLIENT_ID),
    has_client_secret: Boolean(process.env.ZOHO_CLIENT_SECRET),
    has_refresh_token: Boolean(process.env.ZOHO_REFRESH_TOKEN),
    has_org_id: Boolean(
      process.env.ZOHO_ORG_ID || process.env.ZOHO_ORGANIZATION_ID),
    ...getTokenStatus(),
    zoho_configured: isZohoConfigured(),
    zoho_raw_http_status: zohoRawStatus,
    zoho_item_count: zohoItemCount,
    zoho_sample_item: zohoSampleItem,
    zoho_fetch_error: zohoFetchError,
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
    const hasPricingAccess = hasApprovedPricingAccess(req);
    res.setHeader('Vary', 'Cookie, Authorization, Accept');
    if (hasPricingAccess) {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    }

    if (isZohoConfigured()) {
      try {
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
        const pageItems = filtered
          .slice((page - 1) * limit, page * limit)
          .map((item) => sanitizeItemForClient(item, hasPricingAccess));

        return ok(res, {
          items: pageItems,
          total,
          page,
          limit,
          total_pages,
          has_pricing_access: hasPricingAccess,
          settings: inventoryStore.getSettings(),
          sync_info: {
            last_synced: fetchedAt,
            source: fromCache ? 'cache' : 'zoho_live',
            is_live_connected: true,
          },
        });
      } catch (zohoError: any) {
        console.warn('[API] Zoho fetch failed, falling back to seed catalog:', zohoError.message);
      }
    }

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
    const result = inventoryStore.queryItems(filterParams);
    return ok(res, {
      ...result,
      has_pricing_access: hasPricingAccess,
      items: result.items.map((item) => sanitizeItemForClient(item, hasPricingAccess)),
    });
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
      try {
        const { items } = await getCachedInventory();
        const categories = [...new Set(items.map(i => i.category))].sort();
        const brands = [...new Set(items.map(i => i.brand))].sort();
        const productTypes = [...new Set(items.map(i => i.subcategory).filter(Boolean) as string[])].sort();
        return ok(res, { categories, brands, productTypes, total_items: items.length });
      } catch (zohoError: any) {
        console.warn('[API] Zoho meta fetch failed, falling back to catalog meta:', zohoError.message);
      }
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
 * GET /api/inventory/admin/images
 * Returns audit records and verified image metadata for all catalog items.
 */
apiApp.get(['/inventory/admin/images', '/api/inventory/admin/images'], (_req, res) => {
  return ok(res, {
    audits: productImageRegistry.getAllAudits(),
    total: productImageRegistry.getAllAudits().length,
  });
});

/**
 * POST /api/inventory/admin/images/review
 * Allows admin to review, approve, update URL, or remove image assignments.
 */
apiApp.post(['/inventory/admin/images/review', '/api/inventory/admin/images/review'], requireAdminAuth, (req, res) => {
  const { productId, action, imageUrl, notes } = req.body || {};
  if (!productId || !action) {
    return err(res, 400, 'Missing productId or action (APPROVE | REJECT | UPDATE_URL | REMOVE)');
  }
  const updated = productImageRegistry.reviewProductImage(productId, action, imageUrl, notes);
  if (!updated) {
    return err(res, 404, `Product ${productId} not found in image registry`);
  }
  return ok(res, { success: true, audit: updated });
});

/**
 * POST /api/inventory/sync
 * Invalidates cache + immediately re-fetches from Zoho.
 * Guarded by administrative authorization and rate limit.
 */
apiApp.post(['/inventory/sync', '/api/inventory/sync'], requireAdminAuth, rateLimit(5, 10 * 60 * 1000), async (_req, res) => {
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
 * Guarded by administrative authorization.
 */
apiApp.post(['/inventory/settings', '/api/inventory/settings'], requireAdminAuth, (req, res) => {
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
 * Protected by timing-safe signature comparison.
 */
apiApp.post(['/inventory/webhook', '/api/inventory/webhook'], (req, res) => {
  try {
    const secret = process.env.ZOHO_WEBHOOK_SECRET;
    if (!secret) {
      return err(res, 500, 'Webhook secret not configured on server');
    }

    const rawHeader = req.headers['x-zoho-webhook-secret'] || req.headers['authorization'];
    const header = typeof rawHeader === 'string' ? rawHeader.replace(/^Bearer\s+/i, '').trim() : '';

    const bufProvided = Buffer.from(header);
    const bufSecret = Buffer.from(secret);

    if (bufProvided.length !== bufSecret.length || !crypto.timingSafeEqual(bufProvided, bufSecret)) {
      return err(res, 401, 'Invalid webhook secret');
    }

    // Invalidate cache so next request fetches fresh data
    invalidateCache();
    inventoryStore.handleZohoWebhook(req.body);

    return ok(res, { success: true, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return err(res, 400, 'Invalid webhook request');
  }
});

/**
 * GET /api/inventory/:id
 * Returns a single item by Zoho item ID or SKU.
 */
apiApp.get(['/inventory/:id', '/api/inventory/:id'], async (req: Request, res: Response) => {
  const id = req.params.id;
  const hasPricingAccess = hasApprovedPricingAccess(req);
  res.setHeader('Vary', 'Cookie, Authorization, Accept');
  if (hasPricingAccess) {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  }
  try {
    if (isZohoConfigured()) {
      try {
        const item = await getZohoItem(id);
        if (item) return ok(res, sanitizeItemForClient(item, hasPricingAccess));
      } catch (zohoError: any) {
        console.warn(`[API] Zoho item ${id} fetch failed, falling back to seed store:`, zohoError.message);
      }
    }
    const item = inventoryStore.getItem(id);
    if (!item) return err(res, 404, `Item ${id} not found`);
    return ok(res, sanitizeItemForClient(item, hasPricingAccess));
  } catch (e: any) {
    return err(res, 500, e.message);
  }
});

/**
 * POST /api/inventory/orders
 * Submits a wholesale order request into Zoho Inventory.
 * Strictly derives and verifies authoritative prices server-side (Rule 16, 17 / OWASP A06).
 */
apiApp.post(['/inventory/orders', '/api/inventory/orders'], rateLimit(10, 5 * 60 * 1000), async (req: Request, res: Response) => {
  const { customerName, businessName, email, phone, notes, lineItems } = req.body || {};

  if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
    return err(res, 400, 'Customer name is required');
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
    return err(res, 400, 'Valid phone number is required for dispatch confirmation');
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0 || lineItems.length > 100) {
    return err(res, 400, 'Order must contain between 1 and 100 items');
  }

  // Server-side authoritative price verification & input bounding
  const verifiedLineItems = [];
  for (const item of lineItems) {
    const qty = Math.max(1, Math.min(10000, parseInt(item.quantity, 10) || 1));
    const idOrSku = String(item.id || item.sku || item.zoho_item_id || item.name || '').trim();

    const resolvedProduct = PRODUCTS.find(
      (p) => p.id === idOrSku || p.sku === idOrSku || p.name.toLowerCase() === item.name?.toLowerCase()
    );

    let unitPrice = 15.0; // fallback baseline
    let officialName = item.name || 'Wholesale Product';
    let officialSku = item.sku || '';

    if (resolvedProduct) {
      officialName = resolvedProduct.name;
      officialSku = resolvedProduct.sku;
      unitPrice = resolvedProduct.pricePerUnit;

      // Apply volume pricing tier if applicable
      if (resolvedProduct.bulkPricing && resolvedProduct.bulkPricing.length > 0) {
        const sortedTiers = [...resolvedProduct.bulkPricing].sort((a, b) => b.minQty - a.minQty);
        const matchedTier = sortedTiers.find((t) => qty >= t.minQty);
        if (matchedTier) {
          unitPrice = matchedTier.pricePerUnit;
        }
      }
    }

    verifiedLineItems.push({
      id: resolvedProduct?.id || idOrSku,
      sku: officialSku,
      name: officialName,
      quantity: qty,
      pricePerUnit: unitPrice,
      totalPrice: Math.round(unitPrice * qty * 100) / 100,
      zoho_item_id: item.zoho_item_id,
    });
  }

  try {
    const result = await inventoryStore.processWholesaleOrder({
      customerName: customerName.trim().slice(0, 100),
      businessName: String(businessName || '').trim().slice(0, 150),
      email: String(email || '').trim().slice(0, 120),
      phone: phone.trim().slice(0, 30),
      notes: String(notes || '').trim().slice(0, 500),
      lineItems: verifiedLineItems,
    });
    return ok(res, result);
  } catch (e: any) {
    console.error('[API /orders] Order submission failure:', e.message);
    return err(res, 500, 'Unable to submit wholesale order. Please contact central dispatch.');
  }
});

// Config routes — Guarded by administrative authorization
apiApp.get(['/inventory/zoho-config', '/api/inventory/zoho-config'], requireAdminAuth, (_req, res) => {
  return ok(res, inventoryStore.getZohoConfig());
});

apiApp.post(['/inventory/zoho-config', '/api/inventory/zoho-config'], requireAdminAuth, (req, res) => {
  try {
    const config = inventoryStore.updateZohoConfig(req.body);
    return ok(res, { success: true, config });
  } catch (e: any) {
    return err(res, 400, 'Failed to update Zoho configuration');
  }
});

const MANGO_SYSTEM_PROMPT = `You are Mango 🐕, the friendly golden retriever virtual assistant for Wholesale of Oklahoma.

STORE DETAILS:
- Business: Wholesale of Oklahoma (Licensed B2B Wholesale Distributor for smoke shops, vape shops, and dispensaries)
- Address: 4500 S Bryant Ave, Oklahoma City, OK 73135
- Phone: (405) 768-2975
- Email: wholesaleofoklahoma@gmail.com
- Hours:
  • Monday – Saturday: 9:00 AM – 8:00 PM
  • Sunday: 11:00 AM – 8:00 PM
- Services: Local OKC warehouse same-day pickup, direct Oklahoma metro delivery, statewide fast fulfillment.
- Core Inventory: Disposable Vapes (Geekbar Pulse 15k/25k/60k, Raz 25k LTX, Vozol 50k, Foger 30k), Hardware & Pods (Vaporesso XROS, SMOK coils, 510 batteries), Vape Juice (Juice Head, Coastal Clouds, Sadboy, Twist), Glass & Pipes (Borosilicate beakers, hand pipes), THCA/CBD/Delta (Diamond pre-rolls, live resin disposables), Kratom (OPMS Gold/Black liquid shots, capsules), Novelties & Accessories (Digital scales, grinders, torches, RAW papers, butane).

CONVERSATION GUIDELINES:
1. Tone: Friendly, helpful, professional, approachable, slightly playful dog persona ("Woof!", "Woof woof! 🐕").
2. ALWAYS provide clear, natural conversational text answers.
3. If asked about store location or address: Always clearly provide 4500 S Bryant Ave, Oklahoma City, OK 73135 and mention same-day OKC pickup.
4. If asked about store hours: Always clearly list Monday–Saturday 9:00 AM – 8:00 PM, Sunday 11:00 AM – 8:00 PM.
5. If asked about wholesale or pricing: Explain that we are a licensed master distributor with volume tiered pricing, and suggest calling (405) 768-2975 for direct quotes.
6. DO NOT output raw add-to-cart product cards or UI drops in chat. If the user wants to browse products or add to cart, tell them to tap the "Inventory" tab at the top of the chat or check the "Best Sellers" section on the website.
7. Keep responses concise, organized with clean markdown bullets, and easy to read.`;

/**
 * POST /api/chat
 * Server-side proxy for Gemini AI Mango assistant.
 * Securely uses process.env.GEMINI_API_KEY without exposing it to the browser.
 */
apiApp.post(['/chat', '/api/chat'], async (req: Request, res: Response) => {
  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string') {
    return err(res, 400, 'Missing or invalid "message" string');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return ok(res, { fallback: true, message: 'Gemini API key not configured' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const formattedHistory = Array.isArray(history)
      ? history.slice(-4).map((msg: any) => ({
          role: msg.role === 'model' ? ('model' as const) : ('user' as const),
          parts: [{ text: String(msg.text || '').slice(0, 1000) }],
        }))
      : [];

    const contents = [
      ...formattedHistory,
      { role: 'user' as const, parts: [{ text: String(message).slice(0, 1000) }] },
    ];

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 4000)
    );

    const apiPromise = (ai.models as any).generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: MANGO_SYSTEM_PROMPT,
      contents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    const response = (await Promise.race([apiPromise, timeoutPromise])) as any;
    const replyText = response?.text?.trim();

    if (replyText) {
      return ok(res, { success: true, text: replyText });
    }
    return ok(res, { fallback: true });
  } catch (chatError: any) {
    console.warn('[API /chat] Gemini call failed, returning fallback:', chatError.message);
    return ok(res, { fallback: true, error: 'AI unavailable' });
  }
});

// ============================================================================
// AUTHENTICATION ROUTES — /api/auth/*
// ============================================================================

/**
 * POST /api/auth/login
 * Authenticates user credentials and establishes a secure HttpOnly session cookie.
 * Rate limited to 5 attempts per 5 minutes per IP.
 */
apiApp.post(['/auth/login', '/api/auth/login'], rateLimit(5, 5 * 60 * 1000), (req: Request, res: Response) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return err(res, 400, 'Email and password are required.');
  }

  try {
    const { user, token } = authStore.login(String(email), String(password));

    // Set secure HttpOnly session cookie
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    res.setHeader(
      'Set-Cookie',
      `woo_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isProd ? '; Secure' : ''}`
    );

    return ok(res, {
      success: true,
      user: {
        ...user,
        has_pricing_access: user.role === 'approved_customer' || user.role === 'admin',
      },
      token,
      message: 'Login successful.',
    });
  } catch (loginErr: any) {
    return err(res, 401, loginErr.message || 'Invalid email or password.');
  }
});

/**
 * POST /api/auth/logout
 * Terminates user session and clears session cookie.
 */
apiApp.post(['/auth/logout', '/api/auth/logout'], (req: Request, res: Response) => {
  const session = getSessionUser(req);
  if (session) {
    authStore.revokeSession(session.token);
  }

  res.setHeader('Set-Cookie', 'woo_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return ok(res, { success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user and role.
 */
apiApp.get(['/auth/me', '/api/auth/me'], (req: Request, res: Response) => {
  const session = getSessionUser(req);
  if (!session) {
    return ok(res, {
      authenticated: false,
      role: 'visitor',
      has_pricing_access: false,
      user: null,
    });
  }

  const hasAccess = session.role === 'approved_customer' || session.role === 'admin';

  return ok(res, {
    authenticated: true,
    user: {
      userId: session.userId,
      id: session.userId,
      email: session.email,
      role: session.role,
      businessName: session.businessName,
      contactName: session.contactName,
      has_pricing_access: hasAccess,
    },
    has_pricing_access: hasAccess,
  });
});

// ============================================================================
// DOCUMENT UPLOAD & PRIVATE RETRIEVAL — /api/wholesale/upload
// ============================================================================

/**
 * POST /api/wholesale/upload
 * Handles base64 encoded document uploads with magic byte checking.
 * Rate limited to 25 uploads per 15 minutes per IP.
 */
apiApp.post(['/wholesale/upload', '/api/wholesale/upload'], rateLimit(25, 15 * 60 * 1000), (req: Request, res: Response) => {
  const { fileBase64, filename, documentType } = req.body || {};

  if (!fileBase64 || !filename) {
    return err(res, 400, 'Missing file payload or filename.');
  }

  try {
    const rawBase64 = String(fileBase64).replace(/^data:[^;]+;base64,/, '');

    if (rawBase64.length > 14 * 1024 * 1024) {
      return err(res, 413, 'File exceeds the maximum allowed size of 10MB.');
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    if (buffer.length > 10 * 1024 * 1024) {
      return err(res, 413, 'File exceeds the maximum allowed size of 10MB.');
    }

    const validDocTypes = ['resale_certificate', 'business_license', 'other'];
    const sanitizedType = validDocTypes.includes(documentType) ? documentType : 'other';

    const record = documentStore.saveDocument(buffer, String(filename), sanitizedType as any);

    return ok(res, {
      success: true,
      documentId: record.id,
      filename: record.originalName,
      size: record.size,
      mimeType: record.mimeType,
      fileType: record.mimeType,
      message: 'Document uploaded and verified successfully.',
    });
  } catch (uploadErr: any) {
    const msg = uploadErr.message || 'Document upload failed.';
    if (msg.includes('10MB')) {
      return err(res, 413, msg);
    }
    return err(res, 400, msg);
  }
});

/**
 * GET /api/wholesale/documents/:id
 * Private retrieval for authorized administrators only.
 */
apiApp.get(['/wholesale/documents/:id', '/api/wholesale/documents/:id'], requireAdminAuth, (req: Request, res: Response) => {
  const docId = req.params.id;
  if (!docId || typeof docId !== 'string' || docId.includes('..') || docId.includes('/') || docId.includes('\\')) {
    return err(res, 400, 'Invalid document ID');
  }

  const doc = documentStore.getDocumentBuffer(docId);
  if (!doc) {
    return err(res, 404, 'Document not found.');
  }

  res.setHeader('Content-Type', doc.record.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.record.originalName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.send(doc.buffer);
});

// ============================================================================
// WHOLESALE APPLICATION & COMPLIANCE ROUTES — /api/wholesale/*
// ============================================================================

/**
 * POST /api/wholesale/apply
 * Handles wholesale customer applications with business verification (FEIN, tobacco license, 21+).
 * Rate limited to 5 requests per 15 minutes to prevent spam/abuse (Rule 22).
 */
apiApp.post(['/wholesale/apply', '/api/wholesale/apply'], rateLimit(5, 15 * 60 * 1000), (req: Request, res: Response) => {
  const {
    businessName,
    contactName,
    email,
    phone,
    fein,
    licenseNumber,
    businessType,
    address,
    ageCertified,
    taxExemptCertified,
    documents,
    password,
  } = req.body || {};

  // Server-side input validation (OWASP A01 / Rule 16)
  if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
    return err(res, 400, 'Legal Business Name is required (minimum 2 characters)');
  }
  if (!contactName || typeof contactName !== 'string' || contactName.trim().length < 2) {
    return err(res, 400, 'Authorized Representative / Contact Name is required');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return err(res, 400, 'A valid business email address is required');
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
    return err(res, 400, 'A valid phone number is required');
  }
  if (!fein || typeof fein !== 'string' || fein.trim().length < 4) {
    return err(res, 400, 'Federal Employer ID (FEIN) or State Tax ID is required for wholesale account approval');
  }
  if (!ageCertified) {
    return err(res, 400, 'You must certify that you are at least 21 years of age and authorized to purchase for this business entity');
  }

  const validBusinessTypes = ['vape_shop', 'smoke_shop', 'dispensary', 'c_store', 'distributor', 'other'];
  const sanitizedBusinessType = (validBusinessTypes.includes(businessType) ? businessType : 'other') as any;

  // Create pending customer account in authStore if password provided
  if (password && typeof password === 'string' && password.length >= 6) {
    try {
      authStore.register({
        email: email.trim(),
        password,
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        fein: fein.trim(),
        licenseNumber: String(licenseNumber || '').trim(),
        role: 'pending_customer',
      });
    } catch (regErr: any) {
      // Account may already exist, which is fine
    }
  }

  const newApp = wholesaleStore.createApplication({
    businessName: businessName.trim().slice(0, 150),
    contactName: contactName.trim().slice(0, 100),
    email: email.trim().toLowerCase().slice(0, 120),
    phone: phone.trim().slice(0, 30),
    fein: fein.trim().slice(0, 30),
    licenseNumber: String(licenseNumber || '').trim().slice(0, 50),
    businessType: sanitizedBusinessType,
    address: {
      street: String(address?.street || '').trim().slice(0, 150),
      city: String(address?.city || '').trim().slice(0, 60),
      state: String(address?.state || 'OK').trim().slice(0, 20),
      zip: String(address?.zip || '').trim().slice(0, 10),
    },
    ageCertified: Boolean(ageCertified),
    taxExemptCertified: Boolean(taxExemptCertified),
    documents: Array.isArray(documents) ? documents : [],
  });

  console.log(`[API /wholesale/apply] 🟢 New wholesale application registered: ${newApp.id} for "${newApp.businessName}"`);

  return ok(res, {
    success: true,
    applicationId: newApp.id,
    status: newApp.status,
    message: 'Your Wholesale of Oklahoma account application has been received and is pending review.',
  });
});

/**
 * GET /api/wholesale/status?id=WOA-APP-XXXXX&email=...
 * Prevents IDOR by strictly requiring both matching application ID and email.
 */
apiApp.get(['/wholesale/status', '/api/wholesale/status'], rateLimit(20, 5 * 60 * 1000), (req: Request, res: Response) => {
  const params = q(req);
  const id = params.id || params.applicationId;
  const email = params.email;

  if (!id || !email) {
    return err(res, 400, 'Both application ID and contact email are required to check status');
  }

  const app = wholesaleStore.getApplication(String(id).trim());
  if (!app || app.email.toLowerCase() !== String(email).trim().toLowerCase()) {
    return err(res, 404, 'Application not found or email does not match our records');
  }

  return ok(res, {
    applicationId: app.id,
    businessName: app.businessName,
    status: app.status,
    submittedAt: app.submittedAt,
    reviewedAt: app.reviewedAt,
    reviewNotes: app.reviewNotes,
  });
});

/**
 * GET /api/wholesale/admin/applications
 * Administrative list of all wholesale applications.
 * Guarded by timing-safe administrative authorization (Rule 12 & 14).
 */
apiApp.get(['/wholesale/admin/applications', '/api/wholesale/admin/applications'], requireAdminAuth, (req: Request, res: Response) => {
  const params = q(req);
  const statusFilter = params.status;
  const list = wholesaleStore.listApplications(statusFilter);
  return ok(res, { total: list.length, applications: list });
});

/**
 * POST /api/wholesale/admin/review
 * Approves or rejects a wholesale application.
 * Guarded by timing-safe administrative authorization (Rule 12 & 14).
 */
apiApp.post(['/wholesale/admin/review', '/api/wholesale/admin/review'], requireAdminAuth, (req: Request, res: Response) => {
  const { id, status, reviewNotes } = req.body || {};

  if (!id || (status !== 'APPROVED' && status !== 'REJECTED')) {
    return err(res, 400, 'Invalid request. "id" and status ("APPROVED" | "REJECTED") are required');
  }

  const updated = wholesaleStore.reviewApplication(id, status, reviewNotes);
  if (!updated) {
    return err(res, 404, `Application ${id} not found`);
  }

  // If approved, update user account role in authStore to approved_customer
  if (status === 'APPROVED') {
    authStore.updateUserRole(updated.email, 'approved_customer');
    console.log(`[API /wholesale/admin/review] User ${updated.email} promoted to approved_customer.`);
  }

  console.log(`[API /wholesale/admin/review] Application ${id} updated to ${status} by admin.`);
  return ok(res, { success: true, application: updated });
});

/**
 * GET /api/inventory/admin/images
 * Returns audit records for all product images, confidence levels, and licensing metadata.
 * Guarded by timing-safe admin authorization.
 */
apiApp.get(['/inventory/admin/images', '/api/inventory/admin/images'], requireAdminAuth, (_req: Request, res: Response) => {
  const audits = productImageRegistry.getAllAudits();
  return ok(res, {
    total: audits.length,
    exact_verified: audits.filter(a => a.confidence === 'EXACT_VERIFIED').length,
    high_confidence: audits.filter(a => a.confidence === 'HIGH_CONFIDENCE').length,
    review_required: audits.filter(a => a.confidence === 'IMAGE_REVIEW_REQUIRED').length,
    no_match: audits.filter(a => a.confidence === 'NO_MATCH').length,
    audits,
  });
});

/**
 * POST /api/inventory/admin/images/review
 * Approves, rejects, updates URL, or removes an image from a product with an audit trail note.
 * Guarded by timing-safe admin authorization.
 */
apiApp.post(['/inventory/admin/images/review', '/api/inventory/admin/images/review'], requireAdminAuth, (req: Request, res: Response) => {
  const { productId, action, imageUrl, notes } = req.body || {};
  if (!productId || !action) {
    return err(res, 400, 'productId and action ("APPROVE" | "REJECT" | "UPDATE_URL" | "REMOVE") are required.');
  }

  const updated = productImageRegistry.reviewProductImage(productId, action, imageUrl, notes);
  if (!updated) {
    return err(res, 404, `Product ${productId} not found in image registry.`);
  }

  return ok(res, { success: true, audit: updated });
});

export const apiRouter = apiApp;
export default apiApp;
