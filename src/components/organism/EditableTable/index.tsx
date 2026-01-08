import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IoOpenOutline, IoDownloadOutline } from "react-icons/io5";
import { SearchableSelect } from "@/components/ui/searchable-select";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  CheckCircle2,
  Loader2,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { EditableTableFiltersPanel } from "./EditableTableFiltersPanel";
import { TruncatedCellText } from "./EditableTableTruncatedCellText";
import { AutoExpandTextarea } from "./EditableTableAutoExpandTextarea";
import { EditableTableCreateDrawer } from "./EditableTableCreateDrawer";
import { EditableTableColumnFilterDropdown } from "./EditableTableColumnFilterDropdown";

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
  getOptions?: (
    rowData: Record<string, unknown>
  ) => Array<{ label: string; value: string }> | string[]; // dynamic select options
  placeholder?: string;
  // Optional read-only renderer
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
  readOnly?: boolean; // Column is always read-only even in edit mode
  maxVisibleOptions?: number; // Limit visible options in searchable select for performance
  keepOpenOnSelect?: (value: string) => boolean; // Funzione per determinare se mantenere aperta la select dopo la selezione
}

export interface CustomExportColumn {
  header: string;
  accessor: (rowData: Record<string, unknown>) => unknown;
}

export interface CustomExportConfig {
  columns: CustomExportColumn[];
}

export interface EditableTableProps {
  columns: EditableColumn[];
  rows?: Array<Record<string, unknown>>;
  isModify?: boolean;
  isVertical?: boolean;
  addButton?: boolean;
  /**
   * Controls how the "Add" action creates a new row.
   * - drawer: opens the right-side create drawer (default, legacy behavior)
   * - inline: inserts an editable row directly into the table
   */
  createMode?: "drawer" | "inline";
  onAddClick?: () => void;
  alwaysEdit?: boolean; // Force edit mode without toggle (useful for vertical detail views)
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
  onOpenDetails?: (row: Record<string, unknown>) => void; // Callback per gestire l'apertura dei dettagli
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

interface FilterPanelConfig {
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

const TEXT_FILTER_OPERATORS: FilterOperatorConfig[] = [
  { value: "contains", label: "Contiene", inputType: "text" },
  { value: "equals", label: "Uguale a", inputType: "text" },
  { value: "startsWith", label: "Inizia con", inputType: "text" },
  { value: "endsWith", label: "Termina con", inputType: "text" },
];

const NUMBER_FILTER_OPERATORS: FilterOperatorConfig[] = [
  { value: "equals", label: "Uguale a", inputType: "number" },
  { value: "greaterThan", label: "Maggiore di", inputType: "number" },
  { value: "lessThan", label: "Minore di", inputType: "number" },
  {
    value: "between",
    label: "Compreso tra",
    inputType: "number",
    requiresSecondValue: true,
  },
];

const DATE_FILTER_OPERATORS: FilterOperatorConfig[] = [
  { value: "on", label: "In data", inputType: "date" },
  { value: "before", label: "Prima di", inputType: "date" },
  { value: "after", label: "Dopo il", inputType: "date" },
  {
    value: "between",
    label: "Intervallo",
    inputType: "date",
    requiresSecondValue: true,
  },
];

const SYSTEM_DATE_COLUMNS: EditableColumn[] = [
  { id: "createdAt", title: "Creato il", type: "date" },
  { id: "updatedAt", title: "Aggiornato il", type: "date" },
];

interface SearchableColumnMatch {
  keywords: string[];
  config: SearchableValueConfig;
}

const SEARCHABLE_COLUMN_CONFIGS: SearchableColumnMatch[] = [
  {
    keywords: ["company", "companyname", "companies", "azienda", "aziende"],
    config: {
      label: "Ricerca aziende",
      placeholder: "Seleziona azienda",
      searchPlaceholder: "Cerca azienda...",
      emptyMessage: "Nessuna azienda trovata",
      noneOptionLabel: "Nessuna selezione",
    },
  },
  {
    keywords: [
      "productionunit",
      "productionunits",
      "unitaproduttiva",
      "unitaproduttive",
      "stabilimento",
      "stabilimenti",
    ],
    config: {
      label: "Ricerca unita produttive",
      placeholder: "Seleziona unita produttiva",
      searchPlaceholder: "Cerca unita produttiva...",
      emptyMessage: "Nessuna unita produttiva trovata",
      noneOptionLabel: "Nessuna selezione",
    },
  },
  {
    keywords: [
      "product",
      "products",
      "prodotto",
      "prodotti",
      "coltura",
      "colture",
    ],
    config: {
      label: "Ricerca prodotti",
      placeholder: "Seleziona prodotto",
      searchPlaceholder: "Cerca prodotto...",
      emptyMessage: "Nessun prodotto trovato",
      noneOptionLabel: "Nessuna selezione",
    },
  },
  {
    keywords: [
      "field",
      "fields",
      "campo",
      "campi",
      "appezzamento",
      "appezzamenti",
      "lotto",
      "lotti",
    ],
    config: {
      label: "Ricerca campi",
      placeholder: "Seleziona campo",
      searchPlaceholder: "Cerca campo...",
      emptyMessage: "Nessun campo trovato",
      noneOptionLabel: "Nessuna selezione",
    },
  },
  {
    keywords: ["city", "cities", "citta", "comune", "comuni", "municipality"],
    config: {
      label: "Ricerca citta",
      placeholder: "Seleziona citta",
      searchPlaceholder: "Cerca citta...",
      emptyMessage: "Nessuna citta trovata",
      noneOptionLabel: "Nessuna selezione",
    },
  },
];

export interface InternalRow {
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
  createDrawerOpen: boolean;
  createRow?: InternalRow;
  createTouched: Record<string, boolean>;
  filterDrawerOpen: boolean;
  activeFilters: TableFilterRule[];
  filterDraft: FilterDraft;
  systemDateRanges: Record<string, DateRange | undefined>;
  confirmDialogOpen: boolean;
  columnFilterOpen?: string; // Colonna con filtro aperto
  columnFilterSelectedValues: Record<string, Set<string>>; // Valori selezionati per colonna
  columnFilterSearchQueries: Record<string, string>; // Query di ricerca per colonna
  columnFilterDateRanges: Record<string, DateRange | undefined>; // Range di date per colonna
  columnFilterSelectedDates: Record<string, Date | undefined>; // Date singole per colonna
  // Bulk edit state
  bulkEditDrawerOpen: boolean;
  bulkEditValues: Record<string, unknown>;
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
    createMode: "drawer",
    alwaysEdit: false,
    getRowId: (_row: Record<string, unknown>, index: number) => index,
    newRowDefaults: {},
    showDeleteAction: true,
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
      createDrawerOpen: false,
      createRow: undefined,
      createTouched: {},
      filterDrawerOpen: false,
      activeFilters: [],
      filterDraft: this.createEmptyFilterDraft(),
      systemDateRanges: this.createInitialSystemRanges(),
      confirmDialogOpen: false,
      columnFilterOpen: undefined,
      columnFilterSelectedValues: {},
      columnFilterSearchQueries: {},
      columnFilterDateRanges: {},
      columnFilterSelectedDates: {},
      bulkEditDrawerOpen: false,
      bulkEditValues: {},
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

      // Se la drawer è aperta, aggiorna anche drawerRow con i nuovi dati
      let updatedDrawerRow = this.state.drawerRow;
      if (this.state.drawerOpen && this.state.drawerRow) {
        const updatedRow = newRows.find(
          (r) => r.id === this.state.drawerRow?.id
        );
        if (updatedRow) {
          updatedDrawerRow = updatedRow;
        }
      }

      this.setState(
        {
          rows: newRows,
          touched: {},
          selected: {},
          isEditMode: false,
          sortColumn: undefined,
          sortDirection: "asc",
          drawerRow: updatedDrawerRow,
          columnFilterOpen: undefined,
          columnFilterSelectedValues: {},
          columnFilterSearchQueries: {},
          columnFilterDateRanges: {},
          columnFilterSelectedDates: {},
        },
        this.notifySelectionChange
      );
    }
  }

  private createEmptyFilterDraft(): FilterDraft {
    return {
      columnId: undefined,
      operator: undefined,
      value: "",
      secondaryValue: "",
    };
  }

  private createInitialSystemRanges(): Record<string, DateRange | undefined> {
    return SYSTEM_DATE_COLUMNS.reduce((acc, column) => {
      acc[column.id] = undefined;
      return acc;
    }, {} as Record<string, DateRange | undefined>);
  }

  private normalizeSelectOptions(
    rawOptions?: Array<{ label: string; value: string }> | string[]
  ): NormalizedSelectOption[] {
    if (!rawOptions) {
      return [];
    }
    return rawOptions.map((option) =>
      typeof option === "string" ? { label: option, value: option } : option
    );
  }

  private getColumnOptions(column?: EditableColumn): NormalizedSelectOption[] {
    if (!column || !column.options) {
      return [];
    }
    return this.normalizeSelectOptions(column.options);
  }

  private getRowSelectOptions(
    column: EditableColumn,
    row?: InternalRow
  ): NormalizedSelectOption[] {
    if (column.getOptions && row) {
      return this.normalizeSelectOptions(column.getOptions(row.data));
    }
    return this.getColumnOptions(column);
  }

