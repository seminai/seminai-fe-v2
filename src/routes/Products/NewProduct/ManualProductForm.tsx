import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSearchableSelect } from "@/routes/DosageManager/MultiSearchableSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCompanies } from "@/hooks/useCompanies";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";
import { useProducts } from "@/hooks/useProducts";
import { productsApiService, type CreateProductPayload } from "@/api/products";
import { stocksApiService } from "@/api/stocks";
import { getAllFitosanitariRecords } from "@/services/fitosanitariRegistry";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
import { parseDecimal } from "@/utils/number";
import ProductStockFields from "./ProductStockFields";

/** Categorie prodotto: enum Prisma (FERTILIZER, PESTICIDE, SEED, HARVEST, EQUIPMENT, PACKAGING) */
const PRODUCT_CATEGORIES = [
  { value: "FERTILIZER", label: "Fertilizzante" },
  { value: "PESTICIDE", label: "Fitosanitario" },
  { value: "SEED", label: "Seme" },
  { value: "HARVEST", label: "Raccolto" },
  { value: "EQUIPMENT", label: "Attrezzatura" },
  { value: "PACKAGING", label: "Imballaggio" },
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
    if (!sku.trim()) return "Inserisci lo Codice magazzino (SKU) del prodotto";
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
    const quantity = parseDecimal(stockData.quantity);
    const price = parseDecimal(stockData.price);

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
              unitOfMeasurePrice: stockData.unitOfMeasurePrice || "",
              type: stockData.type,
              ddtCode: stockData.ddtCode.trim() || "",
              invoiceDate: stockData.invoiceDate || "",
              invoiceCode: stockData.invoiceCode.trim() || "",
              invoiceDueDate: stockData.invoiceDueDate || "",
              companySupplierName:
                stockData.companySupplierName.trim() || "",
              vatNumberSupplier:
                stockData.vatNumberSupplier.trim() || "",
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
  const [selectedExistingProductId, setSelectedExistingProductId] =
    useState("");
  /** Per categoria Fitosanitario: origine prodotto = registro ministeriale o magazzino azienda */
  const [productSource, setProductSource] = useState<
    null | "registry" | "warehouse"
  >(null);
  const [stockEntries, setStockEntries] = useState<StockFormData[]>([
    INITIAL_STOCK_DATA,
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { companies, isLoading: isLoadingCompanies } = useCompanies();
  const companyName = useMemo(
    () => companies.find((c) => c.id === companyId)?.name,
    [companies, companyId],
  );
  const { products: allProducts, isLoading: isLoadingProducts } =
    useProducts(companyName);
  const companyProducts = useMemo(() => {
    if (!companyId) return [];
    return allProducts.filter((p) => p.warehouse?.company?.id === companyId);
  }, [allProducts, companyId]);

  const isPhytosanitary = category === "PESTICIDE";

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

  /** Options for MultiSearchableSelect (registro): groupLabel + description for UI */
  const fitosanitariOptionsForMulti = useMemo(() => {
    return fitosanitariProducts.map((p, index) => {
      const sostanzeAttive = (p.activeIngredients ?? "")
        .replace(/\|/g, " ")
        .trim();
      const descPart = sostanzeAttive || p.registrationNumber || "";
      return {
        value: String(index),
        label: p.administrativeStatus
          ? `${p.productName} (${p.administrativeStatus})`
          : p.productName,
        groupLabel: "REGISTRO MINISTERIALE",
        description: descPart
          ? `Registro ministeriale • ${descPart}`
          : "Registro ministeriale",
        searchAliases: [p.registrationNumber ?? "", sostanzeAttive].filter(
          Boolean,
        ),
      };
    });
  }, [fitosanitariProducts]);

  const getFitosanitarioRecordByIndex = useCallback(
    (indexStr: string): FitosanitariDatasetRecord | null => {
      const index = parseInt(indexStr, 10);
      if (
        Number.isNaN(index) ||
        index < 0 ||
        index >= fitosanitariProducts.length
      )
        return null;
      return fitosanitariProducts[index] ?? null;
    },
    [fitosanitariProducts],
  );

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    setSelectedFitosanitarioId("");
    setProductSource(null);
    if (value !== "PESTICIDE") {
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

  /** MultiSearchableSelect: single selection (take last selected), then sync name/sku */
  const handleFitosanitarioMultiChange = useCallback(
    (next: string[]) => {
      const id = next.length ? next[next.length - 1] : "";
      setSelectedFitosanitarioId(id);
      const record = getFitosanitarioRecordByIndex(id);
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
  const isAddStockMode =
    !!selectedExistingProductId && !!selectedExistingProduct;

  const useRegistrySource = isPhytosanitary && productSource === "registry";
  const useWarehouseSource = !isPhytosanitary || productSource === "warehouse";

  const hasAtLeastOneValidStock = useMemo(() => {
    return stockEntries.some(
      (s) =>
        parseDecimal(s.quantity) > 0 && !!s.unitOfMeasureQuantity?.trim(),
    );
  }, [stockEntries]);

  const canSubmit = isAddStockMode
    ? !!companyId && hasAtLeastOneValidStock
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

  const {
    warehouses,
    isLoading: isLoadingWarehouses,
    refetch: refetchWarehouses,
    createWarehouse,
    isCreating: isCreatingWarehouse,
  } = useCompanyWarehouses(companyId || undefined);

  /** Form state for "Crea magazzino" when no warehouses exist */
  const [newWarehouseForm, setNewWarehouseForm] = useState({
    name: "",
    nation: "Italia",
    region: "",
    city: "",
    address: "",
    cap: "",
    sezione: "",
    foglio: "",
    particella: "",
    subalterno: "",
  });

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

  const handleCreateWarehouse = useCallback(async () => {
    if (!companyId) return;
    const { name, nation, region, city, address, cap, sezione, foglio, particella, subalterno } = newWarehouseForm;
    if (!name.trim() || !nation.trim() || !region.trim() || !city.trim() || !address.trim() || !cap.trim()) {
      toast.error("Compila tutti i campi obbligatori del magazzino");
      return;
    }
    try {
      await createWarehouse({
        name: name.trim(),
        nation: nation.trim(),
        region: region.trim(),
        city: city.trim(),
        address: address.trim(),
        cap: cap.trim(),
        sezione: sezione.trim() || "",
        foglio: foglio.trim() || "",
        particella: particella.trim() || "",
        subalterno: subalterno.trim() || "",
      });
      const list = await refetchWarehouses();
      if (list.length > 0) setWarehouseId(list[0].id);
      setNewWarehouseForm({ name: "", nation: "Italia", region: "", city: "", address: "", cap: "", sezione: "", foglio: "", particella: "", subalterno: "" });
    } catch {
      // toast already from hook
    }
  }, [companyId, newWarehouseForm, createWarehouse, refetchWarehouses]);

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
    (index: number, field: keyof StockFormData, value: string) => {
      setStockEntries((prev) =>
        prev.map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry,
        ),
      );
    },
    [],
  );

  const handleAddStockEntry = useCallback(() => {
    setStockEntries((prev) => [...prev, { ...INITIAL_STOCK_DATA }]);
  }, []);

  const handleRemoveStockEntry = useCallback((index: number) => {
    setStockEntries((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isAddStockMode && selectedExistingProduct) {
      const validEntries = stockEntries.filter(
        (s) =>
          parseDecimal(s.quantity) > 0 && !!s.unitOfMeasureQuantity?.trim(),
      );
      if (validEntries.length === 0) {
        toast.error(
          "Inserisci almeno un movimento con quantità e unità di misura",
        );
        return;
      }
      setIsSubmitting(true);
      try {
        const companyIdForStock = selectedExistingProduct.warehouse.company.id;
        const productIdForStock = selectedExistingProduct.id;
        for (const s of validEntries) {
          const quantity = parseDecimal(s.quantity);
          await stocksApiService.create({
            companyId: companyIdForStock,
            productId: productIdForStock,
            quantity,
            unitOfMeasureQuantity: s.unitOfMeasureQuantity,
            price: parseDecimal(s.price) || undefined,
            unitOfMeasurePrice: s.unitOfMeasurePrice || "",
            type: s.type,
            ddtCode: s.ddtCode.trim() || "",
            invoiceCode: s.invoiceCode.trim() || "",
            invoiceDate: s.invoiceDate || "",
            invoiceDueDate: s.invoiceDueDate || "",
            companySupplierName: s.companySupplierName.trim() || "",
            vatNumberSupplier: s.vatNumberSupplier.trim() || "",
          });
        }
        toast.success(
          validEntries.length === 1
            ? "Stock aggiunto con successo!"
            : `${validEntries.length} movimenti di stock aggiunti con successo!`,
        );
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
      const firstStock = stockEntries[0];
      const payload = ManualProductFormValidator.buildPayload(
        companyId,
        warehouseId,
        name,
        sku,
        category,
        type,
        firstStock,
      );
      const response = await productsApiService.create(payload);
      const createdProductId = response?.data?.product?.id;
      if (createdProductId && stockEntries.length > 1) {
        const companyIdForStock = companyId;
        const extraEntries = stockEntries.slice(1).filter(
          (s) =>
            parseDecimal(s.quantity) > 0 && !!s.unitOfMeasureQuantity?.trim(),
        );
        for (const s of extraEntries) {
          const quantity = parseDecimal(s.quantity);
          await stocksApiService.create({
            companyId: companyIdForStock,
            productId: createdProductId,
            quantity,
            unitOfMeasureQuantity: s.unitOfMeasureQuantity,
            price: parseDecimal(s.price) || undefined,
            unitOfMeasurePrice: s.unitOfMeasurePrice || "",
            type: s.type,
            ddtCode: s.ddtCode.trim() || "",
            invoiceCode: s.invoiceCode.trim() || "",
            invoiceDate: s.invoiceDate || "",
            invoiceDueDate: s.invoiceDueDate || "",
            companySupplierName: s.companySupplierName.trim() || "",
            vatNumberSupplier: s.vatNumberSupplier.trim() || "",
          });
        }
      }
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
    stockEntries,
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
            <h4 className="text-base font-semibold border-b pb-2">Azienda</h4>
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
            <h4 className="text-base font-semibold border-b pb-2">Categoria</h4>
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
                Scegli una sola opzione: prodotto dal registro ministeriale
                oppure prodotto dal magazzino azienda.
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
                  variant={
                    productSource === "warehouse" ? "default" : "outline"
                  }
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
                {isLoadingFitosanitari ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 border border-dashed rounded-md p-3">
                    <Spinner className="h-4 w-4" />
                    Caricamento registro fitosanitari...
                  </div>
                ) : (
                  <MultiSearchableSelect
                    value={
                      selectedFitosanitarioId ? [selectedFitosanitarioId] : []
                    }
                    options={fitosanitariOptionsForMulti}
                    placeholder="Cerca per nome, sostanza attiva o n. registrazione..."
                    searchPlaceholder="Nome, sostanza attiva o n. registrazione"
                    emptyMessage="Nessun prodotto trovato"
                    onChange={handleFitosanitarioMultiChange}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Cerca per nome, sostanza attiva o numero di registrazione. La
                  selezione è visibile con segno di spunta e badge sotto.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Magazzino *</Label>
                  {isLoadingWarehouses ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 border border-dashed rounded-md p-3">
                      <Spinner className="h-4 w-4" />
                      Caricamento magazzini...
                    </div>
                  ) : warehouses.length === 0 ? (
                    <div className="space-y-3 rounded-lg border border-dashed border-muted-foreground/30 p-4 bg-muted/20">
                      <p className="text-sm font-medium text-muted-foreground">
                        Nessun magazzino presente. Crea il primo magazzino.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          placeholder="Nome magazzino *"
                          value={newWarehouseForm.name}
                          onChange={(e) =>
                            setNewWarehouseForm((p) => ({ ...p, name: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="Nazione *"
                          value={newWarehouseForm.nation}
                          onChange={(e) =>
                            setNewWarehouseForm((p) => ({ ...p, nation: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="Regione *"
                          value={newWarehouseForm.region}
                          onChange={(e) =>
                            setNewWarehouseForm((p) => ({ ...p, region: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="Città *"
                          value={newWarehouseForm.city}
                          onChange={(e) =>
                            setNewWarehouseForm((p) => ({ ...p, city: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="Indirizzo *"
                          value={newWarehouseForm.address}
                          onChange={(e) =>
                            setNewWarehouseForm((p) => ({ ...p, address: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="CAP *"
                          value={newWarehouseForm.cap}
                          onChange={(e) =>
                            setNewWarehouseForm((p) => ({ ...p, cap: e.target.value }))
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateWarehouse}
                        disabled={isCreatingWarehouse}
                        className="bg-agri-green-600 hover:bg-agri-green-700"
                      >
                        {isCreatingWarehouse ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          "Crea magazzino"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <SearchableSelect
                      value={warehouseId}
                      options={warehouseOptions}
                      placeholder="Seleziona magazzino"
                      searchPlaceholder="Cerca magazzino..."
                      emptyMessage="Nessun magazzino trovato"
                      onChange={setWarehouseId}
                    />
                  )}
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
                    placeholder="Cerca per nome, Codice magazzino (SKU) o sostanza attiva..."
                    searchPlaceholder="Nome, Codice magazzino (SKU) o sostanza attiva"
                    emptyMessage="Nessun prodotto trovato"
                    loading={isLoadingProducts}
                    loadingMessage="Caricamento prodotti..."
                    noneOptionLabel="Nuovo prodotto"
                    onChange={handleExistingProductSelect}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se il prodotto esiste già, selezionalo per aggiungere stock
                    (cerca per nome, Codice magazzino (SKU) o sostanza attiva).
                    Altrimenti scegli &quot;Nuovo prodotto&quot;.
                  </p>
                </div>

                {!isAddStockMode && (
                  <div className="space-y-2">
                    <Label>Seleziona magazzino *</Label>
                    {isLoadingWarehouses ? (
                      <div className="text-sm text-muted-foreground flex items-center gap-2 border border-dashed rounded-md p-3">
                        <Spinner className="h-4 w-4" />
                        Caricamento magazzini...
                      </div>
                    ) : warehouses.length === 0 ? (
                      <div className="space-y-3 rounded-lg border border-dashed border-muted-foreground/30 p-4 bg-muted/20">
                        <p className="text-sm font-medium text-muted-foreground">
                          Nessun magazzino presente. Crea il primo magazzino.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            placeholder="Nome magazzino *"
                            value={newWarehouseForm.name}
                            onChange={(e) =>
                              setNewWarehouseForm((p) => ({ ...p, name: e.target.value }))
                            }
                          />
                          <Input
                            placeholder="Nazione *"
                            value={newWarehouseForm.nation}
                            onChange={(e) =>
                              setNewWarehouseForm((p) => ({ ...p, nation: e.target.value }))
                            }
                          />
                          <Input
                            placeholder="Regione *"
                            value={newWarehouseForm.region}
                            onChange={(e) =>
                              setNewWarehouseForm((p) => ({ ...p, region: e.target.value }))
                            }
                          />
                          <Input
                            placeholder="Città *"
                            value={newWarehouseForm.city}
                            onChange={(e) =>
                              setNewWarehouseForm((p) => ({ ...p, city: e.target.value }))
                            }
                          />
                          <Input
                            placeholder="Indirizzo *"
                            value={newWarehouseForm.address}
                            onChange={(e) =>
                              setNewWarehouseForm((p) => ({ ...p, address: e.target.value }))
                            }
                          />
                          <Input
                            placeholder="CAP *"
                            value={newWarehouseForm.cap}
                            onChange={(e) =>
                              setNewWarehouseForm((p) => ({ ...p, cap: e.target.value }))
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateWarehouse}
                          disabled={isCreatingWarehouse}
                          className="bg-agri-green-600 hover:bg-agri-green-700"
                        >
                          {isCreatingWarehouse ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            "Crea magazzino"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <SearchableSelect
                        value={warehouseId}
                        options={warehouseOptions}
                        placeholder="Seleziona magazzino"
                        searchPlaceholder="Cerca magazzino..."
                        emptyMessage="Nessun magazzino trovato"
                        onChange={setWarehouseId}
                      />
                    )}
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
                  <Label>Codice magazzino (SKU)</Label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Es. SKU-001 o n. registrazione"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Stock (più movimenti) */}
          <section className="space-y-4">
            <div>
              <h4 className="text-base font-semibold border-b pb-2">
                Movimento di stock {isAddStockMode ? "" : "(opzionale)"}
              </h4>
              <p className="text-sm text-muted-foreground mt-2">
                {isAddStockMode
                  ? "Aggiungi uno o più movimenti di stock al prodotto."
                  : "Puoi registrare uno o più carichi/scarichi iniziali."}
              </p>
            </div>
            {stockEntries.map((entry, index) => (
              <div
                key={index}
                className="relative rounded-lg border border-neutral-200 bg-white/80 p-4 space-y-4"
              >
                {stockEntries.length > 1 && (
                  <div className="absolute top-3 right-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveStockEntry(index)}
                      title="Rimuovi movimento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <ProductStockFields
                  stockData={entry}
                  onStockChange={(field, value) =>
                    handleStockChange(index, field, value)
                  }
                  required={isAddStockMode && stockEntries.length === 1}
                  showTitle={false}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddStockEntry}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Aggiungi altro movimento
            </Button>
          </section>
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
              {isAddStockMode
                ? "Aggiunta in corso..."
                : "Creazione in corso..."}
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
