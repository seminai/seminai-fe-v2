import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Package,
  Calendar,
  Sprout,
  Building2,
  Droplet,
  Clock,
  AlertTriangle,
  Shield,
  FileX,
  FileText,
  Bot,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface AlertNotes {
  dose_um?: string;
  malattie?: string[];
  acqua_max?: number;
  stock_out?: number;
  resistenze?: Array<{
    testo_completo?: string;
    raccomandazioni?: string;
  }>;
  dose_minima?: number;
  acqua_max_um?: string;
  dose_massima?: number;
  stock_out_um?: string;
  stock_in_warehouse?: number;
  stock_in_warehouse_um?: string;
  epoca_impiego?: string;
  note_tecniche?: string;
  frasi_pericolo?: string[];
  resistenze_llm?: string | null;
  epoca_impiego_llm?: string;
  n_max_applicazioni?: number;
  fasce_rispetto_acqua?: string[] | string | null;
  modalita_applicazione?: string;
  n_max_applicazioni_um?: string;
  fasce_rispetto_colture?: string[] | string | null;
  fasce_di_rispetto_e_deriva?: string[] | string | null;
  total_stock_required_for_jobs?: number;
  fasce_di_rispetto_e_deriva_llm?: string[] | string | null;
  total_stock_required_for_jobs_um?: string;
  colture_target_fuori_periodo_di_produzione?: string | null;
  colture_target_fuori_periodo_di_produzione_llm?: string | null;
  ddt_date_is_ok?: boolean | null;
  ddt_date_conformity?: string | boolean | null;
  ddt_date_after_treatment?: string | boolean | null;
  /** When true, DDT code is present and valid; when absent, treated as unknown (no alert if date is ok). */
  ddt_code_is_ok?: boolean | null;
  /** DDT code value; if present and non-empty, considered as "code present" for alert logic. */
  ddt_code?: string | null;
  waterHlJob?: number | null;
  acquaMaxJob?: number | null;
  acquaMaxJob_um?: string | null;
  principio_attivo?: string | null;
  dose_minima_hl_job?: number | null;
  dose_massima_hl_job?: number | null;
  /** Disciplinare rules info: can be null or empty array */
  disciplinare_info?: DisciplinareInfoItem[] | null;
}

export interface DisciplinareInfoSource {
  ruleId?: string;
  ruleName?: string;
  chunkText?: string;
  pdfFileUrl?: string;
}

export interface DisciplinareInfoItem {
  dosaggi?: unknown[] | null;
  sources?: DisciplinareInfoSource[];
  avversita?: string[];
  sostanza_attiva?: string;
  n_max_interventi_sa?: number;
  gruppo_sostanze_attive?: string[];
  limitazioni_uso_e_note?: string | null;
  n_max_interventi_gruppo?: number | null;
  n_max_interventi_sa_scope?: string | null;
  n_max_interventi_gruppo_scope?: string | null;
}

export interface JobRow {
  id: string;
  jobCode: string;
  productName: string;
  productionUnitName: string;
  companyName: string;
  note?: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  dateOfOpeation: Date;
  alertNotes?: AlertNotes | null;
  [key: string]: unknown;
}

interface JobSelectedDetailsProps {
  selectedRows: JobRow[];
  isMobile?: boolean;
  hideSearch?: boolean;
  externalSearchTerm?: string;
}

class AlertNotesFormatter {
  private readonly alertNotes: AlertNotes | null | undefined;
  private readonly emptyValueTokens = new Set([
    "non presente",
    "n/a",
    "na",
    "-",
    "null",
    "undefined",
  ]);

  constructor(alertNotes: AlertNotes | null | undefined) {
    this.alertNotes = alertNotes;
  }

  public hasAnyData(): boolean {
    return this.alertNotes !== null && this.alertNotes !== undefined;
  }

  public getDoseRange(): string | null {
    if (!this.alertNotes?.dose_minima || !this.alertNotes?.dose_massima) {
      return null;
    }
    const { dose_minima, dose_massima, dose_um } = this.alertNotes;
    if (dose_minima === dose_massima) {
      return `${dose_minima} ${dose_um ?? ""}`;
    }
    return `${dose_minima} - ${dose_massima} ${dose_um ?? ""}`;
  }

