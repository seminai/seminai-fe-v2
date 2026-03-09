import { authenticatedHttpClient } from "./http";
import type { FieldNoteAttachment } from "./field-notes";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export interface UploadFieldNoteAttachmentRequest {
  fieldNoteId: string;
  file: File;
}

class FieldNoteAttachmentsApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async uploadAttachment(
    request: UploadFieldNoteAttachmentRequest,
  ): Promise<FieldNoteAttachment> {
    const formData = new FormData();
    formData.append("fieldNoteId", request.fieldNoteId);
    formData.append("file", request.file);

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/field-notes/attachments`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Upload attachment failed");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Unexpected response format");
    }

    const jsonData = await response.json();
    return jsonData.data;
  }
}

export const fieldNoteAttachmentsApiService =
  new FieldNoteAttachmentsApiService(BASE_URL);
