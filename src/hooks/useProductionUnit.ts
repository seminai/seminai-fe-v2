import { useQuery } from "@tanstack/react-query";
import {
  productionUnitApiService,
  type ProductionUnitsResponse,
  type GetProductionUnitsByCompaniesRequest,
} from "@/api/production-unit";

interface UseProductionUnitOptions {
  companyIds?: string[];
}

export function useProductionUnit(options?: UseProductionUnitOptions) {
  const companyIds = options?.companyIds ?? [];

  // Query per ottenere le unità produttive
  // Se companyIds è fornito, filtra per aziende, altrimenti ottiene tutte le unità produttive
  const productionUnitsQuery = useQuery<ProductionUnitsResponse, Error>({
    queryKey: ["production-units", companyIds],
    queryFn: async () => {
      if (companyIds.length === 0) {
        // Nessun filtro: ottieni tutte le unità produttive
        return await productionUnitApiService.getAll();
      }
      // Filtra per aziende specifiche
      return await productionUnitApiService.getByCompanies({ companyIds });
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

