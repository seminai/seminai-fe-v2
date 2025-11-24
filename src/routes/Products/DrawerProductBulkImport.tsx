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
import authService from "@/utils/auth";
import {
  productsApiService,
  type BulkProductPayload,
  type BulkImportProductsPayload,
  type BulkImportProductsResponse,
} from "@/api/products";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";

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

const BULK_PRODUCT_COLUMNS = [
  "name",
  "sku",
  "category",
  "type",
  "description",
  "registrationNumber",
  "labelUrl",
  "labelMetadata",
  "stock_quantity",
  "stock_unitOfMeasureQuantity",
  "stock_price",
  "stock_unitOfMeasurePrice",
  "stock_type",
  "stock_ddtCode",
  "stock_companySupplierName",
] as const;

const BULK_TEMPLATE_ROWS: Array<
  Record<(typeof BULK_PRODUCT_COLUMNS)[number], string>
> = [
  {
    name: "Prodotto A",
    sku: "SKU-A",
    category: "FERTILIZER",
    type: "Liquido",
    description: "Descrizione A",
    registrationNumber: "REG-A",
    labelUrl: "https://example.com/label-a.pdf",
    labelMetadata: '{"color":"green"}',
    stock_quantity: "100",
    stock_unitOfMeasureQuantity: "kg",
    stock_price: "25.5",
    stock_unitOfMeasurePrice: "EUR",
    stock_type: "IN",
    stock_ddtCode: "DDT-001",
    stock_companySupplierName: "Fornitore SPA",
  },
  {
    name: "Prodotto B",
    sku: "SKU-B",
    category: "PESTICIDE",
    type: "Granulare",
    description: "",
    registrationNumber: "",
    labelUrl: "",
    labelMetadata: "",
    stock_quantity: "",
    stock_unitOfMeasureQuantity: "",
    stock_price: "",
    stock_unitOfMeasurePrice: "",
    stock_type: "",
    stock_ddtCode: "",
    stock_companySupplierName: "",
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

class BulkProductRecordMapper {
  public map(
    row: BulkProductFileRow,
    rowIndex: number
  ): {
    product?: BulkProductPayload;
    errors: string[];
  } {
    const errors: string[] = [];

    const name = this.requireString(row.name, "name", rowIndex, errors);
    const sku = this.requireString(row.sku, "sku", rowIndex, errors);

    if (!name || !sku) {
      return { errors };
    }

    const product: BulkProductPayload = {
      name,
      sku,
      category: this.optionalString(row.category),
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

    const hasStockData =
      quantity !== undefined ||
      Boolean(unitOfMeasureQuantity) ||
      price !== undefined ||
      Boolean(unitOfMeasurePrice) ||
      Boolean(type) ||
      Boolean(ddtCode) ||
      Boolean(companySupplierName);

    if (!hasStockData) {
      return undefined;
    }

    if (quantity === undefined) {
      errors.push(
        `Riga ${rowIndex}: specificare "stock_quantity" quando si inseriscono dati di stock`
      );
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
    };
  }

  private parseNumber(value: unknown): number | undefined {
    const parsedString = this.optionalString(value);
    if (!parsedString) {
      return undefined;
    }
    const parsedNumber = Number(parsedString);
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

    rawResult.rows.forEach((row, index) => {
      const { product, errors } = this.mapper.map(row, index + 2);
      if (product) {
        parsed.products.push(product);
      }
      parsed.errors.push(...errors);
    });

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

class BulkProductTemplateBuilder {
  public static buildCsv(): string {
    return Papa.unparse(BULK_TEMPLATE_ROWS, {
      columns: BULK_PRODUCT_COLUMNS as unknown as string[],
    });
  }

  public static downloadTemplate(): void {
    const csv = this.buildCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products-bulk-template.csv";
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

  const handleFileChange = useCallback(async () => {
    if (!fileInputRef.current?.files?.length) {
      return;
    }

    const file = fileInputRef.current.files[0];
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

  const resetForm = useCallback(() => {
    setParsedProducts([]);
    setParserErrors([]);
    setSelectedFileName(null);
    setImportSummary(null);
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
    const token = authService.getAuthToken();
    if (!token) {
      toast.error("Sessione scaduta. Effettua di nuovo l'accesso.");
      return;
    }

    const payload: BulkImportProductsPayload = {
      companyId: companyId.trim(),
      warehouseId: warehouseId.trim(),
      products: parsedProducts,
    };

    setIsImporting(true);
    try {
      const response = await productsApiService.bulkImport(token, payload);
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
                    Il file caricato deve includere:
                    <div className="flex flex-wrap gap-2">
                      {BULK_PRODUCT_COLUMNS.map((column) => (
                        <Badge
                          key={column}
                          variant="secondary"
                          className="font-mono"
                        >
                          {column}
                        </Badge>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="bulk-file">File CSV o Excel</Label>
                  <Input
                    id="bulk-file"
                    ref={fileInputRef}
                    type="file"
                    accept={BULK_FILE_ACCEPT}
                    onChange={handleFileChange}
                  />
                  {selectedFileName && (
                    <p className="text-xs text-muted-foreground">
                      File selezionato: {selectedFileName}
                    </p>
                  )}
                </div>

                {isParsing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner size={18} /> Analisi del file in corso...
                  </div>
                )}

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
              onClick={() => BulkProductTemplateBuilder.downloadTemplate()}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Scarica template CSV
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
