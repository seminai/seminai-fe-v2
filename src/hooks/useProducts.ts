import { useQuery } from "@tanstack/react-query";
import { productsApiService, type Product } from "@/api/products";
import authService from "@/utils/auth";

export class ProductsQueryManager {
  private readonly companyName?: string;

  constructor(companyName?: string) {
    this.companyName = companyName;
  }

  public async fetchProducts(): Promise<Product[]> {
    const token = authService.getAuthToken();
    if (!token) {
      throw new Error("Unauthorized");
    }
    const response = await productsApiService.getAll(token, this.companyName);
    return response.data.products;
  }

  public getQueryKey(): string[] {
    const key = ["products", "me"];
    if (this.companyName) {
      key.push(this.companyName);
    }
    return key;
  }
}

export function useProducts(companyName?: string) {
  const manager = new ProductsQueryManager(companyName);

  const query = useQuery({
    queryKey: manager.getQueryKey(),
    queryFn: async () => await manager.fetchProducts(),
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
