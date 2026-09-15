/**
 * priceReconciliation.ts
 *
 * Core Data Ownership & Price Reconciliation Engine for Wholesale of Oklahoma.
 *
 * GOAL & DATA OWNERSHIP RULES:
 *  - Zoho Inventory is the SOLE authoritative source of truth for all product pricing.
 *  - The image importer/search system must NEVER determine, estimate, generate,
 *    scrape, modify, or overwrite product prices.
 *  - Standard Zoho items: website selling price = Zoho rate
 *  - Zoho item variants: website variant selling price = variant rate
 *  - NEVER use purchase_rate as customer-facing selling price (purchase_rate is cost price).
 *  - Matching priority:
 *      1. Zoho item_id / variant_id if already stored
 *      2. SKU (exact case-insensitive match)
 *      3. UPC/EAN if available
 *      4. Product name ONLY as a last resort
 */

import fs from 'fs';
import path from 'path';
import type { InventoryItem, InventoryVariant } from '../types/inventory.js';

export interface PriceAuditRecord {
  product: string;
  sku: string;
  zoho_item_id: string;
  old_website_price: number | null;
  zoho_price: number;
  new_website_price: number;
  sync_status: 'RECONCILED_UPDATED' | 'ALREADY_MATCHED' | 'UNMATCHED_IN_ZOHO' | 'ZOHO_RATE_MISSING' | 'PRESERVED_LAST_VERIFIED';
  variant_audits?: Array<{
    variant_id: string;
    variant_sku: string;
    variant_name: string;
    old_price: number | null;
    zoho_price: number;
    new_price: number;
    sync_status: string;
  }>;
  timestamp: string;
}

export interface ReconciliationReport {
  timestamp: string;
  total_website_products: number;
  total_zoho_products: number;
  matched_count: number;
  updated_count: number;
  unmatched_count: number;
  unmatched_products: Array<{ id: string; sku: string; name: string }>;
  audits: PriceAuditRecord[];
}

// ── Private Secure Audit Logging ─────────────────────────────────────────────
const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const AUDIT_LOG_FILE = path.join(STORAGE_DIR, 'price_reconciliation_audit.log');

export function logPriceAuditSecurely(audits: PriceAuditRecord[]): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    const lines = audits.map((a) => JSON.stringify(a)).join('\n') + '\n';
    fs.appendFileSync(AUDIT_LOG_FILE, lines, 'utf-8');
  } catch (err: any) {
    console.error('[PriceReconciliation] Could not append to private audit log:', err.message);
  }
}

// ── Matching Priority Engine ──────────────────────────────────────────────────

export interface RawZohoItemLike {
  item_id: string;
  sku?: string;
  name: string;
  rate?: number | string;
  purchase_rate?: number | string;
  upc?: string;
  ean?: string;
  isbn?: string;
  status?: string;
  variants?: Array<{
    item_id?: string;
    variant_id?: string;
    sku?: string;
    name?: string;
    rate?: number | string;
    purchase_rate?: number | string;
  }>;
  [key: string]: any;
}

/**
 * Matches a website product to a Zoho product using strict priority:
 *  Priority 1: Zoho item_id / variant_id if already stored
 *  Priority 2: SKU (case-insensitive exact match)
 *  Priority 3: UPC / EAN if available
 *  Priority 4: Product name only as a last resort
 */
export function matchWebsiteProductToZoho(
  websiteItem: InventoryItem,
  zohoItems: RawZohoItemLike[]
): RawZohoItemLike | null {
  // Priority 1: Zoho item_id
  if (websiteItem.zoho_item_id && !websiteItem.zoho_item_id.startsWith('ZOHO-ITM-TEMP')) {
    const match = zohoItems.find((z) => String(z.item_id) === String(websiteItem.zoho_item_id));
    if (match) return match;
  }

  // Priority 2: SKU (exact case-insensitive)
  if (websiteItem.sku && websiteItem.sku.trim()) {
    const targetSku = websiteItem.sku.trim().toLowerCase();
    const match = zohoItems.find((z) => z.sku && z.sku.trim().toLowerCase() === targetSku);
    if (match) return match;
  }

  // Priority 3: UPC / EAN
  if (websiteItem.upc && websiteItem.upc.trim()) {
    const targetUpc = websiteItem.upc.trim().toLowerCase();
    const match = zohoItems.find((z) => {
      const zUpc = (z.upc || z.ean || z.isbn || '').trim().toLowerCase();
      return zUpc && zUpc === targetUpc;
    });
    if (match) return match;
  }

  // Priority 4: Product name ONLY as a last resort
  // Strict matching to prevent similar product names from causing incorrect matches
  if (websiteItem.name && websiteItem.name.trim()) {
    const targetName = websiteItem.name.trim().toLowerCase();
    const match = zohoItems.find((z) => z.name && z.name.trim().toLowerCase() === targetName);
    if (match) return match;
  }

  return null;
}

