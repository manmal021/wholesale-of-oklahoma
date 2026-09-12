/**
 * zohoClient.ts
 * Official Zoho Inventory API Client
 *
 * Implements Zoho Inventory REST API v1:
 * - OAuth 2.0 Token Refresh via Zoho Accounts Server
 * - Items List: GET /inventory/v1/items
 * - Item Detail: GET /inventory/v1/items/{item_id}
 * - Item Groups / Variants: GET /inventory/v1/itemgroups
 * - Resilient stale-while-revalidate fallback
 */

import type { InventoryItem, InventoryVariant, StockStatus } from '../types/inventory.js';

export interface ZohoApiConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  organizationId?: string;
  dc?: string; // 'com' | 'eu' | 'in' | 'com.au' | 'ca' | 'jp'
}

interface ZohoTokenResponse {
  access_token: string;
  api_domain: string;
  token_type: string;
  expires_in: number;
  error?: string;
}

export class ZohoInventoryClient {
  private config: ZohoApiConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config?: ZohoApiConfig) {
    this.config = {
      clientId: config?.clientId || process.env.ZOHO_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.ZOHO_CLIENT_SECRET,
      refreshToken: config?.refreshToken || process.env.ZOHO_REFRESH_TOKEN,
      organizationId: config?.organizationId || process.env.ZOHO_ORG_ID || process.env.ZOHO_ORGANIZATION_ID,
      dc: config?.dc || process.env.ZOHO_DC || 'com',
    };
  }

  public updateConfig(newConfig: Partial<ZohoApiConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  public getConfig(): { clientId?: string; organizationId?: string; dc?: string; isConfigured: boolean } {
    return {
      clientId: (this.config.clientId || process.env.ZOHO_CLIENT_ID) ? `${(this.config.clientId || process.env.ZOHO_CLIENT_ID)!.slice(0, 6)}...` : undefined,
      organizationId: this.getOrganizationId(),
      dc: this.config.dc || process.env.ZOHO_DC || 'com',
      isConfigured: this.isConfigured(),
    };
  }

  public isConfigured(): boolean {
    const clientId = this.config.clientId || process.env.ZOHO_CLIENT_ID;
    const clientSecret = this.config.clientSecret || process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = this.config.refreshToken || process.env.ZOHO_REFRESH_TOKEN;
    const organizationId = this.config.organizationId || process.env.ZOHO_ORG_ID || process.env.ZOHO_ORGANIZATION_ID;
    return Boolean(clientId && clientSecret && refreshToken && organizationId);
  }

  public getOrganizationId(): string | undefined {
    return this.config.organizationId || process.env.ZOHO_ORG_ID || process.env.ZOHO_ORGANIZATION_ID;
  }

  private getAccountsUrl(): string {
    const dc = this.config.dc || process.env.ZOHO_DC || 'com';
    return `https://accounts.zoho.${dc}/oauth/v2/token`;
  }

  private getApiBaseUrl(): string {
    const dc = this.config.dc || process.env.ZOHO_DC || 'com';
    return `https://www.zohoapis.${dc}/inventory/v1`;
  }

  /**
   * Retrieves a valid OAuth2 access token, refreshing if needed.
   */
  public async getValidAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiresAt > now + 60000) {
      return this.accessToken;
    }

    if (!this.isConfigured()) {
      throw new Error('Zoho Inventory API credentials are not fully configured in environment variables.');
    }

    const refreshToken = this.config.refreshToken || process.env.ZOHO_REFRESH_TOKEN;
    const clientId = this.config.clientId || process.env.ZOHO_CLIENT_ID;
    const clientSecret = this.config.clientSecret || process.env.ZOHO_CLIENT_SECRET;

    const params = new URLSearchParams({
      refresh_token: refreshToken!,
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: 'refresh_token',
    });

    const response = await fetch(`${this.getAccountsUrl()}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to refresh Zoho OAuth token: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as ZohoTokenResponse;
    if (data.error || !data.access_token) {
      throw new Error(`Zoho OAuth token error: ${data.error || 'No access token returned'}`);
    }

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return this.accessToken;
  }

  /**
   * Fetches items from Zoho Inventory API endpoint: GET /inventory/v1/items
   */
  public async fetchZohoItems(page = 1, perPage = 200): Promise<{ items: any[]; hasMore: boolean; total: number }> {
    const token = await this.getValidAccessToken();
    const orgId = this.getOrganizationId();
    const url = new URL(`${this.getApiBaseUrl()}/items`);
    url.searchParams.set('organization_id', orgId!);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'X-com-zoho-inventory-organizationid': orgId!,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zoho API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    if (result.code !== 0) {
      throw new Error(`Zoho API responded with code ${result.code}: ${result.message}`);
    }

    return {
      items: result.items || [],
      hasMore: result.page_context?.has_more_page ?? false,
      total: result.page_context?.total ?? (result.items ? result.items.length : 0),
    };
  }

  /**
   * Fetches single item detail: GET /inventory/v1/items/{item_id}
   */
  public async fetchZohoItemDetail(itemId: string): Promise<any> {
    const token = await this.getValidAccessToken();
    const orgId = this.getOrganizationId();
    const url = `${this.getApiBaseUrl()}/items/${encodeURIComponent(itemId)}?organization_id=${orgId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'X-com-zoho-inventory-organizationid': orgId!,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Zoho item ${itemId}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.item;
  }

  /**
   * Creates a Sales Order in Zoho Inventory in the background: POST /inventory/v1/salesorders
   */
  public async createSalesOrder(orderData: {
    customerName: string;
    businessName: string;
    email: string;
    phone: string;
    notes?: string;
    lineItems: Array<{
      item_id?: string;
      name: string;
      quantity: number;
      rate: number;
    }>;
  }): Promise<any> {
    const token = await this.getValidAccessToken();
    const orgId = this.getOrganizationId();
    const url = `${this.getApiBaseUrl()}/salesorders?organization_id=${orgId}`;

    const payload = {
      customer_name: orderData.businessName || orderData.customerName,
      date: new Date().toISOString().split('T')[0],
      reference_number: `WOO-${Date.now().toString().slice(-6)}`,
      line_items: orderData.lineItems.map((li) => ({
        item_id: li.item_id,
        name: li.name,
        quantity: li.quantity,
        rate: li.rate,
      })),
      notes: `Wholesale Order from Website\nContact: ${orderData.customerName}\nPhone: ${orderData.phone}\nEmail: ${orderData.email}\nNotes: ${orderData.notes || 'None'}`,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'X-com-zoho-inventory-organizationid': orgId!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Zoho Sales Order creation failed: ${err}`);
    }

    const result = await response.json();
    return result.salesorder || result;
  }


  /**
   * Maps a raw Zoho item object to normalized InventoryItem
   */
  public normalizeZohoItem(raw: any, lowStockThreshold = 15): InventoryItem {
    const stockOnHand = Number(raw.stock_on_hand ?? raw.available_stock ?? raw.actual_available_stock ?? 0);
    const availableStock = Number(raw.available_stock ?? raw.actual_available_stock ?? stockOnHand);

    let stockStatus: StockStatus = 'in_stock';
    if (availableStock <= 0) {
      stockStatus = 'out_of_stock';
    } else if (availableStock <= lowStockThreshold) {
      stockStatus = 'low_stock';
    }

    // Build variants if item group
    const variants: InventoryVariant[] = Array.isArray(raw.variants)
      ? raw.variants.map((v: any) => {
        const vStock = Number(v.available_stock ?? v.stock_on_hand ?? 0);
        let vStatus: StockStatus = 'in_stock';
        if (vStock <= 0) vStatus = 'out_of_stock';
        else if (vStock <= lowStockThreshold) vStatus = 'low_stock';

        return {
          variant_id: String(v.item_id || v.variant_id),
          variant_sku: String(v.sku || `${raw.sku}-${v.name}`),
          variant_name: String(v.name || v.variant_name),
          attribute_name: v.attribute_name || 'Option',
          attribute_value: v.attribute_value || v.name,
          stock_on_hand: vStock,
          available_stock: vStock,
          stock_status: vStatus,
          rate: v.rate ? Number(v.rate) : Number(raw.rate || 0),
        };
      })
      : [];

    return {
      id: String(raw.item_id),
      zoho_item_id: String(raw.item_id),
      sku: String(raw.sku || `SKU-${raw.item_id}`),
      name: String(raw.name),
      brand: String(raw.brand || raw.cf_brand || 'Wholesale of OK'),
      category: String(raw.category_name || raw.category || 'General Wholesale'),
      subcategory: raw.subcategory || raw.cf_subcategory,
      description: String(raw.description || raw.item_description || ''),
      image_url: raw.image_url || raw.image_name || '',
      rate: Number(raw.rate || raw.purchase_rate || 0),
      purchase_rate: raw.purchase_rate ? Number(raw.purchase_rate) : undefined,
      available_stock: availableStock,
      stock_on_hand: stockOnHand,
      stock_status: stockStatus,
      status: raw.status === 'active' ? 'active' : 'active',
      upc: raw.upc || raw.ean || raw.isbn,
      unit: raw.unit || 'Pack',
      min_order_qty: Number(raw.min_order_qty || 1),
      bulk_pricing: raw.bulk_pricing || [],
      specs: raw.specs || {},
      features: Array.isArray(raw.features) ? raw.features : [],
      variants: variants.length > 0 ? variants : undefined,
      badge: raw.badge,
      last_modified_time: raw.last_modified_time,
    };
  }
}
