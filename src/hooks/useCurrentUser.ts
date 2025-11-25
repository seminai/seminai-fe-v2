import { useQuery } from "@tanstack/react-query";
import { getCurrentUserWithBearer, type UsersMeResponse } from "@/api/users";

export function useCurrentUser() {
  return useQuery<UsersMeResponse, Error>({
    queryKey: ["users", "me"],
    queryFn: async () => {
      return await getCurrentUserWithBearer();
    },
    staleTime: 60 * 1000,
    retry: 0,
  });
}
