import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSearchableSelect } from "@/routes/DosageManager/MultiSearchableSelect";
import { Loader2, MapPin, Paperclip, Search, Upload } from "lucide-react";
import { FieldNoteGpsMap } from "./FieldNoteGpsMap";
import { toast } from "sonner";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_HEADERS = {
  "Accept-Language": "it",
  "User-Agent": "SeminaiFieldNotes/1.0",
};

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}
import type { FieldNote, FieldNoteAttachment } from "@/api/field-notes";
import { FieldNoteCategory, FieldNoteStatus } from "@/api/field-notes";
import type {
  FieldNoteDetailsFormActions,
  FieldNoteDetailsFormDerived,
  FieldNoteDetailsFormOptions,
  FieldNoteDetailsFormState,
} from "./useFieldNoteDetailsForm";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function FieldNoteMetaSection({
  fieldNote,
  formState,
  formActions,
}: {
  fieldNote: FieldNote;
  formState: FieldNoteDetailsFormState;
  formActions: FieldNoteDetailsFormActions;
}) {
  const {
    category,
    rawContent,
    status,
    operationDate,
  } = formState;
  const {
    setCategory,
    setRawContent,
    setStatus,
    setOperationDate,
  } = formActions;

  return (
    <>
      {fieldNote.aiConfidenceScore !== null && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground">
            Confidence AI
          </Label>
          <div className="flex items-center gap-2">
            <Badge
              className={
                fieldNote.aiConfidenceScore >= 0.8
                  ? "bg-emerald-100 text-emerald-700"
                  : fieldNote.aiConfidenceScore >= 0.5
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
              }
            >
              {Math.round(fieldNote.aiConfidenceScore * 100)}%
            </Badge>
            {fieldNote.metadata &&
              typeof fieldNote.metadata === "object" &&
              "aiProcessed" in fieldNote.metadata &&
              Boolean(fieldNote.metadata.aiProcessed) && (
                <span className="text-xs text-muted-foreground">
                  Elaborata da AI
                </span>
              )}
          </div>
        </div>
      )}

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
            <SelectItem value={FieldNoteCategory.MAINTENANCE}>
              Manutenzione
            </SelectItem>
            <SelectItem value={FieldNoteCategory.OTHER}>Altro</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            <SelectItem value={FieldNoteStatus.MANUALLY_REVIEWED}>
              Revisionata
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

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
    </>
  );
}

export function FieldNoteRelationsSection({
  formState,
  formActions,
  formOptions,
  formDerived,
}: {
  formState: FieldNoteDetailsFormState;
  formActions: FieldNoteDetailsFormActions;
  formOptions: FieldNoteDetailsFormOptions;
  formDerived: FieldNoteDetailsFormDerived;
}) {
  const {
    selectedCompanyId,
    selectedProductionUnitIds,
    selectedFieldIds,
    selectedProductId,
  } = formState;
  const {
    setSelectedCompanyId,
    setSelectedProductionUnitIds,
    setSelectedFieldIds,
    setSelectedProductId,
  } = formActions;
  const { companyOptions, productionUnitOptions, fieldOptions, productOptions } =
    formOptions;
  const { filteredProductionUnits, availableFields } = formDerived;

  return (
    <>
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
    </>
  );
}

