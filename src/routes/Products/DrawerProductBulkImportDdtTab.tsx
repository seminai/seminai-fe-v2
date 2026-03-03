import { useCallback, useMemo, useRef, useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  productsApiService,
  type BulkFromDdtEntry,
  type BulkFromDdtFileResult,
  type BulkFromDdtSuggestedProduct,
  type BulkFromDdtToProductListResponse,
} from "@/api/products";
import type {
  ImportPreviewError,
  ProductImportItem,
  ProductImportSource,
} from "./productImportPreview.types";

const MAX_DDT_FILES = 10;

const DDT_ACCEPT =
  "application/pdf,image/png,image/jpeg,image/jpg,.pdf,.png,.jpg,.jpeg";

function isDdtAcceptedFile(file: File): boolean {
  const type = file.type?.toLowerCase() ?? "";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    type === "application/pdf" ||
    type === "image/png" ||
    type === "image/jpeg" ||
    type === "image/jpg" ||
    [".pdf", ".png", ".jpg", ".jpeg"].includes(`.${ext}`)
  );
}

type PreviewReadyPayload = {
  products: ProductImportItem[];
  errors: ImportPreviewError[];
  source: ProductImportSource;
};

interface DrawerProductBulkImportDdtTabProps {
  companyId: string;
  canShowImportSections: boolean;
  onPreviewReady: (payload: PreviewReadyPayload) => void;
}

interface DdtImportSummary {
  totalFiles: number;
  totalEntries: number;
  results: BulkFromDdtFileResult[];
}

class DdtImportManager {
  public async import(files: File[]): Promise<DdtImportSummary> {
    const sanitizedFiles = this.sanitizeFiles(files);
    const response = await productsApiService.importFromDdt(sanitizedFiles);
    return this.normalizeResponse(response, sanitizedFiles);
  }

  private sanitizeFiles(files: File[]): File[] {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error(
        "Seleziona almeno un file DDT (PDF o immagine PNG/JPG/JPEG) per continuare"
      );
    }

    if (files.length > MAX_DDT_FILES) {
      throw new Error(
        `Puoi caricare al massimo ${MAX_DDT_FILES} file DDT alla volta`
      );
    }

    const acceptedFiles = files.filter((file) => isDdtAcceptedFile(file));

    if (acceptedFiles.length === 0) {
      throw new Error(
        "Usa file PDF o immagini (PNG, JPG, JPEG) per l'importazione da DDT"
      );
    }

    return acceptedFiles;
  }

  private normalizeResponse(
    response: BulkFromDdtToProductListResponse,
    files: File[]
  ): DdtImportSummary {
    if (!response || response.status !== "success" || !response.data) {
      throw new Error(
        "Il servizio di importazione DDT ha restituito una risposta non valida"
      );
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

    throw new Error(
      "Il servizio di importazione DDT ha restituito un risultato vuoto"
    );
  }

  private normalizeEntry(
    entry:
      | BulkFromDdtEntry
      | BulkFromDdtSuggestedProduct
      | Partial<BulkFromDdtEntry>
  ): BulkFromDdtEntry {
    const productName = (entry.productName ?? "").toString().trim();
    const registrationNumberRaw =
      entry.registrationNumber === null || entry.registrationNumber === undefined
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

    const ddtDate =
      entry.ddtDate && entry.ddtDate !== null
        ? entry.ddtDate.toString().trim()
        : undefined;

    const orderNumber =
      entry.orderNumber && entry.orderNumber !== null
        ? entry.orderNumber.toString().trim()
        : undefined;

    return {
      productName,
      registrationNumber,
      quantity,
      quantityUnitOfMeasure,
      supplierName,
      supplierVat,
      ddtDate,
      orderNumber,
    };
  }
}

