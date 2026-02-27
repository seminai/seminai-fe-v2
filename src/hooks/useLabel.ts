import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  labelsApiService,
  type LabelDetail,
  type LabelHistoryEntry,
} from "@/api/labels";
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
  confirmAsync: () => Promise<unknown>;
  isConfirming: boolean;
  extractWithMistralAsync: () => Promise<unknown>;
  isExtracting: boolean;
  extractWithGptAsync: () => Promise<unknown>;
  isExtractingGpt: boolean;
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
      await queryClient.invalidateQueries({
        queryKey: ["labels", "history", id],
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
      await queryClient.invalidateQueries({
        queryKey: ["labels", "history", id],
      });
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error ? e.message : "Aggiornamento verifica fallito";
      toast.error(message);
    },
  });

  const { mutateAsync: confirmAsync, isPending: isConfirming } = useMutation({
    mutationFn: async () => {
      return await labelsApiService.updateOverwrite(id);
    },
    onSuccess: async () => {
      toast.success("Etichetta aggiornata con successo");
      await queryClient.invalidateQueries({
        queryKey: ["labels", "detail", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["labels", "history", id],
      });
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error ? e.message : "Aggiornamento etichetta fallito";
      toast.error(message);
    },
  });

  const {
    mutateAsync: extractWithMistralAsync,
    isPending: isExtracting,
  } = useMutation({
    mutationFn: async () => {
      return await labelsApiService.extractWithMistral(id);
    },
    onSuccess: async () => {
      toast.success("Estrazione completata con successo");
      await queryClient.invalidateQueries({
        queryKey: ["labels", "detail", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["labels", "history", id],
      });
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error
          ? e.message
          : "Estrazione con Mistral fallita";
      toast.error(message);
    },
  });

  const {
    mutateAsync: extractWithGptAsync,
    isPending: isExtractingGpt,
  } = useMutation({
    mutationFn: async () => {
      return await labelsApiService.extractWithGpt(id);
    },
    onSuccess: async () => {
      toast.success("Estrazione con GPT completata con successo");
      await queryClient.invalidateQueries({
        queryKey: ["labels", "detail", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["labels", "history", id],
      });
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error
          ? e.message
          : "Estrazione con GPT fallita";
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
    confirmAsync,
    isConfirming,
    extractWithMistralAsync,
    isExtracting,
    extractWithGptAsync,
    isExtractingGpt,
  };
}

// --- Label History Hook ---

interface UseLabelHistoryOptions {
  labelExtractionId: string;
  enabled?: boolean;
}

interface UseLabelHistoryReturn {
  history: LabelHistoryEntry[];
  isLoadingHistory: boolean;
  historyError: Error | null;
  rollbackAsync: (historyId: string) => Promise<unknown>;
  isRollingBack: boolean;
}

export function useLabelHistory({
  labelExtractionId,
  enabled = true,
}: UseLabelHistoryOptions): UseLabelHistoryReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["labels", "history", labelExtractionId],
    queryFn: async () => labelsApiService.getHistory(labelExtractionId),
    enabled: Boolean(labelExtractionId) && enabled,
  });

  const history: LabelHistoryEntry[] = data?.data ?? [];

  const { mutateAsync: rollbackAsync, isPending: isRollingBack } = useMutation({
    mutationFn: async (historyId: string) => {
      return await labelsApiService.rollback(historyId);
    },
    onSuccess: async () => {
      toast.success("Rollback completato con successo");
      await queryClient.invalidateQueries({
        queryKey: ["labels", "detail", labelExtractionId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["labels", "history", labelExtractionId],
      });
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error ? e.message : "Rollback fallito";
      toast.error(message);
    },
  });

  return {
    history,
    isLoadingHistory: isLoading,
    historyError: error as Error | null,
    rollbackAsync,
    isRollingBack,
  };
}
