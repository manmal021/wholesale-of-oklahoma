/**
 * zohoAuth.ts
 * Zoho OAuth 2.0 service for Wholesale of Oklahoma.
 *
 * Responsibilities:
 *  1. Build the authorization URL so you can generate a code in Zoho API Console.
 *  2. Exchange a one-time authorization code for access_token + refresh_token.
 *  3. Write the refresh_token back to the .env file so it survives server restarts.
 *  4. Automatically refresh access_token every 55 minutes in the background.
 *
 * HOW IT WORKS (one-time setup):
 *  a) You go to Zoho API Console → Self Client → Generate Code.
 *  b) GET /api/zoho/callback?code=<your_code>  (or POST /api/zoho/exchange)
 *  c) This handler calls Zoho Accounts, receives refresh_token, writes it to .env,
 *     and restarts the background refresh timer.
 *
 * After that, the app is fully autonomous — no manual token work needed.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Path helpers (ESM compatible)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root of the project (.env lives here)
const ENV_FILE = path.resolve(__dirname, '../../.env');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ZOHO_ACCOUNTS_BASE = `https://accounts.zoho.${process.env.ZOHO_DC || 'com'}`;
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes (Zoho tokens last 60 min)

// ---------------------------------------------------------------------------
// In-memory token cache
// ---------------------------------------------------------------------------
let _accessToken: string | null = null;
let _tokenExpiresAt: number = 0;
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a single key from the .env file on disk. */
function readEnvKey(key: string): string | null {
  try {
    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    const match = content.match(new RegExp(`^${key}\\s*=\\s*["']?([^"'\\r\\n]+)["']?`, 'm'));
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/** Upsert a key=value pair in the .env file without destroying other entries. */
function writeEnvKey(key: string, value: string): void {
  try {
    // 1. Immediately update process.env in memory so the current runtime picks it up
    process.env[key] = value;

    // 2. Persist to .env on disk if filesystem is writable
    let content = '';
    if (fs.existsSync(ENV_FILE)) {
      content = fs.readFileSync(ENV_FILE, 'utf-8');
    }

    const pattern = new RegExp(`^${key}\\s*=.*$`, 'm');
    const line = `${key}="${value}"`;

    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      content = content.trimEnd() + '\n' + line + '\n';
    }

    try {
      fs.writeFileSync(ENV_FILE, content, 'utf-8');
      console.log(`[ZohoAuth] ✅ ${key} written to .env`);
    } catch (fsErr) {
      console.warn(`[ZohoAuth] ℹ Could not persist ${key} to disk (expected in serverless/read-only environments)`);
    }
  } catch (err) {
    console.error(`[ZohoAuth] ❌ Failed to update ${key}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the Zoho authorization URL.
 * Use this only if you want a browser-based flow (scope: ZohoInventory.fullaccess.all)
 * Usually you use the Self-Client / Scope method in Zoho API Console instead.
 */
export function buildAuthorizationUrl(): string {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const redirectUri = process.env.ZOHO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('ZOHO_CLIENT_ID and ZOHO_REDIRECT_URI must be set in .env');
  }

  const params = new URLSearchParams({
    scope: 'ZohoInventory.FullAccess.All',
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline', // ensures Zoho returns a refresh_token
    prompt: 'consent',
  });

  return `${ZOHO_ACCOUNTS_BASE}/oauth/v2/auth?${params.toString()}`;
}

/**
 * Exchanges a one-time authorization code for access_token + refresh_token.
 * Persists the refresh_token to .env automatically.
 * Schedules the background auto-refresh loop.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const redirectUri = process.env.ZOHO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REDIRECT_URI must be set in .env');
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(`${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json() as any;

  if (!res.ok || data.error || !data.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }

  // Cache access token in memory
  _accessToken = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  // Persist refresh_token to disk so server restarts don't require re-auth
  if (data.refresh_token) {
    writeEnvKey('ZOHO_REFRESH_TOKEN', data.refresh_token);
  }

  // Start background auto-refresh
  scheduleTokenRefresh();

  console.log('[ZohoAuth] ✅ Tokens exchanged and cached. Refresh token persisted to .env.');

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 3600,
  };
}

/**
 * Returns a valid access_token, refreshing from Zoho if expired.
 * This is the main method called by the inventory service.
 */
export async function getValidToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 60-second buffer)
  if (_accessToken && _tokenExpiresAt > now + 60_000) {
    return _accessToken;
  }

  // Refresh using stored refresh_token
  await refreshAccessToken();

  if (!_accessToken) {
    throw new Error('Zoho access token unavailable after refresh attempt.');
  }

  return _accessToken;
}

/**
 * Calls Zoho Accounts to refresh the access token using the stored refresh_token.
 * Updates in-memory cache and reschedules auto-refresh.
 */
export async function refreshAccessToken(): Promise<void> {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  // Try in-memory env first, then read from disk in case it was just written
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN || readEnvKey('ZOHO_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Zoho credentials. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN in .env'
    );
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });

  console.log('[ZohoAuth] 🔄 Refreshing Zoho access token...');

  const res = await fetch(`${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json() as any;

  if (!res.ok || data.error || !data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  _accessToken = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  console.log('[ZohoAuth] ✅ Access token refreshed. Expires in', data.expires_in, 'seconds.');
}

/**
 * Starts a background interval that refreshes the access token every 55 minutes.
 * Safe to call multiple times — cancels any existing timer first.
 */
export function scheduleTokenRefresh(): void {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
  }

  _refreshTimer = setInterval(async () => {
    try {
      await refreshAccessToken();
    } catch (err) {
      console.error('[ZohoAuth] ❌ Background token refresh failed:', err);
    }
  }, TOKEN_TTL_MS);

  // Allow Node.js to exit even if this timer is active
  if (_refreshTimer.unref) {
    _refreshTimer.unref();
  }

  console.log(`[ZohoAuth] ⏱ Auto-refresh scheduled every ${TOKEN_TTL_MS / 60000} minutes.`);
}

/**
 * Returns current token status (for health/debug endpoints — never expose tokens).
 */
export function getTokenStatus(): {
  isConfigured: boolean;
  hasValidToken: boolean;
  expiresInSeconds: number;
} {
  const hasRefreshToken = Boolean(
    process.env.ZOHO_REFRESH_TOKEN || readEnvKey('ZOHO_REFRESH_TOKEN')
  );

  return {
    isConfigured: Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && hasRefreshToken),
    hasValidToken: Boolean(_accessToken && _tokenExpiresAt > Date.now()),
    expiresInSeconds: _tokenExpiresAt > Date.now() ? Math.round((_tokenExpiresAt - Date.now()) / 1000) : 0,
  };
}
