import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { type EditableColumn } from "@/components/organism/EditableTable";
import { EditableTable } from "@/components/organism/EditableTable";
import { type JobRow } from "@/components/organism/JobSelectedDetails";
import {
  jobsApiService,
  type JobWithRelations,
  type GetVerifiedJobsResponse,
} from "@/api/jobs";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { JobSelectedDetails } from "@/components/organism/JobSelectedDetails";

class JobIdFormatter {
  public static format(jobId: string | null | undefined): string {
    if (!jobId) {
      return "-";
    }

    const trimmed = jobId.trim();

    // Se è solo un numero, lo lascia così
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }

    // Prendi la prima parte prima dello spazio (se presente)
    const firstPart = trimmed.split(/\s+/)[0];

    // Gestione formato <numero>-<companyId(UUID)>: mostra solo il numero
    const uuidPattern =
      /^(\d+)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
    const uuidMatch = firstPart.match(uuidPattern);
    if (uuidMatch) {
      return uuidMatch[1];
    }

    // Altri formati con trattini: <numero>-<...>-<companyName> => mostra "<numero> - <companyNameFirstWord>"
    if (firstPart.includes("-")) {
      const parts = firstPart.split("-");
      const number = parts[0]?.trim();
      if (!number || !/^\d+$/.test(number)) {
        return trimmed;
      }

      const lastPart = parts[parts.length - 1]?.trim();
      if (!lastPart || lastPart === number) {
        return number;
      }

      // Se l'ultima parte sembra un pezzo di UUID/hex, meglio mostrare solo il numero
      const looksLikeHex = /^[0-9a-f]{8,}$/i.test(lastPart);
      if (looksLikeHex) {
        return number;
      }

      // Nome azienda massimo una parola (primo token "word-like")
      const companyFirstWord =
        lastPart.split(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9]+/).filter(Boolean)[0] ?? lastPart;
      return `${number} - ${companyFirstWord}`;
    }

    // Fallback: ritorna il jobId originale
    return trimmed;
  }
}

class JobProductsFormatter {
  private readonly products: Array<{
    name: string;
    registrationNumber?: string | null;
  }>;

