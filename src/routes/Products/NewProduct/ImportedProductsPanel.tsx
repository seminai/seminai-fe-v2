import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Plus,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  EditableTable,
  type EditableTableRef,
} from "@/components/organism/EditableTable";
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
import { getAllFitosanitariRecords } from "@/services/fitosanitariRegistry";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
import { parseDecimal } from "@/utils/number";
import { MultiSearchableSelect } from "@/routes/DosageManager/MultiSearchableSelect";
import type { MultiSearchableSelectOption } from "@/routes/DosageManager/MultiSearchableSelect";

// ─── Review step types ────────────────────────────────────────────────────────

interface ReviewRowState extends ProductImportPreviewRow {
  accepted: boolean;
  conversionRatio: number | null;
}

function toReviewRows(rows: ProductImportPreviewRow[]): ReviewRowState[] {
  return rows.map((r) => ({
    ...r,
    accepted: true,
    conversionRatio:
      r.quantityConverted != null && r.quantity > 0
        ? r.quantityConverted / r.quantity
        : null,
  }));
}

const PRODUCT_CATEGORIES = [
  { value: "FERTILIZER", label: "Fertilizzante" },
  { value: "PESTICIDE", label: "Fitosanitario" },
  { value: "SEED", label: "Seme" },
  { value: "HARVEST", label: "Raccolto" },
  { value: "EQUIPMENT", label: "Attrezzatura" },
  { value: "PACKAGING", label: "Imballaggio" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

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
  onImportingChange?: (isImporting: boolean) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  onImportingChange,
}: ImportedProductsPanelProps) {
  const tableRef = useRef<EditableTableRef>(null);
  const initialTableRows = useMemo(
    () => ProductImportRowBuilder.build(products),
    [products],
  );

  // Step 1: "edit" — EditableTable; Step 2: "review" — ReviewTable
  const [step, setStep] = useState<"edit" | "review">("edit");

  const [tableRows, setTableRows] = useState<ProductImportPreviewRow[]>(
    initialTableRows,
  );
  const [reviewRows, setReviewRows] = useState<ReviewRowState[]>([]);

  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  /** When step is "review": which row is showing the registry select instead of the name input (null = none). */
  const [selectProductRowId, setSelectProductRowId] = useState<string | null>(
    null,
  );

  /** Fitosanitari registry: loaded when entering review step, used for name match and select options. */
  const [fitosanitariRecords, setFitosanitariRecords] = useState<
    FitosanitariDatasetRecord[]
  >([]);
  const [fitosanitariLoading, setFitosanitariLoading] = useState(false);

  /** Rows where user explicitly cleared the registry match. */
  const [deselectedRegistryRowIds, setDeselectedRegistryRowIds] = useState<
    Set<string>
  >(() => new Set());

  const editableTableKey = useMemo(
    () =>
      `${importSource}-${products
        .map(
          (product, index) =>
            `${product.name}-${product.registrationNumber ?? ""}-${product.quantity}-${index}`,
        )
        .join("|")}`,
    [importSource, products],
  );

  useEffect(() => {
    setTableRows(initialTableRows);
    setReviewRows([]);
    setStep("edit");
    setImportError(null);
    setSelectProductRowId(null);
    setDeselectedRegistryRowIds(new Set());
  }, [initialTableRows]);

  useEffect(() => {
    if (step !== "review") return;
    let active = true;
    setFitosanitariLoading(true);
    getAllFitosanitariRecords()
      .then((records) => {
        if (active) setFitosanitariRecords(records);
      })
      .catch((err) => {
        if (active) console.error("Error loading fitosanitari registry:", err);
      })
      .finally(() => {
        if (active) setFitosanitariLoading(false);
      });
    return () => {
      active = false;
    };
  }, [step]);

  const fitosanitariProductNamesSet = useMemo(() => {
    const set = new Set<string>();
    fitosanitariRecords.forEach((r) => {
      if (r.productName?.trim()) {
        set.add(r.productName.trim().toLowerCase());
      }
    });
    return set;
  }, [fitosanitariRecords]);

  const fitosanitariOptionsForReview = useMemo((): MultiSearchableSelectOption[] => {
    return fitosanitariRecords.map((p, index) => {
      const sostanzeAttive = (p.activeIngredients ?? "")
        .replace(/\|/g, " ")
        .trim();
      const statoAmministrativo = p.administrativeStatus?.trim() || "-";
      const principioAttivo = sostanzeAttive || "-";
      const numeroRegistrazione = p.registrationNumber?.trim() || "-";
      return {
        value: String(index),
        label: p.administrativeStatus
          ? `${p.productName} (${p.administrativeStatus})`
          : p.productName,
        groupLabel: "REGISTRO MINISTERIALE",
        description: `Stato: ${statoAmministrativo} • Principio attivo: ${principioAttivo} • N. registrazione: ${numeroRegistrazione}`,
        searchAliases: [p.registrationNumber ?? "", sostanzeAttive].filter(
          Boolean,
        ),
      };
    });
  }, [fitosanitariRecords]);

  const getFitosanitarioRecordByIndex = useCallback(
    (indexStr: string): FitosanitariDatasetRecord | null => {
      const index = parseInt(indexStr, 10);
      if (
        Number.isNaN(index) ||
        index < 0 ||
        index >= fitosanitariRecords.length
      )
        return null;
      return fitosanitariRecords[index] ?? null;
    },
    [fitosanitariRecords],
  );

  const getRowId = useCallback(
    (row: Record<string, unknown>) => (row as ProductImportPreviewRow).id,
    [],
  );

  const columns = useMemo(() => ProductImportColumnsFactory.create(), []);

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

  // ── Step 1 handlers ──────────────────────────────────────────────────────

  const handleSave = useCallback(
    (payload: {
      created: Array<Record<string, unknown>>;
      updated: Array<Record<string, unknown>>;
    }) => {
      const createdRows = payload.created as ProductImportPreviewRow[];
      const updatedRows = payload.updated as ProductImportPreviewRow[];
      const updatedById = new Map(updatedRows.map((r) => [r.id, r]));

      setTableRows((prev) => {
        const merged = prev.map((row) => updatedById.get(row.id) ?? row);
        return [...merged, ...createdRows];
      });
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
    setReviewRows(toReviewRows(tableRows));
    setStep("review");
  }, [tableRows]);

  // ── Step 2 handlers ──────────────────────────────────────────────────────

  const toggleAccepted = useCallback((id: string) => {
    setReviewRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, accepted: !r.accepted } : r)),
    );
  }, []);

  const updateReviewField = useCallback(
    (id: string, field: keyof ProductImportPreviewRow, value: unknown) => {
      setReviewRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const updateReviewQuantity = useCallback((id: string, quantity: number) => {
    setReviewRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const nextConverted =
          r.conversionRatio != null
            ? Math.round(quantity * r.conversionRatio * 100) / 100
            : r.quantityConverted;
        return {
          ...r,
          quantity,
          quantityConverted: nextConverted,
        };
      }),
    );
  }, []);

  const handleSelectFromRegistry = useCallback(
    (rowId: string, record: FitosanitariDatasetRecord) => {
      setReviewRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                name: record.productName,
                registrationNumber: record.registrationNumber ?? "",
              }
            : r,
        ),
      );
      setSelectProductRowId(null);
      setDeselectedRegistryRowIds((prev) => {
        if (!prev.has(rowId)) return prev;
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    },
    [],
  );

  const handleDeselectRegistry = useCallback((rowId: string) => {
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
    setSelectProductRowId(null);
  }, []);

  const handleOpenRegistrySelect = useCallback((rowId: string) => {
    setDeselectedRegistryRowIds((prev) => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    setSelectProductRowId(rowId);
  }, []);

  const acceptedCount = useMemo(
    () => reviewRows.filter((r) => r.accepted).length,
    [reviewRows],
  );

  const hasAnyConverted = useMemo(
    () => reviewRows.some((r) => r.quantityConverted != null),
    [reviewRows],
  );

  const handleConfirmImport = useCallback(async () => {
    const rowsToImport =
      step === "review" ? reviewRows.filter((r) => r.accepted) : tableRows;

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
      const productsPayload = ProductImportRowBuilder.toBulkPayload(rowsToImport);

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
  }, [step, reviewRows, tableRows, companyId, warehouseId, onImportCompleted]);

  // Expose trigger for external callers (QuickCreate etc.)
  useEffect(() => {
    if (importTriggerRef) {
      importTriggerRef.current = handleConfirmImport;
    }
  }, [importTriggerRef, handleConfirmImport]);

  // ── STEP 1: Edit ─────────────────────────────────────────────────────────

  if (step === "edit") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-base font-semibold">
              Prodotti estratti da {sourceLabel}
            </h4>
            {desktopPdfToggle && (
              <div className="hidden lg:block">{desktopPdfToggle}</div>
            )}
          </div>

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

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-blue-900 font-medium">
                {tableRows.length} prodotto/i rilevato/i — controlla e modifica
                i dati prima di continuare
              </span>
            </div>
          </div>

          {mobilePreviewButton && (
            <div className="lg:hidden">{mobilePreviewButton}</div>
          )}
        </div>

        {/* Tabella editabile */}
        <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
          <EditableTable
            key={editableTableKey}
            ref={tableRef}
            columns={columns}
            rows={tableRows}
            isModify={true}
            addButton={true}
            createMode="inline"
            onSave={handleSave}
            onDeleteSelected={handleDeleteSelected}
            showDeleteAction={true}
            getRowId={getRowId}
            className="h-full flex flex-col"
          />
        </div>

        {/* Footer */}
        {!hideFooter && (
          <div className="flex-shrink-0 border-t bg-white p-4 flex justify-end">
            <Button
              onClick={handleContinue}
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
  }

  // ── STEP 2: Review ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-base font-semibold">Revisione prodotti</h4>
          {desktopPdfToggle && (
            <div className="hidden lg:block">{desktopPdfToggle}</div>
          )}
        </div>

        {importError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {importError}
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-blue-900 font-medium">
              {reviewRows.length} prodotto/i —{" "}
              <span className="text-green-700">{acceptedCount} accettati</span>
              {reviewRows.length - acceptedCount > 0 && (
                <span className="text-red-600">
                  {" "}
                  / {reviewRows.length - acceptedCount} rifiutati
                </span>
              )}
            </span>
          </div>
        </div>

        {/* {hasAnyConverted && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="font-medium">Valori convertiti disponibili.</span>{" "}
            Per ogni riga puoi scegliere se usare la quantità originale oppure quella convertita in unità canonica (kg / L).
          </div>
        )} */}
      </div>

      {/* Tabella di revisione */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
        <div className="min-w-max">
          {/* Intestazione */}
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
            {hasAnyConverted && <div>Qtà conv.</div>}
            <div>{importSource === "invoice" ? "N. Fattura" : "Cod. DDT"}</div>
            <div>
              {importSource === "invoice" ? "Data fattura" : "Data DDT"}
            </div>
            <div>Fornitore</div>
          </div>

          {/* Righe */}
          <div className="border border-gray-200 rounded-b-md divide-y divide-gray-100">
            {reviewRows.map((row) => (
              <ReviewRow
                key={row.id}
                row={row}
                importSource={importSource}
                hasAnyConverted={hasAnyConverted}
                onToggleAccepted={toggleAccepted}
                onUpdateField={updateReviewField}
                onUpdateQuantity={updateReviewQuantity}
                nameMatchesRegistry={fitosanitariProductNamesSet.has(
                  row.name?.trim().toLowerCase() ?? "",
                )}
                isDeselected={deselectedRegistryRowIds.has(row.id)}
                isSelectMode={selectProductRowId === row.id}
                fitosanitariLoading={fitosanitariLoading}
                fitosanitariRecords={fitosanitariRecords}
                fitosanitariOptions={fitosanitariOptionsForReview}
                getFitosanitarioRecordByIndex={getFitosanitarioRecordByIndex}
                onSelectFromRegistry={handleSelectFromRegistry}
                onDeselectRegistry={handleDeselectRegistry}
                onCloseSelect={() => setSelectProductRowId(null)}
                onOpenSelect={() => handleOpenRegistrySelect(row.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      {!hideFooter && (
        <div className="flex-shrink-0 border-t bg-white p-4 flex items-center justify-between gap-3 min-w-0 overflow-x-auto">
          <Button
            variant="outline"
            onClick={() => setStep("edit")}
            className="gap-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Indietro
          </Button>
          <Button
            onClick={handleConfirmImport}
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

// ─── ReviewRow ────────────────────────────────────────────────────────────────

interface ReviewRowProps {
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
  nameMatchesRegistry: boolean;
  isDeselected: boolean;
  isSelectMode: boolean;
  fitosanitariLoading: boolean;
  fitosanitariRecords: FitosanitariDatasetRecord[];
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

function ReviewRow({
  row,
  importSource,
  hasAnyConverted,
  onToggleAccepted,
  onUpdateField,
  onUpdateQuantity,
  nameMatchesRegistry,
  isDeselected,
  isSelectMode,
  fitosanitariLoading,
  fitosanitariRecords,
  fitosanitariOptions,
  getFitosanitarioRecordByIndex,
  onSelectFromRegistry,
  onDeselectRegistry,
  onCloseSelect,
  onOpenSelect,
}: ReviewRowProps) {
  const isRejected = !row.accepted;
  const hasConverted = row.quantityConverted != null;

  const docCode = importSource === "invoice" ? row.invoiceCode : row.ddtCode;
  const docDate = importSource === "invoice" ? row.invoiceDate : row.ddtDate;
  const docCodeField = (
    importSource === "invoice" ? "invoiceCode" : "ddtCode"
  ) as keyof ProductImportPreviewRow;
  const docDateField = (
    importSource === "invoice" ? "invoiceDate" : "ddtDate"
  ) as keyof ProductImportPreviewRow;

  const shouldShowRegistrySelect =
    (isSelectMode || nameMatchesRegistry) && !isDeselected;

  /** Show spinner when registry is loading and product is likely a phytosanitary */
  const likelyPhytosanitary =
    !!row.registrationNumber || row.category === "PESTICIDE";
  const showRegistrySpinner = fitosanitariLoading && likelyPhytosanitary;

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

      {/* Col 3 — Prodotto fitosanitario: select from registry, spinner, or "+" button */}
      <div className="min-w-[180px]">
        {showRegistrySpinner ? (
          <div className="flex items-center gap-2 h-7 px-2">
            <Spinner size={14} />
            <span className="text-xs text-muted-foreground">
              Caricamento registro...
            </span>
          </div>
        ) : shouldShowRegistrySelect ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <div className="flex-1 min-w-0">
                <MultiSearchableSelect
                  value={
                    (() => {
                      const idx = fitosanitariRecords.findIndex(
                        (r) =>
                          r.productName?.trim().toLowerCase() ===
                          (row.name ?? "").trim().toLowerCase(),
                      );
                      return idx >= 0 ? [String(idx)] : [];
                    })()
                  }
                  options={fitosanitariOptions}
                  placeholder="Cerca fitosanitario..."
                  searchPlaceholder="Nome, sostanza attiva o n. registrazione"
                  emptyMessage="Nessun prodotto trovato"
                  disabled={isRejected}
                  maxVisibleBadges={1}
                  onChange={(next) => {
                    if (next.length === 0) {
                      onDeselectRegistry(row.id);
                      return;
                    }
                    const last = next[next.length - 1];
                    const record = getFitosanitarioRecordByIndex(last);
                    if (record) onSelectFromRegistry(row.id, record);
                  }}
                  onOpenChange={(open) => {
                    if (!open) onCloseSelect();
                  }}
                />
              </div>
              {!isRejected && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-red-500"
                  onClick={() => onDeselectRegistry(row.id)}
                  title="Rimuovi prodotto fitosanitario"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground flex-1 truncate">
              {row.registrationNumber
                ? `N. ${row.registrationNumber}`
                : "Nessun fitosanitario"}
            </span>
            {!isRejected && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={onOpenSelect}
                title="Seleziona dal registro ministeriale"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
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

      {/* Col 5 — Quantità (virgola o punto come decimale) */}
      <div>
        <Input
          type="text"
          inputMode="decimal"
          value={row.quantity != null ? String(row.quantity) : ""}
          onChange={(e) => onUpdateQuantity(row.id, parseDecimal(e.target.value) || 0)}
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
        <div className="flex flex-col gap-1 pt-0.5">
          {hasConverted ? (
            <span className="text-xs tabular-nums font-medium text-gray-600">
              {row.quantityConverted} {row.unitMeasureConverted ?? ""}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
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
