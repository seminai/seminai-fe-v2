import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useRule, useUpdateRule } from "@/hooks/useWorkspaces";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import {
  RuleCategory,
  RuleStatus,
  type UpdateRuleRequest,
} from "@/types/workspace";
import { Spinner } from "@/components/ui/spinner";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Il nome deve contenere almeno 2 caratteri")
    .optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: z.nativeEnum(RuleCategory).optional(),
  content: z.record(z.unknown()).optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceDocument: z.string().optional(),
  region: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  version: z.string().optional(),
  isPublic: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
  status: z.nativeEnum(RuleStatus).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const categoryLabels: Record<RuleCategory, string> = {
  [RuleCategory.DISCIPLINARE]: "Disciplinare",
  [RuleCategory.STANDARD]: "Standard",
  [RuleCategory.BEST_PRACTICE]: "Buona Pratica",
  [RuleCategory.METHODOLOGY]: "Metodologia",
  [RuleCategory.CUSTOM]: "Personalizzata",
};

const statusLabels: Record<RuleStatus, string> = {
  [RuleStatus.DRAFT]: "Bozza",
  [RuleStatus.ACTIVE]: "Attiva",
  [RuleStatus.ARCHIVED]: "Archiviata",
  [RuleStatus.DEPRECATED]: "Deprecata",
};

export default function EditRule() {
  const navigate = useNavigate();
  const { ruleId } = useParams<{ ruleId: string }>();
  const { currentWorkspace } = useWorkspaceContext();
  const { data: rule, isLoading: isLoadingRule } = useRule(ruleId);
  const { mutateAsync: updateRule, isPending: isUpdating } = useUpdateRule();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: RuleCategory.CUSTOM,
      content: { sezioni: [], requisiti: [] },
      isPublic: false,
      isTemplate: false,
      status: RuleStatus.DRAFT,
    },
  });

  // Carica i dati della regola nel form quando sono disponibili
  useEffect(() => {
    if (rule) {
      form.reset({
        name: rule.name,
        slug: rule.slug,
        description: rule.description ?? undefined,
        category: rule.category,
        content: rule.content,
        sourceUrl: rule.sourceUrl ?? undefined,
        sourceDocument: rule.sourceDocument ?? undefined,
        region: rule.region ?? undefined,
        validFrom: rule.validFrom ?? undefined,
        validUntil: rule.validUntil ?? undefined,
        version: rule.version ?? undefined,
        isPublic: rule.isPublic,
        isTemplate: rule.isTemplate,
        status: rule.status,
      });
    }
  }, [rule, form]);

  const onSubmit = async (values: FormValues) => {
    if (!ruleId) return;

    try {
      const payload: UpdateRuleRequest = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || undefined,
        category: values.category,
        content: values.content,
        sourceUrl: values.sourceUrl || undefined,
        sourceDocument: values.sourceDocument || undefined,
        region: values.region || undefined,
        validFrom: values.validFrom || undefined,
        validUntil: values.validUntil || undefined,
        version: values.version || undefined,
        isPublic: values.isPublic,
        isTemplate: values.isTemplate,
        status: values.status,
      };

      await updateRule({
        ruleId,
        payload,
      });

      toast.success("Regola aggiornata con successo!");
      navigate("/workspace/settings/rules");
    } catch (error) {
      console.error("Update rule error:", error);
      toast.error("Errore durante l'aggiornamento della regola");
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            Nessun workspace selezionato
          </h2>
          <p className="text-muted-foreground mb-4">
            Seleziona un workspace per modificare una regola.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingRule) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento regola...</p>
        </div>
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Regola non trovata</h2>
          <p className="text-muted-foreground mb-4">
            La regola richiesta non esiste o non hai i permessi per
            visualizzarla.
          </p>
          <Button onClick={() => navigate("/workspace/settings?tab=rules")}>
            Torna alle Regole
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/workspace/settings">Impostazioni Workspace</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/workspace/settings/rules">Regole</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Modifica: {rule.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/workspace/settings?tab=rules")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Modifica regola</h1>
            <p className="text-sm text-muted-foreground">
              Modifica tutti i dettagli della regola "{rule.name}".
            </p>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informazioni base */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold mb-4">Informazioni base</h2>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Nome <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Categoria
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(RuleCategory).map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {categoryLabels[cat]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Stato
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(RuleStatus).map((status) => (
                            <SelectItem key={status} value={status}>
                              {statusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Descrizione
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px] text-base resize-none"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Slug (URL)
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base font-mono"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Identificatore unico per la regola (opzionale)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Informazioni geografiche e temporali */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold mb-4">
                Informazioni geografiche e temporali
              </h2>

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Regione
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Valido da
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-12 text-base"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Valido fino
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-12 text-base"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Versione
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base"
                        {...field}
                        value={field.value ?? ""}
                        placeholder="es. 2024.1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Informazioni sulla fonte */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold mb-4">
                Informazioni sulla fonte
              </h2>

              <FormField
                control={form.control}
                name="sourceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      URL Fonte
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base"
                        type="url"
                        {...field}
                        value={field.value ?? ""}
                        placeholder="https://..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceDocument"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Documento Fonte
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 text-base"
                        {...field}
                        value={field.value ?? ""}
                        placeholder="es. Disciplinare_ER_2024.pdf"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Opzioni */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold mb-4">Opzioni</h2>

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium">
                        Regola pubblica
                      </FormLabel>
                      <FormDescription>
                        Visibile anche agli utenti non membri del workspace
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value ?? false}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isTemplate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium">
                        Template
                      </FormLabel>
                      <FormDescription>
                        Usa questa regola come template per crearne altre
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value ?? false}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Azioni */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate("/workspace/settings?tab=rules")}
                disabled={isUpdating}
              >
                Annulla
              </Button>
              <Button type="submit" size="lg" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Salvataggio...
                  </>
                ) : (
                  "Salva"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
