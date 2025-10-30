import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fieldsApiService,
  type BulkFieldInput,
  type BulkFieldUpdateInput,
  type FieldsResponse,
  type BulkFieldsResponse,
} from "@/api/fields";
import { toast } from "sonner";

interface UseFieldsOptions {
  onCreateSuccess?: (response: BulkFieldsResponse) => void;
  onCreateError?: (error: Error) => void;
  onUpdateSuccess?: (response: BulkFieldsResponse) => void;
  onUpdateError?: (error: Error) => void;
}

export function useFields(options?: UseFieldsOptions) {
  const queryClient = useQueryClient();

  // Query per ottenere tutti i campi
  const fieldsQuery = useQuery<FieldsResponse, Error>({
    queryKey: ["fields"],
    queryFn: async () => fieldsApiService.getAll(),
  });

  // Mutation per creare campi in bulk
  const createMutation = useMutation({
    mutationFn: async (fields: BulkFieldInput[]) => {
      return await fieldsApiService.bulkCreate({
        fields,
      });
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fields"] });

      // Gestione sicura della risposta - usa i fields dalla risposta o dai parametri
      const createdCount = response?.data?.fields?.length ?? variables.length;
      toast.success(
        `${createdCount} camp${
          createdCount === 1 ? "o creato" : "i creati"
        } con successo`
      );

      options?.onCreateSuccess?.(response);
    },
    onError: (error: Error) => {
      toast.error(`Errore durante la creazione: ${error.message}`);
      options?.onCreateError?.(error);
    },
  });

  // Mutation per aggiornare campi in bulk
  const updateMutation = useMutation({
    mutationFn: async (fields: BulkFieldUpdateInput[]) => {
      return await fieldsApiService.bulkUpdate({
        fields,
      });
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fields"] });

      // Gestione sicura della risposta
      const updatedCount = response?.data?.fields?.length ?? variables.length;
      toast.success(
        `${updatedCount} camp${
          updatedCount === 1 ? "o aggiornato" : "i aggiornati"
        } con successo`
      );

      options?.onUpdateSuccess?.(response);
    },
    onError: (error: Error) => {
      toast.error(`Errore durante l'aggiornamento: ${error.message}`);
      options?.onUpdateError?.(error);
    },
  });

  return {
    // Dati e stati della query
    fields: fieldsQuery.data?.data.fields ?? [],
    isLoading: fieldsQuery.isLoading,
    isError: fieldsQuery.isError,
    error: fieldsQuery.error,

    // Mutation per creare campi
    createFields: createMutation.mutate,
    isCreating: createMutation.isPending,

    // Mutation per aggiornare campi
    updateFields: updateMutation.mutate,
    isUpdating: updateMutation.isPending,

    // Utility per refetch
    refetch: fieldsQuery.refetch,
  };
}
