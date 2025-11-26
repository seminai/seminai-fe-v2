import { useState, useMemo } from "react";
import { useJobs } from "@/hooks/useJobs";
import { useCompanies } from "@/hooks/useCompanies";
import { PageHeader } from "@/components/organism/Header";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  jobsApiService,
  type JobWithRelations,
  type Product,
} from "@/api/jobs";
import { stocksApiService, type CreateStockPayload } from "@/api/stocks";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const { companies } = useCompanies();
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [isBulkVerifying, setIsBulkVerifying] = useState<boolean>(false);

  const { jobs, isLoading, error, refetch } = useJobs(
    selectedCompanyName || undefined
  );
  const bulkVerifier = useMemo(
    () => new JobBulkVerifier(jobsApiService),
    []
  );

  // Debug logging
  console.log("JobPage - companies:", companies);
  console.log("JobPage - selectedCompanyName:", selectedCompanyName);
  console.log("JobPage - jobs:", jobs);
  console.log("JobPage - isLoading:", isLoading);
  console.log("JobPage - error:", error);

  // Converte i jobs in formato per la tabella
  const jobsAsRows = useMemo(() => {
    return jobs.map((jobWithRelations) =>
      new JobTableRowBuilder(jobWithRelations).build()
    );
  }, [jobs]);

  // Colonne per la tabella editabile
  const columns: EditableColumn[] = [
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
  ];

  const companyFilter = (
    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 w-full">
      <span className="text-sm font-medium text-neutral-900 whitespace-nowrap">
        Filtra per Azienda
      </span>
      <Select
        value={selectedCompanyName}
        onValueChange={(value) => {
          setSelectedCompanyName(value === "all" ? "" : value);
        }}
      >
        <SelectTrigger className="w-full md:w-64 h-12 bg-neutral-50 border-neutral-200">
          <SelectValue placeholder="Tutte le aziende" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutte le aziende</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.name}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

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
      <PageHeader title="Operazioni" filterElement={companyFilter} />

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
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16 text-neutral-500">
                <p>Nessuna operazione trovata</p>
                {selectedCompanyName && (
                  <p className="text-sm mt-2">
                    Filtrato per: {selectedCompanyName}
                  </p>
                )}
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
    </div>
  );
}
