import * as React from "react";
import { useState } from "react";
import {
  type BulkFieldInput,
  fieldsApiService,
} from "@/api/fields";
import { type Company } from "@/api/companies";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { CsvFieldImporter } from "@/components/organism/CsvFieldImporter";

interface ImportFieldByCsvProps {
  companies: Company[];
  onImportSuccess: (fields: BulkFieldInput[]) => void;
  onCloseParentDrawer?: () => void;
  slot?: string;
}

/**
 * ImportFieldByCsv - Componente per gestire l'estrazione automatica di campi da file CSV
 * Utilizza l'API backend per estrarre automaticamente i dati dei campi
 */
export function ImportFieldByCsv({
  companies,
  onImportSuccess,
  onCloseParentDrawer,
}: ImportFieldByCsvProps): React.ReactElement {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  /**
   * Gestisce l'estrazione automatica dei campi tramite API
   */
  const handleExtraction = async (file: File): Promise<void> => {
    if (!selectedCompanyId) {
      toast.error("Seleziona un'azienda prima di importare il file");
      return;
    }

    setIsProcessing(true);
    setImportErrors([]);
    setImportWarnings([]);

    try {
      toast.info("Estrazione campi in corso...", {
        description: "L'operazione potrebbe richiedere alcuni minuti",
      });

      const response = await fieldsApiService.startJobFieldExtraction(
        selectedCompanyId,
        file
      );

      if (!response.data?.fields || response.data.fields.length === 0) {
        toast.error("Nessun campo estratto dal file");
        setIsProcessing(false);
        return;
      }

      // Mappa i campi estratti al formato BulkFieldInput
      const mappedFields: BulkFieldInput[] = response.data.fields.map(
        (field) => ({
          companyId: field.companyId,
          name: field.name,
          address: field.address || "",
          sezione: field.sezione || "",
          foglio: field.foglio || "",
          particella: field.particella || "",
          superficieCatastaleMq: field.superficieCatastaleMq || 0,
          coordinates: field.coordinates || [],
          latitude: field.latitude,
          longitude: field.longitude,
          polygon: field.polygon,
          gisHa: field.gisHa,
          sauHa: field.sauHa,
          ph: field.ph,
          nitrogen: field.nitrogen,
          phosphorus: field.phosphorus,
          potassium: field.potassium,
          calcium: field.calcium,
          magnesium: field.magnesium,
          soilType: field.soilType,
          uso: field.uso,
          qualita: field.qualita,
          subalterno: field.subalterno,
          nation: field.nation,
          region: field.region,
          city: field.city,
          cap: field.cap,
          variazioneMq: field.variazioneMq,
          inizioConduzione: field.inizioConduzione,
          fineConduzione: field.fineConduzione,
        })
      );

      // Chiama la callback per aggiungere i campi alla tabella
      onImportSuccess(mappedFields);

      toast.success(
        `${response.data.extractedCount} camp${
          response.data.extractedCount === 1 ? "o estratto" : "i estratti"
        } con successo`
      );

      // Chiudi il dialog e resetta lo stato
      setIsDrawerOpen(false);
      setImportErrors([]);
      setImportWarnings([]);
      setSelectedCompanyId("");
      onCloseParentDrawer?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error(`Errore nell'estrazione: ${errorMessage}`);
      setImportErrors([errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };


  /**
   * Resetta lo stato quando il dialog viene chiuso
   */
  const handleDrawerOpenChange = (open: boolean): void => {
    setIsDrawerOpen(open);
    if (!open) {
      setImportErrors([]);
      setImportWarnings([]);
      setSelectedCompanyId("");
    }
  };

  return (
    <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importa file
        </Button>
      </DrawerTrigger>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-2"
      >
        <DrawerHeader>
          <DrawerTitle>Estrazione Automatica Campi da CSV</DrawerTitle>
          <DrawerDescription>
            Seleziona l'azienda e carica un file CSV. Il sistema estrarrà
            automaticamente i dati dei campi.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Azienda di destinazione
            </label>
            <Select
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un'azienda" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={`transition-opacity duration-200 ${
              !selectedCompanyId ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <CsvFieldImporter
              onFileSelect={handleExtraction}
              isProcessing={isProcessing}
            />
          </div>

          {!selectedCompanyId && (
            <p className="text-xs text-muted-foreground text-center">
              Seleziona un'azienda per abilitare l'upload del file
            </p>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size={20} ariaLabel="Elaborazione file" />
              <span>
                Estrazione campi in corso... (potrebbe richiedere alcuni minuti)
              </span>
            </div>
          )}

          {importErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">
                  Errori trovati ({importErrors.length}):
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {importErrors.slice(0, 10).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {importErrors.length > 10 && (
                    <li className="text-muted-foreground">
                      ... e altri {importErrors.length - 10} errori
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {importWarnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">
                  Avvisi ({importWarnings.length}):
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {importWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Estrazione Automatica</h4>
            <div className="text-xs text-gray-600 space-y-2">
              <p>
                L'estrazione automatica analizza il file CSV e estrae
                automaticamente i dati dei campi, inclusi coordinate,
                informazioni catastali e dati del suolo. L'operazione potrebbe
                richiedere alcuni minuti.
              </p>
              <p className="font-medium text-gray-700">
                Il sistema estrarrà automaticamente:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Coordinate geografiche (latitudine, longitudine)</li>
                <li>Dati catastali (sezione, foglio, particella)</li>
                <li>Informazioni del suolo (tipo, pH, nutrienti)</li>
                <li>Superfici (catastale, SAU, GIS)</li>
                <li>Altri dati disponibili nel file</li>
              </ul>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
