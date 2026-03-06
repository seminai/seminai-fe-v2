import { useState } from "react";
import {
  MessageCircle,
  Plus,
  Trash2,
  PanelLeftClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
import { useChats, useDeleteChat } from "@/hooks/useChats";
import type { ChatSummary } from "@/api/chats";

export function ChatHistorySidebar({
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
      <div
        className={cn(
          "flex shrink-0 flex-col bg-slate-50/50 h-full overflow-hidden",
          isMobile ? "w-full" : "w-[280px] border-r border-slate-200",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
          <span className="text-sm font-semibold text-slate-700">Cronologia</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="p-2 space-y-1">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-4 w-4" ariaLabel="Caricamento chat..." />
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
                onDelete={() => setDeletingChatId(chat.id)}
                isDeleting={isDeleting && deletingChatId === chat.id}
              />
            ))}
          </div>
        </div>
      </div>

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
        <p className="text-xs text-slate-700 truncate leading-relaxed">{preview}</p>
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
