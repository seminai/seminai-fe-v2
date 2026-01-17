import { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  FileDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DrawerProductImportPreview from "./DrawerProductImportPreview";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  productsApiService,
  type BulkFromDdtFileResult,
  type BulkFromDdtToProductListResponse,
  type BulkFromDdtEntry,
  type BulkFromDdtSuggestedProduct,
} from "@/api/products";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";

type BulkProductFileRow = Record<string, unknown>;

type ImportSummary = {
  imported: number;
  skipped: number;
  errors: string[];
};

const BULK_FILE_ACCEPT = ".csv,.xls,.xlsx";
const MAX_DDT_FILES = 10;

type BulkProductColumnKey =
  | "name"
  | "stock_quantity"
  | "stock_unitOfMeasureQuantity"
  | "stock_ddtCode"
  | "stock_ddtDate";

type BulkProductColumnDefinition = {
  key: BulkProductColumnKey;
  label: string;
  required?: boolean;
};

const BULK_PRODUCT_COLUMN_DEFINITIONS: ReadonlyArray<BulkProductColumnDefinition> =
  [
    { key: "name", label: "Nome prodotto", required: true },
    {
      key: "stock_quantity",
      label: "Quantità stock",
      required: true,
    },
    {
      key: "stock_unitOfMeasureQuantity",
      label: "Unità di misura stock",
      required: true,
    },
    { key: "stock_ddtCode", label: "Codice DDT" },
    { key: "stock_ddtDate", label: "Data DDT", required: true },
  ] as const;

type BulkTemplateRow = Partial<Record<BulkProductColumnKey, string>>;

const BULK_TEMPLATE_ROWS: BulkTemplateRow[] = [
  {
    name: "Prodotto esempio",
    stock_quantity: "50",
    stock_unitOfMeasureQuantity: "kg",
    stock_ddtCode: "DDT-001",
    stock_ddtDate: "2024-01-15",
  },
];

class EmptyRowDetector {
  public static isEmpty(row: BulkProductFileRow): boolean {
    return Object.values(row).every((value) => {
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value === "string" && value.trim() === "") {
        return true;
      }
      return false;
    });
  }
}

class BulkProductTemplateBuilder {
  private static getColumns(): BulkProductColumnDefinition[] {
    return [...BULK_PRODUCT_COLUMN_DEFINITIONS];
  }

  private static getRows(): BulkTemplateRow[] {
    return BULK_TEMPLATE_ROWS;
  }

  public static buildCsv(): string {
    const columns = this.getColumns();
    const rows = this.getRows();
    const labeledRows = rows.map((row) => {
      return columns.reduce<Record<string, string>>((acc, column) => {
        const value = row[column.key] ?? "";
        acc[column.label] = value;
        return acc;
      }, {});
    });

    const headers = columns.map((column) => column.label);

    return Papa.unparse(labeledRows, {
      columns: headers,
    });
  }

