import * as React from "react";
import { useState, useEffect } from "react";
import { type Company, type BulkCompanyUpdateInput } from "@/api/companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
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
import { MapPin, Pencil, Check, X, FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CompanyFilesPanel } from "./CompanyFilesPanel";
import { CompanyMachinesPanel } from "./CompanyMachinesPanel";
import { CompanyWarehousesPanel } from "./CompanyWarehousesPanel";
import { toast } from "sonner";
import { useFiles } from "@/hooks/useFiles";
import { filesApiService } from "@/api/files";
import { CompanyUsersPanel } from "./CompanyUsersPanel";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import {
  useWorkspaces,
  useCompanyRules,
  useCreateWorkspace,
  useRule,
  useUpdateRule,
} from "@/hooks/useWorkspaces";
import { AddDisciplinareWizard } from "./AddDisciplinareWizard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DrawerCompanyContentProps {
  company: Company;
  onUpdate?: (update: BulkCompanyUpdateInput) => void;
  isUpdating?: boolean;
  onUpdateSuccess?: () => void;
  onTabChange?: (
    tab: "details" | "users" | "warehouses" | "files" | "machines",
  ) => void;
  activeTab?: "details" | "users" | "warehouses" | "files" | "machines";
}

/**
 * DrawerCompanyContent - Componente funzionale per visualizzare i dettagli completi di un'azienda
 * Organizza le informazioni in sezioni logiche con possibilità di modifica
 */
