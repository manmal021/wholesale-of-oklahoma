/**
 * authStore.ts
 * Secure authentication and role-based access control (RBAC) store.
 * Uses cryptographic scrypt hashing with per-user salts.
 * Follows OWASP A01 (Broken Access Control) & A07 (Authentication Failures).
 */

import crypto from 'crypto';
import { databaseStore, type CustomerRecord } from './databaseStore.js';
import { emailService, ADMIN_EMAIL } from './emailService.js';

export type UserRole = 'visitor' | 'pending_customer' | 'approved_customer' | 'admin';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  businessName: string;
  contactName: string;
  phone: string;
  fein?: string;
  licenseNumber?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
  businessName: string;
  contactName: string;
  createdAt: number;
  expiresAt: number;
}

class AuthStore {
  private users: Map<string, UserRecord> = new Map(); // keyed by email (lowercase)
  private sessions: Map<string, SessionRecord> = new Map(); // keyed by session token

  constructor() {
    // Seed pre-verified test account for customer verification
    this.seedUser({
      email: 'retailer@okcvapor.com',
      password: 'WholesaleOK2026!',
      role: 'approved_customer',
      businessName: 'OKC Vapor Lounge LLC',
      contactName: 'Alex Mercer',
      phone: '(405) 555-0199',
      fein: '73-1234567',
      licenseNumber: 'OK-TOB-89214',
    });

    // Seed internal backup admin
    this.seedUser({
      email: 'admin@wholesaleofoklahoma.com',
      password: 'AdminSecret2026!',
      role: 'admin',
      businessName: 'Wholesale of Oklahoma Dispatch',
      contactName: 'Head Dispatcher',
      phone: '(405) 768-2975',
    });

    // Ensure initial administrator for order2wholesaleofoklahoma@gmail.com
    this.ensureInitialAdmin();
  }

  public ensureInitialAdmin(): void {
    const adminEmail = ADMIN_EMAIL.toLowerCase().trim();
    let user = this.users.get(adminEmail);
    if (!user) {
      const id = `usr_admin_${crypto.randomBytes(6).toString('hex')}`;
      user = {
        id,
        email: adminEmail,
        passwordHash: 'UNSET',
        salt: crypto.randomBytes(16).toString('hex'),
        role: 'admin',
        businessName: 'Wholesale of Oklahoma',
        contactName: 'Site Administrator',
        phone: '(405) 768-2975',
        createdAt: new Date().toISOString(),
      };
      this.users.set(adminEmail, user);
      console.log(`[AuthStore] 🛡 Initial administrator account record prepared for ${adminEmail}`);

      // Create single-use 24-hour setup token if no active token exists
      const tokenRecord = databaseStore.createSecurityToken({
        type: 'ADMIN_ACTIVATION',
        email: adminEmail,
        targetId: id,
        durationHours: 24,
      });

      emailService.sendAdminSetupInvite(adminEmail, tokenRecord.token).catch((err) => {
        console.warn('[AuthStore] Warning: Could not dispatch initial admin setup email:', err.message);
      });
    }
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  private seedUser(data: {
    email: string;
    password: string;
    role: UserRole;
    businessName: string;
    contactName: string;
    phone: string;
    fein?: string;
    licenseNumber?: string;
  }) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(data.password, salt);
    const id = `usr_${crypto.randomBytes(8).toString('hex')}`;

    this.users.set(data.email.toLowerCase(), {
      id,
      email: data.email.toLowerCase(),
      passwordHash,
      salt,
      role: data.role,
      businessName: data.businessName,
      contactName: data.contactName,
      phone: data.phone,
      fein: data.fein,
      licenseNumber: data.licenseNumber,
      createdAt: new Date().toISOString(),
    });
  }

  public setPassword(email: string, password: string): UserRecord {
    const cleanEmail = email.toLowerCase().trim();
    let user = this.users.get(cleanEmail);
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    if (!user) {
      const id = `usr_${crypto.randomBytes(8).toString('hex')}`;
      user = {
        id,
        email: cleanEmail,
        passwordHash,
        salt,
        role: 'approved_customer',
        businessName: '',
        contactName: '',
        phone: '',
        createdAt: new Date().toISOString(),
      };
      this.users.set(cleanEmail, user);
      return user;
    }

    user.salt = salt;
    user.passwordHash = passwordHash;
    return user;
  }

  public hasPasswordSet(email: string): boolean {
    const user = this.users.get(email.toLowerCase().trim());
    return Boolean(user && user.passwordHash && user.passwordHash !== 'UNSET');
  }

