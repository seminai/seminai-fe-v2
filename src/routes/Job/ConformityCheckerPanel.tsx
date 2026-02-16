import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
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
  StopCircle,
  Mic,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobWithRelations } from "@/api/jobs";
import type { PendingAction } from "@/api/job-verification-agent";
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
} from "@/hooks/useJobVerificationAgent";
import { audioToTextApiService } from "@/api/audio-to-text";
import { AudioRecorderService } from "@/routes/FieldNotes/FieldNoteAudioRecorder";
import {
  dosageJobSocketService,
  type DosageLogEvent,
  type SocketConnectionState,
} from "@/services/dosageJobSocket";
import { JobDeepThinkingBars } from "./JobDeepThinkingBars";
import { chatsApiService } from "@/api/chats";

/** Snapshot dello stato di verifica, per mostrarlo anche nella vista Dettagli */
export interface VerificationStateSnapshot {
  state: "idle" | "loading" | "polling" | "results" | "confirming";
  progress: number;
  currentPhase: string;
  socketState: SocketConnectionState;
  result: ConformityCheckResult | null;
  error: string | null;
  recentLogs: Array<{ type: string; message: string; timestamp: Date }>;
}

interface ConformityCheckerPanelProps {
  jobGroupId: string;
  selectedJobs: JobWithRelations[];
  onConfirmSuccess?: () => void;
  onClose?: () => void;
  /** Thread ID per caricare una chat esistente */
  externalThreadId?: string;
  /** Callback quando il threadId cambia (per sincronizzazione) */
  onThreadIdChange?: (threadId: string) => void;
  /** Callback per esporre lo stato di verifica (es. per mostrarlo nella vista Dettagli) */
  onVerificationStateChange?: (snapshot: VerificationStateSnapshot) => void;
}

