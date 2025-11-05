const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type ProductionUnitData = {
  id: string;
  name: string;
  cropName: string;
  cropType: string;
  variety: string;
  protocoll: string;
  areaHa: number;
  protectionStructure: string;
  startDate: string;
  floweringDate: string | null;
  harvestingDate: string | null;
  endDate: string | null;
  occupazione: string | null;
  destinazioneDiUso: string | null;
  acquaTotalePeridoL: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Crop = {
  name: string;
  type: string;
  variety: string;
};

export type FieldInfo = {
  id: string;
  name: string;
  sauHa: number;
  gisHa: number;
};

export type ProductionUnit = {
  productionUnit: ProductionUnitData;
  companyId: string;
  companyName: string;
  crop: Crop;
  field: FieldInfo;
  areaHaOnField: number;
};

export type ProductionUnitsResponse = {
  status: "success";
  data: {
    productionUnits: ProductionUnit[];
  };
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function getProductionUnits(
  baseUrl: string = BASE_URL
): Promise<ProductionUnitsResponse> {
  const response = await fetch(`${baseUrl}/production-units`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load production units");
  }

  return (await response.json()) as ProductionUnitsResponse;
}

// Types for creating production units
export type ProductionUnitCreateAllocation = {
  fieldId: string;
  areaHa: number;
};

export type ProductionUnitCreateInput = {
  name: string;
  companyId: string;
  cropName: string;
  cropType: string;
  variety: string;
  protocoll: string;
  allocations: ProductionUnitCreateAllocation[];
  protectionStructure: string;
  startDate: string;
  floweringDate: string | null;
  harvestingDate: string | null;
  endDate: string | null;
  occupazione?: string | null;
  destinazioneDiUso?: string | null;
  acquaTotalePeridoL?: number | null;
};

export type BulkCreateProductionUnitsRequest = {
  productionUnits: ProductionUnitCreateInput[];
};

export type BulkCreateProductionUnitsResponse = {
  status: "success";
  data: {
    created: number;
    productionUnits: ProductionUnit[];
  };
};

// API function for bulk create
export async function bulkCreateProductionUnits(
  request: BulkCreateProductionUnitsRequest,
  baseUrl: string = BASE_URL
): Promise<BulkCreateProductionUnitsResponse> {
  const response = await fetch(`${baseUrl}/production-units/bulk/create`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to create production units");
  }

  return (await response.json()) as BulkCreateProductionUnitsResponse;
}

// API function for delete
export async function deleteProductionUnit(
  id: string,
  baseUrl: string = BASE_URL
): Promise<void> {
  const response = await fetch(`${baseUrl}/production-units/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to delete production unit");
  }
}

// Types for update
export type ProductionUnitUpdateInput = {
  name?: string;
  cropName?: string;
  cropType?: string;
  variety?: string;
  protocoll?: string;
  areaHa?: number;
  protectionStructure?: string;
  startDate?: string;
  floweringDate?: string | null;
  harvestingDate?: string | null;
  endDate?: string | null;
  occupazione?: string | null;
  destinazioneDiUso?: string | null;
  acquaTotalePeridoL?: number | null;
};

export type ProductionUnitUpdateResponse = {
  status: "success";
  data: {
    productionUnit: ProductionUnit;
  };
};

// API function for single update
export async function updateProductionUnit(
  id: string,
  data: ProductionUnitUpdateInput,
  baseUrl: string = BASE_URL
): Promise<ProductionUnitUpdateResponse> {
  const response = await fetch(`${baseUrl}/production-units/${id}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update production unit");
  }

  return (await response.json()) as ProductionUnitUpdateResponse;
}

// Types for bulk update
export type BulkUpdateProductionUnitItem = {
  id: string;
} & ProductionUnitUpdateInput;

export type BulkUpdateProductionUnitsRequest = {
  productionUnits: BulkUpdateProductionUnitItem[];
};

export type BulkUpdateProductionUnitsResponse = {
  status: "success";
  data: {
    updated: number;
    productionUnits: ProductionUnit[];
  };
};

// API function for bulk update
export async function bulkUpdateProductionUnits(
  request: BulkUpdateProductionUnitsRequest,
  baseUrl: string = BASE_URL
): Promise<BulkUpdateProductionUnitsResponse> {
  const response = await fetch(`${baseUrl}/production-units/bulk`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to bulk update production units");
  }

  return (await response.json()) as BulkUpdateProductionUnitsResponse;
}

class ProductionUnitApiService {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getAll(): Promise<ProductionUnitsResponse> {
    return await getProductionUnits(this.baseUrl);
  }

  public async bulkCreate(
    request: BulkCreateProductionUnitsRequest
  ): Promise<BulkCreateProductionUnitsResponse> {
    return await bulkCreateProductionUnits(request, this.baseUrl);
  }

  public async bulkImport(
    request: BulkImportRequest
  ): Promise<BulkImportResponse> {
    return await bulkImportProductionUnits(request, this.baseUrl);
  }

  public async delete(id: string): Promise<void> {
    return await deleteProductionUnit(id, this.baseUrl);
  }

  public async update(
    id: string,
    data: ProductionUnitUpdateInput
  ): Promise<ProductionUnitUpdateResponse> {
    return await updateProductionUnit(id, data, this.baseUrl);
  }

  public async bulkUpdate(
    request: BulkUpdateProductionUnitsRequest
  ): Promise<BulkUpdateProductionUnitsResponse> {
    return await bulkUpdateProductionUnits(request, this.baseUrl);
  }
}

export const productionUnitApiService = new ProductionUnitApiService(BASE_URL);

// Types for bulk-import (from CSV)
export type BulkImportFieldAllocation = {
  fieldName: string;
  sezione?: string;
  foglio?: string;
  particella?: string;
  subalterno?: string;
  areaHa: number;
};

export type BulkImportProductionUnit = {
  name: string;
  cropName: string;
  cropType: string;
  variety: string;
  protocoll: string;
  protectionStructure: string;
  startDate: string;
  floweringDate?: string;
  harvestingDate?: string;
  endDate?: string;
  occupazione?: string;
  destinazioneDiUso?: string;
  acquaTotalePeridoL?: number;
  fieldAllocations: BulkImportFieldAllocation[];
};

export type BulkImportField = {
  name: string;
  coordinates?: [number, number];
  latitude?: number;
  longitude?: number;
  polygon?: string;
  gisHa?: number;
  sauHa?: number;
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  calcium?: number;
  magnesium?: number;
  soilType?: string;
  uso?: string;
  qualita?: string;
  superficieCatastaleMq?: number;
  sezione?: string;
  foglio?: string;
  particella?: string;
  subalterno?: string;
  nation?: string;
  region?: string;
  city?: string;
  address?: string;
  cap?: string;
  variazioneMq?: number;
  inizioConduzione?: string;
  fineConduzione?: string;
};

export type BulkImportRequest = {
  companyName: string;
  vatNumber: string;
  fields: BulkImportField[];
  productionUnits: BulkImportProductionUnit[];
};

export type BulkImportResponse = {
  status: "success";
  data: {
    message: string;
    created: {
      fields: number;
      productionUnits: number;
    };
  };
};

// API function for bulk-import (CSV)
export async function bulkImportProductionUnits(
  request: BulkImportRequest,
  baseUrl: string = BASE_URL
): Promise<BulkImportResponse> {
  const response = await fetch(`${baseUrl}/production-units/bulk-import`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to bulk import production units");
  }

  return (await response.json()) as BulkImportResponse;
}
