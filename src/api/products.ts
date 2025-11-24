import { AuthorizedHeadersBuilder } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export type StockEntry = {
  id: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  unitOfMeasurePrice?: string | null;
  price?: number | null;
  type: "IN" | "OUT";
  jobId: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  job: {
    id: string;
    isVerified: boolean;
    category?: string | null;
    dateOfOperation?: string | null;
    dateOfOpeation?: string | null;
    quantity?: number | null;
    unitOfMeasureQuantity?: string | null;
    productQuantityTreated?: number | null;
    unitOfMeasureProductQuantityTreated?: string | null;
    treatedSurface?: number | null;
    modeOfApplication?: string | null;
    avversity?: string | null;
    giustification?: string | null;
    isLocalizedTreatment?: boolean | null;
    note?: string | null;
    totalDistributedWaterL?: number | null;
    productionUnit?: {
      id: string;
      name: string;
      cropName?: string | null;
      cropType?: string | null;
      variety?: string | null;
      areaHa?: number | null;
      productionUnitsOnFields?: Array<{
        id: string;
        areaHaOnField?: number | null;
        field?: {
          id: string;
          name: string;
          coordinates?: [number, number];
          soilType?: string | null;
          nation?: string | null;
          region?: string | null;
          city?: string | null;
          address?: string | null;
          cap?: string | null;
        };
      }>;
    };
  } | null;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string;
  barcode?: string;
  warehouseId: string;
  warehouse: {
    name: string;
    company: {
      id: string;
      name: string;
    };
  };
  stocks: StockEntry[];
};

export type GetProductsResponse = {
  status: "success" | string;
  data: {
    products: Product[];
  };
};

export type GetProductResponse = {
  status: "success" | string;
  data: {
    product: Product;
  };
};

export type UpdateProductPayload = {
  name?: string;
  description?: string;
  barcode?: string;
};

export type UpdateProductResponse = {
  status: "success" | string;
  data?: unknown;
};

export type BulkFromDdtEntry = {
  productName: string;
  registrationNumber?: string;
  quantity: number;
  quantityUnitOfMeasure: string;
  supplierName?: string;
  supplierVat?: string;
};

export type BulkFromDdtFileResult = {
  fileName?: string;
  entries: BulkFromDdtEntry[];
};

export type BulkFromDdtSuggestedProduct = {
  productName: string;
  registrationNumber?: string | null;
  quantity: number;
  quantityUnitOfMeasure: string;
  supplierName?: string | null;
  supplierVat?: string | null;
};

export type BulkFromDdtToProductListResponse = {
  status: "success" | string;
  data?: {
    totalFiles?: number;
    totalEntries?: number;
    results?: BulkFromDdtFileResult[];
    suggestedProducts?: BulkFromDdtSuggestedProduct[];
  };
};

export type BulkProductStockPayload = {
  quantity: number;
  unitOfMeasureQuantity: string;
  price?: number;
  unitOfMeasurePrice?: string;
  type?: "IN" | "OUT";
  ddtCode?: string;
  companySupplierName?: string;
};

export type BulkProductPayload = {
  name: string;
  sku: string;
  category?: string;
  type?: string;
  description?: string;
  registrationNumber?: string;
  labelUrl?: string;
  labelMetadata?: Record<string, unknown>;
  stock?: BulkProductStockPayload;
};

export type BulkImportProductsPayload = {
  companyId: string;
  warehouseId: string;
  products: BulkProductPayload[];
};

export type BulkImportProductsResponse = {
  status: "success" | string;
  data?: {
    imported?: number;
    skipped?: number;
    errors?: Array<{
      row?: number;
      message: string;
    }>;
  };
};

export async function getProducts(
  token: string,
  companyName?: string,
  baseUrl: string = BASE_URL
): Promise<GetProductsResponse> {
  const url = new URL(`${baseUrl}/products/me`);
  if (companyName) {
    url.searchParams.set("companyName", companyName);
  }

  const headersBuilder = new AuthorizedHeadersBuilder(token);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: headersBuilder.build({
      Accept: "application/json",
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Get products failed");
  }

  return (await response.json()) as GetProductsResponse;
}

export async function getProduct(
  token: string,
  productId: string,
  baseUrl: string = BASE_URL
): Promise<GetProductResponse> {
  const headersBuilder = new AuthorizedHeadersBuilder(token);

  const response = await fetch(
    `${baseUrl}/products/${encodeURIComponent(productId)}`,
    {
      method: "GET",
      headers: headersBuilder.build({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      credentials: "include",
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Get product failed");
  }

  return (await response.json()) as GetProductResponse;
}

export async function updateProduct(
  token: string,
  productId: string,
  payload: UpdateProductPayload,
  baseUrl: string = BASE_URL
): Promise<UpdateProductResponse> {
  const headersBuilder = new AuthorizedHeadersBuilder(token);

  const response = await fetch(
    `${baseUrl}/products/${encodeURIComponent(productId)}`,
    {
      method: "PUT",
      headers: headersBuilder.build({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Update product failed");
  }

  return (await response.json()) as UpdateProductResponse;
}

export async function importProductsFromDdt(
  token: string,
  files: File[],
  baseUrl: string = BASE_URL
): Promise<BulkFromDdtToProductListResponse> {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("At least one DDT file is required to import products");
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const headersBuilder = new AuthorizedHeadersBuilder(token);

  const response = await fetch(
    `${baseUrl}/products/bulk-from-ddt-to-product-list`,
    {
      method: "POST",
      headers: headersBuilder.build(),
      credentials: "include",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Bulk DDT import failed");
  }

  return (await response.json()) as BulkFromDdtToProductListResponse;
}

export async function bulkImportProducts(
  token: string,
  payload: BulkImportProductsPayload,
  baseUrl: string = BASE_URL
): Promise<BulkImportProductsResponse> {
  if (!payload?.companyId || !payload?.warehouseId) {
    throw new Error("Company and warehouse identifiers are required");
  }

  if (!Array.isArray(payload.products) || payload.products.length === 0) {
    throw new Error("At least one product is required for the bulk import");
  }

  const headersBuilder = new AuthorizedHeadersBuilder(token);

  const response = await fetch(`${baseUrl}/products/bulk`, {
    method: "POST",
    headers: headersBuilder.build({
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Bulk import failed");
  }

  return (await response.json()) as BulkImportProductsResponse;
}

class ProductsApiService {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getAll(
    token: string,
    companyName?: string
  ): Promise<GetProductsResponse> {
    return await getProducts(token, companyName, this.baseUrl);
  }

  public async getById(
    token: string,
    productId: string
  ): Promise<GetProductResponse> {
    return await getProduct(token, productId, this.baseUrl);
  }

  public async update(
    token: string,
    productId: string,
    payload: UpdateProductPayload
  ): Promise<UpdateProductResponse> {
    return await updateProduct(token, productId, payload, this.baseUrl);
  }

  public async importFromDdt(
    token: string,
    files: File[]
  ): Promise<BulkFromDdtToProductListResponse> {
    return await importProductsFromDdt(token, files, this.baseUrl);
  }

  public async bulkImport(
    token: string,
    payload: BulkImportProductsPayload
  ): Promise<BulkImportProductsResponse> {
    return await bulkImportProducts(token, payload, this.baseUrl);
  }
}

export const productsApiService = new ProductsApiService(BASE_URL);
