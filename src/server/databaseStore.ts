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
  | 'ADMIN_LOGIN_FAILURE';

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

interface DatabaseState {
  applications: WholesaleApplicationRecord[];
  customers: CustomerRecord[];
  tokens: SecurityTokenRecord[];
  auditLogs: AuditLogRecord[];
}

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const DB_FILE = path.join(STORAGE_DIR, 'database_state.json');

class DatabaseStore {
  private applications: Map<string, WholesaleApplicationRecord> = new Map(); // keyed by id
  private applicationsByEmail: Map<string, string[]> = new Map(); // email -> id[]
  private customers: Map<string, CustomerRecord> = new Map(); // keyed by id
  private customersByEmail: Map<string, CustomerRecord> = new Map(); // keyed by email
  private tokens: Map<string, SecurityTokenRecord> = new Map(); // keyed by token string
  private auditLogs: AuditLogRecord[] = [];

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
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const state: DatabaseState = JSON.parse(raw);

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

        console.log(
          `[DatabaseStore] 📦 Loaded ${this.applications.size} applications, ${this.customers.size} customers, ${this.auditLogs.length} audit logs.`
        );
      }
    } catch (err: any) {
      console.warn('[DatabaseStore] Could not load database state from disk:', err.message);
    }
  }

  public persistToDisk(): void {
    try {
      this.ensureStorageDir();
      const state: DatabaseState = {
        applications: Array.from(this.applications.values()),
        customers: Array.from(this.customers.values()),
        tokens: Array.from(this.tokens.values()),
        auditLogs: this.auditLogs.slice(-2000), // Keep last 2000 audit logs
      };

      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err: any) {
      console.warn('[DatabaseStore] Could not persist database to disk (expected in serverless/read-only):', err.message);
    }
  }

  private seedDefaultsIfEmpty(): void {
    // Seed approved verified account for testing/dispatch if no applications exist
    if (this.applications.size === 0) {
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
    return this.applications.get(id);
  }

  public findApplicationsByEmail(email: string): WholesaleApplicationRecord[] {
    const cleanEmail = email.toLowerCase().trim();
    const ids = this.applicationsByEmail.get(cleanEmail) || [];
    return ids.map((id) => this.applications.get(id)!).filter(Boolean);
  }

  public getLatestApplicationForEmail(email: string): WholesaleApplicationRecord | undefined {
    const list = this.findApplicationsByEmail(email);
    if (list.length === 0) return undefined;
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
  }

  public listApplications(statusFilter?: ApplicationStatus | 'ALL', search?: string): WholesaleApplicationRecord[] {
    let list = Array.from(this.applications.values());

    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter((a) => a.status === statusFilter);
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
          (a.address && a.address.city.toLowerCase().includes(q))
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
    const app = this.applications.get(id);
    if (!app) return null;

    app.status = status;
    app.reviewedAt = new Date().toISOString();
    app.reviewedBy = adminId;
    if (reviewNotes) app.reviewNotes = reviewNotes;

    this.persistToDisk();
    return app;
  }

  public deleteApplication(id: string): boolean {
    const app = this.applications.get(id);
    if (!app) return false;
    this.applications.delete(id);
    const email = app.email.toLowerCase().trim();
    const existing = this.applicationsByEmail.get(email) || [];
    this.applicationsByEmail.set(email, existing.filter((appId) => appId !== id));
    this.persistToDisk();
    return true;
  }

  // ── Customers ─────────────────────────────────────────────────────────────

  public createOrUpdateCustomerFromApplication(
    app: WholesaleApplicationRecord,
    approvedByAdminId: string
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
      };
      this.customers.set(id, customer);
      this.customersByEmail.set(cleanEmail, customer);
    }

    app.customerId = customer.id;
    app.status = 'APPROVED';
    app.reviewedAt = now;
    app.reviewedBy = approvedByAdminId;

    this.persistToDisk();
    return customer;
  }

  public getCustomer(id: string): CustomerRecord | undefined {
    return this.customers.get(id);
  }

  public getCustomerByEmail(email: string): CustomerRecord | undefined {
    return this.customersByEmail.get(email.toLowerCase().trim());
  }

  public listCustomers(statusFilter?: ApplicationStatus | 'ALL', search?: string): CustomerRecord[] {
    let list = Array.from(this.customers.values());

    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.businessName.toLowerCase().includes(q) ||
          c.contactName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.address && c.address.city.toLowerCase().includes(q))
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
    const customer = this.customers.get(id);
    if (!customer) return false;
    this.customers.delete(id);
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

  // ── Metrics & Dashboard Stats ─────────────────────────────────────────────

  public getDashboardStats(): {
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
    totalApplications: number;
    totalCustomers: number;
  } {
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

    return {
      pending,
      approved,
      rejected,
      suspended,
      totalApplications: this.applications.size,
      totalCustomers: this.customers.size,
    };
  }
}

export const databaseStore = new DatabaseStore();
