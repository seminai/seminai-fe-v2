import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  companiesApiService,
  type Company,
  type BulkCompanyInput,
  type CompaniesResponse,
  type BulkCompaniesResponse,
} from "@/api/companies";
import { toast } from "sonner";

interface UseCompaniesOptions {
  onCreateSuccess?: (response: BulkCompaniesResponse) => void;
  onCreateError?: (error: Error) => void;
}

export function useCompanies(options?: UseCompaniesOptions) {
  const queryClient = useQueryClient();

  // Query per ottenere tutte le companies
  const companiesQuery = useQuery<CompaniesResponse, Error>({
    queryKey: ["companies"],
    queryFn: async () => companiesApiService.getAll(),
  });

  // Mutation per creare companies in bulk
  const createMutation = useMutation({
    mutationFn: async (companies: BulkCompanyInput[]) => {
      return await companiesApiService.bulkCreate({
        companies,
      });
    },
    onSuccess: async (response) => {
      // Refetch esplicito per assicurarsi che i dati vengano aggiornati
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await companiesQuery.refetch();

      // Gestione sicura della risposta per il toast
      const count = response?.data?.companies?.length ?? 0;
      if (count > 0) {
        toast.success(
          `${count} aziend${count === 1 ? "a creata" : "e create"} con successo`
        );
      } else {
        toast.success("Aziende create con successo");
      }

      options?.onCreateSuccess?.(response);
    },
    onError: (error: Error) => {
      console.error("Errore creazione companies:", error);
      toast.error(`Errore durante la creazione: ${error.message}`);
      options?.onCreateError?.(error);
    },
  });

  return {
    // Dati e stati della query
    companies: companiesQuery.data?.data.companies ?? [],
    isLoading: companiesQuery.isLoading,
    isError: companiesQuery.isError,
    error: companiesQuery.error,

    // Mutation per creare companies
    createCompanies: createMutation.mutate,
    isCreating: createMutation.isPending,

    // Utility per refetch
    refetch: companiesQuery.refetch,
  };
}
