import { useCallback, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Upload } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import DrawerProductImportPreview from "./DrawerProductImportPreview";
import DrawerProductBulkImportCsvTab from "./DrawerProductBulkImportCsvTab";
import DrawerProductBulkImportDdtTab from "./DrawerProductBulkImportDdtTab";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";
import type {
  ImportPreviewError,
  ProductImportItem,
  ProductImportSource,
} from "./productImportPreview.types";

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
  const [activeTab, setActiveTab] = useState<"csv" | "ddt">("csv");
  const [resetCounter, setResetCounter] = useState(0);
  const [companyId, setCompanyId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [previewErrors, setPreviewErrors] = useState<ImportPreviewError[]>([]);
  const [previewProducts, setPreviewProducts] = useState<ProductImportItem[]>(
    []
  );
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [previewImportSource, setPreviewImportSource] =
    useState<ProductImportSource>("ddt");
  const [csvImportButtonState, setCsvImportButtonState] = useState<{
    canImport: boolean;
    isPreviewing: boolean;
    onImport: () => void;
  } | null>(null);

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

  const handlePreviewReady = useCallback(
    (payload: {
      products: ProductImportItem[];
      errors: ImportPreviewError[];
      source: ProductImportSource;
    }) => {
      setPreviewProducts(payload.products);
      setPreviewErrors(payload.errors);
      setPreviewImportSource(payload.source);
      setPreviewDrawerOpen(true);
    },
    []
  );

  const handleCompanyChange = useCallback((value: string) => {
    setCompanyId(value);
    setWarehouseId("");
    setResetCounter((prev) => prev + 1);
    setPreviewProducts([]);
    setPreviewErrors([]);
    setPreviewDrawerOpen(false);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as "csv" | "ddt");
    if (value === "ddt") {
      setCsvImportButtonState(null);
    }
  }, []);

  const handlePreviewImportCompleted = useCallback(() => {
    onImportCompleted?.();
    setPreviewDrawerOpen(false);
    setPreviewProducts([]);
    setPreviewErrors([]);
  }, [onImportCompleted]);

  const handleCloseDrawer = useCallback(() => {
    setCompanyId("");
    setWarehouseId("");
    setActiveTab("csv");
    setPreviewProducts([]);
    setPreviewErrors([]);
    setPreviewDrawerOpen(false);
    setPreviewImportSource("ddt");
    setResetCounter((prev) => prev + 1);
    setCsvImportButtonState(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        handleCloseDrawer();
        return;
      }
      onOpenChange(true);
    },
    [handleCloseDrawer, onOpenChange]
  );

  const selectedWarehouse = useMemo(() => {
    if (warehouseId) {
      return warehouses.find((w) => w.id === warehouseId);
    }
    return warehouses[0];
  }, [warehouseId, warehouses]);

  const canShowImportSections = Boolean(companyId);

  return (
    <>
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-screen max-w-full sm:w-full sm:max-w-4xl bg-white">
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
                <DrawerProductBulkImportCsvTab
                  key={`csv-${resetCounter}`}
                  companyId={companyId}
                  warehouseId={warehouseId || warehouses[0]?.id || undefined}
                  canShowImportSections={canShowImportSections}
                  onPreviewReady={handlePreviewReady}
                  onImportButtonStateChange={setCsvImportButtonState}
                />
              </TabsContent>

              <TabsContent value="ddt" className="mt-0 space-y-4">
                <DrawerProductBulkImportDdtTab
                  key={`ddt-${resetCounter}`}
                  companyId={companyId}
                  canShowImportSections={canShowImportSections}
                  onPreviewReady={handlePreviewReady}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <SheetFooter className="flex flex-col gap-4 border-t pt-4">
          <div className="flex flex-wrap justify-between w-full gap-3">
            <Button type="button" variant="ghost" onClick={handleCloseDrawer}>
              Annulla
            </Button>
            {activeTab === "csv" && csvImportButtonState && (
              <Button
                type="button"
                onClick={csvImportButtonState.onImport}
                disabled={!csvImportButtonState.canImport}
                className="gap-2 bg-agri-green-600 text-white shadow-sm hover:bg-agri-green-700 focus-visible:ring-agri-green-600/20 dark:focus-visible:ring-agri-green-600/40"
              >
                {csvImportButtonState.isPreviewing ? (
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
        previewErrors={previewErrors}
        companyId={companyId}
        warehouseId={warehouseId || warehouses[0]?.id || undefined}
        warehouseName={selectedWarehouse?.name}
        importSource={previewImportSource}
        onImportCompleted={handlePreviewImportCompleted}
      />
    )}
    </>
  );
}

export default DrawerProductBulkImport;
