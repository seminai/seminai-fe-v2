import { useState, useMemo, useCallback, useEffect } from "react";
import type { ComponentProps, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { IoOpenOutline } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DrawerProduct from "./DrawerProduct";
import { SplitDrawerLayout } from "@/components/molecules/SplitDrawerLayout";
import { getAdministrativeStatusMap } from "@/services/fitosanitariRegistry";

class ProductStockCalculator {
  private readonly stocks: Product["stocks"];

  constructor(stocks: Product["stocks"]) {
    this.stocks = stocks;
  }

  public calculateTotalStock(): number {
    return this.stocks.reduce((total, stock) => {
      const absQuantity = Math.abs(stock.quantity);
      return stock.type === "IN" ? total + absQuantity : total - absQuantity;
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
    sortDirection: SortDirection,
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
            a.stocks,
          ).calculateTotalStock();
          const stockB = new ProductStockCalculator(
            b.stocks,
          ).calculateTotalStock();
          compareResult = stockA - stockB;
          break;
        }
        case "warehouse":
          compareResult = a.warehouse.name.localeCompare(b.warehouse.name);
          break;
        case "company":
          compareResult = a.warehouse.company.name.localeCompare(
            b.warehouse.company.name,
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
  administrativeStatus: string | null;
  product: Product;
}

class ProductTableRowBuilder {
  private readonly products: Product[];
  private readonly statusMap: Map<string, string> | null;

  constructor(
    products: Product[],
    statusMap: Map<string, string> | null = null,
  ) {
    this.products = products;
    this.statusMap = statusMap;
  }

  private resolveAdministrativeStatus(product: Product): string | null {
    if (this.statusMap) {
      const datasetStatus = this.statusMap.get(product.name.toLowerCase());
      if (datasetStatus) {
        return datasetStatus;
      }
    }
    return product.administrativeStatus ?? null;
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
        administrativeStatus: this.resolveAdministrativeStatus(product),
        product,
      };
    });
  }
}

class ProductTableColumnsFactory {
  public static create(
    onUpdateAdministrativeStatus: () => Promise<void>,
    isUpdatingAdministrativeStatus: boolean,
  ): EditableColumn[] {
    return [
      {
        id: "name",
        title: "Nome Prodotto",
        width: "280px",
        type: "text",
        render: ProductTableColumnsFactory.renderName,
      },
      // {
      //   id: "sku",
      //   title: "Codice magazzino (SKU)",
      //   width: "140px",
      //   type: "text",
      //   render: ProductTableColumnsFactory.renderSku,
      // },
      {
        id: "stockTotal",
        title: "Stock",
        width: "200px",
        type: "number",
        readOnly: true,
        render: ProductTableColumnsFactory.renderStock,
      },
      {
        id: "warehouseName",
        title: "Magazzino",
        width: "220px",
        readOnly: true,
        render: ProductTableColumnsFactory.renderWarehouse,
      },
      {
        id: "companyName",
        title: "Azienda",
        width: "220px",
        readOnly: true,
        render: ProductTableColumnsFactory.renderCompany,
      },
      {
        id: "administrativeStatus",
        title: "Stato amministrativo",
        width: "220px",
        readOnly: true,
        render: (value, row) =>
          ProductTableColumnsFactory.renderAdministrativeStatus(
            value,
            row,
            onUpdateAdministrativeStatus,
            isUpdatingAdministrativeStatus,
          ),
      },
    ];
  }

  private static asRow(row: Record<string, unknown>): ProductTableRow {
    return row as ProductTableRow;
  }

  private static renderName(
    _value: unknown,
    row: Record<string, unknown>,
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
    row: Record<string, unknown>,
  ): ReactNode {
    const data = ProductTableColumnsFactory.asRow(row);
    const total = data.stockTotal;
    const sign = total > 0 ? "+" : total < 0 ? "-" : "";
    const rounded = Math.round(Math.abs(total) * 1000) / 1000;
    const formatted = rounded.toFixed(3);
    const display = `${sign}${formatted} ${data.stockUnit}`;
    if (total <= 0) {
      return <Badge variant="destructive">{display}</Badge>;
    }
    return <span>{display}</span>;
  }

  private static renderWarehouse(
    _value: unknown,
    row: Record<string, unknown>,
  ): ReactNode {
    const data = ProductTableColumnsFactory.asRow(row);
    return <span>{data.warehouseName}</span>;
  }

