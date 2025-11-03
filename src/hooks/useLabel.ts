import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labelsApiService, type LabelDetail } from "@/api/labels";
import { toast } from "sonner";

interface UseLabelOptions {
  id: string;
}

interface UseLabelReturn {
  detail: LabelDetail | undefined;
  isLoading: boolean;
  error: Error | null;
  saveAsync: (payload: Record<string, unknown>) => Promise<unknown>;
  isSaving: boolean;
  verifyAsync: (isVerified: boolean) => Promise<unknown>;
  isVerifying: boolean;
}

export function useLabel({ id }: UseLabelOptions): UseLabelReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["labels", "detail", id],
    queryFn: async () => labelsApiService.getById(id),
    enabled: Boolean(id),
  });

  const detail: LabelDetail | undefined = data?.data;

  const { mutateAsync: saveAsync, isPending: isSaving } = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return await labelsApiService.update(id, payload);
    },
    onSuccess: async () => {
      toast.success("Dati salvati");
      await queryClient.invalidateQueries({
        queryKey: ["labels", "detail", id],
      });
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Salvataggio fallito";
      toast.error(message);
    },
  });

  const { mutateAsync: verifyAsync, isPending: isVerifying } = useMutation({
    mutationFn: async (isVerified: boolean) => {
      return await labelsApiService.verify(id, { isVerified });
    },
    onSuccess: async () => {
      toast.success("Stato verifica aggiornato");
      await queryClient.invalidateQueries({
        queryKey: ["labels", "detail", id],
      });
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error ? e.message : "Aggiornamento verifica fallito";
      toast.error(message);
    },
  });

  return {
    detail,
    isLoading,
    error: error as Error | null,
    saveAsync,
    isSaving,
    verifyAsync,
    isVerifying,
  };
}
