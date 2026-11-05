import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  routePublicRequest,
  wantsMarkdown,
  isCataloguePath,
} from "../../cloudflare/public-routing.js";
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test("does not negotiate markdown when q=0", () => {
  assert.equal(
    wantsMarkdown(
      new Request("https://seminai.tech/", {
        headers: { Accept: "text/markdown;q=0, text/html" },
      }),
    ),
    false,
  );
  assert.equal(
    wantsMarkdown(
      new Request("https://seminai.tech/", {
        headers: { Accept: "text/markdown; q=0.7" },
      }),
    ),
    true,
  );
});
test("normalises existing routes and preserves attribution", async () => {
  const response = await routePublicRequest(
    new Request("https://seminai.tech/en?utm_source=example"),
  );
  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("Location"),
    "https://seminai.tech/en/?utm_source=example",
  );
});
test("markdown has an HTML canonical and separate Accept variant", async () => {
  globalThis.fetch = async (request) => {
    assert.equal(
      new URL(request.url).pathname,
      "/news/dati-sparsi-azienda-agricola.md",
    );
    return new Response("# Farm data");
  };
  const response = await routePublicRequest(
    new Request("https://seminai.tech/news/dati-sparsi-azienda-agricola/", {
      headers: { Accept: "text/markdown" },
    }),
  );
  assert.match(
    response.headers.get("Link"),
    /https:\/\/seminai.tech\/news\/dati-sparsi-azienda-agricola\/.*canonical/,
  );
  assert.match(response.headers.get("Vary"), /Accept/);
  assert.match(response.headers.get("Content-Type"), /text\/markdown/);
});
test("missing public paths produce a real noindex 404", async () => {
  globalThis.fetch = async () => new Response("<h1>Not found</h1>");
  const response = await routePublicRequest(
    new Request("https://seminai.tech/news/unknown-missing-slug/"),
  );
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex");
});
test("catalogue requests never forward private session credentials", async () => {
  const binding = {
    fetch: async (request) => {
      assert.equal(request.headers.get("Cookie"), null);
      assert.equal(request.headers.get("Authorization"), null);
      return new Response("public catalogue", {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
        },
      });
    },
  };
  const response = await routePublicRequest(
    new Request("https://seminai.tech/en/rules/", {
      headers: {
        Cookie: "synthetic-session",
        Authorization: "Bearer synthetic",
      },
    }),
    { CATALOG: binding },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control"), /s-maxage=60/);
});
test("a missing catalogue binding fails closed instead of showing the homepage", async () => {
  const response = await routePublicRequest(
    new Request("https://seminai.tech/regole/"),
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(isCataloguePath("/regolamenti/"), false);
});
