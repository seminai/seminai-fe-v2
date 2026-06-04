const HOME_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</llms-full.txt>; rel="describedby"; type="text/plain"',
  '</.well-known/agent-skills/index.json>; rel="service-desc"; type="application/json"',
  '<https://seminai-be-v2-661301438659.europe-west1.run.app/api-docs>; rel="service-doc"; type="text/html"',
  '<https://seminai-be-v2-661301438659.europe-west1.run.app/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
].join(", ");

const API_CATALOG_PATH = "/.well-known/api-catalog";
const AUTH_MD_PATH = "/auth.md";
const HOME_PATHS = new Set(["/", "/index.html"]);
const OAUTH_PROTECTED_RESOURCE_PATH = "/.well-known/oauth-protected-resource";
const MCP_SERVER_CARD_PATH = "/.well-known/mcp/server-card.json";
const MCP_RPC_PATH = "/mcp";

const API_CATALOG = {
  linkset: [
    {
      anchor: "https://seminai.tech/",
      describedby: [
        {
          href: "https://seminai.tech/llms.txt",
          type: "text/plain",
        },
        {
          href: "https://seminai.tech/llms-full.txt",
          type: "text/plain",
        },
      ],
      "service-doc": [
        {
          href: "https://seminai-be-v2-661301438659.europe-west1.run.app/api-docs",
          type: "text/html",
        },
      ],
      "service-desc": [
        {
          href: "https://seminai-be-v2-661301438659.europe-west1.run.app/openapi.json",
          type: "application/vnd.oai.openapi+json",
        },
      ],
      status: [
        {
          href: "https://seminai-be-v2-661301438659.europe-west1.run.app/health",
          type: "application/json",
        },
      ],
    },
  ],
};

const OAUTH_PROTECTED_RESOURCE = {
  resource: "https://seminai.tech",
  resource_name: "Seminai",
  resource_documentation: "https://seminai.tech/auth.md",
  resource_policy_uri: "https://seminai.tech/privacy-policy",
  resource_tos_uri: "https://seminai.tech/terms-of-service",
  authorization_servers: [],
  scopes_supported: [],
  bearer_methods_supported: [],
  api_catalog: "https://seminai.tech/.well-known/api-catalog",
  agent_auth: {
    registration_supported: false,
    auth_md: "https://seminai.tech/auth.md",
    note: "Seminai does not currently support autonomous third-party agent registration.",
  },
};

const MCP_SERVER_CARD = {
  $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
  serverInfo: {
    name: "seminai-public-discovery",
    title: "Seminai Public Discovery",
    version: "1.0.0",
  },
  description:
    "Read-only public discovery tools for Seminai product context, API catalog and authentication policy.",
  transports: [
    {
      type: "streamable-http",
      url: "https://seminai.tech/mcp",
    },
  ],
  capabilities: {
    tools: {
      listChanged: false,
    },
  },
  auth: {
    type: "none",
  },
};

const PUBLIC_CONTEXT = `# Seminai

Seminai produces a digital field logbook for Italian agricultural professionals.
Public agents can use this context to understand the product, public legal pages,
API discovery resources and contact path. Protected user data is not exposed.

Useful links:
- https://seminai.tech/llms.txt
- https://seminai.tech/llms-full.txt
- https://seminai.tech/.well-known/api-catalog
- https://seminai.tech/auth.md
- https://seminai.tech/privacy-policy
- https://seminai.tech/terms-of-service`;

const AUTH_POLICY = `# Auth.md

Seminai supports human user authentication through the web application at
https://app.seminai.tech/login.

Public marketing and discovery resources do not require authentication.
Protected product features require a signed-in Seminai user. Seminai does not
currently support autonomous third-party agent registration or OAuth/OIDC
dynamic client registration. Agents that need protected user data must direct
the user to authenticate in the Seminai app and must not collect credentials.`;

const WEBMCP_BOOTSTRAP_SCRIPT = `<script>
(() => {
  if (window.__seminaiWebMcpRegistered) return;
  const modelContext = document.modelContext || navigator.modelContext;
  if (!modelContext) return;

  const inputSchema = { type: "object", properties: {}, additionalProperties: false };
  const annotations = { readOnlyHint: true, untrustedContentHint: false };
  const readPublicText = async (path) => {
    const response = await fetch(path, {
      credentials: "omit",
      headers: {
        Accept: "text/plain, text/markdown, application/json;q=0.9, */*;q=0.1",
      },
    });
    if (!response.ok) throw new Error("Failed to read public Seminai resource: " + path);
    return response.text();
  };

  const tools = [
    {
      name: "seminai_get_public_context",
      description: "Return public Seminai context for agents, including product summary and public discovery links.",
      inputSchema,
      annotations,
      execute: () => readPublicText("/llms.txt"),
    },
    {
      name: "seminai_get_api_catalog",
      description: "Return Seminai public API catalog discovery metadata.",
      inputSchema,
      annotations,
      execute: () => readPublicText("/.well-known/api-catalog"),
    },
    {
      name: "seminai_get_auth_policy",
      description: "Return Seminai public authentication and agent registration policy.",
      inputSchema,
      annotations,
      execute: () => readPublicText("/auth.md"),
    },
  ];

  if (typeof modelContext.registerTool === "function") {
    for (const tool of tools) modelContext.registerTool(tool);
    window.__seminaiWebMcpRegistered = true;
    return;
  }

  if (typeof modelContext.provideContext === "function") {
    modelContext.provideContext({ tools });
    window.__seminaiWebMcpRegistered = true;
  }
})();
</script>`;

