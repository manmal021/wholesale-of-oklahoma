/**
 * inventoryStore.ts
 * In-memory & cache layer for Wholesale of Oklahoma inventory.
 * Connects to ZohoInventoryClient, provides resilient fallback,
 * caching, filtering, search, pagination, and webhook processing.
 */

import { ZohoInventoryClient } from './zohoClient.js';
import type {
  InventoryItem,
  InventoryFilterParams,
  InventoryResponse,
  AdminInventorySettings,
  ZohoSyncStatus,
  StockStatus,
} from '../types/inventory.js';
import { PRODUCTS, type WholesaleProduct } from '../lib/productDatabase.js';
import { productImageRegistry } from './productImageRegistry.js';
import { validateImageUpdatePayload, reconcileWebsitePrices, calculateWebsitePrice } from './priceReconciliation.js';


// Seed pricing for wholesale B2B display
const PRODUCT_RATES: Record<string, number> = {
  'geekbar-15k': 12.5,
  'geekbar-25k': 14.75,
  'geekbar-60k': 17.5,
  'lostmary-mt15000': 12.25,
  'lostmary-os5000': 10.5,
  'raz-dc25000': 14.5,
  'raz-tn9000': 11.75,
  'smok-novo5': 18.0,
  'smok-nord5': 24.5,
  'vaporesso-xros4': 19.5,
  'coastal-clouds-60ml': 7.5,
  'naked100-60ml': 7.25,
  'beaker-bong-12': 28.0,
  'honeycomb-perc-14': 38.5,
  'thca-indoor-flower-35g': 12.0,
  'delta9-live-rosin-gummies': 11.5,
  'opms-gold-capsules': 19.0,
  'opms-black-shot': 12.5,
  'raw-classic-king-slim': 22.0,
  'raw-black-cones-1-14': 26.5,
};

// All items configured to exactly 50 units
const DEFAULT_STOCK = 50;

const SEED_STOCK_MAP: Record<string, number> = {
  'geekbar-15k': 50,
  'geekbar-25k': 50,
  'geekbar-60k': 50,
  'lostmary-mt15000': 50,
  'lostmary-os5000': 50,
  'raz-dc25000': 50,
  'raz-tn9000': 50,
  'smok-novo5': 50,
  'smok-nord5': 50,
  'vaporesso-xros4': 50,
  'coastal-clouds-60ml': 50,
  'naked100-60ml': 50,
  'beaker-bong-12': 50,
  'honeycomb-perc-14': 50,
  'thca-indoor-flower-35g': 50,
  'delta9-live-rosin-gummies': 50,
  'opms-gold-capsules': 50,
  'opms-black-shot': 50,
  'raw-classic-king-slim': 50,
  'raw-black-cones-1-14': 50,
};

export class InventoryStore {
  private zohoClient: ZohoInventoryClient;
  private items: Map<string, InventoryItem> = new Map();
  private settings: AdminInventorySettings = {
    display_mode: 'exact_quantity',
    hide_out_of_stock: false,
    low_stock_threshold: 15,
    allow_backorders: false,
  };
  private syncStatus: ZohoSyncStatus = {
    connection_status: 'demo_mode',
    last_sync_time: null,
    last_update_time: null,
    total_items_synced: 0,
    items_with_errors: 0,
  };

  constructor() {
    this.zohoClient = new ZohoInventoryClient();
    this.initSeedCatalog();
  }

