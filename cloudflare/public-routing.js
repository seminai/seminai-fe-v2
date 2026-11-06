import site from "../config/public-site.json" with { type: "json" };
const staticRoutes = new Set(site.routes);
const markdownRoutes = new Map(
  Object.entries(site.markdown).map(([html, md]) => [md, html]),
);
const cataloguePath = (path) =>
  path === "/regole" ||
  path.startsWith("/regole/") ||
  path === "/en/rules" ||
  path.startsWith("/en/rules/") ||
  path.startsWith("/catalog-assets/") ||
  path === "/sitemap-rules.xml";
export function wantsMarkdown(request) {
  return (request.headers.get("Accept") ?? "").split(",").some((item) => {
    const [type, ...parameters] = item.trim().split(";");
    const q = parameters
      .map((value) => value.trim())
      .find((value) => value.startsWith("q="));
    return (
      type.toLowerCase() === "text/markdown" && (!q || Number(q.slice(2)) > 0)
    );
  });
}
export function isCataloguePath(path) {
  return cataloguePath(path);
}
function canonicalHeaders(response, canonical, markdown = false) {
  const headers = new Headers(response.headers);
  if (canonical)
    headers.append("Link", `<${site.origin}${canonical}>; rel="canonical"`);
  headers.set(
    "Vary",
    Array.from(
      new Set([
        ...(headers.get("Vary") ?? "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        "Accept",
      ]),
    ).join(", "),
  );
  if (markdown) headers.set("Content-Type", "text/markdown; charset=utf-8");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
/** Routes only anonymous public resources; private app and MCP handlers keep their existing contracts. */
export async function routePublicRequest(request, env = {}) {
  if (!["GET", "HEAD"].includes(request.method)) return null;
  const url = new URL(request.url);
  const path = url.pathname;
  if (cataloguePath(path)) {
    if (["/regole", "/en/rules"].includes(path))
      return Response.redirect(`${site.origin}${path}/${url.search}`, 301);
    if (!env.CATALOG)
      return new Response("Catalogue temporarily unavailable", {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "60",
          "X-Robots-Tag": "noindex",
        },
      });
    const headers = new Headers(request.headers);
    headers.delete("Cookie");
    headers.delete("Authorization");
    const response = await env.CATALOG.fetch(
      new Request(request, { headers, redirect: "manual" }),
    );
    return response;
  }
  if (path === "/index.html" || path === "/en/index.html")
    return Response.redirect(
      `${site.origin}${path === "/index.html" ? "/" : "/en/"}${url.search}`,
      301,
    );
  const withSlash = path.endsWith("/") ? path : `${path}/`;
  if (!staticRoutes.has(path) && staticRoutes.has(withSlash))
    return Response.redirect(`${site.origin}${withSlash}${url.search}`, 301);
  const canonical =
    markdownRoutes.get(path) ?? (staticRoutes.has(path) ? path : null);
  if (canonical && (markdownRoutes.has(path) || wantsMarkdown(request))) {
    const target = new URL(site.markdown[canonical], url.origin);
    const response = await fetch(
      new Request(target, {
        method: request.method,
        headers: { Accept: "text/markdown" },
      }),
    );
    return canonicalHeaders(response, canonical, true);
  }
  if (canonical) return null;
  if (
    /\.(?:md|xml|json|txt|js|css|webp|png|jpg|svg|woff2|ico|webmanifest|xlsx|csv)$/.test(
      path,
    ) ||
    path.startsWith("/.well-known/") ||
    path.startsWith("/cdn-cgi/") ||
    path === "/mcp" ||
    /^\/(auth|dashboard|settings|workspace)(\/|$)/.test(path)
  )
    return null;
  const response = await fetch(
    new Request(new URL("/404.html", url.origin), { method: request.method }),
  );
  return new Response(response.body, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
