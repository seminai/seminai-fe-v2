import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Mic, Send, Upload } from "lucide-react";
import { useFieldNoteChat } from "@/hooks/useFieldNoteChat";
import {
  ApprovalDialog,
  AttachmentPreview,
  ChatMessageBubble,
  EmptyState,
} from "./FieldNoteChatPanel.parts";
import { audioToTextApiService } from "@/api/audio-to-text";
import { toast } from "sonner";

interface FieldNoteChatPanelProps {
  onFieldNoteSaved?: () => void;
  onSocketStateChange?: (state: string) => void;
}

export function FieldNoteChatPanel({
  onFieldNoteSaved: _onFieldNoteSaved,
  onSocketStateChange,
}: FieldNoteChatPanelProps) {
  const [threadId] = useState(
    () => `thread-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  const {
    messages,
    socketState,
    isProcessing,
    pendingApproval,
    sendMessage,
    approve,
    reject,
    messagesEndRef,
  } = useFieldNoteChat(threadId, {
    onFieldNoteSaved: _onFieldNoteSaved,
  });

  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

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
    const fileToSend = selectedFile;
    setInput("");
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await sendMessage(messageText, {
      file: fileToSend || undefined,
      mode: socketState === "connected" ? "stream" : "message",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleAudioPick = () => {
    audioInputRef.current?.click();
  };

  const handleAudioChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || isTranscribing) {
      return;
    }

    setIsTranscribing(true);
    try {
      const response = await audioToTextApiService.transcribeAudio({ file });
      const transcription = response.data?.text?.trim();
      if (transcription) {
        setInput((prev) =>
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
      if (audioInputRef.current) {
        audioInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && <EmptyState />}

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
          {selectedFile && (
            <AttachmentPreview
              file={selectedFile}
              onRemove={handleRemoveFile}
            />
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {isProcessing ? "Elaborazione in corso..." : ""}
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={audioInputRef}
                type="file"
                className="hidden"
                accept="audio/*"
                onChange={handleAudioChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFilePick}
                disabled={isProcessing || isTranscribing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Allega
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAudioPick}
                disabled={isProcessing || isTranscribing}
              >
                {isTranscribing ? (
                  <>
                    <Spinner
                      className="h-4 w-4 mr-2"
                      ariaLabel="Trascrizione in corso"
                    />
                    Trascrivo...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Vocale
                  </>
                )}
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isProcessing || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                {isProcessing ? (
                  <>
                    <Spinner
                      className="h-4 w-4 mr-2"
                      ariaLabel="Invio in corso"
                    />
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
    </div>
  );
}
export default FieldNoteChatPanel;
