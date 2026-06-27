import fs from 'fs';
import path from 'path';

/**
 * Mengambil berita terhangat dari Google News RSS
 */
async function fetchTrendingNews(topic = 'teknologi') {
  const url = `https://google.com{encodeURIComponent(topic)}&hl=id&gl=ID&ceid=ID:id`;
  const newsItems = [];

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const xmlText = await res.text();

    // Regex minimalis untuk mengambil data di dalam tag <item>
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let count = 0;

    while ((match = itemRegex.exec(xmlText)) !== null && count < 5) {
      const block = match[1];
      const title = (block.match(/<title>(.*?)<\/title>/) || [])[1];
      const link = (block.match(/<link>(.*?)<\/link>/) || [])[1];
      const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1];

      if (title && link) {
        // Buat slug ramah URL dari judul berita
        const slug = title.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 50);

        newsItems.push({ title, link, pubDate, slug });
        count++;
      }
    }
  } catch (e) {
    // Jika gagal, return array kosong agar sistem tidak crash
  }
  return newsItems;
}

/**
 * Membuat halaman HTML Parsial dengan Status Penjelasan untuk Bot Mesin Pencari
 */
function createPartialTrendPage(news, host) {
  const dir = path.resolve('./public/trends');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="index, follow">
  <title>${news.title} - Pembaruan Terkini</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
    .status-box { background: #e3f2fd; border-left: 5px solid #2196f3; padding: 15px; margin-bottom: 30px; border-radius: 4px; }
    .source-link { display: inline-block; margin-top: 15px; color: #1a73e8; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${news.title}</h1>
  
  <div class="status-box">
    <strong>ℹ️ Status Halaman: HTTP 202 (Accepted / Konten Parsial)</strong>
    <p>Informasi pada halaman ini dideteksi secara otomatis dari tren teratas. Tim redaksi kami sedang menyusun laporan mendalam dan memverifikasi data lapangan terkait topik ini. Halaman akan diperbarui secara otomatis secara berkala.</p>
  </div>

  <article>
    <h2>Ringkasan Awal Tren</h2>
    <p>Topik mengenai <strong>"${news.title}"</strong> terpantau sedang mengalami lonjakan interaksi yang tinggi di internet. Berdasarkan pencatatan waktu sistem, tren ini mulai didokumentasikan pada kurun waktu ${news.pubDate}.</p>
    
    <p>Untuk saat ini, Anda dapat memantau rujukan perkembangan berita eksternal melalui tautan resmi di bawah ini sembari menunggu artikel ulasan komprehensif kami diterbitkan sepenuhnya.</p>
    
    <a class="source-link" href="${news.link}" target="_blank" rel="noopener noreferrer">Baca Referensi Berita Asli &rarr;</a>
  </article>

  <footer>
    <hr style="border: 0; border-top: 1px solid #eee; margin-top: 50px;">
    <p style="font-size: 12px; color: #777;">Diproses otomatis oleh Sistem Agen Tren ${host} pada ${new Date().toISOString()}</p>
  </footer>
</body>
</html>`;

  fs.writeFileSync(path.join(dir, `${news.slug}.html`), htmlContent.trim());
}

/**
 * Fungsi Utama: Generate halaman, buat sitemap.xml, dan return daftar URL penuh
 */
export async function generateTrendSitemap(host, topic = 'teknologi') {
  const newsList = await fetchTrendingNews(topic);
  if (newsList.length === 0) return [];

  let xmlItems = '';
  const now = new Date().toISOString();
  const generatedUrls = [];

  newsList.forEach(news => {
    const fullUrl = `https://${host}/trends/${news.slug}.html`;
    generatedUrls.push(fullUrl);

    // 1. Buat file HTML parsialnya agar bot menemukan halaman berisi teks nyata
    createPartialTrendPage(news, host);

    // 2. Susun struktur item sitemap
    xmlItems += `
  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://sitemaps.org">${xmlItems}
</urlset>`;

  const publicDir = path.resolve('./public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml.trim());

  return generatedUrls;
}
