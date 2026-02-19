import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export type StockEntry = {
  id: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  unitOfMeasurePrice?: string | null;
  price?: number | null;
  type: "IN" | "OUT";
  jobId: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  ddtCode?: string | null;
  ddtDate?: string | null;
  invoiceCode?: string | null;
  invoiceDate?: string | null;
  invoiceDueDate?: string | null;
  job: {
    id: string;
    isVerified: boolean;
    category?: string | null;
    dateOfOperation?: string | null;
    dateOfOpeation?: string | null;
    quantity?: number | null;
    unitOfMeasureQuantity?: string | null;
    productQuantityTreated?: number | null;
    unitOfMeasureProductQuantityTreated?: string | null;
    treatedSurface?: number | null;
    modeOfApplication?: string | null;
    avversity?: string | null;
    giustification?: string | null;
    isLocalizedTreatment?: boolean | null;
    note?: string | null;
    totalDistributedWaterL?: number | null;
    productionUnit?: {
      id: string;
      name: string;
      cropName?: string | null;
      cropType?: string | null;
      variety?: string | null;
      areaHa?: number | null;
      productionUnitsOnFields?: Array<{
        id: string;
        areaHaOnField?: number | null;
        field?: {
          id: string;
          name: string;
          coordinates?: [number, number];
          soilType?: string | null;
          nation?: string | null;
          region?: string | null;
          city?: string | null;
          address?: string | null;
          cap?: string | null;
        };
      }>;
    };
  } | null;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string;
  barcode?: string;
  administrativeStatus?: string | null;
  warehouseId: string;
  warehouse: {
    name: string;
    company: {
      id: string;
      name: string;
    };
  };
  stocks: StockEntry[];
};

export type GetProductsResponse = {
  status: "success" | string;
  data: {
    products: Product[];
  };
};

export type GetProductResponse = {
  status: "success" | string;
  data: {
    product: Product;
  };
};

export type CreateProductPayload = {
  companyId: string;
  warehouseId: string;
  name: string;
  sku: string;
  category?: string;
  type?: string;
  stock?: {
    quantity: number;
    unitOfMeasureQuantity: string;
    price?: number;
    unitOfMeasurePrice?: string;
    type?: "IN" | "OUT";
    ddtCode?: string;
    invoiceDate?: string;
    invoiceCode?: string;
    invoiceDueDate?: string;
    companySupplierName?: string;
    vatNumberSupplier?: string;
  };
};

export type CreateProductResponse = {
  status: "success" | string;
  data?: {
    product?: Product;
  };
};

export type UpdateProductPayload = {
  name?: string;
  description?: string;
  barcode?: string;
};

export type UpdateProductResponse = {
  status: "success" | string;
  data?: unknown;
};

export type BulkFromDdtEntry = {
  productName: string;
  registrationNumber?: string;
  productCategory?: string;
  quantity: number;
  quantityUnitOfMeasure: string;
  supplierName?: string;
  supplierVat?: string;
  ddtDate?: string;
  orderNumber?: string;
};

export type BulkFromDdtFileResult = {
  fileName?: string;
  entries: BulkFromDdtEntry[];
};

export type BulkFromDdtSuggestedProduct = {
  productName: string;
  registrationNumber?: string | null;
  productCategory?: string | null;
  quantity: number;
  quantityUnitOfMeasure: string;
  supplierName?: string | null;
  supplierVat?: string | null;
  ddtDate?: string | null;
  orderNumber?: string | null;
};

export type BulkFromDdtToProductListResponse = {
  status: "success" | string;
  data?: {
    totalFiles?: number;
    totalEntries?: number;
    results?: BulkFromDdtFileResult[];
    suggestedProducts?: BulkFromDdtSuggestedProduct[];
  };
};

export type InvoiceProduct = {
  productName: string;
  registrationNumber?: string | null;
  productCategory?: "PHYTOSANITARY" | "FERTILIZER" | "OTHER" | string | null;
  quantity: number | null;
  quantityUnitOfMeasure: string | null;
  supplierName?: string | null;
  supplierVat?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  invoiceDueDate?: string | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
};

