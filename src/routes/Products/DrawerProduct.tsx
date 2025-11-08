import { useMemo, useState } from "react";
import { Product, StockEntry, productsApiService } from "@/api/products";
import { stocksApiService, CreateStockPayload } from "@/api/stocks";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DrawerProductProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

class StockDataProcessor {
  private readonly stocks: StockEntry[];

  constructor(stocks: StockEntry[]) {
    this.stocks = stocks;
  }

  public processForChart(): Array<{
    index: number;
    stock: number;
    label: string;
    type: "IN" | "OUT" | "INITIAL";
  }> {
    // Inverti l'ordine dei movimenti per mostrare cronologicamente dal più vecchio al più recente
    const stocksReversed = [...this.stocks].reverse();

    // Calcola lo stock iniziale (prima di tutti i movimenti)
    const finalStock = this.calculateTotalStock();
    const totalMovements = stocksReversed.reduce((sum, stock) => {
      return stock.type === "IN" ? sum + stock.quantity : sum - stock.quantity;
    }, 0);
    const initialStock = finalStock - totalMovements;

    // Punto iniziale
    const chartData: Array<{
      index: number;
      stock: number;
      label: string;
      type: "IN" | "OUT" | "INITIAL";
    }> = [
      {
        index: 0,
        stock: initialStock,
        label: "Iniziale",
        type: "INITIAL",
      },
    ];

    // Aggiungi ogni movimento con stock progressivo (in ordine cronologico corretto)
    let runningStock = initialStock;
    stocksReversed.forEach((stock, index) => {
      if (stock.type === "IN") {
        runningStock += stock.quantity;
      } else {
        runningStock -= stock.quantity;
      }
      chartData.push({
        index: index + 1,
        stock: runningStock,
        label: `Mov. ${index + 1}`,
        type: stock.type,
      });
    });

    return chartData;
  }

  public calculateTotalStock(): number {
    return this.stocks.reduce((total, stock) => {
      return stock.type === "IN"
        ? total + stock.quantity
        : total - stock.quantity;
    }, 0);
  }

  public getTotalIn(): number {
    return this.stocks
      .filter((s) => s.type === "IN")
      .reduce((sum, s) => sum + s.quantity, 0);
  }

