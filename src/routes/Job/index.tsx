import { useState, useMemo, useEffect } from "react";
import { useJobs } from "@/hooks/useJobs";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLabelsSummary } from "@/hooks/useLabelsSummary";
import { useLabel } from "@/hooks/useLabel";
import { PageHeader } from "@/components/organism/Header";
import { userSettingsIndexDBManager } from "@/utils/userSettingsIndexDBManager";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";

import { toast } from "sonner";
import {
  jobsApiService,
  type JobWithRelations,
  type Product,
  type JobHistoryEntry,
} from "@/api/jobs";
import { stocksApiService, type CreateStockPayload } from "@/api/stocks";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History,
  ListChecks,
  ClipboardCheck,
  Building2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Package,
  Sprout,
  FileText,
  Search,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Component to display job history in a Sheet
interface JobHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: JobHistoryEntry[];
  jobCode: string;
  onProductClick?: (productName: string, registrationNumber?: string) => void;
}

class HistoryEntryFormatter {
  private static readonly STEP_LABELS: Record<string, string> = {
    crop_matching: "Matching Coltura",
    dosage_scheduling: "Pianificazione Dosaggio",
    dosage_optimization: "Ottimizzazione Dosaggio",
    job_creation: "Creazione Job",
  };

  private static readonly SOURCE_COLORS: Record<string, string> = {
    crop_taxonomy: "bg-emerald-100 text-emerald-700",
    label_extraction: "bg-blue-100 text-blue-700",
    user_input: "bg-green-100 text-green-700",
    llm_openai: "bg-purple-100 text-purple-700",
    linear_programming: "bg-amber-100 text-amber-700",
    automatic_calculation: "bg-cyan-100 text-cyan-700",
    warehouse_stock: "bg-orange-100 text-orange-700",
  };

