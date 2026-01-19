import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL;

export type WhatsAppSetupRequest = {
  instanceName?: string;
  webhookUrl?: string;
};

export type WhatsAppSetupResponse = {
  status: "success";
  data: {
    instanceName: string;
    instanceId: string;
    apiKey: string;
    qrCode?: string;
    qrCodeBase64?: string;
    webhookConfigured: boolean;
  };
};

export type WhatsAppQrCodeResponse = {
  status: "success";
  data: {
    qrCode: string;
    qrCodeBase64: string;
    expiresAt: string;
  };
};

export type WhatsAppStatusResponse = {
  status: "success";
  data: {
    connected: boolean;
    phoneNumber?: string;
    instanceName?: string;
    lastSync?: string;
    connectionStatus: "disconnected" | "connecting" | "connected" | "qr_code_ready";
  };
};

export type WhatsAppDisconnectRequest = {
  deleteInstance?: boolean;
};

export type WhatsAppDisconnectResponse = {
  status: "success";
  message: string;
};

export type WhatsAppSendMessageRequest = {
  phoneNumber: string;
  message: string;
};

export type WhatsAppSendMessageResponse = {
  status: "success";
  data: {
    messageId: string;
    sent: boolean;
  };
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

class WhatsAppApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async setupWhatsApp(
    payload?: WhatsAppSetupRequest
  ): Promise<WhatsAppSetupResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/settings/whatsapp/setup`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "WhatsApp setup failed");
    }

    return (await response.json()) as WhatsAppSetupResponse;
  }

  public async getQrCode(): Promise<WhatsAppQrCodeResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/settings/whatsapp/qr-code`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to get QR code");
    }

    return (await response.json()) as WhatsAppQrCodeResponse;
  }

  public async getStatus(): Promise<WhatsAppStatusResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/settings/whatsapp/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to get WhatsApp status");
    }

    return (await response.json()) as WhatsAppStatusResponse;
  }

  public async disconnectWhatsApp(
    payload?: WhatsAppDisconnectRequest
  ): Promise<WhatsAppDisconnectResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/settings/whatsapp/disconnect`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "WhatsApp disconnect failed");
    }

    return (await response.json()) as WhatsAppDisconnectResponse;
  }

  public async sendMessage(
    payload: WhatsAppSendMessageRequest
  ): Promise<WhatsAppSendMessageResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/settings/whatsapp/send-message`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to send message");
    }

    return (await response.json()) as WhatsAppSendMessageResponse;
  }
}

export const whatsappApiService = new WhatsAppApiService(BASE_URL);

export async function setupWhatsAppWithBearer(
  payload?: WhatsAppSetupRequest,
  baseUrl: string = BASE_URL
): Promise<WhatsAppSetupResponse> {
  const service =
    baseUrl === BASE_URL
      ? whatsappApiService
      : new WhatsAppApiService(baseUrl);
  return await service.setupWhatsApp(payload);
}

export async function getWhatsAppQrCodeWithBearer(
  baseUrl: string = BASE_URL
): Promise<WhatsAppQrCodeResponse> {
  const service =
    baseUrl === BASE_URL
      ? whatsappApiService
      : new WhatsAppApiService(baseUrl);
  return await service.getQrCode();
}

export async function getWhatsAppStatusWithBearer(
  baseUrl: string = BASE_URL
): Promise<WhatsAppStatusResponse> {
  const service =
    baseUrl === BASE_URL
      ? whatsappApiService
      : new WhatsAppApiService(baseUrl);
  return await service.getStatus();
}

export async function disconnectWhatsAppWithBearer(
  payload?: WhatsAppDisconnectRequest,
  baseUrl: string = BASE_URL
): Promise<WhatsAppDisconnectResponse> {
  const service =
    baseUrl === BASE_URL
      ? whatsappApiService
      : new WhatsAppApiService(baseUrl);
  return await service.disconnectWhatsApp(payload);
}

export async function sendWhatsAppMessageWithBearer(
  payload: WhatsAppSendMessageRequest,
  baseUrl: string = BASE_URL
): Promise<WhatsAppSendMessageResponse> {
  const service =
    baseUrl === BASE_URL
      ? whatsappApiService
      : new WhatsAppApiService(baseUrl);
  return await service.sendMessage(payload);
}
