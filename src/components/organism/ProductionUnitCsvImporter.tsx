import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Building2,
  X,
} from "lucide-react";
import {
  extractProductionUnits,
  type ExtractedProductionUnit,
} from "@/api/production-unit";
import { toast } from "sonner";

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
  totalAreaHa: number | null;
  unmatchedAllocations: Array<{
    fieldName: string;
    sezione?: string;
    foglio?: string;
    particella?: string;
    subalterno?: string | null;
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
  openSignal?: number | null;
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
      totalAreaHa: entry.totalAreaHa,
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
      totalAreaHa: unit.totalAreaHa,
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

    if (typeof source.totalAreaHa === "number") {
      const current = target.totalAreaHa ?? 0;
      target.totalAreaHa = parseFloat((current + source.totalAreaHa).toFixed(4));
    }

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
  totalAreaHa: number | null;
  allocations: Map<string, number>;
  matchedFieldIds: Set<string>;
  unmatchedAllocations: ImportedProductionUnit["unmatchedAllocations"];
};

export const ProductionUnitCsvImporter: React.FC<
  ProductionUnitCsvImporterProps
> = ({ companies, onImportSuccess, openSignal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [extractedUnits, setExtractedUnits] = useState<
    ExtractedProductionUnit[] | null
  >(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  useEffect(() => {
    if (openSignal) {
      setIsOpen(true);
    }
  }, [openSignal]);

  const selectedCompany = companies.find(
    (c) => c.companyId === selectedCompanyId
  );

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedCompanyId) {
      setValidationErrors(["Seleziona un'azienda prima di caricare il file"]);
      event.target.value = "";
      return;
    }

    setIsLoading(true);
    setValidationErrors([]);
    setExtractedUnits(null);
    try {
      const extracted = await extractProductionUnits(selectedCompanyId, file);

      if (!extracted || extracted.length === 0) {
        setValidationErrors(["Nessuna unità produttiva trovata nel file."]);
        return;
      }

      setExtractedUnits(extracted);
    } catch (error) {
      console.error("Errore nell'importazione del file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      setValidationErrors([errorMessage]);
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const buildImportResult = (): ImportResult | null => {
    if (!extractedUnits || !selectedCompany) return null;

    const warnings: string[] = [];
    const fieldMatcher = new FieldMatcher(selectedCompany.fields);

    const parseDateSafe = (value?: string | null): Date | null => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const importedUnits: ImportedProductionUnit[] = extractedUnits.map(
      (pu, index) => {
        const allocations = new Map<string, number>();
        const matchedFieldIds: string[] = [];
        const unmatchedAllocations: ImportedProductionUnit["unmatchedAllocations"] =
          [];
        const totalAreaHa =
          typeof pu.areaHa === "number" && !Number.isNaN(pu.areaHa)
            ? pu.areaHa
            : null;

        (pu.allocations ?? []).forEach((alloc) => {
          const matchedField = fieldMatcher.match({
            fieldName: alloc.fieldName ?? "",
            sezione: alloc.sezione,
            foglio: alloc.foglio,
            particella: alloc.particella,
          });
          const parsedArea =
            typeof alloc.areaHa === "string"
              ? parseFloat(alloc.areaHa)
              : alloc.areaHa;
          const area = Number.isFinite(parsedArea) ? parsedArea : 0;

          if (!area || area <= 0) {
            return;
          }

          if (matchedField) {
            const existingArea = allocations.get(matchedField.id) ?? 0;
            allocations.set(
              matchedField.id,
              parseFloat((existingArea + area).toFixed(4))
            );
            if (!matchedFieldIds.includes(matchedField.id)) {
              matchedFieldIds.push(matchedField.id);
            }
          } else {
            unmatchedAllocations.push({
              fieldName: alloc.fieldName ?? "Campo non riconosciuto",
              sezione: alloc.sezione,
              foglio: alloc.foglio,
              particella: alloc.particella,
              subalterno: alloc.subalterno,
              areaHa: area,
            });
          }
        });

        const startDate = parseDateSafe(pu.startDate ?? null);
        const endDate = parseDateSafe(pu.endDate ?? null);

        return {
          id: `import-${Date.now()}-${index}`,
          name: pu.name,
          cropName: pu.cropName ?? pu.name,
          cropType: pu.cropType ?? pu.cropName ?? pu.name,
          variety: pu.variety ?? pu.cropType ?? pu.cropName ?? pu.name,
          protocoll: pu.protocoll ?? "Non specificato",
          protectionStructure: pu.protectionStructure ?? "Non specificato",
          startDate,
          endDate,
          occupazione: pu.occupazione ?? pu.name ?? "",
          destinazioneDiUso: pu.destinazioneDiUso ?? "",
          acquaTotalePeridoL: pu.acquaTotalePeridoL ?? 0,
          totalAreaHa,
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
      return;
    }

    if (result.productionUnits.length === 0) {
      toast.error("Nessuna unità produttiva trovata nel file.");
      return;
    }

    onImportSuccess(result);
    setIsOpen(false);
    setExtractedUnits(null);
    setValidationErrors([]);
    setSelectedCompanyId("");
  };

  const handleCancel = () => {
    setIsOpen(false);
    setExtractedUnits(null);
    setValidationErrors([]);
    setSelectedCompanyId("");
  };

  const previewResult = extractedUnits ? buildImportResult() : null;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importa file
        </Button>
      </DrawerTrigger>
      <DrawerContent data-vaul-drawer-direction="right" className="max-h-[100vh] overflow-y-auto">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DrawerTitle>Importa Unità Produttive da CSV/Excel</DrawerTitle>
              <DrawerDescription>
                Seleziona l'azienda di destinazione e carica un file CSV o Excel per
                importare le unità produttive.
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="space-y-4 px-6 pb-6">
          {/* Company select */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Azienda di destinazione
            </label>
            <SearchableSelect
              value={selectedCompanyId}
              onChange={setSelectedCompanyId}
              options={companies.map((company) => ({
                label: company.companyName,
                value: company.companyId,
              }))}
              placeholder="Seleziona un'azienda..."
              searchPlaceholder="Cerca azienda..."
              emptyMessage="Nessuna azienda trovata"
              wrapperClassName="w-full"
            />
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
                      • {previewResult.productionUnits.length} unità produttive trovate
                    </p>
                  </div>
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
            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button variant="outline" onClick={handleCancel} asChild>
                <DrawerClose>Annulla</DrawerClose>
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
      </DrawerContent>
    </Drawer>
  );
};
