import { generateTrendSitemap } from './src/trend-sitemap.js';
import { autoIndex } from './src/search-engine.js';

const HOST = 'domainanda.com';
const INTERVAL_JAM = 4; // Atur interval eksekusi otomatis (misal: setiap 4 jam sekali)

async function eksekusiSistemOtomatis() {
  const waktuSekarang = new Date().toISOString();
  
  // 1. Ambil tren terpopuler, buat halaman parsial, dan update sitemap.xml
  const targetUrls = await generateTrendSitemap(HOST, 'teknologi');
  
  if (!targetUrls || targetUrls.length === 0) {
    return;
  }

  // 2. Kirim URL baru hasil ekstraksi tren ke Google, IndexNow, dan Baidu secara paralel
  const result = await autoIndex({
    urls: targetUrls,
    options: {
      siteHost: HOST,
      googleCredentialsPath: './config/google.json',
      indexNowApiKey: 'kunci_indexnow_anda_di_sini'
    }
  });
}

// Fungsi utama untuk menjalankan loop interval tanpa memory leak
function jalankanCron() {
  // Jalankan eksekusi pertama kali saat skrip dinyalakan
  eksekusiSistemOtomatis();

  // Atur perulangan berdasarkan interval waktu yang ditentukan
  setInterval(eksekusiSistemOtomatis, INTERVAL_JAM * 60 * 60 * 1000);
}

jalankanCron();
