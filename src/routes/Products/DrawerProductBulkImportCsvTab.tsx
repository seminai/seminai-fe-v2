import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileDown, Info, AlertTriangle, CheckCircle2, File } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  productsApiService,
  type ImportFromCsvExcelPreviewProduct,
} from "@/api/products";
import type {
  ImportPreviewError,
  ProductImportItem,
  ProductImportSource,
} from "./productImportPreview.types";

const BULK_FILE_ACCEPT = ".csv,.xls,.xlsx";

type PreviewReadyPayload = {
  products: ProductImportItem[];
  errors: ImportPreviewError[];
  source: ProductImportSource;
};

interface DrawerProductBulkImportCsvTabProps {
  companyId: string;
  warehouseId?: string;
  canShowImportSections: boolean;
  onPreviewReady: (payload: PreviewReadyPayload) => void;
  onImportButtonStateChange?: (state: {
    canImport: boolean;
    isPreviewing: boolean;
    onImport: () => void;
  }) => void;
}

class BulkProductTemplateBuilder {
  public static downloadTemplate(): void {
    const link = document.createElement("a");
    link.href = "/templates/2026.01_Template_MAGAZZINO.xlsx";
    link.download = "2026.01_Template_MAGAZZINO.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

class CsvExcelPreviewMapper {
  public map(
    products: ImportFromCsvExcelPreviewProduct[],
  ): ProductImportItem[] {
    return products.map((product) => ({
      name: product.name,
      sku: product.sku ?? undefined,
      barcode: product.barcode ?? undefined,
      category: product.category ?? undefined,
      type: product.type ?? undefined,
      description: product.description ?? undefined,
      registrationNumber: product.registrationNumber ?? undefined,
      quantity: product.stock?.quantity ?? 0,
      unitOfMeasureQuantity: product.stock?.unitOfMeasureQuantity || "kg",
      price: product.stock?.price ?? undefined,
      unitOfMeasurePrice: product.stock?.unitOfMeasurePrice ?? undefined,
      ddtCode: product.stock?.ddtCode ?? undefined,
      ddtDate: product.stock?.ddtDate ?? undefined,
      invoiceCode: product.stock?.invoiceCode ?? undefined,
      invoiceDate: product.stock?.invoiceDate ?? undefined,
      supplierName: product.stock?.companySupplierName ?? undefined,
      addressSupplier: product.stock?.addressSupplier ?? undefined,
      supplierVat: product.stock?.vatNumberSupplier ?? undefined,
    }));
  }
}

class CsvExcelFileValidator {
  public static validate(file: File): void {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["csv", "xls", "xlsx"].includes(extension)) {
      throw new Error("Formato non supportato. Usa file CSV o Excel");
    }
  }

  public static detectSource(file: File): ProductImportSource {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    return extension === "csv" ? "csv" : "excel";
  }
}

function DrawerProductBulkImportCsvTab({
  companyId,
  warehouseId,
  canShowImportSections,
  onPreviewReady,
  onImportButtonStateChange,
}: DrawerProductBulkImportCsvTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [parserErrors, setParserErrors] = useState<string[]>([]);

  const canImport = useMemo(() => {
    return (
      Boolean(selectedFile) && companyId.trim().length > 0 && !isPreviewing
    );
  }, [selectedFile, companyId, isPreviewing]);

  const handleFileSelect = useCallback((file: File) => {
    try {
      CsvExcelFileValidator.validate(file);
      setSelectedFileName(file.name);
      setSelectedFile(file);
      setParserErrors([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore durante il caricamento del file";
      setParserErrors([message]);
      toast.error(message);
      setSelectedFile(null);
      setSelectedFileName(null);
    }
  }, []);

  const handleFileChange = useCallback(() => {
    if (!fileInputRef.current?.files?.length) {
      return;
    }
    handleFileSelect(fileInputRef.current.files[0]);
  }, [handleFileSelect]);

  const handleDrag = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect],
  );

  const handlePreviewImport = useCallback(async () => {
    if (!canImport || !selectedFile) {
      return;
    }

    setIsPreviewing(true);
    setParserErrors([]);

    try {
      const response = await productsApiService.importFromCsvExcelPreview({
        file: selectedFile,
        companyId,
        warehouseId,
      });

      const previewProducts = new CsvExcelPreviewMapper().map(
        response.data?.products ?? [],
      );
      const previewErrors = response.data?.errors ?? [];

      if (previewProducts.length === 0) {
        toast.warning("Nessun prodotto valido trovato nel file");
        if (previewErrors.length > 0) {
          setParserErrors(previewErrors.map((error) => error.message));
        }
        return;
      }

      onPreviewReady({
        products: previewProducts,
        errors: previewErrors,
        source: CsvExcelFileValidator.detectSource(selectedFile),
      });

      toast.success("Prodotti estratti dal file", {
        description: `${previewProducts.length} prodotti pronti per l'importazione`,
      });

      setSelectedFile(null);
      setSelectedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Estrazione non riuscita";
      setParserErrors([message]);
      toast.error(message);
    } finally {
      setIsPreviewing(false);
    }
  }, [canImport, companyId, onPreviewReady, selectedFile, warehouseId]);

  // Notifica il componente padre dello stato del bottone
  useEffect(() => {
    if (onImportButtonStateChange) {
      onImportButtonStateChange({
        canImport,
        isPreviewing,
        onImport: handlePreviewImport,
      });
    }
  }, [canImport, isPreviewing, handlePreviewImport, onImportButtonStateChange]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => BulkProductTemplateBuilder.downloadTemplate()}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Scarica template
        </Button>
      </div>

      {!canShowImportSections ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Seleziona i dati principali</AlertTitle>
          <AlertDescription>
            Per poter importare il file devi prima scegliere un&apos;azienda.
            Una volta completata la selezione appariranno i controlli di
            caricamento.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-2">
            <Label>File CSV o Excel</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                selectedFileName
                  ? "border-green-500 bg-green-50/50"
                  : dragActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-gray-400"
              } ${isPreviewing ? "opacity-50 pointer-events-none" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={BULK_FILE_ACCEPT}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isPreviewing}
              />

              <div className="space-y-3">
                <div className="flex justify-center">
                  {isPreviewing ? (
                    <Spinner size={40} ariaLabel="Elaborazione file" />
                  ) : selectedFileName ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <File className="h-12 w-12 text-green-600" />
                        <CheckCircle2 className="h-6 w-6 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
                      </div>
                    </div>
                  ) : (
                    <Upload className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                {!isPreviewing && (
                  <>
                    {selectedFileName ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <p className="text-base font-semibold text-green-700">
                            File selezionato
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-md border border-green-200 max-w-md mx-auto">
                          <File className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {selectedFileName}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          Clicca per selezionare un altro file
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-700">
                          Trascina qui il file CSV o Excel
                        </p>
                        <p className="text-xs text-gray-500">
                          oppure clicca per selezionare il file
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Formati supportati: CSV, XLS, XLSX
                        </p>
                      </>
                    )}
                  </>
                )}

                {isPreviewing && (
                  <p className="text-sm text-gray-600">
                    Estrazione prodotti in corso...
                  </p>
                )}
              </div>
            </div>
          </div>

          {parserErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Problemi rilevati</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1">
                  {parserErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {selectedFileName && (
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle>File pronto per la preview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clicca su &quot;Importa prodotti&quot; nel footer per ottenere
                  la preview dal servizio e verificare i dati estratti.
                </p>
              </CardHeader>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default DrawerProductBulkImportCsvTab;
