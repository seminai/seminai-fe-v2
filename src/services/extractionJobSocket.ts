import { io, Socket } from "socket.io-client";
import authService from "@/utils/auth";

const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export type ExtractionPhase =
  | "validating"
  | "parsing_pdf"
  | "parsing_csv"
  | "parsing_shapefile"
  | "extracting_fields"
  | "extracting_production_units"
  | "finalizing"
  | "completed";

export interface ExtractionProgressEvent {
  version: number;
  phase: ExtractionPhase;
  progress: number;
  message: string;
  updatedAt: string;
}

export interface ExtractionCompletedEvent {
  version: number;
  jobId: string;
  resultReady: boolean;
}

export interface ExtractionFailedEvent {
  version: number;
  jobId: string;
  errorCode: string;
  message: string;
}

export type SocketConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface ExtractionSocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (event: ExtractionProgressEvent) => void;
  onCompleted?: (event: ExtractionCompletedEvent) => void;
  onFailed?: (event: ExtractionFailedEvent) => void;
}

class ExtractionJobSocketService {
  private socket: Socket | null = null;
  private currentJobId: string | null = null;
  private callbacks: ExtractionSocketCallbacks = {};
  private connectionState: SocketConnectionState = "disconnected";

  public getConnectionState(): SocketConnectionState {
    return this.connectionState;
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public connect(jobId: string, callbacks: ExtractionSocketCallbacks): void {
    if (this.socket?.connected && this.currentJobId === jobId) {
      return;
    }
    this.disconnect();

    const attemptConnection = (retryCount = 0): void => {
      const token = authService.getAuthToken();
      if (!token && retryCount < 3) {
        setTimeout(
          () => attemptConnection(retryCount + 1),
          100 * (retryCount + 1),
        );
        return;
      }

      this.callbacks = callbacks;
      this.currentJobId = jobId;
      this.connectionState = "connecting";

      this.socket = io(SERVER_URL, {
        ...(token ? { auth: { token } } : {}),
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      this.setupEventListeners();
    };

    attemptConnection();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.connectionState = "connected";
      this.callbacks.onConnect?.();
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

    this.socket.on("extraction:progress", (event: ExtractionProgressEvent) => {
      this.callbacks.onProgress?.(event);
    });

    this.socket.on(
      "extraction:completed",
      (event: ExtractionCompletedEvent) => {
        this.callbacks.onCompleted?.(event);
      },
    );

    this.socket.on("extraction:failed", (event: ExtractionFailedEvent) => {
      this.callbacks.onFailed?.(event);
    });
  }

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

  public getCurrentJobId(): string | null {
    return this.currentJobId;
  }
}

export const extractionJobSocketService = new ExtractionJobSocketService();
