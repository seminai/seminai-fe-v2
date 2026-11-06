# Public AI skills: review and release

This change prepares a separate bilingual public skills catalogue. It does not merge or deploy either PR. Clarice's GitHub identity was confirmed as `Clari222`; request her review on both linked PRs. Content approval has not been recorded.

## Behavior and ownership

- `seminai-fe-v2` owns `/skills/`, `/en/skills/`, detail pages, Markdown equivalents, discovery, gateway routing and the existing Astro catalogue Worker. Both catalogues share their base styles and expose separate navigation and counts.
- Skills remain workflows, separate from rules and production specifications. Viewing a definition does not execute it. Demo links retain the existing request-and-manual-confirmation flow.
- Only anonymous public APIs determine availability. Private records, creator identities and source-rule metadata are not rendered or copied into the catalogue. Nothing changes `isPublic`, status, workspace membership or application permissions.
- There are 20 entries per page. Search traverses all public list pages before applying current IT/EN translations, matching titles and descriptions in either language. There is no 50-entry publication cap.
- `catalog/src/content/skills.json` contains the 50 initial full IT/EN definitions. See [translation review](PUBLIC_SKILLS_TRANSLATIONS.md), [URL inventory](PUBLIC_SKILLS_URLS.md) and [preview evidence](seo-preview/skills/).

## Backend dependency and translation freshness

The companion backend patch preserves the existing endpoint paths and pagination envelope. It adds one backward-compatible field, `sourceFingerprint`, to public skill list/detail items: lowercase SHA-256 of UTF-8 `JSON.stringify([name, description, instructions])`. The hash is independent of views, timestamps, IDs, creators and associated rules.

This field lets the public list and sitemap validate the full translation without an N+1 sequence of detail requests. Detail rendering independently hashes the current returned source. A missing fingerprint from an older backend cannot validate a list translation; publish the backend patch before exposing the new routes.

Translations have a list fingerprint for name/description and a full-content fingerprint. They apply only to a currently public item with matching source content. A changed or newly published source without matching translations is shown as original text with an explicit pending-review notice. Its detail page is `noindex` and absent from the sitemap. Retired/private items return 404 even if a local translation exists.

The backend patch also sets `Cache-Control: no-store`, removes the detail GET counter write and adds `id` as the final pagination sort key. It requires no schema migration. Historical `updatedAt` values are not published as editorial revision dates.

## SEO, discovery and cache

- Initial HTML, metadata and JSON-LD are generated from the same localized presentation data. URLs select the language, including the first request with JavaScript disabled and an Italian browser locale.
- Canonicals are self-referencing; language alternates use reciprocal `it`/`en` links. Valid numbered pages have their own canonical. Search results and invalid/empty pages are not indexed.
- The skills sitemap traverses the live public list and includes only current translated detail pages, plus valid catalogue pagination. The initial 50-skill snapshot yields 100 detail URLs and 6 list URLs.
- Explicit `.md` endpoints and negotiated Markdown return the HTML canonical. The gateway forwards negotiated requests to the `.md` URL, separating format cache keys while preserving query parameters. Responses include `Vary: Accept`.
- Successful catalogue responses have `max-age=0, s-maxage=60, must-revalidate`. Origin API responses are not cached; no stale-while-revalidate layer is added. Errors use `no-store`, with `Retry-After: 60` for 503.
- `llms.txt` links to both live skill catalogues. Skill instructions are not copied into `llms-full.txt`. The existing crawler/training policy is unchanged.

## Local verification and preview

Validation completed locally: website/backend production builds, Astro/type checks, changed-file ESLint, 10 catalogue unit checks, 15 routing/static-output checks, 5 skill HTTP checks and 4 rule regression checks against development and compiled Workers, 9 targeted backend checks and 9 browser flows. Both Worker deployment dry-runs passed. The editorial sweep checked all 100 HTML and 100 Markdown detail pages and the 106-entry sitemap against the public-source snapshot. Automatic demo tests use mocked email endpoints; no AI inference or real email is required.

The anonymous production snapshot matched all 50 official backend seed definitions exactly at implementation time. This verifies the source selection, not agronomic correctness or Clarice's approval. Human review must confirm translation meaning, operating limits, capability descriptions and demo copy.

Synthetic lifecycle tests cover 53 skills, pagination, missing/private items, changed instructions, malformed API payloads, outages, hostile text and a true empty catalogue. The review screenshots instead use the 50 public definitions and an empty rules fixture, matching the audited catalogue composition. These are local previews, not evidence of deployment.

Reproduce with Node 24 and installed dependencies. In the backend checkout, export the official seed to a temporary JSON file using `tsx`; do not export customer records or credentials. Start the fixture with that file only for editorial review:

```sh
SEO_SKILLS_PUBLIC_SNAPSHOT=/tmp/seminai-public-skills-source.json node scripts/catalog-fixture-server.mjs
```

For lifecycle tests, the fixture defaults to synthetic records. Configure the ignored `catalog/.dev.vars` with `HUB_API_BASE_URL="http://127.0.0.1:9876"`. Start Astro with one explicit port argument:

```sh
cd catalog
npx astro dev --port 4382 --host 127.0.0.1
```

In separate terminals from the frontend repository root:

```sh
npm run preview -- --host 127.0.0.1 --port 8785
SEO_CATALOG_PORT=4382 SEO_STATIC_PORT=8785 node scripts/preview-seo.mjs
```

Review `http://127.0.0.1:8770/skills/` and `/en/skills/`; the unified preview sends `X-Robots-Tag: noindex, nofollow`. For the editorial sweep, set fixture mode to `editorial` through its loopback-only `/__control?mode=editorial` endpoint, then run:

```sh
SEO_CATALOG_BASE=http://127.0.0.1:4382 node scripts/check-skills-editorial.mjs
SEO_STATIC_BASE=http://127.0.0.1:8785 SEO_SKILLS_EDITORIAL=1 npm run test:seo:browser
```

For the compiled Worker, build first and use `catalog/dist/server/wrangler.json`, not the source configuration's virtual Astro entrypoint:

```sh
npm run catalog:build
npx wrangler dev --config catalog/dist/server/wrangler.json --local --port 4383 --var HUB_API_BASE_URL:http://127.0.0.1:9876
```

## Future deployment and rollback

1. After review and a separate release instruction, publish the backend patch on the actual serving baseline. `main` contains unrelated migrations absent from production: do not bundle or apply them for this change.
2. Confirm anonymous skill responses have `sourceFingerprint` and `no-store`, and detail reads leave views/timestamps unchanged.
3. Build and deploy the catalogue Worker using `catalog/dist/server/wrangler.json`; preserve the current public API origin and assets binding.
4. Publish the gateway routing, then the static website and discovery links. Purge affected catalogue HTML, Markdown and sitemap caches. No app/legacy-Hub deployment is needed.
5. Verify the live public count, IT/EN details, query-preserving 301 aliases, Markdown formats, canonicals and sitemap. Exercise publish/change/unpublish using an isolated synthetic staging item and verify the two-minute limit. Local header/lifecycle checks do not prove production propagation.

Retain the prior Worker versions and static artifact. Roll back static links and gateway routing before withdrawing new catalogue routes; the previous catalogue Worker remains available for rules. The backend patch is additive and migration-free and can remain in place; do not restore counter writes or the old one-hour cache as part of a frontend rollback.

After deployment, inspect 404/503 rates, public API latency and demo errors for 48 hours. Review sitemap ingestion and representative canonical selection after 7 and 30 days. Search Console access, live crawler behavior, production propagation and traffic outcomes are not established by these local tests.
