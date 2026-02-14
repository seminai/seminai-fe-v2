import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { JobWithRelations } from "@/api/jobs";
import {
  jobVerificationAgentApiService,
  type AgentResponse,
  type AgentTask,
  type ApproveJobModification,
  type PendingAction,
  type StreamEvent,
  type SourceCitation,
} from "@/api/job-verification-agent";
import type { ChatMessage } from "@/api/chats";

export type JobVerificationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  reasoning?: string;
  timestamp: Date;
};

export type ThinkingStepType =
  | "thinking"
  | "tool_start"
  | "tool_result"
  | "data_inspection"
  | "task_progress"
  | "reasoning";

export type ThinkingStep = {
  id: string;
  type: ThinkingStepType;
  message: string;
  timestamp: Date;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
};

type SendMessageOptions = {
  metadata?: {
    images?: string[];
    links?: string[];
    pdfs?: string[];
  };
  modelName?:
    | "gpt-4o"
    | "gpt-4o-mini"
    | "gpt-4-turbo"
    | "gpt-4"
    | "gpt-3.5-turbo";
  temperature?: number;
  /** Se true (default), usa il pensiero profondo. Se false, usa chat rapida. */
  deepThinking?: boolean;
};

function buildPendingAction(event: StreamEvent): PendingAction | null {
  if (event.pendingAction) {
    return event.pendingAction;
  }

  if (event.toolCall) {
    return {
      type: "tool_call",
      tool: event.toolCall.name,
      args: event.toolCall.args,
      description: `Esecuzione ${event.toolCall.name}`,
    };
  }

  return null;
}

function extractResponseMessage(
  response: AgentResponse | undefined,
  fallback: string
): string {
  if (response?.message) {
    return response.message;
  }
  return fallback;
}

