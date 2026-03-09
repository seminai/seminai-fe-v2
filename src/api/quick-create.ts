import { authenticatedHttpClient } from "./http";
import type {
  ExtractFromFileResponse,
  BulkCreateInput,
  BulkCreateResponse,
  StartExtractResponse,
  ExtractJobStatusResponse,
} from "./quick-create.types";

export type {
  ExtractedFieldAllocation,
  ProductionUnitCycle,
  ExtractedField,
  ExtractedProductionUnit,
  ExtractFromFileResponse,
  BulkCreateInput,
  BulkCreateResponse,
  StartExtractResponse,
  ExtractJobStatusResponse,
} from "./quick-create.types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/**
 * POST /onboarding/extract (sync)
 */
export async function extractFromFile(
  files: File | File[],
  baseUrl: string = BASE_URL,
): Promise<ExtractFromFileResponse> {
  const formData = new FormData();
  const fileArray = Array.isArray(files) ? files : [files];
  for (const file of fileArray) {
    formData.append("file", file);
  }
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/onboarding/extract`,
    { method: "POST", body: formData },
  );
  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to extract data from file");
  }
  return (await response.json()) as ExtractFromFileResponse;
}

/**
 * POST /onboarding/bulk-create
 */
export async function bulkCreate(
  input: BulkCreateInput,
  baseUrl: string = BASE_URL,
): Promise<BulkCreateResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/onboarding/bulk-create`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to bulk create data");
  }
  return (await response.json()) as BulkCreateResponse;
}

/**
 * POST /onboarding/extract/start (async)
 */
export async function startExtract(
  files: File | File[],
  baseUrl: string = BASE_URL,
): Promise<StartExtractResponse> {
  const formData = new FormData();
  const fileArray = Array.isArray(files) ? files : [files];
  for (const file of fileArray) {
    formData.append("file", file);
  }
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/onboarding/extract/start`,
    { method: "POST", body: formData },
  );
  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to start extraction job");
  }
  return (await response.json()) as StartExtractResponse;
}

/**
 * GET /onboarding/extract/status/:jobId
 */
export async function getExtractStatus(
  jobId: string,
  baseUrl: string = BASE_URL,
): Promise<ExtractJobStatusResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/onboarding/extract/status/${encodeURIComponent(jobId)}`,
    { method: "GET", headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to get extraction status");
  }
  return (await response.json()) as ExtractJobStatusResponse;
}

/**
 * GET /onboarding/extract/result/:jobId
 */
export async function getExtractResult(
  jobId: string,
  baseUrl: string = BASE_URL,
): Promise<ExtractFromFileResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/onboarding/extract/result/${encodeURIComponent(jobId)}`,
    { method: "GET", headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to get extraction result");
  }
  return (await response.json()) as ExtractFromFileResponse;
}

/**
 * DELETE /onboarding/extract/:jobId
 */
export async function cancelExtract(
  jobId: string,
  baseUrl: string = BASE_URL,
): Promise<{ cancelled: boolean; previousState: string }> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/onboarding/extract/${encodeURIComponent(jobId)}`,
    { method: "DELETE", headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to cancel extraction job");
  }
  const result = (await response.json()) as {
    status: string;
    data: { cancelled: boolean; previousState: string };
  };
  return result.data;
}

/**
 * Service class for quick create operations
 */
export class QuickCreateApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public async extractFromFile(
    files: File | File[],
  ): Promise<ExtractFromFileResponse> {
    return extractFromFile(files, this.baseUrl);
  }

  public async startExtract(
    files: File | File[],
  ): Promise<StartExtractResponse> {
    return startExtract(files, this.baseUrl);
  }

  public async getExtractStatus(
    jobId: string,
  ): Promise<ExtractJobStatusResponse> {
    return getExtractStatus(jobId, this.baseUrl);
  }

  public async getExtractResult(
    jobId: string,
  ): Promise<ExtractFromFileResponse> {
    return getExtractResult(jobId, this.baseUrl);
  }

  public async cancelExtract(
    jobId: string,
  ): Promise<{ cancelled: boolean; previousState: string }> {
    return cancelExtract(jobId, this.baseUrl);
  }

  public async bulkCreate(
    input: BulkCreateInput,
  ): Promise<BulkCreateResponse> {
    return bulkCreate(input, this.baseUrl);
  }
}

export const quickCreateApiService = new QuickCreateApiService();
