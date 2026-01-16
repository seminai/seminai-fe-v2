import { useState, useMemo } from "react";
import type { ComponentProps, ReactNode } from "react";
import { PageHeader } from "@/components/organism/Header";
import { useProducts } from "@/hooks/useProducts";
import { Product, productsApiService } from "@/api/products";
import {
  EditableTable,
  EditableColumn,
} from "@/components/organism/EditableTable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DrawerProduct from "./DrawerProduct";
import DrawerProductBulkImport from "./DrawerProductBulkImport";

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

type SortField = "name" | "sku" | "stock" | "warehouse" | "company";
type SortDirection = "asc" | "desc";

const DEFAULT_SORT_FIELD: SortField = "name";
const DEFAULT_SORT_DIRECTION: SortDirection = "asc";

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

interface ProductTableRow extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  stockTotal: number;
  stockUnit: string;
  stockBadgeVariant: ComponentProps<typeof Badge>["variant"];
  warehouseName: string;
  companyName: string;
  movementsCount: number;
  product: Product;
}

class ProductTableRowBuilder {
  private readonly products: Product[];

  constructor(products: Product[]) {
    this.products = products;
  }

  public build(): ProductTableRow[] {
    return this.products.map((product) => {
      const calculator = new ProductStockCalculator(product.stocks);
      const stockTotal = calculator.calculateTotalStock();
      const stockBadgeVariant = calculator.getStockBadgeVariant();
      const stockUnit = product.stocks[0]?.unitOfMeasureQuantity ?? "unità";

      return {
        id: String(product.id),
        name: product.name,
        description: product.description,
        sku: product.sku,
        stockTotal,
        stockUnit,
        stockBadgeVariant,
        warehouseName: product.warehouse.name,
        companyName: product.warehouse.company.name,
        movementsCount: product.stocks.length,
        product,
      };
    });
  }
}

class ProductTableColumnsFactory {
  public static create(): EditableColumn[] {
    return [
      {
        id: "name",
        title: "Nome Prodotto",
        width: "280px",
        render: ProductTableColumnsFactory.renderName,
      },
      {
        id: "stockTotal",
        title: "Stock",
        width: "200px",
        type: "number",
        render: ProductTableColumnsFactory.renderStock,
      },
      {
        id: "warehouseName",
        title: "Magazzino",
        width: "220px",
        render: ProductTableColumnsFactory.renderWarehouse,
      },
      {
        id: "companyName",
        title: "Azienda",
        width: "220px",
        render: ProductTableColumnsFactory.renderCompany,
      },
    ];
  }

  private static asRow(row: Record<string, unknown>): ProductTableRow {
    return row as ProductTableRow;
  }

  private static renderName(
    _value: unknown,
    row: Record<string, unknown>
  ): ReactNode {
    const data = ProductTableColumnsFactory.asRow(row);

    return (
      <div>
        <div className="font-semibold">{data.name}</div>
        {data.description ? (
          <div className="text-xs text-muted-foreground mt-1">
            {data.description}
          </div>
        ) : null}
      </div>
    );
  }

  private static renderStock(
    _value: unknown,
    row: Record<string, unknown>
  ): ReactNode {
    const data = ProductTableColumnsFactory.asRow(row);
    return (
      <Badge variant={data.stockBadgeVariant}>
        {data.stockTotal} {data.stockUnit}
      </Badge>
    );
  }

  private static renderWarehouse(
    _value: unknown,
    row: Record<string, unknown>
  ): ReactNode {
    const data = ProductTableColumnsFactory.asRow(row);
    return <span>{data.warehouseName}</span>;
  }

  private static renderCompany(
    _value: unknown,
    row: Record<string, unknown>
  ): ReactNode {
    const data = ProductTableColumnsFactory.asRow(row);
    return <span>{data.companyName}</span>;
  }
}

function ProductsPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [selectedProductPreview, setSelectedProductPreview] =
    useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { products, isLoading, isError, error, refetch } = useProducts();
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);

  const sortedProducts = useMemo(() => {
    const sorter = new ProductSorter(
      products,
      DEFAULT_SORT_FIELD,
      DEFAULT_SORT_DIRECTION
    );
    return sorter.sort();
  }, [products]);

  const tableColumns = useMemo(() => ProductTableColumnsFactory.create(), []);

  const tableRows = useMemo<ProductTableRow[]>(() => {
    const builder = new ProductTableRowBuilder(sortedProducts);
    return builder.build();
  }, [sortedProducts]);

  const handleProductClick = (product: Product) => {
    setSelectedProductId(product.id);
    setSelectedProductPreview(product);
    setDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedProductId(null);
      setSelectedProductPreview(null);
    }
  };

  const handleDeleteSelected = async (
    removed: Array<Record<string, unknown>>
  ) => {
    try {
      const productRows = removed as ProductTableRow[];
      if (productRows.length === 0) {
        return;
      }

      // Ottieni il companyId dal primo prodotto (tutti i prodotti dovrebbero avere lo stesso companyId)
      const companyId = productRows[0]?.product?.warehouse?.company?.id;
      if (!companyId) {
        throw new Error("Company ID non trovato");
      }

      const productIds = productRows.map((row) => row.product.id);

      await productsApiService.bulkDelete({
        companyId,
        ids: productIds,
      });

      toast.success("Prodotti eliminati", {
        description: `${productIds.length} prodotto${
          productIds.length === 1 ? "" : "i"
        } eliminato${productIds.length === 1 ? "" : "i"} con successo`,
      });

      // Ricarica i dati (gestisci eventuali errori di refetch separatamente)
      try {
        await refetch();
      } catch (refetchError) {
        // Non mostrare errore se il refetch fallisce, l'eliminazione è comunque andata a buon fine
        console.warn("Error refetching products after delete:", refetchError);
      }
    } catch (error) {
      toast.error("Errore durante l'eliminazione", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
      console.error("Error deleting products:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Prodotti" />
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
      <PageHeader title="Prodotti" />

      <div className="flex-1 overflow-auto px-6 pb-24">
        <EditableTable
          columns={tableColumns}
          rows={tableRows}
          isModify={false}
          addButton={true}
          onAddClick={() => setImportDrawerOpen(true)}
          onDeleteSelected={handleDeleteSelected}
          getRowId={(row) => (row as ProductTableRow).id}
          exportFileName="prodotti"
          lastComponent={(row) => {
            const data = row as ProductTableRow;
            return (
              <div className="flex justify-end px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => handleProductClick(data.product)}
                >
                  <Eye className="h-4 w-4" />
                  <span>
                    {data.movementsCount} moviment
                    {data.movementsCount === 1 ? "o" : "i"}
                  </span>
                </Button>
              </div>
            );
          }}
        />
      </div>

      <DrawerProduct
        productId={selectedProductId}
        previewProduct={selectedProductPreview}
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
      />
      <DrawerProductBulkImport
        open={importDrawerOpen}
        onOpenChange={setImportDrawerOpen}
        onImportCompleted={refetch}
      />
    </div>
  );
}

export default ProductsPage;
