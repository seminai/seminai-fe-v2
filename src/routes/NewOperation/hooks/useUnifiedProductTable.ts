import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { Product, StockEntry } from "@/api/products";
import type { DosageProduct } from "@/api/dosage-agent";
import { productsApiService } from "@/api/products";
import type { VerifiedPhytosanitaryProduct } from "@/api/products";
import {
  getAuthorizedFitosanitariRecords,
  findRegNumberByName,
  type FitosanitariDatasetRecord,
} from "@/services/fitosanitariRegistry";
import type { OperationMode, UnifiedProductRow } from "../types";

function calculateNetStock(stocks: StockEntry[]): number {
  return stocks.reduce((total, stock) => {
    return stock.type === "IN" ? total + stock.quantity : total - stock.quantity;
  }, 0);
}

let productIdCounter = 0;

function nextInternalId(): string {
  return `product-${Date.now()}-${++productIdCounter}`;
}

export function useUnifiedProductTable(
  mode: OperationMode | null,
  selectedCompanyId: string,
  selectedCompanyName: string | undefined,
  warehouseProducts: Product[],
  isLoadingWarehouseProducts: boolean,
  allUnitIds: string[],
) {
  const [rows, setRows] = useState<UnifiedProductRow[]>([]);
  const [fitosanitariProducts, setFitosanitariProducts] = useState<
    FitosanitariDatasetRecord[]
  >([]);
  const [isLoadingFitosanitari, setIsLoadingFitosanitari] = useState(true);
  const [isImportingFromWarehouse, setIsImportingFromWarehouse] =
    useState(false);
  const [isImportingFromNotes, setIsImportingFromNotes] = useState(false);

  // Load fitosanitari registry on mount
  useEffect(() => {
    getAuthorizedFitosanitariRecords()
      .then(setFitosanitariProducts)
      .catch((err) => console.error("Error loading fitosanitari:", err))
      .finally(() => setIsLoadingFitosanitari(false));
  }, []);

  // Default unit selection: automatic selects all, manual starts empty
  const defaultUnitIds = mode === "automatic" ? allUnitIds : [];

  // Product select options (warehouse first, then registry)
  const productSelectOptions = useMemo(() => {
    const companyProducts = selectedCompanyName ? warehouseProducts : [];

    const warehouseOptions = companyProducts.map((p) => {
      const netStock = calculateNetStock(p.stocks);
      const stockUnit = p.stocks[0]?.unitOfMeasureQuantity ?? "";
      const stockLabel =
        netStock > 0
          ? `Disponibile: ${netStock} ${stockUnit}`
          : "Esaurito";
      return {
        value: `wh:${p.id}`,
        label: p.name,
        description: stockLabel,
        groupLabel: "Magazzino aziendale",
      };
    });

    const registryOptions = fitosanitariProducts.map((p) => ({
      value: `reg:${p.registrationNumber}`,
      label: p.productName,
      description: p.activeIngredients,
      groupLabel: "Registro ministeriale",
    }));

    return [...warehouseOptions, ...registryOptions];
  }, [fitosanitariProducts, warehouseProducts, selectedCompanyName]);

  // Default today's date as ISO string
  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Add a product row from product selection
  const addProductFromKey = useCallback(
    (key: string) => {
      // Check if already exists
      if (rows.some((r) => r._internalId === key || `${r.source === "warehouse" ? "wh" : "reg"}:${r.registrationNumber}` === key)) {
        return;
      }

      if (key.startsWith("wh:")) {
        const productId = key.slice(3);
        const product = warehouseProducts.find((p) => p.id === productId);
        if (!product) return;

        const netStock = calculateNetStock(product.stocks);
        const stockUnit = product.stocks[0]?.unitOfMeasureQuantity ?? "";

        const newRow: UnifiedProductRow = {
          _internalId: nextInternalId(),
          dateOfOperation: todayIso,
          selectedUnitIds: [...defaultUnitIds],
          productName: product.name,
          registrationNumber: product.sku || "",
          quantity: 0,
          unitOfMeasure: stockUnit || "L",
          dosePerHa: null,
          treatedSurfaceHa: 0,
          availableStock: netStock > 0 ? netStock : 0,
          stockUnit,
          strategy: null,
          source: "warehouse",
          loadWarehouse: true,
          sku: product.sku,
        };
        setRows((prev) => [...prev, newRow]);
      } else if (key.startsWith("reg:")) {
        const regNum = key.slice(4);
        const record = fitosanitariProducts.find(
          (p) => p.registrationNumber === regNum,
        );
        if (!record) return;

        const newRow: UnifiedProductRow = {
          _internalId: nextInternalId(),
          dateOfOperation: todayIso,
          selectedUnitIds: [...defaultUnitIds],
          productName: record.productName,
          registrationNumber: record.registrationNumber,
          quantity: 0,
          unitOfMeasure: guessUnitFromFormulation(record),
          dosePerHa: null,
          treatedSurfaceHa: 0,
          availableStock: null,
          stockUnit: null,
          strategy: null,
          source: "registry",
          loadWarehouse: false,
        };
        setRows((prev) => [...prev, newRow]);
      }
    },
    [rows, warehouseProducts, fitosanitariProducts, defaultUnitIds, todayIso],
  );

  // Update a single field in a row
  const updateRow = useCallback(
    (internalId: string, field: keyof UnifiedProductRow, value: unknown) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row._internalId !== internalId) return row;
          const updated = { ...row, [field]: value };

          // Auto-calculate quantity from dosePerHa × treatedSurface
          if (field === "dosePerHa" && typeof value === "number") {
            updated.quantity = value * (updated.treatedSurfaceHa || 0);
          }
          if (field === "treatedSurfaceHa" && typeof value === "number") {
            if (updated.dosePerHa) {
              updated.quantity = updated.dosePerHa * value;
            }
          }

          return updated;
        }),
      );
    },
    [],
  );

  // Change the product of an existing row
  const changeRowProduct = useCallback(
    (internalId: string, key: string) => {
      if (key.startsWith("wh:")) {
        const productId = key.slice(3);
        const product = warehouseProducts.find((p) => p.id === productId);
        if (!product) return;

        const netStock = calculateNetStock(product.stocks);
        const stockUnit = product.stocks[0]?.unitOfMeasureQuantity ?? "";

        setRows((prev) =>
          prev.map((row) => {
            if (row._internalId !== internalId) return row;
            return {
              ...row,
              productName: product.name,
              registrationNumber: product.sku || "",
              unitOfMeasure: stockUnit || row.unitOfMeasure,
              availableStock: netStock > 0 ? netStock : 0,
              stockUnit,
              source: "warehouse",
              loadWarehouse: true,
              sku: product.sku,
            };
          }),
        );
      } else if (key.startsWith("reg:")) {
        const regNum = key.slice(4);
        const record = fitosanitariProducts.find(
          (p) => p.registrationNumber === regNum,
        );
        if (!record) return;

        setRows((prev) =>
          prev.map((row) => {
            if (row._internalId !== internalId) return row;
            return {
              ...row,
              productName: record.productName,
              registrationNumber: record.registrationNumber,
              unitOfMeasure: guessUnitFromFormulation(record),
              availableStock: null,
              stockUnit: null,
              source: "registry",
              loadWarehouse: false,
              sku: undefined,
            };
          }),
        );
      }
    },
    [warehouseProducts, fitosanitariProducts],
  );

  // Remove rows
  const removeRows = useCallback((internalIds: string[]) => {
    const idSet = new Set(internalIds);
    setRows((prev) => prev.filter((r) => !idSet.has(r._internalId)));
  }, []);

  // Import from warehouse
  const handleImportFromWarehouse = useCallback(async () => {
    if (isLoadingWarehouseProducts || isImportingFromWarehouse) return;

    if (!selectedCompanyId) {
      toast.error("Nessuna azienda selezionata");
      return;
    }

    const companyProducts = warehouseProducts.filter(() => true);
    if (companyProducts.length === 0) {
      toast.info("Nessun prodotto disponibile in magazzino");
      return;
    }

    setIsImportingFromWarehouse(true);
    const toastId = toast.loading("Caricamento prodotti da magazzino...");

    try {
      const newRows: UnifiedProductRow[] = [];

      for (const product of companyProducts) {
        const netStock = calculateNetStock(product.stocks);
        if (netStock <= 0) continue;

        const stockUnit = product.stocks[0]?.unitOfMeasureQuantity ?? "";

        // Try to find registration number from registry
        let regNumber = product.sku || "";
        if (!regNumber) {
          try {
            const found = await findRegNumberByName(product.name);
            if (found) regNumber = found;
          } catch {
            // ignore
          }
        }

        // Skip duplicates
        const exists = rows.some(
          (r) =>
            r.productName === product.name &&
            r.registrationNumber === regNumber,
        );
        if (exists) continue;

        newRows.push({
          _internalId: nextInternalId(),
          dateOfOperation: todayIso,
          selectedUnitIds: [...defaultUnitIds],
          productName: product.name,
          registrationNumber: regNumber,
          quantity: netStock,
          unitOfMeasure: stockUnit || "L",
          dosePerHa: null,
          treatedSurfaceHa: 0,
          availableStock: netStock,
          stockUnit,
          strategy: null,
          source: "warehouse",
          loadWarehouse: true,
          supplierName: product.warehouse.company.name,
          sku: product.sku,
        });
      }

      if (newRows.length === 0) {
        toast.info("Tutti i prodotti di magazzino sono già presenti", {
          id: toastId,
        });
      } else {
        setRows((prev) => [...prev, ...newRows]);
        toast.success(`${newRows.length} prodotti importati dal magazzino`, {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error("Errore importazione magazzino", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
    } finally {
      setIsImportingFromWarehouse(false);
    }
  }, [
    isLoadingWarehouseProducts,
    isImportingFromWarehouse,
    selectedCompanyId,
    warehouseProducts,
    rows,
    defaultUnitIds,
    todayIso,
  ]);

  // Import from notes
  const handleImportFromNotes = useCallback(async () => {
    if (isImportingFromNotes) return;
    if (!selectedCompanyId) {
      toast.error("Nessuna azienda selezionata");
      return;
    }

    setIsImportingFromNotes(true);
    const toastId = toast.loading("Caricamento prodotti da note...");

    try {
      const response =
        await productsApiService.getVerifiedPhytosanitary(selectedCompanyId);

      if (
        response.status === "error" ||
        !response.data?.products?.length
      ) {
        toast.info("Nessun prodotto trovato", { id: toastId });
        return;
      }

      const allProducts: VerifiedPhytosanitaryProduct[] =
        response.data.products;
      const newRows: UnifiedProductRow[] = [];

      for (const product of allProducts) {
        const netQuantity = product.stocks.reduce((total, stock) => {
          const qty = stock.quantity ?? 0;
          return stock.type === "IN" ? total + qty : total - qty;
        }, 0);

        if (netQuantity <= 0) continue;

        const unitOfMeasure =
          product.stocks[0]?.unitOfMeasureQuantity || "kg";

        const exists = rows.some(
          (r) =>
            r.productName === product.name &&
            r.registrationNumber === (product.registrationNumber || ""),
        );
        if (exists) continue;

        newRows.push({
          _internalId: nextInternalId(),
          dateOfOperation: todayIso,
          selectedUnitIds: [...defaultUnitIds],
          productName: product.name,
          registrationNumber: product.registrationNumber || "",
          quantity: netQuantity,
          unitOfMeasure: unitOfMeasure,
          dosePerHa: null,
          treatedSurfaceHa: 0,
          availableStock: netQuantity,
          stockUnit: unitOfMeasure,
          strategy: null,
          source: "notes",
          loadWarehouse: true,
          supplierName: product.warehouse.company.name,
        });
      }

      if (newRows.length === 0) {
        toast.info("Tutti i prodotti da note sono già presenti", {
          id: toastId,
        });
      } else {
        setRows((prev) => [...prev, ...newRows]);
        toast.success(`${newRows.length} prodotti importati da note`, {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error("Errore importazione da note", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
    } finally {
      setIsImportingFromNotes(false);
    }
  }, [isImportingFromNotes, selectedCompanyId, rows, defaultUnitIds, todayIso]);

  // Add rows from CSV import (matches the format used by DosageManager's import)
  const handleAddRowsFromCsv = useCallback(
    (csvRows: Array<Record<string, unknown>>) => {
      const newRows: UnifiedProductRow[] = csvRows.map((csvRow) => ({
        _internalId: nextInternalId(),
        dateOfOperation: todayIso,
        selectedUnitIds: [...defaultUnitIds],
        productName: String(csvRow.productName || ""),
        registrationNumber: String(csvRow.registrationNumber || ""),
        quantity: Number(csvRow.quantity) || 0,
        unitOfMeasure: String(csvRow.quantityUnitOfMeasure || "L"),
        dosePerHa: null,
        treatedSurfaceHa: 0,
        availableStock: null,
        stockUnit: null,
        strategy: null,
        source: "csv" as const,
        loadWarehouse: false,
        supplierName: csvRow.supplierName
          ? String(csvRow.supplierName)
          : undefined,
        supplierVat: csvRow.supplierVat
          ? String(csvRow.supplierVat)
          : undefined,
      }));

      setRows((prev) => {
        const existingKeys = new Set(
          prev.map((r) => `${r.productName}-${r.registrationNumber}`),
        );
        const unique = newRows.filter(
          (r) =>
            !existingKeys.has(`${r.productName}-${r.registrationNumber}`),
        );
        return [...prev, ...unique];
      });

      if (newRows.length > 0) {
        toast.success(`${newRows.length} prodotti importati da CSV`);
      }
    },
    [defaultUnitIds, todayIso],
  );

  // Add rows from DDT import
  const handleAddRowsFromDdt = useCallback(
    (ddtRows: Array<Record<string, unknown>>) => {
      const newRows: UnifiedProductRow[] = ddtRows.map((ddtRow) => ({
        _internalId: nextInternalId(),
        dateOfOperation: todayIso,
        selectedUnitIds: [...defaultUnitIds],
        productName: String(ddtRow.productName || ""),
        registrationNumber: String(ddtRow.registrationNumber || ""),
        quantity: Number(ddtRow.quantity) || 0,
        unitOfMeasure: String(ddtRow.quantityUnitOfMeasure || "L"),
        dosePerHa: null,
        treatedSurfaceHa: 0,
        availableStock: null,
        stockUnit: null,
        strategy: null,
        source: "ddt" as const,
        loadWarehouse: false,
        supplierName: ddtRow.supplierName
          ? String(ddtRow.supplierName)
          : undefined,
        supplierVat: ddtRow.supplierVat
          ? String(ddtRow.supplierVat)
          : undefined,
        ddtDate: ddtRow.ddtDate ? String(ddtRow.ddtDate) : undefined,
        orderNumber: ddtRow.orderNumber
          ? String(ddtRow.orderNumber)
          : undefined,
      }));

      setRows((prev) => {
        const existingKeys = new Set(
          prev.map((r) => `${r.productName}-${r.registrationNumber}`),
        );
        const unique = newRows.filter(
          (r) =>
            !existingKeys.has(`${r.productName}-${r.registrationNumber}`),
        );
        return [...prev, ...unique];
      });

      if (newRows.length > 0) {
        toast.success(`${newRows.length} prodotti importati da DDT`);
      }
    },
    [defaultUnitIds, todayIso],
  );

  // Add a manual empty row
  const addEmptyRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        _internalId: nextInternalId(),
        dateOfOperation: todayIso,
        selectedUnitIds: [...defaultUnitIds],
        productName: "",
        registrationNumber: "",
        quantity: 0,
        unitOfMeasure: "L",
        dosePerHa: null,
        treatedSurfaceHa: 0,
        availableStock: null,
        stockUnit: null,
        strategy: null,
        source: "manual",
        loadWarehouse: false,
      },
    ]);
  }, [defaultUnitIds, todayIso]);

  // Reset all rows
  const resetRows = useCallback(() => {
    setRows([]);
  }, []);

  return {
    rows,
    setRows,
    updateRow,
    changeRowProduct,
    removeRows,
    addProductFromKey,
    addEmptyRow,
    resetRows,

    // Import
    handleImportFromWarehouse,
    handleImportFromNotes,
    handleAddRowsFromCsv,
    handleAddRowsFromDdt,
    isImportingFromWarehouse,
    isImportingFromNotes,

    // Product options
    productSelectOptions,
    fitosanitariProducts,
    isLoadingFitosanitari,
  };
}

function guessUnitFromFormulation(record: FitosanitariDatasetRecord): string {
  const description = (record.formulationDescription || "")
    .toLowerCase()
    .trim();
  const code = (record.formulationCode || "").toUpperCase();

  const looksLiquid =
    description.includes("liquido") ||
    description.includes("sospensione") ||
    description.includes("emulsione") ||
    description.includes("olio") ||
    code.startsWith("L") ||
    code.includes("SL") ||
    code.includes("AL");

  if (looksLiquid) return "L";

  return "KG";
}
