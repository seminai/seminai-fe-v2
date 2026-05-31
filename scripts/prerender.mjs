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
const ROUTES = [
  { url: "/", out: "index.html" },
  { url: "/privacy-policy", out: "privacy-policy/index.html" },
  { url: "/cookie-policy", out: "cookie-policy/index.html" },
  { url: "/terms-of-service", out: "terms-of-service/index.html" },
];

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

const { render } = await import(ssrEntry);

for (const route of ROUTES) {
  const { html, head } = await render(route.url, "it");
  const body = html.replace(RESOURCE_HINT_LINK, "");
  const page = template
    .replace(ROOT_DIV, `<div id="root">${body}</div>`)
    .replace("</head>", `${head}</head>`);

  const outPath = join(distDir, route.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, page, "utf-8");
  console.log(`✓ prerendered ${route.url} -> dist/${route.out}`);
}

// The SSR bundle is a build artifact only; remove it from the shipped image.
rmSync(ssrDir, { recursive: true, force: true });
console.log("✓ prerender complete");
