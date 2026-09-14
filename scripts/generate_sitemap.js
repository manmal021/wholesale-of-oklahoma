import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const file = fs.readFileSync(path.join(rootDir, 'src/lib/productDatabase.ts'), 'utf8');
const ids = [...new Set([...file.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]))];
const brands = [...new Set([...file.matchAll(/brand:\s*'([^']+)'/g)].map(m => m[1].toLowerCase().replace(/[^a-z0-9]+/g, '-')))];

const categories = [
  'disposable-vapes',
  'vape-mods-kits',
  'vape-juice',
  'pipes-glass',
  'thca-cbd-delta',
  'kratom',
  'novelties',
  'accessories'
];

const today = '2026-09-14';
const baseUrl = 'https://www.wholesaleofoklahoma.com';

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// Homepage
xml += `  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;

// Core Sections & Application
const sections = ['inventory', 'wholesale-application', 'contact'];
sections.forEach(sec => {
  xml += `  <url>
    <loc>${baseUrl}/${sec}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
});

// Categories
categories.forEach(cat => {
  xml += `  <url>
    <loc>${baseUrl}/categories/${cat}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
});

// Brands
brands.forEach(b => {
  if (b) {
    xml += `  <url>
    <loc>${baseUrl}/brands/${b}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
  }
});

// Products
ids.forEach(id => {
  xml += `  <url>
    <loc>${baseUrl}/products/${id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>\n`;
});

xml += '</urlset>\n';

const outPath = path.join(rootDir, 'public/sitemap.xml');
fs.writeFileSync(outPath, xml, 'utf8');
console.log(`Successfully generated ${outPath} with ${1 + sections.length + categories.length + brands.length + ids.length} URLs.`);
