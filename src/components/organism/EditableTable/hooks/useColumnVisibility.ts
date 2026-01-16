import { useState, useCallback, useMemo, useEffect } from "react";
import { EditableColumn } from "../types";
import {
  MAX_VISIBLE_COLUMNS,
  COLUMN_VISIBILITY_STORAGE_PREFIX,
} from "../constants";
import { generateTableId } from "../utils";

export interface UseColumnVisibilityReturn {
  visibleColumnIds: string[];
  visibleColumns: EditableColumn[];
  handleColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  handleShowAllColumns: () => void;
  handleShowDefaultColumns: () => void;
}

function getStorageKey(tableId: string | undefined, columns: EditableColumn[]): string {
  const generatedId = generateTableId(tableId, columns);
  return `${COLUMN_VISIBILITY_STORAGE_PREFIX}${generatedId}`;
}

function loadVisibleColumnsFromStorage(
  tableId: string | undefined,
  columns: EditableColumn[]
): string[] {
  const storageKey = getStorageKey(tableId, columns);
  const columnIds = columns.map((c) => c.id);

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      const validIds = parsed.filter((id) => columnIds.includes(id));
      if (validIds.length > 0) {
        return validIds;
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  return columnIds.slice(0, MAX_VISIBLE_COLUMNS);
}

function saveVisibleColumnsToStorage(
  tableId: string | undefined,
  columns: EditableColumn[],
  visibleIds: string[]
): void {
  const storageKey = getStorageKey(tableId, columns);
  try {
    localStorage.setItem(storageKey, JSON.stringify(visibleIds));
  } catch {
    // Ignore localStorage errors
  }
}

export function useColumnVisibility(
  columns: EditableColumn[],
  tableId?: string
): UseColumnVisibilityReturn {
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() =>
    loadVisibleColumnsFromStorage(tableId, columns)
  );

  // Reload visibility when tableId or columns change
  useEffect(() => {
    const newVisibleIds = loadVisibleColumnsFromStorage(tableId, columns);
    setVisibleColumnIds(newVisibleIds);
  }, [tableId, columns]);

  const visibleColumns = useMemo(() => {
    return visibleColumnIds
      .map((id) => columns.find((c) => c.id === id))
      .filter((c): c is EditableColumn => c !== undefined);
  }, [visibleColumnIds, columns]);

  const handleColumnVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      setVisibleColumnIds((prev) => {
        let newVisibleIds: string[];

        if (visible) {
          if (!prev.includes(columnId)) {
            newVisibleIds = [...prev, columnId];
          } else {
            return prev;
          }
        } else {
          newVisibleIds = prev.filter((id) => id !== columnId);
          if (newVisibleIds.length === 0) {
            return prev;
          }
        }

        saveVisibleColumnsToStorage(tableId, columns, newVisibleIds);
        return newVisibleIds;
      });
    },
    [tableId, columns]
  );

  const handleShowAllColumns = useCallback(() => {
    const allColumnIds = columns.map((c) => c.id);
    saveVisibleColumnsToStorage(tableId, columns, allColumnIds);
    setVisibleColumnIds(allColumnIds);
  }, [tableId, columns]);

  const handleShowDefaultColumns = useCallback(() => {
    const defaultColumnIds = columns.slice(0, MAX_VISIBLE_COLUMNS).map((c) => c.id);
    saveVisibleColumnsToStorage(tableId, columns, defaultColumnIds);
    setVisibleColumnIds(defaultColumnIds);
  }, [tableId, columns]);

  return {
    visibleColumnIds,
    visibleColumns,
    handleColumnVisibilityChange,
    handleShowAllColumns,
    handleShowDefaultColumns,
  };
}
