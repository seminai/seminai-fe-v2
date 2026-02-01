import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import {
  History,
  MessageSquare,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChats, useDeleteChat } from "@/hooks/useChats";
import type { ChatSummary } from "@/api/chats";

interface ChatHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback quando viene selezionata una chat - passa il chatId */
  onSelectChat?: (chatId: string) => void;
}

/**
 * Formatta la data in modo relativo (es. "2 ore fa", "ieri", ecc.)
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Adesso";
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;

  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Estrae un titolo dalla chat basandosi sul primo messaggio dell'utente
 */
function getChatTitle(chat: ChatSummary): string {
  if (chat.lastMessage?.content) {
    const content = chat.lastMessage.content;
    // Prende le prime parole (massimo 50 caratteri)
    if (content.length <= 50) return content;
    return content.substring(0, 47) + "...";
  }
  return "Conversazione senza titolo";
}

/**
 * Componente per visualizzare un singolo elemento della lista chat
 */
function ChatListItem({
  chat,
  isSelected,
  onClick,
  onDelete,
}: {
  chat: ChatSummary;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-emerald-50 border border-emerald-200"
          : "hover:bg-slate-50 border border-transparent"
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0 mt-0.5">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isSelected ? "bg-emerald-100" : "bg-slate-100"
          )}
        >
          <MessageSquare
            className={cn(
              "h-4 w-4",
              isSelected ? "text-emerald-600" : "text-slate-500"
            )}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              isSelected ? "text-emerald-900" : "text-slate-800"
            )}
          >
            {getChatTitle(chat)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500">
            {formatRelativeDate(chat.updatedAt)}
          </span>
          {chat.lastMessage?.role === "ASSISTANT" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Risposta AI
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Drawer per visualizzare lo storico delle chat
 */
export function ChatHistoryDrawer({
  open,
  onOpenChange,
  onSelectChat,
}: ChatHistoryDrawerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [chatToDelete, setChatToDelete] = useState<ChatSummary | null>(null);

  const { chats, isLoading } = useChats("JOB_VERIFICATION_AGENT");
  const { deleteChat, isDeleting } = useDeleteChat();

  // Filtra le chat in base al termine di ricerca
  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) return chats;
    const term = searchTerm.toLowerCase();
    return chats.filter((chat) => {
      const title = getChatTitle(chat).toLowerCase();
      return title.includes(term);
    });
  }, [chats, searchTerm]);

  const handleSelectChat = (chat: ChatSummary) => {
    // Chiama il callback con il chatId e chiudi il drawer
    onSelectChat?.(chat.id);
    onOpenChange(false);
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      await deleteChat(chatToDelete.id);
      toast.success("Chat eliminata");
    } catch {
      toast.error("Errore durante l'eliminazione");
    } finally {
      setChatToDelete(null);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state quando si chiude il drawer
      setSearchTerm("");
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-white flex flex-col h-full p-0"
        >
          <SheetHeader className="flex-shrink-0 p-4 border-b border-slate-200">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-slate-600" />
              Storico Chat
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-500">
              Seleziona una conversazione per continuarla
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Barra di ricerca */}
            <div className="flex-shrink-0 p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cerca nelle conversazioni..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* Lista delle chat con scroll */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner
                      className="h-6 w-6 text-slate-400"
                      ariaLabel="Caricamento"
                    />
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchTerm
                        ? "Nessuna conversazione trovata"
                        : "Nessuna conversazione precedente"}
                    </p>
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      isSelected={false}
                      onClick={() => handleSelectChat(chat)}
                      onDelete={() => setChatToDelete(chat)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Footer con info */}
            {chats.length > 0 && (
              <div className="flex-shrink-0 p-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-500 text-center">
                  {chats.length} conversazion
                  {chats.length === 1 ? "e" : "i"} salvat
                  {chats.length === 1 ? "a" : "e"}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog di conferma eliminazione */}
      <AlertDialog
        open={!!chatToDelete}
        onOpenChange={(open) => !open && setChatToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina conversazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa conversazione? L'azione non
              può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Spinner
                    className="h-4 w-4 mr-2"
                    ariaLabel="Eliminazione in corso"
                  />
                  Elimino...
                </>
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ChatHistoryDrawer;
