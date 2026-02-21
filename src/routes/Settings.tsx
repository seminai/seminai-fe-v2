import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTokenCosts } from "@/hooks/useTokenCosts";
import { Spinner } from "@/components/ui/spinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateCurrentUserWithBearer,
  type UpdateCurrentUserRequest,
  clearCacheWithBearer,
} from "@/api/users";
import { uploadProfilePictureWithBearer } from "@/api/users";
import {
  setupWhatsAppWithBearer,
  getWhatsAppQrCodeWithBearer,
  getWhatsAppStatusWithBearer,
  disconnectWhatsAppWithBearer,
  type WhatsAppStatusResponse,
} from "@/api/whatsapp";
import { type TokenUsage } from "@/api/token-costs";
import { InputFile } from "@/components/ui/input-file";
import {
  updatePasswordWithBearer,
  type UpdatePasswordRequest,
} from "@/api/auth";
import {
  createEditableUserState,
  updateEditableField,
  isEditableDirty,
  diffEditable,
  type EditableUserState,
} from "@/utils/user-edit";
import {
  Pencil,
  Trash2,
  HardDrive,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  BarChart3,
  Table2,
  TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

const integerFormatter = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("it-IT", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

function formatPercentage(value: number): string {
  return percentageFormatter.format(value);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return dateTimeFormatter.format(parsed);
}

class TokenUsageViewModel {
  private readonly usage: TokenUsage;

  constructor(usage: TokenUsage) {
    this.usage = usage;
  }

  public get id(): string {
    return this.usage.id;
  }

  public get jobType(): string {
    return this.usage.jobType;
  }

  public get model(): string {
    return this.usage.model;
  }

  public get promptTokens(): string {
    return formatInteger(this.usage.promptTokens);
  }

  public get completionTokens(): string {
    return formatInteger(this.usage.completionTokens);
  }

  public get totalTokens(): string {
    return formatInteger(this.usage.totalTokens);
  }

  public get cost(): string {
    return formatCurrency(this.usage.cost);
  }

  public get clientCost(): string {
    return formatCurrency(this.usage.costClient);
  }

  public get margin(): string {
    return formatPercentage(this.usage.seminaiMargin);
  }

  public get createdAt(): string {
    return formatDateTime(this.usage.createdAt);
  }

  /** Date key (YYYY-MM-DD) for filtering and grouping */
  public get dateKey(): string {
    const d = new Date(this.usage.createdAt);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  public get costClientNumber(): number {
    return this.usage.costClient;
  }

  public get totalTokensNumber(): number {
    return this.usage.totalTokens;
  }

  public get promptTokensNumber(): number {
    return this.usage.promptTokens;
  }

  public get completionTokensNumber(): number {
    return this.usage.completionTokens;
  }

  public get reference(): string {
    return (
      this.usage.jobId || this.usage.jobGroupId || this.usage.companyId || "—"
    );
  }

  public get metadataCompanyId(): string {
    const metaCompany = (this.usage.metadata as { companyId?: unknown })
      ?.companyId;
    if (typeof metaCompany === "string" && metaCompany.trim().length > 0) {
      return metaCompany;
    }
    if (typeof this.usage.companyId === "string" && this.usage.companyId) {
      return this.usage.companyId;
    }
    return "—";
  }

  public get metadataSummary(): string {
    const entries = Object.entries(this.usage.metadata ?? {});
    if (entries.length === 0) return "—";
    return entries
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(" • ");
  }
}

type TokenUsageFilters = {
  text: string;
  jobType: string;
  model: string;
  companyId: string;
  dateFrom: string;
  dateTo: string;
};

class TokenUsageFilterEngine {
  private readonly filters: TokenUsageFilters;

  constructor(filters: TokenUsageFilters) {
    this.filters = filters;
  }

  public apply(rows: TokenUsageViewModel[]): TokenUsageViewModel[] {
    return rows.filter((row) => this.matches(row));
  }

  private matches(row: TokenUsageViewModel): boolean {
    const { text, jobType, model, companyId, dateFrom, dateTo } = this.filters;
    if (jobType && row.jobType !== jobType) return false;
    if (model && row.model !== model) return false;
    if (companyId && row.metadataCompanyId !== companyId) return false;
    const key = row.dateKey;
    if (dateFrom && key < dateFrom) return false;
    if (dateTo && key > dateTo) return false;

    if (text.trim().length === 0) return true;
    const query = text.toLowerCase();
    return (
      row.model.toLowerCase().includes(query) ||
      row.jobType.toLowerCase().includes(query) ||
      row.metadataCompanyId.toLowerCase().includes(query) ||
      row.reference.toLowerCase().includes(query) ||
      row.metadataSummary.toLowerCase().includes(query)
    );
  }
}

const DEFAULT_FILTERS: TokenUsageFilters = {
  text: "",
  jobType: "",
  model: "",
  companyId: "",
  dateFrom: "",
  dateTo: "",
};

export default function Settings() {
  const { data, isLoading, error } = useCurrentUser();
  const queryClient = useQueryClient();
  const {
    usages,
    isLoading: isLoadingTokenCosts,
    isError: isTokenCostsError,
    error: tokenCostsError,
  } = useTokenCosts();

  const userData = data?.data.user;
  const qdcApiKey = data?.data.qdcApiKey ?? null;
  const ifarmingApiKey = data?.data.ifarmingApiKey ?? null;
  const [editable, setEditable] = React.useState<EditableUserState | null>(
    userData ? createEditableUserState(userData) : null,
  );

  const [editingQdc, setEditingQdc] = React.useState(qdcApiKey === null);
  const [editingIfarming, setEditingIfarming] = React.useState(
    ifarmingApiKey === null,
  );
  const [qdcValue, setQdcValue] = React.useState("");
  const [ifarmingValue, setIfarmingValue] = React.useState("");
  const [qdcOriginalValue, setQdcOriginalValue] = React.useState("");
  const [ifarmingOriginalValue, setIfarmingOriginalValue] = React.useState("");

  React.useEffect(() => {
    if (qdcApiKey === null) {
      setEditingQdc(true);
      setQdcValue("");
      setQdcOriginalValue("");
    } else if (!editingQdc) {
      setQdcValue(qdcApiKey);
      setQdcOriginalValue(qdcApiKey);
    }
  }, [qdcApiKey, editingQdc]);

  React.useEffect(() => {
    if (ifarmingApiKey === null) {
      setEditingIfarming(true);
      setIfarmingValue("");
      setIfarmingOriginalValue("");
    } else if (!editingIfarming) {
      setIfarmingValue(ifarmingApiKey);
      setIfarmingOriginalValue(ifarmingApiKey);
    }
  }, [ifarmingApiKey, editingIfarming]);

  const isQdcModified = editingQdc && qdcValue !== qdcOriginalValue;
  const isIfarmingModified =
    editingIfarming && ifarmingValue !== ifarmingOriginalValue;

  const usageRows = React.useMemo(() => {
    return usages.map((usage) => new TokenUsageViewModel(usage));
  }, [usages]);

  const [filters, setFilters] =
    React.useState<TokenUsageFilters>(DEFAULT_FILTERS);
  const [tokenCostsTab, setTokenCostsTab] = React.useState("table");

  const filterOptions = React.useMemo(() => {
    const jobTypes = Array.from(new Set(usageRows.map((row) => row.jobType)));
    const models = Array.from(new Set(usageRows.map((row) => row.model)));
    const companies = Array.from(
      new Set(
        usageRows
          .map((row) => row.metadataCompanyId)
          .filter((id) => id !== "—"),
      ),
    );
    return { jobTypes, models, companies };
  }, [usageRows]);

  const filteredUsageRows = React.useMemo(() => {
    const engine = new TokenUsageFilterEngine(filters);
    return engine.apply(usageRows);
  }, [filters, usageRows]);

  const filteredTotals = React.useMemo(() => {
    let totalCostClient = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    for (const row of filteredUsageRows) {
      totalCostClient += row.costClientNumber;
      totalPromptTokens += row.promptTokensNumber;
      totalCompletionTokens += row.completionTokensNumber;
      totalTokens += row.totalTokensNumber;
    }
    return {
      totalCostClient,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
    };
  }, [filteredUsageRows]);

  const tokenCostSummary = React.useMemo(
    () =>
      usageRows.length > 0
        ? [
            {
              label: "Costo totale (cliente)",
              value: formatCurrency(filteredTotals.totalCostClient),
            },
            {
              label: "Token prompt",
              value: formatInteger(filteredTotals.totalPromptTokens),
            },
            {
              label: "Token completion",
              value: formatInteger(filteredTotals.totalCompletionTokens),
            },
            {
              label: "Token totali",
              value: formatInteger(filteredTotals.totalTokens),
            },
          ]
        : [],
    [usageRows.length, filteredTotals],
  );

  const modelsInChart = React.useMemo(
    () => Array.from(new Set(filteredUsageRows.map((r) => r.model))).sort(),
    [filteredUsageRows],
  );

  type DayModelRow = {
    dateKey: string;
    dateLabel: string;
    [model: string]: string | number;
  };

  const dailyConsumptionByModel = React.useMemo((): DayModelRow[] => {
    const byDay = new Map<string, Map<string, number>>();
    for (const row of filteredUsageRows) {
      const key = row.dateKey;
      if (!key) continue;
      let dayMap = byDay.get(key);
      if (!dayMap) {
        dayMap = new Map<string, number>();
        byDay.set(key, dayMap);
      }
      const prev = dayMap.get(row.model) ?? 0;
      dayMap.set(row.model, prev + row.costClientNumber);
    }
    const sortedKeys = Array.from(byDay.keys()).sort();
    return sortedKeys.map((dateKey) => {
      const dayMap = byDay.get(dateKey)!;
      const out: DayModelRow = {
        dateKey,
        dateLabel: dateKey.split("-").reverse().join("/"),
      };
      for (const model of modelsInChart) {
        out[model] = dayMap.get(model) ?? 0;
      }
      return out;
    });
  }, [filteredUsageRows, modelsInChart]);

  const hasUsages = usageRows.length > 0;

  const consumptionChartConfig: ChartConfig = React.useMemo(() => {
    const base: ChartConfig = {
      costClient: {
        label: "Costo cliente (€)",
        color: "var(--chart-1)",
      },
      totalTokens: {
        label: "Token totali",
        color: "var(--chart-2)",
      },
    };
    const chartColors = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
    modelsInChart.forEach((model, i) => {
      base[model] = {
        label: model,
        color: `var(--${chartColors[i % chartColors.length]})`,
      };
    });
    return base;
  }, [modelsInChart]);

  React.useEffect(() => {
    if (userData) {
      setEditable(createEditableUserState(userData));
    }
  }, [userData]);

  const { mutateAsync: saveAsync, isPending: isSaving } = useMutation({
    mutationFn: async (payload: UpdateCurrentUserRequest) => {
      return await updateCurrentUserWithBearer(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      toast.success("Settings saved successfully");
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Update failed";
      toast.error(message);
    },
  });

  const { mutateAsync: uploadAsync, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      return await uploadProfilePictureWithBearer(file);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      toast.success("Foto profilo aggiornata");
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Upload failed";
      toast.error(message);
    },
  });

  const [passwords, setPasswords] = React.useState<UpdatePasswordRequest>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { mutateAsync: changePasswordAsync, isPending: isChangingPassword } =
    useMutation({
      mutationFn: async (payload: UpdatePasswordRequest) => {
        return await updatePasswordWithBearer(payload);
      },
      onSuccess: () => {
        toast.success("Password aggiornata");
        setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      },
      onError: (e: unknown) => {
        const message =
          e instanceof Error ? e.message : "Password update failed";
        toast.error(message);
      },
    });

  const { mutateAsync: saveApiKeysAsync, isPending: isSavingApiKeys } =
    useMutation({
      mutationFn: async (payload: {
        qdcApiKey?: string | null;
        ifarmingApiKey?: string | null;
      }) => {
        return await updateCurrentUserWithBearer(payload);
      },
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
        toast.success("Credenziali API aggiornate");
        if (variables.qdcApiKey !== undefined) {
          setQdcOriginalValue(variables.qdcApiKey ?? "");
          setEditingQdc(false);
        }
        if (variables.ifarmingApiKey !== undefined) {
          setIfarmingOriginalValue(variables.ifarmingApiKey ?? "");
          setEditingIfarming(false);
        }
      },
      onError: (e: unknown) => {
        const message = e instanceof Error ? e.message : "Update failed";
        toast.error(message);
      },
    });

  const [clearCacheDialogOpen, setClearCacheDialogOpen] = React.useState(false);
  const [clearCacheConfirmText, setClearCacheConfirmText] = React.useState("");

  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = React.useState<
    WhatsAppStatusResponse["data"] | null
  >(null);
  const [whatsappQrCode, setWhatsappQrCode] = React.useState<string | null>(
    null,
  );
  const [isLoadingWhatsappStatus, setIsLoadingWhatsappStatus] =
    React.useState(false);
  const [isSettingUpWhatsapp, setIsSettingUpWhatsapp] = React.useState(false);
  const [isDisconnectingWhatsapp, setIsDisconnectingWhatsapp] =
    React.useState(false);
  const [isWhatsappConnecting, setIsWhatsappConnecting] = React.useState(false);
  const whatsappStatusPollingIntervalRef = React.useRef<NodeJS.Timeout | null>(
    null,
  );

  const { mutateAsync: clearCacheAsync, isPending: isClearingCache } =
    useMutation({
      mutationFn: async () => {
        return await clearCacheWithBearer();
      },
      onSuccess: () => {
        toast.success("Cache eliminata con successo");
        setClearCacheDialogOpen(false);
        setClearCacheConfirmText("");
      },
      onError: (e: unknown) => {
        const message =
          e instanceof Error
            ? e.message
            : "Errore durante l'eliminazione della cache";
        toast.error(message);
      },
    });

  const isClearCacheConfirmValid =
    clearCacheConfirmText.trim().toLowerCase() === "elimina";

  const stopWhatsappStatusPolling = React.useCallback(() => {
    if (whatsappStatusPollingIntervalRef.current) {
      clearInterval(whatsappStatusPollingIntervalRef.current);
      whatsappStatusPollingIntervalRef.current = null;
    }
  }, []);

  const startWhatsappStatusPolling = React.useCallback(() => {
    if (whatsappStatusPollingIntervalRef.current) {
      return; // Already polling
    }
    const interval = setInterval(async () => {
      try {
        const response = await getWhatsAppStatusWithBearer();
        const newStatus = response.data;

        setWhatsappStatus(newStatus);

        // Update QR code if still in connecting phase (not connected yet)
        if (newStatus.connectionStatus === "connected") {
          // Clear QR code when connected
          setWhatsappQrCode(null);
          setIsWhatsappConnecting(false);
          stopWhatsappStatusPolling();
        } else if (newStatus.connectionStatus === "disconnected") {
          // Clear QR code when disconnected
          setWhatsappQrCode(null);
          setIsWhatsappConnecting(false);
        } else {
          // Keep QR code visible and try to refresh it if still connecting
          // Only refresh if we don't have one or if status explicitly says qr_code_ready
          if (
            !whatsappQrCode ||
            newStatus.connectionStatus === "qr_code_ready" ||
            newStatus.connectionStatus === "connecting"
          ) {
            try {
              const qrResponse = await getWhatsAppQrCodeWithBearer();
              setWhatsappQrCode(qrResponse.data.qrCodeBase64);
            } catch (error) {
              // If QR code fetch fails but we have one, keep it visible
              console.error("Failed to load QR code in polling:", error);
            }
          }
        }
      } catch (error) {
        console.error("Failed to poll WhatsApp status:", error);
      }
    }, 3000); // Poll every 3 seconds
    whatsappStatusPollingIntervalRef.current = interval;
  }, [stopWhatsappStatusPolling]);

  const loadWhatsappStatus = React.useCallback(async () => {
    setIsLoadingWhatsappStatus(true);
    try {
      const response = await getWhatsAppStatusWithBearer();
      setWhatsappStatus(response.data);

      // If connecting or QR code ready, start polling
      if (
        response.data.connectionStatus === "connecting" ||
        response.data.connectionStatus === "qr_code_ready"
      ) {
        setIsWhatsappConnecting(true);
        startWhatsappStatusPolling();
      } else {
        setIsWhatsappConnecting(false);
        stopWhatsappStatusPolling();
      }

      // If QR code is available, fetch it
      if (
        response.data.connectionStatus === "qr_code_ready" ||
        response.data.connectionStatus === "connecting"
      ) {
        try {
          const qrResponse = await getWhatsAppQrCodeWithBearer();
          setWhatsappQrCode(qrResponse.data.qrCodeBase64);
        } catch (error) {
          console.error("Failed to load QR code:", error);
        }
      } else if (response.data.connectionStatus === "connected") {
        // Clear QR code when connected
        setWhatsappQrCode(null);
        setIsWhatsappConnecting(false);
      } else if (response.data.connectionStatus === "disconnected") {
        // Clear QR code when disconnected
        setWhatsappQrCode(null);
        setIsWhatsappConnecting(false);
      }
      // Keep QR code if status is still in connecting phase
    } catch (error) {
      console.error("Failed to load WhatsApp status:", error);
      // If error, assume disconnected
      setWhatsappStatus({
        connected: false,
        connectionStatus: "disconnected",
      });
      setIsWhatsappConnecting(false);
      stopWhatsappStatusPolling();
    } finally {
      setIsLoadingWhatsappStatus(false);
    }
  }, [startWhatsappStatusPolling, stopWhatsappStatusPolling]);

  // Load WhatsApp status on mount
  React.useEffect(() => {
    let mounted = true;

    const loadStatus = async () => {
      setIsLoadingWhatsappStatus(true);
      try {
        const response = await getWhatsAppStatusWithBearer();
        if (!mounted) return;

        setWhatsappStatus(response.data);

        // If connecting or QR code ready, start polling
        if (
          response.data.connectionStatus === "connecting" ||
          response.data.connectionStatus === "qr_code_ready"
        ) {
          if (mounted) {
            setIsWhatsappConnecting(true);
          }
          startWhatsappStatusPolling();
        } else {
          if (mounted) {
            setIsWhatsappConnecting(false);
          }
        }

        // If QR code is available, fetch it
        if (
          response.data.connectionStatus === "qr_code_ready" ||
          response.data.connectionStatus === "connecting"
        ) {
          try {
            const qrResponse = await getWhatsAppQrCodeWithBearer();
            if (mounted) {
              setWhatsappQrCode(qrResponse.data.qrCodeBase64);
            }
          } catch (error) {
            console.error("Failed to load QR code:", error);
          }
        } else if (mounted) {
          if (response.data.connectionStatus === "connected") {
            setWhatsappQrCode(null);
            setIsWhatsappConnecting(false);
          } else if (response.data.connectionStatus === "disconnected") {
            setWhatsappQrCode(null);
            setIsWhatsappConnecting(false);
          }
        }
      } catch (error) {
        console.error("Failed to load WhatsApp status:", error);
        if (mounted) {
          setWhatsappStatus({
            connected: false,
            connectionStatus: "disconnected",
          });
        }
      } finally {
        if (mounted) {
          setIsLoadingWhatsappStatus(false);
        }
      }
    };

    loadStatus();

    return () => {
      mounted = false;
      stopWhatsappStatusPolling();
    };
  }, [startWhatsappStatusPolling, stopWhatsappStatusPolling]);

  const { mutateAsync: setupWhatsappAsync } = useMutation({
    mutationFn: async () => {
      return await setupWhatsAppWithBearer();
    },
    onSuccess: async (response) => {
      setIsWhatsappConnecting(true);
      setWhatsappStatus({
        connected: false,
        connectionStatus: "qr_code_ready",
      });
      if (response.data.qrCodeBase64) {
        setWhatsappQrCode(response.data.qrCodeBase64);
      }
      startWhatsappStatusPolling();
      toast.success("Setup WhatsApp completato. Scansiona il QR code.");
    },
    onError: (e: unknown) => {
      setIsWhatsappConnecting(false);
      const message =
        e instanceof Error ? e.message : "Errore durante il setup WhatsApp";
      toast.error(message);
    },
  });

  const { mutateAsync: disconnectWhatsappAsync } = useMutation({
    mutationFn: async () => {
      return await disconnectWhatsAppWithBearer({ deleteInstance: false });
    },
    onSuccess: async () => {
      setWhatsappStatus({
        connected: false,
        connectionStatus: "disconnected",
      });
      setWhatsappQrCode(null);
      setIsWhatsappConnecting(false);
      stopWhatsappStatusPolling();
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      toast.success("WhatsApp disconnesso con successo");
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error
          ? e.message
          : "Errore durante la disconnessione WhatsApp";
      toast.error(message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Impostazioni</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={20} ariaLabel="Caricamento dati utente" />
          <span>Caricamento dati utente…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Impostazioni</h1>
        <div className="text-sm text-red-600">
          Impossibile caricare i dati utente.
        </div>
      </div>
    );
  }

  const user = data.data.user;
  const initials = `${user.name?.[0] ?? ""}${
    user.surname?.[0] ?? ""
  }`.toUpperCase();
  const current = editable?.current;
  const isDirty = editable ? isEditableDirty(editable) : false;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Impostazioni</h1>

      <div className="flex justify-end mb-4">
        {isDirty && (
          <Button
            onClick={async () => {
              if (!editable) return;
              const payload = diffEditable(editable);
              await saveAsync(payload);
            }}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? "Salvataggio…" : "Salva"}
          </Button>
        )}
      </div>

      <Card className="p-6 flex items-center gap-4 shadow-none">
        <Avatar className="size-16">
          <AvatarImage
            src={current?.profilePictureUrl}
            alt={`${user.name} ${user.surname}`}
          />
          <AvatarFallback>{initials || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-lg font-medium">
            {(current?.name ?? "") + " " + (current?.surname ?? "")}
          </div>
          <div className="text-gray-600 text-sm">{user.email}</div>
          <div className="text-gray-600 text-sm">{current?.companyName}</div>
          <div className="mt-2 flex flex-col gap-1.5 w-full max-w-xs">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Crediti</span>
              <span className="font-medium tabular-nums">
                {user.credits} disponibili
              </span>
            </div>
            <Progress
              value={Math.min(
                100,
                (user.credits / Math.max(100, user.credits)) * 100,
              )}
              className="h-2"
            />
          </div>
        </div>
        <div>
          <InputFile
            id="profilePictureUpload"
            label="Foto profilo"
            accept="image/*"
            disabled={isUploading}
            onChange={async (file) => {
              if (!file) return;
              await uploadAsync(file);
            }}
          />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Card className="p-4 shadow-none">
          <h2 className="font-medium mb-4">Informazioni personali</h2>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={current?.name ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "name", e.target.value)
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="surname">Cognome</Label>
              <Input
                id="surname"
                value={current?.surname ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "surname", e.target.value)
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fiscalCode">Codice fiscale</Label>
              <Input
                id="fiscalCode"
                value={current?.fiscalCode ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "fiscalCode", e.target.value)
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phoneNumber">Telefono</Label>
              <Input
                id="phoneNumber"
                value={current?.phoneNumber ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "phoneNumber", e.target.value)
                      : prev,
                  )
                }
              />
            </div>
            {/* URL manuale rimosso: gestito via upload file sopra */}
          </div>
        </Card>
        <Card className="p-4 shadow-none">
          <h2 className="font-medium mb-4">Dati aziendali</h2>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="companyName">Ragione sociale</Label>
              <Input
                id="companyName"
                value={current?.companyName ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "companyName", e.target.value)
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vatNumber">P. IVA</Label>
              <Input
                id="vatNumber"
                value={current?.vatNumber ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "vatNumber", e.target.value)
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="address">Indirizzo</Label>
              <Input
                id="address"
                value={current?.address ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "address", e.target.value)
                      : prev,
                  )
                }
              />
            </div>
          </div>
        </Card>
        <Card className="p-4 md:col-span-2 shadow-none">
          <h2 className="font-medium mb-4">Cambia password</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="oldPassword">Password attuale</Label>
              <Input
                id="oldPassword"
                type="password"
                value={passwords.oldPassword}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, oldPassword: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="newPassword">Nuova password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, newPassword: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirmPassword">Conferma password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              disabled={
                isChangingPassword ||
                !passwords.oldPassword ||
                !passwords.newPassword ||
                passwords.newPassword !== passwords.confirmPassword
              }
              onClick={async () => {
                if (passwords.newPassword !== passwords.confirmPassword) {
                  toast.error("Le password non coincidono");
                  return;
                }
                await changePasswordAsync(passwords);
              }}
            >
              {isChangingPassword ? "Aggiornamento…" : "Cambia password"}
            </Button>
          </div>
        </Card>
        <Card className="p-4 md:col-span-2 shadow-none">
          <h2 className="font-medium mb-4">Credenziali API</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="qdcApiKey">QDC API Key</Label>
              <div className="flex items-center gap-2">
                <img
                  src="/image/qdc_logo.png"
                  alt="QDC Logo"
                  className="h-8 w-8 object-contain"
                />
                <Input
                  id="qdcApiKey"
                  type="password"
                  placeholder={
                    qdcApiKey === null ? "Inserisci credenziali" : undefined
                  }
                  value={editingQdc ? qdcValue : "••••••••••••••••"}
                  readOnly={!editingQdc}
                  disabled={!editingQdc}
                  onChange={(e) => setQdcValue(e.target.value)}
                  className={!editingQdc ? "pr-10" : ""}
                />
                {!editingQdc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => {
                      const original = qdcApiKey ?? "";
                      setEditingQdc(true);
                      setQdcValue(original);
                      setQdcOriginalValue(original);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {editingQdc && isQdcModified && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQdcValue(qdcOriginalValue);
                        if (qdcApiKey === null && qdcOriginalValue === "") {
                          // Rimani in editing se era null e non c'era valore originale
                        } else {
                          setEditingQdc(false);
                        }
                      }}
                    >
                      Annulla
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSavingApiKeys}
                      onClick={async () => {
                        await saveApiKeysAsync({ qdcApiKey: qdcValue || null });
                      }}
                    >
                      {isSavingApiKeys ? "Salvataggio…" : "Salva"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ifarmingApiKey">iFarming API Key</Label>
              <div className="flex items-center gap-2">
                <img
                  src="/image/ifarming_logo.png"
                  alt="iFarming Logo"
                  className="h-8 w-8 object-contain"
                />
                <Input
                  id="ifarmingApiKey"
                  type="password"
                  placeholder={
                    ifarmingApiKey === null
                      ? "Inserisci credenziali"
                      : undefined
                  }
                  value={editingIfarming ? ifarmingValue : "••••••••••••••••"}
                  readOnly={!editingIfarming}
                  disabled={!editingIfarming}
                  onChange={(e) => setIfarmingValue(e.target.value)}
                  className={!editingIfarming ? "pr-10" : ""}
                />
                {!editingIfarming && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => {
                      const original = ifarmingApiKey ?? "";
                      setEditingIfarming(true);
                      setIfarmingValue(original);
                      setIfarmingOriginalValue(original);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {editingIfarming && isIfarmingModified && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIfarmingValue(ifarmingOriginalValue);
                        if (
                          ifarmingApiKey === null &&
                          ifarmingOriginalValue === ""
                        ) {
                          // Rimani in editing se era null e non c'era valore originale
                        } else {
                          setEditingIfarming(false);
                        }
                      }}
                    >
                      Annulla
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSavingApiKeys}
                      onClick={async () => {
                        await saveApiKeysAsync({
                          ifarmingApiKey: ifarmingValue || null,
                        });
                      }}
                    >
                      {isSavingApiKeys ? "Salvataggio…" : "Salva"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4 md:col-span-2 shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-gray-600" />
            <h2 className="font-medium">Integrazione WhatsApp</h2>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 mb-1">
                    Importante: Numero WhatsApp dedicato richiesto
                  </p>
                  <p className="text-sm text-yellow-800">
                    Il numero WhatsApp utilizzato per questa integrazione{" "}
                    <strong>DEVE essere diverso</strong> dal tuo numero
                    personale. Se colleghi il tuo numero personale,
                    l'integrazione smetterà di funzionare correttamente. Ti
                    consigliamo di utilizzare un numero WhatsApp Business
                    dedicato per la tua azienda agricola.
                  </p>
                </div>
              </div>
            </div>

            {isLoadingWhatsappStatus ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Spinner size={16} ariaLabel="Caricamento stato WhatsApp" />
                <span>Caricamento stato connessione…</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg border border-agri-green-100 bg-agri-green-50/60">
                  <div className="flex items-center gap-3">
                    {whatsappStatus?.connected ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            WhatsApp connesso
                          </p>
                          {whatsappStatus.phoneNumber && (
                            <p className="text-xs text-gray-600">
                              Numero: {whatsappStatus.phoneNumber}
                            </p>
                          )}
                          {whatsappStatus.lastSync && (
                            <p className="text-xs text-gray-600">
                              Ultima sincronizzazione:{" "}
                              {formatDateTime(whatsappStatus.lastSync)}
                            </p>
                          )}
                        </div>
                      </>
                    ) : whatsappStatus?.connectionStatus === "connecting" ||
                      whatsappStatus?.connectionStatus === "qr_code_ready" ? (
                      <>
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            In attesa di connessione...
                          </p>
                          <p className="text-xs text-gray-600">
                            Scansiona il QR code con WhatsApp per completare la
                            connessione
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            WhatsApp non connesso
                          </p>
                          <p className="text-xs text-gray-600">
                            Collega WhatsApp per inviare note di campo tramite
                            messaggi
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoadingWhatsappStatus}
                      onClick={() => {
                        loadWhatsappStatus();
                      }}
                      title="Ricarica stato"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          isLoadingWhatsappStatus ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                    {whatsappStatus?.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isDisconnectingWhatsapp}
                        onClick={async () => {
                          setIsDisconnectingWhatsapp(true);
                          try {
                            await disconnectWhatsappAsync();
                          } finally {
                            setIsDisconnectingWhatsapp(false);
                          }
                        }}
                      >
                        {isDisconnectingWhatsapp ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Disconnessione...
                          </>
                        ) : (
                          "Disconnetti"
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isSettingUpWhatsapp}
                        onClick={async () => {
                          setIsSettingUpWhatsapp(true);
                          try {
                            await setupWhatsappAsync();
                          } finally {
                            setIsSettingUpWhatsapp(false);
                          }
                        }}
                      >
                        {isSettingUpWhatsapp ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Setup...
                          </>
                        ) : (
                          "Collega WhatsApp"
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {(whatsappQrCode || isWhatsappConnecting) &&
                  whatsappStatus?.connectionStatus !== "connected" && (
                    <div className="p-4 rounded-lg border border-agri-green-100 bg-white">
                      <p className="text-sm font-medium text-gray-900 mb-3">
                        Scansiona questo QR code con WhatsApp:
                      </p>
                      {whatsappQrCode && (
                        <div className="flex justify-center">
                          <img
                            src={whatsappQrCode}
                            alt="WhatsApp QR Code"
                            className="w-64 h-64 border border-gray-200 rounded-lg"
                          />
                        </div>
                      )}
                      <p className="text-xs text-gray-600 mt-3 text-center">
                        1. Apri WhatsApp sul telefono
                        <br />
                        2. Vai in Impostazioni → Dispositivi collegati → Collega
                        un dispositivo
                        <br />
                        3. Scansiona questo QR code
                      </p>
                      <div className="mt-3 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isLoadingWhatsappStatus}
                          onClick={async () => {
                            try {
                              const qrResponse =
                                await getWhatsAppQrCodeWithBearer();
                              setWhatsappQrCode(qrResponse.data.qrCodeBase64);
                              toast.success("QR code aggiornato");
                            } catch (error: unknown) {
                              console.error(error);
                              toast.error(
                                "Errore durante il caricamento del QR code",
                              );
                            }
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Aggiorna QR code
                        </Button>
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </Card>
        <Card className="p-4 md:col-span-2 shadow-none">
          <Accordion type="single" collapsible>
            <AccordionItem value="cache-management" className="border-0">
              <AccordionTrigger className="hover:no-underline py-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">Gestione cache</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-gray-600 mb-4">
                  Elimina la cache locale associata al tuo account. Questa
                  azione è irreversibile.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setClearCacheDialogOpen(true)}
                  disabled={isClearingCache}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Pulisci cache
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>

      <Dialog
        open={clearCacheDialogOpen}
        onOpenChange={setClearCacheDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione cache</DialogTitle>
            <DialogDescription>
              Questa azione eliminerà la cache associata al tuo account. Per
              confermare, digita <strong>elimina</strong> nel campo sottostante.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="clearCacheConfirm">
              Digita "elimina" per confermare
            </Label>
            <Input
              id="clearCacheConfirm"
              value={clearCacheConfirmText}
              onChange={(e) => setClearCacheConfirmText(e.target.value)}
              placeholder="elimina"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setClearCacheDialogOpen(false);
                setClearCacheConfirmText("");
              }}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              disabled={!isClearCacheConfirmValid || isClearingCache}
              onClick={async () => {
                await clearCacheAsync();
              }}
            >
              {isClearingCache ? "Eliminazione…" : "Elimina cache"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="p-4 shadow-none mt-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-medium">Storico costi token</h2>
            <p className="text-sm text-gray-600">
              Dettaglio dei consumi e dei costi calcolati con margine Seminai.
            </p>
          </div>
          {isLoadingTokenCosts && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size={16} ariaLabel="Caricamento costi token" />
              <span>Caricamento…</span>
            </div>
          )}
        </div>

        {isTokenCostsError && (
          <div className="mb-4 text-sm text-red-600">
            {tokenCostsError?.message ?? "Impossibile caricare i costi."}
          </div>
        )}

        {tokenCostSummary.length > 0 && (
          <div className="grid sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            {tokenCostSummary.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-agri-green-100 bg-agri-green-50/60 p-3"
              >
                <div className="text-xs text-gray-600">{item.label}</div>
                <div className="text-base font-semibold text-black">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Cerca per modello, job, metadata…"
            value={filters.text}
            className="w-full sm:w-64"
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, text: e.target.value }))
            }
          />
          <Label className="sr-only" htmlFor="filter-date-from">
            Data da
          </Label>
          <Input
            id="filter-date-from"
            type="date"
            className="h-10 w-[140px]"
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
            }
          />
          <Label className="sr-only" htmlFor="filter-date-to">
            Data a
          </Label>
          <Input
            id="filter-date-to"
            type="date"
            className="h-10 w-[140px]"
            value={filters.dateTo}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
            }
          />
          <select
            className="h-10 rounded-md border border-agri-green-100 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-green-200"
            value={filters.jobType}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, jobType: e.target.value }))
            }
          >
            <option value="">Job type</option>
            {filterOptions.jobTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-agri-green-100 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-green-200"
            value={filters.model}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, model: e.target.value }))
            }
          >
            <option value="">Modello</option>
            {filterOptions.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-agri-green-100 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-green-200"
            value={filters.companyId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, companyId: e.target.value }))
            }
          >
            <option value="">Azienda (metadata)</option>
            {filterOptions.companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="ml-auto"
          >
            Reset filtri
          </Button>
        </div>

        <Tabs
          value={tokenCostsTab}
          onValueChange={setTokenCostsTab}
          className="w-full"
        >
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="table" className="gap-2">
              <Table2 className="h-4 w-4" />
              Tabella
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Barre (per giorno e modello)
            </TabsTrigger>
            <TabsTrigger value="line" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Lineare (per modello)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="mt-0">
            <div className="max-h-[420px] rounded-lg border border-agri-green-100 bg-white shadow-sm overflow-auto">
              <Table className="min-w-[1040px] [&_tr]:border-agri-green-100 [&_th]:border-agri-green-100 [&_td]:border-agri-green-50">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Modello</TableHead>
                    <TableHead className="text-right">Prompt</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="text-right">Token totali</TableHead>
                    <TableHead className="text-right">Costo cliente</TableHead>
                    <TableHead>Azienda (metadata)</TableHead>
                    <TableHead>Riferimento</TableHead>
                    <TableHead>Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTokenCosts && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Spinner
                            size={16}
                            ariaLabel="Caricamento costi token"
                          />
                          <span>Recupero costi in corso…</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!isLoadingTokenCosts && !hasUsages && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <div className="text-sm text-gray-600">
                          Nessun costo registrato al momento.
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!isLoadingTokenCosts &&
                    hasUsages &&
                    filteredUsageRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.createdAt}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.jobType}</Badge>
                        </TableCell>
                        <TableCell>{row.model}</TableCell>
                        <TableCell className="text-right">
                          {row.promptTokens}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.completionTokens}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalTokens}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.clientCost}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {row.metadataCompanyId}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {row.reference}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate">
                          {row.metadataSummary}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="chart" className="mt-0">
            <div className="rounded-lg border border-agri-green-100 bg-white p-4 min-h-[320px]">
              {isLoadingTokenCosts && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                  <Spinner size={20} ariaLabel="Caricamento costi" />
                  <span>Caricamento…</span>
                </div>
              )}
              {!isLoadingTokenCosts && dailyConsumptionByModel.length === 0 && (
                <div className="flex items-center justify-center py-12 text-sm text-gray-600">
                  Nessun dato da mostrare. Applica i filtri o attendi nuovi
                  consumi.
                </div>
              )}
              {!isLoadingTokenCosts &&
                dailyConsumptionByModel.length > 0 &&
                tokenCostsTab === "chart" && (
                <div className="w-full overflow-x-auto min-h-[300px]" style={{ minWidth: 0 }}>
                <ChartContainer
                  config={consumptionChartConfig}
                  className="h-[300px] min-h-[300px] w-full min-w-[280px]"
                >
                  <BarChart
                    data={dailyConsumptionByModel}
                    margin={{ top: 8, right: 8, bottom: 24, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="dateLabel"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `€ ${Number(v).toFixed(2)}`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCurrency(Number(value))]}
                        />
                      }
                    />
                    <Legend />
                    {modelsInChart.map((model) => (
                      <Bar
                        key={model}
                        dataKey={model}
                        stackId="cost"
                        fill={`var(--color-${model})`}
                        radius={[0, 0, 0, 0]}
                        name={model}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Consumo per giorno per modello (costo cliente €). Barre impilate
              con nomi modelli in legenda.
            </p>
          </TabsContent>
          <TabsContent value="line" className="mt-0">
            <div className="rounded-lg border border-agri-green-100 bg-white p-4 min-h-[320px]">
              {isLoadingTokenCosts && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                  <Spinner size={20} ariaLabel="Caricamento costi" />
                  <span>Caricamento…</span>
                </div>
              )}
              {!isLoadingTokenCosts && dailyConsumptionByModel.length === 0 && (
                <div className="flex items-center justify-center py-12 text-sm text-gray-600">
                  Nessun dato da mostrare. Applica i filtri o attendi nuovi
                  consumi.
                </div>
              )}
              {!isLoadingTokenCosts &&
                dailyConsumptionByModel.length > 0 &&
                tokenCostsTab === "line" && (
                <div className="w-full overflow-x-auto min-h-[300px]" style={{ minWidth: 0 }}>
                <ChartContainer
                  config={consumptionChartConfig}
                  className="h-[300px] min-h-[300px] w-full min-w-[280px]"
                >
                  <LineChart
                    data={dailyConsumptionByModel}
                    margin={{ top: 8, right: 8, bottom: 24, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="dateLabel"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `€ ${Number(v).toFixed(2)}`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCurrency(Number(value))]}
                        />
                      }
                    />
                    <Legend />
                    {modelsInChart.map((model) => (
                      <Line
                        key={model}
                        type="monotone"
                        dataKey={model}
                        stroke={`var(--color-${model})`}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={model}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Andamento costo cliente (€) per giorno e per modello. Una linea
              per ogni modello.
            </p>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
