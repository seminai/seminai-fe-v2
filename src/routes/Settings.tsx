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
import { Pencil, Trash2, HardDrive } from "lucide-react";

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
    const { text, jobType, model, companyId } = this.filters;
    if (jobType && row.jobType !== jobType) return false;
    if (model && row.model !== model) return false;
    if (companyId && row.metadataCompanyId !== companyId) return false;

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
};

export default function Settings() {
  const { data, isLoading, error } = useCurrentUser();
  const queryClient = useQueryClient();
  const {
    usages,
    totals,
    isLoading: isLoadingTokenCosts,
    isError: isTokenCostsError,
    error: tokenCostsError,
  } = useTokenCosts();

  const userData = data?.data.user;
  const qdcApiKey = data?.data.qdcApiKey ?? null;
  const ifarmingApiKey = data?.data.ifarmingApiKey ?? null;
  const [editable, setEditable] = React.useState<EditableUserState | null>(
    userData ? createEditableUserState(userData) : null
  );

  const [editingQdc, setEditingQdc] = React.useState(qdcApiKey === null);
  const [editingIfarming, setEditingIfarming] = React.useState(
    ifarmingApiKey === null
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
  const isIfarmingModified = editingIfarming && ifarmingValue !== ifarmingOriginalValue;

  const usageRows = React.useMemo(() => {
    return usages.map((usage) => new TokenUsageViewModel(usage));
  }, [usages]);

  const tokenCostSummary = React.useMemo(
    () =>
      totals
        ? [
            {
              label: "Costo totale (cliente)",
              value: formatCurrency(totals.totalCostClient),
            },
            {
              label: "Token prompt",
              value: formatInteger(totals.totalPromptTokens),
            },
            {
              label: "Token completion",
              value: formatInteger(totals.totalCompletionTokens),
            },
            {
              label: "Token totali",
              value: formatInteger(totals.totalTokens),
            },
          ]
        : [],
    [totals]
  );

  const [filters, setFilters] =
    React.useState<TokenUsageFilters>(DEFAULT_FILTERS);

  const filterOptions = React.useMemo(() => {
    const jobTypes = Array.from(new Set(usageRows.map((row) => row.jobType)));
    const models = Array.from(new Set(usageRows.map((row) => row.model)));
    const companies = Array.from(
      new Set(
        usageRows.map((row) => row.metadataCompanyId).filter((id) => id !== "—")
      )
    );
    return { jobTypes, models, companies };
  }, [usageRows]);

  const filteredUsageRows = React.useMemo(() => {
    const engine = new TokenUsageFilterEngine(filters);
    return engine.apply(usageRows);
  }, [filters, usageRows]);

  const hasUsages = usageRows.length > 0;

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
          e instanceof Error ? e.message : "Errore durante l'eliminazione della cache";
        toast.error(message);
      },
    });

  const isClearCacheConfirmValid =
    clearCacheConfirmText.trim().toLowerCase() === "elimina";

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
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-agri-green-50 text-agri-green-700 rounded-full text-sm font-medium">
            <span className="text-lg">💰</span>
            <span>{user.credits} crediti disponibili</span>
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
                      : prev
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
                      : prev
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
                      : prev
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
                      : prev
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
                      : prev
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
                      : prev
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
                      : prev
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
                    qdcApiKey === null
                      ? "Inserisci credenziali"
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
                        if (ifarmingApiKey === null && ifarmingOriginalValue === "") {
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

      <Dialog open={clearCacheDialogOpen} onOpenChange={setClearCacheDialogOpen}>
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
                <div className="text-base font-semibold text-agri-green-900">
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
                      <Spinner size={16} ariaLabel="Caricamento costi token" />
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
      </Card>
    </div>
  );
}
