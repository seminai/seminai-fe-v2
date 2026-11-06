import { createServer } from "node:http";
createServer(async (request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  const port =
    /^\/(?:regole(?:\/|$)|en\/rules(?:\/|$)|catalog-assets\/|sitemap-rules.xml)/.test(
      path,
    )
      ? 8769
      : 8765;
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
}).listen(8770, "127.0.0.1", () =>
  console.log("Unified noindex preview on 127.0.0.1:8770"),
);
