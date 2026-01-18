import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { PanelRightClose, PanelRightOpen, GripVertical, MessageSquare, Table, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react";
import FieldNoteChatPanel from "./FieldNoteChatPanel";

type EditableTableRowData = Record<string, unknown>;

interface EditablePayload {
  created: Array<Record<string, unknown>>;
  updated: Array<Record<string, unknown>>;
}

interface FieldNotesViewProps {
  error: unknown;
  isLoading: boolean;
  fieldNotesLength: number;
  columns: EditableColumn[];
  rows: EditableTableRowData[];
  onSave: (payload: EditablePayload) => Promise<void>;
  onDeleteSelected: (removed: Array<Record<string, unknown>>) => Promise<void>;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: (open: boolean) => void;
  rightSidebarWidth: number;
  onResizeStart: (e: React.MouseEvent) => void;
  isResizing: boolean;
  showAddButton?: boolean;
  onAddClick?: () => void;
  newRowDefaults?: Partial<Record<string, unknown>>;
  onFieldNoteSaved?: () => void;
  onOpenDetails?: (rowData: Record<string, unknown>) => void;
  onBulkVerifySelected?: (selectedRows: Array<Record<string, unknown>>) => void;
  isBulkVerifying?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection Status Badge Component
// ─────────────────────────────────────────────────────────────────────────────

function ConnectionStatusBadge({ state }: { state: string }) {
  const config = (() => {
    switch (state) {
      case "connected":
        return {
          icon: Wifi,
          label: "Live",
          className: "bg-emerald-100 text-emerald-700",
        };
      case "connecting":
        return {
          icon: Loader2,
          label: "Connessione...",
          className: "bg-amber-100 text-amber-700",
          isSpinner: true,
        };
      case "error":
        return {
          icon: AlertCircle,
          label: "Errore",
          className: "bg-red-100 text-red-700",
        };
      default:
        return {
          icon: WifiOff,
          label: "Offline",
          className: "bg-slate-100 text-slate-500",
        };
    }
  })();

  const Icon = config.icon;

  return (
    <Badge className={cn("text-xs font-normal", config.className)}>
      {config.isSpinner ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <Icon className="h-3 w-3 mr-1" />
      )}
      {config.label}
    </Badge>
  );
}

export function FieldNotesView({
  error,
  isLoading,
  fieldNotesLength,
  columns,
  rows,
  onSave,
  onDeleteSelected,
  isRightSidebarOpen,
  onToggleRightSidebar,
  rightSidebarWidth,
  onResizeStart,
  isResizing,
  showAddButton = true,
  onAddClick,
  newRowDefaults,
  onFieldNoteSaved,
  onOpenDetails,
  onBulkVerifySelected,
  isBulkVerifying = false,
}: FieldNotesViewProps) {
  const hasError = Boolean(error);
  const errorMessage =
    error instanceof Error ? error.message : "Errore sconosciuto";

  // State per gestire la vista mobile (chat o tabella)
  const [mobileView, setMobileView] = useState<"chat" | "table">("chat");
  
  // State per lo stato del socket della chat
  const [socketState, setSocketState] = useState<string>("disconnected");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile Toggle Tabs - Visibile solo su mobile */}
      <div className="md:hidden flex-shrink-0 border-b border-slate-200 bg-white">
        <div className="flex">
          <button
            onClick={() => setMobileView("chat")}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              mobileView === "chat"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Chat AI
          </button>
          <button
            onClick={() => setMobileView("table")}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              mobileView === "table"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Table className="h-4 w-4" />
            Note ({fieldNotesLength})
          </button>
        </div>
      </div>

      {/* Mobile Chat View */}
      <div className={cn(
        "flex-1 overflow-hidden md:hidden",
        mobileView === "chat" ? "block" : "hidden"
      )}>
        <FieldNoteChatPanel 
          onFieldNoteSaved={onFieldNoteSaved}
          onSocketStateChange={setSocketState}
        />
      </div>

      {/* Mobile Table View */}
      <div className={cn(
        "flex-1 overflow-hidden md:hidden px-4 pb-4",
        mobileView === "table" ? "block" : "hidden"
      )}>
        <div className="h-full flex flex-col">
          {hasError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
              <p className="font-semibold">Errore nel caricamento dei dati</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          {fieldNotesLength === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 h-full">
              <div className="flex flex-col items-center justify-center max-w-md text-center">
                <div className="flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 mb-6">
                  <Bot className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Parla con Seminai
                </h3>
                <p className="text-sm text-neutral-600 mb-6">
                  Inizia una conversazione con l'assistente AI per aggiungere le tue prime note di campo.
                  Puoi descrivere le operazioni svolte e Seminai le convertirà automaticamente in note strutturate.
                </p>
                <Button
                  onClick={() => setMobileView("chat")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Apri Chat AI
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col relative">
              <div className="flex-1 min-h-0">
                <EditableTable
                  addButton={showAddButton}
                  createMode="drawer"
                  onAddClick={onAddClick}
                  newRowDefaults={newRowDefaults}
                  columns={columns}
                  rows={rows}
                  isModify={false}
                  onSave={onSave}
                  onDeleteSelected={onDeleteSelected}
                  getRowId={(row) => row.id as string}
                  exportFileName="note-di-campo"
                  onOpenDetails={onOpenDetails}
                  onBulkVerifySelected={onBulkVerifySelected}
                  isBulkVerifyLoading={isBulkVerifying}
                  bulkVerifyButtonLabel="Verifica"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop View - Layout originale con tabella e sidebar */}
      <div className="hidden md:flex flex-1 overflow-hidden px-6 pb-6">
      <div className="flex-1 overflow-hidden">
        <div className="h-full space-y-4">
          {hasError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Errore nel caricamento dei dati</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          {fieldNotesLength === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex flex-col items-center justify-center max-w-md text-center">
                <div className="flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 mb-6">
                  <Bot className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Parla con Seminai
                </h3>
                <p className="text-sm text-neutral-600 mb-6">
                  Inizia una conversazione con l'assistente AI per aggiungere le tue prime note di campo.
                  Puoi descrivere le operazioni svolte e Seminai le convertirà automaticamente in note strutturate.
                </p>
                <Button
                  onClick={() => onToggleRightSidebar(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Apri Chat AI
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col relative">
              <div className="flex-1 min-h-0">
                <EditableTable
                  addButton={showAddButton}
                  createMode="drawer"
                  onAddClick={onAddClick}
                  newRowDefaults={newRowDefaults}
                  columns={columns}
                  rows={rows}
                  isModify={false}
                  onSave={onSave}
                  onDeleteSelected={onDeleteSelected}
                  getRowId={(row) => row.id as string}
                  exportFileName="note-di-campo"
                  onOpenDetails={onOpenDetails}
                  onBulkVerifySelected={onBulkVerifySelected}
                  isBulkVerifyLoading={isBulkVerifying}
                  bulkVerifyButtonLabel="Verifica"
                >
                  {!isRightSidebarOpen && (
                    <Button
                      data-table-slot="right"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleRightSidebar(true)}
                      className="text-black hover:text-gray-700 cursor-pointer focus-visible:ring-0 focus-visible:outline-none"
                      title="Apri chat AI"
                    >
                      <PanelRightOpen className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Chat AI</span>
                    </Button>
                  )}
                </EditableTable>
              </div>
            </div>
          )}
        </div>
      </div>

      {isRightSidebarOpen && (
        <>
          {/* Resizer */}
          <div
            onMouseDown={onResizeStart}
            className={cn(
              "w-1 flex-shrink-0 cursor-col-resize bg-slate-200 hover:bg-slate-300 transition-colors relative group",
              isResizing && "bg-slate-400"
            )}
            style={{ userSelect: "none" }}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Right Sidebar - Chat Panel */}
          <div
            className="flex-shrink-0 overflow-hidden flex flex-col bg-white border-l border-slate-200"
            style={{ width: `${rightSidebarWidth}px` }}
          >
            {/* Header unificato */}
            <div className="flex-shrink-0 p-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Chat AI Assistant
                </span>
                <ConnectionStatusBadge state={socketState} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleRightSidebar(false)}
                className="h-7 w-7 p-0"
                title="Chiudi pannello"
              >
                <PanelRightClose className="h-4 w-4 text-slate-500" />
              </Button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <FieldNoteChatPanel 
                onFieldNoteSaved={onFieldNoteSaved}
                onSocketStateChange={setSocketState}
              />
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

export default FieldNotesView;
