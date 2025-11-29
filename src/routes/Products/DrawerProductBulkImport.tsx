import { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  FileDown,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  productsApiService,
  type BulkProductPayload,
  type BulkImportProductsPayload,
  type BulkImportProductsResponse,
} from "@/api/products";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";
import { findRegNumberByName } from "@/services/fitosanitariRegistry";

type BulkProductFileRow = Record<string, unknown>;

type BulkProductParseResult = {
  products: BulkProductPayload[];
  errors: string[];
};

type ImportSummary = {
  imported: number;
  skipped: number;
  errors: string[];
};

const BULK_FILE_ACCEPT = ".csv,.xls,.xlsx";

type BulkProductColumnKey =
  | "name"
  | "sku"
  | "category"
  | "type"
  | "description"
  | "registrationNumber"
  | "labelUrl"
  | "labelMetadata"
  | "stock_quantity"
  | "stock_unitOfMeasureQuantity"
  | "stock_price"
  | "stock_unitOfMeasurePrice"
  | "stock_type"
  | "stock_ddtCode"
  | "stock_companySupplierName"
  | "stock_invoiceDate";

type BulkProductColumnDefinition = {
  key: BulkProductColumnKey;
  label: string;
  required?: boolean;
};

const BULK_PRODUCT_COLUMN_DEFINITIONS: ReadonlyArray<BulkProductColumnDefinition> =
  [
    { key: "name", label: "Nome prodotto", required: true },
    { key: "sku", label: "SKU", required: true },
    { key: "category", label: "Categoria" },
    { key: "type", label: "Tipologia" },
    { key: "description", label: "Descrizione" },
    {
      key: "registrationNumber",
      label: "Numero di registrazione",
    },
    { key: "labelUrl", label: "URL etichetta" },
    { key: "labelMetadata", label: "Metadati etichetta" },
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
    { key: "stock_price", label: "Prezzo stock" },
    { key: "stock_unitOfMeasurePrice", label: "Unità di misura prezzo" },
    { key: "stock_type", label: "Tipo stock (IN/OUT)" },
    { key: "stock_ddtCode", label: "Codice DDT" },
    { key: "stock_companySupplierName", label: "Fornitore" },
    { key: "stock_invoiceDate", label: "Data fattura", required: true },
  ] as const;

const BULK_MINIMAL_COLUMN_KEYS: ReadonlyArray<BulkProductColumnKey> = [
  "name",
  "sku",
  "stock_quantity",
  "stock_unitOfMeasureQuantity",
  "stock_ddtCode",
  "stock_invoiceDate",
];

type BulkTemplateType = "minimal" | "complete";
type BulkTemplateRow = Partial<Record<BulkProductColumnKey, string>>;

const BULK_TEMPLATE_ROWS: Record<BulkTemplateType, BulkTemplateRow[]> = {
  minimal: [
    {
      name: "Prodotto Minimo",
      sku: "SKU-MIN-001",
      stock_quantity: "50",
      stock_unitOfMeasureQuantity: "kg",
      stock_ddtCode: "DDT-001",
      stock_invoiceDate: "2023-11-29T10:00:00Z",
    },
  ],
  complete: [
    {
      name: "Prodotto Completo",
      sku: "SKU-COMP-001",
      category: "FERTILIZER",
      type: "Liquido",
      description: "Esempio con tutti i campi disponibili",
      registrationNumber: "REG-001",
      labelUrl: "https://example.com/label.pdf",
      labelMetadata: '{"color":"green","density":"1.05"}',
      stock_quantity: "125",
      stock_unitOfMeasureQuantity: "kg",
      stock_price: "25.5",
      stock_unitOfMeasurePrice: "EUR",
      stock_type: "IN",
      stock_ddtCode: "DDT-001",
      stock_companySupplierName: "Fornitore SPA",
      stock_invoiceDate: "2023-11-29T10:00:00Z",
    },
  ],
};

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

class BulkProductRecordMapper {
  private async determineCategory(
    productName: string
  ): Promise<string | undefined> {
    try {
      const regNumber = await findRegNumberByName(productName);
      return regNumber ? "PESTICIDE" : "FERTILIZER";
    } catch {
      return "FERTILIZER";
    }
  }

