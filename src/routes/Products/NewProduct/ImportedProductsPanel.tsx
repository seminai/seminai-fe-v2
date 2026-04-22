import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type EditableTableRef } from "@/components/organism/EditableTable";
import { productsApiService } from "@/api/products";
import type {
  ImportPreviewError,
  ProductImportItem,
  ProductImportSource,
} from "../productImportPreview.types";
import {
  ProductImportColumnsFactory,
  ProductImportRowBuilder,
  type ProductImportPreviewRow,
} from "../productImportPreview.table";
import { ImportedProductsEditStep } from "./ImportedProductsEditStep";
import { ImportedProductsReviewStep } from "./ImportedProductsReviewStep";
import { useFitosanitariMatch } from "./useFitosanitariMatch";
import { useReviewState } from "./useReviewState";

const IMPORT_STEPS = [
  { id: "edit", label: "Modifica dati" },
  { id: "review", label: "Revisione e match fitosanitari" },
];

interface ImportedProductsPanelProps {
  products: ProductImportItem[];
  previewErrors: ImportPreviewError[];
  companyId: string;
  warehouseId?: string;
  importSource: ProductImportSource;
  onImportCompleted?: () => void;
  mobilePreviewButton?: React.ReactNode;
  /** Desktop: button to show/hide PDF panel (eye) when in split view */
  desktopPdfToggle?: React.ReactNode;
  hideFooter?: boolean;
  importTriggerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  /**
   * Ref populated when the panel is on the review step and supports going
   * back to the edit step internally (e.g. driven by an external footer).
   * Null otherwise.
   */
  backTriggerRef?: React.MutableRefObject<(() => void) | null>;
  /** Notifies the parent about the current internal step. */
  onStepChange?: (step: "edit" | "review") => void;
  onImportingChange?: (isImporting: boolean) => void;
}

