import { useQuery } from "@tanstack/react-query";
import {
  getTokenCostsWithBearer,
  type TokenCostsResponse,
} from "@/api/token-costs";

const EMPTY_USAGES: TokenCostsResponse["data"]["usages"] = [];

export function useTokenCosts() {
  const query = useQuery<TokenCostsResponse, Error>({
    queryKey: ["token-costs"],
    queryFn: async () => {
      return await getTokenCostsWithBearer();
    },
    staleTime: 60 * 1000,
  });

  return {
    usages: query.data?.data.usages ?? EMPTY_USAGES,
    totals: query.data?.data.totals ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

