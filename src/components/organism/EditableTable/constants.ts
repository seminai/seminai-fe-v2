import {
  EditableColumn,
  FilterOperatorConfig,
  SearchableColumnMatch,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Column Visibility Constants
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_VISIBLE_COLUMNS = 8;
export const COLUMN_VISIBILITY_STORAGE_PREFIX = "editable-table-columns-";

// ─────────────────────────────────────────────────────────────────────────────
// Global Company Filter Constants
// ─────────────────────────────────────────────────────────────────────────────

export const GLOBAL_COMPANY_FILTER_STORAGE_KEY =
  "editable-table-global-company-filter";
export const GLOBAL_COMPANY_FILTER_COLUMN_ID = "companyName";
export const GLOBAL_COMPANY_FILTER_ROUTES = [
  "/job",
  "/fields",
  "/products",
  "/operations",
  "/company",
  "/production-unit",
  "/field-notes",
];

// ─────────────────────────────────────────────────────────────────────────────
// Date Format Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DATE_DISPLAY_FORMAT = "dd/MM/yyyy";
export const DATE_PLACEHOLDER_LABEL = "gg/mm/aaaa";

// ─────────────────────────────────────────────────────────────────────────────
// Filter Operators
// ─────────────────────────────────────────────────────────────────────────────

export const TEXT_FILTER_OPERATORS: FilterOperatorConfig[] = [
  { value: "contains", label: "Contiene", inputType: "text" },
  { value: "equals", label: "Uguale a", inputType: "text" },
  { value: "startsWith", label: "Inizia con", inputType: "text" },
  { value: "endsWith", label: "Termina con", inputType: "text" },
];

export const NUMBER_FILTER_OPERATORS: FilterOperatorConfig[] = [
  { value: "equals", label: "Uguale a", inputType: "number" },
  { value: "greaterThan", label: "Maggiore di", inputType: "number" },
  { value: "lessThan", label: "Minore di", inputType: "number" },
  {
    value: "between",
    label: "Compreso tra",
    inputType: "number",
    requiresSecondValue: true,
  },
];

export const DATE_FILTER_OPERATORS: FilterOperatorConfig[] = [
  { value: "on", label: "In data", inputType: "date" },
  { value: "before", label: "Prima di", inputType: "date" },
  { value: "after", label: "Dopo il", inputType: "date" },
  {
    value: "between",
    label: "Intervallo",
    inputType: "date",
    requiresSecondValue: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// System Date Columns
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_DATE_COLUMNS: EditableColumn[] = [
  { id: "createdAt", title: "Creato il", type: "date" },
  { id: "updatedAt", title: "Aggiornato il", type: "date" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Searchable Column Configurations
// ─────────────────────────────────────────────────────────────────────────────

export const SEARCHABLE_COLUMN_CONFIGS: SearchableColumnMatch[] = [
  {
    keywords: ["company", "companyname", "companies", "azienda", "aziende"],
    config: {
      label: "Ricerca aziende",
      placeholder: "Seleziona azienda",
      searchPlaceholder: "Cerca azienda...",
      emptyMessage: "Nessuna azienda trovata",
      noneOptionLabel: "Nessuna selezione",
    },
  },
  {
    keywords: [
      "productionunit",
      "productionunits",
      "unitaproduttiva",
      "unitaproduttive",
      "stabilimento",
      "stabilimenti",
    ],
    config: {
      label: "Ricerca unita produttive",
      placeholder: "Seleziona unita produttiva",
      searchPlaceholder: "Cerca unita produttiva...",
      emptyMessage: "Nessuna unita produttiva trovata",
      noneOptionLabel: "Nessuna selezione",
    },
  },
  {
    keywords: [
      "product",
      "products",
      "prodotto",
      "prodotti",
      "coltura",
      "colture",
    ],
    config: {
      label: "Ricerca prodotti",
      placeholder: "Seleziona prodotto",
      searchPlaceholder: "Cerca prodotto...",
      emptyMessage: "Nessun prodotto trovato",
      noneOptionLabel: "Nessuna selezione",
    },
  },
  {
    keywords: [
      "field",
      "fields",
      "campo",
      "campi",
      "appezzamento",
      "appezzamenti",
      "lotto",
      "lotti",
    ],
    config: {
      label: "Ricerca campi",
      placeholder: "Seleziona campo",
      searchPlaceholder: "Cerca campo...",
      emptyMessage: "Nessun campo trovato",
      noneOptionLabel: "Nessuna selezione",
    },
  },
  {
    keywords: ["city", "cities", "citta", "comune", "comuni", "municipality"],
    config: {
      label: "Ricerca citta",
      placeholder: "Seleziona citta",
      searchPlaceholder: "Cerca citta...",
      emptyMessage: "Nessuna citta trovata",
      noneOptionLabel: "Nessuna selezione",
    },
  },
];
