import { useEffect, useMemo, useState } from "react";
import { Product, StockEntry, productsApiService } from "@/api/products";
import { stocksApiService } from "@/api/stocks";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  Package,
  Warehouse,
  TrendingDown,
  TrendingUp,
  Pencil,
  Info,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AddStock from "./AddStock";
import { useProductDetail } from "@/hooks/useProductDetail";
import { Spinner } from "@/components/ui/spinner";

interface DrawerProductProps {
  productId: string | null;
  previewProduct: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

class StockFormatter {
  private constructor() {}

  public static formatQuantity(quantity: number): string {
    if (!Number.isFinite(quantity)) {
      return "0.0";
    }
    const roundedQuantity = Math.round(quantity * 10) / 10;
    return roundedQuantity.toFixed(1);
  }
}

class DateFormatter {
  private readonly locale: string;

  constructor(locale: string = "it-IT") {
    this.locale = locale;
  }

  public format(dateInput?: string | null): string | null {
    if (!dateInput) {
      return null;
    }
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat(this.locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  public static toInputValue(dateInput?: string | null): string {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

class JobDetailsPresenter {
  private readonly job: StockEntry["job"] | null;
  private readonly dateFormatter = new DateFormatter();

  constructor(job: StockEntry["job"] | null) {
    this.job = job;
  }

  public hasJob(): boolean {
    return Boolean(this.job);
  }

  public getOperationName(): string {
    if (!this.job) {
      return "Movimento manuale";
    }
    if (this.job.note) {
      return this.job.note.length > 90
        ? `${this.job.note.slice(0, 87)}...`
        : this.job.note;
    }
    if (this.job.category) {
      return this.formatCategory(this.job.category);
    }
    return "Operazione collegata";
  }

  public getOperationDate(): string | null {
    const date = this.job?.dateOfOpeation ?? this.job?.dateOfOperation ?? null;
    return this.dateFormatter.format(date);
  }

  public getDetails(): Array<{ label: string; value: string }> {
    if (!this.job) {
      return [];
    }
    const details: Array<{ label: string; value: string }> = [];
    const date = this.getOperationDate();
    if (date) {
      details.push({ label: "Data operazione", value: date });
    }
    if (this.job.category) {
      details.push({
        label: "Categoria",
        value: this.formatCategory(this.job.category),
      });
    }
    if (
      typeof this.job.quantity === "number" &&
      this.job.unitOfMeasureQuantity
    ) {
      details.push({
        label: "Prodotto distribuito",
        value: `${StockFormatter.formatQuantity(Math.abs(this.job.quantity))} ${
          this.job.unitOfMeasureQuantity
        }`,
      });
    }
    if (
      typeof this.job.productQuantityTreated === "number" &&
      this.job.unitOfMeasureProductQuantityTreated
    ) {
      details.push({
        label: "Dose trattata",
        value: `${StockFormatter.formatQuantity(
          this.job.productQuantityTreated,
        )} ${this.job.unitOfMeasureProductQuantityTreated}`,
      });
    }
    if (typeof this.job.treatedSurface === "number") {
      details.push({
        label: "Superficie trattata",
        value: `${StockFormatter.formatQuantity(this.job.treatedSurface)} ha`,
      });
    }
    const productionUnitName = this.job.productionUnit?.name;
    if (productionUnitName) {
      details.push({ label: "Unità produttiva", value: productionUnitName });
    }
    const fields = this.getFieldsList();
    if (fields) {
      details.push({ label: "Appezzamenti", value: fields });
    }
    if (this.job.note) {
      details.push({ label: "Note", value: this.job.note });
    }
    return details;
  }

  private getFieldsList(): string | null {
    if (!this.job?.productionUnit?.productionUnitsOnFields) {
      return null;
    }
    const names = this.job.productionUnit.productionUnitsOnFields
      .map((item) => item.field?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length === 0) {
      return null;
    }
    return names.join(", ");
  }

  private formatCategory(category: string): string {
    return category
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

class StockUnitAnalyzer {
  private readonly stocks: StockEntry[];

  constructor(stocks: StockEntry[]) {
    this.stocks = stocks;
  }

  public getPreferredUnit(): string {
    if (this.stocks.length === 0) {
      return "unità";
    }
    const counters = new Map<string, number>();
    this.stocks.forEach((stock) => {
      const unit = stock.unitOfMeasureQuantity || "unità";
      counters.set(unit, (counters.get(unit) ?? 0) + 1);
    });
    let preferred = "unità";
    let max = 0;
    counters.forEach((value, unit) => {
      if (value > max) {
        preferred = unit;
        max = value;
      }
    });
    return preferred;
  }

  public hasMixedUnits(): boolean {
    return this.getDistinctUnits().length > 1;
  }

  public getSecondaryUnits(preferredUnit: string): string[] {
    return this.getDistinctUnits().filter((unit) => unit !== preferredUnit);
  }

  private getDistinctUnits(): string[] {
    const set = new Set<string>();
    this.stocks.forEach((stock) => {
      set.add(stock.unitOfMeasureQuantity || "unità");
    });
    return Array.from(set);
  }
}

class StockDataProcessor {
  private readonly stocks: StockEntry[];

  constructor(stocks: StockEntry[]) {
    this.stocks = stocks;
  }

  private normalizeQuantity(quantity: number): number {
    if (!Number.isFinite(quantity)) {
      return 0;
    }
    return Math.abs(quantity);
  }

  private roundQuantity(quantity: number): number {
    if (!Number.isFinite(quantity)) {
      return 0;
    }
    return Math.round(quantity * 10) / 10;
  }

  private getMovementDelta(stock: StockEntry): number {
    const normalizedQuantity = this.normalizeQuantity(stock.quantity);
    return stock.type === "IN" ? normalizedQuantity : -normalizedQuantity;
  }

  private getTimestamp(stock: StockEntry): number {
    const dateReference =
      stock.createdAt ??
      stock.job?.dateOfOpeation ??
      stock.job?.dateOfOperation ??
      null;
    if (!dateReference) {
      return 0;
    }
    const timestamp = new Date(dateReference).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private formatMovementLabel(stock: StockEntry, index: number): string {
    const formatter = new DateFormatter();
    const formatted =
      formatter.format(
        stock.createdAt ??
          stock.job?.dateOfOpeation ??
          stock.job?.dateOfOperation ??
          null,
      ) ?? null;
    return formatted ?? `Mov. ${index + 1}`;
  }

  private getOrderedStocks(preferredUnit?: string): StockEntry[] {
    return [...this.stocks]
      .filter((stock) => {
        if (!preferredUnit) {
          return true;
        }
        if (!stock.unitOfMeasureQuantity) {
          return true;
        }
        return stock.unitOfMeasureQuantity === preferredUnit;
      })
      .sort((a, b) => this.getTimestamp(a) - this.getTimestamp(b));
  }

  public processForChart(preferredUnit?: string): Array<{
    index: number;
    stock: number;
    label: string;
    type: "IN" | "OUT";
    timestamp: string | null;
    operationName: string;
  }> {
    const orderedStocks = this.getOrderedStocks(preferredUnit);
    if (orderedStocks.length === 0) {
      return [];
    }
    let runningStock = 0;
    return orderedStocks.map((stock, index) => {
      runningStock += this.getMovementDelta(stock);
      const presenter = new JobDetailsPresenter(stock.job);
      return {
        index,
        stock: this.roundQuantity(runningStock),
        label: this.formatMovementLabel(stock, index),
        type: stock.type,
        timestamp:
          stock.createdAt ??
          stock.job?.dateOfOpeation ??
          stock.job?.dateOfOperation ??
          null,
        operationName: presenter.getOperationName(),
      };
    });
  }

  public calculateTotalStock(): number {
    return this.stocks.reduce((total, stock) => {
      return total + this.getMovementDelta(stock);
    }, 0);
  }

  public getTotalIn(): number {
    return this.stocks
      .filter((s) => s.type === "IN")
      .reduce((sum, s) => sum + this.normalizeQuantity(s.quantity), 0);
  }

  public getTotalOut(): number {
    return this.stocks
      .filter((s) => s.type === "OUT")
      .reduce((sum, s) => sum + this.normalizeQuantity(s.quantity), 0);
  }

  public getStocksByType(type: "IN" | "OUT"): StockEntry[] {
    return this.stocks.filter((s) => s.type === type);
  }
}

class ProductFormValidator {
  public static validateName(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return "Il nome è obbligatorio";
    }
    return null;
  }

  public static validateForm(data: {
    name: string;
    description?: string;
    barcode?: string;
  }): string | null {
    return this.validateName(data.name);
  }
}

const chartConfig: ChartConfig = {
  stock: {
    label: "Stock Totale",
    color: "hsl(220, 70%, 50%)",
  },
};

function DrawerProduct({
  productId,
  previewProduct,
  open,
  onOpenChange,
}: DrawerProductProps) {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [detailView, setDetailView] = useState<"movements" | "chart">(
    "movements",
  );
  const [editingStock, setEditingStock] = useState<StockEntry | null>(null);
  const [stockEditForm, setStockEditForm] = useState<{
    quantity: string;
    unitOfMeasureQuantity: string;
    type: "IN" | "OUT";
    ddtDate: string;
    ddtCode: string;
    invoiceCode: string;
    invoiceDueDate: string;
    price: string;
    unitOfMeasurePrice: string;
    date: string;
  }>({
    quantity: "",
    unitOfMeasureQuantity: "",
    type: "IN",
    ddtDate: "",
    ddtCode: "",
    invoiceCode: "",
    invoiceDueDate: "",
    price: "",
    unitOfMeasurePrice: "EUR",
    date: "",
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const {
    product: detailedProduct,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useProductDetail(productId, open);

  const product = detailedProduct ?? previewProduct;

  // Edit product form
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productBarcode, setProductBarcode] = useState("");

  useEffect(() => {
    setDetailView("movements");
  }, [productId]);

  const unitAnalyzer = useMemo(
    () => new StockUnitAnalyzer(product?.stocks ?? []),
    [product],
  );
  const preferredUnit = unitAnalyzer.getPreferredUnit();
  const hasMixedUnits = unitAnalyzer.hasMixedUnits();
  const secondaryUnits = unitAnalyzer.getSecondaryUnits(preferredUnit);

  const processor = useMemo(
    () => (product ? new StockDataProcessor(product.stocks) : null),
    [product],
  );

  const chartData = useMemo(
    () => (processor ? processor.processForChart(preferredUnit) : []),
    [processor, preferredUnit],
  );
  const dateFormatter = useMemo(() => new DateFormatter(), []);

  const handleOpenEditDialog = () => {
    if (!product) {
      return;
    }
    setProductName(product.name);
    setProductDescription(product.description || "");
    setProductBarcode(product.barcode || "");
    setEditDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!product) return;

    const validationError = ProductFormValidator.validateForm({
      name: productName,
      description: productDescription,
      barcode: productBarcode,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUpdating(true);
    try {
      await productsApiService.update(product.id, {
        name: productName,
        description: productDescription || undefined,
        barcode: productBarcode || undefined,
      });

      toast.success("Prodotto aggiornato con successo");
      setEditDialogOpen(false);

      // Invalida la cache per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: ["products", "me"] });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento del prodotto";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStockCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["products", "me"] });
  };

  const openStockEdit = (stock: StockEntry) => {
    setEditingStock(stock);
    setStockEditForm({
      quantity: stock.quantity != null ? String(stock.quantity) : "",
      unitOfMeasureQuantity: stock.unitOfMeasureQuantity ?? "",
      type: stock.type ?? "IN",
      ddtDate: DateFormatter.toInputValue(stock.ddtDate ?? null),
      ddtCode: stock.ddtCode ?? "",
      invoiceCode: stock.invoiceCode ?? "",
      invoiceDueDate: DateFormatter.toInputValue(stock.invoiceDueDate ?? null),
      price: stock.price != null ? String(stock.price) : "",
      unitOfMeasurePrice: stock.unitOfMeasurePrice ?? "EUR",
      date: DateFormatter.toInputValue(stock.createdAt ?? null),
    });
  };

  const closeStockEdit = () => {
    setEditingStock(null);
    setIsUpdatingStock(false);
  };

  const toIsoDate = (yyyyMmDd: string): string | null => {
    if (!yyyyMmDd || yyyyMmDd.length < 10) return null;
    return `${yyyyMmDd}T12:00:00.000Z`;
  };

  const handleSaveStockEdit = async () => {
    if (!editingStock || !product) return;
    const companyId = product.warehouse?.company?.id;
    if (!companyId) {
      toast.error("Impossibile determinare l'azienda");
      return;
    }
    setIsUpdatingStock(true);
    try {
      const priceValue = Number.parseFloat(stockEditForm.price);
      const quantityValue = Number.parseFloat(stockEditForm.quantity);
      await stocksApiService.update(editingStock.id, {
        companyId,
        quantity: Number.isFinite(quantityValue) ? quantityValue : undefined,
        unitOfMeasureQuantity:
          stockEditForm.unitOfMeasureQuantity?.trim() || undefined,
        type: stockEditForm.type,
        ddtCode: stockEditForm.ddtCode?.trim() || null,
        ddtDate: toIsoDate(stockEditForm.ddtDate) ?? null,
        invoiceCode: stockEditForm.invoiceCode?.trim() || null,
        invoiceDate: toIsoDate(stockEditForm.date) ?? null,
        invoiceDueDate: toIsoDate(stockEditForm.invoiceDueDate) ?? null,
        price: Number.isFinite(priceValue) ? priceValue : undefined,
        unitOfMeasurePrice:
          stockEditForm.unitOfMeasurePrice?.trim() || undefined,
      });
      toast.success("Movimento aggiornato");
      queryClient.invalidateQueries({ queryKey: ["products", "me"] });
      queryClient.invalidateQueries({
        queryKey: ["products", "detail", productId ?? ""],
      });
      closeStockEdit();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore nell'aggiornamento",
      );
    } finally {
      setIsUpdatingStock(false);
    }
  };

  if (!product || !processor) {
    return null;
  }

  const totalStock = processor.calculateTotalStock();
  const totalIn = processor.getTotalIn();
  const totalOut = processor.getTotalOut();
  const unit = preferredUnit;
  const formattedTotalStock = StockFormatter.formatQuantity(totalStock);
  const formattedTotalIn = StockFormatter.formatQuantity(totalIn);
  const formattedTotalOut = StockFormatter.formatQuantity(totalOut);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-screen max-w-full sm:w-full sm:max-w-[50vw] overflow-y-auto bg-white p-2">
          {isDetailLoading && (
            <div className="flex items-center gap-3 border border-blue-100 bg-blue-50 rounded-lg px-4 py-2 mb-4">
              <Spinner size={24} />
              <span className="text-sm text-blue-700">
                Caricamento dettagli prodotto...
              </span>
            </div>
          )}

          {isDetailError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Errore caricamento</AlertTitle>
              <AlertDescription>
                {detailError instanceof Error
                  ? detailError.message
                  : "Impossibile recuperare i dettagli del prodotto"}
              </AlertDescription>
            </Alert>
          )}

          <SheetHeader>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-2xl">{product.name}</SheetTitle>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenEditDialog}
                  className="shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <SheetDescription className="mb-0">
                  Codice magazzino (SKU): {product.sku}
                </SheetDescription>
                <Badge
                  variant={
                    totalStock > 50
                      ? "default"
                      : totalStock > 0
                        ? "secondary"
                        : "destructive"
                  }
                >
                  Stock: {formattedTotalStock} {unit}
                </Badge>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Informazioni del prodotto */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Informazioni</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Warehouse className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Magazzino:</span>
                  <span className="text-gray-600">
                    {product.warehouse.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Azienda:</span>
                  <span className="text-gray-600">
                    {product.warehouse.company.name}
                  </span>
                </div>
                {product.description && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-medium">Descrizione:</span>
                    <span className="text-gray-600">{product.description}</span>
                  </div>
                )}
                {product.barcode && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Barcode:</span>
                    <span className="text-gray-600 font-mono">
                      {product.barcode}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Riepilogo movimenti con pulsante aggiungi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Riepilogo Movimenti</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Carichi</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {formattedTotalIn}
                    <span className="text-sm font-normal ml-1">{unit}</span>
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 mb-1">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs font-medium">Scarichi</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">
                    {formattedTotalOut}
                    <span className="text-sm font-normal ml-1">{unit}</span>
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-xs font-medium">Disponibile</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {formattedTotalStock}
                    <span className="text-sm font-normal ml-1">{unit}</span>
                  </p>
                </div>
              </div>
              {hasMixedUnits && (
                <p className="text-xs text-amber-700">
                  Totali e grafico sono calcolati in {unit}. Controlla i
                  movimenti per le altre unità disponibili.
                </p>
              )}
            </div>

            <Separator />

            <Tabs
              value={detailView}
              onValueChange={(value) =>
                setDetailView(
                  value === "chart" ? "chart" : ("movements" as const),
                )
              }
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Movimenti e Vista Grafica
                </h3>
                <TabsList className="grid grid-cols-2 w-48">
                  <TabsTrigger value="movements">Movimenti</TabsTrigger>
                  <TabsTrigger value="chart">Grafico</TabsTrigger>
                </TabsList>
              </div>
              {hasMixedUnits && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-900">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Unità differenti rilevate</AlertTitle>
                  <AlertDescription>
                    Il grafico considera solo i movimenti in {unit}.
                    {secondaryUnits.length > 0
                      ? ` Altre unità presenti: ${secondaryUnits.join(", ")}.`
                      : null}
                  </AlertDescription>
                </Alert>
              )}
              <TabsContent value="movements" className="space-y-3 mt-0">
                <AddStock
                  product={product}
                  onStockCreated={handleStockCreated}
                />
                {product.stocks.length > 0 ? (
                  <div className="space-y-3">
                    {product.stocks.map((stock) => {
                      const isEditing = editingStock?.id === stock.id;
                      const presenter = new JobDetailsPresenter(stock.job);
                      const operationDetails = presenter.getDetails();
                      const recordedDate = dateFormatter.format(
                        stock.createdAt ?? null,
                      );
                      const operationDate = presenter.getOperationDate();
                      return (
                        <Card
                          key={stock.id}
                          className="border border-gray-200 shadow-none "
                        >
                          <CardContent className="p-4 space-y-3">
                            {isEditing ? (
                              <>
                                <h4 className="text-sm font-semibold">
                                  Modifica dati movimento
                                </h4>
                                <div className="grid gap-3">
                                  <div className="grid gap-1.5">
                                    <Label
                                      htmlFor={`edit-type-${stock.id}`}
                                      className="text-xs"
                                    >
                                      Tipologia movimento
                                    </Label>
                                    <Select
                                      value={stockEditForm.type}
                                      onValueChange={(value: "IN" | "OUT") =>
                                        setStockEditForm((prev) => ({
                                          ...prev,
                                          type: value,
                                        }))
                                      }
                                    >
                                      <SelectTrigger
                                        id={`edit-type-${stock.id}`}
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="IN">
                                          Carico (IN)
                                        </SelectItem>
                                        <SelectItem value="OUT">
                                          Scarico (OUT)
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-1.5">
                                      <Label
                                        htmlFor={`edit-quantity-${stock.id}`}
                                        className="text-xs"
                                      >
                                        Quantità
                                      </Label>
                                      <Input
                                        id={`edit-quantity-${stock.id}`}
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={stockEditForm.quantity}
                                        onChange={(e) =>
                                          setStockEditForm((prev) => ({
                                            ...prev,
                                            quantity: e.target.value,
                                          }))
                                        }
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="grid gap-1.5">
                                      <Label
                                        htmlFor={`edit-uom-${stock.id}`}
                                        className="text-xs"
                                      >
                                        Unità di misura
                                      </Label>
                                      <Input
                                        id={`edit-uom-${stock.id}`}
                                        value={
                                          stockEditForm.unitOfMeasureQuantity
                                        }
                                        onChange={(e) =>
                                          setStockEditForm((prev) => ({
                                            ...prev,
                                            unitOfMeasureQuantity:
                                              e.target.value,
                                          }))
                                        }
                                        placeholder="es. kg, L"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label
                                      htmlFor={`edit-ddt-date-${stock.id}`}
                                      className="text-xs"
                                    >
                                      Data DDT
                                    </Label>
                                    <Input
                                      id={`edit-ddt-date-${stock.id}`}
                                      type="date"
                                      value={stockEditForm.ddtDate}
                                      onChange={(e) =>
                                        setStockEditForm((prev) => ({
                                          ...prev,
                                          ddtDate: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label
                                      htmlFor={`edit-ddt-code-${stock.id}`}
                                      className="text-xs"
                                    >
                                      Codice DDT
                                    </Label>
                                    <Input
                                      id={`edit-ddt-code-${stock.id}`}
                                      value={stockEditForm.ddtCode}
                                      onChange={(e) =>
                                        setStockEditForm((prev) => ({
                                          ...prev,
                                          ddtCode: e.target.value,
                                        }))
                                      }
                                      placeholder="Codice DDT"
                                    />
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label
                                      htmlFor={`edit-invoice-code-${stock.id}`}
                                      className="text-xs"
                                    >
                                      Codice fatture
                                    </Label>
                                    <Input
                                      id={`edit-invoice-code-${stock.id}`}
                                      value={stockEditForm.invoiceCode}
                                      onChange={(e) =>
                                        setStockEditForm((prev) => ({
                                          ...prev,
                                          invoiceCode: e.target.value,
                                        }))
                                      }
                                      placeholder="Codice fattura"
                                    />
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label
                                      htmlFor={`edit-invoice-due-date-${stock.id}`}
                                      className="text-xs"
                                    >
                                      Scadenza fattura
                                    </Label>
                                    <Input
                                      id={`edit-invoice-due-date-${stock.id}`}
                                      type="date"
                                      value={stockEditForm.invoiceDueDate}
                                      onChange={(e) =>
                                        setStockEditForm((prev) => ({
                                          ...prev,
                                          invoiceDueDate: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-1.5">
                                      <Label
                                        htmlFor={`edit-price-${stock.id}`}
                                        className="text-xs"
                                      >
                                        {stockEditForm.type === "IN"
                                          ? "Prezzo acquisto"
                                          : "Prezzo vendita"}
                                      </Label>
                                      <Input
                                        id={`edit-price-${stock.id}`}
                                        type="number"
                                        step="0.01"
                                        value={stockEditForm.price}
                                        onChange={(e) =>
                                          setStockEditForm((prev) => ({
                                            ...prev,
                                            price: e.target.value,
                                          }))
                                        }
                                        placeholder="0.00"
                                      />
                                    </div>
                                    <div className="grid gap-1.5">
                                      <Label
                                        htmlFor={`edit-price-unit-${stock.id}`}
                                        className="text-xs"
                                      >
                                        Valuta
                                      </Label>
                                      <Input
                                        id={`edit-price-unit-${stock.id}`}
                                        value={stockEditForm.unitOfMeasurePrice}
                                        onChange={(e) =>
                                          setStockEditForm((prev) => ({
                                            ...prev,
                                            unitOfMeasurePrice: e.target.value,
                                          }))
                                        }
                                        placeholder="EUR"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label
                                      htmlFor={`edit-date-${stock.id}`}
                                      className="text-xs"
                                    >
                                      Data
                                    </Label>
                                    <Input
                                      id={`edit-date-${stock.id}`}
                                      type="date"
                                      value={stockEditForm.date}
                                      onChange={(e) =>
                                        setStockEditForm((prev) => ({
                                          ...prev,
                                          date: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={closeStockEdit}
                                    disabled={isUpdatingStock}
                                  >
                                    Annulla
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSaveStockEdit}
                                    disabled={isUpdatingStock}
                                  >
                                    {isUpdatingStock
                                      ? "Salvataggio..."
                                      : "Salva"}
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    {stock.type === "IN" ? (
                                      <TrendingUp className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <TrendingDown className="h-5 w-5 text-red-600" />
                                    )}
                                    <div>
                                      <p className="font-medium text-sm">
                                        {stock.type === "IN"
                                          ? "Carico"
                                          : "Scarico"}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {presenter.hasJob()
                                          ? `Operazione: ${presenter.getOperationName()}`
                                          : "Operazione non collegata"}
                                      </p>
                                      {operationDate && (
                                        <p className="text-xs text-muted-foreground">
                                          {operationDate}
                                        </p>
                                      )}
                                      {stock.job?.isVerified && (
                                        <Badge
                                          variant="outline"
                                          className="mt-1 text-xs py-0"
                                        >
                                          Verificato
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={`font-bold ${
                                        stock.type === "IN"
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {stock.type === "IN" ? "+" : "-"}
                                      {StockFormatter.formatQuantity(
                                        Number.isFinite(stock.quantity)
                                          ? Math.abs(stock.quantity)
                                          : 0,
                                      )}{" "}
                                      {stock.unitOfMeasureQuantity}
                                    </p>
                                    {recordedDate && (
                                      <p className="text-xs text-gray-500">
                                        Registrato il {recordedDate}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-1 text-xs">
                                    <span className="text-gray-500">
                                      Data DDT:
                                      <span className="ml-1 text-gray-900">
                                        {dateFormatter.format(
                                          stock.ddtDate ?? null,
                                        ) ?? "—"}
                                      </span>
                                    </span>
                                    <span className="text-gray-500">
                                      Codice DDT:
                                      <span className="ml-1 text-gray-900">
                                        {stock.ddtCode ?? "—"}
                                      </span>
                                    </span>
                                    <span className="text-gray-500">
                                      Codice fattura:
                                      <span className="ml-1 text-gray-900">
                                        {stock.invoiceCode ?? "—"}
                                      </span>
                                    </span>
                                    <span className="text-gray-500">
                                      Scadenza fattura:
                                      <span className="ml-1 text-gray-900">
                                        {dateFormatter.format(
                                          stock.invoiceDueDate ?? null,
                                        ) ?? "—"}
                                      </span>
                                    </span>
                                    <span className="text-gray-500">
                                      {stock.type === "IN"
                                        ? "Prezzo acquisto:"
                                        : "Prezzo vendita:"}
                                      <span className="ml-1 text-gray-900">
                                        {stock.price != null
                                          ? `${stock.price.toFixed(2)} ${stock.unitOfMeasurePrice ?? "EUR"}`
                                          : "—"}
                                      </span>
                                    </span>
                                    <span className="text-gray-500">
                                      Data:
                                      <span className="ml-1 text-gray-900">
                                        {recordedDate ?? "—"}
                                      </span>
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => openStockEdit(stock)}
                                    aria-label="Modifica dati movimento"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                                {presenter.hasJob() &&
                                  operationDetails.length > 0 && (
                                    <Accordion type="single" collapsible>
                                      <AccordionItem
                                        value={`job-${stock.id}`}
                                        className="p-2 rounded-md"
                                      >
                                        <AccordionTrigger className="text-sm">
                                          Dettagli operazione
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <div className="space-y-2 ">
                                            {operationDetails.map((detail) => (
                                              <div
                                                key={`${stock.id}-${detail.label}`}
                                                className="text-xs"
                                              >
                                                <span className="text-gray-500">
                                                  {detail.label}
                                                </span>
                                                <p className="font-medium text-gray-900">
                                                  {detail.value}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Nessun movimento registrato
                  </p>
                )}
              </TabsContent>
              <TabsContent value="chart" className="mt-0">
                {chartData.length > 0 ? (
                  <div className="w-full h-[350px]">
                    <ChartContainer config={chartConfig}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                        >
                          <defs>
                            <linearGradient
                              id="stockGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="hsl(220, 70%, 50%)"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="hsl(220, 70%, 50%)"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            opacity={0.3}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            tickMargin={12}
                            axisLine={true}
                            style={{ fontSize: "11px", fontWeight: 500 }}
                            label={{
                              value: "Movimenti nel Periodo",
                              position: "insideBottom",
                              offset: -10,
                              style: {
                                fontSize: "12px",
                                fontWeight: 600,
                                fill: "#666",
                              },
                            }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={true}
                            style={{ fontSize: "11px", fontWeight: 500 }}
                            tickFormatter={(value) =>
                              StockFormatter.formatQuantity(Number(value))
                            }
                            label={{
                              value: `Stock (${unit})`,
                              angle: -90,
                              position: "insideLeft",
                              style: {
                                fontSize: "12px",
                                fontWeight: 600,
                                fill: "#666",
                              },
                            }}
                            domain={["dataMin - 5", "dataMax + 5"]}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value, _name, props) => {
                                  const numValue = Number(value);
                                  const dataPoint = props.payload as {
                                    label: string;
                                    timestamp?: string | null;
                                    type: "IN" | "OUT";
                                    operationName?: string;
                                  };
                                  const formattedTimestamp = dataPoint.timestamp
                                    ? dateFormatter.format(dataPoint.timestamp)
                                    : null;
                                  return (
                                    <div className="flex flex-col gap-1">
                                      <span className="text-xs text-gray-500">
                                        {formattedTimestamp ?? dataPoint.label}
                                      </span>
                                      <span className="font-bold text-blue-600 text-base">
                                        {StockFormatter.formatQuantity(
                                          numValue,
                                        )}{" "}
                                        {unit}
                                      </span>
                                      {dataPoint.operationName && (
                                        <span className="text-xs text-gray-600">
                                          {dataPoint.operationName}
                                        </span>
                                      )}
                                      {dataPoint.type === "IN" && (
                                        <span className="text-xs text-green-600">
                                          ↑ Carico
                                        </span>
                                      )}
                                      {dataPoint.type === "OUT" && (
                                        <span className="text-xs text-red-600">
                                          ↓ Scarico
                                        </span>
                                      )}
                                    </div>
                                  );
                                }}
                              />
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="stock"
                            stroke="hsl(220, 70%, 50%)"
                            strokeWidth={3}
                            fill="url(#stockGradient)"
                            dot={(props: {
                              cx?: number;
                              cy?: number;
                              payload?: { type: "IN" | "OUT" };
                            }) => {
                              const { cx, cy, payload } = props;
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={5}
                                  fill={
                                    payload?.type === "IN"
                                      ? "hsl(142, 76%, 36%)"
                                      : "hsl(0, 84%, 60%)"
                                  }
                                  stroke="white"
                                  strokeWidth={2}
                                />
                              );
                            }}
                            activeDot={{
                              r: 7,
                              strokeWidth: 2,
                              stroke: "white",
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">
                    {hasMixedUnits
                      ? `Nessun movimento in ${unit} disponibile per il grafico`
                      : "Nessun movimento registrato"}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Drawer per modifica prodotto */}
      <Sheet open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <SheetContent
          side="right"
          className="w-screen max-w-full sm:w-full sm:max-w-[50vw] overflow-y-auto bg-white p-2"
        >
          <SheetHeader>
            <SheetTitle>Modifica Prodotto</SheetTitle>
            <SheetDescription>
              Aggiorna le informazioni del prodotto
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Nome del prodotto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">Descrizione</Label>
              <Textarea
                id="product-description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Descrizione del prodotto"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-barcode">Barcode</Label>
              <Input
                id="product-barcode"
                value={productBarcode}
                onChange={(e) => setProductBarcode(e.target.value)}
                placeholder="Codice a barre"
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isUpdating}
            >
              Annulla
            </Button>
            <Button onClick={handleUpdateProduct} disabled={isUpdating}>
              {isUpdating ? "Salvataggio..." : "Salva"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default DrawerProduct;
