import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Represents the extracted company data from CSV
 */
export interface ExtractedCompany {
  name: string;
  vatNumber: string | null;
  fiscalCode: string | null;
  cuaa: string | null;
  nation: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  cap: string | null;
}

/**
 * Represents the extracted field data from CSV
 */
export interface ExtractedField {
  name: string;
  municipality: string | null;
  province: string | null;
  cadastralSheet: string | null;
  cadastralParcel: string | null;
  cadastralPortion: string | null;
  cadastralQuality: string | null;
  surface: number | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Represents the extracted production unit data from CSV
 */
export interface ExtractedProductionUnit {
  cropCode: string | null;
  cropDescription: string | null;
  varietyCode: string | null;
  varietyDescription: string | null;
  surface: number | null;
  fieldName: string | null;
}

/**
 * Represents the summary of extracted data
 */
export interface ExtractionSummary {
  fieldsCount: number;
  productionUnitsCount: number;
}

/**
 * Response from the extract-from-csv endpoint
 */
export interface ExtractFromCsvResponse {
  status: "success";
  data: {
    company: ExtractedCompany;
    fields: ExtractedField[];
    productionUnits: ExtractedProductionUnit[];
    summary: ExtractionSummary;
  };
}

/**
 * Input for creating company with data
 */
export interface CreateWithDataInput {
  companyId?: string;
  company: ExtractedCompany;
  fields: ExtractedField[];
  productionUnits: ExtractedProductionUnit[];
}

/**
 * Response from the create-with-data endpoint
 */
export interface CreateWithDataResponse {
  status: "success";
  data: {
    company: { id: string } & ExtractedCompany;
    fields: Array<{ id: string } & ExtractedField>;
    productionUnits: Array<{ id: string } & ExtractedProductionUnit>;
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
 * Extracts company, fields and production units data from a CSV/Excel file
 */
export async function extractFromCsv(
  file: File,
  companyId?: string,
  baseUrl: string = BASE_URL
): Promise<ExtractFromCsvResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (companyId) {
    formData.append("companyId", companyId);
  }

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/companies/extract-from-csv`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to extract data from CSV");
  }

  return (await response.json()) as ExtractFromCsvResponse;
}

/**
 * Creates a company with its associated fields and production units
 */
export async function createWithData(
  input: CreateWithDataInput,
  baseUrl: string = BASE_URL
): Promise<CreateWithDataResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/companies/create-with-data`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to create company with data");
  }

  return (await response.json()) as CreateWithDataResponse;
}

/**
 * Service class for quick create operations
 */
export class QuickCreateApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public async extractFromCsv(
    file: File,
    companyId?: string
  ): Promise<ExtractFromCsvResponse> {
    return extractFromCsv(file, companyId, this.baseUrl);
  }

  public async createWithData(
    input: CreateWithDataInput
  ): Promise<CreateWithDataResponse> {
    return createWithData(input, this.baseUrl);
  }
}

export const quickCreateApiService = new QuickCreateApiService();

