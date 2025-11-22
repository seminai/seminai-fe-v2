import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseProductionUnitCSV,
  validateParsedData,
  type ParsedBulkImport,
} from "@/utils/csvProductionUnitParser";
import * as XLSX from "xlsx";

type ProductionUnitCsvImporterProps = {
  onImportSuccess: (data: ParsedBulkImport[]) => void;
};

export const ProductionUnitCsvImporter: React.FC<
  ProductionUnitCsvImporterProps
> = ({ onImportSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<ParsedBulkImport[] | null>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setValidationErrors([]);
    setParsedData(null);

    try {
      let csvText = "";

      // Se è un file Excel, convertilo in CSV
      if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.type.includes("spreadsheet")
      ) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        csvText = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        // Leggi il file CSV
        csvText = await file.text();
      }

      // Parsa il CSV
      const parsed = parseProductionUnitCSV(csvText);

      // Debug: mostra i dati parsati nella console
      console.log("📊 Dati parsati dal CSV:", parsed);
      console.log("📋 Numero di aziende trovate:", parsed.length);

      // Valida i dati
      const validation = validateParsedData(parsed);

      if (!validation.isValid) {
        console.error("❌ Errori di validazione:", validation.errors);
        setValidationErrors(validation.errors);
        toast.error("Il file contiene errori. Controlla i dettagli.");
        return;
      }

      setParsedData(parsed);
      toast.success(
        `File importato con successo! Trovate ${parsed.length} aziende.`
      );
    } catch (error) {
      console.error("Errore nell'importazione del file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      setValidationErrors([errorMessage]);
      toast.error("Errore nell'importazione del file");
    } finally {
      setIsLoading(false);
      // Reset dell'input per permettere di ri-caricare lo stesso file
      event.target.value = "";
    }
  };

  const handleImport = () => {
    if (!parsedData) return;

    onImportSuccess(parsedData);
    setIsOpen(false);
    setParsedData(null);
    setValidationErrors([]);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setParsedData(null);
    setValidationErrors([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importa file
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Importa Unità Produttive da CSV/Excel</DialogTitle>
          <DialogDescription>
            Carica un file CSV o Excel con la struttura corretta per importare
            campi e unità produttive in blocco.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* File upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer inline-flex items-center gap-2"
            >
              <Button asChild variant="default" disabled={isLoading}>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? "Caricamento..." : "Scegli file"}
                </span>
              </Button>
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              Formati supportati: CSV, XLSX, XLS
            </p>
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">
                  Errori di validazione ({validationErrors.length}):
                </p>
                <div className="mb-3 p-2 bg-red-100 rounded text-xs">
                  <p className="font-medium">💡 Suggerimento:</p>
                  <p>
                    Controlla che il CSV abbia le colonne corrette:
                    <span className="font-mono ml-1">
                      companyName, vatNumber, name, pu_name, pu_cropName
                    </span>
                    , ecc.
                  </p>
                  <p className="mt-1">
                    Apri la Console del Browser (F12) per vedere i log
                    dettagliati del parsing.
                  </p>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {validationErrors.length > 10 && (
                    <li className="text-gray-600">
                      ... e altri {validationErrors.length - 10} errori
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success preview */}
          {parsedData && validationErrors.length === 0 && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-900 mb-2">
                  File validato con successo!
                </p>
                <div className="space-y-2 text-sm text-green-800">
                  {parsedData.map((company, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <p className="font-medium">
                        {company.companyName} (P.IVA: {company.vatNumber})
                      </p>
                      <p className="text-xs mt-1">
                        • {company.fields.length} campi
                      </p>
                      <p className="text-xs">
                        • {company.productionUnits.length} unità produttive
                      </p>
                      {company.productionUnits.map((pu, puIndex) => (
                        <p key={puIndex} className="text-xs ml-4 text-gray-600">
                          - {pu.name} ({pu.cropName}) con{" "}
                          {pu.fieldAllocations.length} allocazioni
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Info panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              Formato file richiesto:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Prima riga: intestazioni delle colonne</li>
              <li>
                Campi obbligatori: companyName, vatNumber, name (campo),
                coordinates
              </li>
              <li>
                Campi production unit con prefisso "pu_": pu_name, pu_cropName,
                pu_cropType, pu_variety, pu_protocoll, pu_protectionStructure,
                pu_startDate, pu_areaHa, ecc.
              </li>
              <li>
                Per allocazioni: pu_fieldName, pu_sezione, pu_foglio,
                pu_particella, pu_areaHa
              </li>
            </ul>
          </div>

          {/* Template download links */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">File template:</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="text-xs">
                <a
                  href="/templates/field_production_unit_test_1.csv"
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📄 Template Base
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="text-xs">
                <a
                  href="/templates/field_production_unit_test_2.csv"
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📄 Template Completo
                </a>
              </Button>
            </div>
          </div>

          {/* Actions */}
          {parsedData && validationErrors.length === 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel}>
                Annulla
              </Button>
              <Button
                onClick={handleImport}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Importa Dati
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
