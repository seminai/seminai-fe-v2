import type { EditableColumn } from "@/components/organism/EditableTable";
import type { BulkProductPayload } from "@/api/products";
import type {
  ProductImportItem,
  ProductImportSource,
} from "./productImportPreview.types";
import type { ReactNode } from "react";

export interface ProductImportPreviewRow extends Record<string, unknown> {
  id: string;
  sourceFileId?: string | null;
  name: string;
  productNameExtracted?: string | null;
  sku: string;
  registrationNumber: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  quantityConverted?: number | null;
  unitMeasureConverted?: string | null;
  /**
   * Cached ratio (quantityConverted / quantity) captured at row creation.
   * Used to keep the converted value consistent when the user edits the
   * original quantity (or vice-versa) in the simil-Excel grid.
   */
  conversionRatio?: number | null;
  ddtCode: string;
  supplierName: string;
  ddtDate: string;
  invoiceDate?: string;
  barcode?: string;
  category?: string;
  type?: string;
  description?: string;
  price?: number;
  unitOfMeasurePrice?: string;
  supplierVat?: string;
  addressSupplier?: string;
  invoiceCode?: string;
  invoiceDueDate?: string;
}

class ImportPreviewDefaults {
  public static readonly quantityUnit = "kg";
  public static readonly fallbackCategory = "PESTICIDE";
}

