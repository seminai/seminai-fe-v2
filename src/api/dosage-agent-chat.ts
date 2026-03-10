import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export type DosageAgentChatRequest = {
  threadId: string;
  message: string;
  modelName?: string;
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
  | "error"
  | "thinking"
  | "working_memory_update"
  | "plan_step_generated"
  | "plan_presented"
  | "plan_step_modified"
  | "plan_executing"
  | "plan_step_executed"
  | "model_selected"
  | "questionnaire_presented";

export type PlanStep = {
  stepNumber: number;
  description: string;
  toolName?: string;
  status?: "pending" | "in_progress" | "completed" | "modified" | "failed";
  result?: string;
};

export type PlanEventData = {
  planId?: string;
  step?: PlanStep;
  totalSteps?: number;
  currentStep?: number;
  status?: string;
};

export type ModelInfo = {
  provider: "claude" | "openai";
  modelName: string;
  complexity: "low" | "medium" | "high";
};

export type CostInfo = {
  inputTokens: number;
  outputTokens: number;
  tavilyCalls: number;
  totalCostUsd: number;
  costWithMarginUsd: number;
  provider?: string;
  modelName?: string;
  byProvider?: Array<{
    provider: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }>;
};

export type QuestionType = "single_select" | "multi_select" | "text";

export type QuestionOption = {
  label: string;
  value: string;
  description?: string;
};

export type Question = {
  id: string;
  question: string;
  type: QuestionType;
  options?: QuestionOption[];
  required: boolean;
  placeholder?: string;
};

export type Questionnaire = {
  title: string;
  description?: string;
  questions: Question[];
};

export type DosageAgentStreamEvent = {
  type: DosageAgentStreamEventType;
  content?: string;
  toolCall?: DosageAgentToolCall;
  sources?: DosageAgentSourceCitation[];
  cost?: CostInfo;
  response?: {
    status: "COMPLETED" | "REQUIRES_APPROVAL" | "ERROR";
    message?: string;
    sources?: DosageAgentSourceCitation[];
    error?: string;
    pendingToolCalls?: DosageAgentToolCall[];
  };
  error?: string;
  plan?: PlanEventData;
  modelInfo?: ModelInfo;
  workingMemoryKey?: string;
  questionnaire?: Questionnaire;
};

export type DosageAgentResponse = {
  status: string;
  message?: string;
  sources?: DosageAgentSourceCitation[];
  pendingToolCalls?: DosageAgentToolCall[];
  error?: string;
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

  async streamMessage(
    request: DosageAgentChatRequest,
    files?: File[],
  ): Promise<Response> {
    const hasFiles = files && files.length > 0;

    let body: BodyInit;
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
    };

    if (hasFiles) {
      const formData = new FormData();
      formData.append("threadId", request.threadId);
      formData.append("message", request.message);
      if (request.modelName) formData.append("modelName", request.modelName);
      if (request.workspaceId)
        formData.append("workspaceId", request.workspaceId);
      if (request.jobId) formData.append("jobId", request.jobId);
      for (const file of files) {
        formData.append("files", file);
      }
      body = formData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(request);
    }

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/agent-chat/stream`,
      { method: "POST", headers, body },
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