  public static downloadTemplate(): void {
    const link = document.createElement("a");
    link.href = "/templates/2026.01_Template_MAGAZZINO.xlsx";
    link.download = "2026.01_Template_MAGAZZINO.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
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
        "Seleziona almeno un file DDT in formato PDF per continuare"
      );
    }

    if (files.length > MAX_DDT_FILES) {
      throw new Error(
        `Puoi caricare al massimo ${MAX_DDT_FILES} file DDT alla volta`
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

  private normalizeResponse(
    response: BulkFromDdtToProductListResponse,
    files: File[]
  ): DdtImportSummary {
    if (!response || response.status !== "success" || !response.data) {
      throw new Error("Il servizio di importazione DDT ha restituito una risposta non valida");
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

    throw new Error("Il servizio di importazione DDT ha restituito un risultato vuoto");
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

interface DrawerProductBulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportCompleted?: () => void;
}

function DrawerProductBulkImport({
  open,
  onOpenChange,
  onImportCompleted,
}: DrawerProductBulkImportProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ddtFileInputRef = useRef<HTMLInputElement | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewRows, setFilePreviewRows] = useState<
    Record<string, unknown>[]
  >([]);
  const [dragActive, setDragActive] = useState(false);
  const [parserErrors, setParserErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"csv" | "ddt">("csv");
  
  // DDT states
  const [selectedDdtFiles, setSelectedDdtFiles] = useState<File[]>([]);
  const [isProcessingDdt, setIsProcessingDdt] = useState(false);
  const [ddtImportError, setDdtImportError] = useState<string | null>(null);
  const [ddtImportSummary, setDdtImportSummary] = useState<DdtImportSummary | null>(null);
  const [ddtDragActive, setDdtDragActive] = useState(false);

  // Preview drawer state
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<
    Array<{
      productName: string;
      registrationNumber?: string;
      quantity: number;
      quantityUnitOfMeasure: string;
      supplierName?: string;
      supplierVat?: string;
      ddtDate?: string;
      orderNumber?: string;
    }>
  >([]);
  const [previewImportSource, setPreviewImportSource] = useState<"ddt" | "csv" | "excel">("ddt");

  const {
    companies,
    isLoading: isLoadingCompanies,
    isError: isCompaniesError,
    error: companiesError,
  } = useCompanies();

  const {
    warehouses,
    isLoading: isLoadingWarehouses,
    isError: isWarehousesError,
    error: warehousesError,
  } = useCompanyWarehouses(companyId || undefined);

  const companyOptions = useMemo(
    () =>
      companies.map((company) => ({
        value: company.id,
        label: company.name || company.id,
      })),
    [companies]
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name || warehouse.id,
      })),
    [warehouses]
  );

  const ddtImportManager = useMemo(() => new DdtImportManager(), []);

  const canImport = useMemo(() => {
    return (
      selectedFile !== null &&
      companyId.trim().length > 0 &&
      !isImporting &&
      !isParsing
    );
  }, [selectedFile, companyId, isImporting, isParsing]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsParsing(true);
    setParserErrors([]);
    setSelectedFileName(file.name);
    setSelectedFile(file);
    setImportSummary(null);
    setShowPreview(false);
    setFilePreviewRows([]);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["csv", "xls", "xlsx"].includes(extension)) {
        throw new Error("Formato non supportato. Usa file CSV o Excel");
      }

      let previewRows: Record<string, unknown>[] = [];

      if (extension === "csv") {
        const csvText = await file.text();
        Papa.parse<Record<string, unknown>>(csvText, {
          header: true,
          skipEmptyLines: "greedy",
          complete: (results) => {
            previewRows = results.data.filter(
              (row) => !EmptyRowDetector.isEmpty(row)
            );
            setFilePreviewRows(previewRows.slice(0, 10)); // Mostra prime 10 righe
          },
          error: (error: Error) => {
            throw new Error(`Errore parsing CSV: ${error.message}`);
          },
        });
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error("Excel: nessun foglio trovato");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils
          .sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: "",
            raw: false,
            blankrows: false,
          })
          .filter((row) => !EmptyRowDetector.isEmpty(row));

        previewRows = rows;
        setFilePreviewRows(rows.slice(0, 10)); // Mostra prime 10 righe
      }

      if (previewRows.length === 0) {
        toast.warning("Nessuna riga valida trovata nel file.");
      } else {
        toast.success(
          `File caricato correttamente (${previewRows.length} righe trovate)`
        );
        setShowPreview(true);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore durante il caricamento del file";
      setParserErrors([message]);
      toast.error(message);
      setSelectedFile(null);
      setSelectedFileName(null);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileChange = useCallback(async () => {
    if (!fileInputRef.current?.files?.length) {
      return;
    }
    await handleFileSelect(fileInputRef.current.files[0]);
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
    [handleFileSelect]
  );

  const resetForm = useCallback(() => {
    setParserErrors([]);
    setSelectedFileName(null);
    setSelectedFile(null);
    setFilePreviewRows([]);
    setShowPreview(false);
    setImportSummary(null);
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleCompanyChange = useCallback(
    (value: string) => {
      resetForm();
      setCompanyId(value);
      setWarehouseId("");
    },
    [resetForm]
  );

  const handleImport = useCallback(async () => {
    if (!canImport || !selectedFile) {
      return;
    }

    if (!warehouseId && warehouses.length === 0) {
      toast.error("Magazzino richiesto", {
        description: "Devi creare almeno un magazzino per l'azienda selezionata prima di importare i prodotti",
      });
      return;
    }

    setIsImporting(true);
    setParserErrors([]);

    try {
      // Estrai i prodotti dal file
      const extension = selectedFile.name.split(".").pop()?.toLowerCase() ?? "";
      let extractedRows: Record<string, unknown>[] = [];

      if (extension === "csv") {
        const csvText = await selectedFile.text();
        await new Promise<void>((resolve, reject) => {
          Papa.parse<Record<string, unknown>>(csvText, {
            header: true,
            skipEmptyLines: "greedy",
            complete: (results) => {
              extractedRows = results.data.filter(
                (row) => !EmptyRowDetector.isEmpty(row)
              );
              resolve();
            },
            error: (error: Error) => {
              reject(new Error(`Errore parsing CSV: ${error.message}`));
            },
          });
        });
      } else {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error("Excel: nessun foglio trovato");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        extractedRows = XLSX.utils
          .sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: "",
            raw: false,
            blankrows: false,
          })
          .filter((row) => !EmptyRowDetector.isEmpty(row));
      }

      // Converti in formato prodotti per la preview
      const productsForPreview = extractedRows.map((row) => ({
        productName: String(row["Nome prodotto"] || row.name || ""),
        registrationNumber: String(row["N. Registrazione"] || row.registrationNumber || ""),
        quantity: Number(row["Quantità stock"] || row.stock_quantity || 0),
        quantityUnitOfMeasure: String(row["Unità di misura stock"] || row.stock_unitOfMeasureQuantity || "kg"),
        supplierName: undefined,
        supplierVat: undefined,
        ddtDate: String(row["Data DDT"] || row.stock_ddtDate || new Date().toISOString().split("T")[0]),
        orderNumber: String(row["Codice DDT"] || row.stock_ddtCode || ""),
      }));

      // Apri la drawer di preview
      setPreviewProducts(productsForPreview);
      setPreviewImportSource(extension === "csv" ? "csv" : "excel");
      setPreviewDrawerOpen(true);

      toast.success("Prodotti estratti dal file", {
        description: `${productsForPreview.length} prodotti pronti per l'importazione`,
      });

      resetForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Estrazione non riuscita";
      setParserErrors([message]);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  }, [
    canImport,
    companyId,
    resetForm,
    selectedFile,
    warehouseId,
    warehouses,
  ]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as "csv" | "ddt");
    // Reset degli stati quando si cambia tab
    if (value === "csv") {
      setDdtImportError(null);
      setDdtImportSummary(null);
    } else {
      setParserErrors([]);
      setImportSummary(null);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    // Reset di tutti gli stati quando si chiude la drawer
    resetForm();
    setSelectedDdtFiles([]);
    setDdtImportSummary(null);
    setDdtImportError(null);
    setActiveTab("csv");
    onOpenChange(false);
  }, [onOpenChange, resetForm]);

  const handlePreviewImportCompleted = useCallback(() => {
    onImportCompleted?.();
    setPreviewDrawerOpen(false);
    setPreviewProducts([]);
  }, [onImportCompleted]);

  const selectedWarehouse = useMemo(() => {
    if (warehouseId) {
      return warehouses.find((w) => w.id === warehouseId);
    }
    return warehouses[0];
  }, [warehouseId, warehouses]);

  // DDT Handlers
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
    setSelectedDdtFiles((prev) => prev.filter((file) => file !== fileToRemove));
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

  const handleImportFromDdt = useCallback(async (): Promise<void> => {
    if (selectedDdtFiles.length === 0 || isProcessingDdt || !companyId) {
      return;
    }

    // Verifica che ci sia un magazzino (obbligatorio per l'API)
    if (!warehouseId && warehouses.length === 0) {
      toast.error("Magazzino richiesto", {
        description: "Devi creare almeno un magazzino per l'azienda selezionata prima di importare i prodotti",
      });
      return;
    }

    setIsProcessingDdt(true);
    setDdtImportError(null);

    try {
      const summary = await ddtImportManager.import(selectedDdtFiles);
      setDdtImportSummary(summary);

      // Prepara i prodotti per la preview
      const productsForPreview = summary.results.flatMap((result) =>
        result.entries.map((entry) => ({
          productName: entry.productName,
          registrationNumber: entry.registrationNumber,
          quantity: entry.quantity,
          quantityUnitOfMeasure: entry.quantityUnitOfMeasure || "kg",
          supplierName: entry.supplierName,
          supplierVat: entry.supplierVat,
          ddtDate: entry.ddtDate || new Date().toISOString().split("T")[0],
          orderNumber: entry.orderNumber,
        }))
      );

      // Apri la drawer di preview invece di salvare direttamente
      setPreviewProducts(productsForPreview);
      setPreviewImportSource("ddt");
      setPreviewDrawerOpen(true);

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
  }, [
    selectedDdtFiles,
    isProcessingDdt,
    companyId,
    warehouseId,
    warehouses,
    ddtImportManager,
  ]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "";
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  }, []);

  const canShowImportSections = Boolean(companyId);

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl bg-white">
        <SheetHeader>
          <SheetTitle>Importazione massiva prodotti</SheetTitle>
          <SheetDescription>
            Seleziona un&apos;azienda, scegli il magazzino di destinazione e poi
            carica un file CSV/Excel o importa da file DDT PDF.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pt-4">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="csv">File CSV/Excel</TabsTrigger>
              <TabsTrigger value="ddt">Importa da DDT</TabsTrigger>
            </TabsList>

            <div className="space-y-5 pb-16">
              <div className="space-y-2">
                <Label>Seleziona azienda</Label>
                <SearchableSelect
                  value={companyId}
                  options={companyOptions}
                  placeholder="Seleziona azienda"
                  searchPlaceholder="Cerca azienda..."
                  emptyMessage="Nessuna azienda trovata"
                  loading={isLoadingCompanies}
                  loadingMessage="Caricamento aziende..."
                  noneOptionLabel="Nessuna selezione"
                  onChange={handleCompanyChange}
                />
                {!isLoadingCompanies && companyOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nessuna azienda disponibile. Creane una prima di procedere.
                  </p>
                )}
                {isCompaniesError && (
                  <p className="text-xs text-red-600">
                    {companiesError?.message ?? "Impossibile caricare le aziende"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Seleziona magazzino (opzionale)</Label>
                {companyId ? (
                  <>
                    <SearchableSelect
                      value={warehouseId}
                      options={warehouseOptions}
                      placeholder="Seleziona magazzino (opzionale)"
                      searchPlaceholder="Cerca magazzino..."
                      emptyMessage="Nessun magazzino trovato"
                      noneOptionLabel="Nessuna selezione (verrà usato il primo magazzino disponibile)"
                      loading={isLoadingWarehouses}
                      loadingMessage="Caricamento magazzini..."
                      disabled={!companyId}
                      onChange={setWarehouseId}
                    />
                    {!isLoadingWarehouses && warehouseOptions.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nessun magazzino disponibile per l&apos;azienda
                        selezionata. Verrà selezionato automaticamente il primo
                        magazzino disponibile.
                      </p>
                    )}
                    {!isLoadingWarehouses &&
                      warehouseOptions.length > 0 &&
                      !warehouseId && (
                        <p className="text-xs text-muted-foreground">
                          Se non selezioni un magazzino, verrà utilizzato il primo
                          magazzino disponibile dell&apos;azienda.
                        </p>
                      )}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3 text-sm text-muted-foreground">
                    Seleziona prima un&apos;azienda per visualizzare i suoi
                    magazzini.
                  </div>
                )}
                {isWarehousesError && (
                  <p className="text-xs text-red-600">
                    {warehousesError?.message ??
                      "Impossibile caricare i magazzini"}
                  </p>
                )}
              </div>

              <TabsContent value="csv" className="mt-0 space-y-4">
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
                      Per poter importare il file devi prima scegliere
                      un&apos;azienda. Una volta completata la selezione appariranno
                      i controlli di caricamento.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                <div className="space-y-2">
                  <Label>File CSV o Excel</Label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-300 hover:border-gray-400"
                    } ${isParsing ? "opacity-50 pointer-events-none" : ""}`}
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
                      disabled={isParsing}
                    />

                    <div className="space-y-2">
                      <div className="flex justify-center">
                        {isParsing ? (
                          <Spinner size={40} ariaLabel="Elaborazione file" />
                        ) : (
                          <Upload className="h-12 w-12 text-gray-400" />
                        )}
                      </div>

                      {!isParsing && (
                        <>
                          {!companyId ? (
                            <>
                              <p className="text-sm font-medium text-gray-500">
                                Seleziona un&apos;azienda per abilitare il
                                caricamento
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                Formati supportati: CSV, XLS, XLSX
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-gray-700">
                                {selectedFileName
                                  ? `File selezionato: ${selectedFileName}`
                                  : "Trascina qui il file CSV o Excel"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {selectedFileName
                                  ? "Clicca per selezionare un altro file"
                                  : "oppure clicca per selezionare il file"}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                Formati supportati: CSV, XLS, XLSX
                              </p>
                            </>
                          )}
                        </>
                      )}

                      {isParsing && (
                        <p className="text-sm text-gray-600">
                          Analisi del file in corso...
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

                {showPreview && filePreviewRows.length > 0 && (
                  <Card>
                    <CardHeader className="space-y-2">
                      <CardTitle>Anteprima file</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Mostrate le prime {filePreviewRows.length} righe del
                        file. Verifica che i dati siano corretti prima di
                        procedere con l&apos;importazione.
                      </p>
                    </CardHeader>
                    <CardContent className="overflow-auto max-h-96">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="text-left bg-muted">
                              {Object.keys(filePreviewRows[0] || {}).map(
                                (key) => (
                                  <th
                                    key={key}
                                    className="px-3 py-2 border border-border font-semibold"
                                  >
                                    {key}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filePreviewRows.map((row, index) => (
                              <tr
                                key={index}
                                className="hover:bg-muted/50 border-b border-border"
                              >
                                {Object.keys(filePreviewRows[0] || {}).map(
                                  (key) => (
                                    <td
                                      key={key}
                                      className="px-3 py-2 border border-border"
                                    >
                                      {String(row[key] ?? "")}
                                    </td>
                                  )
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                    {importSummary && (
                      <Alert variant="default">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle>Risultato importazione</AlertTitle>
                        <AlertDescription>
                          <p>
                            Importati: {importSummary.imported} · Saltati:{" "}
                            {importSummary.skipped}
                          </p>
                          {importSummary.errors.length > 0 && (
                            <ul className="mt-2 list-disc pl-5 space-y-1">
                              {importSummary.errors.map((error) => (
                                <li key={error}>{error}</li>
                              ))}
                            </ul>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="ddt" className="mt-0 space-y-4">
                {!canShowImportSections ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Seleziona i dati principali</AlertTitle>
                    <AlertDescription>
                      Per poter importare i file DDT devi prima scegliere
                      un&apos;azienda. Una volta completata la selezione appariranno
                      i controlli di caricamento.
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
                          accept="application/pdf"
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
                                Formato supportato: PDF (max {MAX_DDT_FILES} file)
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
                                    {entry.registrationNumber && ` • Registro ${entry.registrationNumber}`}
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
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <SheetFooter className="flex flex-col gap-4 border-t pt-4">
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeDrawer}>
              Annulla
            </Button>
            {activeTab === "csv" ? (
              <Button
                type="button"
                onClick={handleImport}
                disabled={!canImport}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <Spinner size={18} /> Import in corso...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importa prodotti
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleImportFromDdt}
                disabled={
                  !companyId ||
                  selectedDdtFiles.length === 0 ||
                  isProcessingDdt ||
                  (warehouses.length === 0 && !isLoadingWarehouses)
                }
                className="gap-2"
                title={
                  warehouses.length === 0 && !isLoadingWarehouses && companyId
                    ? "Crea almeno un magazzino per l'azienda prima di importare"
                    : undefined
                }
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
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {/* Preview Drawer - separato dal Sheet principale */}
    {previewDrawerOpen && (
      <DrawerProductImportPreview
        open={previewDrawerOpen}
        onOpenChange={setPreviewDrawerOpen}
        products={previewProducts}
        companyId={companyId}
        warehouseId={warehouseId || warehouses[0]?.id || ""}
        warehouseName={selectedWarehouse?.name}
        importSource={previewImportSource}
        onImportCompleted={handlePreviewImportCompleted}
      />
    )}
    </>
  );
}

export default DrawerProductBulkImport;
