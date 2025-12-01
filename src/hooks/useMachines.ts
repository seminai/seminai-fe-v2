import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  machinesApiService,
  type Machine,
  type CreateMachineRequest,
  type UpdateMachineRequest,
} from "@/api/machines";
import { toast } from "sonner";

type CreateMachineInput = Omit<CreateMachineRequest, "companyId">;

type UpdateMachineInput = {
  machineId: string;
  data: UpdateMachineRequest;
};

interface CompanyMachinesHookResult {
  machines: Machine[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<Machine[]>;
  bulkCreate: (input: CreateMachineInput[]) => Promise<void>;
  isCreating: boolean;
  updateMachine: (input: UpdateMachineInput) => Promise<void>;
  isUpdating: boolean;
  bulkDelete: (machineIds: string[]) => Promise<void>;
  isDeleting: boolean;
}

function useMachinesService() {
  return useMemo(() => machinesApiService, []);
}

export function useMachines(
  companyId?: string
): CompanyMachinesHookResult {
  const queryClient = useQueryClient();
  const service = useMachinesService();

  const machinesQuery = useQuery<Machine[], Error>({
    queryKey: ["company-machines", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      return await service.listByCompany(companyId);
    },
    enabled: Boolean(companyId),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (input: CreateMachineInput[]) => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      await service.bulkCreate({
        machines: input.map((item) => ({ ...item, companyId })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["company-machines", companyId],
      });
      toast.success("Macchine create correttamente");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile creare le macchine";
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateMachineInput) => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      await service.update(input.machineId, input.data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["company-machines", companyId],
      });
      toast.success("Macchina aggiornata correttamente");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile aggiornare la macchina";
      toast.error(message);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (machineIds: string[]) => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      await service.bulkDelete({ ids: machineIds });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["company-machines", companyId],
      });
      toast.success("Macchine eliminate correttamente");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile eliminare le macchine";
      toast.error(message);
    },
  });

  return {
    machines: machinesQuery.data ?? [],
    isLoading: machinesQuery.isLoading,
    isError: machinesQuery.isError,
    error: machinesQuery.error ?? null,
    refetch: async () => {
      const result = await machinesQuery.refetch();
      return result.data ?? [];
    },
    bulkCreate: async (input: CreateMachineInput[]) => {
      await bulkCreateMutation.mutateAsync(input);
    },
    isCreating: bulkCreateMutation.isPending,
    updateMachine: async (input: UpdateMachineInput) => {
      await updateMutation.mutateAsync(input);
    },
    isUpdating: updateMutation.isPending,
    bulkDelete: async (machineIds: string[]) => {
      await bulkDeleteMutation.mutateAsync(machineIds);
    },
    isDeleting: bulkDeleteMutation.isPending,
  };
}

