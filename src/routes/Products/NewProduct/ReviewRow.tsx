import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X } from "lucide-react";
import { parseDecimal } from "@/utils/number";
import type { MultiSearchableSelectOption } from "@/routes/DosageManager/MultiSearchableSelect";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
import type { ProductImportSource } from "../productImportPreview.types";
import type { ProductImportPreviewRow } from "../productImportPreview.table";
import type { ReviewRowState } from "./reviewRowTypes";
import { ReviewRowPhytosanitaryCell } from "./ReviewRow.parts";

const PRODUCT_CATEGORIES = [
  { value: "FERTILIZER", label: "Fertilizzante" },
  { value: "PESTICIDE", label: "Fitosanitario" },
  { value: "SEED", label: "Seme" },
  { value: "HARVEST", label: "Raccolto" },
  { value: "EQUIPMENT", label: "Attrezzatura" },
  { value: "PACKAGING", label: "Imballaggio" },
];

export interface ReviewRowProps {
  row: ReviewRowState;
  importSource: ProductImportSource;
  hasAnyConverted: boolean;
  onToggleAccepted: (id: string) => void;
  onUpdateField: (
    id: string,
    field: keyof ProductImportPreviewRow,
    value: unknown,
  ) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateConvertedQuantity: (id: string, quantity: number | null) => void;
  /** Index into fitosanitariRecords of the auto-matched record, or null if no match. */
  matchedFitosanitarioIndex: number | null;
  /** How the match was found (deterministic regnum vs. exact name). */
  matchStrategy: "regnum" | "name" | null;
  isDeselected: boolean;
  isSelectMode: boolean;
  fitosanitariLoading: boolean;
  fitosanitariOptions: MultiSearchableSelectOption[];
  getFitosanitarioRecordByIndex: (
    indexStr: string,
  ) => FitosanitariDatasetRecord | null;
  onSelectFromRegistry: (
    rowId: string,
    record: FitosanitariDatasetRecord,
  ) => void;
  onDeselectRegistry: (rowId: string) => void;
  onCloseSelect: () => void;
  onOpenSelect: () => void;
}

