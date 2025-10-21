import { useQuery } from "@tanstack/react-query";
import { getCurrentUserWithBearer, type UsersMeResponse } from "@/api/users";
import authService from "@/utils/auth";

export function useCurrentUser() {
  return useQuery<UsersMeResponse, Error>({
    queryKey: ["users", "me"],
    queryFn: async () => {
      const token = authService.getAuthToken();
      if (!token) throw new Error("Unauthorized");
      return await getCurrentUserWithBearer(token);
    },
    staleTime: 60 * 1000,
    retry: 0,
  });
}
