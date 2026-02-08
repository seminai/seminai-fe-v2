import { useCallback, useMemo, useState } from "react";
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
}: FileImportSectionProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "ddt" | "invoice">("csv");
  const [companyId, setCompanyId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // File preview state
  const [uploadedFile, setUploadedFile] = useState<CompanyFile | null>(null);

  // Extracted products state
  const [extractedProducts, setExtractedProducts] = useState<
    ProductImportItem[]
  >([]);
  const [previewErrors, setPreviewErrors] = useState<ImportPreviewError[]>([]);
  const [importSource, setImportSource] = useState<ProductImportSource>("csv");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

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
    setUploadedFile(null);
    setExtractedProducts([]);
    setPreviewErrors([]);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as "csv" | "ddt" | "invoice");
    setUploadedFile(null);
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

  const handleCsvFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || !companyId) {
        setUploadedFile(null);
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

        if (savedFile) setUploadedFile(savedFile);

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
        setUploadedFile(null);
        setExtractedProducts([]);
        return;
      }

      setIsProcessing(true);
      setPreviewErrors([]);

      try {
        // Upload first file for preview + extract products in parallel
        const [savedFile, ddtResponse] = await Promise.all([
          uploadFileToCompany(files[0]),
          productsApiService.importFromDdt(files),
        ]);

        if (savedFile) setUploadedFile(savedFile);

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
    [companyId, uploadFileToCompany],
  );

  const handleInvoiceFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || !companyId) {
        setUploadedFile(null);
        setExtractedProducts([]);
        return;
      }

      setIsProcessing(true);
      setPreviewErrors([]);

      try {
        // Upload first file for preview + extract products in parallel
        const [savedFile, invoiceResponse] = await Promise.all([
          uploadFileToCompany(files[0]),
          productsApiService.importFromInvoice(files),
        ]);

        if (savedFile) setUploadedFile(savedFile);

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
    [companyId, uploadFileToCompany],
  );

  const hasExtractedProducts = extractedProducts.length > 0;

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
            {/* Desktop: split 50/50 */}
            <div className="hidden lg:flex flex-1 min-h-0">
              {/* Sinistra: anteprima file */}
              <div className="w-1/2 border-r flex flex-col min-h-0">
                <FilePreviewPanel
                  fileUrl={uploadedFile?.url ?? null}
                  fileName={uploadedFile?.name ?? null}
                  mimeType={uploadedFile?.metadata.mimeType ?? null}
                />
              </div>
              {/* Destra: prodotti estratti */}
              <div className="w-1/2 flex flex-col min-h-0">
                <ImportedProductsPanel
                  products={extractedProducts}
                  previewErrors={previewErrors}
                  companyId={companyId}
                  warehouseId={warehouseId || warehouses[0]?.id || undefined}
                  importSource={importSource}
                  onImportCompleted={onImportCompleted}
                />
              </div>
            </div>

            {/* Mobile: tabella a tutta pagina + bottone anteprima */}
            <div className="flex lg:hidden flex-1 flex-col overflow-y-auto">
              <ImportedProductsPanel
                products={extractedProducts}
                previewErrors={previewErrors}
                companyId={companyId}
                warehouseId={warehouseId || warehouses[0]?.id || undefined}
                importSource={importSource}
                onImportCompleted={onImportCompleted}
                mobilePreviewButton={
                  uploadedFile ? (
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

            {/* Sheet anteprima file per mobile */}
            <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
              <SheetContent side="bottom" className="h-[85vh] p-0">
                <SheetHeader className="px-4 py-3 border-b">
                  <SheetTitle className="text-sm">
                    {uploadedFile?.name ?? "Anteprima documento"}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 h-[calc(85vh-3.5rem)]">
                  <FilePreviewPanel
                    fileUrl={uploadedFile?.url ?? null}
                    fileName={null}
                    mimeType={uploadedFile?.metadata.mimeType ?? null}
                  />
                </div>
              </SheetContent>
            </Sheet>
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