export type InvoiceExtractionResponse = {
  status: "success" | string;
  data?: {
    suggestedProducts: InvoiceProduct[];
    totalEntries: number;
    filesProcessed: number;
  };
};

export type BulkProductStockPayload = {
  quantity: number;
  unitOfMeasureQuantity: string;
  price?: number;
  unitOfMeasurePrice?: string;
  type?: "IN" | "OUT";
  ddtCode?: string;
  ddtDate?: string;
  companySupplierName?: string;
  addressSupplier?: string;
  vatNumberSupplier?: string;
  invoiceCode?: string;
  invoiceDate?: string;
  invoiceDueDate?: string;
};

export type BulkProductPayload = {
  id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  type?: string;
  description?: string;
  registrationNumber?: string;
  labelUrl?: string;
  labelMetadata?: Record<string, unknown>;
  stock?: BulkProductStockPayload;
};

export type BulkImportProductsPayload = {
  companyId: string;
  warehouseId?: string;
  products: BulkProductPayload[];
};

export type BulkImportProductsResponse = {
  status: "success" | string;
  data?: {
    productsCreated?: number;
    productsUpdated?: number;
    stocksCreated?: number;
    imported?: number; // Legacy field for backward compatibility
    skipped?: number; // Legacy field for backward compatibility
    errors?: Array<{
      row?: number;
      message: string;
    }>;
  };
};

export type BulkDeleteProductsPayload = {
  companyId: string;
  ids: string[];
};

export type BulkDeleteProductsResponse = {
  status: "success" | string;
  data?: unknown;
};

export type ImportFromCsvExcelPayload = {
  file: File;
  companyId: string;
  warehouseId?: string;
};

export type ImportFromCsvExcelResponse = {
  status: "success" | string;
  data?: {
    imported?: number;
    skipped?: number;
    errors?: Array<{
      row?: number;
      message: string;
    }>;
  };
};

export type ImportFromCsvExcelPreviewProduct = {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  type?: string | null;
  description?: string | null;
  registrationNumber?: string | null;
  stock?: {
    quantity?: number | null;
    unitOfMeasureQuantity?: string | null;
    price?: number | null;
    unitOfMeasurePrice?: string | null;
    type?: "IN" | "OUT" | string | null;
    ddtCode?: string | null;
    ddtDate?: string | null;
    invoiceCode?: string | null;
    invoiceDate?: string | null;
    invoiceDueDate?: string | null;
    companySupplierName?: string | null;
    addressSupplier?: string | null;
    vatNumberSupplier?: string | null;
  };
};

export type ImportFromCsvExcelPreviewResponse = {
  status: "success" | string;
  data?: {
    products?: ImportFromCsvExcelPreviewProduct[];
    errors?: Array<{
      row?: number;
      message: string;
    }>;
  };
};

export type UpdateAdministrativeStatusResponse = {
  status: "success" | string;
  data: {
    productsUpdated: number;
    totalProductsWithRegistration: number;
  };
};

export type VerifiedPhytosanitaryProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  type: string;
  description: string | null;
  administrativeStatus: string;
  registrationNumber: string;
  labelUrl: string | null;
  labelMetadata: Record<string, unknown> | null;
  warehouseId: string;
  createdAt: string;
  updatedAt: string;
  stocks: Array<{
    id: string;
    quantity: number;
    type: "IN" | "OUT";
    unitOfMeasureQuantity: string;
    createdAt: string;
  }>;
  warehouse: {
    name: string;
    company: {
      id: string;
      name: string;
    };
  };
};

export type GetVerifiedPhytosanitaryResponse = {
  status: "success" | "error";
  message?: string;
  data?: {
    products: VerifiedPhytosanitaryProduct[];
    totalProducts: number;
    verifiedProducts: number;
    revokedProducts: number;
  };
};