  public async map(
    row: BulkProductFileRow,
    rowIndex: number
  ): Promise<{
    product?: BulkProductPayload;
    errors: string[];
  }> {
    const errors: string[] = [];

    const name = this.requireString(row.name, "name", rowIndex, errors);
    const sku = this.requireString(row.sku, "sku", rowIndex, errors);

    if (!name || !sku) {
      return { errors };
    }

    const explicitCategory = this.optionalString(row.category);
    const autoCategory = explicitCategory
      ? undefined
      : await this.determineCategory(name);

    const product: BulkProductPayload = {
      name,
      sku,
      category: explicitCategory ?? autoCategory,
      type: this.optionalString(row.type),
      description: this.optionalString(row.description),
      registrationNumber: this.optionalString(row.registrationNumber),
      labelUrl: this.optionalUrl(row.labelUrl, "labelUrl", rowIndex, errors),
      labelMetadata: this.parseLabelMetadata(
        row.labelMetadata,
        rowIndex,
        errors
      ),
    };

    const stock = this.buildStock(row, rowIndex, errors);
    if (stock) {
      product.stock = stock;
    }

    return { product, errors };
  }

  private optionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const parsed = String(value).trim();
    return parsed.length > 0 ? parsed : undefined;
  }

  private requireString(
    value: unknown,
    fieldName: string,
    rowIndex: number,
    errors: string[]
  ): string | undefined {
    const parsed = this.optionalString(value);
    if (!parsed) {
      errors.push(`Riga ${rowIndex}: il campo "${fieldName}" è obbligatorio`);
    }
    return parsed;
  }

  private optionalUrl(
    value: unknown,
    fieldName: string,
    rowIndex: number,
    errors: string[]
  ): string | undefined {
    const parsed = this.optionalString(value);
    if (!parsed) {
      return undefined;
    }
    try {
      const url = new URL(parsed);
      return url.toString();
    } catch {
      errors.push(
        `Riga ${rowIndex}: il campo "${fieldName}" deve essere un URL valido`
      );
      return undefined;
    }
  }

  private parseLabelMetadata(
    rawValue: unknown,
    rowIndex: number,
    errors: string[]
  ): Record<string, unknown> | undefined {
    const value = this.optionalString(rawValue);
    if (!value) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
      errors.push(
        `Riga ${rowIndex}: "labelMetadata" deve essere un oggetto JSON valido`
      );
      return undefined;
    } catch {
      errors.push(
        `Riga ${rowIndex}: JSON non valido nel campo "labelMetadata"`
      );
      return undefined;
    }
  }

  private buildStock(
    row: BulkProductFileRow,
    rowIndex: number,
    errors: string[]
  ): BulkProductPayload["stock"] | undefined {
    const quantity = this.parseNumber(row.stock_quantity);
    const unitOfMeasureQuantity = this.optionalString(
      row.stock_unitOfMeasureQuantity
    );
    const price = this.parseNumber(row.stock_price);
    const unitOfMeasurePrice = this.optionalString(
      row.stock_unitOfMeasurePrice
    );
    const type = this.parseStockType(row.stock_type, rowIndex, errors);
    const ddtCode = this.optionalString(row.stock_ddtCode);
    const companySupplierName = this.optionalString(
      row.stock_companySupplierName
    );
    const invoiceDate = this.optionalString(row.stock_invoiceDate);

    const hasQuantity = quantity !== undefined;
    const hasUnitOfMeasure = Boolean(unitOfMeasureQuantity);
    const hasPrice = price !== undefined;
    const hasType = Boolean(type);
    const hasOptionalStockData =
      Boolean(unitOfMeasurePrice) ||
      Boolean(ddtCode) ||
      Boolean(companySupplierName) ||
      Boolean(invoiceDate);

    if (!hasQuantity && !hasPrice && !hasType && !hasUnitOfMeasure && !hasOptionalStockData) {
      return undefined;
    }

    if (hasUnitOfMeasure && !hasQuantity) {
      errors.push(
        `Riga ${rowIndex}: specificare "stock_quantity" quando si inserisce "stock_unitOfMeasureQuantity"`
      );
      return undefined;
    }

    if (!hasQuantity && !hasPrice && !hasType) {
      return undefined;
    }

    if (!hasQuantity) {
      return undefined;
    }

    if (!unitOfMeasureQuantity) {
      errors.push(
        `Riga ${rowIndex}: specificare "stock_unitOfMeasureQuantity" quando si inseriscono dati di stock`
      );
      return undefined;
    }

    return {
      quantity,
      unitOfMeasureQuantity,
      price,
      unitOfMeasurePrice,
      type: type ?? "IN",
      ddtCode,
      companySupplierName,
      invoiceDate,
    };
  }

  private parseNumber(value: unknown): number | undefined {
    const parsedString = this.optionalString(value);
    if (!parsedString) {
      return undefined;
    }
    const normalizedString = parsedString.replace(/,/g, ".").trim();
    const parsedNumber = Number(normalizedString);
    if (Number.isNaN(parsedNumber)) {
      return undefined;
    }
    return parsedNumber;
  }

  private parseStockType(
    value: unknown,
    rowIndex: number,
    errors: string[]
  ): "IN" | "OUT" | undefined {
    const parsed = this.optionalString(value);
    if (!parsed) {
      return undefined;
    }
    const upperCased = parsed.toUpperCase();
    if (upperCased !== "IN" && upperCased !== "OUT") {
      errors.push(
        `Riga ${rowIndex}: "stock_type" deve essere valorizzato con IN oppure OUT`
      );
      return undefined;
    }
    return upperCased as "IN" | "OUT";
  }
}

