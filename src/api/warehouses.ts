const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type Warehouse = {
  id: string;
  companyId: string;
  name: string;
  nation: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  cap: string | null;
  sezione: string | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateWarehouseRequest = {
  companyId: string;
  name: string;
  nation: string;
  region: string;
  city: string;
  address: string;
  cap: string;
  sezione?: string | null;
  foglio?: string | null;
  particella?: string | null;
  subalterno?: string | null;
};

export type UpdateWarehouseRequest = Partial<
  Omit<CreateWarehouseRequest, "companyId">
>;

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

class WarehousesApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async listByCompany(
    token: string,
    companyId: string
  ): Promise<Warehouse[]> {
    const response = await fetch(
      `${this.baseUrl}/warehouses/company/${encodeURIComponent(companyId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to load company warehouses");
    }

    const payload = await response.json();
    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizeWarehouse(item));
    }

    if (payload?.data?.warehouses && Array.isArray(payload.data.warehouses)) {
      return payload.data.warehouses.map((item: Warehouse) =>
        this.normalizeWarehouse(item)
      );
    }

    return [];
  }

  public async create(
    token: string,
    request: CreateWarehouseRequest
  ): Promise<Warehouse> {
    const response = await fetch(`${this.baseUrl}/warehouses`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to create company warehouse");
    }

    const payload = await response.json();
    if (payload?.data?.warehouse) {
      return this.normalizeWarehouse(payload.data.warehouse);
    }

    return this.normalizeWarehouse(payload);
  }

  public async update(
    token: string,
    warehouseId: string,
    request: UpdateWarehouseRequest
  ): Promise<Warehouse> {
    const response = await fetch(
      `${this.baseUrl}/warehouses/${encodeURIComponent(warehouseId)}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to update company warehouse");
    }

    const payload = await response.json();
    if (payload?.data?.warehouse) {
      return this.normalizeWarehouse(payload.data.warehouse);
    }

    return this.normalizeWarehouse(payload);
  }

  public async delete(token: string, warehouseId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/warehouses/${encodeURIComponent(warehouseId)}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to delete company warehouse");
    }
  }

  private normalizeWarehouse(data: Partial<Warehouse>): Warehouse {
    return {
      id: data.id ?? "",
      companyId: data.companyId ?? "",
      name: data.name ?? "",
      nation: data.nation ?? null,
      region: data.region ?? null,
      city: data.city ?? null,
      address: data.address ?? null,
      cap: data.cap ?? null,
      sezione: data.sezione ?? null,
      foglio: data.foglio ?? null,
      particella: data.particella ?? null,
      subalterno: data.subalterno ?? null,
      createdAt: data.createdAt ?? "",
      updatedAt: data.updatedAt ?? "",
    };
  }
}

export const warehousesApiService = new WarehousesApiService(BASE_URL);

export function createWarehousesApiService(
  baseUrl: string
): WarehousesApiService {
  return new WarehousesApiService(baseUrl);
}
