import { useState, useRef, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  EditableTable,
  type EditableColumn,
  type CustomExportConfig,
} from "@/components/organism/EditableTable";
import {
  JobSelectedDetails,
  type JobRow,
} from "@/components/organism/JobSelectedDetails";
import HistoryPanel from "./HistoryPanel";
import JobGroupCard from "./JobGroupCard";
import ConformityCheckerPanel, {
  type ConformityCheckerPanelRef,
  type VerificationStateSnapshot,
  VerificationStatusBox,
} from "./ConformityCheckerPanel";
import ChatHistoryDrawer from "./ChatHistoryDrawer";
import { type RightSidebarMode } from "./AllJobsView";
import {
  Brain,
  ClipboardCheck,
  GripVertical,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Package,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Eraser,
  Sparkles,
  MessageSquare,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type JobGroupSummaryItem,
  type JobHistoryEntry,
  type JobWithRelations,
} from "@/api/jobs";

type EditableTableRowData = Record<string, unknown>;

interface ReviewJobsViewProps {
  isMobile: boolean;
  onAddClick?: () => void;
  isGroupsSidebarOpen: boolean;
  onToggleGroupsSidebar: (open: boolean) => void;
  groupsSidebarWidth: number;
  onGroupsResizeStart: (e: React.MouseEvent) => void;
  isResizingGroupsSidebar: boolean;
  pendingJobGroups: JobGroupSummaryItem[];
  totalPendingOperations: number;
  isLoadingGroupsSummary: boolean;
  selectedGroupSummary: JobGroupSummaryItem | null;
  selectedGroupRows: EditableTableRowData[];
  selectedGroupHistory: JobHistoryEntry[];
  onSelectGroup: (code: string) => void;
  selectedReviewRows: EditableTableRowData[];
  onSelectionChange: (rows: EditableTableRowData[]) => void;
  isLoadingGroupDetail: boolean;
  reviewColumns: EditableColumn[];
  onSave: (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => Promise<void>;
  onDeleteSelected: (removed: Array<Record<string, unknown>>) => Promise<void>;
  onBulkVerifySelected: (rows: EditableTableRowData[]) => Promise<void>;
  isBulkVerifying: boolean;
  canGoToPreviousGroup: boolean;
  canGoToNextGroup: boolean;
  onPreviousGroup: () => void;
  onNextGroup: () => void;
  currentGroupIndex: number;
  totalGroups: number;
  historyPanelWidth: number;
  rightSidebarMode: RightSidebarMode;
  onRightSidebarModeChange: (mode: RightSidebarMode) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  isResizing: boolean;
  onProductClick: (
    name: string,
    registration?: string,
    showToast?: boolean,
  ) => void;
  mobileHistoryOpen: boolean;
  onMobileHistoryChange: (open: boolean) => void;
  convertToJobRows: (rows: EditableTableRowData[]) => JobRow[];
  exportConfig?: CustomExportConfig;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: (open: boolean) => void;
  selectedJobsForChat?: JobWithRelations[];
  onConformityConfirmSuccess?: () => void;
  getRowClassName?: (row: Record<string, unknown>) => string | undefined;
}

export function ReviewJobsView({
  isMobile,
  onAddClick,
  isGroupsSidebarOpen,
  onToggleGroupsSidebar,
  groupsSidebarWidth,
  onGroupsResizeStart,
  isResizingGroupsSidebar,
  pendingJobGroups,
  totalPendingOperations,
  isLoadingGroupsSummary,
  selectedGroupSummary,
  selectedGroupRows,
  selectedGroupHistory,
  onSelectGroup,
  selectedReviewRows,
  onSelectionChange,
  isLoadingGroupDetail,
  reviewColumns,
  onSave,
  onDeleteSelected,
  onBulkVerifySelected,
  isBulkVerifying,
  canGoToPreviousGroup,
  canGoToNextGroup,
  onPreviousGroup,
  onNextGroup,
  currentGroupIndex,
  totalGroups,
  historyPanelWidth,
  rightSidebarMode,
  onRightSidebarModeChange,
  onResizeStart,
  isResizing,
  onProductClick,
  mobileHistoryOpen,
  onMobileHistoryChange,
  convertToJobRows,
  exportConfig,
  isRightSidebarOpen,
  onToggleRightSidebar,
  selectedJobsForChat = [],
  onConformityConfirmSuccess,
  getRowClassName,
}: ReviewJobsViewProps) {
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [verificationSnapshot, setVerificationSnapshot] =
    useState<VerificationStateSnapshot | null>(null);
  const conformityCheckerRef = useRef<ConformityCheckerPanelRef>(null);

  const handleVerificationStateChange = useCallback(
    (snapshot: VerificationStateSnapshot) => {
      setVerificationSnapshot(snapshot);
    },
    [],
  );

  // Azzera lo snapshot quando si cambia gruppo per evitare risultati obsoleti
  useEffect(() => {
    setVerificationSnapshot(null);
  }, [selectedGroupSummary?.jobId]);

  // Carica una chat dallo storico nel pannello conformità
  const handleSelectChatFromHistory = (chatId: string) => {
    conformityCheckerRef.current?.loadChat(chatId);
  };

  if (isMobile) {
    if (!selectedGroupSummary) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="p-3 bg-white flex-shrink-0">
            <h3 className="text-sm font-medium text-slate-700">
              Gruppi da verificare
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {pendingJobGroups.length} grupp
              {pendingJobGroups.length === 1 ? "o" : "i"} •{" "}
              {totalPendingOperations} operazion
              {totalPendingOperations === 1 ? "e" : "i"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {isLoadingGroupsSummary ? (
              <div className="flex items-center justify-center py-8">
                <Spinner ariaLabel="Caricamento gruppi" />
              </div>
            ) : pendingJobGroups.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nessuna operazione da verificare</p>
              </div>
            ) : (
              pendingJobGroups.map((group) => (
                <JobGroupCard
                  key={group.jobId}
                  group={group}
                  isSelected={false}
                  onClick={() => {
                    onSelectGroup(group.jobId);
                    onSelectionChange([]);
                  }}
                />
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-shrink-0 p-3 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreviousGroup}
              disabled={!canGoToPreviousGroup}
              className="p-1 h-auto"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0 text-center">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-base font-semibold text-slate-800 truncate">
                  #{selectedGroupSummary.jobId}
                </h3>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {selectedGroupSummary.totalOperations}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {selectedGroupSummary.company.name}
              </p>
              <p className="text-[10px] text-slate-400">
                {currentGroupIndex + 1} / {totalGroups}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextGroup}
              disabled={!canGoToNextGroup}
              className="p-1 h-auto"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onRightSidebarModeChange("details");
                onMobileHistoryChange(true);
              }}
              className="p-2 h-auto"
              title="Dettagli"
            >
              <Package className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onRightSidebarModeChange("conformity");
                onMobileHistoryChange(true);
              }}
              className="p-2 h-auto"
              title="Chat"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            {onAddClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddClick}
                className="p-2 h-auto shrink-0"
                title="Aggiungi operazione"
                aria-label="Aggiungi operazione"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {selectedReviewRows.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="default"
                size="sm"
                disabled={isBulkVerifying}
                onClick={() => onBulkVerifySelected(selectedReviewRows)}
                className="flex-1 text-xs"
              >
                {isBulkVerifying ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <ClipboardCheck className="h-3 w-3" />
                )}
                Verifica
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0 p-2">
          {isLoadingGroupDetail ? (
            <div className="flex items-center justify-center py-8">
              <Spinner ariaLabel="Caricamento dettagli" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 [&>div]:h-full [&>div]:flex [&>div]:flex-col">
              <EditableTable
                columns={reviewColumns}
                rows={selectedGroupRows}
                isModify={true}
                onSave={onSave}
                onDeleteSelected={onDeleteSelected}
                onSelectionChange={onSelectionChange}
                getRowId={(row) => row.id as string}
                className="flex-1 flex flex-col min-h-0"
                customExportConfig={exportConfig}
                exportFileName="operazioni_revisione"
                getRowClassName={getRowClassName}
                onDetailsButtonClick={() => {
                  onRightSidebarModeChange("details");
                  onMobileHistoryChange(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Sheet per Details e History */}
        <Sheet
          open={mobileHistoryOpen && rightSidebarMode !== "conformity"}
          onOpenChange={onMobileHistoryChange}
        >
          <SheetContent
            side="bottom"
            className="h-[70vh] p-0 flex flex-col border-0"
          >
            <SheetHeader className="flex-shrink-0 p-3 bg-white rounded-t-lg">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <SheetTitle className="text-base min-w-0 truncate">
                  {rightSidebarMode === "details"
                    ? "Dettagli Operazioni"
                    : "Storico Operazione"}
                </SheetTitle>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {rightSidebarMode === "details" &&
                    selectedReviewRows.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await conformityCheckerRef.current?.handleVerify();
                            onRightSidebarModeChange("conformity");
                            onMobileHistoryChange(true);
                          }}
                          className="h-7 text-xs"
                          title="Verifica automatica conformità"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                          Controlla
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectionChange([])}
                          className="h-7 w-7 p-0"
                          title="Pulisci selezione"
                        >
                          <Eraser className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                </div>
              </div>
              <SheetDescription className="sr-only">
                {rightSidebarMode === "details"
                  ? "Dettagli delle operazioni selezionate"
                  : "Storico dell'operazione selezionata"}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {selectedGroupSummary &&
                (rightSidebarMode === "details" ? (
                  <>
                    {verificationSnapshot && (
                      <div className="flex-shrink-0 p-2 pb-0">
                        <VerificationStatusBox
                          snapshot={verificationSnapshot}
                          onOpenChat={() => {
                            onRightSidebarModeChange("conformity");
                            onMobileHistoryChange(true);
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-h-0 overflow-auto">
                      <JobSelectedDetails
                        selectedRows={convertToJobRows(selectedReviewRows)}
                        isMobile={true}
                      />
                    </div>
                  </>
                ) : (
                  <HistoryPanel
                    history={selectedGroupHistory}
                    jobCode={selectedGroupSummary.jobId}
                    onProductClick={(name, reg) =>
                      onProductClick(name, reg, false)
                    }
                  />
                ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Chat panel - SEMPRE montato per mantenere contesto, visibilità controllata con CSS */}
        {selectedGroupSummary && (
          <>
            {/* Overlay quando chat è aperta */}
            <div
              className={cn(
                "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
                rightSidebarMode === "conformity" && mobileHistoryOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none",
              )}
              onClick={() => onMobileHistoryChange(false)}
            />

            {/* Chat container - sempre renderizzato, translate per mostrare/nascondere */}
            <div
              className={cn(
                "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 flex flex-col transition-transform duration-300 ease-out",
                rightSidebarMode === "conformity" && mobileHistoryOpen
                  ? "translate-y-0"
                  : "translate-y-full",
              )}
              style={{ height: "70vh" }}
            >
              {/* Header con handle per chiudere */}
              <div className="flex-shrink-0 p-3 bg-white rounded-t-2xl border-b border-slate-100">
                <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-2" />
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Chat Verifica</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsChatHistoryOpen(true)}
                      className="h-7 w-7 p-0"
                      title="Storico chat"
                    >
                      <History className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMobileHistoryChange(false)}
                      className="h-7 w-7 p-0"
                      title="Chiudi"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <ConformityCheckerPanel
                  ref={conformityCheckerRef}
                  jobGroupId={selectedGroupSummary.jobId}
                  selectedJobs={selectedJobsForChat}
                  onConfirmSuccess={onConformityConfirmSuccess}
                  onClose={() => onMobileHistoryChange(false)}
                  onVerificationStateChange={handleVerificationStateChange}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {isGroupsSidebarOpen && (
        <>
          <div
            className="flex-shrink-0 bg-slate-50 flex flex-col overflow-hidden"
            style={{ width: `${groupsSidebarWidth}px` }}
          >
            <div className="p-3 bg-white flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-slate-700">
                    Gruppi da verificare
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pendingJobGroups.length} grupp
                    {pendingJobGroups.length === 1 ? "o" : "i"} •{" "}
                    {totalPendingOperations} operazion
                    {totalPendingOperations === 1 ? "e" : "i"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleGroupsSidebar(false)}
                  className="h-7 w-7 p-0 shrink-0"
                  title="Chiudi elenco gruppi"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
              {isLoadingGroupsSummary ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner ariaLabel="Caricamento gruppi" />
                </div>
              ) : pendingJobGroups.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessuna operazione da verificare</p>
                </div>
              ) : (
                pendingJobGroups.map((group) => (
                  <JobGroupCard
                    key={group.jobId}
                    group={group}
                    isSelected={selectedGroupSummary?.jobId === group.jobId}
                    onClick={() => {
                      onSelectGroup(group.jobId);
                      onSelectionChange([]);
                    }}
                  />
                ))
              )}
            </div>
          </div>
          <div
            onMouseDown={onGroupsResizeStart}
            className={cn(
              "w-1 flex-shrink-0 cursor-col-resize bg-slate-200 hover:bg-slate-300 transition-colors relative group",
              isResizingGroupsSidebar && "bg-slate-400",
            )}
            style={{ userSelect: "none" }}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        </>
      )}
      {!isGroupsSidebarOpen && (
        <div className="flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden w-16 rounded-md">
          <div className="p-2 bg-white flex-shrink-0 border-b border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleGroupsSidebar(true)}
              className="h-7 w-full p-0"
              title="Apri elenco gruppi"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            {isLoadingGroupsSummary ? (
              <div className="flex items-center justify-center py-4">
                <Spinner ariaLabel="Caricamento" className="h-4 w-4" />
              </div>
            ) : pendingJobGroups.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-[10px]">
                <ClipboardCheck className="h-4 w-4 mx-auto mb-1 opacity-50" />
                <p>Nessuna</p>
              </div>
            ) : (
              pendingJobGroups.map((group) => (
                <button
                  key={group.jobId}
                  type="button"
                  onClick={() => {
                    onSelectGroup(group.jobId);
                    onSelectionChange([]);
                  }}
                  className={cn(
                    "w-full p-1.5 rounded-md transition-all text-center",
                    selectedGroupSummary?.jobId === group.jobId
                      ? "bg-agri-green-100 border border-agri-green-300 ring-1 ring-agri-green-200"
                      : "bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                  )}
                  title={`Operazione #${group.jobId} - ${group.totalOperations} operazioni`}
                >
                  <Badge
                    className={cn(
                      "font-mono text-xs w-full justify-center bg-agri-green-50",
                      selectedGroupSummary?.jobId === group.jobId &&
                        " text-black ",
                    )}
                  >
                    #{group.jobId}
                  </Badge>
                  {group.pendingOperations > 0 && (
                    <Badge
                      variant="destructive"
                      className="mt-1 h-4 min-w-4 px-1 text-[10px] block mx-auto text-black"
                    >
                      {group.pendingOperations}
                    </Badge>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedGroupSummary ? (
          <>
            <div className="flex-shrink-0 p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Operazione #{selectedGroupSummary.jobId}
                    </h3>
                    <Badge variant="outline">
                      {selectedGroupRows.length} trattament
                      {selectedGroupRows.length === 1 ? "o" : "i"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedGroupSummary.company.name}
                  </p>
                </div>
                {selectedReviewRows.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isBulkVerifying}
                      onClick={() => onBulkVerifySelected(selectedReviewRows)}
                    >
                      {isBulkVerifying ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <ClipboardCheck className="h-4 w-4" />
                      )}
                      Verifica
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
              {isLoadingGroupDetail ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner ariaLabel="Caricamento dettagli" />
                </div>
              ) : (
                <div className="flex-1 min-h-0 [&>div]:h-full [&>div]:flex [&>div]:flex-col">
                  <EditableTable
                    columns={reviewColumns}
                    rows={selectedGroupRows}
                    isModify={true}
                    onSave={onSave}
                    onDeleteSelected={onDeleteSelected}
                    onSelectionChange={onSelectionChange}
                    getRowId={(row) => row.id as string}
                    className="flex-1 flex flex-col min-h-0"
                    customExportConfig={exportConfig}
                    exportFileName="operazioni_revisione"
                    getRowClassName={getRowClassName}
                    onDetailsButtonClick={() => {
                      onRightSidebarModeChange("details");
                      onToggleRightSidebar(true);
                    }}
                  >
                    {selectedGroupSummary && !isRightSidebarOpen && (
                      <div
                        className="flex items-center gap-1"
                        data-table-slot="right"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onRightSidebarModeChange("details");
                            onToggleRightSidebar(true);
                          }}
                          className="text-black hover:text-gray-700 cursor-pointer focus-visible:ring-0 focus-visible:outline-none"
                          title="Apri pannello dettagli"
                        >
                          <PanelRightOpen className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Dettagli</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onRightSidebarModeChange("conformity");
                            onToggleRightSidebar(true);
                          }}
                          className="text-black hover:text-gray-700 cursor-pointer focus-visible:ring-0 focus-visible:outline-none"
                          title="Apri chat"
                        >
                          <MessageSquare className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Chat</span>
                        </Button>
                      </div>
                    )}
                  </EditableTable>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Seleziona un gruppo per visualizzare i dettagli</p>
            </div>
          </div>
        )}
      </div>

      {selectedGroupSummary && isRightSidebarOpen && (
        <>
          <div
            onMouseDown={onResizeStart}
            className={cn(
              "w-1 flex-shrink-0 cursor-col-resize bg-slate-200 hover:bg-slate-300 transition-colors relative group",
              isResizing && "bg-slate-400",
            )}
            style={{ userSelect: "none" }}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-slate-500" />
            </div>
          </div>
          <div
            className="flex-shrink-0 overflow-hidden flex flex-col bg-white border-l border-slate-200"
            style={{ width: `${historyPanelWidth}px` }}
          >
            <div className="flex-shrink-0 p-3 bg-white border-b border-slate-200 flex items-center justify-between">
              {rightSidebarMode === "details" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      Dettagli
                    </span>
                    {selectedReviewRows.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {selectedReviewRows.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedReviewRows.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectionChange([])}
                        className="h-7 w-7 p-0"
                        title="Pulisci selezione"
                      >
                        <Eraser className="h-4 w-4 text-slate-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRightSidebarModeChange("history")}
                      className="h-7 w-7 p-0"
                      title="Mostra storico"
                    >
                      <Brain className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await conformityCheckerRef.current?.handleVerify();
                        onRightSidebarModeChange("conformity");
                        onToggleRightSidebar(true);
                      }}
                      className="h-7 w-7 p-0"
                      title="Verifica automatica conformità (Controlla)"
                    >
                      <MessageSquare className="h-4 w-4 text-slate-500" />
                    </Button>
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
                </>
              ) : rightSidebarMode === "history" ? (
                <>
                  <span className="text-sm font-medium text-slate-700">
                    Storico
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRightSidebarModeChange("details")}
                      className="h-7 w-7 p-0"
                      title="Mostra dettagli"
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRightSidebarModeChange("conformity")}
                      className="h-7 w-7 p-0"
                      title="Verifica conformità"
                    >
                      <MessageSquare className="h-4 w-4 text-slate-500" />
                    </Button>
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
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-slate-700">
                    Chat
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRightSidebarModeChange("details")}
                      className="h-7 w-7 p-0"
                      title="Mostra dettagli"
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRightSidebarModeChange("history")}
                      className="h-7 w-7 p-0"
                      title="Mostra storico"
                    >
                      <Brain className="h-4 w-4 text-slate-500" />
                    </Button>
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
                </>
              )}
            </div>
            <div className="flex-1 overflow-hidden bg-slate-50 relative flex flex-col">
              {rightSidebarMode === "details" && (
                <>
                  {verificationSnapshot && (
                    <div className="flex-shrink-0 p-3 pb-0">
                      <VerificationStatusBox
                        snapshot={verificationSnapshot}
                        onOpenChat={() => {
                          onRightSidebarModeChange("conformity");
                          onToggleRightSidebar(true);
                        }}
                      />
                    </div>
                  )}
                  {selectedReviewRows.length > 0 ? (
                    <div className="flex-1 min-h-0 overflow-auto p-3 pt-2">
                      <JobSelectedDetails
                        selectedRows={convertToJobRows(selectedReviewRows)}
                      />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                      <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                      <p>Seleziona una o più operazioni per vedere i dettagli</p>
                    </div>
                  )}
                </>
              )}
              {rightSidebarMode === "history" && (
                <HistoryPanel
                  history={selectedGroupHistory}
                  jobCode={selectedGroupSummary.jobId}
                  onProductClick={(name, reg) =>
                    onProductClick(name, reg, false)
                  }
                />
              )}
              {selectedGroupSummary && (
                <div
                  className={cn(
                    "flex flex-col overflow-hidden min-h-[200px]",
                    rightSidebarMode === "conformity"
                      ? "h-full"
                      : "absolute inset-0 opacity-0 pointer-events-none w-0 h-0 overflow-hidden",
                  )}
                >
                  <ConformityCheckerPanel
                    ref={conformityCheckerRef}
                    jobGroupId={selectedGroupSummary.jobId}
                    selectedJobs={selectedJobsForChat ?? []}
                    onConfirmSuccess={onConformityConfirmSuccess}
                    onClose={() => onRightSidebarModeChange("details")}
                    onVerificationStateChange={handleVerificationStateChange}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Chat History Drawer */}
      <ChatHistoryDrawer
        open={isChatHistoryOpen}
        onOpenChange={setIsChatHistoryOpen}
        onSelectChat={handleSelectChatFromHistory}
      />
    </div>
  );
}

export default ReviewJobsView;
