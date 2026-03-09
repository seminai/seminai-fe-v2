import type { APIRequestContext } from "@playwright/test";
import type { TestContext } from "./test-data";

const API_BASE_URL = process.env.VITE_API_URL ?? "http://localhost:8081";

type EntityWithId = { id: string };
type Company = EntityWithId & { name: string };
type Warehouse = EntityWithId & { companyId: string; name: string };
type Product = EntityWithId & {
  warehouse: { company: { id: string; name: string } };
};
type Field = EntityWithId & { companyId: string };
type ProductionUnit = EntityWithId & { companyId: string };

async function parseJsonOrThrow<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || fallback);
  }
  return (await response.json()) as T;
}

export async function fetchCompanies(
  request: APIRequestContext,
): Promise<Company[]> {
  const response = await request.get(`${API_BASE_URL}/companies`);
  const payload = await parseJsonOrThrow<{ data?: { companies?: Company[] } }>(
    response,
    "Failed to load companies",
  );
  return payload.data?.companies ?? [];
}

export async function fetchFields(
  request: APIRequestContext,
): Promise<Field[]> {
  const response = await request.get(`${API_BASE_URL}/fields`);
  const payload = await parseJsonOrThrow<{ data?: { fields?: Field[] } }>(
    response,
    "Failed to load fields",
  );
  return payload.data?.fields ?? [];
}

export async function fetchProductionUnits(
  request: APIRequestContext,
): Promise<ProductionUnit[]> {
  const response = await request.get(`${API_BASE_URL}/production-units`);
  const payload = await parseJsonOrThrow<{
    data?: { productionUnits?: ProductionUnit[] };
  }>(response, "Failed to load production units");
  return payload.data?.productionUnits ?? [];
}

export async function fetchWarehousesByCompany(
  request: APIRequestContext,
  companyId: string,
): Promise<Warehouse[]> {
  const response = await request.get(
    `${API_BASE_URL}/warehouses/company/${encodeURIComponent(companyId)}`,
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to load warehouses");
  }

  const payload = (await response.json()) as unknown;
  if (Array.isArray(payload)) {
    return payload as Warehouse[];
  }
  return ((payload as { data?: { warehouses?: Warehouse[] } }).data
    ?.warehouses ?? []) as Warehouse[];
}

export async function fetchProductsByCompanyName(
  request: APIRequestContext,
  companyName: string,
): Promise<Product[]> {
  const url = new URL(`${API_BASE_URL}/products/me`);
  url.searchParams.set("companyName", companyName);
  const response = await request.get(url.toString());
  const payload = await parseJsonOrThrow<{ data?: { products?: Product[] } }>(
    response,
    "Failed to load products",
  );
  return payload.data?.products ?? [];
}

async function deleteProducts(
  request: APIRequestContext,
  companyId: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const response = await request.delete(`${API_BASE_URL}/products/bulk`, {
    data: { companyId, ids },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to delete products");
  }
}

async function deleteWarehouses(
  request: APIRequestContext,
  warehouseIds: string[],
): Promise<void> {
  for (const id of warehouseIds) {
    const response = await request.delete(
      `${API_BASE_URL}/warehouses/${encodeURIComponent(id)}`,
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to delete warehouse ${id}`);
    }
  }
}

async function deleteProductionUnits(
  request: APIRequestContext,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const response = await request.delete(
    `${API_BASE_URL}/production-units/bulk`,
    {
      data: { ids },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to delete production units");
  }
}

async function deleteFields(
  request: APIRequestContext,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const response = await request.delete(`${API_BASE_URL}/fields/bulk`, {
    data: { ids },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to delete fields");
  }
}

export async function cleanupTestData(
  request: APIRequestContext,
  context: TestContext,
): Promise<void> {
  if (!context.companyId) return;

  const errors: string[] = [];
  const run = async (fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  };

  await run(() =>
    deleteProducts(request, context.companyId!, context.productIds),
  );
  await run(() => deleteWarehouses(request, context.warehouseIds));
  await run(() => deleteProductionUnits(request, context.productionUnitIds));
  await run(() => deleteFields(request, context.fieldIds));

  if (errors.length) {
    throw new Error(`Cleanup failed: ${errors.join(" | ")}`);
  }
}
