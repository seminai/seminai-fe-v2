import { useState, useRef, useEffect, useCallback } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { PanelLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useMe } from "@/hooks/useAuth";
import { UserRole } from "@/api/auth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { chatsApiService } from "@/api/chats";
import type { ChatSummary } from "@/api/chats";
import { useDosageAgentChat } from "@/hooks/useDosageAgentChat";
import { useAgentChatSocket } from "@/hooks/useAgentChatSocket";
import { useIsMobile } from "@/hooks/use-mobile";
import { AudioRecorderService } from "@/routes/FieldNotes/FieldNoteAudioRecorder";
import { audioToTextApiService } from "@/api/audio-to-text";
import {
  MessageBubble,
  StreamingIndicator,
  TreatmentPlanCard,
  PendingActionCard,
  QuestionnaireCard,
  ChatHistorySidebar,
  EmptyState,
  SelectionFloatingButton,
  AgentActivityPanel,
  ChatInputArea,
} from "./components";

export default function DosageAgentChat() {
  const { data: meData, isLoading: meLoading } = useMe();
  const { currentWorkspace } = useWorkspaceContext();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [threadId, setThreadId] = useState<string>(
    () => searchParams.get("threadId") || crypto.randomUUID(),
  );
  const modelName = "gpt-4o-mini";
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [input, setInput] = useState("");
  const [contextChips, setContextChips] = useState<
    Array<{ id: string; text: string; preview: string }>
  >([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRecorderRef = useRef<AudioRecorderService | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    messages, isLoading: isStreaming, streamingStatus, pendingApproval,
    activeTool, toolCount, currentPlan, activeQuestionnaire,
    sendMessage, approveAction, rejectAction, cancelRequest,
    submitQuestionnaire, loadMessages, clearMessages, messagesEndRef,
  } = useDosageAgentChat(threadId, { modelName, workspaceId: currentWorkspace?.id });

  const socketState = useAgentChatSocket(threadId, isStreaming);

  const updateThreadId = useCallback(
    (newThreadId: string) => {
      setThreadId(newThreadId);
      setSearchParams({ threadId: newThreadId }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!searchParams.get("threadId")) {
      setSearchParams({ threadId }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addContextChip = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setContextChips((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: trimmed, preview: trimmed.length > 60 ? trimmed.slice(0, 57) + "..." : trimmed },
    ]);
  }, []);

  const removeContextChip = useCallback((id: string) => {
    setContextChips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    let messageToSend = trimmed;
    if (contextChips.length > 0) {
      const contextBlock = contextChips.map((c) => `> ${c.text.replace(/\n/g, "\n> ")}`).join("\n\n");
      messageToSend = `${contextBlock}\n\n${trimmed}`;
    }
    sendMessage(messageToSend, attachedFiles.length > 0 ? attachedFiles : undefined);
    setInput("");
    setContextChips([]);
    setAttachedFiles([]);
  };

  const MAX_TOTAL_SIZE = 30 * 1024 * 1024;

  const addFiles = useCallback((newFiles: File[]) => {
    setAttachedFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_SIZE) {
        toast.error("File troppo grandi", { description: "La dimensione totale massima consentita e 30 MB" });
        return prev;
      }
      return combined;
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    addFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addFiles(files);
  }, [addFiles]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleNewChat = () => {
    updateThreadId(crypto.randomUUID());
    clearMessages();
    socketState.clearActivity();
    setInput("");
    setContextChips([]);
    setAttachedFiles([]);
  };

  const handleLoadChat = async (chat: ChatSummary) => {
    try {
      const detail = await chatsApiService.getChatDetail(chat.id);
      updateThreadId(detail.threadId);
      loadMessages(detail.messages);
      socketState.clearActivity();
      if (isMobile) setSidebarOpen(false);
    } catch {
      toast.error("Errore nel caricamento della chat");
    }
  };

  const getRecorder = useCallback(() => {
    if (!audioRecorderRef.current) {
      audioRecorderRef.current = new AudioRecorderService(AudioRecorderService.getSupportedMimeType());
    }
    return audioRecorderRef.current;
  }, []);

  const transcribeAudioFile = useCallback(async (file: File) => {
    setIsTranscribing(true);
    try {
      const response = await audioToTextApiService.transcribeAudio({ file });
      const transcription = response.data?.text?.trim();
      if (transcription) setInput((prev) => (prev ? `${prev}\n${transcription}` : transcription));
      else toast.error("Trascrizione non disponibile");
    } catch (error) {
      toast.error("Errore durante la trascrizione", { description: error instanceof Error ? error.message : "Errore sconosciuto" });
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const handleRecordToggle = useCallback(async () => {
    if (isTranscribing || isStreaming) return;
    if (isRecording) {
      try {
        const audioBlob = await getRecorder().stop();
        setIsRecording(false);
        await transcribeAudioFile(AudioRecorderService.buildAudioFile(audioBlob));
      } catch (error) {
        setIsRecording(false);
        toast.error("Errore durante la registrazione", { description: error instanceof Error ? error.message : "Errore sconosciuto" });
      }
      return;
    }
    try { await getRecorder().start(); setIsRecording(true); }
    catch (error) { toast.error("Microfono non disponibile", { description: error instanceof Error ? error.message : "Errore sconosciuto" }); }
  }, [isTranscribing, isStreaming, isRecording, getRecorder, transcribeAudioFile]);

  useEffect(() => { return () => { audioRecorderRef.current?.cancel(); }; }, []);

  if (meLoading) return null;
  if (!meData || meData.role !== UserRole.ADMIN) return <Navigate to="/dashboard" replace />;

  const sidebarContent = (
    <ChatHistorySidebar onSelectChat={handleLoadChat} onNewChat={handleNewChat} onClose={() => setSidebarOpen(false)} activeThreadId={threadId} isMobile={isMobile} />
  );

  return (
    <TooltipProvider>
      <div className="flex h-full w-full overflow-hidden">
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent
              side="left"
              className="w-[280px] p-0 gap-0 [&>button]:hidden"
            >
              <SheetTitle className="sr-only">Cronologia chat</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        ) : (
          sidebarOpen && sidebarContent
        )}

        <div className="flex flex-1 flex-col min-w-0 h-full">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 shrink-0">
            {!sidebarOpen && (
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="shrink-0">
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-sm font-semibold text-slate-800 truncate">Agente Seminai</h1>
            </div>
            {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={activityPanelOpen ? "secondary" : "ghost"} size="sm" onClick={() => setActivityPanelOpen((v) => !v)} className="shrink-0">
                    <Activity className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Attivita agente live</TooltipContent>
              </Tooltip>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div ref={messagesContainerRef} className="w-full min-w-0 p-4 space-y-4 max-w-3xl mx-auto relative">
              {messages.length === 0 && !isStreaming && <EmptyState onSuggestionClick={(t) => sendMessage(t)} />}
              {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
              {currentPlan && currentPlan.steps.length > 0 && <TreatmentPlanCard plan={currentPlan} />}
              {activeQuestionnaire && <QuestionnaireCard questionnaire={activeQuestionnaire} onSubmit={submitQuestionnaire} disabled={isStreaming} />}
              {pendingApproval && <PendingActionCard pendingApproval={pendingApproval} isBusy={isStreaming} onApprove={approveAction} onReject={rejectAction} />}
              {isStreaming && <StreamingIndicator streamingStatus={streamingStatus} activeTool={activeTool} toolCount={toolCount} />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <SelectionFloatingButton containerRef={messagesContainerRef} onAddContext={addContextChip} />

          <ChatInputArea
            input={input} setInput={setInput} isStreaming={isStreaming} isRecording={isRecording}
            isTranscribing={isTranscribing} isDragOver={isDragOver} setIsDragOver={setIsDragOver}
            contextChips={contextChips} attachedFiles={attachedFiles} setAttachedFiles={setAttachedFiles}
            fileInputRef={fileInputRef} folderInputRef={folderInputRef}
            onSend={handleSend} onCancel={cancelRequest} onFileSelect={handleFileSelect}
            onDrop={handleDrop} onKeyDown={handleKeyDown} onRecordToggle={handleRecordToggle}
            removeContextChip={removeContextChip}
          />
        </div>

        {!isMobile && activityPanelOpen && (
          <AgentActivityPanel
            connectionState={socketState.connectionState} activityLog={socketState.activityLog}
            taskList={socketState.taskList} memoryKeys={socketState.memoryKeys}
            subagentProgress={socketState.subagentProgress}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
