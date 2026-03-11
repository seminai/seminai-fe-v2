import { useEffect, useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { FieldNote, FieldNoteAttachment } from "@/api/field-notes";
import { FieldNoteCategory, FieldNoteStatus } from "@/api/field-notes";
import { FieldNoteDetailsDrawerContent } from "./FieldNoteDetailsDrawerContent";
import { useFieldNoteDetailsForm } from "./useFieldNoteDetailsForm";
import { useUploadFieldNoteAttachmentMutation } from "@/hooks/useFieldNoteAttachments";

interface FieldNoteDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldNote: FieldNote | null;
  companies: Array<{ id: string; name: string }>;
  productionUnits: Array<{
    productionUnit: { id: string; name: string };
    companyId: string;
    fields?: Array<{ id: string; name: string }>;
  }>;
  fields: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  /** When true, render only the panel content (no Drawer wrapper). For use inside SplitDrawerLayout. */
  contentOnly?: boolean;
}

export function FieldNoteDetailsDrawer({
  open,
  onOpenChange,
  fieldNote,
  companies,
  productionUnits,
  products,
  onSave,
  contentOnly = false,
}: FieldNoteDetailsDrawerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [attachments, setAttachments] = useState<FieldNoteAttachment[]>([]);
  const hasRequestedLocationForDetails = useRef(false);

  const { mutateAsync: uploadAttachment, isPending: isUploadingAttachment } =
    useUploadFieldNoteAttachmentMutation();

  const { formState, formActions, formOptions, formDerived } =
    useFieldNoteDetailsForm({
      fieldNote,
      open,
      companies,
      productionUnits,
      products,
    });

  useEffect(() => {
    if (fieldNote) {
      setAttachments(
        Array.isArray(fieldNote.attachments) ? fieldNote.attachments : [],
      );
    }
  }, [fieldNote]);

  // All'apertura: se la nota non ha coordinate, mostra subito la posizione attuale sulla mappa
  useEffect(() => {
    if (!open) {
      hasRequestedLocationForDetails.current = false;
      return;
    }
    if (
      !fieldNote ||
      !navigator.geolocation ||
      hasRequestedLocationForDetails.current
    )
      return;
    const hasCoords = fieldNote.latitude != null && fieldNote.longitude != null;
    if (hasCoords) return;
    hasRequestedLocationForDetails.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        formActions.setLatitude(position.coords.latitude);
        formActions.setLongitude(position.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [open, fieldNote, formActions]);

  const handleUploadAttachment = async (file: File) => {
    if (!fieldNote) return;
    try {
      const attachment = await uploadAttachment({
        fieldNoteId: fieldNote.id,
        file,
      });
      setAttachments((prev) => [...prev, attachment]);
      toast.success("Allegato caricato con successo");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error("Errore durante il caricamento", {
        description: errorMessage,
      });
      throw error;
    }
  };

  const canSave = formState.rawContent.trim().length > 0 && fieldNote !== null;

  const handleSave = async () => {
    if (!canSave || !fieldNote) return;

    setIsSaving(true);
    try {
      const data: Record<string, unknown> = {
        category: formState.category as FieldNoteCategory,
        rawContent: formState.rawContent,
        status: formState.status as FieldNoteStatus,
        operationDate: formState.operationDate
          ? new Date(formState.operationDate).toISOString()
          : undefined,
        fieldId:
          formState.selectedFieldIds.length === 1
            ? formState.selectedFieldIds[0]
            : formState.selectedFieldIds.length > 1
              ? formState.selectedFieldIds[0]
              : null,
        fieldIds:
          formState.selectedFieldIds.length > 0
            ? formState.selectedFieldIds
            : undefined,
        productionUnitId:
          formState.selectedProductionUnitIds.length === 1
            ? formState.selectedProductionUnitIds[0]
            : formState.selectedProductionUnitIds.length > 1
              ? formState.selectedProductionUnitIds[0]
              : null,
        productionUnitIds:
          formState.selectedProductionUnitIds.length > 0
            ? formState.selectedProductionUnitIds
            : undefined,
        productId: formState.selectedProductId || null,
        latitude: formState.latitude || undefined,
        longitude: formState.longitude || undefined,
        notes: formState.notes || undefined,
      };

      await onSave(fieldNote.id, data);
      onOpenChange(false);
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!fieldNote) {
    return null;
  }

  const panelContent = (
    <>
      <FieldNoteDetailsDrawerContent
        fieldNote={fieldNote}
        formState={formState}
        formActions={formActions}
        formOptions={formOptions}
        formDerived={formDerived}
        attachments={attachments}
        onUploadAttachment={handleUploadAttachment}
        isUploadingAttachment={isUploadingAttachment}
      />

      <div className="flex flex-row items-center justify-end gap-2 border-t border-border/50 px-4 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="h-11 sm:h-10 px-4 sm:px-3"
        >
          Annulla
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="h-11 sm:h-10 px-5 sm:px-4"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : (
            "Salva"
          )}
        </Button>
      </div>
    </>
  );

  if (contentOnly) {
    return (
      <div className="flex flex-col h-full overflow-y-auto bg-white">
        <div className="flex flex-col gap-1.5 px-4 sm:px-6 py-4">
          <h2 className="text-foreground font-semibold text-lg sm:text-xl">
            Dettagli Nota di Campo
          </h2>
          <p className="text-muted-foreground text-sm">
            Visualizza e modifica i dettagli della nota di campo
          </p>
        </div>
        {panelContent}
      </div>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-[95vw] !max-w-[95vw] sm:!w-1/2 sm:!max-w-[50vw] overflow-x-hidden"
      >
        <DrawerHeader className="px-4 sm:px-6">
          <DrawerTitle className="text-lg sm:text-xl">
            Dettagli Nota di Campo
          </DrawerTitle>
          <DrawerDescription className="text-sm mt-1.5">
            Visualizza e modifica i dettagli della nota di campo
          </DrawerDescription>
        </DrawerHeader>
        {panelContent}
      </DrawerContent>
    </Drawer>
  );
}
