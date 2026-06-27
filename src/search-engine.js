import fs from 'fs';
import crypto from 'crypto';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function retryFetch(url, opt, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, opt);
      if (![429, 500, 502, 503, 504].includes(res.status) || i === retries - 1) return res;
    } catch (e) {
      if (i === retries - 1) throw e;
    }
    await wait(delay);
    delay *= 2;
  }
}

function parseXml(xml, limit) {
  const blocks = xml.match(/<(url|sitemap)>[\s\S]*?<\/\1>/g) || [];
  const items = blocks.map(b => ({
    url: (b.match(/<loc>(.*?)<\/loc>/) || [])[1]?.trim(),
    time: new Date((b.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1] || 0).getTime()
  })).filter(i => i.url);
  items.sort((a, b) => b.time - a.time);
  const urls = items.map(i => i.url);
  return limit ? urls.slice(0, limit) : urls;
}

function makeJwt(creds) {
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const p = Buffer.from(JSON.stringify({
    iss: creds.client_email, scope: 'https://googleapis.com',
    aud: 'https://googleapis.com', exp: now + 3600, iat: now
  })).toString('base64url');
  const s = crypto.createSign('RSA-SHA256').update(`${h}.${p}`).sign(creds.private_key, 'base64url');
  return `${h}.${p}.${s}`;
}

async function doGoogle(urls, path) {
  const resList = [];
  try {
    const creds = JSON.parse(fs.readFileSync(path, 'utf-8'));
    const tRes = await retryFetch('https://googleapis.com', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: makeJwt(creds) })
    });
    const tData = await tRes.json();
    if (!tRes.ok) throw new Error(tData.error_description);
    
    for (const url of urls) {
      try {
        const r = await retryFetch('https://googleapis.com', {
          method: 'POST', headers: { Authorization: `Bearer ${tData.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, type: 'URL_UPDATED' })
        });
        resList.push({ url, status: r.ok ? 'success' : 'failed', msg: r.ok ? 'Submitted' : (await r.json()).error?.message });
      } catch (e) { resList.push({ url, status: 'failed', msg: e.message }); }
    }
  } catch (e) { urls.forEach(url => resList.push({ url, status: 'failed', msg: e.message })); }
  return resList;
}

async function doIndexNow(urls, host, key) {
  try {
    const r = await retryFetch('https://indexnow.org', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls })
    });
    return urls.map(url => ({ url, status: r.ok ? 'success' : 'failed', msg: r.ok ? 'Submitted via IndexNow' : `HTTP ${r.status}` }));
  } catch (e) { return urls.map(url => ({ url, status: 'failed', msg: e.message })); }
}

async function doBaidu(urls, host, token) {
  try {
    const r = await retryFetch(`http://baidu.com{host}&token=${token}`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: urls.join('\n') });
    const d = await r.json();
    return urls.map(url => ({ url, status: r.ok && d.success ? 'success' : 'failed', msg: d.message || `Remain: ${d.remain || 0}` }));
  } catch (e) { return urls.map(url => ({ url, status: 'failed', msg: e.message })); }
}

export async function autoIndex(req) {
  let combined = [...(req.urls || [])];
  const opt = req.options || {};
  if (!opt.siteHost) return { success: false, error: 'siteHost missing' };

  if (req.xmlSource) {
    try {
      let xml = '';
      if (req.xmlSource.startsWith('http')) {
        const r = await retryFetch(req.xmlSource);
        xml = await r.text();
      } else { xml = fs.readFileSync(req.xmlSource, 'utf-8'); }
      combined = combined.concat(parseXml(xml, req.xmlLimit || 100));
    } catch (e) { return { success: false, error: `XML error: ${e.message}` }; }
  }

  const valid = [...new Set(combined.filter(u => { try { new URL(u); return true; } catch { return false; } }))];
  if (!valid.length) return { success: false, error: 'No valid URLs' };

  const tasks = [], keys = [];
  if (opt.googleCredentialsPath) { tasks.push(doGoogle(valid, opt.googleCredentialsPath)); keys.push('google'); }
  if (opt.indexNowApiKey) { tasks.push(doIndexNow(valid, opt.siteHost, opt.indexNowApiKey)); keys.push('indexNow'); }
  if (opt.baiduToken) { tasks.push(doBaidu(valid, opt.siteHost, opt.baiduToken)); keys.push('baidu'); }

  const taskRes = await Promise.all(tasks);
  const details = {};
  keys.forEach((k, i) => { details[k] = taskRes[i]; });

  return { success: true, summary: { total: combined.length, unique_valid: valid.length }, details };
}
