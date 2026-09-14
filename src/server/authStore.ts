/**
 * authStore.ts
 * Secure authentication and role-based access control (RBAC) store.
 * Uses cryptographic scrypt hashing with per-user salts.
 * Follows OWASP A01 (Broken Access Control) & A07 (Authentication Failures).
 */

import crypto from 'crypto';

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
    // Seed pre-verified test accounts for verification and administrative dispatch
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

    this.seedUser({
      email: 'admin@wholesaleofoklahoma.com',
      password: 'AdminSecret2026!',
      role: 'admin',
      businessName: 'Wholesale of Oklahoma Dispatch',
      contactName: 'Head Dispatcher',
      phone: '(405) 768-2975',
    });
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
    const user = this.users.get(cleanEmail);
    if (!user) {
      throw new Error('Invalid email or password.');
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

  public createSession(
    userOrId: UserRecord | string,
    email?: string,
    role?: UserRole,
    businessName?: string,
    contactName?: string
  ): SessionRecord {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    let session: SessionRecord;
    if (typeof userOrId === 'object') {
      session = {
        token,
        userId: userOrId.id,
        email: userOrId.email,
        role: userOrId.role,
        businessName: userOrId.businessName,
        contactName: userOrId.contactName,
        createdAt: now,
        expiresAt,
      };
    } else {
      const user = email ? this.users.get(email.toLowerCase().trim()) : undefined;
      session = {
        token,
        userId: userOrId,
        email: email || user?.email || '',
        role: role || user?.role || 'visitor',
        businessName: businessName || user?.businessName || '',
        contactName: contactName || user?.contactName || '',
        createdAt: now,
        expiresAt,
      };
    }

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
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    // Refresh role from user in case it was approved by admin
    const user = this.users.get(session.email);
    if (user) {
      session.role = user.role;
    }

    return session;
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
