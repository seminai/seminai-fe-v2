import { useCallback, useMemo, useState } from "react";
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
import { productsApiService, type CreateProductPayload } from "@/api/products";
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
  companySupplierName: "",
  vatNumberSupplier: "",
};

export default function ManualProductForm({
  onProductCreated,
  preselectedCompanyId,
}: ManualProductFormProps) {
  const [companyId, setCompanyId] = useState(preselectedCompanyId || "");
  const [warehouseId, setWarehouseId] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [stockData, setStockData] = useState<StockFormData>(INITIAL_STOCK_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { companies, isLoading: isLoadingCompanies } = useCompanies();
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

  const handleCompanyChange = useCallback((value: string) => {
    setCompanyId(value);
    setWarehouseId("");
  }, []);

  const handleStockChange = useCallback(
    (field: keyof StockFormData, value: string) => {
      setStockData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
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
    companyId,
    warehouseId,
    name,
    sku,
    category,
    type,
    stockData,
    onProductCreated,
  ]);

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

          {/* Azienda e Magazzino */}
          <section className="space-y-4">
            <h4 className="text-base font-semibold border-b pb-2">
              {preselectedCompanyId ? "Magazzino" : "Azienda e Magazzino"}
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

              <div className="space-y-2">
                <Label>Seleziona magazzino *</Label>
                {companyId ? (
                  <SearchableSelect
                    value={warehouseId}
                    options={warehouseOptions}
                    placeholder="Seleziona magazzino"
                    searchPlaceholder="Cerca magazzino..."
                    emptyMessage="Nessun magazzino trovato"
                    loading={isLoadingWarehouses}
                    loadingMessage="Caricamento magazzini..."
                    disabled={!companyId}
                    onChange={setWarehouseId}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3 text-sm text-muted-foreground">
                    Seleziona prima un&apos;azienda per visualizzare i
                    magazzini.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Dati prodotto */}
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
                  placeholder="Es. SKU-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
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
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Es. Generico"
                />
              </div>
            </div>
          </section>

          {/* Stock */}
          <ProductStockFields
            stockData={stockData}
            onStockChange={handleStockChange}
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
              <Spinner size={18} /> Creazione in corso...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Crea prodotto
            </>
          )}
        </Button>
      </div>
    </>
  );
}