/**
 * Matches a website variant to a Zoho variant using strict priority:
 *  Priority 1: variant_id / item_id
 *  Priority 2: variant_sku / sku
 *  Priority 3: variant_name / attribute_value (only as last resort)
 */
export function matchWebsiteVariantToZoho(
  websiteVariant: InventoryVariant,
  zohoVariants: Array<any>
): any | null {
  if (!Array.isArray(zohoVariants) || zohoVariants.length === 0) return null;

  // Priority 1: variant_id
  if (websiteVariant.variant_id) {
    const match = zohoVariants.find((zv) => String(zv.variant_id || zv.item_id) === String(websiteVariant.variant_id));
    if (match) return match;
  }

  // Priority 2: variant_sku
  if (websiteVariant.variant_sku && websiteVariant.variant_sku.trim()) {
    const targetSku = websiteVariant.variant_sku.trim().toLowerCase();
    const match = zohoVariants.find((zv) => zv.sku && zv.sku.trim().toLowerCase() === targetSku);
    if (match) return match;
  }

  // Priority 3: variant_name as last resort
  if (websiteVariant.variant_name && websiteVariant.variant_name.trim()) {
    const targetName = websiteVariant.variant_name.trim().toLowerCase();
    const match = zohoVariants.find(
      (zv) =>
        (zv.name && zv.name.trim().toLowerCase() === targetName) ||
        (zv.variant_name && zv.variant_name.trim().toLowerCase() === targetName) ||
        (zv.attribute_value && zv.attribute_value.trim().toLowerCase() === targetName)
    );
    if (match) return match;
  }

  return null;
}

// ── One-Time & Ongoing Price Reconciliation Engine ───────────────────────────

/**
 * Reconciles website product prices strictly against verified Zoho Inventory data.
 *
 * Rules:
 *  - website price = Zoho rate
 *  - website variant price = Zoho variant rate
 *  - NEVER use purchase_rate as website price
 *  - DO NOT invent retail price or markup
 *  - If Zoho rate is absent/invalid: preserve last verified Zoho selling price,
 *    mark for admin review, and NEVER use scraped or external prices.
 */
export function reconcileWebsitePrices(
  websiteItems: InventoryItem[],
  zohoItems: RawZohoItemLike[]
): { updatedItems: InventoryItem[]; report: ReconciliationReport } {
  const updatedItems: InventoryItem[] = [];
  const audits: PriceAuditRecord[] = [];
  const unmatched: Array<{ id: string; sku: string; name: string }> = [];

  let matchedCount = 0;
  let updatedCount = 0;

  for (const item of websiteItems) {
    const zohoMatch = matchWebsiteProductToZoho(item, zohoItems);

    if (!zohoMatch) {
      unmatched.push({ id: item.id, sku: item.sku, name: item.name });
      audits.push({
        product: item.name,
        sku: item.sku,
        zoho_item_id: item.zoho_item_id || '',
        old_website_price: item.rate,
        zoho_price: item.rate,
        new_website_price: item.rate,
        sync_status: 'UNMATCHED_IN_ZOHO',
        timestamp: new Date().toISOString(),
      });
      updatedItems.push(item);
      continue;
    }

    matchedCount++;

    // Extract valid Zoho selling rate - NEVER use purchase_rate
    const rawRate = zohoMatch.rate;
    const hasValidZohoRate =
      rawRate !== undefined &&
      rawRate !== null &&
      !isNaN(Number(rawRate)) &&
      Number(rawRate) >= 0;

    const oldPrice = item.rate ?? null;
    let newPrice = oldPrice;
    let syncStatus: PriceAuditRecord['sync_status'] = 'ALREADY_MATCHED';

    if (hasValidZohoRate) {
      const zohoRate = Number(rawRate);
      if (oldPrice !== zohoRate) {
        newPrice = zohoRate;
        syncStatus = 'RECONCILED_UPDATED';
        updatedCount++;
      }
    } else {
      // Zoho failed to return a price: PRESERVE last verified price, DO NOT INVENT
      syncStatus = 'PRESERVED_LAST_VERIFIED';
    }

    // Reconcile Variants individually
    let variantAudits: PriceAuditRecord['variant_audits'] = undefined;
    let reconciledVariants: InventoryVariant[] | undefined = undefined;

    if (Array.isArray(item.variants) && item.variants.length > 0) {
      variantAudits = [];
      reconciledVariants = item.variants.map((v) => {
        const vOldPrice = v.rate ?? null;
        let vNewPrice = vOldPrice;
        let vStatus = 'ALREADY_MATCHED';

        if (Array.isArray(zohoMatch.variants) && zohoMatch.variants.length > 0) {
          const zVariantMatch = matchWebsiteVariantToZoho(v, zohoMatch.variants);
          if (zVariantMatch && zVariantMatch.rate !== undefined && !isNaN(Number(zVariantMatch.rate))) {
            const zvRate = Number(zVariantMatch.rate);
            if (vOldPrice !== zvRate) {
              vNewPrice = zvRate;
              vStatus = 'RECONCILED_UPDATED';
            }
          } else if (hasValidZohoRate && (vOldPrice === null || vOldPrice === 0)) {
            // If variant has no specific rate in Zoho but parent has valid rate
            vNewPrice = Number(rawRate);
          }
        } else if (hasValidZohoRate && (vOldPrice === null || vOldPrice === 0)) {
          vNewPrice = Number(rawRate);
        }

        variantAudits!.push({
          variant_id: v.variant_id,
          variant_sku: v.variant_sku,
          variant_name: v.variant_name,
          old_price: vOldPrice,
          zoho_price: vNewPrice ?? 0,
          new_price: vNewPrice ?? 0,
          sync_status: vStatus,
        });

        return {
          ...v,
          rate: vNewPrice ?? 0,
        };
      });
    }

    audits.push({
      product: item.name,
      sku: item.sku,
      zoho_item_id: String(zohoMatch.item_id || item.zoho_item_id),
      old_website_price: oldPrice,
      zoho_price: hasValidZohoRate ? Number(rawRate) : (oldPrice ?? 0),
      new_website_price: newPrice ?? 0,
      sync_status: syncStatus,
      variant_audits: variantAudits,
      timestamp: new Date().toISOString(),
    });

    // Pure pricing reconciliation: DO NOT touch image, description, SKU, etc.
    updatedItems.push({
      ...item,
      zoho_item_id: String(zohoMatch.item_id || item.zoho_item_id),
      rate: newPrice ?? 0,
      // retail_msrp only if Zoho explicitly returned sales_rate
      retail_msrp: zohoMatch.sales_rate ? Number(zohoMatch.sales_rate) : item.retail_msrp,
      purchase_rate: zohoMatch.purchase_rate ? Number(zohoMatch.purchase_rate) : item.purchase_rate,
      variants: reconciledVariants || item.variants,
      last_modified_time: new Date().toISOString(),
    });
  }

  const report: ReconciliationReport = {
    timestamp: new Date().toISOString(),
    total_website_products: websiteItems.length,
    total_zoho_products: zohoItems.length,
    matched_count: matchedCount,
    updated_count: updatedCount,
    unmatched_count: unmatched.length,
    unmatched_products: unmatched,
    audits,
  };

  logPriceAuditSecurely(audits);

  return { updatedItems, report };
}

