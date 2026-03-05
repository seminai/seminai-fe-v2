import { useState, useCallback, useEffect, useRef } from "react";
import { EditableColumn, InternalRow, EditableTableProps } from "../types";
import { generateTempId, createEmptyRow, validateRow } from "../utils";

export interface UseTableStateReturn {
  rows: InternalRow[];
  touched: Record<string, Record<string, boolean>>;
  isEditMode: boolean;
  hasDirtyRows: boolean;
  hasErrors: boolean;
  // Create drawer state
  createDrawerOpen: boolean;
  createRow: InternalRow | undefined;
  createTouched: Record<string, boolean>;
  // Details drawer state
  drawerOpen: boolean;
  drawerRow: InternalRow | undefined;
  // Methods
  setRows: React.Dispatch<React.SetStateAction<InternalRow[]>>;
  setCellValue: (
    rowId: string,
    colId: string,
    value: unknown,
    extraUpdates?: Record<string, unknown>
  ) => void;
  handleCellChange: (row: InternalRow, col: EditableColumn, value: unknown) => void;
  toggleEditMode: () => void;
  handleCancel: () => void;
  handleSave: () => Promise<string[] | void>;
  addRows: (rowsData: Array<Record<string, unknown>>) => void;
  addInlineRow: (prefill?: Record<string, unknown>) => void;
  // Create drawer methods
  openCreateDrawer: () => void;
  handleCreateDrawerChange: (open: boolean) => void;
  handleCreateCellChange: (row: InternalRow, col: EditableColumn, value: unknown) => void;
  handleCreateCancel: () => void;
  handleCreateSave: () => void;
  prefillCreateRow: (data: Record<string, unknown>) => void;
  // Details drawer methods
  openDetails: (row: InternalRow) => void;
  closeDetails: (open: boolean) => void;
  // Validation
  validateRowData: (row: InternalRow) => Record<string, string>;
  // Reset touched on row update
  resetTouched: () => void;
}

