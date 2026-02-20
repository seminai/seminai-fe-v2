import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";
import { useProducts } from "@/hooks/useProducts";
import { productsApiService, type CreateProductPayload } from "@/api/products";
import { stocksApiService } from "@/api/stocks";
import { getAllFitosanitariRecords } from "@/services/fitosanitariRegistry";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
import ProductStockFields from "./ProductStockFields";

const PRODUCT_CATEGORIES = [
  { value: "FERTILIZER", label: "Fertilizzante" },
  { value: "PHYTOSANITARY", label: "Fitosanitario" },
  { value: "SEED", label: "Seme" },
  { value: "ADJUVANT", label: "Coadiuvante" },
  { value: "OTHER", label: "Altro" },
];

interface ManualProductFormProps {
  onProductCreated?: () => void;
  preselectedCompanyId?: string;
  /** Ref to trigger submit from wizard footer (QuickCreate) */
  importTriggerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  /** Called when submit (create product) is in progress */
  onLoadingChange?: (loading: boolean) => void;
  /** Called when form is valid and can submit (has "products to load") */
  onHasProductsToLoadChange?: (has: boolean) => void;
}

export interface StockFormData {
  quantity: string;
  unitOfMeasureQuantity: string;
  price: string;
  unitOfMeasurePrice: string;
  type: "IN" | "OUT";
  ddtCode: string;
  invoiceDate: string;
  invoiceCode: string;
  invoiceDueDate: string;
  companySupplierName: string;
  vatNumberSupplier: string;
}

class ManualProductFormValidator {
  public static validate(
    companyId: string,
    warehouseId: string,
    name: string,
    sku: string,
  ): string | null {
    if (!companyId) return "Seleziona un'azienda";
    if (!warehouseId) return "Seleziona un magazzino";
    if (!name.trim()) return "Inserisci il nome del prodotto";
    if (!sku.trim()) return "Inserisci lo SKU del prodotto";
    return null;
  }

  public static buildPayload(
    companyId: string,
    warehouseId: string,
    name: string,
    sku: string,
    category: string,
    type: string,
    stockData: StockFormData,
  ): CreateProductPayload {
    const quantity = parseFloat(stockData.quantity);
    const price = parseFloat(stockData.price);

    return {
      companyId,
      warehouseId,
      name: name.trim(),
      sku: sku.trim(),
      category: category || undefined,
      type: type.trim() || undefined,
      stock:
        quantity > 0
          ? {
              quantity,
              unitOfMeasureQuantity: stockData.unitOfMeasureQuantity || "kg",
              price: isNaN(price) ? undefined : price,
              unitOfMeasurePrice: stockData.unitOfMeasurePrice || undefined,
              type: stockData.type,
              ddtCode: stockData.ddtCode.trim() || undefined,
              invoiceDate: stockData.invoiceDate || undefined,
              invoiceCode: stockData.invoiceCode.trim() || undefined,
              invoiceDueDate: stockData.invoiceDueDate || undefined,
              companySupplierName:
                stockData.companySupplierName.trim() || undefined,
              vatNumberSupplier:
                stockData.vatNumberSupplier.trim() || undefined,
            }
          : undefined,
    };
  }
}

const INITIAL_STOCK_DATA: StockFormData = {
  quantity: "",
  unitOfMeasureQuantity: "kg",
  price: "",
  unitOfMeasurePrice: "EUR",
  type: "IN",
  ddtCode: "",
  invoiceDate: "",
  invoiceCode: "",
  invoiceDueDate: "",
  companySupplierName: "",
  vatNumberSupplier: "",
};

