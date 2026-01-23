import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  MessageSquare,
  Wifi,
  WifiOff,
  Clock,
  Zap,
  Brain,
  Wrench,
  Search,
  ListTodo,
  StopCircle,
  Mic,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobWithRelations } from "@/api/jobs";
import type { PendingAction, AgentTask } from "@/api/job-verification-agent";
import {
  conformityCheckerApiService,
  type ConformityCheckResult,
  type ConformityProposal,
  type ConformityViolation,
  type ConformityJobState,
} from "@/api/conformity-checker";
import {
  useJobVerificationAgent,
  type JobVerificationMessage,
  type ThinkingStep,
} from "@/hooks/useJobVerificationAgent";
import { audioToTextApiService } from "@/api/audio-to-text";
import { AudioRecorderService } from "@/routes/FieldNotes/FieldNoteAudioRecorder";
import {
  dosageJobSocketService,
  type DosageLogEvent,
  type SocketConnectionState,
} from "@/services/dosageJobSocket";

interface ConformityCheckerPanelProps {
  jobGroupId: string;
  selectedJobs: JobWithRelations[];
  onConfirmSuccess?: () => void;
  onClose?: () => void;
}

export interface ConformityCheckerPanelRef {
  handleVerify: () => Promise<void>;
  isVerifyDisabled: boolean;
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

export const ConformityCheckerPanel = forwardRef<ConformityCheckerPanelRef, ConformityCheckerPanelProps>(({
  jobGroupId,
  selectedJobs,
  onConfirmSuccess,
}, ref) => {
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
  const [threadId] = useState(
    () => `job-verification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  const [deepThinking, setDeepThinking] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRecorderRef = useRef<AudioRecorderService | null>(null);
  const {
    messages: agentMessages,
    thinkingSteps,
    currentTasks,
    currentTaskId,
    isLoading: isAgentLoading,
    pendingAction,
    sendMessage: sendAgentMessage,
    approveAction,
    rejectAction,
    cancelRequest,
    messagesEndRef,
  } = useJobVerificationAgent(threadId);
  const selectedJobsCount = selectedJobs.length;
  const thinkingEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll dei thinking steps
  useEffect(() => {
    if (deepThinking && thinkingSteps.length > 0) {
      thinkingEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [thinkingSteps, deepThinking]);

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

    // Aggiorna la fase corrente per eventi info
    if (event.type === "info") {
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

  const transcribeAudioFile = async (file: File) => {
    setIsTranscribing(true);
    try {
      const response = await audioToTextApiService.transcribeAudio({ file });
      const transcription = response.data?.text?.trim();
      if (transcription) {
        setNotes((prev) =>
          prev ? `${prev}\n${transcription}` : transcription
        );
      } else {
        toast.error("Trascrizione non disponibile");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error("Errore durante la trascrizione", {
        description: errorMessage,
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const getRecorder = () => {
    if (!audioRecorderRef.current) {
      audioRecorderRef.current = new AudioRecorderService(
        AudioRecorderService.getSupportedMimeType()
      );
    }
    return audioRecorderRef.current;
  };

  const handleRecordToggle = async () => {
    if (isTranscribing || isAgentLoading) {
      return;
    }

    if (isRecording) {
      try {
        const recorder = getRecorder();
        const audioBlob = await recorder.stop();
        setIsRecording(false);
        const audioFile = AudioRecorderService.buildAudioFile(audioBlob);
        await transcribeAudioFile(audioFile);
      } catch (error) {
        setIsRecording(false);
        const errorMessage =
          error instanceof Error ? error.message : "Errore sconosciuto";
        toast.error("Errore durante la registrazione", {
          description: errorMessage,
        });
      }
      return;
    }

    try {
      const recorder = getRecorder();
      await recorder.start();
      setIsRecording(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error("Microfono non disponibile", {
        description: errorMessage,
      });
    }
  };

  useEffect(() => {
    return () => {
      audioRecorderRef.current?.cancel();
    };
  }, []);

  const handleDialog = async () => {
    const trimmedMessage = notes.trim();
    if (!trimmedMessage) {
      toast.error("Inserisci un messaggio per l'agente");
      return;
    }

    if (selectedJobsCount === 0) {
      toast.error("Seleziona almeno un job per dialogare con l'agente");
      return;
    }

    const contextMessage = `Contesto: ${selectedJobsCount} job selezionati.\n${trimmedMessage}`;
    await sendAgentMessage(contextMessage, selectedJobs, { deepThinking });
    setNotes("");
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

  const handleApprovePendingAction = () => {
    if (!pendingAction) return;

    if (pendingAction.type === "job_modification" && pendingAction.args) {
      const args = pendingAction.args as {
        jobId?: string;
        field?: string;
        newValue?: unknown;
      };

      if (args.jobId && args.field) {
        approveAction({
          jobId: args.jobId,
          field: args.field,
          newValue: args.newValue,
        });
        return;
      }
    }

    approveAction();
  };

  const handleRejectPendingAction = () => {
    if (!pendingAction) return;
    const reason = prompt("Motivo del rifiuto:");
    if (reason) {
      rejectAction(reason);
    }
  };

  const isLoading = state === "loading" || state === "polling";
  const isConfirming = state === "confirming";
  const hasResults = state === "results" && result !== null;
  const isIdle = !hasResults && !isLoading;
  const isInputDisabled = isLoading || isConfirming || isAgentLoading || isTranscribing;
  const isDialogDisabled =
    isInputDisabled ||
    Boolean(pendingAction) ||
    selectedJobsCount === 0 ||
    !notes.trim();
  const isVerifyDisabled =
    isInputDisabled || Boolean(pendingAction) || !jobGroupId;

  useImperativeHandle(ref, () => ({
    handleVerify,
    isVerifyDisabled,
  }));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col">
        {isIdle && (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {agentMessages.length === 0 && !isAgentLoading && <JobVerificationEmptyState />}

              {/* Task Progress - solo con deepThinking */}
              {deepThinking && currentTasks.length > 0 && (
                <TaskProgressPanel tasks={currentTasks} currentTaskId={currentTaskId} />
              )}

              {/* Thinking Panel - solo con deepThinking */}
              {deepThinking && (thinkingSteps.length > 0 || isAgentLoading) && (
                <ThinkingPanel
                  steps={thinkingSteps}
                  isLoading={isAgentLoading}
                  thinkingEndRef={thinkingEndRef}
                />
              )}

              {/* Chat Rapida Loader - quando deepThinking è false */}
              {!deepThinking && isAgentLoading && (
                <QuickChatLoader />
              )}

              {agentMessages.map((message) => (
                <JobVerificationMessageBubble
                  key={message.id}
                  message={message}
                />
              ))}
              {pendingAction && (
                <PendingActionCard
                  pendingAction={pendingAction}
                  isBusy={isAgentLoading}
                  onApprove={handleApprovePendingAction}
                  onReject={handleRejectPendingAction}
                />
              )}
              {isAgentLoading && deepThinking && thinkingSteps.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Spinner className="h-3 w-3" ariaLabel="Agente attivo" />
                  L'agente sta elaborando...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
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
                      <Spinner
                        className="h-3 w-3 mr-1"
                        ariaLabel="Connessione"
                      />
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
                  <ProposalCard
                    key={proposal.jobId || index}
                    proposal={proposal}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isIdle && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 space-y-3">
            {/* Toggle per pensiero profondo vs chat rapida */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="deep-thinking"
                  checked={deepThinking}
                  onCheckedChange={(checked) => setDeepThinking(checked === true)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <Label htmlFor="deep-thinking" className="text-xs text-slate-600 cursor-pointer">
                  Pensiero profondo
                </Label>
                {!deepThinking && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                    Chat rapida
                  </Badge>
                )}
              </div>
              {isAgentLoading && (
                <Button
                  onClick={cancelRequest}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              )}
            </div>

            <Textarea
              placeholder="Inserisci note o domande per la verifica (es. Evitare trattamenti in fioritura.)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isInputDisabled}
              className="min-h-[100px] resize-none text-sm"
            />

            {error && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline" className="text-[10px]">
                  {selectedJobsCount > 0 ? "Contesto selezionato" : "Seleziona operazioni per dialogare"}
                </Badge>
               
                {isTranscribing && (
                  <span className="text-amber-600">Trascrizione in corso...</span>
                )}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRecordToggle}
                  disabled={isInputDisabled || isTranscribing}
                  className="flex-shrink-0"
                >
                  {isTranscribing ? (
                    <>
                      <Spinner
                        className="h-4 w-4 mr-2"
                        ariaLabel="Trascrizione in corso"
                      />
                      Trascrivo...
                    </>
                  ) : isRecording ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Ferma
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Vocale
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDialog}
                  size="sm"
                  disabled={isDialogDisabled}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Invia
                </Button>
              </div>
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
                  <Spinner
                    className="h-4 w-4 mr-2"
                    ariaLabel="Conferma in corso"
                  />
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
});

ConformityCheckerPanel.displayName = "ConformityCheckerPanel";

function JobVerificationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="bg-emerald-50 rounded-full p-3 mb-3">
        <MessageSquare className="h-6 w-6 text-emerald-600" />
      </div>
      <p className="text-sm font-medium text-slate-700">
        Dialoga con l'agente
      </p>
      <p className="text-xs text-slate-500 max-w-xs mt-2">
        Seleziona uno o piu job a sinistra e fai una domanda per la verifica.
      </p>
    </div>
  );
}

function JobVerificationMessageBubble({
  message,
}: {
  message: JobVerificationMessage;
}) {
  const isUser = message.role === "user";
  const content =
    message.content || (isUser ? "" : "Sto elaborando la risposta...");

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-white border border-slate-200 text-slate-800"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div className="min-w-0 max-w-full break-words whitespace-pre-wrap">
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
                  <ul className="list-disc list-inside mb-2 space-y-1 text-slate-800 break-words">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2 space-y-1 text-slate-800 break-words">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-slate-800 break-words">{children}</li>
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
                hr: () => (
                  <hr className="my-3 border-slate-200" />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
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
                  {source.description && (
                    <div className="text-slate-400">{source.description}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingActionCard({
  pendingAction,
  isBusy,
  onApprove,
  onReject,
}: {
  pendingAction: PendingAction;
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
      <p className="font-medium">Azione in attesa di approvazione</p>
      <p className="text-xs text-amber-800">{pendingAction.description}</p>
      {pendingAction.type === "job_modification" && (
        <p className="text-xs text-amber-700">
          Attenzione: questa modifica imposta conformityChecked=false.
        </p>
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
          onClick={onReject}
          disabled={isBusy}
        >
          Rifiuta
        </Button>
      </div>
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

// Thinking Panel Component - Mostra il pensiero dell'agente in tempo reale
function ThinkingPanel({
  steps,
  isLoading,
  thinkingEndRef,
}: {
  steps: ThinkingStep[];
  isLoading: boolean;
  thinkingEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLoading && <span className="animate-pulse">🧠</span>}
          {!isLoading && <Brain className="h-4 w-4 text-slate-500" />}
          <span className="text-xs font-medium text-slate-600">
            Pensiero dell'agente
          </span>
        </div>
        {isLoading && (
          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] animate-pulse">
            In elaborazione...
          </Badge>
        )}
      </div>

      <div className="max-h-48 overflow-y-auto p-2 space-y-1">
        {steps.map((step) => (
          <ThinkingStepItem key={step.id} step={step} />
        ))}

        {isLoading && steps.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-2 px-2">
            <Spinner className="h-3 w-3" ariaLabel="Inizializzazione" />
            Inizializzazione...
          </div>
        )}

        <div ref={thinkingEndRef} />
      </div>
    </div>
  );
}

// Thinking Step Item Component
function ThinkingStepItem({ step }: { step: ThinkingStep }) {
  const getStepIcon = (type: ThinkingStep["type"]) => {
    switch (type) {
      case "thinking":
        return <Brain className="h-3 w-3" />;
      case "tool_start":
        return <Wrench className="h-3 w-3" />;
      case "tool_result":
        return <CheckCircle2 className="h-3 w-3" />;
      case "data_inspection":
        return <Search className="h-3 w-3" />;
      case "task_progress":
        return <ListTodo className="h-3 w-3" />;
      case "reasoning":
        return <Brain className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const getStepStyle = (type: ThinkingStep["type"]) => {
    switch (type) {
      case "thinking":
        return "bg-blue-50 border-l-2 border-blue-300 text-blue-700";
      case "tool_start":
        return "bg-amber-50 border-l-2 border-amber-300 text-amber-700";
      case "tool_result":
        return "bg-emerald-50 border-l-2 border-emerald-300 text-emerald-700";
      case "data_inspection":
        return "bg-purple-50 border-l-2 border-purple-300 text-purple-700";
      case "task_progress":
        return "bg-slate-100 border-l-2 border-slate-300 text-slate-700";
      case "reasoning":
        return "bg-indigo-50 border-l-2 border-indigo-300 text-indigo-700";
      default:
        return "bg-slate-50 border-l-2 border-slate-300 text-slate-700";
    }
  };

  const timeStr = step.timestamp.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded-r text-xs",
        getStepStyle(step.type)
      )}
    >
      <span className="flex-shrink-0 mt-0.5">{getStepIcon(step.type)}</span>
      <div className="flex-1 min-w-0">
        <p className="break-words">{step.message}</p>
        {step.toolName && (
          <code className="text-[10px] bg-white/50 px-1 py-0.5 rounded mt-1 inline-block">
            {step.toolName}
          </code>
        )}
      </div>
      <span className="text-[10px] opacity-60 flex-shrink-0">{timeStr}</span>
    </div>
  );
}

// Task Progress Panel Component - Mostra il piano di lavoro dell'agente
function TaskProgressPanel({
  tasks,
  currentTaskId,
}: {
  tasks: AgentTask[];
  currentTaskId: string | null;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-3">
        <ListTodo className="h-4 w-4 text-slate-500" />
        <span className="text-xs font-semibold text-slate-600">
          Piano di lavoro
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              task.id === currentTaskId && "bg-blue-50 border border-blue-200"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0",
                task.status === "completed" && "bg-emerald-500 text-white",
                task.status === "in_progress" &&
                  "bg-blue-500 text-white animate-pulse",
                task.status === "pending" && "bg-slate-200 text-slate-600"
              )}
            >
              {task.status === "completed" ? (
                <Check className="h-3 w-3" />
              ) : task.status === "in_progress" ? (
                <Spinner className="h-3 w-3" ariaLabel="In corso" />
              ) : (
                index + 1
              )}
            </div>

            <span
              className={cn(
                "text-xs flex-1",
                task.status === "completed" &&
                  "text-slate-500 line-through",
                task.status === "in_progress" &&
                  "text-blue-700 font-medium",
                task.status === "pending" && "text-slate-700"
              )}
            >
              {task.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick Chat Loader - Loader semplice per la modalità chat rapida
function QuickChatLoader() {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Chat rapida</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generazione risposta in corso...
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConformityCheckerPanel;
