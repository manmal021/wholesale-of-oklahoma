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
import {
  databaseStore,
  type WholesaleApplicationRecord,
  type CustomerRecord,
  type ApplicationStatus,
  type FulfillmentMethod,
  type GeneralOrderStatus,
  type ItemFulfillmentStatus,
  type OrderRecord,
} from './databaseStore.js';
import { emailService, ADMIN_EMAIL } from './emailService.js';
import { authStore, type UserRole, type SessionRecord } from './authStore.js';
import { documentStore } from './documentStore.js';
import { productImageRegistry } from './productImageRegistry.js';
import { PRODUCTS } from '../lib/productDatabase.js';
import { reconcileWebsitePrices, matchWebsiteProductToZoho } from './priceReconciliation.js';
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
  const candidates: string[] = [];

  // 1. Direct header (resilient across edge proxies and CORS)
  if (typeof req.headers['x-session-token'] === 'string' && req.headers['x-session-token'].trim()) {
    candidates.push(req.headers['x-session-token'].trim());
  }

  // 2. Standard Authorization header
  const authHeader = req.headers.authorization || (req.headers as any)['Authorization'];
  if (typeof authHeader === 'string' && authHeader.trim().toLowerCase().startsWith('bearer ')) {
    candidates.push(authHeader.trim().slice(7).trim());
  }

  // 3. HttpOnly session cookie
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/woo_session=([^;]+)/);
  if (match && match[1]) {
    candidates.push(match[1].trim());
  }

  for (const token of candidates) {
    const session = authStore.validateSession(token);
    if (session) return session;
  }

  return null;
}

function hasApprovedPricingAccess(req: Request): boolean {
  const session = getSessionUser(req);
  return session?.role === 'approved_customer' || session?.role === 'admin';
}

