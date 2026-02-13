import { useQuery } from "@tanstack/react-query";
import { productsApiService, type Product } from "@/api/products";

export class ProductsQueryManager {
  private readonly companyName?: string;

  constructor(companyName?: string) {
    this.companyName = companyName;
  }

  public async fetchProducts(): Promise<Product[]> {
    const response = await productsApiService.getAll(this.companyName);
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
    staleTime: 0,
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
