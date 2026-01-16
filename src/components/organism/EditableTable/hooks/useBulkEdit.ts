import { useState, useCallback } from "react";
import { EditableColumn, InternalRow } from "../types";

export interface UseBulkEditReturn {
  bulkEditDrawerOpen: boolean;
  bulkEditValues: Record<string, unknown>;
  openBulkEditDrawer: () => void;
  closeBulkEditDrawer: () => void;
  handleBulkEditDrawerOpenChange: (open: boolean) => void;
  handleBulkEditValueChange: (columnId: string, value: unknown) => void;
  applyBulkEdit: (
    selectedIds: string[],
    columns: EditableColumn[],
    setRows: React.Dispatch<React.SetStateAction<InternalRow[]>>,
    setTouched: React.Dispatch<
      React.SetStateAction<Record<string, Record<string, boolean>>>
    >
  ) => void;
  getEditableColumns: (columns: EditableColumn[]) => EditableColumn[];
}

export function useBulkEdit(): UseBulkEditReturn {
  const [bulkEditDrawerOpen, setBulkEditDrawerOpen] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<Record<string, unknown>>({});

  const openBulkEditDrawer = useCallback(() => {
    setBulkEditDrawerOpen(true);
    setBulkEditValues({});
  }, []);

  const closeBulkEditDrawer = useCallback(() => {
    setBulkEditDrawerOpen(false);
    setBulkEditValues({});
  }, []);

  const handleBulkEditDrawerOpenChange = useCallback((open: boolean) => {
    if (!open) {
      closeBulkEditDrawer();
    }
  }, [closeBulkEditDrawer]);

  const handleBulkEditValueChange = useCallback(
    (columnId: string, value: unknown) => {
      setBulkEditValues((prev) => ({
        ...prev,
        [columnId]: value,
      }));
    },
    []
  );

  const getEditableColumns = useCallback(
    (columns: EditableColumn[]): EditableColumn[] => {
      return columns.filter((col) => !col.readOnly);
    },
    []
  );

  const applyBulkEdit = useCallback(
    (
      selectedIds: string[],
      columns: EditableColumn[],
      setRows: React.Dispatch<React.SetStateAction<InternalRow[]>>,
      setTouched: React.Dispatch<
        React.SetStateAction<Record<string, Record<string, boolean>>>
      >
    ) => {
      const columnsToUpdate = Object.entries(bulkEditValues).filter(
        ([, value]) => value !== undefined && value !== ""
      );

      if (columnsToUpdate.length === 0) {
        return;
      }

      const selectedIdsSet = new Set(selectedIds);

      setRows((prev) =>
        prev.map((row) => {
          if (!selectedIdsSet.has(row.id)) {
            return row;
          }

          const updatedData = { ...row.data };
          let allComputedUpdates: Record<string, unknown> = {};

          for (const [columnId, value] of columnsToUpdate) {
            updatedData[columnId] = value;

            const column = columns.find((c) => c.id === columnId);
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
        })
      );

      setTouched((prev) => {
        const updatedTouched = { ...prev };
        selectedIdsSet.forEach((rowId) => {
          const touchedCols = updatedTouched[rowId] || {};
          for (const [columnId] of columnsToUpdate) {
            touchedCols[columnId] = true;
          }
          updatedTouched[rowId] = touchedCols;
        });
        return updatedTouched;
      });

      closeBulkEditDrawer();
    },
    [bulkEditValues, closeBulkEditDrawer]
  );

  return {
    bulkEditDrawerOpen,
    bulkEditValues,
    openBulkEditDrawer,
    closeBulkEditDrawer,
    handleBulkEditDrawerOpenChange,
    handleBulkEditValueChange,
    applyBulkEdit,
    getEditableColumns,
  };
}