  /**
   * Initializes the catalog with rich seed data matching Wholesale of Oklahoma's inventory
   * formatted precisely according to official Zoho Item structure.
   */
  private initSeedCatalog() {
    let zohoCounter = 12800000001001;

    PRODUCTS.forEach((p: WholesaleProduct) => {
      const stock = SEED_STOCK_MAP[p.id] ?? DEFAULT_STOCK;
      const status: StockStatus = stock <= 0 ? 'out_of_stock' : stock <= this.settings.low_stock_threshold ? 'low_stock' : 'in_stock';

      const zohoItemId = String(zohoCounter++);
      const verifiedImage = productImageRegistry.getVerifiedImageUrl(p.id);
      const image = verifiedImage || '';
      const zohoRate = PRODUCT_RATES[p.id] || (p.pricePerUnit > 0 ? p.pricePerUnit : 0);
      const rate = calculateWebsitePrice(zohoRate);

      // Create variants if product has flavors or options
      const variants = p.flavours && p.flavours.length > 0
        ? p.flavours.map((flv, idx) => {
          const vStock = DEFAULT_STOCK;
          const vStatus: StockStatus = 'in_stock';

          const variantSku = `${p.sku}-${flv.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4)}`;
          return {
            variant_id: `${zohoItemId}-${idx + 1}`,
            variant_sku: variantSku,
            variant_name: flv,
            attribute_name: 'Flavor',
            attribute_value: flv,
            stock_on_hand: vStock,
            available_stock: vStock,
            stock_status: vStatus,
            zoho_rate: zohoRate,
            rate: rate,
          };
        })
        : undefined;

      const item: InventoryItem = {
        id: p.id,
        zoho_item_id: zohoItemId,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory,
        description: `${p.name} supplied directly from Wholesale of Oklahoma central OKC warehouse. High commercial turnover for Wholesale of Oklahoma retail partners, dispensaries, and convenience stores.`,
        image_url: image,
        gallery_images: image ? [image] : [],
        zoho_rate: zohoRate,
        rate: rate,
        available_stock: stock,
        stock_on_hand: stock,
        stock_status: status,
        status: 'active',
        upc: `85001${String(zohoCounter).slice(-7)}`,
        unit: 'Box',
        min_order_qty: p.minOrderQty || 1,
        bulk_pricing: [],
        specs: {
          puffs: p.puffs,
          nicotine: p.nicotine,
          size: p.size,
          battery: p.subcategory === 'Battery' ? '650mAh' : 'Integrated Rechargeable',
          case_pack: '10 units / display box',
          origin: 'USA Distributed · Licensed OK Warehouse',
        },
        features: p.features,
        variants: variants,
        badge: p.badge,
        last_modified_time: new Date().toISOString(),
      };

      this.items.set(p.sku, item);
    });

    this.syncStatus.total_items_synced = this.items.size;
    this.syncStatus.last_sync_time = new Date().toISOString();
    this.syncStatus.last_update_time = new Date().toISOString();
    this.syncStatus.connection_status = this.zohoClient.isConfigured() ? 'connected' : 'demo_mode';
  }

  /**
   * Syncs with live Zoho Inventory API if configured, or simulates refresh safely.
   */
  public async syncWithZoho(): Promise<ZohoSyncStatus> {
    this.syncStatus.connection_status = 'syncing';

    if (this.zohoClient.isConfigured()) {
      try {
        let page = 1;
        let hasMore = true;
        let fetchedCount = 0;
        let errorCount = 0;

        while (hasMore && page <= 5) {
          const res = await this.zohoClient.fetchZohoItems(page, 200);
          for (const raw of res.items) {
            try {
              const normalized = this.zohoClient.normalizeZohoItem(raw, this.settings.low_stock_threshold);
              this.items.set(normalized.sku, normalized);
              fetchedCount++;
            } catch {
              errorCount++;
            }
          }
          hasMore = res.hasMore;
          page++;
        }

        this.syncStatus.connection_status = 'connected';
        this.syncStatus.last_sync_time = new Date().toISOString();
        this.syncStatus.last_update_time = new Date().toISOString();
        this.syncStatus.total_items_synced = fetchedCount;
        this.syncStatus.items_with_errors = errorCount;
        this.syncStatus.error_message = null;
      } catch (err: any) {
        // RESILIENT FALLBACK: Do not wipe cache! Keep existing items intact.
        this.syncStatus.connection_status = 'auth_error';
        this.syncStatus.error_message = err.message || 'Error connecting to Zoho Inventory API';
      }
    } else {
      // Sandbox / Demo Mode refresh
      await new Promise((r) => setTimeout(r, 600)); // Real feel network delay
      this.syncStatus.connection_status = 'demo_mode';
      this.syncStatus.last_sync_time = new Date().toISOString();
      this.syncStatus.last_update_time = new Date().toISOString();
      this.syncStatus.total_items_synced = this.items.size;
      this.syncStatus.items_with_errors = 0;
      this.syncStatus.error_message = null;
    }

    return this.syncStatus;
  }

