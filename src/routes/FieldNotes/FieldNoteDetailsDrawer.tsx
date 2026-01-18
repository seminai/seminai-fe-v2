import { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { FieldNoteCategory, FieldNoteStatus, type FieldNote } from "@/api/field-notes";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSearchableSelect } from "@/routes/DosageManager/MultiSearchableSelect";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
}

export function FieldNoteDetailsDrawer({
  open,
  onOpenChange,
  fieldNote,
  companies,
  productionUnits,
  fields: _fields,
  products,
  onSave,
}: FieldNoteDetailsDrawerProps) {
  const [category, setCategory] = useState<string>(FieldNoteCategory.OPERATION);
  const [rawContent, setRawContent] = useState<string>("");
  const [status, setStatus] = useState<string>(FieldNoteStatus.PENDING);
  const [operationDate, setOperationDate] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedProductionUnitIds, setSelectedProductionUnitIds] = useState<string[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [notes, setNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Carica i dati quando si apre il drawer o cambia fieldNote
  useEffect(() => {
    if (fieldNote && open) {
      setCategory(fieldNote.category);
      setRawContent(fieldNote.rawContent || "");
      setStatus(fieldNote.status);
      setOperationDate(fieldNote.operationDate ? new Date(fieldNote.operationDate).toISOString().split("T")[0] : "");
      setSelectedProductId(fieldNote.productId || "");
      setLatitude(fieldNote.latitude);
      setLongitude(fieldNote.longitude);
      setNotes(fieldNote.notes || "");

      // Trova companyId dai dati annidati o dalla company a livello root
      let companyIdToSet = "";
      if (fieldNote.company?.id) {
        companyIdToSet = fieldNote.company.id;
      } else if (fieldNote.field && !Array.isArray(fieldNote.field) && fieldNote.field.company?.id) {
        companyIdToSet = fieldNote.field.company.id;
      } else if (fieldNote.product?.company?.id) {
        companyIdToSet = fieldNote.product.company.id;
      } else if (fieldNote.productionUnit?.company?.id) {
        companyIdToSet = fieldNote.productionUnit.company.id;
      }

      // Estrai productionUnitIds - può essere un singolo valore o multiplo
      const productionUnitIdsToSet: string[] = [];
      if (fieldNote.productionUnitId) {
        productionUnitIdsToSet.push(fieldNote.productionUnitId);
      }
      if (fieldNote.productionUnit?.id && !productionUnitIdsToSet.includes(fieldNote.productionUnit.id)) {
        productionUnitIdsToSet.push(fieldNote.productionUnit.id);
      }

      // Estrai fieldIds - può essere un singolo valore o multiplo (da field array)
      const fieldIdsToSet: string[] = [];
      if (fieldNote.fieldId) {
        fieldIdsToSet.push(fieldNote.fieldId);
      }
      if (Array.isArray(fieldNote.field)) {
        fieldNote.field.forEach((f) => {
          if (f.id && !fieldIdsToSet.includes(f.id)) {
            fieldIdsToSet.push(f.id);
          }
        });
      } else if (fieldNote.field?.id && !fieldIdsToSet.includes(fieldNote.field.id)) {
        fieldIdsToSet.push(fieldNote.field.id);
      }

      setSelectedCompanyId(companyIdToSet);
      setSelectedProductionUnitIds(productionUnitIdsToSet);
      setSelectedFieldIds(fieldIdsToSet);
    }
  }, [fieldNote, open, productionUnits]);

  // Reset unità produttive e campi quando cambia azienda
  useEffect(() => {
    if (selectedCompanyId && !productionUnits.some((pu) => pu.companyId === selectedCompanyId && selectedProductionUnitIds.includes(pu.productionUnit.id))) {
      setSelectedProductionUnitIds([]);
      setSelectedFieldIds([]);
    }
  }, [selectedCompanyId, selectedProductionUnitIds, productionUnits]);

  // Filtra unità produttive per azienda selezionata
  const filteredProductionUnits = useMemo(() => {
    if (!selectedCompanyId) return [];
    return productionUnits.filter((pu) => pu.companyId === selectedCompanyId);
  }, [selectedCompanyId, productionUnits]);

  // Ottieni i campi delle unità produttive selezionate
  const availableFields = useMemo(() => {
    if (selectedProductionUnitIds.length === 0) return [];
    const allFields: Array<{ id: string; name: string }> = [];
    selectedProductionUnitIds.forEach((puId) => {
      const selectedPU = productionUnits.find(
        (pu) => pu.productionUnit.id === puId
      );
      if (selectedPU && selectedPU.fields) {
        selectedPU.fields.forEach((field) => {
          if (!allFields.some((f) => f.id === field.id)) {
            allFields.push(field);
          }
        });
      }
    });
    return allFields;
  }, [selectedProductionUnitIds, productionUnits]);

  // Opzioni per i select
  const companyOptions = useMemo(() => {
    return companies.map((c) => ({
      label: c.name,
      value: c.id,
    }));
  }, [companies]);

  const productionUnitOptions = useMemo(() => {
    return filteredProductionUnits.map((pu) => ({
      label: pu.productionUnit.name,
      value: pu.productionUnit.id,
    }));
  }, [filteredProductionUnits]);

  const fieldOptions = useMemo(() => {
    return availableFields.map((f) => ({
      label: f.name,
      value: f.id,
    }));
  }, [availableFields]);

  const productOptions = useMemo(() => {
    return products.map((p) => ({
      label: p.name,
      value: p.id,
    }));
  }, [products]);

  // Ottieni posizione GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La geolocalizzazione non è supportata dal tuo browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsGettingLocation(false);
        toast.success("Posizione GPS ottenuta con successo");
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "Errore nell'ottenere la posizione GPS";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permesso di geolocalizzazione negato";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informazioni di posizione non disponibili";
            break;
          case error.TIMEOUT:
            errorMessage = "Timeout nella richiesta di geolocalizzazione";
            break;
        }
        toast.error(errorMessage);
      }
    );
  };

  const canSave = rawContent.trim().length > 0 && fieldNote !== null;

  const handleSave = async () => {
    if (!canSave || !fieldNote) return;

    setIsSaving(true);
    try {
      const data: Record<string, unknown> = {
        category,
        rawContent,
        status,
        operationDate: operationDate ? new Date(operationDate).toISOString() : undefined,
        fieldId: selectedFieldIds.length === 1 ? selectedFieldIds[0] : selectedFieldIds.length > 1 ? selectedFieldIds[0] : null,
        fieldIds: selectedFieldIds.length > 0 ? selectedFieldIds : undefined,
        productionUnitId: selectedProductionUnitIds.length === 1 ? selectedProductionUnitIds[0] : selectedProductionUnitIds.length > 1 ? selectedProductionUnitIds[0] : null,
        productionUnitIds: selectedProductionUnitIds.length > 0 ? selectedProductionUnitIds : undefined,
        productId: selectedProductId || null,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        notes: notes || undefined,
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-[95vw] !max-w-[95vw] sm:!w-1/2 sm:!max-w-[50vw] overflow-x-hidden"
      >
        <DrawerHeader className="px-4 sm:px-6">
          <DrawerTitle className="text-lg sm:text-xl">Dettagli Nota di Campo</DrawerTitle>
          <DrawerDescription className="text-sm mt-1.5">
            Visualizza e modifica i dettagli della nota di campo
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-180px)]">
          {/* Info AI Confidence Score */}
          {fieldNote.aiConfidenceScore !== null && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Confidence AI
              </Label>
              <div className="flex items-center gap-2">
                <Badge className={fieldNote.aiConfidenceScore >= 0.8 ? "bg-emerald-100 text-emerald-700" : fieldNote.aiConfidenceScore >= 0.5 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                  {Math.round(fieldNote.aiConfidenceScore * 100)}%
                </Badge>
                {fieldNote.metadata && typeof fieldNote.metadata === 'object' && 'aiProcessed' in fieldNote.metadata && Boolean(fieldNote.metadata.aiProcessed) && (
                  <span className="text-xs text-muted-foreground">Elaborata da AI</span>
                )}
              </div>
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Categoria <span className="text-red-500">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FieldNoteCategory.OPERATION}>Operazione</SelectItem>
                <SelectItem value={FieldNoteCategory.OBSERVATION}>Osservazione</SelectItem>
                <SelectItem value={FieldNoteCategory.MEASUREMENT}>Misurazione</SelectItem>
                <SelectItem value={FieldNoteCategory.HARVEST}>Raccolta</SelectItem>
                <SelectItem value={FieldNoteCategory.MAINTENANCE}>Manutenzione</SelectItem>
                <SelectItem value={FieldNoteCategory.OTHER}>Altro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contenuto - Textarea grande */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Contenuto <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="Descrizione della nota..."
              className="min-h-[150px] resize-y"
            />
          </div>

          {/* Stato */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">Stato</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FieldNoteStatus.PENDING}>In Attesa</SelectItem>
                <SelectItem value={FieldNoteStatus.PROCESSING}>Elaborazione</SelectItem>
                <SelectItem value={FieldNoteStatus.PROCESSED}>Processata</SelectItem>
                <SelectItem value={FieldNoteStatus.FAILED}>Fallita</SelectItem>
                <SelectItem value={FieldNoteStatus.MANUALLY_REVIEWED}>Revisionata</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Operazione */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Data Operazione
            </Label>
            <Input
              type="date"
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="h-11 sm:h-10"
            />
          </div>

          {/* Azienda */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">Azienda</Label>
            <SearchableSelect
              value={selectedCompanyId}
              options={companyOptions}
              placeholder="Seleziona azienda..."
              searchPlaceholder="Cerca azienda..."
              emptyMessage="Nessuna azienda trovata"
              onChange={(value) => setSelectedCompanyId(value)}
              wrapperClassName="w-full"
            />
          </div>

          {/* Unità Produttive */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Unità Produttive
            </Label>
            {!selectedCompanyId ? (
              <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-3">
                Seleziona prima un'azienda
              </div>
            ) : filteredProductionUnits.length === 0 ? (
              <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-3">
                Nessuna unità produttiva disponibile per questa azienda
              </div>
            ) : (
              <MultiSearchableSelect
                value={selectedProductionUnitIds}
                options={productionUnitOptions}
                placeholder="Seleziona una o più unità produttive..."
                searchPlaceholder="Cerca unità produttiva..."
                emptyMessage="Nessuna unità produttiva trovata"
                onChange={setSelectedProductionUnitIds}
              />
            )}
          </div>

          {/* Campi */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">Campi</Label>
            {selectedProductionUnitIds.length === 0 ? (
              <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-3">
                Seleziona prima una o più unità produttive
              </div>
            ) : availableFields.length === 0 ? (
              <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-3">
                Nessun campo disponibile per le unità produttive selezionate
              </div>
            ) : (
              <MultiSearchableSelect
                value={selectedFieldIds}
                options={fieldOptions}
                placeholder="Seleziona uno o più campi..."
                searchPlaceholder="Cerca campo..."
                emptyMessage="Nessun campo trovato"
                onChange={setSelectedFieldIds}
              />
            )}
          </div>

          {/* Prodotto */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">Prodotto</Label>
            <SearchableSelect
              value={selectedProductId}
              options={productOptions}
              placeholder="Seleziona prodotto..."
              searchPlaceholder="Cerca prodotto..."
              emptyMessage="Nessun prodotto trovato"
              onChange={(value) => setSelectedProductId(value)}
              wrapperClassName="w-full"
            />
          </div>

          {/* GPS */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">GPS</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="h-11 sm:h-10"
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ottenendo posizione...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Ottieni Posizione
                  </>
                )}
              </Button>
              {latitude != null && longitude != null && (
                <div className="text-sm text-muted-foreground">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">Note</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note aggiuntive..."
              className="min-h-[80px] resize-y"
            />
          </div>

          {/* Info Extracted Data */}
          {fieldNote.extractedData && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Dati Estratti
              </Label>
              <div className="text-sm text-muted-foreground border border-blue-200 bg-blue-50 rounded-md p-3">
                {fieldNote.extractedData.operation && (
                  <p className="mb-1">
                    <span className="font-semibold">Operazione:</span> {fieldNote.extractedData.operation}
                  </p>
                )}
                {fieldNote.extractedData.recognizedFields && fieldNote.extractedData.recognizedFields.length > 0 && (
                  <p className="mb-1">
                    <span className="font-semibold">Campi riconosciuti:</span> {fieldNote.extractedData.recognizedFields.map((f) => f.name).join(", ")}
                  </p>
                )}
                {fieldNote.extractedData.recognizedProducts && fieldNote.extractedData.recognizedProducts.length > 0 && (
                  <p>
                    <span className="font-semibold">Prodotti riconosciuti:</span> {fieldNote.extractedData.recognizedProducts.map((p) => `${p.name} (${p.quantity || ""} ${p.unit || ""})`).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="flex flex-row items-center justify-end gap-2 border-t border-border/50 px-4 sm:px-6 py-4">
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