// ── Least-Privilege Guard Functions ───────────────────────────────────────────

export interface ProductImageOnlyUpdate {
  imageUrl?: string;
  sourceUrl?: string;
  sourceDomain?: string;
  imageAlt?: string;
  imageVerified?: boolean;
  licensingStatus?: string;
  matchNotes?: string;
  manuallyApproved?: boolean;
}

const FORBIDDEN_PRICING_KEYS = new Set([
  'price',
  'rate',
  'purchase_rate',
  'pricebook_rate',
  'cost',
  'salePrice',
  'retailPrice',
  'defaultPrice',
  'fallbackPrice',
  'discount',
  'tax',
  'inventory',
  'quantity',
  'available_stock',
  'stock_on_hand',
  'sku',
  'item_id',
  'id',
]);

/**
 * Validates that an image update operation contains ZERO pricing or inventory fields.
 * Throws a descriptive security error if any pricing field is detected.
 */
export function validateImageUpdatePayload(payload: any): ProductImageOnlyUpdate {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Image update payload must be a valid object');
  }

  for (const key of Object.keys(payload)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_PRICING_KEYS.has(lowerKey)) {
      throw new Error(
        `SECURITY VIOLATION: Image importer attempted to modify forbidden field "${key}". The image importer is strictly isolated from pricing and inventory.`
      );
    }
  }

  // Whitelist ONLY image attributes
  const safe: ProductImageOnlyUpdate = {};
  if (typeof payload.imageUrl === 'string') safe.imageUrl = payload.imageUrl;
  if (typeof payload.sourceUrl === 'string') safe.sourceUrl = payload.sourceUrl;
  if (typeof payload.sourceDomain === 'string') safe.sourceDomain = payload.sourceDomain;
  if (typeof payload.imageAlt === 'string') safe.imageAlt = payload.imageAlt;
  if (typeof payload.imageVerified === 'boolean') safe.imageVerified = payload.imageVerified;
  if (typeof payload.licensingStatus === 'string') safe.licensingStatus = payload.licensingStatus;
  if (typeof payload.matchNotes === 'string') safe.matchNotes = payload.matchNotes;
  if (typeof payload.manuallyApproved === 'boolean') safe.manuallyApproved = payload.manuallyApproved;

  return safe;
}
