import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export type CreateStockPayload = {
  companyId: string;
  productId: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  price?: number;
  unitOfMeasurePrice?: string;
  type: "IN" | "OUT";
  jobId?: string;
  ddtCode?: string;
  ddtDate?: string;
  invoiceCode?: string;
  invoiceDate?: string;
  companySupplierName?: string;
  addressSupplier?: string;
  vatNumberSupplier?: string;
};

export type CreateStockResponse = {
  status: "success" | string;
  data?: unknown;
};

export type UpdateStockPayload = {
  companyId?: string;
  quantity?: number;
  unitOfMeasureQuantity?: string;
  price?: number;
  unitOfMeasurePrice?: string;
  type?: "IN" | "OUT";
  ddtCode?: string | null;
  ddtDate?: string | null;
  invoiceCode?: string | null;
  invoiceDate?: string | null;
  companySupplierName?: string | null;
  addressSupplier?: string | null;
  vatNumberSupplier?: string | null;
};

export type UpdateStockResponse = {
  status: "success" | string;
  data?: unknown;
};

export async function updateStock(
  stockId: string,
  payload: UpdateStockPayload,
  baseUrl: string = BASE_URL,
): Promise<UpdateStockResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/stocks/${encodeURIComponent(stockId)}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Update stock failed");
  }

  return (await response.json()) as UpdateStockResponse;
}

export async function createStock(
  payload: CreateStockPayload,
  baseUrl: string = BASE_URL,
): Promise<CreateStockResponse> {
  const response = await authenticatedHttpClient.request(`${baseUrl}/stocks`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Create stock failed");
  }

  return (await response.json()) as CreateStockResponse;
}

class StocksApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async create(
    payload: CreateStockPayload,
  ): Promise<CreateStockResponse> {
    return await createStock(payload, this.baseUrl);
  }

  public async update(
    stockId: string,
    payload: UpdateStockPayload,
  ): Promise<UpdateStockResponse> {
    return await updateStock(stockId, payload, this.baseUrl);
  }
}

export const stocksApiService = new StocksApiService(BASE_URL);
