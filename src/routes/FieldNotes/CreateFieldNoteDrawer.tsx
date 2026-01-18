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
import { FieldNoteCategory, FieldNoteStatus } from "@/api/field-notes";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

interface CreateFieldNoteDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Array<{ id: string; name: string }>;
  productionUnits: Array<{
    productionUnit: { id: string; name: string };
    companyId: string;
    fields?: Array<{ id: string; name: string }>;
  }>;
  fields: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

export function CreateFieldNoteDrawer({
  open,
  onOpenChange,
  companies,
  productionUnits,
  fields: _fields,
  products,
  onSave,
}: CreateFieldNoteDrawerProps) {
  const [category, setCategory] = useState<string>(FieldNoteCategory.OPERATION);
  const [rawContent, setRawContent] = useState<string>("");
  const [status, setStatus] = useState<string>(FieldNoteStatus.PENDING);
  const [operationDate, setOperationDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedProductionUnitId, setSelectedProductionUnitId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [notes, setNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset quando si chiude la drawer
  useEffect(() => {
    if (!open) {
      setCategory(FieldNoteCategory.OPERATION);
      setRawContent("");
      setStatus(FieldNoteStatus.PENDING);
      setOperationDate(new Date().toISOString().split("T")[0]);
      setSelectedCompanyId("");
      setSelectedProductionUnitId("");
      setSelectedProductId("");
      setLatitude(null);
      setLongitude(null);
      setNotes("");
    }
  }, [open]);

  // Reset unità produttiva quando cambia azienda
  useEffect(() => {
    if (selectedCompanyId) {
      setSelectedProductionUnitId("");
    }
  }, [selectedCompanyId]);

  // Filtra unità produttive per azienda selezionata
  const filteredProductionUnits = useMemo(() => {
    if (!selectedCompanyId) return [];
    return productionUnits.filter((pu) => pu.companyId === selectedCompanyId);
  }, [selectedCompanyId, productionUnits]);

  // Ottieni i campi dell'unità produttiva selezionata (per mostrare info)
  const selectedProductionUnitFields = useMemo(() => {
    if (!selectedProductionUnitId) return [];
    const selectedPU = productionUnits.find(
      (pu) => pu.productionUnit.id === selectedProductionUnitId
    );
    if (!selectedPU || !selectedPU.fields) return [];
    return selectedPU.fields;
  }, [selectedProductionUnitId, productionUnits]);

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

  const canSave = rawContent.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const data: Record<string, unknown> = {
        category,
        rawContent,
        status,
        operationDate: operationDate ? new Date(operationDate).toISOString() : undefined,
        productionUnitId: selectedProductionUnitId || undefined,
        productId: selectedProductId || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
      };

      await onSave(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-[95vw] !max-w-[95vw] sm:!w-1/2 sm:!max-w-[50vw] overflow-x-hidden"
      >
        <DrawerHeader className="px-4 sm:px-6">
          <DrawerTitle className="text-lg sm:text-xl">Nuovo elemento</DrawerTitle>
          <DrawerDescription className="text-sm mt-1.5">
            Compila i campi per aggiungere un nuovo elemento alla tabella
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-180px)]">
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

          {/* Unità Produttiva */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Unità Produttiva
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
              <SearchableSelect
                value={selectedProductionUnitId}
                options={productionUnitOptions}
                placeholder="Seleziona unità produttiva..."
                searchPlaceholder="Cerca unità produttiva..."
                emptyMessage="Nessuna unità produttiva trovata"
                onChange={(value) => setSelectedProductionUnitId(value)}
                wrapperClassName="w-full"
              />
            )}
          </div>

          {/* Info Campi - Mostra quanti campi verranno associati */}
          {selectedProductionUnitId && selectedProductionUnitFields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Campi associati
              </Label>
              <div className="text-sm text-muted-foreground border border-blue-200 bg-blue-50 rounded-md p-3">
                <p className="font-semibold text-blue-900 mb-1">
                  {selectedProductionUnitFields.length}{" "}
                  {selectedProductionUnitFields.length === 1 ? "campo" : "campi"} verranno
                  associati automaticamente:
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  {selectedProductionUnitFields.slice(0, 5).map((field) => (
                    <li key={field.id}>{field.name}</li>
                  ))}
                  {selectedProductionUnitFields.length > 5 && (
                    <li className="text-blue-600 italic">
                      ... e altri {selectedProductionUnitFields.length - 5} campi
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

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
