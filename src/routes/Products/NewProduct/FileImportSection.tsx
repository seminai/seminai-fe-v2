import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FileDown, Eye, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";
import { filesApiService, type CompanyFile } from "@/api/files";
import {
  productsApiService,
  type ImportFromCsvExcelPreviewProduct,
  type BulkFromDdtEntry,
  type InvoiceProduct,
} from "@/api/products";
import type {
  ImportPreviewError,
  ProductImportItem,
  ProductImportSource,
} from "../productImportPreview.types";
import FileUploadArea from "./FileUploadArea";
import FilePreviewPanel from "./FilePreviewPanel";
import ImportedProductsPanel from "./ImportedProductsPanel";

interface FileImportSectionProps {
  onImportCompleted?: () => void;
  preselectedCompanyId?: string;
  /** Hides the import button inside ImportedProductsPanel */
  hideImportButton?: boolean;
  /** Ref to store the import trigger function for external invocation */
  importTriggerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  /** Called when loading state changes (extracting file or running import) */
  onLoadingChange?: (loading: boolean) => void;
  /** Called when there are extracted products ready to load */
  onHasProductsToLoadChange?: (has: boolean) => void;
}

class CsvExcelPreviewMapper {
  public map(
    products: ImportFromCsvExcelPreviewProduct[],
  ): ProductImportItem[] {
    return products.map((p) => ({
      name: p.name,
      sku: p.sku ?? undefined,
      barcode: p.barcode ?? undefined,
      category: p.category ?? undefined,
      type: p.type ?? undefined,
      description: p.description ?? undefined,
      registrationNumber: p.registrationNumber ?? undefined,
      quantity: p.stock?.quantity ?? 0,
      unitOfMeasureQuantity: p.stock?.unitOfMeasureQuantity || "kg",
      price: p.stock?.price ?? undefined,
      unitOfMeasurePrice: p.stock?.unitOfMeasurePrice ?? undefined,
      ddtCode: p.stock?.ddtCode ?? undefined,
      ddtDate: p.stock?.ddtDate ?? undefined,
      invoiceCode: p.stock?.invoiceCode ?? undefined,
      invoiceDate: p.stock?.invoiceDate ?? undefined,
      supplierName: p.stock?.companySupplierName ?? undefined,
      addressSupplier: p.stock?.addressSupplier ?? undefined,
      supplierVat: p.stock?.vatNumberSupplier ?? undefined,
    }));
  }
}

class DdtPreviewMapper {
  public map(entries: BulkFromDdtEntry[]): ProductImportItem[] {
    return entries.map((e) => ({
      name: e.productName,
      registrationNumber: e.registrationNumber ?? undefined,
      quantity: e.quantity,
      unitOfMeasureQuantity: e.quantityUnitOfMeasure || "kg",
      supplierName: e.supplierName ?? undefined,
      supplierVat: e.supplierVat ?? undefined,
      ddtDate: e.ddtDate ?? undefined,
      ddtCode: e.orderNumber ?? undefined,
    }));
  }
}

class InvoicePreviewMapper {
  public map(products: InvoiceProduct[]): ProductImportItem[] {
    return products.map((p) => ({
      name: p.productName,
      registrationNumber: p.registrationNumber ?? undefined,
      category: p.productCategory ?? undefined,
      quantity: p.quantity ?? 0,
      unitOfMeasureQuantity: p.quantityUnitOfMeasure || "NR",
      price: p.unitPrice ?? undefined,
      unitOfMeasurePrice: p.totalPrice != null ? "EUR" : undefined,
      invoiceCode: p.invoiceNumber ?? undefined,
      invoiceDate: p.invoiceDate ?? undefined,
      supplierName: p.supplierName ?? undefined,
      supplierVat: p.supplierVat ?? undefined,
    }));
  }
}

