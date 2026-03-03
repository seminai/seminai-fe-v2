import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  dosageAgentChatApiService,
  type DosageAgentStreamEvent,
  type DosageAgentSourceCitation,
  type DosageAgentToolCall,
  type CostInfo,
  type ModelInfo,
  type PlanStep,
  type Questionnaire,
} from "@/api/dosage-agent-chat";
import type { ChatMessage } from "@/api/chats";

export type DosageAgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: DosageAgentSourceCitation[];
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  timestamp: Date;
  cost?: CostInfo;
  modelInfo?: ModelInfo;
};

export type DosageAgentPendingApproval = {
  toolCall: DosageAgentToolCall;
};

export type StreamingStatus =
  | "idle"
  | "streaming"
  | "thinking"
  | "tool_running"
  | "plan_executing";

export type ActivePlan = {
  planId: string;
  steps: PlanStep[];
  totalSteps: number;
  currentStep: number;
  status: string;
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
  const [streamingStatus, setStreamingStatus] =
    useState<StreamingStatus>("idle");
  const [pendingApproval, setPendingApproval] =
    useState<DosageAgentPendingApproval | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [toolCount, setToolCount] = useState(0);
  const [currentModelInfo, setCurrentModelInfo] = useState<ModelInfo | null>(
    null,
  );
  const [lastCost, setLastCost] = useState<CostInfo | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ActivePlan | null>(null);
  const [activeQuestionnaire, setActiveQuestionnaire] =
    useState<Questionnaire | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageIdCounter = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentModelInfoRef = useRef<ModelInfo | null>(null);
  const currentPlanRef = useRef<ActivePlan | null>(null);

  const isLoading = streamingStatus !== "idle";

  useEffect(() => {
    currentModelInfoRef.current = currentModelInfo;
  }, [currentModelInfo]);

  useEffect(() => {
    currentPlanRef.current = currentPlan;
  }, [currentPlan]);

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

  const resetTransientState = useCallback(() => {
    setActiveTool(null);
    setToolCount(0);
    setCurrentModelInfo(null);
    setLastCost(null);
    setCurrentPlan(null);
    setActiveQuestionnaire(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStreamingStatus("idle");
      setActiveTool(null);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string, file?: File) => {
      if (!message.trim() || isLoading) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setPendingApproval(null);
      resetTransientState();

      const userMessage: DosageAgentMessage = {
        id: getNextMessageId("user"),
        role: "user",
        content: file ? `${message}\n📎 ${file.name}` : message,
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
      setStreamingStatus("streaming");
      scrollToBottom();

      let assistantContent = "";
      const collectedToolCalls: Array<{
        name: string;
        args: Record<string, unknown>;
      }> = [];

      try {
        const response = await dosageAgentChatApiService.streamMessage(
          {
            threadId,
            message,
            modelName,
            ...(workspaceId ? { workspaceId } : {}),
          },
          file,
        );

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
                setStreamingStatus("streaming");
                scrollToBottom();
                break;
              }

              case "thinking": {
                setStreamingStatus("thinking");
                break;
              }

              case "tool_call": {
                if (event.toolCall) {
                  collectedToolCalls.push({
                    name: event.toolCall.name,
                    args: event.toolCall.args,
                  });
                  setActiveTool(event.toolCall.name);
                  setToolCount((prev) => prev + 1);
                  setStreamingStatus("tool_running");
                  updateLastAssistant({
                    toolCalls: [...collectedToolCalls],
                  });
                }
                break;
              }

              case "tool_result": {
                setActiveTool(null);
                setStreamingStatus("streaming");
                break;
              }

              case "requires_approval": {
                if (event.toolCall) {
                  setPendingApproval({ toolCall: event.toolCall });
                }
                setStreamingStatus("idle");
                setActiveTool(null);
                scrollToBottom();
                break;
              }

              case "model_selected": {
                if (event.modelInfo) {
                  setCurrentModelInfo(event.modelInfo);
                }
                break;
              }

              case "plan_step_generated": {
                if (event.plan) {
                  setCurrentPlan((prev) => {
                    const steps = prev?.steps ? [...prev.steps] : [];
                    if (event.plan!.step) {
                      steps.push(event.plan!.step);
                    }
                    return {
                      planId: event.plan!.planId ?? prev?.planId ?? "",
                      steps,
                      totalSteps: event.plan!.totalSteps ?? steps.length,
                      currentStep: event.plan!.currentStep ?? 0,
                      status: "generating",
                    };
                  });
                  scrollToBottom();
                }
                break;
              }

              case "plan_presented": {
                if (event.plan) {
                  setCurrentPlan((prev) =>
                    prev
                      ? {
                          ...prev,
                          totalSteps:
                            event.plan!.totalSteps ?? prev.totalSteps,
                          status: event.plan!.status ?? "presented",
                        }
                      : null,
                  );
                }
                break;
              }

              case "plan_step_modified": {
                if (event.plan?.step) {
                  setCurrentPlan((prev) => {
                    if (!prev) return null;
                    const steps = prev.steps.map((s) =>
                      s.stepNumber === event.plan!.step!.stepNumber
                        ? { ...s, ...event.plan!.step!, status: "modified" as const }
                        : s,
                    );
                    return { ...prev, steps };
                  });
                }
                break;
              }

              case "plan_executing": {
                setStreamingStatus("plan_executing");
                if (event.plan) {
                  setCurrentPlan((prev) =>
                    prev
                      ? {
                          ...prev,
                          currentStep:
                            event.plan!.currentStep ?? prev.currentStep,
                          status: "executing",
                        }
                      : null,
                  );
                }
                break;
              }

              case "plan_step_executed": {
                if (event.plan?.step) {
                  setCurrentPlan((prev) => {
                    if (!prev) return null;
                    const steps = prev.steps.map((s) =>
                      s.stepNumber === event.plan!.step!.stepNumber
                        ? {
                            ...s,
                            ...event.plan!.step!,
                            status: "completed" as const,
                          }
                        : s,
                    );
                    return {
                      ...prev,
                      steps,
                      currentStep:
                        event.plan!.currentStep ?? prev.currentStep,
                    };
                  });
                }
                break;
              }

              case "questionnaire_presented": {
                if (event.questionnaire) {
                  setActiveQuestionnaire(event.questionnaire);
                }
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

              case "working_memory_update": {
                break;
              }

              case "complete": {
                const finalMessage =
                  event.response?.message || assistantContent;
                updateLastAssistant({
                  content: finalMessage,
                  sources: event.sources ?? event.response?.sources,
                  cost: event.cost,
                  modelInfo: currentModelInfoRef.current ?? undefined,
                });
                if (event.cost) {
                  setLastCost(event.cost);
                }
                setStreamingStatus("idle");
                setActiveTool(null);
                setToolCount(0);
                setCurrentPlan(null);
                scrollToBottom();
                void queryClient.invalidateQueries({
                  queryKey: ["chats"],
                });
                break;
              }

              case "error": {
                const errorMessage = event.error || "Errore sconosciuto";
                updateLastAssistant({ content: `Errore: ${errorMessage}` });
                setStreamingStatus("idle");
                setActiveTool(null);
                toast.error("Errore agente", {
                  description: errorMessage,
                });
                scrollToBottom();
                break;
              }

              default: {
                console.debug("Unhandled stream event type:", event.type, event);
                break;
              }
            }
          }
        }

        if (streamingStatus !== "idle") {
          setStreamingStatus("idle");
        }
        scrollToBottom();
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        updateLastAssistant({ content: `Errore: ${errorMessage}` });
        setStreamingStatus("idle");
        setActiveTool(null);
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
      resetTransientState,
      scrollToBottom,
      streamingStatus,
      threadId,
      updateLastAssistant,
      workspaceId,
    ],
  );

  const approveAction = useCallback(async () => {
    if (isLoading) return;

    setPendingApproval(null);
    setStreamingStatus("streaming");

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
      setStreamingStatus("idle");
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
      setStreamingStatus("streaming");

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
        setStreamingStatus("idle");
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

  const submitQuestionnaire = useCallback(
    async (answers: Record<string, string | string[]>) => {
      setActiveQuestionnaire(null);
      const lines = Object.entries(answers)
        .map(([questionId, answer]) => {
          const value = Array.isArray(answer) ? answer.join(", ") : answer;
          return `- ${questionId}: ${value}`;
        })
        .join("\n");
      const formattedMessage = `Risposte al questionario:\n${lines}`;
      await sendMessage(formattedMessage);
    },
    [sendMessage],
  );

  const loadMessages = useCallback(
    (chatMessages: ChatMessage[]) => {
      const convertedMessages: DosageAgentMessage[] = chatMessages.map(
        (msg, index) => ({
          id: `loaded-${index}`,
          role:
            msg.role === "USER" ? ("user" as const) : ("assistant" as const),
          content: msg.content,
          timestamp: new Date(msg.createdAt),
        }),
      );
      setMessages(convertedMessages);
      setPendingApproval(null);
      resetTransientState();
      scrollToBottom();
    },
    [resetTransientState, scrollToBottom],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingApproval(null);
    setStreamingStatus("idle");
    resetTransientState();
  }, [resetTransientState]);

  return {
    messages,
    isLoading,
    streamingStatus,
    pendingApproval,
    activeTool,
    toolCount,
    currentModelInfo,
    lastCost,
    currentPlan,
    activeQuestionnaire,
    sendMessage,
    approveAction,
    rejectAction,
    cancelRequest,
    submitQuestionnaire,
    loadMessages,
    clearMessages,
    messagesEndRef,
  };
}
