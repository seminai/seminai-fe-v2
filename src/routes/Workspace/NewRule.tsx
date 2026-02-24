import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Eye, FileUp, X, FileText } from "lucide-react";
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
import { useCreateRule } from "@/hooks/useWorkspaces";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { RuleCategory, type CreateRuleRequest } from "@/types/workspace";
import { PdfPreviewSheet } from "@/components/PdfPreviewSheet";
import { fetchDisciplinariBdf, type DisciplinareBdfRow } from "@/utils/disciplinariBdf";

const formSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: z.nativeEnum(RuleCategory),
  content: z.record(z.unknown()),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceDocument: z.string().optional(),
  region: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  version: z.string().optional(),
  isPublic: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const categoryLabels: Record<RuleCategory, string> = {
  [RuleCategory.DISCIPLINARE]: "Disciplinare",
  [RuleCategory.STANDARD]: "Standard",
  [RuleCategory.BEST_PRACTICE]: "Buona Pratica",
  [RuleCategory.METHODOLOGY]: "Metodologia",
  [RuleCategory.CUSTOM]: "Personalizzata",
};

export default function NewRule() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceContext();
  const { mutateAsync: createRule, isPending: isCreating } = useCreateRule();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [disciplinariList, setDisciplinariList] = useState<DisciplinareBdfRow[]>([]);
  const [disciplinariLoading, setDisciplinariLoading] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const pdfBlobUrl = useMemo(() => {
    if (!pdfFile) return null;
    return URL.createObjectURL(pdfFile);
  }, [pdfFile]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: RuleCategory.CUSTOM,
      content: { sezioni: [], requisiti: [] },
      isPublic: false,
      isTemplate: false,
    },
  });

  const category = form.watch("category");

  useEffect(() => {
    if (category !== RuleCategory.DISCIPLINARE) return;
    setDisciplinariLoading(true);
    fetchDisciplinariBdf()
      .then(setDisciplinariList)
      .catch(() => setDisciplinariList([]))
      .finally(() => setDisciplinariLoading(false));
  }, [category]);

  const onSubmit = async (values: FormValues) => {
    if (!currentWorkspace) {
      toast.error("Nessun workspace selezionato");
      return;
    }

    try {
      const payload: CreateRuleRequest = {
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
        isPublic: values.isPublic ?? false,
        isTemplate: values.isTemplate ?? false,
      };

      await createRule({
        workspaceId: currentWorkspace.id,
        payload,
        pdfFile: pdfFile ?? undefined,
      });

      toast.success("Regola creata con successo!");
      navigate("/workspace/settings/rules");
    } catch (error) {
      console.error("Create rule error:", error);
      toast.error("Errore durante la creazione della regola");
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Nessun workspace selezionato</h2>
          <p className="text-muted-foreground mb-4">Seleziona un workspace per creare una regola.</p>
          <Button onClick={() => navigate("/dashboard")}>Torna alla Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <div className="max-w-3xl mx-auto py-8 px-6">
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
                <Link to="/workspace/settings/rules">
                  Regole
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Crea nuova regola</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/workspace/settings?tab=rules")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Crea nuova regola</h1>
            <p className="text-sm text-muted-foreground">
              Crea una nuova regola per il workspace. Le regole possono essere assegnate alle aziende.
            </p>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Nome <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input className="h-12 text-base" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Categoria <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {category === RuleCategory.DISCIPLINARE && (
                <div className="space-y-2">
                  <label className="text-base font-medium">Compila da disciplinare</label>
                  <Select
                    disabled={disciplinariLoading}
                    onValueChange={(value) => {
                      const idx = parseInt(value, 10);
                      const row = disciplinariList[idx];
                      if (row) {
                        form.setValue("name", row.name);
                        form.setValue("description", row.name);
                        form.setValue("region", row.region);
                        form.setValue("sourceUrl", row.url || "");
                      }
                    }}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder={disciplinariLoading ? "Caricamento..." : "Seleziona un disciplinare..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplinariList.map((row, idx) => (
                        <SelectItem key={`${row.title}-${idx}`} value={String(idx)}>
                          {row.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Compila nome, descrizione e regione con i dati del disciplinare selezionato (senza anno).</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Descrizione</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px] text-base resize-none" {...field} value={field.value ?? ""} />
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
                    <FormLabel className="text-base font-medium">Slug (URL)</FormLabel>
                    <FormControl>
                      <Input className="h-12 text-base font-mono" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Identificatore unico per la regola (opzionale)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Regione</FormLabel>
                    <FormControl>
                      <Input className="h-12 text-base" {...field} value={field.value ?? ""} />
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
                      <FormLabel className="text-base font-medium">Valido da</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-12 text-base" {...field} value={field.value ?? ""} />
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
                      <FormLabel className="text-base font-medium">Valido fino</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-12 text-base" {...field} value={field.value ?? ""} />
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
                    <FormLabel className="text-base font-medium">Versione</FormLabel>
                    <FormControl>
                      <Input className="h-12 text-base" {...field} value={field.value ?? ""} placeholder="es. 2024.1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">URL Fonte</FormLabel>
                    <FormControl>
                      <Input className="h-12 text-base" type="url" {...field} value={field.value ?? ""} placeholder="https://..." />
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
                    <FormLabel className="text-base font-medium">Documento Fonte</FormLabel>
                    <FormControl>
                      <Input className="h-12 text-base" {...field} value={field.value ?? ""} placeholder="es. Disciplinare_ER_2024.pdf" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* PDF Upload */}
              <div className="space-y-2">
                <label className="text-base font-medium">Documento PDF</label>
                <p className="text-sm text-muted-foreground">
                  Carica un file PDF associato alla regola (max 50 MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 50 * 1024 * 1024) {
                        toast.error("Il file supera il limite di 50 MB");
                        return;
                      }
                      if (file.type !== "application/pdf") {
                        toast.error("Seleziona un file PDF valido");
                        return;
                      }
                      setPdfFile(file);
                    }
                  }}
                />
                {pdfFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-neutral-50">
                    <FileText className="w-5 h-5 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pdfFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setPdfPreviewOpen(true)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Anteprima
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        setPdfFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-20 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="w-5 h-5 mr-2" />
                    Seleziona PDF
                  </Button>
                )}

                {pdfBlobUrl && (
                  <PdfPreviewSheet
                    open={pdfPreviewOpen}
                    onOpenChange={setPdfPreviewOpen}
                    pdfUrl={pdfBlobUrl}
                    fileName={pdfFile?.name}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium">Regola pubblica</FormLabel>
                      <FormDescription>Visibile anche agli utenti non membri del workspace</FormDescription>
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
                      <FormLabel className="text-base font-medium">Template</FormLabel>
                      <FormDescription>Usa questa regola come template per crearne altre</FormDescription>
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

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate("/workspace/settings?tab=rules")}
                disabled={isCreating}
              >
                Annulla
              </Button>
              <Button type="submit" size="lg" disabled={isCreating}>
                {isCreating ? "Creazione..." : "Crea Regola"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