function sanitizeItemForClient(item: any, hasPricingAccess: boolean) {
  const override =
    databaseStore.getProductOnlineOverride(item.id) ||
    (item.sku ? databaseStore.getProductOnlineOverride(item.sku) : undefined);
  const isOverridden = Boolean(override && override.active);
  const status = override?.statusOverride;
  const isBlockedOnline =
    isOverridden && (status === 'OUT_OF_STOCK' || status === 'TEMPORARILY_UNAVAILABLE' || override?.isOutOfStockOnline);
  const isLowStock = isOverridden && status === 'LOW_STOCK';

  let effectiveStockStatus = item.stock_status;
  let effectiveAvailableStock = item.available_stock;
  let isTemporarilyBlocked = false;

  if (isBlockedOnline) {
    effectiveStockStatus = 'out_of_stock';
    effectiveAvailableStock = 0;
    isTemporarilyBlocked = true;
  } else if (isLowStock) {
    effectiveStockStatus = 'low_stock';
    effectiveAvailableStock = Math.min(effectiveAvailableStock > 0 ? effectiveAvailableStock : 5, 5);
  } else if (isOverridden && status === 'AVAILABLE') {
    effectiveStockStatus = 'in_stock';
    effectiveAvailableStock = effectiveAvailableStock > 0 ? effectiveAvailableStock : 50;
    isTemporarilyBlocked = false;
  }

  if (hasPricingAccess) {
    const base = {
      ...item,
      bulk_pricing: [],
      bulkPricing: [],
      has_pricing_access: true,
      stock_status: effectiveStockStatus,
      available_stock: effectiveAvailableStock,
      is_temporarily_blocked: isTemporarilyBlocked,
      availability_override: isOverridden ? status : undefined,
    };
    return base;
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
    pricing_notice: isTemporarilyBlocked ? 'Temporarily Out of Stock' : 'Login to View Wholesale Pricing',
    stock_status: effectiveStockStatus,
    available_stock: effectiveAvailableStock,
    is_temporarily_blocked: isTemporarilyBlocked,
    availability_override: isOverridden ? status : undefined,
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
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.ip || req.socket?.remoteAddress || 'client';
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
  if (!secret || !provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireAdminAuth(req: Request, res: Response, next: () => void) {
  if (validateAdminKey(req)) {
    return next();
  }

  const session = getSessionUser(req);
  if (session && session.role === 'admin') {
    (req as any).user = session;
    return next();
  }

  if (session) {
    return err(res, 403, 'Forbidden: Administrative privileges required');
  }

  return err(res, 401, 'Unauthorized: Administrator authentication required');
}

function requireCustomerAuth(req: Request, res: Response, next: () => void) {
  const session = getSessionUser(req);
  if (!session) {
    return err(res, 401, 'Unauthorized: Customer authentication required');
  }

  if (session.role === 'approved_customer') {
    const cust = databaseStore.getCustomerByEmail(session.email);
    if (cust && cust.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact dispatch at (405) 768-2975.',
      });
    }
  }

  (req as any).user = session;
  return next();
}

// ---------------------------------------------------------------------------
// Boot: start background token refresh if already configured
// ---------------------------------------------------------------------------
const isServerlessEnv = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

if (process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN) {
  // Start scheduled refresh only on persistent server instances, avoiding serverless timeout handles
  if (!isServerlessEnv) {
    scheduleTokenRefresh();
    // Warm up cache once on server boot
    refreshAccessToken()
      .then(() => fetchAllZohoItems())
      .then((items) => {
        console.log(`[API] 🟢 Zoho warm-up complete — ${items.length} items cached.`);
      })
      .catch((e) => {
        console.warn('[API] ⚠ Zoho warm-up skipped (rate limited or offline):', e.message);
      });
  }
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
 * POST /api/inventory/admin/reconcile-prices
 * Performs server-side price reconciliation strictly against Zoho rates.
 * Guarded by administrative authorization and secure non-public logging.
 */
apiApp.post(
  ['/inventory/admin/reconcile-prices', '/api/inventory/admin/reconcile-prices'],
  requireAdminAuth,
  rateLimit(5, 10 * 60 * 1000),
  async (_req: Request, res: Response) => {
    try {
      let zohoItems: any[] = [];
      if (isZohoConfigured()) {
        try {
          zohoItems = await fetchAllZohoItems();
        } catch (e: any) {
          console.warn('[API /reconcile-prices] Live fetch failed, using cached Zoho data:', e.message);
          const { items } = await getCachedInventory();
          zohoItems = items;
        }
      } else {
        const { items } = await getCachedInventory();
        zohoItems = items;
      }

      // Reconcile catalog items and variants atomically in store
      const report = inventoryStore.reconcileCatalogWithZoho(zohoItems);

      return ok(res, {
        success: true,
        report: {
          timestamp: report.timestamp,
          total_website_products: report.total_website_products,
          total_zoho_products: report.total_zoho_products,
          matched_count: report.matched_count,
          updated_count: report.updated_count,
          unmatched_count: report.unmatched_count,
          unmatched_products: report.unmatched_products,
        },
      });
    } catch (e: any) {
      console.error('[API /reconcile-prices] Error:', e.message);
      return err(res, 500, `Reconciliation error: ${e.message}`);
    }
  }
);


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
 * Submits a wholesale order request into Zoho Inventory and databaseStore.
 * Supports PICKUP and DELIVERY with server-side rate and fee verification (Rule 16, 17 / OWASP A06).
 */
apiApp.post(['/inventory/orders', '/api/inventory/orders'], rateLimit(25, 5 * 60 * 1000), async (req: Request, res: Response) => {
  const session = getSessionUser(req);
  const effectiveEmail = String(req.body?.email || session?.email || '').toLowerCase().trim();

  // Enforce customer account approval status (OWASP A01 / Rule 16)
  if (session) {
    if (session.role !== 'approved_customer' && session.role !== 'admin') {
      return res.status(403).json({
        error: 'ACCOUNT_UNAUTHORIZED',
        message: 'Only approved wholesale accounts may place orders. Your account is not approved or is under review.',
      });
    }
    if (session.role === 'approved_customer') {
      const cust = databaseStore.getCustomerByEmail(session.email);
      if (cust && cust.status === 'SUSPENDED') {
        return res.status(403).json({
          error: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended. Please contact dispatch at (405) 768-2975.',
        });
      }
      if (cust && cust.status === 'REJECTED') {
        return res.status(403).json({
          error: 'ACCOUNT_REJECTED',
          message: 'Your wholesale account application was rejected.',
        });
      }
      if (cust && cust.status === 'PENDING') {
        return res.status(403).json({
          error: 'ACCOUNT_PENDING',
          message: 'Your wholesale account is pending review. Wholesale ordering requires an approved account.',
        });
      }
    }
  } else {
    // Non-session order submission: verify customer and application status
    if (effectiveEmail) {
      const cust = databaseStore.getCustomerByEmail(effectiveEmail);
      if (cust) {
        if (cust.status === 'SUSPENDED') {
          return res.status(403).json({
            error: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been suspended. Please contact dispatch at (405) 768-2975.',
          });
        }
        if (cust.status === 'REJECTED') {
          return res.status(403).json({
            error: 'ACCOUNT_REJECTED',
            message: 'Your wholesale account application was not approved.',
          });
        }
        if (cust.status === 'PENDING') {
          return res.status(403).json({
            error: 'ACCOUNT_PENDING',
            message: 'Your wholesale account application is currently under review.',
          });
        }
      }
      const app = databaseStore.getLatestApplicationForEmail(effectiveEmail);
      if (app && (!cust || cust.status !== 'APPROVED')) {
        if (app.status === 'PENDING') {
          return res.status(403).json({
            error: 'ACCOUNT_PENDING',
            message: 'Your wholesale account application is currently under review.',
          });
        }
        if (app.status === 'REJECTED') {
          return res.status(403).json({
            error: 'ACCOUNT_REJECTED',
            message: 'Your wholesale account application was not approved.',
          });
        }
      }
    }
    if (process.env.STRICT_AUTH_CHECKOUT === 'true') {
      return err(res, 401, 'Authentication required to submit wholesale orders');
    }
  }

  const {
    customerName,
    businessName,
    email,
    phone,
    notes,
    lineItems,
    items,
    fulfillmentMethod: rawMethod,
    deliveryAddress,
    deliveryInfo,
    requestedPickupDate,
    requestedPickupTime,
  } = req.body || {};

  const effectiveLineItems = Array.isArray(lineItems) ? lineItems : (Array.isArray(items) ? items : []);

  const effectiveCustName = (customerName || session?.contactName || '').trim();
  const effectiveBizName = (businessName || session?.businessName || '').trim();
  const customerRec = session ? databaseStore.getCustomer(session.userId) : null;
  const effectivePhone = (phone || customerRec?.phone || '').trim();

  if (!effectiveCustName || effectiveCustName.length < 2) {
    return err(res, 400, 'Customer name is required');
  }
  if (!effectivePhone || effectivePhone.length < 7) {
    return err(res, 400, 'Valid phone number is required for dispatch confirmation');
  }
  if (!Array.isArray(effectiveLineItems) || effectiveLineItems.length === 0 || effectiveLineItems.length > 100) {
    return err(res, 400, 'Order must contain between 1 and 100 items');
  }

  const fulfillmentMethod: 'PICKUP' | 'DELIVERY' =
    String(rawMethod || '').toUpperCase() === 'DELIVERY' ? 'DELIVERY' : 'PICKUP';

  const deliveryAddr = deliveryAddress || deliveryInfo?.addressSnapshot || req.body?.addressSnapshot;

  if (fulfillmentMethod === 'DELIVERY') {
    if (!deliveryAddr || typeof deliveryAddr !== 'object') {
      return err(res, 400, 'Delivery address is required for delivery orders');
    }
    const street = deliveryAddr.street || deliveryAddr.streetAddress;
    const city = deliveryAddr.city;
    const zip = deliveryAddr.zip || deliveryAddr.zipCode;
    if (!street || !city || !zip) {
      return err(res, 400, 'Street address, city, and ZIP code are required for delivery orders');
    }

    const val = databaseStore.validateDeliveryAddress(deliveryAddr);
    if (!val.eligible) {
      return res.status(400).json({
        error:
          val.reason ||
          'Delivery is currently unavailable to this address. Please select Pickup or contact Wholesale of Oklahoma.',
        message:
          val.reason ||
          'Delivery is currently unavailable to this address. Please select Pickup or contact Wholesale of Oklahoma.',
      });
    }
  }

  // Server-side authoritative price verification & online block checks
  const verifiedLineItems = [];
  const { items: allCatalogItems } = await getCachedInventory();

  for (const item of effectiveLineItems) {
    const qty = Math.max(1, Math.min(10000, parseInt(item.quantity, 10) || 1));
    const idOrSku = String(item.id || item.sku || item.zoho_item_id || item.name || '').trim();

    if (
      databaseStore.isProductBlockedOnline(idOrSku) ||
      (item.sku && databaseStore.isProductBlockedOnline(item.sku)) ||
      (item.id && databaseStore.isProductBlockedOnline(item.id))
    ) {
      return res.status(400).json({
        error: `Product "${item.name || idOrSku}" is temporarily unavailable online. Please update your cart before proceeding.`,
        message: `Product "${item.name || idOrSku}" is temporarily unavailable online. Please update your cart before proceeding.`,
        code: 'ITEM_TEMPORARILY_UNAVAILABLE',
      });
    }

    const resolvedProduct = PRODUCTS.find(
      (p) => p.id === idOrSku || p.sku === idOrSku || p.name.toLowerCase() === item.name?.toLowerCase()
    );

    const zohoItem = allCatalogItems.find(
      (z) =>
        z.id === idOrSku ||
        z.sku === idOrSku ||
        z.zoho_item_id === idOrSku ||
        z.name.toLowerCase() === item.name?.toLowerCase()
    );

    let unitPrice: number | null = null;
    let officialName = item.name || 'Wholesale Product';
    let officialSku = item.sku || '';

    if (zohoItem) {
      officialName = zohoItem.name;
      officialSku = zohoItem.sku;

      // If variant requested, resolve specific variant rate
      if (item.variant_id || item.flavor || item.variant_name) {
        const vName = String(item.flavor || item.variant_name || '').toLowerCase();
        const vId = item.variant_id;
        const matchedVariant = zohoItem.variants?.find(
          (v) =>
            (vId && v.variant_id === vId) ||
            (vName && (v.variant_name.toLowerCase() === vName || v.attribute_value?.toLowerCase() === vName))
        );
        if (matchedVariant && typeof matchedVariant.rate === 'number' && matchedVariant.rate > 0) {
          unitPrice = matchedVariant.rate;
        }
      }

      if (unitPrice === null && typeof zohoItem.rate === 'number' && zohoItem.rate > 0) {
        unitPrice = zohoItem.rate;
      }
    } else if (resolvedProduct && typeof resolvedProduct.pricePerUnit === 'number' && resolvedProduct.pricePerUnit > 0) {
      unitPrice = resolvedProduct.pricePerUnit;
      officialName = resolvedProduct.name;
      officialSku = resolvedProduct.sku;
    } else if (typeof item.pricePerUnit === 'number' && item.pricePerUnit > 0) {
      unitPrice = item.pricePerUnit;
      officialName = item.name || 'Wholesale Product';
      officialSku = item.sku || '';
    }

    // Never invent a price or use fallback defaults
    if (unitPrice === null || unitPrice <= 0) {
      return err(
        res,
        400,
        `Order pricing error: Item "${officialName}" does not have a verified Zoho Inventory rate. Please contact dispatch.`
      );
    }

    verifiedLineItems.push({
      productId: resolvedProduct?.id || idOrSku,
      sku: officialSku,
      name: officialName,
      flavor: item.flavor || item.variant_name,
      quantityOrdered: qty,
      pricePerUnit: unitPrice,
      totalPrice: Math.round(unitPrice * qty * 100) / 100,
      zoho_item_id: item.zoho_item_id,
      systemInventory:
        typeof item.systemInventory === 'number'
          ? item.systemInventory
          : (zohoItem?.available_stock ?? (resolvedProduct ? (resolvedProduct.inStock ? 50 : 0) : 50)),
    });
  }

  try {
    const createdOrder = databaseStore.createOrder({
      customerId: session?.userId,
      customerName: effectiveCustName,
      businessName: effectiveBizName || effectiveCustName,
      email: effectiveEmail,
      phone: effectivePhone,
      fulfillmentMethod,
      pickupInfo:
        fulfillmentMethod === 'PICKUP'
          ? {
              requestedPickupDate,
              requestedPickupTime,
            }
          : undefined,
      deliveryInfo:
        fulfillmentMethod === 'DELIVERY' && deliveryAddr
          ? {
              addressSnapshot: {
                recipientName: deliveryAddr.recipientName || effectiveCustName,
                businessName: deliveryAddr.businessName || effectiveBizName,
                street: deliveryAddr.street || deliveryAddr.streetAddress,
                unit: deliveryAddr.unit || deliveryAddr.suiteUnit,
                city: deliveryAddr.city,
                state: deliveryAddr.state || 'OK',
                zip: deliveryAddr.zip || deliveryAddr.zipCode,
                phone: deliveryAddr.phone || effectivePhone,
                deliveryInstructions: deliveryAddr.deliveryInstructions || deliveryInfo?.deliveryInstructions,
              },
            }
          : undefined,
      lineItems: verifiedLineItems,
      customerNotes: notes ? String(notes).trim().slice(0, 500) : undefined,
    });

    // Deduct stock in local inventory store
    inventoryStore
      .processWholesaleOrder({
        customerName: effectiveCustName,
        businessName: effectiveBizName,
        email: effectiveEmail,
        phone: effectivePhone,
        notes: notes ? String(notes).slice(0, 500) : undefined,
        lineItems: verifiedLineItems.map((i) => ({
          id: i.productId,
          sku: i.sku,
          name: i.name,
          quantity: i.quantityOrdered,
          pricePerUnit: i.pricePerUnit,
          zoho_item_id: i.zoho_item_id,
        })),
      })
      .catch((err) => {
        console.warn('[API /orders] Background Zoho restock queue notice:', err.message);
      });

    // Dispatch Order Received confirmation email
    emailService.sendOrderReceivedEmail(createdOrder).catch((e) => {
      console.warn('[API /orders] Failed to send order received email:', e.message);
    });

    return ok(res, {
      success: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      order: createdOrder,
      message: `Wholesale restock order #${createdOrder.orderNumber} successfully registered and queued for OKC dispatch.`,
    });
  } catch (e: any) {
    console.error('[API /orders] Order submission failure:', e.message);
    return err(res, 400, e.message || 'Unable to submit wholesale order. Please contact central dispatch.');
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
- Business: Wholesale of Oklahoma (Licensed B2B Wholesale Distributor for dispensaries, vape stores, and retail partners)
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
apiApp.post(['/auth/login', '/api/auth/login'], rateLimit(30, 5 * 60 * 1000), (req: Request, res: Response) => {
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

    if (user.role === 'admin') {
      databaseStore.addAuditLog({
        event: 'ADMIN_LOGIN_SUCCESS',
        targetEmail: user.email,
        adminId: user.id,
        adminEmail: user.email,
        details: { ip: req.ip },
      });
    }

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
    const rawMsg = loginErr.message || 'Invalid email or password.';
    if (rawMsg.includes('ACCOUNT_PENDING')) {
      return res.status(403).json({
        error: 'ACCOUNT_PENDING',
        message: 'Your Wholesale of Oklahoma account application is currently under review. You will receive an email once our team has reviewed your application.',
      });
    }
    if (rawMsg.includes('ACCOUNT_REJECTED')) {
      return res.status(403).json({
        error: 'ACCOUNT_REJECTED',
        message: 'Your wholesale account application was not approved. Please contact dispatch at (405) 768-2975 if you have questions.',
      });
    }
    if (rawMsg.includes('ACCOUNT_SUSPENDED')) {
      return res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your wholesale account has been suspended. Please contact Wholesale of Oklahoma dispatch at (405) 768-2975.',
      });
    }
    if (rawMsg.includes('ACCOUNT_NOT_ACTIVATED')) {
      return res.status(403).json({
        error: 'ACCOUNT_NOT_ACTIVATED',
        message: 'Your account has been approved but not yet activated. Please use the activation link sent to your email to set your password.',
      });
    }
    return err(res, 401, 'Invalid email or password.');
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

/**
 * GET /api/auth/verify-token
 * Validates token without consuming it.
 */
apiApp.get(['/auth/verify-token', '/api/auth/verify-token'], (req: Request, res: Response) => {
  const params = q(req);
  const token = params.token;
  const expectedType = params.type as any;

  if (!token) {
    return err(res, 400, 'Token is required.');
  }

  const result = databaseStore.verifySecurityToken(token, expectedType);
  if (!result.valid) {
    let msg = 'Invalid or expired link.';
    if (result.reason === 'EXPIRED') msg = 'This link has expired.';
    if (result.reason === 'USED') msg = 'This link has already been used.';
    return ok(res, { valid: false, reason: result.reason, message: msg });
  }

  return ok(res, {
    valid: true,
    email: result.tokenRecord?.email,
    type: result.tokenRecord?.type,
  });
});

/**
 * POST /api/auth/activate
 * Consumes single-use activation token to set user password (admin or approved customer).
 * Rate limited to 10 attempts per 15 minutes.
 */
apiApp.post(['/auth/activate', '/api/auth/activate'], rateLimit(10, 15 * 60 * 1000), (req: Request, res: Response) => {
  const { token, password } = req.body || {};

  if (!token || typeof token !== 'string') {
    return err(res, 400, 'Activation token is required.');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return err(res, 400, 'Password must be at least 8 characters long.');
  }

  const verification = databaseStore.verifySecurityToken(token);
  if (!verification.valid || !verification.tokenRecord) {
    const reason = verification.reason;
    if (reason === 'EXPIRED') return err(res, 400, 'This activation link has expired. Please contact dispatch or request a new invite.');
    if (reason === 'USED') return err(res, 400, 'This activation link has already been used. Please log in.');
    return err(res, 400, 'Invalid or expired activation link.');
  }

  const tokenRecord = verification.tokenRecord;
  const email = tokenRecord.email;

  // Consume token permanently
  databaseStore.consumeSecurityToken(token, tokenRecord.type);

  // Set password securely
  const user = authStore.setPassword(email, password);

  if (tokenRecord.type === 'ADMIN_ACTIVATION') {
    authStore.updateUserRole(email, 'admin');
    databaseStore.addAuditLog({
      event: 'ADMIN_LOGIN_SUCCESS',
      targetEmail: email,
      details: { activation: true },
    });

    const session = authStore.createSession(user, email, 'admin', user.businessName, user.contactName);
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    res.setHeader(
      'Set-Cookie',
      `woo_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isProd ? '; Secure' : ''}`
    );

    return ok(res, {
      success: true,
      role: 'admin',
      token: session.token,
      redirect: '/admin',
      message: 'Administrator password created successfully. Welcome to Wholesale of Oklahoma Admin Portal.',
    });
  }

  // CUSTOMER_ACTIVATION
  authStore.updateUserRole(email, 'approved_customer');
  const cust = databaseStore.getCustomerByEmail(email);
  if (cust) {
    cust.activatedAt = new Date().toISOString();
    cust.userId = user.id;
    databaseStore.persistToDisk();
  }

  databaseStore.addAuditLog({
    event: 'ACCOUNT_ACTIVATED',
    targetId: cust?.id || user.id,
    targetEmail: email,
  });

  const session = authStore.createSession(user, email, 'approved_customer', user.businessName, user.contactName);
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  res.setHeader(
    'Set-Cookie',
    `woo_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isProd ? '; Secure' : ''}`
  );

  return ok(res, {
    success: true,
    role: 'approved_customer',
    token: session.token,
    redirect: '/account',
    message: 'Your account has been successfully activated. You now have full access to wholesale shopping.',
  });
});

/**
 * POST /api/auth/forgot-password
 * Sends single-use password reset link.
 * Rate limited to 5 per 15 minutes.
 */
apiApp.post(['/auth/forgot-password', '/api/auth/forgot-password'], rateLimit(5, 15 * 60 * 1000), async (req: Request, res: Response) => {
  const { email, role } = req.body || {};
  const cleanEmail = String(email || '').toLowerCase().trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return err(res, 400, 'A valid email address is required.');
  }

  const isConfiguredAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase().trim();
  let user = authStore.getUser(cleanEmail);
  const cust = databaseStore.getCustomerByEmail(cleanEmail);

  if (isConfiguredAdmin && !user) {
    const setup = authStore.ensureInitialAdmin(cleanEmail);
    user = setup.user;
  }

  const isAdminUser = role === 'admin' || isConfiguredAdmin || user?.role === 'admin';

  if (isAdminUser) {
    const { token, resetUrl, dispatch } = await authStore.createAdminPasswordResetToken(cleanEmail);
    databaseStore.addAuditLog({
      event: 'PASSWORD_RESET_REQUESTED',
      targetEmail: cleanEmail,
      details: { role: 'admin' },
    });

    if (dispatch && dispatch.success === false) {
      console.error(`[API /auth/forgot-password] ❌ Email provider failed to send admin reset email to ${cleanEmail}:`, dispatch.error);
      return res.status(502).json({
        success: false,
        error: `Failed to deliver password reset email: ${dispatch.error || 'Provider rejected request'}`,
      });
    }

    return ok(res, {
      success: true,
      role: 'admin',
      message: 'Password reset instructions have been sent to your administrator email.',
      ...(process.env.NODE_ENV !== 'production' ? { devResetUrl: resetUrl } : {}),
    });
  }

  if (user || cust) {
    const tokenRecord = databaseStore.createSecurityToken({
      type: 'PASSWORD_RESET',
      email: cleanEmail,
      targetId: user?.id || cust?.id || cleanEmail,
      durationHours: 2, // 2 hour expiration
    });

    databaseStore.addAuditLog({
      event: 'PASSWORD_RESET_REQUESTED',
      targetEmail: cleanEmail,
    });

    const dispatch = await emailService.sendPasswordResetEmail(cleanEmail, tokenRecord.token, false);
    if (dispatch && dispatch.success === false) {
      console.error(`[API /auth/forgot-password] ❌ Email dispatch failed for customer ${cleanEmail}:`, dispatch.error);
      return res.status(502).json({
        success: false,
        error: `Failed to deliver password reset email: ${dispatch.error || 'Provider rejected request'}`,
      });
    }
  }

  // Generic success for non-admin to prevent email enumeration (OWASP)
  return ok(res, {
    success: true,
    message: 'If an account exists with this email address, password reset instructions have been sent.',
  });
});

/**
 * POST /api/auth/admin/request-activation
 * Dispatches an initial administrator activation link if the admin account has not yet set credentials.
 * Rate limited to 5 per 15 minutes.
 */
apiApp.post(['/auth/admin/request-activation', '/api/auth/admin/request-activation'], rateLimit(5, 15 * 60 * 1000), async (req: Request, res: Response) => {
  const { email } = req.body || {};
  const cleanEmail = String(email || '').toLowerCase().trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return err(res, 400, 'A valid administrator email address is required.');
  }

  const isConfiguredAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase().trim();
  const existingUser = authStore.getUser(cleanEmail);

  if (!isConfiguredAdmin && (!existingUser || existingUser.role !== 'admin')) {
    return ok(res, {
      success: true,
      message: 'If this email belongs to an administrator, an activation link has been dispatched.',
    });
  }

  if (existingUser && authStore.hasPasswordSet(cleanEmail)) {
    return ok(res, {
      success: true,
      alreadyActive: true,
      message: 'This administrator account has already been activated. Please log in or use Forgot Password to reset credentials.',
    });
  }

  const { token, activationUrl, dispatch } = await authStore.createAdminActivationToken(cleanEmail);

  databaseStore.addAuditLog({
    event: 'ADMIN_ACTIVATION_REQUESTED' as any,
    targetEmail: cleanEmail,
  });

  if (dispatch && dispatch.success === false) {
    console.error(`[API /auth/admin/request-activation] ❌ Activation email dispatch failed for ${cleanEmail}:`, dispatch.error);
    return res.status(502).json({
      success: false,
      error: `Failed to dispatch activation email: ${dispatch.error || 'Provider rejected request'}`,
    });
  }

  return ok(res, {
    success: true,
    message: 'An administrator activation link has been dispatched to your email.',
    ...(process.env.NODE_ENV !== 'production' ? { devActivationUrl: activationUrl } : {}),
  });
});

/**
 * POST /api/admin/invite
 * Invites a new administrator. Protected by requireAdminAuth or ADMIN_SECRET_KEY.
 */
apiApp.post(['/admin/invite', '/api/admin/invite'], requireAdminAuth, async (req: Request, res: Response) => {
  const { email, contactName, phone } = req.body || {};
  const cleanEmail = String(email || '').toLowerCase().trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return err(res, 400, 'A valid email address is required.');
  }

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_master';

  const { token, activationUrl, dispatch } = await authStore.createAdminActivationToken(cleanEmail);
  const user = authStore.getUser(cleanEmail);
  if (user) {
    if (contactName) user.contactName = String(contactName).trim();
    if (phone) user.phone = String(phone).trim();
  }

  databaseStore.addAuditLog({
    event: 'ADMIN_INVITED' as any,
    targetEmail: cleanEmail,
    adminId,
    details: { invitedBy: session?.email || 'admin' },
  });

  if (dispatch && dispatch.success === false) {
    return res.status(502).json({
      success: false,
      error: `Failed to dispatch invitation email: ${dispatch.error || 'Provider rejected request'}`,
    });
  }

  return ok(res, {
    success: true,
    email: cleanEmail,
    message: `Administrator invitation dispatched to ${cleanEmail}.`,
    ...(process.env.NODE_ENV !== 'production' ? { devActivationUrl: activationUrl } : {}),
  });
});

/**
 * POST /api/auth/reset-password
 * Consumes single-use reset token and updates password.
 * Rate limited to 10 per 15 minutes.
 */
apiApp.post(['/auth/reset-password', '/api/auth/reset-password'], rateLimit(10, 15 * 60 * 1000), (req: Request, res: Response) => {
  const { token } = req.body || {};
  const password = req.body?.password || req.body?.newPassword;

  if (!token || typeof token !== 'string') {
    return err(res, 400, 'Password reset token is required.');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return err(res, 400, 'New password must be at least 8 characters long.');
  }

  const verification = databaseStore.verifySecurityToken(token, 'PASSWORD_RESET');
  if (!verification.valid || !verification.tokenRecord) {
    const reason = verification.reason;
    if (reason === 'EXPIRED') return err(res, 400, 'This password reset link has expired. Please request a new one.');
    if (reason === 'USED') return err(res, 400, 'This password reset link has already been used.');
    return err(res, 400, 'Invalid or expired password reset link.');
  }

  const tokenRecord = verification.tokenRecord;
  databaseStore.consumeSecurityToken(token, 'PASSWORD_RESET');
  authStore.setPassword(tokenRecord.email, password);

  databaseStore.addAuditLog({
    event: 'PASSWORD_RESET_COMPLETED',
    targetEmail: tokenRecord.email,
  });

  return ok(res, {
    success: true,
    message: 'Your password has been successfully reset. You may now log in.',
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
/**
 * POST /api/wholesale/apply
 * Handles wholesale customer applications with business verification (FEIN, tobacco license, 21+).
 * Rate limited to 10 requests per 15 minutes to prevent spam/abuse (Rule 22).
 */
apiApp.post(['/wholesale/apply', '/api/wholesale/apply'], rateLimit(10, 15 * 60 * 1000), async (req: Request, res: Response) => {
  const {
    businessName,
    dba,
    contactFirstName,
    contactLastName,
    contactName,
    email,
    phone,
    fein,
    licenseNumber,
    businessType,
    address,
    website,
    notes,
    ageCertified,
    taxExemptCertified,
    documents,
  } = req.body || {};

  // Server-side input validation (OWASP A01 / Rule 16)
  if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
    return err(res, 400, 'Legal Business Name is required (minimum 2 characters)');
  }

  const effectiveFirstName = (contactFirstName || (contactName ? contactName.split(' ')[0] : '') || '').trim();
  const effectiveLastName = (contactLastName || (contactName ? contactName.split(' ').slice(1).join(' ') : '') || '').trim();
  const effectiveContactName = (contactName || `${effectiveFirstName} ${effectiveLastName}`).trim();

  if (!effectiveContactName || effectiveContactName.length < 2) {
    return err(res, 400, 'Authorized Contact Name is required');
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

  const cleanEmail = email.toLowerCase().trim();

  // Duplicate Protection Checks
  const existingCustomer = databaseStore.getCustomerByEmail(cleanEmail);
  if (existingCustomer) {
    if (existingCustomer.status === 'APPROVED') {
      return res.status(409).json({
        error: 'ACCOUNT_ALREADY_EXISTS',
        message: 'An approved wholesale account already exists for this email address. Please log in or use Forgot Password.',
      });
    }
    if (existingCustomer.status === 'SUSPENDED') {
      return res.status(409).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'An account for this email address is currently suspended. Please contact dispatch at (405) 768-2975.',
      });
    }
  }

  const latestApp = databaseStore.getLatestApplicationForEmail(cleanEmail);
  if (latestApp) {
    if (latestApp.status === 'PENDING') {
      return res.status(409).json({
        error: 'APPLICATION_PENDING',
        message: 'Your wholesale account application is already under review. Our team will contact you once your review is complete.',
      });
    }
    if (latestApp.status === 'REJECTED') {
      return res.status(409).json({
        error: 'APPLICATION_REJECTED',
        message: 'An application for this email address was previously reviewed. Please contact dispatch at (405) 768-2975 to discuss re-applying.',
      });
    }
  }

  const validBusinessTypes = ['vape_shop', 'smoke_shop', 'dispensary', 'c_store', 'distributor', 'other'];
  const sanitizedBusinessType = (validBusinessTypes.includes(businessType) ? businessType : 'other') as any;

  const newApp = databaseStore.createApplication({
    businessName: businessName.trim().slice(0, 150),
    dba: dba ? String(dba).trim().slice(0, 150) : undefined,
    contactFirstName: effectiveFirstName.slice(0, 50),
    contactLastName: effectiveLastName.slice(0, 50),
    contactName: effectiveContactName.slice(0, 100),
    email: cleanEmail.slice(0, 120),
    phone: phone.trim().slice(0, 30),
    fein: fein.trim().slice(0, 40),
    licenseNumber: String(licenseNumber || '').trim().slice(0, 50),
    businessType: sanitizedBusinessType,
    address: {
      street: String(address?.street || '').trim().slice(0, 150),
      city: String(address?.city || '').trim().slice(0, 60),
      state: String(address?.state || 'OK').trim().slice(0, 20),
      zip: String(address?.zip || '').trim().slice(0, 10),
    },
    website: website ? String(website).trim().slice(0, 200) : undefined,
    notes: notes ? String(notes).trim().slice(0, 500) : undefined,
    documents: Array.isArray(documents) ? documents : [],
    ageCertified: Boolean(ageCertified),
    taxExemptCertified: Boolean(taxExemptCertified),
  });

  // Dispatch Transactional Emails asynchronously (never block database submission on email provider failure)
  emailService.sendAdminNewApplicationNotification(newApp).catch((emailErr) => {
    console.warn(`[API /wholesale/apply] ⚠ Failed to send admin notification email: ${emailErr.message}`);
  });

  emailService.sendCustomerApplicationReceived(newApp).catch((emailErr) => {
    console.warn(`[API /wholesale/apply] ⚠ Failed to send customer confirmation email: ${emailErr.message}`);
  });

  console.log(`[API /wholesale/apply] 🟢 New wholesale application stored: ${newApp.id} for "${newApp.businessName}" (${newApp.email})`);

  return ok(res, {
    success: true,
    applicationId: newApp.id,
    status: newApp.status,
    message: 'Your Wholesale of Oklahoma account application has been received and is currently under review.',
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

  const app = databaseStore.getApplication(String(id).trim());
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

// ============================================================================
// ADMIN PORTAL ROUTES — /api/admin/*
// ============================================================================

/**
 * GET /api/admin/stats
 * Dashboard counters for pending, approved, rejected, and suspended accounts.
 */
apiApp.get(['/admin/stats', '/api/admin/stats'], requireAdminAuth, (_req: Request, res: Response) => {
  const stats = databaseStore.getDashboardStats();
  return ok(res, { success: true, stats });
});

/**
 * POST /api/admin/purge-data
 * Completely resets and clears all customer applications, approved accounts, orders,
 * inventory mismatches, and audit logs, keeping administrative accounts safe.
 */
apiApp.post(['/admin/purge-data', '/api/admin/purge-data'], requireAdminAuth, (_req: Request, res: Response) => {
  databaseStore.purgeAllCustomerData();
  const stats = databaseStore.getDashboardStats();
  return ok(res, { success: true, message: 'All customer and portal data has been purged.', stats });
});

/**
 * GET /api/admin/applications
 * Returns filtered list of wholesale customer applications.
 */
apiApp.get(['/admin/applications', '/api/admin/applications', '/wholesale/admin/applications', '/api/wholesale/admin/applications'], requireAdminAuth, (req: Request, res: Response) => {
  const params = q(req);
  const statusFilter = params.status as any;
  const search = params.search;

  const list = databaseStore.listApplications(statusFilter, search);
  return ok(res, { success: true, total: list.length, applications: list });
});

/**
 * GET /api/admin/customers
 * Returns list of customer accounts and applications.
 */
apiApp.get(['/admin/customers', '/api/admin/customers'], requireAdminAuth, (req: Request, res: Response) => {
  const params = q(req);
  const statusFilter = params.status as any;
  const search = params.search;

  const customers = databaseStore.listCustomers(statusFilter, search);
  const applications = databaseStore.listApplications(statusFilter, search);
  return ok(res, { success: true, total: customers.length, customers, applications });
});

/**
 * GET /api/admin/customers/:id and GET /api/admin/applications/:id
 * Returns complete submitted application and customer record.
 */
apiApp.get(
  [
    '/admin/applications/:id',
    '/api/admin/applications/:id',
    '/admin/customers/:id',
    '/api/admin/customers/:id',
  ],
  requireAdminAuth,
  (req: Request, res: Response) => {
    const id = req.params.id;
    let app = databaseStore.getApplication(id);
    let customer = databaseStore.getCustomer(id);

    if (!app && customer) {
      if (customer.applicationId) {
        app = databaseStore.getApplication(customer.applicationId);
      }
      if (!app) {
        app = databaseStore.getLatestApplicationForEmail(customer.email);
      }
    }

    if (!customer && app) {
      if (app.customerId) {
        customer = databaseStore.getCustomer(app.customerId);
      }
      if (!customer) {
        customer = databaseStore.getCustomerByEmail(app.email);
      }
    }

    if (!app && !customer) {
      return err(res, 404, `Customer or application ${id} not found.`);
    }

    return ok(res, { success: true, application: app, customer });
  }
);

/**
 * Shared Customer Approval Handler (POST & PATCH)
 */
const handleCustomerApproval = async (req: Request, res: Response) => {
  const id = req.params.id;
  let app = databaseStore.getApplication(id);
  let customer = databaseStore.getCustomer(id);

  if (!app && customer) {
    if (customer.applicationId) {
      app = databaseStore.getApplication(customer.applicationId);
    }
    if (!app) {
      app = databaseStore.getLatestApplicationForEmail(customer.email);
    }
  }

  if (!customer && app) {
    if (app.customerId) {
      customer = databaseStore.getCustomer(app.customerId);
    }
    if (!customer) {
      customer = databaseStore.getCustomerByEmail(app.email);
    }
  }

  if (!app && !customer) {
    return err(res, 404, `Customer or application ${id} not found.`);
  }

  if ((app && app.status === 'APPROVED') || (customer && customer.status === 'APPROVED')) {
    return err(res, 400, `Account ${id} is already approved.`);
  }

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_master';
  const adminEmail = session?.email || ADMIN_EMAIL;

  // Anti-Self-Approval: Admin cannot approve their own separate customer account to prevent privilege escalation
  const targetEmail = (app?.email || customer?.email || '').toLowerCase().trim();
  if (session?.email && session.email.toLowerCase().trim() === targetEmail && session.role !== 'admin') {
    return err(res, 403, 'Unauthorized approval attempt.');
  }

  if (!customer && app) {
    customer = databaseStore.createOrUpdateCustomerFromApplication(app, adminId);
  } else if (customer) {
    customer = databaseStore.reactivateCustomer(customer.id, adminId);
    if (app) {
      databaseStore.updateApplicationStatus(app.id, 'APPROVED', adminId, 'Approved by administrator');
    }
  }

  if (!customer) {
    return err(res, 500, 'Could not create customer record.');
  }

  // Provision customer in authStore with approved_customer role
  authStore.provisionCustomer(customer);
  authStore.updateUserRole(customer.email, 'approved_customer');

  // Generate single-use 48h activation token
  const tokenRecord = databaseStore.createSecurityToken({
    type: 'CUSTOMER_ACTIVATION',
    email: customer.email,
    targetId: customer.id,
    durationHours: 48,
  });

  // Audit Log
  databaseStore.addAuditLog({
    event: 'APPLICATION_APPROVED',
    targetId: app?.id || customer.id,
    targetEmail: customer.email,
    adminId,
    adminEmail,
    details: { customerId: customer.id, applicationId: app?.id },
  });

  // Send Activation Email to customer
  if (app) {
    try {
      await emailService.sendCustomerAccountApproved(app, tokenRecord.token);
    } catch (emailErr: any) {
      console.warn('[API /admin/approve] Email send error:', emailErr.message);
    }
  }

  console.log(`[API /admin/approve] 🟢 Approved customer ${customer.businessName} (${customer.email}) by ${adminEmail}`);

  return ok(res, {
    success: true,
    status: 'APPROVED',
    message: `Account approved. Activation email dispatched to ${customer.email}.`,
    customer,
    application: app,
    activationToken: tokenRecord.token,
    activationUrl: `/activate?token=${tokenRecord.token}`,
  });
};

/**
 * Shared Customer Rejection Handler (POST & PATCH)
 */
const handleCustomerRejection = async (req: Request, res: Response) => {
  const id = req.params.id;
  const { reason } = req.body || {};

  let app = databaseStore.getApplication(id);
  let customer = databaseStore.getCustomer(id);

  if (!app && customer) {
    if (customer.applicationId) {
      app = databaseStore.getApplication(customer.applicationId);
    }
    if (!app) {
      app = databaseStore.getLatestApplicationForEmail(customer.email);
    }
  }

  if (!customer && app) {
    if (app.customerId) {
      customer = databaseStore.getCustomer(app.customerId);
    }
    if (!customer) {
      customer = databaseStore.getCustomerByEmail(app.email);
    }
  }

  if (!app && !customer) {
    return err(res, 404, `Customer or application ${id} not found.`);
  }

  if (app && app.status === 'REJECTED') {
    return err(res, 400, `Application ${id} is already rejected.`);
  }

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_master';
  const adminEmail = session?.email || ADMIN_EMAIL;

  let updatedApp = app;
  if (app) {
    updatedApp = databaseStore.updateApplicationStatus(app.id, 'REJECTED', adminId, reason);
  }
  if (customer) {
    databaseStore.suspendCustomer(customer.id, adminId, reason || 'Wholesale application rejected');
  }

  const targetEmail = app?.email || customer?.email || '';
  if (targetEmail) {
    authStore.updateUserRole(targetEmail, 'visitor');
  }

  databaseStore.addAuditLog({
    event: 'APPLICATION_REJECTED',
    targetId: id,
    targetEmail,
    adminId,
    adminEmail,
    details: { reason },
  });

  if (app) {
    try {
      await emailService.sendCustomerAccountRejected(app);
    } catch (emailErr: any) {
      console.warn('[API /admin/reject] Email send error:', emailErr.message);
    }
  }

  console.log(`[API /admin/reject] 🔴 Rejected application/customer ${id} by ${adminEmail}`);

  return ok(res, {
    success: true,
    status: 'REJECTED',
    message: `Application ${id} has been rejected.`,
    application: updatedApp,
    customer,
  });
};

/**
 * POST & PATCH /api/admin/applications/:id/approve & /api/admin/customers/:id/approve
 */
apiApp.post(
  ['/admin/applications/:id/approve', '/api/admin/applications/:id/approve', '/admin/customers/:id/approve', '/api/admin/customers/:id/approve'],
  requireAdminAuth,
  handleCustomerApproval
);
apiApp.patch(
  ['/admin/applications/:id/approve', '/api/admin/applications/:id/approve', '/admin/customers/:id/approve', '/api/admin/customers/:id/approve'],
  requireAdminAuth,
  handleCustomerApproval
);

/**
 * POST & PATCH /api/admin/applications/:id/reject & /api/admin/customers/:id/reject
 */
apiApp.post(
  ['/admin/applications/:id/reject', '/api/admin/applications/:id/reject', '/admin/customers/:id/reject', '/api/admin/customers/:id/reject'],
  requireAdminAuth,
  handleCustomerRejection
);
apiApp.patch(
  ['/admin/applications/:id/reject', '/api/admin/applications/:id/reject', '/admin/customers/:id/reject', '/api/admin/customers/:id/reject'],
  requireAdminAuth,
  handleCustomerRejection
);

/**
 * PATCH /api/admin/customers/:id/status & /api/admin/applications/:id/status
 * Allows authorized status changes: 'approved' | 'rejected' | 'suspended' | 'reactivated' | 'pending'
 */
apiApp.patch(
  [
    '/admin/customers/:id/status',
    '/api/admin/customers/:id/status',
    '/admin/applications/:id/status',
    '/api/admin/applications/:id/status',
  ],
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const { status, reason } = req.body || {};
    const targetStatus = String(status || '').toLowerCase().trim();

    const VALID_STATUSES = ['approved', 'rejected', 'suspended', 'reactivated', 'pending'];
    if (!VALID_STATUSES.includes(targetStatus)) {
      return err(res, 400, `Invalid status "${status}". Allowed values: ${VALID_STATUSES.join(', ')}.`);
    }

    if (targetStatus === 'approved') {
      return handleCustomerApproval(req, res);
    }
    if (targetStatus === 'rejected') {
      return handleCustomerRejection(req, res);
    }
    if (targetStatus === 'suspended') {
      let customer = databaseStore.getCustomer(id);
      let app = databaseStore.getApplication(id);
      if (!customer && app) {
        if (app.customerId) customer = databaseStore.getCustomer(app.customerId);
        if (!customer) customer = databaseStore.getCustomerByEmail(app.email);
      }
      if (!customer && !app) return err(res, 404, `Customer or Application ${id} not found.`);

      const session = getSessionUser(req);
      const adminId = session?.userId || 'admin_master';
      let updatedCustomer = null;
      let updatedApp = null;

      if (customer) {
        updatedCustomer = databaseStore.suspendCustomer(customer.id, adminId, reason);
        authStore.updateUserRole(customer.email, 'visitor');
      }
      if (app) {
        updatedApp = databaseStore.updateApplicationStatus(app.id, 'SUSPENDED', adminId, reason);
        if (!customer) authStore.updateUserRole(app.email, 'visitor');
      }

      databaseStore.addAuditLog({
        event: 'ACCOUNT_SUSPENDED',
        targetId: customer?.id || app?.id || id,
        targetEmail: customer?.email || app?.email || '',
        adminId,
        details: { reason },
      });
      return ok(res, {
        success: true,
        status: 'SUSPENDED',
        message: `Account or application ${id} suspended.`,
        customer: updatedCustomer,
        application: updatedApp,
      });
    }

    if (targetStatus === 'reactivated') {
      let customer = databaseStore.getCustomer(id);
      let app = databaseStore.getApplication(id);
      if (!customer && app) {
        if (app.customerId) customer = databaseStore.getCustomer(app.customerId);
        if (!customer) customer = databaseStore.getCustomerByEmail(app.email);
      }
      if (!customer && !app) return err(res, 404, `Customer or Application ${id} not found.`);

      const session = getSessionUser(req);
      const adminId = session?.userId || 'admin_master';
      let updatedCustomer = null;
      let updatedApp = null;

      if (customer) {
        updatedCustomer = databaseStore.reactivateCustomer(customer.id, adminId);
        authStore.updateUserRole(customer.email, 'approved_customer');
      }
      if (app) {
        updatedApp = databaseStore.updateApplicationStatus(app.id, 'APPROVED', adminId, reason);
      }

      databaseStore.addAuditLog({
        event: 'ACCOUNT_REACTIVATED',
        targetId: customer?.id || app?.id || id,
        targetEmail: customer?.email || app?.email || '',
        adminId,
      });
      return ok(res, {
        success: true,
        status: 'APPROVED',
        message: `Customer account ${id} reactivated.`,
        customer: updatedCustomer,
        application: updatedApp,
      });
    }

    if (targetStatus === 'pending') {
      const app = databaseStore.getApplication(id);
      if (!app) return err(res, 404, `Application ${id} not found.`);
      const session = getSessionUser(req);
      const adminId = session?.userId || 'admin_master';
      const updatedApp = databaseStore.updateApplicationStatus(app.id, 'PENDING', adminId, reason);
      return ok(res, {
        success: true,
        status: 'PENDING',
        message: `Application ${id} status set to pending.`,
        application: updatedApp,
      });
    }
  }
);

/**
 * POST /api/admin/customers/:id/suspend
 * Suspends an approved wholesale account, immediately blocking shopping access.
 */
apiApp.post(['/admin/customers/:id/suspend', '/api/admin/customers/:id/suspend'], requireAdminAuth, (req: Request, res: Response) => {
  const id = req.params.id;
  const { reason } = req.body || {};

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_master';

  const customer = databaseStore.suspendCustomer(id, adminId, reason);
  if (!customer) {
    return err(res, 404, `Customer ${id} not found.`);
  }

  authStore.updateUserRole(customer.email, 'visitor');
  databaseStore.addAuditLog({
    event: 'ACCOUNT_SUSPENDED',
    targetId: customer.id,
    targetEmail: customer.email,
    adminId,
    details: { reason },
  });

  console.log(`[API /admin/customers/suspend] ⛔ Customer ${customer.email} (${id}) SUSPENDED.`);
  return ok(res, { success: true, message: `Customer account ${id} suspended.`, customer });
});

/**
 * POST /api/admin/customers/:id/reactivate
 * Restores an approved wholesale account from suspended state.
 */
apiApp.post(['/admin/customers/:id/reactivate', '/api/admin/customers/:id/reactivate'], requireAdminAuth, (req: Request, res: Response) => {
  const id = req.params.id;

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_master';

  const customer = databaseStore.reactivateCustomer(id, adminId);
  if (!customer) {
    return err(res, 404, `Customer ${id} not found.`);
  }

  authStore.updateUserRole(customer.email, 'approved_customer');
  databaseStore.addAuditLog({
    event: 'ACCOUNT_REACTIVATED',
    targetId: customer.id,
    targetEmail: customer.email,
    adminId,
  });

  console.log(`[API /admin/customers/reactivate] 🟢 Customer ${customer.email} (${id}) REACTIVATED.`);
  return ok(res, { success: true, message: `Customer account ${id} reactivated.`, customer });
});

/**
 * POST /api/admin/customers/:id/generate-activation
 * Generates an account activation link for an approved customer.
 */
apiApp.post(['/admin/customers/:id/generate-activation', '/api/admin/customers/:id/generate-activation'], requireAdminAuth, (req: Request, res: Response) => {
  const id = req.params.id;
  const customer = databaseStore.getCustomer(id);
  if (!customer) {
    return err(res, 404, `Customer ${id} not found.`);
  }

  const tokenRecord = databaseStore.createSecurityToken({
    type: 'CUSTOMER_ACTIVATION',
    email: customer.email,
    targetId: customer.id,
    durationHours: 48,
  });

  return ok(res, {
    success: true,
    activationToken: tokenRecord.token,
    activationUrl: `/activate?token=${tokenRecord.token}`,
    message: `New activation link generated for ${customer.email}.`,
  });
});

/**
 * GET /api/admin/audit-logs
 * Returns audit trail entries.
 */
apiApp.get(['/admin/audit-logs', '/api/admin/audit-logs'], requireAdminAuth, (_req: Request, res: Response) => {
  const logs = databaseStore.listAuditLogs(100);
  return ok(res, { success: true, logs });
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

// ---------------------------------------------------------------------------
// FULFILLMENT & ORDER MANAGEMENT ENDPOINTS
// ---------------------------------------------------------------------------

function customerSafeOrder(order: OrderRecord) {
  const { internalNotes, ...safe } = order;
  return safe;
}

/**
 * GET /api/fulfillment/config
 * Returns centralized pickup warehouse location, business hours, contact info,
 * and delivery eligibility criteria (eligible cities, eligible zip codes, min order, fee, free threshold).
 */
apiApp.get(['/fulfillment/config', '/api/fulfillment/config'], (_req: Request, res: Response) => {
  const config = databaseStore.getFulfillmentConfig();
  return ok(res, { success: true, config });
});

/**
 * POST /api/fulfillment/validate-delivery
 * Validates delivery address against business eligibility rules and returns fee.
 */
apiApp.post(['/fulfillment/validate-delivery', '/api/fulfillment/validate-delivery'], (req: Request, res: Response) => {
  const { address, subtotal } = req.body || {};
  if (!address || !address.streetAddress || !address.city || !address.state || !address.zipCode) {
    return err(res, 400, 'Street address, city, state, and ZIP code are required.');
  }
  const valResult = databaseStore.validateDeliveryAddress({
    street: address.streetAddress || address.street,
    city: address.city,
    state: address.state,
    zip: address.zipCode || address.zip,
  });
  if (!valResult.eligible) {
    return ok(res, {
      success: true,
      eligible: false,
      reason: valResult.reason,
      deliveryFee: 0,
    });
  }
  const totals = databaseStore.calculateOrderTotals({
    subtotal: typeof subtotal === 'number' ? subtotal : 0,
    fulfillmentMethod: 'DELIVERY',
    deliveryAddress: {
      street: address.streetAddress || address.street,
      city: address.city,
      state: address.state,
      zip: address.zipCode || address.zip,
    },
  });
  return ok(res, {
    success: true,
    eligible: totals.isDeliveryEligible !== false,
    reason: totals.deliveryError,
    deliveryFee: totals.deliveryFee,
    subtotal: totals.subtotal,
    total: totals.total,
  });
});

// ── Route Registration Helpers for Cross-Mounted Prefix Reliability ────────
const registerGet = (paths: string[], ...handlers: any[]) => {
  for (const p of paths) (apiApp as any).get(p, ...handlers);
};
const registerPost = (paths: string[], ...handlers: any[]) => {
  for (const p of paths) (apiApp as any).post(p, ...handlers);
};
const registerPut = (paths: string[], ...handlers: any[]) => {
  for (const p of paths) (apiApp as any).put(p, ...handlers);
};
const registerDelete = (paths: string[], ...handlers: any[]) => {
  for (const p of paths) (apiApp as any).delete(p, ...handlers);
};

/**
 * GET /api/customer/addresses
 * List saved addresses for the authenticated customer.
 */
registerGet(['/customer/addresses', '/api/customer/addresses'], requireCustomerAuth, (req: Request, res: Response) => {
  const session = getSessionUser(req)!;
  const addresses = databaseStore.listCustomerAddresses(session.userId);
  return ok(res, { success: true, addresses });
});

/**
 * POST /api/customer/addresses
 * Add a new saved address.
 */
registerPost(['/customer/addresses', '/api/customer/addresses'], requireCustomerAuth, (req: Request, res: Response) => {
  const session = getSessionUser(req)!;
  const { label, recipientName, streetAddress, suiteUnit, street, unit, city, state, zipCode, zip, phone, deliveryInstructions, isDefaultDelivery, isDefault, type } = req.body || {};

  const effectiveRecipient = (recipientName || session.contactName || '').trim();
  const effectiveStreet = (streetAddress || street || '').trim();
  const effectiveCity = (city || '').trim();
  const effectiveState = (state || '').trim();
  const effectiveZip = (zipCode || zip || '').trim();
  const effectivePhone = (phone || '').trim();

  if (!effectiveRecipient || !effectiveStreet || !effectiveCity || !effectiveState || !effectiveZip || !effectivePhone) {
    return err(res, 400, 'Recipient name, street address, city, state, zip code, and phone are required.');
  }

  const address = databaseStore.addCustomerAddress({
    customerId: session.userId,
    type: type === 'billing' ? 'billing' : 'delivery',
    isDefault: Boolean(isDefault || isDefaultDelivery),
    recipientName: effectiveRecipient,
    businessName: session.businessName,
    street: effectiveStreet,
    unit: suiteUnit || unit,
    city: effectiveCity,
    state: effectiveState,
    zip: effectiveZip,
    phone: effectivePhone,
    deliveryInstructions,
  });

  return ok(res, { success: true, address });
});

/**
 * PUT /api/customer/addresses/:id
 * Update an existing saved address (IDOR protected).
 */
registerPut(['/customer/addresses/:id', '/api/customer/addresses/:id'], requireCustomerAuth, (req: Request, res: Response) => {
  const session = getSessionUser(req)!;
  const addressId = req.params.id || (req.params as any)[0];
  const updated = databaseStore.updateCustomerAddress(session.userId, addressId, req.body || {});
  if (!updated) {
    return err(res, 404, 'Address not found or unauthorized.');
  }
  return ok(res, { success: true, address: updated });
});

/**
 * DELETE /api/customer/addresses/:id
 * Delete a saved address (IDOR protected).
 */
registerDelete(['/customer/addresses/:id', '/api/customer/addresses/:id'], requireCustomerAuth, (req: Request, res: Response) => {
  const session = getSessionUser(req)!;
  const addressId = req.params.id || (req.params as any)[0];
  const success = databaseStore.deleteCustomerAddress(session.userId, addressId);
  if (!success) {
    return err(res, 404, 'Address not found or unauthorized.');
  }
  return ok(res, { success: true, message: 'Address deleted successfully.' });
});

/**
 * POST /api/customer/addresses/:id/set-default
 * Set default delivery address (IDOR protected).
 */
registerPost(['/customer/addresses/:id/set-default', '/api/customer/addresses/:id/set-default'], requireCustomerAuth, (req: Request, res: Response) => {
  const session = getSessionUser(req)!;
  const addressId = req.params.id || (req.params as any)[0];
  const success = databaseStore.setDefaultDeliveryAddress(session.userId, addressId);
  if (!success) {
    return err(res, 404, 'Address not found or unauthorized.');
  }
  return ok(res, { success: true, message: 'Default delivery address updated.' });
});

/**
 * GET /api/customer/orders
 * List orders for the authenticated customer (omits internal staff notes).
 */
registerGet(['/customer/orders', '/api/customer/orders'], requireCustomerAuth, (req: Request, res: Response) => {
  const session = getSessionUser(req)!;
  const orders = databaseStore.listOrders({ customerId: session.userId });
  return ok(res, {
    success: true,
    orders: orders.map(customerSafeOrder),
  });
});

/**
 * GET /api/customer/orders/:id
 * View order details for the authenticated customer (IDOR protected, omits internal staff notes).
 */
registerGet(['/customer/orders/:id', '/api/customer/orders/:id'], requireCustomerAuth, (req: Request, res: Response) => {
  const session = getSessionUser(req)!;
  const orderId = req.params.id || (req.params as any)[0];
  const order = databaseStore.getOrder(orderId);
  if (!order || order.customerId !== session.userId) {
    return err(res, 404, 'Order not found.');
  }
  return ok(res, { success: true, order: customerSafeOrder(order) });
});

/**
 * POST /api/customer/orders/:id/action
 * Customer self-service resolution for inventory shortages:
 * e.g. ACCEPT_PARTIAL, REMOVE_ITEM, WAIT_FOR_PRODUCT, REQUEST_SUBSTITUTE
 */
registerPost(['/customer/orders/:id/action', '/api/customer/orders/:id/action'], requireCustomerAuth, async (req: Request, res: Response) => {
  const session = getSessionUser(req)!;
  const orderId = req.params.id || (req.params as any)[0];
  const { itemId, resolution, notes } = req.body || {};

  const order = databaseStore.getOrder(orderId);
  if (!order || order.customerId !== session.userId) {
    return err(res, 404, 'Order not found.');
  }

  if (!itemId || !resolution) {
    return err(res, 400, 'itemId and resolution are required.');
  }

  const validResolutions = ['ACCEPT_PARTIAL', 'REMOVE_ITEM', 'WAIT_FOR_PRODUCT', 'REQUEST_SUBSTITUTE'];
  if (!validResolutions.includes(resolution)) {
    return err(res, 400, `Invalid resolution. Expected one of: ${validResolutions.join(', ')}`);
  }

  let resType: 'ACCEPT_PARTIAL' | 'REMOVE_ITEM' | 'CUSTOMER_WILL_WAIT' | 'SUBSTITUTION' = 'CUSTOMER_WILL_WAIT';
  if (resolution === 'ACCEPT_PARTIAL') resType = 'ACCEPT_PARTIAL';
  else if (resolution === 'REMOVE_ITEM') resType = 'REMOVE_ITEM';
  else if (resolution === 'REQUEST_SUBSTITUTE') resType = 'SUBSTITUTION';

  const updated = databaseStore.resolveOrderInventoryIssue({
    orderId,
    itemId,
    resolutionType: resType,
    adminId: `customer:${session.userId}`,
    adminName: session.contactName || 'Customer',
    notes: notes || `Customer selected: ${resolution}`,
  });

  if (!updated) {
    return err(res, 400, 'Unable to process action on item.');
  }

  databaseStore.addAuditLog({
    event: 'CUSTOMER_ACCEPTED_PARTIAL',
    targetId: orderId,
    adminId: session.userId,
    details: { resolution, itemId, notes },
  });

  return ok(res, { success: true, message: 'Resolution submitted successfully.', order: customerSafeOrder(updated) });
});

/**
 * GET /api/admin/orders
 * Returns all orders with filtering by fulfillment method, status, search term.
 */
registerGet(['/admin/orders', '/api/admin/orders'], requireAdminAuth, (req: Request, res: Response) => {
  const query = q(req);
  const status = query.status as GeneralOrderStatus | 'ALL' | undefined;
  const fulfillmentMethod = query.fulfillmentMethod as FulfillmentMethod | 'ALL' | undefined;
  const search = query.search as string | undefined;
  const limit = query.limit ? parseInt(query.limit, 10) : 100;
  const offset = query.offset ? parseInt(query.offset, 10) : 0;

  const allOrders = databaseStore.listOrders({ status, fulfillmentMethod, search });
  const orders = allOrders.slice(offset, offset + limit);
  return ok(res, { success: true, total: allOrders.length, orders });
});

/**
 * GET /api/admin/orders/:id
 * Full admin order detail including internal notes and item fulfillment history.
 */
registerGet(['/admin/orders/:id', '/api/admin/orders/:id'], requireAdminAuth, (req: Request, res: Response) => {
  const orderId = req.params.id || (req.params as any)[0];
  const order = databaseStore.getOrder(orderId);
  if (!order) {
    return err(res, 404, `Order ${orderId} not found.`);
  }
  return ok(res, { success: true, order });
});

/**
 * POST /api/admin/orders/:id/status
 * Updates general order status and sends automated notifications.
 * Prevents READY_FOR_PICKUP or OUT_FOR_DELIVERY if unresolved inventory issues exist (unless force=true).
 */
registerPost(['/admin/orders/:id/status', '/api/admin/orders/:id/status'], requireAdminAuth, async (req: Request, res: Response) => {
  const orderId = req.params.id || (req.params as any)[0];
  const { status, notes, force } = req.body || {};

  if (!status) {
    return err(res, 400, 'Order status is required.');
  }

  const existing = databaseStore.getOrder(orderId);
  if (!existing) {
    return err(res, 404, `Order ${orderId} not found.`);
  }

  // Guard against progressing to READY_FOR_PICKUP or OUT_FOR_DELIVERY if unresolved shortages exist
  if ((status === 'READY_FOR_PICKUP' || status === 'OUT_FOR_DELIVERY') && !force) {
    const hasUnresolvedShortage = existing.lineItems.some(item =>
      ['OUT_OF_STOCK', 'PARTIALLY_AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'PENDING_CHECK'].includes(item.itemFulfillmentStatus)
    );
    if (hasUnresolvedShortage) {
      return err(
        res,
        400,
        'Cannot advance order to Ready for Pickup / Out for Delivery with unresolved inventory issues. Please resolve item shortages first or pass force=true with administrative approval.'
      );
    }
  }

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_staff';

  const updated = databaseStore.updateOrderStatus({
    orderId,
    status,
    adminId,
    adminName: session?.contactName,
    note: notes,
    forceApproveAdjusted: Boolean(force),
  });

  if (!updated) {
    return err(res, 500, 'Failed to update order status.');
  }

  // Dispatch automated transactional emails
  try {
    if (status === 'READY_FOR_PICKUP') {
      await emailService.sendOrderReadyForPickupEmail(updated);
    } else if (status === 'OUT_FOR_DELIVERY') {
      await emailService.sendOrderOutForDeliveryEmail(updated);
    } else if (status === 'DELIVERED') {
      await emailService.sendOrderDeliveredEmail(updated);
    } else if (status === 'PICKED_UP') {
      await emailService.sendOrderPickedUpEmail(updated);
    } else if (status === 'CANCELLED') {
      await emailService.sendOrderCancelledEmail(updated, notes || 'Order was cancelled by administrative staff.');
    }
  } catch (emailErr: any) {
    console.error('[API /admin/orders/status] Email dispatch warning:', emailErr.message);
  }

  return ok(res, { success: true, message: `Order status updated to ${status}.`, order: updated });
});

/**
 * POST /api/admin/orders/:id/items/:itemId/status
 * Updates individual order item fulfillment status (e.g. AVAILABLE, OUT_OF_STOCK, PARTIALLY_AVAILABLE).
 * Records physical vs system quantity differences, logs inventory mismatches, and updates overall order status.
 */
registerPost(['/admin/orders/:id/items/:itemId/status', '/api/admin/orders/:id/items/:itemId/status'], requireAdminAuth, async (req: Request, res: Response) => {
  const orderId = req.params.id || (req.params as any)[0];
  const itemId = req.params.itemId || (req.params as any)[1];
  const { status, physicalQuantityAvailable, blockProductOnline, reason, substituteProductId, substituteProductName } = req.body || {};

  if (!status) {
    return err(res, 400, 'Item fulfillment status is required.');
  }

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_staff';

  const updateResult = databaseStore.updateOrderItemStatus({
    orderId,
    itemId,
    status,
    physicalQuantityAvailable: typeof physicalQuantityAvailable === 'number' ? physicalQuantityAvailable : undefined,
    adminId,
    adminName: session?.contactName,
    resolutionNotes: reason,
    blockOnline: Boolean(blockProductOnline),
  });

  const updatedOrder = updateResult.order;
  const updatedItem = updateResult.item;

  // Automatically dispatch customer inventory shortage notification if item is out of stock, partially available, or temporarily unavailable
  if (updatedItem && ['OUT_OF_STOCK', 'PARTIALLY_AVAILABLE', 'TEMPORARILY_UNAVAILABLE'].includes(status)) {
    try {
      await emailService.sendInventoryIssueEmail(updatedOrder, [updatedItem]);
    } catch (emailErr: any) {
      console.error('[API /admin/orders/items/status] Email warning:', emailErr.message);
    }
  }

  return ok(res, {
    success: true,
    message: `Item ${itemId} updated to ${status}.`,
    order: updatedOrder,
    item: updatedItem,
    productBlocked: Boolean(blockProductOnline),
  });
});

/**
 * POST /api/admin/orders/:id/resolve
 * Admin resolution for inventory problems (e.g. CUSTOMER_ACCEPTED_PARTIAL, REMOVE_UNAVAILABLE_ITEM, SUBSTITUTION_APPROVED).
 * Recalculates order subtotal, delivery fee, taxes, and final total while preserving original ordered history.
 */
registerPost(['/admin/orders/:id/resolve', '/api/admin/orders/:id/resolve'], requireAdminAuth, async (req: Request, res: Response) => {
  const orderId = req.params.id || (req.params as any)[0];
  const { itemId, resolution, notes, substituteItem } = req.body || {};

  if (!resolution) {
    return err(res, 400, 'resolution is required.');
  }

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_staff';

  const updated = databaseStore.resolveOrderInventoryIssue({
    orderId,
    resolutionType: resolution,
    itemId,
    adminId,
    adminName: session?.contactName,
    notes,
    substituteItem,
  });

  if (!updated) {
    return err(res, 404, `Order ${orderId} not found.`);
  }

  // Send adjustment notification to customer
  try {
    if (resolution === 'CANCEL_ORDER') {
      await emailService.sendOrderCancelledEmail(updated, notes || 'Order was cancelled following inventory resolution.');
    } else {
      await emailService.sendOrderAdjustedEmail(
        updated,
        `Inventory issue for item ${itemId || 'order'} was resolved: ${resolution}. ${notes || ''}`
      );
    }
  } catch (emailErr: any) {
    console.error('[API /admin/orders/resolve] Email warning:', emailErr.message);
  }

  return ok(res, { success: true, message: 'Order issue resolved and totals recalculated.', order: updated });
});

/**
 * POST /api/admin/orders/:id/internal-notes
 * Adds an internal staff note (visible exclusively to authorized staff).
 */
registerPost(['/admin/orders/:id/internal-notes', '/api/admin/orders/:id/internal-notes'], requireAdminAuth, (req: Request, res: Response) => {
  const orderId = req.params.id || (req.params as any)[0];
  const { note } = req.body || {};

  if (!note || !note.trim()) {
    return err(res, 400, 'Note content cannot be blank.');
  }

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_staff';

  const updated = databaseStore.addInternalOrderNote({
    orderId,
    note: note.trim(),
    authorId: adminId,
    authorName: session?.contactName || 'Staff Member',
  });

  return ok(res, { success: true, message: 'Internal note recorded.', order: updated });
});

/**
 * POST /api/admin/products/:id/temporary-override
 * Marks a product temporarily out of stock online, blocking new purchases without altering Zoho.
 */
registerPost(['/admin/products/:id/temporary-override', '/api/admin/products/:id/temporary-override'], requireAdminAuth, (req: Request, res: Response) => {
  const productId = req.params.id || (req.params as any)[0];
  const { isOutOfStockOnline, statusOverride, reason, sku, productName } = req.body || {};

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_staff';

  if (isOutOfStockOnline === false || statusOverride === 'AVAILABLE') {
    const success = databaseStore.removeProductOnlineOverride(productId, adminId);
    return ok(res, { success, message: `Product ${productId} online override removed. Restored to live Zoho sync.` });
  }

  const status = statusOverride || (isOutOfStockOnline ? 'TEMPORARILY_UNAVAILABLE' : 'AVAILABLE');

  const override = databaseStore.setProductOnlineOverride({
    productId,
    sku: sku || productId,
    name: productName || productId,
    reason: reason || `Marked ${status.replace(/_/g, ' ')} by administrator`,
    statusOverride: status,
    isOutOfStockOnline: status === 'TEMPORARILY_UNAVAILABLE' || status === 'OUT_OF_STOCK',
    reportedBy: adminId,
  });

  return ok(res, { success: true, message: `Product ${productId} availability set to ${status}.`, override });
});

/**
 * GET /api/admin/products/temporary-overrides
 * Lists all active online product overrides.
 */
registerGet(['/admin/products/temporary-overrides', '/api/admin/products/temporary-overrides'], requireAdminAuth, (_req: Request, res: Response) => {
  const overrides = databaseStore.listProductOverrides();
  return ok(res, { success: true, overrides });
});

/**
 * GET /api/admin/inventory-mismatches
 * Lists physical inventory discrepancy records for warehouse reconciliation.
 */
registerGet(['/admin/inventory-mismatches', '/api/admin/inventory-mismatches'], requireAdminAuth, (req: Request, res: Response) => {
  const query = q(req);
  const resolved = query.resolved === 'true' ? true : query.resolved === 'false' ? false : undefined;
  const mismatches = databaseStore.listInventoryMismatches(resolved);
  return ok(res, { success: true, mismatches, total: mismatches.length });
});

/**
 * POST /api/admin/inventory-mismatches/:id/resolve
 * Marks an inventory mismatch record resolved with notes.
 */
registerPost(['/admin/inventory-mismatches/:id/resolve', '/api/admin/inventory-mismatches/:id/resolve'], requireAdminAuth, (req: Request, res: Response) => {
  const mismatchId = req.params.id || (req.params as any)[0];
  const { notes } = req.body || {};

  const session = getSessionUser(req);
  const adminId = session?.userId || 'admin_staff';

  const updated = databaseStore.resolveInventoryMismatch(mismatchId, adminId, notes || 'Resolved by inventory manager.');
  if (!updated) {
    return err(res, 404, `Mismatch record ${mismatchId} not found.`);
  }

  return ok(res, { success: true, mismatch: updated });
});

export const apiRouter = apiApp;
export default apiApp;
