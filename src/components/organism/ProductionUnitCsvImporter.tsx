import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseProductionUnitCSV,
  validateParsedData,
  type ParsedBulkImport,
} from "@/utils/csvProductionUnitParser";
import * as XLSX from "xlsx";

type AvailableField = {
  id: string;
  name: string;
  foglio?: string | null;
  particella?: string | null;
  sezione?: string | null;
  areaAvailable: number;
};

type Company = {
  companyId: string;
  companyName: string;
  fields: AvailableField[];
};

export type ImportedProductionUnit = {
  id: string;
  name: string;
  cropName: string;
  cropType: string;
  variety: string;
  protocoll: string;
  protectionStructure: string;
  startDate: Date | null;
  endDate: Date | null;
  occupazione: string;
  destinazioneDiUso: string;
  acquaTotalePeridoL: number;
  allocations: Map<string, number>;
  matchedFieldIds: string[];
  unmatchedAllocations: Array<{
    fieldName: string;
    sezione?: string;
    foglio?: string;
    particella?: string;
    areaHa: number;
  }>;
};

export type ImportResult = {
  companyId: string;
  companyName: string;
  productionUnits: ImportedProductionUnit[];
  warnings: string[];
};

type ProductionUnitCsvImporterProps = {
  companies: Company[];
  onImportSuccess: (result: ImportResult) => void;
};

type CropCatalogEntry = {
  code: string;
  species: string;
  cropType: string;
};

class FieldMatcher {
  private readonly fieldsByKey = new Map<string, AvailableField>();

  constructor(fields: AvailableField[]) {
    fields.forEach((field) => {
      const keys = this.buildKeys(field);
      keys.forEach((key) => {
        if (!this.fieldsByKey.has(key)) {
          this.fieldsByKey.set(key, field);
        }
      });
    });
  }

  private buildKeys(field: AvailableField): string[] {
    const foglio = this.normalize(field.foglio);
    const particella = this.normalize(field.particella);
    const sezione = this.normalize(field.sezione);

    const keys: string[] = [];

    if (foglio && particella) {
      if (sezione) {
        keys.push(`${sezione}|${foglio}|${particella}`);
      }
      keys.push(`${foglio}|${particella}`);
    }

    return keys;
  }

  private normalize(value: string | null | undefined): string {
    if (!value) return "";
    return value.toString().trim().toLowerCase();
  }

  public match(allocation: {
    fieldName: string;
    sezione?: string;
    foglio?: string;
    particella?: string;
  }): AvailableField | null {
    const foglio = this.normalize(allocation.foglio);
    const particella = this.normalize(allocation.particella);
    const sezione = this.normalize(allocation.sezione);

    if (!foglio || !particella) {
      return null;
    }

    if (sezione) {
      const fullKey = `${sezione}|${foglio}|${particella}`;
      const match = this.fieldsByKey.get(fullKey);
      if (match) return match;
    }

    const shortKey = `${foglio}|${particella}`;
    return this.fieldsByKey.get(shortKey) ?? null;
  }
}

class ProductionUnitAggregator {
  private readonly units: ImportedProductionUnit[];

  constructor(units: ImportedProductionUnit[]) {
    this.units = units;
  }

  public merge(): ImportedProductionUnit[] {
    const grouped = new Map<string, AggregatedUnit>();

    this.units.forEach((unit, index) => {
      const key = this.buildKey(unit);
      if (!grouped.has(key)) {
        grouped.set(key, this.createAggregatedUnit(unit, index));
        return;
      }
      this.mergeUnit(grouped.get(key)!, unit);
    });

    return Array.from(grouped.values()).map((entry) => ({
      id: entry.baseId,
      name: entry.name,
      cropName: entry.cropName,
      cropType: entry.cropType,
      variety: entry.variety,
      protocoll: entry.protocoll,
      protectionStructure: entry.protectionStructure,
      startDate: entry.startDate,
      endDate: entry.endDate,
      occupazione: entry.occupazione,
      destinazioneDiUso: entry.destinazioneDiUso,
      acquaTotalePeridoL: entry.acquaTotalePeridoL,
      allocations: entry.allocations,
      matchedFieldIds: Array.from(entry.matchedFieldIds),
      unmatchedAllocations: entry.unmatchedAllocations,
    }));
  }

