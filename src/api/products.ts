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
  type: "IN" | "OUT";
  jobId: string | null;
  job: {
    isVerified: boolean;
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
}

export const productsApiService = new ProductsApiService(BASE_URL);
