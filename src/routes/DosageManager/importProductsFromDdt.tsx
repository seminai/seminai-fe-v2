import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  productsApiService,
  type BulkFromDdtFileResult,
  type BulkFromDdtToProductListResponse,
  type BulkFromDdtEntry,
  type BulkFromDdtSuggestedProduct,
} from "@/api/products";
import type { DosageProduct } from "@/api/dosage-agent";

interface ImportProductsFromDdtProps {
  onAddRows?: (rows: Array<Record<string, unknown>>) => void;
  onProductsChange?: (products: DosageProduct[]) => void;
  onCloseParentDrawer?: () => void;
  onOpenParentDrawer?: () => void;
  disabled?: boolean;
  onSelectImportMethod?: () => void;
}

interface ProductsImporterService {
  importFromDdt(files: File[]): Promise<BulkFromDdtToProductListResponse>;
}

type DdtImportOutcome = {
  products: DosageProduct[];
  rows: Array<Record<string, unknown>>;
  meta: {
    totalFiles: number;
    totalEntries: number;
  };
  results: BulkFromDdtFileResult[];
};

const MAX_IMPORT_FILES = 10;

class DdtProductImportManager {
  constructor(private readonly service: ProductsImporterService) {}

  public async import(files: File[]): Promise<DdtImportOutcome> {
    const sanitizedFiles = this.sanitizeFiles(files);
    const response = await this.service.importFromDdt(sanitizedFiles);
    const normalized = this.normalizeResponse(response, sanitizedFiles);

    const products = this.toDosageProducts(normalized.results);
    const rows = this.toEditableRows(products);

    return {
      products,
      rows,
      meta: {
        totalFiles: normalized.totalFiles,
        totalEntries: normalized.totalEntries,
      },
      results: normalized.results,
    };
  }

  private sanitizeFiles(files: File[]): File[] {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error(
        "Seleziona almeno un file DDT in formato PDF per continuare"
      );
    }

    if (files.length > MAX_IMPORT_FILES) {
      throw new Error(
        `Puoi caricare al massimo ${MAX_IMPORT_FILES} file DDT alla volta`
      );
    }

