import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fieldNoteSocketService,
  type FieldNoteChatEvent,
  type SocketConnectionState,
} from "@/services/fieldNoteSocket";
import { fieldNotesApiService, AgentResponseStatus } from "@/api/field-notes";
import type { AgentToolCall } from "@/api/field-notes";

/**
 * Messaggio della chat
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string; // Pensiero dell'AI in streaming
  timestamp: Date;
  status?: "sending" | "thinking" | "completed" | "approval_needed";
}

/**
 * Risultato del hook useFieldNoteChat
 */
export interface UseFieldNoteChatResult {
  messages: ChatMessage[];
  socketState: SocketConnectionState;
  pendingApproval: AgentToolCall | null;
  isProcessing: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  sendMessage: (text: string) => Promise<void>;
  approve: () => Promise<void>;
  reject: (feedback: string) => Promise<void>;
  clearMessages: () => void;
}

/**
 * Hook per gestire la chat con Field Notes AI Agent
 * Pattern basato su useLiveLogs.ts di DosageManager
 */
export function useFieldNoteChat(threadId: string): UseFieldNoteChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [socketState, setSocketState] = useState<SocketConnectionState>("disconnected");
  const [pendingApproval, setPendingApproval] = useState<AgentToolCall | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const thinkingBuffer = useRef("");
  const messageIdCounter = useRef(0);

  /**
   * Auto-scroll alla fine dei messaggi
   */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  /**
   * Pulisce i messaggi
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    thinkingBuffer.current = "";
    messageIdCounter.current = 0;
  }, []);

  /**
   * Connette al socket per ricevere eventi in tempo reale
   */
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
        console.log("Field note chat - joined room:", room);
        // Aggiungi messaggio informativo
        setMessages((prev) => [
          ...prev,
          {
            id: `info-${messageIdCounter.current++}`,
            role: "assistant",
            content: "Connesso alla chat AI",
            timestamp: new Date(),
            status: "completed",
          },
        ]);
      },
      onEvent: (event: FieldNoteChatEvent) => {
        // Gestione eventi real-time dal socket
        switch (event.type) {
          case "token": {
            // Accumula token del pensiero AI
            thinkingBuffer.current += event.content || "";
            
            // Aggiorna l'ultimo messaggio assistant con il thinking buffer
            setMessages((prev) => {
              const updated = [...prev];
              // Trova l'ultimo indice assistant (compatibile con versioni precedenti)
              let lastAssistantIndex = -1;
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === "assistant") {
                  lastAssistantIndex = i;
                  break;
                }
              }
              
              if (lastAssistantIndex !== -1) {
                updated[lastAssistantIndex] = {
                  ...updated[lastAssistantIndex],
                  thinking: thinkingBuffer.current,
                  status: "thinking",
                };
              }
              
              return updated;
            });
            
            scrollToBottom();
            break;
          }

          case "tool_call": {
            // L'AI sta chiamando un tool
            const toolName = event.toolCall?.name || "unknown";
            setMessages((prev) => {
              const updated = [...prev];
              let lastAssistantIndex = -1;
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === "assistant") {
                  lastAssistantIndex = i;
                  break;
                }
              }
              
              if (lastAssistantIndex !== -1) {
                updated[lastAssistantIndex] = {
                  ...updated[lastAssistantIndex],
                  content: updated[lastAssistantIndex].thinking || updated[lastAssistantIndex].content,
                  thinking: `🔧 Usando tool: ${toolName}...`,
                  status: "thinking",
                };
              }
              
              return updated;
            });
            break;
          }

          case "requires_approval": {
            // L'AI richiede approvazione
            if (event.toolCall && event.toolCall.id) {
              setPendingApproval(event.toolCall as AgentToolCall);
            }
            
            setMessages((prev) => {
              const updated = [...prev];
              let lastAssistantIndex = -1;
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === "assistant") {
                  lastAssistantIndex = i;
                  break;
                }
              }
              
              if (lastAssistantIndex !== -1) {
                updated[lastAssistantIndex] = {
                  ...updated[lastAssistantIndex],
                  content: event.message || thinkingBuffer.current || updated[lastAssistantIndex].thinking || "Richiesta approvazione",
                  thinking: undefined,
                  status: "approval_needed",
                };
              }
              
              return updated;
            });
            
            setIsProcessing(false);
            thinkingBuffer.current = "";
            scrollToBottom();
            break;
          }

          case "complete": {
            // Chat completata
            setMessages((prev) => {
              const updated = [...prev];
              let lastAssistantIndex = -1;
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === "assistant") {
                  lastAssistantIndex = i;
                  break;
                }
              }
              
              if (lastAssistantIndex !== -1) {
                const finalContent = event.message || thinkingBuffer.current || updated[lastAssistantIndex].thinking || updated[lastAssistantIndex].content;
                updated[lastAssistantIndex] = {
                  ...updated[lastAssistantIndex],
                  content: finalContent,
                  thinking: undefined,
                  status: "completed",
                };
              }
              
              return updated;
            });
            
            setIsProcessing(false);
            thinkingBuffer.current = "";
            
            if (event.message) {
              toast.success("Operazione completata", {
                description: event.message,
              });
            }
            
            scrollToBottom();
            break;
          }

          case "error": {
            // Errore durante elaborazione
            const errorMessage = event.message || "Errore sconosciuto";
            
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${messageIdCounter.current++}`,
                role: "assistant" as const,
                content: `❌ ${errorMessage}`,
                timestamp: new Date(),
                status: "completed" as const,
              },
            ]);
            
            setIsProcessing(false);
            thinkingBuffer.current = "";
            
            toast.error("Errore durante elaborazione", {
              description: errorMessage,
            });
            
            scrollToBottom();
            break;
          }

          case "info": {
            // Messaggio informativo
            if (event.message) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `info-${messageIdCounter.current++}`,
                  role: "assistant" as const,
                  content: event.message || "",
                  timestamp: new Date(),
                  status: "completed" as const,
                },
              ]);
              scrollToBottom();
            }
            break;
          }
        }
      },
    });
  }, [threadId, scrollToBottom]);

  /**
   * Invia un messaggio alla chat
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) {
        return;
      }

      // Aggiungi messaggio utente
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${messageIdCounter.current++}`,
          role: "user",
          content: text,
          timestamp: new Date(),
          status: "completed",
        },
      ]);

      // Aggiungi placeholder per risposta assistant
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${messageIdCounter.current++}`,
          role: "assistant",
          content: "",
          thinking: "",
          timestamp: new Date(),
          status: "thinking",
        },
      ]);

      setIsProcessing(true);
      thinkingBuffer.current = "";
      scrollToBottom();

      try {
        // Invia messaggio via API HTTP
        const response = await fieldNotesApiService.sendMessage({
          threadId,
          message: text,
        });

        // Gestione risposta REQUIRES_APPROVAL
        if (response.status === AgentResponseStatus.REQUIRES_APPROVAL) {
          // Imposta pendingApproval se presente
          if (response.pendingToolCalls && response.pendingToolCalls.length > 0) {
            setPendingApproval(response.pendingToolCalls[0]);
          }
          
          // Aggiorna il messaggio assistant con il contenuto della richiesta di approvazione
          setMessages((prev) => {
            const updated = [...prev];
            let lastAssistantIndex = -1;
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === "assistant") {
                lastAssistantIndex = i;
                break;
              }
            }
            
            if (lastAssistantIndex !== -1) {
              updated[lastAssistantIndex] = {
                ...updated[lastAssistantIndex],
                content: response.message || thinkingBuffer.current || "Richiesta approvazione",
                thinking: undefined,
                status: "approval_needed",
              };
            }
            
            return updated;
          });
          
          setIsProcessing(false);
          thinkingBuffer.current = "";
          scrollToBottom();
          return;
        }

        // Se il backend risponde direttamente con il messaggio completo (non streaming)
        if (response.status === AgentResponseStatus.COMPLETED && response.message) {
          // Rimuovi il placeholder "thinking"
          setMessages((prev) => {
            const updated = [...prev];
            // Trova l'ultimo messaggio assistant (il placeholder)
            let lastAssistantIndex = -1;
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === "assistant") {
                lastAssistantIndex = i;
                break;
              }
            }
            
            if (lastAssistantIndex !== -1) {
              // Aggiorna il placeholder con il messaggio completo
              updated[lastAssistantIndex] = {
                ...updated[lastAssistantIndex],
                content: response.message || "",
                thinking: "",
                status: "completed",
              };
            }
            
            return updated;
          });
          
          setIsProcessing(false);
          thinkingBuffer.current = "";
          scrollToBottom();
        }
        // Altrimenti Socket.IO riceverà gli eventi di streaming in tempo reale
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
        
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${messageIdCounter.current++}`,
            role: "assistant",
            content: `❌ ${errorMessage}`,
            timestamp: new Date(),
            status: "completed",
          },
        ]);
        
        setIsProcessing(false);
        
        toast.error("Errore invio messaggio", {
          description: errorMessage,
        });
      }
    },
    [threadId, isProcessing, scrollToBottom]
  );

  /**
   * Approva l'azione proposta dall'AI
   */
  const approve = useCallback(async () => {
    if (!pendingApproval) {
      return;
    }

    setPendingApproval(null);
    setIsProcessing(true);
    thinkingBuffer.current = "";

    // Aggiungi messaggio di approvazione
    setMessages((prev) => [
      ...prev,
      {
        id: `approval-${messageIdCounter.current++}`,
        role: "user",
        content: "✅ Approvato",
        timestamp: new Date(),
        status: "completed",
      },
    ]);

    // Aggiungi placeholder per risposta
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${messageIdCounter.current++}`,
        role: "assistant",
        content: "",
        thinking: "",
        timestamp: new Date(),
        status: "thinking",
      },
    ]);

    scrollToBottom();

    try {
      const response = await fieldNotesApiService.approveAction({ threadId });
      
      // Se il backend risponde direttamente con il messaggio completo
      if (response.status === AgentResponseStatus.COMPLETED && response.message) {
        setMessages((prev) => {
          const updated = [...prev];
          let lastAssistantIndex = -1;
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].role === "assistant") {
              lastAssistantIndex = i;
              break;
            }
          }
          
          if (lastAssistantIndex !== -1) {
            updated[lastAssistantIndex] = {
              ...updated[lastAssistantIndex],
              content: response.message || "",
              thinking: "",
              status: "completed",
            };
          }
          
          return updated;
        });
        
        setIsProcessing(false);
        thinkingBuffer.current = "";
        scrollToBottom();
      }
      // Altrimenti Socket.IO riceverà gli eventi successivi
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${messageIdCounter.current++}`,
          role: "assistant",
          content: `❌ ${errorMessage}`,
          timestamp: new Date(),
          status: "completed",
        },
      ]);
      
      setIsProcessing(false);
      
      toast.error("Errore approvazione", {
        description: errorMessage,
      });
    }
  }, [threadId, pendingApproval, scrollToBottom]);

  /**
   * Rifiuta l'azione proposta dall'AI con feedback
   */
  const reject = useCallback(
    async (feedback: string) => {
      if (!pendingApproval || !feedback.trim()) {
        return;
      }

      setPendingApproval(null);
      setIsProcessing(true);
      thinkingBuffer.current = "";

      // Aggiungi messaggio di rifiuto
      setMessages((prev) => [
        ...prev,
        {
          id: `rejection-${messageIdCounter.current++}`,
          role: "user",
          content: `❌ Rifiutato: ${feedback}`,
          timestamp: new Date(),
          status: "completed",
        },
      ]);

      // Aggiungi placeholder per risposta
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${messageIdCounter.current++}`,
          role: "assistant",
          content: "",
          thinking: "",
          timestamp: new Date(),
          status: "thinking",
        },
      ]);

      scrollToBottom();

      try {
        const response = await fieldNotesApiService.rejectAction({ threadId, feedback });
        
        // Se il backend risponde direttamente con il messaggio completo
        if (response.status === AgentResponseStatus.COMPLETED && response.message) {
          setMessages((prev) => {
            const updated = [...prev];
            let lastAssistantIndex = -1;
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === "assistant") {
                lastAssistantIndex = i;
                break;
              }
            }
            
            if (lastAssistantIndex !== -1) {
              updated[lastAssistantIndex] = {
                ...updated[lastAssistantIndex],
                content: response.message || "",
                thinking: "",
                status: "completed",
              };
            }
            
            return updated;
          });
          
          setIsProcessing(false);
          thinkingBuffer.current = "";
          scrollToBottom();
        }
        // Altrimenti Socket.IO riceverà gli eventi successivi
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
        
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${messageIdCounter.current++}`,
            role: "assistant",
            content: `❌ ${errorMessage}`,
            timestamp: new Date(),
            status: "completed",
          },
        ]);
        
        setIsProcessing(false);
        
        toast.error("Errore rifiuto", {
          description: errorMessage,
        });
      }
    },
    [threadId, pendingApproval, scrollToBottom]
  );

  /**
   * Setup e cleanup del socket
   */
  useEffect(() => {
    connectSocket();

    return () => {
      fieldNoteSocketService.disconnect();
    };
  }, [connectSocket]);

  return {
    messages,
    socketState,
    pendingApproval,
    isProcessing,
    messagesEndRef,
    sendMessage,
    approve,
    reject,
    clearMessages,
  };
}