  private buildKey(unit: ImportedProductionUnit): string {
    return [
      this.normalize(unit.name),
      this.normalize(unit.occupazione),
      this.normalize(unit.startDate?.toISOString() ?? "__no_start__"),
      this.normalize(unit.endDate?.toISOString() ?? "__no_end__"),
    ].join("|");
  }

  private createAggregatedUnit(
    unit: ImportedProductionUnit,
    index: number
  ): AggregatedUnit {
    return {
      baseId: unit.id || `aggregated-${index}`,
      name: unit.name,
      cropName: unit.cropName,
      cropType: unit.cropType,
      variety: unit.variety,
      protocoll: unit.protocoll,
      protectionStructure: unit.protectionStructure,
      startDate: unit.startDate,
      endDate: unit.endDate,
      occupazione: unit.occupazione,
      destinazioneDiUso: unit.destinazioneDiUso,
      acquaTotalePeridoL: unit.acquaTotalePeridoL,
      allocations: new Map(unit.allocations),
      matchedFieldIds: new Set(unit.matchedFieldIds),
      unmatchedAllocations: [...unit.unmatchedAllocations],
    };
  }

  private mergeUnit(target: AggregatedUnit, source: ImportedProductionUnit): void {
    source.allocations.forEach((area, fieldId) => {
      const prev = target.allocations.get(fieldId) ?? 0;
      target.allocations.set(fieldId, parseFloat((prev + area).toFixed(4)));
    });

    source.matchedFieldIds.forEach((fieldId) => {
      target.matchedFieldIds.add(fieldId);
    });

    target.unmatchedAllocations.push(...source.unmatchedAllocations);

    if (!target.startDate || (source.startDate && source.startDate < target.startDate)) {
      target.startDate = source.startDate;
    }
    if (!target.endDate || (source.endDate && source.endDate > target.endDate)) {
      target.endDate = source.endDate;
    }
  }