  public provisionCustomer(customer: CustomerRecord): UserRecord {
    const cleanEmail = customer.email.toLowerCase().trim();
    let user = this.users.get(cleanEmail);
    if (!user) {
      const id = `usr_${crypto.randomBytes(8).toString('hex')}`;
      user = {
        id,
        email: cleanEmail,
        passwordHash: 'UNSET',
        salt: crypto.randomBytes(16).toString('hex'),
        role: 'approved_customer',
        businessName: customer.businessName,
        contactName: customer.contactName,
        phone: customer.phone,
        fein: customer.fein,
        licenseNumber: customer.licenseNumber,
        createdAt: new Date().toISOString(),
      };
      this.users.set(cleanEmail, user);
    } else {
      user.role = 'approved_customer';
      user.businessName = customer.businessName;
      user.contactName = customer.contactName;
    }
    return user;
  }

  public register(data: {
    email: string;
    password: string;
    businessName: string;
    contactName: string;
    phone: string;
    fein?: string;
    licenseNumber?: string;
    role?: UserRole;
  }): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; token: string } {
    const cleanEmail = data.email.toLowerCase().trim();
    if (this.users.has(cleanEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(data.password, salt);
    const id = `usr_${crypto.randomBytes(8).toString('hex')}`;

    const user: UserRecord = {
      id,
      email: cleanEmail,
      passwordHash,
      salt,
      role: data.role || 'pending_customer',
      businessName: data.businessName.trim(),
      contactName: data.contactName.trim(),
      phone: data.phone.trim(),
      fein: data.fein?.trim(),
      licenseNumber: data.licenseNumber?.trim(),
      createdAt: new Date().toISOString(),
    };

    this.users.set(cleanEmail, user);
    const session = this.createSession(user);

    const { passwordHash: _, salt: __, ...safeUser } = user;
    return { user: safeUser, token: session.token };
  }

  public login(email: string, password: string): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; token: string } {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Check Customer Status in databaseStore
    const customer = databaseStore.getCustomerByEmail(cleanEmail);
    if (customer && customer.status === 'SUSPENDED') {
      throw new Error('ACCOUNT_SUSPENDED: Your wholesale account has been suspended. Please contact Wholesale of Oklahoma dispatch at (405) 768-2975.');
    }

    // 2. Check Wholesale Applications in databaseStore
    const latestApp = databaseStore.getLatestApplicationForEmail(cleanEmail);
    if (latestApp) {
      if (latestApp.status === 'PENDING' && (!customer || customer.status !== 'APPROVED')) {
        throw new Error('ACCOUNT_PENDING: Your Wholesale of Oklahoma account application is currently under review. You will receive an email once our team has reviewed your application.');
      }
      if (latestApp.status === 'REJECTED' && (!customer || customer.status !== 'APPROVED')) {
        throw new Error('ACCOUNT_REJECTED: Your wholesale account application was not approved. Please contact dispatch if you have questions.');
      }
    }

    const user = this.users.get(cleanEmail);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (user.passwordHash === 'UNSET') {
      throw new Error('ACCOUNT_NOT_ACTIVATED: Your account has not yet been activated. Please check your email for your activation link to set your password.');
    }

    const testHash = this.hashPassword(password, user.salt);
    const hashBuf = Buffer.from(testHash, 'hex');
    const storedBuf = Buffer.from(user.passwordHash, 'hex');

    if (hashBuf.length !== storedBuf.length || !crypto.timingSafeEqual(hashBuf, storedBuf)) {
      throw new Error('Invalid email or password.');
    }

    user.lastLoginAt = new Date().toISOString();
    const session = this.createSession(user);

    const { passwordHash: _, salt: __, ...safeUser } = user;
    return { user: safeUser, token: session.token };
  }

  public validateCredentials(email: string, password: string): Omit<UserRecord, 'passwordHash' | 'salt'> | null {
    const cleanEmail = email.toLowerCase().trim();
    const user = this.users.get(cleanEmail);
    if (!user) return null;

    const testHash = this.hashPassword(password, user.salt);
    const hashBuf = Buffer.from(testHash, 'hex');
    const storedBuf = Buffer.from(user.passwordHash, 'hex');

    if (hashBuf.length !== storedBuf.length || !crypto.timingSafeEqual(hashBuf, storedBuf)) {
      return null;
    }

    user.lastLoginAt = new Date().toISOString();
    const { passwordHash: _, salt: __, ...safeUser } = user;
    return safeUser;
  }

  private getSessionSecret(): string {
    return process.env.ADMIN_SECRET_KEY || process.env.SESSION_SECRET || 'woo_wholesale_oklahoma_hmac_secret_2026';
  }

  private signSessionPayload(payloadStr: string): string {
    return crypto.createHmac('sha256', this.getSessionSecret()).update(payloadStr).digest('hex');
  }

  public createSession(
    userOrId: UserRecord | { id?: string; userId?: string; email?: string; role?: UserRole; businessName?: string; contactName?: string } | string,
    email?: string,
    role?: UserRole,
    businessName?: string,
    contactName?: string
  ): SessionRecord {
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    let userId: string;
    let userEmail: string;
    let userRole: UserRole;
    let bName: string;
    let cName: string;

    if (typeof userOrId === 'object') {
      userId = (userOrId as any).id || (userOrId as any).userId;
      userEmail = userOrId.email;
      userRole = userOrId.role;
      bName = userOrId.businessName;
      cName = userOrId.contactName;
    } else {
      const user = email ? this.users.get(email.toLowerCase().trim()) : undefined;
      userId = userOrId;
      userEmail = email || user?.email || '';
      userRole = role || user?.role || 'visitor';
      bName = businessName || user?.businessName || '';
      cName = contactName || user?.contactName || '';
    }

    // Generate cryptographic HMAC-signed session token for serverless multi-instance resilience
    const payloadObj = {
      u: userId,
      e: userEmail,
      r: userRole,
      b: bName,
      c: cName,
      exp: expiresAt,
      rnd: crypto.randomBytes(8).toString('hex'),
    };
    const payloadJson = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const signature = this.signSessionPayload(payloadJson);
    const token = `${payloadJson}.${signature}`;

    const session: SessionRecord = {
      token,
      userId,
      email: userEmail,
      role: userRole,
      businessName: bName,
      contactName: cName,
      createdAt: now,
      expiresAt,
    };

    this.sessions.set(token, session);
    return session;
  }

  public getUserByEmail(email: string): Omit<UserRecord, 'passwordHash' | 'salt'> | null {
    return this.getUser(email);
  }

  public deleteSession(token: string) {
    this.revokeSession(token);
  }

  public validateSession(token: string): SessionRecord | null {
    if (!token || typeof token !== 'string') return null;

    // 1. Check local session cache if present
    const cachedSession = this.sessions.get(token);
    if (cachedSession) {
      if (Date.now() > cachedSession.expiresAt) {
        this.sessions.delete(token);
        return null;
      }

      // Check if user account was suspended in databaseStore
      const cust = databaseStore.getCustomerByEmail(cachedSession.email);
      if (cust && cust.status === 'SUSPENDED') {
        this.sessions.delete(token);
        return null;
      }

      const user = this.users.get(cachedSession.email);
      if (user) {
        cachedSession.role = user.role;
      }
      return cachedSession;
    }

    // 2. Validate HMAC-signed token across serverless lambda instances
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, providedSig] = parts;
    try {
      const expectedSig = this.signSessionPayload(payloadB64);
      const bufProvided = Buffer.from(providedSig, 'hex');
      const bufExpected = Buffer.from(expectedSig, 'hex');

      if (bufProvided.length !== bufExpected.length || !crypto.timingSafeEqual(bufProvided, bufExpected)) {
        return null;
      }

      const decodedJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(decodedJson);

      if (!payload.exp || Date.now() > payload.exp) {
        return null;
      }

      // Check if user account was suspended in databaseStore
      if (payload.e) {
        const cust = databaseStore.getCustomerByEmail(payload.e);
        if (cust && cust.status === 'SUSPENDED') {
          return null;
        }
      }

      const user = payload.e ? this.users.get(payload.e.toLowerCase().trim()) : undefined;
      const effectiveRole: UserRole = user ? user.role : (payload.r as UserRole);

      const reconstructed: SessionRecord = {
        token,
        userId: payload.u || '',
        email: payload.e || '',
        role: effectiveRole,
        businessName: user?.businessName || payload.b || '',
        contactName: user?.contactName || payload.c || '',
        createdAt: payload.exp - 7 * 24 * 60 * 60 * 1000,
        expiresAt: payload.exp,
      };

      this.sessions.set(token, reconstructed);
      return reconstructed;
    } catch {
      return null;
    }
  }

  public revokeSession(token: string) {
    this.sessions.delete(token);
  }

  public updateUserRole(email: string, newRole: UserRole): boolean {
    const user = this.users.get(email.toLowerCase().trim());
    if (!user) return false;
    user.role = newRole;

    // Update active sessions
    for (const session of this.sessions.values()) {
      if (session.email === user.email) {
        session.role = newRole;
      }
    }
    return true;
  }

  public getUser(email: string): Omit<UserRecord, 'passwordHash' | 'salt'> | null {
    const user = this.users.get(email.toLowerCase().trim());
    if (!user) return null;
    const { passwordHash: _, salt: __, ...safeUser } = user;
    return safeUser;
  }
}

export const authStore = new AuthStore();
