import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type ProductionCycleStatus = "past" | "current" | "future" | string;

export type ProductionCycle = {
  id: string;
  cropName: string;
  cropType?: string;
  variety?: string;
  floweringDate: string | null;
  harvestingDate: string | null;
  seasonYear?: number;
  cycleIndex?: number;
  status?: ProductionCycleStatus;
  destinazioneDiUso?: string | null;
};

export type ProductionUnitCyclesResponse = {
  status: "success";
  data: {
    productionUnitId: string;
    productionUnitName: string;
    cycles: ProductionCycle[];
    totalCycles: number;
  };
};

export type ProductionCycleUpdateInput = {
  floweringDate?: string | null;
  harvestingDate?: string | null;
  destinazioneDiUso?: string | null;
  cropName?: string;
  cropType?: string;
  variety?: string;
  seasonYear?: number;
  cycleIndex?: number;
  status?: ProductionCycleStatus;
};

export type ProductionCycleUpdateResponse = {
  status: "success";
  data: {
    cycle: ProductionCycle;
  };
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function getProductionUnitCycles(
  productionUnitId: string,
  baseUrl: string = BASE_URL
): Promise<ProductionUnitCyclesResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/production-units/${productionUnitId}/cycles`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load production unit cycles");
  }

  return (await response.json()) as ProductionUnitCyclesResponse;
}

export async function updateProductionUnitCycle(
  productionUnitId: string,
  cycleId: string,
  data: ProductionCycleUpdateInput,
  baseUrl: string = BASE_URL
): Promise<ProductionCycleUpdateResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/production-units/${productionUnitId}/cycles/${cycleId}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update production unit cycle");
  }

  return (await response.json()) as ProductionCycleUpdateResponse;
}

export async function deleteProductionUnitCycle(
  productionUnitId: string,
  cycleId: string,
  baseUrl: string = BASE_URL
): Promise<void> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/production-units/${productionUnitId}/cycles/${cycleId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to delete production unit cycle");
  }
}

class ProductionUnitCycleApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getAll(
    productionUnitId: string
  ): Promise<ProductionUnitCyclesResponse> {
    return await getProductionUnitCycles(productionUnitId, this.baseUrl);
  }

  public async update(
    productionUnitId: string,
    cycleId: string,
    data: ProductionCycleUpdateInput
  ): Promise<ProductionCycleUpdateResponse> {
    return await updateProductionUnitCycle(
      productionUnitId,
      cycleId,
      data,
      this.baseUrl
    );
  }

  public async delete(
    productionUnitId: string,
    cycleId: string
  ): Promise<void> {
    await deleteProductionUnitCycle(productionUnitId, cycleId, this.baseUrl);
  }
}

export const productionUnitCycleApiService = new ProductionUnitCycleApiService(
  BASE_URL
);

