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
} from "@/components/ui/drawer";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Upload, AlertCircle, CheckCircle, Download } from "lucide-react";
import {
  extractProductionUnits,
  type ExtractedProductionUnit,
} from "@/api/production-unit";
import { toast } from "sonner";
import { CsvFieldImporter } from "@/components/organism/CsvFieldImporter";
import { SupportRequestForm } from "@/components/organism/SupportRequestForm";

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

class CompanySearchOptionsFactory {
  private readonly companies: Company[];

  constructor(companies: Company[]) {
    this.companies = companies;
  }

  public build(): SearchableSelectOption[] {
    return this.companies.map((company) => ({
      label: company.companyName,
      value: company.companyId,
    }));
  }
}

export type FieldAllocationDetails = {
  fieldId: string;
  fieldName: string;
  areaHa: number;
  foglio: string | null;
  particella: string | null;
  sezione: string | null;
  subalterno?: string | null;
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
  allocationsWithDetails?: FieldAllocationDetails[];
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
  /** When true, render only the form content (no Drawer/Trigger); for use inside choice drawer */
  embedded?: boolean;
  onCloseParentDrawer?: () => void;
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
      allocationsWithDetails: entry.allocationsWithDetails,
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
    index: number,
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
      allocationsWithDetails: [...(unit.allocationsWithDetails ?? [])],
      matchedFieldIds: new Set(unit.matchedFieldIds),
      unmatchedAllocations: [...unit.unmatchedAllocations],
    };
  }

  private mergeUnit(
    target: AggregatedUnit,
    source: ImportedProductionUnit,
  ): void {
    source.allocations.forEach((area, fieldId) => {
      const prev = target.allocations.get(fieldId) ?? 0;
      target.allocations.set(fieldId, parseFloat((prev + area).toFixed(4)));
    });

    if (typeof source.totalAreaHa === "number") {
      const current = target.totalAreaHa ?? 0;
      target.totalAreaHa = parseFloat(
        (current + source.totalAreaHa).toFixed(4),
      );
    }

    source.matchedFieldIds.forEach((fieldId) => {
      target.matchedFieldIds.add(fieldId);
    });

    target.unmatchedAllocations.push(...source.unmatchedAllocations);

    if (source.allocationsWithDetails) {
      target.allocationsWithDetails.push(...source.allocationsWithDetails);
    }

    if (
      !target.startDate ||
      (source.startDate && source.startDate < target.startDate)
    ) {
      target.startDate = source.startDate;
    }
    if (
      !target.endDate ||
      (source.endDate && source.endDate > target.endDate)
    ) {
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

class ImportedVarietyResolver {
  public resolve(unit: ExtractedProductionUnit): string {
    return (
      unit.variety ??
      unit.cycles?.[0]?.variety ??
      unit.cropName ??
      unit.cropType ??
      unit.name
    );
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
  allocationsWithDetails: FieldAllocationDetails[];
  matchedFieldIds: Set<string>;
  unmatchedAllocations: ImportedProductionUnit["unmatchedAllocations"];
};

export const ProductionUnitCsvImporter: React.FC<
  ProductionUnitCsvImporterProps
> = ({
  companies,
  onImportSuccess,
  openSignal,
  embedded = false,
  onCloseParentDrawer,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [extractedUnits, setExtractedUnits] = useState<
    ExtractedProductionUnit[] | null
  >(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [showSupportForm, setShowSupportForm] = useState(false);

  useEffect(() => {
    if (openSignal) {
      setIsOpen(true);
    }
  }, [openSignal]);

  const selectedCompany = companies.find(
    (c) => c.companyId === selectedCompanyId,
  );

  const companyOptions = React.useMemo(() => {
    return new CompanySearchOptionsFactory(companies).build();
  }, [companies]);

  /**
   * Gestisce il download del template Excel
   */
  const handleDownloadTemplate = (): void => {
    const link = document.createElement("a");
    link.href = "/templates/campi_esempio.csv";
    link.download = "campi_esempio.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Gestisce la chiusura del form di supporto
   */
  const handleSupportRequestSuccess = (): void => {
    setShowSupportForm(false);
    toast.success("Richiesta inviata. Ti risponderemo al più presto.");
  };

  const handleFileSelect = async (file: File): Promise<void> => {
    if (!selectedCompanyId) {
      toast.error("Seleziona un'azienda prima di importare il file");
      return;
    }

    setIsLoading(true);
    setValidationErrors([]);
    setExtractedUnits(null);

    try {
      toast.info("Estrazione unità produttive in corso...", {
        description: "L'operazione potrebbe richiedere alcuni secondi",
      });

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
    }
  };

  const buildImportResult = (): ImportResult | null => {
    if (!extractedUnits || !selectedCompany) return null;

    const warnings: string[] = [];
    const fieldMatcher = new FieldMatcher(selectedCompany.fields);
    const varietyResolver = new ImportedVarietyResolver();

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
          const parsedArea =
            typeof alloc.areaHa === "string"
              ? parseFloat(alloc.areaHa)
              : alloc.areaHa;
          const area = Number.isFinite(parsedArea) ? parsedArea : 0;

          if (!area || area <= 0) {
            return;
          }

          // Se il backend ha già fornito un fieldId, usalo direttamente
          if (alloc.fieldId) {
            const existingArea = allocations.get(alloc.fieldId) ?? 0;
            allocations.set(
              alloc.fieldId,
              parseFloat((existingArea + area).toFixed(4)),
            );
            if (!matchedFieldIds.includes(alloc.fieldId)) {
              matchedFieldIds.push(alloc.fieldId);
            }
            return;
          }

          // Altrimenti, prova a fare matching locale
          const matchedField = fieldMatcher.match({
            fieldName: alloc.fieldName ?? "",
            sezione: alloc.sezione,
            foglio: alloc.foglio,
            particella: alloc.particella,
          });

          if (matchedField) {
            const existingArea = allocations.get(matchedField.id) ?? 0;
            allocations.set(
              matchedField.id,
              parseFloat((existingArea + area).toFixed(4)),
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
        const resolvedVariety = varietyResolver.resolve(pu);

        // Costruisci allocationsWithDetails dalle allocations dell'API
        const allocationsWithDetails: FieldAllocationDetails[] = (
          pu.allocations ?? []
        )
          .map((alloc) => {
            const parsedArea =
              typeof alloc.areaHa === "string"
                ? parseFloat(alloc.areaHa)
                : alloc.areaHa;
            const area = Number.isFinite(parsedArea) ? parsedArea : 0;

            // Se il backend ha fornito fieldId, trova i dettagli del campo
            let fieldId = alloc.fieldId;
            let fieldName = alloc.fieldName ?? "Campo";

            if (!fieldId) {
              // Prova matching locale
              const matchedField = fieldMatcher.match({
                fieldName: alloc.fieldName ?? "",
                sezione: alloc.sezione,
                foglio: alloc.foglio,
                particella: alloc.particella,
              });
              if (matchedField) {
                fieldId = matchedField.id;
                fieldName = matchedField.name;
              } else {
                // Campo non matchato, usa dati dall'API
                fieldId = `unmatched-${index}-${alloc.foglio}-${alloc.particella}`;
              }
            }

            return {
              fieldId: fieldId || `field-${index}`,
              fieldName,
              areaHa: area,
              foglio: alloc.foglio || null,
              particella: alloc.particella || null,
              sezione: alloc.sezione || null,
              subalterno: alloc.subalterno,
            };
          })
          .filter((alloc) => alloc.areaHa > 0);

        return {
          id: `import-${Date.now()}-${index}`,
          name: pu.name,
          cropName: pu.cropName ?? pu.name,
          cropType: pu.cropType ?? pu.cropName ?? pu.name,
          variety: resolvedVariety,
          protocoll: pu.protocoll ?? "Non specificato",
          protectionStructure: pu.protectionStructure ?? "Non specificato",
          startDate,
          endDate,
          occupazione: pu.occupazione ?? pu.name ?? "",
          destinazioneDiUso: pu.destinazioneDiUso ?? "",
          acquaTotalePeridoL: pu.acquaTotalePeridoL ?? 0,
          totalAreaHa,
          allocations,
          allocationsWithDetails,
          matchedFieldIds,
          unmatchedAllocations,
        };
      },
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
    // Non chiamare onCloseParentDrawer qui - dopo l'import vogliamo mostrare l'anteprima,
    // non tornare alla scelta. onCloseParentDrawer va chiamato solo su "Annulla".
  };

  const handleCancel = () => {
    setIsOpen(false);
    setExtractedUnits(null);
    setValidationErrors([]);
    setSelectedCompanyId("");
    setShowSupportForm(false);
    if (embedded) {
      onCloseParentDrawer?.();
    }
  };

  /**
   * Resetta lo stato quando la drawer viene chiusa
   */
  const handleDrawerOpenChange = (open: boolean): void => {
    setIsOpen(open);
    if (!open) {
      setValidationErrors([]);
      setSelectedCompanyId("");
      setExtractedUnits(null);
      setShowSupportForm(false);
    }
  };

  const previewResult = extractedUnits ? buildImportResult() : null;

  const importContent = (
    <div className="space-y-4 p-4 flex flex-col flex-1">
      {/* Selezione azienda in evidenza per prima */}
      <div className="space-y-2">
        <label className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Seleziona azienda di destinazione
        </label>
        <SearchableSelect
          value={selectedCompanyId}
          options={companyOptions}
          placeholder="Seleziona un'azienda"
          searchPlaceholder="Cerca azienda..."
          emptyMessage="Nessuna azienda trovata"
          onChange={setSelectedCompanyId}
        />
      </div>

      {/* Area upload sotto alla selezione azienda */}
      <div
        className={`flex-1 transition-opacity duration-200 ${
          !selectedCompanyId ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <CsvFieldImporter
          onFileSelect={handleFileSelect}
          isProcessing={isLoading}
        />
      </div>

      {!selectedCompanyId && (
        <p className="text-xs text-muted-foreground text-center">
          Seleziona un'azienda per abilitare l'upload del file
        </p>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={20} ariaLabel="Elaborazione file" />
          <span>
            Estrazione unità produttive in corso... (potrebbe richiedere alcuni
            secondi)
          </span>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">
              Errori trovati ({validationErrors.length}):
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {validationErrors.slice(0, 10).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
              {validationErrors.length > 10 && (
                <li className="text-muted-foreground">
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
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions - Show import button when preview is ready */}
      {previewResult && validationErrors.length === 0 && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Annulla
          </Button>
          <Button
            onClick={handleImport}
            className="bg-agri-green-500 hover:bg-agri-green-600 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Importa nella schermata
          </Button>
        </div>
      )}

      {showSupportForm && (
        <div className="bg-white p-6 rounded-3xl border border-agri-green-100 text-left shadow-lg shadow-agri-green-50">
          <h4 className="font-medium text-lg mb-4">Richiedi supporto</h4>
          <p className="text-sm text-gray-600 mb-4">
            In caso di problemi con l'importazione del file, compila il form qui
            sotto per contattare il servizio di supporto.
          </p>
          <SupportRequestForm
            onSuccess={handleSupportRequestSuccess}
            className="shadow-none border-none bg-transparent p-0"
          />
        </div>
      )}

      {/* Footer: Scarica template a sinistra (testuale), Richiedi supporto a destra - space-between */}
      <div className="flex justify-between items-center pt-4 mt-auto border-t">
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={handleDownloadTemplate}
          className="gap-2 p-0 h-auto font-normal"
        >
          <Download className="h-4 w-4" />
          Scarica template
        </Button>
        <button
          type="button"
          onClick={() => setShowSupportForm(!showSupportForm)}
          className="text-sm text-black hover:text-black underline transition-colors"
        >
          Richiedi supporto
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return importContent;
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleDrawerOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="default" className="gap-2">
          <Upload className="h-4 w-4" />
          Importa file
        </Button>
      </DrawerTrigger>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-1/2 !max-w-[50vw] h-full overflow-y-auto overflow-x-hidden bg-white p-2"
      >
        <DrawerHeader>
          <DrawerTitle>Estrazione Automatica Unità Produttive</DrawerTitle>
          <DrawerDescription>
            Il sistema supporta il formato del template AGEA della misura unica,
            con parcelle e uso del suolo primario e secondario (CSV, XLS, XLSX).
            Il formato può variare in base alla regione. Seleziona l'azienda e
            carica un file; i dati delle unità produttive verranno estratti
            automaticamente.
          </DrawerDescription>
        </DrawerHeader>
        {importContent}
      </DrawerContent>
    </Drawer>
  );
};
