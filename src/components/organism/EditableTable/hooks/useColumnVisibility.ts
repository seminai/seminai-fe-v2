import { useState, useCallback, useMemo, useEffect } from "react";
import { EditableColumn } from "../types";
import {
  MAX_VISIBLE_COLUMNS,
  COLUMN_VISIBILITY_STORAGE_PREFIX,
} from "../constants";
import { generateTableId } from "../utils";
import { useUserId } from "@/contexts/UserIdContext";
import { getScopedStorageItem, setScopedStorageItem } from "@/utils/storageKeys";

export interface UseColumnVisibilityReturn {
  visibleColumnIds: string[];
  visibleColumns: EditableColumn[];
  handleColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  handleShowAllColumns: () => void;
  handleShowDefaultColumns: () => void;
  ensureColumnsVisible: (columnIds: string[]) => void;
}

function getStorageKey(tableId: string | undefined, columns: EditableColumn[]): string {
  const generatedId = generateTableId(tableId, columns);
  return `${COLUMN_VISIBILITY_STORAGE_PREFIX}${generatedId}`;
}

function loadVisibleColumnsFromStorage(
  tableId: string | undefined,
  columns: EditableColumn[],
  userId: string
): string[] {
  const storageKey = getStorageKey(tableId, columns);
  const columnIds = columns.map((c) => c.id);

  try {
    const stored = getScopedStorageItem(storageKey, userId);
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
  visibleIds: string[],
  userId: string
): void {
  const storageKey = getStorageKey(tableId, columns);
  try {
    setScopedStorageItem(storageKey, userId, JSON.stringify(visibleIds));
  } catch {
    // Ignore localStorage errors
  }
}

export function useColumnVisibility(
  columns: EditableColumn[],
  tableId?: string
): UseColumnVisibilityReturn {
  const userId = useUserId();
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() =>
    loadVisibleColumnsFromStorage(tableId, columns, userId)
  );

  // Reload visibility when tableId or columns change
  useEffect(() => {
    const newVisibleIds = loadVisibleColumnsFromStorage(tableId, columns, userId);
    setVisibleColumnIds(newVisibleIds);
  }, [tableId, columns, userId]);

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

        saveVisibleColumnsToStorage(tableId, columns, newVisibleIds, userId);
        return newVisibleIds;
      });
    },
    [tableId, columns, userId]
  );

  const handleShowAllColumns = useCallback(() => {
    const allColumnIds = columns.map((c) => c.id);
    saveVisibleColumnsToStorage(tableId, columns, allColumnIds, userId);
    setVisibleColumnIds(allColumnIds);
  }, [tableId, columns, userId]);

  const handleShowDefaultColumns = useCallback(() => {
    const defaultColumnIds = columns.slice(0, MAX_VISIBLE_COLUMNS).map((c) => c.id);
    saveVisibleColumnsToStorage(tableId, columns, defaultColumnIds, userId);
    setVisibleColumnIds(defaultColumnIds);
  }, [tableId, columns, userId]);

  const ensureColumnsVisible = useCallback(
    (columnIds: string[]) => {
      const allColumnIds = columns.map((c) => c.id);
      const missing = columnIds.filter(
        (id) => allColumnIds.includes(id) && !visibleColumnIds.includes(id),
      );
      if (missing.length === 0) return;

      const newVisibleIds = [...visibleColumnIds, ...missing];
      saveVisibleColumnsToStorage(tableId, columns, newVisibleIds, userId);
      setVisibleColumnIds(newVisibleIds);
    },
    [visibleColumnIds, columns, tableId, userId],
  );

  return {
    visibleColumnIds,
    visibleColumns,
    handleColumnVisibilityChange,
    handleShowAllColumns,
    handleShowDefaultColumns,
    ensureColumnsVisible,
  };
}
