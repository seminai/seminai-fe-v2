import { useState, useMemo } from "react";
import { PageHeader } from "@/components/organism/Header";
import { useProducts } from "@/hooks/useProducts";
import { useCompanies } from "@/hooks/useCompanies";
import { Product } from "@/api/products";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Package,
  Warehouse,
  LayoutGrid,
  List,
  Barcode,
  Box,
  Building2,
  Eye,
} from "lucide-react";
import DrawerProduct from "./DrawerProduct";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

class ProductStockCalculator {
  private readonly stocks: Product["stocks"];

  constructor(stocks: Product["stocks"]) {
    this.stocks = stocks;
  }

  public calculateTotalStock(): number {
    return this.stocks.reduce((total, stock) => {
      return stock.type === "IN"
        ? total + stock.quantity
        : total - stock.quantity;
    }, 0);
  }

  public getStockStatus(): "in-stock" | "low-stock" | "out-of-stock" {
    const total = this.calculateTotalStock();
    if (total <= 0) return "out-of-stock";
    if (total < 50) return "low-stock";
    return "in-stock";
  }

  public getStockBadgeVariant():
    | "default"
    | "secondary"
    | "destructive"
    | "outline" {
    const status = this.getStockStatus();
    switch (status) {
      case "in-stock":
        return "default";
      case "low-stock":
        return "secondary";
      case "out-of-stock":
        return "destructive";
    }
  }
}

class ProductFilter {
  private readonly searchTerm: string;
  private readonly products: Product[];

  constructor(products: Product[], searchTerm: string) {
    this.products = products;
    this.searchTerm = searchTerm.toLowerCase();
  }

  public filter(): Product[] {
    if (!this.searchTerm) return this.products;

    return this.products.filter(
      (product) =>
        product.name.toLowerCase().includes(this.searchTerm) ||
        product.sku.toLowerCase().includes(this.searchTerm) ||
        product.warehouse.name.toLowerCase().includes(this.searchTerm) ||
        product.warehouse.company.name.toLowerCase().includes(this.searchTerm)
    );
  }
}

type SortField = "name" | "sku" | "stock" | "warehouse" | "company";
type SortDirection = "asc" | "desc";

class ProductSorter {
  private readonly products: Product[];
  private readonly sortField: SortField;
  private readonly sortDirection: SortDirection;

  constructor(
    products: Product[],
    sortField: SortField,
    sortDirection: SortDirection
  ) {
    this.products = products;
    this.sortField = sortField;
    this.sortDirection = sortDirection;
  }

  public sort(): Product[] {
    const sorted = [...this.products].sort((a, b) => {
      let compareResult = 0;

      switch (this.sortField) {
        case "name":
          compareResult = a.name.localeCompare(b.name);
          break;
        case "sku":
          compareResult = a.sku.localeCompare(b.sku);
          break;
        case "stock": {
          const stockA = new ProductStockCalculator(
            a.stocks
          ).calculateTotalStock();
          const stockB = new ProductStockCalculator(
            b.stocks
          ).calculateTotalStock();
          compareResult = stockA - stockB;
          break;
        }
        case "warehouse":
          compareResult = a.warehouse.name.localeCompare(b.warehouse.name);
          break;
        case "company":
          compareResult = a.warehouse.company.name.localeCompare(
            b.warehouse.company.name
          );
          break;
      }

      return this.sortDirection === "asc" ? compareResult : -compareResult;
    });

    return sorted;
  }
}

type ViewMode = "grid" | "table";

