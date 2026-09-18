/**
 * databaseStore.ts
 *
 * Resilient, atomic, JSON-persisted database layer for Wholesale of Oklahoma.
 * Manages Wholesale Applications, Customer Records, Security Tokens, and Audit Logs.
 *
 * Invariants:
 *  - Persistent storage in storage/database_state.json with atomic temp-swap writes.
 *  - High-performance in-memory index maps for O(1) lookups.
 *  - Strict state machine transitions: PENDING -> APPROVED / REJECTED / SUSPENDED.
 *  - Cryptographic single-use expiring security tokens.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface WholesaleApplicationRecord {
  id: string; // e.g. WOA-APP-48201
  businessName: string;
  dba?: string;
  contactFirstName: string;
  contactLastName: string;
  contactName: string;
  email: string; // lowercase trimmed
  phone: string;
  fein: string; // Tax ID / FEIN
  licenseNumber: string; // Resale Permit / Tobacco License
  businessType: 'vape_shop' | 'smoke_shop' | 'dispensary' | 'c_store' | 'distributor' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  website?: string;
  notes?: string;
  documents?: Array<{
    documentId: string;
    documentType: string;
    filename: string;
  }>;
  ageCertified: boolean;
  taxExemptCertified: boolean;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  customerId?: string;
  assignedPassword?: string;
}

export interface CustomerRecord {
  id: string; // e.g. cust_xxxxx
  applicationId: string;
  userId?: string;
  businessName: string;
  dba?: string;
  contactName: string;
  email: string;
  phone: string;
  fein: string;
  licenseNumber: string;
  businessType: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  status: ApplicationStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  activatedAt?: string;
  temporaryPassword?: string;
  temporaryPasswordAssignedAt?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  suspendedReason?: string;
  reactivatedAt?: string;
  reactivatedBy?: string;
}

export type SecurityTokenType = 'ADMIN_ACTIVATION' | 'CUSTOMER_ACTIVATION' | 'PASSWORD_RESET';

export interface SecurityTokenRecord {
  id: string;
  token: string;
  type: SecurityTokenType;
  email: string;
  targetId: string; // userId, customerId, or applicationId
  expiresAt: number; // Unix epoch ms
  createdAt: string;
  usedAt?: string;
  isRevoked: boolean;
}

export type AuditEventType =
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'ACCOUNT_ACTIVATED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_REACTIVATED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAILURE'
  | 'ORDER_CREATED'
  | 'ORDER_PROCESSING_STARTED'
  | 'ITEM_MARKED_AVAILABLE'
  | 'ITEM_MARKED_OUT_OF_STOCK'
  | 'ITEM_PARTIALLY_AVAILABLE'
  | 'ITEM_TEMPORARILY_UNAVAILABLE'
  | 'SUBSTITUTION_OFFERED'
  | 'SUBSTITUTION_APPROVED'
  | 'CUSTOMER_ACCEPTED_PARTIAL'
  | 'ITEM_REMOVED_FROM_ORDER'
  | 'INVENTORY_MISMATCH_REPORTED'
  | 'INVENTORY_MISMATCH_RESOLVED'
  | 'PRODUCT_TEMPORARILY_DISABLED'
  | 'PRODUCT_REACTIVATED'
  | 'ORDER_MARKED_READY_FOR_PICKUP'
  | 'ORDER_PICKED_UP'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'ORDER_ADJUSTED';

export interface AuditLogRecord {
  id: string;
  event: AuditEventType;
  targetId?: string;
  targetEmail?: string;
  adminId?: string;
  adminEmail?: string;
  ip?: string;
  timestamp: string;
  details?: Record<string, any>;
}

// ── Fulfillment & Order Management Types ────────────────────────────────────

export type FulfillmentMethod = 'PICKUP' | 'DELIVERY';

export type GeneralOrderStatus =
  | 'ORDER_RECEIVED'
  | 'PROCESSING'
  | 'INVENTORY_ISSUE'
  | 'CUSTOMER_ACTION_REQUIRED'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ItemFulfillmentStatus =
  | 'PENDING_CHECK'
  | 'AVAILABLE'
  | 'OUT_OF_STOCK'
  | 'PARTIALLY_AVAILABLE'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'SUBSTITUTION_AVAILABLE'
  | 'FULFILLED';

export type PickupStatus = 'PENDING' | 'READY_FOR_PICKUP' | 'PICKED_UP';
export type DeliveryStatus = 'PENDING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

export interface OrderItemRecord {
  id: string; // Line item id
  productId: string;
  sku: string;
  name: string;
  flavor?: string;
  quantityOrdered: number;
  pricePerUnit: number;
  totalPrice: number;
  zoho_item_id?: string;
  systemInventory: number;
  physicalQuantityAvailable: number;
  unavailableQuantity: number;
  itemFulfillmentStatus: ItemFulfillmentStatus;
  substituteProductId?: string;
  substituteProductName?: string;
  substitutePrice?: number;
  resolutionNotes?: string;
  customerResolutionChoice?: string;
}

export interface DeliveryAddressSnapshot {
  recipientName: string;
  businessName?: string;
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  deliveryInstructions?: string;
}

export interface PickupLocationInfo {
  locationId: string;
  locationName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  hours: string;
  phone: string;
  instructions: string;
}

export interface OrderRecord {
  id: string; // e.g. WOO-ORD-10052
  orderNumber: string;
  customerId?: string;
  customerName: string;
  businessName: string;
  email: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  status: GeneralOrderStatus;
  paymentStatus: 'PENDING' | 'PAID' | 'INVOICED' | 'ADJUSTED' | 'REFUNDED';
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  originalSubtotal: number;
  originalTotal: number;
  createdAt: string;
  updatedAt: string;
  pickupInfo?: {
    locationId: string;
    locationSnapshot: PickupLocationInfo;
    requestedPickupDate?: string;
    requestedPickupTime?: string;
    pickupStatus: PickupStatus;
    readyForPickupAt?: string;
    pickedUpAt?: string;
    pickedUpByStaff?: string;
  };
  deliveryInfo?: {
    addressSnapshot: DeliveryAddressSnapshot;
    deliveryFee: number;
    deliveryStatus: DeliveryStatus;
    outForDeliveryAt?: string;
    deliveredAt?: string;
    deliveredByStaff?: string;
  };
  lineItems: OrderItemRecord[];
  customerNotes?: string;
  internalNotes: Array<{
    id: string;
    note: string;
    authorId: string;
    authorName: string;
    timestamp: string;
  }>;
  hasInventoryIssue: boolean;
  customerActionRequired: boolean;
  actionRequiredReason?: string;
  timeline: Array<{
    status: GeneralOrderStatus;
    timestamp: string;
    note?: string;
    updatedBy?: string;
  }>;
}

export interface FulfillmentConfig {
  pickupLocation: PickupLocationInfo;
  delivery: {
    enabled: boolean;
    eligibleZipCodes: string[];
    eligibleCities: string[];
    deliveryFee: number;
    freeDeliveryThreshold: number;
    minimumDeliveryOrder: number;
    deliveryRadiusMiles?: number;
    notes?: string;
  };
}

export type ProductAvailabilityOverride =
  | 'AVAILABLE'
  | 'LOW_STOCK'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'OUT_OF_STOCK';

export interface InventoryOverrideRecord {
  productId: string;
  sku: string;
  name: string;
  isOutOfStockOnline: boolean;
  statusOverride?: ProductAvailabilityOverride;
  reportedBy: string;
  reportedAt: string;
  reason: string;
  active: boolean;
}

export interface InventoryMismatchRecord {
  id: string;
  orderId: string;
  productId: string;
  sku: string;
  productName: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  reportedBy: string;
  reportedAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface CustomerSavedAddress {
  id: string;
  customerId: string;
  type: 'billing' | 'delivery';
  isDefault: boolean;
  recipientName: string;
  businessName?: string;
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  deliveryInstructions?: string;
  createdAt: string;
}

export const DEFAULT_FULFILLMENT_CONFIG: FulfillmentConfig = {
  pickupLocation: {
    locationId: 'loc_okc_bryant',
    locationName: 'Wholesale of Oklahoma Central Dispatch & Warehouse',
    address: {
      street: '4500 S Bryant Ave',
      city: 'Oklahoma City',
      state: 'OK',
      zip: '73135',
    },
    hours: 'Mon–Sat: 9:00 AM – 8:00 PM, Sun: 11:00 AM – 8:00 PM',
    phone: '(405) 768-2975',
    instructions:
      'Pull into the commercial loading area at 4500 S Bryant Ave. Present your Order Reference Number and valid government/business ID at the wholesale dispatch counter.',
  },
  delivery: {
    enabled: true,
    eligibleCities: [
      'Oklahoma City',
      'Edmond',
      'Norman',
      'Moore',
      'Midwest City',
      'Del City',
      'Yukon',
      'Mustang',
      'Bethany',
      'Warr Acres',
      'El Reno',
      'Guthrie',
      'Shawnee',
    ],
    eligibleZipCodes: [
      '73003', '73007', '73008', '73012', '73013', '73020', '73025', '73034',
      '73036', '73044', '73054', '73064', '73069', '73071', '73072', '73084',
      '73099', '73101', '73102', '73103', '73104', '73105', '73106', '73107',
      '73108', '73109', '73110', '73111', '73112', '73113', '73114', '73115',
      '73116', '73117', '73118', '73119', '73120', '73121', '73122', '73127',
      '73128', '73129', '73130', '73132', '73134', '73135', '73139', '73142',
      '73145', '73149', '73150', '73159', '73160', '73162', '73165', '73169',
      '73170', '73172', '73173', '73179', '73189'
    ],
    deliveryFee: 25.0,
    freeDeliveryThreshold: 500.0,
    minimumDeliveryOrder: 150.0,
    deliveryRadiusMiles: 35,
    notes: 'Direct store delivery available for all approved commercial retailers across the OKC metropolitan corridor.',
  },
};

interface DatabaseState {
  applications: WholesaleApplicationRecord[];
  customers: CustomerRecord[];
  tokens: SecurityTokenRecord[];
  auditLogs: AuditLogRecord[];
  orders?: OrderRecord[];
  fulfillmentConfig?: FulfillmentConfig;
  inventoryOverrides?: InventoryOverrideRecord[];
  inventoryMismatches?: InventoryMismatchRecord[];
  customerAddresses?: CustomerSavedAddress[];
  users?: any[];
}

const isVercel = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const LOCAL_DB_FILE = path.join(LOCAL_STORAGE_DIR, 'database_state.json');
const COMMITTED_SEED_FILE = path.resolve(process.cwd(), 'data', 'seed_database_state.json');

const STORAGE_DIR = isVercel
  ? path.join(os.tmpdir(), 'storage')
  : LOCAL_STORAGE_DIR;
const DB_FILE = path.join(STORAGE_DIR, 'database_state.json');

class DatabaseStore {
  private applications: Map<string, WholesaleApplicationRecord> = new Map(); // keyed by id
  private applicationsByEmail: Map<string, string[]> = new Map(); // email -> id[]
  private customers: Map<string, CustomerRecord> = new Map(); // keyed by id
  private customersByEmail: Map<string, CustomerRecord> = new Map(); // keyed by email
  private tokens: Map<string, SecurityTokenRecord> = new Map(); // keyed by token string
  private auditLogs: AuditLogRecord[] = [];

  // Fulfillment & Orders state
  private orders: Map<string, OrderRecord> = new Map(); // keyed by id and orderNumber
  private ordersByCustomerEmail: Map<string, string[]> = new Map(); // email -> orderId[]
  private fulfillmentConfig: FulfillmentConfig = { ...DEFAULT_FULFILLMENT_CONFIG };
  private inventoryOverrides: Map<string, InventoryOverrideRecord> = new Map(); // productId/sku -> record
  private inventoryMismatches: Map<string, InventoryMismatchRecord> = new Map(); // id -> record
  private customerAddresses: Map<string, CustomerSavedAddress[]> = new Map(); // customerId -> addresses[]
  private users: Map<string, any> = new Map(); // keyed by email (lowercase)
  private lastLoadedMtime = 0;

  constructor() {
    this.ensureStorageDir();
    this.loadFromDisk();
    this.seedDefaultsIfEmpty();
  }

  private ensureStorageDir(): void {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
    } catch (err: any) {
      console.warn('[DatabaseStore] Could not create storage directory:', err.message);
    }
  }

  private loadFromDisk(): void {
    try {
      let fileToLoad = DB_FILE;

      // In Vercel / serverless: copy seed to /tmp/storage/database_state.json on initial boot
      if (isVercel && !fs.existsSync(DB_FILE)) {
        this.ensureStorageDir();
        if (fs.existsSync(COMMITTED_SEED_FILE)) {
          try {
            fs.copyFileSync(COMMITTED_SEED_FILE, DB_FILE);
            fileToLoad = DB_FILE;
          } catch (copyErr: any) {
            console.warn('[DatabaseStore] Could not copy seed to /tmp, falling back to read-only seed:', copyErr.message);
            fileToLoad = COMMITTED_SEED_FILE;
          }
        } else if (fs.existsSync(LOCAL_DB_FILE)) {
          try {
            fs.copyFileSync(LOCAL_DB_FILE, DB_FILE);
            fileToLoad = DB_FILE;
          } catch {
            fileToLoad = LOCAL_DB_FILE;
          }
        }
      }

      if (fs.existsSync(fileToLoad)) {
        try {
          this.lastLoadedMtime = fs.statSync(fileToLoad).mtimeMs;
        } catch (_) {}

        const raw = fs.readFileSync(fileToLoad, 'utf-8');
        const state: DatabaseState = JSON.parse(raw);

        // Reset in-memory collections so reloads do not keep deleted records
        this.applications.clear();
        this.applicationsByEmail.clear();
        this.customers.clear();
        this.customersByEmail.clear();
        this.tokens.clear();
        this.orders.clear();
        this.ordersByCustomerEmail.clear();
        this.inventoryOverrides.clear();
        this.inventoryMismatches.clear();
        this.customerAddresses.clear();

        if (Array.isArray(state.applications)) {
          for (const app of state.applications) {
            this.applications.set(app.id, app);
            const emailKey = app.email.toLowerCase().trim();
            const existing = this.applicationsByEmail.get(emailKey) || [];
            existing.push(app.id);
            this.applicationsByEmail.set(emailKey, existing);
          }
        }

        if (Array.isArray(state.customers)) {
          for (const c of state.customers) {
            this.customers.set(c.id, c);
            this.customersByEmail.set(c.email.toLowerCase().trim(), c);
          }
        }

        if (Array.isArray(state.tokens)) {
          for (const t of state.tokens) {
            this.tokens.set(t.token, t);
          }
        }

        if (Array.isArray(state.auditLogs)) {
          this.auditLogs = state.auditLogs;
        }

        if (Array.isArray(state.orders)) {
          for (const ord of state.orders) {
            this.orders.set(ord.id, ord);
            this.orders.set(ord.orderNumber, ord);
            const emailKey = ord.email.toLowerCase().trim();
            const existing = this.ordersByCustomerEmail.get(emailKey) || [];
            if (!existing.includes(ord.id)) existing.push(ord.id);
            this.ordersByCustomerEmail.set(emailKey, existing);
          }
        }

        if (state.fulfillmentConfig) {
          this.fulfillmentConfig = {
            ...DEFAULT_FULFILLMENT_CONFIG,
            ...state.fulfillmentConfig,
            pickupLocation: {
              ...DEFAULT_FULFILLMENT_CONFIG.pickupLocation,
              ...(state.fulfillmentConfig.pickupLocation || {}),
            },
            delivery: {
              ...DEFAULT_FULFILLMENT_CONFIG.delivery,
              ...(state.fulfillmentConfig.delivery || {}),
            },
          };
        }

        if (Array.isArray(state.inventoryOverrides)) {
          for (const ov of state.inventoryOverrides) {
            if (ov.active) {
              this.inventoryOverrides.set(ov.productId, ov);
              if (ov.sku) this.inventoryOverrides.set(ov.sku, ov);
            }
          }
        }

        if (Array.isArray(state.inventoryMismatches)) {
          for (const mis of state.inventoryMismatches) {
            this.inventoryMismatches.set(mis.id, mis);
          }
        }

        if (Array.isArray(state.customerAddresses)) {
          for (const addr of state.customerAddresses) {
            const list = this.customerAddresses.get(addr.customerId) || [];
            list.push(addr);
            this.customerAddresses.set(addr.customerId, list);
          }
        }

        if (Array.isArray(state.users)) {
          for (const u of state.users) {
            if (u && u.email) {
              this.users.set(u.email.toLowerCase().trim(), u);
            }
          }
        }

        console.log(
          `[DatabaseStore] 📦 Loaded ${this.applications.size} applications, ${this.customers.size} customers, ${this.orders.size} orders, ${this.users.size} users, ${this.auditLogs.length} audit logs.`
        );
      }
    } catch (err: any) {
      console.warn('[DatabaseStore] Could not load database state from disk:', err.message);
    }
  }

  private syncFromDisk(): void {
    try {
      let targetFile = DB_FILE;
      if (!fs.existsSync(targetFile)) {
        if (fs.existsSync(COMMITTED_SEED_FILE)) targetFile = COMMITTED_SEED_FILE;
        else if (fs.existsSync(LOCAL_DB_FILE)) targetFile = LOCAL_DB_FILE;
        else return;
      }
      const stat = fs.statSync(targetFile);
      if (stat.mtimeMs > this.lastLoadedMtime) {
        this.loadFromDisk();
      }
    } catch (_) {}
  }

  public getUsers(): any[] {
    return Array.from(this.users.values());
  }

  public getUserByEmail(email: string): any | undefined {
    return this.users.get(email.toLowerCase().trim());
  }

  public saveUser(user: any): void {
    if (!user || !user.email) return;
    this.users.set(user.email.toLowerCase().trim(), user);
    this.persistToDisk();
  }

  public deleteUser(email: string): boolean {
    const clean = email.toLowerCase().trim();
    const existed = this.users.delete(clean);
    if (existed) {
      this.persistToDisk();
    }
    return existed;
  }

  public getActiveTokensForEmail(email: string, type?: SecurityTokenType): SecurityTokenRecord[] {
    const clean = email.toLowerCase().trim();
    const now = Date.now();
    const matches: SecurityTokenRecord[] = [];
    for (const record of this.tokens.values()) {
      if (record.email === clean && !record.isRevoked && !record.usedAt && record.expiresAt > now) {
        if (!type || record.type === type) {
          matches.push(record);
        }
      }
    }
    return matches;
  }

  public revokeTokensForEmail(email: string, type?: SecurityTokenType): number {
    const clean = email.toLowerCase().trim();
    let count = 0;
    for (const record of this.tokens.values()) {
      if (record.email === clean && !record.isRevoked && !record.usedAt) {
        if (!type || record.type === type) {
          record.isRevoked = true;
          count++;
        }
      }
    }
    if (count > 0) {
      this.persistToDisk();
    }
    return count;
  }

  public persistToDisk(): void {
    try {
      this.ensureStorageDir();
      const state: DatabaseState = {
        applications: Array.from(this.applications.values()),
        customers: Array.from(this.customers.values()),
        tokens: Array.from(this.tokens.values()),
        auditLogs: this.auditLogs.slice(-2000), // Keep last 2000 audit logs
        orders: Array.from(new Set(this.orders.values())),
        fulfillmentConfig: this.fulfillmentConfig,
        inventoryOverrides: Array.from(new Set(this.inventoryOverrides.values())),
        inventoryMismatches: Array.from(this.inventoryMismatches.values()),
        customerAddresses: Array.from(this.customerAddresses.values()).flat(),
        users: Array.from(this.users.values()),
      };

      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
      try {
        this.lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
      } catch (_) {}
    } catch (err: any) {
      console.warn('[DatabaseStore] Could not persist database to disk (expected in serverless/read-only):', err.message);
    }
  }

  public purgeAllCustomerData(): void {
    this.applications.clear();
    this.applicationsByEmail.clear();
    this.customers.clear();
    this.customersByEmail.clear();
    this.tokens.clear();
    this.auditLogs = [];
    this.orders.clear();
    this.ordersByCustomerEmail.clear();
    this.inventoryMismatches.clear();
    this.inventoryOverrides.clear();
    this.customerAddresses.clear();

    // Preserve only administrator users
    for (const [email, user] of this.users.entries()) {
      if (user.role !== 'admin') {
        this.users.delete(email);
      }
    }

    // Clean up uploaded document files
    try {
      const docDir = path.join(STORAGE_DIR, 'documents');
      if (fs.existsSync(docDir)) {
        for (const file of fs.readdirSync(docDir)) {
          if (file.endsWith('.pdf') || file.endsWith('.jpg') || file.endsWith('.png')) {
            try {
              fs.unlinkSync(path.join(docDir, file));
            } catch (_) {}
          }
        }
      }
    } catch (_) {}

    this.persistToDisk();
    console.log('[DatabaseStore] 🧹 All customer, application, order, and audit log data has been purged.');
  }

  public seedDemoAccounts(): void {
    const seedAppId = 'WOA-APP-10001';
    const seedCustomerId = 'cust_okcvapor10001';
    const seedApp: WholesaleApplicationRecord = {
      id: seedAppId,
      businessName: 'OKC Vapor Lounge LLC',
      dba: 'OKC Vapor',
      contactFirstName: 'Alex',
      contactLastName: 'Mercer',
      contactName: 'Alex Mercer',
      email: 'alex@okcvaporlounge.com',
      phone: '(405) 555-0199',
      fein: '73-1234567',
      licenseNumber: 'OK-TOB-89214',
      businessType: 'vape_shop',
      address: {
        street: '123 SW 29th St',
        city: 'Oklahoma City',
        state: 'OK',
        zip: '73109',
      },
      ageCertified: true,
      taxExemptCertified: true,
      status: 'APPROVED',
      submittedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      reviewedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      reviewedBy: 'system_admin',
      reviewNotes: 'Verified OTC Resale Permit and FEIN with Oklahoma Tax Commission.',
      customerId: seedCustomerId,
    };

    const seedCustomer: CustomerRecord = {
      id: seedCustomerId,
      applicationId: seedAppId,
      businessName: seedApp.businessName,
      dba: seedApp.dba,
      contactName: seedApp.contactName,
      email: seedApp.email,
      phone: seedApp.phone,
      fein: seedApp.fein,
      licenseNumber: seedApp.licenseNumber,
      businessType: seedApp.businessType,
      address: seedApp.address,
      status: 'APPROVED',
      createdAt: seedApp.submittedAt,
      approvedAt: seedApp.reviewedAt,
      approvedBy: 'system_admin',
      activatedAt: seedApp.reviewedAt,
    };

    const retailerCust: CustomerRecord = {
      id: 'cust_retailer01',
      applicationId: seedAppId,
      businessName: 'OKC Vapor Lounge LLC',
      dba: 'OKC Vapor',
      contactName: 'Alex Mercer',
      email: 'retailer@okcvapor.com',
      phone: '(405) 555-0199',
      fein: '73-1234567',
      licenseNumber: 'OK-TOB-89214',
      businessType: 'vape_shop',
      address: seedApp.address,
      status: 'APPROVED',
      createdAt: seedApp.submittedAt,
      approvedAt: seedApp.reviewedAt,
      approvedBy: 'system_admin',
      activatedAt: seedApp.reviewedAt,
    };

    this.applications.set(seedAppId, seedApp);
    this.applicationsByEmail.set(seedApp.email, [seedAppId]);
    this.applicationsByEmail.set('retailer@okcvapor.com', [seedAppId]);
    this.customers.set(seedCustomerId, seedCustomer);
    this.customers.set(retailerCust.id, retailerCust);
    this.customersByEmail.set(seedApp.email, seedCustomer);
    this.customersByEmail.set('retailer@okcvapor.com', retailerCust);
    this.persistToDisk();
  }

  private seedDefaultsIfEmpty(): void {
    if (this.applications.size === 0 && process.env.NODE_ENV !== 'test') {
      if (fs.existsSync(COMMITTED_SEED_FILE)) {
        try {
          const raw = fs.readFileSync(COMMITTED_SEED_FILE, 'utf-8');
          const state: DatabaseState = JSON.parse(raw);
          if (Array.isArray(state.applications) && state.applications.length > 0) {
            for (const app of state.applications) {
              this.applications.set(app.id, app);
              const emailKey = app.email.toLowerCase().trim();
              const existing = this.applicationsByEmail.get(emailKey) || [];
              if (!existing.includes(app.id)) existing.push(app.id);
              this.applicationsByEmail.set(emailKey, existing);
            }
            this.persistToDisk();
          }
        } catch (_) {}
      }
    }

    // Only seed sample approved account if explicitly requested via SEED_DEMO_DATA=true
    if (process.env.SEED_DEMO_DATA === 'true') {
      if (this.applications.size === 0) {
        this.seedDemoAccounts();
      }
    }
  }

  // ── Applications ──────────────────────────────────────────────────────────

  public createApplication(data: Omit<WholesaleApplicationRecord, 'id' | 'status' | 'submittedAt'>): WholesaleApplicationRecord {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const id = `WOA-APP-${randomSuffix}`;

    const cleanEmail = data.email.toLowerCase().trim();
    const contactName =
      data.contactName ||
      `${data.contactFirstName || ''} ${data.contactLastName || ''}`.trim() ||
      'Authorized Representative';

    const newApp: WholesaleApplicationRecord = {
      ...data,
      id,
      email: cleanEmail,
      contactName,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    this.applications.set(id, newApp);

    const existing = this.applicationsByEmail.get(cleanEmail) || [];
    existing.push(id);
    this.applicationsByEmail.set(cleanEmail, existing);

    this.addAuditLog({
      event: 'APPLICATION_SUBMITTED',
      targetId: id,
      targetEmail: cleanEmail,
      details: {
        businessName: newApp.businessName,
        businessType: newApp.businessType,
      },
    });

    this.persistToDisk();
    return newApp;
  }

  public getApplication(id: string): WholesaleApplicationRecord | undefined {
    this.syncFromDisk();
    if (!id || typeof id !== 'string') return undefined;
    const cleanId = id.trim();
    const direct = this.applications.get(cleanId);
    if (direct) return direct;
    const lower = cleanId.toLowerCase();
    for (const app of this.applications.values()) {
      if (app.id.toLowerCase() === lower) return app;
    }
    return undefined;
  }

  public findApplicationsByEmail(email: string): WholesaleApplicationRecord[] {
    this.syncFromDisk();
    const cleanEmail = email.toLowerCase().trim();
    const ids = this.applicationsByEmail.get(cleanEmail) || [];
    return ids.map((id) => this.applications.get(id)!).filter(Boolean);
  }

  public getLatestApplicationForEmail(email: string): WholesaleApplicationRecord | undefined {
    this.syncFromDisk();
    const list = this.findApplicationsByEmail(email);
    if (list.length === 0) return undefined;
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
  }

  public listApplications(statusFilter?: ApplicationStatus | 'ALL' | string, search?: string): WholesaleApplicationRecord[] {
    this.syncFromDisk();
    let list = Array.from(this.applications.values());

    const normalizedFilter = statusFilter ? String(statusFilter).toUpperCase().trim() : undefined;
    if (normalizedFilter && normalizedFilter !== 'ALL') {
      list = list.filter((a) => (a.status ? a.status.toUpperCase() : '') === normalizedFilter);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.businessName.toLowerCase().includes(q) ||
          a.contactName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.phone.includes(q) ||
          a.id.toLowerCase().includes(q) ||
          (a.address && a.address.city && a.address.city.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    adminId: string,
    reviewNotes?: string
  ): WholesaleApplicationRecord | null {
    const app = this.getApplication(id);
    if (!app) return null;

    app.status = status;
    app.reviewedAt = new Date().toISOString();
    app.reviewedBy = adminId;
    if (reviewNotes) app.reviewNotes = reviewNotes;

    if (status === 'REJECTED') {
      app.assignedPassword = undefined;
      if (app.customerId) {
        const cust = this.getCustomer(app.customerId);
        if (cust) {
          cust.temporaryPassword = undefined;
          cust.temporaryPasswordAssignedAt = undefined;
        }
      }
    }

    this.persistToDisk();
    return app;
  }

  public deleteApplication(id: string): boolean {
    const app = this.getApplication(id);
    if (!app) return false;
    this.applications.delete(app.id);
    const email = app.email.toLowerCase().trim();
    const existing = this.applicationsByEmail.get(email) || [];
    this.applicationsByEmail.set(email, existing.filter((appId) => appId !== app.id));
    this.persistToDisk();
    return true;
  }

  // ── Customers ─────────────────────────────────────────────────────────────

  public createOrUpdateCustomerFromApplication(
    app: WholesaleApplicationRecord,
    approvedByAdminId: string,
    temporaryPassword?: string
  ): CustomerRecord {
    const cleanEmail = app.email.toLowerCase().trim();
    let customer = this.customersByEmail.get(cleanEmail);

    const now = new Date().toISOString();

    if (customer) {
      customer.status = 'APPROVED';
      customer.approvedAt = now;
      customer.approvedBy = approvedByAdminId;
      customer.businessName = app.businessName;
      customer.dba = app.dba;
      customer.contactName = app.contactName;
      customer.phone = app.phone;
      customer.fein = app.fein;
      customer.licenseNumber = app.licenseNumber;
      customer.businessType = app.businessType;
      customer.address = app.address;
      if (temporaryPassword) {
        customer.temporaryPassword = temporaryPassword;
        customer.temporaryPasswordAssignedAt = now;
      }
    } else {
      const id = `cust_${crypto.randomBytes(8).toString('hex')}`;
      customer = {
        id,
        applicationId: app.id,
        businessName: app.businessName,
        dba: app.dba,
        contactName: app.contactName,
        email: cleanEmail,
        phone: app.phone,
        fein: app.fein,
        licenseNumber: app.licenseNumber,
        businessType: app.businessType,
        address: app.address,
        status: 'APPROVED',
        createdAt: now,
        approvedAt: now,
        approvedBy: approvedByAdminId,
        temporaryPassword: temporaryPassword || undefined,
        temporaryPasswordAssignedAt: temporaryPassword ? now : undefined,
      };
      this.customers.set(id, customer);
      this.customersByEmail.set(cleanEmail, customer);
    }

    if (temporaryPassword) {
      app.assignedPassword = temporaryPassword;
    }
    app.customerId = customer.id;
    app.status = 'APPROVED';
    app.reviewedAt = now;
    app.reviewedBy = approvedByAdminId;

    this.persistToDisk();
    return customer;
  }

  public setCustomerTemporaryPassword(
    idOrEmail: string,
    password: string
  ): CustomerRecord | undefined {
    let customer = this.getCustomer(idOrEmail) || this.getCustomerByEmail(idOrEmail);
    if (!customer) return undefined;
    const now = new Date().toISOString();
    customer.temporaryPassword = password;
    customer.temporaryPasswordAssignedAt = now;
    if (customer.applicationId) {
      const app = this.getApplication(customer.applicationId);
      if (app) {
        app.assignedPassword = password;
      }
    }
    this.persistToDisk();
    return customer;
  }

  public getCustomer(id: string): CustomerRecord | undefined {
    this.syncFromDisk();
    if (!id || typeof id !== 'string') return undefined;
    const cleanId = id.trim();
    const direct = this.customers.get(cleanId);
    if (direct) return direct;
    const lower = cleanId.toLowerCase();
    for (const cust of this.customers.values()) {
      if (cust.id.toLowerCase() === lower) return cust;
    }
    return undefined;
  }

  public getCustomerByEmail(email: string): CustomerRecord | undefined {
    this.syncFromDisk();
    return this.customersByEmail.get(email.toLowerCase().trim());
  }

  public listCustomers(statusFilter?: ApplicationStatus | 'ALL' | string, search?: string): CustomerRecord[] {
    this.syncFromDisk();
    let list = Array.from(this.customers.values());

    const normalizedFilter = statusFilter ? String(statusFilter).toUpperCase().trim() : undefined;
    if (normalizedFilter && normalizedFilter !== 'ALL') {
      list = list.filter((c) => (c.status ? c.status.toUpperCase() : '') === normalizedFilter);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.businessName.toLowerCase().includes(q) ||
          c.contactName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.address && c.address.city && c.address.city.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public suspendCustomer(id: string, adminId: string, reason?: string): CustomerRecord | null {
    const customer = this.customers.get(id);
    if (!customer) return null;

    customer.status = 'SUSPENDED';
    customer.suspendedAt = new Date().toISOString();
    customer.suspendedBy = adminId;
    customer.suspendedReason = reason;

    // Also update associated application
    if (customer.applicationId) {
      const app = this.applications.get(customer.applicationId);
      if (app) app.status = 'SUSPENDED';
    }

    this.addAuditLog({
      event: 'ACCOUNT_SUSPENDED',
      targetId: customer.id,
      targetEmail: customer.email,
      adminId,
      details: { reason },
    });

    this.persistToDisk();
    return customer;
  }

  public reactivateCustomer(id: string, adminId: string): CustomerRecord | null {
    const customer = this.customers.get(id);
    if (!customer) return null;

    customer.status = 'APPROVED';
    customer.reactivatedAt = new Date().toISOString();
    customer.reactivatedBy = adminId;
    customer.suspendedAt = undefined;
    customer.suspendedBy = undefined;
    customer.suspendedReason = undefined;

    if (customer.applicationId) {
      const app = this.applications.get(customer.applicationId);
      if (app) app.status = 'APPROVED';
    }

    this.addAuditLog({
      event: 'ACCOUNT_REACTIVATED',
      targetId: customer.id,
      targetEmail: customer.email,
      adminId,
    });

    this.persistToDisk();
    return customer;
  }

  public deleteCustomer(id: string): boolean {
    const customer = this.getCustomer(id);
    if (!customer) return false;
    this.customers.delete(customer.id);
    this.customersByEmail.delete(customer.email.toLowerCase().trim());
    this.persistToDisk();
    return true;
  }

  // ── Security Tokens ───────────────────────────────────────────────────────

  public createSecurityToken(params: {
    type: SecurityTokenType;
    email: string;
    targetId: string;
    durationHours?: number;
  }): SecurityTokenRecord {
    const durationMs = (params.durationHours || 48) * 60 * 60 * 1000;
    const token = crypto.randomBytes(32).toString('hex');
    const id = `tok_${crypto.randomBytes(8).toString('hex')}`;

    const record: SecurityTokenRecord = {
      id,
      token,
      type: params.type,
      email: params.email.toLowerCase().trim(),
      targetId: params.targetId,
      expiresAt: Date.now() + durationMs,
      createdAt: new Date().toISOString(),
      isRevoked: false,
    };

    this.tokens.set(token, record);
    this.persistToDisk();
    return record;
  }

  public verifySecurityToken(token: string, expectedType?: SecurityTokenType): {
    valid: boolean;
    reason?: 'EXPIRED' | 'USED' | 'REVOKED' | 'NOT_FOUND' | 'WRONG_TYPE';
    tokenRecord?: SecurityTokenRecord;
  } {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    const record = this.tokens.get(token);
    if (!record) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    if (record.isRevoked) {
      return { valid: false, reason: 'REVOKED', tokenRecord: record };
    }

    if (record.usedAt) {
      return { valid: false, reason: 'USED', tokenRecord: record };
    }

    if (Date.now() > record.expiresAt) {
      return { valid: false, reason: 'EXPIRED', tokenRecord: record };
    }

    if (expectedType && record.type !== expectedType) {
      return { valid: false, reason: 'WRONG_TYPE', tokenRecord: record };
    }

    return { valid: true, tokenRecord: record };
  }

  public consumeSecurityToken(token: string, expectedType?: SecurityTokenType): SecurityTokenRecord | null {
    const verification = this.verifySecurityToken(token, expectedType);
    if (!verification.valid || !verification.tokenRecord) {
      return null;
    }

    const record = verification.tokenRecord;
    record.usedAt = new Date().toISOString();
    this.persistToDisk();
    return record;
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────

  public addAuditLog(entry: Omit<AuditLogRecord, 'id' | 'timestamp'>): AuditLogRecord {
    const id = `aud_${crypto.randomBytes(8).toString('hex')}`;
    const log: AuditLogRecord = {
      ...entry,
      id,
      timestamp: new Date().toISOString(),
    };

    this.auditLogs.push(log);
    this.persistToDisk();
    return log;
  }

  public listAuditLogs(limit = 100): AuditLogRecord[] {
    return this.auditLogs.slice(-limit).reverse();
  }

  // ── Orders & Fulfillment ───────────────────────────────────────────────────

  public calculateOrderTotals(params: {
    subtotal: number;
    fulfillmentMethod: FulfillmentMethod;
    deliveryAddress?: { street?: string; city?: string; state?: string; zip?: string };
  }): {
    subtotal: number;
    discount: number;
    deliveryFee: number;
    tax: number;
    total: number;
    isDeliveryEligible?: boolean;
    deliveryError?: string;
  } {
    const cfg = this.fulfillmentConfig;
    const subtotal = Math.round(params.subtotal * 100) / 100;
    const discount = 0; // B2B net wholesale catalog rates
    const tax = 0; // B2B tax-exempt certified

    if (params.fulfillmentMethod === 'PICKUP') {
      return {
        subtotal,
        discount,
        deliveryFee: 0,
        tax,
        total: subtotal,
        isDeliveryEligible: true,
      };
    }

    // Delivery calculations
    const validation = this.validateDeliveryAddress(params.deliveryAddress || {});
    if (!validation.eligible) {
      return {
        subtotal,
        discount,
        deliveryFee: cfg.delivery.deliveryFee,
        tax,
        total: Math.round((subtotal + cfg.delivery.deliveryFee) * 100) / 100,
        isDeliveryEligible: false,
        deliveryError: validation.reason,
      };
    }

    if (subtotal < cfg.delivery.minimumDeliveryOrder) {
      return {
        subtotal,
        discount,
        deliveryFee: cfg.delivery.deliveryFee,
        tax,
        total: Math.round((subtotal + cfg.delivery.deliveryFee) * 100) / 100,
        isDeliveryEligible: false,
        deliveryError: `Minimum delivery order is $${cfg.delivery.minimumDeliveryOrder.toFixed(2)}. Current subtotal is $${subtotal.toFixed(2)}. Please add items or select Pickup.`,
      };
    }

    // Free delivery threshold
    const deliveryFee = subtotal >= cfg.delivery.freeDeliveryThreshold ? 0 : cfg.delivery.deliveryFee;
    const total = Math.round((subtotal + deliveryFee) * 100) / 100;

    return {
      subtotal,
      discount,
      deliveryFee,
      tax,
      total,
      isDeliveryEligible: true,
    };
  }

  public validateDeliveryAddress(address: { street?: string; city?: string; state?: string; zip?: string }): {
    eligible: boolean;
    reason?: string;
  } {
    const cfg = this.fulfillmentConfig.delivery;
    if (!cfg.enabled) {
      return {
        eligible: false,
        reason: 'Delivery is temporarily disabled. Please select Pickup or contact Wholesale of Oklahoma.',
      };
    }

    const rawZip = String(address.zip || '').trim().slice(0, 5);
    const rawCity = String(address.city || '').trim().toLowerCase();
    const rawState = String(address.state || '').trim().toUpperCase();

    if (rawState && rawState !== 'OK' && rawState !== 'OKLAHOMA') {
      return {
        eligible: false,
        reason: 'Delivery is currently unavailable to this address. Delivery is restricted to Oklahoma. Please select Pickup or contact Wholesale of Oklahoma.',
      };
    }

    const matchZip = cfg.eligibleZipCodes.includes(rawZip);
    const matchCity = cfg.eligibleCities.some((c) => c.toLowerCase() === rawCity);

    if (matchZip || matchCity) {
      return { eligible: true };
    }

    return {
      eligible: false,
      reason: 'Delivery is currently unavailable to this address. Please select Pickup or contact Wholesale of Oklahoma.',
    };
  }

  public getFulfillmentConfig(): FulfillmentConfig {
    return JSON.parse(JSON.stringify(this.fulfillmentConfig));
  }

  public updateFulfillmentConfig(updates: Partial<FulfillmentConfig>, adminId: string): FulfillmentConfig {
    if (updates.pickupLocation) {
      this.fulfillmentConfig.pickupLocation = {
        ...this.fulfillmentConfig.pickupLocation,
        ...updates.pickupLocation,
      };
    }
    if (updates.delivery) {
      this.fulfillmentConfig.delivery = {
        ...this.fulfillmentConfig.delivery,
        ...updates.delivery,
      };
    }

    this.addAuditLog({
      event: 'ORDER_ADJUSTED',
      adminId,
      details: { updatedFulfillmentConfig: true },
    });

    this.persistToDisk();
    return this.getFulfillmentConfig();
  }

  public createOrder(params: {
    customerId?: string;
    customerName: string;
    businessName: string;
    email: string;
    phone: string;
    fulfillmentMethod: FulfillmentMethod;
    pickupInfo?: {
      requestedPickupDate?: string;
      requestedPickupTime?: string;
    };
    deliveryInfo?: {
      addressSnapshot: DeliveryAddressSnapshot;
    };
    lineItems: Array<{
      productId: string;
      sku: string;
      name: string;
      flavor?: string;
      quantityOrdered: number;
      pricePerUnit: number;
      zoho_item_id?: string;
      systemInventory?: number;
    }>;
    customerNotes?: string;
  }): OrderRecord {
    const cleanEmail = params.email.toLowerCase().trim();
    const orderNum = Math.floor(10000 + Math.random() * 90000);
    const id = `WOO-ORD-${orderNum}`;
    const now = new Date().toISOString();

    // Check line items against online overrides
    for (const item of params.lineItems) {
      if (this.isProductBlockedOnline(item.productId) || (item.sku && this.isProductBlockedOnline(item.sku))) {
        throw new Error(`Product "${item.name}" is temporarily unavailable online. Please update your cart before proceeding.`);
      }
    }

    // Compute line item records
    let subtotal = 0;
    const processedItems: OrderItemRecord[] = params.lineItems.map((item, idx) => {
      const qty = Math.max(1, item.quantityOrdered);
      const price = Math.max(0, item.pricePerUnit);
      const lineTotal = Math.round(qty * price * 100) / 100;
      subtotal += lineTotal;
      const sysInv = typeof item.systemInventory === 'number' ? item.systemInventory : 50;

      return {
        id: `item_${idx + 1}_${crypto.randomBytes(4).toString('hex')}`,
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        flavor: item.flavor,
        quantityOrdered: qty,
        pricePerUnit: price,
        totalPrice: lineTotal,
        zoho_item_id: item.zoho_item_id,
        systemInventory: sysInv,
        physicalQuantityAvailable: qty,
        unavailableQuantity: 0,
        itemFulfillmentStatus: 'PENDING_CHECK',
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;

    const totals = this.calculateOrderTotals({
      subtotal,
      fulfillmentMethod: params.fulfillmentMethod,
      deliveryAddress: params.deliveryInfo?.addressSnapshot,
    });

    if (params.fulfillmentMethod === 'DELIVERY' && totals.isDeliveryEligible === false) {
      throw new Error(totals.deliveryError || 'Delivery is currently unavailable to this address. Please select Pickup or contact Wholesale of Oklahoma.');
    }

    const order: OrderRecord = {
      id,
      orderNumber: String(orderNum),
      customerId: params.customerId,
      customerName: params.customerName,
      businessName: params.businessName,
      email: cleanEmail,
      phone: params.phone,
      fulfillmentMethod: params.fulfillmentMethod,
      status: 'ORDER_RECEIVED',
      paymentStatus: 'INVOICED',
      subtotal,
      discount: totals.discount,
      tax: totals.tax,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      originalSubtotal: subtotal,
      originalTotal: totals.total,
      createdAt: now,
      updatedAt: now,
      lineItems: processedItems,
      customerNotes: params.customerNotes,
      internalNotes: [],
      hasInventoryIssue: false,
      customerActionRequired: false,
      timeline: [
        {
          status: 'ORDER_RECEIVED',
          timestamp: now,
          note: `Order received via ${params.fulfillmentMethod}. Awaiting warehouse staff verification.`,
        },
      ],
    };

    if (params.fulfillmentMethod === 'PICKUP') {
      order.pickupInfo = {
        locationId: this.fulfillmentConfig.pickupLocation.locationId,
        locationSnapshot: { ...this.fulfillmentConfig.pickupLocation },
        requestedPickupDate: params.pickupInfo?.requestedPickupDate,
        requestedPickupTime: params.pickupInfo?.requestedPickupTime,
        pickupStatus: 'PENDING',
      };
    } else {
      if (!params.deliveryInfo?.addressSnapshot) {
        throw new Error('Delivery address is required for delivery orders');
      }
      order.deliveryInfo = {
        addressSnapshot: { ...params.deliveryInfo.addressSnapshot },
        deliveryFee: totals.deliveryFee,
        deliveryStatus: 'PENDING',
      };
    }

    this.orders.set(id, order);
    this.orders.set(String(orderNum), order);

    const existing = this.ordersByCustomerEmail.get(cleanEmail) || [];
    if (!existing.includes(id)) existing.push(id);
    this.ordersByCustomerEmail.set(cleanEmail, existing);

    this.addAuditLog({
      event: 'ORDER_CREATED',
      targetId: id,
      targetEmail: cleanEmail,
      details: {
        orderNumber: orderNum,
        fulfillmentMethod: params.fulfillmentMethod,
        total: order.total,
        itemCount: processedItems.length,
      },
    });

    this.persistToDisk();
    return order;
  }

  public getOrder(idOrNumber: string): OrderRecord | undefined {
    return this.orders.get(idOrNumber);
  }

  public listOrders(filters?: {
    fulfillmentMethod?: FulfillmentMethod | 'ALL';
    status?: GeneralOrderStatus | 'ALL';
    search?: string;
    customerId?: string;
    customerEmail?: string;
  }): OrderRecord[] {
    let list = Array.from(new Set(this.orders.values()));

    if (filters?.customerEmail) {
      const emailKey = filters.customerEmail.toLowerCase().trim();
      list = list.filter((o) => o.email.toLowerCase().trim() === emailKey);
    }

    if (filters?.customerId) {
      list = list.filter((o) => o.customerId === filters.customerId);
    }

    if (filters?.fulfillmentMethod && filters.fulfillmentMethod !== 'ALL') {
      list = list.filter((o) => o.fulfillmentMethod === filters.fulfillmentMethod);
    }

    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((o) => o.status === filters.status);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.businessName.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.phone.includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public updateOrderItemStatus(params: {
    orderId: string;
    itemId: string;
    status: ItemFulfillmentStatus;
    physicalQuantityAvailable?: number;
    adminId: string;
    adminName?: string;
    resolutionNotes?: string;
    blockOnline?: boolean;
  }): {
    order: OrderRecord;
    item: OrderItemRecord;
    mismatchRecord?: InventoryMismatchRecord;
    inventoryIssueDetected: boolean;
  } {
    const order = this.orders.get(params.orderId);
    if (!order) throw new Error(`Order ${params.orderId} not found`);

    const item = order.lineItems.find((i) => i.id === params.itemId);
    if (!item) throw new Error(`Order item ${params.itemId} not found in order ${params.orderId}`);

    const previousStatus = item.itemFulfillmentStatus;
    item.itemFulfillmentStatus = params.status;

    if (typeof params.physicalQuantityAvailable === 'number') {
      item.physicalQuantityAvailable = Math.max(0, params.physicalQuantityAvailable);
      item.unavailableQuantity = Math.max(0, item.quantityOrdered - item.physicalQuantityAvailable);
    }

    if (params.status === 'OUT_OF_STOCK') {
      item.physicalQuantityAvailable = 0;
      item.unavailableQuantity = item.quantityOrdered;
    } else if (params.status === 'AVAILABLE' || params.status === 'FULFILLED') {
      item.physicalQuantityAvailable = item.quantityOrdered;
      item.unavailableQuantity = 0;
    }

    if (params.resolutionNotes) {
      item.resolutionNotes = params.resolutionNotes;
    }

    let mismatchRecord: InventoryMismatchRecord | undefined;
    // Discrepancy logged whenever physical count is less than system inventory or status is OUT_OF_STOCK / PARTIALLY_AVAILABLE
    if (
      item.physicalQuantityAvailable < item.systemInventory ||
      params.status === 'OUT_OF_STOCK' ||
      params.status === 'PARTIALLY_AVAILABLE'
    ) {
      const diff = item.physicalQuantityAvailable - item.systemInventory;
      mismatchRecord = this.createInventoryMismatch({
        orderId: order.id,
        productId: item.productId,
        sku: item.sku,
        productName: item.name,
        systemQuantity: item.systemInventory,
        physicalQuantity: item.physicalQuantityAvailable,
        difference: diff,
        reportedBy: params.adminName || params.adminId,
      });
    }

    // Option to immediately block online
    if (params.blockOnline) {
      this.setProductOnlineOverride({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        reportedBy: params.adminName || params.adminId,
        reason: `Physical inventory mismatch reported while fulfilling order #${order.orderNumber}`,
      });
    }

    let eventType: AuditEventType = 'ITEM_MARKED_AVAILABLE';
    if (params.status === 'OUT_OF_STOCK') eventType = 'ITEM_MARKED_OUT_OF_STOCK';
    else if (params.status === 'PARTIALLY_AVAILABLE') eventType = 'ITEM_PARTIALLY_AVAILABLE';
    else if (params.status === 'TEMPORARILY_UNAVAILABLE') eventType = 'ITEM_TEMPORARILY_UNAVAILABLE';

    this.addAuditLog({
      event: eventType,
      targetId: order.id,
      adminId: params.adminId,
      details: {
        itemId: item.id,
        productName: item.name,
        sku: item.sku,
        oldStatus: previousStatus,
        newStatus: params.status,
        quantityOrdered: item.quantityOrdered,
        physicalAvailable: item.physicalQuantityAvailable,
      },
    });

    // Check if unresolved inventory issues exist
    const hasUnresolvedIssue = order.lineItems.some((i) =>
      ['OUT_OF_STOCK', 'PARTIALLY_AVAILABLE', 'TEMPORARILY_UNAVAILABLE'].includes(i.itemFulfillmentStatus)
    );

    order.hasInventoryIssue = hasUnresolvedIssue;
    if (hasUnresolvedIssue) {
      order.status = 'INVENTORY_ISSUE';
      order.customerActionRequired = true;
      order.actionRequiredReason = `Fulfillment exception: Item "${item.name}" is ${params.status.replace(/_/g, ' ')}. Physical availability: ${item.physicalQuantityAvailable} of ${item.quantityOrdered} ordered.`;
      order.timeline.push({
        status: 'INVENTORY_ISSUE',
        timestamp: new Date().toISOString(),
        note: `Inventory issue flagged: ${item.name} is ${params.status.replace(/_/g, ' ')}. Available: ${item.physicalQuantityAvailable}/${item.quantityOrdered}.`,
        updatedBy: params.adminName || params.adminId,
      });
    }

    order.updatedAt = new Date().toISOString();
    this.persistToDisk();

    return {
      order,
      item,
      mismatchRecord,
      inventoryIssueDetected: hasUnresolvedIssue,
    };
  }

  public updateOrderStatus(params: {
    orderId: string;
    status: GeneralOrderStatus;
    adminId: string;
    adminName?: string;
    note?: string;
    forceApproveAdjusted?: boolean;
  }): OrderRecord {
    const order = this.orders.get(params.orderId);
    if (!order) throw new Error(`Order ${params.orderId} not found`);

    const hasUnresolvedIssues = order.lineItems.some((i) =>
      ['OUT_OF_STOCK', 'PARTIALLY_AVAILABLE', 'TEMPORARILY_UNAVAILABLE'].includes(i.itemFulfillmentStatus)
    );

    if (['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(params.status)) {
      if (hasUnresolvedIssues && !params.forceApproveAdjusted) {
        throw new Error(
          `Cannot transition order to ${params.status.replace(/_/g, ' ')} while unresolved inventory problems remain on order items. Please resolve exceptions first.`
        );
      }
    }

    const now = new Date().toISOString();
    const oldStatus = order.status;
    order.status = params.status;
    order.updatedAt = now;

    if (params.status === 'PROCESSING') {
      this.addAuditLog({
        event: 'ORDER_PROCESSING_STARTED',
        targetId: order.id,
        adminId: params.adminId,
      });
    } else if (params.status === 'READY_FOR_PICKUP') {
      if (order.pickupInfo) {
        order.pickupInfo.pickupStatus = 'READY_FOR_PICKUP';
        order.pickupInfo.readyForPickupAt = now;
      }
      this.addAuditLog({
        event: 'ORDER_MARKED_READY_FOR_PICKUP',
        targetId: order.id,
        adminId: params.adminId,
      });
    } else if (params.status === 'OUT_FOR_DELIVERY') {
      if (order.deliveryInfo) {
        order.deliveryInfo.deliveryStatus = 'OUT_FOR_DELIVERY';
        order.deliveryInfo.outForDeliveryAt = now;
      }
      this.addAuditLog({
        event: 'ORDER_OUT_FOR_DELIVERY',
        targetId: order.id,
        adminId: params.adminId,
      });
    } else if (params.status === 'PICKED_UP') {
      if (order.pickupInfo) {
        order.pickupInfo.pickupStatus = 'PICKED_UP';
        order.pickupInfo.pickedUpAt = now;
        order.pickupInfo.pickedUpByStaff = params.adminName || params.adminId;
      }
      order.status = 'COMPLETED';
      this.addAuditLog({
        event: 'ORDER_PICKED_UP',
        targetId: order.id,
        adminId: params.adminId,
      });
    } else if (params.status === 'DELIVERED') {
      if (order.deliveryInfo) {
        order.deliveryInfo.deliveryStatus = 'DELIVERED';
        order.deliveryInfo.deliveredAt = now;
        order.deliveryInfo.deliveredByStaff = params.adminName || params.adminId;
      }
      order.status = 'COMPLETED';
      this.addAuditLog({
        event: 'ORDER_DELIVERED',
        targetId: order.id,
        adminId: params.adminId,
      });
    } else if (params.status === 'CANCELLED') {
      this.addAuditLog({
        event: 'ORDER_CANCELLED',
        targetId: order.id,
        adminId: params.adminId,
        details: { reason: params.note },
      });
    }

    order.timeline.push({
      status: order.status,
      timestamp: now,
      note: params.note || `Order status updated to ${order.status.replace(/_/g, ' ')}`,
      updatedBy: params.adminName || params.adminId,
    });

    this.persistToDisk();
    return order;
  }

  public resolveOrderInventoryIssue(params: {
    orderId: string;
    resolutionType: 'ACCEPT_PARTIAL' | 'REMOVE_ITEM' | 'SUBSTITUTION' | 'CUSTOMER_WILL_WAIT' | 'CANCEL_ORDER';
    itemId?: string;
    substituteItem?: { productId: string; sku: string; name: string; price: number; quantity: number };
    adminId: string;
    adminName?: string;
    notes?: string;
  }): OrderRecord {
    const order = this.orders.get(params.orderId);
    if (!order) throw new Error(`Order ${params.orderId} not found`);

    const now = new Date().toISOString();

    if (params.resolutionType === 'CANCEL_ORDER') {
      order.status = 'CANCELLED';
      order.hasInventoryIssue = false;
      order.customerActionRequired = false;
      order.timeline.push({
        status: 'CANCELLED',
        timestamp: now,
        note: params.notes || 'Order cancelled due to inventory availability.',
        updatedBy: params.adminName || params.adminId,
      });
      this.persistToDisk();
      return order;
    }

    if (params.itemId) {
      const item = order.lineItems.find((i) => i.id === params.itemId);
      if (item) {
        if (params.resolutionType === 'ACCEPT_PARTIAL') {
          item.itemFulfillmentStatus = 'FULFILLED';
          item.customerResolutionChoice = 'ACCEPTED_PARTIAL';
          item.resolutionNotes = params.notes || `Customer accepted physical quantity of ${item.physicalQuantityAvailable}.`;
          item.totalPrice = Math.round(item.physicalQuantityAvailable * item.pricePerUnit * 100) / 100;
          this.addAuditLog({
            event: 'CUSTOMER_ACCEPTED_PARTIAL',
            targetId: order.id,
            adminId: params.adminId,
            details: { itemId: item.id, qty: item.physicalQuantityAvailable },
          });
        } else if (params.resolutionType === 'REMOVE_ITEM') {
          item.itemFulfillmentStatus = 'FULFILLED';
          item.customerResolutionChoice = 'REMOVED_FROM_ORDER';
          item.resolutionNotes = params.notes || 'Item removed from order per customer agreement.';
          item.physicalQuantityAvailable = 0;
          item.totalPrice = 0;
          this.addAuditLog({
            event: 'ITEM_REMOVED_FROM_ORDER',
            targetId: order.id,
            adminId: params.adminId,
            details: { itemId: item.id },
          });
        } else if (params.resolutionType === 'CUSTOMER_WILL_WAIT') {
          item.customerResolutionChoice = 'WILL_WAIT_FOR_RESTOCK';
          item.resolutionNotes = params.notes || 'Customer agreed to wait for incoming stock.';
        } else if (params.resolutionType === 'SUBSTITUTION' && params.substituteItem) {
          item.itemFulfillmentStatus = 'FULFILLED';
          item.substituteProductId = params.substituteItem.productId;
          item.substituteProductName = params.substituteItem.name;
          item.substitutePrice = params.substituteItem.price;
          item.pricePerUnit = params.substituteItem.price;
          item.totalPrice = Math.round(item.physicalQuantityAvailable * params.substituteItem.price * 100) / 100;
          item.customerResolutionChoice = 'SUBSTITUTION_APPROVED';
          item.resolutionNotes = `Substituted with ${params.substituteItem.name}.`;
          this.addAuditLog({
            event: 'SUBSTITUTION_APPROVED',
            targetId: order.id,
            adminId: params.adminId,
            details: { itemId: item.id, substitute: params.substituteItem },
          });
        }
      }
    }

    // Recalculate subtotal from non-removed items
    let newSubtotal = 0;
    for (const it of order.lineItems) {
      if (it.customerResolutionChoice === 'REMOVED_FROM_ORDER') continue;
      newSubtotal += it.totalPrice;
    }
    newSubtotal = Math.round(newSubtotal * 100) / 100;

    const totals = this.calculateOrderTotals({
      subtotal: newSubtotal,
      fulfillmentMethod: order.fulfillmentMethod,
      deliveryAddress: order.deliveryInfo?.addressSnapshot,
    });

    order.subtotal = newSubtotal;
    order.deliveryFee = totals.deliveryFee;
    order.total = totals.total;
    if (order.total !== order.originalTotal) {
      order.paymentStatus = 'ADJUSTED';
    }

    const remainingIssues = order.lineItems.some((i) =>
      ['OUT_OF_STOCK', 'PARTIALLY_AVAILABLE', 'TEMPORARILY_UNAVAILABLE'].includes(i.itemFulfillmentStatus)
    );

    order.hasInventoryIssue = remainingIssues;
    order.customerActionRequired = remainingIssues;
    if (!remainingIssues) {
      order.status = 'PROCESSING';
      order.timeline.push({
        status: 'PROCESSING',
        timestamp: now,
        note: 'All inventory exceptions resolved. Order returned to processing.',
        updatedBy: params.adminName || params.adminId,
      });
    }

    order.updatedAt = now;
    this.addAuditLog({
      event: 'ORDER_ADJUSTED',
      targetId: order.id,
      adminId: params.adminId,
      details: { newSubtotal, newTotal: order.total },
    });

    this.persistToDisk();
    return order;
  }

  public addInternalOrderNote(params: {
    orderId: string;
    note: string;
    authorId: string;
    authorName: string;
  }): OrderRecord {
    const order = this.orders.get(params.orderId);
    if (!order) throw new Error(`Order ${params.orderId} not found`);

    order.internalNotes.push({
      id: `note_${crypto.randomBytes(6).toString('hex')}`,
      note: params.note.trim(),
      authorId: params.authorId,
      authorName: params.authorName,
      timestamp: new Date().toISOString(),
    });

    order.updatedAt = new Date().toISOString();
    this.persistToDisk();
    return order;
  }

  // ── Online Inventory Overrides ─────────────────────────────────────────────

  public setProductOnlineOverride(params: {
    productId: string;
    sku: string;
    name: string;
    reportedBy: string;
    reason: string;
    statusOverride?: ProductAvailabilityOverride;
    isOutOfStockOnline?: boolean;
  }): InventoryOverrideRecord {
    const status = params.statusOverride || (params.isOutOfStockOnline !== false ? 'TEMPORARILY_UNAVAILABLE' : 'AVAILABLE');
    const isOut = status === 'TEMPORARILY_UNAVAILABLE' || status === 'OUT_OF_STOCK';

    const record: InventoryOverrideRecord = {
      productId: params.productId,
      sku: params.sku,
      name: params.name,
      isOutOfStockOnline: isOut,
      statusOverride: status,
      reportedBy: params.reportedBy,
      reportedAt: new Date().toISOString(),
      reason: params.reason,
      active: true,
    };

    this.inventoryOverrides.set(params.productId, record);
    if (params.sku) {
      this.inventoryOverrides.set(params.sku, record);
    }

    this.addAuditLog({
      event: 'PRODUCT_TEMPORARILY_DISABLED',
      targetId: params.productId,
      adminId: params.reportedBy,
      details: { sku: params.sku, name: params.name, reason: params.reason, statusOverride: status },
    });

    this.persistToDisk();
    return record;
  }

  public removeProductOnlineOverride(idOrSku: string, adminId: string): boolean {
    const existing = this.inventoryOverrides.get(idOrSku);
    if (!existing) return false;

    existing.active = false;
    existing.isOutOfStockOnline = false;
    existing.statusOverride = 'AVAILABLE';
    this.inventoryOverrides.delete(existing.productId);
    if (existing.sku) {
      this.inventoryOverrides.delete(existing.sku);
    }

    this.addAuditLog({
      event: 'PRODUCT_REACTIVATED',
      targetId: existing.productId,
      adminId,
      details: { sku: existing.sku, name: existing.name },
    });

    this.persistToDisk();
    return true;
  }

  public getProductOnlineOverride(idOrSku: string): InventoryOverrideRecord | undefined {
    return this.inventoryOverrides.get(idOrSku);
  }

  public isProductBlockedOnline(idOrSku: string): boolean {
    const override = this.inventoryOverrides.get(idOrSku);
    return Boolean(override && override.active && override.isOutOfStockOnline);
  }

  public listProductOverrides(): InventoryOverrideRecord[] {
    const unique = new Map<string, InventoryOverrideRecord>();
    for (const o of this.inventoryOverrides.values()) {
      if (o.active) unique.set(o.productId, o);
    }
    return Array.from(unique.values());
  }

  // ── Inventory Mismatches ───────────────────────────────────────────────────

  public createInventoryMismatch(params: {
    orderId: string;
    productId: string;
    sku: string;
    productName: string;
    systemQuantity: number;
    physicalQuantity: number;
    difference: number;
    reportedBy: string;
  }): InventoryMismatchRecord {
    const id = `mis_${crypto.randomBytes(8).toString('hex')}`;
    const record: InventoryMismatchRecord = {
      id,
      orderId: params.orderId,
      productId: params.productId,
      sku: params.sku,
      productName: params.productName,
      systemQuantity: params.systemQuantity,
      physicalQuantity: params.physicalQuantity,
      difference: params.difference,
      reportedBy: params.reportedBy,
      reportedAt: new Date().toISOString(),
      resolved: false,
    };

    this.inventoryMismatches.set(id, record);

    this.addAuditLog({
      event: 'INVENTORY_MISMATCH_REPORTED',
      targetId: id,
      adminId: params.reportedBy,
      details: {
        orderId: params.orderId,
        sku: params.sku,
        difference: params.difference,
        systemQty: params.systemQuantity,
        physicalQty: params.physicalQuantity,
      },
    });

    this.persistToDisk();
    return record;
  }

  public listInventoryMismatches(filterResolved?: boolean): InventoryMismatchRecord[] {
    let list = Array.from(this.inventoryMismatches.values());
    if (typeof filterResolved === 'boolean') {
      list = list.filter((m) => m.resolved === filterResolved);
    }
    return list.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }

  public resolveInventoryMismatch(id: string, adminId: string, notes?: string): InventoryMismatchRecord | null {
    const record = this.inventoryMismatches.get(id);
    if (!record) return null;

    record.resolved = true;
    record.resolvedBy = adminId;
    record.resolvedAt = new Date().toISOString();
    record.resolutionNotes = notes;

    this.addAuditLog({
      event: 'INVENTORY_MISMATCH_RESOLVED',
      targetId: id,
      adminId,
      details: { notes },
    });

    this.persistToDisk();
    return record;
  }

  // ── Customer Saved Addresses ───────────────────────────────────────────────

  public listCustomerAddresses(customerId: string): CustomerSavedAddress[] {
    return this.customerAddresses.get(customerId) || [];
  }

  public addCustomerAddress(params: Omit<CustomerSavedAddress, 'id' | 'createdAt'>): CustomerSavedAddress {
    const id = `addr_${crypto.randomBytes(8).toString('hex')}`;
    const record: CustomerSavedAddress = {
      ...params,
      id,
      createdAt: new Date().toISOString(),
    };

    const list = this.customerAddresses.get(params.customerId) || [];
    if (record.isDefault && record.type === 'delivery') {
      for (const a of list) {
        if (a.type === 'delivery') a.isDefault = false;
      }
    }
    list.push(record);
    this.customerAddresses.set(params.customerId, list);
    this.persistToDisk();
    return record;
  }

  public updateCustomerAddress(
    customerId: string,
    addressId: string,
    updates: Partial<CustomerSavedAddress>
  ): CustomerSavedAddress | null {
    const list = this.customerAddresses.get(customerId);
    if (!list) return null;
    const addr = list.find((a) => a.id === addressId);
    if (!addr) return null;

    Object.assign(addr, updates);
    if (updates.isDefault && addr.type === 'delivery') {
      for (const a of list) {
        if (a.id !== addressId && a.type === 'delivery') a.isDefault = false;
      }
    }

    this.persistToDisk();
    return addr;
  }

  public deleteCustomerAddress(customerId: string, addressId: string): boolean {
    const list = this.customerAddresses.get(customerId);
    if (!list) return false;
    const idx = list.findIndex((a) => a.id === addressId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.persistToDisk();
    return true;
  }

  public setDefaultDeliveryAddress(customerId: string, addressId: string): boolean {
    const list = this.customerAddresses.get(customerId);
    if (!list) return false;
    for (const a of list) {
      if (a.type === 'delivery') {
        a.isDefault = a.id === addressId;
      }
    }
    this.persistToDisk();
    return true;
  }

  // ── Metrics & Dashboard Stats ─────────────────────────────────────────────

  public getDashboardStats(): {
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
    totalApplications: number;
    totalCustomers: number;
    totalOrders: number;
    newOrders: number;
    pendingOrders: number;
    pickupOrders: number;
    deliveryOrders: number;
    inventoryIssues: number;
    activeOverrides: number;
  } {
    this.syncFromDisk();
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let suspended = 0;

    for (const app of this.applications.values()) {
      switch (app.status) {
        case 'PENDING':
          pending++;
          break;
        case 'APPROVED':
          approved++;
          break;
        case 'REJECTED':
          rejected++;
          break;
        case 'SUSPENDED':
          suspended++;
          break;
      }
    }

    let newOrders = 0;
    let pendingOrders = 0;
    let pickupOrders = 0;
    let deliveryOrders = 0;
    let inventoryIssues = 0;
    const allUniqueOrders = Array.from(new Set(this.orders.values()));
    for (const ord of allUniqueOrders) {
      if (ord.status === 'ORDER_RECEIVED') {
        newOrders++;
      }
      if (ord.status === 'ORDER_RECEIVED' || ord.status === 'PROCESSING') {
        pendingOrders++;
      }
      if (ord.status !== 'COMPLETED' && ord.status !== 'CANCELLED') {
        if (ord.fulfillmentMethod === 'PICKUP') pickupOrders++;
        if (ord.fulfillmentMethod === 'DELIVERY') deliveryOrders++;
      }
      if (ord.status === 'INVENTORY_ISSUE' || ord.status === 'CUSTOMER_ACTION_REQUIRED') {
        inventoryIssues++;
      }
    }

    return {
      pending,
      approved,
      rejected,
      suspended,
      totalApplications: this.applications.size,
      totalCustomers: this.customers.size,
      totalOrders: allUniqueOrders.length,
      newOrders,
      pendingOrders,
      pickupOrders,
      deliveryOrders,
      inventoryIssues,
      activeOverrides: this.listProductOverrides().length,
    };
  }
}

export const databaseStore = new DatabaseStore();
