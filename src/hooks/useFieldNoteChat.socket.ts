import { useCallback, useEffect, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { toast } from "sonner";
import {
  fieldNoteSocketService,
  type FieldNoteChatEvent,
  type SocketConnectionState,
} from "@/services/fieldNoteSocket";
import type { AgentToolCall } from "@/api/field-notes";
import type { ChatMessage } from "./useFieldNoteChat.types";
import {
  appendMessage,
  buildAssistantMessage,
  updateLastAssistantMessage,
} from "./useFieldNoteChat.utils";

interface UseFieldNoteChatSocketOptions {
  threadId: string;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPendingApproval: (toolCall: AgentToolCall | null) => void;
  setIsProcessing: (value: boolean) => void;
  scrollToBottom: () => void;
  thinkingBuffer: MutableRefObject<string>;
  getNextMessageId: (prefix: string) => string;
  onFieldNoteSaved?: () => void;
}

export function useFieldNoteChatSocket({
  threadId,
  setMessages,
  setPendingApproval,
  setIsProcessing,
  scrollToBottom,
  thinkingBuffer,
  getNextMessageId,
  onFieldNoteSaved,
}: UseFieldNoteChatSocketOptions): SocketConnectionState {
  const [socketState, setSocketState] =
    useState<SocketConnectionState>("disconnected");

  const handleSocketEvent = useCallback(
    (event: FieldNoteChatEvent) => {
      switch (event.type) {
        case "token": {
          thinkingBuffer.current += event.content || "";
          setMessages((prev) =>
            updateLastAssistantMessage(prev, (last) => ({
              ...last,
              thinking: thinkingBuffer.current,
              status: "thinking",
            }))
          );
          scrollToBottom();
          break;
        }
        case "tool_call": {
          const toolName = event.toolCall?.name || "unknown";
          setMessages((prev) =>
            updateLastAssistantMessage(prev, (last) => ({
              ...last,
              content: last.thinking || last.content,
              thinking: `🔧 Usando tool: ${toolName}...`,
              status: "thinking",
            }))
          );
          break;
        }
        case "requires_approval": {
          if (event.toolCall?.id) {
            setPendingApproval(event.toolCall as AgentToolCall);
          }

          setMessages((prev) =>
            updateLastAssistantMessage(prev, (last) => ({
              ...last,
              content:
                event.message ||
                thinkingBuffer.current ||
                last.thinking ||
                "Richiesta approvazione",
              thinking: undefined,
              status: "approval_needed",
            }))
          );

          setIsProcessing(false);
          thinkingBuffer.current = "";
          scrollToBottom();
          break;
        }
        case "complete": {
          setMessages((prev) =>
            updateLastAssistantMessage(prev, (last) => ({
              ...last,
              content:
                event.message ||
                thinkingBuffer.current ||
                last.thinking ||
                last.content,
              thinking: undefined,
              status: "completed",
            }))
          );

          setIsProcessing(false);
          thinkingBuffer.current = "";
          onFieldNoteSaved?.();

          if (event.message) {
            toast.success("Operazione completata", {
              description: event.message,
            });
          }

          scrollToBottom();
          break;
        }
        case "error": {
          const errorMessage = event.message || "Errore sconosciuto";
          setMessages((prev) =>
            appendMessage(
              prev,
              buildAssistantMessage(
                getNextMessageId("error"),
                `❌ ${errorMessage}`
              )
            )
          );
          setIsProcessing(false);
          thinkingBuffer.current = "";
          toast.error("Errore durante elaborazione", {
            description: errorMessage,
          });
          scrollToBottom();
          break;
        }
        case "info": {
          if (event.message) {
            setMessages((prev) =>
              appendMessage(
                prev,
                buildAssistantMessage(
                  getNextMessageId("info"),
                  event.message || ""
                )
              )
            );
            scrollToBottom();
          }
          break;
        }
      }
    },
    [
      setMessages,
      setPendingApproval,
      setIsProcessing,
      scrollToBottom,
      thinkingBuffer,
      getNextMessageId,
      onFieldNoteSaved,
    ]
  );

  const connectSocket = useCallback(() => {
    fieldNoteSocketService.connect(threadId, {
      onConnect: () => {
        setSocketState("connected");
      },
      onDisconnect: () => {
        setSocketState("disconnected");
      },
      onError: (error) => {
        setSocketState("error");
        toast.error("Errore connessione chat", {
          description: error.message,
        });
      },
      onJoined: (room) => {
        setMessages((prev) =>
          appendMessage(
            prev,
            buildAssistantMessage(
              getNextMessageId("info"),
              "Connesso alla chat AI"
            )
          )
        );
        console.log("Field note chat - joined room:", room);
      },
      onEvent: handleSocketEvent,
    });
  }, [threadId, setMessages, getNextMessageId, handleSocketEvent]);

  useEffect(() => {
    connectSocket();

    return () => {
      fieldNoteSocketService.disconnect();
    };
  }, [connectSocket]);

  return socketState;
}
