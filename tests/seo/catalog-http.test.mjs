import { test, after } from "node:test";
import assert from "node:assert/strict";
const base = process.env.SEO_CATALOG_BASE ?? "http://127.0.0.1:4322";
const control = (mode) => fetch(`http://127.0.0.1:9876/__control?mode=${mode}`);
after(() => control("published"));
test("catalogue serves source HTML, pagination, language and noindex filters", async () => {
  await control("published");
  let response = await fetch(`${base}/en/rules/`);
  let html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<html lang="en"/);
  assert.match(html, /Synthetic public rule 1/);
  assert.match(html, /page=2/);
  assert.match(response.headers.get("cache-control"), /s-maxage=60/);
  response = await fetch(`${base}/en/rules/?page=2`);
  html = await response.text();
  assert.match(html, /Synthetic public rule 53/);
  assert.doesNotMatch(html, />Synthetic public rule 1</);
  response = await fetch(`${base}/regole/?search=synthetic`);
  assert.match(await response.text(), /noindex, follow/);
});
test("modified and unpublished rules are reflected inside the two-minute bound", async () => {
  await control("updated");
  let response = await fetch(`${base}/regole/synthetic-rule-1/`);
  assert.match(await response.text(), /Synthetic revised rule/);
  await control("removed");
  response = await fetch(`${base}/regole/synthetic-rule-1/`);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("upstream outages are 503, never a successful empty page or sitemap", async () => {
  await control("outage");
  for (const path of ["/regole/", "/sitemap-rules.xml"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "60");
  }
});
test("unknown paths, markdown canonical and complete sitemap are correct", async () => {
  await control("published");
  let response = await fetch(`${base}/regole/nonexistent/`);
  assert.equal(response.status, 404);
  response = await fetch(`${base}/en/rules/synthetic-rule-1/`, {
    headers: { Accept: "text/markdown" },
  });
  assert.match(response.headers.get("content-type"), /text\/markdown/);
  assert.match(
    response.headers.get("link"),
    /https:\/\/seminai.tech\/en\/rules\/synthetic-rule-1\//,
  );
  response = await fetch(`${base}/sitemap-rules.xml`);
  const xml = await response.text();
  assert.equal((xml.match(/<loc>/g) ?? []).length, 108);
  assert.doesNotMatch(xml, /lastmod/);
});
