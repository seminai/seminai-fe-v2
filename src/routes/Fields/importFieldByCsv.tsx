import * as React from "react";
import { useState } from "react";
import { type BulkFieldInput } from "@/api/fields";
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
import { CsvFieldMapper } from "@/utils/csvFieldMapper";

interface ImportFieldByCsvProps {
  companies: Company[];
  onImportSuccess: (fields: BulkFieldInput[]) => void;
  onCloseParentDrawer?: () => void;
  slot?: string;
}

/**
 * ImportFieldByCsv - Componente per gestire l'importazione di campi da file CSV
 * Contiene tutta la logica di parsing, validazione e importazione
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
   * Gestisce la selezione del file CSV e avvia il processo di importazione
   * Aggiunge i dati alla tabella senza validazioni bloccanti
   */
  const handleFileSelect = async (file: File): Promise<void> => {
    if (!selectedCompanyId) {
      toast.error("Seleziona un'azienda prima di importare il file");
      return;
    }

    setIsProcessing(true);
    setImportErrors([]);
    setImportWarnings([]);

    try {
      const mapper = new CsvFieldMapper(companies);
      // Passa l'ID dell'azienda selezionata al mapper
      const result = await mapper.parseFile(file, selectedCompanyId);

      // Gestisci gli errori bloccanti (es. file vuoto o corrotto)
      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        toast.error(`Errore nel parsing del file: ${result.errors[0]}`);
        setIsProcessing(false);
        return;
      }

      // Mostra i warnings ma non bloccare l'importazione
      if (result.warnings.length > 0) {
        setImportWarnings(result.warnings);
      }

      if (result.fields.length === 0) {
        toast.error("Nessun campo trovato nel file");
        setIsProcessing(false);
        return;
      }

      // Chiama la callback per aggiungere i campi alla tabella
      onImportSuccess(result.fields);

      // Chiudi il dialog e resetta lo stato
      setIsDrawerOpen(false);
      setImportErrors([]);
      setImportWarnings([]);
      setSelectedCompanyId("");
      onCloseParentDrawer?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Errore sconosciuto";
      toast.error(`Errore nell'importazione: ${errorMessage}`);
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
          <DrawerTitle>Importa Campi da CSV</DrawerTitle>
          <DrawerDescription>
            Seleziona l'azienda e carica un file CSV con i dati dei campi.
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
              onFileSelect={handleFileSelect}
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
              <span>Elaborazione file in corso...</span>
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
            <h4 className="font-medium text-sm mb-2">Formato CSV Richiesto:</h4>
            <p className="text-xs text-gray-600 mb-2">
              Il file deve supportare il template AGEA/SIAN con le seguenti
              colonne (o equivalenti):
            </p>
            <ul className="text-xs text-gray-600 space-y-1 mb-3">
              <li>
                <strong>Campi principali:</strong> Unità Produttiva (Nome),
                Comune Descrizione (Città), Sezione, Foglio, Particella,
                Superficie Catastale
              </li>
              <li>
                <strong>Altri campi supportati:</strong> Superficie Agricola,
                Superficie Grafica, Uso Suolo Primario, Qualità, ecc.
              </li>
            </ul>
            <a
              href="/templates/campi_esempio.csv"
              download="campi_esempio.csv"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Upload className="h-3 w-3" />
              Scarica template CSV di esempio (Nuovo formato)
            </a>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
