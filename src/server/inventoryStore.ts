/**
 * inventoryStore.ts
 * In-memory & cache layer for Wholesale of Oklahoma inventory.
 * Connects to ZohoInventoryClient, provides resilient fallback,
 * caching, filtering, search, pagination, and webhook processing.
 */

import { ZohoInventoryClient } from './zohoClient';
import type {
  InventoryItem,
  InventoryFilterParams,
  InventoryResponse,
  AdminInventorySettings,
  ZohoSyncStatus,
  StockStatus,
} from '../types/inventory';
import { PRODUCTS, type WholesaleProduct } from '../lib/productDatabase';

// Curated stock levels and images for realistic wholesale demonstration
const PRODUCT_IMAGES: Record<string, string> = {
  'geekbar-15k': '/gallery/Screenshot_1.png',
  'geekbar-25k': '/gallery/Screenshot_2.png',
  'geekbar-60k': '/gallery/Screenshot_3.png',
  'lostmary-mt15000': '/gallery/Screenshot_4.png',
  'lostmary-os5000': '/gallery/Screenshot_5.png',
  'raz-dc25000': '/gallery/Screenshot_6.png',
  'raz-tn9000': '/gallery/Screenshot_7.png',
  'smok-novo5': '/gallery/img_(1).jpg',
  'smok-nord5': '/gallery/img_(2).jpg',
  'vaporesso-xros4': '/gallery/img_(3).jpg',
  'coastal-clouds-60ml': '/gallery/img_(4).jpg',
  'naked100-60ml': '/gallery/img_(5).jpg',
  'beaker-bong-12': '/gallery/img_(6).jpg',
  'honeycomb-perc-14': '/gallery/img_(7).jpg',
  'thca-indoor-flower-35g': '/gallery/img_(8).jpg',
  'delta9-live-rosin-gummies': '/gallery/img_(9).jpg',
  'opms-gold-capsules': '/gallery/img_(10).jpg',
  'opms-black-shot': '/gallery/img_(11).jpg',
  'raw-classic-king-slim': '/gallery/img_(12).jpg',
  'raw-black-cones-1-14': '/gallery/img_(13).jpg',
};

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

// Seed stock values to demonstrate 🟢 In Stock, 🟡 Low Stock, and 🔴 Out of Stock
const SEED_STOCK_MAP: Record<string, number> = {
  'geekbar-15k': 184, // In stock
  'geekbar-25k': 92, // In stock
  'geekbar-60k': 8, // Low stock!
  'lostmary-mt15000': 145, // In stock
  'lostmary-os5000': 0, // Out of stock!
  'raz-dc25000': 64, // In stock
  'raz-tn9000': 12, // Low stock!
  'smok-novo5': 38, // In stock
  'smok-nord5': 0, // Out of stock!
  'vaporesso-xros4': 52, // In stock
  'coastal-clouds-60ml': 120, // In stock
  'naked100-60ml': 6, // Low stock!
  'beaker-bong-12': 18, // In stock
  'honeycomb-perc-14': 4, // Low stock!
  'thca-indoor-flower-35g': 75, // In stock
  'delta9-live-rosin-gummies': 42, // In stock
  'opms-gold-capsules': 29, // In stock
  'opms-black-shot': 0, // Out of stock!
  'raw-classic-king-slim': 85, // In stock
  'raw-black-cones-1-14': 60, // In stock
};

export class InventoryStore {
  private zohoClient: ZohoInventoryClient;
  private items: Map<string, InventoryItem> = new Map();
  private settings: AdminInventorySettings = {
    display_mode: 'status_only',
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
      const stock = SEED_STOCK_MAP[p.id] ?? (p.inStock ? 45 : 0);
      let status: StockStatus = 'in_stock';
      if (stock <= 0) {
        status = 'out_of_stock';
      } else if (stock <= this.settings.low_stock_threshold) {
        status = 'low_stock';
      }

      const zohoItemId = String(zohoCounter++);
      const image = PRODUCT_IMAGES[p.id] || '/gallery/img_(1).jpg';
      const rate = PRODUCT_RATES[p.id] || (p.pricePerUnit > 0 ? p.pricePerUnit : 15.0);

      // Create variants if product has flavors or options
      const variants = p.flavours && p.flavours.length > 0
        ? p.flavours.map((flv, idx) => {
            const vStock = Math.max(0, Math.floor(stock / p.flavours.length) + (idx === 0 ? 5 : 0));
            let vStatus: StockStatus = 'in_stock';
            if (vStock <= 0) vStatus = 'out_of_stock';
            else if (vStock <= 5) vStatus = 'low_stock';

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
        description: `${p.name} supplied directly from Wholesale of Oklahoma central OKC warehouse. High commercial turnover for dispensaries, smoke shops, and convenience stores.`,
        image_url: image,
        gallery_images: [
          image,
          '/gallery/Screenshot_1.png',
          '/gallery/img_(14).jpg',
        ],
        rate: rate,
        retail_msrp: Number((rate * 1.65).toFixed(2)),
        purchase_rate: Number((rate * 0.65).toFixed(2)),
        available_stock: stock,
        stock_on_hand: stock,
        stock_status: status,
        status: 'active',
        upc: `85001${String(zohoCounter).slice(-7)}`,
        unit: 'Box',
        min_order_qty: p.minOrderQty || 1,
        bulk_pricing: [
          { minQty: 1, pricePerUnit: rate, label: '1 - 9 units' },
          { minQty: 10, pricePerUnit: Number((rate * 0.92).toFixed(2)), label: '10 - 24 units' },
          { minQty: 25, pricePerUnit: Number((rate * 0.85).toFixed(2)), label: 'Master Case (25+)' },
        ],
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
   * Handles real-time Webhook from Zoho Inventory Automation
   */
  public handleZohoWebhook(payload: any): boolean {
    if (!payload) return false;

    const itemId = String(payload.item_id || payload.itemId || '');
    const sku = String(payload.sku || '');
    const newStock = payload.stock_on_hand !== undefined ? Number(payload.stock_on_hand) : undefined;
    const availableStock = payload.available_stock !== undefined ? Number(payload.available_stock) : newStock;

    // Find item by SKU or Zoho item ID
    let foundItem: InventoryItem | undefined;
    for (const item of this.items.values()) {
      if ((sku && item.sku === sku) || (itemId && item.zoho_item_id === itemId)) {
        foundItem = item;
        break;
      }
    }

    if (foundItem && availableStock !== undefined) {
      foundItem.available_stock = availableStock;
      foundItem.stock_on_hand = newStock ?? availableStock;

      if (availableStock <= 0) {
        foundItem.stock_status = 'out_of_stock';
      } else if (availableStock <= this.settings.low_stock_threshold) {
        foundItem.stock_status = 'low_stock';
      } else {
        foundItem.stock_status = 'in_stock';
      }

      foundItem.last_modified_time = new Date().toISOString();
      this.syncStatus.last_update_time = new Date().toISOString();
      return true;
    }

    return false;
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
      const found = item.sku ? this.items.get(item.sku) : undefined;
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
