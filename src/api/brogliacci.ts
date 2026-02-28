import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

// --- Types ---

export type BrogliacciProduct = {
  name: string;
  category: string;
  type: string;
  registrationNumber: string | null;
};

export type BrogliacciStock = {
  product: BrogliacciProduct;
  quantity: number;
  unitOfMeasureQuantity: string;
  type: string;
};

export type BrogliacciPayload = {
  productionUnitName: string | null;
  dateOfOpeation: string;
  category: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  treatedSurface: number | null;
  totalDistributedWaterL: number | null;
  stocks: BrogliacciStock[];
};

export type BrogliacciRawEntry = {
  date: string;
  productionUnitName: string | null;
  areaHa: number | null;
  productName: string;
  quantity: number;
  unitOfMeasure: string;
  waterQuantityL: number | null;
};

export type BrogliacciResult = {
  fileName: string;
  status: "extracted" | "failed";
  rawEntries?: BrogliacciRawEntry[];
  payload?: BrogliacciPayload[];
  error?: string;
};

export type ExtractBrogliacciResponse = {
  status: "success";
  data: {
    results: BrogliacciResult[];
  };
};

// --- API ---

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function extractBrogliacci(
  files: File[],
  baseUrl: string = BASE_URL,
): Promise<ExtractBrogliacciResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/extract-brogliacci`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Errore durante l'estrazione dei brogliacci");
  }

  return (await response.json()) as ExtractBrogliacciResponse;
}

class BrogliacciApiService {
  private readonly baseUrl: string;

  public constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async extractBrogliacci(
    files: File[],
  ): Promise<ExtractBrogliacciResponse> {
    return await extractBrogliacci(files, this.baseUrl);
  }
}

export const brogliacciApiService = new BrogliacciApiService(BASE_URL);