  public getAcquaMax(): string | null {
    if (!this.alertNotes?.acqua_max) return null;
    return `${this.alertNotes.acqua_max} ${this.alertNotes.acqua_max_um ?? ""}`;
  }

  public getEpocaImpiego(): string | null {
    return this.normalizeText(this.alertNotes?.epoca_impiego);
  }

  public getEpocaImpiegoLLM(): string | null {
    return this.normalizeText(this.alertNotes?.epoca_impiego_llm);
  }

  public getMaxApplications(): string | null {
    if (!this.alertNotes?.n_max_applicazioni) return null;
    return `${this.alertNotes.n_max_applicazioni} ${
      this.alertNotes.n_max_applicazioni_um ?? ""
    }`;
  }

  public getModalitaApplicazione(): string | null {
    return this.alertNotes?.modalita_applicazione ?? null;
  }

  public getStockOut(): string | null {
    if (!this.alertNotes?.stock_out) return null;
    return `${this.alertNotes.stock_out} ${this.alertNotes.stock_out_um ?? ""}`;
  }

  public getTotalStockRequired(): string | null {
    if (!this.alertNotes?.total_stock_required_for_jobs) return null;
    return `${this.alertNotes.total_stock_required_for_jobs} ${
      this.alertNotes.total_stock_required_for_jobs_um ?? ""
    }`;
  }

  public getMalattie(): string[] {
    return this.alertNotes?.malattie ?? [];
  }

  public getFrasiPericolo(): string[] {
    return this.alertNotes?.frasi_pericolo ?? [];
  }

  public getResistenze(): Array<{
    testo_completo?: string;
    raccomandazioni?: string;
  }> {
    return this.alertNotes?.resistenze ?? [];
  }

  public getNoteTecniche(): string | null {
    return this.alertNotes?.note_tecniche ?? null;
  }

  public isDdtDateOk(): boolean {
    return this.alertNotes?.ddt_date_is_ok === true;
  }

  /** True when DDT code is present. If backend sends no code-related fields, treated as ok (backward compatibility). */
  public isDdtCodeOk(): boolean {
    const notes = this.alertNotes;
    if (notes?.ddt_code_is_ok === true) return true;
    if (notes?.ddt_code_is_ok === false) return false;
    const code = notes?.ddt_code;
    if (code === undefined || code === null) return true;
    if (typeof code === "string" && code.trim() !== "") return true;
    return false;
  }

  /** Show "Data DDT Mancante" when date or code is missing. No alert when both date and code are present. */
  public shouldShowDdtMissingAlert(): boolean {
    return !(this.isDdtDateOk() && this.isDdtCodeOk());
  }

  public getFasceDeriva(): string[] {
    return this.toArray(this.alertNotes?.fasce_di_rispetto_e_deriva);
  }

  public getFasceDerivaLLM(): string[] {
    return this.toArray(this.alertNotes?.fasce_di_rispetto_e_deriva_llm);
  }

  public getFasceAcqua(): string[] {
    return this.toArray(this.alertNotes?.fasce_rispetto_acqua);
  }

  public getFasceColture(): string[] {
    return this.toArray(this.alertNotes?.fasce_rispetto_colture);
  }

  private toArray(value?: string | string[] | null): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return value.trim() ? [value] : [];
  }

  private normalizeText(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (this.emptyValueTokens.has(trimmed.toLowerCase())) {
      return null;
    }
    return trimmed;
  }
}