const MCP_TOOLS = [
  {
    name: "seminai_get_public_context",
    description:
      "Return public Seminai context for agents, including product summary and public discovery links.",
    inputSchema: emptyInputSchema(),
  },
  {
    name: "seminai_get_api_catalog",
    description: "Return Seminai public API catalog discovery metadata.",
    inputSchema: emptyInputSchema(),
  },
  {
    name: "seminai_get_auth_policy",
    description: "Return Seminai public authentication and agent registration policy.",
    inputSchema: emptyInputSchema(),
  },
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const isReadRequest = request.method === "GET" || request.method === "HEAD";

    if (request.method === "OPTIONS" && url.pathname === MCP_RPC_PATH) {
      return emptyCorsResponse();
    }

    if (isReadRequest && HOME_PATHS.has(url.pathname) && wantsMarkdown(request)) {
      return serveMarkdownHome(request);
    }

    if (isReadRequest && url.pathname === AUTH_MD_PATH) {
      return textResponse(AUTH_POLICY, "text/markdown; charset=utf-8", request.method === "HEAD");
    }

    if (isReadRequest && url.pathname === OAUTH_PROTECTED_RESOURCE_PATH) {
      return jsonResponse(OAUTH_PROTECTED_RESOURCE, request.method === "HEAD");
    }

    if (isReadRequest && url.pathname === MCP_SERVER_CARD_PATH) {
      return jsonResponse(MCP_SERVER_CARD, request.method === "HEAD");
    }

    if (url.pathname === MCP_RPC_PATH) {
      return handleMcpRequest(request);
    }

    const response = await fetch(request);
    const headers = new Headers(response.headers);

    if (isReadRequest && HOME_PATHS.has(url.pathname)) {
      addHomeDiscoveryHeaders(headers);
    }

    if (url.pathname === API_CATALOG_PATH) {
      headers.set("Content-Type", "application/linkset+json; charset=utf-8");
    }

    if (
      request.method === "GET" &&
      HOME_PATHS.has(url.pathname) &&
      isHtmlResponse(headers)
    ) {
      const html = await response.text();
      headers.delete("Content-Length");
      return new Response(injectWebMcpBootstrap(html), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

async function handleMcpRequest(request) {
  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "MCP endpoint expects JSON-RPC POST requests.",
        serverCard: "https://seminai.tech/.well-known/mcp/server-card.json",
      },
      false,
      405,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (Array.isArray(payload)) {
    return jsonResponse(payload.map((item) => handleJsonRpcMessage(item)));
  }

  return jsonResponse(handleJsonRpcMessage(payload));
}

function handleJsonRpcMessage(message) {
  const id = message && Object.hasOwn(message, "id") ? message.id : null;

  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return makeJsonRpcError(id, -32600, "Invalid Request");
  }

  switch (message.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: MCP_SERVER_CARD.capabilities,
          serverInfo: MCP_SERVER_CARD.serverInfo,
        },
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: MCP_TOOLS,
        },
      };

    case "tools/call":
      return handleToolCall(id, message.params);

    default:
      return makeJsonRpcError(id, -32601, "Method not found");
  }
}

function handleToolCall(id, params) {
  const name = params?.name;
  const args = params?.arguments ?? {};

  if (!MCP_TOOLS.some((tool) => tool.name === name)) {
    return makeJsonRpcError(id, -32602, "Unknown tool");
  }

  if (Object.keys(args).length > 0) {
    return makeJsonRpcError(id, -32602, "This tool does not accept arguments");
  }

  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [
        {
          type: "text",
          text: getToolText(name),
        },
      ],
      isError: false,
    },
  };
}

function getToolText(name) {
  switch (name) {
    case "seminai_get_public_context":
      return PUBLIC_CONTEXT;
    case "seminai_get_api_catalog":
      return JSON.stringify(API_CATALOG, null, 2);
    case "seminai_get_auth_policy":
      return AUTH_POLICY;
    default:
      return "";
  }
}

function jsonRpcError(id, code, message) {
  return jsonResponse(makeJsonRpcError(id, code, message));
}

function makeJsonRpcError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}

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

function isHtmlResponse(headers) {
  return headers.get("Content-Type")?.toLowerCase().includes("text/html") ?? false;
}

function injectWebMcpBootstrap(html) {
  if (html.includes("__seminaiWebMcpRegistered")) {
    return html;
  }

  if (html.includes("</head>")) {
    return html.replace("</head>", `${WEBMCP_BOOTSTRAP_SCRIPT}\n</head>`);
  }

  return `${WEBMCP_BOOTSTRAP_SCRIPT}\n${html}`;
}

function emptyInputSchema() {
  return {
    type: "object",
    properties: {},
    additionalProperties: false,
  };
}

function jsonResponse(body, head = false, status = 200) {
  return new Response(head ? null : JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function emptyCorsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function textResponse(body, contentType, head = false) {
  return new Response(head ? null : body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
