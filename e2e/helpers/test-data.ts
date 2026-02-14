import path from "node:path";

const DATASET_DIR = path.resolve(process.cwd(), "public/datasets/e2e_test");

export const TEST_DATA = {
  credentials: {
    email: process.env.E2E_EMAIL ?? "",
    password: process.env.E2E_PASSWORD ?? "",
  },
  company: {
    name: `E2E Test Company ${Date.now()}`,
    vatNumber: "IT12345678901",
    fiscalCode: "TSTCMP80A01H501Z",
  },
  warehouse: {
    name: "Magazzino Test",
    nation: "Italia",
    region: "Emilia-Romagna",
    city: "Tredozio",
    address: "Via Roma 1",
    cap: "47019",
  },
  manualProduct: {
    name: "Prodotto Manuale E2E",
    sku: "SKU-E2E-001",
    categoryLabel: "Fitosanitario",
    quantity: "100",
    unitOfMeasure: "kg",
    type: "IN",
    price: "25",
  },
  files: {
    fieldsAndProductionUnitsCsv: path.join(DATASET_DIR, "fascicolo_aziendale.csv"),
    ddtPdf: path.join(DATASET_DIR, "ddt.pdf"),
    invoicePdf: path.join(DATASET_DIR, "fattura.pdf"),
    purchasedProductsExcel: path.join(DATASET_DIR, "prodotti_acquistati.xlsx"),
  },
} as const;

export type TestContext = {
  companyId?: string;
  companyName?: string;
  fieldIds: string[];
  productionUnitIds: string[];
  warehouseIds: string[];
  productIds: string[];
  importedCounts: {
    ddt: number;
    invoice: number;
    excel: number;
  };
};

export function createEmptyTestContext(): TestContext {
  return {
    fieldIds: [],
    productionUnitIds: [],
    warehouseIds: [],
    productIds: [],
    importedCounts: { ddt: 0, invoice: 0, excel: 0 },
  };
}
