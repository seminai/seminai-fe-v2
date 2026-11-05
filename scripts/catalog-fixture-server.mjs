import { createServer } from "node:http";
let mode = "published";
const rules = Array.from({ length: 53 }, (_, index) => ({
  id: `synthetic-${index + 1}`,
  slug: `synthetic-rule-${index + 1}`,
  name: `Synthetic public rule ${index + 1}`,
  description:
    "Synthetic fixture for catalogue acceptance tests. No customer data.",
  category: "STANDARD",
  region: "Synthetic region",
  version: "test-1",
  creatorName: "Synthetic publisher",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  sourceUrl: "https://example.invalid/source",
  sourceDocument: "Synthetic reference",
  validFrom: null,
  validUntil: null,
  isTemplate: true,
}));
createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/__control") {
    mode = url.searchParams.get("mode") ?? "published";
    response.end(JSON.stringify({ mode }));
    return;
  }
  if (mode === "outage") {
    response.statusCode = 503;
    response.end("{}");
    return;
  }
  const items =
    mode === "removed"
      ? rules.slice(1)
      : rules.map((rule) =>
          mode === "updated" && rule.id === "synthetic-1"
            ? { ...rule, name: "Synthetic revised rule" }
            : rule,
        );
  let data;
  if (url.pathname === "/public/rules/categories")
    data = { categories: [{ category: "STANDARD", count: items.length }] };
  else if (url.pathname === "/public/rules") {
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const filtered = items.filter(
      (rule) =>
        (!url.searchParams.get("category") ||
          rule.category === url.searchParams.get("category")) &&
        (!url.searchParams.get("search") ||
          rule.name
            .toLowerCase()
            .includes(url.searchParams.get("search").toLowerCase())),
    );
    data = {
      rules: {
        items: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length,
        page,
        limit,
        hasNextPage: page * limit < filtered.length,
      },
    };
  } else {
    const rule = items.find(
      (rule) => url.pathname === `/public/rules/${rule.slug}`,
    );
    if (!rule) {
      response.statusCode = 404;
      response.end("{}");
      return;
    }
    data = { rule };
  }
  response.end(JSON.stringify({ status: "success", data }));
}).listen(9876, "127.0.0.1", () =>
  console.log("Synthetic public API on 127.0.0.1:9876"),
);
