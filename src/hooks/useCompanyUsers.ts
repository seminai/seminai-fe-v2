import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  userOnCompanyApiService,
  type UserOnCompany,
  type UserOnCompanyRole,
  type CreateUserOnCompanyRequest,
  type UpdateUserOnCompanyRoleResponse,
} from "@/api/userOnCompany";
import { toast } from "sonner";

type AddCompanyUserInput = Omit<CreateUserOnCompanyRequest, "companyId">;

type UpdateCompanyUserRoleInput = {
  relationId: string;
  role: UserOnCompanyRole;
};

interface CompanyUsersHookResult {
  users: UserOnCompany[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<UserOnCompany[]>;
  addUser: (input: AddCompanyUserInput) => Promise<void>;
  isAdding: boolean;
  removeUser: (userId: string) => Promise<void>;
  isRemoving: boolean;
  updateRole: (
    input: UpdateCompanyUserRoleInput
  ) => Promise<UpdateUserOnCompanyRoleResponse | undefined>;
  isUpdatingRole: boolean;
}

function useUserOnCompanyService() {
  return useMemo(() => userOnCompanyApiService, []);
}

export function useCompanyUsers(companyId?: string): CompanyUsersHookResult {
  const queryClient = useQueryClient();
  const service = useUserOnCompanyService();

  const usersQuery = useQuery<UserOnCompany[], Error>({
    queryKey: ["company-users", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      const response = await service.listByCompany(companyId);
      return response.data?.users ?? [];
    },
    enabled: Boolean(companyId),
  });

  const addMutation = useMutation({
    mutationFn: async (input: AddCompanyUserInput) => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      await service.create({ ...input, companyId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["company-users", companyId],
      });
      toast.success("Utente aggiunto all'azienda");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile aggiungere l'utente";
      toast.error(message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      await service.delete(companyId, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["company-users", companyId],
      });
      toast.success("Utente rimosso dall'azienda");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile rimuovere l'utente";
      toast.error(message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (input: UpdateCompanyUserRoleInput) => {
      if (!companyId) {
        throw new Error("Missing company identifier");
      }

      return await service.updateRole(input.relationId, {
        role: input.role,
        companyId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["company-users", companyId],
      });
      toast.success("Ruolo utente aggiornato");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile aggiornare il ruolo";
      toast.error(message);
    },
  });

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error ?? null,
    refetch: async () => {
      const result = await usersQuery.refetch();
      return result.data ?? [];
    },
    addUser: async (input: AddCompanyUserInput) => {
      await addMutation.mutateAsync(input);
    },
    isAdding: addMutation.isPending,
    removeUser: async (userId: string) => {
      await removeMutation.mutateAsync(userId);
    },
    isRemoving: removeMutation.isPending,
    updateRole: async (input: UpdateCompanyUserRoleInput) => {
      return await updateRoleMutation.mutateAsync(input);
    },
    isUpdatingRole: updateRoleMutation.isPending,
  };
}
