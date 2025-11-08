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

export async function getProducts(
  companyName?: string,
  baseUrl: string = BASE_URL
): Promise<GetProductsResponse> {
  const url = new URL(`${baseUrl}/products/me`);
  if (companyName) {
    url.searchParams.set("companyName", companyName);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Get products failed");
  }

  return (await response.json()) as GetProductsResponse;
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload,
  baseUrl: string = BASE_URL
): Promise<UpdateProductResponse> {
  const response = await fetch(
    `${baseUrl}/products/${encodeURIComponent(productId)}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
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

class ProductsApiService {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getAll(companyName?: string): Promise<GetProductsResponse> {
    return await getProducts(companyName, this.baseUrl);
  }

  public async update(
    productId: string,
    payload: UpdateProductPayload
  ): Promise<UpdateProductResponse> {
    return await updateProduct(productId, payload, this.baseUrl);
  }
}

export const productsApiService = new ProductsApiService(BASE_URL);