export function useJobVerificationAgent(threadId: string) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<JobVerificationMessage[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [currentTasks, setCurrentTasks] = useState<AgentTask[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageIdCounter = useRef(0);
  const thinkingIdCounter = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getNextMessageId = useCallback((prefix: string) => {
    return `${prefix}-${messageIdCounter.current++}`;
  }, []);

  const getNextThinkingId = useCallback(() => {
    return `thinking-${thinkingIdCounter.current++}`;
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }, []);

  const appendMessage = useCallback((message: JobVerificationMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateLastAssistant = useCallback(
    (update: Partial<JobVerificationMessage>) => {
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
    []
  );

  const addThinkingStep = useCallback(
    (step: Omit<ThinkingStep, "id" | "timestamp">) => {
      const newStep: ThinkingStep = {
        ...step,
        id: getNextThinkingId(),
        timestamp: new Date(),
      };
      setThinkingSteps((prev) => [...prev, newStep]);
    },
    [getNextThinkingId]
  );

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (
      message: string,
      jobs: JobWithRelations[],
      options?: SendMessageOptions
    ) => {
      if (!message.trim() || isLoading) {
        return;
      }
      if (jobs.length === 0) {
        toast.error("Nessun job selezionato per la chat");
        return;
      }

      // Abort previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setPendingAction(null);
      setThinkingSteps([]); // Reset thinking steps for new message
      setCurrentTasks([]);
      setCurrentTaskId(null);

      const userMessage: JobVerificationMessage = {
        id: getNextMessageId("user"),
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      const assistantPlaceholder: JobVerificationMessage = {
        id: getNextMessageId("assistant"),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      appendMessage(userMessage);
      appendMessage(assistantPlaceholder);
      setIsLoading(true);
      scrollToBottom();

      let assistantContent = "";

      try {
        const response = await jobVerificationAgentApiService.streamMessage({
          threadId,
          jobs,
          message,
          metadata: options?.metadata,
          modelName: options?.modelName,
          temperature: options?.temperature,
          deepThinking: options?.deepThinking ?? true,
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

            let event: StreamEvent;
            try {
              event = JSON.parse(data) as StreamEvent;
            } catch (error) {
              console.error("Invalid stream payload:", data, error);
              continue;
            }

            switch (event.type) {
              // === EVENTI DI PENSIERO ===
              case "thinking": {
                if (event.thinking) {
                  addThinkingStep({
                    type: "thinking",
                    message: event.thinking,
                  });
                }
                break;
              }

              case "task_progress": {
                if (event.thinking) {
                  addThinkingStep({
                    type: "task_progress",
                    message: event.thinking,
                  });
                }
                break;
              }

              case "reasoning": {
                if (event.reasoning) {
                  addThinkingStep({
                    type: "reasoning",
                    message: event.reasoning,
                  });
                }
                break;
              }

              // === EVENTI TOOL ===
              case "tool_start": {
                addThinkingStep({
                  type: "tool_start",
                  message:
                    event.thinking || `Eseguo ${event.toolCall?.name}...`,
                  toolName: event.toolCall?.name,
                  toolArgs: event.toolCall?.args,
                });
                break;
              }

              case "tool_call": {
                // Compatibilità con vecchio formato
                addThinkingStep({
                  type: "tool_start",
                  message: `Chiamo ${event.toolCall?.name}...`,
                  toolName: event.toolCall?.name,
                  toolArgs: event.toolCall?.args,
                });
                break;
              }

              case "tool_result": {
                if (event.toolResult) {
                  addThinkingStep({
                    type: "tool_result",
                    message:
                      event.toolResult.summary ||
                      event.thinking ||
                      "Risultato ricevuto",
                    toolName: event.toolResult.name,
                    toolResult: event.toolResult.result,
                  });
                }
                break;
              }

              case "data_inspection": {
                if (event.dataInspection) {
                  addThinkingStep({
                    type: "data_inspection",
                    message:
                      event.dataInspection.summary ||
                      `Leggo ${event.dataInspection.path}`,
                  });
                }
                break;
              }

              // === EVENTI TASK ===
              case "task_update": {
                if (event.tasks) {
                  setCurrentTasks(event.tasks);
                }
                if (event.currentTaskId) {
                  setCurrentTaskId(event.currentTaskId);
                }
                break;
              }

              // === TOKEN RISPOSTA ===
              case "token": {
                assistantContent += event.content ?? "";
                updateLastAssistant({ content: assistantContent });
                scrollToBottom();
                break;
              }

              // === EVENTI SOURCES ===
              case "sources_update": {
                if (event.sources) {
                  setSources(event.sources);
                  updateLastAssistant({ sources: event.sources });
                }
                break;
              }

              // === APPROVAZIONE RICHIESTA ===
              case "requires_approval":
              case "requires_modification_approval": {
                const nextPendingAction = buildPendingAction(event);
                if (nextPendingAction) {
                  setPendingAction(nextPendingAction);
                }
                setIsLoading(false);
                scrollToBottom();
                break;
              }

              // === COMPLETAMENTO ===
              case "complete": {
                const finalMessage = extractResponseMessage(
                  event.response,
                  assistantContent
                );
                updateLastAssistant({
                  content: finalMessage,
                  sources: event.sources ?? event.response?.sources,
                  reasoning: event.response?.reasoning,
                });
                if (event.sources) {
                  setSources(event.sources);
                }
                setIsLoading(false);
                scrollToBottom();
                // Refresh chat list so ChatHistoryDrawer shows the new/updated chat
                void queryClient.invalidateQueries({ queryKey: ["chats"] });
                break;
              }

              // === ERRORE ===
              case "error": {
                const errorMessage = event.error || "Errore sconosciuto";
                updateLastAssistant({ content: `❌ ${errorMessage}` });
                addThinkingStep({
                  type: "thinking",
                  message: `Errore: ${errorMessage}`,
                });
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
          // Request was cancelled, don't show error
          return;
        }
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        updateLastAssistant({ content: `❌ ${errorMessage}` });
        setIsLoading(false);
        toast.error("Errore invio messaggio", {
          description: errorMessage,
        });
      }
    },
    [
      addThinkingStep,
      appendMessage,
      getNextMessageId,
      isLoading,
      queryClient,
      scrollToBottom,
      threadId,
      updateLastAssistant,
    ]
  );

  const approveAction = useCallback(
    async (modification?: ApproveJobModification) => {
      if (isLoading) return;

      setPendingAction(null);
      setIsLoading(true);

      appendMessage({
        id: getNextMessageId("approval"),
        role: "user",
        content: "✅ Approvato",
        timestamp: new Date(),
      });

      scrollToBottom();

      try {
        const response = await jobVerificationAgentApiService.approveAction({
          threadId,
          modification,
        });

        appendMessage({
          id: getNextMessageId("assistant"),
          role: "assistant",
          content: response.message || "Operazione completata.",
          sources: response.sources,
          reasoning: response.reasoning,
          timestamp: new Date(),
        });
        void queryClient.invalidateQueries({ queryKey: ["chats"] });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        appendMessage({
          id: getNextMessageId("error"),
          role: "assistant",
          content: `❌ ${errorMessage}`,
          timestamp: new Date(),
        });
        toast.error("Errore approvazione", {
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
      queryClient,
      scrollToBottom,
      threadId,
    ]
  );

  const rejectAction = useCallback(
    async (reason: string) => {
      if (!reason.trim() || isLoading) {
        return;
      }

      setPendingAction(null);
      setIsLoading(true);

      appendMessage({
        id: getNextMessageId("rejection"),
        role: "user",
        content: `❌ Rifiutato: ${reason}`,
        timestamp: new Date(),
      });

      scrollToBottom();

      try {
        const response = await jobVerificationAgentApiService.rejectAction({
          threadId,
          reason,
        });

        appendMessage({
          id: getNextMessageId("assistant"),
          role: "assistant",
          content: response.message || "Operazione completata.",
          sources: response.sources,
          reasoning: response.reasoning,
          timestamp: new Date(),
        });
        void queryClient.invalidateQueries({ queryKey: ["chats"] });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        appendMessage({
          id: getNextMessageId("error"),
          role: "assistant",
          content: `❌ ${errorMessage}`,
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
      queryClient,
      scrollToBottom,
      threadId,
    ]
  );

  const clearThinkingSteps = useCallback(() => {
    setThinkingSteps([]);
  }, []);

  const loadMessages = useCallback(
    (chatMessages: ChatMessage[]) => {
      // Convert ChatMessage[] to JobVerificationMessage[]
      const convertedMessages: JobVerificationMessage[] = chatMessages.map(
        (msg, index) => ({
          id: `loaded-${index}`,
          role: msg.role === "USER" ? "user" : "assistant",
          content: msg.content,
          timestamp: new Date(msg.createdAt),
        })
      );
      setMessages(convertedMessages);
      setThinkingSteps([]);
      setCurrentTasks([]);
      setCurrentTaskId(null);
      setPendingAction(null);
      setSources([]);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setThinkingSteps([]);
    setCurrentTasks([]);
    setCurrentTaskId(null);
    setPendingAction(null);
    setSources([]);
  }, []);

  return {
    messages,
    thinkingSteps,
    currentTasks,
    currentTaskId,
    isLoading,
    pendingAction,
    sources,
    sendMessage,
    approveAction,
    rejectAction,
    cancelRequest,
    clearThinkingSteps,
    loadMessages,
    clearMessages,
    messagesEndRef,
  };
}
