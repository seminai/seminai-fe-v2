import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  patentiniApiService,
  type Patentino,
  type CreatePatentinoRequest,
  type UpdatePatentinoRequest,
} from "@/api/patentini";
import { toast } from "sonner";

type CreatePatentinoInput = Omit<CreatePatentinoRequest, "userId">;

type UpdatePatentinoInput = {
  patentinoId: string;
  data: UpdatePatentinoRequest;
};

interface UserPatentiniHookResult {
  patentini: Patentino[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<Patentino[]>;
  createPatentino: (input: CreatePatentinoInput) => Promise<Patentino>;
  isCreating: boolean;
  updatePatentino: (input: UpdatePatentinoInput) => Promise<Patentino>;
  isUpdating: boolean;
  deletePatentino: (patentinoId: string) => Promise<void>;
  isDeleting: boolean;
}

function usePatentiniService() {
  return useMemo(() => patentiniApiService, []);
}

export function usePatentini(userId?: string): UserPatentiniHookResult {
  const queryClient = useQueryClient();
  const service = usePatentiniService();

  const patentiniQuery = useQuery<Patentino[], Error>({
    queryKey: ["user-patentini", userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error("Missing user identifier");
      }

      return await service.getByUserId(userId);
    },
    enabled: Boolean(userId),
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreatePatentinoInput) => {
      if (!userId) {
        throw new Error("Missing user identifier");
      }

      return await service.create({ ...input, userId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-patentini", userId],
      });
      toast.success("Patentino creato correttamente");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile creare il patentino";
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdatePatentinoInput) => {
      return await service.update(input.patentinoId, input.data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-patentini", userId],
      });
      toast.success("Patentino aggiornato correttamente");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile aggiornare il patentino";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (patentinoId: string) => {
      await service.delete(patentinoId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-patentini", userId],
      });
      toast.success("Patentino eliminato correttamente");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile eliminare il patentino";
      toast.error(message);
    },
  });

  return {
    patentini: patentiniQuery.data ?? [],
    isLoading: patentiniQuery.isLoading,
    isError: patentiniQuery.isError,
    error: patentiniQuery.error ?? null,
    refetch: async () => {
      const result = await patentiniQuery.refetch();
      return result.data ?? [];
    },
    createPatentino: async (input: CreatePatentinoInput) => {
      return await createMutation.mutateAsync(input);
    },
    isCreating: createMutation.isPending,
    updatePatentino: async (input: UpdatePatentinoInput) => {
      return await updateMutation.mutateAsync(input);
    },
    isUpdating: updateMutation.isPending,
    deletePatentino: async (patentinoId: string) => {
      await deleteMutation.mutateAsync(patentinoId);
    },
    isDeleting: deleteMutation.isPending,
  };
}
