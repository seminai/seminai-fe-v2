import { useQuery } from "@tanstack/react-query";
import {
  getFieldsAvailability,
  type FieldsAvailabilityResponse,
} from "@/api/fields";

type UseFieldsAvailabilityOptions = {
  enabled?: boolean;
};

export function useFieldsAvailability(
  startAt: string,
  endAt: string,
  options?: UseFieldsAvailabilityOptions
) {
  const isEnabled = (options?.enabled ?? true) && !!startAt && !!endAt;

  // Query per ottenere la disponibilità dei campi nel range di date selezionato
  const fieldsAvailabilityQuery = useQuery<FieldsAvailabilityResponse, Error>(
    {
      queryKey: ["fields-availability", startAt, endAt],
      queryFn: async () => {
        return await getFieldsAvailability(startAt, endAt);
      },
      enabled: isEnabled, // Solo se attivato e con date definite
    }
  );

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
