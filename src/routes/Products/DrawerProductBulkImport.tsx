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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { productsApiService } from "@/api/products";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";

type BulkProductFileRow = Record<string, unknown>;

type ImportSummary = {
  imported: number;
  skipped: number;
  errors: string[];
};

const BULK_FILE_ACCEPT = ".csv,.xls,.xlsx";

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
        error instanceof Error ? error.message : "Errore durante il caricamento del file";
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

    setIsImporting(true);
    try {
      const response = await productsApiService.importFromCsvExcel({
        file: selectedFile,
        companyId: companyId.trim(),
        warehouseId: warehouseId.trim() || undefined,
      });

      const summary: ImportSummary = {
        imported: response.data?.imported ?? 0,
        skipped: response.data?.skipped ?? 0,
        errors:
          response.data?.errors?.map((error) => {
            const rowLabel =
              typeof error.row === "number" ? `Riga ${error.row}: ` : "";
            return `${rowLabel}${error.message}`;
          }) ?? [],
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
    resetForm,
    selectedFile,
    warehouseId,
  ]);

  const closeDrawer = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const canShowImportSections = Boolean(companyId);

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
                      {!isLoadingWarehouses &&
                        warehouseOptions.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Nessun magazzino disponibile per l&apos;azienda
                            selezionata. Verrà selezionato automaticamente il primo magazzino disponibile.
                          </p>
                        )}
                      {!isLoadingWarehouses &&
                        warehouseOptions.length > 0 &&
                        !warehouseId && (
                          <p className="text-xs text-muted-foreground">
                            Se non selezioni un magazzino, verrà utilizzato il primo magazzino disponibile dell&apos;azienda.
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
                  un&apos;azienda. Una volta completata la
                  selezione appariranno i controlli di caricamento.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Formato richiesto</AlertTitle>
                  <AlertDescription>
                    Il file deve contenere le seguenti colonne ( * = obbligatorio):
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

                {showPreview && filePreviewRows.length > 0 && (
                  <Card>
                    <CardHeader className="space-y-2">
                      <CardTitle>Anteprima file</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Mostrate le prime {filePreviewRows.length} righe del file.
                        Verifica che i dati siano corretti prima di procedere con l&apos;importazione.
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
              Scarica template
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
