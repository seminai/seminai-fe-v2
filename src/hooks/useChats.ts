import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  chatsApiService,
  type ChatSummary,
  type ChatDetail,
  type ChatCategory,
} from "@/api/chats";

/**
 * Hook per recuperare la lista delle chat dell'utente
 * @param category - Categoria opzionale per filtrare le chat
 */
export function useChats(category?: ChatCategory) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["chats", category],
    queryFn: async () => {
      return chatsApiService.getChats(category ? { category } : undefined);
    },
    enabled: true,
    retry: 1,
    staleTime: 1000 * 60 * 2, // 2 minuti
  });

  if (error) {
    console.error("Error fetching chats:", error);
  }

  return {
    chats: (data || []) as ChatSummary[],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook per recuperare il dettaglio di una chat specifica
 * @param chatId - ID della chat da recuperare
 */
export function useChatDetail(chatId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      if (!chatId) return null;
      return chatsApiService.getChatDetail(chatId);
    },
    enabled: !!chatId,
    retry: 1,
    staleTime: 1000 * 60 * 2, // 2 minuti
  });

  if (error) {
    console.error("Error fetching chat detail:", error);
  }

  return {
    chat: data as ChatDetail | null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook per eliminare una chat
 */
export function useDeleteChat() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (chatId: string) => chatsApiService.deleteChat(chatId),
    onSuccess: () => {
      // Invalida la cache delle chat per forzare un refresh
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error) => {
      console.error("Error deleting chat:", error);
    },
  });

  return {
    deleteChat: mutation.mutate,
    deleteChatAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}
