import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { InternalRow } from "../types";

export interface UseTableSelectionReturn {
  selected: Record<string, boolean>;
  selectedIds: string[];
  selectedCount: number;
  allSelected: boolean;
  anySelected: boolean;
  toggleRowSelection: (rowId: string, value: boolean) => void;
  toggleSelectAll: (value: boolean, visibleRows: InternalRow[]) => void;
  clearSelection: () => void;
  buildSelectionPayload: (rows: InternalRow[]) => Array<Record<string, unknown>>;
  getDeletionTargetLabel: () => string;
}

export function useTableSelection(
  onSelectionChange?: (selectedRows: Array<Record<string, unknown>>) => void,
  rows: InternalRow[] = []
): UseTableSelectionReturn {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const rowsRef = useRef<InternalRow[]>(rows);

  rowsRef.current = rows;

  const selectedIds = useMemo(() => {
    return Object.entries(selected)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
  }, [selected]);

  const selectedCount = selectedIds.length;
  const anySelected = selectedCount > 0;

  const buildSelectionPayload = useCallback(
    (rows: InternalRow[]): Array<Record<string, unknown>> => {
      const selectedIdsSet = new Set(selectedIds);
      return rows
        .filter((row) => selectedIdsSet.has(row.id))
        .map((row) => ({ ...row.data }));
    },
    [selectedIds]
  );

  // Notify selection change
  useEffect(() => {
    if (!onSelectionChange) {
      return;
    }
    onSelectionChange(buildSelectionPayload(rowsRef.current));
  }, [selectedIds, onSelectionChange, buildSelectionPayload]);

  const toggleRowSelection = useCallback((rowId: string, value: boolean) => {
    setSelected((prev) => ({ ...prev, [rowId]: value }));
  }, []);

  const toggleSelectAll = useCallback(
    (value: boolean, visibleRows: InternalRow[]) => {
      rowsRef.current = visibleRows;
      setSelected((prev) => {
        const updatedSelection = { ...prev };
        visibleRows.forEach((row) => {
          updatedSelection[row.id] = value;
        });
        return updatedSelection;
      });
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelected({});
  }, []);

  const getDeletionTargetLabel = useCallback((): string => {
    if (selectedCount === 0) {
      return "";
    }
    return selectedCount === 1
      ? "questo elemento selezionato"
      : `${selectedCount} elementi selezionati`;
  }, [selectedCount]);

  return {
    selected,
    selectedIds,
    selectedCount,
    allSelected: false, // Will be computed in component with visible rows
    anySelected,
    toggleRowSelection,
    toggleSelectAll,
    clearSelection,
    buildSelectionPayload,
    getDeletionTargetLabel,
  };
}
