# Public navigation and skills catalogue styling

Review preview captured on 7 November 2026 from a local production build. No production deployment was performed for this change.

The primary navigation now contains How it works, What you can do, FAQ and News. Resources and AI skills remain in the footer. Entry links to the skills catalogue were also removed from the Resources page and the catalogue tabs. Direct URLs, internal pagination, breadcrumbs, language alternates and discovery remain accessible.

The header divider is transparent at the top and appears after scrolling, without changing the header height. The skills list and detail pages reuse the actual landing navigation, footer, cookie controls, typography and buttons. Italian and English rendering use a separate translation instance per request.

## Visual previews

| View | Preview |
| --- | --- |
| Italian catalogue, desktop | [skills-it.png](skills-it.png) |
| English catalogue, mobile | [skills-en.png](skills-en.png) |
| Italian detail, desktop | [detail-it.png](detail-it.png) |
| English detail, mobile | [detail-en.png](detail-en.png) |
| Header at the top | [header-top.png](header-top.png) |
| Header after scrolling | [header-scrolled.png](header-scrolled.png) |

## Verification

- Static site TypeScript, build, prerendering and agent-document generation passed.
- Astro type/check and catalogue production build passed (zero diagnostics).
- Changed TypeScript/TSX files passed ESLint; Worker dry run passed.
- 11 browser checks passed, including desktop/mobile navigation, scroll divider, loaded logos, hydration, URL-based English, cookie controls, JavaScript-free skill pages and mocked demo submissions.
- 10 catalogue unit checks, 15 static/routing checks and 9 catalogue HTTP checks passed. HTTP fixtures cover pagination beyond 50 items, stale translations, removal, unavailable APIs, hostile text and Markdown parity.
- The public-source snapshot produced 100 HTML detail pages and 100 equivalent Markdown pages for 50 skills in IT/EN, with 106 sitemap entries. Titles, complete instructions, canonical links, language alternates and JSON-LD matched the versioned translations.
- Local unified previews returned `X-Robots-Tag: noindex, nofollow`. Public source definitions and synthetic fixtures were used; no authenticated records or real demo emails were used.

## Local review

Install dependencies at the repository root and in `catalog/`, build both outputs, and start the catalogue with an anonymous API source. `scripts/preview-seo.mjs` joins the catalogue and static previews using `SEO_CATALOG_PORT`, `SEO_STATIC_PORT` and `SEO_PREVIEW_PORT`. For Astro development mode, set `SEO_CATALOG_DEV=1` to proxy its module assets too. Keep Wrangler state outside `catalog/dist` when rebuilding a running compiled preview.

## Future release and rollback

Publish the catalogue Worker first, then the static site, so both use the shared public components. This UI change requires no backend or gateway update. After release, check `/skills/`, `/en/skills/`, a detail page, `/regole/`, Markdown and the skills sitemap. For rollback, restore the previous catalogue Worker version and static artifact together.

Clarice should review the IT/EN appearance, footer entry points, language switch and demo path before merge.