class BulkProductFileParser {
  private readonly mapper = new BulkProductRecordMapper();

  public async parse(file: File): Promise<BulkProductParseResult> {
    const extension = this.getExtension(file.name);
    if (!["csv", "xls", "xlsx"].includes(extension)) {
      throw new Error("Formato non supportato. Usa file CSV o Excel");
    }

    const rawResult =
      extension === "csv"
        ? await this.parseCsv(file)
        : await this.parseExcel(file);

    const parsed: BulkProductParseResult = {
      products: [],
      errors: [...rawResult.errors],
    };

    for (let index = 0; index < rawResult.rows.length; index++) {
      const row = rawResult.rows[index];
      const normalizedRow = BulkProductRowNormalizer.normalize(row);
      const { product, errors } = await this.mapper.map(
        normalizedRow,
        index + 2
      );
      if (product) {
        parsed.products.push(product);
      }
      parsed.errors.push(...errors);
    }

    return parsed;
  }

  private getExtension(fileName: string): string {
    return fileName.split(".").pop()?.toLowerCase() ?? "";
  }

  private async parseCsv(file: File): Promise<{
    rows: BulkProductFileRow[];
    errors: string[];
  }> {
    return await new Promise((resolve, reject) => {
      Papa.parse<BulkProductFileRow>(file, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          const rows = (results.data as BulkProductFileRow[]).filter(
            (row) => !EmptyRowDetector.isEmpty(row)
          );
          const errors = results.errors.map((error) => {
            const rowInfo =
              typeof error.row === "number" ? ` (riga ${error.row})` : "";
            return `CSV: ${error.message}${rowInfo}`;
          });
          resolve({ rows, errors });
        },
        error: (error) => {
          reject(new Error(error.message));
        },
      });
    });
  }

  private async parseExcel(file: File): Promise<{
    rows: BulkProductFileRow[];
    errors: string[];
  }> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return { rows: [], errors: ["Excel: nessun foglio trovato"] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils
      .sheet_to_json<BulkProductFileRow>(worksheet, {
        defval: "",
        raw: false,
        blankrows: false,
      })
      .filter((row) => !EmptyRowDetector.isEmpty(row));

    return { rows, errors: [] };
  }
}

class BulkProductRowNormalizer {
  private static readonly keyLookup: Map<string, BulkProductColumnKey> =
    BULK_PRODUCT_COLUMN_DEFINITIONS.reduce((map, column) => {
      const aliases = [
        column.key,
        column.label,
        column.label.toLowerCase(),
        column.key.toLowerCase(),
      ];
      aliases.forEach((alias) => {
        if (!map.has(alias)) {
          map.set(alias, column.key);
        }
      });
      return map;
    }, new Map<string, BulkProductColumnKey>());

