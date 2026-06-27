# auto-indexing-js
Library Node.js (Zero-Dependencies) untuk submit URL massal ke Google, IndexNow (Bing, Yandex, dll), dan Baidu.

## Input Skema (JSON)```json
{
  "xmlSource": "https://domain.com",
  "xmlLimit": 50,
  "urls": ["https://domain.com"],
  "options": {
    "siteHost": "domain.com",
    "googleCredentialsPath": "./config/google.json",
    "indexNowApiKey": "api_key_bing",
    "baiduToken": "token_baidu"
  }
}
```
## Output Skema (JSON)```json
{
  "success": true,
  "summary": { "total": 2, "unique_valid": 2 },
  "details": {
    "google": [{ "url": "https://...", "status": "success", "msg": "Submitted" }],
    "indexNow": [{ "url": "https://...", "status": "success", "msg": "Submitted via IndexNow" }]
  }
}
```
## Cara Pakai```javascript
import { autoIndex } from './index.js';

const res = await autoIndex({
  xmlSource: "./sitemap.xml",
  options: { siteHost: "domain.com", indexNowApiKey: "key_anda" }
});
```