export function useTableState(
  props: Pick<
    EditableTableProps,
    | "rows"
    | "columns"
    | "getRowId"
    | "newRowDefaults"
    | "onSave"
    | "alwaysEdit"
    | "createMode"
    | "onOpenDetails"
  >
): UseTableStateReturn {
  const { rows: propsRows, columns, getRowId, newRowDefaults, onSave, createMode, onOpenDetails } = props;

  // Keep a stable ref so effects/callbacks always use the latest getRowId
  // without needing it in dependency arrays (avoids reset on every render).
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;

  const [rows, setRows] = useState<InternalRow[]>(() =>
    (propsRows || []).map((r, idx) => ({
      id: String(getRowId ? getRowId(r, idx) : idx),
      data: { ...r },
      isNew: false,
      isDirty: false,
    }))
  );

  const [touched, setTouched] = useState<Record<string, Record<string, boolean>>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  // Create drawer state
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createRow, setCreateRow] = useState<InternalRow | undefined>(undefined);
  const [createTouched, setCreateTouched] = useState<Record<string, boolean>>({});

  // Details drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRow, setDrawerRow] = useState<InternalRow | undefined>(undefined);

  // Sync with props.rows (only when the actual data changes, not when
  // getRowId reference changes — that would reset edits on every render).
  useEffect(() => {
    const getId = getRowIdRef.current;
    const newRows: InternalRow[] = (propsRows || []).map((r, idx) => ({
      id: String(getId ? getId(r, idx) : idx),
      data: { ...r },
      isNew: false,
      isDirty: false,
    }));

    // Update drawerRow if open
    let updatedDrawerRow = drawerRow;
    if (drawerOpen && drawerRow) {
      const updatedRow = newRows.find((r) => r.id === drawerRow?.id);
      if (updatedRow) {
        updatedDrawerRow = updatedRow;
      }
    }

    setRows(newRows);
    setTouched({});
    setIsEditMode(false);
    setDrawerRow(updatedDrawerRow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsRows]);

  const hasDirtyRows = rows.some((r) => r.isDirty);

  const validateRowData = useCallback(
    (row: InternalRow): Record<string, string> => {
      return validateRow(row, columns);
    },
    [columns]
  );

  const hasErrors = rows.some(
    (r) => Object.keys(validateRowData(r)).length > 0 && r.isDirty
  );

  const setCellValue = useCallback(
    (rowId: string, colId: string, value: unknown, extraUpdates?: Record<string, unknown>) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          const mergedData = {
            ...r.data,
            [colId]: value,
            ...(extraUpdates ?? {}),
          };
          return { ...r, isDirty: true, data: mergedData };
        })
      );

      setTouched((prev) => {
        const touchedForRow = {
          ...(prev[rowId] || {}),
          [colId]: true,
        };
        if (extraUpdates) {
          for (const key of Object.keys(extraUpdates)) {
            touchedForRow[key] = true;
          }
        }
        return { ...prev, [rowId]: touchedForRow };
      });
    },
    []
  );

  const handleCellChange = useCallback(
    (row: InternalRow, col: EditableColumn, value: unknown) => {
      const baseRowData = { ...row.data, [col.id]: value };
      const computedUpdates = col.onValueChange
        ? col.onValueChange({ value, rowData: baseRowData, columnId: col.id })
        : undefined;

      const sanitizedUpdates =
        computedUpdates && typeof computedUpdates === "object"
          ? (computedUpdates as Record<string, unknown>)
          : undefined;

      setCellValue(row.id, col.id, value, sanitizedUpdates);
    },
    [setCellValue]
  );

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      if (prev) {
        // Exiting edit mode - reset rows
        const getId = getRowIdRef.current;
        const resetRows: InternalRow[] = (propsRows || []).map((r, idx) => ({
          id: String(getId ? getId(r, idx) : idx),
          data: { ...r },
          isNew: false,
          isDirty: false,
        }));
        setRows(resetRows);
        setTouched({});
        return false;
      }
      return true;
    });
  }, [propsRows]);

  const handleCancel = useCallback(() => {
    const getId = getRowIdRef.current;
    const resetRows: InternalRow[] = (propsRows || []).map((r, idx) => ({
      id: String(getId ? getId(r, idx) : idx),
      data: { ...r },
      isNew: false,
      isDirty: false,
    }));
    setRows(resetRows);
    setTouched({});
    setIsEditMode(false);
    setCreateRow(undefined);
    setCreateTouched({});
    setCreateDrawerOpen(false);
  }, [propsRows]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    const created = rows.filter((r) => r.isNew);
    const updated = rows.filter((r) => r.isDirty && !r.isNew);

    const changedRows = [...created, ...updated];
    const allErrorColumnIds = new Set<string>();
    let invalid = false;

    for (const r of changedRows) {
      const errors = validateRow(r, columns);
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        invalid = true;
        for (const key of errorKeys) {
          allErrorColumnIds.add(key);
        }
      }
    }

    if (invalid) {
      // Mark all error cells as touched so error indicators show
      setTouched((prev) => {
        const next = { ...prev };
        for (const r of changedRows) {
          const errors = validateRow(r, columns);
          const errorKeys = Object.keys(errors);
          if (errorKeys.length > 0) {
            next[r.id] = { ...(next[r.id] || {}), ...Object.fromEntries(errorKeys.map((k) => [k, true])) };
          }
        }
        return next;
      });
      return Array.from(allErrorColumnIds);
    }

    try {
      await onSave({
        created: created.map((r) => r.data),
        updated: updated.map((r) => r.data),
      });

      setRows((prev) =>
        prev.map((r) => ({ ...r, isDirty: false, isNew: false }))
      );
      setTouched({});
      setIsEditMode(false);
    } catch (error) {
      console.error("Error saving table data:", error);
    }
  }, [rows, columns, onSave]);

  const addRows = useCallback(
    (rowsData: Array<Record<string, unknown>>) => {
      const newRows: InternalRow[] = rowsData.map((data) => ({
        id: generateTempId(),
        data: { ...data },
        isNew: true,
        isDirty: true,
      }));

      setRows((prev) => [...newRows, ...prev]);
      setTouched((prev) => {
        const newTouched = { ...prev };
        newRows.forEach((row) => {
          newTouched[row.id] = Object.fromEntries(columns.map((c) => [c.id, true]));
        });
        return newTouched;
      });
    },
    [columns]
  );

  const addInlineRow = useCallback(
    (prefill?: Record<string, unknown>) => {
      const draftRow = createEmptyRow(columns, newRowDefaults);
      const mergedData = { ...draftRow.data };
      const nextTouched: Record<string, boolean> = {};

      if (prefill && typeof prefill === "object") {
        for (const column of columns) {
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

      setRows((prev) => [createdRow, ...prev]);
      setTouched((prev) => ({
        ...prev,
        [createdRow.id]: Object.fromEntries(
          columns.map((c) => [c.id, Boolean(nextTouched[c.id]) || false])
        ),
      }));
    },
    [columns, newRowDefaults]
  );

  // Create drawer methods
  const openCreateDrawer = useCallback(() => {
    const draftRow = createEmptyRow(columns, newRowDefaults);
    setCreateDrawerOpen(true);
    setCreateRow(draftRow);
    setCreateTouched({});
  }, [columns, newRowDefaults]);

  const handleCreateDrawerChange = useCallback((open: boolean) => {
    if (!open) {
      setCreateDrawerOpen(false);
      setCreateRow(undefined);
      setCreateTouched({});
    }
  }, []);

  const handleCreateCellChange = useCallback(
    (row: InternalRow, col: EditableColumn, value: unknown) => {
      setCreateRow((prev) => {
        if (!prev || prev.id !== row.id) return prev;

        const baseRowData = { ...prev.data, [col.id]: value };
        const computedUpdates = col.onValueChange
          ? col.onValueChange({ value, rowData: baseRowData, columnId: col.id })
          : undefined;

        const sanitizedUpdates =
          computedUpdates && typeof computedUpdates === "object"
            ? (computedUpdates as Record<string, unknown>)
            : undefined;

        const updatedRow: InternalRow = {
          ...prev,
          data: {
            ...prev.data,
            [col.id]: value,
            ...(sanitizedUpdates ?? {}),
          },
        };

        setCreateTouched((prevTouched) => {
          const updatedTouched: Record<string, boolean> = {
            ...prevTouched,
            [col.id]: true,
          };
          if (sanitizedUpdates) {
            for (const key of Object.keys(sanitizedUpdates)) {
              updatedTouched[key] = true;
            }
          }
          return updatedTouched;
        });

        return updatedRow;
      });
    },
    []
  );

  const handleCreateCancel = useCallback(() => {
    setCreateDrawerOpen(false);
    setCreateRow(undefined);
    setCreateTouched({});
  }, []);

  const handleCreateSave = useCallback(() => {
    if (!createRow) return;

    const errors = validateRow(createRow, columns);
    if (Object.keys(errors).length > 0) {
      const newTouched = { ...createTouched };
      Object.keys(errors).forEach((key) => {
        newTouched[key] = true;
      });
      setCreateTouched(newTouched);
      return;
    }

    if (onSave) {
      onSave({
        created: [createRow.data],
        updated: [],
      });
    }

    const persistedRow: InternalRow = {
      ...createRow,
      isNew: false,
      isDirty: false,
      data: { ...createRow.data },
    };

    setRows((prev) => [...prev, persistedRow]);
    setCreateDrawerOpen(false);
    setCreateRow(undefined);
    setCreateTouched({});
  }, [createRow, columns, createTouched, onSave]);

  const prefillCreateRow = useCallback(
    (data: Record<string, unknown>) => {
      if (createMode === "inline") {
        addInlineRow(data);
        return;
      }

      const freshRow = createEmptyRow(columns, newRowDefaults);
      const mergedData = { ...freshRow.data };
      const updatedTouched: Record<string, boolean> = {};

      for (const column of columns) {
        const value = data[column.id];
        if (value !== undefined) {
          mergedData[column.id] = value;
          updatedTouched[column.id] = true;
        }
      }

      setCreateDrawerOpen(true);
      setCreateRow({ ...freshRow, data: mergedData });
      setCreateTouched(updatedTouched);
    },
    [columns, newRowDefaults, createMode, addInlineRow]
  );

  // Details drawer methods
  const openDetails = useCallback(
    (row: InternalRow) => {
      if (onOpenDetails) {
        onOpenDetails(row.data);
      } else {
        setDrawerOpen(true);
        setDrawerRow(row);
      }
    },
    [onOpenDetails]
  );

  const closeDetails = useCallback((open: boolean) => {
    setDrawerOpen(open);
  }, []);

  const resetTouched = useCallback(() => {
    setTouched({});
  }, []);

  return {
    rows,
    touched,
    isEditMode,
    hasDirtyRows,
    hasErrors,
    createDrawerOpen,
    createRow,
    createTouched,
    drawerOpen,
    drawerRow,
    setRows,
    setCellValue,
    handleCellChange,
    toggleEditMode,
    handleCancel,
    handleSave,
    addRows,
    addInlineRow,
    openCreateDrawer,
    handleCreateDrawerChange,
    handleCreateCellChange,
    handleCreateCancel,
    handleCreateSave,
    prefillCreateRow,
    openDetails,
    closeDetails,
    validateRowData,
    resetTouched,
  };
}
