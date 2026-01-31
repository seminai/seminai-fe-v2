import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type Patentino = {
  id: string;
  type: string;
  code: string;
  expiresAt: string;
  releaseAt: string;
  userId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreatePatentinoRequest = {
  type: string;
  code: string;
  expiresAt: string;
  releaseAt: string;
  userId: string;
  isActive: boolean;
};

export type UpdatePatentinoRequest = {
  type?: string;
  code?: string;
  expiresAt?: string;
  releaseAt?: string;
  isActive?: boolean;
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

class PatentiniApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getById(id: string): Promise<Patentino> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/patentini/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to load patentino");
    }

    const payload = await response.json();
    if (payload?.status === "success" && payload?.data) {
      return payload.data;
    }

    return payload;
  }

  public async getByUserId(userId: string): Promise<Patentino[]> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/patentini/user/${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to load user patentini");
    }

    const payload = await response.json();
    if (payload?.status === "success" && payload?.data?.patentini) {
      return payload.data.patentini;
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload?.data && Array.isArray(payload.data)) {
      return payload.data;
    }

    return [];
  }

  public async create(request: CreatePatentinoRequest): Promise<Patentino> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/patentini`,
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
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to create patentino");
    }

    const payload = await response.json();
    if (payload?.status === "success" && payload?.data) {
      return payload.data;
    }

    return payload;
  }

  public async update(
    id: string,
    request: UpdatePatentinoRequest
  ): Promise<Patentino> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/patentini/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to update patentino");
    }

    const payload = await response.json();
    if (payload?.status === "success" && payload?.data) {
      return payload.data;
    }

    return payload;
  }

  public async delete(id: string): Promise<void> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/patentini/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to delete patentino");
    }
  }
}

export const patentiniApiService = new PatentiniApiService(BASE_URL);
