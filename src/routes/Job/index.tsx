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
import { History } from "lucide-react";

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
    label_extraction: "bg-blue-100 text-blue-700",
    user_input: "bg-green-100 text-green-700",
    llm_openai: "bg-purple-100 text-purple-700",
    linear_programming: "bg-amber-100 text-amber-700",
    automatic_calculation: "bg-cyan-100 text-cyan-700",
  };

  public static formatStep(step: string): string {
    return this.STEP_LABELS[step] ?? step;
  }

  public static getSourceColor(source: string): string {
    return this.SOURCE_COLORS[source] ?? "bg-gray-100 text-gray-700";
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
                      className="flex flex-col gap-1 py-2 border-l-2 border-muted pl-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {entry.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${HistoryEntryFormatter.getSourceColor(
                            entry.source
                          )}`}
                        >
                          {entry.source}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {String(entry.value)}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
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

export default function JobPage() {
  const [isBulkVerifying, setIsBulkVerifying] = useState<boolean>(false);
  const [historySheetOpen, setHistorySheetOpen] = useState<boolean>(false);
  const [selectedJobHistory, setSelectedJobHistory] = useState<
    JobHistoryEntry[]
  >([]);
  const [selectedJobCode, setSelectedJobCode] = useState<string>("");

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

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Operazioni" />

      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="mx-auto space-y-6">
          {/* Jobs Table */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <p className="font-semibold">Errore nel caricamento dei dati</p>
                <p className="text-sm mt-1">
                  {error instanceof Error
                    ? error.message
                    : "Errore sconosciuto"}
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

      {/* History Sheet */}
      <JobHistorySheet
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
        history={selectedJobHistory}
        jobCode={selectedJobCode}
      />
    </div>
  );
}
