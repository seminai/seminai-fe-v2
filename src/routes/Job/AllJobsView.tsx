import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EditableTable,
  type EditableColumn,
  type CustomExportConfig,
} from "@/components/organism/EditableTable";
import {
  JobSelectedDetails,
  type JobRow,
} from "@/components/organism/JobSelectedDetails";
import { type JobHistoryEntry } from "@/api/jobs";
import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import {
  GripVertical,
  Brain,
  Eraser,
  X,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import HistoryPanel from "./HistoryPanel";
import ConformityCheckerPanel from "./ConformityCheckerPanel";

type EditableTableRowData = Record<string, unknown>;

interface EditablePayload {
  created: Array<Record<string, unknown>>;
  updated: Array<Record<string, unknown>>;
}

interface JobIdOption {
  value: string;
  label: string;
  jobId: string;
  createdAt: string;
}

export type RightSidebarMode = "details" | "history" | "conformity";

interface AllJobsViewProps {
  error: unknown;
  isLoading: boolean;
  jobsLength: number;
  columns: EditableColumn[];
  rows: EditableTableRowData[];
  jobIdOptions: JobIdOption[];
  selectedJobIds: string[];
  onJobIdsChange: (values: string[]) => void;
  onSave: (payload: EditablePayload) => Promise<void>;
  onDeleteSelected: (removed: Array<Record<string, unknown>>) => Promise<void>;
  onBulkVerifySelected: (selectedRows: EditableTableRowData[]) => Promise<void>;
  isBulkVerifying: boolean;
  selectedRows: EditableTableRowData[];
  onSelectionChange: (rows: EditableTableRowData[]) => void;
  historyPanelWidth: number;
  rightSidebarMode: RightSidebarMode;
  onRightSidebarModeChange: (mode: RightSidebarMode) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  isResizing: boolean;
  selectedRowsHistory: JobHistoryEntry[];
  convertToJobRows: (rows: EditableTableRowData[]) => JobRow[];
  paginatedJobsCount: number;
  onClearSelection: () => void;
  onProductClick: (
    name: string,
    registration?: string,
    showToast?: boolean
  ) => void;
  showSelectionSummary?: boolean;
  exportConfig?: CustomExportConfig;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: (open: boolean) => void;
  showAddButton?: boolean;
  onAddClick?: () => void;
  newRowDefaults?: Partial<Record<string, unknown>>;
  jobGroupId?: string;
  onConformityConfirmSuccess?: () => void;
}

export function JobIdMultiSelect({
  options,
  value,
  onChange,
  isLoading,
}: {
  options: JobIdOption[];
  value: string[];
  onChange: (values: string[]) => void;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o]));
    return value
      .map((v) => map.get(v))
      .filter(Boolean)
      .map((opt) => opt as JobIdOption);
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const handleClear = () => {
    // Se ci sono opzioni, ripristina l'ultima per data (prima in lista)
    if (options.length > 0) {
      onChange([options[0].value]);
    } else {
      onChange([]);
    }
    setSearchTerm("");
    setOpen(false);
  };

  const toggleValue = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const triggerLabel = useMemo(() => {
    if (selectedLabels.length === 0) {
      return "Seleziona una o più operazioni";
    }
    if (selectedLabels.length === 1) {
      const opt = selectedLabels[0];
      return `Operazione ${opt.jobId} • ${new Date(
        opt.createdAt
      ).toLocaleDateString("it-IT")}`;
    }
    return `${selectedLabels.length} selezioni`;
  }, [selectedLabels]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 min-w-[260px] justify-between bg-white"
          disabled={isLoading}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronsUpDown className="h-4 w-4 ml-2 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[340px] bg-white" align="start">
        <div className="p-2 space-y-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca operazione o data..."
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleClear}
              disabled={isLoading}
            >
              Pulisci filtro
            </Button>
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-1">
              {filteredOptions.length === 0 && (
                <div className="text-xs text-slate-500 px-2 py-1.5">
                  Nessun job trovato
                </div>
              )}
              {filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
                      isSelected
                        ? "bg-slate-100 text-slate-900"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                    onClick={() => toggleValue(option.value)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 text-slate-800">
                      <span className="text-xs text-slate-600">Operazione</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-agri-50 border border-agri-100 text-xs font-medium text-slate-800">
                        {option.jobId}
                      </span>
                      <span className="text-xs text-slate-600">
                        creata il{" "}
                        {new Date(option.createdAt).toLocaleDateString("it-IT")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AllJobsView({
  error,
  isLoading,
  jobsLength,
  columns,
  rows,
  jobIdOptions,
  selectedJobIds,
  onJobIdsChange,
  onSave,
  onDeleteSelected,
  onBulkVerifySelected,
  isBulkVerifying,
  selectedRows,
  onSelectionChange,
  historyPanelWidth,
  rightSidebarMode,
  onRightSidebarModeChange,
  onResizeStart,
  isResizing,
  selectedRowsHistory,
  convertToJobRows,
  paginatedJobsCount,
  onClearSelection,
  onProductClick,
  showSelectionSummary = false,
  exportConfig,
  isRightSidebarOpen,
  onToggleRightSidebar,
  showAddButton = true,
  onAddClick,
  newRowDefaults,
  jobGroupId,
  onConformityConfirmSuccess,
}: AllJobsViewProps) {
  const hasError = Boolean(error);
  const errorMessage =
    error instanceof Error ? error.message : "Errore sconosciuto";

  return (
    <div className="flex-1 flex overflow-hidden px-6 pb-6">
      <div className="flex-1 overflow-hidden">
        <div className="h-full space-y-4">
          {showSelectionSummary && (
            <div className="flex items-start justify-between gap-3 pt-2 pr-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Job selezionati: {selectedJobIds.length || 0} • Totale
                  operazioni: {paginatedJobsCount}
                </span>
                {isLoading && (
                  <Spinner
                    className="h-3 w-3 text-slate-400"
                    ariaLabel="Caricamento"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedJobIds.length === 0 && (
                  <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                    Seleziona una o più operazioni
                  </span>
                )}
                <JobIdMultiSelect
                  options={jobIdOptions}
                  value={selectedJobIds}
                  onChange={onJobIdsChange}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}
          {hasError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Errore nel caricamento dei dati</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          {jobsLength === 0 && !isLoading && !showAddButton ? (
            <div className="text-center py-16 text-neutral-500">
              <p>Nessuna operazione trovata</p>
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
                  isModify={true}
                  onSave={onSave}
                  onDeleteSelected={onDeleteSelected}
                  onBulkVerifySelected={onBulkVerifySelected}
                  bulkVerifyButtonLabel="Verifica"
                  isBulkVerifyLoading={isBulkVerifying}
                  onDetailsButtonClick={() => onToggleRightSidebar(true)}
                  getRowId={(row) => row.id as string}
                  onSelectionChange={onSelectionChange}
                  customExportConfig={exportConfig}
                  exportFileName="operazioni"
                >
                  {!isRightSidebarOpen && (
                    <Button
                      data-table-slot="right"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleRightSidebar(true)}
                      className="text-black hover:text-gray-700 cursor-pointer focus-visible:ring-0 focus-visible:outline-none"
                      title="Apri pannello dettagli"
                    >
                      <PanelRightOpen className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Dettagli</span>
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
          <div
            onMouseDown={onResizeStart}
            className={cn(
              "w-1 flex-shrink-0 cursor-col-resize bg-slate-200 hover:bg-slate-300 transition-colors relative group ",
              isResizing && "bg-slate-400"
            )}
            style={{ userSelect: "none" }}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100  transition-opacity">
              <GripVertical className="h-4 w-4 text-slate-500" />
            </div>
          </div>

          <div
            className="flex-shrink-0 overflow-hidden flex flex-col bg-white border-l border-slate-200"
            style={{ width: `${historyPanelWidth}px` }}
          >
            <div className="flex-shrink-0 p-3 border-b border-slate-200 flex items-center justify-between">
              {rightSidebarMode === "details" && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      Dettagli
                    </span>
                    {selectedRows.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {selectedRows.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedRows.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearSelection}
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
              )}
              {rightSidebarMode === "history" && (
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
              )}
              {rightSidebarMode === "conformity" && (
                <>
                  <span className="text-sm font-medium text-slate-700">
                    Verifica Conformità
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
            <div className="flex-1 overflow-hidden bg-slate-50">
              {rightSidebarMode === "details" &&
                (selectedRows.length > 0 ? (
                  <JobSelectedDetails
                    selectedRows={convertToJobRows(selectedRows)}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm p-4">
                    <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                    <p>Seleziona una o più operazioni per vedere i dettagli</p>
                  </div>
                ))}
              {rightSidebarMode === "history" &&
                (selectedRowsHistory.length > 0 ? (
                  <HistoryPanel
                    history={selectedRowsHistory}
                    jobCode={
                      (selectedRows[0]?.jobCode as string | undefined) ?? ""
                    }
                    onProductClick={(name, reg) =>
                      onProductClick(name, reg, false)
                    }
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Nessuno storico disponibile per la selezione corrente
                  </div>
                ))}
              {rightSidebarMode === "conformity" &&
                (jobGroupId ? (
                  <ConformityCheckerPanel
                    jobGroupId={jobGroupId}
                    onConfirmSuccess={onConformityConfirmSuccess}
                    onClose={() => onRightSidebarModeChange("details")}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm p-4 text-center">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p>
                      Seleziona un gruppo di operazioni per verificare la
                      conformità
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AllJobsView;
