import { useQuery } from "@tanstack/react-query";
import { jobsApiService, type JobWithRelations } from "@/api/jobs";

export function useJobs() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const response = await jobsApiService.getJobs();
      return response.data.jobs;
    },
    enabled: true,
    retry: 1,
  });

  if (error) {
    console.error("Error fetching jobs:", error);
  }

  return {
    jobs: (data || []) as JobWithRelations[],
    isLoading,
    error,
    refetch,
  };
}
