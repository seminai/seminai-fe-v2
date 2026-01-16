import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EditableColumn, InternalRow, NormalizedSelectOption } from "../types";
import { normalizeSelectOptions, validateRow } from "../utils";
import { AutoExpandTextarea } from "../EditableTableAutoExpandTextarea";
import { DateCellPicker } from "./DateCellPicker";

export interface EditableTableCellProps {
  row: InternalRow;
  column: EditableColumn;
  columns: EditableColumn[];
  touched: Record<string, Record<string, boolean>>;
  onChange: (row: InternalRow, column: EditableColumn, value: unknown) => void;
  touchedOverride?: Record<string, boolean>;
}

function getRowSelectOptions(
  column: EditableColumn,
  row: InternalRow
): NormalizedSelectOption[] {
  if (column.getOptions) {
    return normalizeSelectOptions(column.getOptions(row.data));
  }
  if (column.options) {
    return normalizeSelectOptions(column.options);
  }
  return [];
}

export function EditableTableCell({
  row,
  column,
  columns,
  touched,
  onChange,
  touchedOverride,
}: EditableTableCellProps): React.ReactElement {
  const value = row.data[column.id] as unknown;
  const touchedSource = touchedOverride ?? touched[row.id] ?? {};
  const isTouched = touchedSource?.[column.id];
  const errors = validateRow(row, columns);
  const error = errors[column.id];

  const baseSelectClass = cn(
    "w-full file:text-foreground placeholder:text-foreground/40 dark:placeholder:text-foreground/50 selection:bg-primary selection:text-primary-foreground flex h-10 min-w-0 rounded-xl bg-white/70 dark:bg-input/30 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-3 py-2 text-base inset-shadow-xs transition-[background-color,border-color,box-shadow] outline-none md:text-sm",
    "border border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20",
    "focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 focus-visible:border-transparent",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    "appearance-none bg-clip-padding"
  );

  const handleChange = (newValue: unknown) => {
    onChange(row, column, newValue);
  };

  switch (column.type) {
    case "select": {
      const normalized = getRowSelectOptions(column, row);

      if (column.enableSearch) {
        return (
          <SearchableSelect
            value={String(value ?? "")}
            options={normalized}
            placeholder={column.placeholder}
            searchPlaceholder={column.searchPlaceholder}
            emptyMessage={column.emptyStateMessage}
            noneOptionLabel={column.noneOptionLabel}
            onChange={handleChange}
            wrapperClassName="w-full"
            maxVisibleOptions={column.maxVisibleOptions}
            keepOpenOnSelect={column.keepOpenOnSelect}
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
          onChange={(e) => handleChange(e.target.value)}
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
          placeholder={column.placeholder}
          aria-invalid={Boolean(isTouched && error)}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => {
            const v = e.target.value === "" ? "" : Number(e.target.value);
            handleChange(v);
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
          placeholder={column.placeholder}
          isInvalid={Boolean(isTouched && error)}
          onChange={(nextValue) => handleChange(nextValue)}
        />
      );

    case "text":
    default:
      return (
        <AutoExpandTextarea
          value={value ? String(value) : ""}
          placeholder={column.placeholder}
          isInvalid={Boolean(isTouched && error)}
          onValueChange={(nextValue) => handleChange(nextValue)}
        />
      );
  }
}