export interface ConformityCheckerPanelRef {
  handleVerify: () => Promise<void>;
  isVerifyDisabled: boolean;
  /** Carica i messaggi di una chat esistente */
  loadChat: (chatId: string) => Promise<void>;
  /** Resetta la chat ad una nuova conversazione */
  resetChat: () => void;
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

export const ConformityCheckerPanel = forwardRef<
  ConformityCheckerPanelRef,
  ConformityCheckerPanelProps
>(({ jobGroupId, selectedJobs, onConfirmSuccess, externalThreadId, onThreadIdChange, onVerificationStateChange }, ref) => {
  const [notes, setNotes] = useState<string>("");
  const [state, setState] = useState<PanelState>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const [result, setResult] = useState<ConformityCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<LiveLogEntry[]>([]);
  const [socketState, setSocketState] =
    useState<SocketConnectionState>("disconnected");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef<number>(0);

  // Genera un nuovo threadId
  const generateThreadId = useCallback(() =>
    `job-verification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  []);

  // ThreadId controllabile dall'esterno o generato internamente
  const [internalThreadId, setInternalThreadId] = useState(generateThreadId);
  const threadId = externalThreadId || internalThreadId;

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
    loadMessages,
    clearMessages,
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

  // Esponi lo stato di verifica al parent (per vista Dettagli)
  useEffect(() => {
    onVerificationStateChange?.({
      state,
      progress,
      currentPhase,
      socketState,
      result,
      error,
      recentLogs: liveLogs.slice(-5).map((log) => ({
        type: log.type,
        message: log.message,
        timestamp: log.timestamp,
      })),
    });
  }, [
    state,
    progress,
    currentPhase,
    socketState,
    result,
    error,
    liveLogs,
    onVerificationStateChange,
  ]);

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

  const connectToSocket = useCallback(
    (jobId: string) => {
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
    },
    [addLog],
  );

  const handleProgressUpdate = useCallback(
    (progressValue: number, jobState: ConformityJobState) => {
      setProgress(progressValue);
      if (jobState === "active" || jobState === "waiting") {
        setState("polling");
      }
    },
    [],
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
        notes,
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
        },
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
          prev ? `${prev}\n${transcription}` : transcription,
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
        AudioRecorderService.getSupportedMimeType(),
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
        result.proposals,
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
  const isInputDisabled =
    isLoading || isConfirming || isAgentLoading || isTranscribing;
  const isDialogDisabled =
    isInputDisabled ||
    Boolean(pendingAction) ||
    selectedJobsCount === 0 ||
    !notes.trim();
  const isVerifyDisabled =
    isInputDisabled || Boolean(pendingAction) || !jobGroupId;

  // Carica una chat esistente dal suo ID
  const loadChat = useCallback(async (chatId: string) => {
    try {
      const chatDetail = await chatsApiService.getChatDetail(chatId);
      // Imposta il threadId dalla chat caricata
      setInternalThreadId(chatDetail.threadId);
      onThreadIdChange?.(chatDetail.threadId);
      // Carica i messaggi
      loadMessages(chatDetail.messages);
    } catch (error) {
      console.error("Error loading chat:", error);
      toast.error("Errore nel caricamento della chat");
    }
  }, [loadMessages, onThreadIdChange]);

  // Resetta la chat ad una nuova conversazione
  const resetChat = useCallback(() => {
    const newThreadId = generateThreadId();
    setInternalThreadId(newThreadId);
    onThreadIdChange?.(newThreadId);
    clearMessages();
  }, [generateThreadId, clearMessages, onThreadIdChange]);

  useImperativeHandle(ref, () => ({
    handleVerify,
    isVerifyDisabled,
    loadChat,
    resetChat,
  }));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col">
        {isIdle && (
          <div className="flex flex-col h-full min-h-0">
            {/* Sticky Deep Thinking Bars - solo con deepThinking */}
            {deepThinking && (
              <JobDeepThinkingBars
                thinkingSteps={thinkingSteps}
                tasks={currentTasks}
                currentTaskId={currentTaskId}
                isLoading={isAgentLoading}
              />
            )}

            <ScrollArea className="flex-1 min-h-0 min-w-0">
              <div className="p-4 space-y-4 min-w-0 w-full max-w-full">
                {agentMessages.length === 0 && !isAgentLoading && (
                  <JobVerificationEmptyState />
                )}

                {/* Chat Rapida Loader - quando deepThinking è false */}
                {!deepThinking && isAgentLoading && <QuickChatLoader />}

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
                {isAgentLoading && !deepThinking && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Spinner className="h-3 w-3" ariaLabel="Agente attivo" />
                    L'agente sta elaborando...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Live Status Section - Durante la verifica (stesso stile del box in Dettagli) */}
        {isLoading && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 p-4 space-y-3">
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
                  <span className="text-slate-700 font-medium">
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Ultimi aggiornamenti (stile leggibile, non terminale) */}
              {liveLogs.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    Ultimi aggiornamenti
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 max-h-32 overflow-y-auto">
                    {liveLogs.slice(-8).map((log) => (
                      <li key={log.id}>
                        <LiveLogItem log={log} />
                      </li>
                    ))}
                  </ul>
                  <div ref={logsEndRef} />
                </div>
              )}
              {liveLogs.length === 0 && (
                <p className="text-xs text-slate-500 italic">
                  In attesa di aggiornamenti dal server...
                </p>
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
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <Checkbox
                  id="deep-thinking"
                  checked={deepThinking}
                  onCheckedChange={(checked) =>
                    setDeepThinking(checked === true)
                  }
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 shrink-0"
                />
                <Label
                  htmlFor="deep-thinking"
                  className="text-xs text-slate-600 cursor-pointer truncate min-w-0"
                >
                  Pensiero profondo
                </Label>
                {!deepThinking && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-amber-600 border-amber-300 shrink-0"
                  >
                    Chat rapida
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                  {selectedJobsCount > 0
                    ? `${selectedJobsCount} operazioni selezionate`
                    : "Seleziona operazioni per dialogare"}
                </Badge>
                {isAgentLoading && (
                  <Button
                    onClick={cancelRequest}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                  >
                    <StopCircle className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                )}
              </div>
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

            <div className="flex flex-col gap-2 w-full min-w-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-slate-500">
                {isTranscribing && (
                  <span className="shrink-0 text-amber-600">
                    Trascrizione in corso...
                  </span>
                )}
              </div>
              <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRecordToggle}
                  disabled={isInputDisabled || isTranscribing}
                  className="min-w-0 flex-1 basis-0 sm:flex-initial"
                >
                  {isTranscribing ? (
                    <>
                      <Spinner
                        className="h-4 w-4 mr-2 shrink-0"
                        ariaLabel="Trascrizione in corso"
                      />
                      <span className="truncate">Trascrivo...</span>
                    </>
                  ) : isRecording ? (
                    <>
                      <Square className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate">Ferma</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate">Vocale</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDialog}
                  size="sm"
                  disabled={isDialogDisabled}
                  className="min-w-0 flex-1 basis-0 bg-emerald-600 hover:bg-emerald-700 text-white sm:flex-initial"
                >
                  <Send className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Invia</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Fixed at bottom */}
      {hasResults && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 min-w-0 w-full sm:w-auto"
              disabled={isConfirming}
            >
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 min-w-0 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
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
      <p className="text-sm font-medium text-slate-700">Dialoga con l'agente</p>
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

/** Box compatto per mostrare lo stato live della verifica nella vista Dettagli */
export function VerificationStatusBox({
  snapshot,
  onOpenChat,
}: {
  snapshot: VerificationStateSnapshot;
  onOpenChat?: () => void;
}) {
  const isLoading = snapshot.state === "loading" || snapshot.state === "polling";

  if (snapshot.state === "idle" && !snapshot.result && !snapshot.error) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      {isLoading && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Spinner className="h-4 w-4 text-emerald-600" ariaLabel="Verifica in corso" />
              <span className="text-sm font-medium text-slate-700">
                Verifica in corso...
              </span>
            </div>
            {snapshot.socketState === "connected" ? (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </Badge>
            ) : snapshot.socketState === "connecting" ? (
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
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 truncate max-w-[200px]">
                {snapshot.currentPhase || "Inizializzazione..."}
              </span>
              <span className="text-slate-700 font-medium">{snapshot.progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${snapshot.progress}%` }}
              />
            </div>
          </div>
          {snapshot.recentLogs.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Ultimi aggiornamenti</p>
              <ul className="space-y-0.5 text-xs text-slate-600">
                {snapshot.recentLogs.slice(-3).map((log, i) => (
                  <li key={i} className="flex items-center gap-2 truncate">
                    <span className="text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="truncate">{log.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {snapshot.result && !isLoading && (
        <>
          <ConformitySummaryCard summary={snapshot.result.summary} />
          {onOpenChat && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenChat}
              className="w-full text-xs"
            >
              <MessageSquare className="h-3 w-3 mr-2" />
              Vedi dettagli in Chat
            </Button>
          )}
        </>
      )}

      {snapshot.error && !isLoading && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{snapshot.error}</span>
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
        proposal.shouldExclude && "bg-amber-50 border-amber-200",
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
        config.border,
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
      <span
        className={cn("flex-shrink-0 flex items-center gap-1", config.color)}
      >
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
            <span className="text-sm font-medium text-slate-700">
              Chat rapida
            </span>
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
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
