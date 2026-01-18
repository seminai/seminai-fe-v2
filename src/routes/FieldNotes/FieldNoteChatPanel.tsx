import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Send,
  Check,
  X,
  Bot,
  User,
} from "lucide-react";
import { useFieldNoteChat, type ChatMessage } from "@/hooks/useFieldNoteChat";
import type { AgentToolCall } from "@/api/field-notes";

interface FieldNoteChatPanelProps {
  onFieldNoteSaved?: () => void;
  onSocketStateChange?: (state: string) => void;
}

export function FieldNoteChatPanel({ 
  onFieldNoteSaved: _onFieldNoteSaved,
  onSocketStateChange,
}: FieldNoteChatPanelProps) {
  const [threadId] = useState(() => `thread-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const {
    messages,
    socketState,
    isProcessing,
    pendingApproval,
    sendMessage,
    approve,
    reject,
    messagesEndRef,
  } = useFieldNoteChat(threadId);

  const [input, setInput] = useState("");

  // Notifica il componente padre quando cambia lo stato del socket
  useEffect(() => {
    if (onSocketStateChange) {
      onSocketStateChange(socketState);
    }
  }, [socketState, onSocketStateChange]);

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) {
      return;
    }

    const messageText = input;
    setInput("");
    await sendMessage(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <EmptyState />
          )}
          
          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}

          {pendingApproval && (
            <div className="flex justify-center">
              <ApprovalDialog
                toolCall={pendingApproval}
                onApprove={approve}
                onReject={reject}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-slate-200 p-4 bg-slate-50">
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Es: ho dato 10 kg di rame nel vigneto nord..."
            disabled={isProcessing}
            className="min-h-[80px] resize-none bg-white"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {isProcessing ? "Elaborazione in corso..." : "Premi Invio per inviare, Shift+Invio per nuova riga"}
            </span>
            <Button
              onClick={handleSendMessage}
              disabled={isProcessing || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" ariaLabel="Invio in corso" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Invia
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rimuove gli ID UUID dal testo per renderlo più user-friendly
 */
function removeIdsFromText(text: string): string {
  // Pattern per UUID (es: 132924be-098e-4b0d-813d-ceb778d3ffb1)
  const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
  
  // Rimuovi UUID
  let cleaned = text.replace(uuidPattern, '');
  
  // Rimuovi righe che contengono solo "ID:" o "Campo ID:", "Unità Produttiva ID:", "Prodotto ID:"
  cleaned = cleaned
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return !trimmed.match(/^(🏭|🌱|💊)?\s*(Campo|Unità Produttiva|Prodotto)?\s*ID\s*:?\s*$/i);
    })
    .join('\n');
  
  // Rimuovi spazi multipli e linee vuote consecutive
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  return cleaned;
}

/**
 * Formatta il contenuto del messaggio convertendo markdown semplice in HTML
 * Supporta: **grassetto**, emoji, e line breaks
 * Rimuove automaticamente gli ID per renderlo più user-friendly
 */
function FormattedMessage({ content }: { content: string }) {
  // Pulisci il contenuto rimuovendo gli ID
  const cleanedContent = removeIdsFromText(content);
  
  // Converte **testo** in <strong>testo</strong>
  const formatText = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      // Aggiungi testo prima del match
      if (match.index > lastIndex) {
        parts.push(
          <span key={key++}>
            {text.slice(lastIndex, match.index)}
          </span>
        );
      }
      
      // Aggiungi testo in grassetto
      parts.push(
        <strong key={key++} className="font-semibold">
          {match[1]}
        </strong>
      );
      
      lastIndex = match.index + match[0].length;
    }

    // Aggiungi testo rimanente
    if (lastIndex < text.length) {
      parts.push(
        <span key={key++}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
  };

  // Divide per line breaks e formatta ogni riga
  const lines = cleanedContent.split('\n');
  
  return (
    <>
      {lines.map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {formatText(line)}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-emerald-100 rounded-full p-4 mb-4">
        <Bot className="h-8 w-8 text-emerald-600" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700 mb-2">
        Inizia una conversazione
      </h3>
      <p className="text-xs text-slate-500 max-w-xs">
        Descrivi cosa hai fatto in campo e l'AI ti aiuterà a registrare l'operazione
      </p>
      <div className="mt-4 space-y-1 text-xs text-slate-400">
        <p>💡 Esempi:</p>
        <p className="italic">"ho dato 10 kg di rame nel vigneto"</p>
        <p className="italic">"trattamento con zolfo sul campo 3"</p>
      </div>
    </div>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-blue-100" : "bg-emerald-100"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-blue-600" />
        ) : (
          <Bot className="h-4 w-4 text-emerald-600" />
        )}
      </div>

      {/* Message content */}
      <div className={cn("flex-1 space-y-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "inline-block px-4 py-2 rounded-lg max-w-[85%]",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-800"
          )}
        >
          {message.content && (
            <div className="text-sm whitespace-pre-wrap break-words">
              <FormattedMessage content={message.content} />
            </div>
          )}

          {message.thinking && (
            <div className="mt-2 pt-2 border-t border-slate-300/50">
              <p className="text-xs opacity-75 italic whitespace-pre-wrap break-words">
                {message.thinking}
              </p>
            </div>
          )}

          {message.status === "thinking" && !message.thinking && (
            <div className="flex items-center gap-2">
              <Spinner className="h-3 w-3" ariaLabel="Pensando" />
              <span className="text-xs italic">Pensando...</span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-400 px-1">
          {message.timestamp.toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

function ApprovalDialog({
  toolCall,
  onApprove,
  onReject,
}: {
  toolCall: AgentToolCall;
  onApprove: () => void;
  onReject: (feedback: string) => void;
}) {
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleReject = () => {
    if (showRejectInput) {
      if (rejectFeedback.trim()) {
        onReject(rejectFeedback);
        setRejectFeedback("");
        setShowRejectInput(false);
      }
    } else {
      setShowRejectInput(true);
    }
  };

  // Estrae informazioni user-friendly dai parametri, nascondendo gli ID
  const userFriendlyInfo = useMemo(() => {
    const args = toolCall.args || {};
    const extractedData = args.extractedData as Record<string, unknown> | undefined;
    const info: {
      content?: string;
      category?: string;
      field?: string;
      productionUnit?: string;
      product?: string;
      quantity?: string;
      confidence?: number;
    } = {};

    // Contenuto
    if (args.rawContent) {
      info.content = String(args.rawContent);
    }

    // Categoria
    if (args.category) {
      const category = String(args.category);
      const categoryLabels: Record<string, string> = {
        OPERATION: "Operazione",
        OBSERVATION: "Osservazione",
        MEASUREMENT: "Misurazione",
        HARVEST: "Raccolta",
        MAINTENANCE: "Manutenzione",
        OTHER: "Altro",
      };
      info.category = categoryLabels[category] || category;
    }

    // Campo - usa il nome dall'extractedData se disponibile
    if (extractedData?.recognizedFields) {
      const fields = extractedData.recognizedFields as Array<{ name?: string }>;
      if (fields.length > 0 && fields[0].name) {
        info.field = fields[0].name;
      }
    }

    // Prodotto e quantità - usa i dati dall'extractedData
    if (extractedData?.recognizedProducts) {
      const products = extractedData.recognizedProducts as Array<{
        name?: string;
        quantity?: number;
        unit?: string;
      }>;
      if (products.length > 0) {
        const product = products[0];
        if (product.name) {
          info.product = product.name;
        }
        if (product.quantity && product.unit) {
          info.quantity = `${product.quantity} ${product.unit}`;
        }
      }
    }

    // Confidence score
    if (args.aiConfidenceScore !== undefined) {
      info.confidence = Number(args.aiConfidenceScore);
    }

    return info;
  }, [toolCall.args]);

  return (
    <div className="w-full max-w-sm bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Check className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            Conferma Salvataggio
          </h4>
          <p className="text-xs text-blue-800 mb-3">
            Vuoi salvare questa nota di campo?
          </p>
          
          <div className="space-y-2 text-sm">
            {userFriendlyInfo.content && (
              <div className="flex items-start gap-2">
                <span className="text-blue-600">📝</span>
                <div>
                  <span className="font-medium text-slate-700">Contenuto:</span>
                  <p className="text-slate-600 italic">"{userFriendlyInfo.content}"</p>
                </div>
              </div>
            )}

            {userFriendlyInfo.category && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600">📋</span>
                <div>
                  <span className="font-medium text-slate-700">Categoria: </span>
                  <span className="text-slate-600">{userFriendlyInfo.category}</span>
                </div>
              </div>
            )}

            {userFriendlyInfo.field && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600">🏭</span>
                <div>
                  <span className="font-medium text-slate-700">Campo: </span>
                  <span className="text-slate-600">{userFriendlyInfo.field}</span>
                </div>
              </div>
            )}

            {userFriendlyInfo.product && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600">💊</span>
                <div>
                  <span className="font-medium text-slate-700">Prodotto: </span>
                  <span className="text-slate-600">{userFriendlyInfo.product}</span>
                  {userFriendlyInfo.quantity && (
                    <span className="text-slate-600"> - {userFriendlyInfo.quantity}</span>
                  )}
                </div>
              </div>
            )}

            {userFriendlyInfo.confidence !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600">📊</span>
                <div>
                  <span className="font-medium text-slate-700">Affidabilità AI: </span>
                  <span className={cn(
                    "font-semibold",
                    userFriendlyInfo.confidence >= 0.8 
                      ? "text-emerald-600" 
                      : userFriendlyInfo.confidence >= 0.5 
                      ? "text-amber-600" 
                      : "text-red-600"
                  )}>
                    {Math.round(userFriendlyInfo.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRejectInput && (
        <div className="space-y-2 pt-2 border-t border-blue-200">
          <label className="text-xs font-medium text-blue-800">
            Cosa vuoi correggere?
          </label>
          <Input
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            placeholder="Es: il campo era vigneto sud, non nord"
            className="text-sm bg-white"
            autoFocus
          />
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button
          onClick={onApprove}
          size="sm"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Check className="h-4 w-4 mr-1" />
          Approva
        </Button>
        <Button
          onClick={handleReject}
          size="sm"
          variant="outline"
          className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          <X className="h-4 w-4 mr-1" />
          {showRejectInput ? "Invia Correzione" : "Correggi"}
        </Button>
      </div>
    </div>
  );
}

export default FieldNoteChatPanel;
