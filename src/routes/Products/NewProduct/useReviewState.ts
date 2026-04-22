import { useCallback, useMemo, useState } from "react";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
import type { ProductImportPreviewRow } from "../productImportPreview.table";
import {
  toReviewRows,
  type ReviewRowState,
} from "./reviewRowTypes";

interface UseReviewStateArgs {
  tableRows: ProductImportPreviewRow[];
  setTableRows: React.Dispatch<
    React.SetStateAction<ProductImportPreviewRow[]>
  >;
}

export interface UseReviewStateResult {
  reviewRows: ReviewRowState[];
  acceptedCount: number;
  selectProductRowId: string | null;
  deselectedRegistryRowIds: Set<string>;
  /** Rebuild reviewRows from tableRows preserving previous step-2 decisions. */
  syncFromTableRows: () => void;
  /** Reset all review-specific state (used when the source products change). */
  reset: () => void;
  toggleAccepted: (id: string) => void;
  updateField: (
    id: string,
    field: keyof ProductImportPreviewRow,
    value: unknown,
  ) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateConvertedQuantity: (id: string, quantity: number | null) => void;
  selectFromRegistry: (
    rowId: string,
    record: FitosanitariDatasetRecord,
  ) => void;
  deselectRegistry: (rowId: string) => void;
  openRegistrySelect: (rowId: string) => void;
  closeRegistrySelect: () => void;
}

/**
 * Encapsulates the review-step state machine: accepted/rejected rows, manual
 * phytosanitary picks, and quantity/conversion edits. Propagates name and
 * registrationNumber changes back to `tableRows` so bouncing between steps
 * doesn't lose manual matches.
 */
export function useReviewState({
  tableRows,
  setTableRows,
}: UseReviewStateArgs): UseReviewStateResult {
  const [reviewRows, setReviewRows] = useState<ReviewRowState[]>([]);
  const [selectProductRowId, setSelectProductRowId] = useState<string | null>(
    null,
  );
  const [deselectedRegistryRowIds, setDeselectedRegistryRowIds] = useState<
    Set<string>
  >(() => new Set());

  const reset = useCallback(() => {
    setReviewRows([]);
    setSelectProductRowId(null);
    setDeselectedRegistryRowIds(new Set());
  }, []);

  const syncFromTableRows = useCallback(() => {
    setReviewRows((prev) => {
      if (prev.length === 0) return toReviewRows(tableRows);
      const byId = new Map(prev.map((r) => [r.id, r]));
      return tableRows.map((row) => {
        const existing = byId.get(row.id);
        if (!existing) return toReviewRows([row])[0];
        return {
          ...existing,
          ...row,
          accepted: existing.accepted,
        };
      });
    });
  }, [tableRows]);

  const toggleAccepted = useCallback((id: string) => {
    setReviewRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, accepted: !r.accepted } : r)),
    );
  }, []);

  const updateField = useCallback(
    (id: string, field: keyof ProductImportPreviewRow, value: unknown) => {
      setReviewRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setReviewRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const nextConverted =
          r.conversionRatio != null
            ? Math.round(quantity * r.conversionRatio * 100) / 100
            : r.quantityConverted;
        return { ...r, quantity, quantityConverted: nextConverted };
      }),
    );
  }, []);

  const updateConvertedQuantity = useCallback(
    (id: string, quantityConverted: number | null) => {
      setReviewRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const nextRatio =
            quantityConverted != null && r.quantity > 0
              ? quantityConverted / r.quantity
              : null;
          return { ...r, quantityConverted, conversionRatio: nextRatio };
        }),
      );
    },
    [],
  );

  const selectFromRegistry = useCallback(
    (rowId: string, record: FitosanitariDatasetRecord) => {
      const patch = {
        name: record.productName,
        registrationNumber: record.registrationNumber ?? "",
      };
      setReviewRows((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
      );
      setTableRows((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
      );
      setSelectProductRowId(null);
      setDeselectedRegistryRowIds((prev) => {
        if (!prev.has(rowId)) return prev;
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    },
    [setTableRows],
  );

  const deselectRegistry = useCallback(
    (rowId: string) => {
      setDeselectedRegistryRowIds((prev) => {
        if (prev.has(rowId)) return prev;
        const next = new Set(prev);
        next.add(rowId);
        return next;
      });
      setReviewRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, registrationNumber: "" } : r,
        ),
      );
      setTableRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, registrationNumber: "" } : r,
        ),
      );
      setSelectProductRowId(null);
    },
    [setTableRows],
  );

  const openRegistrySelect = useCallback((rowId: string) => {
    setDeselectedRegistryRowIds((prev) => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    setSelectProductRowId(rowId);
  }, []);

  const closeRegistrySelect = useCallback(
    () => setSelectProductRowId(null),
    [],
  );

  const acceptedCount = useMemo(
    () => reviewRows.filter((r) => r.accepted).length,
    [reviewRows],
  );

  return {
    reviewRows,
    acceptedCount,
    selectProductRowId,
    deselectedRegistryRowIds,
    syncFromTableRows,
    reset,
    toggleAccepted,
    updateField,
    updateQuantity,
    updateConvertedQuantity,
    selectFromRegistry,
    deselectRegistry,
    openRegistrySelect,
    closeRegistrySelect,
  };
}
