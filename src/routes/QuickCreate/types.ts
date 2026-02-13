import type { EditableColumn } from "@/components/organism/EditableTable";

export type QuickCreateStep =
  | "company"
  | "fields"
  | "production-units"
  | "products"
  | "completion";

export const QUICK_CREATE_STEPS: Array<{
  key: QuickCreateStep;
  label: string;
}> = [
  { key: "company", label: "Azienda" },
  { key: "fields", label: "Campi" },
  { key: "production-units", label: "Unità Produttive" },
  { key: "products", label: "Prodotti" },
];

export const FIELDS_COLUMNS: EditableColumn[] = [
  {
    id: "name",
    title: "Nome Campo",
    type: "text",
    required: true,
    width: "200px",
  },
  { id: "city", title: "Città", type: "text", width: "150px" },
  { id: "foglio", title: "Foglio", type: "text", width: "80px" },
  { id: "particella", title: "Particella", type: "text", width: "100px" },
  { id: "sezione", title: "Sezione", type: "text", width: "80px" },
  { id: "subalterno", title: "Subalterno", type: "text", width: "100px" },
  { id: "uso", title: "Uso", type: "text", width: "150px" },
  {
    id: "superficieCatastaleMq",
    title: "Superficie (mq)",
    type: "number",
    width: "120px",
    render: (value: unknown) => {
      if (value === null || value === undefined) return "-";
      const num = typeof value === "number" ? value : Number(value);
      return isNaN(num) ? "-" : num.toLocaleString("it-IT");
    },
  },
  {
    id: "gisHa",
    title: "Superficie GIS (ha)",
    type: "number",
    width: "120px",
    render: (value: unknown) => {
      if (value === null || value === undefined) return "-";
      const num = typeof value === "number" ? value : Number(value);
      return isNaN(num)
        ? "-"
        : num.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          });
    },
  },
  {
    id: "sauHa",
    title: "SAU (ha)",
    type: "number",
    width: "100px",
    render: (value: unknown) => {
      if (value === null || value === undefined) return "-";
      const num = typeof value === "number" ? value : Number(value);
      return isNaN(num)
        ? "-"
        : num.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          });
    },
  },
  {
    id: "inizioConduzione",
    title: "Inizio Conduzione",
    type: "text",
    width: "130px",
  },
  {
    id: "fineConduzione",
    title: "Fine Conduzione",
    type: "text",
    width: "130px",
  },
  { id: "latitude", title: "Latitudine", type: "number", width: "100px" },
  { id: "longitude", title: "Longitudine", type: "number", width: "100px" },
];