export function FieldNoteExtraSection({
  fieldNote,
  formState,
  formActions,
  attachments,
  onUploadAttachment,
  isUploadingAttachment,
}: {
  fieldNote: FieldNote;
  formState: FieldNoteDetailsFormState;
  formActions: FieldNoteDetailsFormActions;
  attachments: FieldNoteAttachment[];
  onUploadAttachment: (file: File) => Promise<void>;
  isUploadingAttachment: boolean;
}) {
  const { latitude, longitude, notes } = formState;
  const { setLatitude, setLongitude, setNotes } = formActions;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSearchPlace = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const params = new URLSearchParams({ q, format: "json", limit: "5" });
      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: NOMINATIM_HEADERS,
      });
      const data = (await res.json()) as NominatimResult[];
      setSearchResults(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) toast.info("Nessun risultato trovato");
    } catch {
      toast.error("Errore nella ricerca del luogo");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (r: NominatimResult) => {
    setLatitude(parseFloat(r.lat));
    setLongitude(parseFloat(r.lon));
    setSearchResults([]);
    setSearchQuery(r.display_name);
  };

  const handleUseCurrentPosition = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalizzazione non supportata");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsGettingLocation(false);
        toast.success("Posizione attuale impostata");
      },
      () => {
        setIsGettingLocation(false);
        toast.error("Impossibile ottenere la posizione");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPendingFile(file);
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    try {
      await onUploadAttachment(pendingFile);
      setPendingFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      // errors handled upstream
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-muted-foreground">GPS</Label>
        <p className="text-xs text-muted-foreground">
          La mappa mostra la posizione (tua o della nota). Cerca un indirizzo o clicca sulla
          mappa per impostare la posizione da salvare.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchPlace()}
              placeholder="Cerca indirizzo o luogo..."
              className="h-11 sm:h-10 pl-9 bg-background text-foreground border-border placeholder:text-muted-foreground"
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background text-foreground shadow-lg max-h-48 overflow-auto">
                {searchResults.map((r, i) => (
                  <li key={`${r.lat}-${r.lon}-${i}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted truncate"
                      onClick={() => handleSelectSearchResult(r)}
                    >
                      {r.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 border-border bg-background"
            onClick={handleSearchPlace}
            disabled={isSearching}
            title="Cerca"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleUseCurrentPosition}
          disabled={isGettingLocation}
        >
          {isGettingLocation ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ottenendo posizione...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Usa posizione attuale
            </>
          )}
        </Button>
        <FieldNoteGpsMap
          latitude={latitude}
          longitude={longitude}
          onLocationSelect={handleLocationSelect}
          className="w-full"
        />
        {latitude != null && longitude != null && (
          <p className="text-xs text-muted-foreground">
            Posizione da salvare: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-muted-foreground">Note</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note aggiuntive..."
          className="min-h-[80px] resize-y"
        />
      </div>

      {fieldNote.extractedData && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground">
            Dati Estratti
          </Label>
          <div className="text-sm text-muted-foreground border border-blue-200 bg-blue-50 rounded-md p-3">
            {fieldNote.extractedData.operation && (
              <p className="mb-1">
                <span className="font-semibold">Operazione:</span>{" "}
                {fieldNote.extractedData.operation}
              </p>
            )}
            {fieldNote.extractedData.recognizedFields &&
              fieldNote.extractedData.recognizedFields.length > 0 && (
                <p className="mb-1">
                  <span className="font-semibold">Campi riconosciuti:</span>{" "}
                  {fieldNote.extractedData.recognizedFields
                    .map((field) => field.name)
                    .join(", ")}
                </p>
              )}
            {fieldNote.extractedData.recognizedProducts &&
              fieldNote.extractedData.recognizedProducts.length > 0 && (
                <p>
                  <span className="font-semibold">Prodotti riconosciuti:</span>{" "}
                  {fieldNote.extractedData.recognizedProducts
                    .map(
                      (product) =>
                        `${product.name} (${product.quantity || ""} ${
                          product.unit || ""
                        })`
                    )
                    .join(", ")}
                </p>
              )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-muted-foreground">
          Allegati
        </Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Seleziona file
            </Button>
            <Button
              type="button"
              className="h-10"
              onClick={handleUpload}
              disabled={!pendingFile || isUploadingAttachment}
            >
              {isUploadingAttachment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Caricamento...
                </>
              ) : (
                <>
                  <Paperclip className="h-4 w-4 mr-2" />
                  Carica
                </>
              )}
            </Button>
          </div>
          {pendingFile && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="font-medium">{pendingFile.name}</span>
              <span>{formatFileSize(pendingFile.size)}</span>
            </div>
          )}
          {attachments.length === 0 ? (
            <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-3">
              Nessun allegato presente
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:border-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="font-medium">{attachment.fileName}</span>
                  </div>
                  <span className="text-slate-400">
                    {formatFileSize(attachment.fileSize)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
