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

const template = readFileSync(join(distDir, "index.html"), "utf-8");
if (!template.includes(ROOT_DIV)) {
  throw new Error(`prerender: '${ROOT_DIV}' not found in dist/index.html`);
}

const { render } = await import(ssrEntry);

for (const route of ROUTES) {
  const { html, head } = await render(route.url, "it");
  const page = template
    .replace(ROOT_DIV, `<div id="root">${html}</div>`)
    .replace("</head>", `${head}</head>`);

  const outPath = join(distDir, route.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, page, "utf-8");
  console.log(`✓ prerendered ${route.url} -> dist/${route.out}`);
}

// The SSR bundle is a build artifact only; remove it from the shipped image.
rmSync(ssrDir, { recursive: true, force: true });
console.log("✓ prerender complete");
