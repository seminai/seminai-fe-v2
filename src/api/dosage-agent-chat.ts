import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export type DosageAgentChatRequest = {
  threadId: string;
  message: string;
  modelName?:
    | "gpt-4o"
    | "gpt-4o-mini"
    | "gpt-4-turbo"
    | "gpt-4"
    | "gpt-3.5-turbo";
  temperature?: number;
  jobId?: string;
  workspaceId?: string;
};

export type DosageAgentToolCall = {
  name: string;
  args: Record<string, unknown>;
  id?: string;
};

export type DosageAgentSourceCitation = {
  title: string;
  url: string;
  fragment?: string;
};

export type DosageAgentStreamEventType =
  | "token"
  | "tool_call"
  | "tool_result"
  | "requires_approval"
  | "loop_warning"
  | "complete"
  | "error";

export type DosageAgentStreamEvent = {
  type: DosageAgentStreamEventType;
  content?: string;
  toolCall?: DosageAgentToolCall;
  sources?: DosageAgentSourceCitation[];
  cost?: {
    inputTokens: number;
    outputTokens: number;
    tavilyCalls: number;
    totalCostUsd: number;
    costWithMarginUsd: number;
  };
  response?: {
    status: "COMPLETED" | "REQUIRES_APPROVAL" | "ERROR";
    message?: string;
    sources?: DosageAgentSourceCitation[];
  };
  error?: string;
};

export type DosageAgentResponse = {
  status: string;
  message?: string;
  sources?: DosageAgentSourceCitation[];
};

export type DosageAgentApproveRequest = {
  threadId: string;
  modelName: string;
};

export type DosageAgentRejectRequest = {
  threadId: string;
  reason: string;
  modelName: string;
};

type ApiResponse<T> = {
  status: "success" | "error";
  data?: T;
  message?: string;
};

class DosageAgentChatApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async streamMessage(request: DosageAgentChatRequest): Promise<Response> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/agent-chat/stream`,
      {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Stream message failed");
    }

    return response;
  }

  async sendMessage(
    request: DosageAgentChatRequest,
  ): Promise<DosageAgentResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/agent-chat/message`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Send message failed");
    }

    const json = (await response.json()) as ApiResponse<DosageAgentResponse>;
    if (json.status !== "success" || !json.data) {
      throw new Error(json.message || "Invalid response");
    }

    return json.data;
  }

  async approveAction(
    request: DosageAgentApproveRequest,
  ): Promise<DosageAgentResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/agent-chat/approve`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Approve action failed");
    }

    const json = (await response.json()) as ApiResponse<DosageAgentResponse>;
    if (json.status !== "success" || !json.data) {
      throw new Error(json.message || "Invalid response");
    }

    return json.data;
  }

  async rejectAction(
    request: DosageAgentRejectRequest,
  ): Promise<DosageAgentResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/agent-chat/reject`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Reject action failed");
    }

    const json = (await response.json()) as ApiResponse<DosageAgentResponse>;
    if (json.status !== "success" || !json.data) {
      throw new Error(json.message || "Invalid response");
    }

    return json.data;
  }
}

export const dosageAgentChatApiService = new DosageAgentChatApiService(
  BASE_URL,
);
