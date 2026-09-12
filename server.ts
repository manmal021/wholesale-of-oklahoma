/**
 * server.ts  — Production Express server for Wholesale of Oklahoma
 *
 * Responsibilities:
 *  1. Serve the built Vite React frontend from /dist
 *  2. Expose the /api/* routes (inventory, OAuth callback, webhooks, orders)
 *  3. Start the Zoho token auto-refresh background loop on startup
 *
 * Usage:
 *  Dev:   npm run dev          (Vite handles API via plugin, no separate server needed)
 *  Prod:  npm run build && npm start
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env before importing anything that reads process.env
dotenv.config();

import { apiRouter } from './src/server/apiRouter.js';
import { scheduleTokenRefresh, refreshAccessToken } from './src/server/zohoAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = Number(process.env.PORT || 3000);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ──────────────────────────────────────────────────────────────
// /api/inventory/*, /api/zoho/*
app.use('/api', apiRouter);

// ── Static Frontend ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback — all non-API routes serve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Boot ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🟢 Wholesale of Oklahoma server running on http://localhost:${PORT}`);
    console.log(`   NODE_ENV : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Zoho DC  : ${process.env.ZOHO_DC || 'com'}`);

    // Start background Zoho token refresh if credentials are present
    if (
      process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_REFRESH_TOKEN
    ) {
      console.log('   Zoho     : ✅ Credentials found — starting token refresh loop...');
      // Initial refresh, then schedule every 55 min
      refreshAccessToken()
        .then(() => {
          scheduleTokenRefresh();
          console.log('   Zoho     : ✅ Access token ready.');
        })
        .catch((e) => {
          console.error('   Zoho     : ❌ Initial token refresh failed:', e.message);
          console.error('              Check ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN in .env');
        });
    } else {
      console.log('   Zoho     : ⚠  Credentials not set — running with seed catalog.');
      console.log('              Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID in .env');
    }
  });
}

export default app;
