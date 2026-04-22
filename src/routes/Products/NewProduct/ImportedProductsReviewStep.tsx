import type React from "react";
import { useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import { Stepper, type StepperStep } from "@/components/molecules/Stepper";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
import type { ProductImportSource } from "../productImportPreview.types";
import type { ProductImportPreviewRow } from "../productImportPreview.table";
import { ReviewRow } from "./ReviewRow";
import type { ReviewRowState } from "./reviewRowTypes";
import type { FitosanitarioMatch } from "./useFitosanitariMatch";
import type { MultiSearchableSelectOption } from "@/routes/DosageManager/MultiSearchableSelect";

interface ImportedProductsReviewStepProps {
  steps: StepperStep[];
  reviewRows: ReviewRowState[];
  importSource: ProductImportSource;
  importError: string | null;
  isImporting: boolean;
  acceptedCount: number;
  desktopPdfToggle?: React.ReactNode;
  hideFooter?: boolean;
  fitosanitariLoading: boolean;
  fitosanitariOptions: MultiSearchableSelectOption[];
  deselectedRegistryRowIds: Set<string>;
  selectProductRowId: string | null;
  findMatch: (
    row: Pick<ProductImportPreviewRow, "name" | "registrationNumber">,
  ) => FitosanitarioMatch | null;
  getFitosanitarioRecordByIndex: (
    indexStr: string,
  ) => FitosanitariDatasetRecord | null;
  onToggleAccepted: (id: string) => void;
  onUpdateField: (
    id: string,
    field: keyof ProductImportPreviewRow,
    value: unknown,
  ) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateConvertedQuantity: (id: string, quantity: number | null) => void;
  onSelectFromRegistry: (
    rowId: string,
    record: FitosanitariDatasetRecord,
  ) => void;
  onDeselectRegistry: (rowId: string) => void;
  onCloseRegistrySelect: () => void;
  onOpenRegistrySelect: (rowId: string) => void;
  onBack: () => void;
  onConfirmImport: () => void;
}

export function ImportedProductsReviewStep({
  steps,
  reviewRows,
  importSource,
  importError,
  isImporting,
  acceptedCount,
  desktopPdfToggle,
  hideFooter,
  fitosanitariLoading,
  fitosanitariOptions,
  deselectedRegistryRowIds,
  selectProductRowId,
  findMatch,
  getFitosanitarioRecordByIndex,
  onToggleAccepted,
  onUpdateField,
  onUpdateQuantity,
  onUpdateConvertedQuantity,
  onSelectFromRegistry,
  onDeselectRegistry,
  onCloseRegistrySelect,
  onOpenRegistrySelect,
  onBack,
  onConfirmImport,
}: ImportedProductsReviewStepProps) {
  const hasAnyConverted = useMemo(
    () => reviewRows.some((r) => r.quantityConverted != null),
    [reviewRows],
  );

  const handleCloseSelect = useCallback(
    () => onCloseRegistrySelect(),
    [onCloseRegistrySelect],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="space-y-1">
            <h4 className="text-base font-semibold">Revisione prodotti</h4>
            <p className="text-xs text-muted-foreground">
              {reviewRows.length} prodotto/i —{" "}
              <span className="text-green-700 font-medium">
                {acceptedCount} accettati
              </span>
              {reviewRows.length - acceptedCount > 0 && (
                <>
                  {" / "}
                  <span className="text-red-600 font-medium">
                    {reviewRows.length - acceptedCount} rifiutati
                  </span>
                </>
              )}
            </p>
          </div>
          {desktopPdfToggle && (
            <div className="hidden lg:block">{desktopPdfToggle}</div>
          )}
        </div>

        <Stepper steps={steps} currentStepId="review" />

        {importError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {importError}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
        <div className="min-w-max">
          <div
            className={`grid gap-x-2 px-2 py-1.5 bg-gray-100 rounded-t-md border border-b-0 border-gray-200 text-xs font-semibold text-gray-600 sticky top-0 z-10 ${hasAnyConverted ? "grid-cols-[40px_180px_180px_110px_90px_70px_140px_120px_120px_160px]" : "grid-cols-[40px_180px_180px_110px_90px_70px_120px_120px_160px]"}`}
          >
            <div
              className="flex items-center justify-center"
              title="Accetta / Rifiuta"
            >
              ✓/✗
            </div>
            <div>Nome prodotto</div>
            <div>Prodotto estratto</div>
            <div>Categoria</div>
            <div>Quantità</div>
            <div>U.M.</div>
            {hasAnyConverted && <div>Qtà conv. / U.M.</div>}
            <div>{importSource === "invoice" ? "N. Fattura" : "Cod. DDT"}</div>
            <div>
              {importSource === "invoice" ? "Data fattura" : "Data DDT"}
            </div>
            <div>Fornitore</div>
          </div>

          <div className="border border-gray-200 rounded-b-md divide-y divide-gray-100">
            {reviewRows.map((row) => {
              const match = findMatch(row);
              return (
                <ReviewRow
                  key={row.id}
                  row={row}
                  importSource={importSource}
                  hasAnyConverted={hasAnyConverted}
                  onToggleAccepted={onToggleAccepted}
                  onUpdateField={onUpdateField}
                  onUpdateQuantity={onUpdateQuantity}
                  onUpdateConvertedQuantity={onUpdateConvertedQuantity}
                  matchedFitosanitarioIndex={match?.index ?? null}
                  matchStrategy={match?.strategy ?? null}
                  isDeselected={deselectedRegistryRowIds.has(row.id)}
                  isSelectMode={selectProductRowId === row.id}
                  fitosanitariLoading={fitosanitariLoading}
                  fitosanitariOptions={fitosanitariOptions}
                  getFitosanitarioRecordByIndex={getFitosanitarioRecordByIndex}
                  onSelectFromRegistry={onSelectFromRegistry}
                  onDeselectRegistry={onDeselectRegistry}
                  onCloseSelect={handleCloseSelect}
                  onOpenSelect={() => onOpenRegistrySelect(row.id)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {!hideFooter && (
        <div className="flex-shrink-0 border-t bg-white p-4 flex items-center justify-between gap-3 min-w-0 overflow-x-auto">
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Indietro
          </Button>
          <Button
            onClick={onConfirmImport}
            disabled={isImporting || acceptedCount === 0}
            className="gap-2 shrink-0 bg-agri-green-600 text-white hover:bg-agri-green-700"
          >
            {isImporting ? (
              <>
                <Spinner size={18} /> Importazione...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salva {acceptedCount} prodotto/i
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
