import { generateTrendSitemap } from './src/trend-sitemap.js';
import { autoIndex } from './src/search-engine.js';

async function runSitemapAndIndexing() {
  const host = 'domainanda.com';

  const targetUrls = await generateTrendSitemap(host, 'topik trends');
  
  if (targetUrls.length === 0) {
    return;
  }

  const result = await autoIndex({
    urls: targetUrls,
    options: {
      siteHost: host,
      googleCredentialsPath: './config/google.json',
      indexNowApiKey: 'kunci_indexnow_anda_di_sini'
    }
  });
}

runSitemapAndIndexing();
