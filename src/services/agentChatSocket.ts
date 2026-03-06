import { io, Socket } from "socket.io-client";
import authService from "@/utils/auth";

const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export interface AgentSocketToolCall {
  readonly type: string;
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly toolCallId?: string;
  readonly timestamp: number;
}

export interface AgentSocketMemoryUpdate {
  readonly key: string;
  readonly preview: string;
  readonly timestamp: number;
}

export interface AgentSocketTaskUpdate {
  readonly taskList: ReadonlyArray<{
    id: string;
    content: string;
    status: string;
  }>;
}

export interface AgentSocketSubagentProgress {
  readonly subAgentId: string;
  readonly progress: number;
  readonly step: string;
  readonly timestamp: number;
}

export interface AgentSocketAlert {
  readonly triggerId: string;
  readonly type: string;
  readonly title: string;
  readonly payload: unknown;
  readonly timestamp: number;
}

export type SocketConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface AgentChatSocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onToolCall?: (event: AgentSocketToolCall) => void;
  onMemoryUpdate?: (event: AgentSocketMemoryUpdate) => void;
  onTaskUpdate?: (event: AgentSocketTaskUpdate) => void;
  onSubagentProgress?: (event: AgentSocketSubagentProgress) => void;
  onOuterLoopAlert?: (event: AgentSocketAlert) => void;
  onComplete?: (event: Record<string, unknown>) => void;
  onAgentError?: (event: Record<string, unknown>) => void;
  onLoopWarning?: (event: Record<string, unknown>) => void;
  onPlanStep?: (event: Record<string, unknown>) => void;
  onPlanPresented?: (event: Record<string, unknown>) => void;
  onModelSelected?: (event: Record<string, unknown>) => void;
  onRequiresApproval?: (event: Record<string, unknown>) => void;
  onQuestionnaire?: (event: Record<string, unknown>) => void;
}

class AgentChatSocketService {
  private socket: Socket | null = null;
  private currentThreadId: string | null = null;
  private callbacks: AgentChatSocketCallbacks = {};
  private connectionState: SocketConnectionState = "disconnected";
  private isConnecting = false;

  public getConnectionState(): SocketConnectionState {
    return this.connectionState;
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public connect(
    threadId: string,
    callbacks: AgentChatSocketCallbacks,
  ): void {
    if (this.socket?.connected && this.currentThreadId === threadId) return;
    if (this.isConnecting && this.currentThreadId === threadId) return;

    this.disconnect();
    this.isConnecting = true;
    this.currentThreadId = threadId;

    const attemptConnection = (retryCount = 0): void => {
      if (!this.isConnecting || this.currentThreadId !== threadId) return;

      const token = authService.getAuthToken();
      if (!token && retryCount < 3) {
        setTimeout(() => attemptConnection(retryCount + 1), 100 * (retryCount + 1));
        return;
      }

      this.callbacks = callbacks;
      this.connectionState = "connecting";

      this.socket = io(SERVER_URL, {
        ...(token ? { auth: { token } } : {}),
        withCredentials: true,
        transports: ["websocket", "polling"],
        reconnection: false,
      });

      this.setupListeners();
    };

    attemptConnection();
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentThreadId = null;
    this.connectionState = "disconnected";
    this.isConnecting = false;
    this.callbacks = {};
  }

  public getCurrentThreadId(): string | null {
    return this.currentThreadId;
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.isConnecting = false;
      this.connectionState = "connected";
      this.callbacks.onConnect?.();
      if (this.currentThreadId) {
        this.socket?.emit("join:chat", this.currentThreadId);
      }
    });

    this.socket.on("connect_error", (error) => {
      this.isConnecting = false;
      this.connectionState = "error";
      this.callbacks.onError?.(new Error(error.message));
    });

    this.socket.on("disconnect", () => {
      this.isConnecting = false;
      this.connectionState = "disconnected";
      this.callbacks.onDisconnect?.();
    });

    this.socket.on("agent:tool_call", (e: AgentSocketToolCall) =>
      this.callbacks.onToolCall?.(e),
    );
    this.socket.on("agent:memory_update", (e: AgentSocketMemoryUpdate) =>
      this.callbacks.onMemoryUpdate?.(e),
    );
    this.socket.on("agent:task_update", (e: AgentSocketTaskUpdate) =>
      this.callbacks.onTaskUpdate?.(e),
    );
    this.socket.on("agent:subagent_progress", (e: AgentSocketSubagentProgress) =>
      this.callbacks.onSubagentProgress?.(e),
    );
    this.socket.on("agent:outer_loop_alert", (e: AgentSocketAlert) =>
      this.callbacks.onOuterLoopAlert?.(e),
    );
    this.socket.on("agent:complete", (e: Record<string, unknown>) =>
      this.callbacks.onComplete?.(e),
    );
    this.socket.on("agent:error", (e: Record<string, unknown>) =>
      this.callbacks.onAgentError?.(e),
    );
    this.socket.on("agent:loop_warning", (e: Record<string, unknown>) =>
      this.callbacks.onLoopWarning?.(e),
    );
    this.socket.on("agent:plan_step", (e: Record<string, unknown>) =>
      this.callbacks.onPlanStep?.(e),
    );
    this.socket.on("agent:plan_presented", (e: Record<string, unknown>) =>
      this.callbacks.onPlanPresented?.(e),
    );
    this.socket.on("agent:model_selected", (e: Record<string, unknown>) =>
      this.callbacks.onModelSelected?.(e),
    );
    this.socket.on("agent:requires_approval", (e: Record<string, unknown>) =>
      this.callbacks.onRequiresApproval?.(e),
    );
    this.socket.on("agent:questionnaire", (e: Record<string, unknown>) =>
      this.callbacks.onQuestionnaire?.(e),
    );
  }
}

export const agentChatSocketService = new AgentChatSocketService();