export async function createProduct(
  payload: CreateProductPayload,
  baseUrl: string = BASE_URL,
): Promise<CreateProductResponse> {
  if (!payload?.companyId) {
    throw new Error("Company identifier is required");
  }
  if (!payload?.name) {
    throw new Error("Product name is required");
  }

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Create product failed");
  }

  return (await response.json()) as CreateProductResponse;
}

export async function getProducts(
  companyName?: string,
  baseUrl: string = BASE_URL,
): Promise<GetProductsResponse> {
  const url = new URL(`${baseUrl}/products/me`);
  if (companyName) {
    url.searchParams.set("companyName", companyName);
  }

  const response = await authenticatedHttpClient.request(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Get products failed");
  }

  return (await response.json()) as GetProductsResponse;
}

export async function getProduct(
  productId: string,
  baseUrl: string = BASE_URL,
): Promise<GetProductResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products/${encodeURIComponent(productId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Get product failed");
  }

  return (await response.json()) as GetProductResponse;
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload,
  baseUrl: string = BASE_URL,
): Promise<UpdateProductResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products/${encodeURIComponent(productId)}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Update product failed");
  }

  return (await response.json()) as UpdateProductResponse;
}

export async function importProductsFromDdt(
  files: File[],
  baseUrl: string = BASE_URL,
): Promise<BulkFromDdtToProductListResponse> {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("At least one DDT file is required to import products");
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products/bulk-from-ddt-to-product-list`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Bulk DDT import failed");
  }

  return (await response.json()) as BulkFromDdtToProductListResponse;
}

export async function importProductsFromInvoice(
  files: File[],
  baseUrl: string = BASE_URL,
): Promise<InvoiceExtractionResponse> {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("At least one invoice file is required");
  }

  if (files.length > 10) {
    throw new Error("Maximum 10 files per request");
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products/bulk-from-invoice-to-product-list`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Invoice extraction failed");
  }

  return (await response.json()) as InvoiceExtractionResponse;
}

export async function bulkImportProducts(
  payload: BulkImportProductsPayload,
  baseUrl: string = BASE_URL,
): Promise<BulkImportProductsResponse> {
  if (!payload?.companyId) {
    throw new Error("Company identifier is required");
  }

  if (!Array.isArray(payload.products) || payload.products.length === 0) {
    throw new Error("At least one product is required for the bulk import");
  }

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products/create-or-update-bulk`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Bulk import failed");
  }

  return (await response.json()) as BulkImportProductsResponse;
}

export async function bulkDeleteProducts(
  payload: BulkDeleteProductsPayload,
  baseUrl: string = BASE_URL,
): Promise<BulkDeleteProductsResponse> {
  if (!payload?.companyId) {
    throw new Error("Company identifier is required");
  }

  if (!Array.isArray(payload.ids) || payload.ids.length === 0) {
    throw new Error("At least one product ID is required for bulk delete");
  }

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products/bulk`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Bulk delete failed");
  }

  // Gestisci risposte vuote (204 No Content o body vuoto)
  const contentType = response.headers.get("content-type");
  const contentLength = response.headers.get("content-length");

  if (
    response.status === 204 ||
    contentLength === "0" ||
    !contentType?.includes("application/json")
  ) {
    return {
      status: "success",
    } as BulkDeleteProductsResponse;
  }

  // Prova a leggere il body come testo per verificare se è vuoto
  const text = await response.text();
  if (!text || text.trim() === "") {
    return {
      status: "success",
    } as BulkDeleteProductsResponse;
  }

  try {
    return JSON.parse(text) as BulkDeleteProductsResponse;
  } catch {
    // Se il parsing fallisce, restituisci una risposta di successo di default
    return {
      status: "success",
    } as BulkDeleteProductsResponse;
  }
}

