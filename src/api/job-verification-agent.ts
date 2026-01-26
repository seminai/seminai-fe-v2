import pako from "pako";
import { authenticatedHttpClient } from "./http";
import type { JobWithRelations } from "./jobs";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

// Soglia per la compressione (1MB)
const COMPRESSION_THRESHOLD_BYTES = 1 * 1024 * 1024;

/**
 * Comprime un payload JSON con gzip e lo codifica in base64.
 * Ritorna un oggetto wrapper con flag compressed e dati.
 */
function compressPayload<T>(payload: T): {
  compressed: boolean;
  data: string;
  originalSize: number;
  compressedSize: number;
} {
  const jsonString = JSON.stringify(payload);
  const originalSize = new Blob([jsonString]).size;

  if (originalSize < COMPRESSION_THRESHOLD_BYTES) {
    return {
      compressed: false,
      data: jsonString,
      originalSize,
      compressedSize: originalSize,
    };
  }

  // Comprimi con gzip
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(jsonString);
  const compressedBytes = pako.gzip(inputBytes);

  // Converti in base64
  const base64 = btoa(
    String.fromCharCode(...new Uint8Array(compressedBytes))
  );

  console.log(
    `📦 Payload compresso: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedBytes.length / 1024 / 1024).toFixed(2)}MB (${((1 - compressedBytes.length / originalSize) * 100).toFixed(1)}% riduzione)`
  );

  return {
    compressed: true,
    data: base64,
    originalSize,
    compressedSize: compressedBytes.length,
  };
}

export type JobVerificationRequest = {
  threadId: string;
  jobs: JobWithRelations[];
  message: string;
  metadata?: {
    images?: string[];
    links?: string[];
    pdfs?: string[];
  };
  modelName?:
    | "gpt-4o"
    | "gpt-4o-mini"
    | "gpt-4-turbo"
    | "gpt-4"
    | "gpt-3.5-turbo";
  temperature?: number;
  /** Se true (default), usa il pensiero profondo con tool e ragionamento completo. Se false, usa chat rapida. */
  deepThinking?: boolean;
};

export type SourceCitation = {
  url: string;
  title: string;
  description: string;
};

export type AgentToolCall = {
  name: string;
  args: Record<string, unknown>;
  id?: string;
};

export type PendingAction = {
  type: "tool_call" | "job_modification";
  tool?: string;
  args?: Record<string, unknown>;
  description: string;
};

export type AgentResponse = {
  status: string;
  message?: string;
  reasoning?: string;
  tasks?: Array<{ id?: string; description?: string; status?: string }>;
  sources?: SourceCitation[];
};

export type StreamEventType =
  | "token"
  | "reasoning"
  | "thinking"
  | "tool_call"
  | "tool_start"
  | "tool_result"
  | "task_update"
  | "task_progress"
  | "data_inspection"
  | "sources_update"
  | "complete"
  | "requires_approval"
  | "requires_modification_approval"
  | "error";

export type AgentTask = {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
};

export type ToolResult = {
  name: string;
  result?: string;
  summary?: string;
};

export type DataInspection = {
  path: string;
  jobId: string;
  summary?: string;
};

export type StreamEvent = {
  type: StreamEventType;
  content?: string;
  reasoning?: string;
  thinking?: string;
  toolCall?: AgentToolCall;
  toolResult?: ToolResult;
  dataInspection?: DataInspection;
  tasks?: AgentTask[];
  currentTaskId?: string;
  sources?: SourceCitation[];
  pendingAction?: PendingAction;
  error?: string;
  response?: AgentResponse;
  cost?: {
    inputTokens?: number;
    outputTokens?: number;
    totalCost?: number;
  };
};

export type ApproveJobModification = {
  jobId: string;
  field: string;
  newValue: unknown;
};

export type ApproveActionRequest = {
  threadId: string;
  modification?: ApproveJobModification;
};

export type RejectActionRequest = {
  threadId: string;
  reason: string;
};

type ApiResponse<T> = {
  status: "success" | "error";
  data?: T;
  message?: string;
  code?: string;
};

class JobVerificationAgentApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async streamMessage(request: JobVerificationRequest): Promise<Response> {
    const { compressed, data, originalSize, compressedSize } =
      compressPayload(request);

    const headers: Record<string, string> = {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    };

    // Aggiungi header per indicare compressione
    if (compressed) {
      headers["X-Payload-Compressed"] = "gzip";
      headers["X-Original-Size"] = String(originalSize);
      headers["X-Compressed-Size"] = String(compressedSize);
    }

    const body = compressed
      ? JSON.stringify({ compressed: true, data })
      : data;

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/job-verification-agent/stream`,
      {
        method: "POST",
        headers,
        body,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Stream message failed");
    }

    return response;
  }

  async sendMessage(request: JobVerificationRequest): Promise<AgentResponse> {
    const { compressed, data, originalSize, compressedSize } =
      compressPayload(request);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (compressed) {
      headers["X-Payload-Compressed"] = "gzip";
      headers["X-Original-Size"] = String(originalSize);
      headers["X-Compressed-Size"] = String(compressedSize);
    }

    const body = compressed
      ? JSON.stringify({ compressed: true, data })
      : data;

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/job-verification-agent/message`,
      {
        method: "POST",
        headers,
        body,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Send message failed");
    }

    const json = (await response.json()) as ApiResponse<AgentResponse>;
    if (json.status !== "success" || !json.data) {
      throw new Error(json.message || "Invalid response");
    }

    return json.data;
  }

  async approveAction(request: ApproveActionRequest): Promise<AgentResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/job-verification-agent/approve`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Approve action failed");
    }

    const json = (await response.json()) as ApiResponse<AgentResponse>;
    if (json.status !== "success" || !json.data) {
      throw new Error(json.message || "Invalid response");
    }

    return json.data;
  }

  async rejectAction(request: RejectActionRequest): Promise<AgentResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/job-verification-agent/reject`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Reject action failed");
    }

    const json = (await response.json()) as ApiResponse<AgentResponse>;
    if (json.status !== "success" || !json.data) {
      throw new Error(json.message || "Invalid response");
    }

    return json.data;
  }
}

export const jobVerificationAgentApiService =
  new JobVerificationAgentApiService(BASE_URL);
