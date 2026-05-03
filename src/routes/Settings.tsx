import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getWhatsAppAllowlistWithBearer,
  addWhatsAppAllowlistWithBearer,
  removeWhatsAppAllowlistWithBearer,
  type WhatsAppStatusResponse,
} from "@/api/whatsapp";
import { type TokenUsage } from "@/api/token-costs";
import { InputFile } from "@/components/ui/input-file";
import { Checkbox } from "@/components/ui/checkbox";
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
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  BarChart3,
  Table2,
  TrendingUp,
  Plus,
  Phone,
  Info,
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
import {
  getIntlLocale,
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  type SupportedLanguage,
} from "@/i18n";

type FormatterBundle = {
  currency: Intl.NumberFormat;
  integer: Intl.NumberFormat;
  percentage: Intl.NumberFormat;
  dateTime: Intl.DateTimeFormat;
};

const formatterCache = new Map<string, FormatterBundle>();

function getFormatters(language: string): FormatterBundle {
  const locale = getIntlLocale(language);
  const cached = formatterCache.get(locale);
  if (cached) {
    return cached;
  }

  const formatters = {
    currency: new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }),
    integer: new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }),
    percentage: new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    dateTime: new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }),
  };

  formatterCache.set(locale, formatters);
  return formatters;
}

function formatCurrency(value: number, language: string): string {
  return getFormatters(language).currency.format(value);
}

function formatInteger(value: number, language: string): string {
  return getFormatters(language).integer.format(value);
}

function formatPercentage(value: number, language: string): string {
  return getFormatters(language).percentage.format(value);
}

function formatDateTime(value: string, language: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return getFormatters(language).dateTime.format(parsed);
}

class TokenUsageViewModel {
  private readonly usage: TokenUsage;
  private readonly language: string;

  constructor(usage: TokenUsage, language: string) {
    this.usage = usage;
    this.language = language;
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
    return formatInteger(this.usage.promptTokens, this.language);
  }

  public get completionTokens(): string {
    return formatInteger(this.usage.completionTokens, this.language);
  }

  public get totalTokens(): string {
    return formatInteger(this.usage.totalTokens, this.language);
  }

  public get cost(): string {
    return formatCurrency(this.usage.cost, this.language);
  }

  public get clientCost(): string {
    return formatCurrency(this.usage.costClient, this.language);
  }

  public get margin(): string {
    return formatPercentage(this.usage.seminaiMargin, this.language);
  }

