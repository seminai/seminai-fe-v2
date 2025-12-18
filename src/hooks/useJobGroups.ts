import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  jobsApiService,
  type JobGroupSummaryItem,
  type JobWithRelations,
} from "@/api/jobs";

// Array vuoti stabili per evitare re-render infiniti
const EMPTY_GROUPS_ARRAY: JobGroupSummaryItem[] = [];
const EMPTY_JOBS_ARRAY: JobWithRelations[] = [];

/**
 * Hook per ottenere il riepilogo dei gruppi di job (sidebar sinistra).
 * Chiama GET /jobs/groups-summary
 */
export function useJobGroupsSummary() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["job-groups-summary"],
    queryFn: async () => {
      const response = await jobsApiService.getGroupsSummary();
      return response.data.groups;
    },
    enabled: true,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (error) {
    console.error("Error fetching job groups summary:", error);
  }

  // Usa useMemo per garantire stabilità referenziale
  const groups = useMemo(() => {
    return data ?? EMPTY_GROUPS_ARRAY;
  }, [data]);

  return {
    groups,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook per ottenere i dettagli di un gruppo specifico.
 * Chiama GET /jobs/group/{jobId}
 */
export function useJobGroupDetail(jobId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["job-group-detail", jobId],
    queryFn: async () => {
      if (!jobId) return { jobs: [] };
      const response = await jobsApiService.getGroupDetail(jobId);
      return response.data;
    },
    enabled: !!jobId,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (error) {
    console.error(`Error fetching job group detail for ${jobId}:`, error);
  }

  // Usa useMemo per garantire stabilità referenziale
  const jobs = useMemo(() => {
    return data?.jobs ?? EMPTY_JOBS_ARRAY;
  }, [data?.jobs]);

  return {
    jobs,
    isLoading,
    error,
    refetch,
  };
}