  private static readonly SOURCE_LABELS: Record<string, string> = {
    crop_taxonomy: "Tassonomia",
    label_extraction: "Etichetta",
    user_input: "Input Utente",
    llm_openai: "AI",
    linear_programming: "Ottimizzazione",
    automatic_calculation: "Calcolo Auto",
    warehouse_stock: "Magazzino",
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
}

function JobHistorySheet({
  open,
  onOpenChange,
  history,
  jobCode,
  onProductClick,
}: JobHistorySheetProps) {
  const { productionUnits } = useProductionUnit();

  const groupedHistory = useMemo(() => {
    const groups: Record<string, JobHistoryEntry[]> = {};
    history.forEach((entry) => {
      if (!groups[entry.step]) {
        groups[entry.step] = [];
      }
      groups[entry.step].push(entry);
    });
    return groups;
  }, [history]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-white flex flex-col h-full"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Storico Operazione
          </SheetTitle>
          <SheetDescription>
            Codice:{" "}
            <Badge variant="outline" className="ml-1">
              {jobCode}
            </Badge>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 p-2">
          <div className="space-y-6 pb-6">
            {Object.entries(groupedHistory).map(([step, entries]) => (
              <div key={step} className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                  {HistoryEntryFormatter.formatStep(step)}
                </h3>
                <div className="space-y-2 pl-2">
                  {entries.map((entry, idx) => (
                    <div
                      key={`${step}-${idx}`}
                      className="flex flex-col gap-1.5 py-3 border-l-2 border-muted pl-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-foreground leading-tight">
                          {entry.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs shrink-0 ${HistoryEntryFormatter.getSourceColor(
                            entry.source
                          )}`}
                        >
                          {HistoryEntryFormatter.formatSource(entry.source)}
                        </Badge>
                      </div>
                      <span className="text-sm text-foreground/80 font-medium">
                        {String(entry.value)}
                      </span>
                      {entry.metadata?.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {entry.metadata.description}
                        </p>
                      )}
                      <HistoryEntryDetails
                        entry={entry}
                        productionUnits={productionUnits}
                        variant="default"
                        onProductClick={onProductClick}
                      />
                      <span className="text-xs text-muted-foreground/60">
                        {HistoryEntryFormatter.formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nessuno storico disponibile per questa operazione.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Componente per mostrare i dettagli dell'etichetta in un Sheet
interface LabelDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelId: string | null;
}

function LabelDetailSheet({
  open,
  onOpenChange,
  labelId,
}: LabelDetailSheetProps) {
  const { detail, isLoading, error } = useLabel({
    id: labelId ?? "",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-white flex flex-col h-full overflow-hidden"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dettagli Etichetta
          </SheetTitle>
          <SheetDescription>
            {detail?.productName && (
              <div className="mt-2">
                <Badge variant="outline" className="mr-2">
                  {detail.productName}
                </Badge>
                {detail.registrationNumber && (
                  <Badge variant="outline" className="font-mono">
                    Reg. {detail.registrationNumber}
                  </Badge>
                )}
              </div>
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner ariaLabel="Caricamento etichetta" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">
                Errore nel caricamento dell'etichetta
              </p>
              <p className="text-sm mt-1">
                {error instanceof Error ? error.message : "Errore sconosciuto"}
              </p>
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Informazioni principali */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                  Informazioni Prodotto
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">Nome:</span>
                    <p className="text-slate-800">{detail.productName}</p>
                  </div>
                  {detail.registrationNumber && (
                    <div>
                      <span className="font-medium text-slate-600">
                        Numero Registrazione:
                      </span>
                      <p className="text-slate-800 font-mono">
                        {detail.registrationNumber}
                      </p>
                    </div>
                  )}
                  {detail.label?.categoria && (
                    <div>
                      <span className="font-medium text-slate-600">
                        Categoria:
                      </span>
                      <p className="text-slate-800">{detail.label.categoria}</p>
                    </div>
                  )}
                  {detail.label?.formulazione && (
                    <div>
                      <span className="font-medium text-slate-600">
                        Formulazione:
                      </span>
                      <p className="text-slate-800">
                        {detail.label.formulazione}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Principio attivo */}
              {detail.label?.principio_attivo && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                    Principio Attivo
                  </h3>
                  <p className="text-sm text-slate-700">
                    {detail.label.principio_attivo}
                  </p>
                </div>
              )}

              {/* Colture target */}
              {detail.label?.colture_target &&
                detail.label.colture_target.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                      Colture Target
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.label.colture_target.map((coltura, idx) => (
                        <Badge key={idx} variant="secondary">
                          {coltura}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Malattie */}
              {detail.label?.malattie && detail.label.malattie.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                    Malattie
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detail.label.malattie.map((malattia, idx) => (
                      <Badge key={idx} variant="outline">
                        {malattia}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dosaggi dettagliati */}
              {detail.label?.dosaggi_dettagliati &&
                detail.label.dosaggi_dettagliati.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                      Dosaggi
                    </h3>
                    <div className="space-y-3">
                      {detail.label.dosaggi_dettagliati.map((dosaggio, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg p-3 bg-slate-50"
                        >
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {dosaggio.coltura && (
                              <div>
                                <span className="font-medium">Coltura:</span>{" "}
                                {dosaggio.coltura}
                              </div>
                            )}
                            {dosaggio.malattia && (
                              <div>
                                <span className="font-medium">Malattia:</span>{" "}
                                {dosaggio.malattia}
                              </div>
                            )}
                            {dosaggio.dose_minima !== undefined &&
                              dosaggio.dose_massima !== undefined && (
                                <div>
                                  <span className="font-medium">Dose:</span>{" "}
                                  {dosaggio.dose_minima} -{" "}
                                  {dosaggio.dose_massima} {dosaggio.dose_um}
                                </div>
                              )}
                            {dosaggio.epoca_impiego && (
                              <div>
                                <span className="font-medium">Epoca:</span>{" "}
                                {dosaggio.epoca_impiego}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nessun dettaglio disponibile per questa etichetta.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Componente helper per mostrare i dettagli del prodotto e dell'unità produttiva
interface HistoryEntryDetailsProps {
  entry: JobHistoryEntry;
  productionUnits: Array<{
    productionUnit: { id: string; name: string };
  }>;
  variant?: "compact" | "default";
  onProductClick?: (productName: string, registrationNumber?: string) => void;
}

function HistoryEntryDetails({
  entry,
  productionUnits,
  variant = "compact",
  onProductClick,
}: HistoryEntryDetailsProps) {
  const metadata = entry.metadata;
  if (!metadata) return null;

  const productionUnit = metadata.productionUnitId
    ? productionUnits.find(
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

// Componente per mostrare lo storico inline (per la vista review)
interface HistoryPanelProps {
  history: JobHistoryEntry[];
  jobCode: string;
  onProductClick?: (productName: string, registrationNumber?: string) => void;
  productFilter?: string;
}

function HistoryPanel({
  history,
  jobCode,
  onProductClick,
  productFilter,
}: HistoryPanelProps) {
  const { productionUnits } = useProductionUnit();
  const [filterText, setFilterText] = useState<string>("");

  const groupedHistory = useMemo(() => {
    const groups: Record<string, JobHistoryEntry[]> = {};

    // Filtra le history in base al testo di ricerca e al filtro prodotto
    let filteredHistory = history;

    // Applica il filtro prodotto se presente
    if (productFilter && productFilter !== "all") {
      const filterLower = productFilter.toLowerCase();
      filteredHistory = filteredHistory.filter((entry) => {
        const productName = entry.metadata?.productName?.toLowerCase() || "";
        const registrationNumber =
          entry.metadata?.productRegistrationNumber?.toLowerCase() || "";

        // Estrai i singoli prodotti se ci sono più prodotti separati da virgola
        const individualProducts = productName
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        // Verifica se il filtro corrisponde a uno dei prodotti o al numero di registrazione
        return (
          individualProducts.some(
            (p) => p === filterLower || p.includes(filterLower)
          ) || registrationNumber.includes(filterLower)
        );
      });
    }

    // Applica il filtro di ricerca testuale se presente
    if (filterText) {
      const searchText = filterText.toLowerCase();
      filteredHistory = filteredHistory.filter((entry) => {
        return (
          entry.title.toLowerCase().includes(searchText) ||
          String(entry.value).toLowerCase().includes(searchText) ||
          entry.metadata?.description?.toLowerCase().includes(searchText) ||
          entry.metadata?.productName?.toLowerCase().includes(searchText) ||
          entry.metadata?.productRegistrationNumber
            ?.toLowerCase()
            .includes(searchText) ||
          entry.metadata?.productionUnitName
            ?.toLowerCase()
            .includes(searchText) ||
          entry.metadata?.cropName?.toLowerCase().includes(searchText)
        );
      });
    }

    filteredHistory.forEach((entry) => {
      if (!groups[entry.step]) {
        groups[entry.step] = [];
      }
      groups[entry.step].push(entry);
    });
    return groups;
  }, [history, filterText, productFilter]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex-shrink-0 p-4 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Storico Operazione
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs shrink-0">
            {jobCode}
          </Badge>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cerca nello storico..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        <div className="space-y-4">
          {Object.entries(groupedHistory).map(([step, entries]) => (
            <div key={step} className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-1">
                {HistoryEntryFormatter.formatStep(step)}
              </h4>
              <div className="space-y-1.5">
                {entries.map((entry, idx) => (
                  <div
                    key={`${step}-${idx}`}
                    className="flex flex-col gap-0.5 py-1.5 border-l-2 border-slate-200 pl-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-medium text-slate-700 leading-tight">
                        {entry.title}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] shrink-0 px-1.5 py-0 ${HistoryEntryFormatter.getSourceColor(
                          entry.source
                        )}`}
                      >
                        {HistoryEntryFormatter.formatSource(entry.source)}
                      </Badge>
                    </div>
                    <span className="text-slate-600">
                      {String(entry.value)}
                    </span>
                    {entry.metadata?.description && (
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        {entry.metadata.description}
                      </p>
                    )}
                    <HistoryEntryDetails
                      entry={entry}
                      productionUnits={productionUnits}
                      onProductClick={onProductClick}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedHistory).length === 0 && (
            <div className="text-center py-6 text-slate-400 text-xs">
              {filterText
                ? "Nessun risultato trovato"
                : "Nessuno storico disponibile"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente per la card del gruppo nella vista review
interface JobGroupCardProps {
  group: JobGroup;
  isSelected: boolean;
  onClick: () => void;
}

function JobGroupCard({ group, isSelected, onClick }: JobGroupCardProps) {
  const formattedDate = new Date(group.createdAt).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        isSelected
          ? "bg-agri-green-50 border-agri-green-300 ring-1 ring-agri-green-200"
          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              #{group.jobCode}
            </Badge>
            {group.unverifiedCount > 0 && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                {group.unverifiedCount} da verificare
              </Badge>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {group.companyName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {group.jobs.length} operazion{group.jobs.length === 1 ? "e" : "i"}
          </div>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isSelected ? "text-agri-green-600" : "text-slate-300"
          )}
        />
      </div>
    </button>
  );
}

class JobProductsFormatter {
  private readonly products: Product[];

  constructor(products?: Product[]) {
    this.products = products ?? [];
  }

  public buildNameLabel(): string {
    if (this.products.length === 0) {
      return "-";
    }

    return this.products.map((product) => product.name).join(", ");
  }

  public buildRegistrationNumberLabel(): string {
    if (this.products.length === 0) {
      return "-";
    }

    return this.products
      .map((product) => product.registrationNumber ?? "-")
      .join(", ");
  }
}

class JobTableRowBuilder {
  private readonly jobWithRelations: JobWithRelations;
  private readonly productsFormatter: JobProductsFormatter;

  constructor(jobWithRelations: JobWithRelations) {
    this.jobWithRelations = jobWithRelations;
    this.productsFormatter = new JobProductsFormatter(
      this.jobWithRelations.products
    );
  }

  public build(): Record<string, unknown> {
    const { job, productionUnit, company, fields } = this.jobWithRelations;

    return {
      id: job.id,
      jobCode: job.jobId ?? "-",
      dateOfOpeation: new Date(job.dateOfOpeation),
      companyName: company.name,
      productionUnitName: productionUnit.name,
      cropName: productionUnit.cropName,
      cropType: productionUnit.cropType,
      fields: fields.map((field) => field.name).join(", "),
      category: job.category,
      quantity: job.quantity,
      unitOfMeasureQuantity: job.unitOfMeasureQuantity,
      productName: this.productsFormatter.buildNameLabel(),
      productRegistrationNumber:
        this.productsFormatter.buildRegistrationNumberLabel(),
      modeOfApplication: job.modeOfApplication ?? "-",
      treatedSurface: job.treatedSurface,
      avversity: job.avversity ?? "-",
      note: job.note,
      isVerified: job.isVerified ? "Verificato" : "Non Verificato",
      stock: job.quantity,
      _isVerifiedBoolean: job.isVerified,
      _originalStock: job.quantity,
      _originalQuantity: job.quantity,
      _originalDateOfOperation: new Date(job.dateOfOpeation),
      _companyId: company.id,
      _productionUnitId: productionUnit.id,
      _history: job.history ?? [],
    };
  }
}

type EditableTableRowData = Record<string, unknown>;

// Tipo per i job raggruppati per codice operazione (jobId)
interface JobGroup {
  jobCode: string;
  companyName: string;
  createdAt: string;
  jobs: JobWithRelations[];
  history: JobHistoryEntry[];
  unverifiedCount: number;
}

// Classe per raggruppare i job per codice operazione
class JobGroupBuilder {
  public static buildGroups(jobs: JobWithRelations[]): JobGroup[] {
    const groupsMap = new Map<string, JobGroup>();

    jobs.forEach((jobWithRelations) => {
      const { job, company } = jobWithRelations;
      const jobCode = job.jobId ?? "unknown";

      if (!groupsMap.has(jobCode)) {
        groupsMap.set(jobCode, {
          jobCode,
          companyName: company.name,
          createdAt: job.createdAt,
          jobs: [],
          history: job.history ?? [],
          unverifiedCount: 0,
        });
      }

      const group = groupsMap.get(jobCode)!;
      group.jobs.push(jobWithRelations);

      if (!job.isVerified) {
        group.unverifiedCount++;
      }

      // Unisci tutte le history di tutti i job del gruppo
      if (job.history && job.history.length > 0) {
        group.history = [...group.history, ...job.history];
      }
    });

    // Ordina per data di creazione (più recenti prima)
    const sortedGroups = Array.from(groupsMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Rimuovi duplicati dalle history e ordina per timestamp
    sortedGroups.forEach((group) => {
      const uniqueHistory = new Map<string, JobHistoryEntry>();
      group.history.forEach((entry) => {
        // Usa una chiave unica basata su step, title, value e timestamp
        const key = `${entry.step}-${entry.title}-${entry.value}-${entry.timestamp}`;
        if (!uniqueHistory.has(key)) {
          uniqueHistory.set(key, entry);
        }
      });
      group.history = Array.from(uniqueHistory.values()).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });

    return sortedGroups;
  }
}

class JobBulkVerifier {
  private readonly jobService: typeof jobsApiService;

  constructor(jobService: typeof jobsApiService) {
    this.jobService = jobService;
  }

  public async verify(rows: EditableTableRowData[]): Promise<number> {
    const actionableRows = rows.filter((row) => this.hasValidIdentifier(row));

    if (actionableRows.length === 0) {
      return 0;
    }

    await Promise.all(
      actionableRows.map((row) =>
        this.jobService.updateJob(String(row.id), { isVerified: true })
      )
    );

    return actionableRows.length;
  }

  private hasValidIdentifier(row: EditableTableRowData): boolean {
    return Boolean(row.id);
  }
}

type ViewMode = "all" | "review";

export default function JobPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("review");
  const [isBulkVerifying, setIsBulkVerifying] = useState<boolean>(false);
  const [historySheetOpen, setHistorySheetOpen] = useState<boolean>(false);
  const [selectedJobHistory, setSelectedJobHistory] = useState<
    JobHistoryEntry[]
  >([]);
  const [selectedJobCode, setSelectedJobCode] = useState<string>("");
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(
    null
  );
  const [selectedReviewRows, setSelectedReviewRows] = useState<
    EditableTableRowData[]
  >([]);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState<boolean>(false);
  const [labelSheetOpen, setLabelSheetOpen] = useState<boolean>(false);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<string>("all");
  const [historyPanelWidth, setHistoryPanelWidth] = useState<number>(320); // Default: 320px (w-80)
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [isGroupsSidebarOpen, setIsGroupsSidebarOpen] = useState<boolean>(true);
  const [groupsSidebarWidth, setGroupsSidebarWidth] = useState<number>(288); // Default: 288px (w-72)

  const isMobile = useIsMobile();

  // Carica le impostazioni salvate da IndexedDB all'inizializzazione
  useEffect(() => {
    const loadSettings = async () => {
      try {
        await userSettingsIndexDBManager.init();
        const savedWidth = await userSettingsIndexDBManager.getSetting<number>(
          "job",
          "historyPanelWidth"
        );
        if (savedWidth && typeof savedWidth === "number") {
          setHistoryPanelWidth(savedWidth);
        }
        const savedGroupsSidebarOpen =
          await userSettingsIndexDBManager.getSetting<boolean>(
            "job",
            "groupsSidebarOpen"
          );
        if (typeof savedGroupsSidebarOpen === "boolean") {
          setIsGroupsSidebarOpen(savedGroupsSidebarOpen);
        }
        const savedGroupsSidebarWidth =
          await userSettingsIndexDBManager.getSetting<number>(
            "job",
            "groupsSidebarWidth"
          );
        if (
          savedGroupsSidebarWidth &&
          typeof savedGroupsSidebarWidth === "number"
        ) {
          setGroupsSidebarWidth(savedGroupsSidebarWidth);
        }
      } catch (error) {
        console.error("Failed to load settings from IndexedDB:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  // Salva le impostazioni in IndexedDB quando cambiano (con debounce)
  useEffect(() => {
    if (isLoadingSettings) return; // Non salvare durante il caricamento iniziale

    const timeoutId = setTimeout(async () => {
      try {
        await userSettingsIndexDBManager.saveSetting(
          "job",
          "historyPanelWidth",
          historyPanelWidth
        );
      } catch (error) {
        console.error("Failed to save settings to IndexedDB:", error);
      }
    }, 300); // Debounce di 300ms per evitare troppi salvataggi durante il resize

    return () => clearTimeout(timeoutId);
  }, [historyPanelWidth, isLoadingSettings]);

  // Salva lo stato di apertura/chiusura della sidebar gruppi
  useEffect(() => {
    if (isLoadingSettings) return;

    const timeoutId = setTimeout(async () => {
      try {
        await userSettingsIndexDBManager.saveSetting(
          "job",
          "groupsSidebarOpen",
          isGroupsSidebarOpen
        );
      } catch (error) {
        console.error("Failed to save settings to IndexedDB:", error);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isGroupsSidebarOpen, isLoadingSettings]);

  // Salva la larghezza della sidebar gruppi
  useEffect(() => {
    if (isLoadingSettings) return;

    const timeoutId = setTimeout(async () => {
      try {
        await userSettingsIndexDBManager.saveSetting(
          "job",
          "groupsSidebarWidth",
          groupsSidebarWidth
        );
      } catch (error) {
        console.error("Failed to save settings to IndexedDB:", error);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [groupsSidebarWidth, isLoadingSettings]);

  // Handler per il resize del pannello storico
  const handleResizeStart = useMemo(
    () => (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      // Cambia il cursore durante il resize
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const startWidth = historyPanelWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = startX - e.clientX; // Invertito perché il pannello è a destra
        const newWidth = Math.max(200, Math.min(800, startWidth + deltaX));
        setHistoryPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [historyPanelWidth]
  );

  // Handler per il resize della sidebar gruppi
  const [isResizingGroupsSidebar, setIsResizingGroupsSidebar] =
    useState<boolean>(false);
  const handleGroupsSidebarResizeStart = useMemo(
    () => (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingGroupsSidebar(true);

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const startWidth = groupsSidebarWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX; // Normale perché il pannello è a sinistra
        const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));
        setGroupsSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizingGroupsSidebar(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [groupsSidebarWidth]
  );
  const { jobs, isLoading, error, refetch } = useJobs();
  const { labels } = useLabelsSummary();
  const bulkVerifier = useMemo(() => new JobBulkVerifier(jobsApiService), []);

  const handleOpenHistory = (row: Record<string, unknown>) => {
    setSelectedJobHistory(row._history as JobHistoryEntry[]);
    setSelectedJobCode(row.jobCode as string);
    setHistorySheetOpen(true);
  };

  // Funzione per trovare l'etichetta per nome prodotto e numero di registrazione
  const findLabelByProduct = (
    productName: string,
    registrationNumber?: string
  ): string | null => {
    const normalizedProductName = productName.trim().toLowerCase();
    const normalizedRegNumber = registrationNumber?.trim();

    const foundLabel = labels.find((label) => {
      const labelName = label.productName.trim().toLowerCase();
      // Cerca corrispondenza esatta o parziale
      const nameMatch =
        labelName === normalizedProductName ||
        labelName.includes(normalizedProductName) ||
        normalizedProductName.includes(labelName);

      const regMatch = normalizedRegNumber
        ? label.registrationNumber === normalizedRegNumber
        : true;

      return nameMatch && regMatch;
    });
    return foundLabel?.id ?? null;
  };

  // Handler per aprire il drawer dell'etichetta
  const handleOpenLabel = (
    productName: string,
    registrationNumber?: string
  ) => {
    const labelId = findLabelByProduct(productName, registrationNumber);
    if (labelId) {
      setSelectedLabelId(labelId);
      setLabelSheetOpen(true);
    } else {
      toast.info("Etichetta non trovata", {
        description: registrationNumber
          ? `${productName} (Reg. ${registrationNumber})`
          : productName,
      });
    }
  };

  // Converte i jobs in formato per la tabella
  const jobsAsRows = useMemo(() => {
    return jobs.map((jobWithRelations) =>
      new JobTableRowBuilder(jobWithRelations).build()
    );
  }, [jobs]);

  // Job non verificati raggruppati per codice operazione
  const unverifiedJobs = useMemo(() => {
    return jobs.filter((j) => !j.job.isVerified);
  }, [jobs]);

  const jobGroups = useMemo(() => {
    return JobGroupBuilder.buildGroups(unverifiedJobs);
  }, [unverifiedJobs]);

  // Seleziona automaticamente il primo gruppo se nessuno è selezionato
  const selectedGroup = useMemo(() => {
    if (selectedGroupCode) {
      return jobGroups.find((g) => g.jobCode === selectedGroupCode) ?? null;
    }
    return jobGroups[0] ?? null;
  }, [jobGroups, selectedGroupCode]);

  // Rows per il gruppo selezionato con filtro per productName
  const selectedGroupRows = useMemo(() => {
    if (!selectedGroup) return [];
    const rows = selectedGroup.jobs.map((jobWithRelations) =>
      new JobTableRowBuilder(jobWithRelations).build()
    );

    if (productFilter === "all") {
      return rows;
    }

    return rows.filter((row) => {
      const productName = String(row.productName || "").toLowerCase();
      const filterLower = productFilter.toLowerCase();
      // Estrai i singoli prodotti e verifica se uno di essi corrisponde
      const individualProducts = productName
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      // Verifica se il filtro corrisponde esattamente a uno dei prodotti o è contenuto in uno di essi
      return individualProducts.some(
        (p) => p === filterLower || p.includes(filterLower)
      );
    });
  }, [selectedGroup, productFilter]);

  // Lista unica di prodotti per il filtro (estrai i singoli prodotti)
  const availableProducts = useMemo(() => {
    if (!selectedGroup) return [];
    const products = new Set<string>();
    selectedGroup.jobs.forEach((jobWithRelations) => {
      const row = new JobTableRowBuilder(jobWithRelations).build();
      const productName = String(row.productName || "");
      if (productName && productName !== "-") {
        // Se ci sono più prodotti separati da virgola, estrai i singoli
        const individualProducts = productName
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        individualProducts.forEach((p) => products.add(p));
      }
    });
    return Array.from(products).sort();
  }, [selectedGroup]);

  // Opzioni per il SearchableSelect
  const productSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    const options: SearchableSelectOption[] = [
      { label: "Tutti i fitofarmaci", value: "all" },
    ];
    availableProducts.forEach((product) => {
      options.push({ label: product, value: product });
    });
    return options;
  }, [availableProducts]);

  // Indice del gruppo selezionato e navigazione tra gruppi
  const currentGroupIndex = useMemo(() => {
    if (!selectedGroup) return -1;
    return jobGroups.findIndex((g) => g.jobCode === selectedGroup.jobCode);
  }, [jobGroups, selectedGroup]);

  const canGoToPreviousGroup = currentGroupIndex > 0;
  const canGoToNextGroup =
    currentGroupIndex < jobGroups.length - 1 && currentGroupIndex >= 0;

  const goToPreviousGroup = () => {
    if (canGoToPreviousGroup) {
      setSelectedGroupCode(jobGroups[currentGroupIndex - 1].jobCode);
      setSelectedReviewRows([]);
      setProductFilter("all");
    }
  };

  const goToNextGroup = () => {
    if (canGoToNextGroup) {
      setSelectedGroupCode(jobGroups[currentGroupIndex + 1].jobCode);
      setSelectedReviewRows([]);
      setProductFilter("all");
    }
  };

  // Colonne per la tabella editabile
  const columns: EditableColumn[] = [
    {
      id: "jobCode",
      title: "Codice Operazione",
      type: "text",
      width: "150px",
      readOnly: true,
      render: (value) => (
        <Badge variant="outline" className="font-mono">
          {value as string}
        </Badge>
      ),
    },
    {
      id: "isVerified",
      title: "Stato Verifica",
      type: "select",
      width: "180px",
      options: ["Verificato", "Non Verificato"],
      onValueChange: ({ value }) => {
        // Aggiorna anche il valore booleano nascosto
        return {
          _isVerifiedBoolean: value === "Verificato",
        };
      },
      render: (value) => {
        const isVerified = value === "Verificato";
        return (
          <Badge
            variant={isVerified ? "default" : "destructive"}
            className={
              isVerified
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white animate-pulse"
            }
          >
            {value as string}
          </Badge>
        );
      },
    },
    {
      id: "productionUnitName",
      title: "Unità Produttiva",
      type: "text",
      width: "200px",
      readOnly: true,
    },
    {
      id: "cropName",
      title: "Coltura",
      type: "text",
      width: "150px",
      readOnly: true,
    },
    {
      id: "quantity",
      title: "Quantità",
      type: "number",
      width: "120px",
      readOnly: true,
    },
    {
      id: "unitOfMeasureQuantity",
      title: "Unità",
      type: "text",
      width: "100px",
      readOnly: true,
    },
    {
      id: "productName",
      title: "Prodotto",
      type: "text",
      width: "200px",
      readOnly: true,
    },
    {
      id: "productRegistrationNumber",
      title: "Numero Registrazione",
      type: "text",
      width: "200px",
      readOnly: true,
    },
    {
      id: "stock",
      title: "Stock",
      type: "number",
      width: "120px",
    },
    {
      id: "dateOfOpeation",
      title: "Data Operazione",
      type: "date",
      width: "150px",
      readOnly: false,
      render: (value) => {
        if (!value) return "-";
        const date = value instanceof Date ? value : new Date(value as string);
        return date.toLocaleDateString("it-IT");
      },
    },
    {
      id: "companyName",
      title: "Azienda",
      type: "text",
      width: "200px",
      readOnly: true,
    },
    {
      id: "cropType",
      title: "Tipo Coltura",
      type: "text",
      width: "150px",
      readOnly: true,
    },
    {
      id: "fields",
      title: "Campi",
      type: "text",
      width: "200px",
      readOnly: true,
    },
    {
      id: "category",
      title: "Categoria",
      type: "text",
      width: "150px",
      readOnly: true,
    },
    {
      id: "modeOfApplication",
      title: "Modalità Applicazione",
      type: "text",
      width: "180px",
      readOnly: true,
    },
    {
      id: "treatedSurface",
      title: "Superficie Trattata (ha)",
      type: "number",
      width: "180px",
      readOnly: true,
    },
    {
      id: "avversity",
      title: "Avversità",
      type: "text",
      width: "150px",
      readOnly: true,
    },
    {
      id: "note",
      title: "Note",
      type: "text",
      width: "250px",
      readOnly: true,
    },
    {
      id: "_history",
      title: "Storico",
      type: "text",
      width: "100px",
      readOnly: true,
      render: (_value, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenHistory(row);
          }}
          className="gap-1.5"
        >
          <History className="h-4 w-4" />
          Storico
        </Button>
      ),
    },
  ];

  // Colonne semplificate per la vista review
  const reviewColumns: EditableColumn[] = [
    {
      id: "isVerified",
      title: "Stato",
      type: "select",
      width: "150px",
      options: ["Verificato", "Non Verificato"],
      onValueChange: ({ value }) => ({
        _isVerifiedBoolean: value === "Verificato",
      }),
      render: (value) => {
        const isVerified = value === "Verificato";
        return (
          <Badge
            variant={isVerified ? "default" : "destructive"}
            className={
              isVerified
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white animate-pulse"
            }
          >
            {isVerified ? "OK" : "Da verificare"}
          </Badge>
        );
      },
    },
    {
      id: "dateOfOpeation",
      title: "Data",
      type: "date",
      width: "100px",
      readOnly: false,
      render: (value) => {
        if (!value) return "-";
        const date = value instanceof Date ? value : new Date(value as string);
        return date.toLocaleDateString("it-IT");
      },
    },
    {
      id: "productionUnitName",
      title: "Unità Produttiva",
      type: "text",
      width: "150px",
      readOnly: true,
    },
    {
      id: "productName",
      title: "Prodotto",
      type: "text",
      width: "180px",
      readOnly: true,
    },
    {
      id: "quantity",
      title: "Quantità",
      type: "number",
      width: "100px",
      readOnly: false,
      render: (value, row) => (
        <span className="font-mono text-sm">
          {String(value)} {String(row.unitOfMeasureQuantity)}
        </span>
      ),
    },
    {
      id: "treatedSurface",
      title: "Superficie (ha)",
      type: "number",
      width: "100px",
      readOnly: true,
    },
    {
      id: "note",
      title: "Note",
      type: "text",
      width: "200px",
      readOnly: true,
    },
  ];

  // Gestisce il salvataggio delle modifiche
  const handleSave = async (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => {
    try {
      // Processa solo gli aggiornamenti (non ci dovrebbero essere creazioni)
      for (const row of payload.updated) {
        const jobId = row.id as string;
        const isVerified = row._isVerifiedBoolean as boolean;
        const newStock = Number(row.stock);
        const originalStock = Number(row._originalStock);
        const newQuantity = Number(row.quantity);
        const originalQuantity = Number(row._originalQuantity ?? row.quantity);
        const companyId = row._companyId as string;
        const newDateOfOperation = row.dateOfOpeation
          ? row.dateOfOpeation instanceof Date
            ? row.dateOfOpeation
            : new Date(row.dateOfOpeation as string)
          : null;
        const originalDateOfOperation = row._originalDateOfOperation
          ? row._originalDateOfOperation instanceof Date
            ? row._originalDateOfOperation
            : new Date(row._originalDateOfOperation as string)
          : null;

        // Prepara il payload di aggiornamento
        const updatePayload: {
          isVerified?: boolean;
          quantity?: number;
          dateOfOpeation?: string;
        } = {};

        // 1. Aggiorna lo stato di verifica se modificato
        if (isVerified !== undefined) {
          updatePayload.isVerified = isVerified;
        }

        // 2. Aggiorna la quantità se modificata
        if (newQuantity !== originalQuantity) {
          updatePayload.quantity = newQuantity;
        }

        // 3. Aggiorna la data di operazione se modificata
        if (
          newDateOfOperation &&
          originalDateOfOperation &&
          newDateOfOperation.getTime() !== originalDateOfOperation.getTime()
        ) {
          // Converti la data in formato ISO string per l'API
          updatePayload.dateOfOpeation = newDateOfOperation.toISOString();
        }

        // Esegui l'aggiornamento se ci sono modifiche
        if (Object.keys(updatePayload).length > 0) {
          await jobsApiService.updateJob(jobId, updatePayload);
        }

        // 3. Gestisci le modifiche dello stock
        if (newStock !== originalStock) {
          const difference = newStock - originalStock;

          // Crea un movimento di stock
          const stockPayload: CreateStockPayload = {
            companyId,
            productId: jobId, // Assuming jobId as productId, adjust as needed
            quantity: Math.abs(difference),
            unitOfMeasureQuantity: row.unitOfMeasureQuantity as string,
            type: difference > 0 ? "IN" : "OUT",
            jobId,
          };

          await stocksApiService.create(stockPayload);
        }
      }

      toast.success("Operazioni aggiornate", {
        description: `${payload.updated.length} operazioni aggiornate con successo`,
      });

      // Ricarica i dati
      await refetch();
    } catch (error) {
      toast.error("Errore durante l'aggiornamento", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
      console.error("Error updating jobs:", error);
    }
  };

  // Gestisce l'eliminazione multipla
  const handleDeleteSelected = async (
    removed: Array<Record<string, unknown>>
  ) => {
    try {
      const jobIds = removed.map((row) => row.id as string);

      console.log("Deleting jobs:", jobIds);

      await jobsApiService.bulkDelete({ jobIds });

      toast.success("Operazioni eliminate", {
        description: `${jobIds.length} operazioni eliminate con successo`,
      });

      // Ricarica i dati
      await refetch();
    } catch (error) {
      toast.error("Errore durante l'eliminazione", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
      console.error("Error deleting jobs:", error);
    }
  };

  const handleBulkVerifySelected = async (
    selectedRows: EditableTableRowData[]
  ) => {
    if (selectedRows.length === 0 || isBulkVerifying) {
      return;
    }

    setIsBulkVerifying(true);

    try {
      const verifiedCount = await bulkVerifier.verify(selectedRows);

      toast.success("Operazioni verificate", {
        description: `${verifiedCount} operazioni verificate con successo`,
      });

      await refetch();
    } catch (error) {
      toast.error("Errore durante la verifica", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
      console.error("Error verifying jobs:", error);
    } finally {
      setIsBulkVerifying(false);
    }
  };

  // Renderizza la vista "Tutte le operazioni"
  const renderAllJobsView = () => (
    <div className="flex-1 overflow-auto px-6 pb-6">
      <div className="mx-auto space-y-6">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Errore nel caricamento dei dati</p>
              <p className="text-sm mt-1">
                {error instanceof Error ? error.message : "Errore sconosciuto"}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner
                ariaLabel="Caricamento operazioni"
                className="text-neutral-400"
              />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <p>Nessuna operazione trovata</p>
            </div>
          ) : (
            <EditableTable
              columns={columns}
              rows={jobsAsRows}
              isModify={true}
              onSave={handleSave}
              onDeleteSelected={handleDeleteSelected}
              onBulkVerifySelected={handleBulkVerifySelected}
              bulkVerifyButtonLabel="Verifica"
              isBulkVerifyLoading={isBulkVerifying}
              getRowId={(row) => row.id as string}
            />
          )}
        </div>
      </div>
    </div>
  );

  // Renderizza la vista "Da confermare" (review)
  const renderReviewView = () => {
    // Vista mobile: mostra una schermata alla volta
    if (isMobile) {
      // Se nessun gruppo è selezionato, mostra la lista gruppi
      if (!selectedGroup) {
        return (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="p-3 bg-white flex-shrink-0">
              <h3 className="text-sm font-medium text-slate-700">
                Gruppi da verificare
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {jobGroups.length} grupp{jobGroups.length === 1 ? "o" : "i"} •{" "}
                {unverifiedJobs.length} operazion
                {unverifiedJobs.length === 1 ? "e" : "i"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {jobGroups.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessuna operazione da verificare</p>
                </div>
              ) : (
                jobGroups.map((group) => (
                  <JobGroupCard
                    key={group.jobCode}
                    group={group}
                    isSelected={false}
                    onClick={() => {
                      setSelectedGroupCode(group.jobCode);
                      setSelectedReviewRows([]);
                      setProductFilter("all");
                    }}
                  />
                ))
              )}
            </div>
          </div>
        );
      }

      // Se un gruppo è selezionato, mostra il dettaglio
      return (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Header mobile con navigazione tra gruppi */}
          <div className="flex-shrink-0 p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousGroup}
                disabled={!canGoToPreviousGroup}
                className="p-1 h-auto"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0 text-center">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-base font-semibold text-slate-800 truncate">
                    #{selectedGroup.jobCode}
                  </h3>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {selectedGroup.jobs.length}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {selectedGroup.companyName}
                </p>
                <p className="text-[10px] text-slate-400">
                  {currentGroupIndex + 1} / {jobGroups.length}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextGroup}
                disabled={!canGoToNextGroup}
                className="p-1 h-auto"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileHistoryOpen(true)}
                className="p-2 h-auto"
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {selectedReviewRows.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  disabled={isBulkVerifying}
                  onClick={() => handleBulkVerifySelected(selectedReviewRows)}
                  className="flex-1 text-xs"
                >
                  {isBulkVerifying ? (
                    <Spinner className="h-3 w-3" />
                  ) : (
                    <ClipboardCheck className="h-3 w-3" />
                  )}
                  Verifica ({selectedReviewRows.length})
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                disabled={isBulkVerifying}
                onClick={() => handleBulkVerifySelected(selectedGroupRows)}
                className={cn(
                  "text-xs",
                  selectedReviewRows.length > 0 ? "flex-1" : "w-full"
                )}
              >
                {isBulkVerifying ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <ClipboardCheck className="h-3 w-3" />
                )}
                Verifica Tutti
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <SearchableSelect
                value={productFilter}
                options={productSelectOptions}
                placeholder="Filtra per fitofarmaco"
                searchPlaceholder="Cerca fitofarmaco..."
                emptyMessage="Nessun fitofarmaco trovato"
                onChange={setProductFilter}
                wrapperClassName="w-full"
                maxHeight="max-h-40"
              />
            </div>
          </div>

          {/* Tabella mobile */}
          <div className="flex-1 flex flex-col min-h-0 p-2">
            <div className="flex-1 min-h-0 [&>div]:h-full [&>div]:flex [&>div]:flex-col">
              <EditableTable
                columns={reviewColumns}
                rows={selectedGroupRows}
                isModify={true}
                onSave={handleSave}
                onDeleteSelected={handleDeleteSelected}
                onSelectionChange={(selectedRows) => {
                  setSelectedReviewRows(selectedRows);
                }}
                getRowId={(row) => row.id as string}
                className="flex-1 flex flex-col min-h-0"
              />
            </div>
          </div>

          {/* Sheet storico mobile */}
          <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
            <SheetContent side="bottom" className="h-[70vh] p-0">
              {selectedGroup && (
                <HistoryPanel
                  history={selectedGroup.history}
                  jobCode={selectedGroup.jobCode}
                  onProductClick={handleOpenLabel}
                  productFilter={productFilter}
                />
              )}
            </SheetContent>
          </Sheet>
        </div>
      );
    }

    // Vista desktop: layout a 3 colonne
    return (
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar sinistra - Lista gruppi */}
        {isGroupsSidebarOpen && (
          <>
            <div
              className="flex-shrink-0 bg-slate-50 flex flex-col overflow-hidden"
              style={{ width: `${groupsSidebarWidth}px` }}
            >
              <div className="p-3 bg-white flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-700">
                      Gruppi da verificare
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {jobGroups.length} grupp
                      {jobGroups.length === 1 ? "o" : "i"} •{" "}
                      {unverifiedJobs.length} operazion
                      {unverifiedJobs.length === 1 ? "e" : "i"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsGroupsSidebarOpen(false)}
                    className="h-7 w-7 p-0 shrink-0"
                    title="Chiudi elenco gruppi"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                {jobGroups.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nessuna operazione da verificare</p>
                  </div>
                ) : (
                  jobGroups.map((group) => (
                    <JobGroupCard
                      key={group.jobCode}
                      group={group}
                      isSelected={selectedGroup?.jobCode === group.jobCode}
                      onClick={() => {
                        setSelectedGroupCode(group.jobCode);
                        setSelectedReviewRows([]);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
            {/* Resize Handle per la sidebar gruppi */}
            <div
              onMouseDown={handleGroupsSidebarResizeStart}
              className={cn(
                "w-1 flex-shrink-0 cursor-col-resize bg-slate-200 hover:bg-slate-300 transition-colors relative group",
                isResizingGroupsSidebar && "bg-slate-400"
              )}
              style={{ userSelect: "none" }}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-slate-500" />
              </div>
            </div>
          </>
        )}
        {!isGroupsSidebarOpen && (
          <div className="flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden w-16 rounded-md">
            {/* Header con pulsante per aprire */}
            <div className="p-2 bg-white flex-shrink-0 border-b border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGroupsSidebarOpen(true)}
                className="h-7 w-full p-0"
                title="Apri elenco gruppi"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
            {/* Lista compatta dei jobId */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
              {jobGroups.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-[10px]">
                  <ClipboardCheck className="h-4 w-4 mx-auto mb-1 opacity-50" />
                  <p>Nessuna</p>
                </div>
              ) : (
                jobGroups.map((group) => (
                  <button
                    key={group.jobCode}
                    type="button"
                    onClick={() => {
                      setSelectedGroupCode(group.jobCode);
                      setSelectedReviewRows([]);
                    }}
                    className={cn(
                      "w-full p-1.5 rounded-md transition-all text-center",
                      selectedGroup?.jobCode === group.jobCode
                        ? "bg-agri-green-100 border border-agri-green-300 ring-1 ring-agri-green-200"
                        : "bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                    title={`Operazione #${group.jobCode} - ${group.jobs.length} operazioni`}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-xs w-full justify-center",
                        selectedGroup?.jobCode === group.jobCode &&
                          "border-agri-green-400 text-agri-green-700"
                      )}
                    >
                      #{group.jobCode}
                    </Badge>
                    {group.unverifiedCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="mt-1 h-4 min-w-4 px-1 text-[10px] block mx-auto"
                      >
                        {group.unverifiedCount}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Centro - Tabella del gruppo selezionato */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedGroup ? (
            <>
              <div className="flex-shrink-0 p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-800">
                        Operazione #{selectedGroup.jobCode}
                      </h3>
                      <Badge variant="outline">
                        {selectedGroupRows.length} trattament
                        {selectedGroupRows.length === 1 ? "o" : "i"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {selectedGroup.companyName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedReviewRows.length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isBulkVerifying}
                        onClick={() =>
                          handleBulkVerifySelected(selectedReviewRows)
                        }
                      >
                        {isBulkVerifying ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <ClipboardCheck className="h-4 w-4" />
                        )}
                        Verifica Selezionati ({selectedReviewRows.length})
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isBulkVerifying}
                      onClick={() =>
                        handleBulkVerifySelected(selectedGroupRows)
                      }
                    >
                      {isBulkVerifying ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <ClipboardCheck className="h-4 w-4" />
                      )}
                      Verifica Tutti
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <SearchableSelect
                      value={productFilter}
                      options={productSelectOptions}
                      placeholder="Filtra per fitofarmaco"
                      searchPlaceholder="Cerca fitofarmaco..."
                      emptyMessage="Nessun fitofarmaco trovato"
                      onChange={setProductFilter}
                      wrapperClassName="w-[200px]"
                      maxHeight="max-h-40"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col min-h-0 p-4">
                <div className="flex-1 min-h-0 [&>div]:h-full [&>div]:flex [&>div]:flex-col">
                  <EditableTable
                    columns={reviewColumns}
                    rows={selectedGroupRows}
                    isModify={true}
                    onSave={handleSave}
                    onDeleteSelected={handleDeleteSelected}
                    onSelectionChange={(selectedRows) => {
                      setSelectedReviewRows(selectedRows);
                    }}
                    getRowId={(row) => row.id as string}
                    className="flex-1 flex flex-col min-h-0"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Seleziona un gruppo per visualizzare i dettagli</p>
              </div>
            </div>
          )}
        </div>

        {/* Destra - Storico */}
        {selectedGroup && (
          <>
            {/* Resize Handle */}
            <div
              onMouseDown={handleResizeStart}
              className={cn(
                "w-1 flex-shrink-0 cursor-col-resize bg-slate-200 hover:bg-slate-300 transition-colors relative group",
                isResizing && "bg-slate-400"
              )}
              style={{ userSelect: "none" }}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-slate-500" />
              </div>
            </div>
            <div
              className="flex-shrink-0 overflow-hidden"
              style={{ width: `${historyPanelWidth}px` }}
            >
              <HistoryPanel
                history={selectedGroup.history}
                jobCode={selectedGroup.jobCode}
                onProductClick={handleOpenLabel}
                productFilter={productFilter}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PageHeader title="Operazioni">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
        >
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <ListChecks className="h-4 w-4" />
              Tutte
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              Da confermare
              {unverifiedJobs.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 min-w-5 px-1.5 text-xs"
                >
                  {unverifiedJobs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      {viewMode === "all" ? renderAllJobsView() : renderReviewView()}

      {/* History Sheet (per la vista "Tutte") */}
      <JobHistorySheet
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
        history={selectedJobHistory}
        jobCode={selectedJobCode}
        onProductClick={handleOpenLabel}
      />

      {/* Label Detail Sheet */}
      <LabelDetailSheet
        open={labelSheetOpen}
        onOpenChange={setLabelSheetOpen}
        labelId={selectedLabelId}
      />
    </div>
  );
}
