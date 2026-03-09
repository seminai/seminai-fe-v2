import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

/**
 * Categorie di chat disponibili
 */
export type ChatCategory = "DOSAGE_AGENT" | "JOB_VERIFICATION_AGENT";

/**
 * Ruolo del messaggio
 */
export type MessageRole = "USER" | "ASSISTANT";

/**
 * Stato del messaggio
 */
export type MessageStatus = "PENDING" | "COMPLETED" | "ERROR";

/**
 * Ultimo messaggio di una chat (per la lista)
 */
export interface ChatLastMessage {
  content: string;
  role: MessageRole;
  createdAt: string;
}

/**
 * Chat summary per la lista
 */
export interface ChatSummary {
  id: string;
  threadId: string;
  category: ChatCategory;
  modelName: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: ChatLastMessage | null;
}

/**
 * Messaggio completo di una chat
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  contentBlocks: unknown | null;
  status: MessageStatus | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Dettaglio completo di una chat con tutti i messaggi
 */
export interface ChatDetail {
  id: string;
  threadId: string;
  category: ChatCategory;
  modelName: string;
  temperature: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

/**
 * Risposta API standard
 */
type ApiResponse<T> = {
  status: "success" | "error";
  data?: T;
  message?: string;
  code?: string;
};

/**
 * Opzioni per il recupero delle chat
 */
export interface GetChatsOptions {
  category?: ChatCategory;
}

/**
 * Servizio API per la gestione dello storico delle chat
 */
class ChatsApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Recupera la lista delle chat dell'utente
   * @param options - Opzioni di filtro (es. categoria)
   */
  async getChats(options?: GetChatsOptions): Promise<ChatSummary[]> {
    const params = new URLSearchParams();
    if (options?.category) {
      params.append("category", options.category);
    }

    const queryString = params.toString();
    const url = `${this.baseUrl}/chats${queryString ? `?${queryString}` : ""}`;

    const response = await authenticatedHttpClient.request(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to fetch chats");
    }

    const json = (await response.json()) as ApiResponse<ChatSummary[]>;
    if (json.status !== "success" || !json.data) {
      throw new Error(json.message || "Invalid response");
    }

    return json.data;
  }

  /**
   * Recupera il dettaglio di una chat con tutti i messaggi
   * @param chatId - ID della chat
   */
  async getChatDetail(chatId: string): Promise<ChatDetail> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/chats/${chatId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to fetch chat detail");
    }

    const json = (await response.json()) as ApiResponse<ChatDetail>;
    if (json.status !== "success" || !json.data) {
      throw new Error(json.message || "Invalid response");
    }

    return json.data;
  }

  /**
   * Elimina una chat e tutti i suoi messaggi
   * @param chatId - ID della chat da eliminare
   */
  async deleteChat(chatId: string): Promise<void> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/chats/${chatId}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to delete chat");
    }
  }
}

export const chatsApiService = new ChatsApiService(BASE_URL);
