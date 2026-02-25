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
  Cpu,
  DollarSign,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMe } from "@/hooks/useAuth";
import { UserRole } from "@/api/auth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChats, useDeleteChat } from "@/hooks/useChats";
import { chatsApiService } from "@/api/chats";
import type { ChatSummary } from "@/api/chats";
import type { CostInfo, PlanStep } from "@/api/dosage-agent-chat";
import {
  useDosageAgentChat,
  type DosageAgentMessage,
  type DosageAgentPendingApproval,
  type StreamingStatus,
  type ActivePlan,
} from "@/hooks/useDosageAgentChat";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Tool label mapping ───────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  list_user_companies: "Caricamento aziende",
  list_production_units: "Caricamento unita produttive",
  list_company_products: "Caricamento prodotti magazzino",
  check_product_revoked: "Verifica stato prodotto",
  expand_production_cycles: "Caricamento cicli produttivi",
  extract_buffer_zones: "Calcolo fasce di rispetto",
  search_products: "Ricerca prodotti compatibili",
  enrich_from_bdf: "Arricchimento dati BDF",
  plan_treatment_strategy: "Pianificazione strategia",
  calculate_dosage: "Calcolo dosi e date",
  validate_compliance: "Verifica conformita",
  validate_sa_group_limits: "Verifica limiti gruppi SA",
  check_compatibility: "Verifica compatibilita",
  calculate_stock_balance: "Bilancio magazzino",
  optimize_dosage: "Ottimizzazione dosi",
  generate_treatment_plan: "Generazione piano trattamenti",
  modify_plan_step: "Modifica passo del piano",
  execute_treatment_plan: "Esecuzione piano",
  create_treatment_jobs: "Creazione job trattamenti",
  search_rules: "Ricerca disciplinari",
  search_disciplinari_database: "Ricerca database disciplinari",
  search_disciplinari_bdf_pdf: "Ricerca PDF disciplinari",
  bdf_search_product_doses: "Ricerca dosi BDF",
  bdf_search_products_by_adversity: "Ricerca prodotti per avversita",
  tavily_scientific_search: "Ricerca fonti scientifiche",
};

function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName;
}

const DESTRUCTIVE_TOOL_DESCRIPTIONS: Record<string, string> = {
  create_treatment_jobs:
    "Questa azione creera dei job di trattamento nel sistema. I job verranno assegnati alle unita produttive selezionate.",
  execute_treatment_plan:
    "Questa azione eseguira il piano di trattamento corrente, creando i job nel sistema.",
};

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
    streamingStatus,
    pendingApproval,
    activeTool,
    toolCount,
    currentModelInfo,
    lastCost,
    currentPlan,
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
      if (isMobile) setSidebarOpen(false);
    } catch {
      toast.error("Errore nel caricamento della chat");
    }
  };

  const handleSuggestionClick = (text: string) => {
    sendMessage(text);
  };

  const sidebarContent = (
    <ChatHistorySidebar
      onSelectChat={handleLoadChat}
      onNewChat={handleNewChat}
      onClose={() => setSidebarOpen(false)}
      activeThreadId={threadId}
      isMobile={isMobile}
    />
  );

  return (
    <TooltipProvider>
      <div className="flex h-full w-full overflow-hidden">
        {/* Sidebar - Sheet on mobile, inline on desktop */}
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-[280px] p-0 gap-0">
              <SheetTitle className="sr-only">Cronologia chat</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        ) : (
          sidebarOpen && sidebarContent
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
            <div className="flex items-center gap-1.5 shrink-0">
              {currentModelInfo ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Cpu className="h-3 w-3" />
                      {currentModelInfo.modelName}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-0.5">
                      <div>Provider: {currentModelInfo.provider}</div>
                      <div>Complessita: {currentModelInfo.complexity}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  {modelName}
                </Badge>
              )}
              {lastCost && <CostBadge cost={lastCost} />}
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
              {messages.length === 0 && !isStreaming && (
                <EmptyState onSuggestionClick={handleSuggestionClick} />
              )}

              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {currentPlan && currentPlan.steps.length > 0 && (
                <TreatmentPlanCard plan={currentPlan} />
              )}

              {pendingApproval && (
                <PendingActionCard
                  pendingApproval={pendingApproval}
                  isBusy={isStreaming}
                  onApprove={approveAction}
                  onReject={rejectAction}
                />
              )}

              {isStreaming && (
                <StreamingIndicator
                  streamingStatus={streamingStatus}
                  activeTool={activeTool}
                  toolCount={toolCount}
                />
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
    </TooltipProvider>
  );
}

