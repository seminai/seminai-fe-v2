import { toast } from "sonner";
import { Package, Sprout, User, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type JobHistoryEntry,
  type JobStandardHistoryEntry,
  type JobModificationEntry,
  type JobModificationChange,
  isJobModificationEntry,
} from "@/api/jobs";
import { useProductionUnit } from "@/hooks/useProductionUnit";

export class HistoryEntryFormatter {
  private static readonly STEP_LABELS: Record<string, string> = {
    crop_matching: "Matching Coltura",
    dosage_scheduling: "Pianificazione Dosaggio",
    dosage_optimization: "Ottimizzazione Dosaggio",
    job_creation: "Creazione Job",
    user_modification: "Modifiche Utente",
  };

  private static readonly SOURCE_COLORS: Record<string, string> = {
    crop_taxonomy: "bg-emerald-100 text-emerald-700",
    label_extraction: "bg-blue-100 text-blue-700",
    user_input: "bg-green-100 text-green-700",
    llm_openai: "bg-purple-100 text-purple-700",
    linear_programming: "bg-amber-100 text-amber-700",
    automatic_calculation: "bg-cyan-100 text-cyan-700",
    warehouse_stock: "bg-orange-100 text-orange-700",
    user_modification: "bg-indigo-100 text-indigo-700",
  };

  private static readonly SOURCE_LABELS: Record<string, string> = {
    crop_taxonomy: "Tassonomia",
    label_extraction: "Etichetta",
    user_input: "Input Utente",
    llm_openai: "AI",
    linear_programming: "Ottimizzazione",
    automatic_calculation: "Calcolo Auto",
    warehouse_stock: "Magazzino",
    user_modification: "Modifica Utente",
  };

  // Mapping dei nomi dei campi in italiano
  private static readonly FIELD_LABELS: Record<string, string> = {
    quantity: "Quantità",
    note: "Note",
    dateOfOpeation: "Data Operazione",
    isVerified: "Stato Verifica",
    conformityChecked: "Conformità Verificata",
    machineId: "Macchina",
    machineName: "Nome Macchina",
    treatedSurface: "Superficie Trattata",
    modeOfApplication: "Modalità Applicazione",
    avversity: "Avversità",
    category: "Categoria",
    unitOfMeasureQuantity: "Unità di Misura",
    productionUnitId: "Unità Produttiva",
    productName: "Nome Prodotto",
    productRegistrationNumber: "Numero Registrazione",
  };

  public static formatStep(step: string): string {
    return this.STEP_LABELS[step] ?? step;
  }

  public static getSourceColor(source: string): string {
    return this.SOURCE_COLORS[source] ?? "bg-gray-100 text-gray-700";
  }

  public static formatSource(source: string): string {
    return this.SOURCE_LABELS[source] ?? source;
  }

  public static formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString("it-IT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  public static formatFieldName(field: string): string {
    return this.FIELD_LABELS[field] ?? field;
  }