export function ReviewRow({
  row,
  importSource,
  hasAnyConverted,
  onToggleAccepted,
  onUpdateField,
  onUpdateQuantity,
  onUpdateConvertedQuantity,
  matchedFitosanitarioIndex,
  matchStrategy,
  isDeselected,
  isSelectMode,
  fitosanitariLoading,
  fitosanitariOptions,
  getFitosanitarioRecordByIndex,
  onSelectFromRegistry,
  onDeselectRegistry,
  onCloseSelect,
  onOpenSelect,
}: ReviewRowProps) {
  const isRejected = !row.accepted;

  const docCode = importSource === "invoice" ? row.invoiceCode : row.ddtCode;
  const docDate = importSource === "invoice" ? row.invoiceDate : row.ddtDate;
  const docCodeField = (
    importSource === "invoice" ? "invoiceCode" : "ddtCode"
  ) as keyof ProductImportPreviewRow;
  const docDateField = (
    importSource === "invoice" ? "invoiceDate" : "ddtDate"
  ) as keyof ProductImportPreviewRow;

  const likelyPhytosanitary =
    !!row.registrationNumber || row.category === "PESTICIDE";
  const isSpinnerVisible = fitosanitariLoading && likelyPhytosanitary;

  return (
    <div
      className={`grid gap-x-2 px-2 py-2 items-start transition-colors ${
        isRejected ? "bg-gray-50 opacity-50" : "bg-white hover:bg-gray-50/50"
      } ${hasAnyConverted ? "grid-cols-[40px_180px_180px_110px_90px_70px_140px_120px_120px_160px]" : "grid-cols-[40px_180px_180px_110px_90px_70px_120px_120px_160px]"}`}
    >
      {/* Col 1 — Accept/Reject */}
      <div className="flex items-center justify-center pt-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 rounded-full border-2 transition-colors ${
            row.accepted
              ? "border-green-500 bg-green-50 text-green-600 hover:bg-green-100"
              : "border-red-400 bg-red-50 text-red-500 hover:bg-red-100"
          }`}
          onClick={() => onToggleAccepted(row.id)}
          title={row.accepted ? "Clicca per rifiutare" : "Clicca per accettare"}
        >
          {row.accepted ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Col 2 — Nome prodotto (editable) */}
      <div className="min-w-0">
        <Input
          value={row.name}
          onChange={(e) => onUpdateField(row.id, "name", e.target.value)}
          disabled={isRejected}
          className="h-7 text-xs"
          placeholder="Nome prodotto"
        />
        {row.productNameExtracted && row.productNameExtracted !== row.name && (
          <Badge
            variant="secondary"
            className="text-[10px] font-normal max-w-full truncate block mt-1"
            title={row.productNameExtracted}
          >
            {row.productNameExtracted}
          </Badge>
        )}
      </div>

      {/* Col 3 — Prodotto fitosanitario */}
      <div className="min-w-[180px]">
        <ReviewRowPhytosanitaryCell
          rowId={row.id}
          registrationNumber={row.registrationNumber}
          isRejected={isRejected}
          matchedFitosanitarioIndex={matchedFitosanitarioIndex}
          matchStrategy={matchStrategy}
          isSelectMode={isSelectMode}
          isDeselected={isDeselected}
          isSpinnerVisible={isSpinnerVisible}
          fitosanitariOptions={fitosanitariOptions}
          getFitosanitarioRecordByIndex={getFitosanitarioRecordByIndex}
          onSelectFromRegistry={onSelectFromRegistry}
          onDeselectRegistry={onDeselectRegistry}
          onCloseSelect={onCloseSelect}
          onOpenSelect={onOpenSelect}
        />
      </div>

      {/* Col 4 — Categoria */}
      <div>
        <Select
          value={row.category || "PESTICIDE"}
          onValueChange={(val) => onUpdateField(row.id, "category", val)}
          disabled={isRejected}
        >
          <SelectTrigger className="h-7 text-xs px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} className="text-xs">
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Col 5 — Quantità */}
      <div>
        <Input
          type="text"
          inputMode="decimal"
          value={row.quantity != null ? String(row.quantity) : ""}
          onChange={(e) =>
            onUpdateQuantity(row.id, parseDecimal(e.target.value) || 0)
          }
          disabled={isRejected}
          className="h-7 text-xs"
        />
      </div>

      {/* Col 6 — Unità di misura */}
      <div>
        <Input
          value={row.unitOfMeasureQuantity}
          onChange={(e) =>
            onUpdateField(row.id, "unitOfMeasureQuantity", e.target.value)
          }
          disabled={isRejected}
          className="h-7 text-xs"
        />
      </div>

      {/* Col 7 — Quantità convertita (opzionale) */}
      {hasAnyConverted && (
        <div className="flex items-center gap-1">
          <Input
            type="text"
            inputMode="decimal"
            value={
              row.quantityConverted != null ? String(row.quantityConverted) : ""
            }
            onChange={(e) =>
              onUpdateConvertedQuantity(
                row.id,
                parseDecimal(e.target.value) ?? null,
              )
            }
            disabled={isRejected}
            className="h-7 text-xs w-[70px]"
            placeholder="—"
          />
          <Input
            value={row.unitMeasureConverted ?? ""}
            onChange={(e) =>
              onUpdateField(
                row.id,
                "unitMeasureConverted",
                e.target.value || null,
              )
            }
            disabled={isRejected}
            className="h-7 text-xs w-[55px]"
            placeholder="U.M."
          />
        </div>
      )}

      {/* Col 8 — Codice DDT / Fattura */}
      <div>
        <Input
          value={docCode ?? ""}
          onChange={(e) => onUpdateField(row.id, docCodeField, e.target.value)}
          disabled={isRejected}
          className="h-7 text-xs"
          placeholder={importSource === "invoice" ? "N. fattura" : "Cod. DDT"}
        />
      </div>

      {/* Col 9 — Data */}
      <div>
        <Input
          value={docDate ?? ""}
          onChange={(e) => onUpdateField(row.id, docDateField, e.target.value)}
          disabled={isRejected}
          className="h-7 text-xs"
          placeholder="AAAA-MM-GG"
        />
      </div>

      {/* Col 10 — Fornitore */}
      <div>
        <Input
          value={row.supplierName ?? ""}
          onChange={(e) =>
            onUpdateField(row.id, "supplierName", e.target.value)
          }
          disabled={isRejected}
          className="h-7 text-xs"
          placeholder="Fornitore"
        />
      </div>
    </div>
  );
}
