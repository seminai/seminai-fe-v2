import { useQuery } from "@tanstack/react-query";
import {
  productionUnitApiService,
  type ProductionUnitsResponse,
} from "@/api/production-unit";
import authService from "@/utils/auth";

export function useProductionUnit() {
  // Query per ottenere tutte le unità produttive
  const productionUnitsQuery = useQuery<ProductionUnitsResponse, Error>({
    queryKey: ["production-units"],
    queryFn: async () => {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Unauthorized");
      }
      return await productionUnitApiService.getAll(token);
    },
  });

  return {
    // Dati e stati della query
    productionUnits:
      productionUnitsQuery.data?.data.productionUnits ?? [],
    isLoading: productionUnitsQuery.isLoading,
    isError: productionUnitsQuery.isError,
    error: productionUnitsQuery.error,

    // Utility per refetch
    refetch: productionUnitsQuery.refetch,
  };
}

