import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Package,
  Calendar,
  Sprout,
  AlertTriangle,
  Shield,
  Droplet,
  Clock,
  Sparkles,
  Building2,
  CheckCircle,
  FileX,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
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
}

class AlertNotesFormatter {
  private readonly alertNotes: AlertNotes | null | undefined;

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

  public getMaxApplications(): string | null {
    if (!this.alertNotes?.n_max_applicazioni) return null;
    return `${this.alertNotes.n_max_applicazioni} ${
      this.alertNotes.n_max_applicazioni_um ?? ""
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

  public getEpocaImpiego(): string | null {
    return this.alertNotes?.epoca_impiego ?? null;
  }

  public getEpocaImpiegoLLM(): string | null {
    return this.alertNotes?.epoca_impiego_llm ?? null;
  }

  public getNoteTecniche(): string | null {
    return this.alertNotes?.note_tecniche ?? null;
  }

  public getModalitaApplicazione(): string | null {
    return this.alertNotes?.modalita_applicazione ?? null;
  }

  public isDdtDateOk(): boolean {
    return this.alertNotes?.ddt_date_is_ok === true;
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
}

export function JobSelectedDetails({
  selectedRows,
  isMobile = false,
}: JobSelectedDetailsProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [expandedFrasiPericolo, setExpandedFrasiPericolo] = useState<
    Set<string>
  >(new Set());
  const [expandedNoteTecniche, setExpandedNoteTecniche] = useState<Set<string>>(
    new Set()
  );
  const [expandedResistenze, setExpandedResistenze] = useState<Set<string>>(
    new Set()
  );
  const [expandedFasceDeriva, setExpandedFasceDeriva] = useState<Set<string>>(
    new Set()
  );
  const [expandedFasceDerivaLLM, setExpandedFasceDerivaLLM] = useState<
    Set<string>
  >(new Set());
  const [expandedFasceAcqua, setExpandedFasceAcqua] = useState<Set<string>>(
    new Set()
  );
  const [expandedFasceColture, setExpandedFasceColture] = useState<Set<string>>(
    new Set()
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
        isMobile ? "bg-white" : "bg-slate-50"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 p-4 bg-white",
          !isMobile && "border-b border-slate-200"
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Dettagli Operazioni
          </span>
          <Badge variant="outline" className="ml-auto">
            {selectedRows.length}
          </Badge>
        </div>
        {selectedRows.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cerca nei dettagli..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-sm h-9"
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3 space-y-3">
          {filteredRows.length === 0 && selectedRows.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
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

            return (
              <div
                key={row.id}
                className={cn(
                  "bg-white rounded-xl p-4 shadow-sm space-y-3",
                  !isMobile && "border border-slate-200"
                )}
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
                          "it-IT"
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
                  <div className="text-xs text-slate-600 font-mono">
                    {row.quantity} {row.unitOfMeasureQuantity}
                  </div>
                </div>

                {hasAlertNotes && (
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    {/* Dose e Acqua Max affiancati */}
                    <div className="grid grid-cols-2 gap-3 items-start">
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

                    {/* Epoca Impiego */}
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Epoca Impiego
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {formatter.getEpocaImpiego() &&
                        matchesSearch(formatter.getEpocaImpiego()) ? (
                          <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                            <span className="text-[10px] font-medium text-green-600 uppercase tracking-wide flex items-center gap-0.5 mb-0.5">
                              <CheckCircle className="h-3 w-3" />
                              Verificata da Etichetta
                            </span>
                            <p className="text-sm text-slate-700">
                              {formatter.getEpocaImpiego()}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide flex items-center gap-0.5 mb-0.5">
                              Verificata da Etichetta
                            </span>
                            <p className="text-xs text-slate-400 italic">
                              non presente
                            </p>
                          </div>
                        )}
                        {formatter.getEpocaImpiegoLLM() &&
                        matchesSearch(formatter.getEpocaImpiegoLLM()) ? (
                          <div className="bg-blue-50 rounded-lg p-2">
                            <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide block mb-0.5">
                              AI Suggerita
                            </span>
                            <p className="text-sm text-slate-700">
                              {formatter.getEpocaImpiegoLLM()}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-lg p-2">
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-0.5">
                              AI Suggerita
                            </span>
                            <p className="text-xs text-slate-400 italic">
                              non presente
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Max Applicazioni e Modalità affiancati */}
                    <div className="grid grid-cols-2 gap-3">
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

                    {/* Fasce di rispetto e derivati */}
                    {/* Stock - Utilizzato e Necessario affiancati */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-red-700 uppercase tracking-wide block">
                          Stock mancante
                        </span>
                        {formatter.getStockOut() &&
                        matchesSearch(formatter.getStockOut()) ? (
                          <p className="text-sm text-red-700 font-medium underline">
                            {formatter.getStockOut()}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            stock disponibile
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">
                          Stock Necessario
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

                    {/* Data DDT */}
                    {!formatter.isDdtDateOk() && (
                      <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                        <div className="flex items-start gap-1.5">
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
                      </div>
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
                          <div className="space-y-1">
                            {formatter
                              .getFasceDeriva()
                              .filter((f) => matchesSearch(f))
                              .map((fascia, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-1.5 text-xs text-slate-700 bg-slate-50 rounded p-2 border border-slate-100"
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
                          <Sparkles className="h-3 w-3 text-blue-600 shrink-0" />
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
                          <div className="space-y-1">
                            {formatter
                              .getFasceDerivaLLM()
                              .filter((f) => matchesSearch(f))
                              .map((fascia, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 rounded p-2 border border-blue-100"
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
                          <div className="space-y-1">
                            {formatter
                              .getFasceAcqua()
                              .filter((f) => matchesSearch(f))
                              .map((fascia, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-1.5 text-xs text-sky-700 bg-sky-50 rounded p-2 border border-sky-100"
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
                          <div className="space-y-1">
                            {formatter
                              .getFasceColture()
                              .filter((f) => matchesSearch(f))
                              .map((fascia, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded p-2 border border-emerald-100"
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
                                matchesSearch(r.raccomandazioni)
                            ) ? (
                            <div className="space-y-2">
                              {formatter
                                .getResistenze()
                                .filter(
                                  (r) =>
                                    matchesSearch(r.testo_completo) ||
                                    matchesSearch(r.raccomandazioni)
                                )
                                .map((resistenza, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-amber-50 rounded-lg p-2 space-y-1"
                                  >
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
                            <p className="text-xs text-slate-400 italic">
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
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {formatter.getNoteTecniche()}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
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
                            <div className="space-y-1">
                              {formatter
                                .getFrasiPericolo()
                                .filter((f) => matchesSearch(f))
                                .map((frase, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded p-2"
                                  >
                                    <span className="text-red-400 font-bold shrink-0">
                                      •
                                    </span>
                                    <span>{frase}</span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              non presente
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {!hasAlertNotes && (
                  <div className="border-t border-slate-100 pt-3">
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
                      <p className="text-xs text-slate-400 italic text-center py-2">
                        Nessun alert note disponibile
                      </p>
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
