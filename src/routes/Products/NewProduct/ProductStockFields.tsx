import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StockFormData } from "./ManualProductForm";

const UNIT_OF_MEASURE_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "L", label: "L (litri)" },
  { value: "g", label: "g (grammi)" },
  { value: "mL", label: "mL (millilitri)" },
  { value: "pz", label: "pz (pezzi)" },
  { value: "t", label: "t (tonnellate)" },
];

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
];

interface ProductStockFieldsProps {
  stockData: StockFormData;
  onStockChange: (field: keyof StockFormData, value: string) => void;
  /** When true, movement is required (e.g. add stock to existing product) */
  required?: boolean;
  /** When false, hide section title/description (e.g. when used in a list of movements) */
  showTitle?: boolean;
}

export default function ProductStockFields({
  stockData,
  onStockChange,
  required = false,
  showTitle = true,
}: ProductStockFieldsProps) {
  return (
    <section className="space-y-4">
      {showTitle && (
        <div>
          <h4 className="text-base font-semibold border-b pb-2">
            Movimento di stock {required ? "" : "(opzionale)"}
          </h4>
          <p className="text-sm text-muted-foreground mt-2">
            {required
              ? "Inserisci i dati del movimento di stock da aggiungere al prodotto."
              : "Se vuoi registrare un carico iniziale, compila i campi seguenti."}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Quantità</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={stockData.quantity}
            onChange={(e) => onStockChange("quantity", e.target.value)}
            placeholder="0 (es. 1,5)"
          />
        </div>
        <div className="space-y-2">
          <Label>Unità di misura</Label>
          <Select
            value={stockData.unitOfMeasureQuantity}
            onValueChange={(v) => onStockChange("unitOfMeasureQuantity", v)}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OF_MEASURE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipo movimento</Label>
          <Select
            value={stockData.type}
            onValueChange={(v) => onStockChange("type", v as "IN" | "OUT")}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN">Carico (IN)</SelectItem>
              <SelectItem value="OUT">Scarico (OUT)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            {stockData.type === "IN" ? "Prezzo acquisto" : "Prezzo vendita"}
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            value={stockData.price}
            onChange={(e) => onStockChange("price", e.target.value)}
            placeholder="0,00 (es. 1,5)"
          />
        </div>
        <div className="space-y-2">
          <Label>Valuta</Label>
          <Select
            value={stockData.unitOfMeasurePrice}
            onValueChange={(v) => onStockChange("unitOfMeasurePrice", v)}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Codice DDT</Label>
          <Input
            value={stockData.ddtCode}
            onChange={(e) => onStockChange("ddtCode", e.target.value)}
            placeholder="Es. DDT-2025-001"
          />
        </div>
        <div className="space-y-2">
          <Label>Data fattura</Label>
          <Input
            type="date"
            value={stockData.invoiceDate}
            onChange={(e) => onStockChange("invoiceDate", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Codice fattura</Label>
          <Input
            value={stockData.invoiceCode}
            onChange={(e) => onStockChange("invoiceCode", e.target.value)}
            placeholder="Es. FATT-001"
          />
        </div>
        <div className="space-y-2">
          <Label>Scadenza fattura</Label>
          <Input
            type="date"
            value={stockData.invoiceDueDate}
            onChange={(e) => onStockChange("invoiceDueDate", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome fornitore</Label>
          <Input
            value={stockData.companySupplierName}
            onChange={(e) =>
              onStockChange("companySupplierName", e.target.value)
            }
            placeholder="Es. Fornitore S.r.l."
          />
        </div>
        <div className="space-y-2">
          <Label>P.IVA fornitore</Label>
          <Input
            value={stockData.vatNumberSupplier}
            onChange={(e) => onStockChange("vatNumberSupplier", e.target.value)}
            placeholder="Es. IT12345678901"
          />
        </div>
      </div>
    </section>
  );
}