function createProductImportRowId(
  item: ProductImportItem,
  index: number,
): string {
  const identitySeed = [
    item.name,
    item.registrationNumber ?? "no-reg",
    item.ddtCode ?? item.invoiceCode ?? "no-doc",
    index,
  ].join("-");

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${identitySeed}-${crypto.randomUUID()}`;
  }

  return `${identitySeed}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export class ProductImportRowBuilder {
  public static build(items: ProductImportItem[]): ProductImportPreviewRow[] {
    return items.map((item, index) => {
      const initialRatio =
        item.quantityConverted != null && item.quantity > 0
          ? item.quantityConverted / item.quantity
          : null;
      return {
      id: createProductImportRowId(item, index),
      sourceFileId: item.sourceFileId ?? null,
      name: item.name,
      productNameExtracted: item.productNameExtracted ?? null,
      sku: item.sku ?? item.registrationNumber ?? item.name,
      registrationNumber: item.registrationNumber ?? "",
      quantity: item.quantity,
      unitOfMeasureQuantity:
        item.unitOfMeasureQuantity || ImportPreviewDefaults.quantityUnit,
      quantityConverted: item.quantityConverted ?? null,
      unitMeasureConverted: item.unitMeasureConverted ?? null,
      conversionRatio: initialRatio,
      ddtCode: item.ddtCode ?? "",
      supplierName: item.supplierName ?? "",
      ddtDate:
        item.ddtDate ??
        item.invoiceDate ??
        new Date().toISOString().split("T")[0],
      invoiceDate: item.invoiceDate ?? undefined,
      barcode: item.barcode ?? undefined,
      category:
        (item.category === "PHYTOSANITARY" ? "PESTICIDE" : item.category) ??
        ImportPreviewDefaults.fallbackCategory,
      type: item.type ?? undefined,
      description: item.description ?? undefined,
      price: item.price ?? undefined,
      unitOfMeasurePrice: item.unitOfMeasurePrice ?? undefined,
      supplierVat: item.supplierVat ?? undefined,
      addressSupplier: item.addressSupplier ?? undefined,
      invoiceCode: item.invoiceCode ?? undefined,
      invoiceDueDate: item.invoiceDueDate ?? undefined,
      };
    });
  }

  public static toBulkPayload(
    rows: ProductImportPreviewRow[],
    useConvertedIds?: Set<string>,
  ): BulkProductPayload[] {
    return rows.map((row) => {
      const hasConversion =
        row.quantityConverted != null && row.unitMeasureConverted != null;
      const useConverted =
        useConvertedIds != null
          ? useConvertedIds.has(row.id)
          : hasConversion;
      const finalQuantity =
        useConverted && row.quantityConverted != null
          ? row.quantityConverted
          : row.quantity;
      const finalUnit =
        useConverted && row.unitMeasureConverted != null
          ? row.unitMeasureConverted
          : row.unitOfMeasureQuantity;

      return {
        name: row.name,
        sku: row.sku || row.registrationNumber || row.name,
        barcode: row.barcode || undefined,
        category: row.category || undefined,
        type: row.type || undefined,
        description: row.description || undefined,
        registrationNumber: row.registrationNumber || undefined,
        stock: {
          quantity: finalQuantity,
          sourceFileId: row.sourceFileId ?? undefined,
          unitOfMeasureQuantity: finalUnit,
          price: row.price ?? undefined,
          unitOfMeasurePrice: row.unitOfMeasurePrice ?? undefined,
          type: "IN",
          ddtCode: row.ddtCode || undefined,
          ddtDate: row.ddtDate || undefined,
          invoiceCode: row.invoiceCode || undefined,
          invoiceDate: row.invoiceDate || undefined,
          companySupplierName: row.supplierName || undefined,
          addressSupplier: row.addressSupplier || undefined,
          vatNumberSupplier: row.supplierVat || undefined,
          invoiceDueDate: row.invoiceDueDate || undefined,
          productNameAsOnDocument: row.productNameExtracted || undefined,
          quantityConverted:
            row.quantityConverted != null ? row.quantityConverted : undefined,
          unitMeasureConverted: row.unitMeasureConverted || undefined,
        },
      };
    });
  }
}

function formatDate(value: unknown): ReactNode {
  if (!value || value === "")
    return <span className="text-muted-foreground">-</span>;
  try {
    const date = new Date(value as string);
    if (isNaN(date.getTime())) return <span>{String(value)}</span>;
    return <span>{date.toLocaleDateString("it-IT")}</span>;
  } catch {
    return <span>{String(value)}</span>;
  }
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * When the user edits the original quantity, scale the converted quantity by the
 * ratio cached at row creation (`conversionRatio`). This keeps the physical meaning
 * of the conversion consistent with the original extraction.
 */
function recomputeOnQuantityChange(args: {
  value: unknown;
  rowData: Record<string, unknown>;
}): Record<string, unknown> | undefined {
  const row = args.rowData as ProductImportPreviewRow;
  const nextQty = Number(args.value);
  if (!Number.isFinite(nextQty)) return undefined;
  const ratio = row.conversionRatio;
  if (ratio == null || !Number.isFinite(ratio)) return undefined;
  return { quantityConverted: roundTwo(nextQty * ratio) };
}

/**
 * When the user edits the converted quantity directly, update the cached ratio
 * so that subsequent quantity edits scale correctly. We intentionally do NOT
 * change the original quantity here — the user explicitly wants to override
 * the converted value.
 */
function recomputeOnConvertedQuantityChange(args: {
  value: unknown;
  rowData: Record<string, unknown>;
}): Record<string, unknown> | undefined {
  const row = args.rowData as ProductImportPreviewRow;
  const nextConverted = Number(args.value);
  const qty = Number(row.quantity);
  if (!Number.isFinite(nextConverted) || !Number.isFinite(qty) || qty <= 0) {
    return undefined;
  }
  return { conversionRatio: nextConverted / qty };
}

const DDT_ONLY_COLUMNS = new Set(["invoiceCode", "invoiceDate", "invoiceDueDate"]);
const INVOICE_ONLY_COLUMNS = new Set(["ddtCode", "ddtDate"]);

export class ProductImportColumnsFactory {
  public static create(source?: ProductImportSource): EditableColumn[] {
    const allColumns: EditableColumn[] = [
      {
        id: "name",
        title: "Nome prodotto",
        type: "text",
        required: true,
        width: "220px",
      },
      {
        id: "productNameExtracted",
        title: "Nome estratto",
        type: "text",
        width: "200px",
        readOnly: true,
        render: (value): ReactNode => {
          if (!value || value === "" || value === null || value === undefined) {
            return (
              <span className="text-muted-foreground italic text-xs">—</span>
            );
          }
          return (
            <span
              className="inline-block max-w-[200px] truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700"
              title={String(value)}
            >
              {String(value)}
            </span>
          );
        },
      },
      {
        id: "quantity",
        title: "Quantità",
        type: "number",
        required: true,
        width: "100px",
        onValueChange: recomputeOnQuantityChange,
      },
      {
        id: "unitOfMeasureQuantity",
        title: "Unità",
        type: "text",
        required: true,
        width: "80px",
      },
      {
        id: "quantityConverted",
        title: "Qtà conv.",
        type: "number",
        width: "120px",
        onValueChange: recomputeOnConvertedQuantityChange,
        render: (value, row): ReactNode => {
          const r = row as ProductImportPreviewRow | undefined;
          if (value == null || value === "") {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">
              {Number(value)} {r?.unitMeasureConverted ?? ""}
            </span>
          );
        },
      },
      {
        id: "unitMeasureConverted",
        title: "U.M. conv.",
        type: "text",
        width: "90px",
      },
      {
        id: "ddtCode",
        title: "Codice DDT",
        type: "text",
        width: "120px",
      },
      {
        id: "ddtDate",
        title: "Data DDT",
        type: "text",
        width: "120px",
        render: formatDate,
      },
      {
        id: "invoiceCode",
        title: "Codice Fattura",
        type: "text",
        width: "120px",
        render: (value): ReactNode => {
          if (!value || value === "" || value === null || value === undefined) {
            return <span className="text-muted-foreground">-</span>;
          }
          return <span>{String(value)}</span>;
        },
      },
      {
        id: "invoiceDate",
        title: "Data Fattura",
        type: "text",
        width: "120px",
        render: formatDate,
      },
      {
        id: "invoiceDueDate",
        title: "Scadenza Fattura",
        type: "text",
        width: "130px",
        render: formatDate,
      },
      {
        id: "price",
        title: "Prezzo",
        type: "number",
        width: "100px",
        render: (value): ReactNode => {
          if (value === null || value === undefined || value === "") {
            return <span className="text-muted-foreground">-</span>;
          }
          return <span>{Number(value).toFixed(2)}</span>;
        },
      },
      {
        id: "registrationNumber",
        title: "N. Registrazione",
        type: "text",
        width: "150px",
      },
      {
        id: "supplierName",
        title: "Fornitore",
        type: "text",
        width: "180px",
      },
    ];

    return allColumns.filter((column) => {
      if (source === "ddt" && DDT_ONLY_COLUMNS.has(column.id)) return false;
      if (source === "invoice" && INVOICE_ONLY_COLUMNS.has(column.id)) return false;
      return true;
    });
  }
}
