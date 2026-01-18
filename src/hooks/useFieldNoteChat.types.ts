export interface ChatAttachment {
  name: string;
  size: number;
  type: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  timestamp: Date;
  status?: "sending" | "thinking" | "completed" | "approval_needed";
  attachment?: ChatAttachment;
}

export interface SendMessageOptions {
  file?: File;
  mode?: "message" | "stream";
}

import type { RefObject } from "react";
import type { AgentToolCall } from "@/api/field-notes";

export interface UseFieldNoteChatResult {
  messages: ChatMessage[];
  socketState: "disconnected" | "connecting" | "connected" | "error";
  pendingApproval: AgentToolCall | null;
  isProcessing: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  sendMessage: (text: string, options?: SendMessageOptions) => Promise<void>;
  approve: () => Promise<void>;
  reject: (feedback: string) => Promise<void>;
  clearMessages: () => void;
}

export interface UseFieldNoteChatOptions {
  onFieldNoteSaved?: () => void;
}
