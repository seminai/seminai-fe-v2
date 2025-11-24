import { useQuery } from "@tanstack/react-query";
import authService from "@/utils/auth";
import { productsApiService, type Product } from "@/api/products";

export class ProductDetailQueryManager {
  private readonly productId: string | null;

  constructor(productId: string | null) {
    this.productId = productId;
  }

  public getQueryKey(): Array<string | null> {
    return ["products", "detail", this.productId];
  }

  public async fetchProduct(): Promise<Product> {
    if (!this.productId) {
      throw new Error("Missing product id");
    }

    const token = authService.getAuthToken();
    if (!token) {
      throw new Error("Unauthorized");
    }

    const response = await productsApiService.getById(token, this.productId);
    return response.data.product;
  }
}

export function useProductDetail(
  productId: string | null,
  shouldFetch: boolean
) {
  const manager = new ProductDetailQueryManager(productId);

  const query = useQuery({
    queryKey: manager.getQueryKey(),
    queryFn: async () => await manager.fetchProduct(),
    enabled: Boolean(productId) && shouldFetch,
    staleTime: 1000 * 60, // 1 minuto
  });

  return {
    product: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}


