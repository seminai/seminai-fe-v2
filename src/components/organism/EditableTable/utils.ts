import { format } from "date-fns";
import { it } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
  EditableColumn,
  FilterOperatorConfig,
  InternalRow,
  NormalizedSelectOption,
  SearchableValueConfig,
  TableFilterRule,
} from "./types";
import {
  TEXT_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
  DATE_FILTER_OPERATORS,
  SYSTEM_DATE_COLUMNS,
  SEARCHABLE_COLUMN_CONFIGS,
} from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// ID Generation
// ─────────────────────────────────────────────────────────────────────────────

export function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTableId(
  tableId: string | undefined,
  columns: EditableColumn[]
): string {
  if (tableId) {
    return tableId;
  }

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const columnIds = columns
    .map((c) => c.id)
    .sort()
    .join(",");

  const hashInput = `${pathname}:${columnIds}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const pathKey = pathname.replace(/[^a-zA-Z0-9]/g, "-") || "default";
  return `${pathKey}-${Math.abs(hash).toString(36)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Select Option Normalization
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeSelectOptions(
  rawOptions?: Array<{ label: string; value: string }> | string[]
): NormalizedSelectOption[] {
  if (!rawOptions) {
    return [];
  }
  return rawOptions.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option
  );
}

export function normalizeSearchableText(value?: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function toDateValue(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const timestamp = new Date(String(value)).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function toDateObject(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isDateInRange(date: Date, range: DateRange): boolean {
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

export function isDateLikeValue(value: string): boolean {
  return /\d{4}-\d{2}-\d{2}/.test(value) || /\d{2}\/\d{2}\/\d{4}/.test(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function formatDefaultCellValue(
  col: EditableColumn,
  value: unknown
): string {
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

export function formatExportValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatExportValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (value instanceof Date) {
    return format(value, "dd/MM/yyyy", { locale: it });
  }

  if (typeof value === "string") {
    if (isDateLikeValue(value)) {
      const parsedDate = toDateObject(value);
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

export function generateExportFileName(
  baseName: string | undefined,
  extension: string
): string {
  const name = baseName || "export";
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const dateTime = `${day}${month}${year}_${hours}${minutes}`;
  return `${name}_${dateTime}.${extension}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export function validateRow(
  row: InternalRow,
  columns: EditableColumn[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const col of columns) {
    if (col.required) {
      const v = row.data[col.id];
      const isEmpty =
        v === undefined || v === null || String(v).trim() === "";
      if (isEmpty) errors[col.id] = "Required";
    }
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Column Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function isSystemDateColumn(columnId: string): boolean {
  return SYSTEM_DATE_COLUMNS.some((column) => column.id === columnId);
}

export function getColumnById(
  columnId: string | undefined,
  columns: EditableColumn[],
  rows: InternalRow[]
): EditableColumn | undefined {
  if (!columnId) {
    return undefined;
  }
  const column =
    columns.find((item) => item.id === columnId) ??
    SYSTEM_DATE_COLUMNS.find((item) => item.id === columnId);

  if (column && isSystemDateColumn(column.id) && !hasColumnData(column.id, rows)) {
    return undefined;
  }
  return column;
}

export function hasColumnData(columnId: string, rows: InternalRow[]): boolean {
  return rows.some((row) => {
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

export function getAvailableSystemDateColumns(
  rows: InternalRow[]
): EditableColumn[] {
  return SYSTEM_DATE_COLUMNS.filter((column) =>
    hasColumnData(column.id, rows)
  );
}

export function getOperatorsForColumn(
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

export function getSearchableValueConfig(
  column?: EditableColumn
): SearchableValueConfig | undefined {
  if (!column) {
    return undefined;
  }
  const normalizedId = normalizeSearchableText(column.id);
  const normalizedTitle = normalizeSearchableText(column.title || "");
  return SEARCHABLE_COLUMN_CONFIGS.find(({ keywords }) =>
    keywords.some(
      (keyword) =>
        normalizedId.includes(keyword) || normalizedTitle.includes(keyword)
    )
  )?.config;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function applyTextFilter(
  value: unknown,
  filter: TableFilterRule
): boolean {
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

export function applyNumericFilter(
  value: unknown,
  filter: TableFilterRule
): boolean {
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

export function applyDateFilter(
  value: unknown,
  filter: TableFilterRule
): boolean {
  const cellDate = toDateValue(value);
  if (cellDate === null) {
    return false;
  }
  const first = toDateValue(filter.value);

  switch (filter.operator) {
    case "on":
      return first !== null && cellDate === first;
    case "before":
      return first !== null && cellDate < first;
    case "after":
      return first !== null && cellDate > first;
    case "between": {
      const second = toDateValue(filter.secondaryValue);
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

// ─────────────────────────────────────────────────────────────────────────────
// Row Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function createEmptyRow(
  columns: EditableColumn[],
  newRowDefaults?: Partial<Record<string, unknown>>
): InternalRow {
  const empty: Record<string, unknown> = {};
  for (const col of columns) {
    empty[col.id] = (newRowDefaults || {})[col.id] ?? "";
  }
  return {
    id: generateTempId(),
    data: empty,
    isNew: true,
    isDirty: true,
  };
}

export function buildUniqueValueOptions(
  columnId: string | undefined,
  rows: InternalRow[],
  column?: EditableColumn,
): NormalizedSelectOption[] {
  if (!columnId) {
    return [];
  }
  const uniqueValues = new Set<string>();
  rows.forEach((row) => {
    let rawValue: unknown;
    if (columnId === "productRegistrationNumber") {
      const productName = row.data["productName"];
      const productRegNumber = row.data["productRegistrationNumber"];
      if (
        productName &&
        String(productName).trim() &&
        String(productName).trim() !== "-"
      ) {
        rawValue = productName;
      } else if (
        productRegNumber &&
        String(productRegNumber).trim() &&
        String(productRegNumber).trim() !== "-"
      ) {
        rawValue = productRegNumber;
      } else {
        return;
      }
    } else {
      rawValue = row.data[columnId];
    }
    if (rawValue === undefined || rawValue === null) {
      return;
    }
    const parsedValue = String(rawValue).trim();
    if (parsedValue && parsedValue !== "-") {
      uniqueValues.add(parsedValue);
    }
  });

  const optionsMap = new Map<string, string>();
  if (column?.options) {
    for (const opt of column.options) {
      if (typeof opt === "string") {
        optionsMap.set(opt, opt);
      } else {
        optionsMap.set(opt.value, opt.label);
      }
    }
  }

  return Array.from(uniqueValues)
    .sort((first, second) =>
      first.localeCompare(second, "it", { sensitivity: "base" })
    )
    .map((value) => ({ label: optionsMap.get(value) || value, value }));
}