class DdtPreviewMapper {
  public map(entries: BulkFromDdtEntry[]): ProductImportItem[] {
    return entries.map((entry) => ({
      name: entry.productName,
      registrationNumber: entry.registrationNumber ?? undefined,
      quantity: entry.quantity,
      unitOfMeasureQuantity: entry.quantityUnitOfMeasure || "kg",
      supplierName: entry.supplierName ?? undefined,
      supplierVat: entry.supplierVat ?? undefined,
      ddtDate: entry.ddtDate ?? undefined,
      ddtCode: entry.orderNumber ?? undefined,
    }));
  }
}

function DrawerProductBulkImportDdtTab({
  companyId,
  canShowImportSections,
  onPreviewReady,
}: DrawerProductBulkImportDdtTabProps) {
  const ddtFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDdtFiles, setSelectedDdtFiles] = useState<File[]>([]);
  const [isProcessingDdt, setIsProcessingDdt] = useState(false);
  const [ddtImportError, setDdtImportError] = useState<string | null>(null);
  const [ddtImportSummary, setDdtImportSummary] =
    useState<DdtImportSummary | null>(null);
  const [ddtDragActive, setDdtDragActive] = useState(false);

  const ddtImportManager = useMemo(() => new DdtImportManager(), []);

  const handleDdtFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      if (files.length === 0) {
        return;
      }

      setDdtImportSummary(null);
      setDdtImportError(null);

      setSelectedDdtFiles((prev) => {
        const existingNames = new Set(prev.map((file) => file.name));
        const uniqueNewFiles = files.filter(
          (file) => !existingNames.has(file.name)
        );
        const combined = [...prev, ...uniqueNewFiles];

        if (combined.length > MAX_DDT_FILES) {
          const errorMessage = `Puoi caricare al massimo ${MAX_DDT_FILES} file PDF alla volta`;
          setDdtImportError(errorMessage);
          toast.error("Limite file superato", {
            description: errorMessage,
          });
          return prev;
        }

        return [...prev, ...uniqueNewFiles];
      });

      if (ddtFileInputRef.current) {
        ddtFileInputRef.current.value = "";
      }
    },
    []
  );

  const handleDdtDrag = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDdtDragActive(true);
    } else if (e.type === "dragleave") {
      setDdtDragActive(false);
    }
  }, []);

  const handleDdtDrop = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setDdtDragActive(false);

    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length === 0) {
      return;
    }

    setDdtImportSummary(null);
    setDdtImportError(null);

    setSelectedDdtFiles((prev) => {
      const existingNames = new Set(prev.map((file) => file.name));
      const uniqueNewFiles = files.filter(
        (file) => !existingNames.has(file.name)
      );
      const combined = [...prev, ...uniqueNewFiles];

      if (combined.length > MAX_DDT_FILES) {
        const errorMessage = `Puoi caricare al massimo ${MAX_DDT_FILES} file PDF alla volta`;
        setDdtImportError(errorMessage);
        toast.error("Limite file superato", {
          description: errorMessage,
        });
        return prev;
      }

      return [...prev, ...uniqueNewFiles];
    });
  }, []);

  const handleRemoveDdtFile = useCallback((fileToRemove: File): void => {
    setSelectedDdtFiles((prev) =>
      prev.filter((file) => file !== fileToRemove)
    );
    setDdtImportSummary(null);
    setDdtImportError(null);
  }, []);

  const handleClearDdtFiles = useCallback((): void => {
    if (isProcessingDdt) {
      return;
    }
    setSelectedDdtFiles([]);
    setDdtImportSummary(null);
    setDdtImportError(null);
    if (ddtFileInputRef.current) {
      ddtFileInputRef.current.value = "";
    }
  }, [isProcessingDdt]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "";
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  }, []);

  const handleImportFromDdt = useCallback(async (): Promise<void> => {
    if (selectedDdtFiles.length === 0 || isProcessingDdt || !companyId) {
      return;
    }

    setIsProcessingDdt(true);
    setDdtImportError(null);

    try {
      const summary = await ddtImportManager.import(selectedDdtFiles);
      setDdtImportSummary(summary);

      const mapper = new DdtPreviewMapper();
      const productsForPreview = summary.results.flatMap((result) =>
        mapper.map(result.entries)
      );

      onPreviewReady({
        products: productsForPreview,
        errors: [],
        source: "ddt",
      });

      toast.success("Prodotti estratti dai DDT", {
        description: `${summary.totalEntries} prodotti pronti per l'importazione`,
      });

      setSelectedDdtFiles([]);
      setDdtImportSummary(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile estrarre i prodotti dai file DDT selezionati";
      setDdtImportError(message);
      toast.error("Estrazione DDT fallita", {
        description: message,
      });
    } finally {
      setIsProcessingDdt(false);
      if (ddtFileInputRef.current) {
        ddtFileInputRef.current.value = "";
      }
    }
  }, [companyId, ddtImportManager, isProcessingDdt, onPreviewReady, selectedDdtFiles]);

  return (
    <div className="space-y-4">
      {!canShowImportSections ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Seleziona i dati principali</AlertTitle>
          <AlertDescription>
            Per poter importare i file DDT devi prima scegliere un&apos;azienda. Una
            volta completata la selezione appariranno i controlli di caricamento.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-2">
            <Label>File DDT PDF</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                ddtDragActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 hover:border-gray-400"
              } ${isProcessingDdt ? "opacity-50 pointer-events-none" : ""}`}
              onDragEnter={handleDdtDrag}
              onDragLeave={handleDdtDrag}
              onDragOver={handleDdtDrag}
              onDrop={handleDdtDrop}
            >
              <input
                ref={ddtFileInputRef}
                type="file"
                accept={DDT_ACCEPT}
                multiple
                onChange={handleDdtFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessingDdt}
              />

              <div className="space-y-2">
                <div className="flex justify-center">
                  {isProcessingDdt ? (
                    <Spinner size={40} ariaLabel="Elaborazione file DDT" />
                  ) : (
                    <Upload className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                {!isProcessingDdt && (
                  <>
                    <p className="text-sm font-medium text-gray-700">
                      {selectedDdtFiles.length > 0
                        ? `${selectedDdtFiles.length} file selezionati`
                        : "Trascina qui i file DDT PDF"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedDdtFiles.length > 0
                        ? "Clicca per aggiungere altri file"
                        : "oppure clicca per selezionare i file"}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Formato supportato: PDF o immagini PNG/JPG/JPEG (max {MAX_DDT_FILES} file)
                    </p>
                  </>
                )}

                {isProcessingDdt && (
                  <p className="text-sm text-gray-600">
                    Analisi dei file DDT in corso...
                  </p>
                )}
              </div>
            </div>
          </div>

          {selectedDdtFiles.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedDdtFiles.map((file) => (
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
                      onClick={() => handleRemoveDdtFile(file)}
                      disabled={isProcessingDdt}
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
                  onClick={handleClearDdtFiles}
                  disabled={isProcessingDdt}
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  Svuota elenco
                </Button>
                <Button
                  type="button"
                  onClick={handleImportFromDdt}
                  disabled={selectedDdtFiles.length === 0 || isProcessingDdt}
                  className="gap-2"
                >
                  {isProcessingDdt ? (
                    <>
                      <Spinner size={18} /> Importazione in corso...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Importa da DDT
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {ddtImportError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <div className="font-medium">Importazione non riuscita</div>
                <p className="text-xs text-muted-foreground">{ddtImportError}</p>
              </AlertDescription>
            </Alert>
          )}

          {ddtImportSummary && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {ddtImportSummary.totalEntries} prodotti trovati in{" "}
                  {ddtImportSummary.totalFiles} file.
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {ddtImportSummary.results.map((result) => (
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
                          • {entry.quantity} {entry.quantityUnitOfMeasure}
                          {entry.registrationNumber &&
                            ` • Registro ${entry.registrationNumber}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DrawerProductBulkImportDdtTab;
