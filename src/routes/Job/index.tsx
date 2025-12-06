import { useState, useMemo, useEffect } from "react";
import { useJobGroupsSummary, useJobGroupDetail } from "@/hooks/useJobGroups";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLabelsSummary } from "@/hooks/useLabelsSummary";
import { useLabel } from "@/hooks/useLabel";
import { PageHeader } from "@/components/organism/Header";
import { userSettingsIndexDBManager } from "@/utils/userSettingsIndexDBManager";
import { type EditableColumn } from "@/components/organism/EditableTable";
import { type JobRow } from "@/components/organism/JobSelectedDetails";

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History,
  ListChecks,
  ClipboardCheck,
  Package,
  Sprout,
  FileText,
  Search,
  File,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AllJobsView from "./AllJobsView";
import ReviewJobsView from "./ReviewJobsView";

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
          <SheetDescription className="sr-only">
            Storico dell'operazione
          </SheetDescription>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Codice:{" "}
            <Badge variant="outline" className="ml-1">
              {jobCode}
            </Badge>
          </div>
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
  const [pdfDrawerOpen, setPdfDrawerOpen] = useState<boolean>(false);
  const [rawTextOpen, setRawTextOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Funzione per verificare se un testo corrisponde al termine di ricerca
  const matchesSearch = (text: string | null | undefined): boolean => {
    if (!searchTerm.trim()) return true;
    if (!text) return false;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  // Funzione per verificare se una sezione contiene risultati
  const sectionMatchesSearch = (sectionData: unknown): boolean => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();

    if (typeof sectionData === "string") {
      return sectionData.toLowerCase().includes(searchLower);
    }

    if (Array.isArray(sectionData)) {
      return sectionData.some((item) => {
        if (typeof item === "string") {
          return item.toLowerCase().includes(searchLower);
        }
        if (typeof item === "object" && item !== null) {
          return JSON.stringify(item).toLowerCase().includes(searchLower);
        }
        return false;
      });
    }

    if (typeof sectionData === "object" && sectionData !== null) {
      return JSON.stringify(sectionData).toLowerCase().includes(searchLower);
    }

    return false;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl bg-gray-50 flex flex-col h-full overflow-hidden"
        >
          <SheetHeader className="flex-shrink-0 px-6 pt-6 pb-4 bg-white border-b border-gray-100">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FileText className="h-5 w-5 text-gray-600" />
              Dettagli Etichetta
            </SheetTitle>
            <SheetDescription className="sr-only">
              Dettagli dell'etichetta del prodotto fitosanitario
            </SheetDescription>
            {detail?.productName && (
              <div className="flex flex-col gap-3 mt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-white border-gray-200 text-gray-700 font-medium px-3 py-1"
                  >
                    {detail.productName}
                  </Badge>
                  {detail.registrationNumber && (
                    <Badge
                      variant="outline"
                      className="bg-white border-gray-200 text-gray-600 font-mono text-xs px-3 py-1"
                    >
                      Reg. {detail.registrationNumber}
                    </Badge>
                  )}
                  {detail.isVerified ? (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 px-3 py-1">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verificata
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 px-3 py-1">
                      <XCircle className="h-3 w-3 mr-1" />
                      Non verificata
                    </Badge>
                  )}
                  {detail.sourceUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPdfDrawerOpen(true)}
                      className="h-8 text-xs bg-white border-gray-200 hover:bg-gray-50 text-gray-700 px-3"
                    >
                      <File className="h-3 w-3 mr-1.5" />
                      PDF
                    </Button>
                  )}
                </div>
                {/* Input di ricerca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cerca nei dettagli dell'etichetta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 h-10 bg-white border-gray-200 rounded-lg text-sm focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-gray-100"
                      onClick={() => setSearchTerm("")}
                    >
                      <XCircle className="h-4 w-4 text-gray-400" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 space-y-8">
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
                    {error instanceof Error
                      ? error.message
                      : "Errore sconosciuto"}
                  </p>
                </div>
              ) : detail ? (
                <>
                  {/* Informazioni principali */}
                  {sectionMatchesSearch({
                    productName: detail.productName,
                    registrationNumber: detail.registrationNumber,
                    categoria: detail.label?.categoria,
                    formulazione: detail.label?.formulazione,
                    titolare: detail.label?.titolare,
                    stabilimento: detail.label?.stabilimento,
                  }) && (
                    <div className="space-y-4 bg-white rounded-2xl p-6 shadow-sm">
                      <h3 className="text-base font-semibold text-gray-900 pb-1">
                        Informazioni Prodotto
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {matchesSearch(detail.productName) && (
                          <div>
                            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                              Nome
                            </span>
                            <p className="text-gray-900 mt-1 font-medium">
                              {detail.productName}
                            </p>
                          </div>
                        )}
                        {detail.registrationNumber &&
                          matchesSearch(detail.registrationNumber) && (
                            <div>
                              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Numero Registrazione
                              </span>
                              <p className="text-gray-900 mt-1 font-mono text-sm">
                                {detail.registrationNumber}
                              </p>
                            </div>
                          )}
                        {detail.label?.categoria &&
                          matchesSearch(detail.label.categoria) && (
                            <div>
                              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Categoria
                              </span>
                              <p className="text-gray-900 mt-1">
                                {detail.label.categoria}
                              </p>
                            </div>
                          )}
                        {detail.label?.formulazione &&
                          matchesSearch(detail.label.formulazione) && (
                            <div>
                              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Formulazione
                              </span>
                              <p className="text-gray-900 mt-1">
                                {detail.label.formulazione}
                              </p>
                            </div>
                          )}
                        {detail.label?.titolare &&
                          matchesSearch(detail.label.titolare) && (
                            <div>
                              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Titolare
                              </span>
                              <p className="text-gray-900 mt-1">
                                {detail.label.titolare}
                              </p>
                            </div>
                          )}
                        {detail.label?.stabilimento &&
                          matchesSearch(detail.label.stabilimento) && (
                            <div className="col-span-2">
                              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Stabilimento
                              </span>
                              <p className="text-gray-900 mt-1">
                                {detail.label.stabilimento}
                              </p>
                            </div>
                          )}
                        {detail.extractionConfidence !== undefined &&
                          matchesSearch(
                            String(detail.extractionConfidence)
                          ) && (
                            <div>
                              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Confidenza Estrazione
                              </span>
                              <p className="text-gray-900 mt-1">
                                {detail.extractionConfidence}%
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Principio attivo e composizione */}
                  {sectionMatchesSearch({
                    principio_attivo: detail.label?.principio_attivo,
                    composizione: detail.label?.composizione,
                    meccanismo_azione_frac:
                      detail.label?.meccanismo_azione_frac,
                  }) &&
                    (detail.label?.principio_attivo ||
                      detail.label?.composizione) && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-1">
                          Principio Attivo e Composizione
                        </h3>
                        {detail.label.principio_attivo &&
                          matchesSearch(detail.label.principio_attivo) && (
                            <div className="space-y-1">
                              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Principio Attivo
                              </span>
                              <p className="text-gray-900 text-sm">
                                {detail.label.principio_attivo}
                              </p>
                            </div>
                          )}
                        {detail.label.composizione &&
                          matchesSearch(detail.label.composizione) && (
                            <div className="space-y-1">
                              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Composizione
                              </span>
                              <p className="text-gray-900 text-sm">
                                {detail.label.composizione}
                              </p>
                            </div>
                          )}
                        {detail.label.meccanismo_azione_frac &&
                          matchesSearch(
                            detail.label.meccanismo_azione_frac
                          ) && (
                            <div className="space-y-1">
                              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Meccanismo d'azione
                              </span>
                              <p className="text-gray-900 text-sm">
                                {detail.label.meccanismo_azione_frac}
                              </p>
                            </div>
                          )}
                      </div>
                    )}

                  {/* Colture target */}
                  {sectionMatchesSearch(detail.label?.colture_target) &&
                    detail.label?.colture_target &&
                    detail.label.colture_target.length > 0 && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Colture Target
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {detail.label.colture_target
                            .filter((coltura) => matchesSearch(coltura))
                            .map((coltura, idx) => (
                              <Badge
                                key={idx}
                                className="bg-blue-50 text-blue-700 border-0 px-3 py-1.5 font-medium"
                              >
                                {coltura}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Specie infestanti */}
                  {sectionMatchesSearch(detail.label?.specie) &&
                    detail.label?.specie &&
                    detail.label.specie.length > 0 && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Specie Infestanti
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {detail.label.specie
                            .filter((specie) => matchesSearch(specie))
                            .map((specie, idx) => (
                              <Badge
                                key={idx}
                                className="bg-gray-100 text-gray-700 border-0 px-3 py-1.5 font-medium"
                              >
                                {specie}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Malattie */}
                  {sectionMatchesSearch(detail.label?.malattie) &&
                    detail.label?.malattie &&
                    detail.label.malattie.length > 0 && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Malattie
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {detail.label.malattie
                            .filter((malattia) => matchesSearch(malattia))
                            .map((malattia, idx) => (
                              <Badge
                                key={idx}
                                className="bg-orange-50 text-orange-700 border-0 px-3 py-1.5 font-medium"
                              >
                                {malattia}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Dosaggi dettagliati */}
                  {sectionMatchesSearch(detail.label?.dosaggi_dettagliati) &&
                    detail.label?.dosaggi_dettagliati &&
                    detail.label.dosaggi_dettagliati.length > 0 && (
                      <div className="space-y-4 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Dosaggi Dettagliati
                        </h3>
                        <div className="space-y-3">
                          {detail.label.dosaggi_dettagliati
                            .filter((dosaggio) =>
                              sectionMatchesSearch(dosaggio)
                            )
                            .map((dosaggio, idx) => (
                              <div
                                key={idx}
                                className="rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                              >
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  {dosaggio.coltura && (
                                    <div>
                                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                        Coltura
                                      </span>
                                      <p className="text-gray-900 mt-1 font-medium">
                                        {dosaggio.coltura}
                                      </p>
                                    </div>
                                  )}
                                  {dosaggio.malattia && (
                                    <div>
                                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                        Malattia
                                      </span>
                                      <p className="text-gray-900 mt-1 font-medium">
                                        {dosaggio.malattia}
                                      </p>
                                    </div>
                                  )}
                                  {dosaggio.dose_minima !== undefined &&
                                    dosaggio.dose_massima !== undefined && (
                                      <div>
                                        <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                          Dose
                                        </span>
                                        <p className="text-gray-900 mt-1 font-medium">
                                          {dosaggio.dose_minima ===
                                          dosaggio.dose_massima
                                            ? `${dosaggio.dose_minima} ${dosaggio.dose_um}`
                                            : `${dosaggio.dose_minima} - ${dosaggio.dose_massima} ${dosaggio.dose_um}`}
                                        </p>
                                      </div>
                                    )}
                                  {dosaggio.epoca_impiego && (
                                    <div>
                                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                        Epoca
                                      </span>
                                      <p className="text-gray-900 mt-1">
                                        {dosaggio.epoca_impiego}
                                      </p>
                                    </div>
                                  )}
                                  {dosaggio.acqua_max && (
                                    <div>
                                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                        Acqua max
                                      </span>
                                      <p className="text-gray-900 mt-1">
                                        {dosaggio.acqua_max}{" "}
                                        {dosaggio.acqua_max_um}
                                      </p>
                                    </div>
                                  )}
                                  {dosaggio.n_max_applicazioni && (
                                    <div>
                                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                        Max applicazioni
                                      </span>
                                      <p className="text-gray-900 mt-1">
                                        {dosaggio.n_max_applicazioni}{" "}
                                        {dosaggio.n_max_applicazioni_um}
                                      </p>
                                    </div>
                                  )}
                                  {dosaggio.intervallo_min_giorni && (
                                    <div>
                                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                        Intervallo min
                                      </span>
                                      <p className="text-gray-900 mt-1">
                                        {dosaggio.intervallo_min_giorni} giorni
                                      </p>
                                    </div>
                                  )}
                                  {dosaggio.intervallo_sicurezza_giorni && (
                                    <div>
                                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                        Intervallo sicurezza
                                      </span>
                                      <p className="text-gray-900 mt-1">
                                        {dosaggio.intervallo_sicurezza_giorni}{" "}
                                        giorni
                                      </p>
                                    </div>
                                  )}
                                  {dosaggio.modalita_applicazione && (
                                    <div>
                                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                        Modalità
                                      </span>
                                      <p className="text-gray-900 mt-1">
                                        {dosaggio.modalita_applicazione}
                                      </p>
                                    </div>
                                  )}
                                  {dosaggio.istruzioni && (
                                    <div className="col-span-2">
                                      <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                                        Istruzioni
                                      </span>
                                      <p className="text-gray-700 mt-1 text-sm leading-relaxed">
                                        {dosaggio.istruzioni}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Fasce di rispetto e deriva */}
                  {sectionMatchesSearch(
                    detail.label?.fasce_di_rispetto_e_deriva
                  ) &&
                    detail.label?.fasce_di_rispetto_e_deriva &&
                    Array.isArray(detail.label.fasce_di_rispetto_e_deriva) &&
                    detail.label.fasce_di_rispetto_e_deriva.length > 0 && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Fasce di Rispetto e Deriva
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                          {detail.label.fasce_di_rispetto_e_deriva
                            .filter((fascia) => matchesSearch(String(fascia)))
                            .map((fascia, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 before:content-['•'] before:text-gray-400 before:font-bold before:mr-1"
                              >
                                {String(fascia)}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* Frasi di pericolo */}
                  {sectionMatchesSearch(detail.label?.frasi_pericolo) &&
                    detail.label?.frasi_pericolo &&
                    Array.isArray(detail.label.frasi_pericolo) &&
                    detail.label.frasi_pericolo.length > 0 && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Frasi di Pericolo
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {detail.label.frasi_pericolo
                            .filter((frasia) => matchesSearch(String(frasia)))
                            .map((frasia, idx) => (
                              <Badge
                                key={idx}
                                className="bg-red-50 text-red-700 border-0 px-3 py-1.5 font-medium text-xs"
                              >
                                {String(frasia)}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Frasi di prudenza */}
                  {sectionMatchesSearch(detail.label?.frasi_prudenza) &&
                    detail.label?.frasi_prudenza &&
                    Array.isArray(detail.label.frasi_prudenza) &&
                    detail.label.frasi_prudenza.length > 0 && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Frasi di Prudenza
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                          {detail.label.frasi_prudenza
                            .filter((frasia) => matchesSearch(String(frasia)))
                            .map((frasia, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 before:content-['•'] before:text-gray-400 before:font-bold before:mr-1"
                              >
                                {String(frasia)}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* Avvertenze */}
                  {sectionMatchesSearch(detail.label?.avvertenze) &&
                    detail.label?.avvertenze &&
                    Array.isArray(detail.label.avvertenze) &&
                    detail.label.avvertenze.length > 0 && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Avvertenze
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                          {detail.label.avvertenze
                            .filter((avvertenza) =>
                              matchesSearch(String(avvertenza))
                            )
                            .map((avvertenza, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 before:content-['•'] before:text-gray-400 before:font-bold before:mr-1"
                              >
                                {String(avvertenza)}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* Caratteristiche */}
                  {detail.label?.caratteristiche &&
                    matchesSearch(detail.label.caratteristiche) && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Caratteristiche
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {detail.label.caratteristiche}
                        </p>
                      </div>
                    )}

                  {/* Note tecniche */}
                  {detail.label?.note_tecniche &&
                    matchesSearch(detail.label.note_tecniche) && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Note Tecniche
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {detail.label.note_tecniche}
                        </p>
                      </div>
                    )}

                  {/* Compatibilità */}
                  {detail.label?.compatibilita &&
                    matchesSearch(detail.label.compatibilita) && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Compatibilità
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {detail.label.compatibilita}
                        </p>
                      </div>
                    )}

                  {/* Fitotossicità */}
                  {detail.label?.fitotossicita &&
                    matchesSearch(detail.label.fitotossicita) && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Fitotossicità
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {detail.label.fitotossicita}
                        </p>
                      </div>
                    )}

                  {/* Errori */}
                  {sectionMatchesSearch(detail.errors) &&
                    detail.errors &&
                    detail.errors.length > 0 && (
                      <div className="space-y-3 bg-red-50 rounded-2xl p-6 shadow-sm border border-red-100">
                        <h3 className="text-base font-semibold text-red-700 pb-2 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Errori
                        </h3>
                        <ul className="space-y-2 text-sm text-red-700">
                          {detail.errors
                            .filter((error) => matchesSearch(error))
                            .map((error, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 before:content-['•'] before:text-red-500 before:font-bold before:mr-1"
                              >
                                {error}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* Errori nel label */}
                  {sectionMatchesSearch(detail.label?.errors) &&
                    detail.label?.errors &&
                    Array.isArray(detail.label.errors) &&
                    detail.label.errors.length > 0 && (
                      <div className="space-y-3 bg-red-50 rounded-2xl p-6 shadow-sm border border-red-100">
                        <h3 className="text-base font-semibold text-red-700 pb-2 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Errori Estrazione
                        </h3>
                        <ul className="space-y-2 text-sm text-red-700">
                          {detail.label.errors
                            .filter((error) => matchesSearch(String(error)))
                            .map((error, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 before:content-['•'] before:text-red-500 before:font-bold before:mr-1"
                              >
                                {String(error)}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* Campi estratti */}
                  {sectionMatchesSearch(detail.extractedFields) &&
                    detail.extractedFields &&
                    detail.extractedFields.length > 0 && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Campi Estratti
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {detail.extractedFields
                            .filter((field) => matchesSearch(field))
                            .map((field, idx) => (
                              <Badge
                                key={idx}
                                className="bg-purple-50 text-purple-700 border-0 px-3 py-1.5 font-medium text-xs"
                              >
                                {field}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Qualità estrazione */}
                  {sectionMatchesSearch(detail.qualityExtraction) &&
                    detail.qualityExtraction &&
                    Array.isArray(detail.qualityExtraction) &&
                    detail.qualityExtraction.length > 0 && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 pb-2">
                          Qualità Estrazione
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {detail.qualityExtraction
                            .filter((quality) => matchesSearch(String(quality)))
                            .map((quality, idx) => (
                              <Badge
                                key={idx}
                                className="bg-indigo-50 text-indigo-700 border-0 px-3 py-1.5 font-medium text-xs"
                              >
                                {quality}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Metadati */}
                  {matchesSearch(
                    detail.id || detail.createdAt || detail.updatedAt
                  ) && (
                    <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                      <h3 className="text-base font-semibold text-gray-900 pb-2">
                        Metadati
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {detail.createdAt && (
                          <div>
                            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                              Creato
                            </span>
                            <p className="text-gray-900 mt-1">
                              {new Date(detail.createdAt).toLocaleString(
                                "it-IT"
                              )}
                            </p>
                          </div>
                        )}
                        {detail.updatedAt && (
                          <div>
                            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                              Aggiornato
                            </span>
                            <p className="text-gray-900 mt-1">
                              {new Date(detail.updatedAt).toLocaleString(
                                "it-IT"
                              )}
                            </p>
                          </div>
                        )}
                        {detail.id && (
                          <div className="col-span-2">
                            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                              ID
                            </span>
                            <p className="text-gray-900 mt-1 font-mono text-xs break-all">
                              {detail.id}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Raw Text */}
                  {detail.rawText &&
                    (matchesSearch(detail.rawText) || !searchTerm) && (
                      <div className="space-y-3 bg-white rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between pb-2">
                          <h3 className="text-base font-semibold text-gray-900">
                            Testo Estratto (Raw Text)
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRawTextOpen(!rawTextOpen)}
                            className="h-8 text-xs bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                          >
                            {rawTextOpen ? "Nascondi" : "Mostra"}
                          </Button>
                        </div>
                        {rawTextOpen && (
                          <ScrollArea className="h-[400px] w-full rounded-xl p-4 bg-gray-50">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                              {detail.rawText}
                            </pre>
                          </ScrollArea>
                        )}
                      </div>
                    )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun dettaglio disponibile per questa etichetta.
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet secondario per il PDF */}
      {detail?.sourceUrl && (
        <Sheet open={pdfDrawerOpen} onOpenChange={setPdfDrawerOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-4xl bg-gray-50 flex flex-col h-full overflow-hidden p-0"
          >
            <SheetHeader className="flex-shrink-0 px-6 pt-6 pb-4 bg-white border-b border-gray-100">
              <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <File className="h-5 w-5 text-gray-600" />
                PDF Etichetta - {detail.productName}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Visualizzazione PDF dell'etichetta
              </SheetDescription>
              {detail.registrationNumber && (
                <Badge
                  variant="outline"
                  className="bg-white border-gray-200 text-gray-600 font-mono text-xs px-3 py-1 mt-2"
                >
                  Reg. {detail.registrationNumber}
                </Badge>
              )}
            </SheetHeader>
            <div className="flex-1 overflow-hidden p-6">
              <div className="w-full h-full bg-white rounded-2xl shadow-sm overflow-hidden">
                <iframe
                  src={detail.sourceUrl}
                  className="w-full h-full"
                  title="PDF Etichetta"
                  style={{ minHeight: "600px" }}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
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
      createdAt: new Date(job.createdAt),
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
      alertNotes: job.alertNotes ?? null,
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

// Helper per convertire EditableTableRowData[] a JobRow[]
function convertToJobRows(rows: EditableTableRowData[]): JobRow[] {
  return rows as JobRow[];
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
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [isBulkVerifying, setIsBulkVerifying] = useState<boolean>(false);
  const [historySheetOpen, setHistorySheetOpen] = useState<boolean>(false);
  const [selectedJobHistory] = useState<JobHistoryEntry[]>([]);
  const [selectedJobCode] = useState<string>("");
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(
    null
  );
  // Rimosso uso della paginazione nella vista "Tutte"
  const [selectedAllRows, setSelectedAllRows] = useState<
    EditableTableRowData[]
  >([]);
  const [selectedAllJobIds, setSelectedAllJobIds] = useState<string[]>([]);
  const [allSelectedJobs, setAllSelectedJobs] = useState<JobWithRelations[]>(
    []
  );
  const [isLoadingSelectedJobs, setIsLoadingSelectedJobs] =
    useState<boolean>(false);
  const [errorSelectedJobs, setErrorSelectedJobs] = useState<unknown>(null);
  const [selectedReviewRows, setSelectedReviewRows] = useState<
    EditableTableRowData[]
  >([]);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState<boolean>(false);
  const [labelSheetOpen, setLabelSheetOpen] = useState<boolean>(false);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [historyPanelWidth, setHistoryPanelWidth] = useState<number>(320); // Default: 320px (w-80)
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [isGroupsSidebarOpen, setIsGroupsSidebarOpen] = useState<boolean>(true);
  const [groupsSidebarWidth, setGroupsSidebarWidth] = useState<number>(288); // Default: 288px (w-72)
  const [rightSidebarMode, setRightSidebarMode] = useState<
    "details" | "history"
  >("details");

  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile && viewMode !== "review") {
      setViewMode("review");
    }
  }, [isMobile, viewMode]);

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
  const { labels } = useLabelsSummary();
  const bulkVerifier = useMemo(() => new JobBulkVerifier(jobsApiService), []);

  // Hook per la vista "da confermare" - API mirate
  const {
    groups: jobGroupsSummary,
    isLoading: isLoadingGroupsSummary,
    error: jobGroupsSummaryError,
    refetch: refetchGroupsSummary,
  } = useJobGroupsSummary();

  const {
    jobs: selectedGroupJobs,
    isLoading: isLoadingGroupDetail,
    refetch: refetchGroupDetail,
  } = useJobGroupDetail(selectedGroupCode);

  // Lista gruppi per la vista "Tutte" (ordine decrescente per data, poi jobId)
  const sortedAllJobGroups = useMemo(() => {
    const sorted = [...jobGroupsSummary];
    return sorted.sort((a, b) => {
      const dateDiff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.jobId.localeCompare(a.jobId);
    });
  }, [jobGroupsSummary]);

  const selectedAllRowsHistory = useMemo(() => {
    const history: JobHistoryEntry[] = [];
    selectedAllRows.forEach((row) => {
      const rowHistory = (row._history as JobHistoryEntry[]) ?? [];
      history.push(...rowHistory);
    });

    const uniqueHistory = new Map<string, JobHistoryEntry>();
    history.forEach((entry) => {
      const key = `${entry.step}-${entry.title}-${entry.value}-${entry.timestamp}`;
      if (!uniqueHistory.has(key)) {
        uniqueHistory.set(key, entry);
      }
    });

    return Array.from(uniqueHistory.values()).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [selectedAllRows]);

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
    registrationNumber?: string,
    showToast: boolean = true
  ) => {
    const labelId = findLabelByProduct(productName, registrationNumber);
    if (labelId) {
      setSelectedLabelId(labelId);
      setLabelSheetOpen(true);
    } else if (showToast) {
      toast.info("Etichetta non trovata", {
        description: registrationNumber
          ? `${productName} (Reg. ${registrationNumber})`
          : productName,
        position: "top-center",
      });
    }
  };

  // Rows per la vista "Tutte" ottenuti dal dettaglio del jobId corrente
  const jobIdOptions = useMemo(() => {
    return sortedAllJobGroups.map((group) => ({
      value: group.jobId,
      label: `Operazione ${group.jobId} creata il ${new Date(
        group.createdAt
      ).toLocaleDateString("it-IT")}`,
      jobId: group.jobId,
      createdAt: group.createdAt,
    }));
  }, [sortedAllJobGroups]);

  useEffect(() => {
    if (jobIdOptions.length > 0 && selectedAllJobIds.length === 0) {
      // seleziona l'ultima per data (lista già ordinata per createdAt desc)
      setSelectedAllJobIds([jobIdOptions[0].value]);
    }
  }, [jobIdOptions, selectedAllJobIds.length]);

  useEffect(() => {
    const fetchSelectedJobs = async () => {
      if (selectedAllJobIds.length === 0) {
        setAllSelectedJobs([]);
        return;
      }
      setIsLoadingSelectedJobs(true);
      setErrorSelectedJobs(null);
      try {
        const responses = await Promise.all(
          selectedAllJobIds.map((jobId) => jobsApiService.getGroupDetail(jobId))
        );
        const jobs = responses.flatMap((res) => res.data.jobs ?? []);
        setAllSelectedJobs(jobs);
      } catch (err) {
        setErrorSelectedJobs(err);
      } finally {
        setIsLoadingSelectedJobs(false);
      }
    };

    fetchSelectedJobs();
  }, [selectedAllJobIds]);

  const allGroupRows = useMemo(() => {
    if (!allSelectedJobs || allSelectedJobs.length === 0) return [];
    return allSelectedJobs.map((jobWithRelations) =>
      new JobTableRowBuilder(jobWithRelations).build()
    );
  }, [allSelectedJobs]);

  useEffect(() => {
    setSelectedAllRows([]);
  }, [selectedAllJobIds]);

  const allViewError = jobGroupsSummaryError ?? errorSelectedJobs;
  const isLoadingAllView = isLoadingGroupsSummary || isLoadingSelectedJobs;

  useEffect(() => {
    if (viewMode === "all") {
      setSelectedReviewRows([]);
    } else {
      setSelectedAllRows([]);
    }
  }, [viewMode]);

  // Conteggio totale operazioni non verificate (dalla summary API)
  const totalPendingOperations = useMemo(() => {
    return jobGroupsSummary.reduce(
      (acc, group) => acc + group.pendingOperations,
      0
    );
  }, [jobGroupsSummary]);

  // Filtra solo i gruppi con operazioni pendenti per la vista review
  const pendingJobGroups = useMemo(() => {
    return jobGroupsSummary.filter((group) => group.pendingOperations > 0);
  }, [jobGroupsSummary]);

  // Auto-seleziona il primo gruppo quando i dati arrivano e nessun gruppo è selezionato
  useEffect(() => {
    if (
      pendingJobGroups.length > 0 &&
      !selectedGroupCode &&
      viewMode === "review"
    ) {
      setSelectedGroupCode(pendingJobGroups[0].jobId);
    }
  }, [pendingJobGroups, selectedGroupCode, viewMode]);

  // Gruppo selezionato dalla summary
  const selectedGroupSummary = useMemo(() => {
    if (selectedGroupCode) {
      return (
        pendingJobGroups.find((g) => g.jobId === selectedGroupCode) ?? null
      );
    }
    return pendingJobGroups[0] ?? null;
  }, [pendingJobGroups, selectedGroupCode]);

  // History estratta dai job del gruppo selezionato
  const selectedGroupHistory = useMemo(() => {
    if (!selectedGroupJobs || selectedGroupJobs.length === 0) return [];

    const allHistory: JobHistoryEntry[] = [];
    selectedGroupJobs.forEach((jobWithRelations) => {
      if (jobWithRelations.job.history) {
        allHistory.push(...jobWithRelations.job.history);
      }
    });

    // Rimuovi duplicati e ordina per timestamp
    const uniqueHistory = new Map<string, JobHistoryEntry>();
    allHistory.forEach((entry) => {
      const key = `${entry.step}-${entry.title}-${entry.value}-${entry.timestamp}`;
      if (!uniqueHistory.has(key)) {
        uniqueHistory.set(key, entry);
      }
    });

    return Array.from(uniqueHistory.values()).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [selectedGroupJobs]);

  // Rows per il gruppo selezionato
  const selectedGroupRows = useMemo(() => {
    if (!selectedGroupJobs || selectedGroupJobs.length === 0) return [];
    return selectedGroupJobs.map((jobWithRelations) =>
      new JobTableRowBuilder(jobWithRelations).build()
    );
  }, [selectedGroupJobs]);

  // Indice del gruppo selezionato e navigazione tra gruppi
  const currentGroupIndex = useMemo(() => {
    if (!selectedGroupSummary) return -1;
    return pendingJobGroups.findIndex(
      (g) => g.jobId === selectedGroupSummary.jobId
    );
  }, [pendingJobGroups, selectedGroupSummary]);

  const canGoToPreviousGroup = currentGroupIndex > 0;
  const canGoToNextGroup =
    currentGroupIndex < pendingJobGroups.length - 1 && currentGroupIndex >= 0;

  const goToPreviousGroup = () => {
    if (canGoToPreviousGroup) {
      setSelectedGroupCode(pendingJobGroups[currentGroupIndex - 1].jobId);
      setSelectedReviewRows([]);
    }
  };

  const goToNextGroup = () => {
    if (canGoToNextGroup) {
      setSelectedGroupCode(pendingJobGroups[currentGroupIndex + 1].jobId);
      setSelectedReviewRows([]);
    }
  };

  // Colonne per la tabella editabile (vista "Tutte")
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
      id: "treatedSurface",
      title: "Superficie Trattata (ha)",
      type: "number",
      width: "180px",
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
      id: "avversity",
      title: "Avversità",
      type: "text",
      width: "150px",
      readOnly: true,
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
      await Promise.all([refetchGroupsSummary(), refetchGroupDetail()]);
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
      await Promise.all([refetchGroupsSummary(), refetchGroupDetail()]);
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

      await Promise.all([refetchGroupsSummary(), refetchGroupDetail()]);
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
    <AllJobsView
      error={allViewError}
      isLoading={isLoadingAllView}
      jobsLength={allGroupRows.length}
      columns={columns}
      rows={allGroupRows}
      jobIdOptions={jobIdOptions}
      selectedJobIds={selectedAllJobIds}
      onJobIdsChange={setSelectedAllJobIds}
      onSave={handleSave}
      onDeleteSelected={handleDeleteSelected}
      onBulkVerifySelected={handleBulkVerifySelected}
      isBulkVerifying={isBulkVerifying}
      selectedRows={selectedAllRows}
      onSelectionChange={setSelectedAllRows}
      historyPanelWidth={historyPanelWidth}
      rightSidebarMode={rightSidebarMode}
      onRightSidebarModeChange={setRightSidebarMode}
      onResizeStart={handleResizeStart}
      isResizing={isResizing}
      selectedRowsHistory={selectedAllRowsHistory}
      convertToJobRows={convertToJobRows}
      paginatedJobsCount={allGroupRows.length}
      onClearSelection={() => setSelectedAllRows([])}
      onProductClick={handleOpenLabel}
    />
  );

  // Renderizza la vista "Da confermare" (review)
  const renderReviewView = () => (
    <ReviewJobsView
      isMobile={isMobile}
      isGroupsSidebarOpen={isGroupsSidebarOpen}
      onToggleGroupsSidebar={setIsGroupsSidebarOpen}
      groupsSidebarWidth={groupsSidebarWidth}
      onGroupsResizeStart={handleGroupsSidebarResizeStart}
      isResizingGroupsSidebar={isResizingGroupsSidebar}
      pendingJobGroups={pendingJobGroups}
      totalPendingOperations={totalPendingOperations}
      isLoadingGroupsSummary={isLoadingGroupsSummary}
      selectedGroupSummary={selectedGroupSummary}
      selectedGroupRows={selectedGroupRows}
      selectedGroupHistory={selectedGroupHistory}
      onSelectGroup={setSelectedGroupCode}
      selectedReviewRows={selectedReviewRows}
      onSelectionChange={setSelectedReviewRows}
      isLoadingGroupDetail={isLoadingGroupDetail}
      reviewColumns={reviewColumns}
      onSave={handleSave}
      onDeleteSelected={handleDeleteSelected}
      onBulkVerifySelected={handleBulkVerifySelected}
      isBulkVerifying={isBulkVerifying}
      canGoToPreviousGroup={canGoToPreviousGroup}
      canGoToNextGroup={canGoToNextGroup}
      onPreviousGroup={goToPreviousGroup}
      onNextGroup={goToNextGroup}
      currentGroupIndex={currentGroupIndex}
      totalGroups={pendingJobGroups.length}
      historyPanelWidth={historyPanelWidth}
      rightSidebarMode={rightSidebarMode}
      onRightSidebarModeChange={setRightSidebarMode}
      onResizeStart={handleResizeStart}
      isResizing={isResizing}
      onProductClick={handleOpenLabel}
      mobileHistoryOpen={mobileHistoryOpen}
      onMobileHistoryChange={setMobileHistoryOpen}
      convertToJobRows={convertToJobRows}
    />
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PageHeader title="Operazioni">
        {!isMobile && (
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
                {totalPendingOperations > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 min-w-5 px-1.5 text-xs"
                  >
                    {totalPendingOperations}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </PageHeader>

      {!isMobile && viewMode === "all"
        ? renderAllJobsView()
        : renderReviewView()}

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
