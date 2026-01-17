import { useCallback, useMemo, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  EditableTable,
  type EditableColumn,
  type EditableTableRef,
} from "@/components/organism/EditableTable";
import { productsApiService, type BulkProductPayload } from "@/api/products";

interface ProductImportPreviewRow extends Record<string, unknown> {
  id: string;
  name: string;
  sku: string;
  registrationNumber: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  ddtCode: string;
  supplierName: string;
  invoiceDate: string;
}

interface DrawerProductImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Array<{
    productName: string;
    registrationNumber?: string;
    quantity: number;
    quantityUnitOfMeasure: string;
    supplierName?: string;
    supplierVat?: string;
    ddtDate?: string;
    orderNumber?: string;
  }>;
  companyId: string;
  warehouseId: string;
  warehouseName?: string;
  importSource: "ddt" | "csv" | "excel";
  onImportCompleted?: () => void;
}

class ProductImportRowBuilder {
  public static build(
    products: DrawerProductImportPreviewProps["products"]
  ): ProductImportPreviewRow[] {
    return products.map((product, index) => ({
      id: `${product.productName}-${product.registrationNumber}-${index}`,
      name: product.productName,
      sku: product.registrationNumber || product.productName,
      registrationNumber: product.registrationNumber || "",
      quantity: product.quantity,
      unitOfMeasureQuantity: product.quantityUnitOfMeasure || "kg",
      ddtCode: product.orderNumber || "",
      supplierName: product.supplierName || "",
      invoiceDate: product.ddtDate || new Date().toISOString().split("T")[0],
    }));
  }

  public static toBulkPayload(
    rows: ProductImportPreviewRow[]
  ): BulkProductPayload[] {
    return rows.map((row) => ({
      name: row.name,
      sku: row.sku || row.registrationNumber || row.name,
      registrationNumber: row.registrationNumber || undefined,
      category: "PHYTOSANITARY",
      stock: {
        quantity: row.quantity,
        unitOfMeasureQuantity: row.unitOfMeasureQuantity,
        type: "IN" as const,
        ddtCode: row.ddtCode || undefined,
        ddtDate: row.invoiceDate || undefined,
        companySupplierName: row.supplierName || undefined,
      },
    }));
  }
}

class ProductImportColumnsFactory {
  public static create(): EditableColumn[] {
    return [
      {
        id: "name",
        title: "Nome Prodotto",
        type: "text",
        required: true,
        width: "200px",
      },
      {
        id: "sku",
        title: "SKU",
        type: "text",
        required: true,
        width: "120px",
      },
      {
        id: "registrationNumber",
        title: "N. Registrazione",
        type: "text",
        width: "150px",
      },
      {
        id: "quantity",
        title: "Quantità",
        type: "number",
        required: true,
        width: "100px",
      },
      {
        id: "unitOfMeasureQuantity",
        title: "Unità",
        type: "text",
        required: true,
        width: "80px",
      },
      {
        id: "supplierName",
        title: "Fornitore",
        type: "text",
        width: "180px",
      },
      {
        id: "ddtCode",
        title: "Codice DDT",
        type: "text",
        width: "120px",
      },
      {
        id: "invoiceDate",
        title: "Data",
        type: "text",
        width: "120px",
      },
    ];
  }
}

function DrawerProductImportPreview({
  open,
  onOpenChange,
  products,
  companyId,
  warehouseId,
  warehouseName,
  importSource,
  onImportCompleted,
}: DrawerProductImportPreviewProps) {
  const tableRef = useRef<EditableTableRef>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<ProductImportPreviewRow[]>(() =>
    ProductImportRowBuilder.build(products)
  );

  const columns = useMemo(() => ProductImportColumnsFactory.create(), []);

  const handleSave = useCallback(
    (payload: {
      created: Array<Record<string, unknown>>;
      updated: Array<Record<string, unknown>>;
    }): void => {
      const allRows = [
        ...payload.created,
        ...payload.updated,
      ] as ProductImportPreviewRow[];
      setTableRows(allRows);
    },
    []
  );

  const handleDeleteSelected = useCallback(
    (removed: Array<Record<string, unknown>>): void => {
      const removedIds = new Set(
        removed.map((row) => (row as ProductImportPreviewRow).id)
      );
      setTableRows((prev) => prev.filter((row) => !removedIds.has(row.id)));
      toast.success("Prodotti rimossi", {
        description: `${removed.length} prodotto/i rimosso/i dalla lista`,
      });
    },
    []
  );

  const handleConfirmImport = useCallback(async (): Promise<void> => {
    if (tableRows.length === 0) {
      toast.error("Nessun prodotto da importare", {
        description: "Aggiungi almeno un prodotto prima di procedere",
      });
      return;
    }

    if (!companyId || !warehouseId) {
      toast.error("Dati mancanti", {
        description: "Azienda o magazzino non specificati",
      });
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const productsPayload = ProductImportRowBuilder.toBulkPayload(tableRows);

      const response = await productsApiService.bulkImport({
        companyId,
        warehouseId,
        products: productsPayload,
      });

      const imported = response.data?.imported || 0;
      const skipped = response.data?.skipped || 0;
      const errors = response.data?.errors || [];

      toast.success("Importazione completata", {
        description: `${imported} prodotti importati, ${skipped} saltati`,
      });

      if (errors.length > 0) {
        console.warn("Alcuni prodotti non sono stati importati:", errors);
        toast.warning("Alcuni prodotti hanno generato errori", {
          description: `${errors.length} prodotti non importati`,
        });
      }

      onImportCompleted?.();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile completare l'importazione";
      setImportError(message);
      toast.error("Importazione fallita", {
        description: message,
      });
    } finally {
      setIsImporting(false);
    }
  }, [tableRows, companyId, warehouseId, onImportCompleted, onOpenChange]);

  const handleClose = useCallback(() => {
    if (isImporting) {
      return;
    }
    setImportError(null);
    onOpenChange(false);
  }, [isImporting, onOpenChange]);

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
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-6xl bg-white flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Preview Importazione da {sourceLabel}</SheetTitle>
          <SheetDescription>
            Verifica e modifica i prodotti estratti prima di importarli nel
            magazzino.
            {warehouseName && (
              <span className="block mt-1 text-sm font-medium text-foreground">
                Magazzino: {warehouseName}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-4 py-4 gap-4">
          {importError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">
                  Errore durante l&apos;importazione
                </div>
                <p className="text-xs mt-1">{importError}</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">
                  {tableRows.length} prodotto/i rilevato/i
                </p>
                <p className="text-blue-700 mt-1">
                  Puoi modificare, aggiungere o rimuovere prodotti prima
                  dell&apos;importazione definitiva.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
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
        </div>

        <SheetFooter className="flex flex-row gap-3 border-t pt-4 px-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isImporting}
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleConfirmImport}
            disabled={isImporting || tableRows.length === 0}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Spinner size={18} />
                Importazione in corso...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importa {tableRows.length} prodotto/i
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default DrawerProductImportPreview;
