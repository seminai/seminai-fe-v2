import {
  Send,
  StopCircle,
  Mic,
  Square,
  Paperclip,
  Quote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChatInputAreaProps {
  readonly input: string;
  readonly setInput: (v: string) => void;
  readonly isStreaming: boolean;
  readonly isRecording: boolean;
  readonly isTranscribing: boolean;
  readonly isDragOver: boolean;
  readonly setIsDragOver: (v: boolean) => void;
  readonly contextChips: ReadonlyArray<{ id: string; text: string; preview: string }>;
  readonly attachedFiles: readonly File[];
  readonly setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly folderInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onSend: () => void;
  readonly onCancel: () => void;
  readonly onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onDrop: (e: React.DragEvent) => void;
  readonly onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly onRecordToggle: () => void;
  readonly removeContextChip: (id: string) => void;
}

export function ChatInputArea({
  input, setInput, isStreaming, isRecording, isTranscribing, isDragOver,
  setIsDragOver, contextChips, attachedFiles, setAttachedFiles,
  fileInputRef, folderInputRef, onSend, onCancel, onFileSelect, onDrop,
  onKeyDown, onRecordToggle, removeContextChip,
}: ChatInputAreaProps) {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-white">
      <input ref={fileInputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls,.json,.txt,.pdf,.zip,.shp,.dbf,.shx,.prj,.cpg" multiple onChange={onFileSelect} />
      <input ref={folderInputRef} type="file" className="hidden" {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={onFileSelect} />
      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {(contextChips.length > 0 || attachedFiles.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {contextChips.map((chip) => (
              <Tooltip key={chip.id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-md px-2 py-1 max-w-[250px]">
                    <Quote className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-600 truncate">{chip.preview}</span>
                    <button type="button" onClick={() => removeContextChip(chip.id)} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm max-h-[200px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-xs">{chip.text}</pre>
                </TooltipContent>
              </Tooltip>
            ))}
            {attachedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 max-w-[250px]">
                <Paperclip className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="text-xs text-emerald-700 truncate">{file.name}</span>
                <button type="button" onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))} className="shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          className={cn("relative rounded-md transition-colors", isDragOver && "ring-2 ring-emerald-400 bg-emerald-50/50")}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget.contains(e.relatedTarget as Node)) return; setIsDragOver(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(e); }}
        >
          <Textarea
            placeholder={isDragOver ? "Rilascia i file qui..." : "Chiedi all'agronomo AI..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isStreaming}
            className="min-h-[80px] resize-none text-sm"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isStreaming}
                className={cn(attachedFiles.length > 0 && "border-emerald-300 bg-emerald-50 text-emerald-600")}>
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Allega file</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="sm" onClick={() => folderInputRef.current?.click()} disabled={isStreaming}>
                <span className="text-xs">Cartella</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Carica cartella (es. shapefile)</TooltipContent>
          </Tooltip>
          <Button type="button" variant="outline" size="sm" onClick={onRecordToggle} disabled={isStreaming || isTranscribing}
            className={cn(isRecording && "border-red-300 bg-red-50 text-red-600 hover:bg-red-100")}>
            {isTranscribing ? (
              <><Spinner className="h-4 w-4 mr-2" ariaLabel="Trascrizione in corso" />Trascrivo...</>
            ) : isRecording ? (
              <><Square className="h-4 w-4 mr-2" />Ferma</>
            ) : (
              <><Mic className="h-4 w-4 mr-2" />Vocale</>
            )}
          </Button>
          {isStreaming ? (
            <Button onClick={onCancel} size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <StopCircle className="h-4 w-4 mr-2" />Stop
            </Button>
          ) : (
            <Button onClick={onSend} size="sm" disabled={!input.trim() || isStreaming} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Send className="h-4 w-4 mr-2" />Invia
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
