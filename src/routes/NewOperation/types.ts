import type { DosageStrategy } from "@/api/dosage-agent";

export type OperationMode = "manual" | "automatic";

export type NewOperationStep = "company" | "mode" | "table";

export interface UnifiedProductRow {
  _internalId: string;

  // Col 1: Data operazione (editabile in manuale, bloccata in automatico)
  dateOfOperation: string;

  // Col 2: Unità produttive selezionate per questa riga
  selectedUnitIds: string[];

  // Col 3: Prodotto
  productName: string;
  registrationNumber: string;

  // Col 4: Quantità totale
  quantity: number;

  // Col 5: Unità misura
  unitOfMeasure: string;

  // Col 6: Dose per ettaro
  dosePerHa: number | null;

  // Col 7: Superficie trattata (calcolata dalle unità selezionate)
  treatedSurfaceHa: number;

  // Col 8: Giacenza (da magazzino, se disponibile)
  availableStock: number | null;
  stockUnit: string | null;

  // Col 9 (solo automatico): Strategia per-prodotto
  strategy: DosageStrategy | null;

  // Metadata
  source: "registry" | "warehouse" | "csv" | "ddt" | "notes" | "manual";
  loadWarehouse: boolean;
  supplierName?: string;
  supplierVat?: string;
  ddtDate?: string;
  orderNumber?: string;
  sku?: string;
}

export const UNIT_MEASURE_OPTIONS = ["L", "KG", "ML", "G"] as const;

export const STRATEGY_DEFAULT_VALUE = "__default__";

export const STRATEGY_OPTIONS: Array<{
  value: string;
  label: string;
}> = [
  { value: STRATEGY_DEFAULT_VALUE, label: "Default globale" },
  { value: "current", label: "Dose Corrente" },
  { value: "max", label: "Dose Massima" },
  { value: "min", label: "Dose Minima" },
  { value: "avg", label: "Dose Media" },
];
