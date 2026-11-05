# SEO/GEO consolidation release runbook

## Ownership and dependencies

- seminai-fe-v2 owns public content, the static origin, gateway Worker and request-rendered Astro catalogue.
- seminai-fe-v3 ships the application and permanent legacy Hub redirects; its duplicate marketing build is retired.
- seminai-be-v2 serves the same OpenAPI object as Swagger at GET /openapi.json and prevents stale public-rule responses. Public GETs no longer increment counters or alter content timestamps.

Use the linked PRs together. Do not merge or deploy before Clarice confirms content, translations, product claims and the demo flow. Confirm the GitHub identity before sending a review notification; the discovered collaborator is Clari222.

## Pre-release evidence and human checks

- Save the deployed revisions, gateway configuration and last app image before cutover. Keep the previous build artefacts available.
- Compare every URL in SEO_GEO_URL_MAP.md, including no-slash aliases and query strings. Export all currently published rule slugs from the anonymous API and append their exact destination checks; no private or customer records belong in this repository.
- Review all 16 Italian and 16 English articles. Research references do not establish product performance. Publication dates are retained; only the five substantively revised articles have a new modification date.
- An agronomic/regulatory reviewer must verify the organic/copper article's current applicability and cited acts. No individual reviewer or approval has been invented. The editorial policy identifies Redazione Seminai as the current responsible organisation.
- Confirm the demo request message and supported product capabilities. No trial, free credits, universal accuracy, fixed API quota or certified conformity is promised.
- Record a Search Console/analytics baseline: selected canonicals, indexed pages, non-brand organic clicks, referring pages and successful demo requests. Access to those private properties is still required; no baseline values have been fabricated.

## Deploy in order

1. Publish the backend PR; GET/HEAD /openapi.json must return the Swagger schema without authentication. Verify public rule API Cache-Control is no-store.
2. Run `npm run catalog:build`, then deploy the generated Worker with `npx wrangler deploy --config catalog/dist/server/wrangler.json`. The file `catalog/.wrangler/deploy/config.json` is an adapter pointer, not a Wrangler configuration to pass directly. The Worker has only an assets binding and public configuration: no sessions, database, AI or account credentials. Deploy it before the gateway's CATALOG service binding.
3. Publish the static website and gateway Worker. Verify all new URLs, both languages, Markdown canonicals, variant cache separation and the dynamic rules sitemap. Pages must work before any legacy redirect is activated.
4. Deploy the app image with docker/hub-redirects.conf. Unknown legacy blog URLs return 404. Keep login, application and API routes working. Never redirect the entire application domain.
5. Align Cloudflare managed robots/bot settings with public/robots.txt: search/retrieval allowed, training opt-out retained. Remove contradictory managed injection; verify access using genuine crawler IPs in logs rather than a spoofed user-agent alone. Purge affected HTML, Markdown, sitemap and robots caches.
6. Submit https://seminai.tech/sitemap.xml in Search Console and inspect representative old/new URLs. This is a path migration; the application remains on its current subdomain. Maintain redirects indefinitely (at least twelve months).

The catalogue owns a maximum 60-second public edge cache. Origin reads bypass caching and credentials; do not layer a second cache or stale-while-revalidate policy. Verify publish/change/unpublish against a staging synthetic rule within two minutes. Upstream failure must be 503 with Retry-After, not a successful empty index. The sitemap traverses all API pages and omits untrustworthy content modification dates.

## Rollback

If a new target fails after redirects are live, restore the last working destination build and catalogue/gateway version. If that is impossible, revert app redirects before withdrawing destinations. Never leave a redirect pointing at an absent page. Restore public-rule response semantics without restoring an hour-long stale cache. Preserve the OpenAPI read-only endpoint; it does not change operational APIs or require a migration.

## Monitoring

At T+48h review HTTP 404/5xx, redirect loops, source API latency, crawler access and demo errors. At T+7d and T+30d review indexing/canonical selection and sitemap ingestion. At T+30d and T+60d compare non-brand organic traffic, valid demo requests and field Core Web Vitals, using the same locale/device segments as baseline.

Maintain a reproducible GEO sample: six Italian and six English questions covering logbook, document OCR, rules, professional review, integrations and the demo. Record engine, date, locale, cited URL and factual accuracy. Run manually or with separately authorised paid calls; never imply a ranking guarantee. Schedule dates only after the actual release date is known.

External gates still open: Clarice/product and qualified regulatory review, authenticated Search Console/analytics/log access, refreshed Cloudflare login, remote preview, actual cutover and post-release monitoring. Code and local tests cannot prove live crawler access or real-user p75/INP.

The existing public rules API does not expose source-language metadata. Catalogue cards explicitly identify the content as original and the language as unspecified; they never assert that every publisher document is Italian. Do not add an automatic translation or an invented language classification. Accurate per-document language labels require publisher metadata in a separately reviewed API change.

The live anonymous API inventory attempt on 2026-11-05 timed out after 15 seconds. The 66 exact mappings and dynamic slug-preserving route are prepared; the complete currently published rule/document inventory remains a cutover gate. `scripts/inventory-public-rules.mjs` captures it without user credentials or customer records and passed against 53 synthetic fixtures.

## Prepared PRs and local validation

Companion PRs: [backend #76](https://github.com/seminai/seminai-be-v2/pull/76) and [app #31](https://github.com/seminai/seminai-fe-v3/pull/31). The website PR is the coordinating review; companions remain drafts until their dependency gates are satisfied.

Local validation passed: the static production build and Node 24 Docker image build; 11 website routing/output checks; 4 catalogue unit checks (including 1,300 rules); 4 catalogue HTTP checks against both development and compiled Workers; 5 mocked browser flows; and all 66 redirect mappings with slash aliases and query preservation. Astro/type diagnostics, changed-file ESLint, Nginx syntax and both Worker deployment dry-runs passed. Backend validation passed 337 unit suites (2,262 tests, 10 skipped), 16 MCP suites (90 tests), TypeScript and targeted ESLint. Automatic tests sent no emails and made no AI inference calls.

The review screenshots and repeated mobile lab results are in `docs/seo-preview/`. The home/article lab LCP values are above 2.5s; this remains visible as a performance risk, and real-user p75/INP acceptance is still unverified. No remote infrastructure, production build, GitHub Actions job, email or review notification has been launched by this implementation.