  public static formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "boolean") {
      return value ? "Sì" : "No";
    }
    if (value instanceof Date) {
      return value.toLocaleDateString("it-IT");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

// Props per entry standard
interface StandardHistoryEntryDetailsProps {
  entry: JobStandardHistoryEntry;
  productionUnits?: Array<{
    productionUnit: { id: string; name: string };
  }>;
  variant?: "compact" | "default";
  onProductClick?: (productName: string, registrationNumber?: string) => void;
}

// Componente per visualizzare i dettagli di un'entry standard
function StandardHistoryEntryDetails({
  entry,
  productionUnits = [],
  variant = "compact",
  onProductClick,
}: StandardHistoryEntryDetailsProps) {
  const { productionUnits: availableProductionUnits } = useProductionUnit();
  const metadata = entry.metadata;
  if (!metadata) return null;

  const resolvedProductionUnits =
    productionUnits.length > 0 ? productionUnits : availableProductionUnits;

  const productionUnit = metadata.productionUnitId
    ? resolvedProductionUnits.find(
        (pu) => pu.productionUnit.id === metadata.productionUnitId
      )
    : null;

  const productionUnitName =
    metadata.productionUnitName || productionUnit?.productionUnit.name || null;

  const hasProductInfo =
    metadata.productName || metadata.productRegistrationNumber;
  const hasProductionUnitInfo = productionUnitName || metadata.productionUnitId;

  if (!hasProductInfo && !hasProductionUnitInfo) return null;

  const isCompact = variant === "compact";
  const textSize = isCompact ? "text-[10px]" : "text-xs";
  const iconSize = isCompact ? "h-3 w-3" : "h-3.5 w-3.5";
  const spacing = isCompact ? "mt-1.5 space-y-1" : "mt-2 space-y-1.5";

  return (
    <div className={cn(spacing, textSize, "text-slate-500")}>
      {hasProductInfo && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Package className={cn(iconSize, "shrink-0")} />
          <span className="font-medium text-slate-600">Prodotto:</span>
          {metadata.productName && (
            <button
              className="text-slate-700 hover:text-slate-900 hover:underline font-medium"
              onClick={() => {
                if (onProductClick) {
                  onProductClick(
                    metadata.productName!,
                    metadata.productRegistrationNumber
                  );
                } else {
                  const details = [];
                  details.push(metadata.productName!);
                  if (metadata.productRegistrationNumber) {
                    details.push(`Reg. ${metadata.productRegistrationNumber}`);
                  }
                  toast.info("Prodotto", {
                    description: details.join(" | "),
                  });
                }
              }}
            >
              {metadata.productName}
            </button>
          )}
          {metadata.productRegistrationNumber && (
            <>
              {metadata.productName && (
                <span className="text-slate-400">•</span>
              )}
              <button
                className="text-slate-600 hover:text-slate-800 hover:underline font-mono"
                onClick={() => {
                  if (onProductClick && metadata.productName) {
                    onProductClick(
                      metadata.productName,
                      metadata.productRegistrationNumber
                    );
                  } else {
                    toast.info("Numero Registrazione", {
                      description: metadata.productRegistrationNumber,
                    });
                  }
                }}
              >
                Reg. {metadata.productRegistrationNumber}
              </button>
            </>
          )}
        </div>
      )}
      {hasProductionUnitInfo && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Sprout className={cn(iconSize, "shrink-0")} />
          <span className="font-medium text-slate-600">Unità Produttiva:</span>
          {productionUnitName && (
            <button
              className="text-slate-700 hover:text-slate-900 hover:underline font-medium"
              onClick={() => {
                const details = [];
                details.push(productionUnitName);
                if (metadata.cropName)
                  details.push(`Coltura: ${metadata.cropName}`);
                if (metadata.variety)
                  details.push(`Varietà: ${metadata.variety}`);
                if (metadata.areaHa)
                  details.push(`Superficie: ${metadata.areaHa} ha`);
                if (metadata.productionUnitId)
                  details.push(`ID: ${metadata.productionUnitId}`);

                toast.info("Unità Produttiva", {
                  description: details.join(" | "),
                });
              }}
            >
              {productionUnitName}
            </button>
          )}
          {metadata.productionUnitId && !productionUnitName && (
            <button
              className="text-slate-600 hover:text-slate-800 hover:underline font-mono"
              onClick={() => {
                toast.info("ID Unità Produttiva", {
                  description: metadata.productionUnitId,
                });
              }}
            >
              {metadata.productionUnitId.substring(0, 8)}...
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Props per visualizzare una singola modifica
interface ModificationChangeDisplayProps {
  change: JobModificationChange;
  variant?: "compact" | "default";
}

// Componente per visualizzare una singola modifica
function ModificationChangeDisplay({
  change,
  variant = "compact",
}: ModificationChangeDisplayProps) {
  const isCompact = variant === "compact";
  const textSize = isCompact ? "text-[10px]" : "text-xs";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 flex-wrap py-1 px-2 rounded bg-slate-50",
        textSize
      )}
    >
      <span className="font-medium text-slate-600">
        {HistoryEntryFormatter.formatFieldName(change.field)}:
      </span>
      <span className="text-slate-400 line-through">
        {HistoryEntryFormatter.formatValue(change.oldValue)}
      </span>
      <ArrowRight className="h-3 w-3 text-slate-400" />
      <span className="text-slate-700 font-medium">
        {HistoryEntryFormatter.formatValue(change.newValue)}
      </span>
    </div>
  );
}

// Props per entry di modifica utente
interface ModificationEntryDetailsProps {
  entry: JobModificationEntry;
  variant?: "compact" | "default";
}

// Componente per visualizzare i dettagli di una modifica utente
export function ModificationEntryDetails({
  entry,
  variant = "compact",
}: ModificationEntryDetailsProps) {
  const isCompact = variant === "compact";
  const textSize = isCompact ? "text-[10px]" : "text-xs";
  const iconSize = isCompact ? "h-3 w-3" : "h-3.5 w-3.5";
  const spacing = isCompact ? "mt-1.5 space-y-1.5" : "mt-2 space-y-2";

  return (
    <div className={cn(spacing, textSize, "text-slate-500")}>
      {/* Info utente che ha effettuato la modifica */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <User className={cn(iconSize, "shrink-0 text-indigo-500")} />
        <span className="font-medium text-slate-600">Modificato da:</span>
        <button
          className="text-slate-700 hover:text-slate-900 font-medium"
          onClick={() => {
            toast.info("Utente", {
              description: `${entry.modifiedBy.name} (${entry.modifiedBy.email})`,
            });
          }}
        >
          {entry.modifiedBy.name}
        </button>
      </div>

      {/* Lista delle modifiche */}
      {entry.changes.length > 0 && (
        <div className="space-y-1">
          <span className="font-medium text-slate-600 text-[10px] uppercase tracking-wide">
            Modifiche:
          </span>
          <div className="space-y-1">
            {entry.changes.map((change, idx) => (
              <ModificationChangeDisplay
                key={`${change.field}-${idx}`}
                change={change}
                variant={variant}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Props generiche per HistoryEntryDetails
interface HistoryEntryDetailsProps {
  entry: JobHistoryEntry;
  productionUnits?: Array<{
    productionUnit: { id: string; name: string };
  }>;
  variant?: "compact" | "default";
  onProductClick?: (productName: string, registrationNumber?: string) => void;
}

// Componente principale che gestisce entrambi i tipi di entry
export function HistoryEntryDetails({
  entry,
  productionUnits = [],
  variant = "compact",
  onProductClick,
}: HistoryEntryDetailsProps) {
  // Se è una modifica utente, usa il componente dedicato
  if (isJobModificationEntry(entry)) {
    return <ModificationEntryDetails entry={entry} variant={variant} />;
  }

  // Altrimenti usa il componente standard
  return (
    <StandardHistoryEntryDetails
      entry={entry}
      productionUnits={productionUnits}
      variant={variant}
      onProductClick={onProductClick}
    />
  );
}

export default HistoryEntryDetails;

