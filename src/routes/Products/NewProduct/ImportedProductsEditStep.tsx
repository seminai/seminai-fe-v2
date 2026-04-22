import type React from "react";
import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight } from "lucide-react";
import {
  EditableTable,
  type EditableColumn,
  type EditableTableRef,
} from "@/components/organism/EditableTable";
import { Stepper, type StepperStep } from "@/components/molecules/Stepper";
import type {
  ImportPreviewError,
  ProductImportSource,
} from "../productImportPreview.types";
import type { ProductImportPreviewRow } from "../productImportPreview.table";

interface ImportedProductsEditStepProps {
  steps: StepperStep[];
  sourceLabel: string;
  importSource: ProductImportSource;
  tableRows: ProductImportPreviewRow[];
  columns: EditableColumn[];
  previewErrors: ImportPreviewError[];
  editableTableKey: string;
  desktopPdfToggle?: React.ReactNode;
  mobilePreviewButton?: React.ReactNode;
  hideFooter?: boolean;
  getRowId: (row: Record<string, unknown>) => string;
  onRowsChange: (rows: Array<Record<string, unknown>>) => void;
  onDeleteSelected: (removed: Array<Record<string, unknown>>) => void;
  onContinue: () => void;
}

export const ImportedProductsEditStep = forwardRef<
  EditableTableRef,
  ImportedProductsEditStepProps
>(function ImportedProductsEditStep(
  {
    steps,
    sourceLabel,
    tableRows,
    columns,
    previewErrors,
    editableTableKey,
    desktopPdfToggle,
    mobilePreviewButton,
    hideFooter,
    getRowId,
    onRowsChange,
    onDeleteSelected,
    onContinue,
  },
  ref,
) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="space-y-1">
            <h4 className="text-base font-semibold">
              Prodotti estratti da {sourceLabel}
            </h4>
            <p className="text-xs text-muted-foreground">
              {tableRows.length} prodotto/i rilevato/i — modifica le celle
              direttamente come in un foglio di calcolo, poi premi Continua.
            </p>
          </div>
          {desktopPdfToggle && (
            <div className="hidden lg:block">{desktopPdfToggle}</div>
          )}
        </div>

        <Stepper steps={steps} currentStepId="edit" />

        {previewErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4 text-xs space-y-1">
                {previewErrors.map((w, i) => (
                  <li key={`${w.message}-${i}`}>
                    {w.row !== undefined ? `Riga ${w.row}: ` : ""}
                    {w.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {mobilePreviewButton && (
          <div className="lg:hidden">{mobilePreviewButton}</div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
        <EditableTable
          key={editableTableKey}
          ref={ref}
          columns={columns}
          rows={tableRows}
          isModify
          alwaysEdit
          hideInternalSaveActions
          addButton
          createMode="inline"
          onRowsChange={onRowsChange}
          onDeleteSelected={onDeleteSelected}
          showDeleteAction
          getRowId={getRowId}
          className="h-full flex flex-col"
        />
      </div>

      {!hideFooter && (
        <div className="flex-shrink-0 border-t bg-white p-4 flex justify-end">
          <Button
            onClick={onContinue}
            disabled={tableRows.length === 0}
            className="gap-2 bg-agri-green-600 text-white hover:bg-agri-green-700"
          >
            Continua
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});