  /**
   * Handles real-time Webhook from Zoho Inventory Automation.
   * Supports real-time stock updates as well as authoritative price updates.
   */
  public handleZohoWebhook(payload: any): boolean {
    if (!payload) return false;

    const itemId = String(payload.item_id || payload.itemId || '');
    const sku = String(payload.sku || '');
    const newStock = payload.stock_on_hand !== undefined ? Number(payload.stock_on_hand) : undefined;
    const availableStock = payload.available_stock !== undefined ? Number(payload.available_stock) : newStock;
    const rawRate = payload.rate !== undefined && !isNaN(Number(payload.rate)) ? Number(payload.rate) : undefined;

    // Find item by SKU or Zoho item ID
    let foundItem: InventoryItem | undefined;
    for (const item of this.items.values()) {
      if ((sku && item.sku.toLowerCase() === sku.toLowerCase()) || (itemId && item.zoho_item_id === itemId)) {
        foundItem = item;
        break;
      }
    }

    if (!foundItem) return false;

    let updated = false;

    // 1. Authoritative price update (Zoho rate -> website selling price)
    if (rawRate !== undefined && rawRate >= 0) {
      foundItem.zoho_rate = rawRate;
      foundItem.rate = calculateWebsitePrice(rawRate);
      updated = true;
    }

    // 2. Variant price updates if provided
    if (Array.isArray(payload.variants) && Array.isArray(foundItem.variants)) {
      for (const pv of payload.variants) {
        const vRate = pv.rate !== undefined && !isNaN(Number(pv.rate)) ? Number(pv.rate) : undefined;
        if (vRate !== undefined && vRate >= 0) {
          const vTargetId = String(pv.variant_id || pv.item_id || '');
          const vTargetSku = String(pv.sku || '').toLowerCase();
          const matchVar = foundItem.variants.find(
            (v) => (vTargetId && String(v.variant_id) === vTargetId) || (vTargetSku && v.variant_sku.toLowerCase() === vTargetSku)
          );
          if (matchVar) {
            matchVar.zoho_rate = vRate;
            matchVar.rate = calculateWebsitePrice(vRate);
            updated = true;
          }
        }
      }
    }

    // 3. Stock updates
    if (availableStock !== undefined) {
      foundItem.available_stock = availableStock;
      foundItem.stock_on_hand = newStock ?? availableStock;

      if (availableStock <= 0) {
        foundItem.stock_status = 'out_of_stock';
      } else if (availableStock <= this.settings.low_stock_threshold) {
        foundItem.stock_status = 'low_stock';
      } else {
        foundItem.stock_status = 'in_stock';
      }
      updated = true;
    }

    if (updated) {
      foundItem.last_modified_time = new Date().toISOString();
      this.syncStatus.last_update_time = new Date().toISOString();
      return true;
    }

    return false;
  }

  /**
   * LEAST-PRIVILEGE IMAGE UPDATE:
   * Strictly updates ONLY image-related fields.
   * Modifying price, rate, cost, inventory, SKU, or product title is forbidden.
   */
  public updateProductImage(
    idOrSku: string,
    imageData: Record<string, any>
  ): InventoryItem | null {
    // 1. Validate payload contains ZERO pricing or inventory fields
    const safeData = validateImageUpdatePayload(imageData);

    // 2. Find product
    const item = this.getItem(idOrSku);
    if (!item) return null;

    // 3. Mutate ONLY image fields
    if (safeData.imageUrl !== undefined) {
      item.image_url = safeData.imageUrl;
      if (safeData.imageUrl) {
        item.gallery_images = [safeData.imageUrl];
      }
    }
    item.last_modified_time = new Date().toISOString();
    return item;
  }

  /**
   * LEAST-PRIVILEGE PRICE SYNC:
   * Dedicated method to synchronize selling prices strictly from verified Zoho data.
   * Customer-facing price = Zoho rate.
   * Variant price = Zoho variant rate.
   * NEVER uses purchase_rate.
   */
  public syncZohoPrice(
    idOrSku: string,
    newZohoRate: number,
    variantRates?: Record<string, number>
  ): InventoryItem | null {
    if (typeof newZohoRate !== 'number' || isNaN(newZohoRate) || newZohoRate < 0) {
      throw new Error(`Invalid Zoho rate provided for ${idOrSku}: ${newZohoRate}`);
    }

    const item = this.getItem(idOrSku);
    if (!item) return null;

    item.zoho_rate = newZohoRate;
    item.rate = calculateWebsitePrice(newZohoRate);

    // Sync variant rates if provided
    if (variantRates && Array.isArray(item.variants)) {
      for (const variant of item.variants) {
        if (variantRates[variant.variant_id] !== undefined) {
          variant.zoho_rate = variantRates[variant.variant_id];
          variant.rate = calculateWebsitePrice(variantRates[variant.variant_id]);
        } else if (variantRates[variant.variant_sku] !== undefined) {
          variant.zoho_rate = variantRates[variant.variant_sku];
          variant.rate = calculateWebsitePrice(variantRates[variant.variant_sku]);
        }
      }
    }

    item.last_modified_time = new Date().toISOString();
    return item;
  }

