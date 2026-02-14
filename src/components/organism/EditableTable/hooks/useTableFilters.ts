import { useState, useCallback } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  EditableColumn,
  FilterDraft,
  InternalRow,
  TableFilterRule,
} from "../types";
import {
  SYSTEM_DATE_COLUMNS,
  GLOBAL_COMPANY_FILTER_STORAGE_KEY,
  GLOBAL_COMPANY_FILTER_COLUMN_ID,
  GLOBAL_COMPANY_FILTER_ROUTES,
} from "../constants";
import {
  generateTempId,
  getColumnById,
  getOperatorsForColumn,
  applyTextFilter,
  applyNumericFilter,
  applyDateFilter,
  toDateObject,
  isDateInRange,
  getAvailableSystemDateColumns,
  isSystemDateColumn,
} from "../utils";
import { useUserId } from "@/contexts/UserIdContext";
import {
  getScopedStorageItem,
  removeScopedStorageItem,
  setScopedStorageItem,
} from "@/utils/storageKeys";

export interface UseTableFiltersReturn {
  // Panel filter state
  filterDrawerOpen: boolean;
  activeFilters: TableFilterRule[];
  filterDraft: FilterDraft;
  systemDateRanges: Record<string, DateRange | undefined>;
  // Column filter state
  columnFilterOpen: string | undefined;
  columnFilterSelectedValues: Record<string, Set<string>>;
  columnFilterSearchQueries: Record<string, string>;
  columnFilterDateRanges: Record<string, DateRange | undefined>;
  columnFilterSelectedDates: Record<string, Date | undefined>;
  // Methods
  handleFilterDrawerChange: (open: boolean) => void;
  handleFilterDraftChange: (field: keyof FilterDraft, value?: string) => void;
  addFilter: () => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  handleSystemDateRangeChange: (columnId: string, range?: DateRange) => void;
  handleColumnFilterOpenChange: (columnId: string, open: boolean) => void;
  handleColumnFilterSearchChange: (columnId: string, query: string) => void;
  handleColumnFilterValueToggle: (columnId: string, value: string) => void;
  handleColumnFilterDateRangeChange: (
    columnId: string,
    range: DateRange | undefined,
  ) => void;
  handleColumnFilterDateChange: (
    columnId: string,
    date: Date | undefined,
  ) => void;
  handleColumnFilterClear: (columnId: string) => void;
  getFilteredRows: (
    rows: InternalRow[],
    columns: EditableColumn[],
  ) => InternalRow[];
  formatFilterLabel: (
    filter: TableFilterRule,
    columns: EditableColumn[],
  ) => string;
  getAvailableSystemColumns: (rows: InternalRow[]) => EditableColumn[];
  resetColumnFilters: () => void;
}

function createEmptyFilterDraft(): FilterDraft {
  return {
    columnId: undefined,
    operator: undefined,
    value: "",
    secondaryValue: "",
  };
}

