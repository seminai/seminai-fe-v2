import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableRow, TableHead } from "@/components/ui/table";
import { IoDownloadOutline } from "react-icons/io5";
import { Plus } from "lucide-react";
import { EditableColumn, InternalRow } from "../types";
import { MAX_VISIBLE_COLUMNS } from "../constants";
import { formatDefaultCellValue } from "../utils";
import { TruncatedCellText } from "../EditableTableTruncatedCellText";
import { EditableTableColumnVisibilityDropdown } from "../EditableTableColumnVisibilityDropdown";
import { EditableTableCell } from "./EditableTableCell";

export interface EditableTableVerticalProps {
  columns: EditableColumn[];
  visibleColumns: EditableColumn[];
  visibleColumnIds: string[];
  rows: InternalRow[];
  touched: Record<string, Record<string, boolean>>;
  isModify?: boolean;
  isEditMode: boolean;
  alwaysEdit?: boolean;
  addButton?: boolean;
  hasLast: boolean;
  showEditActions: boolean;
  lastComponent?:
    | React.ReactNode
    | ((row: Record<string, unknown>) => React.ReactNode);
  leftActions: React.ReactNode[];
  rightActions: React.ReactNode[];
  className?: string;
  getRowId?: (row: Record<string, unknown>, index: number) => string | number;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  onShowAllColumns: () => void;
  onShowDefaultColumns: () => void;
  onToggleEditMode: () => void;
  onCellChange: (
    row: InternalRow,
    column: EditableColumn,
    value: unknown
  ) => void;
  onAddClick: () => void;
  onCancel: () => void;
  onSave: () => void;
}

function renderReadOnlyCell(
  column: EditableColumn,
  value: unknown,
  row: InternalRow
): React.ReactNode {
  if (column.render) {
    return column.render(value, row.data);
  }
  const formattedValue = formatDefaultCellValue(column, value);
  return <TruncatedCellText text={formattedValue} />;
}

function getRowHeaderLabel(
  row: InternalRow,
  index: number,
  getRowId?: (row: Record<string, unknown>, index: number) => string | number
): string {
  try {
    const label = getRowId ? getRowId(row.data, index) : index + 1;
    return String(label);
  } catch {
    return String(index + 1);
  }
}

export function EditableTableVertical({
  columns,
  visibleColumns,
  visibleColumnIds,
  rows,
  touched,
  isModify,
  isEditMode,
  alwaysEdit,
  addButton,
  hasLast,
  showEditActions,
  lastComponent,
  leftActions,
  rightActions,
  className,
  getRowId,
  onExportCsv,
  onExportExcel,
  onExportPdf,
  onColumnVisibilityChange,
  onShowAllColumns,
  onShowDefaultColumns,
  onCellChange,
  onAddClick,
  onCancel,
  onSave,
  onToggleEditMode,
}: EditableTableVerticalProps): React.ReactElement {
  const showAddButton = Boolean(addButton) && !showEditActions;

  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full rounded-lg bg-background", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-agri-green-50 bg-agri-green-50 rounded-t-lg">
        <div className="flex flex-wrap items-center gap-2">
          {!showEditActions && leftActions}
          {!showEditActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground cursor-pointer"
                  disabled={columns.length === 0}
                  aria-label="Esporta"
                >
                  <IoDownloadOutline className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Esporta</span>
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
                <DropdownMenuItem
                  onSelect={onExportPdf}
                  className="cursor-pointer"
                >
                  Esporta PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!showEditActions && columns.length > MAX_VISIBLE_COLUMNS && (
            <EditableTableColumnVisibilityDropdown
              columns={columns}
              visibleColumnIds={visibleColumnIds}
              maxVisibleColumns={MAX_VISIBLE_COLUMNS}
              onVisibilityChange={onColumnVisibilityChange}
              onShowAll={onShowAllColumns}
              onShowDefault={onShowDefaultColumns}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {!showEditActions && rightActions}
          {isModify && !showEditActions && !alwaysEdit && !isEditMode && (
            <Button
              onClick={onToggleEditMode}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
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
          {showEditActions && (
            <>
              <Button
                variant="ghost"
                onClick={onCancel}
                className="text-gray-600 hover:text-gray-900"
              >
                Annulla
              </Button>
              <Button onClick={onSave} disabled={false}>
                Salva
              </Button>
            </>
          )}
        </div>
      </div>
      <table data-slot="table" className={cn("w-full caption-bottom text-sm")}>
        <thead
          data-slot="table-header"
          className={cn("border-b border-agri-green-50")}
        >
          <TableRow className={cn("transition-colors")}>
            <TableHead
              className={cn(
                "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] text-left w-[250px] min-w-[200px]"
              )}
            >
              Field
            </TableHead>
            {rows.map((row, idx) => (
              <TableHead
                key={row.id}
                className={cn(
                  "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px]",
                  "text-left min-w-[250px]"
                )}
              >
                {getRowHeaderLabel(row, idx, getRowId)}
              </TableHead>
            ))}
          </TableRow>
        </thead>
        <tbody
          data-slot="table-body"
          className={cn("divide-y divide-border/15")}
        >
          {visibleColumns.map((c) => {
            return (
              <TableRow
                key={c.id}
                className={cn(
                  "transition-colors hover:bg-muted/30 border-agri-green-50 bg-white"
                )}
              >
                <td
                  data-slot="table-cell"
                  className={cn(
                    "p-3 align-middle text-left w-[250px] min-w-[200px]"
                  )}
                >
                  <div className="text-muted-foreground font-semibold text-[14px] break-words">
                    <span>
                      {c.title}
                      {c.required ? (
                        <span className="text-red-500 ml-1">*</span>
                      ) : null}
                    </span>
                  </div>
                </td>
                {rows.map((row) => (
                  <td
                    key={row.id}
                    data-slot="table-cell"
                    className={cn(
                      "p-3 align-middle text-left break-words min-w-[250px]"
                    )}
                  >
                    {isModify && (isEditMode || alwaysEdit) && !c.readOnly ? (
                      <EditableTableCell
                        row={row}
                        column={c}
                        columns={columns}
                        touched={touched}
                        onChange={onCellChange}
                      />
                    ) : (
                      renderReadOnlyCell(c, row.data[c.id], row)
                    )}
                  </td>
                ))}
              </TableRow>
            );
          })}
          {hasLast && (
            <TableRow
              className={cn(
                "transition-colors hover:bg-muted/30 border-agri-green-50 bg-white"
              )}
            >
              <td
                data-slot="table-cell"
                className={cn(
                  "p-3 align-middle text-left w-[250px] min-w-[200px]"
                )}
              >
                <div className="text-muted-foreground font-semibold text-[14px]">
                  Actions
                </div>
              </td>
              {rows.map((row) => (
                <td
                  key={row.id}
                  data-slot="table-cell"
                  className={cn("p-3 align-middle text-left min-w-[250px]")}
                >
                  {typeof lastComponent === "function"
                    ? (
                        lastComponent as (
                          r: Record<string, unknown>
                        ) => React.ReactNode
                      )(row.data)
                    : lastComponent}
                </td>
              ))}
            </TableRow>
          )}
        </tbody>
      </table>

      {showAddButton && (
        <div className="sticky left-0 bottom-0 w-full border-t border-agri-green-50 inset-shadow-xs border-border/30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-2 py-2">
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={onAddClick}
              aria-label="Aggiungi"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Aggiungi</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
