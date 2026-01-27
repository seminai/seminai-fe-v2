import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableRow, TableHead } from "@/components/ui/table";
import { IoOpenOutline } from "react-icons/io5";
import { DateRange } from "react-day-picker";
import { EditableColumn, InternalRow } from "../types";
import { formatDefaultCellValue, buildUniqueValueOptions } from "../utils";
import { TruncatedCellText } from "../EditableTableTruncatedCellText";
import { EditableTableColumnFilterDropdown } from "../EditableTableColumnFilterDropdown";
import { EditableTableCell } from "./EditableTableCell";

export interface EditableTableBodyProps {
  columns: EditableColumn[];
  visibleColumns: EditableColumn[];
  rows: InternalRow[];
  allRows: InternalRow[];
  selected: Record<string, boolean>;
  touched: Record<string, Record<string, boolean>>;
  isModify?: boolean;
  isEditMode: boolean;
  hasDetails: boolean;
  hasLast: boolean;
  lastComponent?:
    | React.ReactNode
    | ((row: Record<string, unknown>) => React.ReactNode);
  allSelected: boolean;
  sortColumn?: string;
  sortDirection: "asc" | "desc";
  columnFilterOpen?: string;
  columnFilterSelectedValues: Record<string, Set<string>>;
  columnFilterSearchQueries: Record<string, string>;
  columnFilterDateRanges: Record<string, DateRange | undefined>;
  columnFilterSelectedDates: Record<string, Date | undefined>;
  getRowClassName?: (row: Record<string, unknown>) => string | undefined;
  onToggleSelectAll: (value: boolean) => void;
  onToggleRowSelection: (rowId: string, value: boolean) => void;
  onCellChange: (
    row: InternalRow,
    column: EditableColumn,
    value: unknown
  ) => void;
  onOpenDetails: (row: InternalRow) => void;
  onSort: (columnId: string, direction?: "asc" | "desc") => void;
  onColumnFilterOpenChange: (columnId: string, open: boolean) => void;
  onColumnFilterSearchChange: (columnId: string, query: string) => void;
  onColumnFilterValueToggle: (columnId: string, value: string) => void;
  onColumnFilterDateRangeChange: (
    columnId: string,
    range: DateRange | undefined
  ) => void;
  onColumnFilterDateChange: (columnId: string, date: Date | undefined) => void;
  onColumnFilterClear: (columnId: string) => void;
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

export function EditableTableBody({
  columns,
  visibleColumns,
  rows,
  allRows,
  selected,
  touched,
  isModify,
  isEditMode,
  hasDetails,
  hasLast,
  lastComponent,
  allSelected,
  sortColumn,
  sortDirection,
  columnFilterOpen,
  columnFilterSelectedValues,
  columnFilterSearchQueries,
  columnFilterDateRanges,
  columnFilterSelectedDates,
  getRowClassName,
  onToggleSelectAll,
  onToggleRowSelection,
  onCellChange,
  onOpenDetails,
  onSort,
  onColumnFilterOpenChange,
  onColumnFilterSearchChange,
  onColumnFilterValueToggle,
  onColumnFilterDateRangeChange,
  onColumnFilterDateChange,
  onColumnFilterClear,
}: EditableTableBodyProps): React.ReactElement {
  return (
    <>
      <thead data-slot="table-header">
        <TableRow className={cn("transition-colors shadow-lg   ")}>
          <TableHead
            className={cn(
              "h-9 px-2 text-left align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap",
              "sticky top-0 left-0 z-30 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] bg-agri-green-50 rounded-tl-lg",
              "w-8"
            )}
          >
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) => onToggleSelectAll(Boolean(v))}
              className="border-gray-200"
              aria-label="Select all rows"
            />
          </TableHead>
          {visibleColumns.map((c) => {
            const uniqueValues = buildUniqueValueOptions(c.id, allRows);
            const selectedValues =
              columnFilterSelectedValues[c.id] || new Set<string>();
            const searchQuery = columnFilterSearchQueries[c.id] || "";
            const isFilterOpen = columnFilterOpen === c.id;
            const isDateColumn = c.type === "date";
            const dateRange = columnFilterDateRanges[c.id];
            const selectedDate = columnFilterSelectedDates[c.id];
            const hasActiveFilter = isDateColumn
              ? Boolean(dateRange?.from || selectedDate)
              : selectedValues.size > 0;

            return (
              <TableHead
                key={c.id}
                style={{ width: c.width, minWidth: c.width || "250px" }}
                className={cn(
                  "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap text-left",
                  "sticky top-0 bg-agri-green-50 z-10",
                  hasActiveFilter && "bg-blue-50"
                )}
              >
                <EditableTableColumnFilterDropdown
                  column={c}
                  uniqueValues={uniqueValues}
                  selectedValues={selectedValues}
                  searchQuery={searchQuery}
                  onSearchChange={(query) =>
                    onColumnFilterSearchChange(c.id, query)
                  }
                  onValueToggle={(value) =>
                    onColumnFilterValueToggle(c.id, value)
                  }
                  onSort={(direction) => onSort(c.id, direction)}
                  onApply={() => {}}
                  onClearFilter={() => onColumnFilterClear(c.id)}
                  currentSortColumn={sortColumn}
                  currentSortDirection={sortDirection}
                  isOpen={isFilterOpen}
                  onOpenChange={(open) => onColumnFilterOpenChange(c.id, open)}
                  dateRange={dateRange}
                  onDateRangeChange={(range) =>
                    onColumnFilterDateRangeChange(c.id, range)
                  }
                  selectedDate={selectedDate}
                  onDateChange={(date) => onColumnFilterDateChange(c.id, date)}
                >
                  <div className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/10 transition-colors rounded px-1 py-0.5 -mx-1">
                    <span>
                      {c.title}
                      {c.required ? (
                        <span className="text-red-500 ml-1">*</span>
                      ) : null}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className={cn(
                        "h-4 w-4 transition-all flex-shrink-0",
                        sortColumn === c.id
                          ? "opacity-100 text-blue-600"
                          : "opacity-60 hover:opacity-80",
                        sortColumn === c.id && sortDirection === "desc"
                          ? "rotate-180"
                          : "",
                        hasActiveFilter && "text-blue-600 opacity-100"
                      )}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </div>
                </EditableTableColumnFilterDropdown>
              </TableHead>
            );
          })}
          {hasLast && (
            <TableHead
              className={cn(
                "h-9 p-3 text-left align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap w-24",
                "sticky top-0 bg-agri-green-50 z-10",
                !hasDetails && "right-0 z-20 rounded-tr-lg"
              )}
            />
          )}
          {hasDetails && (
            <TableHead
              className={cn(
                "h-9 p-3 text-left align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap w-24",
                "sticky top-0 right-0 bg-agri-green-50 z-20 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] rounded-tr-lg"
              )}
            />
          )}
        </TableRow>
      </thead>
      <tbody data-slot="table-body" className={cn("divide-y divide-border/15")}>
        {rows.map((row) => {
          const rowHasRequiredMissing = columns.some((c) => {
            if (!c.required) return false;
            const v = row.data[c.id];
            return v === undefined || v === null || String(v).trim() === "";
          });

          const customRowClassName = getRowClassName?.(row.data);

          return (
            <TableRow
              key={row.id}
              className={cn(
                "group bg-white transition-colors hover:bg-agri-green-50 border-agri-green-100",
                rowHasRequiredMissing && "bg-red-50/30",
                customRowClassName
              )}
            >
              <td
                data-slot="table-cell"
                className={cn(
                  "p-2 align-middle sticky left-0 bg-white group-hover:bg-agri-green-50 transition-colors z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                  "w-8"
                )}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(selected[row.id])}
                    onCheckedChange={(v) =>
                      onToggleRowSelection(row.id, Boolean(v))
                    }
                    className="border-gray-200"
                    aria-label="Select row"
                  />
                </div>
              </td>
              {visibleColumns.map((c) => (
                <td
                  key={c.id}
                  data-slot="table-cell"
                  style={{ minWidth: c.width || "250px" }}
                  className={cn(
                    "p-3 align-middle text-left",
                    c.type !== "text" && "whitespace-nowrap"
                  )}
                >
                  {isModify && (row.isNew || isEditMode) && !c.readOnly ? (
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
              {hasLast && (
                <td
                  data-slot="table-cell"
                  className={cn(
                    "p-3 align-middle text-left whitespace-nowrap w-24",
                    !hasDetails && "sticky right-0"
                  )}
                >
                  {typeof lastComponent === "function"
                    ? (
                        lastComponent as (
                          r: Record<string, unknown>
                        ) => React.ReactNode
                      )(row.data)
                    : lastComponent}
                </td>
              )}
              {hasDetails && (
                <td
                  data-slot="table-cell"
                  className={cn(
                    "p-3 align-middle text-center whitespace-nowrap w-24",
                    "sticky right-0 bg-white group-hover:bg-agri-green-50 transition-colors shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] rounded-tr-lg"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs whitespace-nowrap cursor-pointer"
                    onClick={() => onOpenDetails(row)}
                    aria-label="Apri dettagli"
                  >
                    <span className="hidden sm:inline sm:mr-1">Apri</span>
                    <IoOpenOutline className="h-3 w-3" />
                  </Button>
                </td>
              )}
            </TableRow>
          );
        })}
      </tbody>
    </>
  );
}