function createInitialSystemRanges(): Record<string, DateRange | undefined> {
  return SYSTEM_DATE_COLUMNS.reduce(
    (acc, column) => {
      acc[column.id] = undefined;
      return acc;
    },
    {} as Record<string, DateRange | undefined>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Company Filter – localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

function isGlobalCompanyFilterRoute(): boolean {
  const pathname = window.location.pathname;
  return GLOBAL_COMPANY_FILTER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function loadGlobalCompanyFilter(userId: string): Set<string> {
  try {
    const stored = getScopedStorageItem(GLOBAL_COMPANY_FILTER_STORAGE_KEY, userId);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return new Set<string>();
}

function saveGlobalCompanyFilter(values: Set<string>, userId: string): void {
  try {
    if (values.size === 0) {
      removeScopedStorageItem(GLOBAL_COMPANY_FILTER_STORAGE_KEY, userId);
    } else {
      setScopedStorageItem(
        GLOBAL_COMPANY_FILTER_STORAGE_KEY,
        userId,
        JSON.stringify([...values]),
      );
    }
  } catch {
    // Ignore localStorage errors
  }
}

function buildInitialColumnFilterValues(
  userId: string,
): Record<string, Set<string>> {
  if (!isGlobalCompanyFilterRoute()) return {};
  const saved = loadGlobalCompanyFilter(userId);
  if (saved.size === 0) return {};
  return { [GLOBAL_COMPANY_FILTER_COLUMN_ID]: saved };
}

export function useTableFilters(): UseTableFiltersReturn {
  const userId = useUserId();
  // Panel filter state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<TableFilterRule[]>([]);
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(
    createEmptyFilterDraft(),
  );
  const [systemDateRanges, setSystemDateRanges] = useState<
    Record<string, DateRange | undefined>
  >(createInitialSystemRanges());

  // Column filter state – initialised with persisted global company filter
  const [columnFilterOpen, setColumnFilterOpen] = useState<string | undefined>(
    undefined,
  );
  const [columnFilterSelectedValues, setColumnFilterSelectedValues] = useState<
    Record<string, Set<string>>
  >(() => buildInitialColumnFilterValues(userId));
  const [columnFilterSearchQueries, setColumnFilterSearchQueries] = useState<
    Record<string, string>
  >({});
  const [columnFilterDateRanges, setColumnFilterDateRanges] = useState<
    Record<string, DateRange | undefined>
  >({});
  const [columnFilterSelectedDates, setColumnFilterSelectedDates] = useState<
    Record<string, Date | undefined>
  >({});

  // Panel filter methods
  const handleFilterDrawerChange = useCallback((open: boolean) => {
    setFilterDrawerOpen(open);
    if (!open) {
      setFilterDraft(createEmptyFilterDraft());
    }
  }, []);

  const handleFilterDraftChange = useCallback(
    (field: keyof FilterDraft, value?: string) => {
      setFilterDraft((prev) => {
        const nextDraft: FilterDraft = { ...prev };
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
        }
        return nextDraft;
      });
    },
    [],
  );

  const addFilter = useCallback(() => {
    if (!filterDraft.columnId || !filterDraft.operator) {
      return;
    }
    const trimmedValue = (filterDraft.value ?? "").trim();
    if (!trimmedValue) {
      return;
    }

    const newFilter: TableFilterRule = {
      id: generateTempId(),
      columnId: filterDraft.columnId,
      operator: filterDraft.operator,
      value: trimmedValue,
      secondaryValue: filterDraft.secondaryValue?.trim(),
    };

    setActiveFilters((prev) => [...prev, newFilter]);
    setFilterDraft(createEmptyFilterDraft());
  }, [filterDraft]);

  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters((prev) => {
      const target = prev.find((f) => f.id === filterId);
      const remaining = prev.filter((f) => f.id !== filterId);

      if (target && isSystemDateColumn(target.columnId)) {
        setSystemDateRanges((ranges) => ({
          ...ranges,
          [target.columnId]: undefined,
        }));
      }

      return remaining;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
    setSystemDateRanges(createInitialSystemRanges());
  }, []);

  const handleSystemDateRangeChange = useCallback(
    (columnId: string, range?: DateRange) => {
      setSystemDateRanges((prev) => ({
        ...prev,
        [columnId]: range,
      }));

      setActiveFilters((prev) => {
        const withoutCurrentColumn = prev.filter(
          (f) => f.columnId !== columnId,
        );
        if (range?.from && range?.to) {
          const newFilter: TableFilterRule = {
            id: generateTempId(),
            columnId,
            operator: "between",
            value: format(range.from, "yyyy-MM-dd"),
            secondaryValue: format(range.to, "yyyy-MM-dd"),
          };
          return [...withoutCurrentColumn, newFilter];
        }
        return withoutCurrentColumn;
      });
    },
    [],
  );

  // Column filter methods
  const handleColumnFilterOpenChange = useCallback(
    (columnId: string, open: boolean) => {
      setColumnFilterOpen(open ? columnId : undefined);
      if (open) {
        setColumnFilterSearchQueries((prev) => ({ ...prev, [columnId]: "" }));
      }
    },
    [],
  );

  const handleColumnFilterSearchChange = useCallback(
    (columnId: string, query: string) => {
      setColumnFilterSearchQueries((prev) => ({ ...prev, [columnId]: query }));
    },
    [],
  );

  const handleColumnFilterValueToggle = useCallback(
    (columnId: string, value: string) => {
      setColumnFilterSelectedValues((prev) => {
        const currentSet = prev[columnId] || new Set<string>();
        const newSet = new Set(currentSet);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }

        // Persist global company filter to localStorage
        if (
          columnId === GLOBAL_COMPANY_FILTER_COLUMN_ID &&
          isGlobalCompanyFilterRoute()
        ) {
          saveGlobalCompanyFilter(newSet, userId);
        }

        return { ...prev, [columnId]: newSet };
      });
    },
    [userId],
  );

  const handleColumnFilterDateRangeChange = useCallback(
    (columnId: string, range: DateRange | undefined) => {
      setColumnFilterDateRanges((prev) => ({ ...prev, [columnId]: range }));
      setColumnFilterSelectedDates((prev) => ({
        ...prev,
        [columnId]: undefined,
      }));
    },
    [],
  );

  const handleColumnFilterDateChange = useCallback(
    (columnId: string, date: Date | undefined) => {
      setColumnFilterSelectedDates((prev) => ({ ...prev, [columnId]: date }));
      setColumnFilterDateRanges((prev) => ({ ...prev, [columnId]: undefined }));
    },
    [],
  );

  const handleColumnFilterClear = useCallback((columnId: string) => {
    setColumnFilterSelectedValues((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
    setColumnFilterDateRanges((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
    setColumnFilterSelectedDates((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
    setColumnFilterSearchQueries((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });

    // Clear global company filter from localStorage
    if (
      columnId === GLOBAL_COMPANY_FILTER_COLUMN_ID &&
      isGlobalCompanyFilterRoute()
    ) {
      saveGlobalCompanyFilter(new Set(), userId);
    }
  }, [userId]);

  const resetColumnFilters = useCallback(() => {
    setColumnFilterOpen(undefined);
    // Preserve the global company filter across resets
    setColumnFilterSelectedValues((): Record<string, Set<string>> => {
      if (!isGlobalCompanyFilterRoute())
        return {} as Record<string, Set<string>>;
      const saved = loadGlobalCompanyFilter(userId);
      if (saved.size === 0) return {} as Record<string, Set<string>>;
      return { [GLOBAL_COMPANY_FILTER_COLUMN_ID]: saved };
    });
    setColumnFilterSearchQueries({});
    setColumnFilterDateRanges({});
    setColumnFilterSelectedDates({});
  }, [userId]);

  // Filter application
  const getFilteredRows = useCallback(
    (rows: InternalRow[], columns: EditableColumn[]): InternalRow[] => {
      let filtered = rows;

      // Apply panel filters
      if (activeFilters.length > 0) {
        filtered = filtered.filter((row) => {
          return activeFilters.every((filter) => {
            const column = getColumnById(filter.columnId, columns, rows);
            const columnType = column?.type ?? "text";
            const value = row.data[filter.columnId];

            if (value === undefined || value === null || value === "") {
              return false;
            }

            switch (columnType) {
              case "number":
              case "currency":
                return applyNumericFilter(value, filter);
              case "date":
                return applyDateFilter(value, filter);
              default:
                return applyTextFilter(value, filter);
            }
          });
        });
      }

      // Apply column filters
      filtered = filtered.filter((row) => {
        // Check value filters
        for (const [columnId, selectedValues] of Object.entries(
          columnFilterSelectedValues,
        )) {
          const column = getColumnById(columnId, columns, rows);
          if (column?.type === "date") continue;
          if (selectedValues.size === 0) continue;

          let cellValue: string;
          if (columnId === "productRegistrationNumber") {
            const productName = row.data["productName"];
            const productRegNumber = row.data["productRegistrationNumber"];
            if (
              productName &&
              String(productName).trim() &&
              String(productName).trim() !== "-"
            ) {
              cellValue = String(productName).trim();
            } else if (
              productRegNumber &&
              String(productRegNumber).trim() &&
              String(productRegNumber).trim() !== "-"
            ) {
              cellValue = String(productRegNumber).trim();
            } else {
              cellValue = "";
            }
          } else {
            cellValue = String(row.data[columnId] ?? "").trim();
          }

          if (!cellValue || !selectedValues.has(cellValue)) {
            return false;
          }
        }

        // Check date range filters
        for (const [columnId, dateRange] of Object.entries(
          columnFilterDateRanges,
        )) {
          if (!dateRange) continue;
          const cellDate = toDateObject(row.data[columnId]);
          if (!cellDate) return false;
          if (!isDateInRange(cellDate, dateRange)) return false;
        }

        // Check single date filters
        for (const [columnId, selectedDate] of Object.entries(
          columnFilterSelectedDates,
        )) {
          if (!selectedDate) continue;
          const cellDate = toDateObject(row.data[columnId]);
          if (!cellDate) return false;

          const cellDateOnly = new Date(
            cellDate.getFullYear(),
            cellDate.getMonth(),
            cellDate.getDate(),
          );
          const selectedDateOnly = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
          );
          if (cellDateOnly.getTime() !== selectedDateOnly.getTime()) {
            return false;
          }
        }

        return true;
      });

      return filtered;
    },
    [
      activeFilters,
      columnFilterSelectedValues,
      columnFilterDateRanges,
      columnFilterSelectedDates,
    ],
  );

  const formatFilterLabel = useCallback(
    (filter: TableFilterRule, columns: EditableColumn[]): string => {
      const column = getColumnById(filter.columnId, columns, []);
      const columnLabel = column?.title ?? filter.columnId;
      const operatorLabel =
        getOperatorsForColumn(column).find((op) => op.value === filter.operator)
          ?.label ?? filter.operator;

      if (filter.secondaryValue) {
        return `${columnLabel} ${operatorLabel} ${filter.value} - ${filter.secondaryValue}`;
      }
      return `${columnLabel} ${operatorLabel} ${filter.value}`;
    },
    [],
  );

  const getAvailableSystemColumns = useCallback(
    (rows: InternalRow[]): EditableColumn[] => {
      return getAvailableSystemDateColumns(rows);
    },
    [],
  );

  return {
    filterDrawerOpen,
    activeFilters,
    filterDraft,
    systemDateRanges,
    columnFilterOpen,
    columnFilterSelectedValues,
    columnFilterSearchQueries,
    columnFilterDateRanges,
    columnFilterSelectedDates,
    handleFilterDrawerChange,
    handleFilterDraftChange,
    addFilter,
    removeFilter,
    clearFilters,
    handleSystemDateRangeChange,
    handleColumnFilterOpenChange,
    handleColumnFilterSearchChange,
    handleColumnFilterValueToggle,
    handleColumnFilterDateRangeChange,
    handleColumnFilterDateChange,
    handleColumnFilterClear,
    getFilteredRows,
    formatFilterLabel,
    getAvailableSystemColumns,
    resetColumnFilters,
  };
}
