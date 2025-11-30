import * as React from "react";
import { useState, useEffect } from "react";
import { type Company, type BulkCompanyUpdateInput } from "@/api/companies";
import {
  type Warehouse,
  type CreateWarehouseRequest,
  type UpdateWarehouseRequest,
} from "@/api/warehouses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { useCompanyWarehouses } from "@/hooks/useCompanyWarehouses";
import { useFiles } from "@/hooks/useFiles";
import { filesApiService } from "@/api/files";
import {
  type UserOnCompany,
  type UserOnCompanyRole,
} from "@/api/userOnCompany";
import {
  MapPin,
  Pencil,
  Check,
  X,
  Users,
  UserPlus,
  ShieldCheck,
  Trash2,
  RefreshCcw,
  Warehouse as WarehouseIcon,
  PlusCircle,
  Save,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CompanyFilesPanel } from "./CompanyFilesPanel";
import { toast } from "sonner";

interface DrawerCompanyContentProps {
  company: Company;
  onUpdate?: (update: BulkCompanyUpdateInput) => void;
  isUpdating?: boolean;
  onUpdateSuccess?: () => void;
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
}: DrawerCompanyContentProps): React.ReactElement {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "details" | "users" | "warehouses" | "files"
  >("details");
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

  const {
    users: companyUsers,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
    refetch: refetchCompanyUsers,
    addUser: addCompanyUser,
    isAdding: isAddingCompanyUser,
    removeUser: removeCompanyUser,
    isRemoving: isRemovingCompanyUser,
    updateRole: updateCompanyUserRole,
    isUpdatingRole: isUpdatingCompanyUserRole,
  } = useCompanyUsers(company.id);

  const {
    warehouses: companyWarehouses,
    isLoading: isLoadingWarehouses,
    isError: isWarehousesError,
    error: warehousesError,
    refetch: refetchCompanyWarehouses,
    createWarehouse,
    isCreating: isCreatingWarehouse,
    updateWarehouse,
    isUpdating: isUpdatingWarehouse,
    deleteWarehouse,
    isDeleting: isDeletingWarehouse,
  } = useCompanyWarehouses(company.id);

  const {
    files: companyFiles,
    isLoading: isLoadingFiles,
    isError: isFilesError,
    error: filesError,
    refetch: refetchCompanyFiles,
    uploadFile: uploadCompanyFile,
    isUploading: isUploadingFile,
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
    event: React.ChangeEvent<HTMLInputElement>
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
      <div className="bg-gradient-to-br from-agri-green-50/50 to-harvest-100/30 rounded-2xl p-5 border border-agri-green-100/50 shadow-sm">
        <h3 className="text-sm font-semibold text-agri-green-700 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-agri-green-500"></div>
          Informazioni Generali
        </h3>
        <div className="grid grid-cols-1 gap-5">
          <div>
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              Nome Azienda
            </p>
            {isEditing ? (
              <Input
                value={editedData.name || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, name: e.target.value })
                }
                className="bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                placeholder="Nome Azienda"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.name}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-agri-green-600 mb-1.5">
              Logo
            </p>
            {isEditing ? (
              <div className="space-y-2">
                {(editedData.logoUrl || company.logoUrl) && (
                  <div className="flex items-center gap-3">
                    <img
                      src={editedData.logoUrl || company.logoUrl || ""}
                      alt={`Logo ${company.name}`}
                      className="h-16 w-16 object-contain rounded-lg border border-agri-green-200 shadow-sm bg-white p-1"
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
                        className="h-8 px-3 rounded-full text-red-600 hover:bg-red-50"
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
                    className="bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-agri-green-50 file:text-agri-green-700 hover:file:bg-agri-green-100"
                  />
                  {isUploadingLogo && (
                    <Spinner size={20} ariaLabel="Caricamento logo" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Seleziona un file immagine (PNG, JPG) per caricare il logo
                  aziendale
                </p>
              </div>
            ) : (
              company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={`Logo ${company.name}`}
                  className="h-16 w-16 object-contain rounded-lg border border-agri-green-200 shadow-sm bg-white p-1"
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
      <div className="bg-gradient-to-br from-field-50/50 to-nature-100/30 rounded-2xl p-5 border border-field-200/50 shadow-sm">
        <h3 className="text-sm font-semibold text-field-600 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-field-500"></div>
          Dati Fiscali
        </h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Partita IVA
            </p>
            {isEditing ? (
              <Input
                value={editedData.vatNumber || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, vatNumber: e.target.value })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Partita IVA"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.vatNumber}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Codice Fiscale
            </p>
            {isEditing ? (
              <Input
                value={editedData.fiscalCode || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, fiscalCode: e.target.value })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Codice Fiscale"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.fiscalCode}
              </p>
            )}
          </div>
          {isEditing && (
            <>
              <div>
                <p className="text-xs font-medium text-field-600 mb-1.5">
                  CUAA
                </p>
                <Input
                  value={editedData.cuaa || ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, cuaa: e.target.value })
                  }
                  className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
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
      <div className="bg-gradient-to-br from-harvest-50/50 to-nature-100/30 rounded-2xl p-5 border border-harvest-200/50 shadow-sm">
        <h3 className="text-sm font-semibold text-harvest-600 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-harvest-500"></div>
          Indirizzo
        </h3>
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-2">
            <p className="text-xs font-medium text-harvest-600 mb-1.5">
              Indirizzo
            </p>
            {isEditing ? (
              <Input
                value={editedData.address || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, address: e.target.value })
                }
                className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10"
                placeholder="Indirizzo"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.address || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-harvest-600 mb-1.5">Città</p>
            {isEditing ? (
              <Input
                value={editedData.city || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, city: e.target.value })
                }
                className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10"
                placeholder="Città"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.city || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-harvest-600 mb-1.5">CAP</p>
            {isEditing ? (
              <Input
                value={editedData.cap || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, cap: e.target.value })
                }
                className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10"
                placeholder="CAP"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.cap || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-harvest-600 mb-1.5">
              Nazione
            </p>
            {isEditing ? (
              <Input
                value={editedData.nation || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, nation: e.target.value })
                }
                className="bg-white/80 border-harvest-200 focus:border-harvest-400 focus:ring-harvest-300/50 rounded-xl h-10"
                placeholder="Nazione"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.nation || "-"}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContactInfo = (): React.ReactNode => {
    return (
      <div className="bg-gradient-to-br from-field-50/50 to-agri-green-50/30 rounded-2xl p-5 border border-field-200/50 shadow-sm">
        <h3 className="text-sm font-semibold text-field-600 mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-field-500"></div>
          Contatti
        </h3>
        <div className="grid grid-cols-1 gap-5">
          <div>
            <p className="text-xs font-medium text-field-600 mb-1.5">Email</p>
            {isEditing ? (
              <Input
                type="email"
                value={editedData.email || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, email: e.target.value })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Email"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.email ? (
                  <a
                    href={`mailto:${company.email}`}
                    className="text-field-600 hover:text-field-700 hover:underline transition-colors"
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
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Telefono
            </p>
            {isEditing ? (
              <Input
                type="tel"
                value={editedData.phoneNumber || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, phoneNumber: e.target.value })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Telefono"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.phoneNumber ? (
                  <a
                    href={`tel:${company.phoneNumber}`}
                    className="text-field-600 hover:text-field-700 hover:underline transition-colors"
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
            <p className="text-xs font-medium text-field-600 mb-1.5">
              Sito Web
            </p>
            {isEditing ? (
              <Input
                type="url"
                value={editedData.website || ""}
                onChange={(e) =>
                  setEditedData({ ...editedData, website: e.target.value })
                }
                className="bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                placeholder="Sito Web"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-field-600 hover:text-field-700 hover:underline transition-colors"
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

  const renderActions = (): React.ReactNode => {
    return (
      <div className="pt-4 border-t border-agri-green-100/50">
        <h3 className="text-sm font-semibold text-agri-green-700 mb-3 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-agri-green-500"></div>
          Azioni
        </h3>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-white/80 border-agri-green-200 hover:bg-agri-green-50 hover:border-agri-green-300 text-agri-green-700 rounded-xl transition-all"
            onClick={() => navigate("/fields")}
          >
            <MapPin className="h-4 w-4" />
            Visualizza Campi
          </Button>
        </div>
      </div>
    );
  };

  const isDetailsTab = activeTab === "details";
  const isUsersTab = activeTab === "users";
  const isWarehousesTab = activeTab === "warehouses";
  const isFilesTab = activeTab === "files";

  const headerTitle = isDetailsTab
    ? isEditing
      ? "Modifica Azienda"
      : "Dettagli Azienda"
    : isUsersTab
    ? "Gestione Utenti"
    : isWarehousesTab
    ? "Gestione Magazzini"
    : "Gestione File";

  const headerSubtitle: string | null =
    isDetailsTab && !isEditing
      ? "Tocca la matita per modificare"
      : isUsersTab
      ? "Gestisci gli utenti associati all'azienda"
      : isWarehousesTab
      ? "Gestisci i magazzini dell'azienda"
      : isFilesTab
      ? "Carica e gestisci i file dell'azienda"
      : null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) =>
        setActiveTab(value as "details" | "users" | "warehouses" | "files")
      }
      className="space-y-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-agri-green-100/50">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {headerTitle}
            </h2>
            {headerSubtitle && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {isUsersTab && <Users className="h-3 w-3" />}
                {isWarehousesTab && <WarehouseIcon className="h-3 w-3" />}
                {isFilesTab && <FileText className="h-3 w-3" />}
                {headerSubtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="details">Dettagli</TabsTrigger>
              <TabsTrigger value="users">Utenti</TabsTrigger>
              <TabsTrigger value="warehouses">Magazzini</TabsTrigger>
              <TabsTrigger value="files">File</TabsTrigger>
            </TabsList>
            {isDetailsTab &&
              (isEditing ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isUpdating}
                    className="h-9 px-3 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm transition-all"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="h-9 px-3 rounded-full bg-agri-green-600 hover:bg-agri-green-700 text-white shadow-sm transition-all hover:shadow-md"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isUpdating ? "Salvataggio..." : "Salva"}
                  </Button>
                </div>
              ) : (
                onUpdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-9 w-9 p-0 rounded-full bg-agri-green-50 hover:bg-agri-green-100 text-agri-green-700 border border-agri-green-200/50 shadow-sm transition-all hover:shadow-md"
                    aria-label="Modifica"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )
              ))}
          </div>
        </div>
      </div>

      <TabsContent value="details" className="mt-4">
        <div className="space-y-5">
          {renderGeneralInfo()}
          {renderFiscalInfo()}
          {renderAddressInfo()}
          {renderContactInfo()}
          {renderActions()}
        </div>
      </TabsContent>

      <TabsContent value="users" className="mt-4">
        <CompanyUsersPanel
          companyId={company.id}
          companyName={company.name}
          users={companyUsers}
          isLoading={isLoadingUsers}
          isError={isUsersError}
          error={usersError}
          onRetry={refetchCompanyUsers}
          onAddUser={addCompanyUser}
          isAdding={isAddingCompanyUser}
          onRemoveUser={removeCompanyUser}
          isRemoving={isRemovingCompanyUser}
          onUpdateRole={updateCompanyUserRole}
          isUpdatingRole={isUpdatingCompanyUserRole}
        />
      </TabsContent>

      <TabsContent value="warehouses" className="mt-4">
        <CompanyWarehousesPanel
          companyId={company.id}
          companyName={company.name}
          warehouses={companyWarehouses}
          isLoading={isLoadingWarehouses}
          isError={isWarehousesError}
          error={warehousesError}
          onRetry={refetchCompanyWarehouses}
          onCreate={createWarehouse}
          isCreating={isCreatingWarehouse}
          onUpdate={async (warehouseId, data) => {
            await updateWarehouse({ warehouseId, data });
          }}
          isUpdating={isUpdatingWarehouse}
          onDelete={deleteWarehouse}
          isDeleting={isDeletingWarehouse}
        />
      </TabsContent>

      <TabsContent value="files" className="mt-4">
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
        />
      </TabsContent>
    </Tabs>
  );
}

interface CompanyUsersPanelProps {
  companyId: string;
  companyName: string;
  users: UserOnCompany[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => Promise<unknown>;
  onAddUser: (input: {
    email: string;
    name: string;
    role: UserOnCompanyRole;
  }) => Promise<void>;
  isAdding: boolean;
  onRemoveUser: (userId: string) => Promise<void>;
  isRemoving: boolean;
  onUpdateRole: (input: {
    relationId: string;
    role: UserOnCompanyRole;
  }) => Promise<unknown>;
  isUpdatingRole: boolean;
}

type RoleDrafts = Record<string, UserOnCompanyRole>;

interface CompanyUsersPanelState {
  email: string;
  name: string;
  role: UserOnCompanyRole;
  roleDrafts: RoleDrafts;
  pendingRoleUserId: string | null;
  pendingRemoveUserId: string | null;
}

class CompanyUsersPanel extends React.Component<
  CompanyUsersPanelProps,
  CompanyUsersPanelState
> {
  public constructor(props: CompanyUsersPanelProps) {
    super(props);
    this.state = {
      email: "",
      name: "",
      role: "EDITOR",
      roleDrafts: CompanyUsersPanel.createDrafts(props.users),
      pendingRoleUserId: null,
      pendingRemoveUserId: null,
    };
  }

  public componentDidUpdate(prevProps: CompanyUsersPanelProps): void {
    if (prevProps.users !== this.props.users) {
      this.reconcileRoleDrafts(prevProps.users);
    }
  }

  private static createDrafts(users: UserOnCompany[]): RoleDrafts {
    return users.reduce((drafts, user) => {
      drafts[user.id] = user.role;
      return drafts;
    }, {} as RoleDrafts);
  }

  private reconcileRoleDrafts(previousUsers: UserOnCompany[]): void {
    const nextDrafts: RoleDrafts = { ...this.state.roleDrafts };
    const nextUsersMap = new Map(
      this.props.users.map((user) => [user.id, user])
    );
    let changed = false;

    this.props.users.forEach((user) => {
      const currentDraft = nextDrafts[user.id];
      if (currentDraft === undefined) {
        nextDrafts[user.id] = user.role;
        changed = true;
        return;
      }

      const previous = previousUsers.find((item) => item.id === user.id);
      if (previous && previous.role !== user.role) {
        if (this.state.roleDrafts[user.id] === previous.role) {
          nextDrafts[user.id] = user.role;
          changed = true;
        }
      }
    });

    Object.keys(nextDrafts).forEach((relationId) => {
      if (!nextUsersMap.has(relationId)) {
        delete nextDrafts[relationId];
        changed = true;
      }
    });

    if (changed) {
      this.setState({ roleDrafts: nextDrafts });
    }
  }

  private handleEmailChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ email: event.target.value });
  };

  private handleNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ name: event.target.value });
  };

  private handleRoleChange = (value: string): void => {
    this.setState({ role: value as UserOnCompanyRole });
  };

  private handleRoleDraftChange = (relationId: string, value: string): void => {
    this.setState((prevState) => ({
      roleDrafts: {
        ...prevState.roleDrafts,
        [relationId]: value as UserOnCompanyRole,
      },
    }));
  };

  private handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const email = this.state.email.trim();
    const name = this.state.name.trim();

    if (!email || !name) {
      return;
    }

    try {
      await this.props.onAddUser({
        email,
        name,
        role: this.state.role,
      });
      this.setState({ email: "", name: "" });
    } catch (error) {
      console.error("Failed to add company user", error);
    }
  };

  private handleUpdateRole = async (relationId: string): Promise<void> => {
    const nextRole = this.state.roleDrafts[relationId];
    const currentUser = this.props.users.find((user) => user.id === relationId);

    if (!nextRole || !currentUser || nextRole === currentUser.role) {
      return;
    }

    this.setState({ pendingRoleUserId: relationId });
    try {
      await this.props.onUpdateRole({ relationId, role: nextRole });
    } catch (error) {
      console.error("Failed to update company user role", error);
    } finally {
      this.setState({ pendingRoleUserId: null });
    }
  };

  private handleRemoveUser = async (userId: string): Promise<void> => {
    this.setState({ pendingRemoveUserId: userId });
    try {
      await this.props.onRemoveUser(userId);
    } catch (error) {
      console.error("Failed to remove company user", error);
    } finally {
      this.setState({ pendingRemoveUserId: null });
    }
  };

  public render(): React.ReactNode {
    const {
      companyId,
      companyName,
      users,
      isLoading,
      isError,
      error,
      onRetry,
      isAdding,
      isRemoving,
      isUpdatingRole,
    } = this.props;

    const {
      email,
      name,
      role,
      roleDrafts,
      pendingRoleUserId,
      pendingRemoveUserId,
    } = this.state;

    const isAddDisabled = isAdding || !email.trim() || !name.trim();
    const hasUsers = users.length > 0;

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-agri-green-50/40 to-field-50/30 rounded-2xl p-5 border border-agri-green-100/60 shadow-sm">
          <div className="flex flex-col gap-3 mb-4">
            <h3 className="text-sm font-semibold text-agri-green-700 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invita un nuovo utente
            </h3>
            <p className="text-xs text-muted-foreground">
              Aggiungi collaboratori all'azienda {companyName}
            </p>
          </div>
          <form className="space-y-4" onSubmit={this.handleSubmit}>
            <div className="grid md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor={`company-user-email-${companyId}`}>Email</Label>
                <Input
                  id={`company-user-email-${companyId}`}
                  type="email"
                  placeholder="utente@example.com"
                  value={email}
                  onChange={this.handleEmailChange}
                  className="mt-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                  required
                />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor={`company-user-name-${companyId}`}>Nome</Label>
                <Input
                  id={`company-user-name-${companyId}`}
                  type="text"
                  placeholder="Nome Cognome"
                  value={name}
                  onChange={this.handleNameChange}
                  className="mt-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                  required
                />
              </div>
              <div>
                <Label>Ruolo</Label>
                <Select value={role} onValueChange={this.handleRoleChange}>
                  <SelectTrigger className="mt-1 h-10 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Amministratore</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isAddDisabled}
                className="rounded-full bg-agri-green-600 hover:bg-agri-green-700 text-white shadow-sm transition-all hover:shadow-md"
              >
                {isAdding ? (
                  <Spinner size={18} ariaLabel="Aggiunta utente" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {isAdding ? "Invio..." : "Invita utente"}
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-gradient-to-br from-field-50/40 to-agri-green-50/20 rounded-2xl p-5 border border-field-200/60 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-field-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Utenti assegnati
              </h3>
              <p className="text-xs text-muted-foreground">
                Gestisci ruoli e accessi agli utenti collegati
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void onRetry();
                }}
                disabled={isLoading}
                className="rounded-full border-field-200 text-field-700 hover:bg-field-50/80"
              >
                {isLoading ? (
                  <Spinner size={18} ariaLabel="Aggiornamento utenti" />
                ) : (
                  <RefreshCcw className="h-4 w-4 mr-2" />
                )}
                Aggiorna
              </Button>
            </div>
          </div>

          {isError ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 p-4 text-red-700">
              <p className="text-sm font-semibold">
                Impossibile caricare gli utenti dell'azienda.
              </p>
              {error?.message && (
                <p className="text-xs text-red-600/80">{error.message}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void onRetry();
                }}
                className="border-red-200 text-red-700 hover:bg-red-100/60"
              >
                Riprova
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-field-600">
              <Spinner size={28} ariaLabel="Caricamento utenti" />
              <p className="text-sm">Caricamento utenti in corso…</p>
            </div>
          ) : hasUsers ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const userInfo = user.user;
                  const companyInfo = user.company;
                  const fullName = userInfo
                    ? `${userInfo.name} ${userInfo.surname}`.trim()
                    : null;
                  const initials = userInfo
                    ? `${userInfo.name?.[0] ?? ""}${
                        userInfo.surname?.[0] ?? ""
                      }`.toUpperCase()
                    : "U";

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 shrink-0">
                            <AvatarImage
                              src={userInfo?.profilePictureUrl ?? undefined}
                              alt={fullName ?? "Utente"}
                            />
                            <AvatarFallback className="bg-field-100 text-field-700 text-sm font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">
                              {fullName ?? user.userId}
                            </p>
                            {userInfo?.email && (
                              <p className="text-xs text-muted-foreground break-all">
                                {userInfo.email}
                              </p>
                            )}
                            {companyInfo && (
                              <p className="text-xs text-muted-foreground">
                                Azienda: {companyInfo.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={roleDrafts[user.id] ?? user.role}
                          onValueChange={(value) =>
                            this.handleRoleDraftChange(user.id, value)
                          }
                          disabled={isUpdatingRole}
                        >
                          <SelectTrigger className="h-9 bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">
                              Amministratore
                            </SelectItem>
                            <SelectItem value="EDITOR">Editor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              void this.handleUpdateRole(user.id);
                            }}
                            disabled={
                              isUpdatingRole ||
                              !roleDrafts[user.id] ||
                              roleDrafts[user.id] === user.role ||
                              pendingRemoveUserId === user.userId
                            }
                            className="rounded-full bg-field-600 text-white hover:bg-field-700"
                          >
                            {pendingRoleUserId === user.id && isUpdatingRole ? (
                              <Spinner
                                size={18}
                                ariaLabel="Aggiornamento ruolo"
                              />
                            ) : (
                              <ShieldCheck className="h-4 w-4 mr-1" />
                            )}
                            Aggiorna
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              void this.handleRemoveUser(user.userId);
                            }}
                            disabled={
                              isRemoving || pendingRoleUserId === user.id
                            }
                            className="rounded-full text-red-600 hover:bg-red-50"
                          >
                            {pendingRemoveUserId === user.userId &&
                            isRemoving ? (
                              <Spinner size={18} ariaLabel="Rimozione utente" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            Rimuovi
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-field-200 bg-white/50 p-6 text-field-600">
              <p className="text-sm font-semibold">
                Nessun utente assegnato a questa azienda.
              </p>
              <p className="text-xs text-muted-foreground">
                Invita un utente per iniziare a collaborare su {companyName}.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
}

interface CompanyWarehousesPanelProps {
  companyId: string;
  companyName: string;
  warehouses: Warehouse[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => Promise<Warehouse[]>;
  onCreate: (input: Omit<CreateWarehouseRequest, "companyId">) => Promise<void>;
  isCreating: boolean;
  onUpdate: (
    warehouseId: string,
    data: UpdateWarehouseRequest
  ) => Promise<void>;
  isUpdating: boolean;
  onDelete: (warehouseId: string) => Promise<void>;
  isDeleting: boolean;
}

type WarehouseDraft = {
  name: string;
  nation: string;
  region: string;
  city: string;
  address: string;
  cap: string;
  sezione: string;
  foglio: string;
  particella: string;
  subalterno: string;
};

type WarehouseDrafts = Record<string, WarehouseDraft>;

interface CompanyWarehousesPanelState {
  createDraft: WarehouseDraft;
  editingWarehouseId: string | null;
  editDrafts: WarehouseDrafts;
  pendingUpdateWarehouseId: string | null;
  pendingDeleteWarehouseId: string | null;
  isCreateExpanded: boolean;
}

class CompanyWarehousesPanel extends React.Component<
  CompanyWarehousesPanelProps,
  CompanyWarehousesPanelState
> {
  private static readonly requiredFields: Array<keyof WarehouseDraft> = [
    "name",
    "nation",
    "region",
    "city",
    "address",
    "cap",
  ];

  private static readonly fieldDefinitions: Array<{
    field: keyof WarehouseDraft;
    label: string;
    required?: boolean;
  }> = [
    { field: "name", label: "Nome Magazzino", required: true },
    { field: "nation", label: "Nazione", required: true },
    { field: "region", label: "Regione", required: true },
    { field: "city", label: "Città", required: true },
    { field: "address", label: "Indirizzo", required: true },
    { field: "cap", label: "CAP", required: true },
    { field: "sezione", label: "Sezione" },
    { field: "foglio", label: "Foglio" },
    { field: "particella", label: "Particella" },
    { field: "subalterno", label: "Subalterno" },
  ];

  public constructor(props: CompanyWarehousesPanelProps) {
    super(props);
    this.state = {
      createDraft: CompanyWarehousesPanel.createEmptyDraft(),
      editingWarehouseId: null,
      editDrafts: CompanyWarehousesPanel.createDraftsFromWarehouses(
        props.warehouses
      ),
      pendingUpdateWarehouseId: null,
      pendingDeleteWarehouseId: null,
      isCreateExpanded: true,
    };
  }

  public componentDidUpdate(prevProps: CompanyWarehousesPanelProps): void {
    if (prevProps.warehouses !== this.props.warehouses) {
      this.reconcileEditDrafts(prevProps.warehouses);
    }
  }

  private static createEmptyDraft(): WarehouseDraft {
    return {
      name: "",
      nation: "",
      region: "",
      city: "",
      address: "",
      cap: "",
      sezione: "",
      foglio: "",
      particella: "",
      subalterno: "",
    };
  }

  private static createDraftFromWarehouse(
    warehouse: Warehouse
  ): WarehouseDraft {
    return {
      name: warehouse.name ?? "",
      nation: warehouse.nation ?? "",
      region: warehouse.region ?? "",
      city: warehouse.city ?? "",
      address: warehouse.address ?? "",
      cap: warehouse.cap ?? "",
      sezione: warehouse.sezione ?? "",
      foglio: warehouse.foglio ?? "",
      particella: warehouse.particella ?? "",
      subalterno: warehouse.subalterno ?? "",
    };
  }

  private static createDraftsFromWarehouses(
    warehouses: Warehouse[]
  ): WarehouseDrafts {
    return warehouses.reduce((drafts, warehouse) => {
      drafts[warehouse.id] =
        CompanyWarehousesPanel.createDraftFromWarehouse(warehouse);
      return drafts;
    }, {} as WarehouseDrafts);
  }

  private reconcileEditDrafts(previousWarehouses: Warehouse[]): void {
    const currentDrafts: WarehouseDrafts = { ...this.state.editDrafts };
    const currentEditingId = this.state.editingWarehouseId;
    const nextWarehousesMap = new Map(
      this.props.warehouses.map((warehouse) => [warehouse.id, warehouse])
    );
    let changed = false;

    this.props.warehouses.forEach((warehouse) => {
      const previous = previousWarehouses.find(
        (item) => item.id === warehouse.id
      );
      const defaultDraft =
        CompanyWarehousesPanel.createDraftFromWarehouse(warehouse);

      if (!currentDrafts[warehouse.id]) {
        currentDrafts[warehouse.id] = defaultDraft;
        changed = true;
        return;
      }

      if (
        currentEditingId !== warehouse.id &&
        this.hasWarehouseChanged(previous, warehouse)
      ) {
        currentDrafts[warehouse.id] = defaultDraft;
        changed = true;
      }
    });

    Object.keys(currentDrafts).forEach((warehouseId) => {
      if (!nextWarehousesMap.has(warehouseId)) {
        delete currentDrafts[warehouseId];
        changed = true;
      }
    });

    if (changed) {
      this.setState({ editDrafts: currentDrafts });
    }
  }

  private hasWarehouseChanged(
    previous: Warehouse | undefined,
    next: Warehouse
  ): boolean {
    if (!previous) {
      return true;
    }

    return (
      previous.name !== next.name ||
      previous.nation !== next.nation ||
      previous.region !== next.region ||
      previous.city !== next.city ||
      previous.address !== next.address ||
      previous.cap !== next.cap ||
      previous.sezione !== next.sezione ||
      previous.foglio !== next.foglio ||
      previous.particella !== next.particella ||
      previous.subalterno !== next.subalterno
    );
  }

  private handleToggleCreate = (): void => {
    this.setState((prevState) => ({
      isCreateExpanded: !prevState.isCreateExpanded,
    }));
  };

  private handleCreateInputChange =
    (field: keyof WarehouseDraft) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      this.setState((prevState) => ({
        createDraft: {
          ...prevState.createDraft,
          [field]: value,
        },
      }));
    };

  private handleEditInputChange =
    (warehouseId: string, field: keyof WarehouseDraft) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      this.setState((prevState) => ({
        editDrafts: {
          ...prevState.editDrafts,
          [warehouseId]: {
            ...(prevState.editDrafts[warehouseId] ??
              CompanyWarehousesPanel.createEmptyDraft()),
            [field]: value,
          },
        },
      }));
    };

  private handleCreateSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    if (!this.isDraftValid(this.state.createDraft)) {
      return;
    }

    try {
      await this.props.onCreate(
        this.buildCreatePayload(this.state.createDraft)
      );
      this.setState({
        createDraft: CompanyWarehousesPanel.createEmptyDraft(),
      });
    } catch (error) {
      console.error("Failed to create warehouse", error);
    }
  };

  private handleStartEdit = (warehouseId: string): void => {
    const warehouse = this.props.warehouses.find(
      (item) => item.id === warehouseId
    );
    if (!warehouse) {
      return;
    }

    this.setState((prevState) => ({
      editingWarehouseId: warehouseId,
      editDrafts: {
        ...prevState.editDrafts,
        [warehouseId]:
          CompanyWarehousesPanel.createDraftFromWarehouse(warehouse),
      },
    }));
  };

  private handleCancelEdit = (warehouseId: string): void => {
    const warehouse = this.props.warehouses.find(
      (item) => item.id === warehouseId
    );
    this.setState((prevState) => ({
      editingWarehouseId:
        prevState.editingWarehouseId === warehouseId
          ? null
          : prevState.editingWarehouseId,
      editDrafts:
        warehouse !== undefined
          ? {
              ...prevState.editDrafts,
              [warehouseId]:
                CompanyWarehousesPanel.createDraftFromWarehouse(warehouse),
            }
          : prevState.editDrafts,
    }));
  };

  private handleEditSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
    warehouseId: string
  ): Promise<void> => {
    event.preventDefault();
    await this.handleSaveEdit(warehouseId);
  };

  private handleSaveEdit = async (warehouseId: string): Promise<void> => {
    const warehouse = this.props.warehouses.find(
      (item) => item.id === warehouseId
    );
    if (!warehouse) {
      return;
    }

    const draft =
      this.state.editDrafts[warehouseId] ??
      CompanyWarehousesPanel.createDraftFromWarehouse(warehouse);

    if (!this.isDraftValid(draft)) {
      return;
    }

    const updatePayload = this.buildUpdatePayload(warehouse, draft);

    if (Object.keys(updatePayload).length === 0) {
      this.setState({ editingWarehouseId: null });
      return;
    }

    this.setState({ pendingUpdateWarehouseId: warehouseId });
    try {
      await this.props.onUpdate(warehouseId, updatePayload);
      this.setState({
        editingWarehouseId: null,
      });
    } catch (error) {
      console.error("Failed to update warehouse", error);
    } finally {
      this.setState({ pendingUpdateWarehouseId: null });
    }
  };

  private handleDeleteWarehouse = async (
    warehouseId: string
  ): Promise<void> => {
    this.setState({ pendingDeleteWarehouseId: warehouseId });
    try {
      await this.props.onDelete(warehouseId);
    } catch (error) {
      console.error("Failed to delete warehouse", error);
    } finally {
      this.setState((prevState) => ({
        pendingDeleteWarehouseId: null,
        editingWarehouseId:
          prevState.editingWarehouseId === warehouseId
            ? null
            : prevState.editingWarehouseId,
      }));
    }
  };

  private isDraftValid(draft: WarehouseDraft): boolean {
    return CompanyWarehousesPanel.requiredFields.every(
      (field) => draft[field].trim().length > 0
    );
  }

  private normalizeOptionalField(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private buildCreatePayload(
    draft: WarehouseDraft
  ): Omit<CreateWarehouseRequest, "companyId"> {
    return {
      name: draft.name.trim(),
      nation: draft.nation.trim(),
      region: draft.region.trim(),
      city: draft.city.trim(),
      address: draft.address.trim(),
      cap: draft.cap.trim(),
      sezione: this.normalizeOptionalField(draft.sezione),
      foglio: this.normalizeOptionalField(draft.foglio),
      particella: this.normalizeOptionalField(draft.particella),
      subalterno: this.normalizeOptionalField(draft.subalterno),
    };
  }

  private buildUpdatePayload(
    warehouse: Warehouse,
    draft: WarehouseDraft
  ): UpdateWarehouseRequest {
    const payload: UpdateWarehouseRequest = {};

    const trimmedName = draft.name.trim();
    if (trimmedName !== warehouse.name) {
      payload.name = trimmedName;
    }

    const trimmedNation = draft.nation.trim();
    if (trimmedNation !== (warehouse.nation ?? "")) {
      payload.nation = trimmedNation;
    }

    const trimmedRegion = draft.region.trim();
    if (trimmedRegion !== (warehouse.region ?? "")) {
      payload.region = trimmedRegion;
    }

    const trimmedCity = draft.city.trim();
    if (trimmedCity !== (warehouse.city ?? "")) {
      payload.city = trimmedCity;
    }

    const trimmedAddress = draft.address.trim();
    if (trimmedAddress !== (warehouse.address ?? "")) {
      payload.address = trimmedAddress;
    }

    const trimmedCap = draft.cap.trim();
    if (trimmedCap !== (warehouse.cap ?? "")) {
      payload.cap = trimmedCap;
    }

    const normalizedSezione = this.normalizeOptionalField(draft.sezione);
    if (normalizedSezione !== (warehouse.sezione ?? null)) {
      payload.sezione = normalizedSezione;
    }

    const normalizedFoglio = this.normalizeOptionalField(draft.foglio);
    if (normalizedFoglio !== (warehouse.foglio ?? null)) {
      payload.foglio = normalizedFoglio;
    }

    const normalizedParticella = this.normalizeOptionalField(draft.particella);
    if (normalizedParticella !== (warehouse.particella ?? null)) {
      payload.particella = normalizedParticella;
    }

    const normalizedSubalterno = this.normalizeOptionalField(draft.subalterno);
    if (normalizedSubalterno !== (warehouse.subalterno ?? null)) {
      payload.subalterno = normalizedSubalterno;
    }

    return payload;
  }

  private getFieldColumnSpan(field: keyof WarehouseDraft): string {
    if (field === "name" || field === "address") {
      return "md:col-span-2";
    }
    return "md:col-span-1";
  }

  private getWarehouseFieldValue(
    warehouse: Warehouse,
    field: keyof WarehouseDraft
  ): string | null {
    const value = warehouse[field as keyof Warehouse];
    if (typeof value === "string") {
      return value;
    }
    return value ?? null;
  }

  private renderDetailRow(
    label: string,
    value: string | null,
    key?: string
  ): React.ReactNode {
    return (
      <div className="flex flex-col gap-1" key={key}>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value ?? "-"}</p>
      </div>
    );
  }

  private renderCreateSection(): React.ReactNode {
    const { isCreating } = this.props;
    const { createDraft, isCreateExpanded } = this.state;
    const isSubmitDisabled = isCreating || !this.isDraftValid(createDraft);

    return (
      <div className="bg-gradient-to-br from-field-50/40 to-agri-green-50/20 rounded-2xl p-5 border border-field-200/60 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-field-600" />
            <div>
              <h3 className="text-sm font-semibold text-field-600">
                Crea un nuovo magazzino
              </h3>
              <p className="text-xs text-muted-foreground">
                Inserisci i dettagli del magazzino per {this.props.companyName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={this.handleToggleCreate}
            className="h-9 px-3 rounded-full bg-white/70 border border-field-200 text-field-700 hover:bg-field-50 transition-all"
          >
            {isCreateExpanded ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Nascondi
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-1" />
                Aggiungi
              </>
            )}
          </Button>
        </div>

        {isCreateExpanded && (
          <form className="space-y-4" onSubmit={this.handleCreateSubmit}>
            <div className="grid md:grid-cols-2 gap-3">
              {CompanyWarehousesPanel.fieldDefinitions.map(
                ({ field, label }) => (
                  <div
                    key={`create-${field}`}
                    className={this.getFieldColumnSpan(field)}
                  >
                    <Label
                      htmlFor={`warehouse-create-${field}-${this.props.companyId}`}
                    >
                      {label}
                    </Label>
                    <Input
                      id={`warehouse-create-${field}-${this.props.companyId}`}
                      value={createDraft[field]}
                      onChange={this.handleCreateInputChange(field)}
                      required={CompanyWarehousesPanel.requiredFields.includes(
                        field
                      )}
                      className="mt-1 bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                      placeholder={label}
                    />
                  </div>
                )
              )}
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="rounded-full bg-field-600 hover:bg-field-700 text-white shadow-sm transition-all hover:shadow-md"
              >
                {isCreating ? (
                  <Spinner size={18} ariaLabel="Creazione magazzino" />
                ) : (
                  <PlusCircle className="h-4 w-4 mr-2" />
                )}
                {isCreating ? "Creazione..." : "Crea magazzino"}
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  private renderWarehousesSection(): React.ReactNode {
    const { warehouses, isLoading, isError, error, onRetry, isDeleting } =
      this.props;

    return (
      <div className="bg-gradient-to-br from-agri-green-50/40 to-field-50/20 rounded-2xl p-5 border border-agri-green-100/60 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-agri-green-700" />
            <div>
              <h3 className="text-sm font-semibold text-agri-green-700">
                Magazzini registrati
              </h3>
              <p className="text-xs text-muted-foreground">
                Gestisci l&apos;inventario dei magazzini aziendali
              </p>
            </div>
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 p-4 text-red-700">
            <p className="text-sm font-semibold">
              Impossibile caricare i magazzini dell&apos;azienda.
            </p>
            {error?.message && (
              <p className="text-xs text-red-600/80">{error.message}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void onRetry();
              }}
              className="border-red-200 text-red-700 hover:bg-red-100/60"
            >
              Riprova
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-agri-green-700">
            <Spinner size={28} ariaLabel="Caricamento magazzini" />
            <p className="text-sm">Caricamento magazzini in corso…</p>
          </div>
        ) : warehouses.length > 0 ? (
          <div className="space-y-4">
            {warehouses.map((warehouse) =>
              this.renderWarehouseCard(warehouse, isDeleting)
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-agri-green-200 bg-white/50 p-6 text-agri-green-700">
            <p className="text-sm font-semibold">
              Nessun magazzino registrato per questa azienda.
            </p>
            <p className="text-xs text-muted-foreground">
              Crea un magazzino per iniziare a registrare le giacenze.
            </p>
          </div>
        )}
      </div>
    );
  }

  private renderWarehouseCard(
    warehouse: Warehouse,
    isDeletingGlobal: boolean
  ): React.ReactNode {
    const { isUpdating } = this.props;
    const {
      editingWarehouseId,
      editDrafts,
      pendingUpdateWarehouseId,
      pendingDeleteWarehouseId,
    } = this.state;

    const draft =
      editDrafts[warehouse.id] ??
      CompanyWarehousesPanel.createDraftFromWarehouse(warehouse);

    const isEditing = editingWarehouseId === warehouse.id;
    const isSaving = pendingUpdateWarehouseId === warehouse.id && isUpdating;
    const isDeleting =
      pendingDeleteWarehouseId === warehouse.id && isDeletingGlobal;
    const updatePayload = this.buildUpdatePayload(warehouse, draft);
    const hasChanges = Object.keys(updatePayload).length > 0;
    const isDraftValidForUpdate = this.isDraftValid(draft);
    const isSaveDisabled = isSaving || !isDraftValidForUpdate || !hasChanges;

    if (isEditing) {
      return (
        <div
          key={warehouse.id}
          className="rounded-2xl border border-field-200 bg-white/70 p-4 shadow-sm"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              void this.handleEditSubmit(event, warehouse.id);
            }}
          >
            <div className="grid md:grid-cols-2 gap-3">
              {CompanyWarehousesPanel.fieldDefinitions.map(
                ({ field, label }) => (
                  <div
                    key={`edit-${warehouse.id}-${field}`}
                    className={this.getFieldColumnSpan(field)}
                  >
                    <Label htmlFor={`warehouse-edit-${field}-${warehouse.id}`}>
                      {label}
                    </Label>
                    <Input
                      id={`warehouse-edit-${field}-${warehouse.id}`}
                      value={draft[field]}
                      onChange={this.handleEditInputChange(warehouse.id, field)}
                      required={CompanyWarehousesPanel.requiredFields.includes(
                        field
                      )}
                      className="mt-1 bg-white/80 border-field-200 focus:border-field-400 focus:ring-field-300/50 rounded-xl h-10"
                      placeholder={label}
                    />
                  </div>
                )
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void this.handleDeleteWarehouse(warehouse.id);
                }}
                disabled={isDeleting}
                className="rounded-full text-red-600 hover:bg-red-50"
              >
                {isDeleting ? (
                  <Spinner size={18} ariaLabel="Rimozione magazzino" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Elimina
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => this.handleCancelEdit(warehouse.id)}
                  className="h-9 px-3 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm transition-all"
                >
                  <X className="h-4 w-4 mr-1" />
                  Annulla
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaveDisabled}
                  className="h-9 px-3 rounded-full bg-field-600 hover:bg-field-700 text-white shadow-sm transition-all hover:shadow-md"
                >
                  {isSaving ? (
                    <Spinner size={18} ariaLabel="Salvataggio magazzino" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  {isSaving ? "Salvataggio..." : "Salva modifiche"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div
        key={warehouse.id}
        className="rounded-2xl border border-agri-green-200 bg-white/60 p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <WarehouseIcon className="h-10 w-10 rounded-full bg-agri-green-100/80 p-2 text-agri-green-700" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {warehouse.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {warehouse.city ?? "-"}, {warehouse.region ?? "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => this.handleStartEdit(warehouse.id)}
              className="h-9 px-3 rounded-full bg-agri-green-50 hover:bg-agri-green-100 text-agri-green-700 border border-agri-green-200/50 shadow-sm transition-all hover:shadow-md"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Modifica
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void this.handleDeleteWarehouse(warehouse.id);
              }}
              disabled={isDeleting}
              className="h-9 px-3 rounded-full text-red-600 hover:bg-red-50"
            >
              {isDeleting ? (
                <Spinner size={18} ariaLabel="Rimozione magazzino" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Elimina
            </Button>
          </div>
        </div>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {CompanyWarehousesPanel.fieldDefinitions.map(({ field, label }) =>
            this.renderDetailRow(
              label,
              this.getWarehouseFieldValue(warehouse, field),
              `warehouse-${warehouse.id}-${field}`
            )
          )}
        </div>
      </div>
    );
  }

  public render(): React.ReactNode {
    return (
      <div className="space-y-6">
        {this.renderCreateSection()}
        {this.renderWarehousesSection()}
      </div>
    );
  }
}
