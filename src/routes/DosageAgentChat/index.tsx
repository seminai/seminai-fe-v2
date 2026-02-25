import { useState } from "react";
import { Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MessageCircle,
  Send,
  Plus,
  Trash2,
  StopCircle,
  PanelLeftClose,
  PanelLeft,
  Wrench,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMe } from "@/hooks/useAuth";
import { UserRole } from "@/api/auth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChats, useDeleteChat } from "@/hooks/useChats";
import { chatsApiService } from "@/api/chats";
import type { ChatSummary } from "@/api/chats";
import {
  useDosageAgentChat,
  type DosageAgentMessage,
  type DosageAgentPendingApproval,
} from "@/hooks/useDosageAgentChat";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Tool label mapping ───────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  check_product_revoked: "Verifica revoca",
  search_products: "Ricerca prodotti",
  calculate_dosage: "Calcolo dosi",
  validate_compliance: "Validazione disciplinare",
  validate_sa_group_limits: "Limiti sostanze attive",
  check_compatibility: "Compatibilita",
  calculate_stock_balance: "Bilancio scorte",
  optimize_dosage: "Ottimizzazione dosi",
  plan_treatment_strategy: "Strategia trattamento",
  expand_production_cycles: "Cicli produttivi",
  extract_buffer_zones: "Zone cuscinetto",
  enrich_from_bdf: "Dati BDF",
  create_treatment_jobs: "Creazione trattamenti",
  search_disciplinari_database: "Disciplinari regionali",
  search_disciplinari_bdf_pdf: "PDF disciplinari",
  tavily_scientific_search: "Ricerca scientifica",
  bdf_search_product_doses: "Dosi BDF",
  bdf_search_products_by_adversity: "Prodotti per avversita",
  search_rules: "Regole aziendali",
};

function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName;
}

