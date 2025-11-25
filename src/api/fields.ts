import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type ProductionUnit = {
  id: string;
  companyId?: string | null;
  name: string;
  address?: string | null;
  polygon?: Record<string, unknown> | unknown[] | null;
  latitude?: number | null;
  longitude?: number | null;
  cropCategory?: string | null;
  cropName: string | null;
  cropType?: string | null;
  cropVariety?: string | null;
  variety?: string | null;
  bbchStage?: string | null;
  sauHa?: number | null;
  areaHa?: number | null;
  protocoll?: string | null;
  protectionStructure?: string | null;
  startDate?: string | null;
  floweringDate?: string | null;
  harvestingDate?: string | null;
  endDate?: string | null;
  occupazione?: string | null;
  destinazioneDiUso?: string | null;
  acquaTotalePeridoL?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Field = {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  coordinates: number[];
  latitude: number | null;
  longitude: number | null;
  polygon: Record<string, unknown> | unknown[] | null;
  gisHa: number | null;
  sauHa: number | null;
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  calcium: number | null;
  magnesium: number | null;
  soilType: string | null;
  uso: string | null;
  qualita: string | null;
  superficieCatastaleMq: number;
  sezione: string;
  foglio: string;
  particella: string;
  subalterno: string | null;
  nation: string | null;
  region: string | null;
  city: string | null;
  address: string;
  cap: string | null;
  variazioneMq: string | null;
  inizioConduzione: string | null;
  fineConduzione: string | null;
  createdAt: string;
  updatedAt: string;
  productionUnits: ProductionUnit[];
};

export type FieldsResponse = {
  status: "success";
  data: {
    fields: Field[];
  };
};

export type BulkFieldInput = {
  companyId: string;
  name: string;
  address: string;
  sezione: string;
  foglio: string;
  particella: string;
  superficieCatastaleMq: number;
  coordinates?: number[];
  latitude?: number | null;
  longitude?: number | null;
  polygon?: Record<string, unknown> | unknown[] | null;
  gisHa?: number | null;
  sauHa?: number | null;
  ph?: number | null;
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  calcium?: number | null;
  magnesium?: number | null;
  soilType?: string | null;
  uso?: string | null;
  qualita?: string | null;
  subalterno?: string | null;
  nation?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  cap?: string | null;
  cuaa?: string | null;
  variazioneMq?: string | null;
  inizioConduzione?: string | null;
  fineConduzione?: string | null;
};

export type BulkFieldsRequest = {
  fields: BulkFieldInput[];
};

export type BulkFieldsResponse = {
  status: "success";
  data: {
    fields: Field[];
  };
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function getFields(
  baseUrl: string = BASE_URL
): Promise<FieldsResponse> {
  const response = await authenticatedHttpClient.request(`${baseUrl}/fields`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load fields");
  }

  return (await response.json()) as FieldsResponse;
}

export async function bulkCreateFields(
  request: BulkFieldsRequest,
  baseUrl: string = BASE_URL
): Promise<BulkFieldsResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/fields/bulk`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to create fields");
  }

  return (await response.json()) as BulkFieldsResponse;
}

export type BulkFieldUpdateInput = {
  id: string;
} & Partial<Omit<BulkFieldInput, "companyId">>;

export type BulkFieldsUpdateRequest = {
  fields: BulkFieldUpdateInput[];
};

export async function bulkUpdateFields(
  request: BulkFieldsUpdateRequest,
  baseUrl: string = BASE_URL
): Promise<BulkFieldsResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/fields/bulk`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update fields");
  }

  return (await response.json()) as BulkFieldsResponse;
}

class FieldsApiService {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getAll(): Promise<FieldsResponse> {
    return await getFields(this.baseUrl);
  }

  public async bulkCreate(
    request: BulkFieldsRequest
  ): Promise<BulkFieldsResponse> {
    return await bulkCreateFields(request, this.baseUrl);
  }

  public async bulkUpdate(
    request: BulkFieldsUpdateRequest
  ): Promise<BulkFieldsResponse> {
    return await bulkUpdateFields(request, this.baseUrl);
  }
}

// Types for fields availability API
export type FieldAvailability = {
  id: string;
  name: string;
  sauHa: number;
  areaOccupied: number;
  areaAvailable: number;
  coordinates: number[];
  latitude: number | null;
  longitude: number | null;
  polygon: Record<string, unknown> | unknown[] | null;
  gisHa: number | null;
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  calcium: number | null;
  magnesium: number | null;
  soilType: string | null;
  uso: string | null;
  qualita: string | null;
  superficieCatastaleMq: number;
  sezione: string;
  foglio: string;
  particella: string;
  subalterno: string | null;
  nation: string | null;
  region: string | null;
  city: string | null;
  address: string;
  cap: string | null;
  variazioneMq: string | null;
  inizioConduzione: string | null;
  fineConduzione: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyFieldsAvailability = {
  companyId: string;
  companyName: string;
  fields: FieldAvailability[];
};

export type FieldsAvailabilityResponse = {
  status: "success";
  data: {
    companies: CompanyFieldsAvailability[];
  };
};

export async function getFieldsAvailability(
  startAt: string,
  endAt: string,
  baseUrl: string = BASE_URL
): Promise<FieldsAvailabilityResponse> {
  const params = new URLSearchParams({
    startAt,
    endAt,
  });

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/fields/availability?${params}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load fields availability");
  }

  return (await response.json()) as FieldsAvailabilityResponse;
}

export const fieldsApiService = new FieldsApiService(BASE_URL);
