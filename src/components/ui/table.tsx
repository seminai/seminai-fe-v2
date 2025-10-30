import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { IoOpenOutline } from "react-icons/io5";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b border-agri-green-50", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0 ", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0 border-agri-green-50",
        className
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b  transition-colors",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};

// EditableTable - Notion-like editable table with bulk add/save
// The component follows an OOP approach using a React Class.

export type EditableCellType =
  | "text"
  | "number"
  | "select"
  | "date"
  | "currency";

export interface EditableColumn {
  id: string;
  title: string;
  type?: EditableCellType;
  required?: boolean;
  width?: string;
  options?: Array<{ label: string; value: string }> | string[]; // for select
  placeholder?: string;
  // Optional read-only renderer
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface EditableTableProps {
  columns: EditableColumn[];
  rows?: Array<Record<string, unknown>>;
  isModify?: boolean;
  isVertical?: boolean;
  addButton?: boolean;
  lastComponent?:
    | React.ReactNode
    | ((row: Record<string, unknown>) => React.ReactNode);
  getRowId?: (row: Record<string, unknown>, index: number) => string | number;
  onSave?: (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => void;
  onDeleteSelected?: (removed: Array<Record<string, unknown>>) => void;
  newRowDefaults?: Partial<Record<string, unknown>>;
  detailsRenderer?: (row: Record<string, unknown>) => React.ReactNode;
  detailsTitle?: string;
  className?: string;
}

interface InternalRow {
  id: string;
  data: Record<string, unknown>;
  isNew: boolean;
  isDirty: boolean;
}

interface EditableTableState {
  rows: InternalRow[];
  touched: Record<string, Record<string, boolean>>; // rowId -> colId -> touched
  selected: Record<string, boolean>; // rowId -> selected
  isEditMode: boolean; // Modalità modifica globale
  drawerOpen: boolean;
  drawerRow?: InternalRow;
  sortColumn?: string; // Colonna ordinata
  sortDirection: "asc" | "desc"; // Direzione ordinamento
}

export class EditableTable extends React.Component<
  EditableTableProps,
  EditableTableState
> {
  static defaultProps: Partial<EditableTableProps> = {
    rows: [],
    isModify: false,
    isVertical: false,
    addButton: false,
    getRowId: (_row: Record<string, unknown>, index: number) => index,
    newRowDefaults: {},
  };

  constructor(props: EditableTableProps) {
    super(props);
    const initialRows: InternalRow[] = (props.rows || []).map((r, idx) => ({
      id: String(props.getRowId ? props.getRowId(r, idx) : idx),
      data: { ...r },
      isNew: false,
      isDirty: false,
    }));
    this.state = {
      rows: initialRows,
      touched: {},
      selected: {},
      isEditMode: false,
      drawerOpen: false,
      drawerRow: undefined,
      sortColumn: undefined,
      sortDirection: "asc",
    };
  }

  componentDidUpdate(prevProps: EditableTableProps): void {
    // Update internal state when rows prop changes (e.g., filtering)
    if (prevProps.rows !== this.props.rows) {
      const newRows: InternalRow[] = (this.props.rows || []).map((r, idx) => ({
        id: String(this.props.getRowId ? this.props.getRowId(r, idx) : idx),
        data: { ...r },
        isNew: false,
        isDirty: false,
      }));
      this.setState({
        rows: newRows,
        touched: {},
        selected: {},
        isEditMode: false,
        sortColumn: undefined,
        sortDirection: "asc",
      });
    }
  }

  private generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Metodo pubblico per aggiungere righe programmaticamente (es. da CSV import)
   */
  public addRows = (rowsData: Array<Record<string, unknown>>): void => {
    const newRows: InternalRow[] = rowsData.map((data) => ({
      id: this.generateTempId(),
      data: { ...data },
      isNew: true,
      isDirty: true,
    }));

    this.setState((prev) => {
      const touched = { ...prev.touched };
      newRows.forEach((row) => {
        touched[row.id] = Object.fromEntries(
          this.props.columns.map((c) => [c.id, true])
        );
      });

      return {
        rows: [...prev.rows, ...newRows],
        touched,
      };
    });
  };

  private addNewRow = (): void => {
    const empty: Record<string, unknown> = {};
    for (const col of this.props.columns) {
      empty[col.id] = (this.props.newRowDefaults || {})[col.id] ?? "";
    }
    const newRow: InternalRow = {
      id: this.generateTempId(),
      data: empty,
      isNew: true,
      isDirty: true,
    };
    this.setState((prev) => ({
      rows: [...prev.rows, newRow],
      touched: {
        ...prev.touched,
        [newRow.id]: Object.fromEntries(
          this.props.columns.map((c) => [c.id, true]) // required highlight immediately
        ),
      },
    }));
  };

  private setCellValue = (
    rowId: string,
    colId: string,
    value: unknown
  ): void => {
    this.setState((prev) => ({
      rows: prev.rows.map((r) =>
        r.id === rowId
          ? { ...r, isDirty: true, data: { ...r.data, [colId]: value } }
          : r
      ),
      touched: {
        ...prev.touched,
        [rowId]: { ...(prev.touched[rowId] || {}), [colId]: true },
      },
    }));
  };

  private toggleRowSelection = (rowId: string, value: boolean): void => {
    this.setState((prev) => ({
      selected: { ...prev.selected, [rowId]: value },
    }));
  };

  private toggleSelectAll = (value: boolean): void => {
    this.setState((prev) => ({
      selected: Object.fromEntries(prev.rows.map((r) => [r.id, value])),
    }));
  };

  private toggleEditMode = (): void => {
    this.setState((prev) => ({
      isEditMode: !prev.isEditMode,
    }));
  };

  private get selectedIds(): string[] {
    return Object.entries(this.state.selected)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
  }

  private handleDelete = (): void => {
    const ids = new Set(this.selectedIds);
    if (ids.size === 0) return;
    const removed: InternalRow[] = this.state.rows.filter((r) => ids.has(r.id));
    if (this.props.onDeleteSelected) {
      this.props.onDeleteSelected(removed.map((r) => r.data));
    }
    this.setState((prev) => ({
      rows: prev.rows.filter((r) => !ids.has(r.id)),
      selected: {},
      touched: Object.fromEntries(
        Object.entries(prev.touched).filter(([rid]) => !ids.has(rid))
      ),
    }));
  };

  private openDetails = (row: InternalRow): void => {
    this.setState({ drawerOpen: true, drawerRow: row });
  };

  private closeDetails = (open: boolean): void => {
    this.setState({ drawerOpen: open });
  };

  private handleSort = (columnId: string): void => {
    this.setState((prev) => {
      const isSameColumn = prev.sortColumn === columnId;
      const newDirection: "asc" | "desc" = isSameColumn
        ? prev.sortDirection === "asc"
          ? "desc"
          : "asc"
        : "asc";

      const column = this.props.columns.find((c) => c.id === columnId);
      const sortedRows = [...prev.rows].sort((a, b) => {
        const aVal = a.data[columnId];
        const bVal = b.data[columnId];

        // Handle null/undefined values
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;

        // Sort based on column type
        switch (column?.type) {
          case "number":
          case "currency":
            comparison = Number(aVal) - Number(bVal);
            break;
          case "date": {
            const dateA = new Date(String(aVal)).getTime();
            const dateB = new Date(String(bVal)).getTime();
            comparison = dateA - dateB;
            break;
          }
          case "text":
          default:
            comparison = String(aVal).localeCompare(String(bVal));
            break;
        }

        return newDirection === "asc" ? comparison : -comparison;
      });

      return {
        rows: sortedRows,
        sortColumn: columnId,
        sortDirection: newDirection,
      };
    });
  };

  private get hasDirtyRows(): boolean {
    return this.state.rows.some((r) => r.isDirty);
  }

  private validateRow(row: InternalRow): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const col of this.props.columns) {
      if (col.required) {
        const v = row.data[col.id];
        const isEmpty =
          v === undefined || v === null || String(v).trim() === "";
        if (isEmpty) errors[col.id] = "Required";
      }
    }
    return errors;
  }

