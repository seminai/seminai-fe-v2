export type ProductImportSource = "ddt" | "csv" | "excel";

export type ImportPreviewError = {
  row?: number;
  message: string;
};

export type ProductImportItem = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  type?: string | null;
  description?: string | null;
  registrationNumber?: string | null;
  quantity: number;
  unitOfMeasureQuantity: string;
  price?: number | null;
  unitOfMeasurePrice?: string | null;
  ddtCode?: string | null;
  ddtDate?: string | null;
  invoiceCode?: string | null;
  invoiceDate?: string | null;
  supplierName?: string | null;
  supplierVat?: string | null;
  addressSupplier?: string | null;
};