// ─── Main Component ───────────────────────────────────────────
export default function DosageAgentChat() {
  const { data: meData, isLoading: meLoading } = useMe();
  const { currentWorkspace } = useWorkspaceContext();
  const isMobile = useIsMobile();

  const [threadId, setThreadId] = useState<string>(() => crypto.randomUUID());
  const [modelName] = useState("gpt-4o-mini");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [input, setInput] = useState("");

  const {
    messages,
    isLoading: isStreaming,
    pendingApproval,
    sendMessage,
    approveAction,
    rejectAction,
    cancelRequest,
    loadMessages,
    clearMessages,
    messagesEndRef,
  } = useDosageAgentChat(threadId, {
    modelName,
    workspaceId: currentWorkspace?.id,
  });

  // Admin guard
  if (meLoading) return null;
  if (!meData || meData.role !== UserRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setThreadId(crypto.randomUUID());
    clearMessages();
    setInput("");
  };

  const handleLoadChat = async (chat: ChatSummary) => {
    try {
      const detail = await chatsApiService.getChatDetail(chat.id);
      setThreadId(detail.threadId);
      loadMessages(detail.messages);
    } catch {
      toast.error("Errore nel caricamento della chat");
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar - Chat History */}
      {sidebarOpen && (
        <ChatHistorySidebar
          onSelectChat={handleLoadChat}
          onNewChat={handleNewChat}
          onClose={() => setSidebarOpen(false)}
          activeThreadId={threadId}
        />
      )}

      {/* Chat Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 shrink-0">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Bot className="h-5 w-5 text-emerald-600 shrink-0" />
            <h1 className="text-sm font-semibold text-slate-800 truncate">
              Dosage Agent
            </h1>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {modelName}
          </Badge>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4 max-w-3xl mx-auto">
            {messages.length === 0 && !isStreaming && <EmptyState />}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {pendingApproval && (
              <PendingActionCard
                pendingApproval={pendingApproval}
                isBusy={isStreaming}
                onApprove={approveAction}
                onReject={rejectAction}
              />
            )}

            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Spinner className="h-3 w-3" ariaLabel="Agente attivo" />
                L'agente sta elaborando...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 max-w-3xl mx-auto space-y-3">
            <Textarea
              placeholder="Chiedi all'agronomo AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="min-h-[80px] resize-none text-sm"
            />
            <div className="flex items-center justify-end gap-2">
              {isStreaming ? (
                <Button
                  onClick={cancelRequest}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  size="sm"
                  disabled={!input.trim() || isStreaming}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Invia
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chat History Sidebar ─────────────────────────────────────
function ChatHistorySidebar({
  onSelectChat,
  onNewChat,
  onClose,
  activeThreadId,
}: {
  onSelectChat: (chat: ChatSummary) => void;
  onNewChat: () => void;
  onClose: () => void;
  activeThreadId: string;
}) {
  const { chats, isLoading } = useChats("DOSAGE_AGENT");
  const { deleteChat, isDeleting } = useDeleteChat();
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const handleDelete = (chatId: string) => {
    setDeletingChatId(chatId);
  };

  const confirmDelete = () => {
    if (deletingChatId) {
      deleteChat(deletingChatId, {
        onSuccess: () => {
          toast.success("Chat eliminata");
          setDeletingChatId(null);
        },
        onError: () => {
          toast.error("Errore nell'eliminazione della chat");
          setDeletingChatId(null);
        },
      });
    }
  };

  return (
    <>
      <div className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 h-full overflow-hidden">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
          <span className="text-sm font-semibold text-slate-700">
            Cronologia
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="p-2 space-y-1">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Spinner
                  className="h-4 w-4"
                  ariaLabel="Caricamento chat..."
                />
              </div>
            )}

            {!isLoading && chats.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">
                Nessuna conversazione
              </p>
            )}

            {chats.map((chat) => (
              <ChatHistoryItem
                key={chat.id}
                chat={chat}
                isActive={chat.threadId === activeThreadId}
                onSelect={() => onSelectChat(chat)}
                onDelete={() => handleDelete(chat.id)}
                isDeleting={isDeleting && deletingChatId === chat.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingChatId !== null}
        onOpenChange={(open) => !open && setDeletingChatId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina conversazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa conversazione? L'azione non
              puo essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Chat History Item ────────────────────────────────────────
function ChatHistoryItem({
  chat,
  isActive,
  onSelect,
  onDelete,
  isDeleting,
}: {
  chat: ChatSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const preview = chat.lastMessage?.content?.slice(0, 80) || "Conversazione";
  const date = new Date(chat.updatedAt);
  const dateStr = date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors overflow-hidden min-w-0",
        isActive
          ? "bg-emerald-50 border border-emerald-200"
          : "hover:bg-slate-100 border border-transparent",
      )}
      onClick={onSelect}
    >
      <MessageCircle className="h-4 w-4 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-700 truncate leading-relaxed">
          {preview}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">{dateStr}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 h-6 w-6 p-0 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Spinner className="h-3 w-3" ariaLabel="Eliminazione..." />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────
function MessageBubble({ message }: { message: DosageAgentMessage }) {
  const isUser = message.role === "user";
  const content =
    message.content || (isUser ? "" : "Sto elaborando la risposta...");

  return (
    <div
      className={cn(
        "flex min-w-0",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-white border border-slate-200 text-slate-800",
        )}
      >
        {/* Tool call badges */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {message.toolCalls.map((tc, i) => (
              <Badge
                key={`${tc.name}-${i}`}
                variant="outline"
                className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
              >
                <Wrench className="h-2.5 w-2.5 mr-1" />
                {getToolLabel(tc.name)}
              </Badge>
            ))}
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div className="min-w-0 max-w-full break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-base font-bold mb-2 mt-3 first:mt-0 text-slate-900">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-slate-800">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mb-1.5 mt-2.5 first:mt-0 text-slate-800">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-xs font-semibold mb-1 mt-2 first:mt-0 text-slate-700">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 text-slate-800 leading-relaxed break-words">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 mb-2 space-y-0.5 text-slate-800 break-words">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 mb-2 space-y-0.5 text-slate-800 break-words">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-slate-800 break-words pl-0.5">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-slate-700">{children}</em>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-800 hover:underline break-all"
                  >
                    {children}
                  </a>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-slate-100 text-slate-900 px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-slate-100 text-slate-900 p-2 rounded text-xs font-mono overflow-x-auto">
                      {children}
                    </code>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-slate-300 pl-3 my-2 italic text-slate-600">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-3 border-slate-200" />,
                table: ({ children }) => (
                  <div className="my-3 w-full min-w-0 overflow-x-auto">
                    <table className="w-max min-w-full border-collapse text-left text-sm text-slate-800">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="border-b border-slate-200 bg-slate-50/80">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => (
                  <tr className="border-b border-slate-100 last:border-b-0">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="whitespace-nowrap px-2 py-1.5 font-semibold text-slate-700 first:pl-0 last:pr-0">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="whitespace-nowrap px-2 py-1.5 first:pl-0 last:pr-0">
                    {children}
                  </td>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">Fonti</p>
            <ul className="space-y-1">
              {message.sources.map((source, index) => (
                <li key={`${source.url}-${index}`}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline break-all"
                  >
                    {source.title || source.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pending Action Card ──────────────────────────────────────
function PendingActionCard({
  pendingApproval,
  isBusy,
  onApprove,
  onReject,
}: {
  pendingApproval: DosageAgentPendingApproval;
  isBusy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleReject = () => {
    if (showRejectInput) {
      if (rejectReason.trim()) {
        onReject(rejectReason.trim());
        setRejectReason("");
        setShowRejectInput(false);
      }
    } else {
      setShowRejectInput(true);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
      <p className="font-medium">Azione in attesa di approvazione</p>
      <p className="text-xs text-amber-800">
        L'agente vuole eseguire:{" "}
        <strong>{getToolLabel(pendingApproval.toolCall.name)}</strong>
      </p>
      {pendingApproval.toolCall.args &&
        Object.keys(pendingApproval.toolCall.args).length > 0 && (
          <pre className="text-[10px] bg-amber-100 rounded p-2 overflow-x-auto">
            {JSON.stringify(pendingApproval.toolCall.args, null, 2)}
          </pre>
        )}

      {showRejectInput && (
        <Textarea
          placeholder="Motivo del rifiuto..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="min-h-[60px] resize-none text-xs bg-white"
        />
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={onApprove}
          disabled={isBusy}
        >
          Approva
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={isBusy}
        >
          {showRejectInput ? "Conferma rifiuto" : "Rifiuta"}
        </Button>
        {showRejectInput && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowRejectInput(false);
              setRejectReason("");
            }}
          >
            Annulla
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-emerald-50 rounded-full p-4 mb-4">
        <Bot className="h-8 w-8 text-emerald-600" />
      </div>
      <p className="text-base font-medium text-slate-700">Dosage Agent</p>
      <p className="text-sm text-slate-500 max-w-sm mt-2">
        Chiedi informazioni su dosaggi, conformita ai disciplinari, compatibilita
        tra prodotti fitosanitari e molto altro.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
        {[
          "Il Captano a 1.5 kg/ha su melo e conforme?",
          "Quali prodotti posso usare per la peronospora della vite?",
          "Verifica se Prolectus 50 WG e stato revocato",
          "Pianifica i trattamenti per melo su 2 ettari",
        ].map((suggestion) => (
          <div
            key={suggestion}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 cursor-default"
          >
            {suggestion}
          </div>
        ))}
      </div>
    </div>
  );
}
