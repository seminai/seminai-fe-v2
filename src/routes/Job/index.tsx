import { useState, useMemo } from "react";
import { useJobs } from "@/hooks/useJobs";
import { PageHeader } from "@/components/organism/Header";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// Component to display job history in a Sheet
interface JobHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: JobHistoryEntry[];
  jobCode: string;
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
}: JobHistorySheetProps) {
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

// Componente per mostrare lo storico inline (per la vista review)
interface HistoryPanelProps {
  history: JobHistoryEntry[];
  jobCode: string;
}

function HistoryPanel({ history, jobCode }: HistoryPanelProps) {
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
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex-shrink-0 p-4 bg-white">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Storico Operazione
          </span>
        </div>
        <div className="mt-1">
          <Badge variant="outline" className="font-mono text-xs">
            {jobCode}
          </Badge>
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
                  </div>
                ))}
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-xs">
              Nessuno storico disponibile
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
      dateOfOpeation: new Date(job.dateOfOpeation).toLocaleDateString("it-IT"),
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

      // Usa lo storico più recente se disponibile
      if (
        job.history &&
        job.history.length > 0 &&
        job.history.length > group.history.length
      ) {
        group.history = job.history;
      }
    });

    // Ordina per data di creazione (più recenti prima)
    return Array.from(groupsMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [isBulkVerifying, setIsBulkVerifying] = useState<boolean>(false);
  const [historySheetOpen, setHistorySheetOpen] = useState<boolean>(false);
  const [selectedJobHistory, setSelectedJobHistory] = useState<
    JobHistoryEntry[]
  >([]);
  const [selectedJobCode, setSelectedJobCode] = useState<string>("");
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(
    null
  );

  const { jobs, isLoading, error, refetch } = useJobs();
  const bulkVerifier = useMemo(() => new JobBulkVerifier(jobsApiService), []);

  const handleOpenHistory = (row: Record<string, unknown>) => {
    setSelectedJobHistory(row._history as JobHistoryEntry[]);
    setSelectedJobCode(row.jobCode as string);
    setHistorySheetOpen(true);
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

  // Rows per il gruppo selezionato
  const selectedGroupRows = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.jobs.map((jobWithRelations) =>
      new JobTableRowBuilder(jobWithRelations).build()
    );
  }, [selectedGroup]);

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
      type: "text",
      width: "150px",
      readOnly: true,
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
      type: "text",
      width: "100px",
      readOnly: true,
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
      type: "text",
      width: "100px",
      readOnly: true,
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
        const companyId = row._companyId as string;

        // 1. Aggiorna lo stato di verifica
        await jobsApiService.updateJob(jobId, { isVerified });

        // 2. Gestisci le modifiche dello stock
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
  const renderReviewView = () => (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Sidebar sinistra - Lista gruppi */}
      <div className="w-72 flex-shrink-0 bg-slate-50 flex flex-col overflow-hidden">
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
                onClick={() => setSelectedGroupCode(group.jobCode)}
              />
            ))
          )}
        </div>
      </div>

      {/* Centro - Tabella del gruppo selezionato */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedGroup ? (
          <>
            <div className="flex-shrink-0 p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Operazione #{selectedGroup.jobCode}
                    </h3>
                    <Badge variant="outline">
                      {selectedGroup.jobs.length} trattament
                      {selectedGroup.jobs.length === 1 ? "o" : "i"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedGroup.companyName}
                  </p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  disabled={isBulkVerifying}
                  onClick={() => handleBulkVerifySelected(selectedGroupRows)}
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
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="h-full [&>div>div:last-child]:max-h-full">
                <EditableTable
                  columns={reviewColumns}
                  rows={selectedGroupRows}
                  isModify={true}
                  onSave={handleSave}
                  onDeleteSelected={handleDeleteSelected}
                  getRowId={(row) => row.id as string}
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
        <div className="w-80 flex-shrink-0 overflow-hidden">
          <HistoryPanel
            history={selectedGroup.history}
            jobCode={selectedGroup.jobCode}
          />
        </div>
      )}
    </div>
  );

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
      />
    </div>
  );
}