export async function importFromCsvExcel(
  payload: ImportFromCsvExcelPayload,
  baseUrl: string = BASE_URL,
): Promise<ImportFromCsvExcelResponse> {
  if (!payload?.companyId) {
    throw new Error("Company identifier is required");
  }

  if (!payload?.file) {
    throw new Error("File is required");
  }

  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("companyId", payload.companyId);

  if (payload.warehouseId) {
    formData.append("warehouseId", payload.warehouseId);
  }

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products/import-from-csv-excel`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Import from CSV/Excel failed");
  }

  return (await response.json()) as ImportFromCsvExcelResponse;
}

export async function importFromCsvExcelPreview(
  payload: ImportFromCsvExcelPayload,
  baseUrl: string = BASE_URL,
): Promise<ImportFromCsvExcelPreviewResponse> {
  if (!payload?.companyId) {
    throw new Error("Company identifier is required");
  }

  if (!payload?.file) {
    throw new Error("File is required");
  }

  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("companyId", payload.companyId);

  if (payload.warehouseId) {
    formData.append("warehouseId", payload.warehouseId);
  }

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products/import-from-csv-excel?preview=true`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "CSV/Excel preview failed");
  }

  return (await response.json()) as ImportFromCsvExcelPreviewResponse;
}

export async function updateAdministrativeStatus(
  baseUrl: string = BASE_URL,
): Promise<UpdateAdministrativeStatusResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/products/update-administrative-status`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Update administrative status failed");
  }

  return (await response.json()) as UpdateAdministrativeStatusResponse;
}

export async function getVerifiedPhytosanitary(
  companyId: string,
  baseUrl: string = BASE_URL,
): Promise<GetVerifiedPhytosanitaryResponse> {
  if (!companyId) {
    throw new Error("Company identifier is required");
  }

  const url = new URL(`${baseUrl}/products/verified-phytosanitary`);
  url.searchParams.set("companyId", companyId);

  const response = await authenticatedHttpClient.request(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Get verified phytosanitary products failed");
  }

  return (await response.json()) as GetVerifiedPhytosanitaryResponse;
}

class ProductsApiService {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async create(
    payload: CreateProductPayload,
  ): Promise<CreateProductResponse> {
    return await createProduct(payload, this.baseUrl);
  }

  public async getAll(companyName?: string): Promise<GetProductsResponse> {
    return await getProducts(companyName, this.baseUrl);
  }

  public async getById(productId: string): Promise<GetProductResponse> {
    return await getProduct(productId, this.baseUrl);
  }

  public async update(
    productId: string,
    payload: UpdateProductPayload,
  ): Promise<UpdateProductResponse> {
    return await updateProduct(productId, payload, this.baseUrl);
  }

  public async importFromDdt(
    files: File[],
  ): Promise<BulkFromDdtToProductListResponse> {
    return await importProductsFromDdt(files, this.baseUrl);
  }

  public async importFromInvoice(
    files: File[],
  ): Promise<InvoiceExtractionResponse> {
    return await importProductsFromInvoice(files, this.baseUrl);
  }

  public async bulkImport(
    payload: BulkImportProductsPayload,
  ): Promise<BulkImportProductsResponse> {
    return await bulkImportProducts(payload, this.baseUrl);
  }

  public async bulkDelete(
    payload: BulkDeleteProductsPayload,
  ): Promise<BulkDeleteProductsResponse> {
    return await bulkDeleteProducts(payload, this.baseUrl);
  }

  public async importFromCsvExcel(
    payload: ImportFromCsvExcelPayload,
  ): Promise<ImportFromCsvExcelResponse> {
    return await importFromCsvExcel(payload, this.baseUrl);
  }

  public async importFromCsvExcelPreview(
    payload: ImportFromCsvExcelPayload,
  ): Promise<ImportFromCsvExcelPreviewResponse> {
    return await importFromCsvExcelPreview(payload, this.baseUrl);
  }

  public async updateAdministrativeStatus(): Promise<UpdateAdministrativeStatusResponse> {
    return await updateAdministrativeStatus(this.baseUrl);
  }

  public async getVerifiedPhytosanitary(
    companyId: string,
  ): Promise<GetVerifiedPhytosanitaryResponse> {
    return await getVerifiedPhytosanitary(companyId, this.baseUrl);
  }

  public async downloadTemplate(): Promise<void> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/products/template`,
      {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      },
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Download template failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const productsApiService = new ProductsApiService(BASE_URL);
