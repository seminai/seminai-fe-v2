import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  productionUnitCycleApiService,
  type ProductionCycle,
  type ProductionCycleUpdateInput,
  type ProductionUnitCyclesResponse,
} from "@/api/production-unit-cycle";

type UpdateCycleArgs = {
  cycleId: string;
  data: ProductionCycleUpdateInput;
};

export function useProductionUnitCycles(productionUnitId?: string) {
  const queryClient = useQueryClient();

  const cyclesQuery = useQuery<ProductionUnitCyclesResponse, Error>({
    queryKey: ["production-unit-cycles", productionUnitId],
    queryFn: async () => {
      if (!productionUnitId) {
        throw new Error("productionUnitId is required");
      }
      return await productionUnitCycleApiService.getAll(productionUnitId);
    },
    enabled: Boolean(productionUnitId),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ cycleId, data }: UpdateCycleArgs) => {
      if (!productionUnitId) {
        throw new Error("productionUnitId is required");
      }
      return await productionUnitCycleApiService.update(
        productionUnitId,
        cycleId,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["production-unit-cycles", productionUnitId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      if (!productionUnitId) {
        throw new Error("productionUnitId is required");
      }
      return await productionUnitCycleApiService.delete(
        productionUnitId,
        cycleId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["production-unit-cycles", productionUnitId],
      });
    },
  });

  return {
    cycles: cyclesQuery.data?.data.cycles ?? ([] as ProductionCycle[]),
    productionUnitName: cyclesQuery.data?.data.productionUnitName ?? "",
    totalCycles: cyclesQuery.data?.data.totalCycles ?? 0,
    isLoading: cyclesQuery.isLoading,
    isError: cyclesQuery.isError,
    error: cyclesQuery.error,
    refetch: cyclesQuery.refetch,
    updateCycle: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCycle: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

