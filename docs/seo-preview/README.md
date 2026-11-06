# SEO/GEO review preview

These screenshots show the local production build. The catalogue uses synthetic public API fixtures; it contains no customer data. The code is a release candidate pending Clarice's editorial/product review. No production traffic, DNS or Cloudflare route has changed.

| Template | Screenshot |
| --- | --- |
| Italian homepage | [Home](home-it.png) |
| English product page | [Document OCR](commercial-en.png) |
| English article | [Extraction API](article-en.png) |
| Demo request | [Demo](demo-en.png) |
| Public catalogue | [Synthetic catalogue](catalogue-en.png) |

Mobile Lighthouse medians are recorded in [performance.json](performance.json). These are local lab measurements, not real-user p75 or INP. The source server must enable gzip, as the production static server configuration does. Do not benchmark while rebuilding files served by the preview.

## Run the review locally

Use Node 24, npm and Docker. From the website repository:

1. `npm ci --legacy-peer-deps && npm ci --prefix catalog && npm run build && npm run catalog:build`.
2. Start `node scripts/catalog-fixture-server.mjs` (anonymous synthetic API on 9876).
3. Start `npx wrangler dev --config catalog/dist/server/wrangler.json --port 8769 --var HUB_API_BASE_URL:http://127.0.0.1:9876`.
4. Serve `dist/` with the repository's `nginx.conf` on local port 8765 (container port 8080).
5. Start `node scripts/preview-seo.mjs`. Open `http://127.0.0.1:8770/` or `/en/`. The unified preview sends `X-Robots-Tag: noindex, nofollow`.

Validation: `npm run test:seo`, `npm test --prefix catalog`, `npm run catalog:check`, `npm run worker:check`. HTTP catalogue tests target the Astro development server on 4322 using `catalog/.dev.vars` with the synthetic API URL: run `npm run dev --prefix catalog` then `npm run test:catalog:http`. Browser checks use `npm run test:seo:browser` with Chrome installed; optionally set `SEO_CHROME_PATH`. All email requests are mocked, and analytics tests intercept the tag provider.

Remote preview is currently unavailable because the Cloudflare authentication session has expired. Reauthenticate before creating an isolated noindex preview; do not change production to work around this.

Current lab medians: home 87 / LCP 4.07s; article 91 / LCP 3.46s; commercial page 100 / LCP 0.75s; catalogue 100 / LCP 1.36s; rule 100 / LCP 1.20s. CLS ranges from 0 to 0.028; TBT is 0ms. Home and article LCP exceed the 2.5s field target in this mobile simulation. The field acceptance gate remains open; these scores do not establish real-user compliance.
