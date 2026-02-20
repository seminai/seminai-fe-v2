import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
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

interface ImportedProductsPanelProps {
  products: ProductImportItem[];
  previewErrors: ImportPreviewError[];
  companyId: string;
  warehouseId?: string;
  importSource: ProductImportSource;
  onImportCompleted?: () => void;
  mobilePreviewButton?: React.ReactNode;
  /** When true, hides the bottom footer with the import button */
  hideFooter?: boolean;
  /** When set, the import function is stored in this ref so it can be triggered externally */
  importTriggerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  /** Called when importing state changes (for parent to show loading in footer) */
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
  hideFooter,
  importTriggerRef,
  onImportingChange,
}: ImportedProductsPanelProps) {
  const tableRef = useRef<EditableTableRef>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    onImportingChange?.(isImporting);
  }, [isImporting, onImportingChange]);
  const [importError, setImportError] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<ProductImportPreviewRow[]>(() =>
    ProductImportRowBuilder.build(products),
  );

  const columns = useMemo(() => ProductImportColumnsFactory.create(), []);

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

  const handleConfirmImport = useCallback(async () => {
    if (tableRows.length === 0) {
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
      const productsPayload = ProductImportRowBuilder.toBulkPayload(tableRows);
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
  }, [tableRows, companyId, warehouseId, onImportCompleted]);

  // Expose import function via ref for external triggering (no cleanup to avoid null gaps)
  useEffect(() => {
    if (importTriggerRef) {
      importTriggerRef.current = handleConfirmImport;
    }
  }, [importTriggerRef, handleConfirmImport]);

  const sourceLabel = useMemo(() => {
    switch (importSource) {
      case "ddt":
        return "DDT";
      case "csv":
        return "CSV";
      case "excel":
        return "Excel";
      default:
        return "File";
    }
  }, [importSource]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-4 pt-4 space-y-3">
        <h4 className="text-base font-semibold">
          Prodotti estratti da {sourceLabel}
        </h4>

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
              {tableRows.length} prodotto/i rilevato/i
            </span>
          </div>
        </div>

        {mobilePreviewButton && (
          <div className="lg:hidden">{mobilePreviewButton}</div>
        )}
      </div>

      <div className="flex-1 min-h-[300px] px-4 py-3 overflow-auto">
        <EditableTable
          ref={tableRef}
          columns={columns}
          rows={tableRows}
          isModify={true}
          addButton={true}
          createMode="inline"
          onSave={handleSave}
          onDeleteSelected={handleDeleteSelected}
          showDeleteAction={true}
          getRowId={(row) => (row as ProductImportPreviewRow).id}
          className="h-full flex flex-col"
        />
      </div>

      {!hideFooter && (
        <div className="flex-shrink-0 border-t bg-white p-4 flex justify-end">
          <Button
            onClick={handleConfirmImport}
            disabled={isImporting || tableRows.length === 0}
            className="gap-2 bg-agri-green-600 text-white hover:bg-agri-green-700"
          >
            {isImporting ? (
              <>
                <Spinner size={18} /> Importazione...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importa {tableRows.length} prodotto/i
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
