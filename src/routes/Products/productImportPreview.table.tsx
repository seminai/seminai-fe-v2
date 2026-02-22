import type { EditableColumn } from "@/components/organism/EditableTable";
import type { BulkProductPayload } from "@/api/products";
import type { ProductImportItem } from "./productImportPreview.types";
import type { ReactNode } from "react";

export interface ProductImportPreviewRow extends Record<string, unknown> {
  id: string;
  name: string;
  productNameExtracted?: string | null;
  sku: string;
  registrationNumber: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  quantityConverted?: number | null;
  unitMeasureConverted?: string | null;
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
  public static readonly fallbackCategory = "PHYTOSANITARY";
}

export class ProductImportRowBuilder {
  public static build(items: ProductImportItem[]): ProductImportPreviewRow[] {
    return items.map((item, index) => ({
      id: `${item.name}-${item.registrationNumber ?? "no-reg"}-${index}`,
      name: item.name,
      productNameExtracted: item.productNameExtracted ?? null,
      sku: item.sku ?? item.registrationNumber ?? item.name,
      registrationNumber: item.registrationNumber ?? "",
      quantity: item.quantity,
      unitOfMeasureQuantity:
        item.unitOfMeasureQuantity || ImportPreviewDefaults.quantityUnit,
      quantityConverted: item.quantityConverted ?? null,
      unitMeasureConverted: item.unitMeasureConverted ?? null,
      ddtCode: item.ddtCode ?? "",
      supplierName: item.supplierName ?? "",
      ddtDate:
        item.ddtDate ??
        item.invoiceDate ??
        new Date().toISOString().split("T")[0],
      invoiceDate: item.invoiceDate ?? undefined,
      barcode: item.barcode ?? undefined,
      category: item.category ?? ImportPreviewDefaults.fallbackCategory,
      type: item.type ?? undefined,
      description: item.description ?? undefined,
      price: item.price ?? undefined,
      unitOfMeasurePrice: item.unitOfMeasurePrice ?? undefined,
      supplierVat: item.supplierVat ?? undefined,
      addressSupplier: item.addressSupplier ?? undefined,
      invoiceCode: item.invoiceCode ?? undefined,
      invoiceDueDate: item.invoiceDueDate ?? undefined,
    }));
  }

  public static toBulkPayload(
    rows: ProductImportPreviewRow[],
    useConvertedIds?: Set<string>,
  ): BulkProductPayload[] {
    return rows.map((row) => {
      const useConverted = useConvertedIds?.has(row.id) ?? false;
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

export class ProductImportColumnsFactory {
  public static create(): EditableColumn[] {
    return [
      {
        id: "productNameExtracted",
        title: "Nome prodotto",
        type: "text",
        width: "220px",
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
      // {
      //   id: "sku",
      //   title: "SKU",
      //   type: "text",
      //   required: true,
      //   width: "120px",
      // },
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
  }
}
