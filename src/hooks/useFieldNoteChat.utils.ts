import type { ChatAttachment, ChatMessage } from "./useFieldNoteChat.types";

export function buildUserMessage(
  id: string,
  content: string,
  attachment?: ChatAttachment
): ChatMessage {
  return {
    id,
    role: "user",
    content,
    timestamp: new Date(),
    status: "completed",
    attachment,
  };
}

export function buildAssistantPlaceholder(id: string): ChatMessage {
  return {
    id,
    role: "assistant",
    content: "",
    thinking: "",
    timestamp: new Date(),
    status: "thinking",
  };
}

export function buildAssistantMessage(id: string, content: string): ChatMessage {
  return {
    id,
    role: "assistant",
    content,
    timestamp: new Date(),
    status: "completed",
  };
}

export function appendMessage(
  messages: ChatMessage[],
  message: ChatMessage
): ChatMessage[] {
  return [...messages, message];
}

export function updateLastAssistantMessage(
  messages: ChatMessage[],
  updater: (message: ChatMessage) => ChatMessage
): ChatMessage[] {
  const updated = [...messages];
  let lastAssistantIndex = -1;
  for (let i = updated.length - 1; i >= 0; i--) {
    if (updated[i].role === "assistant") {
      lastAssistantIndex = i;
      break;
    }
  }

  if (lastAssistantIndex === -1) {
    return updated;
  }

  updated[lastAssistantIndex] = updater(updated[lastAssistantIndex]);
  return updated;
}