export default function FileImportSection({
  onImportCompleted,
  preselectedCompanyId,
  hideImportButton,
  importTriggerRef,
  onLoadingChange,
  onHasProductsToLoadChange,
}: FileImportSectionProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "ddt" | "invoice">("csv");
  const [companyId, setCompanyId] = useState(preselectedCompanyId || "");
  const [warehouseId, setWarehouseId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [panelImporting, setPanelImporting] = useState(false);

  // File preview state
  const [uploadedFiles, setUploadedFiles] = useState<CompanyFile[]>([]);
  const [selectedPreviewFileId, setSelectedPreviewFileId] = useState<
    string | null
  >(null);

  useEffect(() => {
    onLoadingChange?.(isProcessing || panelImporting);
  }, [isProcessing, panelImporting, onLoadingChange]);

  // Extracted products state
  const [extractedProducts, setExtractedProducts] = useState<
    ProductImportItem[]
  >([]);
  const [previewErrors, setPreviewErrors] = useState<ImportPreviewError[]>([]);
  const [importSource, setImportSource] = useState<ProductImportSource>("csv");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  useEffect(() => {
    onHasProductsToLoadChange?.(extractedProducts.length > 0);
  }, [extractedProducts.length, onHasProductsToLoadChange]);

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
    () => companies.map((c) => ({ value: c.id, label: c.name || c.id })),
    [companies],
  );

  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ value: w.id, label: w.name || w.id })),
    [warehouses],
  );

  const handleCompanyChange = useCallback((value: string) => {
    setCompanyId(value);
    setWarehouseId("");
    setUploadedFiles([]);
    setSelectedPreviewFileId(null);
    setExtractedProducts([]);
    setPreviewErrors([]);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as "csv" | "ddt" | "invoice");
    setUploadedFiles([]);
    setSelectedPreviewFileId(null);
    setExtractedProducts([]);
    setPreviewErrors([]);
  }, []);

  const uploadFileToCompany = useCallback(
    async (file: File): Promise<CompanyFile | null> => {
      if (!companyId) return null;
      try {
        const response = await filesApiService.uploadFile({
          file,
          companyId,
          path: "magazzino/import",
          type: "product-import",
        });
        return response.data.file;
      } catch (err) {
        console.warn("File upload to company failed:", err);
        return null;
      }
    },
    [companyId],
  );

  const uploadFilesToCompany = useCallback(
    async (files: File[]): Promise<CompanyFile[]> => {
      const uploaded = await Promise.all(files.map((file) => uploadFileToCompany(file)));
      return uploaded.filter((file): file is CompanyFile => file !== null);
    },
    [uploadFileToCompany],
  );

  const handleCsvFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || !companyId) {
        setUploadedFiles([]);
        setSelectedPreviewFileId(null);
        setExtractedProducts([]);
        return;
      }

      const file = files[0];
      setIsProcessing(true);
      setPreviewErrors([]);

      try {
        // Upload to company files + extract products in parallel
        const [savedFile, previewResponse] = await Promise.all([
          uploadFileToCompany(file),
          productsApiService.importFromCsvExcelPreview({
            file,
            companyId,
            warehouseId: warehouseId || warehouses[0]?.id || undefined,
          }),
        ]);

        if (savedFile) {
          setUploadedFiles([savedFile]);
          setSelectedPreviewFileId(savedFile.id);
        } else {
          setUploadedFiles([]);
          setSelectedPreviewFileId(null);
        }

        const products = new CsvExcelPreviewMapper().map(
          previewResponse.data?.products ?? [],
        );
        const errors = previewResponse.data?.errors ?? [];

        if (products.length === 0) {
          toast.warning("Nessun prodotto trovato nel file");
          if (errors.length > 0) {
            setPreviewErrors(errors);
          }
        } else {
          setExtractedProducts(products);
          setPreviewErrors(errors);
          setImportSource(
            file.name.toLowerCase().endsWith(".csv") ? "csv" : "excel",
          );
          toast.success(`${products.length} prodotti estratti dal file`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Errore";
        toast.error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    [companyId, warehouseId, warehouses, uploadFileToCompany],
  );

  const handleDdtFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || !companyId) {
        setUploadedFiles([]);
        setSelectedPreviewFileId(null);
        setExtractedProducts([]);
        return;
      }

      setIsProcessing(true);
      setPreviewErrors([]);

      try {
        // Upload all files for preview + extract products in parallel
        const [savedFiles, ddtResponse] = await Promise.all([
          uploadFilesToCompany(files),
          productsApiService.importFromDdt(files),
        ]);

        setUploadedFiles(savedFiles);
        setSelectedPreviewFileId((prev) => {
          if (prev && savedFiles.some((f) => f.id === prev)) return prev;
          return savedFiles[0]?.id ?? null;
        });

        if (!ddtResponse.data) {
          throw new Error("Risposta vuota dal servizio DDT");
        }

        const allEntries: BulkFromDdtEntry[] = [];
        if (ddtResponse.data.results) {
          ddtResponse.data.results.forEach((r) => {
            allEntries.push(...(r.entries ?? []));
          });
        } else if (ddtResponse.data.suggestedProducts) {
          ddtResponse.data.suggestedProducts.forEach((p) => {
            allEntries.push({
              productName: p.productName,
              registrationNumber: p.registrationNumber ?? undefined,
              quantity: p.quantity,
              quantityUnitOfMeasure: p.quantityUnitOfMeasure,
              supplierName: p.supplierName ?? undefined,
              supplierVat: p.supplierVat ?? undefined,
              ddtDate: p.ddtDate ?? undefined,
              orderNumber: p.orderNumber ?? undefined,
            });
          });
        }

        const products = new DdtPreviewMapper().map(allEntries);
        setExtractedProducts(products);
        setImportSource("ddt");
        toast.success(`${products.length} prodotti estratti dai DDT`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Errore DDT";
        toast.error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    [companyId, uploadFilesToCompany],
  );

  const handleInvoiceFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || !companyId) {
        setUploadedFiles([]);
        setSelectedPreviewFileId(null);
        setExtractedProducts([]);
        return;
      }

      setIsProcessing(true);
      setPreviewErrors([]);

      try {
        // Upload all files for preview + extract products in parallel
        const [savedFiles, invoiceResponse] = await Promise.all([
          uploadFilesToCompany(files),
          productsApiService.importFromInvoice(files),
        ]);

        setUploadedFiles(savedFiles);
        setSelectedPreviewFileId((prev) => {
          if (prev && savedFiles.some((f) => f.id === prev)) return prev;
          return savedFiles[0]?.id ?? null;
        });

        if (invoiceResponse.status !== "success" || !invoiceResponse.data) {
          throw new Error("Errore nell'estrazione dei dati dalla fattura");
        }

        const products = new InvoicePreviewMapper().map(
          invoiceResponse.data.suggestedProducts ?? [],
        );

        if (products.length === 0) {
          toast.warning("Nessun prodotto trovato nella fattura");
        } else {
          setExtractedProducts(products);
          setImportSource("invoice");
          toast.success(
            `${products.length} prodotti estratti da ${invoiceResponse.data.filesProcessed} fattura/e`,
          );
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Errore estrazione fattura";
        toast.error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    [companyId, uploadFilesToCompany],
  );

  const hasExtractedProducts = extractedProducts.length > 0;
  const isExcelImport = importSource === "excel";
  const selectedPreviewFile = useMemo(() => {
    if (uploadedFiles.length === 0) return null;
    if (!selectedPreviewFileId) return uploadedFiles[0];
    return (
      uploadedFiles.find((file) => file.id === selectedPreviewFileId) ??
      uploadedFiles[0]
    );
  }, [uploadedFiles, selectedPreviewFileId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header: toggle tipo file + selezione azienda/magazzino */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-white space-y-4">
        {/* Riga toggle tipo file */}
        <div className="flex items-center gap-3">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="csv" className="text-xs">
                CSV/Excel
              </TabsTrigger>
              <TabsTrigger value="ddt" className="text-xs">
                DDT PDF
              </TabsTrigger>
              <TabsTrigger value="invoice" className="text-xs">
                Fattura
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "csv" && (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                const link = document.createElement("a");
                link.href = "/templates/2026.01_Template_MAGAZZINO.xlsx";
                link.download = "2026.01_Template_MAGAZZINO.xlsx";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="gap-1 text-xs text-muted-foreground px-0"
            >
              <FileDown className="h-3.5 w-3.5" />
              Scarica template
            </Button>
          )}
        </div>

        {/* Riga selezione azienda e magazzino */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!preselectedCompanyId && (
          <div className="space-y-1">
            <Label className="text-xs">Azienda *</Label>
            <SearchableSelect
              value={companyId}
              options={companyOptions}
              placeholder="Seleziona azienda"
              searchPlaceholder="Cerca azienda..."
              emptyMessage="Nessuna azienda trovata"
              loading={isLoadingCompanies}
              loadingMessage="Caricamento..."
              noneOptionLabel="Nessuna selezione"
              onChange={handleCompanyChange}
            />
            {isCompaniesError && (
              <p className="text-xs text-red-600">
                {companiesError?.message ?? "Errore aziende"}
              </p>
            )}
          </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Magazzino (opzionale)</Label>
            {companyId ? (
              <SearchableSelect
                value={warehouseId}
                options={warehouseOptions}
                placeholder="Seleziona magazzino"
                searchPlaceholder="Cerca magazzino..."
                emptyMessage="Nessun magazzino"
                noneOptionLabel="Automatico"
                loading={isLoadingWarehouses}
                loadingMessage="Caricamento..."
                onChange={setWarehouseId}
              />
            ) : (
              <div className="h-9 rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 flex items-center px-3 text-xs text-muted-foreground">
                Seleziona prima un&apos;azienda
              </div>
            )}
            {isWarehousesError && (
              <p className="text-xs text-red-600">
                {warehousesError?.message ?? "Errore magazzini"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Area principale: split quando ci sono prodotti, altrimenti upload centrato */}
      <div className="flex-1 min-h-0 flex">
        {hasExtractedProducts ? (
          <>
            {/* Desktop: per Excel solo tabella, per altri split 50/50 */}
            <div className="hidden lg:flex flex-1 min-h-0">
              {!isExcelImport && (
                <div className="w-1/2 border-r flex flex-col min-h-0">
                  {uploadedFiles.length > 1 && (
                    <div className="px-3 py-2 border-b bg-gray-50 flex items-center gap-2 overflow-x-auto">
                      {uploadedFiles.map((file) => (
                        <Button
                          key={file.id}
                          variant={
                            selectedPreviewFile?.id === file.id
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="h-7 text-xs whitespace-nowrap"
                          onClick={() => setSelectedPreviewFileId(file.id)}
                        >
                          {file.name}
                        </Button>
                      ))}
                    </div>
                  )}
                  <FilePreviewPanel
                    fileUrl={selectedPreviewFile?.url ?? null}
                    fileName={selectedPreviewFile?.name ?? null}
                    mimeType={selectedPreviewFile?.metadata.mimeType ?? null}
                  />
                </div>
              )}
              <div
                className={
                  isExcelImport ? "w-full flex flex-col min-h-0" : "w-1/2 flex flex-col min-h-0"
                }
              >
                <ImportedProductsPanel
                  products={extractedProducts}
                  previewErrors={previewErrors}
                  companyId={companyId}
                  warehouseId={warehouseId || warehouses[0]?.id || undefined}
                  importSource={importSource}
                  onImportCompleted={onImportCompleted}
                  hideFooter={hideImportButton}
                  importTriggerRef={importTriggerRef}
                  onImportingChange={setPanelImporting}
                />
              </div>
            </div>

            {/* Mobile: tabella a tutta pagina + bottone anteprima (non per Excel) */}
            <div className="flex lg:hidden flex-1 flex-col overflow-y-auto">
              <ImportedProductsPanel
                products={extractedProducts}
                previewErrors={previewErrors}
                companyId={companyId}
                warehouseId={warehouseId || warehouses[0]?.id || undefined}
                importSource={importSource}
                onImportCompleted={onImportCompleted}
                hideFooter={hideImportButton}
                onImportingChange={setPanelImporting}
                mobilePreviewButton={
                  !isExcelImport && selectedPreviewFile ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setMobilePreviewOpen(true)}
                    >
                      <Eye className="h-4 w-4" />
                      Visualizza documento
                    </Button>
                  ) : undefined
                }
              />
            </div>

            {/* Sheet anteprima file per mobile (solo per CSV/DDT/fattura) */}
            {!isExcelImport && (
            <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
              <SheetContent side="bottom" className="h-[85vh] p-0">
                <SheetHeader className="px-4 py-3 border-b">
                  <SheetTitle className="text-sm">
                    {selectedPreviewFile?.name ?? "Anteprima documento"}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 h-[calc(85vh-3.5rem)]">
                  <FilePreviewPanel
                    fileUrl={selectedPreviewFile?.url ?? null}
                    fileName={null}
                    mimeType={selectedPreviewFile?.metadata.mimeType ?? null}
                  />
                </div>
              </SheetContent>
            </Sheet>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-start justify-center overflow-auto">
            <div className="w-full max-w-lg py-8 px-6">
              <FileUploadArea
                mode={activeTab}
                disabled={!companyId}
                isProcessing={isProcessing}
                onConfirmExtraction={
                  activeTab === "csv"
                    ? handleCsvFilesSelected
                    : activeTab === "invoice"
                      ? handleInvoiceFilesSelected
                      : handleDdtFilesSelected
                }
              />
              {!companyId && (
                <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <Info className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-sm font-medium">
                    Seleziona un&apos;azienda per poter caricare i file.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
