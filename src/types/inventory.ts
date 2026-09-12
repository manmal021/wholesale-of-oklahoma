export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type QuantityDisplayMode = 'exact_quantity' | 'status_only' | 'simple_status';

export interface InventoryVariant {
  variant_id: string;
  variant_sku: string;
  variant_name: string;
  attribute_name?: string; // e.g. "Flavor", "Color", "Nicotine"
  attribute_value?: string;
  stock_on_hand: number;
  available_stock: number;
  stock_status: StockStatus;
  rate?: number;
}

export interface BulkPricingTier {
  minQty: number;
  pricePerUnit: number;
  label: string;
}

export interface InventoryItem {
  id: string; // Internal/normalized ID
  zoho_item_id: string; // Official Zoho item_id
  sku: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  description: string;
  image_url: string;
  gallery_images?: string[];
  rate: number; // Wholesale unit price
  retail_msrp?: number;
  purchase_rate?: number;
  available_stock: number;
  stock_on_hand: number;
  stock_status: StockStatus;
  status: 'active' | 'inactive';
  upc?: string;
  unit?: string; // e.g. "Pack", "Box", "Case"
  min_order_qty: number;
  bulk_pricing?: BulkPricingTier[];
  specs?: {
    puffs?: string;
    nicotine?: string;
    size?: string;
    battery?: string;
    coil?: string;
    case_pack?: string;
    origin?: string;
  };
  features: string[];
  variants?: InventoryVariant[];
  badge?: string;
  last_modified_time?: string;
}

export interface InventoryFilterParams {
  search?: string;
  category?: string;
  brand?: string;
  availability?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  price_range?: string; // 'all' | 'under-15' | '15-30' | '30-60' | '60-plus'
  product_type?: string;
  sort_by?: 'newest' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'availability';
  page?: number;
  limit?: number;
}

export interface InventoryResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  settings: AdminInventorySettings;
  sync_info: {
    last_synced: string;
    source: 'zoho_live' | 'cache' | 'sandbox_catalog';
    is_live_connected: boolean;
  };
}

export interface AdminInventorySettings {
  display_mode: QuantityDisplayMode; // 'exact_quantity' | 'status_only' | 'simple_status'
  hide_out_of_stock: boolean;
  low_stock_threshold: number;
  allow_backorders: boolean;
}

export interface ZohoSyncStatus {
  connection_status: 'connected' | 'demo_mode' | 'auth_error' | 'syncing';
  organization_id?: string;
  last_sync_time: string | null;
  last_update_time: string | null;
  total_items_synced: number;
  items_with_errors: number;
  zoho_rate_limit_remaining?: number;
  error_message?: string | null;
}