function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(
    undefined
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { companies } = useCompanies();
  const { products, isLoading, isError, error } = useProducts(selectedCompany);

  const filteredProducts = useMemo(() => {
    const filter = new ProductFilter(products, searchTerm);
    return filter.filter();
  }, [products, searchTerm]);

  const sortedProducts = useMemo(() => {
    const sorter = new ProductSorter(
      filteredProducts,
      sortField,
      sortDirection
    );
    return sorter.sort();
  }, [filteredProducts, sortField, sortDirection]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={cn(
        "h-4 w-4 transition-all flex-shrink-0 ml-1",
        sortField === field
          ? "opacity-100 text-blue-600"
          : "opacity-40 group-hover:opacity-80",
        sortField === field && sortDirection === "desc" ? "rotate-180" : ""
      )}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Prodotti"
          searchPlaceholder="Cerca prodotti..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
        />
        <div className="flex-1 overflow-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Prodotti" />
        <div className="flex-1 overflow-auto px-6 pb-24">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errore</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Impossibile caricare i prodotti"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Prodotti"
        searchPlaceholder="Cerca prodotti per nome, SKU, magazzino..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        totalItems={products.length}
        filteredItems={filteredProducts.length}
        rightElement={
          <div className="flex items-center gap-2">
            {/* Toggle vista */}
            <div className="flex items-center gap-1 border border-agri-green-100 rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtro aziende */}
            {companies.length > 0 && (
              <Select
                value={selectedCompany ?? "all"}
                onValueChange={(value) =>
                  setSelectedCompany(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tutte le aziende" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le aziende</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.name}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-6 pb-24">
        {sortedProducts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                Nessun prodotto trovato
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? "Prova a modificare i criteri di ricerca"
                  : "Non ci sono prodotti disponibili"}
              </p>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          // Vista Card
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedProducts.map((product) => {
              const calculator = new ProductStockCalculator(product.stocks);
              const totalStock = calculator.calculateTotalStock();
              const unit = product.stocks[0]?.unitOfMeasureQuantity ?? "unità";

              return (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProductClick(product)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {product.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          SKU: {product.sku}
                        </CardDescription>
                      </div>
                      <Badge variant={calculator.getStockBadgeVariant()}>
                        {totalStock} {unit}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Warehouse className="h-4 w-4" />
                        <span>{product.warehouse.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Package className="h-4 w-4" />
                        <span>{product.warehouse.company.name}</span>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        {product.stocks.length} moviment
                        {product.stocks.length === 1 ? "o" : "i"} registrat
                        {product.stocks.length === 1 ? "o" : "i"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // Vista Tabella
          <div className="w-full overflow-auto max-h-[calc(100vh-300px)]">
            <table
              data-slot="table"
              className={cn("w-full caption-bottom text-sm relative")}
            >
              <thead
                data-slot="table-header"
                className={cn("border-b-2 border-agri-green-100")}
              >
                <tr data-slot="table-row" className={cn("transition-colors")}>
                  <th
                    data-slot="table-head"
                    className={cn(
                      "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap cursor-pointer hover:bg-muted/10 transition-colors text-left",
                      "sticky top-0 bg-white dark:bg-background z-10"
                    )}
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1.5">
                      <Box className="h-4 w-4 text-muted-foreground" />
                      <span>Nome Prodotto</span>
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    data-slot="table-head"
                    className={cn(
                      "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap cursor-pointer hover:bg-muted/10 transition-colors text-left",
                      "sticky top-0 bg-white dark:bg-background z-10"
                    )}
                    onClick={() => handleSort("sku")}
                  >
                    <div className="flex items-center gap-1.5">
                      <Barcode className="h-4 w-4 text-muted-foreground" />
                      <span>SKU</span>
                      <SortIcon field="sku" />
                    </div>
                  </th>
                  <th
                    data-slot="table-head"
                    className={cn(
                      "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap cursor-pointer hover:bg-muted/10 transition-colors text-left",
                      "sticky top-0 bg-white dark:bg-background z-10"
                    )}
                    onClick={() => handleSort("stock")}
                  >
                    <div className="flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>Stock</span>
                      <SortIcon field="stock" />
                    </div>
                  </th>
                  <th
                    data-slot="table-head"
                    className={cn(
                      "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap cursor-pointer hover:bg-muted/10 transition-colors text-left",
                      "sticky top-0 bg-white dark:bg-background z-10"
                    )}
                    onClick={() => handleSort("warehouse")}
                  >
                    <div className="flex items-center gap-1.5">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                      <span>Magazzino</span>
                      <SortIcon field="warehouse" />
                    </div>
                  </th>
                  <th
                    data-slot="table-head"
                    className={cn(
                      "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap cursor-pointer hover:bg-muted/10 transition-colors text-left",
                      "sticky top-0 bg-white dark:bg-background z-10"
                    )}
                    onClick={() => handleSort("company")}
                  >
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>Azienda</span>
                      <SortIcon field="company" />
                    </div>
                  </th>
                  <th
                    data-slot="table-head"
                    className={cn(
                      "h-9 p-3 align-middle font-semibold text-muted-foreground text-[14px] whitespace-nowrap text-center",
                      "sticky top-0 bg-white dark:bg-background z-10"
                    )}
                  >
                    <span>Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody
                data-slot="table-body"
                className={cn("divide-y divide-border/15")}
              >
                {sortedProducts.map((product) => {
                  const calculator = new ProductStockCalculator(product.stocks);
                  const totalStock = calculator.calculateTotalStock();
                  const unit =
                    product.stocks[0]?.unitOfMeasureQuantity ?? "unità";

                  return (
                    <tr
                      key={product.id}
                      data-slot="table-row"
                      className={cn(
                        "transition-colors hover:bg-muted/10 border-agri-green-50 cursor-pointer"
                      )}
                      onClick={() => handleProductClick(product)}
                    >
                      <td
                        data-slot="table-cell"
                        className={cn("p-3 align-top text-left")}
                      >
                        <div>
                          <div className="font-semibold">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        data-slot="table-cell"
                        className={cn(
                          "p-3 align-top text-left whitespace-nowrap"
                        )}
                      >
                        <span className="font-mono text-sm">{product.sku}</span>
                      </td>
                      <td
                        data-slot="table-cell"
                        className={cn(
                          "p-3 align-top text-left whitespace-nowrap"
                        )}
                      >
                        <Badge variant={calculator.getStockBadgeVariant()}>
                          {totalStock} {unit}
                        </Badge>
                      </td>
                      <td
                        data-slot="table-cell"
                        className={cn(
                          "p-3 align-top text-left whitespace-nowrap"
                        )}
                      >
                        {product.warehouse.name}
                      </td>
                      <td
                        data-slot="table-cell"
                        className={cn(
                          "p-3 align-top text-left whitespace-nowrap"
                        )}
                      >
                        {product.warehouse.company.name}
                      </td>
                      <td
                        data-slot="table-cell"
                        className={cn(
                          "p-3 align-middle text-center whitespace-nowrap"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(product);
                        }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductClick(product);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span>
                            {product.stocks.length} moviment
                            {product.stocks.length === 1 ? "o" : "i"}
                          </span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DrawerProduct
        product={selectedProduct}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}

export default ProductsPage;
