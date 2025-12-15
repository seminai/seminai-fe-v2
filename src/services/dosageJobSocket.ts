import { io, Socket } from "socket.io-client";
import authService from "@/utils/auth";

const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

/**
 * Tipo per un log evento ricevuto dal socket
 */
export interface DosageLogEvent {
  jobId: string;
  userId: string;
  timestamp: string;
  type: "match" | "info" | "warning" | "error" | "progress" | "complete";
  message: string;
  metadata?: {
    productName?: string;
    productId?: string;
    unitId?: string;
    quantity?: number;
    [key: string]: unknown;
  };
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
export interface DosageSocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onJoined?: (room: string) => void;
  onLog?: (event: DosageLogEvent) => void;
}

/**
 * Servizio per gestire la connessione socket ai dosage jobs
 */
class DosageJobSocketService {
  private socket: Socket | null = null;
  private currentJobId: string | null = null;
  private callbacks: DosageSocketCallbacks = {};
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
   * Connette al socket e si unisce alla room del job specificato
   */
  public connect(jobId: string, callbacks: DosageSocketCallbacks): void {
    // Se già connesso allo stesso job, non fare nulla
    if (this.socket?.connected && this.currentJobId === jobId) {
      return;
    }

    // Disconnetti da eventuali connessioni precedenti
    this.disconnect();

    // Prova a ottenere il token con un meccanismo di retry
    // per gestire casi in cui il token non è ancora disponibile
    const attemptConnection = (retryCount = 0): void => {
      const token = authService.getAuthToken();

      if (!token) {
        // Se non c'è token e abbiamo ancora tentativi disponibili, riprova
        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 100; // Delay base di 100ms

        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            attemptConnection(retryCount + 1);
          }, RETRY_DELAY_MS * (retryCount + 1)); // Delay crescente: 100ms, 200ms, 300ms
          return;
        }

        // Dopo tutti i tentativi, mostra l'errore
        this.connectionState = "error";
        callbacks.onError?.(
          new Error("Token di autenticazione non disponibile")
        );
        return;
      }

      // Token disponibile, procedi con la connessione
      this.callbacks = callbacks;
      this.currentJobId = jobId;
      this.connectionState = "connecting";

      this.socket = io(SERVER_URL, {
        auth: {
          token,
        },
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

      // Join alla room del job
      if (this.currentJobId) {
        this.socket?.emit("join:job", this.currentJobId);
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

    this.socket.on("joined:job", (data: { room: string }) => {
      this.callbacks.onJoined?.(data.room);
    });

    this.socket.on("dosage:log", (event: DosageLogEvent) => {
      this.callbacks.onLog?.(event);
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
    this.currentJobId = null;
    this.connectionState = "disconnected";
    this.callbacks = {};
  }

  /**
   * Ottiene l'ID del job correntemente connesso
   */
  public getCurrentJobId(): string | null {
    return this.currentJobId;
  }
}

export const dosageJobSocketService = new DosageJobSocketService();

