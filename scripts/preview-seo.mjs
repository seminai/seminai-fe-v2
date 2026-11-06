import { createServer } from "node:http";
createServer(async (request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  const port =
    /^\/(?:regole(?:\/|$)|en\/rules(?:\/|$)|(?:en\/)?skills(?:\/|\.md$|$)|catalog-assets\/|sitemap-(?:rules|skills).xml)/.test(
      path,
    )
      ? Number(process.env.SEO_CATALOG_PORT ?? 8769)
      : Number(process.env.SEO_STATIC_PORT ?? 8765);
  try {
    const upstream = await fetch(`http://127.0.0.1:${port}${request.url}`, {
      method: request.method,
      redirect: "manual",
    });
    response.statusCode = upstream.status;
    for (const [k, v] of upstream.headers)
      if (
        !["transfer-encoding", "content-length", "content-encoding"].includes(k)
      )
        response.setHeader(k, v);
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.statusCode = 503;
    response.end("Local preview unavailable");
  }
}).listen(Number(process.env.SEO_PREVIEW_PORT ?? 8770), "127.0.0.1", () =>
  console.log(`Unified noindex preview on 127.0.0.1:${process.env.SEO_PREVIEW_PORT ?? 8770}`),
);
