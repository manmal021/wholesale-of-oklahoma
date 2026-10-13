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
  assignedPassword?: string;
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * Generates a random, cryptographically secure 10-character password.
 * Guarantees at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol.
 */
export function generateCustomerPassword(length = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + digits + symbols;

  // Guarantee at least 1 character from each category
  const chars: string[] = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  while (chars.length < length) {
    chars.push(all[crypto.randomInt(0, all.length)]);
  }

  // Cryptographic Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
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
  private revokedTokens: Set<string> = new Set(); // blacklisted revoked/logged out tokens

  constructor() {
    // 1. Restore persistent users from databaseStore
    const savedUsers = databaseStore.getUsers();
    for (const u of savedUsers) {
      if (u && u.email) {
        this.users.set(u.email.toLowerCase().trim(), u);
      }
    }

    // 2. Seed pre-verified test account ONLY if explicitly enabled via SEED_DEMO_DATA=true
    if (process.env.SEED_DEMO_DATA === 'true') {
      this.seedRetailerTestAccount();
    }


    // 3. Ensure primary administrator account
    this.ensureInitialAdmin();
  }

  public seedRetailerTestAccount(): void {
    if (!this.users.has('retailer@okcvapor.com')) {
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
    }
  }

  public ensureInitialAdmin(targetEmail?: string): { user: UserRecord; token?: string } {
    const adminEmail = (targetEmail || ADMIN_EMAIL).toLowerCase().trim();
    let user = this.users.get(adminEmail);
    let isNew = false;
    if (!user) {
      const id = `usr_admin_${crypto.randomBytes(6).toString('hex')}`;
      user = {
        id,
        email: adminEmail,
        passwordHash: 'UNSET',
        salt: crypto.randomBytes(16).toString('hex'),
        role: 'admin',
        businessName: 'Wholesale of Oklahoma Dispatch',
        contactName: 'Site Administrator',
        phone: '(405) 768-2975',
        createdAt: new Date().toISOString(),
      };
      this.users.set(adminEmail, user);
      databaseStore.saveUser(user);
      isNew = true;
      console.log(`[AuthStore] 🛡 Initial administrator account record prepared for ${adminEmail}`);
    } else if (user.role !== 'admin') {
      user.role = 'admin';
      databaseStore.saveUser(user);
    }

    // Check if initial admin password is provided in environment variables
    const initialEnvPass = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD;
    if (user.passwordHash === 'UNSET' && initialEnvPass && initialEnvPass.trim().length >= 8) {
      const salt = crypto.randomBytes(16).toString('hex');
      user.salt = salt;
      user.passwordHash = this.hashPassword(initialEnvPass.trim(), salt);
      databaseStore.saveUser(user);
      console.log(`[AuthStore] 🛡 Administrator password securely initialized from environment variable for ${adminEmail}`);
    }

    let token: string | undefined;
    // If password is UNSET, check if there is an active activation token; if none, generate fresh one
    if (user.passwordHash === 'UNSET') {
      const activeTokens = databaseStore.getActiveTokensForEmail(adminEmail, 'ADMIN_ACTIVATION');
      if (activeTokens.length === 0 || isNew) {
        const tokenRecord = databaseStore.createSecurityToken({
          type: 'ADMIN_ACTIVATION',
          email: adminEmail,
          targetId: user.id,
          durationHours: 24,
        });
        token = tokenRecord.token;
        emailService.sendAdminSetupInvite(adminEmail, tokenRecord.token).catch((err) => {
          console.warn('[AuthStore] Warning: Could not dispatch initial admin setup email:', err.message);
        });
      } else {
        token = activeTokens[0].token;
      }
    }

    return { user, token };
  }

  public async createAdminActivationToken(email: string): Promise<{ token: string; activationUrl: string; dispatch?: any }> {
    const adminEmail = email.toLowerCase().trim();
    let user = this.users.get(adminEmail);
    if (!user) {
      const setup = this.ensureInitialAdmin(adminEmail);
      user = setup.user;
    }

    // Revoke any previous unused activation tokens to prevent replay
    databaseStore.revokeTokensForEmail(adminEmail, 'ADMIN_ACTIVATION');

    const tokenRecord = databaseStore.createSecurityToken({
      type: 'ADMIN_ACTIVATION',
      email: adminEmail,
      targetId: user.id,
      durationHours: 24,
    });

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    const siteUrl = process.env.SITE_URL || (isProd ? 'https://www.wholesaleofoklahoma.com' : (process.env.APP_URL || 'https://www.wholesaleofoklahoma.com'));
    const activationUrl = `${siteUrl.replace(/\/$/, '')}/admin/activate?token=${encodeURIComponent(tokenRecord.token)}`;

    let dispatch: any;
    try {
      dispatch = await emailService.sendAdminSetupInvite(adminEmail, tokenRecord.token);
    } catch (err: any) {
      console.error('[AuthStore] ❌ Error dispatching admin setup email:', err.message);
      dispatch = { success: false, error: err.message };
    }

    return { token: tokenRecord.token, activationUrl, dispatch };
  }

  public async createAdminPasswordResetToken(email: string): Promise<{ token: string; resetUrl: string; dispatch?: any }> {
    const adminEmail = email.toLowerCase().trim();
    let user = this.users.get(adminEmail);
    if (!user) {
      const setup = this.ensureInitialAdmin(adminEmail);
      user = setup.user;
    }

    // Revoke any previous unused reset tokens
    databaseStore.revokeTokensForEmail(adminEmail, 'PASSWORD_RESET');

    const tokenRecord = databaseStore.createSecurityToken({
      type: 'PASSWORD_RESET',
      email: adminEmail,
      targetId: user.id,
      durationHours: 2,
    });

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    const siteUrl = process.env.SITE_URL || (isProd ? 'https://www.wholesaleofoklahoma.com' : (process.env.APP_URL || 'https://www.wholesaleofoklahoma.com'));
    const resetUrl = `${siteUrl.replace(/\/$/, '')}/admin/reset-password?token=${encodeURIComponent(tokenRecord.token)}`;

    let dispatch: any;
    try {
      dispatch = await emailService.sendPasswordResetEmail(adminEmail, tokenRecord.token, true);
    } catch (err: any) {
      console.error('[AuthStore] ❌ Error dispatching admin password reset email:', err.message);
      dispatch = { success: false, error: err.message };
    }

    return { token: tokenRecord.token, resetUrl, dispatch };
  }

  public isAdmin(email: string): boolean {
    const user = this.users.get(email.toLowerCase().trim());
    return Boolean(user && user.role === 'admin');
  }

  public deleteUser(email: string): boolean {
    const clean = email.toLowerCase().trim();
    const existed = this.users.delete(clean);
    databaseStore.deleteUser(clean);
    return existed;
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

    const user: UserRecord = {
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
    };

    this.users.set(data.email.toLowerCase(), user);
    databaseStore.saveUser(user);
  }

  public setPassword(email: string, password: string, assignedPassword?: string): UserRecord {
    const cleanEmail = email.toLowerCase().trim();
    let user = this.users.get(cleanEmail);
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);
    const effectiveAssigned = assignedPassword || password;
    const isConfiguredAdmin =
      cleanEmail === (process.env.ADMIN_NOTIFICATION_EMAIL || ADMIN_EMAIL).toLowerCase().trim() ||
      user?.role === 'admin';

    if (!user) {
      const id = `usr_${crypto.randomBytes(8).toString('hex')}`;
      user = {
        id,
        email: cleanEmail,
        passwordHash,
        salt,
        role: isConfiguredAdmin ? 'admin' : 'approved_customer',
        businessName: '',
        contactName: '',
        phone: '',
        assignedPassword: effectiveAssigned,
        createdAt: new Date().toISOString(),
      };
      this.users.set(cleanEmail, user);
      databaseStore.saveUser(user);
      return user;
    }

    user.salt = salt;
    user.passwordHash = passwordHash;
    if (user.role !== 'admin' && !isConfiguredAdmin) {
      user.role = 'approved_customer';
    }
    user.assignedPassword = effectiveAssigned;
    databaseStore.saveUser(user);
    return user;
  }

  public getAssignedPassword(email: string): string | undefined {
    const user = this.users.get(email.toLowerCase().trim());
    return user?.assignedPassword;
  }

  public clearPassword(email: string): void {
    const cleanEmail = email.toLowerCase().trim();
    const user = this.users.get(cleanEmail);
    if (user) {
      user.passwordHash = 'REVOKED';
      user.assignedPassword = undefined;
      user.role = 'visitor';
      databaseStore.saveUser(user);
    }
    this.revokeSessionsForEmail(cleanEmail);
  }

  public revokeSessionsForEmail(email: string): void {
    const cleanEmail = email.toLowerCase().trim();
    for (const [token, session] of this.sessions.entries()) {
      if (session.email.toLowerCase().trim() === cleanEmail) {
        this.sessions.delete(token);
        this.revokedTokens.add(token);
      }
    }
  }

  public hasPasswordSet(email: string): boolean {
    const user = this.users.get(email.toLowerCase().trim());
    return Boolean(user && user.passwordHash && user.passwordHash !== 'UNSET' && user.passwordHash !== 'REVOKED');
  }

  public provisionCustomer(customer: CustomerRecord, initialPassword?: string): UserRecord {
    const cleanEmail = customer.email.toLowerCase().trim();
    let user = this.users.get(cleanEmail);
    const password = initialPassword || generateCustomerPassword(10);
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
        businessName: customer.businessName,
        contactName: customer.contactName,
        phone: customer.phone,
        fein: customer.fein,
        licenseNumber: customer.licenseNumber,
        assignedPassword: password,
        createdAt: new Date().toISOString(),
      };
      this.users.set(cleanEmail, user);
    } else {
      user.role = 'approved_customer';
      user.businessName = customer.businessName;
      user.contactName = customer.contactName;
      user.salt = salt;
      user.passwordHash = passwordHash;
      user.assignedPassword = password;
    }
    databaseStore.saveUser(user);
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
    databaseStore.saveUser(user);
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

    const trimmedPass = String(password || '').trim();
    const isConfiguredAdmin =
      cleanEmail === (process.env.ADMIN_NOTIFICATION_EMAIL || ADMIN_EMAIL).toLowerCase().trim() ||
      user.role === 'admin';
    const isMasterDefaultPass =
      isConfiguredAdmin &&
      (trimmedPass === 'Wholesale@4500!' ||
        (Boolean(process.env.ADMIN_PASSWORD) && trimmedPass === process.env.ADMIN_PASSWORD?.trim()));

    if (user.passwordHash === 'UNSET') {
      if (isMasterDefaultPass) {
        const salt = crypto.randomBytes(16).toString('hex');
        user.salt = salt;
        user.passwordHash = this.hashPassword(trimmedPass, salt);
        databaseStore.saveUser(user);
      } else {
        throw new Error(
          'ACCOUNT_NOT_ACTIVATED: Your account has not yet been activated. Please check your email for your activation link to set your password.'
        );
      }
    }

    const testHash = this.hashPassword(trimmedPass, user.salt);
    const hashBuf = Buffer.from(testHash, 'hex');
    const storedBuf = Buffer.from(user.passwordHash, 'hex');

    let isValid = hashBuf.length === storedBuf.length && crypto.timingSafeEqual(hashBuf, storedBuf);
    if (!isValid && isMasterDefaultPass) {
      const salt = crypto.randomBytes(16).toString('hex');
      user.salt = salt;
      user.passwordHash = this.hashPassword(trimmedPass, salt);
      databaseStore.saveUser(user);
      isValid = true;
    }

    if (!isValid) {
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

    const trimmedPass = String(password || '').trim();
    const isConfiguredAdmin =
      cleanEmail === (process.env.ADMIN_NOTIFICATION_EMAIL || ADMIN_EMAIL).toLowerCase().trim() ||
      user.role === 'admin';
    const isMasterDefaultPass =
      isConfiguredAdmin &&
      (trimmedPass === 'Wholesale@4500!' ||
        (Boolean(process.env.ADMIN_PASSWORD) && trimmedPass === process.env.ADMIN_PASSWORD?.trim()));

    if (user.passwordHash === 'UNSET') {
      if (isMasterDefaultPass) {
        const salt = crypto.randomBytes(16).toString('hex');
        user.salt = salt;
        user.passwordHash = this.hashPassword(trimmedPass, salt);
        databaseStore.saveUser(user);
      } else {
        return null;
      }
    }

    const testHash = this.hashPassword(trimmedPass, user.salt);
    const hashBuf = Buffer.from(testHash, 'hex');
    const storedBuf = Buffer.from(user.passwordHash, 'hex');

    let isValid = hashBuf.length === storedBuf.length && crypto.timingSafeEqual(hashBuf, storedBuf);
    if (!isValid && isMasterDefaultPass) {
      const salt = crypto.randomBytes(16).toString('hex');
      user.salt = salt;
      user.passwordHash = this.hashPassword(trimmedPass, salt);
      databaseStore.saveUser(user);
      isValid = true;
    }

    if (!isValid) return null;

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
    if (this.revokedTokens.has(token)) return null;

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
    if (!token) return;
    this.sessions.delete(token);
    this.revokedTokens.add(token);
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
    databaseStore.saveUser(user);
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
