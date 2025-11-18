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

export const emailApiService = new EmailApiService();