  public get createdAt(): string {
    return formatDateTime(this.usage.createdAt, this.language);
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
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.language);
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") ?? "impostazioni") as
    | "impostazioni"
    | "integrazioni"
    | "costi";

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
    return usages.map((usage) => new TokenUsageViewModel(usage, currentLanguage));
  }, [usages, currentLanguage]);

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
              label: t("settings.costs.summary.totalClientCost"),
              value: formatCurrency(
                filteredTotals.totalCostClient,
                currentLanguage,
              ),
            },
            {
              label: t("settings.costs.summary.promptTokens"),
              value: formatInteger(
                filteredTotals.totalPromptTokens,
                currentLanguage,
              ),
            },
            {
              label: t("settings.costs.summary.completionTokens"),
              value: formatInteger(
                filteredTotals.totalCompletionTokens,
                currentLanguage,
              ),
            },
            {
              label: t("settings.costs.summary.totalTokens"),
              value: formatInteger(filteredTotals.totalTokens, currentLanguage),
            },
          ]
        : [],
    [usageRows.length, filteredTotals, t, currentLanguage],
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
        label: t("settings.costs.chartLabels.clientCost"),
        color: "var(--chart-1)",
      },
      totalTokens: {
        label: t("settings.costs.chartLabels.totalTokens"),
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
  }, [modelsInChart, t]);

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
      toast.success(t("settings.toast.saved"));
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error ? e.message : t("settings.toast.updateFailed");
      toast.error(message);
    },
  });

  const { mutateAsync: uploadAsync, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      return await uploadProfilePictureWithBearer(file);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      toast.success(t("settings.toast.profilePictureUpdated"));
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error ? e.message : t("settings.toast.uploadFailed");
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
        toast.success(t("settings.toast.passwordUpdated"));
        setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      },
      onError: (e: unknown) => {
        const message =
          e instanceof Error
            ? e.message
            : t("settings.toast.passwordUpdateFailed");
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
        toast.success(t("settings.toast.apiCredentialsUpdated"));
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
        const message =
          e instanceof Error ? e.message : t("settings.toast.updateFailed");
        toast.error(message);
      },
    });

  const [clearCacheDialogOpen, setClearCacheDialogOpen] = React.useState(false);
  const [clearCacheConfirmText, setClearCacheConfirmText] = React.useState("");

  // WhatsApp allowlist state
  const [allowedNumbers, setAllowedNumbers] = React.useState<string[]>([]);
  const [newAllowlistNumber, setNewAllowlistNumber] = React.useState("");
  const [isLoadingAllowlist, setIsLoadingAllowlist] = React.useState(false);

  const { mutateAsync: addAllowlistNumberAsync, isPending: isAddingNumber } =
    useMutation({
      mutationFn: async (phoneNumber: string) => {
        return await addWhatsAppAllowlistWithBearer(phoneNumber);
      },
      onSuccess: (response) => {
        setAllowedNumbers(response.data.allowedNumbers);
        setNewAllowlistNumber("");
        toast.success(t("settings.toast.numberAdded"));
      },
      onError: (e: unknown) => {
        const message =
          e instanceof Error ? e.message : t("settings.toast.addNumberError");
        toast.error(message);
      },
    });

  const { mutateAsync: removeAllowlistNumberAsync, isPending: isRemovingNumber } =
    useMutation({
      mutationFn: async (phoneNumber: string) => {
        return await removeWhatsAppAllowlistWithBearer(phoneNumber);
      },
      onSuccess: (response) => {
        setAllowedNumbers(response.data.allowedNumbers);
        toast.success(t("settings.toast.numberRemoved"));
      },
      onError: (e: unknown) => {
        const message =
          e instanceof Error
            ? e.message
            : t("settings.toast.removeNumberError");
        toast.error(message);
      },
    });

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
        toast.success(t("settings.toast.cacheCleared"));
        setClearCacheDialogOpen(false);
        setClearCacheConfirmText("");
      },
      onError: (e: unknown) => {
        const message =
          e instanceof Error
            ? e.message
            : t("settings.toast.cacheClearError");
        toast.error(message);
      },
    });

  const isClearCacheConfirmValid =
    clearCacheConfirmText.trim().toLowerCase() ===
    t("settings.cache.confirmWord").toLowerCase();

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

    // Load allowlist
    const loadAllowlist = async () => {
      setIsLoadingAllowlist(true);
      try {
        const res = await getWhatsAppAllowlistWithBearer();
        if (mounted) setAllowedNumbers(res.data.allowedNumbers);
      } catch {
        // silently ignore – allowlist is non-critical
      } finally {
        if (mounted) setIsLoadingAllowlist(false);
      }
    };
    loadAllowlist();

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
      toast.success(t("settings.toast.whatsappSetupComplete"));
    },
    onError: (e: unknown) => {
      setIsWhatsappConnecting(false);
      const message =
        e instanceof Error
          ? e.message
          : t("settings.toast.whatsappSetupError");
      toast.error(message);
    },
  });

  const [whatsappDisconnectDialogOpen, setWhatsappDisconnectDialogOpen] =
    React.useState(false);

  const [telegramEnabled, setTelegramEnabled] = React.useState(false);

  const { mutateAsync: disconnectWhatsappAsync, isPending: isDisconnecting } = useMutation({
    mutationFn: async (deleteInstance: boolean) => {
      return await disconnectWhatsAppWithBearer({ deleteInstance });
    },
    onSuccess: async (_, deleteInstance) => {
      setWhatsappStatus({
        connected: false,
        connectionStatus: "disconnected",
      });
      setWhatsappQrCode(null);
      setIsWhatsappConnecting(false);
      stopWhatsappStatusPolling();
      setWhatsappDisconnectDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      toast.success(
        deleteInstance
          ? t("settings.toast.whatsappInstanceDeleted")
          : t("settings.toast.whatsappDisconnected"),
      );
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error
          ? e.message
          : t("settings.toast.whatsappDisconnectError");
      toast.error(message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">
          {t("settings.title")}
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={20} ariaLabel={t("settings.loadingUser")} />
          <span>{t("settings.loadingUser")}</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">
          {t("settings.title")}
        </h1>
        <div className="text-sm text-red-600">
          {t("settings.loadUserError")}
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

  const sectionTitle =
    activeTab === "integrazioni"
      ? t("settings.sections.integrations")
      : activeTab === "costi"
        ? t("settings.sections.costs")
        : t("settings.sections.settings");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{sectionTitle}</h1>
        {isDirty && activeTab === "impostazioni" && (
          <Button
            onClick={async () => {
              if (!editable) return;
              const payload = diffEditable(editable);
              await saveAsync(payload);
            }}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        )}
      </div>

      {activeTab === "impostazioni" && (
        <div className="space-y-4">
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
                    <span className="text-gray-600">
                      {t("settings.profile.credits")}
                    </span>
                    <span className="font-medium tabular-nums">
                      {t("settings.profile.creditsAvailable", {
                        count: user.credits,
                      })}
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
                  label={t("settings.profile.profilePicture")}
                  accept="image/*"
                  disabled={isUploading}
                  onChange={async (file) => {
                    if (!file) return;
                    await uploadAsync(file);
                  }}
                />
              </div>
            </Card>

            <Card className="p-4 shadow-none">
              <div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-center">
                <div>
                  <h2 className="font-medium">
                    {t("language.settingsTitle")}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {t("language.settingsDescription")}
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="settings-language">
                    {t("language.label")}
                  </Label>
                  <Select
                    value={currentLanguage}
                    onValueChange={(value) => {
                      void i18n.changeLanguage(value as SupportedLanguage);
                    }}
                  >
                    <SelectTrigger id="settings-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4 shadow-none">
                <h2 className="font-medium mb-4">
                  {t("settings.profile.personalInfo")}
                </h2>
                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">
                      {t("settings.profile.name")}
                    </Label>
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
                    <Label htmlFor="surname">
                      {t("settings.profile.surname")}
                    </Label>
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
                    <Label htmlFor="fiscalCode">
                      {t("settings.profile.fiscalCode")}
                    </Label>
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
                    <Label htmlFor="phoneNumber">
                      {t("settings.profile.phone")}
                    </Label>
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
                </div>
              </Card>
              <Card className="p-4 shadow-none">
                <h2 className="font-medium mb-4">
                  {t("settings.profile.companyData")}
                </h2>
                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="companyName">
                      {t("settings.profile.companyName")}
                    </Label>
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
                    <Label htmlFor="vatNumber">
                      {t("settings.profile.vatNumber")}
                    </Label>
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
                    <Label htmlFor="address">
                      {t("settings.profile.address")}
                    </Label>
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
            </div>

            <Card className="p-4 shadow-none">
              <h2 className="font-medium mb-4">
                {t("settings.profile.changePassword")}
              </h2>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="oldPassword">
                    {t("settings.profile.currentPassword")}
                  </Label>
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
                  <Label htmlFor="newPassword">
                    {t("settings.profile.newPassword")}
                  </Label>
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
                  <Label htmlFor="confirmPassword">
                    {t("settings.profile.confirmPassword")}
                  </Label>
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
                      toast.error(t("settings.toast.passwordMismatch"));
                      return;
                    }
                    await changePasswordAsync(passwords);
                  }}
                >
                  {isChangingPassword
                    ? t("settings.profile.updating")
                    : t("settings.profile.changePassword")}
                </Button>
              </div>
            </Card>

            <Card className="p-4 shadow-none">
              <Accordion type="single" collapsible>
                <AccordionItem value="cache-management" className="border-0">
                  <AccordionTrigger className="hover:no-underline py-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">
                        {t("settings.cache.title")}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-gray-600 mb-4">
                      {t("settings.cache.description")}
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setClearCacheDialogOpen(true)}
                      disabled={isClearingCache}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("settings.cache.clean")}
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
        </div>
      )}

      {activeTab === "integrazioni" && (
        <div>
            <Accordion type="multiple" className="space-y-3">
              {/* WhatsApp */}
              <AccordionItem value="whatsapp" className="rounded-lg border border-gray-200 bg-white">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">
                      {t("settings.integrations.whatsapp.title")}
                    </span>
                    {whatsappStatus?.connected && (
                      <Badge variant="outline" className="text-green-600 border-green-200 ml-auto">
                        {t("common.connected")}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-900 mb-1">
                            {t("settings.integrations.whatsapp.importantTitle")}
                          </p>
                          <p className="text-sm text-yellow-800">
                            <Trans
                              i18nKey="settings.integrations.whatsapp.importantBody"
                              components={{ strong: <strong /> }}
                            />
                          </p>
                        </div>
                      </div>
                    </div>

                    {isLoadingWhatsappStatus ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                        <Spinner
                          size={16}
                          ariaLabel={t("settings.integrations.whatsapp.loadingStatus")}
                        />
                        <span>
                          {t("settings.integrations.whatsapp.loadingStatus")}
                        </span>
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
                                    {t("settings.integrations.whatsapp.connectedTitle")}
                                  </p>
                                  {whatsappStatus.phoneNumber && (
                                    <p className="text-xs text-gray-600">
                                      {t("settings.integrations.whatsapp.phoneNumber", {
                                        phoneNumber: whatsappStatus.phoneNumber,
                                      })}
                                    </p>
                                  )}
                                  {whatsappStatus.lastSync && (
                                    <p className="text-xs text-gray-600">
                                      {t("settings.integrations.whatsapp.lastSync", {
                                        date: formatDateTime(
                                          whatsappStatus.lastSync,
                                          currentLanguage,
                                        ),
                                      })}
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
                                    {t("settings.integrations.whatsapp.waitingTitle")}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {t("settings.integrations.whatsapp.waitingBody")}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {t("settings.integrations.whatsapp.notConnectedTitle")}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {t("settings.integrations.whatsapp.notConnectedBody")}
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
                              title={t("settings.integrations.whatsapp.reloadStatus")}
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
                                onClick={() => setWhatsappDisconnectDialogOpen(true)}
                              >
                                {t("settings.integrations.whatsapp.disconnect")}
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
                                    {t("settings.integrations.whatsapp.setup")}
                                  </>
                                ) : (
                                  t("settings.integrations.whatsapp.connect")
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {(whatsappQrCode || isWhatsappConnecting) &&
                          whatsappStatus?.connectionStatus !== "connected" && (
                            <div className="p-4 rounded-lg border border-agri-green-100 bg-white">
                              <p className="text-sm font-medium text-gray-900 mb-3">
                                {t("settings.integrations.whatsapp.scanTitle")}
                              </p>
                              {whatsappQrCode && (
                                <div className="flex justify-center">
                                  <img
                                    src={whatsappQrCode}
                                    alt={t("settings.integrations.whatsapp.qrAlt")}
                                    className="w-64 h-64 border border-gray-200 rounded-lg"
                                  />
                                </div>
                              )}
                              <p className="text-xs text-gray-600 mt-3 text-center">
                                {t("settings.integrations.whatsapp.instructions")
                                  .split("\n")
                                  .map((line) => (
                                    <React.Fragment key={line}>
                                      {line}
                                      <br />
                                    </React.Fragment>
                                  ))}
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
                                      toast.success(t("settings.toast.qrUpdated"));
                                    } catch (error: unknown) {
                                      console.error(error);
                                      toast.error(
                                        t("settings.toast.qrLoadError"),
                                      );
                                    }
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  {t("settings.integrations.whatsapp.refreshQr")}
                                </Button>
                              </div>
                            </div>
                          )}

                        {/* Allowlist numeri WhatsApp */}
                        <div className="p-4 rounded-lg border border-agri-green-100 bg-white">
                          <div className="flex items-center gap-2 mb-3">
                            <Phone className="h-4 w-4 text-gray-600" />
                            <h3 className="text-sm font-medium text-gray-900">
                              {t("settings.integrations.whatsapp.allowlistTitle")}
                            </h3>
                          </div>

                          <div className="flex items-start gap-2 mb-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800">
                              {t("settings.integrations.whatsapp.allowlistInfo")}
                            </p>
                          </div>

                          {isLoadingAllowlist ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                              <Spinner
                                size={16}
                                ariaLabel={t("settings.integrations.whatsapp.loadingAllowlist")}
                              />
                              <span>
                                {t("settings.integrations.whatsapp.loadingAllowlist")}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="flex gap-2 mb-3">
                                <Input
                                  placeholder="+393331234567"
                                  value={newAllowlistNumber}
                                  onChange={(e) => setNewAllowlistNumber(e.target.value)}
                                  onKeyDown={async (e) => {
                                    if (
                                      e.key === "Enter" &&
                                      newAllowlistNumber.trim().length > 0
                                    ) {
                                      await addAllowlistNumberAsync(
                                        newAllowlistNumber.trim(),
                                      );
                                    }
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  disabled={
                                    isAddingNumber ||
                                    newAllowlistNumber.trim().length === 0
                                  }
                                  onClick={async () => {
                                    await addAllowlistNumberAsync(
                                      newAllowlistNumber.trim(),
                                    );
                                  }}
                                >
                                  {isAddingNumber ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" />
                                      {t("common.add")}
                                    </>
                                  )}
                                </Button>
                              </div>

                              {allowedNumbers.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">
                                  {t("settings.integrations.whatsapp.emptyAllowlist")}
                                </p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {allowedNumbers.map((phone) => (
                                    <li
                                      key={phone}
                                      className="flex items-center justify-between rounded-md border border-agri-green-100 bg-agri-green-50/40 px-3 py-1.5 text-sm"
                                    >
                                      <span className="font-mono text-gray-800">
                                        {phone}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-gray-500 hover:text-red-600"
                                        disabled={isRemovingNumber}
                                        onClick={async () => {
                                          await removeAllowlistNumberAsync(phone);
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Telegram */}
              <AccordionItem value="telegram" className="rounded-lg border border-gray-200 bg-white">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Send className="h-5 w-5 text-sky-500" />
                    <span className="font-medium">
                      {t("settings.integrations.telegram.title")}
                    </span>
                    {telegramEnabled && (
                      <Badge variant="outline" className="text-sky-600 border-sky-200 ml-auto">
                        {t("common.active")}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-agri-green-100 bg-agri-green-50/60">
                      <div className="flex items-center gap-3">
                        <Label
                          htmlFor="telegram-toggle"
                          className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2"
                        >
                          <Checkbox
                            id="telegram-toggle"
                            checked={telegramEnabled}
                            onCheckedChange={(checked) =>
                              setTelegramEnabled(checked === true)
                            }
                          />
                          {t("settings.integrations.telegram.enable")}
                        </Label>
                      </div>
                    </div>
                    {telegramEnabled && (
                      <div className="p-4 rounded-lg border border-agri-green-100 bg-white">
                        <p className="text-sm font-medium text-gray-900 mb-3">
                          {t("settings.integrations.telegram.scanTitle")}
                        </p>
                        <div className="flex flex-col items-center">
                          <img
                            src="/integration/telegram_qrcode.png"
                            alt={t("settings.integrations.telegram.qrAlt")}
                            className="w-56 h-auto border border-gray-200 rounded-lg"
                          />
                          <p className="text-sm text-gray-600 mt-3 font-mono">
                            @SEMINAIBOT
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 mt-3 text-center">
                          {t("settings.integrations.telegram.description")}
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* QDC */}
              <AccordionItem value="qdc" className="rounded-lg border border-gray-200 bg-white">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <img src="/image/qdc_logo.png" alt="QDC" className="h-6 w-6 object-contain" />
                    <span className="font-medium">QDC API Key</span>
                    {qdcApiKey && (
                      <Badge variant="outline" className="text-green-600 border-green-200 ml-auto">
                        {t("common.configured")}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="qdcApiKey">QDC API Key</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="qdcApiKey"
                        type="password"
                        placeholder={
                          qdcApiKey === null
                            ? t("settings.integrations.api.insertCredentials")
                            : undefined
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
                            {t("common.cancel")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isSavingApiKeys}
                            onClick={async () => {
                              await saveApiKeysAsync({ qdcApiKey: qdcValue || null });
                            }}
                          >
                            {isSavingApiKeys
                              ? t("common.saving")
                              : t("common.save")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* iFarming */}
              <AccordionItem value="ifarming" className="rounded-lg border border-gray-200 bg-white">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <img src="/image/ifarming_logo.png" alt="iFarming" className="h-6 w-6 object-contain" />
                    <span className="font-medium">iFarming API Key</span>
                    {ifarmingApiKey && (
                      <Badge variant="outline" className="text-green-600 border-green-200 ml-auto">
                        {t("common.configured")}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ifarmingApiKey">iFarming API Key</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="ifarmingApiKey"
                        type="password"
                        placeholder={
                          ifarmingApiKey === null
                            ? t("settings.integrations.api.insertCredentials")
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
                            {t("common.cancel")}
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
                            {isSavingApiKeys
                              ? t("common.saving")
                              : t("common.save")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
        </div>
      )}

      {activeTab === "costi" && (
        <div>
            <Card className="p-4 shadow-none">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-medium">{t("settings.costs.title")}</h2>
                  <p className="text-sm text-gray-600">
                    {t("settings.costs.description")}
                  </p>
                </div>
                {isLoadingTokenCosts && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Spinner
                      size={16}
                      ariaLabel={t("settings.costs.loadingCosts")}
                    />
                    <span>{t("common.loading")}</span>
                  </div>
                )}
              </div>

              {isTokenCostsError && (
                <div className="mb-4 text-sm text-red-600">
                  {tokenCostsError?.message ?? t("settings.costs.loadError")}
                </div>
              )}

              {tokenCostSummary.length > 0 && (
                <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
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
                  placeholder={t("settings.costs.searchPlaceholder")}
                  value={filters.text}
                  className="w-full sm:w-64"
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, text: e.target.value }))
                  }
                />
                <Label className="sr-only" htmlFor="filter-date-from">
                  {t("settings.costs.dateFrom")}
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
                  {t("settings.costs.dateTo")}
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
                  <option value="">{t("settings.costs.jobType")}</option>
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
                  <option value="">{t("settings.costs.model")}</option>
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
                  <option value="">{t("settings.costs.companyMetadata")}</option>
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
                  {t("settings.costs.resetFilters")}
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
                    {t("settings.costs.table")}
                  </TabsTrigger>
                  <TabsTrigger value="chart" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {t("settings.costs.barChart")}
                  </TabsTrigger>
                  <TabsTrigger value="line" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {t("settings.costs.lineChart")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="table" className="mt-0">
                  <div className="max-h-[420px] rounded-lg border border-agri-green-100 bg-white shadow-sm overflow-auto">
                    <Table className="min-w-[1040px] [&_tr]:border-agri-green-100 [&_th]:border-agri-green-100 [&_td]:border-agri-green-50">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("settings.costs.columns.date")}</TableHead>
                          <TableHead>{t("settings.costs.columns.job")}</TableHead>
                          <TableHead>{t("settings.costs.columns.model")}</TableHead>
                          <TableHead className="text-right">
                            {t("settings.costs.columns.prompt")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("settings.costs.columns.completion")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("settings.costs.columns.totalTokens")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("settings.costs.columns.clientCost")}
                          </TableHead>
                          <TableHead>
                            {t("settings.costs.columns.companyMetadata")}
                          </TableHead>
                          <TableHead>
                            {t("settings.costs.columns.reference")}
                          </TableHead>
                          <TableHead>
                            {t("settings.costs.columns.metadata")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingTokenCosts && (
                          <TableRow>
                            <TableCell colSpan={10}>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Spinner
                                  size={16}
                                  ariaLabel={t("settings.costs.loadingCosts")}
                                />
                                <span>
                                  {t("settings.costs.loadingCostsInProgress")}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        {!isLoadingTokenCosts && !hasUsages && (
                          <TableRow>
                            <TableCell colSpan={10}>
                              <div className="text-sm text-gray-600">
                                {t("settings.costs.noCosts")}
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
                        <Spinner
                          size={20}
                          ariaLabel={t("settings.costs.loadingCosts")}
                        />
                        <span>{t("common.loading")}</span>
                      </div>
                    )}
                    {!isLoadingTokenCosts && dailyConsumptionByModel.length === 0 && (
                      <div className="flex items-center justify-center py-12 text-sm text-gray-600">
                        {t("settings.costs.noData")}
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
                            tickFormatter={(v) =>
                              formatCurrency(Number(v), currentLanguage)
                            }
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => [
                                  formatCurrency(Number(value), currentLanguage),
                                ]}
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
                    {t("settings.costs.barCaption")}
                  </p>
                </TabsContent>
                <TabsContent value="line" className="mt-0">
                  <div className="rounded-lg border border-agri-green-100 bg-white p-4 min-h-[320px]">
                    {isLoadingTokenCosts && (
                      <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                        <Spinner
                          size={20}
                          ariaLabel={t("settings.costs.loadingCosts")}
                        />
                        <span>{t("common.loading")}</span>
                      </div>
                    )}
                    {!isLoadingTokenCosts && dailyConsumptionByModel.length === 0 && (
                      <div className="flex items-center justify-center py-12 text-sm text-gray-600">
                        {t("settings.costs.noData")}
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
                            tickFormatter={(v) =>
                              formatCurrency(Number(v), currentLanguage)
                            }
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => [
                                  formatCurrency(Number(value), currentLanguage),
                                ]}
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
                    {t("settings.costs.lineCaption")}
                  </p>
                </TabsContent>
              </Tabs>
            </Card>
        </div>
      )}

      <Dialog
        open={clearCacheDialogOpen}
        onOpenChange={setClearCacheDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.cache.confirmTitle")}</DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="settings.cache.confirmDescription"
                components={{ strong: <strong /> }}
              />
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="clearCacheConfirm">
              {t("settings.cache.confirmLabel")}
            </Label>
            <Input
              id="clearCacheConfirm"
              value={clearCacheConfirmText}
              onChange={(e) => setClearCacheConfirmText(e.target.value)}
              placeholder={t("settings.cache.confirmWord")}
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
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!isClearCacheConfirmValid || isClearingCache}
              onClick={async () => {
                await clearCacheAsync();
              }}
            >
              {isClearingCache
                ? t("settings.cache.deleting")
                : t("settings.cache.deleteCache")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={whatsappDisconnectDialogOpen}
        onOpenChange={setWhatsappDisconnectDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("settings.integrations.whatsapp.dialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("settings.integrations.whatsapp.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <button
              type="button"
              className="w-full rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isDisconnecting}
              onClick={async () => {
                await disconnectWhatsappAsync(false);
              }}
            >
              <p className="text-sm font-medium text-gray-900">
                {t("settings.integrations.whatsapp.disconnectSession")}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t(
                  "settings.integrations.whatsapp.disconnectSessionDescription",
                )}
              </p>
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-red-200 p-4 text-left hover:bg-red-50 transition-colors disabled:opacity-50"
              disabled={isDisconnecting}
              onClick={async () => {
                await disconnectWhatsappAsync(true);
              }}
            >
              <p className="text-sm font-medium text-red-700">
                {t("settings.integrations.whatsapp.deleteInstance")}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t("settings.integrations.whatsapp.deleteInstanceDescription")}
              </p>
            </button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isDisconnecting}
              onClick={() => setWhatsappDisconnectDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
          </DialogFooter>
          {isDisconnecting && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("settings.integrations.whatsapp.disconnecting")}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
