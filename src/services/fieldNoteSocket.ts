import { io, Socket } from "socket.io-client";
import authService from "@/utils/auth";

const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

/**
 * Tipo per un evento chat ricevuto dal socket
 */
export interface FieldNoteChatEvent {
  threadId: string;
  userId: string;
  timestamp: string;
  type: "token" | "tool_call" | "requires_approval" | "complete" | "error" | "info";
  content?: string; // Per i token del pensiero AI
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
    id?: string;
  };
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Stato della connessione socket
 */
export type SocketConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * Callback per eventi del socket
 */
export interface FieldNoteSocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onJoined?: (room: string) => void;
  onEvent?: (event: FieldNoteChatEvent) => void;
}

/**
 * Servizio per gestire la connessione socket per le chat field notes
 * Pattern basato su dosageJobSocket.ts
 */
class FieldNoteSocketService {
  private socket: Socket | null = null;
  private currentThreadId: string | null = null;
  private callbacks: FieldNoteSocketCallbacks = {};
  private connectionState: SocketConnectionState = "disconnected";

  /**
   * Ottiene lo stato corrente della connessione
   */
  public getConnectionState(): SocketConnectionState {
    return this.connectionState;
  }

  /**
   * Verifica se il socket è connesso
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Connette al socket e si unisce alla room del thread specificato
   */
  public connect(threadId: string, callbacks: FieldNoteSocketCallbacks): void {
    // Se già connesso allo stesso thread, non fare nulla
    if (this.socket?.connected && this.currentThreadId === threadId) {
      return;
    }

    // Disconnetti da eventuali connessioni precedenti
    this.disconnect();

    // Prova a ottenere il token dalla memoria (impostato al login)
    // Se non disponibile (es. page refresh), prova a connettersi con withCredentials
    const attemptConnection = (retryCount = 0): void => {
      const token = authService.getAuthToken();

      // Se non c'è token in memoria e abbiamo ancora tentativi, riprova
      // (il token potrebbe non essere ancora stato impostato subito dopo il login)
      if (!token && retryCount < 3) {
        setTimeout(() => {
          attemptConnection(retryCount + 1);
        }, 100 * (retryCount + 1)); // Delay crescente: 100ms, 200ms, 300ms
        return;
      }

      // Procedi con la connessione
      this.callbacks = callbacks;
      this.currentThreadId = threadId;
      this.connectionState = "connecting";

      // Configura Socket.IO con token (se disponibile) o solo withCredentials
      // Il backend dovrebbe supportare entrambi i metodi di autenticazione
      this.socket = io(SERVER_URL, {
        ...(token ? { auth: { token } } : {}),
        withCredentials: true, // Invia cookie httpOnly come fallback
        transports: ["websocket", "polling"],
      });

      this.setupEventListeners();
    };

    attemptConnection();
  }

  /**
   * Configura i listener per gli eventi del socket
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.connectionState = "connected";
      this.callbacks.onConnect?.();

      // Join alla room del thread
      if (this.currentThreadId) {
        this.socket?.emit("join:field-note-thread", this.currentThreadId);
      }
    });

    this.socket.on("connect_error", (error) => {
      this.connectionState = "error";
      this.callbacks.onError?.(new Error(error.message));
    });

    this.socket.on("disconnect", () => {
      this.connectionState = "disconnected";
      this.callbacks.onDisconnect?.();
    });

    this.socket.on("joined:field-note-thread", (data: { room: string }) => {
      this.callbacks.onJoined?.(data.room);
    });

    // Eventi specifici per field notes chat
    this.socket.on("field-note:token", (event: FieldNoteChatEvent) => {
      this.callbacks.onEvent?.(event);
    });

    this.socket.on("field-note:tool-call", (event: FieldNoteChatEvent) => {
      this.callbacks.onEvent?.(event);
    });

    this.socket.on("field-note:requires-approval", (event: FieldNoteChatEvent) => {
      this.callbacks.onEvent?.(event);
    });

    this.socket.on("field-note:complete", (event: FieldNoteChatEvent) => {
      this.callbacks.onEvent?.(event);
    });

    this.socket.on("field-note:error", (event: FieldNoteChatEvent) => {
      this.callbacks.onEvent?.(event);
    });

    this.socket.on("field-note:info", (event: FieldNoteChatEvent) => {
      this.callbacks.onEvent?.(event);
    });
  }

  /**
   * Disconnette dal socket e dalla room corrente
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentThreadId = null;
    this.connectionState = "disconnected";
    this.callbacks = {};
  }

  /**
   * Ottiene l'ID del thread correntemente connesso
   */
  public getCurrentThreadId(): string | null {
    return this.currentThreadId;
  }
}

export const fieldNoteSocketService = new FieldNoteSocketService();