    const pdfFiles = files.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );

    if (pdfFiles.length === 0) {
      throw new Error(
        "Solo i file PDF sono supportati per l'importazione da DDT"
      );
    }

    return pdfFiles;
  }

  private toDosageProducts(results: BulkFromDdtFileResult[]): DosageProduct[] {
    const products: DosageProduct[] = [];

    results.forEach((fileResult) => {
      fileResult.entries.forEach((entry) => {
        const productName = (entry.productName ?? "").toString().trim();
        if (!productName) {
          return;
        }

        const registrationNumber =
          entry.registrationNumber?.toString().trim() ?? "";
        const quantity = this.parseQuantity(entry.quantity);
        const unit = entry.quantityUnitOfMeasure?.toString().trim() ?? "";
        const supplierName = entry.supplierName
          ? entry.supplierName.toString().trim()
          : undefined;
        const supplierVat = entry.supplierVat
          ? entry.supplierVat.toString().trim()
          : undefined;

        products.push({
          productName,
          registrationNumber,
          quantity,
          quantityUnitOfMeasure: unit,
          loadWarehouse: true,
          supplierName,
          supplierVat,
        });
      });
    });

    return products;
  }

  private parseQuantity(quantity: number): number {
    if (typeof quantity !== "number") {
      return 0;
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      return 0;
    }

    return quantity;
  }

  private toEditableRows(
    products: DosageProduct[]
  ): Array<Record<string, unknown>> {
    return products.map((product) => ({
      productName: product.productName,
      registrationNumber: product.registrationNumber,
      quantity: product.quantity,
      quantityUnitOfMeasure: product.quantityUnitOfMeasure,
      supplierName: product.supplierName || "",
      supplierVat: product.supplierVat || "",
      loadWarehouse: product.loadWarehouse,
    }));
  }

  private normalizeResponse(
    response: BulkFromDdtToProductListResponse,
    files: File[]
  ): {
    totalFiles: number;
    totalEntries: number;
    results: BulkFromDdtFileResult[];
  } {
    if (!response || response.status !== "success" || !response.data) {
      throw new Error("The DDT import service returned an unexpected response");
    }

    const { data } = response;

    if (Array.isArray(data.results) && data.results.length > 0) {
      const normalizedResults = data.results.map((result, index) => ({
        fileName: result.fileName ?? files[index]?.name ?? `File ${index + 1}`,
        entries: (result.entries ?? []).map((entry) =>
          this.normalizeEntry(entry)
        ),
      }));

      const totalEntries =
        typeof data.totalEntries === "number"
          ? data.totalEntries
          : normalizedResults.reduce(
              (sum, current) => sum + current.entries.length,
              0
            );

      const totalFiles =
        typeof data.totalFiles === "number"
          ? data.totalFiles
          : normalizedResults.length || files.length;

      return {
        totalFiles,
        totalEntries,
        results: normalizedResults,
      };
    }

    if (Array.isArray(data.suggestedProducts)) {
      const entries = data.suggestedProducts.map((product) =>
        this.normalizeEntry(product)
      );

      const totalEntries =
        typeof data.totalEntries === "number"
          ? data.totalEntries
          : entries.length;

      const totalFiles =
        typeof data.totalFiles === "number"
          ? data.totalFiles
          : files.length || 1;

      return {
        totalFiles,
        totalEntries,
        results: [
          {
            fileName: files.length === 1 ? files[0].name : "DDT import",
            entries,
          },
        ],
      };
    }

    throw new Error("The DDT import service returned an empty result set");
  }

  private normalizeEntry(
    entry:
      | BulkFromDdtEntry
      | BulkFromDdtSuggestedProduct
      | Partial<BulkFromDdtEntry>
  ): BulkFromDdtEntry {
    const productName = (entry.productName ?? "").toString().trim();
    const registrationNumberRaw =
      entry.registrationNumber === null ||
      entry.registrationNumber === undefined
        ? undefined
        : entry.registrationNumber;
    const registrationNumber =
      registrationNumberRaw !== undefined
        ? registrationNumberRaw.toString().trim()
        : undefined;

    let quantity = 0;
    if (typeof entry.quantity === "number") {
      quantity = entry.quantity;
    } else if (typeof entry.quantity === "string") {
      const parsed = Number(entry.quantity);
      if (Number.isFinite(parsed)) {
        quantity = parsed;
      }
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      quantity = 0;
    }

    const quantityUnitOfMeasure = (entry.quantityUnitOfMeasure ?? "")
      .toString()
      .trim();

    const supplierName =
      entry.supplierName && entry.supplierName !== null
        ? entry.supplierName.toString().trim()
        : undefined;

    const supplierVat =
      entry.supplierVat && entry.supplierVat !== null
        ? entry.supplierVat.toString().trim()
        : undefined;

    return {
      productName,
      registrationNumber,
      quantity,
      quantityUnitOfMeasure,
      supplierName,
      supplierVat,
    };
  }
}

