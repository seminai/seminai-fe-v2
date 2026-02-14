import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { FileUp, FileText, X, Plus } from "lucide-react";
import type { Workspace } from "@/types/workspace";
import { RuleCategory, type CreateRuleRequest } from "@/types/workspace";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import {
  useWorkspaces,
  useCreateWorkspace,
  useCreateRule,
  useAssignRuleToCompany,
} from "@/hooks/useWorkspaces";
import { fetchDisciplinariBdf, type DisciplinareBdfRow } from "@/utils/disciplinariBdf";

const OTHER_VALUE = "__altro__";

type Step = "create_workspace" | "select_disciplinare";

interface AddDisciplinareWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  /** When null, wizard shows "create workspace" step first */
  initialWorkspace: Workspace | null;
  onSuccess?: () => void;
}

export function AddDisciplinareWizard({
  open,
  onOpenChange,
  companyId,
  companyName,
  initialWorkspace,
  onSuccess,
}: AddDisciplinareWizardProps): React.ReactElement {
  const { currentWorkspace, selectWorkspace } = useWorkspaceContext();
  const { data: workspaces = [] } = useWorkspaces();
  const { mutateAsync: createWorkspace, isPending: isCreatingWorkspace } =
    useCreateWorkspace();
  const { mutateAsync: createRule, isPending: isCreatingRule } = useCreateRule();
  const { mutateAsync: assignRule, isPending: isAssigning } = useAssignRuleToCompany();

  const [step, setStep] = useState<Step>("create_workspace");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [disciplinariList, setDisciplinariList] = useState<DisciplinareBdfRow[]>([]);
  const [disciplinariLoading, setDisciplinariLoading] = useState(false);
  const [selectedDisciplinare, setSelectedDisciplinare] = useState<string>("");
  const [altroName, setAltroName] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const needsWorkspaceStep = initialWorkspace === null;
  const effectiveWorkspaceId = workspaceId ?? currentWorkspace?.id ?? initialWorkspace?.id;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setWorkspaceName("");
      setWorkspaceId(null);
      setSelectedDisciplinare("");
      setAltroName("");
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (needsWorkspaceStep) {
        setStep("create_workspace");
      } else {
        setStep("select_disciplinare");
      }
    }
  }, [open, needsWorkspaceStep]);

  // Load BDF list when entering select step
  useEffect(() => {
    if (!open || step !== "select_disciplinare") return;
    setDisciplinariLoading(true);
    fetchDisciplinariBdf()
      .then(setDisciplinariList)
      .catch(() => setDisciplinariList([]))
      .finally(() => setDisciplinariLoading(false));
  }, [open, step]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = workspaceName.trim();
    if (!name || name.length < 2) {
      toast.error("Inserisci un nome per il workspace (almeno 2 caratteri)");
      return;
    }
    try {
      const { workspace } = await createWorkspace({ name });
      selectWorkspace(workspace.id);
      setWorkspaceId(workspace.id);
      setStep("select_disciplinare");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore durante la creazione del workspace"
      );
    }
  };

  const handleCreateRuleAndAssign = async () => {
    if (!effectiveWorkspaceId) {
      toast.error("Nessun workspace selezionato");
      return;
    }

    let name: string;
    let description: string | undefined;
    let region: string | undefined;
    let sourceUrl: string | undefined;

    if (selectedDisciplinare === OTHER_VALUE) {
      name = altroName.trim();
      if (!name || name.length < 2) {
        toast.error("Inserisci un nome per il disciplinare (almeno 2 caratteri)");
        return;
      }
      description = name;
    } else {
      const idx = parseInt(selectedDisciplinare, 10);
      const row = disciplinariList[idx];
      if (!row) {
        toast.error("Seleziona un disciplinare dalla lista");
        return;
      }
      name = row.name;
      description = row.name;
      region = row.region;
      sourceUrl = row.url || undefined;
    }

    const payload: CreateRuleRequest = {
      name,
      description,
      region,
      sourceUrl,
      category: RuleCategory.DISCIPLINARE,
      content: { sezioni: [], requisiti: [] },
      isPublic: false,
      isTemplate: false,
    };

    try {
      const rule = await createRule({
        workspaceId: effectiveWorkspaceId,
        payload,
        pdfFile: pdfFile ?? undefined,
      });
      await assignRule({
        ruleId: rule.id,
        payload: { companyId, priority: 0 },
      });
      toast.success("Disciplinare creato e assegnato all'azienda");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore durante la creazione della regola"
      );
    }
  };

  const canSubmitDisciplinare =
    !!effectiveWorkspaceId &&
    selectedDisciplinare !== "" &&
    (selectedDisciplinare !== OTHER_VALUE || altroName.trim().length >= 2);
  const isPending = isCreatingWorkspace || isCreatingRule || isAssigning;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === "application/pdf" && file.size <= 50 * 1024 * 1024) {
      setPdfFile(file);
    } else if (file) {
      toast.error("Seleziona un file PDF valido (max 50 MB)");
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi un disciplinare</DialogTitle>
          <DialogDescription>
            {step === "create_workspace" &&
              "Crea un workspace per associare il disciplinare all'azienda."}
            {step === "select_disciplinare" &&
              `Scegli un disciplinare da assegnare a "${companyName}" o inserisci un altro e carica il PDF.`}
          </DialogDescription>
        </DialogHeader>

        {step === "create_workspace" && (
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome workspace</label>
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="es. Disciplinari 2025"
                className="h-10"
                disabled={isCreatingWorkspace}
              />
            </div>
            <DialogFooter>
              {initialWorkspace && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("select_disciplinare")}
                  disabled={isCreatingWorkspace}
                >
                  Indietro
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreatingWorkspace}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isCreatingWorkspace}>
                {isCreatingWorkspace ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Creazione...
                  </>
                ) : (
                  "Continua"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "select_disciplinare" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Workspace</label>
                <Select
                  value={effectiveWorkspaceId ?? ""}
                  onValueChange={(id) => {
                    setWorkspaceId(id);
                    selectWorkspace(id);
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Seleziona workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="default"
                className="shrink-0 h-10 gap-1.5"
                onClick={() => setStep("create_workspace")}
              >
                <Plus className="h-4 w-4" />
                Aggiungi workspace
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Disciplinare</label>
              <Select
                disabled={disciplinariLoading}
                value={selectedDisciplinare}
                onValueChange={setSelectedDisciplinare}
              >
                <SelectTrigger className="h-10">
                  <SelectValue
                    placeholder={
                      disciplinariLoading
                        ? "Caricamento..."
                        : "Seleziona un disciplinare..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {disciplinariList.map((row, idx) => (
                    <SelectItem key={`${row.title}-${idx}`} value={String(idx)}>
                      {row.title}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_VALUE}>Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedDisciplinare === OTHER_VALUE && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome disciplinare</label>
                  <Input
                    value={altroName}
                    onChange={(e) => setAltroName(e.target.value)}
                    placeholder="es. Disciplinare personalizzato"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Documento PDF (opzionale)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragging ? "border-agri-green-500 bg-agri-green-50" : "border-gray-200"
                    }`}
                  >
                    {pdfFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-5 h-5 text-red-500 shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">{pdfFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
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
                        className="w-full border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileUp className="w-5 h-5 mr-2" />
                        Trascina un PDF qui o clicca per selezionare
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Max 50 MB. Formato PDF.</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button
                onClick={handleCreateRuleAndAssign}
                disabled={!canSubmitDisciplinare || isPending}
              >
                {isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Creazione...
                  </>
                ) : (
                  "Crea regola e assegna all'azienda"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