export function JobSelectedDetails({
  selectedRows,
  isMobile = false,
  hideSearch = false,
  externalSearchTerm,
}: JobSelectedDetailsProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState<string>("");
  const searchTerm =
    externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const [expandedFrasiPericolo, setExpandedFrasiPericolo] = useState<
    Set<string>
  >(new Set());
  const [expandedNoteTecniche, setExpandedNoteTecniche] = useState<Set<string>>(
    new Set(),
  );
  const [expandedResistenze, setExpandedResistenze] = useState<Set<string>>(
    new Set(),
  );
  const [expandedFasceDeriva, setExpandedFasceDeriva] = useState<Set<string>>(
    new Set(),
  );
  const [expandedFasceDerivaLLM, setExpandedFasceDerivaLLM] = useState<
    Set<string>
  >(new Set());
  const [expandedFasceAcqua, setExpandedFasceAcqua] = useState<Set<string>>(
    new Set(),
  );
  const [expandedFasceColture, setExpandedFasceColture] = useState<Set<string>>(
    new Set(),
  );

  // Funzione per verificare se un testo corrisponde al termine di ricerca
  const matchesSearch = (text: string | null | undefined): boolean => {
    if (!searchTerm.trim()) return true;
    if (!text) return false;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  // Filtra le righe selezionate in base al termine di ricerca
  const filteredRows = selectedRows.filter((row) => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      row.jobCode?.toLowerCase().includes(searchLower) ||
      row.productName?.toLowerCase().includes(searchLower) ||
      row.productionUnitName?.toLowerCase().includes(searchLower) ||
      row.companyName?.toLowerCase().includes(searchLower) ||
      row.note?.toLowerCase().includes(searchLower) ||
      JSON.stringify(row.alertNotes ?? "")
        .toLowerCase()
        .includes(searchLower)
    );
  });

  return (
    <div
      className={cn(
        "h-full flex flex-col",
        isMobile ? "bg-white" : "bg-slate-50",
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 p-4 bg-white",
          !isMobile && "border-b border-slate-200",
        )}
      >
        {selectedRows.length > 0 && !hideSearch && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cerca nei dettagli..."
              value={searchTerm}
              onChange={(e) => {
                if (externalSearchTerm === undefined) {
                  setInternalSearchTerm(e.target.value);
                }
              }}
              disabled={externalSearchTerm !== undefined}
              className="pl-8 text-sm h-9"
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-6">
          {filteredRows.length === 0 && selectedRows.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <p>Seleziona delle operazioni</p>
              <p className="text-xs mt-1">per visualizzare i dettagli</p>
            </div>
          )}
          {filteredRows.length === 0 && selectedRows.length > 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessun risultato trovato</p>
            </div>
          )}
          {filteredRows.map((row) => {
            const formatter = new AlertNotesFormatter(row.alertNotes);
            const hasAlertNotes = formatter.hasAnyData();
            const epocaImpiego = formatter.getEpocaImpiego();
            const epocaImpiegoLLM = formatter.getEpocaImpiegoLLM();
            const showEpocaImpiego =
              epocaImpiego !== null && matchesSearch(epocaImpiego);
            const showEpocaImpiegoLLM =
              epocaImpiegoLLM !== null && matchesSearch(epocaImpiegoLLM);

            return (
              <div
                key={row.id}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-4"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {row.jobCode}
                    </Badge>
                    {row.dateOfOpeation && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(row.dateOfOpeation).toLocaleDateString(
                          "it-IT",
                        )}
                      </span>
                    )}
                  </div>
                  {matchesSearch(row.companyName) && (
                    <div className="flex items-start gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-slate-600 font-medium">
                        {row.companyName}
                      </span>
                    </div>
                  )}
                  {matchesSearch(row.productionUnitName) && (
                    <div className="flex items-start gap-1.5">
                      <Sprout className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-slate-600">
                        {row.productionUnitName}
                      </span>
                    </div>
                  )}
                  {matchesSearch(row.productName) && (
                    <div className="flex items-start gap-1.5">
                      <Package className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium text-slate-700">
                        {row.productName}
                      </span>
                    </div>
                  )}
                  {row.alertNotes?.principio_attivo &&
                    matchesSearch(row.alertNotes.principio_attivo) && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Principio Attivo:{" "}
                        </span>
                        <span className="text-sm text-slate-700 font-medium">
                          {row.alertNotes.principio_attivo}
                        </span>
                      </div>
                    )}
                  <div className="text-xs text-slate-600 font-mono">
                    {row.quantity} {row.unitOfMeasureQuantity}
                  </div>
                </div>

                {hasAlertNotes && (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    {/* Dose e Acqua Max */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Droplet className="h-3 w-3" />
                          Dose
                        </span>
                        {formatter.getDoseRange() &&
                        matchesSearch(formatter.getDoseRange()) ? (
                          <p className="text-sm text-slate-700 font-medium">
                            {formatter.getDoseRange()}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            non presente
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Droplet className="h-3 w-3 text-slate-500" />
                          Acqua Max
                        </span>
                        {formatter.getAcquaMax() &&
                        matchesSearch(formatter.getAcquaMax()) ? (
                          <p className="text-sm text-slate-700">
                            {formatter.getAcquaMax()}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            non presente
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Acqua per Job */}
                    {(row.alertNotes?.waterHlJob !== null &&
                      row.alertNotes?.waterHlJob !== undefined) ||
                    (row.alertNotes?.acquaMaxJob !== null &&
                      row.alertNotes?.acquaMaxJob !== undefined) ? (
                      <div className="grid grid-cols-2 gap-4">
                        {row.alertNotes?.waterHlJob !== null &&
                        row.alertNotes?.waterHlJob !== undefined ? (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                              <Droplet className="h-3 w-3" />
                              Acqua (hl) Job
                            </span>
                            <p className="text-sm text-slate-700 font-medium">
                              {row.alertNotes.waterHlJob} hl
                            </p>
                          </div>
                        ) : null}
                        {row.alertNotes?.acquaMaxJob !== null &&
                        row.alertNotes?.acquaMaxJob !== undefined ? (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                              <Droplet className="h-3 w-3 text-slate-500" />
                              Acqua Max Job
                            </span>
                            <p className="text-sm text-slate-700">
                              {row.alertNotes.acquaMaxJob}{" "}
                              {row.alertNotes.acquaMaxJob_um ?? "L"}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Epoca Impiego */}
                    <div className="space-y-3">
                      {showEpocaImpiego ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                              Epoca impiego etichetta:
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 pl-5">
                            {epocaImpiego}
                          </p>
                        </div>
                      ) : !showEpocaImpiegoLLM ? (
                        <p className="text-xs text-slate-400 italic">
                          non presente
                        </p>
                      ) : null}
                      {showEpocaImpiegoLLM ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                              Epoca di impiego suggerita da AI:
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 pl-5">
                            {epocaImpiegoLLM}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* Max Applicazioni e Modalità */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Max Applicazioni
                        </span>
                        {formatter.getMaxApplications() &&
                        matchesSearch(formatter.getMaxApplications()) ? (
                          <p className="text-sm text-slate-700">
                            {formatter.getMaxApplications()}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            non presente
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Modalità
                        </span>
                        {formatter.getModalitaApplicazione() &&
                        matchesSearch(formatter.getModalitaApplicazione()) ? (
                          <p className="text-sm text-slate-700">
                            {formatter.getModalitaApplicazione()}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            non presente
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stock - Disponibilità e Fabbisogno trattamenti */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          Stato disponibilità
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border border-slate-700 shadow-lg">
                              Indica se lo stock in magazzino è sufficiente per
                              tutti i trattamenti previsti con {row.productName}
                              . Se manca quantità, viene mostrata quella da
                              integrare.
                            </TooltipContent>
                          </Tooltip>
                        </span>
                        {formatter.getStockOut() &&
                        matchesSearch(formatter.getStockOut()) ? (
                          <p className="text-sm text-amber-700 font-medium">
                            Quantità da integrare: {formatter.getStockOut()}
                          </p>
                        ) : (
                          <p className="text-sm text-emerald-600 font-medium">
                            Stock sufficiente
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          Fabbisogno trattamenti
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border border-slate-700 shadow-lg">
                              Quantità totale necessaria per tutti i trattamenti
                              pianificati con {row.productName}
                              (non lo stock in magazzino).
                            </TooltipContent>
                          </Tooltip>
                        </span>
                        {formatter.getTotalStockRequired() &&
                        matchesSearch(formatter.getTotalStockRequired()) ? (
                          <p className="text-sm text-slate-700 font-medium">
                            {formatter.getTotalStockRequired()}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            non presente
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Data DDT: no alert when both date and code are present */}
                    {formatter.shouldShowDdtMissingAlert() && (
                      <div className="flex items-start gap-1.5 p-2 border border-red-200 rounded">
                        <FileX className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-red-700 block mb-0.5">
                            Data DDT Mancante
                          </span>
                          <p className="text-xs text-red-600 leading-relaxed">
                            Manca la data del DDT caricata per questo stock
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Data DDT After Treatment */}
                    {row.alertNotes?.ddt_date_after_treatment === true && (
                      <div className="flex items-start gap-1.5 p-2 border border-red-200 rounded">
                        <FileX className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-red-700 block mb-0.5">
                            Data DDT Dopo Trattamento
                          </span>
                          <p className="text-xs text-red-600 leading-relaxed">
                            La data del DDT è successiva alla data del
                            trattamento
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Note AI */}
                    {row.note && matchesSearch(row.note) && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="note-ai" className="border-0">
                          <AccordionTrigger className="py-2 hover:no-underline">
                            <div className="flex items-center gap-1.5 w-full">
                              <Bot className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                Note AI
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-0">
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {row.note}
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    {/* Disciplinari */}
                    {Array.isArray(row.alertNotes?.disciplinare_info) &&
                    row.alertNotes.disciplinare_info.length > 0 && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="disciplinari" className="border-0">
                          <AccordionTrigger className="py-2 hover:no-underline">
                            <div className="flex items-center gap-1.5 w-full">
                              <BookOpen className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                Disciplinari
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-0">
                            <div className="space-y-4">
                              {row.alertNotes.disciplinare_info.map(
                                (info, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2"
                                  >
                                    {info.sostanza_attiva && (
                                      <div className="flex items-start gap-1.5">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0">
                                          Sostanza attiva:
                                        </span>
                                        <span className="text-sm font-medium text-slate-700">
                                          {info.sostanza_attiva}
                                        </span>
                                      </div>
                                    )}
                                    {info.n_max_interventi_sa != null && (
                                      <div className="flex items-start gap-1.5">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0">
                                          Max interventi:
                                        </span>
                                        <span className="text-sm text-slate-700">
                                          {info.n_max_interventi_sa}
                                          {info.n_max_interventi_sa_scope && (
                                            <span className="text-slate-500 text-xs">
                                              {" "}
                                              / {info.n_max_interventi_sa_scope}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {info.limitazioni_uso_e_note && (
                                      <div className="flex items-start gap-1.5">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0">
                                          Limitazioni:
                                        </span>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                          {info.limitazioni_uso_e_note}
                                        </p>
                                      </div>
                                    )}
                                    {Array.isArray(info.sources) &&
                                    info.sources.length > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                          Fonti
                                        </span>
                                        <div className="space-y-1">
                                          {info.sources.map((source, sIdx) => (
                                            <div
                                              key={sIdx}
                                              className="flex items-start gap-1.5 text-xs"
                                            >
                                              {source.pdfFileUrl ? (
                                                <a
                                                  href={source.pdfFileUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                                                >
                                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                                  {source.ruleName ??
                                                    "PDF documento"}
                                                </a>
                                              ) : (
                                                <span className="text-slate-700">
                                                  {source.ruleName ?? "-"}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    {/* Malattie */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Malattie
                      </span>
                      {formatter.getMalattie().length > 0 &&
                      formatter.getMalattie().some((m) => matchesSearch(m)) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {formatter
                            .getMalattie()
                            .filter((m) => matchesSearch(m))
                            .map((malattia, idx) => (
                              <Badge
                                key={idx}
                                className="bg-orange-50 text-orange-700 border-0 text-xs"
                              >
                                {malattia}
                              </Badge>
                            ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          non presente
                        </p>
                      )}
                    </div>

                    {/* Fasce di rispetto e deriva */}
                    {formatter.getFasceDeriva().length > 0 && (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setExpandedFasceDeriva((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) {
                                next.delete(row.id);
                              } else {
                                next.add(row.id);
                              }
                              return next;
                            });
                          }}
                          className="w-full text-left flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          <Shield className="h-3 w-3 text-slate-600 shrink-0" />
                          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                            Fasce di rispetto e deriva
                          </span>
                          {expandedFasceDeriva.has(row.id) ? (
                            <ChevronUp className="h-3 w-3 text-slate-600 ml-auto shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-slate-600 ml-auto shrink-0" />
                          )}
                        </button>
                        {expandedFasceDeriva.has(row.id) && (
                          <div className="space-y-1 pl-4">
                            {formatter
                              .getFasceDeriva()
                              .filter((f) => matchesSearch(f))
                              .map((fascia, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-1.5 text-xs text-slate-700"
                                >
                                  <span className="text-slate-400 font-bold shrink-0">
                                    •
                                  </span>
                                  <span>{fascia}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fasce di rispetto e deriva LLM */}
                    {formatter.getFasceDerivaLLM().length > 0 && (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setExpandedFasceDerivaLLM((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) {
                                next.delete(row.id);
                              } else {
                                next.add(row.id);
                              }
                              return next;
                            });
                          }}
                          className="w-full text-left flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          <Shield className="h-3 w-3 text-blue-600 shrink-0" />
                          <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                            Fasce rispetto e deriva (AI)
                          </span>
                          {expandedFasceDerivaLLM.has(row.id) ? (
                            <ChevronUp className="h-3 w-3 text-blue-600 ml-auto shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-blue-600 ml-auto shrink-0" />
                          )}
                        </button>
                        {expandedFasceDerivaLLM.has(row.id) && (
                          <div className="space-y-1 pl-4">
                            {formatter
                              .getFasceDerivaLLM()
                              .filter((f) => matchesSearch(f))
                              .map((fascia, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-1.5 text-xs text-blue-700"
                                >
                                  <span className="text-blue-300 font-bold shrink-0">
                                    •
                                  </span>
                                  <span>{fascia}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fasce rispetto acqua */}
                    {formatter.getFasceAcqua().length > 0 && (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setExpandedFasceAcqua((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) {
                                next.delete(row.id);
                              } else {
                                next.add(row.id);
                              }
                              return next;
                            });
                          }}
                          className="w-full text-left flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          <Droplet className="h-3 w-3 text-sky-600 shrink-0" />
                          <span className="text-xs font-medium text-sky-600 uppercase tracking-wide">
                            Fasce rispetto acqua
                          </span>
                          {expandedFasceAcqua.has(row.id) ? (
                            <ChevronUp className="h-3 w-3 text-sky-600 ml-auto shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-sky-600 ml-auto shrink-0" />
                          )}
                        </button>
                        {expandedFasceAcqua.has(row.id) && (
                          <div className="space-y-1 pl-4">
                            {formatter
                              .getFasceAcqua()
                              .filter((f) => matchesSearch(f))
                              .map((fascia, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-1.5 text-xs text-sky-700"
                                >
                                  <span className="text-sky-300 font-bold shrink-0">
                                    •
                                  </span>
                                  <span>{fascia}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fasce rispetto colture */}
                    {formatter.getFasceColture().length > 0 && (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setExpandedFasceColture((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) {
                                next.delete(row.id);
                              } else {
                                next.add(row.id);
                              }
                              return next;
                            });
                          }}
                          className="w-full text-left flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          <Sprout className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                            Fasce rispetto colture
                          </span>
                          {expandedFasceColture.has(row.id) ? (
                            <ChevronUp className="h-3 w-3 text-emerald-600 ml-auto shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-emerald-600 ml-auto shrink-0" />
                          )}
                        </button>
                        {expandedFasceColture.has(row.id) && (
                          <div className="space-y-1 pl-4">
                            {formatter
                              .getFasceColture()
                              .filter((f) => matchesSearch(f))
                              .map((fascia, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-1.5 text-xs text-emerald-700"
                                >
                                  <span className="text-emerald-300 font-bold shrink-0">
                                    •
                                  </span>
                                  <span>{fascia}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Resistenze */}
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setExpandedResistenze((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(row.id)) {
                              newSet.delete(row.id);
                            } else {
                              newSet.add(row.id);
                            }
                            return newSet;
                          });
                        }}
                        className="w-full text-left flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        <Shield className="h-3 w-3 text-amber-600 shrink-0" />
                        <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                          Resistenze
                        </span>
                        {expandedResistenze.has(row.id) ? (
                          <ChevronUp className="h-3 w-3 text-amber-600 ml-auto shrink-0" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-amber-600 ml-auto shrink-0" />
                        )}
                      </button>
                      {expandedResistenze.has(row.id) && (
                        <>
                          {formatter.getResistenze().length > 0 &&
                          formatter
                            .getResistenze()
                            .some(
                              (r) =>
                                matchesSearch(r.testo_completo) ||
                                matchesSearch(r.raccomandazioni),
                            ) ? (
                            <div className="space-y-2 pl-4">
                              {formatter
                                .getResistenze()
                                .filter(
                                  (r) =>
                                    matchesSearch(r.testo_completo) ||
                                    matchesSearch(r.raccomandazioni),
                                )
                                .map((resistenza, idx) => (
                                  <div key={idx} className="space-y-1">
                                    {resistenza.raccomandazioni && (
                                      <p className="text-xs text-amber-700 font-medium">
                                        {resistenza.raccomandazioni}
                                      </p>
                                    )}
                                    {resistenza.testo_completo && (
                                      <p className="text-xs text-amber-600 leading-relaxed">
                                        {resistenza.testo_completo}
                                      </p>
                                    )}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic pl-4">
                              non presente
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Note Tecniche */}
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setExpandedNoteTecniche((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(row.id)) {
                              newSet.delete(row.id);
                            } else {
                              newSet.add(row.id);
                            }
                            return newSet;
                          });
                        }}
                        className="w-full text-left flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        <FileText className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Note Tecniche
                        </span>
                        {expandedNoteTecniche.has(row.id) ? (
                          <ChevronUp className="h-3 w-3 text-slate-500 ml-auto shrink-0" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-slate-500 ml-auto shrink-0" />
                        )}
                      </button>
                      {expandedNoteTecniche.has(row.id) && (
                        <>
                          {formatter.getNoteTecniche() &&
                          matchesSearch(formatter.getNoteTecniche()) ? (
                            <p className="text-xs text-slate-600 leading-relaxed pl-4">
                              {formatter.getNoteTecniche()}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic pl-4">
                              non presente
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Frasi di Pericolo */}
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setExpandedFrasiPericolo((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(row.id)) {
                              newSet.delete(row.id);
                            } else {
                              newSet.add(row.id);
                            }
                            return newSet;
                          });
                        }}
                        className="w-full text-left flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
                        <span className="text-xs font-medium text-red-600 uppercase tracking-wide">
                          Frasi di Pericolo
                        </span>
                        {expandedFrasiPericolo.has(row.id) ? (
                          <ChevronUp className="h-3 w-3 text-red-600 ml-auto shrink-0" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-red-600 ml-auto shrink-0" />
                        )}
                      </button>
                      {expandedFrasiPericolo.has(row.id) && (
                        <>
                          {formatter.getFrasiPericolo().length > 0 &&
                          formatter
                            .getFrasiPericolo()
                            .some((f) => matchesSearch(f)) ? (
                            <div className="space-y-1 pl-4">
                              {formatter
                                .getFrasiPericolo()
                                .filter((f) => matchesSearch(f))
                                .map((frase, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-1.5 text-xs text-red-700"
                                  >
                                    <span className="text-red-400 font-bold shrink-0">
                                      •
                                    </span>
                                    <span>{frase}</span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic pl-4">
                              non presente
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {!hasAlertNotes && (
                  <div className="border-t border-slate-200 pt-4">
                    {row.note && matchesSearch(row.note) ? (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Note salvate
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {row.note}
                        </p>
                      </div>
                    ) : (
                      <div
                        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left"
                        role="alert"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                          <span className="font-medium">
                            Etichetta da controllare.
                          </span>{" "}
                          Non sono ancora disponibili dettagli o note per questa
                          operazione.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
