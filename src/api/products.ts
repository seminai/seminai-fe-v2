const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export type UpdateProductPayload = Record<string, unknown>;

export type UpdateProductResponse = {
  status: "success" | string;
  data?: unknown;
};

export async function updateProductWithBearer(
  token: string,
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
        Authorization: `Bearer ${token}`,
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

  public async updateWithBearer(
    token: string,
    productId: string,
    payload: UpdateProductPayload
  ): Promise<UpdateProductResponse> {
    return await updateProductWithBearer(
      token,
      productId,
      payload,
      this.baseUrl
    );
  }
}

export const productsApiService = new ProductsApiService(BASE_URL);
