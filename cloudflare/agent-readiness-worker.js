const HOME_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</llms-full.txt>; rel="describedby"; type="text/plain"',
  '</.well-known/agent-skills/index.json>; rel="service-desc"; type="application/json"',
  '<https://seminai-be-v2-661301438659.europe-west1.run.app/api-docs>; rel="service-doc"; type="text/html"',
  '<https://seminai-be-v2-661301438659.europe-west1.run.app/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
].join(", ");

const API_CATALOG_PATH = "/.well-known/api-catalog";
const HOME_PATHS = new Set(["/", "/index.html"]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const isReadRequest = request.method === "GET" || request.method === "HEAD";

    if (isReadRequest && HOME_PATHS.has(url.pathname) && wantsMarkdown(request)) {
      return serveMarkdownHome(request);
    }

    const response = await fetch(request);
    const headers = new Headers(response.headers);

    if (isReadRequest && HOME_PATHS.has(url.pathname)) {
      addHomeDiscoveryHeaders(headers);
    }

    if (url.pathname === API_CATALOG_PATH) {
      headers.set("Content-Type", "application/linkset+json; charset=utf-8");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

async function serveMarkdownHome(request) {
  const markdownUrl = new URL("/index.md", request.url);
  const markdownRequest = new Request(markdownUrl, request);
  const markdownResponse = await fetch(markdownRequest);
  const markdown = request.method === "HEAD" ? "" : await markdownResponse.text();

  const headers = new Headers(markdownResponse.headers);
  addHomeDiscoveryHeaders(headers);
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.set("x-markdown-tokens", String(estimateMarkdownTokens(markdown)));

  return new Response(request.method === "HEAD" ? null : markdown, {
    status: markdownResponse.status,
    statusText: markdownResponse.statusText,
    headers,
  });
}

function addHomeDiscoveryHeaders(headers) {
  headers.set("Link", HOME_LINK_HEADER);
  appendVary(headers, "Accept");
}

function wantsMarkdown(request) {
  const accept = request.headers.get("Accept");
  if (!accept) return false;

  return accept
    .split(",")
    .map((part) => part.trim())
    .some((part) => {
      const [mediaType, ...params] = part.split(";").map((value) => value.trim());
      if (mediaType.toLowerCase() !== "text/markdown") return false;

      const q = params.find((param) => param.toLowerCase().startsWith("q="));
      return !q || Number.parseFloat(q.slice(2)) > 0;
    });
}

function appendVary(headers, value) {
  const current = headers.get("Vary");
  if (!current) {
    headers.set("Vary", value);
    return;
  }

  const values = current.split(",").map((item) => item.trim().toLowerCase());
  if (!values.includes(value.toLowerCase())) {
    headers.set("Vary", `${current}, ${value}`);
  }
}

function estimateMarkdownTokens(markdown) {
  if (!markdown) return 0;
  return Math.max(1, Math.ceil(markdown.trim().length / 4));
}
