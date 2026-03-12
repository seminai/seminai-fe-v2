import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import {
  companiesApiService,
  type BulkCompanyInput,
  type BulkCompanyUpdateInput,
  type CompaniesResponse,
  type BulkCompaniesResponse,
} from "@/api/companies";
import { toast } from "sonner";

interface UseCompaniesOptions {
  onCreateSuccess?: (response: BulkCompaniesResponse) => void;
  onCreateError?: (error: Error) => void;
  onUpdateSuccess?: (response: BulkCompaniesResponse) => void;
  onUpdateError?: (error: Error) => void;
}

export function useCompanies(options?: UseCompaniesOptions) {
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Query per ottenere tutte le companies
  const companiesQuery = useQuery<CompaniesResponse, Error>({
    queryKey: ["companies"],
    queryFn: async () => {
      return await companiesApiService.getAll();
    },
    refetchOnWindowFocus: true,
  });

  // Mutation per creare companies in bulk
  const createMutation = useMutation({
    mutationFn: async (companies: BulkCompanyInput[]) => {
      return await companiesApiService.bulkCreate({
        companies,
      });
    },
    onSuccess: async (response) => {
      // Optimistically update the cache with the created companies
      if (response?.data?.companies) {
        const createdCompanies = response.data.companies;
        const currentData = queryClient.getQueryData<CompaniesResponse>([
          "companies",
        ]);
        if (currentData) {
          queryClient.setQueryData<CompaniesResponse>(["companies"], {
            ...currentData,
            data: {
              ...currentData.data,
              companies: [...currentData.data.companies, ...createdCompanies],
            },
          });
        }
      }

      // Background sync with server (non-blocking)
      queryClient.invalidateQueries({ queryKey: ["companies"] });

      // Gestione sicura della risposta per il toast
      const count = response?.data?.companies?.length ?? 0;
      if (count > 0) {
        toast.success(
          `${count} aziend${count === 1 ? "a creata" : "e create"} con successo`
        );
      } else {
        toast.success("Aziende create con successo");
      }

      optionsRef.current?.onCreateSuccess?.(response);
    },
    onError: (error: Error) => {
      console.error("Errore creazione companies:", error);
      toast.error(`Errore durante la creazione: ${error.message}`);
      options?.onCreateError?.(error);
    },
  });

  // Mutation per eliminare companies in bulk
  const deleteMutation = useMutation({
    mutationFn: async (companyIds: string[]) => {
      return await companiesApiService.bulkDelete({ companyIds });
    },
    onSuccess: (_response, companyIds) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      const count = companyIds.length;
      toast.success(
        `${count} aziend${count === 1 ? "a eliminata" : "e eliminate"} con successo`
      );
    },
    onError: (error: Error) => {
      console.error("Errore eliminazione companies:", error);
      toast.error(`Errore durante l'eliminazione: ${error.message}`);
    },
  });

  // Mutation per aggiornare companies in bulk
  const updateMutation = useMutation({
    mutationFn: async (companies: BulkCompanyUpdateInput[]) => {
      return await companiesApiService.bulkUpdate({
        companies,
      });
    },
    onSuccess: async (response) => {
      // Aggiorna immediatamente la cache con i nuovi dati dalla risposta
      if (response?.data?.companies) {
        const updatedCompanies = response.data.companies;

        // Ottieni i dati attuali dalla cache
        const currentData = queryClient.getQueryData<CompaniesResponse>([
          "companies",
        ]);

        if (currentData) {
          // Crea una mappa delle aziende aggiornate per lookup veloce
          const updatedMap = new Map(updatedCompanies.map((c) => [c.id, c]));

          // Aggiorna le aziende nella lista esistente
          const updatedCompaniesList = currentData.data.companies.map(
            (company) => updatedMap.get(company.id) || company
          );

          // Aggiorna la cache immediatamente
          queryClient.setQueryData<CompaniesResponse>(["companies"], {
            ...currentData,
            data: {
              ...currentData.data,
              companies: updatedCompaniesList,
            },
          });
        }
      }

      // Background sync with server (non-blocking)
      queryClient.invalidateQueries({ queryKey: ["companies"] });

      // Gestione sicura della risposta per il toast
      const count = response?.data?.companies?.length ?? 0;
      if (count > 0) {
        toast.success(
          `${count} aziend${
            count === 1 ? "a aggiornata" : "e aggiornate"
          } con successo`
        );
      } else {
        toast.success("Aziende aggiornate con successo");
      }

      options?.onUpdateSuccess?.(response);
    },
    onError: (error: Error) => {
      console.error("Errore aggiornamento companies:", error);
      toast.error(`Errore durante l'aggiornamento: ${error.message}`);
      options?.onUpdateError?.(error);
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
    createCompaniesAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    // Mutation per aggiornare companies
    updateCompanies: updateMutation.mutate,
    isUpdating: updateMutation.isPending,

    // Mutation per eliminare companies in bulk
    deleteCompanies: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,

    // Utility per refetch
    refetch: companiesQuery.refetch,
  };
}