  private static renderCompany(
    _value: unknown,
    row: Record<string, unknown>,
  ): ReactNode {
    const data = ProductTableColumnsFactory.asRow(row);
    return <span>{data.companyName}</span>;
  }

  private static renderAdministrativeStatus(
    _value: unknown,
    row: Record<string, unknown>,
    onUpdateAdministrativeStatus: () => Promise<void>,
    isUpdatingAdministrativeStatus: boolean,
  ): ReactNode {
    const data = ProductTableColumnsFactory.asRow(row);
    if (
      data.administrativeStatus === null ||
      data.administrativeStatus === undefined
    ) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={onUpdateAdministrativeStatus}
          disabled={isUpdatingAdministrativeStatus}
          className="h-7 px-2 text-xs"
        >
          {isUpdatingAdministrativeStatus ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Ricarica
        </Button>
      );
    }

    const status = data.administrativeStatus.toLowerCase();
    if (status === "revocato" || status.startsWith("revocato")) {
      return <Badge variant="destructive">{data.administrativeStatus}</Badge>;
    }
    if (status === "scaduto" || status.startsWith("scaduto")) {
      return <Badge variant="secondary">{data.administrativeStatus}</Badge>;
    }

    return <span>{data.administrativeStatus}</span>;
  }
}

function ProductsPage() {
  const navigate = useNavigate();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedProductPreview, setSelectedProductPreview] =
    useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAlignLoading, setIsAlignLoading] = useState(false);
  const [isUpdatingAdministrativeStatus, setIsUpdatingAdministrativeStatus] =
    useState(false);
  const [datasetStatusMap, setDatasetStatusMap] = useState<Map<
    string,
    string
  > | null>(null);

  const { products, isLoading, isError, error, refetch } = useProducts();

  useEffect(() => {
    getAdministrativeStatusMap()
      .then(setDatasetStatusMap)
      .catch((err) =>
        console.error("Error loading fitosanitari status map:", err),
      );
  }, []);

  const sortedProducts = useMemo(() => {
    const sorter = new ProductSorter(
      products,
      DEFAULT_SORT_FIELD,
      DEFAULT_SORT_DIRECTION,
    );
    return sorter.sort();
  }, [products]);

  const handleUpdateAdministrativeStatus = useCallback(async () => {
    setIsUpdatingAdministrativeStatus(true);
    try {
      const response = await productsApiService.updateAdministrativeStatus();
      toast.success("Stato amministrativo aggiornato", {
        description: `${response.data.productsUpdated} prodotti aggiornati su ${response.data.totalProductsWithRegistration} totali`,
      });
      await refetch();
    } catch (error) {
      toast.error("Errore durante l'aggiornamento", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
      console.error("Error updating administrative status:", error);
    } finally {
      setIsUpdatingAdministrativeStatus(false);
    }
  }, [refetch]);

  const tableColumns = useMemo(
    () =>
      ProductTableColumnsFactory.create(
        handleUpdateAdministrativeStatus,
        isUpdatingAdministrativeStatus,
      ),
    [handleUpdateAdministrativeStatus, isUpdatingAdministrativeStatus],
  );

  const tableRows = useMemo<ProductTableRow[]>(() => {
    const builder = new ProductTableRowBuilder(
      sortedProducts,
      datasetStatusMap,
    );
    return builder.build();
  }, [sortedProducts, datasetStatusMap]);

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

  const handleSave = useCallback(
    async (payload: {
      created: Array<Record<string, unknown>>;
      updated: Array<Record<string, unknown>>;
    }) => {
      const allRows = [...payload.created, ...payload.updated];
      if (allRows.length === 0) return;

      try {
        // Group by companyId + warehouseId (from product on each row)
        const groups = new Map<
          string,
          {
            companyId: string;
            warehouseId: string;
            rows: Record<string, unknown>[];
          }
        >();
        for (const row of allRows) {
          const product = (row as ProductTableRow).product;
          if (!product?.warehouse?.company?.id) continue;
          const companyId = product.warehouse.company.id;
          const warehouseId = product.warehouseId;
          const key = `${companyId}|${warehouseId}`;
          if (!groups.has(key)) {
            groups.set(key, { companyId, warehouseId, rows: [] });
          }
          groups.get(key)!.rows.push(row);
        }

        let totalCreated = 0;
        let totalUpdated = 0;
        for (const { companyId, warehouseId, rows } of groups.values()) {
          const products = rows.map((row) => {
            const r = row as ProductTableRow;
            return {
              ...(r.product?.id && { id: r.product.id }),
              name: String(r.name ?? ""),
              sku: String(r.sku ?? ""),
              ...(r.description && { description: String(r.description) }),
            };
          });
          const result = await productsApiService.bulkImport({
            companyId,
            warehouseId,
            products,
          });
          totalCreated += result.data?.productsCreated ?? 0;
          totalUpdated += result.data?.productsUpdated ?? 0;
        }

        toast.success("Prodotti aggiornati", {
          description:
            totalCreated > 0 || totalUpdated > 0
              ? `Creati: ${totalCreated}, aggiornati: ${totalUpdated}`
              : "Modifiche applicate",
        });
        await refetch();
      } catch (error) {
        toast.error("Errore durante il salvataggio", {
          description:
            error instanceof Error ? error.message : "Riprova più tardi",
        });
        console.error("Error saving products in bulk:", error);
      }
    },
    [refetch],
  );

  const handleDeleteSelected = async (
    removed: Array<Record<string, unknown>>,
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

  const handleAlignSelected = useCallback(
    async (selectedRows: Array<Record<string, unknown>>) => {
      const productRows = selectedRows as ProductTableRow[];
      if (productRows.length < 2) {
        toast.error("Seleziona almeno 2 prodotti da unire");
        return;
      }

      const companyId = productRows[0]?.product?.warehouse?.company?.id;
      if (!companyId) {
        toast.error("Company ID non trovato");
        return;
      }

      setIsAlignLoading(true);
      try {
        await productsApiService.alignProducts({
          companyId,
          productIds: productRows.map((row) => row.product.id),
        });

        toast.success("Prodotti uniti", {
          description: `${productRows.length} prodotti uniti con successo`,
        });
        await refetch();
      } catch (error) {
        toast.error("Errore durante l'unione", {
          description:
            error instanceof Error ? error.message : "Riprova più tardi",
        });
        console.error("Error aligning products:", error);
      } finally {
        setIsAlignLoading(false);
      }
    },
    [refetch],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Prodotti" className="hidden md:block" />
        <div className="flex-1 min-h-0 px-6 pb-6">
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
      <div className="flex flex-col h-full">
        <PageHeader title="Prodotti" className="hidden md:block" />
        <div className="flex-1 min-h-0 px-6 pb-6">
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
    <SplitDrawerLayout
      className="flex flex-col h-full"
      main={
        <>
          <PageHeader title="Prodotti" className="hidden md:block" />
          <div className="flex-1 min-h-0 px-6 pb-6">
            <EditableTable
              columns={tableColumns}
              rows={tableRows}
              isModify={true}
              addButton={true}
              onAddClick={() => navigate("/new-product")}
              onSave={handleSave}
              onDeleteSelected={handleDeleteSelected}
              onAlignSelected={handleAlignSelected}
              alignButtonLabel="Unisci"
              isAlignLoading={isAlignLoading}
              getRowId={(row) => (row as ProductTableRow).id}
              exportFileName="prodotti"
              lastComponent={(row) => {
                const data = row as ProductTableRow;
                return (
                  <div className="flex justify-end px-2 py-1 bg-white group-hover:bg-agri-green-50 transition-colors">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs whitespace-nowrap cursor-pointer hover:rounded-full"
                      onClick={() => handleProductClick(data.product)}
                    >
                      <span className="hidden sm:inline sm:mr-1">
                        {data.movementsCount} moviment
                        {data.movementsCount === 1 ? "o" : "i"}
                      </span>
                      <IoOpenOutline className="h-3 w-3" />
                    </Button>
                  </div>
                );
              }}
            />
          </div>
        </>
      }
      drawerContent={
        <DrawerProduct
          contentOnly
          productId={selectedProductId}
          previewProduct={selectedProductPreview}
          open={drawerOpen}
          onOpenChange={handleDrawerOpenChange}
        />
      }
      open={drawerOpen}
      onOpenChange={handleDrawerOpenChange}
      defaultDrawerWidth={480}
      minDrawerWidth={320}
      maxDrawerWidth={900}
      storageKey="seminai-products-drawer-width"
    />
  );
}

export default ProductsPage;
