/**
 * Build-time prerender. Runs after `vite build` (client) and `vite build --ssr`.
 * Renders each public route via the SSR `render()` and writes fully-populated static
 * HTML into dist/, so crawlers and AI agents that don't execute JS get the full content
 * and meta. The client bundle still hydrates these files on real visits.
 *
 * Writes only inside dist/. No browser required (pure renderToString).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const distDir = join(root, "dist");
const ssrDir = join(root, "dist-ssr");
const ssrEntry = pathToFileURL(join(ssrDir, "entry-server.js")).href;

// url -> output path (relative to dist/). nginx `try_files $uri $uri/ /index.html`
// serves `<route>/index.html` for `/<route>`.
// News routes (index + one page per article) come from the SSR bundle, see newsRoutes().

const SITE = "https://seminai.tech";

const ROOT_DIV = '<div id="root"></div>';

// React 19 injects resource-hint <link> tags (preload/modulepreload/…) INLINE in the
// body during renderToString. The client hoists them to <head> instead, so leaving them
// in the prerendered body causes a hydration mismatch (React error #418). Strip them —
// the client re-adds them to <head> on hydration. Landing components render no <link>.
const RESOURCE_HINT_LINK =
  /<link\b[^>]*\brel="(?:preload|modulepreload|stylesheet|preconnect|dns-prefetch|prefetch)"[^>]*>/gi;

const template = readFileSync(join(distDir, "index.html"), "utf-8");
if (!template.includes(ROOT_DIV)) {
  throw new Error(`prerender: '${ROOT_DIV}' not found in dist/index.html`);
}

const { render, newsRoutes, newsSitemap, staticRoutes } = await import(
  ssrEntry
);

const ROUTES = staticRoutes();
for (const route of [...ROUTES, ...newsRoutes()]) {
  const { html, head } = await render(route.url, route.lng);
  const body = html.replace(RESOURCE_HINT_LINK, "");
  const page = template
    .replace('<html lang="it">', `<html lang="${route.lng}">`)
    .replace(ROOT_DIV, `<div id="root">${body}</div>`)
    .replace("</head>", `${head}</head>`);

  const outPath = join(distDir, route.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, page, "utf-8");
  console.log(`✓ prerendered ${route.url} -> dist/${route.out}`);
}

// One sitemap index joins stable pages with the request-rendered public catalogue.
const staticEntries = ROUTES.map(({ url, lng }) => ({
  path: url,
  alternates: [],
  lang: lng,
}));
const sitemapEntries = [...staticEntries, ...newsSitemap()];
const urls = sitemapEntries
  .map(
    ({ path, lastmod, alternates }) =>
      `<url><loc>${SITE}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${alternates.map((alt) => `<xhtml:link rel="alternate" hreflang="${alt.hrefLang}" href="${SITE}${alt.path}" />`).join("")}</url>`,
  )
  .join("\n");
writeFileSync(
  join(distDir, "sitemap-pages.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`,
);
writeFileSync(
  join(distDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap><sitemap><loc>${SITE}/sitemap-rules.xml</loc></sitemap></sitemapindex>`,
);
const notFound = await render("/404/", "it");
writeFileSync(
  join(distDir, "404.html"),
  template
    .replace(
      ROOT_DIV,
      `<div id="root">${notFound.html.replace(RESOURCE_HINT_LINK, "")}</div>`,
    )
    .replace("</head>", `${notFound.head}</head>`),
);
writeFileSync(
  join(distDir, "public-routes.json"),
  JSON.stringify(sitemapEntries.map((entry) => entry.path)),
);
// The SSR bundle is a build artifact only; remove it from the shipped image.
rmSync(ssrDir, { recursive: true, force: true });
console.log("✓ prerender complete");
