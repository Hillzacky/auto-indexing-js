import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import { autoIndex } from './index.js';

// Buat mock berkas sitemap lokal untuk simulasi pengujian
const mockXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://sitemaps.org">
   <url>
      <loc>https://testdomain.com</loc>
      <lastmod>2026-01-01</lastmod>
   </url>
   <url>
      <loc>https://testdomain.com</loc>
      <lastmod>2026-02-01</lastmod>
   </url>
</urlset>`;

fs.writeFileSync('./mock-sitemap.xml', mockXml);

test('Validasi kegagalan jika siteHost tidak disertakan', async () => {
  const result = await autoIndex({ urls: ['https://testdomain.com'] });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, 'siteHost missing');
});

test('Validasi kegagalan jika tidak ada URL valid ditemukan', async () => {
  const result = await autoIndex({ 
    urls: ['bukan-url-valid'], 
    options: { siteHost: 'testdomain.com' } 
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, 'No valid URLs');
});

test('Ekstrak dan sortir URL dari sitemap XML lokal', async () => {
  const result = await autoIndex({
    xmlSource: './mock-sitemap.xml',
    xmlLimit: 1,
    options: { siteHost: 'testdomain.com' }
  });
  
  // Karena tidak ada API credentials, status sukses tapi tidak ada task engine berjalan
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.summary.unique_valid, 1); // Terpotong oleh limit
});

// Bersihkan berkas tiruan setelah selesai pengujian
test.after(() => {
  if (fs.existsSync('./mock-sitemap.xml')) fs.unlinkSync('./mock-sitemap.xml');
});
