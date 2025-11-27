import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export interface ProductLabelQuery {
  name: string;
  regNumber: string;
}

export type ProductLabelStructuredData = Record<string, unknown>;

export interface ProductLabelDetails {
  id: string;
  productName: string;
  registrationNumber: string;
  sourceUrl?: string | null;
  label?: ProductLabelStructuredData | null;
  rawText?: string | null;
  extractionConfidence?: number | null;
  isVerified?: boolean;
  extractedFields?: ProductLabelStructuredData[] | null;
  errors?: string[] | null;
  qualityExtraction?: ProductLabelStructuredData[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductLabelResponse {
  status: "success";
  data: ProductLabelDetails | null;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export class ProductLabelsApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getByProduct(
    query: ProductLabelQuery
  ): Promise<ProductLabelResponse> {
    const url = new URL(`${this.baseUrl}/labels/by-product`);
    url.searchParams.set("name", query.name);
    url.searchParams.set("regNumber", query.regNumber);

    const response = await authenticatedHttpClient.request(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      return {
        status: "success",
        data: null,
      };
    }

    if (!response.ok) {
      const message = await safeReadText(response);
      throw new Error(message || "Unable to retrieve product label");
    }

    return (await response.json()) as ProductLabelResponse;
  }
}

export const productLabelsApiService = new ProductLabelsApiService(BASE_URL);

