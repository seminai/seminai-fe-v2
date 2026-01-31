import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { usePatentini } from "@/hooks/usePatentini";
import type { Patentino } from "@/api/patentini";
import { Plus, Pencil, Trash2, Check, X, Calendar as CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface PatentiniDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

type PatentinoFormData = {
  type: string;
  code: string;
  expiresAt: string;
  releaseAt: string;
  isActive: boolean;
};

const emptyForm: PatentinoFormData = {
  type: "",
  code: "",
  expiresAt: "",
  releaseAt: "",
  isActive: true,
};

const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  return String(dateStr).split("T")[0] ?? "";
};

const formatDateDisplay = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
};

export function PatentiniDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: PatentiniDialogProps): React.ReactElement {
  const {
    patentini,
    isLoading,
    isError,
    error,
    createPatentino,
    updatePatentino,
    deletePatentino,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePatentini(userId);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PatentinoFormData>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isSaving = isCreating || isUpdating;

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleStartEdit = (patentino: Patentino) => {
    setEditingId(patentino.id);
    setIsAddingNew(false);
    setFormData({
      type: patentino.type,
      code: patentino.code,
      expiresAt: formatDateForInput(patentino.expiresAt),
      releaseAt: formatDateForInput(patentino.releaseAt),
      isActive: patentino.isActive,
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.type || !formData.code || !formData.expiresAt || !formData.releaseAt) {
      return;
    }

    try {
      if (isAddingNew) {
        await createPatentino({
          type: formData.type,
          code: formData.code,
          expiresAt: new Date(formData.expiresAt).toISOString(),
          releaseAt: new Date(formData.releaseAt).toISOString(),
          isActive: formData.isActive,
        });
      } else if (editingId) {
        await updatePatentino({
          patentinoId: editingId,
          data: {
            type: formData.type,
            code: formData.code,
            expiresAt: new Date(formData.expiresAt).toISOString(),
            releaseAt: new Date(formData.releaseAt).toISOString(),
            isActive: formData.isActive,
          },
        });
      }
      handleCancel();
    } catch {
      // Error handled by hook toast
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deletePatentino(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch {
      // Error handled by hook toast
    }
  };

  const isFormValid =
    formData.type.trim() !== "" &&
    formData.code.trim() !== "" &&
    formData.expiresAt !== "" &&
    formData.releaseAt !== "";

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="h-full w-[500px] max-w-[90vw]">
          <DrawerHeader className="border-b">
            <DrawerTitle>Patentini di {userName}</DrawerTitle>
            <DrawerDescription>
              Gestisci i patentini associati a questo utente.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Spinner size={24} ariaLabel="Caricamento patentini" />
                <p className="text-sm text-gray-500">Caricamento patentini...</p>
              </div>
            ) : isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                <p className="text-sm font-medium">Errore nel caricamento</p>
                {error?.message && (
                  <p className="text-xs mt-1">{error.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Lista patentini esistenti */}
                {patentini.length === 0 && !isAddingNew ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Nessun patentino associato.</p>
                    <p className="text-xs mt-1">
                      Clicca su &quot;Aggiungi patentino&quot; per crearne uno.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patentini.map((patentino) =>
                      editingId === patentino.id ? (
                        <PatentinoForm
                          key={patentino.id}
                          formData={formData}
                          setFormData={setFormData}
                          onSave={handleSave}
                          onCancel={handleCancel}
                          isSaving={isSaving}
                          isValid={isFormValid}
                        />
                      ) : (
                        <PatentinoCard
                          key={patentino.id}
                          patentino={patentino}
                          onEdit={() => handleStartEdit(patentino)}
                          onDelete={() => setDeleteConfirmId(patentino.id)}
                          disabled={isAddingNew || editingId !== null}
                        />
                      )
                    )}
                  </div>
                )}

                {/* Form per nuovo patentino */}
                {isAddingNew && (
                  <PatentinoForm
                    formData={formData}
                    setFormData={setFormData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isSaving={isSaving}
                    isValid={isFormValid}
                  />
                )}
              </div>
            )}
          </div>

          <DrawerFooter className="border-t">
            <Button
              variant="outline"
              onClick={handleStartAdd}
              disabled={isAddingNew || editingId !== null || isLoading}
            >
              <Plus className="size-4 mr-2" />
              Aggiungi patentino
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Alert dialog per conferma eliminazione */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo patentino? Questa azione non
              può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface PatentinoCardProps {
  patentino: Patentino;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}

function PatentinoCard({
  patentino,
  onEdit,
  onDelete,
  disabled,
}: PatentinoCardProps): React.ReactElement {
  const isExpired = new Date(patentino.expiresAt) < new Date();

  return (
    <div className="rounded-lg border bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{patentino.type}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
              {patentino.code}
            </span>
            {patentino.isActive ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Attivo
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                Non attivo
              </span>
            )}
            {isExpired && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Scaduto
              </span>
            )}
          </div>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Rilascio: {formatDateDisplay(patentino.releaseAt)}</span>
            <span>Scadenza: {formatDateDisplay(patentino.expiresAt)}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            disabled={disabled}
            className="size-8"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={disabled}
            className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PatentinoFormProps {
  formData: PatentinoFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatentinoFormData>>;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isValid: boolean;
}

function parseDateForCalendar(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatDateForCalendarDisplay(dateStr: string): string {
  const d = parseDateForCalendar(dateStr);
  if (!d) return "Seleziona data";
  return format(d, "dd/MM/yyyy", { locale: it });
}

function PatentinoForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  isSaving,
  isValid,
}: PatentinoFormProps): React.ReactElement {
  const [releaseAtOpen, setReleaseAtOpen] = useState(false);
  const [expiresAtOpen, setExpiresAtOpen] = useState(false);

  const releaseAtDate = useMemo(
    () => parseDateForCalendar(formData.releaseAt),
    [formData.releaseAt]
  );
  const expiresAtDate = useMemo(
    () => parseDateForCalendar(formData.expiresAt),
    [formData.expiresAt]
  );

  const handleReleaseAtSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      setFormData((prev) => ({
        ...prev,
        releaseAt: format(date, "yyyy-MM-dd"),
      }));
      setReleaseAtOpen(false);
    },
    [setFormData]
  );

  const handleExpiresAtSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      setFormData((prev) => ({
        ...prev,
        expiresAt: format(date, "yyyy-MM-dd"),
      }));
      setExpiresAtOpen(false);
    },
    [setFormData]
  );

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Input
            id="type"
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, type: e.target.value }))
            }
            placeholder="es. Patentino fitosanitario"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Codice *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, code: e.target.value }))
            }
            placeholder="es. ABC123"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="releaseAt">Data rilascio *</Label>
          <Popover open={releaseAtOpen} onOpenChange={setReleaseAtOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-10 rounded-xl border border-black/5 bg-white hover:bg-white",
                  !formData.releaseAt && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateForCalendarDisplay(formData.releaseAt)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-transparent border-0 shadow-none" align="start">
              <Calendar
                mode="single"
                selected={releaseAtDate}
                onSelect={handleReleaseAtSelect}
                initialFocus
                locale={it}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Data scadenza *</Label>
          <Popover open={expiresAtOpen} onOpenChange={setExpiresAtOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-10 rounded-xl border border-black/5 bg-white hover:bg-white",
                  !formData.expiresAt && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateForCalendarDisplay(formData.expiresAt)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-transparent border-0 shadow-none" align="start">
              <Calendar
                mode="single"
                selected={expiresAtDate}
                onSelect={handleExpiresAtSelect}
                initialFocus
                locale={it}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, isActive: checked === true }))
          }
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Attivo
        </Label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="size-4 mr-1" />
          Annulla
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !isValid}
        >
          <Check className="size-4 mr-1" />
          {isSaving ? "Salvataggio..." : "Salva"}
        </Button>
      </div>
    </div>
  );
}