  constructor(
    products?: Array<{ name: string; registrationNumber?: string | null }>
  ) {
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

  private getVerificationStatus(): string {
    const { job } = this.jobWithRelations;

    // Se conformityChecked è false, mostra "Conformità non verificata"
    if (!job.conformityChecked) {
      return "Conformità non verificata";
    }

    // Se conformityChecked è true, mostra lo stato standard
    return job.isVerified ? "Verificato" : "Non Verificato";
  }

  public build(): Record<string, unknown> {
    const { job, productionUnit, company, fields, machine } =
      this.jobWithRelations;

    return {
      id: job.id,
      jobCode: JobIdFormatter.format(job.jobId),
      dateOfOpeation: new Date(job.dateOfOpeation),
      createdAt: new Date(job.createdAt),
      companyName: company.name,
      productionUnitName: productionUnit.name,
      cropName: productionUnit.cropName,
      cropType: productionUnit.cropType,
      fields: fields.length,
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
      isVerified: this.getVerificationStatus(),
      alertNotes: job.alertNotes ?? null,
      machineName: machine?.name ?? "-",
      machineId: machine?.id ?? null,
      _isVerifiedBoolean: job.isVerified,
      _conformityChecked: job.conformityChecked,
      _originalQuantity: job.quantity,
      _originalDateOfOperation: new Date(job.dateOfOpeation),
      _originalMachineId: machine?.id ?? null,
      _companyId: company.id,
      _productionUnitId: productionUnit.id,
      _history: job.history ?? [],
      stockInWarehouse:
        (job.alertNotes as { stock_in_warehouse?: number } | undefined)
          ?.stock_in_warehouse ?? null,
      stockInWarehouseUm:
        (job.alertNotes as { stock_in_warehouse_um?: string } | undefined)
          ?.stock_in_warehouse_um ?? null,
      principioAttivo:
        (job.alertNotes as { principio_attivo?: string } | undefined)
          ?.principio_attivo ?? null,
      doseMinima:
        (job.alertNotes as { dose_minima?: number } | undefined)?.dose_minima ??
        null,
      doseMassima:
        (job.alertNotes as { dose_massima?: number } | undefined)
          ?.dose_massima ?? null,
      doseUm:
        (job.alertNotes as { dose_um?: string } | undefined)?.dose_um ?? null,
      acquaHl:
        (
          job.alertNotes as
            | { acquaMaxJob?: number; waterHlJob?: number }
            | undefined
        )?.acquaMaxJob ??
        (
          job.alertNotes as
            | { acquaMaxJob?: number; waterHlJob?: number }
            | undefined
        )?.waterHlJob ??
        null,
    };
  }
}

// Helper per convertire EditableTableRowData[] a JobRow[]
function convertToJobRows(rows: Record<string, unknown>[]): JobRow[] {
  return rows as JobRow[];
}

export default function OperationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);

  // Query per i job verificati
  const {
    data: jobsData,
    isLoading,
    error,
  } = useQuery<GetVerifiedJobsResponse>({
    queryKey: ["verified-jobs", page, limit],
    queryFn: async () => {
      return await jobsApiService.getVerifiedJobs({
        page,
        limit,
      });
    },
    staleTime: 1000 * 30, // 30 secondi
    refetchOnWindowFocus: false,
  });

  // Converti i job in righe per la tabella
  const rows = useMemo(() => {
    if (!jobsData?.data.jobs) return [];
    return jobsData.data.jobs.map((jobWithRelations) =>
      new JobTableRowBuilder(jobWithRelations).build()
    );
  }, [jobsData]);

  // Colonne per la tabella (stesse di Job/index.tsx)
  const columns: EditableColumn[] = useMemo(
    () => [
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
        width: "220px",
        readOnly: true,
        options: ["Verificato", "Non Verificato", "Conformità non verificata"],
        render: (value) => {
          const stringValue = value as string;
          const isVerified = stringValue === "Verificato";
          const isConformityNotChecked =
            stringValue === "Conformità non verificata";

          if (isConformityNotChecked) {
            return (
              <Badge
                variant="outline"
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
              >
                {stringValue}
              </Badge>
            );
          }

          return (
            <Badge
              variant={isVerified ? "default" : "destructive"}
              className={
                isVerified
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }
            >
              {stringValue}
            </Badge>
          );
        },
      },
      {
        id: "dateOfOpeation",
        title: "Data Operazione",
        type: "date",
        width: "150px",
        readOnly: true,
        render: (value) => {
          if (!value) return "-";
          const date =
            value instanceof Date ? value : new Date(value as string);
          return date.toLocaleDateString("it-IT");
        },
      },
      {
        id: "productionUnitName",
        title: "Unità Produttiva",
        type: "text",
        width: "280px",
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
        id: "productName",
        title: "Prodotto",
        type: "text",
        width: "250px",
        readOnly: true,
      },
      {
        id: "quantity",
        title: "Quantità",
        type: "number",
        width: "120px",
        readOnly: true,
        render: (value) => {
          const numValue = Number(value);
          if (isNaN(numValue)) return "-";
          return numValue.toFixed(3);
        },
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
        id: "quantityPerHa",
        title: "Quantità per ha",
        type: "number",
        width: "150px",
        readOnly: true,
        render: (_value, row) => {
          const quantity = Number(row.quantity ?? 0);
          const treatedSurface = Number(row.treatedSurface ?? 0);
          if (treatedSurface === 0) return "-";
          const quantityPerHa = quantity / treatedSurface;
          return quantityPerHa.toFixed(4);
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
        id: "stockInWarehouse",
        title: "Stock in Magazzino",
        type: "text",
        width: "180px",
        readOnly: true,
        render: (value, row) => {
          const stock = value as number | null | undefined;
          const unit = row.stockInWarehouseUm as string | null | undefined;
          if (stock === null || stock === undefined) return "-";
          return (
            <span className="font-mono text-sm">
              {stock} {unit ?? ""}
            </span>
          );
        },
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
        id: "principioAttivo",
        title: "Principio Attivo",
        type: "text",
        width: "200px",
        readOnly: true,
        render: (value) => {
          const principioAttivo = value as string | null | undefined;
          if (!principioAttivo) return "-";
          return (
            <span className="text-sm font-medium text-slate-700">
              {principioAttivo}
            </span>
          );
        },
      },
      {
        id: "doseEtichetta",
        title: "Dose Etichetta",
        type: "text",
        width: "150px",
        readOnly: true,
        render: (_value, row) => {
          const doseMinima = row.doseMinima as number | null | undefined;
          const doseMassima = row.doseMassima as number | null | undefined;
          const doseUm = row.doseUm as string | null | undefined;

          if (doseMinima === null && doseMassima === null) return "-";

          const unit = doseUm ? ` ${doseUm}` : "";

          if (doseMinima !== null && doseMassima !== null) {
            if (doseMinima === doseMassima) {
              return (
                <span className="text-sm font-mono text-slate-700">
                  {doseMinima}
                  {unit}
                </span>
              );
            }
            return (
              <span className="text-sm font-mono text-slate-700">
                {doseMinima} - {doseMassima}
                {unit}
              </span>
            );
          }

          if (doseMinima !== null) {
            return (
              <span className="text-sm font-mono text-slate-700">
                {doseMinima}
                {unit}
              </span>
            );
          }

          if (doseMassima !== null) {
            return (
              <span className="text-sm font-mono text-slate-700">
                {doseMassima}
                {unit}
              </span>
            );
          }

          return "-";
        },
      },
      {
        id: "acquaHl",
        title: "Acqua (hl)",
        type: "text",
        width: "120px",
        readOnly: true,
        render: (value) => {
          const acquaHl = value as number | null | undefined;
          if (acquaHl === null || acquaHl === undefined) return "-";
          return (
            <span className="text-sm font-mono text-slate-700">
              {acquaHl} hl
            </span>
          );
        },
      },
      {
        id: "machineName",
        title: "Macchina",
        type: "text",
        width: "200px",
        readOnly: true,
        render: (_value, row) => {
          const machineName = (row.machineName as string | undefined) ?? "-";
          const label = machineName !== "-" ? machineName : "-";
          return (
            <span className={label === "-" ? "text-muted-foreground" : ""}>
              {label}
            </span>
          );
        },
      },
    ],
    []
  );

  // Render per i dettagli nella drawer
  const renderDetails = (row: Record<string, unknown>): React.ReactNode => {
    const jobRows = convertToJobRows([row]);
    return <JobSelectedDetails selectedRows={jobRows} isMobile={false} />;
  };

  const pagination = jobsData?.data.pagination;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Operazioni"
        rightElement={
          <Button
            onClick={() => navigate("/dosage-manager")}
            className="bg-agri-green-600 hover:bg-agri-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi
          </Button>
        }
      >
        {pagination && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Pagina {pagination.page} di {pagination.totalPages} • Totale:{" "}
              {pagination.total}
            </span>
            {isLoading && (
              <Spinner
                className="h-3 w-3 text-slate-400"
                ariaLabel="Caricamento"
              />
            )}
          </div>
        )}
      </PageHeader>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner size={20} ariaLabel="Caricamento dati" />
            <span>Caricamento operazioni…</span>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">
            Impossibile caricare le operazioni. Errore:{" "}
            {error instanceof Error ? error.message : "Errore sconosciuto"}
          </div>
        ) : rows.length === 0 || (pagination && pagination.total === 0) ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-base font-medium text-gray-700 mb-2">
              Non ci sono operazioni
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Creane una oppure verifica le operazioni
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => navigate("/dosage-manager")}
                className="bg-agri-green-600 hover:bg-agri-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crea Operazione
              </Button>
              <Button
                onClick={() => navigate("/job")}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              >
                Verifica Operazioni
              </Button>
            </div>
          </div>
        ) : (
          <>
            <EditableTable
              columns={columns}
              rows={rows}
              isModify={false}
              addButton={false}
              getRowId={(row, index) =>
                (typeof row.id === "string" && row.id) || index
              }
              showDeleteAction={false}
              exportFileName="operazioni"
              detailsRenderer={renderDetails}
              detailsTitle="Dettagli Operazione"
              className="bg-background"
            />
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Precedente
                </button>
                <span className="text-sm text-gray-600">
                  Pagina {pagination.page} di {pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Successiva
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
