import { useQuery } from "@tanstack/react-query";
import { labelsApiService, type LabelSummary } from "@/api/labels";

class LabelSummaryCollection {
  private readonly summaries: LabelSummary[];

  constructor(summaries: LabelSummary[]) {
    this.summaries = summaries;
  }

  public getAll(): LabelSummary[] {
    return this.summaries;
  }
}

export function useLabelsSummary() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["labels", "summary"],
    queryFn: async () => {
      return await labelsApiService.getSummary();
    },
  });

  const collection = new LabelSummaryCollection(data?.data ?? []);

  return {
    labels: collection.getAll(),
    isLoading,
    error,
    refetch,
  };
}

