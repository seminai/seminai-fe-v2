import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL;

export type TokenUsage = {
  id: string;
  userId: string;
  companyId: string | null;
  jobId: string | null;
  jobGroupId: string | null;
  jobType: "LABEL" | "DOSAGE" | string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  seminaiMargin: number;
  costClient: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type TokenCostTotals = {
  totalCost: number;
  totalCostClient: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
};

export type TokenCostsResponse = {
  status: "success" | string;
  data: {
    usages: TokenUsage[];
    totals: TokenCostTotals;
  };
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

class TokenCostsApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getTokenCosts(): Promise<TokenCostsResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/get-token-costs`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Unable to fetch token costs");
    }

    return (await response.json()) as TokenCostsResponse;
  }
}

export const tokenCostsApiService = new TokenCostsApiService(BASE_URL);

export async function getTokenCostsWithBearer(
  baseUrl: string = BASE_URL
): Promise<TokenCostsResponse> {
  const service =
    baseUrl === BASE_URL ? tokenCostsApiService : new TokenCostsApiService(baseUrl);
  return await service.getTokenCosts();
}

