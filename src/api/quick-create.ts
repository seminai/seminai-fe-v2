import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Field allocation within a production unit
 */
export interface ExtractedFieldAllocation {
  fieldName: string;
  sezione: string | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  areaHa: number;
}

/**
 * Production unit cycle
 */
export interface ProductionUnitCycle {
  cycleIndex: number;
  cropName: string | null;
  cropType: string | null;
  cropCode: string | null;
  variety: string | null;
  occupazione: string | null;
  destinazione: string | null;
  protectionStructure: string | null;
  startDate: string | null;
  endDate: string | null;
  floweringDate: string | null;
  harvestingDate: string | null;
}

/**
 * Extracted field data from /onboarding/extract
 */
export interface ExtractedField {
  sourceFileId?: string | null;
  name: string;
  nation: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  cap: string | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  sezione: string | null;
  superficieCatastaleMq: number | null;
  gisHa: number | null;
  sauHa: number | null;
  variazioneMq: number | null;
  uso: string | null;
  qualita: string | null;
  soilType: string | null;
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  calcium: number | null;
  magnesium: number | null;
  latitude: number | null;
  longitude: number | null;
  inizioConduzione: string | null;
  fineConduzione: string | null;
}

/**
 * Extracted production unit data from /onboarding/extract
 */
export interface ExtractedProductionUnit {
  name: string;
  cropName: string | null;
  cropType: string | null;
  variety: string | null;
  protocoll: string | null;
  protectionStructure: string | null;
  startDate: string | null;
  endDate: string | null;
  floweringDate: string | null;
  harvestingDate: string | null;
  occupazione: string | null;
  destinazioneDiUso: string | null;
  areaHa: number;
  cycles: ProductionUnitCycle[];
  fieldAllocations: ExtractedFieldAllocation[];
}

/**
 * Response from POST /onboarding/extract
 */
export interface ExtractFromFileResponse {
  status: "success";
  data: {
    fields: ExtractedField[];
    productionUnits: ExtractedProductionUnit[];
    fieldCount: number;
    productionUnitCount: number;
  };
}

/**
 * Input for POST /onboarding/bulk-create
 */
export interface BulkCreateInput {
  companyId: string;
  fields: ExtractedField[];
  productionUnits: ExtractedProductionUnit[];
}

/**
 * Response from POST /onboarding/bulk-create
 */
export interface BulkCreateResponse {
  status: "success";
  data: {
    fields: Array<{
      id: string;
      companyId: string;
      name: string;
      foglio: string | null;
      particella: string | null;
      superficieCatastaleMq: number | null;
      sauHa: number | null;
      region: string | null;
      city: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    productionUnits: Array<{
      id: string;
      cycleId: string;
      name: string;
      cropName: string | null;
      cropType: string | null;
      variety: string | null;
      areaHa: number;
      startDate: string | null;
      endDate: string | null;
      createdAt: string;
    }>;
    fieldCount: number;
    productionUnitCount: number;
  };
}

/**
 * Helper function to safely read response text
 */
async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/**
 * Extracts fields and production units from an uploaded file
 * POST /onboarding/extract
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
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to extract data from file");
  }

  return (await response.json()) as ExtractFromFileResponse;
}

/**
 * Bulk creates fields and production units for a company
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
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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

  public async bulkCreate(
    input: BulkCreateInput,
  ): Promise<BulkCreateResponse> {
    return bulkCreate(input, this.baseUrl);
  }
}

export const quickCreateApiService = new QuickCreateApiService();
