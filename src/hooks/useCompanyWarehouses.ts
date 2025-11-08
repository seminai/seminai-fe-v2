import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  warehousesApiService,
  type Warehouse,
  type CreateWarehouseRequest,
  type UpdateWarehouseRequest,
} from "@/api/warehouses";
import authService from "@/utils/auth";
import { toast } from "sonner";

type CreateWarehouseInput = Omit<CreateWarehouseRequest, "companyId">;

type UpdateWarehouseInput = {
  warehouseId: string;
  data: UpdateWarehouseRequest;
};

interface CompanyWarehousesHookResult {
  warehouses: Warehouse[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<Warehouse[]>;
  createWarehouse: (input: CreateWarehouseInput) => Promise<void>;
  isCreating: boolean;
  updateWarehouse: (input: UpdateWarehouseInput) => Promise<void>;
  isUpdating: boolean;
  deleteWarehouse: (warehouseId: string) => Promise<void>;
  isDeleting: boolean;
}

function useWarehousesService() {
  return useMemo(() => warehousesApiService, []);
}

export function useCompanyWarehouses(
  companyId?: string
): CompanyWarehousesHookResult {
  const queryClient = useQueryClient();
  const service = useWarehousesService();

  const warehousesQuery = useQuery<Warehouse[], Error>({
    queryKey: ["company-warehouses", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Unauthorized");
      }

      return await service.listByCompany(token, companyId);
    },
    enabled: Boolean(companyId),
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateWarehouseInput) => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Unauthorized");
      }

      await service.create(token, { ...input, companyId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["company-warehouses", companyId],
      });
      toast.success("Magazzino creato correttamente");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile creare il magazzino";
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateWarehouseInput) => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Unauthorized");
      }

      await service.update(token, input.warehouseId, input.data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["company-warehouses", companyId],
      });
      toast.success("Magazzino aggiornato correttamente");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile aggiornare il magazzino";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (warehouseId: string) => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Unauthorized");
      }

      await service.delete(token, warehouseId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["company-warehouses", companyId],
      });
      toast.success("Magazzino eliminato correttamente");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile eliminare il magazzino";
      toast.error(message);
    },
  });

  return {
    warehouses: warehousesQuery.data ?? [],
    isLoading: warehousesQuery.isLoading,
    isError: warehousesQuery.isError,
    error: warehousesQuery.error ?? null,
    refetch: async () => {
      const result = await warehousesQuery.refetch();
      return result.data ?? [];
    },
    createWarehouse: async (input: CreateWarehouseInput) => {
      await createMutation.mutateAsync(input);
    },
    isCreating: createMutation.isPending,
    updateWarehouse: async (input: UpdateWarehouseInput) => {
      await updateMutation.mutateAsync(input);
    },
    isUpdating: updateMutation.isPending,
    deleteWarehouse: async (warehouseId: string) => {
      await deleteMutation.mutateAsync(warehouseId);
    },
    isDeleting: deleteMutation.isPending,
  };
}
