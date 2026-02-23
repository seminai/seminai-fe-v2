import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  dosageAgentChatApiService,
  type DosageAgentStreamEvent,
  type DosageAgentSourceCitation,
  type DosageAgentToolCall,
} from "@/api/dosage-agent-chat";
import type { ChatMessage } from "@/api/chats";

export type DosageAgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: DosageAgentSourceCitation[];
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  timestamp: Date;
};

export type DosageAgentPendingApproval = {
  toolCall: DosageAgentToolCall;
};

type UseDosageAgentChatOptions = {
  modelName: string;
  workspaceId?: string;
};

export function useDosageAgentChat(
  threadId: string,
  options: UseDosageAgentChatOptions,
) {
  const { modelName, workspaceId } = options;
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<DosageAgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingApproval, setPendingApproval] =
    useState<DosageAgentPendingApproval | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageIdCounter = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getNextMessageId = useCallback((prefix: string) => {
    return `${prefix}-${messageIdCounter.current++}`;
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }, []);

  const appendMessage = useCallback((message: DosageAgentMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateLastAssistant = useCallback(
    (update: Partial<DosageAgentMessage>) => {
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].role === "assistant") {
            next[i] = { ...next[i], ...update };
            break;
          }
        }
        return next;
      });
    },
    [],
  );

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setPendingApproval(null);

      const userMessage: DosageAgentMessage = {
        id: getNextMessageId("user"),
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      const assistantPlaceholder: DosageAgentMessage = {
        id: getNextMessageId("assistant"),
        role: "assistant",
        content: "",
        toolCalls: [],
        timestamp: new Date(),
      };

      appendMessage(userMessage);
      appendMessage(assistantPlaceholder);
      setIsLoading(true);
      scrollToBottom();

      let assistantContent = "";
      const collectedToolCalls: Array<{
        name: string;
        args: Record<string, unknown>;
      }> = [];

      try {
        const response = await dosageAgentChatApiService.streamMessage({
          threadId,
          message,
          modelName: modelName as
            | "gpt-4o"
            | "gpt-4o-mini"
            | "gpt-4-turbo"
            | "gpt-4"
            | "gpt-3.5-turbo",
          ...(workspaceId ? { workspaceId } : {}),
        });

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming non disponibile");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) {
              continue;
            }
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") {
              continue;
            }

            let event: DosageAgentStreamEvent;
            try {
              event = JSON.parse(data) as DosageAgentStreamEvent;
            } catch (error) {
              console.error("Invalid stream payload:", data, error);
              continue;
            }

            switch (event.type) {
              case "token": {
                assistantContent += event.content ?? "";
                updateLastAssistant({ content: assistantContent });
                scrollToBottom();
                break;
              }

              case "tool_call": {
                if (event.toolCall) {
                  collectedToolCalls.push({
                    name: event.toolCall.name,
                    args: event.toolCall.args,
                  });
                  updateLastAssistant({ toolCalls: [...collectedToolCalls] });
                }
                break;
              }

              case "tool_result": {
                // Tool result received, no special UI action needed
                break;
              }

              case "requires_approval": {
                if (event.toolCall) {
                  setPendingApproval({ toolCall: event.toolCall });
                }
                setIsLoading(false);
                scrollToBottom();
                break;
              }

              case "loop_warning": {
                toast.warning("Attenzione", {
                  description:
                    event.content || "Troppi tool call consecutivi",
                });
                break;
              }

              case "complete": {
                const finalMessage =
                  event.response?.message || assistantContent;
                updateLastAssistant({
                  content: finalMessage,
                  sources: event.sources ?? event.response?.sources,
                });
                setIsLoading(false);
                scrollToBottom();
                void queryClient.invalidateQueries({
                  queryKey: ["chats"],
                });
                break;
              }

              case "error": {
                const errorMessage = event.error || "Errore sconosciuto";
                updateLastAssistant({ content: `Errore: ${errorMessage}` });
                setIsLoading(false);
                toast.error("Errore agente", {
                  description: errorMessage,
                });
                scrollToBottom();
                break;
              }
            }
          }
        }

        setIsLoading(false);
        scrollToBottom();
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        updateLastAssistant({ content: `Errore: ${errorMessage}` });
        setIsLoading(false);
        toast.error("Errore invio messaggio", {
          description: errorMessage,
        });
      }
    },
    [
      appendMessage,
      getNextMessageId,
      isLoading,
      modelName,
      queryClient,
      scrollToBottom,
      threadId,
      updateLastAssistant,
      workspaceId,
    ],
  );

  const approveAction = useCallback(async () => {
    if (isLoading) return;

    setPendingApproval(null);
    setIsLoading(true);

    appendMessage({
      id: getNextMessageId("approval"),
      role: "user",
      content: "Approvato",
      timestamp: new Date(),
    });

    scrollToBottom();

    try {
      const response = await dosageAgentChatApiService.approveAction({
        threadId,
        modelName,
      });

      appendMessage({
        id: getNextMessageId("assistant"),
        role: "assistant",
        content: response.message || "Operazione completata.",
        sources: response.sources,
        timestamp: new Date(),
      });
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      appendMessage({
        id: getNextMessageId("error"),
        role: "assistant",
        content: `Errore: ${errorMessage}`,
        timestamp: new Date(),
      });
      toast.error("Errore approvazione", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [
    appendMessage,
    getNextMessageId,
    isLoading,
    modelName,
    queryClient,
    scrollToBottom,
    threadId,
  ]);

  const rejectAction = useCallback(
    async (reason: string) => {
      if (!reason.trim() || isLoading) {
        return;
      }

      setPendingApproval(null);
      setIsLoading(true);

      appendMessage({
        id: getNextMessageId("rejection"),
        role: "user",
        content: `Rifiutato: ${reason}`,
        timestamp: new Date(),
      });

      scrollToBottom();

      try {
        const response = await dosageAgentChatApiService.rejectAction({
          threadId,
          reason,
          modelName,
        });

        appendMessage({
          id: getNextMessageId("assistant"),
          role: "assistant",
          content: response.message || "Operazione completata.",
          sources: response.sources,
          timestamp: new Date(),
        });
        void queryClient.invalidateQueries({ queryKey: ["chats"] });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        appendMessage({
          id: getNextMessageId("error"),
          role: "assistant",
          content: `Errore: ${errorMessage}`,
          timestamp: new Date(),
        });
        toast.error("Errore rifiuto", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    },
    [
      appendMessage,
      getNextMessageId,
      isLoading,
      modelName,
      queryClient,
      scrollToBottom,
      threadId,
    ],
  );

  const loadMessages = useCallback(
    (chatMessages: ChatMessage[]) => {
      const convertedMessages: DosageAgentMessage[] = chatMessages.map(
        (msg, index) => ({
          id: `loaded-${index}`,
          role: msg.role === "USER" ? ("user" as const) : ("assistant" as const),
          content: msg.content,
          timestamp: new Date(msg.createdAt),
        }),
      );
      setMessages(convertedMessages);
      setPendingApproval(null);
      scrollToBottom();
    },
    [scrollToBottom],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingApproval(null);
  }, []);

  return {
    messages,
    isLoading,
    pendingApproval,
    sendMessage,
    approveAction,
    rejectAction,
    cancelRequest,
    loadMessages,
    clearMessages,
    messagesEndRef,
  };
}
