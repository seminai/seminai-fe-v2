const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export type ContactEmailRequest = {
  name: string;
  email: string;
  body: string;
  files?: File[]; // Optional file attachments
};

export type ContactEmailResponse = {
  status: "success" | string;
  message?: string;
};

export class EmailApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public async sendContactEmail(
    payload: ContactEmailRequest
  ): Promise<ContactEmailResponse> {
    // If files are provided, send as multipart/form-data, otherwise JSON
    if (payload.files && payload.files.length > 0) {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("email", payload.email);
      formData.append("body", payload.body);
      
      // Append each file with the key "files" (backend expects files=[])
      payload.files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${this.baseUrl}/email/send-email`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          // Do NOT set Content-Type: browser will set it with boundary for multipart/form-data
        },
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await safeReadText(response);
        throw new Error(errorText || "Unable to send the email request.");
      }

      return (await response.json()) as ContactEmailResponse;
    } else {
      // No files: send as JSON (backward compatible)
      const response = await fetch(`${this.baseUrl}/email/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await safeReadText(response);
        throw new Error(errorText || "Unable to send the email request.");
      }

      return (await response.json()) as ContactEmailResponse;
    }
  }
}

export const emailApiService = new EmailApiService();