export default function ManualProductForm({
  onProductCreated,
  preselectedCompanyId,
  importTriggerRef,
  onLoadingChange,
  onHasProductsToLoadChange,
}: ManualProductFormProps) {
  const [companyId, setCompanyId] = useState(preselectedCompanyId || "");
  const [warehouseId, setWarehouseId] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [selectedFitosanitarioId, setSelectedFitosanitarioId] = useState("");
  const [fitosanitariProducts, setFitosanitariProducts] = useState<
    FitosanitariDatasetRecord[]
  >([]);
  const [isLoadingFitosanitari, setIsLoadingFitosanitari] = useState(false);
  const [selectedExistingProductId, setSelectedExistingProductId] = useState("");
  /** Per categoria Fitosanitario: origine prodotto = registro ministeriale o magazzino azienda */
  const [productSource, setProductSource] = useState<
    null | "registry" | "warehouse"
  >(null);
  const [stockData, setStockData] = useState<StockFormData>(INITIAL_STOCK_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { companies, isLoading: isLoadingCompanies } = useCompanies();
  const companyName = useMemo(
    () => companies.find((c) => c.id === companyId)?.name,
    [companies, companyId],
  );
  const { products: allProducts, isLoading: isLoadingProducts } = useProducts(
    companyName,
  );
  const companyProducts = useMemo(() => {
    if (!companyId) return [];
    return allProducts.filter(
      (p) => p.warehouse?.company?.id === companyId,
    );
  }, [allProducts, companyId]);

  const isPhytosanitary = category === "PHYTOSANITARY";

  useEffect(() => {
    if (!isPhytosanitary) {
      setFitosanitariProducts([]);
      setSelectedFitosanitarioId("");
      return;
    }
    let active = true;
    setIsLoadingFitosanitari(true);
    getAllFitosanitariRecords()
      .then((records) => {
        if (active) setFitosanitariProducts(records);
      })
      .catch((err) => {
        if (active) console.error("Error loading fitosanitari:", err);
      })
      .finally(() => {
        if (active) setIsLoadingFitosanitari(false);
      });
    return () => {
      active = false;
    };
  }, [isPhytosanitary]);

  const fitosanitariOptions = useMemo(() => {
    return fitosanitariProducts.map((p, index) => {
      const sostanzeAttive = (p.activeIngredients ?? "")
        .replace(/\|/g, " ")
        .trim();
      const searchText = [p.productName, sostanzeAttive, p.registrationNumber]
        .filter(Boolean)
        .join(" ");
      return {
        value: String(index),
        label: p.administrativeStatus
          ? `${p.productName} (${p.administrativeStatus})`
          : p.productName,
        searchText,
      };
    });
  }, [fitosanitariProducts]);

  const getFitosanitarioRecordByIndex = useCallback(
    (indexStr: string): FitosanitariDatasetRecord | null => {
      const index = parseInt(indexStr, 10);
      if (Number.isNaN(index) || index < 0 || index >= fitosanitariProducts.length)
        return null;
      return fitosanitariProducts[index] ?? null;
    },
    [fitosanitariProducts],
  );

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    setSelectedFitosanitarioId("");
    setProductSource(null);
    if (value !== "PHYTOSANITARY") {
      setName("");
      setSku("");
    }
  }, []);

  const handleProductSourceChange = useCallback(
    (source: "registry" | "warehouse") => {
      setProductSource(source);
      if (source === "registry") {
        setSelectedExistingProductId("");
      } else {
        setSelectedFitosanitarioId("");
        setName("");
        setSku("");
      }
    },
    [],
  );

  const handleFitosanitarioSelect = useCallback(
    (value: string) => {
      setSelectedFitosanitarioId(value);
      const record = getFitosanitarioRecordByIndex(value);
      if (record) {
        setName(record.productName);
        setSku(record.registrationNumber);
      } else {
        setName("");
        setSku("");
      }
    },
    [getFitosanitarioRecordByIndex],
  );

  useEffect(() => {
    onLoadingChange?.(isSubmitting);
  }, [isSubmitting, onLoadingChange]);

  const selectedExistingProduct = useMemo(
    () =>
      companyProducts.find((p) => p.id === selectedExistingProductId) ?? null,
    [companyProducts, selectedExistingProductId],
  );
  const isAddStockMode = !!selectedExistingProductId && !!selectedExistingProduct;

  const useRegistrySource = isPhytosanitary && productSource === "registry";
  const useWarehouseSource =
    !isPhytosanitary || productSource === "warehouse";

  const canSubmit = isAddStockMode
    ? !!companyId &&
      parseFloat(stockData.quantity) > 0 &&
      !!stockData.unitOfMeasureQuantity?.trim()
    : useRegistrySource
      ? !!companyId &&
        !!warehouseId &&
        name.trim().length > 0 &&
        sku.trim().length > 0
      : !!companyId &&
        !!warehouseId &&
        name.trim().length > 0 &&
        sku.trim().length > 0;

  useEffect(() => {
    onHasProductsToLoadChange?.(canSubmit);
  }, [canSubmit, onHasProductsToLoadChange]);

  const { warehouses, isLoading: isLoadingWarehouses } = useCompanyWarehouses(
    companyId || undefined,
  );

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, label: c.name || c.id })),
    [companies],
  );

  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ value: w.id, label: w.name || w.id })),
    [warehouses],
  );

  const existingProductOptions = useMemo(() => {
    return companyProducts.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.warehouse?.name ?? "-"})`,
      searchText: [p.name, p.sku, p.description].filter(Boolean).join(" "),
    }));
  }, [companyProducts]);

  const handleCompanyChange = useCallback((value: string) => {
    setCompanyId(value);
    setWarehouseId("");
    setSelectedExistingProductId("");
  }, []);

  const handleExistingProductSelect = useCallback(
    (value: string) => {
      setSelectedExistingProductId(value);
      const product = companyProducts.find((p) => p.id === value);
      if (product) {
        setName(product.name);
        setSku(product.sku);
      } else {
        setName("");
        setSku("");
      }
    },
    [companyProducts],
  );

  const handleStockChange = useCallback(
    (field: keyof StockFormData, value: string) => {
      setStockData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (isAddStockMode && selectedExistingProduct) {
      const quantity = parseFloat(stockData.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error("Inserisci una quantità valida per il movimento di stock");
        return;
      }
      if (!stockData.unitOfMeasureQuantity?.trim()) {
        toast.error("Seleziona l'unità di misura");
        return;
      }
      setIsSubmitting(true);
      try {
        await stocksApiService.create({
          companyId: selectedExistingProduct.warehouse.company.id,
          productId: selectedExistingProduct.id,
          quantity,
          unitOfMeasureQuantity: stockData.unitOfMeasureQuantity,
          price: parseFloat(stockData.price) || undefined,
          unitOfMeasurePrice: stockData.unitOfMeasurePrice || undefined,
          type: stockData.type,
          ddtCode: stockData.ddtCode.trim() || undefined,
          invoiceCode: stockData.invoiceCode.trim() || undefined,
          invoiceDate: stockData.invoiceDate || undefined,
          invoiceDueDate: stockData.invoiceDueDate || undefined,
          companySupplierName: stockData.companySupplierName.trim() || undefined,
          vatNumberSupplier: stockData.vatNumberSupplier.trim() || undefined,
        });
        toast.success("Stock aggiunto con successo!");
        onProductCreated?.();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Errore nell'aggiunta stock";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const validationError = ManualProductFormValidator.validate(
      companyId,
      warehouseId,
      name,
      sku,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = ManualProductFormValidator.buildPayload(
        companyId,
        warehouseId,
        name,
        sku,
        category,
        type,
        stockData,
      );
      await productsApiService.create(payload);
      toast.success("Prodotto creato con successo!");
      onProductCreated?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore nella creazione";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isAddStockMode,
    selectedExistingProduct,
    companyId,
    warehouseId,
    name,
    sku,
    category,
    type,
    stockData,
    onProductCreated,
  ]);

  useEffect(() => {
    if (importTriggerRef) importTriggerRef.current = handleSubmit;
  }, [importTriggerRef, handleSubmit]);

  return (
    <>
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="py-6 space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-1">
              Inserisci manualmente
            </h3>
            <p className="text-sm text-muted-foreground">
              Compila i campi per creare un nuovo prodotto con il relativo
              movimento di stock.
            </p>
          </div>

          {/* 1. Azienda */}
          <section className="space-y-4">
            <h4 className="text-base font-semibold border-b pb-2">
              Azienda
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!preselectedCompanyId && (
                <div className="space-y-2">
                  <Label>Seleziona azienda *</Label>
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
                </div>
              )}
              {preselectedCompanyId && (
                <div className="space-y-2">
                  <Label>Azienda selezionata</Label>
                  <div className="rounded-lg border border-muted-foreground/30 bg-muted/20 px-3 py-2 text-sm">
                    {companyOptions.find((c) => c.value === companyId)?.label ??
                      "-"}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. Categoria */}
          <section className="space-y-4">
            <h4 className="text-base font-semibold border-b pb-2">
              Categoria
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {category && (
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="Es. Generico"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Scelta origine prodotto (solo se Fitosanitario) */}
          {isPhytosanitary && companyId && (
            <section className="space-y-4">
              <h4 className="text-base font-semibold border-b pb-2">
                Origine prodotto
              </h4>
              <p className="text-sm text-muted-foreground">
                Scegli una sola opzione: prodotto dal registro ministeriale oppure
                prodotto dal magazzino azienda.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={productSource === "registry" ? "default" : "outline"}
                  size="sm"
                  className={
                    productSource === "registry"
                      ? "bg-agri-green-600 hover:bg-agri-green-700"
                      : ""
                  }
                  onClick={() => handleProductSourceChange("registry")}
                >
                  Prodotto dal registro ministeriale
                </Button>
                <Button
                  type="button"
                  variant={productSource === "warehouse" ? "default" : "outline"}
                  size="sm"
                  className={
                    productSource === "warehouse"
                      ? "bg-agri-green-600 hover:bg-agri-green-700"
                      : ""
                  }
                  onClick={() => handleProductSourceChange("warehouse")}
                >
                  Prodotto e magazzino azienda
                </Button>
              </div>
            </section>
          )}

          {/* Blocco: Prodotto dal registro ministeriale (solo se scelto) */}
          {useRegistrySource && (
            <section className="space-y-4">
              <h4 className="text-base font-semibold border-b pb-2">
                Prodotto dal registro fitosanitari
              </h4>
              <div className="space-y-2">
                <Label>Seleziona prodotto dal registro *</Label>
                <SearchableSelect
                  value={selectedFitosanitarioId}
                  options={fitosanitariOptions}
                  placeholder="Cerca per nome, sostanza attiva o n. registrazione..."
                  searchPlaceholder="Nome, sostanza attiva o n. registrazione"
                  emptyMessage="Nessun prodotto trovato"
                  loading={isLoadingFitosanitari}
                  loadingMessage="Caricamento registro fitosanitari..."
                  noneOptionLabel="Inserisci manualmente"
                  onChange={handleFitosanitarioSelect}
                  maxVisibleOptions={150}
                  maxHeight="max-h-[280px]"
                  showOptionsOnlyWhenSearching
                />
                <p className="text-xs text-muted-foreground">
                  Digita per cercare per nome, sostanza attiva o numero di
                  registrazione. Tutti i prodotti con stato amministrativo
                  (Autorizzato, Revocato, Scaduto, ecc.)
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Magazzino *</Label>
                  <SearchableSelect
                    value={warehouseId}
                    options={warehouseOptions}
                    placeholder="Seleziona magazzino"
                    searchPlaceholder="Cerca magazzino..."
                    emptyMessage="Nessun magazzino trovato"
                    loading={isLoadingWarehouses}
                    loadingMessage="Caricamento magazzini..."
                    onChange={setWarehouseId}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Blocco: Prodotto e magazzino azienda (se non fitosanitario o scelto magazzino) */}
          {companyId && useWarehouseSource && (
            <section className="space-y-4">
              <h4 className="text-base font-semibold border-b pb-2">
                Prodotto e magazzino
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prodotto esistente o nuovo</Label>
                  <SearchableSelect
                    value={selectedExistingProductId}
                    options={existingProductOptions}
                    placeholder="Cerca per nome, SKU o sostanza attiva..."
                    searchPlaceholder="Nome, SKU o sostanza attiva"
                    emptyMessage="Nessun prodotto trovato"
                    loading={isLoadingProducts}
                    loadingMessage="Caricamento prodotti..."
                    noneOptionLabel="Nuovo prodotto"
                    onChange={handleExistingProductSelect}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se il prodotto esiste già, selezionalo per aggiungere stock
                    (cerca per nome, SKU o sostanza attiva). Altrimenti scegli
                    &quot;Nuovo prodotto&quot;.
                  </p>
                </div>

                {!isAddStockMode && (
                  <div className="space-y-2">
                    <Label>Seleziona magazzino *</Label>
                    <SearchableSelect
                      value={warehouseId}
                      options={warehouseOptions}
                      placeholder="Seleziona magazzino"
                      searchPlaceholder="Cerca magazzino..."
                      emptyMessage="Nessun magazzino trovato"
                      loading={isLoadingWarehouses}
                      loadingMessage="Caricamento magazzini..."
                      onChange={setWarehouseId}
                    />
                  </div>
                )}

                {isAddStockMode && selectedExistingProduct && (
                  <div className="space-y-2">
                    <Label>Magazzino prodotto</Label>
                    <div className="rounded-lg border border-muted-foreground/30 bg-muted/20 px-3 py-2 text-sm">
                      {selectedExistingProduct.warehouse?.name ?? "-"}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Dati prodotto (solo per nuovo prodotto, non in add-stock) */}
          {!isAddStockMode && (
            <section className="space-y-4">
              <h4 className="text-base font-semibold border-b pb-2">
                Dati prodotto
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome prodotto *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Es. Confidor 200 SL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Es. SKU-001 o n. registrazione"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Stock */}
          <ProductStockFields
            stockData={stockData}
            onStockChange={handleStockChange}
            required={isAddStockMode}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t bg-white p-4 flex justify-end items-center gap-4">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="gap-2 bg-agri-green-600 text-white shadow-sm hover:bg-agri-green-700 min-w-48"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Spinner size={18} />
              {isAddStockMode ? "Aggiunta in corso..." : "Creazione in corso..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isAddStockMode ? "Aggiungi stock" : "Crea prodotto"}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
