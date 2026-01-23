import type { EditableColumn } from "@/components/organism/EditableTable";
import type { BulkProductPayload } from "@/api/products";
import type { ProductImportItem } from "./productImportPreview.types";
import type { ReactNode } from "react";

export interface ProductImportPreviewRow extends Record<string, unknown> {
  id: string;
  name: string;
  sku: string;
  registrationNumber: string;
  quantity: number;
  unitOfMeasureQuantity: string;
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
      sku: item.sku ?? item.registrationNumber ?? item.name,
      registrationNumber: item.registrationNumber ?? "",
      quantity: item.quantity,
      unitOfMeasureQuantity:
        item.unitOfMeasureQuantity || ImportPreviewDefaults.quantityUnit,
      ddtCode: item.ddtCode ?? "",
      supplierName: item.supplierName ?? "",
      ddtDate:
        item.ddtDate ?? item.invoiceDate ?? new Date().toISOString().split("T")[0],
      invoiceDate: item.invoiceDate ?? undefined,
      barcode: item.barcode ?? undefined,
      category:
        item.category ?? ImportPreviewDefaults.fallbackCategory,
      type: item.type ?? undefined,
      description: item.description ?? undefined,
      price: item.price ?? undefined,
      unitOfMeasurePrice: item.unitOfMeasurePrice ?? undefined,
      supplierVat: item.supplierVat ?? undefined,
      addressSupplier: item.addressSupplier ?? undefined,
      invoiceCode: item.invoiceCode ?? undefined,
    }));
  }

  public static toBulkPayload(rows: ProductImportPreviewRow[]): BulkProductPayload[] {
    return rows.map((row) => ({
      name: row.name,
      sku: row.sku || row.registrationNumber || row.name,
      barcode: row.barcode || undefined,
      category: row.category || undefined,
      type: row.type || undefined,
      description: row.description || undefined,
      registrationNumber: row.registrationNumber || undefined,
      stock: {
        quantity: row.quantity,
        unitOfMeasureQuantity: row.unitOfMeasureQuantity,
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
      },
    }));
  }
}

export class ProductImportColumnsFactory {
  public static create(): EditableColumn[] {
    return [
      {
        id: "name",
        title: "Nome Prodotto",
        type: "text",
        required: true,
        width: "200px",
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
        render: (value): ReactNode => {
          if (!value || value === "" || value === null || value === undefined) {
            return <span className="text-muted-foreground">-</span>;
          }
          try {
            const date = new Date(value as string);
            if (isNaN(date.getTime())) {
              return <span>{String(value)}</span>;
            }
            return <span>{date.toLocaleDateString("it-IT")}</span>;
          } catch {
            return <span>{String(value)}</span>;
          }
        },
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
        render: (value): ReactNode => {
          if (!value || value === "" || value === null || value === undefined) {
            return <span className="text-muted-foreground">-</span>;
          }
          try {
            const date = new Date(value as string);
            if (isNaN(date.getTime())) {
              return <span>{String(value)}</span>;
            }
            return <span>{date.toLocaleDateString("it-IT")}</span>;
          } catch {
            return <span>{String(value)}</span>;
          }
        },
      },
      {
        id: "sku",
        title: "SKU",
        type: "text",
        required: true,
        width: "120px",
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
  }
}