export function DrawerCompanyContent({
  company,
  onUpdate,
  isUpdating = false,
  onUpdateSuccess,
  onTabChange,
  activeTab: externalActiveTab = "details",
}: DrawerCompanyContentProps): React.ReactElement {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const activeTab = externalActiveTab;
  const [editedData, setEditedData] = useState<Partial<Company>>({
    name: company.name,
    vatNumber: company.vatNumber,
    fiscalCode: company.fiscalCode,
    cuaa: company.cuaa || "",
    nation: company.nation || "",
    city: company.city || "",
    address: company.address || "",
    cap: company.cap || "",
    email: company.email || "",
    phoneNumber: company.phoneNumber || "",
    website: company.website || "",
    logoUrl: company.logoUrl || "",
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);
  const [openAddDisciplinare, setOpenAddDisciplinare] = useState(false);
  const [openCreateWorkspace, setOpenCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [ruleIdForDrawer, setRuleIdForDrawer] = useState<string | null>(null);
  const [editRuleName, setEditRuleName] = useState("");
  const [editRuleDescription, setEditRuleDescription] = useState("");

  const { currentWorkspace, selectWorkspace } = useWorkspaceContext();
  const { data: workspaces = [] } = useWorkspaces();
  const { mutateAsync: createWorkspace, isPending: isCreatingWorkspace } =
    useCreateWorkspace();
  const { data: companyRules = [], isLoading: isLoadingCompanyRules } =
    useCompanyRules(company.id);
  const { data: ruleForDrawer, isLoading: isLoadingRuleForDrawer } = useRule(
    ruleIdForDrawer ?? undefined
  );
  const { mutateAsync: updateRuleMutation, isPending: isUpdatingRule } =
    useUpdateRule();

  const {
    files: companyFiles,
    isLoading: isLoadingFiles,
    isError: isFilesError,
    error: filesError,
    refetch: refetchCompanyFiles,
    uploadFile: uploadCompanyFile,
    isUploading: isUploadingFile,
    updateFileLocally: updateCompanyFileLocally,
  } = useFiles(company.id);

  // Aggiorna i dati quando la company cambia (dopo un update)
  useEffect(() => {
    if (!isEditing) {
      setEditedData({
        name: company.name,
        vatNumber: company.vatNumber,
        fiscalCode: company.fiscalCode,
        cuaa: company.cuaa || "",
        nation: company.nation || "",
        city: company.city || "",
        address: company.address || "",
        cap: company.cap || "",
        email: company.email || "",
        phoneNumber: company.phoneNumber || "",
        website: company.website || "",
        logoUrl: company.logoUrl || "",
      });
    }
  }, [company, isEditing]);

  // Quando l'update è completato, aggiorna i dati
  useEffect(() => {
    if (!isUpdating && !isEditing) {
      // I dati sono già stati aggiornati dal useEffect precedente
      // ma possiamo chiamare il callback se necessario
      onUpdateSuccess?.();
    }
  }, [isUpdating, isEditing, onUpdateSuccess]);

  // Sincronizza i campi di modifica regola quando si apre il drawer con i dati della regola
  useEffect(() => {
    if (ruleForDrawer) {
      setEditRuleName(ruleForDrawer.name);
      setEditRuleDescription(ruleForDrawer.description ?? "");
    }
  }, [ruleForDrawer]);

  // Notifica il tab iniziale al componente padre per il breadcrumb
  useEffect(() => {
    onTabChange?.(activeTab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = (): void => {
    if (!onUpdate) return;

    const updateData: BulkCompanyUpdateInput = {
      id: company.id,
    };

    // Aggiungi solo i campi modificati
    if (editedData.name !== company.name) updateData.name = editedData.name;
    if (editedData.vatNumber !== company.vatNumber)
      updateData.vatNumber = editedData.vatNumber;
    if (editedData.fiscalCode !== company.fiscalCode)
      updateData.fiscalCode = editedData.fiscalCode;
    if (editedData.cuaa !== (company.cuaa || ""))
      updateData.cuaa = editedData.cuaa || null;
    if (editedData.nation !== (company.nation || ""))
      updateData.nation = editedData.nation || null;
    if (editedData.city !== (company.city || ""))
      updateData.city = editedData.city || null;
    if (editedData.address !== (company.address || ""))
      updateData.address = editedData.address || null;
    if (editedData.cap !== (company.cap || ""))
      updateData.cap = editedData.cap || null;
    if (editedData.email !== (company.email || ""))
      updateData.email = editedData.email || null;
    if (editedData.phoneNumber !== (company.phoneNumber || ""))
      updateData.phoneNumber = editedData.phoneNumber || null;
    if (editedData.website !== (company.website || ""))
      updateData.website = editedData.website || null;
    if (editedData.logoUrl !== (company.logoUrl || ""))
      updateData.logoUrl = editedData.logoUrl || null;

    onUpdate(updateData);
    setIsEditing(false);
  };

  const handleCancel = (): void => {
    setEditedData({
      name: company.name,
      vatNumber: company.vatNumber,
      fiscalCode: company.fiscalCode,
      cuaa: company.cuaa || "",
      nation: company.nation || "",
      city: company.city || "",
      address: company.address || "",
      cap: company.cap || "",
      email: company.email || "",
      phoneNumber: company.phoneNumber || "",
      website: company.website || "",
      logoUrl: company.logoUrl || "",
    });
    setIsEditing(false);
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = "";
    }
  };

  const handleLogoFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Verifica che il file sia un'immagine
    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un file immagine (PNG, JPG, etc.)");
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = "";
      }
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Usa direttamente filesApiService per ottenere la risposta completa con l'URL
      const response = await filesApiService.uploadFile({
        file,
        companyId: company.id,
        path: "logos",
        type: "logo",
      });

      // Estrai l'URL dal file caricato
      const uploadedFileUrl = response.data.file.url;
      setEditedData({ ...editedData, logoUrl: uploadedFileUrl });
      toast.success("Logo caricato con successo");

      // Aggiorna anche la lista dei file
      await refetchCompanyFiles();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore nel caricamento del logo";
      toast.error(message);
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = "";
      }
    }
  };

  const renderGeneralInfo = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-black">
            Informazioni Generali
          </h3>
          {!isEditing && onUpdate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0 rounded-lg bg-agri-green-50 hover:bg-agri-green-100 text-black transition-all flex-shrink-0"
              aria-label="Modifica"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {isEditing && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isUpdating}
                className="h-8 px-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition-all text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Annulla
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isUpdating}
                className="h-8 px-3 rounded-lg bg-agri-green-500 hover:bg-agri-green-600 text-white transition-all text-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {isUpdating ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Nome Azienda
            </p>
            {isEditing ? (
              <Input
                value={editedData.name || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, name: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Nome Azienda"
              />
            ) : (
              <p className="text-sm text-gray-900">{company.name}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Logo</p>
            {isEditing ? (
              <div className="space-y-2">
                {(editedData.logoUrl || company.logoUrl) && (
                  <div className="flex items-center gap-3">
                    <img
                      src={editedData.logoUrl || company.logoUrl || ""}
                      alt={`Logo ${company.name}`}
                      className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-white p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {editedData.logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditedData({ ...editedData, logoUrl: "" });
                        }}
                        className="h-8 px-3 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Rimuovi
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={handleLogoFileSelect}
                    disabled={isUploadingLogo || isUpdating}
                    className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {isUploadingLogo && (
                    <Spinner size={20} ariaLabel="Caricamento logo" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Seleziona un file immagine (PNG, JPG) per caricare il logo
                  aziendale
                </p>
              </div>
            ) : (
              company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={`Logo ${company.name}`}
                  className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-white p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFiscalInfo = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-black">Dati Fiscali</h3>
          {!isEditing && onUpdate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0 rounded-lg bg-agri-green-50 hover:bg-agri-green-100 text-black transition-all flex-shrink-0"
              aria-label="Modifica"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Partita IVA
            </p>
            {isEditing ? (
              <Input
                value={editedData.vatNumber || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, vatNumber: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Partita IVA"
              />
            ) : (
              <p className="text-sm text-gray-900">{company.vatNumber}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Codice Fiscale
            </p>
            {isEditing ? (
              <Input
                value={editedData.fiscalCode || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, fiscalCode: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Codice Fiscale"
              />
            ) : (
              <p className="text-sm text-gray-900">{company.fiscalCode}</p>
            )}
          </div>
          {isEditing && (
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">CUAA</p>
                <Input
                  value={editedData.cuaa || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, cuaa: e.target.value })
                  }
                  className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                  placeholder="CUAA"
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderAddressInfo = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-black">Indirizzo</h3>
          {!isEditing && onUpdate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0 rounded-lg bg-agri-green-50 hover:bg-agri-green-100 text-black transition-all flex-shrink-0"
              aria-label="Modifica"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Indirizzo
            </p>
            {isEditing ? (
              <Input
                value={editedData.address || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, address: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Indirizzo"
              />
            ) : (
              <p className="text-sm text-gray-900">{company.address || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Città</p>
            {isEditing ? (
              <Input
                value={editedData.city || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, city: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Città"
              />
            ) : (
              <p className="text-sm text-gray-900">{company.city || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">CAP</p>
            {isEditing ? (
              <Input
                value={editedData.cap || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, cap: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="CAP"
              />
            ) : (
              <p className="text-sm text-gray-900">{company.cap || "-"}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Nazione</p>
            {isEditing ? (
              <Input
                value={editedData.nation || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, nation: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Nazione"
              />
            ) : (
              <p className="text-sm text-gray-900">{company.nation || "-"}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContactInfo = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-black">Contatti</h3>
          {!isEditing && onUpdate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0 rounded-lg bg-agri-green-50 hover:bg-agri-green-100 text-black transition-all flex-shrink-0"
              aria-label="Modifica"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Email</p>
            {isEditing ? (
              <Input
                type="email"
                value={editedData.email || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, email: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Email"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {company.email ? (
                  <a
                    href={`mailto:${company.email}`}
                    className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    {company.email}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Telefono</p>
            {isEditing ? (
              <Input
                type="tel"
                value={editedData.phoneNumber || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, phoneNumber: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Telefono"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {company.phoneNumber ? (
                  <a
                    href={`tel:${company.phoneNumber}`}
                    className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    {company.phoneNumber}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Sito Web</p>
            {isEditing ? (
              <Input
                type="url"
                value={editedData.website || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, website: e.target.value })
                }
                className="bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-300/50 rounded-lg h-10"
                placeholder="Sito Web"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    {company.website}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleCreateWorkspaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name || name.length < 2) {
      toast.error("Inserisci un nome per il workspace (almeno 2 caratteri)");
      return;
    }
    createWorkspace({ name })
      .then(({ workspace }) => {
        selectWorkspace(workspace.id);
        setOpenCreateWorkspace(false);
        setNewWorkspaceName("");
        toast.success("Workspace creato");
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Errore durante la creazione del workspace"
        );
      });
  };

  const renderRegoleAssegnate = (): React.ReactNode => {
    return (
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-medium text-black mb-3">Regole assegnate</h3>
        <p className="text-xs text-gray-500 mb-3">
          Regole e disciplinari associati a questa azienda. Aggiungi un disciplinare
          per creare un workspace e una regola da assegnare.
        </p>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-white border-agri-green-200 hover:bg-agri-green-50 text-black rounded-lg transition-all mb-4"
          onClick={() => setOpenAddDisciplinare(true)}
        >
          <Plus className="h-4 w-4" />
          Aggiungi un disciplinare
        </Button>
        {isLoadingCompanyRules ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner size={18} ariaLabel="Caricamento regole" />
            <span>Caricamento regole…</span>
          </div>
        ) : companyRules.length === 0 ? (
          <p className="text-sm text-gray-500">Nessuna regola assegnata.</p>
        ) : (
          <ul className="space-y-2">
            {companyRules.map(({ rule }) => (
              <li key={rule.id}>
                <button
                  type="button"
                  onClick={() => setRuleIdForDrawer(rule.id)}
                  className="w-full flex items-center gap-2 text-sm text-gray-900 py-1.5 px-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-agri-green-50 hover:border-agri-green-200 transition-colors text-left cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                  <span>{rule.name}</span>
                  {rule.region && (
                    <span className="text-xs text-gray-500 ml-auto">
                      {rule.region}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderActions = (): React.ReactNode => {
    return (
      <div className="pt-4">
        <h3 className="text-sm font-medium text-black mb-3">Azioni</h3>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-white border-agri-green-200 hover:bg-agri-green-50 text-black rounded-lg transition-all"
            onClick={() => navigate("/fields")}
          >
            <MapPin className="h-4 w-4" />
            Visualizza Campi
          </Button>
        </div>
      </div>
    );
  };

  const handleSaveRule = async () => {
    if (!ruleIdForDrawer) return;
    try {
      await updateRuleMutation({
        ruleId: ruleIdForDrawer,
        payload: {
          name: editRuleName.trim() || undefined,
          description: editRuleDescription.trim() || undefined,
        },
      });
      toast.success("Regola aggiornata");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore durante l'aggiornamento"
      );
    }
  };

  return (
    <div className="space-y-6">
      <AddDisciplinareWizard
        open={openAddDisciplinare}
        onOpenChange={setOpenAddDisciplinare}
        companyId={company.id}
        companyName={company.name}
        initialWorkspace={currentWorkspace}
      />
      <Sheet
        open={!!ruleIdForDrawer}
        onOpenChange={(open) => !open && setRuleIdForDrawer(null)}
      >
        <SheetContent
          side="right"
          className="sm:max-w-md flex flex-col"
        >
          <SheetHeader className="flex-shrink-0 border-b border-gray-100 pb-4">
            <SheetTitle className="text-lg">
              {ruleForDrawer?.name ?? "Dettaglio regola"}
            </SheetTitle>
            <SheetDescription>
              Visualizza e modifica nome e descrizione della regola assegnata.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-auto py-4 space-y-4">
            {isLoadingRuleForDrawer ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size={20} ariaLabel="Caricamento regola" />
                <span>Caricamento…</span>
              </div>
            ) : ruleForDrawer ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Nome</Label>
                  <Input
                    id="rule-name"
                    value={editRuleName}
                    onChange={(e) => setEditRuleName(e.target.value)}
                    className="bg-white border-gray-200"
                    placeholder="Nome regola"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-description">Descrizione</Label>
                  <Textarea
                    id="rule-description"
                    value={editRuleDescription}
                    onChange={(e) => setEditRuleDescription(e.target.value)}
                    className="min-h-[120px] bg-white border-gray-200 resize-y"
                    placeholder="Descrizione della regola (opzionale)"
                  />
                </div>
                {ruleForDrawer.region && (
                  <p className="text-xs text-gray-500">
                    Regione: {ruleForDrawer.region}
                  </p>
                )}
                <Button
                  onClick={handleSaveRule}
                  disabled={
                    isUpdatingRule ||
                    (editRuleName === ruleForDrawer.name &&
                      (editRuleDescription || "") ===
                        (ruleForDrawer.description ?? "")
                    )
                  }
                  className="w-full"
                >
                  {isUpdatingRule ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Salvataggio…
                    </>
                  ) : (
                    "Salva modifiche"
                  )}
                </Button>
              </>
            ) : ruleIdForDrawer && !isLoadingRuleForDrawer ? (
              <p className="text-sm text-gray-500">
                Impossibile caricare la regola.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
      <TabsContent value="details" className="mt-0">
        <div className="space-y-6">
          {renderGeneralInfo()}
          {renderFiscalInfo()}
          {renderAddressInfo()}
          {renderContactInfo()}
          {currentWorkspace ? (
            renderRegoleAssegnate()
          ) : (
            <div className="border-b border-gray-100 pb-6">
              <h3 className="text-sm font-medium text-black mb-2">Regole e disciplinari</h3>
              <p className="text-xs text-gray-500 mb-3">
                Scegli un workspace per visualizzare le regole assegnate a questa azienda,
                selezionarne una o crearne una nuova.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Workspace</label>
                  <Select
                    value=""
                    onValueChange={(id) => selectWorkspace(id)}
                  >
                    <SelectTrigger className="h-10 bg-white border-gray-200">
                      <SelectValue placeholder="Seleziona un workspace..." />
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
                  className="shrink-0 h-10 gap-1.5 border-agri-green-200 hover:bg-agri-green-50 text-black"
                  onClick={() => setOpenCreateWorkspace(true)}
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi workspace
                </Button>
              </div>
              {workspaces.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Nessun workspace disponibile. Creane uno per gestire i disciplinari.
                </p>
              )}
            </div>
          )}

          <Dialog open={openCreateWorkspace} onOpenChange={setOpenCreateWorkspace}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Nuovo workspace</DialogTitle>
                <DialogDescription>
                  Inserisci un nome per il workspace. Potrai poi aggiungere regole e
                  disciplinari e assegnarli a questa azienda.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateWorkspaceSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome workspace</label>
                  <Input
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="es. Disciplinari 2025"
                    className="h-10"
                    disabled={isCreatingWorkspace}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenCreateWorkspace(false);
                      setNewWorkspaceName("");
                    }}
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
                      "Crea"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          {renderActions()}
        </div>
      </TabsContent>
      <TabsContent value="users" className="mt-3 md:mt-4">
        <CompanyUsersPanel companyId={company.id} companyName={company.name} />
      </TabsContent>

      <TabsContent value="warehouses" className="mt-3 md:mt-4">
        <CompanyWarehousesPanel
          companyId={company.id}
          companyName={company.name}
        />
      </TabsContent>
      <TabsContent value="files" className="mt-3 md:mt-4">
        <CompanyFilesPanel
          companyId={company.id}
          companyName={company.name}
          files={companyFiles}
          isLoading={isLoadingFiles}
          isError={isFilesError}
          error={filesError}
          onRetry={refetchCompanyFiles}
          onUpload={uploadCompanyFile}
          isUploading={isUploadingFile}
          onUpdateFileLocally={updateCompanyFileLocally}
        />
      </TabsContent>

      <TabsContent value="machines" className="mt-3 md:mt-4">
        <CompanyMachinesPanel
          companyId={company.id}
          companyName={company.name}
        />
      </TabsContent>
    </div>
  );
}
