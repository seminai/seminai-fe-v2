import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { type EditableColumn } from "@/components/organism/EditableTable";
import { EditableTable } from "@/components/organism/EditableTable";
import { type JobRow } from "@/components/organism/JobSelectedDetails";
import {
  jobsApiService,
  type JobWithRelations,
  type GetVerifiedJobsResponse,
} from "@/api/jobs";
import { machinesApiService, type Machine } from "@/api/machines";
import {
  userOnCompanyApiService,
  type UserOnCompany,
} from "@/api/userOnCompany";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { JobSelectedDetails } from "@/components/organism/JobSelectedDetails";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil } from "lucide-react";

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
    products?: Array<{ name: string; registrationNumber?: string | null }>,
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
      this.jobWithRelations.products,
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
      machineName: machine?.name ?? null,
      machineId: machine?.id ?? null,
      userId: job.userId ?? null,
      userName: null, // Sarà popolato quando vengono caricati gli utenti
      isLocalizedTreatment: job.isLocalizedTreatment ?? false,
      _isVerifiedBoolean: job.isVerified,
      _conformityChecked: job.conformityChecked,
      _originalQuantity: job.quantity,
      _originalDateOfOperation: new Date(job.dateOfOpeation),
      _originalMachineId: machine?.id ?? null,
      _originalUserId: job.userId ?? null,
      _originalModeOfApplication: job.modeOfApplication ?? "-",
      _originalIsLocalizedTreatment: job.isLocalizedTreatment ?? false,
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

// Componente per cella con sfondo giallo se mancante
function MissingDataCell({
  value,
  children,
}: {
  value: unknown;
  children: React.ReactNode;
}) {
  const isMissing =
    value === null ||
    value === undefined ||
    value === "-" ||
    value === "" ||
    (typeof value === "string" && value.trim() === "");

  return (
    <div
      className={cn(
        "w-full h-full flex items-center px-2 -mx-2",
        isMissing && "bg-amber-100",
      )}
    >
      {children}
    </div>
  );
}

