import { useQuery } from "@tanstack/react-query";
import {
  getFieldsAvailability,
  type FieldsAvailabilityResponse,
} from "@/api/fields";
import authService from "@/utils/auth";

export function useFieldsAvailability(startAt: string, endAt: string) {
  // Query per ottenere la disponibilità dei campi nel range di date selezionato
  const fieldsAvailabilityQuery = useQuery<FieldsAvailabilityResponse, Error>({
    queryKey: ["fields-availability", startAt, endAt],
    queryFn: async () => {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Unauthorized");
      }
      return await getFieldsAvailability(token, startAt, endAt);
    },
    enabled: !!startAt && !!endAt, // Solo se entrambe le date sono definite
  });

  return {
    // Dati e stati della query
    companies: fieldsAvailabilityQuery.data?.data.companies ?? [],
    isLoading: fieldsAvailabilityQuery.isLoading,
    isError: fieldsAvailabilityQuery.isError,
    error: fieldsAvailabilityQuery.error,

    // Utility per refetch
    refetch: fieldsAvailabilityQuery.refetch,
  };
}
