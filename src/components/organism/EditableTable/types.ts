import * as React from "react";
import { DateRange } from "react-day-picker";

// ─────────────────────────────────────────────────────────────────────────────
// Cell Types
// ─────────────────────────────────────────────────────────────────────────────

export type EditableCellType =
  | "text"
  | "number"
  | "select"
  | "date"
  | "currency";

// ─────────────────────────────────────────────────────────────────────────────
// Column Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface EditableColumn {
  id: string;
  title: string;
  type?: EditableCellType;
  required?: boolean;
  width?: string;
  options?: Array<{ label: string; value: string }> | string[];
  getOptions?: (
    rowData: Record<string, unknown>
  ) => Array<{ label: string; value: string }> | string[];
  placeholder?: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  onValueChange?: (args: {
    value: unknown;
    rowData: Record<string, unknown>;
    columnId: string;
  }) => Record<string, unknown> | void;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  noneOptionLabel?: string;
  readOnly?: boolean;
  maxVisibleOptions?: number;
  keepOpenOnSelect?: (value: string) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomExportColumn {
  header: string;
  accessor: (rowData: Record<string, unknown>) => unknown;
}

export interface CustomExportConfig {
  columns: CustomExportColumn[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Table Props
// ─────────────────────────────────────────────────────────────────────────────

export interface EditableTableProps {
  columns: EditableColumn[];
  rows?: Array<Record<string, unknown>>;
  isModify?: boolean;
  isVertical?: boolean;
  addButton?: boolean;
  /**
   * Unique identifier for the table, used to persist column visibility settings in localStorage.
   * If not provided, an identifier will be automatically generated based on the current route
   * and table columns, ensuring persistence per page/table combination.
   */
  tableId?: string;
  /**
   * Controls how the "Add" action creates a new row.
   * - drawer: opens the right-side create drawer (default, legacy behavior)
   * - inline: inserts an editable row directly into the table
   */
  createMode?: "drawer" | "inline";
  onAddClick?: () => void;
  alwaysEdit?: boolean;
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
  onOpenDetails?: (row: Record<string, unknown>) => void;
  onBulkVerifySelected?: (selectedRows: Array<Record<string, unknown>>) => void;
  bulkVerifyButtonLabel?: string;
  isBulkVerifyLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
  onSelectionChange?: (selectedRows: Array<Record<string, unknown>>) => void;
  showDeleteAction?: boolean;
  /**
   * Nome dell'area/sezione usato per il nome del file esportato.
   * Il file sarà nominato come: <exportFileName>_<ddmmyy_hhmm>.<estensione>
   * Default: "export"
   */
  exportFileName?: string;
  customExportConfig?: CustomExportConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Types
// ─────────────────────────────────────────────────────────────────────────────

export type FilterInputType = "text" | "number" | "date";

export interface FilterOperatorConfig {
  value: string;
  label: string;
  inputType: FilterInputType;
  requiresSecondValue?: boolean;
}

export interface TableFilterRule {
  id: string;
  columnId: string;
  operator: string;
  value: string;
  secondaryValue?: string;
}

export interface FilterDraft {
  columnId?: string;
  operator?: string;
  value?: string;
  secondaryValue?: string;
}

export interface NormalizedSelectOption {
  label: string;
  value: string;
}

export interface SearchableValueConfig {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  noneOptionLabel: string;
}

export interface FilterPanelConfig {
  operatorOptions: Array<{ value: string; label: string }>;
  showSecondaryValueInput: boolean;
  disableAdd: boolean;
  inputType: FilterInputType;
  useValueSelect: boolean;
  valueOptions: NormalizedSelectOption[];
  systemColumns: EditableColumn[];
  searchableValueOptions: NormalizedSelectOption[];
  showSearchableValueSelect: boolean;
  searchableValueConfig?: SearchableValueConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Row Type
// ─────────────────────────────────────────────────────────────────────────────

export interface InternalRow {
  id: string;
  data: Record<string, unknown>;
  isNew: boolean;
  isDirty: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Table State Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EditableTableState {
  rows: InternalRow[];
  touched: Record<string, Record<string, boolean>>;
  selected: Record<string, boolean>;
  isEditMode: boolean;
  drawerOpen: boolean;
  drawerRow?: InternalRow;
  sortColumn?: string;
  sortDirection: "asc" | "desc";
  createDrawerOpen: boolean;
  createRow?: InternalRow;
  createTouched: Record<string, boolean>;
  filterDrawerOpen: boolean;
  activeFilters: TableFilterRule[];
  filterDraft: FilterDraft;
  systemDateRanges: Record<string, DateRange | undefined>;
  confirmDialogOpen: boolean;
  columnFilterOpen?: string;
  columnFilterSelectedValues: Record<string, Set<string>>;
  columnFilterSearchQueries: Record<string, string>;
  columnFilterDateRanges: Record<string, DateRange | undefined>;
  columnFilterSelectedDates: Record<string, Date | undefined>;
  bulkEditDrawerOpen: boolean;
  bulkEditValues: Record<string, unknown>;
  visibleColumnIds: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Ref Handle for imperative methods
// ─────────────────────────────────────────────────────────────────────────────

export interface EditableTableRef {
  addRows: (rowsData: Array<Record<string, unknown>>) => void;
  prefillCreateRow: (data: Record<string, unknown>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Searchable Column Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchableColumnMatch {
  keywords: string[];
  config: SearchableValueConfig;
}
