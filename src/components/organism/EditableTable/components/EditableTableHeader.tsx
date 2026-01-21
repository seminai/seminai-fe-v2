import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IoDownloadOutline } from "react-icons/io5";
import { CheckCircle2, Loader2, Plus, PanelRightOpen } from "lucide-react";
import { EditableColumn } from "../types";
import { MAX_VISIBLE_COLUMNS } from "../constants";
import { EditableTableColumnVisibilityDropdown } from "../EditableTableColumnVisibilityDropdown";

export interface EditableTableHeaderProps {
  columns: EditableColumn[];
  visibleColumnIds: string[];
  showEditActions: boolean;
  anySelected: boolean;
  selectedCount: number;
  isModify?: boolean;
  alwaysEdit?: boolean;
  isEditMode: boolean;
  hasErrors: boolean;
  addButton?: boolean;
  showDeleteAction?: boolean;
  isBulkVerifyLoading?: boolean;
  bulkVerifyButtonLabel?: string;
  onBulkVerifySelected?: (selectedRows: Array<Record<string, unknown>>) => void;
  onDetailsButtonClick?: () => void;
  selectionPayload: Array<Record<string, unknown>>;
  leftActions: React.ReactNode[];
  rightActions: React.ReactNode[];
  onExportCsv: () => void;
  onExportExcel: () => void;
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  onShowAllColumns: () => void;
  onShowDefaultColumns: () => void;
  onDeselectAll: () => void;
  onToggleEditMode: () => void;
  onAddClick: () => void;
  onOpenBulkEdit: () => void;
  onRequestDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function EditableTableHeader({
  columns,
  visibleColumnIds,
  showEditActions,
  anySelected,
  selectedCount,
  isModify,
  alwaysEdit,
  isEditMode,
  hasErrors,
  addButton,
  showDeleteAction,
  isBulkVerifyLoading,
  bulkVerifyButtonLabel,
  onBulkVerifySelected,
  onDetailsButtonClick,
  selectionPayload,
  leftActions,
  rightActions,
  onExportCsv,
  onExportExcel,
  onColumnVisibilityChange,
  onShowAllColumns,
  onShowDefaultColumns,
  onDeselectAll,
  onToggleEditMode,
  onAddClick,
  onOpenBulkEdit,
  onRequestDelete,
  onCancel,
  onSave,
}: EditableTableHeaderProps): React.ReactElement {
  const showAddButton = Boolean(addButton) && !showEditActions;
  const shouldRenderBulkVerifyButton =
    anySelected && !showEditActions && Boolean(onBulkVerifySelected);
  const bulkVerifyLabel = bulkVerifyButtonLabel ?? "Verify selected";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3  bg-white rounded-t-lg z-10 sticky top-0 left-0 right-0">
      <div className="flex flex-wrap items-center gap-2">
        {!showEditActions && !anySelected && leftActions}
        {!showEditActions && !anySelected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-black cursor-pointer"
                disabled={columns.length === 0}
                aria-label="Esporta"
              >
                <IoDownloadOutline className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[100]">
              <DropdownMenuItem
                onSelect={onExportCsv}
                className="cursor-pointer"
              >
                Esporta CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={onExportExcel}
                className="cursor-pointer"
              >
                Esporta Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!showEditActions &&
          !anySelected &&
          columns.length > MAX_VISIBLE_COLUMNS && (
            <EditableTableColumnVisibilityDropdown
              columns={columns}
              visibleColumnIds={visibleColumnIds}
              maxVisibleColumns={MAX_VISIBLE_COLUMNS}
              onVisibilityChange={onColumnVisibilityChange}
              onShowAll={onShowAllColumns}
              onShowDefault={onShowDefaultColumns}
            />
          )}
        {anySelected && !showEditActions && (
          <Button
            onClick={onDeselectAll}
            className={cn("border border-gray-200 text-black hover:bg-gray-50")}
            variant="ghost"
            size="sm"
            aria-label="De-seleziona"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 mr-2"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
            <span>
              De-seleziona {selectedCount} element
              {selectedCount === 1 ? "o" : "i"}
            </span>
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!showEditActions && !anySelected && rightActions}
        {isModify && !anySelected && !alwaysEdit && !isEditMode && (
          <Button
            onClick={onToggleEditMode}
            className="text-black hover:text-gray-700 cursor-pointer"
            variant="ghost"
            size="sm"
            aria-label="Modifica"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 sm:mr-2"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            <span className="hidden sm:inline">Modifica</span>
          </Button>
        )}
        {showAddButton && !anySelected && (
          <Button
            variant="ghost"
            className="text-black hover:text-gray-700 cursor-pointer"
            size="sm"
            onClick={onAddClick}
            aria-label="Aggiungi"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Aggiungi</span>
          </Button>
        )}
        {anySelected && !showEditActions && onDetailsButtonClick && (
          <Button
            onClick={onDetailsButtonClick}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-agri-green-100 dark:hover:bg-agri-green-100/10 dark:hover:text-black h-8 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5 text-black hover:text-gray-700 cursor-pointer focus-visible:ring-0 focus-visible:outline-none"
            variant="ghost"
            size="sm"
            title="Apri pannello dettagli"
          >
            <PanelRightOpen className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Dettagli</span>
          </Button>
        )}
        {shouldRenderBulkVerifyButton && (
          <Button
            onClick={() => onBulkVerifySelected?.(selectionPayload)}
            className={cn("border border-gray-200 text-black hover:bg-gray-50")}
            variant="ghost"
            size="sm"
            aria-label="Verify selected rows"
            disabled={isBulkVerifyLoading}
          >
            {isBulkVerifyLoading ? (
              <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">{bulkVerifyLabel}</span>
          </Button>
        )}
        {anySelected && !showEditActions && isModify && (
          <Button
            onClick={onOpenBulkEdit}
            className={cn("border border-gray-200 text-black hover:bg-gray-50")}
            variant="ghost"
            size="sm"
            aria-label="Modifica tutti gli elementi selezionati"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 sm:mr-2"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            <span className="hidden sm:inline">Modifica tutti</span>
          </Button>
        )}
        {anySelected && showDeleteAction !== false && (
          <Button
            onClick={onRequestDelete}
            className={cn("border border-gray-200 text-black hover:bg-gray-50")}
            variant="ghost"
            size="sm"
            aria-label="Elimina"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 sm:mr-2"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            <span className="hidden sm:inline">Elimina</span>
          </Button>
        )}
        {showEditActions && (
          <>
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-black hover:text-gray-700"
            >
              Annulla
            </Button>
            <Button
              onClick={onSave}
              disabled={hasErrors}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Salva
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
