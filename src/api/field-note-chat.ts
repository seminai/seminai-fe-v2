import { authenticatedHttpClient } from "./http";
import type { AgentResponse, ChatMessageRequest } from "./field-notes";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export interface ChatMessageWithAttachmentRequest extends ChatMessageRequest {
  file: File;
}

class FieldNoteChatApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async sendMessageWithAttachment(
    request: ChatMessageWithAttachmentRequest
  ): Promise<AgentResponse> {
    const formData = this.buildFormData(request);

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-note-agent/message`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Send message with attachment failed");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }

  async streamMessageWithAttachment(
    request: ChatMessageWithAttachmentRequest
  ): Promise<void> {
    const formData = this.buildFormData(request);

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-note-agent/stream`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Stream message with attachment failed");
    }
  }

  private buildFormData(request: ChatMessageWithAttachmentRequest): FormData {
    const formData = new FormData();
    formData.append("threadId", request.threadId);
    formData.append("message", request.message);
    formData.append("file", request.file);

    if (request.modelName) {
      formData.append("modelName", request.modelName);
    }

    if (request.temperature !== undefined) {
      formData.append("temperature", String(request.temperature));
    }

    return formData;
  }
}

export const fieldNoteChatApiService = new FieldNoteChatApiService(BASE_URL);
