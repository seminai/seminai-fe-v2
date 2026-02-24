export type DosageWizardStep =
  | "company"
  | "units"
  | "products"
  | "configuration";

export interface DosageWizardStepConfig {
  key: DosageWizardStep;
  label: string;
}

export const DOSAGE_WIZARD_STEPS: DosageWizardStepConfig[] = [
  { key: "company", label: "Azienda" },
  { key: "units", label: "Unità Produttive" },
  { key: "products", label: "Prodotti" },
  { key: "configuration", label: "Configurazione" },
];