export default function ImportedProductsPanel({
  products,
  previewErrors,
  companyId,
  warehouseId,
  importSource,
  onImportCompleted,
  mobilePreviewButton,
  desktopPdfToggle,
  hideFooter,
  importTriggerRef,
  backTriggerRef,
  onStepChange,
  onImportingChange,
}: ImportedProductsPanelProps) {
  const tableRef = useRef<EditableTableRef>(null);
  const initialTableRows = useMemo(
    () => ProductImportRowBuilder.build(products),
    [products],
  );

  const [step, setStep] = useState<"edit" | "review">("edit");
  const [tableRows, setTableRows] =
    useState<ProductImportPreviewRow[]>(initialTableRows);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const fito = useFitosanitariMatch(step === "review");
  const review = useReviewState({ tableRows, setTableRows });

  const editableTableKey = useMemo(
    () =>
      `${importSource}-${products
        .map(
          (p, index) =>
            `${p.name}-${p.registrationNumber ?? ""}-${p.quantity}-${index}`,
        )
        .join("|")}`,
    [importSource, products],
  );

  useEffect(() => {
    setTableRows(initialTableRows);
    setStep("edit");
    setImportError(null);
    review.reset();
    // review.reset is stable (useCallback); re-run only when source products change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTableRows]);

  const getRowId = useCallback(
    (row: Record<string, unknown>) => (row as ProductImportPreviewRow).id,
    [],
  );

  const columns = useMemo(
    () => ProductImportColumnsFactory.create(importSource),
    [importSource],
  );

  useEffect(() => {
    onImportingChange?.(isImporting);
  }, [isImporting, onImportingChange]);

  const sourceLabel = useMemo(() => {
    switch (importSource) {
      case "ddt":
        return "DDT";
      case "csv":
        return "CSV";
      case "excel":
        return "Excel";
      case "invoice":
        return "Fattura";
      default:
        return "File";
    }
  }, [importSource]);

  const handleRowsChange = useCallback(
    (rows: Array<Record<string, unknown>>) => {
      setTableRows(rows as ProductImportPreviewRow[]);
    },
    [],
  );

  const handleDeleteSelected = useCallback(
    (removed: Array<Record<string, unknown>>) => {
      const removedIds = new Set(
        removed.map((r) => (r as ProductImportPreviewRow).id),
      );
      setTableRows((prev) => prev.filter((row) => !removedIds.has(row.id)));
      toast.success(`${removed.length} prodotto/i rimosso/i dalla lista`);
    },
    [],
  );

  const handleContinue = useCallback(() => {
    review.syncFromTableRows();
    setStep("review");
  }, [review]);

  const handleConfirmImport = useCallback(async () => {
    const rowsToImport =
      step === "review"
        ? review.reviewRows.filter((r) => r.accepted)
        : tableRows;

    if (rowsToImport.length === 0) {
      toast.error("Nessun prodotto da importare");
      return;
    }
    if (!companyId) {
      toast.error("Azienda non specificata");
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const productsPayload =
        ProductImportRowBuilder.toBulkPayload(rowsToImport);

      const response = await productsApiService.bulkImport({
        companyId,
        ...(warehouseId && { warehouseId }),
        products: productsPayload,
      });

      const created = response.data?.productsCreated ?? 0;
      const updated = response.data?.productsUpdated ?? 0;
      const stocks = response.data?.stocksCreated ?? 0;
      const imported = response.data?.imported ?? 0;
      const total = created + updated > 0 ? created + updated : imported;

      toast.success("Importazione completata", {
        description:
          created + updated > 0
            ? `${created} creati, ${updated} aggiornati${stocks > 0 ? `, ${stocks} stock` : ""}`
            : `${total} prodotti importati`,
      });

      onImportCompleted?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Importazione fallita";
      setImportError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  }, [
    step,
    review.reviewRows,
    tableRows,
    companyId,
    warehouseId,
    onImportCompleted,
  ]);

  const handleGoBackToEdit = useCallback(() => {
    setStep("edit");
  }, []);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    if (!importTriggerRef) return;
    importTriggerRef.current =
      step === "edit"
        ? async () => handleContinue()
        : handleConfirmImport;
    return () => {
      if (importTriggerRef.current) {
        importTriggerRef.current = null;
      }
    };
  }, [importTriggerRef, step, handleContinue, handleConfirmImport]);

  useEffect(() => {
    if (!backTriggerRef) return;
    backTriggerRef.current = step === "review" ? handleGoBackToEdit : null;
    return () => {
      backTriggerRef.current = null;
    };
  }, [backTriggerRef, step, handleGoBackToEdit]);

  if (step === "edit") {
    return (
      <ImportedProductsEditStep
        ref={tableRef}
        steps={IMPORT_STEPS}
        sourceLabel={sourceLabel}
        importSource={importSource}
        tableRows={tableRows}
        columns={columns}
        previewErrors={previewErrors}
        editableTableKey={editableTableKey}
        desktopPdfToggle={desktopPdfToggle}
        mobilePreviewButton={mobilePreviewButton}
        hideFooter={hideFooter}
        getRowId={getRowId}
        onRowsChange={handleRowsChange}
        onDeleteSelected={handleDeleteSelected}
        onContinue={handleContinue}
      />
    );
  }

  return (
    <ImportedProductsReviewStep
      steps={IMPORT_STEPS}
      reviewRows={review.reviewRows}
      importSource={importSource}
      importError={importError}
      isImporting={isImporting}
      acceptedCount={review.acceptedCount}
      desktopPdfToggle={desktopPdfToggle}
      hideFooter={hideFooter}
      fitosanitariLoading={fito.loading}
      fitosanitariOptions={fito.options}
      deselectedRegistryRowIds={review.deselectedRegistryRowIds}
      selectProductRowId={review.selectProductRowId}
      findMatch={fito.findMatch}
      getFitosanitarioRecordByIndex={fito.getRecordByIndex}
      onToggleAccepted={review.toggleAccepted}
      onUpdateField={review.updateField}
      onUpdateQuantity={review.updateQuantity}
      onUpdateConvertedQuantity={review.updateConvertedQuantity}
      onSelectFromRegistry={review.selectFromRegistry}
      onDeselectRegistry={review.deselectRegistry}
      onCloseRegistrySelect={review.closeRegistrySelect}
      onOpenRegistrySelect={review.openRegistrySelect}
      onBack={handleGoBackToEdit}
      onConfirmImport={handleConfirmImport}
    />
  );
}
