import { AuthorizedHeadersBuilder } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
  invoiceCode?: string;
  companySupplierName?: string;
  addressSupplier?: string;
  vatNumberSupplier?: string;
};

export type CreateStockResponse = {
  status: "success" | string;
  data?: unknown;
};

export async function createStock(
  token: string,
  payload: CreateStockPayload,
  baseUrl: string = BASE_URL
): Promise<CreateStockResponse> {
  const headersBuilder = new AuthorizedHeadersBuilder(token);

  const response = await fetch(`${baseUrl}/stocks`, {
    method: "POST",
    headers: headersBuilder.build({
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    credentials: "include",
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
    token: string,
    payload: CreateStockPayload
  ): Promise<CreateStockResponse> {
    return await createStock(token, payload, this.baseUrl);
  }
}

export const stocksApiService = new StocksApiService(BASE_URL);