  public getTotalOut(): number {
    return this.stocks
      .filter((s) => s.type === "OUT")
      .reduce((sum, s) => sum + s.quantity, 0);
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

class StockFormValidator {
  public static validateQuantity(quantity: number): string | null {
    if (isNaN(quantity) || quantity === 0) {
      return "La quantità deve essere diversa da zero";
    }
    return null;
  }

  public static validateUnitOfMeasure(unit: string): string | null {
    if (!unit || unit.trim().length === 0) {
      return "L'unità di misura è obbligatoria";
    }
    return null;
  }

  public static validateForm(data: {
    quantity: number;
    unitOfMeasureQuantity: string;
    type: "IN" | "OUT";
  }): string | null {
    const quantityError = this.validateQuantity(data.quantity);
    if (quantityError) return quantityError;

    const unitError = this.validateUnitOfMeasure(data.unitOfMeasureQuantity);
    if (unitError) return unitError;

    return null;
  }
}

const chartConfig: ChartConfig = {
  stock: {
    label: "Stock Totale",
    color: "hsl(220, 70%, 50%)",
  },
};

function DrawerProduct({ product, open, onOpenChange }: DrawerProductProps) {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit product form
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productBarcode, setProductBarcode] = useState("");

  // Add stock form
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [stockUnit, setStockUnit] = useState("L");
  const [stockType, setStockType] = useState<"IN" | "OUT">("IN");
  const [stockPrice, setStockPrice] = useState<number | undefined>(undefined);
  const [stockPriceUnit, setStockPriceUnit] = useState("EUR");
  const [stockJobId, setStockJobId] = useState("");
  const [stockDdtCode, setStockDdtCode] = useState("");
  const [stockInvoiceCode, setStockInvoiceCode] = useState("");
  const [stockSupplierName, setStockSupplierName] = useState("");
  const [stockSupplierAddress, setStockSupplierAddress] = useState("");
  const [stockSupplierVat, setStockSupplierVat] = useState("");

  const processor = useMemo(
    () => (product ? new StockDataProcessor(product.stocks) : null),
    [product]
  );

  const chartData = useMemo(
    () => (processor ? processor.processForChart() : []),
    [processor]
  );

  const handleOpenEditDialog = () => {
    if (!product) return;
    setProductName(product.name);
    setProductDescription(product.description || "");
    setProductBarcode(product.barcode || "");
    setEditDialogOpen(true);
  };

  const handleOpenStockDialog = () => {
    // Reset form
    setStockQuantity(0);
    setStockUnit(product?.stocks[0]?.unitOfMeasureQuantity || "L");
    setStockType("IN");
    setStockPrice(undefined);
    setStockPriceUnit("EUR");
    setStockJobId("");
    setStockDdtCode("");
    setStockInvoiceCode("");
    setStockSupplierName("");
    setStockSupplierAddress("");
    setStockSupplierVat("");
    setStockDialogOpen(true);
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
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento del prodotto"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddStock = async () => {
    if (!product) return;

    const validationError = StockFormValidator.validateForm({
      quantity: stockQuantity,
      unitOfMeasureQuantity: stockUnit,
      type: stockType,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUpdating(true);
    try {
      const payload: CreateStockPayload = {
        companyId: product.warehouse.company.id,
        productId: product.id,
        quantity: Math.abs(stockQuantity),
        unitOfMeasureQuantity: stockUnit,
        type: stockType,
      };

      // Aggiungi campi opzionali solo se valorizzati
      if (stockPrice !== undefined && stockPrice > 0) {
        payload.price = stockPrice;
        payload.unitOfMeasurePrice = stockPriceUnit;
      }
      if (stockJobId) payload.jobId = stockJobId;
      if (stockDdtCode) payload.ddtCode = stockDdtCode;
      if (stockInvoiceCode) payload.invoiceCode = stockInvoiceCode;
      if (stockSupplierName) payload.companySupplierName = stockSupplierName;
      if (stockSupplierAddress) payload.addressSupplier = stockSupplierAddress;
      if (stockSupplierVat) payload.vatNumberSupplier = stockSupplierVat;

      await stocksApiService.create(payload);

      toast.success("Movimento di stock registrato con successo");
      setStockDialogOpen(false);

      // Invalida la cache per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: ["products", "me"] });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nella registrazione del movimento"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (!product || !processor) {
    return null;
  }

  const totalStock = processor.calculateTotalStock();
  const totalIn = processor.getTotalIn();
  const totalOut = processor.getTotalOut();
  const unit = product.stocks[0]?.unitOfMeasureQuantity ?? "unità";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-white p-2">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-2xl">{product.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  <SheetDescription className="mb-0">
                    SKU: {product.sku}
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
                    Stock: {totalStock} {unit}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenEditDialog}
              >
                <Pencil className="h-4 w-4" />
              </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenStockDialog}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Movimento
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Carichi</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {totalIn}
                    <span className="text-sm font-normal ml-1">{unit}</span>
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 mb-1">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs font-medium">Scarichi</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">
                    {totalOut}
                    <span className="text-sm font-normal ml-1">{unit}</span>
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-xs font-medium">Disponibile</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {totalStock}
                    <span className="text-sm font-normal ml-1">{unit}</span>
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Grafico movimenti */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">
                Andamento Stock nel Tempo
              </h3>
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
                          tickFormatter={(value) => `${value}`}
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
                                const dataPoint = props.payload;
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs text-gray-500">
                                      {dataPoint.label}
                                    </span>
                                    <span className="font-bold text-blue-600 text-base">
                                      {numValue} {unit}
                                    </span>
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
                            payload?: { type: "IN" | "OUT" | "INITIAL" };
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
                                    : payload?.type === "OUT"
                                    ? "hsl(0, 84%, 60%)"
                                    : "hsl(220, 70%, 50%)"
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
                  Nessun movimento registrato
                </p>
              )}
            </div>

            <Separator />

            {/* Dettaglio movimenti */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Dettaglio Movimenti</h3>
              <div className="space-y-2">
                {product.stocks.map((stock) => (
                  <div
                    key={stock.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {stock.type === "IN" ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {stock.type === "IN" ? "Carico" : "Scarico"}
                        </p>
                        {stock.jobId && (
                          <p className="text-xs text-gray-500">
                            Job: {stock.jobId}
                            {stock.job?.isVerified && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-xs py-0"
                              >
                                Verificato
                              </Badge>
                            )}
                          </p>
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
                        {stock.quantity} {stock.unitOfMeasureQuantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog per modifica prodotto */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Prodotto</DialogTitle>
            <DialogDescription>
              Aggiorna le informazioni del prodotto
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per aggiungere movimento stock */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Aggiungi Movimento di Stock</DialogTitle>
            <DialogDescription>
              Registra un nuovo movimento di carico o scarico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock-type">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={stockType}
                  onValueChange={(value: "IN" | "OUT") => setStockType(value)}
                >
                  <SelectTrigger id="stock-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Carico (IN)</SelectItem>
                    <SelectItem value="OUT">Scarico (OUT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-quantity">
                  Quantità <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  step="0.01"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-unit">
                Unità di Misura <span className="text-red-500">*</span>
              </Label>
              <Input
                id="stock-unit"
                value={stockUnit}
                onChange={(e) => setStockUnit(e.target.value)}
                placeholder="L, kg, pz..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock-price">Prezzo Unitario</Label>
                <Input
                  id="stock-price"
                  type="number"
                  step="0.01"
                  value={stockPrice || ""}
                  onChange={(e) =>
                    setStockPrice(
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-price-unit">Valuta</Label>
                <Input
                  id="stock-price-unit"
                  value={stockPriceUnit}
                  onChange={(e) => setStockPriceUnit(e.target.value)}
                  placeholder="EUR"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Informazioni Aggiuntive</h4>
              <div className="space-y-2">
                <Label htmlFor="stock-job-id">Job ID</Label>
                <Input
                  id="stock-job-id"
                  value={stockJobId}
                  onChange={(e) => setStockJobId(e.target.value)}
                  placeholder="ID del job associato"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock-ddt">Codice DDT</Label>
                  <Input
                    id="stock-ddt"
                    value={stockDdtCode}
                    onChange={(e) => setStockDdtCode(e.target.value)}
                    placeholder="DDT-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-invoice">Codice Fattura</Label>
                  <Input
                    id="stock-invoice"
                    value={stockInvoiceCode}
                    onChange={(e) => setStockInvoiceCode(e.target.value)}
                    placeholder="INV-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock-supplier-name">Nome Fornitore</Label>
                <Input
                  id="stock-supplier-name"
                  value={stockSupplierName}
                  onChange={(e) => setStockSupplierName(e.target.value)}
                  placeholder="Nome dell'azienda fornitrice"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock-supplier-address">
                  Indirizzo Fornitore
                </Label>
                <Input
                  id="stock-supplier-address"
                  value={stockSupplierAddress}
                  onChange={(e) => setStockSupplierAddress(e.target.value)}
                  placeholder="Via, Città"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock-supplier-vat">
                  Partita IVA Fornitore
                </Label>
                <Input
                  id="stock-supplier-vat"
                  value={stockSupplierVat}
                  onChange={(e) => setStockSupplierVat(e.target.value)}
                  placeholder="IT00000000000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStockDialogOpen(false)}
              disabled={isUpdating}
            >
              Annulla
            </Button>
            <Button onClick={handleAddStock} disabled={isUpdating}>
              {isUpdating ? "Registrazione..." : "Registra Movimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DrawerProduct;
