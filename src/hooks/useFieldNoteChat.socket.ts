import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { toast } from "sonner";
import {
  fieldNoteSocketService,
  type FieldNoteChatEvent,
  type SocketConnectionState,
} from "@/services/fieldNoteSocket";
import type { AgentToolCall } from "@/api/field-notes";
import type { ChatMessage, ToolCallProgress } from "./useFieldNoteChat.types";
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
  setToolCalls: Dispatch<SetStateAction<ToolCallProgress[]>>;
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
  setToolCalls,
  scrollToBottom,
  thinkingBuffer,
  getNextMessageId,
  onFieldNoteSaved,
}: UseFieldNoteChatSocketOptions): SocketConnectionState {
  const [socketState, setSocketState] =
    useState<SocketConnectionState>("disconnected");

  // Use refs to store callbacks that might change, to avoid reconnecting the socket
  const onFieldNoteSavedRef = useRef(onFieldNoteSaved);
  const getNextMessageIdRef = useRef(getNextMessageId);

  // Keep refs updated with latest values
  useEffect(() => {
    onFieldNoteSavedRef.current = onFieldNoteSaved;
  }, [onFieldNoteSaved]);

  useEffect(() => {
    getNextMessageIdRef.current = getNextMessageId;
  }, [getNextMessageId]);

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
          // Mark previous tool as completed and add new one
          setToolCalls((prev) => {
            const updated = prev.map((t) => ({ ...t, completed: true }));
            return [...updated, { name: toolName, completed: false }];
          });
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

          // Mark all tools as completed
          setToolCalls((prev) => prev.map((t) => ({ ...t, completed: true })));

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
          // Reset tool calls on completion
          setToolCalls([]);
          onFieldNoteSavedRef.current?.();

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
                getNextMessageIdRef.current("error"),
                `❌ ${errorMessage}`
              )
            )
          );
          setIsProcessing(false);
          thinkingBuffer.current = "";
          // Reset tool calls on error
          setToolCalls([]);
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
                  getNextMessageIdRef.current("info"),
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
      setToolCalls,
      scrollToBottom,
      thinkingBuffer,
    ]
  );

  // Connect socket only when threadId changes, not when callbacks change
  useEffect(() => {
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
              getNextMessageIdRef.current("info"),
              "Connesso alla chat AI"
            )
          )
        );
        console.log("Field note chat - joined room:", room);
      },
      onEvent: handleSocketEvent,
    });

    return () => {
      fieldNoteSocketService.disconnect();
    };
  }, [threadId, setMessages, handleSocketEvent]);

  return socketState;
}
