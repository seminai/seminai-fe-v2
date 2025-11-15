import { useQuery } from "@tanstack/react-query";
import { jobsApiService, type JobWithRelations } from "@/api/jobs";
import authService from "@/utils/auth";

export function useJobs(companyName?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["jobs", companyName],
    queryFn: async () => {
      console.log("Fetching jobs with companyName:", companyName);
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Unauthorized");
      }
      const response = await jobsApiService.getJobs(token, companyName);
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
