import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import site from "../../config/public-site.json" with { type: "json" };
const htmlFor = (route) =>
  readFileSync(
    `dist/${route === "/" ? "" : route.replace(/^\//, "").replace(/\/$/, "") + "/"}index.html`,
    "utf8",
  );
test("all canonical routes ship a complete HTML document and a markdown equivalent", () => {
  for (const route of site.routes) {
    const html = htmlFor(route);
    assert.match(html, /<h1[\s>]/, route);
    assert.match(html, /rel="canonical"/, route);
    assert.ok(existsSync(`dist${site.markdown[route]}`), route);
  }
});
test("English pages are pre-rendered in English independently of stored app language", () => {
  const html = htmlFor("/en/");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /canonical" href="https:\/\/seminai.tech\/en\/"/);
  assert.doesNotMatch(html, /Seminai — Piattaforma AI/);
});
test("unknown page output is a noindex document", () => {
  assert.match(
    readFileSync("dist/404.html", "utf8"),
    /name="robots" content="noindex, nofollow"/,
  );
});
test("stable sitemap and agent context contain current routes and no retired domain", () => {
  for (const file of [
    "sitemap.xml",
    "sitemap-pages.xml",
    "llms.txt",
    "llms-full.txt",
  ])
    assert.doesNotMatch(
      readFileSync(`dist/${file}`, "utf8"),
      /app\.seminai\.app/,
      file,
    );
  assert.match(readFileSync("dist/sitemap.xml", "utf8"), /sitemap-rules.xml/);
  assert.match(
    readFileSync("dist/llms.txt", "utf8"),
    /https:\/\/seminai.tech\/regole\//,
  );
});
test("every legacy asset target and article redirect exists in the canonical output", () => {
  for (const [from, to] of Object.entries(site.redirects))
    if (!to.startsWith("/regole"))
      assert.ok(
        existsSync(`dist${to.endsWith("/") ? to + "index.html" : to}`),
        `${from} → ${to}`,
      );
});