  /**
   * LEAST-PRIVILEGE INVENTORY SYNC:
   * Dedicated method to synchronize inventory counts and stock statuses.
   */
  public syncZohoInventory(
    idOrSku: string,
    availableStock: number
  ): InventoryItem | null {
    const item = this.getItem(idOrSku);
    if (!item) return null;

    item.available_stock = Math.max(0, availableStock);
    item.stock_on_hand = Math.max(0, availableStock);

    if (item.available_stock <= 0) {
      item.stock_status = 'out_of_stock';
    } else if (item.available_stock <= this.settings.low_stock_threshold) {
      item.stock_status = 'low_stock';
    } else {
      item.stock_status = 'in_stock';
    }

    item.last_modified_time = new Date().toISOString();
    return item;
  }

  /**
   * Reconciles all items in the store against Zoho items using strict matching priorities.
   */
  public reconcileCatalogWithZoho(zohoItems: any[]) {
    const currentList = Array.from(this.items.values());
    const { updatedItems, report } = reconcileWebsitePrices(currentList, zohoItems);

    for (const item of updatedItems) {
      this.items.set(item.sku, item);
    }

    this.syncStatus.last_update_time = new Date().toISOString();
    return report;
  }


  /**
   * Filter, search, and paginate items with public stock status according to settings.
   */
  public queryItems(params: InventoryFilterParams): InventoryResponse {
    let list = Array.from(this.items.values());

    // 1. Hide out of stock if setting enabled
    if (this.settings.hide_out_of_stock) {
      list = list.filter((i) => i.stock_status !== 'out_of_stock');
    }

    // 2. Search query (matches name, SKU, brand, category, flavors/variants, description)
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter((item) => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.subcategory && item.subcategory.toLowerCase().includes(q)) ||
          item.description.toLowerCase().includes(q) ||
          (item.variants && item.variants.some((v) => v.variant_name.toLowerCase().includes(q) || v.variant_sku.toLowerCase().includes(q)))
        );
      });
    }

    // 3. Category Filter
    if (params.category && params.category !== 'All') {
      list = list.filter((i) => i.category.toLowerCase() === params.category!.toLowerCase());
    }

    // 4. Brand Filter
    if (params.brand && params.brand !== 'All') {
      list = list.filter((i) => i.brand.toLowerCase() === params.brand!.toLowerCase());
    }

    // 5. Availability Filter
    if (params.availability && params.availability !== 'all') {
      list = list.filter((i) => i.stock_status === params.availability);
    }

    // 6. Price Range Filter
    if (params.price_range && params.price_range !== 'all') {
      switch (params.price_range) {
        case 'under-15':
          list = list.filter((i) => i.rate < 15);
          break;
        case '15-30':
          list = list.filter((i) => i.rate >= 15 && i.rate <= 30);
          break;
        case '30-60':
          list = list.filter((i) => i.rate > 30 && i.rate <= 60);
          break;
        case '60-plus':
          list = list.filter((i) => i.rate > 60);
          break;
      }
    }

    // 7. Product Type / Subcategory Filter
    if (params.product_type && params.product_type !== 'All') {
      list = list.filter((i) => i.subcategory?.toLowerCase() === params.product_type!.toLowerCase());
    }

    // 8. Sorting
    const sort = params.sort_by || 'newest';
    list.sort((a, b) => {
      switch (sort) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'price_asc':
          return a.rate - b.rate;
        case 'price_desc':
          return b.rate - a.rate;
        case 'availability': {
          const rank: Record<StockStatus, number> = { in_stock: 0, low_stock: 1, out_of_stock: 2 };
          return rank[a.stock_status] - rank[b.stock_status];
        }
        case 'newest':
        default:
          return 0; // Natural order preserved
      }
    });

    // 9. Pagination
    const total = list.length;
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 12);
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = list.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      total_pages: totalPages,
      settings: this.settings,
      sync_info: {
        last_synced: this.syncStatus.last_sync_time || new Date().toISOString(),
        source: this.zohoClient.isConfigured() ? 'zoho_live' : 'sandbox_catalog',
        is_live_connected: this.zohoClient.isConfigured(),
      },
    };
  }

  /**
   * Returns a single item by SKU or Zoho Item ID
   */
  public getItem(idOrSku: string): InventoryItem | null {
    // Check by SKU first
    if (this.items.has(idOrSku)) {
      return this.items.get(idOrSku)!;
    }
    // Check by ID or Zoho item ID
    for (const item of this.items.values()) {
      if (item.id === idOrSku || item.zoho_item_id === idOrSku) {
        return item;
      }
    }
    return null;
  }

  /**
   * Returns distinct categories and brands for filter bars
   */
  public getMetadata() {
    const categories = new Set<string>();
    const brands = new Set<string>();
    const productTypes = new Set<string>();

    for (const item of this.items.values()) {
      if (item.category) categories.add(item.category);
      if (item.brand) brands.add(item.brand);
      if (item.subcategory) productTypes.add(item.subcategory);
    }

    return {
      categories: Array.from(categories).sort(),
      brands: Array.from(brands).sort(),
      productTypes: Array.from(productTypes).sort(),
      total_items: this.items.size,
    };
  }

  public getSettings(): AdminInventorySettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AdminInventorySettings>): AdminInventorySettings {
    this.settings = { ...this.settings, ...partial };
    // Re-evaluate stock statuses based on new threshold
    for (const item of this.items.values()) {
      if (item.available_stock <= 0) {
        item.stock_status = 'out_of_stock';
      } else if (item.available_stock <= this.settings.low_stock_threshold) {
        item.stock_status = 'low_stock';
      } else {
        item.stock_status = 'in_stock';
      }
    }
    return this.settings;
  }

  public getSyncStatus(): ZohoSyncStatus {
    return { ...this.syncStatus };
  }

  public getZohoConfig() {
    return this.zohoClient.getConfig();
  }

  public updateZohoConfig(config: any) {
    this.zohoClient.updateConfig(config);
    this.syncStatus.connection_status = this.zohoClient.isConfigured() ? 'connected' : 'demo_mode';
    return this.zohoClient.getConfig();
  }

  public async processWholesaleOrder(order: {
    customerName: string;
    businessName: string;
    email: string;
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
  }) {
    // 1. Deduct stock from local inventory store
    for (const item of order.lineItems) {
      const found =
        (item.sku ? this.items.get(item.sku) : undefined) ||
        Array.from(this.items.values()).find(
          (i) => (item.id && i.id === item.id) || (item.sku && i.sku === item.sku)
        );
      if (found) {
        found.available_stock = Math.max(0, found.available_stock - item.quantity);
        found.stock_on_hand = Math.max(0, found.stock_on_hand - item.quantity);
        if (found.available_stock <= 0) {
          found.stock_status = 'out_of_stock';
        } else if (found.available_stock <= this.settings.low_stock_threshold) {
          found.stock_status = 'low_stock';
        }
      }
    }

    const orderId = `WOO-ORD-${Date.now().toString().slice(-6)}`;
    let zohoSalesOrder: any = null;

    // 2. Submit to Zoho Inventory in the background if configured
    if (this.zohoClient.isConfigured()) {
      try {
        zohoSalesOrder = await this.zohoClient.createSalesOrder({
          customerName: order.customerName,
          businessName: order.businessName,
          email: order.email,
          phone: order.phone,
          notes: order.notes,
          lineItems: order.lineItems.map((i) => ({
            item_id: i.zoho_item_id,
            name: i.name,
            quantity: i.quantity,
            rate: i.pricePerUnit,
          })),
        });
      } catch (err) {
        console.error('Background Zoho Sales Order creation error:', err);
      }
    }

    this.syncStatus.last_update_time = new Date().toISOString();

    return {
      orderId,
      success: true,
      zohoSalesOrder,
      message: 'Wholesale restock order successfully registered and queued for OKC dispatch.',
    };
  }
}

// Export singleton instance for the app backend
export const inventoryStore = new InventoryStore();
