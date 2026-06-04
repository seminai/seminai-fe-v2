type JsonSchema = {
  type: "object";
  properties: Record<string, never>;
  additionalProperties: false;
};

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute: () => Promise<string>;
  annotations: {
    readOnlyHint: true;
    untrustedContentHint: false;
  };
};

type ModelContext = {
  registerTool?: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void;
  provideContext?: (context: { tools: WebMcpTool[] }) => void;
};

type WebMcpDocument = Document & {
  modelContext?: ModelContext;
};

type WebMcpNavigator = Navigator & {
  modelContext?: ModelContext;
};

declare global {
  interface Window {
    __seminaiWebMcpRegistered?: boolean;
  }
}

const EMPTY_INPUT_SCHEMA: JsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  untrustedContentHint: false,
} as const;

const PUBLIC_TOOLS: WebMcpTool[] = [
  {
    name: "seminai_get_public_context",
    description:
      "Return public Seminai context for agents, including product summary and public discovery links.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    execute: () => fetchPublicText("/llms.txt"),
    annotations: TOOL_ANNOTATIONS,
  },
  {
    name: "seminai_get_api_catalog",
    description: "Return Seminai public API catalog discovery metadata.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    execute: () => fetchPublicText("/.well-known/api-catalog"),
    annotations: TOOL_ANNOTATIONS,
  },
  {
    name: "seminai_get_auth_policy",
    description: "Return Seminai public authentication and agent registration policy.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    execute: () => fetchPublicText("/auth.md"),
    annotations: TOOL_ANNOTATIONS,
  },
];

export function registerSeminaiWebMcpTools(): void {
  if (typeof window === "undefined" || window.__seminaiWebMcpRegistered) {
    return;
  }

  const modelContext = getModelContext();
  if (!modelContext) {
    return;
  }

  if (typeof modelContext.registerTool === "function") {
    for (const tool of PUBLIC_TOOLS) {
      modelContext.registerTool(tool);
    }
    window.__seminaiWebMcpRegistered = true;
    return;
  }

  if (typeof modelContext.provideContext === "function") {
    modelContext.provideContext({ tools: PUBLIC_TOOLS });
    window.__seminaiWebMcpRegistered = true;
  }
}

function getModelContext(): ModelContext | undefined {
  return (
    (document as WebMcpDocument).modelContext ??
    (navigator as WebMcpNavigator).modelContext
  );
}

async function fetchPublicText(path: string): Promise<string> {
  const response = await fetch(path, {
    credentials: "omit",
    headers: {
      Accept: "text/plain, text/markdown, application/json;q=0.9, */*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to read public Seminai resource: ${path}`);
  }

  return response.text();
}