  private get hasErrors(): boolean {
    return this.state.rows.some(
      (r) => Object.keys(this.validateRow(r)).length > 0 && r.isDirty
    );
  }

  private handleSave = (): void => {
    if (!this.props.onSave) return;
    const created = this.state.rows.filter((r) => r.isNew);
    const updated = this.state.rows.filter((r) => r.isDirty && !r.isNew);
    // Prevent saving if any required field missing in dirty rows
    const invalid = [...created, ...updated].some(
      (r) => Object.keys(this.validateRow(r)).length > 0
    );
    if (invalid) return;
    this.props.onSave({
      created: created.map((r) => r.data),
      updated: updated.map((r) => r.data),
    });
    // Reset dirty flags and editing state
    this.setState((prev) => ({
      rows: prev.rows.map((r) => ({ ...r, isDirty: false, isNew: false })),
      touched: {},
      isEditMode: false,
    }));
  };

  private renderReadOnlyCell(
    col: EditableColumn,
    value: unknown,
    row: InternalRow
  ) {
    if (col.render) return col.render(value, row.data);
    if (col.type === "currency" && typeof value === "number") {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: "EUR",
        }).format(value);
      } catch {
        return String(value);
      }
    }
    return String(value ?? "");
  }

  private renderInput(row: InternalRow, col: EditableColumn) {
    const value = row.data[col.id] as unknown;
    const isTouched = this.state.touched[row.id]?.[col.id];
    const error = this.validateRow(row)[col.id];
    const baseSelectClass = cn(
      // Apple-like input styling
      "w-full file:text-foreground placeholder:text-foreground/40 dark:placeholder:text-foreground/50 selection:bg-primary selection:text-primary-foreground flex h-10 min-w-0 rounded-xl bg-white/70 dark:bg-input/30 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-3 py-2 text-base inset-shadow-xs transition-[background-color,border-color,box-shadow] outline-none md:text-sm",
      "border border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20",
      "focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 focus-visible:border-transparent",
      // invalid state
      "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
      // native select tweaks
      "appearance-none bg-clip-padding"
    );

    switch (col.type) {
      case "select": {
        const options = (col.options || []) as
          | Array<{ label: string; value: string }>
          | string[];
        type Opt = { label: string; value: string } | string;
        const normalized = Array.isArray(options)
          ? (options as Opt[]).map((o) =>
              typeof o === "string" ? { label: o, value: o } : o
            )
          : [];
        return (
          <select
            className={cn(
              baseSelectClass,
              Boolean(isTouched && error) &&
                "ring-1 ring-red-200/50 border-red-200/60"
            )}
            value={String(value ?? "")}
            aria-invalid={Boolean(isTouched && error)}
            onChange={(e) => this.setCellValue(row.id, col.id, e.target.value)}
          >
            <option value="">Select...</option>
            {normalized.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      }
      case "number":
      case "currency":
        return (
          <Input
            type="number"
            placeholder={col.placeholder}
            aria-invalid={Boolean(isTouched && error)}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => {
              const v = e.target.value === "" ? "" : Number(e.target.value);
              this.setCellValue(row.id, col.id, v);
            }}
            className={cn(
              Boolean(isTouched && error) &&
                "ring-1 ring-red-200/50 border-red-200/60"
            )}
          />
        );
      case "date":
        return (
          <Input
            type="date"
            placeholder={col.placeholder}
            aria-invalid={Boolean(isTouched && error)}
            value={value ? String(value) : ""}
            onChange={(e) => this.setCellValue(row.id, col.id, e.target.value)}
            className={cn(
              Boolean(isTouched && error) &&
                "ring-1 ring-red-200/50 border-red-200/60"
            )}
          />
        );
      case "text":
      default:
        return (
          <Input
            type="text"
            placeholder={col.placeholder}
            aria-invalid={Boolean(isTouched && error)}
            value={value ? String(value) : ""}
            onChange={(e) => this.setCellValue(row.id, col.id, e.target.value)}
            className={cn(
              Boolean(isTouched && error) &&
                "ring-1 ring-red-200/50 border-red-200/60"
            )}
          />
        );
    }
  }

  private getRowHeaderLabel(row: InternalRow, index: number): string {
    try {
      const label = this.props.getRowId
        ? this.props.getRowId(row.data, index)
        : index + 1;
      return String(label);
    } catch {
      return String(index + 1);
    }
  }

  private renderVertical(): React.ReactNode {
    const { columns, isModify, className } = this.props;
    const { rows } = this.state;
    const showSave = this.hasDirtyRows;
    const hasLast = Boolean(this.props.lastComponent);

    return (
      <div
        data-slot="table-container"
        className={cn("relative w-full rounded-lg bg-background", className)}
      >
        {/* Top action bar per modalità verticale */}
        {showSave && (
          <div className="flex items-center justify-end px-4 py-3 border-b border-agri-green-50 bg-blue-50/50">
            <div className="flex items-center gap-2">
              <Button onClick={this.handleSave} disabled={false} size="sm">
                Salva
              </Button>
            </div>
          </div>
        )}
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm")}
        >
          <thead
            data-slot="table-header"
            className={cn("border-b border-agri-green-50 ")}
          >
            <tr data-slot="table-row" className={cn("transition-colors")}>
              <th
                data-slot="table-head"
                className={cn(
                  "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] text-left w-[250px] min-w-[200px]"
                )}
              >
                Field
              </th>
              {rows.map((row, idx) => (
                <th
                  key={row.id}
                  data-slot="table-head"
                  className={cn(
                    "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px]",
                    "text-left min-w-[150px]"
                  )}
                >
                  {this.getRowHeaderLabel(row, idx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            data-slot="table-body"
            className={cn("divide-y divide-border/15 ")}
          >
            {columns.map((c) => {
              const colHasRequiredMissing = rows.some((r) => {
                if (!c.required) return false;
                const v = r.data[c.id];
                return v === undefined || v === null || String(v).trim() === "";
              });
              return (
                <tr
                  key={c.id}
                  data-slot="table-row"
                  className={cn(
                    "transition-colors hover:bg-muted/10 border-agri-green-50",
                    colHasRequiredMissing && "bg-red-50/30"
                  )}
                >
                  <td
                    data-slot="table-cell"
                    className={cn(
                      "p-3 align-top text-left w-[250px] min-w-[200px]"
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
                        "p-3 align-top text-left break-words min-w-[150px]"
                      )}
                    >
                      {isModify && this.state.isEditMode
                        ? this.renderInput(row, c)
                        : this.renderReadOnlyCell(c, row.data[c.id], row)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {hasLast ? (
              <tr
                data-slot="table-row"
                className={cn(
                  "transition-colors hover:bg-muted/10 border-agri-green-50"
                )}
              >
                <td
                  data-slot="table-cell"
                  className={cn(
                    "p-3 align-top text-left w-[250px] min-w-[200px]"
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
                    className={cn("p-3 align-top text-left min-w-[150px]")}
                  >
                    {typeof this.props.lastComponent === "function"
                      ? (
                          this.props.lastComponent as (
                            r: Record<string, unknown>
                          ) => React.ReactNode
                        )(row.data)
                      : this.props.lastComponent}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>

        {this.props.addButton && (
          <div className="sticky left-0 bottom-0 w-full border-t border-agri-green-50 inset-shadow-xs border-border/30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between px-2 py-2">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={this.addNewRow}
              >
                + New page
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  render(): React.ReactNode {
    if (this.props.isVertical) {
      return this.renderVertical();
    }
    const { columns, isModify, className } = this.props;
    const { rows } = this.state;
    const showSave = this.hasDirtyRows;
    const hasErrors = this.hasErrors;
    const anySelected = this.selectedIds.length > 0;
    const allSelected =
      rows.length > 0 && this.selectedIds.length === rows.length;
    const hasDetails = Boolean(this.props.detailsRenderer);
    const hasLast = Boolean(this.props.lastComponent);

    return (
      <div
        data-slot="table-container"
        className={cn(
          "relative w-full overflow-x-auto rounded-lg bg-background",
          className
        )}
      >
        {/* Top action bar - Pulsanti azione in alto a destra */}
        {anySelected || (isModify && rows.some((r) => !r.isNew)) || showSave ? (
          <div className="flex items-center justify-between px-4 py-3 border-b border-agri-green-50 bg-blue-50/50">
            <span className="text-sm text-gray-600">
              {anySelected
                ? `${this.selectedIds.length} element${
                    this.selectedIds.length === 1 ? "o" : "i"
                  } selezionat${this.selectedIds.length === 1 ? "o" : "i"}`
                : " "}
            </span>
            <div className="flex items-center gap-2">
              {isModify && rows.some((r) => !r.isNew) && !anySelected && (
                <Button
                  onClick={this.toggleEditMode}
                  className={cn(
                    "border",
                    this.state.isEditMode
                      ? "border-gray-500 text-gray-500 hover:bg-gray-50"
                      : "border-blue-200 text-blue-600 hover:bg-blue-50"
                  )}
                  variant="ghost"
                  size="sm"
                >
                  {this.state.isEditMode ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4 mr-2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Annulla
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4 mr-2"
                      >
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                      Modifica
                    </>
                  )}
                </Button>
              )}
              {anySelected && (
                <Button
                  onClick={this.handleDelete}
                  className={cn(
                    "border border-red-200 text-red-400 hover:bg-red-50"
                  )}
                  variant="ghost"
                  size="sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4 mr-2"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                  Elimina
                </Button>
              )}
              {showSave && (
                <Button
                  onClick={this.handleSave}
                  disabled={hasErrors}
                  size="sm"
                >
                  Salva
                </Button>
              )}
            </div>
          </div>
        ) : null}

        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm")}
        >
          <thead
            data-slot="table-header"
            className={cn("border-b border-agri-green-50 ")}
          >
            <tr data-slot="table-row" className={cn("transition-colors")}>
              <th
                data-slot="table-head"
                className={cn(
                  "h-9 px-2 text-left align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap w-8"
                )}
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => this.toggleSelectAll(Boolean(v))}
                  className="border-gray-200 "
                  aria-label="Select all rows"
                />
              </th>
              {columns.map((c) => (
                <th
                  key={c.id}
                  data-slot="table-head"
                  style={{ width: c.width }}
                  className={cn(
                    // Base header cell styles
                    "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap cursor-pointer hover:bg-muted/10 transition-colors text-left"
                  )}
                  onClick={() => this.handleSort(c.id)}
                >
                  <div className="flex items-center gap-2 justify-between">
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
                      strokeWidth="2"
                      className={cn(
                        "h-3 w-3 transition-all",
                        this.state.sortColumn === c.id
                          ? "opacity-100"
                          : "opacity-30",
                        this.state.sortColumn === c.id &&
                          this.state.sortDirection === "desc"
                          ? "rotate-180"
                          : ""
                      )}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </div>
                </th>
              ))}
              {hasDetails ? (
                <th
                  data-slot="table-head"
                  className={cn(
                    "h-9 p-3 text-left align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap w-24"
                  )}
                ></th>
              ) : null}
              {hasLast ? (
                <th
                  data-slot="table-head"
                  className={cn(
                    "h-9 p-3 text-left align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap w-24"
                  )}
                ></th>
              ) : null}
            </tr>
          </thead>
          <tbody
            data-slot="table-body"
            className={cn("divide-y divide-border/15 ")}
          >
            {rows.map((row) => {
              const rowHasRequiredMissing = this.props.columns.some((c) => {
                if (!c.required) return false;
                const v = row.data[c.id];
                return v === undefined || v === null || String(v).trim() === "";
              });
              return (
                <tr
                  key={row.id}
                  data-slot="table-row"
                  className={cn(
                    "transition-colors hover:bg-muted/10 border-agri-green-50",
                    rowHasRequiredMissing && "bg-red-50/30"
                  )}
                >
                  <td
                    data-slot="table-cell"
                    className={cn("p-2 align-middle w-8")}
                  >
                    <Checkbox
                      checked={Boolean(this.state.selected[row.id])}
                      onCheckedChange={(v) =>
                        this.toggleRowSelection(row.id, Boolean(v))
                      }
                      className="border-gray-200 "
                      aria-label="Select row"
                    />
                  </td>
                  {columns.map((c) => (
                    <td
                      key={c.id}
                      data-slot="table-cell"
                      className={cn(
                        "p-3 align-middle whitespace-nowrap text-left"
                      )}
                    >
                      {isModify && (row.isNew || this.state.isEditMode)
                        ? this.renderInput(row, c)
                        : this.renderReadOnlyCell(c, row.data[c.id], row)}
                    </td>
                  ))}
                  {hasDetails ? (
                    <td
                      data-slot="table-cell"
                      className={cn(
                        "p-3 align-middle text-left whitespace-nowrap w-24"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => this.openDetails(row)}
                      >
                        Dettagli <IoOpenOutline />
                      </Button>
                    </td>
                  ) : null}
                  {hasLast ? (
                    <td
                      data-slot="table-cell"
                      className={cn(
                        "p-3 align-middle text-left whitespace-nowrap w-24"
                      )}
                    >
                      {typeof this.props.lastComponent === "function"
                        ? (
                            this.props.lastComponent as (
                              r: Record<string, unknown>
                            ) => React.ReactNode
                          )(row.data)
                        : this.props.lastComponent}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom action row similar to Notion "New page" */}
        {this.props.addButton && (
          <div className="sticky left-0 bottom-0 w-full border-t border-agri-green-50 inset-shadow-xs border-border/30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between px-2 py-2">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={this.addNewRow}
              >
                + New page
              </Button>
            </div>
          </div>
        )}
        {hasDetails ? (
          <Drawer open={this.state.drawerOpen} onOpenChange={this.closeDetails}>
            <DrawerContent data-vaul-drawer-direction="right">
              <DrawerHeader>
                <DrawerTitle>
                  {this.props.detailsTitle || "Details"}
                </DrawerTitle>
              </DrawerHeader>
              <div className="p-4">
                {this.state.drawerRow
                  ? this.props.detailsRenderer?.(this.state.drawerRow.data)
                  : null}
              </div>
            </DrawerContent>
          </Drawer>
        ) : null}
      </div>
    );
  }
}