  public static normalize(row: BulkProductFileRow): BulkProductFileRow {
    const normalized: BulkProductFileRow = {};
    Object.entries(row).forEach(([rawKey, value]) => {
      const trimmedKey = rawKey.trim();
      const lowerKey = trimmedKey.toLowerCase();
      const mappedKey =
        this.keyLookup.get(trimmedKey) ?? this.keyLookup.get(lowerKey);

      if (mappedKey) {
        normalized[mappedKey] = value;
      } else {
        normalized[trimmedKey] = value;
      }
    });
    return normalized;
  }
}

class BulkProductTemplateBuilder {
  private static getColumns(type: BulkTemplateType): BulkProductColumnDefinition[] {
    if (type === "minimal") {
      return BULK_PRODUCT_COLUMN_DEFINITIONS.filter((column) =>
        BULK_MINIMAL_COLUMN_KEYS.includes(column.key)
      );
    }
    return [...BULK_PRODUCT_COLUMN_DEFINITIONS];
  }

  private static getRows(type: BulkTemplateType): BulkTemplateRow[] {
    return BULK_TEMPLATE_ROWS[type];
  }

  public static buildCsv(type: BulkTemplateType): string {
    const columns = this.getColumns(type);
    const rows = this.getRows(type);
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

  public static downloadTemplate(type: BulkTemplateType): void {
    const csv = this.buildCsv(type);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      type === "minimal"
        ? "products-bulk-template-minimo.csv"
        : "products-bulk-template-completo.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
}

class BulkImportResponsePresenter {
  private readonly response: BulkImportProductsResponse;

  constructor(response: BulkImportProductsResponse) {
    this.response = response;
  }

  public getImportedCount(fallback: number): number {
    return this.response.data?.imported ?? fallback;
  }

  public getSkippedCount(): number {
    return this.response.data?.skipped ?? 0;
  }

  public getErrors(): string[] {
    return (
      this.response.data?.errors?.map((error) => {
        const rowLabel =
          typeof error.row === "number" ? `Riga ${error.row}: ` : "";
        return `${rowLabel}${error.message}`;
      }) ?? []
    );
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
  const [companyId, setCompanyId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<BulkProductPayload[]>(
    []
  );
  const [parserErrors, setParserErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(
    null
  );

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

  const canImport = useMemo(() => {
    return (
      parsedProducts.length > 0 &&
      companyId.trim().length > 0 &&
      warehouseId.trim().length > 0 &&
      !isImporting &&
      !isParsing
    );
  }, [parsedProducts.length, companyId, warehouseId, isImporting, isParsing]);

  const handleFileSelect = useCallback(async (file: File) => {
    const parser = new BulkProductFileParser();
    setIsParsing(true);
    setParserErrors([]);
    setParsedProducts([]);
    setSelectedFileName(file.name);
    setImportSummary(null);

    try {
      const result = await parser.parse(file);
      setParsedProducts(result.products);
      setParserErrors(result.errors);
      if (result.products.length === 0) {
        toast.warning(
          "Nessuna riga valida trovata. Controlla il template e riprova."
        );
      } else {
        toast.success(
          `File caricato correttamente (${result.products.length} righe valide)`
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Parsing del file fallito";
      setParserErrors([message]);
      toast.error(message);
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
    setParsedProducts([]);
    setParserErrors([]);
    setSelectedFileName(null);
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
    if (!canImport) {
      return;
    }
    const payload: BulkImportProductsPayload = {
      companyId: companyId.trim(),
      warehouseId: warehouseId.trim(),
      products: parsedProducts,
    };

    setIsImporting(true);
    try {
      const response = await productsApiService.bulkImport(payload);
      const presenter = new BulkImportResponsePresenter(response);
      const summary: ImportSummary = {
        imported: presenter.getImportedCount(parsedProducts.length),
        skipped: presenter.getSkippedCount(),
        errors: presenter.getErrors(),
      };

      setImportSummary(summary);
      toast.success(
        `Importazione completata: ${summary.imported} prodotto/i importato/i`
      );
      onImportCompleted?.();
      resetForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Importazione non riuscita";
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  }, [
    canImport,
    companyId,
    onImportCompleted,
    parsedProducts,
    resetForm,
    warehouseId,
  ]);

  const closeDrawer = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const previewRows = useMemo(
    () => parsedProducts.slice(0, 3),
    [parsedProducts]
  );

  const canShowImportSections = Boolean(companyId && warehouseId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl bg-white">
        <SheetHeader>
          <SheetTitle>Importazione massiva prodotti</SheetTitle>
          <SheetDescription>
            Seleziona un&apos;azienda, scegli il magazzino di destinazione e poi
            carica un file CSV o Excel compatibile con il template fornito.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-5 pb-16">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle>1. Seleziona azienda e magazzino</CardTitle>
                <p className="text-sm text-muted-foreground">
                  L&apos;import massivo richiede un&apos;azienda e un magazzino
                  di destinazione per applicare correttamente ogni riga del
                  file.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      Nessuna azienda disponibile. Creane una prima di
                      procedere.
                    </p>
                  )}
                  {isCompaniesError && (
                    <p className="text-xs text-red-600">
                      {companiesError?.message ??
                        "Impossibile caricare le aziende"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Seleziona magazzino</Label>
                  {companyId ? (
                    <>
                      <SearchableSelect
                        value={warehouseId}
                        options={warehouseOptions}
                        placeholder="Seleziona magazzino"
                        searchPlaceholder="Cerca magazzino..."
                        emptyMessage="Nessun magazzino trovato"
                        noneOptionLabel="Nessuna selezione"
                        loading={isLoadingWarehouses}
                        loadingMessage="Caricamento magazzini..."
                        disabled={!companyId}
                        onChange={setWarehouseId}
                      />
                      {!isLoadingWarehouses &&
                        warehouseOptions.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Nessun magazzino disponibile per l&apos;azienda
                            selezionata.
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
              </CardContent>
            </Card>

            {!canShowImportSections ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Seleziona i dati principali</AlertTitle>
                <AlertDescription>
                  Per poter importare il file devi prima scegliere
                  un&apos;azienda e un magazzino. Una volta completata la
                  selezione appariranno i controlli di caricamento.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Formato richiesto</AlertTitle>
                  <AlertDescription>
                    Il file può contenere le seguenti colonne ( * =
                    obbligatorio nel template minimo):
                    <div className="flex flex-wrap gap-2">
                      {BULK_PRODUCT_COLUMN_DEFINITIONS.map((column) => (
                        <Badge
                          key={column.key}
                          variant="secondary"
                          className="font-mono"
                        >
                          {column.label}
                          {column.required ? "*" : ""}
                        </Badge>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>

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

                {parsedProducts.length > 0 && (
                  <Card>
                    <CardHeader className="space-y-2">
                      <CardTitle>Anteprima prodotti</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Mostrate le prime {previewRows.length} righe su{" "}
                        {parsedProducts.length} totali.
                      </p>
                    </CardHeader>
                    <CardContent className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="px-2 py-1">Nome</th>
                            <th className="px-2 py-1">SKU</th>
                            <th className="px-2 py-1">Categoria</th>
                            <th className="px-2 py-1">Tipo</th>
                            <th className="px-2 py-1">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((product) => (
                            <tr key={`${product.sku}-${product.name}`}>
                              <td className="px-2 py-1 font-medium">
                                {product.name}
                              </td>
                              <td className="px-2 py-1 font-mono text-xs">
                                {product.sku}
                              </td>
                              <td className="px-2 py-1">
                                {product.category ?? "-"}
                              </td>
                              <td className="px-2 py-1">
                                {product.type ?? "-"}
                              </td>
                              <td className="px-2 py-1">
                                {product.stock
                                  ? `${product.stock.quantity} ${product.stock.unitOfMeasureQuantity}`
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
          </div>
        </div>

        <SheetFooter className="flex flex-col gap-4 border-t pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => BulkProductTemplateBuilder.downloadTemplate("minimal")}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Template dati minimi
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => BulkProductTemplateBuilder.downloadTemplate("complete")}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Template completo
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
              disabled={isParsing || isImporting}
            >
              Reset campi
            </Button>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeDrawer}>
              Annulla
            </Button>
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
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default DrawerProductBulkImport;
