import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { fieldNotesApiService, AgentResponseStatus } from "@/api/field-notes";
import { fieldNoteChatApiService } from "@/api/field-note-chat";
import type { AgentToolCall } from "@/api/field-notes";
import type {
  ChatMessage,
  SendMessageOptions,
  UseFieldNoteChatOptions,
  UseFieldNoteChatResult,
} from "./useFieldNoteChat.types";
import {
  appendMessage,
  buildAssistantMessage,
  buildAssistantPlaceholder,
  buildUserMessage,
  updateLastAssistantMessage,
} from "./useFieldNoteChat.utils";
import { useFieldNoteChatSocket } from "./useFieldNoteChat.socket";

export type {
  ChatMessage,
  SendMessageOptions,
  UseFieldNoteChatOptions,
} from "./useFieldNoteChat.types";

export function useFieldNoteChat(
  threadId: string,
  hookOptions?: UseFieldNoteChatOptions
): UseFieldNoteChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingApproval, setPendingApproval] = useState<AgentToolCall | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const thinkingBuffer = useRef("");
  const messageIdCounter = useRef(0);

  const getNextMessageId = useCallback((prefix: string) => {
    return `${prefix}-${messageIdCounter.current++}`;
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    thinkingBuffer.current = "";
    messageIdCounter.current = 0;
  }, []);

  const socketState = useFieldNoteChatSocket({
    threadId,
    setMessages,
    setPendingApproval,
    setIsProcessing,
    scrollToBottom,
    thinkingBuffer,
    getNextMessageId,
    onFieldNoteSaved: hookOptions?.onFieldNoteSaved,
  });

  const applyApprovalResponse = useCallback(
    (responseMessage?: string) => {
      if (!responseMessage) return;
      setMessages((prev) =>
        updateLastAssistantMessage(prev, (last) => ({
          ...last,
          content: responseMessage,
          thinking: "",
          status: "completed",
        }))
      );
      setIsProcessing(false);
      thinkingBuffer.current = "";
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const handleApprovalNeeded = useCallback(
    (responseMessage?: string) => {
      setMessages((prev) =>
        updateLastAssistantMessage(prev, (last) => ({
          ...last,
          content:
            responseMessage || thinkingBuffer.current || "Richiesta approvazione",
          thinking: undefined,
          status: "approval_needed",
        }))
      );
      setIsProcessing(false);
      thinkingBuffer.current = "";
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const sendMessage = useCallback(
    async (text: string, options?: SendMessageOptions) => {
      if (!text.trim() || isProcessing) {
        return;
      }

      const file = options?.file;
      const attachment = file
        ? { name: file.name, size: file.size, type: file.type }
        : undefined;

      setMessages((prev) =>
        appendMessage(prev, buildUserMessage(getNextMessageId("user"), text, attachment))
      );

      setMessages((prev) =>
        appendMessage(prev, buildAssistantPlaceholder(getNextMessageId("assistant")))
      );

      setIsProcessing(true);
      thinkingBuffer.current = "";
      scrollToBottom();

      try {
        if (file) {
          if (options?.mode === "stream") {
            await fieldNoteChatApiService.streamMessageWithAttachment({
              threadId,
              message: text,
              file,
            });
            return;
          }

          const response =
            await fieldNoteChatApiService.sendMessageWithAttachment({
              threadId,
              message: text,
              file,
            });

          if (response.status === AgentResponseStatus.REQUIRES_APPROVAL) {
            if (response.pendingToolCalls?.length) {
              setPendingApproval(response.pendingToolCalls[0]);
            }
            handleApprovalNeeded(response.message);
            return;
          }

          if (
            response.status === AgentResponseStatus.COMPLETED &&
            response.message
          ) {
            setMessages((prev) =>
              updateLastAssistantMessage(prev, (last) => ({
                ...last,
                content: response.message || "",
                thinking: "",
                status: "completed",
              }))
            );
            setIsProcessing(false);
            thinkingBuffer.current = "";
            scrollToBottom();
            hookOptions?.onFieldNoteSaved?.();
          }
          return;
        }

        const response = await fieldNotesApiService.sendMessage({
          threadId,
          message: text,
        });

        if (response.status === AgentResponseStatus.REQUIRES_APPROVAL) {
          if (response.pendingToolCalls?.length) {
            setPendingApproval(response.pendingToolCalls[0]);
          }
          handleApprovalNeeded(response.message);
          return;
        }

        if (
          response.status === AgentResponseStatus.COMPLETED &&
          response.message
        ) {
          setMessages((prev) =>
            updateLastAssistantMessage(prev, (last) => ({
              ...last,
              content: response.message || "",
              thinking: "",
              status: "completed",
            }))
          );
          setIsProcessing(false);
          thinkingBuffer.current = "";
          scrollToBottom();
          hookOptions?.onFieldNoteSaved?.();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";

        setMessages((prev) =>
          appendMessage(
            prev,
            buildAssistantMessage(getNextMessageId("error"), `❌ ${errorMessage}`)
          )
        );

        setIsProcessing(false);

        toast.error("Errore invio messaggio", {
          description: errorMessage,
        });
      }
    },
    [
      threadId,
      isProcessing,
      scrollToBottom,
      getNextMessageId,
      handleApprovalNeeded,
      hookOptions?.onFieldNoteSaved,
    ]
  );

  const approve = useCallback(async () => {
    if (!pendingApproval) {
      return;
    }

    setPendingApproval(null);
    setIsProcessing(true);
    thinkingBuffer.current = "";

    setMessages((prev) =>
      appendMessage(
        prev,
        buildUserMessage(getNextMessageId("approval"), "✅ Approvato")
      )
    );

    setMessages((prev) =>
      appendMessage(prev, buildAssistantPlaceholder(getNextMessageId("assistant")))
    );

    scrollToBottom();

    try {
      const response = await fieldNotesApiService.approveAction({ threadId });
      if (
        response.status === AgentResponseStatus.COMPLETED &&
        response.message
      ) {
        applyApprovalResponse(response.message);
        hookOptions?.onFieldNoteSaved?.();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";

      setMessages((prev) =>
        appendMessage(
          prev,
          buildAssistantMessage(getNextMessageId("error"), `❌ ${errorMessage}`)
        )
      );

      setIsProcessing(false);

      toast.error("Errore approvazione", {
        description: errorMessage,
      });
    }
  }, [
    threadId,
    pendingApproval,
    scrollToBottom,
    applyApprovalResponse,
    getNextMessageId,
    hookOptions?.onFieldNoteSaved,
  ]);

  const reject = useCallback(
    async (feedback: string) => {
      if (!pendingApproval || !feedback.trim()) {
        return;
      }

      setPendingApproval(null);
      setIsProcessing(true);
      thinkingBuffer.current = "";

      setMessages((prev) =>
        appendMessage(
          prev,
          buildUserMessage(
            getNextMessageId("rejection"),
            `❌ Rifiutato: ${feedback}`
          )
        )
      );

      setMessages((prev) =>
        appendMessage(prev, buildAssistantPlaceholder(getNextMessageId("assistant")))
      );

      scrollToBottom();

      try {
        const response = await fieldNotesApiService.rejectAction({
          threadId,
          feedback,
        });
        if (
          response.status === AgentResponseStatus.COMPLETED &&
          response.message
        ) {
          applyApprovalResponse(response.message);
          hookOptions?.onFieldNoteSaved?.();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";

        setMessages((prev) =>
          appendMessage(
            prev,
            buildAssistantMessage(getNextMessageId("error"), `❌ ${errorMessage}`)
          )
        );

        setIsProcessing(false);

        toast.error("Errore rifiuto", {
          description: errorMessage,
        });
      }
    },
    [
      threadId,
      pendingApproval,
      scrollToBottom,
      applyApprovalResponse,
      getNextMessageId,
      hookOptions?.onFieldNoteSaved,
    ]
  );

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
