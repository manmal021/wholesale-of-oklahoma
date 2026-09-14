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

import fs from 'fs';
import { PRODUCTS } from './src/lib/productDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

// ── Security Headers Middleware (OWASP A02 / A05) ──────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://db.onlinewebfonts.com; font-src 'self' https://fonts.gstatic.com https://db.onlinewebfonts.com data:; img-src 'self' data: https: blob:; media-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
  );
  next();
});

// ── Parsing Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── API Routes ──────────────────────────────────────────────────────────────
// /api/inventory/*, /api/zoho/*, /api/chat
app.use('/api', apiRouter);

// ── Static Frontend ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// ── SEO & SPA Route Handler ─────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Application build not found. Run npm run build.');
  }

  let html = fs.readFileSync(indexPath, 'utf8');

  // Dynamic Product Pre-rendering for Search Engine Crawlers & Direct URLs
  if (req.path.startsWith('/products/')) {
    const slug = decodeURIComponent(req.path.replace('/products/', '').split('?')[0].split('#')[0].trim());
    const product = PRODUCTS.find((p) => p.id === slug || p.sku.toLowerCase() === slug.toLowerCase());

    if (product) {
      const pageTitle = `${product.name} Wholesale | Wholesale of Oklahoma`;
      const desc = `Wholesale ${product.name} (${product.brand}). ${product.features.slice(0, 2).join('. ')}. Volume tiered pricing, central OKC warehouse, licensed Oklahoma B2B distributor.`;
      const canonicalUrl = `https://www.wholesaleofoklahoma.com/products/${product.id}`;

      html = html.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`);
      html = html.replace(/<meta name="description" content=".*?"/i, `<meta name="description" content="${desc}"`);
      html = html.replace(/<link rel="canonical" href=".*?"/i, `<link rel="canonical" href="${canonicalUrl}"`);

      // Inject Schema.org Product JSON-LD
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.imageUrl || 'https://www.wholesaleofoklahoma.com/mango-avatar.jpg',
        description: desc,
        sku: product.sku,
        brand: {
          '@type': 'Brand',
          name: product.brand,
        },
        offers: {
          '@type': 'Offer',
          availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          description: 'Wholesale pricing restricted to verified business accounts. Login to view pricing.',
          seller: {
            '@type': 'Organization',
            name: 'Wholesale of Oklahoma',
          },
        },
      };

      const schemaTag = `<script type="application/ld+json">${JSON.stringify(productSchema)}</script>`;
      html = html.replace('</head>', `  ${schemaTag}\n  </head>`);

      // Pre-rendered semantic crawler fallback inside root (Zero price leakage to public HTML)
      const crawlerBlock = `
        <noscript>
          <article style="max-width:800px;margin:2rem auto;padding:1rem;font-family:sans-serif;">
            <h1>${product.name}</h1>
            <p><strong>Brand:</strong> ${product.brand} | <strong>SKU:</strong> ${product.sku} | <strong>Category:</strong> ${product.category}</p>
            <p>${product.features.join('. ')}</p>
            <p><strong>Wholesale Pricing:</strong> Restricted to licensed retailers. Login or apply for an account to view pricing.</p>
            <nav aria-label="Breadcrumb">
              <a href="/">Home</a> &gt; <a href="/categories/${product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${product.category}</a> &gt; ${product.name}
            </nav>
          </article>
        </noscript>
      `;
      html = html.replace('<div id="root"></div>', `<div id="root">${crawlerBlock}</div>`);
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ── Boot ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
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