export default function OperationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [selectedRows, setSelectedRows] = useState<
    Array<Record<string, unknown>>
  >([]);

  // Query per i job verificati
  const {
    data: jobsData,
    isLoading,
    error,
    refetch,
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

  // Estrai tutti i companyId unici dai job
  const uniqueCompanyIds = useMemo(() => {
    if (!jobsData?.data.jobs) return [];
    const companyIds = new Set<string>();
    jobsData.data.jobs.forEach((jobWithRelations) => {
      companyIds.add(jobWithRelations.company.id);
    });
    return Array.from(companyIds);
  }, [jobsData]);

  // Carica le macchine per tutte le company uniche
  const machinesQueries = useQuery({
    queryKey: ["machines-by-companies", uniqueCompanyIds],
    queryFn: async () => {
      const machinesByCompany = new Map<string, Machine[]>();
      await Promise.all(
        uniqueCompanyIds.map(async (companyId) => {
          try {
            const machines = await machinesApiService.listByCompany(companyId);
            machinesByCompany.set(companyId, machines);
          } catch (error) {
            console.error(
              `Error loading machines for company ${companyId}:`,
              error,
            );
            machinesByCompany.set(companyId, []);
          }
        }),
      );
      return machinesByCompany;
    },
    enabled: uniqueCompanyIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minuti
    refetchOnWindowFocus: true,
  });

  const machinesByCompanyMap = useMemo(() => {
    return machinesQueries.data ?? new Map<string, Machine[]>();
  }, [machinesQueries.data]);

  // Carica gli utenti per tutte le company uniche
  const usersQueries = useQuery({
    queryKey: ["users-by-companies", uniqueCompanyIds],
    queryFn: async () => {
      const usersByCompany = new Map<string, UserOnCompany[]>();
      await Promise.all(
        uniqueCompanyIds.map(async (companyId) => {
          try {
            const response =
              await userOnCompanyApiService.listByCompany(companyId);
            const users = response.data?.users ?? [];
            usersByCompany.set(companyId, users);
          } catch (error) {
            console.error(
              `Error loading users for company ${companyId}:`,
              error,
            );
            usersByCompany.set(companyId, []);
          }
        }),
      );
      return usersByCompany;
    },
    enabled: uniqueCompanyIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  const usersByCompanyMap = useMemo(() => {
    return usersQueries.data ?? new Map<string, UserOnCompany[]>();
  }, [usersQueries.data]);

  // Funzione helper per ottenere il nome completo di un utente
  const getUserFullName = useCallback((user: UserOnCompany): string => {
    if (user.user) {
      const fullName = `${user.user.name} ${user.user.surname}`.trim();
      return fullName || user.user.email || "-";
    }
    return "-";
  }, []);

  // Converti i job in righe per la tabella e popola i nomi degli utenti
  const rows = useMemo(() => {
    if (!jobsData?.data.jobs) return [];

    return jobsData.data.jobs.map((jobWithRelations) => {
      const row = new JobTableRowBuilder(jobWithRelations).build();

      // Popola il nome utente se disponibile
      const companyId = row._companyId as string;
      const userId = row.userId as string | null;
      if (userId && companyId) {
        const users = usersByCompanyMap.get(companyId) ?? [];
        const user = users.find((u) => u.userId === userId);
        if (user) {
          row.userName = getUserFullName(user);
        }
      }

      return row;
    });
  }, [jobsData, usersByCompanyMap, getUserFullName]);

  // Colonne principali per la tabella (vista iniziale)
  // Mostra: Prodotto, Data, Coltura, Macchine, Operatori
  // Evidenzia in giallo se mancano dati
  const columns: EditableColumn[] = useMemo(
    () => [
      {
        id: "productName",
        title: "Prodotto",
        type: "text",
        width: "280px",
        readOnly: true,
        render: (value) => {
          return (
            <MissingDataCell value={value}>
              <span
                className={
                  !value || value === "-" ? "text-muted-foreground" : ""
                }
              >
                {(value as string) || "-"}
              </span>
            </MissingDataCell>
          );
        },
      },
      {
        id: "companyName",
        title: "Azienda",
        type: "text",
        width: "200px",
        readOnly: true,
        render: (value) => {
          return (
            <MissingDataCell value={value}>
              <span
                className={
                  !value || value === "-" ? "text-muted-foreground" : ""
                }
              >
                {(value as string) || "-"}
              </span>
            </MissingDataCell>
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
          const hasValue = value !== null && value !== undefined;
          return (
            <MissingDataCell value={value}>
              <span className={!hasValue ? "text-muted-foreground" : ""}>
                {hasValue
                  ? (value instanceof Date
                      ? value
                      : new Date(value as string)
                    ).toLocaleDateString("it-IT")
                  : "-"}
              </span>
            </MissingDataCell>
          );
        },
      },
      {
        id: "cropName",
        title: "Coltura",
        type: "text",
        width: "180px",
        readOnly: true,
        render: (value) => {
          return (
            <MissingDataCell value={value}>
              <span
                className={
                  !value || value === "-" ? "text-muted-foreground" : ""
                }
              >
                {(value as string) || "-"}
              </span>
            </MissingDataCell>
          );
        },
      },
      {
        id: "machineName",
        title: "Macchina",
        type: "text",
        width: "200px",
        readOnly: true,
        render: (value) => {
          const displayValue = value as string | null;
          return (
            <MissingDataCell value={displayValue}>
              <span className={!displayValue ? "text-muted-foreground" : ""}>
                {displayValue || "-"}
              </span>
            </MissingDataCell>
          );
        },
      },
      {
        id: "userName",
        title: "Operatore",
        type: "text",
        width: "200px",
        readOnly: true,
        render: (value) => {
          const displayValue = value as string | null;
          return (
            <MissingDataCell value={displayValue}>
              <span className={!displayValue ? "text-muted-foreground" : ""}>
                {displayValue || "-"}
              </span>
            </MissingDataCell>
          );
        },
      },
      // Altre colonne disponibili (visibilità configurabile dall'utente)
      {
        id: "productionUnitName",
        title: "Unità Produttiva",
        type: "text",
        width: "280px",
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
    ],
    [],
  );

  // Colonne per il drawer di dettaglio (modificabili)
  const detailColumns: EditableColumn[] = useMemo(
    () => [
      {
        id: "isVerified",
        title: "Stato Verifica",
        type: "select",
        width: "220px",
        readOnly: false,
        options: ["Verificato", "Non Verificato", "Conformità non verificata"],
        onValueChange: ({ value }) => {
          if (value === "Conformità non verificata") {
            return {
              _isVerifiedBoolean: false,
              _conformityChecked: false,
            };
          }
          return {
            _isVerifiedBoolean: value === "Verificato",
            _conformityChecked: true,
          };
        },
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
        id: "machineId",
        title: "Macchina",
        type: "select",
        width: "200px",
        readOnly: false,
        getOptions: (rowData) => {
          const companyId = rowData._companyId as string | undefined;
          if (!companyId) {
            return [];
          }
          const machines = machinesByCompanyMap.get(companyId) ?? [];
          return machines.map((machine) => ({
            label: machine.name,
            value: machine.id,
          }));
        },
        placeholder: "Seleziona macchina",
        enableSearch: true,
        searchPlaceholder: "Cerca macchina...",
        emptyStateMessage: "Nessuna macchina disponibile",
        noneOptionLabel: "Nessuna macchina",
        onValueChange: ({ value, rowData }) => {
          const companyId = rowData._companyId as string | undefined;
          if (!companyId) {
            return { machineId: null, machineName: null };
          }
          const machines = machinesByCompanyMap.get(companyId) ?? [];
          const stringValue = String(value ?? "");
          const selectedMachine = machines.find((m) => m.id === stringValue);
          return {
            machineId: stringValue && stringValue !== "" ? stringValue : null,
            machineName: selectedMachine?.name ?? null,
          };
        },
        render: (_value, row) => {
          const machineName = (row.machineName as string | null) ?? null;
          return (
            <span className={!machineName ? "text-muted-foreground" : ""}>
              {machineName || "-"}
            </span>
          );
        },
      },
      {
        id: "userId",
        title: "Operatore",
        type: "select",
        width: "200px",
        readOnly: false,
        getOptions: (rowData) => {
          const companyId = rowData._companyId as string | undefined;
          if (!companyId) {
            return [];
          }
          const users = usersByCompanyMap.get(companyId) ?? [];
          return users.map((user) => ({
            label: getUserFullName(user),
            value: user.userId,
          }));
        },
        placeholder: "Seleziona operatore",
        enableSearch: true,
        searchPlaceholder: "Cerca operatore...",
        emptyStateMessage: "Nessun operatore disponibile",
        noneOptionLabel: "Nessun operatore",
        onValueChange: ({ value, rowData }) => {
          const companyId = rowData._companyId as string | undefined;
          if (!companyId) {
            return { userId: null, userName: null };
          }
          const users = usersByCompanyMap.get(companyId) ?? [];
          const stringValue = String(value ?? "");
          const selectedUser = users.find((u) => u.userId === stringValue);
          return {
            userId: stringValue && stringValue !== "" ? stringValue : null,
            userName: selectedUser ? getUserFullName(selectedUser) : null,
          };
        },
        render: (_value, row) => {
          const userName = (row.userName as string | null) ?? null;
          return (
            <span className={!userName ? "text-muted-foreground" : ""}>
              {userName || "-"}
            </span>
          );
        },
      },
      {
        id: "modeOfApplication",
        title: "Modalità Trattamento",
        type: "select",
        width: "180px",
        readOnly: false,
        options: [
          { label: "Manuale", value: "manuale" },
          { label: "Macchinari", value: "macchinari" },
        ],
        placeholder: "Seleziona modalità",
        onValueChange: ({ value }) => {
          return {
            modeOfApplication: value ?? "-",
          };
        },
        render: (value) => {
          const stringValue = value as string;
          if (!stringValue || stringValue === "-") {
            return <span className="text-muted-foreground">-</span>;
          }
          return <span>{stringValue}</span>;
        },
      },
      {
        id: "isLocalizedTreatment",
        title: "Trattamento Localizzato",
        type: "select",
        width: "200px",
        readOnly: false,
        options: [
          { label: "Sì", value: "true" },
          { label: "No", value: "false" },
        ],
        placeholder: "Seleziona",
        onValueChange: ({ value }) => {
          return {
            isLocalizedTreatment: value === "true" || value === true,
          };
        },
        render: (value) => {
          const boolValue =
            typeof value === "boolean"
              ? value
              : value === "true" || value === true;
          return (
            <Badge
              variant={boolValue ? "default" : "outline"}
              className={
                boolValue
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }
            >
              {boolValue ? "Sì" : "No"}
            </Badge>
          );
        },
      },
    ],
    [machinesByCompanyMap, usersByCompanyMap, getUserFullName],
  );

  // Stato per tracciare tutte le modifiche nel form del drawer
  const [drawerFormChanges, setDrawerFormChanges] = useState<
    Record<string, Record<string, unknown>>
  >({});

  // Stato per il filtro di ricerca nei dettagli
  const [detailsSearchTerm, setDetailsSearchTerm] = useState<string>("");

  // Bulk edit: drawer con select singole per ogni riga (tutte o selezionate)
  const [bulkEditDrawerOpen, setBulkEditDrawerOpen] = useState(false);
  const [bulkEditRows, setBulkEditRows] = useState<
    Array<Record<string, unknown>>
  >([]);

  // Render per i dettagli nella drawer
  const renderDetails = useCallback(
    (row: Record<string, unknown>): React.ReactNode => {
      const jobRows = convertToJobRows([row]);
      const rowId = row.id as string;

      // Ottieni le modifiche correnti per questa riga
      const currentChanges = drawerFormChanges[rowId] || {};
      const hasChanges = Object.keys(currentChanges).length > 0;

      // Handler per modificare un campo
      const handleFieldChange = (
        field: string,
        value: unknown,
        columnConfig: EditableColumn,
      ) => {
        const updates = columnConfig.onValueChange?.({
          value,
          rowData: { ...row, ...currentChanges, [field]: value },
          columnId: field,
        });

        setDrawerFormChanges((prev) => ({
          ...prev,
          [rowId]: {
            ...(prev[rowId] || {}),
            [field]: value,
            ...(updates || {}),
          },
        }));
      };

      // Handler per annullare tutte le modifiche
      const handleCancelAll = () => {
        setDrawerFormChanges((prev) => {
          const next = { ...prev };
          delete next[rowId];
          return next;
        });
      };

      // Handler per salvare tutte le modifiche
      const handleSaveAll = async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updatePayload: any = {};

          // Applica le modifiche in base ai campi modificati
          if ("_isVerifiedBoolean" in currentChanges) {
            updatePayload.isVerified = currentChanges._isVerifiedBoolean;
          }
          if ("_conformityChecked" in currentChanges) {
            updatePayload.conformityChecked = currentChanges._conformityChecked;
          }
          if ("machineId" in currentChanges) {
            updatePayload.machineId = currentChanges.machineId;
          }
          if ("userId" in currentChanges) {
            updatePayload.userId = currentChanges.userId;
          }
          if ("modeOfApplication" in currentChanges) {
            updatePayload.modeOfApplication = currentChanges.modeOfApplication;
          }
          if ("isLocalizedTreatment" in currentChanges) {
            updatePayload.isLocalizedTreatment =
              currentChanges.isLocalizedTreatment;
          }

          if (Object.keys(updatePayload).length > 0) {
            await jobsApiService.updateJob(rowId, updatePayload);
            toast.success("Modifiche salvate con successo");
            await queryClient.invalidateQueries({
              queryKey: ["verified-jobs"],
            });
            await refetch();

            // Resetta le modifiche dopo il salvataggio
            setDrawerFormChanges((prev) => {
              const next = { ...prev };
              delete next[rowId];
              return next;
            });
          }
        } catch (error) {
          toast.error("Errore durante il salvataggio", {
            description:
              error instanceof Error ? error.message : "Riprova più tardi",
          });
        }
      };

      // Dati per l'header
      const productName = (row.productName as string) || "Operazione";
      const companyName = (row.companyName as string) || "-";
      const cropName = (row.cropName as string) || "-";
      const dateOfOpeation = row.dateOfOpeation as Date | null;
      const formattedDate = dateOfOpeation
        ? dateOfOpeation.toLocaleDateString("it-IT")
        : "-";

      return (
        <div className="space-y-4">
          {/* Header con info prodotto */}
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">{productName}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mt-1">
              <span>
                <span className="font-medium text-slate-500">Azienda:</span>{" "}
                {companyName}
              </span>
              <span>
                <span className="font-medium text-slate-500">Coltura:</span>{" "}
                {cropName}
              </span>
              <span>
                <span className="font-medium text-slate-500">Data:</span>{" "}
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Campi modificabili */}
          <div className="space-y-2">
            {detailColumns.map((column) => {
              const currentValue =
                currentChanges[column.id] !== undefined
                  ? currentChanges[column.id]
                  : row[column.id];
              const options = column.getOptions?.(row) ?? column.options ?? [];

              return (
                <div key={column.id} className="flex items-center gap-3 py-1.5">
                  <label className="text-sm font-medium text-slate-600 min-w-[160px]">
                    {column.title}
                  </label>
                  <div className="flex-1">
                    <select
                      className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={String(currentValue ?? "")}
                      onChange={(e) => {
                        handleFieldChange(column.id, e.target.value, column);
                      }}
                    >
                      <option value="">
                        {column.placeholder ?? "Seleziona..."}
                      </option>
                      {column.noneOptionLabel && (
                        <option value="">{column.noneOptionLabel}</option>
                      )}
                      {(
                        options as Array<
                          string | { label: string; value: string }
                        >
                      ).map((opt) => {
                        const optValue =
                          typeof opt === "string" ? opt : opt.value;
                        const optLabel =
                          typeof opt === "string" ? opt : opt.label;
                        return (
                          <option key={optValue} value={optValue}>
                            {optLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottoni Annulla/Salva in basso */}
          {hasChanges && (
            <div className="flex justify-end gap-2 pt-3 pb-2 border-t border-slate-200 sticky bottom-0 bg-white">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelAll}
                className="text-slate-600"
              >
                Annulla
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAll}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Salva
              </Button>
            </div>
          )}

          {/* Separatore e filtro di ricerca */}
          <div className="border-t border-slate-200 pt-4 space-y-4">
            {/* Filtro di ricerca */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cerca nei dettagli..."
                value={detailsSearchTerm}
                onChange={(e) => setDetailsSearchTerm(e.target.value)}
                className="pl-8 text-sm h-9"
              />
            </div>

            {/* Dettagli operazione */}
            <JobSelectedDetails
              selectedRows={jobRows}
              isMobile={false}
              hideSearch={true}
              externalSearchTerm={detailsSearchTerm}
            />
          </div>
        </div>
      );
    },
    [detailColumns, drawerFormChanges, queryClient, refetch, detailsSearchTerm],
  );

  const openBulkEditSelected = useCallback(() => {
    if (selectedRows.length === 0) return;
    setBulkEditRows([...selectedRows]);
    setBulkEditDrawerOpen(true);
  }, [selectedRows]);

  const closeBulkEditDrawer = useCallback(() => {
    setBulkEditDrawerOpen(false);
    setBulkEditRows([]);
  }, []);

  const handleBulkEditFieldChange = useCallback(
    (
      rowId: string,
      field: string,
      value: unknown,
      columnConfig: EditableColumn,
    ) => {
      const row = bulkEditRows.find((r) => (r.id as string) === rowId);
      if (!row) return;
      const currentChanges = drawerFormChanges[rowId] || {};
      const updates = columnConfig.onValueChange?.({
        value,
        rowData: { ...row, ...currentChanges, [field]: value },
        columnId: field,
      });
      setDrawerFormChanges((prev) => ({
        ...prev,
        [rowId]: {
          ...(prev[rowId] || {}),
          [field]: value,
          ...(updates || {}),
        },
      }));
    },
    [bulkEditRows, drawerFormChanges],
  );

  const handleBulkEditSaveAll = useCallback(async () => {
    const rowIds = bulkEditRows.map((r) => r.id as string);
    const toSave = rowIds.filter(
      (id) =>
        drawerFormChanges[id] && Object.keys(drawerFormChanges[id]).length > 0,
    );
    if (toSave.length === 0) {
      closeBulkEditDrawer();
      return;
    }
    try {
      for (const rowId of toSave) {
        const currentChanges = drawerFormChanges[rowId] || {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatePayload: Record<string, any> = {};
        if ("_isVerifiedBoolean" in currentChanges) {
          updatePayload.isVerified = currentChanges._isVerifiedBoolean;
        }
        if ("_conformityChecked" in currentChanges) {
          updatePayload.conformityChecked = currentChanges._conformityChecked;
        }
        if ("machineId" in currentChanges) {
          updatePayload.machineId = currentChanges.machineId;
        }
        if ("userId" in currentChanges) {
          updatePayload.userId = currentChanges.userId;
        }
        if ("modeOfApplication" in currentChanges) {
          updatePayload.modeOfApplication = currentChanges.modeOfApplication;
        }
        if ("isLocalizedTreatment" in currentChanges) {
          updatePayload.isLocalizedTreatment =
            currentChanges.isLocalizedTreatment;
        }
        if (Object.keys(updatePayload).length > 0) {
          await jobsApiService.updateJob(rowId, updatePayload);
        }
      }
      toast.success("Modifiche salvate", {
        description: `${toSave.length} operazione/i aggiornata/e`,
      });
      await queryClient.invalidateQueries({ queryKey: ["verified-jobs"] });
      await refetch();
      setDrawerFormChanges((prev) => {
        const next = { ...prev };
        toSave.forEach((id) => delete next[id]);
        return next;
      });
      closeBulkEditDrawer();
    } catch (error) {
      toast.error("Errore durante il salvataggio", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
    }
  }, [
    bulkEditRows,
    drawerFormChanges,
    queryClient,
    refetch,
    closeBulkEditDrawer,
  ]);

  const hasBulkEditChanges = useMemo(() => {
    return bulkEditRows.some((r) => {
      const id = r.id as string;
      const changes = drawerFormChanges[id];
      return changes && Object.keys(changes).length > 0;
    });
  }, [bulkEditRows, drawerFormChanges]);

  // Gestisce l'eliminazione multipla
  const handleDeleteSelected = async (
    removed: Array<Record<string, unknown>>,
  ) => {
    try {
      const jobIds = removed.map((row) => row.id as string);

      console.log("Deleting jobs:", jobIds);

      await jobsApiService.bulkDelete({ jobIds });

      toast.success("Operazioni eliminate", {
        description: `${jobIds.length} operazione${
          jobIds.length === 1 ? "" : "i"
        } eliminata${jobIds.length === 1 ? "" : "e"} con successo`,
      });

      // Ricarica i dati
      await queryClient.invalidateQueries({ queryKey: ["verified-jobs"] });
      await refetch();
      setSelectedRows([]);
    } catch (error) {
      toast.error("Errore durante l'eliminazione", {
        description:
          error instanceof Error ? error.message : "Riprova più tardi",
      });
      console.error("Error deleting jobs:", error);
    }
  };

  const pagination = jobsData?.data.pagination;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Operazioni" className="hidden md:block" />

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
                onClick={() => navigate("/job/new")}
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
              showDeleteAction={selectedRows.length > 0}
              onDeleteSelected={handleDeleteSelected}
              onSelectionChange={setSelectedRows}
              exportFileName="operazioni"
              detailsRenderer={renderDetails}
              detailsTitle=""
              className="bg-background"
            >
              {selectedRows.length > 0 && (
                <Button
                  data-table-slot="right"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-600 hover:text-gray-600 cursor-pointer border border-gray-200 hover:bg-gray-50"
                  onClick={openBulkEditSelected}
                >
                  <Pencil className="w-4 h-4" />
                  Modifica tutti ({selectedRows.length})
                </Button>
              )}
              {selectedRows.length === 0 && (
                <Button
                  data-table-slot="right"
                  variant="ghost"
                  className="gap-2 text-gray-600 hover:text-gray-600 cursor-pointer"
                  onClick={() => navigate("/job/new")}
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi
                </Button>
              )}
            </EditableTable>
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

            <Drawer
              open={bulkEditDrawerOpen}
              onOpenChange={(open) => !open && closeBulkEditDrawer()}
              modal={false}
              direction="right"
            >
              <DrawerContent
                data-vaul-drawer-direction="right"
                className="w-[95vw] max-w-[95vw] sm:w-1/2 sm:max-w-[50vw] shadow-2xl rounded-r-none rounded-l-2xl border-l border-neutral-200"
              >
                <DrawerHeader className="px-4 sm:px-6">
                  <DrawerTitle className="text-lg sm:text-xl">
                    Modifica {bulkEditRows.length} operazioni
                  </DrawerTitle>
                  <DrawerDescription className="text-sm">
                    Modifica i campi per ogni operazione. Le select sono singole
                    per ogni riga. Salva per applicare le modifiche.
                  </DrawerDescription>
                </DrawerHeader>
                <ScrollArea className="flex-1 overflow-y-auto">
                  <div className="p-4 sm:p-6 space-y-6">
                    {bulkEditRows.map((row) => {
                      const rowId = row.id as string;
                      const currentChanges = drawerFormChanges[rowId] || {};
                      const productName =
                        (row.productName as string) || "Operazione";
                      const companyName = (row.companyName as string) || "-";
                      const dateOfOpeation = row.dateOfOpeation as Date | null;
                      const formattedDate = dateOfOpeation
                        ? (dateOfOpeation instanceof Date
                            ? dateOfOpeation
                            : new Date(dateOfOpeation)
                          ).toLocaleDateString("it-IT")
                        : "-";
                      return (
                        <div
                          key={rowId}
                          className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                        >
                          <div className="pb-2 border-b border-slate-200">
                            <h3 className="font-medium text-slate-900">
                              {productName}
                            </h3>
                            <p className="text-sm text-slate-600 mt-0.5">
                              {companyName} · {formattedDate}
                            </p>
                          </div>
                          <div className="space-y-2">
                            {detailColumns.map((column) => {
                              let currentValue: unknown =
                                currentChanges[column.id] !== undefined
                                  ? currentChanges[column.id]
                                  : row[column.id];
                              if (column.id === "isVerified") {
                                if (
                                  "_isVerifiedBoolean" in currentChanges ||
                                  "_conformityChecked" in currentChanges
                                ) {
                                  const checked =
                                    currentChanges._conformityChecked;
                                  const verified =
                                    currentChanges._isVerifiedBoolean;
                                  if (!checked) {
                                    currentValue =
                                      "Conformità non verificata";
                                  } else {
                                    currentValue = verified
                                      ? "Verificato"
                                      : "Non Verificato";
                                  }
                                }
                              }
                              const options =
                                column.getOptions?.(row) ??
                                column.options ??
                                [];
                              return (
                                <div
                                  key={column.id}
                                  className="flex items-center gap-3 py-1"
                                >
                                  <label className="text-sm font-medium text-slate-600 min-w-[140px]">
                                    {column.title}
                                  </label>
                                  <div className="flex-1">
                                    <select
                                      className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                      value={String(currentValue ?? "")}
                                      onChange={(e) =>
                                        handleBulkEditFieldChange(
                                          rowId,
                                          column.id,
                                          e.target.value,
                                          column,
                                        )
                                      }
                                    >
                                      <option value="">
                                        {column.placeholder ?? "Seleziona..."}
                                      </option>
                                      {column.noneOptionLabel && (
                                        <option value="">
                                          {column.noneOptionLabel}
                                        </option>
                                      )}
                                      {(
                                        options as Array<
                                          string | { label: string; value: string }
                                        >
                                      ).map((opt) => {
                                        const optValue =
                                          typeof opt === "string"
                                            ? opt
                                            : opt.value;
                                        const optLabel =
                                          typeof opt === "string"
                                            ? opt
                                            : opt.label;
                                        return (
                                          <option
                                            key={optValue}
                                            value={optValue}
                                          >
                                            {optLabel}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-3 p-4 border-t bg-white">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeBulkEditDrawer}
                    className="h-10 px-4"
                  >
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkEditSaveAll}
                    disabled={!hasBulkEditChanges}
                    className="h-10 px-5 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Salva tutto
                  </Button>
                </div>
              </DrawerContent>
            </Drawer>
          </>
        )}
      </div>
    </div>
  );
}
