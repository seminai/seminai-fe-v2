import { useQuery } from "@tanstack/react-query";
import { jobsApiService, type JobWithRelations } from "@/api/jobs";

export function useJobs(companyName?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["jobs", companyName],
    queryFn: async () => {
      console.log("Fetching jobs with companyName:", companyName);
      const response = await jobsApiService.getJobs(companyName);
      console.log("Jobs response:", response);
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