export function ImportProductsFromDdt({
  onAddRows,
  onProductsChange,
  onCloseParentDrawer,
  onOpenParentDrawer,
  disabled,
  onSelectImportMethod,
}: ImportProductsFromDdtProps): ReactElement {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importSummary, setImportSummary] = useState<
    DdtImportOutcome["meta"] | null
  >(null);
  const [importResults, setImportResults] = useState<
    DdtImportOutcome["results"]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const importManager = useMemo(
    () => new DdtProductImportManager(productsApiService),
    []
  );

  const [shouldRestoreParentDrawer, setShouldRestoreParentDrawer] =
    useState(false);

  const handleDrawerOpenChange = (open: boolean): void => {
    setIsDrawerOpen(open);
    if (!open) {
      resetState();
      if (shouldRestoreParentDrawer) {
        onOpenParentDrawer?.();
        setShouldRestoreParentDrawer(false);
      }
    }
  };

  const resetState = (): void => {
    setImportError(null);
    setSelectedFiles([]);
    setImportSummary(null);
    setImportResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      return;
    }

    setImportSummary(null);
    setImportResults([]);
    setImportError(null);

    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((file) => file.name));
      const uniqueNewFiles = files.filter(
        (file) => !existingNames.has(file.name)
      );
      const combined = [...prev, ...uniqueNewFiles];

      if (combined.length > MAX_IMPORT_FILES) {
        const errorMessage = `Puoi caricare al massimo ${MAX_IMPORT_FILES} file PDF alla volta`;
        setImportError(errorMessage);
        toast.error("Limite file superato", {
          description: errorMessage,
        });
        return prev;
      }

      return [...prev, ...uniqueNewFiles];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFiles = async (files: File[]): Promise<void> => {
    try {
      setIsProcessing(true);
      setImportError(null);

      const outcome = await importManager.import(files);

      if (onAddRows) {
        onAddRows(outcome.rows);
      } else if (onProductsChange) {
        onProductsChange(outcome.products);
      }

      setImportSummary(outcome.meta);
      setImportResults(outcome.results);

      toast.success("Prodotti importati dai DDT", {
        description: `${outcome.meta.totalEntries} voci elaborate da ${outcome.meta.totalFiles} file`,
      });

      setSelectedFiles([]);
      setIsDrawerOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to import products from the selected DDT files";
      setImportError(message);
      toast.error("Importazione DDT fallita", {
        description: message,
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOpenDrawer = (): void => {
    if (disabled) {
      return;
    }
    onSelectImportMethod?.();
    onCloseParentDrawer?.();
    setShouldRestoreParentDrawer(true);
    setIsDrawerOpen(true);
  };

  const handleConfirmImport = async (): Promise<void> => {
    if (selectedFiles.length === 0 || isProcessing) {
      return;
    }
    await processFiles(selectedFiles);
  };

  const handleRetryImport = async (): Promise<void> => {
    await handleConfirmImport();
  };

  const handleRemoveFile = (fileToRemove: File): void => {
    setSelectedFiles((prev) => prev.filter((file) => file !== fileToRemove));
    setImportSummary(null);
    setImportResults([]);
    setImportError(null);
  };

  const handleClearAll = (): void => {
    if (isProcessing) {
      return;
    }
    setSelectedFiles([]);
    setImportSummary(null);
    setImportResults([]);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "";
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        onClick={handleOpenDrawer}
        disabled={disabled}
      >
        <UploadCloud className="h-4 w-4" />
        Importa prodotti da DDT
      </Button>
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent
          data-vaul-drawer-direction="right"
          className="max-w-[700px] bg-white"
        >
          <DrawerHeader className="border-b border-neutral-100 px-6 py-5">
            <DrawerTitle>Importa Prodotti da DDT PDF</DrawerTitle>
            <DrawerDescription>
              Carica uno o più file PDF di DDT per estrarre automaticamente i
              prodotti fitosanitari e aggiungerli all&apos;elenco.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileInputChange}
                disabled={isProcessing}
                className="hidden"
                id="ddt-products-upload"
              />
              <label
                htmlFor="ddt-products-upload"
                className={`flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isProcessing
                    ? "border-neutral-200 bg-neutral-50 cursor-not-allowed"
                    : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                }`}
              >
                <UploadCloud
                  className={`h-12 w-12 mb-4 ${
                    isProcessing ? "text-neutral-300" : "text-neutral-400"
                  }`}
                />
                <p className="text-base font-medium text-neutral-900 mb-2">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} file selezionati`
                    : "Carica file PDF di DDT"}
                </p>
                <p className="text-sm text-neutral-500 max-w-md">
                  Seleziona uno o più file PDF oppure trascinali qui per avviare
                  l&apos;importazione.
                </p>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 border border-neutral-200 rounded-lg px-3 py-2 bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-neutral-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(file)}
                        disabled={isProcessing}
                        className="h-8 w-8 text-neutral-500 hover:text-neutral-900"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    className="text-neutral-600 hover:text-neutral-900"
                  >
                    Svuota elenco
                  </Button>
                  <Button
                    onClick={handleConfirmImport}
                    disabled={isProcessing || selectedFiles.length === 0}
                    className="gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Spinner size={16} ariaLabel="Elaborazione file DDT" />
                        Importazione in corso...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        Importa selezione
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size={20} ariaLabel="Elaborazione file DDT" />
                <span>Analisi dei file in corso...</span>
              </div>
            )}

            {importError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div className="font-medium">Importazione non riuscita</div>
                  <p className="text-xs text-muted-foreground">{importError}</p>
                  {selectedFiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryImport}
                      disabled={isProcessing}
                    >
                      Riprova importazione
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {importSummary && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    {importSummary.totalEntries} prodotti trovati in{" "}
                    {importSummary.totalFiles} file.
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {importResults.map((result) => (
                    <div
                      key={result.fileName}
                      className="border border-neutral-200 rounded-lg p-3 bg-white shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                        <FileText className="h-4 w-4 text-neutral-500" />
                        <span>{result.fileName}</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                        {result.entries.map((entry, index) => (
                          <li key={`${result.fileName}-${index}`}>
                            <span className="font-medium">
                              {entry.productName}
                            </span>{" "}
                            • {entry.quantity} {entry.quantityUnitOfMeasure} •
                            Registro {entry.registrationNumber}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
