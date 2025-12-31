import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  RefreshCw,
  Send,
  Check,
  X,
  Wifi,
  WifiOff,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  conformityCheckerApiService,
  type ConformityCheckResult,
  type ConformityProposal,
  type ConformityViolation,
  type ConformityJobState,
} from "@/api/conformity-checker";
import {
  dosageJobSocketService,
  type DosageLogEvent,
  type SocketConnectionState,
} from "@/services/dosageJobSocket";

interface ConformityCheckerPanelProps {
  jobGroupId: string;
  onConfirmSuccess?: () => void;
  onClose?: () => void;
}

type PanelState = "idle" | "loading" | "polling" | "results" | "confirming";

// Tipo per i log eventi con timestamp locale
interface LiveLogEntry {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function ConformityCheckerPanel({
  jobGroupId,
  onConfirmSuccess,
  onClose,
}: ConformityCheckerPanelProps) {
  const [notes, setNotes] = useState<string>("");
  const [state, setState] = useState<PanelState>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const [result, setResult] = useState<ConformityCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<LiveLogEntry[]>([]);
  const [socketState, setSocketState] = useState<SocketConnectionState>("disconnected");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef<number>(0);

  // Auto-scroll dei log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveLogs]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      dosageJobSocketService.disconnect();
    };
  }, []);

  const addLog = useCallback((event: DosageLogEvent) => {
    const newLog: LiveLogEntry = {
      id: `log-${logIdCounter.current++}`,
      timestamp: new Date(event.timestamp || Date.now()),
      type: event.type,
      message: event.message,
      metadata: event.metadata,
    };

    setLiveLogs((prev) => [...prev, newLog]);

    // Aggiorna il progresso se presente
    if (event.type === "progress" && event.metadata?.progress !== undefined) {
      setProgress(Number(event.metadata.progress));
      if (event.metadata.phase) {
        setCurrentPhase(String(event.metadata.phase));
      }
    }

    // Aggiorna la fase corrente per altri tipi di evento
    if (event.type === "flows" || event.type === "info") {
      setCurrentPhase(event.message);
    }
  }, []);

  const connectToSocket = useCallback((jobId: string) => {
    dosageJobSocketService.connect(jobId, {
      onConnect: () => {
        setSocketState("connected");
        addLog({
          jobId,
          userId: "",
          timestamp: new Date().toISOString(),
          type: "info",
          message: "Connesso al server per aggiornamenti in tempo reale",
        });
      },
      onDisconnect: () => {
        setSocketState("disconnected");
      },
      onError: (err) => {
        setSocketState("error");
        console.error("Socket error:", err);
      },
      onJoined: (room) => {
        addLog({
          jobId,
          userId: "",
          timestamp: new Date().toISOString(),
          type: "info",
          message: `In ascolto sulla room: ${room}`,
        });
      },
      onLog: (event) => {
        addLog(event);
      },
    });
    setSocketState("connecting");
  }, [addLog]);

  const handleProgressUpdate = useCallback(
    (progressValue: number, jobState: ConformityJobState) => {
      setProgress(progressValue);
      if (jobState === "active" || jobState === "waiting") {
        setState("polling");
      }
    },
    []
  );

  const handleVerify = async () => {
    if (!jobGroupId) {
      toast.error("Nessun gruppo di job selezionato");
      return;
    }

    setError(null);
    setState("loading");
    setProgress(0);
    setCurrentPhase("Avvio verifica...");
    setLiveLogs([]);

    try {
      // Start the job
      const startResponse = await conformityCheckerApiService.startJob(
        jobGroupId,
        notes
      );

      // Connetti al socket per ricevere log in tempo reale
      connectToSocket(startResponse.jobId);

      setState("polling");

      // Poll for completion
      const finalStatus = await conformityCheckerApiService.pollJobStatus(
        startResponse.jobId,
        {
          intervalMs: 2000,
          timeoutMs: 300000,
          onProgress: handleProgressUpdate,
        }
      );

      // Disconnetti dal socket
      dosageJobSocketService.disconnect();
      setSocketState("disconnected");

      if (finalStatus.state === "completed") {
        setResult(finalStatus.result);
        setState("results");
        toast.success("Verifica completata", {
          description: `${finalStatus.result.summary.totalJobs} operazioni verificate`,
        });
      } else if (finalStatus.state === "failed") {
        setError(finalStatus.failedReason || "Verifica fallita");
        setState("idle");
        toast.error("Verifica fallita", {
          description: finalStatus.failedReason,
        });
      }
    } catch (err) {
      // Disconnetti dal socket in caso di errore
      dosageJobSocketService.disconnect();
      setSocketState("disconnected");

      const errorMessage =
        err instanceof Error ? err.message : "Errore sconosciuto";
      setError(errorMessage);
      setState("idle");
      toast.error("Errore durante la verifica", {
        description: errorMessage,
      });
    }
  };

  const handleConfirm = async () => {
    if (!result) return;

    setState("confirming");

    try {
      await conformityCheckerApiService.confirmProposals(
        result.jobGroupId,
        result.proposals
      );

      toast.success("Modifiche confermate", {
        description: "Le operazioni sono state aggiornate con successo",
      });

      // Reset state
      setResult(null);
      setNotes("");
      setState("idle");

      onConfirmSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Errore sconosciuto";
      setError(errorMessage);
      setState("results");
      toast.error("Errore durante la conferma", {
        description: errorMessage,
      });
    }
  };

  const handleCancel = () => {
    setResult(null);
    setState("idle");
    setError(null);
  };

  const handleReset = () => {
    setNotes("");
    setResult(null);
    setState("idle");
    setError(null);
    setProgress(0);
  };

  const isLoading = state === "loading" || state === "polling";
  const isConfirming = state === "confirming";
  const hasResults = state === "results" && result !== null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Input Section */}
      {!hasResults && !isLoading && (
        <div className="flex-shrink-0 p-4 border-b border-slate-200 space-y-3">
          <Textarea
            placeholder="Inserisci note per la verifica di conformità (es. Evitare trattamenti in fioritura. Pressione oidio alta.)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
            className="min-h-[100px] resize-none text-sm"
          />

          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              onClick={handleVerify}
              disabled={isLoading || !jobGroupId}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Verifica
            </Button>
          </div>
        </div>
      )}

      {/* Live Status Section - Durante la verifica */}
      {isLoading && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header con stato e progresso */}
          <div className="flex-shrink-0 p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" ariaLabel="Verifica in corso" />
                <span className="text-sm font-medium text-slate-700">
                  Verifica in corso...
                </span>
              </div>
              <div className="flex items-center gap-2">
                {socketState === "connected" ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                    <Wifi className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                ) : socketState === "connecting" ? (
                  <Badge className="bg-amber-100 text-amber-700 text-xs">
                    <Spinner className="h-3 w-3 mr-1" ariaLabel="Connessione" />
                    Connessione...
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-500 text-xs">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>

            {/* Barra progresso */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 truncate max-w-[200px]">
                  {currentPhase || "Inizializzazione..."}
                </span>
                <span className="text-slate-700 font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Live Logs */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-slate-900 p-3">
            <div className="space-y-1 font-mono text-xs">
              {liveLogs.map((log) => (
                <LiveLogItem key={log.id} log={log} />
              ))}
              <div ref={logsEndRef} />
            </div>
            {liveLogs.length === 0 && (
              <div className="text-slate-500 text-center py-4">
                In attesa di log dal server...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Section - Scrollable */}
      {hasResults && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Summary */}
            <ConformitySummaryCard summary={result.summary} />

            {/* User Notes Analysis */}
            {result.userNotesAnalysis && (
              <UserNotesAnalysisCard analysis={result.userNotesAnalysis} />
            )}

            {/* Proposals */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">
                Dettagli Operazioni
              </h3>
              {result.proposals.map((proposal, index) => (
                <ProposalCard key={proposal.jobId || index} proposal={proposal} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Fixed at bottom */}
      {hasResults && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 flex items-center gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
              disabled={isConfirming}
            >
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" ariaLabel="Conferma in corso" />
                  Conferma...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Conferma
                </>
              )}
            </Button>
          </div>
          <div className="px-4 pb-4">
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="w-full text-slate-500 hover:text-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Nuova verifica
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function ConformitySummaryCard({
  summary,
}: {
  summary: ConformityCheckResult["summary"];
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        Riepilogo Verifica
      </h3>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <StatItem label="Totale operazioni" value={summary.totalJobs} />
        <StatItem
          label="Già verificate"
          value={summary.alreadyCheckedJobs}
          variant="muted"
        />
        <StatItem
          label="Nuove verifiche"
          value={summary.newlyCheckedJobs}
          variant="info"
        />
        <StatItem
          label="Conformi"
          value={summary.conformJobs}
          variant="success"
        />
        <StatItem
          label="Non conformi"
          value={summary.nonConformJobs}
          variant="error"
        />
        <StatItem
          label="Da escludere"
          value={summary.jobsToExclude}
          variant="warning"
        />
      </div>

      {summary.totalViolations > 0 && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500">Violazioni:</span>
          {summary.errorCount > 0 && (
            <Badge className="bg-red-100 text-red-700 text-xs">
              {summary.errorCount} errori
            </Badge>
          )}
          {summary.warningCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 text-xs">
              {summary.warningCount} avvisi
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function StatItem({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "success" | "error" | "warning" | "info" | "muted";
}) {
  const valueColors = {
    default: "text-slate-900",
    success: "text-emerald-600",
    error: "text-red-600",
    warning: "text-amber-600",
    info: "text-blue-600",
    muted: "text-slate-400",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-semibold", valueColors[variant])}>{value}</span>
    </div>
  );
}

// User Notes Analysis Card
function UserNotesAnalysisCard({
  analysis,
}: {
  analysis: ConformityCheckResult["userNotesAnalysis"];
}) {
  if (!analysis) return null;

  return (
    <div className="bg-blue-50 rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
        <Info className="h-4 w-4" />
        Analisi Note
      </h3>

      {analysis.originalNotes && (
        <p className="text-xs text-blue-600 italic">
          "{analysis.originalNotes}"
        </p>
      )}

      {analysis.appliedRules.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-blue-700">
            Regole applicate:
          </span>
          <div className="flex flex-wrap gap-1">
            {analysis.appliedRules.map((rule, idx) => (
              <Badge
                key={idx}
                className="bg-blue-100 text-blue-700 text-xs font-normal"
              >
                {rule}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {analysis.ignoredRules.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500">
            Regole ignorate:
          </span>
          <div className="flex flex-wrap gap-1">
            {analysis.ignoredRules.map((rule, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-slate-500 text-xs font-normal"
              >
                {rule}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Proposal Card Component
function ProposalCard({ proposal }: { proposal: ConformityProposal }) {
  const hasViolations = proposal.violations.length > 0;
  const hasChanges =
    JSON.stringify(proposal.originalValues) !==
    JSON.stringify(proposal.proposedValues);

  return (
    <div
      className={cn(
        "rounded-xl p-4 space-y-3 border",
        proposal.isConform
          ? "bg-emerald-50 border-emerald-200"
          : "bg-red-50 border-red-200",
        proposal.shouldExclude && "bg-amber-50 border-amber-200"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {proposal.productName}
            </span>
            {proposal.registrationNumber && (
              <Badge variant="outline" className="text-xs font-mono">
                Reg. {proposal.registrationNumber}
              </Badge>
            )}
          </div>
        </div>
        <StatusBadge proposal={proposal} />
      </div>

      {/* Violations */}
      {hasViolations && (
        <div className="space-y-2">
          {proposal.violations.map((violation, idx) => (
            <ViolationItem key={idx} violation={violation} />
          ))}
        </div>
      )}

      {/* Changes */}
      {hasChanges && !proposal.shouldExclude && (
        <div className="bg-white/60 rounded-lg p-3 space-y-2">
          <span className="text-xs font-medium text-slate-600">
            Modifiche proposte:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <ChangeItem
              label="Quantità"
              original={`${proposal.originalValues.quantity} ${proposal.originalValues.unitOfMeasureQuantity}`}
              proposed={`${proposal.proposedValues.quantity} ${proposal.proposedValues.unitOfMeasureQuantity}`}
            />
          </div>
          {proposal.proposedValues.note && (
            <p className="text-xs text-slate-500 italic mt-2">
              {proposal.proposedValues.note}
            </p>
          )}
        </div>
      )}

      {/* Exclusion Reason */}
      {proposal.shouldExclude && proposal.exclusionReason && (
        <div className="bg-amber-100 rounded-lg p-2 text-xs text-amber-800">
          <strong>Motivo esclusione:</strong> {proposal.exclusionReason}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ proposal }: { proposal: ConformityProposal }) {
  if (proposal.shouldExclude) {
    return (
      <Badge className="bg-amber-500 text-white text-xs">
        <XCircle className="h-3 w-3 mr-1" />
        Da escludere
      </Badge>
    );
  }

  if (proposal.isConform) {
    return (
      <Badge className="bg-emerald-500 text-white text-xs">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Conforme
      </Badge>
    );
  }

  return (
    <Badge className="bg-red-500 text-white text-xs">
      <AlertTriangle className="h-3 w-3 mr-1" />
      Non conforme
    </Badge>
  );
}

function ViolationItem({ violation }: { violation: ConformityViolation }) {
  const severityConfig = {
    ERROR: {
      icon: XCircle,
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
    },
    WARNING: {
      icon: AlertTriangle,
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
    },
    INFO: {
      icon: Info,
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-200",
    },
  };

  const config = severityConfig[violation.severity];
  const Icon = config.icon;

  // Verifica se ci sono valori da mostrare per la transizione
  const hasValues =
    violation.currentValue !== undefined ||
    violation.expectedValue !== undefined;

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded-lg border",
        config.bg,
        config.border
      )}
    >
      <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-medium", config.text)}>
          {violation.message}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs opacity-75">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {violation.source}
          </Badge>
          {hasValues && (
            <span>
              {violation.field}: {String(violation.currentValue ?? "-")} →{" "}
              {String(violation.expectedValue ?? "-")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ChangeItem({
  label,
  original,
  proposed,
}: {
  label: string;
  original: string;
  proposed: string;
}) {
  const hasChange = original !== proposed;

  if (!hasChange) return null;

  return (
    <div className="col-span-2 flex items-center gap-2">
      <span className="text-slate-500">{label}:</span>
      <span className="line-through text-slate-400">{original}</span>
      <span className="text-emerald-600 font-medium">→ {proposed}</span>
    </div>
  );
}

// Live Log Item Component
function LiveLogItem({ log }: { log: LiveLogEntry }) {
  const typeConfig: Record<
    string,
    { color: string; icon: React.ReactNode; label: string }
  > = {
    info: {
      color: "text-blue-400",
      icon: <Info className="h-3 w-3" />,
      label: "INFO",
    },
    flows: {
      color: "text-cyan-400",
      icon: <Zap className="h-3 w-3" />,
      label: "FLOW",
    },
    progress: {
      color: "text-emerald-400",
      icon: <RefreshCw className="h-3 w-3" />,
      label: "PROG",
    },
    "flows-timing": {
      color: "text-purple-400",
      icon: <Clock className="h-3 w-3" />,
      label: "TIME",
    },
    completed: {
      color: "text-green-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "DONE",
    },
    error: {
      color: "text-red-400",
      icon: <XCircle className="h-3 w-3" />,
      label: "ERR",
    },
    warning: {
      color: "text-amber-400",
      icon: <AlertTriangle className="h-3 w-3" />,
      label: "WARN",
    },
    match: {
      color: "text-indigo-400",
      icon: <Check className="h-3 w-3" />,
      label: "MATCH",
    },
    complete: {
      color: "text-green-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "DONE",
    },
  };

  const config = typeConfig[log.type] || {
    color: "text-slate-400",
    icon: <Info className="h-3 w-3" />,
    label: log.type.toUpperCase().slice(0, 4),
  };

  const timeStr = log.timestamp.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-start gap-2 py-0.5 hover:bg-slate-800/50 rounded px-1">
      <span className="text-slate-600 flex-shrink-0">{timeStr}</span>
      <span className={cn("flex-shrink-0 flex items-center gap-1", config.color)}>
        {config.icon}
        <span className="w-12">[{config.label}]</span>
      </span>
      <span className="text-slate-300 break-words">{log.message}</span>
      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <span className="text-slate-500 truncate max-w-[150px]">
          {JSON.stringify(log.metadata)}
        </span>
      )}
    </div>
  );
}

export default ConformityCheckerPanel;