  private normalize(value: string | null | undefined): string {
    if (!value) {
      return "";
    }
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
}

type AggregatedUnit = {
  baseId: string;
  name: string;
  cropName: string;
  cropType: string;
  variety: string;
  protocoll: string;
  protectionStructure: string;
  startDate: Date | null;
  endDate: Date | null;
  occupazione: string;
  destinazioneDiUso: string;
  acquaTotalePeridoL: number;
  allocations: Map<string, number>;
  matchedFieldIds: Set<string>;
  unmatchedAllocations: ImportedProductionUnit["unmatchedAllocations"];
};

export const ProductionUnitCsvImporter: React.FC<
  ProductionUnitCsvImporterProps
> = ({ companies, onImportSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<ParsedBulkImport[] | null>(null);
  const [cropCatalog, setCropCatalog] = useState<CropCatalogEntry[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const selectedCompany = companies.find(
    (c) => c.companyId === selectedCompanyId
  );

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await fetch("/datasets/varietà/index.json");
        if (!response.ok) {
          throw new Error("Impossibile caricare il catalogo varietà");
        }
        const data = (await response.json()) as CropCatalogEntry[];
        setCropCatalog(data);
      } catch (error) {
        console.error("Errore nel caricamento del catalogo varietà:", error);
        setCatalogError(
          error instanceof Error ? error.message : "Errore sconosciuto"
        );
      } finally {
        setIsCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedCompanyId) {
      toast.error("Seleziona un'azienda prima di caricare il file");
      event.target.value = "";
      return;
    }

    setIsLoading(true);
    setValidationErrors([]);
    setParsedData(null);

    try {
      let csvText = "";

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
        csvText = await file.text();
      }

      const parsed = parseProductionUnitCSV(csvText, {
        cropVarieties: cropCatalog,
      });

      console.log("📊 Dati parsati dal CSV:", parsed);
      console.log("📋 Numero di aziende trovate:", parsed.length);

      const validation = validateParsedData(parsed);

      if (!validation.isValid) {
        console.error("❌ Errori di validazione:", validation.errors);
        setValidationErrors(validation.errors);
        toast.error("Il file contiene errori. Controlla i dettagli.");
        return;
      }

      setParsedData(parsed);
      toast.success(
        `File parsato con successo! Trovate ${parsed.reduce(
          (sum, d) => sum + d.productionUnits.length,
          0
        )} unità produttive.`
      );
    } catch (error) {
      console.error("Errore nell'importazione del file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      setValidationErrors([errorMessage]);
      toast.error("Errore nell'importazione del file");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const buildImportResult = (): ImportResult | null => {
    if (!parsedData || !selectedCompany) return null;

    const warnings: string[] = [];
    const fieldMatcher = new FieldMatcher(selectedCompany.fields);

    const allProductionUnits = parsedData.flatMap((d) => d.productionUnits);

    const importedUnits: ImportedProductionUnit[] = allProductionUnits.map(
      (pu, index) => {
        const allocations = new Map<string, number>();
        const matchedFieldIds: string[] = [];
        const unmatchedAllocations: ImportedProductionUnit["unmatchedAllocations"] =
          [];

        pu.fieldAllocations.forEach((alloc) => {
          const matchedField = fieldMatcher.match(alloc);
          if (matchedField) {
            const existingArea = allocations.get(matchedField.id) ?? 0;
            allocations.set(matchedField.id, existingArea + alloc.areaHa);
            if (!matchedFieldIds.includes(matchedField.id)) {
              matchedFieldIds.push(matchedField.id);
            }
          } else {
            unmatchedAllocations.push(alloc);
            warnings.push(
              `Unità "${pu.name}": campo non trovato per foglio=${alloc.foglio}, particella=${alloc.particella}${
                alloc.sezione ? `, sezione=${alloc.sezione}` : ""
              }`
            );
          }
        });

        const startDate = pu.startDate ? new Date(pu.startDate) : null;
        const endDate = pu.endDate ? new Date(pu.endDate) : null;

        return {
          id: `import-${Date.now()}-${index}`,
          name: pu.name,
          cropName: pu.cropName,
          cropType: pu.cropType,
          variety: pu.variety,
          protocoll: pu.protocoll,
          protectionStructure: pu.protectionStructure,
          startDate,
          endDate,
          occupazione: pu.occupazione ?? "",
          destinazioneDiUso: pu.destinazioneDiUso ?? "",
          acquaTotalePeridoL: pu.acquaTotalePeridoL ?? 0,
          allocations,
          matchedFieldIds,
          unmatchedAllocations,
        };
      }
    );

    const mergedUnits = new ProductionUnitAggregator(importedUnits).merge();

    return {
      companyId: selectedCompany.companyId,
      companyName: selectedCompany.companyName,
      productionUnits: mergedUnits,
      warnings,
    };
  };

  const handleImport = () => {
    const result = buildImportResult();
    if (!result) {
      toast.error("Impossibile elaborare i dati. Riprova.");
      return;
    }

    if (result.productionUnits.length === 0) {
      toast.error("Nessuna unità produttiva trovata nel file.");
      return;
    }

    onImportSuccess(result);
    setIsOpen(false);
    setParsedData(null);
    setValidationErrors([]);
    setSelectedCompanyId("");
  };

  const handleCancel = () => {
    setIsOpen(false);
    setParsedData(null);
    setValidationErrors([]);
    setSelectedCompanyId("");
  };

  const previewResult = parsedData ? buildImportResult() : null;

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
            Seleziona l'azienda di destinazione e carica un file CSV o Excel per
            importare le unità produttive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Company select */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Azienda di destinazione
            </label>
            <Select
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona un'azienda..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.companyId} value={company.companyId}>
                    {company.companyName} ({company.fields.length} campi)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCompany && (
              <p className="text-xs text-muted-foreground">
                I campi verranno abbinati tramite Foglio e Particella (e Sezione
                se presente).
              </p>
            )}
          </div>

          {/* File upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              selectedCompanyId
                ? "border-gray-300 hover:border-blue-400"
                : "border-gray-200 bg-gray-50 opacity-60"
            }`}
          >
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <label
              htmlFor="csv-upload"
              className={`inline-flex items-center gap-2 ${
                selectedCompanyId ? "cursor-pointer" : "cursor-not-allowed"
              }`}
            >
              <Button
                asChild
                variant="default"
                disabled={isLoading || !selectedCompanyId}
              >
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
              disabled={!selectedCompanyId}
            />
            <p className="text-xs text-gray-500 mt-2">
              Formati supportati: CSV, XLSX, XLS
            </p>
            {!selectedCompanyId && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                Seleziona prima un'azienda per abilitare l'upload
              </p>
            )}
            {catalogError && (
              <p className="text-xs text-red-600 mt-1">
                {catalogError} — il catalogo varietà non verrà utilizzato.
              </p>
            )}
            {!catalogError && isCatalogLoading && (
              <p className="text-xs text-gray-500 mt-1">
                Caricamento catalogo varietà in corso...
              </p>
            )}
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
                    Assicurati che il CSV rispetti il template AGEA
                    (campi_esempio.csv) con colonne come
                    <span className="font-mono ml-1">
                      "Occupazione Suolo Uso Suolo Primario", "Superficie Uso
                      Suolo Primario", "Data inizio Semina Primario"
                    </span>
                    e che i valori siano compilati.
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
          {previewResult && validationErrors.length === 0 && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-900 mb-2">
                  File parsato con successo!
                </p>
                <div className="space-y-2 text-sm text-green-800">
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium">
                      Azienda: {previewResult.companyName}
                    </p>
                    <p className="text-xs mt-1">
                      • {previewResult.productionUnits.length} unità produttive
                      trovate
                    </p>
                    {previewResult.productionUnits
                      .slice(0, 5)
                      .map((pu, puIndex) => (
                        <p key={puIndex} className="text-xs ml-4 text-gray-600">
                          - {pu.name} ({pu.cropName}) — {pu.allocations.size}{" "}
                          campi abbinati
                          {pu.unmatchedAllocations.length > 0 && (
                            <span className="text-amber-600 ml-1">
                              ({pu.unmatchedAllocations.length} non trovati)
                            </span>
                          )}
                        </p>
                      ))}
                    {previewResult.productionUnits.length > 5 && (
                      <p className="text-xs ml-4 text-gray-500">
                        ... e altre{" "}
                        {previewResult.productionUnits.length - 5} unità
                      </p>
                    )}
                  </div>
                </div>
                {previewResult.warnings.length > 0 && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    <p className="font-medium mb-1">
                      ⚠️ Avvisi ({previewResult.warnings.length}):
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {previewResult.warnings.slice(0, 5).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {previewResult.warnings.length > 5 && (
                        <li className="text-gray-600">
                          ... e altri {previewResult.warnings.length - 5} avvisi
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Info panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              Formato file richiesto:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>
                Usa il template AGEA/SIAN <em>campi_esempio.csv</em> fornito qui
                sotto.
              </li>
              <li>
                Le unità produttive vengono raggruppate per "Occupazione Suolo
                Uso Suolo Primario" e per il relativo periodo di semina.
              </li>
              <li>
                I campi vengono abbinati tramite <strong>Foglio</strong> e{" "}
                <strong>Particella</strong> (e <strong>Sezione</strong> se
                presente).
              </li>
              <li>
                I campi <strong>devono già esistere</strong> nel sistema per
                l'azienda selezionata.
              </li>
            </ul>
          </div>

          {/* Template download links */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">File template:</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="text-xs">
                <a
                  href="/templates/campi_esempio.csv"
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📄 Template AGEA
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="text-xs">
                <a
                  href="/datasets/test/test_production_unit_roberto.csv"
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🧪 Dataset di test
                </a>
              </Button>
            </div>
          </div>

          {/* Actions */}
          {previewResult && validationErrors.length === 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel}>
                Annulla
              </Button>
              <Button
                onClick={handleImport}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Importa nella schermata
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