// ─── Cost Badge ──────────────────────────────────────────────
function CostBadge({ cost }: { cost: CostInfo }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="text-[10px] gap-1 text-blue-700 border-blue-200 bg-blue-50"
        >
          <DollarSign className="h-3 w-3" />$
          {cost.totalCostUsd.toFixed(4)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-0.5">
          <div>Input: {cost.inputTokens.toLocaleString()} token</div>
          <div>Output: {cost.outputTokens.toLocaleString()} token</div>
          {cost.tavilyCalls > 0 && (
            <div>Tavily: {cost.tavilyCalls} chiamate</div>
          )}
          <div>Costo: ${cost.totalCostUsd.toFixed(4)}</div>
          <div>Con margine: ${cost.costWithMarginUsd.toFixed(4)}</div>
          {cost.provider && <div>Provider: {cost.provider}</div>}
          {cost.modelName && <div>Modello: {cost.modelName}</div>}
          {cost.byProvider && cost.byProvider.length > 0 && (
            <>
              <hr className="border-slate-600 my-1" />
              {cost.byProvider.map((bp) => (
                <div key={bp.provider}>
                  {bp.provider}: ${bp.costUsd.toFixed(4)}
                </div>
              ))}
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Streaming Indicator ─────────────────────────────────────
function StreamingIndicator({
  streamingStatus,
  activeTool,
  toolCount,
}: {
  streamingStatus: StreamingStatus;
  activeTool: string | null;
  toolCount: number;
}) {
  const statusLabel = (() => {
    switch (streamingStatus) {
      case "thinking":
        return "L'agente sta ragionando...";
      case "tool_running":
        return activeTool
          ? `${getToolLabel(activeTool)}...`
          : "Esecuzione strumento...";
      case "plan_executing":
        return "Esecuzione piano in corso...";
      default:
        return "L'agente sta elaborando...";
    }
  })();

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Spinner className="h-3 w-3" ariaLabel="Agente attivo" />
      <span>{statusLabel}</span>
      {toolCount > 0 && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
          <Wrench className="h-2.5 w-2.5 mr-0.5" />
          {toolCount}
        </Badge>
      )}
    </div>
  );
}

// ─── Treatment Plan Card ─────────────────────────────────────
function TreatmentPlanCard({ plan }: { plan: ActivePlan }) {
  const [isOpen, setIsOpen] = useState(true);
  const completedSteps = plan.steps.filter(
    (s) => s.status === "completed",
  ).length;
  const progressPercent =
    plan.totalSteps > 0
      ? Math.round((completedSteps / plan.totalSteps) * 100)
      : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-slate-800">
                Piano trattamento
              </span>
              <Badge variant="outline" className="text-[10px]">
                {completedSteps}/{plan.totalSteps}
              </Badge>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>
        </CollapsibleTrigger>

        {plan.status === "executing" && (
          <div className="px-4 pb-2">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-1.5">
            {plan.steps.map((step) => (
              <PlanStepRow key={step.stepNumber} step={step} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function PlanStepRow({ step }: { step: PlanStep }) {
  const icon = (() => {
    switch (step.status) {
      case "completed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
      case "in_progress":
        return (
          <Spinner className="h-3.5 w-3.5" ariaLabel="In corso" />
        );
      case "modified":
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "failed":
        return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Circle className="h-3.5 w-3.5 text-slate-300" />;
    }
  })();

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
        step.status === "in_progress" && "bg-emerald-100/50",
        step.status === "completed" && "text-slate-500",
      )}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <span className="font-medium">Passo {step.stepNumber}:</span>{" "}
        {step.description}
        {step.toolName && (
          <Badge
            variant="outline"
            className="ml-1.5 text-[9px] px-1 py-0"
          >
            {getToolLabel(step.toolName)}
          </Badge>
        )}
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
  isMobile = false,
}: {
  onSelectChat: (chat: ChatSummary) => void;
  onNewChat: () => void;
  onClose: () => void;
  activeThreadId: string;
  isMobile?: boolean;
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
      <div className={cn(
        "flex shrink-0 flex-col bg-slate-50/50 h-full overflow-hidden",
        isMobile ? "w-full" : "w-[280px] border-r border-slate-200",
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
          <span className="text-sm font-semibold text-slate-700">
            Cronologia
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
            {!isMobile && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
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

        {/* Per-message cost & model info */}
        {!isUser && (message.cost || message.modelInfo) && (
          <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
            {message.cost && <CostBadge cost={message.cost} />}
            {message.modelInfo && (
              <Badge
                variant="outline"
                className="text-[9px] gap-1 text-slate-500"
              >
                <Cpu className="h-2.5 w-2.5" />
                {message.modelInfo.modelName}
              </Badge>
            )}
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

  const toolName = pendingApproval.toolCall.name;
  const destructiveDescription = DESTRUCTIVE_TOOL_DESCRIPTIONS[toolName];

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
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="font-medium">Azione in attesa di approvazione</p>
      </div>
      <p className="text-xs text-amber-800">
        L'agente vuole eseguire:{" "}
        <strong>{getToolLabel(toolName)}</strong>
      </p>
      {destructiveDescription && (
        <p className="text-xs text-amber-700 bg-amber-100 rounded p-2">
          {destructiveDescription}
        </p>
      )}
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
function EmptyState({
  onSuggestionClick,
}: {
  onSuggestionClick: (text: string) => void;
}) {
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
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:border-emerald-300 cursor-pointer text-left transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