  private buildUniqueValueOptions(columnId?: string): NormalizedSelectOption[] {
    if (!columnId) {
      return [];
    }
    const uniqueValues = new Set<string>();
    this.state.rows.forEach((row) => {
      const rawValue = row.data[columnId];
      if (rawValue === undefined || rawValue === null) {
        return;
      }
      const parsedValue = String(rawValue).trim();
      if (parsedValue) {
        uniqueValues.add(parsedValue);
      }
    });
    return Array.from(uniqueValues)
      .sort((first, second) =>
        first.localeCompare(second, "it", { sensitivity: "base" })
      )
      .map((value) => ({ label: value, value }));
  }

  private normalizeSearchableText(value?: string): string {
    return (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s_-]+/g, "");
  }

  private getSearchableValueConfig(
    column?: EditableColumn
  ): SearchableValueConfig | undefined {
    if (!column) {
      return undefined;
    }
    const normalizedId = this.normalizeSearchableText(column.id);
    const normalizedTitle = this.normalizeSearchableText(column.title || "");
    return SEARCHABLE_COLUMN_CONFIGS.find(({ keywords }) =>
      keywords.some(
        (keyword) =>
          normalizedId.includes(keyword) || normalizedTitle.includes(keyword)
      )
    )?.config;
  }

  private shouldShowSearchableValueSelect(column?: EditableColumn): boolean {
    return Boolean(this.getSearchableValueConfig(column));
  }

  private getSearchableValueOptions(
    column?: EditableColumn
  ): NormalizedSelectOption[] {
    if (!column || !this.shouldShowSearchableValueSelect(column)) {
      return [];
    }
    return this.buildUniqueValueOptions(column.id);
  }

  private buildFilterPanelConfig(): FilterPanelConfig {
    const { filterDraft } = this.state;
    const selectedColumn = this.getColumnById(filterDraft.columnId);
    const operatorOptions = this.getOperatorsForColumn(selectedColumn);
    const selectedOperator = operatorOptions.find(
      (operator) => operator.value === filterDraft.operator
    );
    const columnOptions = this.getColumnOptions(selectedColumn);
    const shouldUseSelect = columnOptions.length > 0;
    const disableAdd =
      !filterDraft.columnId ||
      !filterDraft.operator ||
      !(filterDraft.value && filterDraft.value.trim()) ||
      (Boolean(selectedOperator?.requiresSecondValue) &&
        !(filterDraft.secondaryValue && filterDraft.secondaryValue.trim()));

    const inputType =
      selectedOperator?.inputType === "number"
        ? "number"
        : selectedOperator?.inputType === "date"
        ? "date"
        : "text";
    const operatorOptionItems = operatorOptions.map(({ value, label }) => ({
      value,
      label,
    }));
    const searchableValueConfig = this.getSearchableValueConfig(selectedColumn);
    const showSearchableValueSelect = Boolean(searchableValueConfig);
    const searchableValueOptions =
      this.getSearchableValueOptions(selectedColumn);
    const systemColumns = this.getAvailableSystemDateColumns();

    return {
      operatorOptions: operatorOptionItems,
      showSecondaryValueInput: Boolean(selectedOperator?.requiresSecondValue),
      disableAdd,
      inputType,
      useValueSelect: shouldUseSelect,
      valueOptions: columnOptions,
      systemColumns,
      searchableValueOptions,
      showSearchableValueSelect,
      searchableValueConfig,
    };
  }

  private renderFiltersPanel(): React.ReactNode {
    const config = this.buildFilterPanelConfig();
    return (
      <EditableTableFiltersPanel
        open={this.state.filterDrawerOpen}
        columns={this.props.columns}
        activeFilters={this.state.activeFilters}
        filterDraft={this.state.filterDraft}
        operatorOptions={config.operatorOptions}
        selectedOperatorValue={this.state.filterDraft.operator ?? ""}
        showSecondaryValueInput={config.showSecondaryValueInput}
        disableAdd={config.disableAdd}
        inputType={config.inputType}
        useValueSelect={config.useValueSelect}
        valueOptions={config.valueOptions}
        systemColumns={config.systemColumns}
        systemDateRanges={this.state.systemDateRanges}
        searchableValueOptions={config.searchableValueOptions}
        showSearchableValueSelect={config.showSearchableValueSelect}
        searchableValueConfig={config.searchableValueConfig}
        onDrawerOpenChange={this.handleFilterDrawerChange}
        onFilterDraftChange={this.handleFilterDraftChange}
        onAddFilter={this.addFilter}
        onRemoveFilter={this.removeFilter}
        onClearFilters={this.clearFilters}
        onSystemDateRangeChange={this.handleSystemDateRangeChange}
        formatFilterLabel={this.formatFilterLabel}
      />
    );
  }

  private hasColumnData(columnId: string): boolean {
    return this.state.rows.some((row) => {
      const value = row.data[columnId];
      if (value === undefined || value === null) {
        return false;
      }
      if (typeof value === "string") {
        return value.trim() !== "";
      }
      return true;
    });
  }

  private isSystemDateColumn(columnId: string): boolean {
    return SYSTEM_DATE_COLUMNS.some((column) => column.id === columnId);
  }

  private getAvailableSystemDateColumns(): EditableColumn[] {
    return SYSTEM_DATE_COLUMNS.filter((column) =>
      this.hasColumnData(column.id)
    );
  }

  private getColumnById(columnId?: string): EditableColumn | undefined {
    if (!columnId) {
      return undefined;
    }
    const column =
      this.props.columns.find((item) => item.id === columnId) ??
      SYSTEM_DATE_COLUMNS.find((item) => item.id === columnId);
    if (
      column &&
      this.isSystemDateColumn(column.id) &&
      !this.hasColumnData(column.id)
    ) {
      return undefined;
    }
    return column;
  }

  private getOperatorsForColumn(
    column?: EditableColumn
  ): FilterOperatorConfig[] {
    if (!column) {
      return TEXT_FILTER_OPERATORS;
    }
    switch (column.type) {
      case "number":
      case "currency":
        return NUMBER_FILTER_OPERATORS;
      case "date":
        return DATE_FILTER_OPERATORS;
      default:
        return TEXT_FILTER_OPERATORS;
    }
  }

  private toDateValue(value: unknown): number | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const timestamp = new Date(String(value)).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  private applyTextFilter(value: unknown, filter: TableFilterRule): boolean {
    const source = String(value ?? "").toLowerCase();
    const target = (filter.value ?? "").toLowerCase();
    if (!target) {
      return true;
    }
    switch (filter.operator) {
      case "equals":
        return source === target;
      case "startsWith":
        return source.startsWith(target);
      case "endsWith":
        return source.endsWith(target);
      case "contains":
      default:
        return source.includes(target);
    }
  }

  private applyNumericFilter(value: unknown, filter: TableFilterRule): boolean {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return false;
    }

    const first = Number(filter.value);
    if (filter.operator !== "between" && Number.isNaN(first)) {
      return false;
    }

    switch (filter.operator) {
      case "equals":
        return numericValue === first;
      case "greaterThan":
        return numericValue > first;
      case "lessThan":
        return numericValue < first;
      case "between": {
        const second = Number(filter.secondaryValue);
        if (Number.isNaN(first) || Number.isNaN(second)) {
          return false;
        }
        const min = Math.min(first, second);
        const max = Math.max(first, second);
        return numericValue >= min && numericValue <= max;
      }
      default:
        return false;
    }
  }

  private applyDateFilter(value: unknown, filter: TableFilterRule): boolean {
    const cellDate = this.toDateValue(value);
    if (cellDate === null) {
      return false;
    }
    const first = this.toDateValue(filter.value);

    switch (filter.operator) {
      case "on":
        return first !== null && cellDate === first;
      case "before":
        return first !== null && cellDate < first;
      case "after":
        return first !== null && cellDate > first;
      case "between": {
        const second = this.toDateValue(filter.secondaryValue);
        if (first === null || second === null) {
          return false;
        }
        const min = Math.min(first, second);
        const max = Math.max(first, second);
        return cellDate >= min && cellDate <= max;
      }
      default:
        return false;
    }
  }

  private doesRowMatchFilter(
    row: InternalRow,
    filter: TableFilterRule
  ): boolean {
    const column = this.getColumnById(filter.columnId);
    const columnType = column?.type ?? "text";
    const value = row.data[filter.columnId];

    if (value === undefined || value === null || value === "") {
      return false;
    }

    switch (columnType) {
      case "number":
      case "currency":
        return this.applyNumericFilter(value, filter);
      case "date":
        return this.applyDateFilter(value, filter);
      default:
        return this.applyTextFilter(value, filter);
    }
  }

  private matchesFilters(
    row: InternalRow,
    filters: TableFilterRule[]
  ): boolean {
    if (filters.length === 0) {
      return true;
    }
    return filters.every((filter) => this.doesRowMatchFilter(row, filter));
  }

  private toDateObject(value: unknown): Date | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private isDateInRange(date: Date, range: DateRange): boolean {
    if (!range.from || !range.to) {
      return false;
    }
    const dateTime = date.getTime();
    const fromTime = range.from.getTime();
    const toTime = range.to.getTime();
    const minTime = Math.min(fromTime, toTime);
    const maxTime = Math.max(fromTime, toTime);
    return dateTime >= minTime && dateTime <= maxTime;
  }

  private matchesColumnFilters(row: InternalRow): boolean {
    const {
      columnFilterSelectedValues,
      columnFilterDateRanges,
      columnFilterSelectedDates,
    } = this.state;

    // Controlla filtri per valori selezionati (non date)
    for (const [columnId, selectedValues] of Object.entries(
      columnFilterSelectedValues
    )) {
      const column = this.getColumnById(columnId);
      if (column?.type === "date") {
        continue; // Le date sono gestite separatamente
      }
      if (selectedValues.size === 0) {
        continue; // Nessun filtro per questa colonna
      }
      const cellValue = String(row.data[columnId] ?? "").trim();
      if (!selectedValues.has(cellValue)) {
        return false; // Il valore della cella non è tra quelli selezionati
      }
    }

    // Controlla filtri per date range
    for (const [columnId, dateRange] of Object.entries(
      columnFilterDateRanges
    )) {
      if (!dateRange) {
        continue;
      }
      const cellDate = this.toDateObject(row.data[columnId]);
      if (!cellDate) {
        return false; // La cella non contiene una data valida
      }
      if (!this.isDateInRange(cellDate, dateRange)) {
        return false; // La data non è nel range selezionato
      }
    }

    // Controlla filtri per date singole
    for (const [columnId, selectedDate] of Object.entries(
      columnFilterSelectedDates
    )) {
      if (!selectedDate) {
        continue;
      }
      const cellDate = this.toDateObject(row.data[columnId]);
      if (!cellDate) {
        return false; // La cella non contiene una data valida
      }
      // Confronta solo giorno, mese e anno (ignora ore/minuti/secondi)
      const cellDateOnly = new Date(
        cellDate.getFullYear(),
        cellDate.getMonth(),
        cellDate.getDate()
      );
      const selectedDateOnly = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      if (cellDateOnly.getTime() !== selectedDateOnly.getTime()) {
        return false; // Le date non corrispondono
      }
    }

    return true;
  }

  private getFilteredRows(): InternalRow[] {
    const { rows, activeFilters } = this.state;
    let filtered = rows;

    // Applica filtri tradizionali
    if (activeFilters.length > 0) {
      filtered = filtered.filter((row) =>
        this.matchesFilters(row, activeFilters)
      );
    }

    // Applica filtri per colonna
    filtered = filtered.filter((row) => this.matchesColumnFilters(row));

    return filtered;
  }

  private formatFilterLabel = (filter: TableFilterRule): string => {
    const column = this.getColumnById(filter.columnId);
    const columnLabel = column?.title ?? filter.columnId;
    const operatorLabel =
      this.getOperatorsForColumn(column).find(
        (operator) => operator.value === filter.operator
      )?.label ?? filter.operator;

    if (filter.secondaryValue) {
      return `${columnLabel} ${operatorLabel} ${filter.value} - ${filter.secondaryValue}`;
    }
    return `${columnLabel} ${operatorLabel} ${filter.value}`;
  };

  private handleFilterDraftChange = (
    field: keyof FilterDraft,
    value?: string
  ): void => {
    this.setState((prev) => {
      const nextDraft: FilterDraft = { ...prev.filterDraft };
      switch (field) {
        case "columnId":
          nextDraft.columnId = value;
          nextDraft.operator = undefined;
          nextDraft.value = "";
          nextDraft.secondaryValue = "";
          break;
        case "operator":
          nextDraft.operator = value;
          nextDraft.value = "";
          nextDraft.secondaryValue = "";
          break;
        case "value":
          nextDraft.value = value ?? "";
          break;
        case "secondaryValue":
          nextDraft.secondaryValue = value ?? "";
          break;
        default:
          break;
      }
      return { filterDraft: nextDraft };
    });
  };

  private handleFilterDrawerChange = (open: boolean): void => {
    this.setState((prev) => ({
      filterDrawerOpen: open,
      filterDraft: open ? prev.filterDraft : this.createEmptyFilterDraft(),
    }));
  };

  private addFilter = (): void => {
    const { filterDraft } = this.state;
    if (!filterDraft.columnId || !filterDraft.operator) {
      return;
    }
    const trimmedValue = (filterDraft.value ?? "").trim();
    if (!trimmedValue) {
      return;
    }

    const column = this.getColumnById(filterDraft.columnId);
    const operatorConfig = this.getOperatorsForColumn(column).find(
      (operator) => operator.value === filterDraft.operator
    );

    if (
      operatorConfig?.requiresSecondValue &&
      !(filterDraft.secondaryValue && filterDraft.secondaryValue.trim())
    ) {
      return;
    }

    const newFilter: TableFilterRule = {
      id: this.generateTempId(),
      columnId: filterDraft.columnId,
      operator: filterDraft.operator,
      value: trimmedValue,
      secondaryValue: operatorConfig?.requiresSecondValue
        ? filterDraft.secondaryValue?.trim()
        : undefined,
    };

    this.setState((prev) => ({
      activeFilters: [...prev.activeFilters, newFilter],
      filterDraft: this.createEmptyFilterDraft(),
    }));
  };

  private removeFilter = (filterId: string): void => {
    this.setState((prev) => {
      const target = prev.activeFilters.find(
        (filter) => filter.id === filterId
      );
      const remaining = prev.activeFilters.filter(
        (filter) => filter.id !== filterId
      );
      const nextState: Pick<
        EditableTableState,
        "activeFilters" | "systemDateRanges"
      > = {
        activeFilters: remaining,
        systemDateRanges: prev.systemDateRanges,
      };

      if (target && this.isSystemDateColumn(target.columnId)) {
        nextState.systemDateRanges = {
          ...prev.systemDateRanges,
          [target.columnId]: undefined,
        };
      }

      return nextState;
    });
  };

  private clearFilters = (): void => {
    this.setState({
      activeFilters: [],
      systemDateRanges: this.createInitialSystemRanges(),
    });
  };

  private handleSystemDateRangeChange = (
    columnId: string,
    range?: DateRange
  ): void => {
    this.setState((prev) => {
      const nextRanges = {
        ...prev.systemDateRanges,
        [columnId]: range,
      };
      const withoutCurrentColumn = prev.activeFilters.filter(
        (filter) => filter.columnId !== columnId
      );
      if (range?.from && range?.to) {
        const newFilter: TableFilterRule = {
          id: this.generateTempId(),
          columnId,
          operator: "between",
          value: format(range.from, "yyyy-MM-dd"),
          secondaryValue: format(range.to, "yyyy-MM-dd"),
        };
        return {
          systemDateRanges: nextRanges,
          activeFilters: [...withoutCurrentColumn, newFilter],
        };
      }
      return {
        systemDateRanges: nextRanges,
        activeFilters: withoutCurrentColumn,
      };
    });
  };

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
        rows: [...newRows, ...prev.rows],
        touched,
      };
    });
  };

  private createEmptyRow(): InternalRow {
    const empty: Record<string, unknown> = {};
    for (const col of this.props.columns) {
      empty[col.id] = (this.props.newRowDefaults || {})[col.id] ?? "";
    }
    return {
      id: this.generateTempId(),
      data: empty,
      isNew: true,
      isDirty: true,
    };
  }

  public prefillCreateRow = (data: Record<string, unknown>): void => {
    if (this.props.createMode === "inline") {
      this.addInlineRow(data);
      return;
    }

    const freshRow = this.createEmptyRow();
    const mergedData = { ...freshRow.data };
    const updatedTouched: Record<string, boolean> = {};

    for (const column of this.props.columns) {
      const value = data[column.id];
      if (value !== undefined) {
        mergedData[column.id] = value;
        updatedTouched[column.id] = true;
      }
    }

    this.setState({
      createDrawerOpen: true,
      createRow: { ...freshRow, data: mergedData },
      createTouched: updatedTouched,
    });
  };

  private handleExportCsv = (): void => {
    if (this.props.columns.length === 0) {
      return;
    }

    const filteredRows = this.getFilteredRows();

    if (
      this.props.customExportConfig &&
      this.props.customExportConfig.columns.length > 0
    ) {
      const headers = this.props.customExportConfig.columns.map(
        (column) => column.header
      );
      const data = filteredRows.map((row) =>
        this.props.customExportConfig!.columns.map((column) =>
          this.formatExportValue(column.accessor(row.data))
        )
      );

      const csvContent = Papa.unparse({
        fields: headers,
        data,
      });

      this.downloadCsv(csvContent);
      return;
    }

    // Find indices of quantity and unit of measure columns
    const quantityColumnIndex = this.props.columns.findIndex(
      (col) => col.id === "quantity"
    );
    // Try to find unit of measure column with different possible names
    const umColumnIndex = this.props.columns.findIndex(
      (col) =>
        col.id === "quantityUnitOfMeasure" ||
        col.id === "unitOfMeasureQuantity" ||
        col.id === "unitOfMeasure"
    );

    const hasUmInData =
      filteredRows.length > 0 &&
      (filteredRows[0].data.unitOfMeasureQuantity !== undefined ||
        filteredRows[0].data.quantityUnitOfMeasure !== undefined);

    // Filter out UM column from headers if quantity column exists
    const headers = this.props.columns
      .map((column, index) => {
        // Skip UM column if quantity column exists
        if (index === umColumnIndex && quantityColumnIndex !== -1) {
          return null;
        }
        return column.title || column.id;
      })
      .filter((header): header is string => header !== null);

    const data = filteredRows.map((row) => {
      return this.props.columns
        .map((column, index) => {
          // Skip UM column if quantity column exists
          if (index === umColumnIndex && quantityColumnIndex !== -1) {
            return null;
          }

          const value = row.data[column.id];

          // Combine quantity and UM if this is the quantity column
          if (index === quantityColumnIndex) {
            const quantityValue = value;
            // Try to get UM from column first, then from row data
            let umValue: unknown = undefined;
            if (umColumnIndex !== -1) {
              umValue = row.data[this.props.columns[umColumnIndex].id];
            } else if (hasUmInData) {
              // If no UM column but data has UM field, get it from row data
              umValue =
                row.data.unitOfMeasureQuantity ??
                row.data.quantityUnitOfMeasure ??
                row.data.unitOfMeasure;
            }

            if (quantityValue === undefined || quantityValue === null) {
              return "";
            }

            const quantityStr = String(quantityValue);
            const umStr = umValue ? String(umValue).trim() : "";

            // Combine quantity and UM: "0,245 kg" or just "0,245" if no UM
            return umStr ? `${quantityStr} ${umStr}` : quantityStr;
          }

          if (value === undefined || value === null) {
            return "";
          }

          // Format dates as GG/MM/AAAA
          if (column.type === "date") {
            const dateValue = this.toDateObject(value);
            if (dateValue) {
              return format(dateValue, "dd/MM/yyyy", { locale: it });
            }
            return "";
          }

          return String(value);
        })
        .filter((cell): cell is string => cell !== null);
    });

    const csvContent = Papa.unparse({
      fields: headers,
      data,
    });

    this.downloadCsv(csvContent);
  };

  private isDateLikeValue(value: string): boolean {
    return /\d{4}-\d{2}-\d{2}/.test(value) || /\d{2}\/\d{2}\/\d{4}/.test(value);
  }

  private formatExportValue(value: unknown): string {
    if (value === undefined || value === null) {
      return "";
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.formatExportValue(item))
        .filter(Boolean)
        .join(", ");
    }

    if (value instanceof Date) {
      return format(value, "dd/MM/yyyy", { locale: it });
    }

    if (typeof value === "string") {
      if (this.isDateLikeValue(value)) {
        const parsedDate = this.toDateObject(value);
        if (parsedDate) {
          return format(parsedDate, "dd/MM/yyyy", { locale: it });
        }
      }
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }

    return String(value);
  }

  private generateExportFileName(extension: string): string {
    const baseName = this.props.exportFileName || "export";
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const dateTime = `${day}${month}${year}_${hours}${minutes}`;
    return `${baseName}_${dateTime}.${extension}`;
  }

  private downloadCsv(content: string): void {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", this.generateExportFileName("csv"));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private handleExportExcel = (): void => {
    if (this.props.columns.length === 0) {
      return;
    }

    const filteredRows = this.getFilteredRows();

    let headers: string[];
    let data: unknown[][];

    if (
      this.props.customExportConfig &&
      this.props.customExportConfig.columns.length > 0
    ) {
      headers = this.props.customExportConfig.columns.map(
        (column) => column.header
      );
      data = filteredRows.map((row) =>
        this.props.customExportConfig!.columns.map((column) =>
          this.formatExportValue(column.accessor(row.data))
        )
      );
    } else {
      // Find indices of quantity and unit of measure columns
      const quantityColumnIndex = this.props.columns.findIndex(
        (col) => col.id === "quantity"
      );
      const umColumnIndex = this.props.columns.findIndex(
        (col) =>
          col.id === "quantityUnitOfMeasure" ||
          col.id === "unitOfMeasureQuantity" ||
          col.id === "unitOfMeasure"
      );

      const hasUmInData =
        filteredRows.length > 0 &&
        (filteredRows[0].data.unitOfMeasureQuantity !== undefined ||
          filteredRows[0].data.quantityUnitOfMeasure !== undefined);

      headers = this.props.columns
        .map((column, index) => {
          if (index === umColumnIndex && quantityColumnIndex !== -1) {
            return null;
          }
          return column.title || column.id;
        })
        .filter((header): header is string => header !== null);

      data = filteredRows.map((row) => {
        return this.props.columns
          .map((column, index) => {
            if (index === umColumnIndex && quantityColumnIndex !== -1) {
              return null;
            }

            const value = row.data[column.id];

            if (index === quantityColumnIndex) {
              const quantityValue = value;
              let umValue: unknown = undefined;
              if (umColumnIndex !== -1) {
                umValue = row.data[this.props.columns[umColumnIndex].id];
              } else if (hasUmInData) {
                umValue =
                  row.data.unitOfMeasureQuantity ??
                  row.data.quantityUnitOfMeasure ??
                  row.data.unitOfMeasure;
              }

              if (quantityValue === undefined || quantityValue === null) {
                return "";
              }

              const quantityStr = String(quantityValue);
              const umStr = umValue ? String(umValue).trim() : "";

              return umStr ? `${quantityStr} ${umStr}` : quantityStr;
            }

            if (value === undefined || value === null) {
              return "";
            }

            if (column.type === "date") {
              const dateValue = this.toDateObject(value);
              if (dateValue) {
                return format(dateValue, "dd/MM/yyyy", { locale: it });
              }
              return "";
            }

            return String(value);
          })
          .filter((cell): cell is string => cell !== null);
      });
    }

    // Create worksheet data with headers
    const worksheetData = [headers, ...data];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-size columns
    const columnWidths = headers.map((header, colIndex) => {
      const maxLength = Math.max(
        header.length,
        ...data.map((row) => String(row[colIndex] || "").length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet["!cols"] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dati");

    // Generate filename and download
    const filename = this.generateExportFileName("xlsx");
    XLSX.writeFile(workbook, filename);
  };

  private openCreateDrawer = (): void => {
    const draftRow = this.createEmptyRow();
    this.setState({
      createDrawerOpen: true,
      createRow: draftRow,
      createTouched: {},
    });
  };

  private addInlineRow = (prefill?: Record<string, unknown>): void => {
    const draftRow = this.createEmptyRow();
    const mergedData = { ...draftRow.data };
    const nextTouched: Record<string, boolean> = {};

    if (prefill && typeof prefill === "object") {
      for (const column of this.props.columns) {
        const value = prefill[column.id];
        if (value !== undefined) {
          mergedData[column.id] = value;
          nextTouched[column.id] = true;
        }
      }
    }

    const createdRow: InternalRow = {
      ...draftRow,
      data: mergedData,
      isNew: true,
      isDirty: true,
    };

    this.setState((prev) => ({
      rows: [createdRow, ...prev.rows],
      touched: {
        ...prev.touched,
        [createdRow.id]: Object.fromEntries(
          this.props.columns.map((c) => [
            c.id,
            Boolean(nextTouched[c.id]) || false,
          ])
        ),
      },
      selected: {},
    }));
  };

  private handleAddButtonClick = (): void => {
    if (typeof this.props.onAddClick === "function") {
      this.props.onAddClick();
      return;
    }
    if (this.props.createMode === "inline") {
      this.addInlineRow();
      return;
    }
    this.openCreateDrawer();
  };

  private handleCreateDrawerChange = (open: boolean): void => {
    if (!open) {
      this.handleCreateCancel();
    }
  };

  private handleCreateCellChange = (
    row: InternalRow,
    col: EditableColumn,
    value: unknown
  ): void => {
    this.setState((prev) => {
      if (!prev.createRow || prev.createRow.id !== row.id) {
        return null;
      }

      const baseRowData = { ...prev.createRow.data, [col.id]: value };
      const computedUpdates = col.onValueChange
        ? col.onValueChange({
            value,
            rowData: baseRowData,
            columnId: col.id,
          })
        : undefined;

      const sanitizedUpdates =
        computedUpdates && typeof computedUpdates === "object"
          ? (computedUpdates as Record<string, unknown>)
          : undefined;

      const updatedRow: InternalRow = {
        ...prev.createRow,
        data: {
          ...prev.createRow.data,
          [col.id]: value,
          ...(sanitizedUpdates ?? {}),
        },
      };

      const updatedTouched: Record<string, boolean> = {
        ...prev.createTouched,
        [col.id]: true,
      };

      if (sanitizedUpdates) {
        for (const key of Object.keys(sanitizedUpdates)) {
          updatedTouched[key] = true;
        }
      }

      return {
        createRow: updatedRow,
        createTouched: updatedTouched,
      };
    });
  };

  private handleCreateCancel = (): void => {
    this.setState({
      createDrawerOpen: false,
      createRow: undefined,
      createTouched: {},
    });
  };

  private handleCreateSave = (): void => {
    const { createRow, createTouched, rows } = this.state;

    if (!createRow) {
      return;
    }

    const errors = this.validateRow(createRow);
    if (Object.keys(errors).length > 0) {
      const newTouched = { ...createTouched };
      Object.keys(errors).forEach((key) => {
        newTouched[key] = true;
      });
      this.setState({ createTouched: newTouched });
      return;
    }

    // Save immediately if handler provided
    if (this.props.onSave) {
      this.props.onSave({
        created: [createRow.data],
        updated: [],
      });
    }

    // Add to rows as clean (optimistic update)
    // We treat the row as saved, so isNew and isDirty are false.
    const persistedRow: InternalRow = {
      ...createRow,
      isNew: false,
      isDirty: false,
      data: { ...createRow.data },
    };

    this.setState({
      rows: [...rows, persistedRow],
      createDrawerOpen: false,
      createRow: undefined,
      createTouched: {},
    });
  };

  private setCellValue = (
    rowId: string,
    colId: string,
    value: unknown,
    extraUpdates?: Record<string, unknown>
  ): void => {
    this.setState((prev) => {
      const updatedRows = prev.rows.map((r) => {
        if (r.id !== rowId) return r;
        const mergedData = {
          ...r.data,
          [colId]: value,
          ...(extraUpdates ?? {}),
        };
        return { ...r, isDirty: true, data: mergedData };
      });

      const touchedForRow = {
        ...(prev.touched[rowId] || {}),
        [colId]: true,
      };

      if (extraUpdates) {
        for (const key of Object.keys(extraUpdates)) {
          touchedForRow[key] = true;
        }
      }

      return {
        rows: updatedRows,
        touched: {
          ...prev.touched,
          [rowId]: touchedForRow,
        },
      };
    });
  };

  private handleCellChange = (
    row: InternalRow,
    col: EditableColumn,
    value: unknown
  ): void => {
    const baseRowData = { ...row.data, [col.id]: value };
    const computedUpdates = col.onValueChange
      ? col.onValueChange({
          value,
          rowData: baseRowData,
          columnId: col.id,
        })
      : undefined;

    const sanitizedUpdates =
      computedUpdates && typeof computedUpdates === "object"
        ? (computedUpdates as Record<string, unknown>)
        : undefined;

    this.setCellValue(row.id, col.id, value, sanitizedUpdates);
  };

  private toggleRowSelection = (rowId: string, value: boolean): void => {
    this.setState(
      (prev) => ({
        selected: { ...prev.selected, [rowId]: value },
      }),
      this.notifySelectionChange
    );
  };

  private toggleSelectAll = (value: boolean): void => {
    const visibleRows = this.getFilteredRows();
    this.setState((prev) => {
      const updatedSelection = { ...prev.selected };
      visibleRows.forEach((row) => {
        updatedSelection[row.id] = value;
      });
      return { selected: updatedSelection };
    }, this.notifySelectionChange);
  };

  private toggleEditMode = (): void => {
    this.setState((prev) => {
      // Se stiamo uscendo dalla modalità edit, resettiamo i dati
      if (prev.isEditMode) {
        const resetRows: InternalRow[] = (this.props.rows || []).map(
          (r, idx) => ({
            id: String(this.props.getRowId ? this.props.getRowId(r, idx) : idx),
            data: { ...r },
            isNew: false,
            isDirty: false,
          })
        );
        return {
          ...prev,
          rows: resetRows,
          isEditMode: false,
          touched: {},
        };
      }
      return {
        ...prev,
        isEditMode: true,
      };
    });
  };

  private handleCancel = (): void => {
    // Rimuove tutte le righe non salvate (isNew: true) e resetta i dati alle props originali
    const resetRows: InternalRow[] = (this.props.rows || []).map((r, idx) => ({
      id: String(this.props.getRowId ? this.props.getRowId(r, idx) : idx),
      data: { ...r },
      isNew: false,
      isDirty: false,
    }));
    this.setState({
      rows: resetRows,
      touched: {},
      isEditMode: false,
      createRow: undefined,
      createTouched: {},
      createDrawerOpen: false,
    });
  };

  private getActionChildren(): {
    left: React.ReactNode[];
    right: React.ReactNode[];
  } {
    const left: React.ReactNode[] = [];
    const right: React.ReactNode[] = [];

    React.Children.forEach(this.props.children, (child) => {
      if (child === null || child === undefined) {
        return;
      }

      if (
        React.isValidElement<{
          ["data-table-slot"]?: string;
          ["data-editable-table-slot"]?: string;
          slot?: string;
        }>(child)
      ) {
        const slot =
          child.props?.["data-table-slot"] ??
          child.props?.["data-editable-table-slot"] ??
          child.props?.slot;

        if (slot === "right") {
          right.push(child);
          return;
        }
        if (slot && slot !== "left") {
          return;
        }
      }

      left.push(child);
    });

    return { left, right };
  }

  private getChildrenForSlot(slotName: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    React.Children.forEach(this.props.children, (child) => {
      if (child === null || child === undefined) {
        return;
      }

      if (
        React.isValidElement<{
          ["data-table-slot"]?: string;
          ["data-editable-table-slot"]?: string;
          slot?: string;
        }>(child)
      ) {
        const slot =
          child.props?.["data-table-slot"] ??
          child.props?.["data-editable-table-slot"] ??
          child.props?.slot;

        if (slot === slotName) {
          nodes.push(child);
        }
      }
    });
    return nodes;
  }

  private get selectedIds(): string[] {
    return Object.entries(this.state.selected)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
  }

  private get deletionTargetLabel(): string {
    const selectionCount = this.selectedIds.length;
    if (selectionCount === 0) {
      return "";
    }
    return selectionCount === 1
      ? "questo elemento selezionato"
      : `${selectionCount} elementi selezionati`;
  }

  private buildSelectionPayload(): Array<Record<string, unknown>> {
    const selectedIdsSet = new Set(this.selectedIds);
    return this.state.rows
      .filter((row) => selectedIdsSet.has(row.id))
      .map((row) => ({ ...row.data }));
  }

  private notifySelectionChange = (): void => {
    if (!this.props.onSelectionChange) {
      return;
    }
    this.props.onSelectionChange(this.buildSelectionPayload());
  };

  private requestDeleteConfirmation = (): void => {
    if (this.selectedIds.length === 0) {
      return;
    }
    this.setState({ confirmDialogOpen: true });
  };

  private closeDeleteDialog = (): void => {
    this.setState({ confirmDialogOpen: false });
  };

  private handleDeleteDialogOpenChange = (open: boolean): void => {
    if (!open) {
      this.closeDeleteDialog();
    }
  };

  private handleDelete = (): void => {
    const ids = new Set(this.selectedIds);
    if (ids.size === 0) {
      this.closeDeleteDialog();
      return;
    }
    const removed: InternalRow[] = this.state.rows.filter((r) => ids.has(r.id));
    if (this.props.onDeleteSelected) {
      this.props.onDeleteSelected(removed.map((r) => r.data));
    }
    this.setState(
      (prev) => ({
        rows: prev.rows.filter((r) => !ids.has(r.id)),
        selected: {},
        touched: Object.fromEntries(
          Object.entries(prev.touched).filter(([rid]) => !ids.has(rid))
        ),
        confirmDialogOpen: false,
      }),
      this.notifySelectionChange
    );
  };

  private openDetails = (row: InternalRow): void => {
    // Se c'è un callback personalizzato, usalo invece del drawer
    if (this.props.onOpenDetails) {
      this.props.onOpenDetails(row.data);
    } else {
      this.setState({ drawerOpen: true, drawerRow: row });
    }
  };

  private closeDetails = (open: boolean): void => {
    this.setState({ drawerOpen: open });
  };

  private handleSort = (columnId: string, direction?: "asc" | "desc"): void => {
    this.setState((prev) => {
      const isSameColumn = prev.sortColumn === columnId;
      const newDirection: "asc" | "desc" =
        direction ??
        (isSameColumn
          ? prev.sortDirection === "asc"
            ? "desc"
            : "asc"
          : "asc");

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
            // Handle boolean values specially
            if (typeof aVal === "boolean" && typeof bVal === "boolean") {
              comparison = aVal === bVal ? 0 : aVal ? 1 : -1;
            } else {
              comparison = String(aVal).localeCompare(String(bVal));
            }
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

  private handleColumnFilterOpenChange = (
    columnId: string,
    open: boolean
  ): void => {
    this.setState((prev) => ({
      columnFilterOpen: open ? columnId : undefined,
      columnFilterSearchQueries: open
        ? { ...prev.columnFilterSearchQueries, [columnId]: "" }
        : prev.columnFilterSearchQueries,
    }));
  };

  private handleColumnFilterSearchChange = (
    columnId: string,
    query: string
  ): void => {
    this.setState((prev) => ({
      columnFilterSearchQueries: {
        ...prev.columnFilterSearchQueries,
        [columnId]: query,
      },
    }));
  };

  private handleColumnFilterValueToggle = (
    columnId: string,
    value: string
  ): void => {
    this.setState((prev) => {
      const currentSet =
        prev.columnFilterSelectedValues[columnId] || new Set<string>();
      const newSet = new Set(currentSet);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return {
        columnFilterSelectedValues: {
          ...prev.columnFilterSelectedValues,
          [columnId]: newSet,
        },
      };
    });
  };

  private handleColumnFilterSort = (
    columnId: string,
    direction: "asc" | "desc"
  ): void => {
    this.handleSort(columnId, direction);
  };

  private handleColumnFilterDateRangeChange = (
    columnId: string,
    range: DateRange | undefined
  ): void => {
    this.setState((prev) => ({
      columnFilterDateRanges: {
        ...prev.columnFilterDateRanges,
        [columnId]: range,
      },
      // Pulisci la data singola se si imposta un range
      columnFilterSelectedDates: {
        ...prev.columnFilterSelectedDates,
        [columnId]: undefined,
      },
    }));
  };

  private handleColumnFilterDateChange = (
    columnId: string,
    date: Date | undefined
  ): void => {
    this.setState((prev) => ({
      columnFilterSelectedDates: {
        ...prev.columnFilterSelectedDates,
        [columnId]: date,
      },
      // Pulisci il range se si imposta una data singola
      columnFilterDateRanges: {
        ...prev.columnFilterDateRanges,
        [columnId]: undefined,
      },
    }));
  };

  private handleColumnFilterClear = (columnId: string): void => {
    this.setState((prev) => {
      const newSelectedValues = { ...prev.columnFilterSelectedValues };
      const newDateRanges = { ...prev.columnFilterDateRanges };
      const newSelectedDates = { ...prev.columnFilterSelectedDates };
      const newSearchQueries = { ...prev.columnFilterSearchQueries };

      // Rimuovi tutti i filtri per questa colonna
      delete newSelectedValues[columnId];
      delete newDateRanges[columnId];
      delete newSelectedDates[columnId];
      delete newSearchQueries[columnId];

      return {
        columnFilterSelectedValues: newSelectedValues,
        columnFilterDateRanges: newDateRanges,
        columnFilterSelectedDates: newSelectedDates,
        columnFilterSearchQueries: newSearchQueries,
      };
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Bulk Edit Methods
  // ─────────────────────────────────────────────────────────────────────────────

  private openBulkEditDrawer = (): void => {
    this.setState({
      bulkEditDrawerOpen: true,
      bulkEditValues: {},
    });
  };

  private closeBulkEditDrawer = (): void => {
    this.setState({
      bulkEditDrawerOpen: false,
      bulkEditValues: {},
    });
  };

  private handleBulkEditDrawerOpenChange = (open: boolean): void => {
    if (!open) {
      this.closeBulkEditDrawer();
    }
  };

  private handleBulkEditValueChange = (
    columnId: string,
    value: unknown
  ): void => {
    this.setState((prev) => ({
      bulkEditValues: {
        ...prev.bulkEditValues,
        [columnId]: value,
      },
    }));
  };

  private getEditableColumns(): EditableColumn[] {
    return this.props.columns.filter((col) => !col.readOnly);
  }

  private applyBulkEdit = (): void => {
    const { bulkEditValues } = this.state;

    // Get only columns that have a value set (not undefined/empty)
    const columnsToUpdate = Object.entries(bulkEditValues).filter(
      ([, value]) => value !== undefined && value !== ""
    );

    if (columnsToUpdate.length === 0) {
      return;
    }

    const selectedIdsSet = new Set(this.selectedIds);

    this.setState((prev) => {
      const updatedRows = prev.rows.map((row) => {
        if (!selectedIdsSet.has(row.id)) {
          return row;
        }

        const updatedData = { ...row.data };
        let allComputedUpdates: Record<string, unknown> = {};

        // Apply each column update
        for (const [columnId, value] of columnsToUpdate) {
          updatedData[columnId] = value;

          // Apply onValueChange if defined for the column
          const column = this.props.columns.find((c) => c.id === columnId);
          if (column?.onValueChange) {
            const computedUpdates = column.onValueChange({
              value,
              rowData: updatedData,
              columnId,
            });
            if (computedUpdates && typeof computedUpdates === "object") {
              allComputedUpdates = {
                ...allComputedUpdates,
                ...(computedUpdates as Record<string, unknown>),
              };
            }
          }
        }

        return {
          ...row,
          isDirty: true,
          data: {
            ...updatedData,
            ...allComputedUpdates,
          },
        };
      });

      // Update touched state for all modified rows
      const updatedTouched = { ...prev.touched };
      selectedIdsSet.forEach((rowId) => {
        const touchedCols = updatedTouched[rowId] || {};
        for (const [columnId] of columnsToUpdate) {
          touchedCols[columnId] = true;
        }
        updatedTouched[rowId] = touchedCols;
      });

      return {
        rows: updatedRows,
        touched: updatedTouched,
        bulkEditDrawerOpen: false,
        bulkEditValues: {},
      };
    });
  };

  private renderBulkEditDrawer(): React.ReactNode {
    const { bulkEditDrawerOpen, bulkEditValues } = this.state;
    const editableColumns = this.getEditableColumns();
    const selectionCount = this.selectedIds.length;

    // Check if at least one field has a value
    const hasAnyValue = Object.values(bulkEditValues).some(
      (v) => v !== undefined && v !== ""
    );

    return (
      <Drawer
        open={bulkEditDrawerOpen}
        onOpenChange={this.handleBulkEditDrawerOpenChange}
        modal={false}
        direction="right"
      >
        <DrawerContent
          data-vaul-drawer-direction="right"
          className="shadow-2xl rounded-r-none rounded-l-2xl border-l border-neutral-200"
        >
          <DrawerHeader>
            <DrawerTitle>Modifica {selectionCount} elementi</DrawerTitle>
            <DrawerDescription>
              Compila i campi che vuoi modificare. Solo i campi compilati
              verranno applicati a tutti gli elementi selezionati.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-5">
              {editableColumns.map((col) => {
                // Create a fake row for each column input
                const fakeRow: InternalRow = {
                  id: `bulk-edit-fake-row-${col.id}`,
                  data: { [col.id]: bulkEditValues[col.id] ?? "" },
                  isNew: false,
                  isDirty: false,
                };

                return (
                  <div key={col.id} className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700">
                      {col.title}
                      {col.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {this.renderInput(fakeRow, col, {
                      onChange: (_row, _col, value) =>
                        this.handleBulkEditValueChange(col.id, value),
                      touchedOverride: {},
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Action buttons - sticky footer */}
          <div className="flex justify-end gap-3 p-4 border-t bg-white">
            <Button variant="outline" onClick={this.closeBulkEditDrawer}>
              Annulla
            </Button>
            <Button onClick={this.applyBulkEdit} disabled={!hasAnyValue}>
              Applica a {selectionCount} element
              {selectionCount === 1 ? "o" : "i"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  private get hasDirtyRows(): boolean {
    return this.state.rows.some((r) => r.isDirty);
  }

  private get shouldShowEditActions(): boolean {
    return this.props.alwaysEdit || this.state.isEditMode || this.hasDirtyRows;
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

  private handleSave = async (): Promise<void> => {
    if (!this.props.onSave) return;
    const created = this.state.rows.filter((r) => r.isNew);
    const updated = this.state.rows.filter((r) => r.isDirty && !r.isNew);
    // Prevent saving if any required field missing in dirty rows
    const invalid = [...created, ...updated].some(
      (r) => Object.keys(this.validateRow(r)).length > 0
    );
    if (invalid) return;

    try {
      await this.props.onSave({
        created: created.map((r) => r.data),
        updated: updated.map((r) => r.data),
      });

      // Reset dirty flags and editing state only on success
      this.setState((prev) => ({
        rows: prev.rows.map((r) => ({ ...r, isDirty: false, isNew: false })),
        touched: {},
        isEditMode: false,
      }));
    } catch (error) {
      console.error("Error saving table data:", error);
      // Keep dirty state so user can retry
    }
  };

  private formatDefaultCellValue(col: EditableColumn, value: unknown): string {
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
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  }

  private renderReadOnlyCell(
    col: EditableColumn,
    value: unknown,
    row: InternalRow
  ) {
    if (col.render) return col.render(value, row.data);
    const formattedValue = this.formatDefaultCellValue(col, value);
    return <TruncatedCellText text={formattedValue} />;
  }

  private renderInput = (
    row: InternalRow,
    col: EditableColumn,
    config?: {
      onChange?: (
        targetRow: InternalRow,
        targetColumn: EditableColumn,
        value: unknown
      ) => void;
      touchedOverride?: Record<string, boolean>;
    }
  ): React.ReactNode => {
    const value = row.data[col.id] as unknown;
    const touchedSource =
      config?.touchedOverride ?? this.state.touched[row.id] ?? {};
    const isTouched = touchedSource?.[col.id];
    const error = this.validateRow(row)[col.id];
    const handleChange = config?.onChange ?? this.handleCellChange;
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
        const normalized = this.getRowSelectOptions(col, row);

        if (col.enableSearch) {
          return (
            <SearchableSelect
              value={String(value ?? "")}
              options={normalized}
              placeholder={col.placeholder}
              searchPlaceholder={col.searchPlaceholder}
              emptyMessage={col.emptyStateMessage}
              noneOptionLabel={col.noneOptionLabel}
              onChange={(newValue) => handleChange(row, col, newValue)}
              wrapperClassName="w-full"
              maxVisibleOptions={col.maxVisibleOptions}
              keepOpenOnSelect={col.keepOpenOnSelect}
            />
          );
        }

        return (
          <select
            className={cn(
              baseSelectClass,
              Boolean(isTouched && error) &&
                "ring-1 ring-red-200/50 border-red-200/60"
            )}
            value={String(value ?? "")}
            aria-invalid={Boolean(isTouched && error)}
            onChange={(e) => handleChange(row, col, e.target.value)}
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
              handleChange(row, col, v);
            }}
            className={cn(
              Boolean(isTouched && error) &&
                "ring-1 ring-red-200/50 border-red-200/60"
            )}
          />
        );
      case "date":
        return (
          <DateCellPicker
            value={value}
            placeholder={col.placeholder}
            isInvalid={Boolean(isTouched && error)}
            onChange={(nextValue) => handleChange(row, col, nextValue)}
          />
        );
      case "text":
      default:
        return (
          <AutoExpandTextarea
            value={value ? String(value) : ""}
            placeholder={col.placeholder}
            isInvalid={Boolean(isTouched && error)}
            onValueChange={(nextValue) => handleChange(row, col, nextValue)}
          />
        );
    }
  };

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

  private renderCreateDrawer(): React.ReactNode {
    if (!this.props.addButton) {
      return null;
    }

    const pendingRow = this.state.createRow;
    const disableSave =
      !pendingRow ||
      Object.keys(pendingRow ? this.validateRow(pendingRow) : {}).length > 0;
    const drawerChildren = this.getChildrenForSlot("create-drawer");
    const enhancedDrawerChildren = drawerChildren.map((child, index) => {
      if (React.isValidElement(child)) {
        const element = child as React.ReactElement<{
          onCloseParentDrawer?: () => void;
          onOpenParentDrawer?: () => void;
        }>;
        // Only pass these props if the element type is a React component (not a DOM element)
        // This prevents React warnings about unknown props on DOM elements
        // DOM elements have string types (e.g., 'div', 'span'), while React components have function/object types
        const elementType = element.type;
        const isReactComponent =
          typeof elementType === "function" ||
          (typeof elementType === "object" &&
            elementType !== null &&
            "render" in elementType);

        // Only pass props to React components to avoid warnings on DOM elements
        const additionalProps = isReactComponent
          ? {
              onCloseParentDrawer: this.handleCreateCancel,
              onOpenParentDrawer: this.openCreateDrawer,
            }
          : {};

        return (
          <React.Fragment key={child.key ?? `create-drawer-child-${index}`}>
            {React.cloneElement(element, additionalProps)}
          </React.Fragment>
        );
      }
      return (
        <React.Fragment key={`create-drawer-child-${index}`}>
          {child}
        </React.Fragment>
      );
    });

    return (
      <EditableTableCreateDrawer
        open={this.state.createDrawerOpen}
        columns={this.props.columns}
        pendingRow={pendingRow}
        createTouched={this.state.createTouched}
        drawerChildren={enhancedDrawerChildren}
        disableSave={disableSave}
        onOpenChange={this.handleCreateDrawerChange}
        onCancel={this.handleCreateCancel}
        onSave={this.handleCreateSave}
        onCellChange={this.handleCreateCellChange}
        renderInput={this.renderInput}
      />
    );
  }

  private renderVertical(): React.ReactNode {
    const { columns, isModify, className } = this.props;
    const rows = this.getFilteredRows();
    const showEditActions = this.shouldShowEditActions;
    const showAddButton = Boolean(this.props.addButton) && !showEditActions;
    const hasLast = Boolean(this.props.lastComponent);
    const { left: leftActions, right: rightActions } = this.getActionChildren();

    return (
      <React.Fragment>
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
                      disabled={this.props.columns.length === 0}
                      aria-label="Esporta"
                    >
                      <IoDownloadOutline className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="z-[100]">
                    <DropdownMenuItem
                      onSelect={this.handleExportCsv}
                      className="cursor-pointer"
                    >
                      Esporta CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={this.handleExportExcel}
                      className="cursor-pointer"
                    >
                      Esporta Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!showEditActions && rightActions}
              {showEditActions && (
                <>
                  <Button
                    variant="ghost"
                    onClick={this.handleCancel}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Annulla
                  </Button>
                  <Button onClick={this.handleSave} disabled={false}>
                    Salva
                  </Button>
                </>
              )}
            </div>
          </div>
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
                      "text-left min-w-[250px]"
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
                  return (
                    v === undefined || v === null || String(v).trim() === ""
                  );
                });
                return (
                  <tr
                    key={c.id}
                    data-slot="table-row"
                    className={cn(
                      "transition-colors hover:bg-muted/30 border-agri-green-50",
                      colHasRequiredMissing && "bg-red-50/30"
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
                        {isModify &&
                        (this.state.isEditMode || this.props.alwaysEdit) &&
                        !c.readOnly
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
                    "transition-colors hover:bg-muted/30 border-agri-green-50"
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

          {showAddButton && (
            <div className="sticky left-0 bottom-0 w-full border-t border-agri-green-50 inset-shadow-xs border-border/30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between px-2 py-2">
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={this.handleAddButtonClick}
                  aria-label="Aggiungi"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Aggiungi</span>
                </Button>
              </div>
            </div>
          )}
        </div>
        {this.renderFiltersPanel()}
        {this.renderCreateDrawer()}
      </React.Fragment>
    );
  }

  private renderDeleteConfirmationDialog(): React.ReactNode {
    const targetLabel = this.deletionTargetLabel || "gli elementi selezionati";
    return (
      <Dialog
        open={this.state.confirmDialogOpen}
        onOpenChange={this.handleDeleteDialogOpenChange}
      >
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              {`Confermi di voler eliminare ${targetLabel}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={this.closeDeleteDialog}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={this.handleDelete}
              aria-label="Conferma eliminazione"
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  render(): React.ReactNode {
    if (this.props.isVertical) {
      return this.renderVertical();
    }
    const { columns, isModify, className } = this.props;
    const rows = this.getFilteredRows();
    const showEditActions = this.shouldShowEditActions;
    const hasErrors = this.hasErrors;
    const anySelected = this.selectedIds.length > 0;
    const selectionPayload = this.buildSelectionPayload();
    const allSelected =
      rows.length > 0 &&
      rows.every((row) => Boolean(this.state.selected[row.id]));
    const hasDetails = Boolean(
      this.props.detailsRenderer || this.props.onOpenDetails
    );
    const hasLast = Boolean(this.props.lastComponent);
    const { left: leftActions, right: rightActions } = this.getActionChildren();
    const showAddButton = Boolean(this.props.addButton) && !showEditActions;
    const shouldRenderBulkVerifyButton =
      anySelected &&
      !showEditActions &&
      Boolean(this.props.onBulkVerifySelected);
    const bulkVerifyLabel =
      this.props.bulkVerifyButtonLabel ?? "Verify selected";

    const isFlexLayout = className?.includes("flex flex-col");

    return (
      <div
        data-slot="table-wrapper"
        className={cn("relative w-full rounded-lg bg-background", className)}
      >
        {this.renderDeleteConfirmationDialog()}
        {/* Top action bar */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-agri-green-50 bg-agri-green-50 rounded-t-lg z-10",
            isFlexLayout ? "flex-shrink-0" : "sticky top-0 left-0 right-0"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {!showEditActions && !anySelected && leftActions}
            {!showEditActions && !anySelected && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground cursor-pointer"
                    disabled={this.props.columns.length === 0}
                    aria-label="Esporta"
                  >
                    <IoDownloadOutline className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-[100]">
                  <DropdownMenuItem
                    onSelect={this.handleExportCsv}
                    className="cursor-pointer"
                  >
                    Esporta CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={this.handleExportExcel}
                    className="cursor-pointer"
                  >
                    Esporta Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {anySelected && !showEditActions && (
              <Button
                onClick={() => this.toggleSelectAll(false)}
                className={cn(
                  "border border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
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
                  De-seleziona {this.selectedIds.length} element
                  {this.selectedIds.length === 1 ? "o" : "i"}
                </span>
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!showEditActions && !anySelected && rightActions}
            {isModify &&
              !anySelected &&
              !this.props.alwaysEdit &&
              !this.state.isEditMode && (
                <Button
                  onClick={this.toggleEditMode}
                  className={cn(
                    "border cursor-pointer",
                    this.state.isEditMode
                      ? "border-none text-gray-500 hover:bg-gray-50"
                      : "border-none bg-blue-200 text-blue-700 hover:bg-blue-50"
                  )}
                  variant="ghost"
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
                className="text-muted-foreground bg-agri-green-200 text-agri-green-700 cursor-pointer"
                onClick={this.handleAddButtonClick}
                aria-label="Aggiungi"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Aggiungi</span>
              </Button>
            )}
            {shouldRenderBulkVerifyButton && (
              <Button
                onClick={() =>
                  this.props.onBulkVerifySelected?.(selectionPayload)
                }
                className={cn(
                  "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                )}
                variant="ghost"
                size="sm"
                aria-label="Verify selected rows"
                disabled={this.props.isBulkVerifyLoading}
              >
                {this.props.isBulkVerifyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">{bulkVerifyLabel}</span>
              </Button>
            )}
            {anySelected && !showEditActions && this.props.isModify && (
              <Button
                onClick={this.openBulkEditDrawer}
                className={cn(
                  "border border-blue-200 text-blue-600 hover:bg-blue-50"
                )}
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
            {anySelected &&
              !showEditActions &&
              this.props.showDeleteAction !== false && (
                <Button
                  onClick={this.requestDeleteConfirmation}
                  className={cn(
                    "border border-red-200 text-red-400 hover:bg-red-50"
                  )}
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
                  onClick={this.handleCancel}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Annulla
                </Button>
                <Button onClick={this.handleSave} disabled={hasErrors}>
                  Salva
                </Button>
              </>
            )}
          </div>
        </div>

        <div
          className={cn(
            "w-full overflow-auto",
            isFlexLayout ? "flex-1 min-h-0" : "max-h-[calc(100vh-300px)]"
          )}
        >
          <table
            data-slot="table"
            className={cn("w-full caption-bottom text-sm relative")}
          >
            <thead
              data-slot="table-header"
              className={cn("border-b-2 border-agri-green-100")}
            >
              <tr data-slot="table-row" className={cn("transition-colors")}>
                <th
                  data-slot="table-head"
                  className={cn(
                    "h-9 px-2 text-left align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap",
                    "sticky top-0 left-0 bg-white dark:bg-background z-30 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                    "w-8"
                  )}
                >
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => this.toggleSelectAll(Boolean(v))}
                    className="border-gray-200 "
                    aria-label="Select all rows"
                  />
                </th>
                {columns.map((c) => {
                  const uniqueValues = this.buildUniqueValueOptions(c.id);
                  const selectedValues =
                    this.state.columnFilterSelectedValues[c.id] ||
                    new Set<string>();
                  const searchQuery =
                    this.state.columnFilterSearchQueries[c.id] || "";
                  const isFilterOpen = this.state.columnFilterOpen === c.id;
                  const isDateColumn = c.type === "date";
                  const dateRange = this.state.columnFilterDateRanges[c.id];
                  const selectedDate =
                    this.state.columnFilterSelectedDates[c.id];
                  const hasActiveFilter = isDateColumn
                    ? Boolean(dateRange?.from || selectedDate)
                    : selectedValues.size > 0;

                  return (
                    <th
                      key={c.id}
                      data-slot="table-head"
                      style={{ width: c.width, minWidth: c.width || "250px" }}
                      className={cn(
                        // Base header cell styles
                        "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap text-left",
                        "sticky top-0 bg-white dark:bg-background z-10",
                        hasActiveFilter && "bg-blue-50"
                      )}
                    >
                      <EditableTableColumnFilterDropdown
                        column={c}
                        uniqueValues={uniqueValues}
                        selectedValues={selectedValues}
                        searchQuery={searchQuery}
                        onSearchChange={(query) =>
                          this.handleColumnFilterSearchChange(c.id, query)
                        }
                        onValueToggle={(value) =>
                          this.handleColumnFilterValueToggle(c.id, value)
                        }
                        onSort={(direction) =>
                          this.handleColumnFilterSort(c.id, direction)
                        }
                        onApply={() => {
                          // Il filtro viene già applicato automaticamente tramite getFilteredRows
                        }}
                        onClearFilter={() => this.handleColumnFilterClear(c.id)}
                        currentSortColumn={this.state.sortColumn}
                        currentSortDirection={this.state.sortDirection}
                        isOpen={isFilterOpen}
                        onOpenChange={(open) =>
                          this.handleColumnFilterOpenChange(c.id, open)
                        }
                        dateRange={dateRange}
                        onDateRangeChange={(range) =>
                          this.handleColumnFilterDateRangeChange(c.id, range)
                        }
                        selectedDate={selectedDate}
                        onDateChange={(date) =>
                          this.handleColumnFilterDateChange(c.id, date)
                        }
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
                              this.state.sortColumn === c.id
                                ? "opacity-100 text-blue-600"
                                : "opacity-60 hover:opacity-80",
                              this.state.sortColumn === c.id &&
                                this.state.sortDirection === "desc"
                                ? "rotate-180"
                                : "",
                              hasActiveFilter && "text-blue-600 opacity-100"
                            )}
                          >
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </div>
                      </EditableTableColumnFilterDropdown>
                    </th>
                  );
                })}
                {hasLast ? (
                  <th
                    data-slot="table-head"
                    className={cn(
                      "h-9 p-3 text-left align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap w-24",
                      "sticky top-0 bg-white dark:bg-background z-10",
                      !hasDetails && "right-0 z-20"
                    )}
                  ></th>
                ) : null}
                {hasDetails ? (
                  <th
                    data-slot="table-head"
                    className={cn(
                      "h-9 p-3 text-left align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap w-24",
                      "sticky top-0 right-0 bg-white dark:bg-background z-20 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]"
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
                  return (
                    v === undefined || v === null || String(v).trim() === ""
                  );
                });
                return (
                  <tr
                    key={row.id}
                    data-slot="table-row"
                    className={cn(
                      "transition-colors hover:bg-agri-green-50 border-agri-green-100",
                      rowHasRequiredMissing && "bg-red-50/30"
                    )}
                  >
                    <td
                      data-slot="table-cell"
                      className={cn(
                        "p-2 align-middle sticky left-0 bg-white dark:bg-background z-20  shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                        "w-8"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(this.state.selected[row.id])}
                          onCheckedChange={(v) =>
                            this.toggleRowSelection(row.id, Boolean(v))
                          }
                          className="border-gray-200 "
                          aria-label="Select row"
                        />
                      </div>
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c.id}
                        data-slot="table-cell"
                        style={{ minWidth: c.width || "250px" }}
                        className={cn(
                          "p-3 align-middle text-left",
                          c.type !== "text" && "whitespace-nowrap"
                        )}
                      >
                        {isModify &&
                        (row.isNew || this.state.isEditMode) &&
                        !c.readOnly
                          ? this.renderInput(row, c)
                          : this.renderReadOnlyCell(c, row.data[c.id], row)}
                      </td>
                    ))}
                    {hasLast ? (
                      <td
                        data-slot="table-cell"
                        className={cn(
                          "p-3 align-middle text-left whitespace-nowrap w-24",
                          !hasDetails && "sticky right-0 bg-background "
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
                    {hasDetails ? (
                      <td
                        data-slot="table-cell"
                        className={cn(
                          "p-3 align-middle text-center whitespace-nowrap w-24",
                          "sticky right-0 bg-white dark:bg-background shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs whitespace-nowrap cursor-pointer"
                          onClick={() => this.openDetails(row)}
                          aria-label="Apri dettagli"
                        >
                          <span className="hidden sm:inline sm:mr-1">Apri</span>
                          <IoOpenOutline className="h-3 w-3" />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* TODO:  pagiazione*/}
        {/* {this.props.addButton && (
          <div className="sticky left-0 bottom-0 w-full border-t border-agri-green-50 bg-agri-green-50 rounded-b-lg inset-shadow-xs border-border/30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between px-2 py-2"></div>
          </div>
        )} */}
        {hasDetails ? (
          <Drawer open={this.state.drawerOpen} onOpenChange={this.closeDetails}>
            <DrawerContent data-vaul-drawer-direction="right">
              <DrawerHeader>
                <DrawerTitle>
                  {this.props.detailsTitle || "Details"}
                </DrawerTitle>
                <DrawerDescription>
                  Visualizza e modifica i dettagli dell'elemento selezionato
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-6 overflow-y-auto max-h-[calc(100vh-120px)]">
                {this.state.drawerRow
                  ? this.props.detailsRenderer?.(this.state.drawerRow.data)
                  : null}
              </div>
            </DrawerContent>
          </Drawer>
        ) : null}
        {this.renderFiltersPanel()}
        {this.renderCreateDrawer()}
        {this.renderBulkEditDrawer()}
      </div>
    );
  }
}

interface DateCellPickerProps {
  value: unknown;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  isInvalid?: boolean;
}

interface DateCellPickerState {
  open: boolean;
}

const DATE_DISPLAY_FORMAT = "dd/MM/yyyy";
const DATE_PLACEHOLDER_LABEL = "gg/mm/aaaa";

class DateCellPicker extends React.Component<
  DateCellPickerProps,
  DateCellPickerState
> {
  state: DateCellPickerState = {
    open: false,
  };

  private parseValue(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatLabel(date: Date | null): string {
    if (date) {
      return format(date, DATE_DISPLAY_FORMAT, { locale: it });
    }
    return this.props.placeholder ?? DATE_PLACEHOLDER_LABEL;
  }

  private handleSelect = (selectedDate?: Date): void => {
    this.props.onChange(selectedDate ?? null);
    if (selectedDate) {
      this.setState({ open: false });
    }
  };

  render(): React.ReactElement {
    const resolvedDate = this.parseValue(this.props.value);
    const label = this.formatLabel(resolvedDate);

    return (
      <Popover
        open={this.state.open}
        onOpenChange={(isOpen) => this.setState({ open: isOpen })}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10 rounded-xl border border-black/5 bg-white hover:bg-white",
              !resolvedDate && "text-muted-foreground",
              this.props.isInvalid && "ring-1 ring-red-200/50 border-red-200/60"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-transparent border-0 shadow-none">
          <Calendar
            mode="single"
            selected={resolvedDate ?? undefined}
            onSelect={this.handleSelect}
            initialFocus
            locale={it}
          />
        </PopoverContent>
      </Popover>
    );
  }
}
