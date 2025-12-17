import {
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type ReactElement,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Package,
  Settings,
  Upload,
  X,
} from "lucide-react";
import {
  type DosageStrategy,
  type DosageProduct,
  type DosageOrchestratorSettings,
  type OrchestratorIntensity,
  type OrchestratorObjective,
} from "@/api/dosage-agent";
import { ImportProducts } from "./importProducts";
import { ImportProductsFromDdt } from "./importProductsFromDdt";
import { FitosanitariProductSearch } from "./FitosanitariProductSearch";
import type { ProductionUnit } from "@/api/production-unit";
import { type FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
import {
  type OrchestratorDatasets,
  OrchestratorDefaultsFactory,
  OrchestratorIntensityDefaults,
  OrchestratorLabels,
  OrchestratorSettingsUpdater,
} from "./orchestrator";
import {
  MultiSearchableSelect,
  type MultiSearchableSelectOption,
} from "./MultiSearchableSelect";
import { ImportMethodPolicy, type ImportMethod } from "./importMethod";

interface ManageSectionProps {
  companies: { id: string; name: string }[];
  selectedCompanyIds: string[];
  setSelectedCompanyIds: Dispatch<SetStateAction<string[]>>;
  selectedUnitIds: string[];
  setSelectedUnitIds: Dispatch<SetStateAction<string[]>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  loadingUnits: boolean;
  filteredUnits: ProductionUnit[];
  productionUnitTableColumns: EditableColumn[];
  productionUnitTableRows: Array<Record<string, unknown>>;
  handleUnitSelectionChange: (rows: Array<Record<string, unknown>>) => void;
  products: DosageProduct[];
  setProducts: Dispatch<SetStateAction<DosageProduct[]>>;
  setSelectedProductIds: Dispatch<SetStateAction<string[]>>;
  setProductSources: Dispatch<
    SetStateAction<Map<string, "warehouse" | "csv" | "ddt">>
  >;
  productColumns: EditableColumn[];
  productsAsRows: Array<Record<string, unknown>>;
  handleSaveProducts: (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => void;
  handleProductSelectionChange: (rows: Array<Record<string, unknown>>) => void;
  handleAddRowsFromCsv: (rows: Array<Record<string, unknown>>) => void;
  handleAddRowsFromDdt: (rows: Array<Record<string, unknown>>) => void;
  handleImportFromWarehouse: () => void;
  isWarehouseProductsLoading: boolean;
  isImportingFromWarehouse: boolean;
  handleRegistryProductSelected: (record: FitosanitariDatasetRecord) => void;
  renderProductLabelAction: (row: Record<string, unknown>) => ReactElement;
  editableTableRef: RefObject<EditableTable | null>;
  strategy: DosageStrategy;
  setStrategy: Dispatch<SetStateAction<DosageStrategy>>;
  strategyOptions: Array<{
    value: DosageStrategy;
    label: string;
    description: string;
  }>;
  selectedStrategyOption: {
    value: DosageStrategy;
    label: string;
    description: string;
  };
  outStockLimiter: boolean;
  setOutStockLimiter: Dispatch<SetStateAction<boolean>>;
  renderEmptyProductsPlaceholder: () => ReactElement;
  orchestratorSettings: DosageOrchestratorSettings;
  setOrchestratorSettings: Dispatch<SetStateAction<DosageOrchestratorSettings>>;
  orchestratorDatasets: OrchestratorDatasets | null;
  selectedImportMethod: ImportMethod | null;
  onSelectImportMethod: (method: ImportMethod) => void;
  onResetImportMethod: () => void;
  startAt: string;
  setStartAt: Dispatch<SetStateAction<string>>;
  endAt: string;
  setEndAt: Dispatch<SetStateAction<string>>;
}

class OrchestratorCategoryPriorityList {
  public static move(
    list: string[],
    index: number,
    direction: "up" | "down"
  ): string[] {
    const next = [...list];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) {
      return next;
    }
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    return next;
  }

  public static remove(list: string[], id: string): string[] {
    return list.filter((item) => item !== id);
  }

  public static add(list: string[], id: string): string[] {
    if (list.includes(id)) {
      return list;
    }
    return [...list, id];
  }
}

export function ManageSection({
  companies,
  selectedCompanyIds,
  setSelectedCompanyIds,
  selectedUnitIds,
  setSelectedUnitIds,
  searchQuery,
  setSearchQuery,
  loadingUnits,
  filteredUnits,
  productionUnitTableColumns,
  productionUnitTableRows,
  handleUnitSelectionChange,
  products,
  setProducts,
  setSelectedProductIds,
  setProductSources,
  productColumns,
  productsAsRows,
  handleSaveProducts,
  handleProductSelectionChange,
  handleAddRowsFromCsv,
  handleAddRowsFromDdt,
  handleImportFromWarehouse,
  isWarehouseProductsLoading,
  isImportingFromWarehouse,
  handleRegistryProductSelected,
  renderProductLabelAction,
  editableTableRef,
  strategy,
  setStrategy,
  strategyOptions,
  selectedStrategyOption,
  outStockLimiter,
  setOutStockLimiter,
  renderEmptyProductsPlaceholder,
  orchestratorSettings,
  setOrchestratorSettings,
  orchestratorDatasets,
  selectedImportMethod,
  onSelectImportMethod,
  onResetImportMethod,
  startAt,
  setStartAt,
  endAt,
  setEndAt,
}: ManageSectionProps): ReactElement {
  const [showMaxLimits, setShowMaxLimits] = useState(false);
  const [showAutomaticCompilation, setShowAutomaticCompilation] =
    useState(false);
  const categoryPriority = orchestratorSettings.categoryPriority ?? [];
  const priorityTargets = orchestratorSettings.priorityTargets ?? [];
  const intensityValue = (orchestratorSettings.intensity ?? "none") as
    | OrchestratorIntensity
    | "none";

  const categoryOptions = useMemo<MultiSearchableSelectOption[]>(
    () =>
      (orchestratorDatasets?.categories ?? []).map((c) => ({
        value: c.id,
        label: `${c.label} (${c.id})`,
        description: c.description,
        searchAliases: c.aliases,
      })),
    [orchestratorDatasets]
  );

  // Calculate valid date range from selected production units
  const validDateRange = useMemo(() => {
    if (selectedUnitIds.length === 0) {
      return { minDate: undefined, maxDate: undefined };
    }

    const selectedUnits = filteredUnits.filter((unit) =>
      selectedUnitIds.includes(unit.productionUnit.id)
    );

    if (selectedUnits.length === 0) {
      return { minDate: undefined, maxDate: undefined };
    }

    // Find the earliest startDate
    const startDates = selectedUnits
      .map((unit) => unit.productionUnit.startDate)
      .filter((date): date is string => Boolean(date));

    if (startDates.length === 0) {
      return { minDate: undefined, maxDate: undefined };
    }

    const minDate = startDates.reduce((earliest, current) => {
      return current < earliest ? current : earliest;
    }, startDates[0]);

    // Find the latest endDate (if any)
    const endDates = selectedUnits
      .map((unit) => unit.productionUnit.endDate)
      .filter((date): date is string => Boolean(date));

    const maxDate =
      endDates.length > 0
        ? endDates.reduce((latest, current) => {
            return current > latest ? current : latest;
          }, endDates[0])
        : undefined;

    return { minDate, maxDate };
  }, [selectedUnitIds, filteredUnits]);

  const targetOptions = useMemo<MultiSearchableSelectOption[]>(
    () =>
      (orchestratorDatasets?.targets ?? []).map((t) => ({
        value: t.id,
        label: t.label,
        description: t.scientificName,
        groupLabel: t.group,
        searchAliases: t.aliases,
      })),
    [orchestratorDatasets]
  );

  const companyOptions = useMemo<MultiSearchableSelectOption[]>(
    () =>
      companies.map((company) => ({
        value: company.id,
        label: company.name,
      })),
    [companies]
  );

  return (
    <div className="mx-auto space-y-8 md:space-y-12">
      {/* Company Filter Section */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg md:text-xl font-medium text-neutral-900">
            Seleziona Azienda
          </h2>
        </div>
        <div className="w-full max-w-md">
          <MultiSearchableSelect
            value={selectedCompanyIds}
            options={companyOptions}
            placeholder="Seleziona una o più aziende..."
            searchPlaceholder="Cerca azienda..."
            emptyMessage="Nessuna azienda trovata"
            onChange={(next) => {
              setSelectedCompanyIds(next);
              setSelectedUnitIds([]);
              setSearchQuery("");
              // Reset prodotti e sorgenti quando cambia azienda
              setProducts([]);
              setProductSources(new Map());
              onResetImportMethod();
              setShowAutomaticCompilation(false);
              // Reset strategia e outStockLimiter ai valori di default
              setStrategy("avg");
              setOutStockLimiter(true);
              // Reset orchestrator ai valori di default
              setOrchestratorSettings(OrchestratorDefaultsFactory.create());
              // Reset date di trattamento
              setStartAt("");
              setEndAt("");
            }}
          />
        </div>
      </div>

      {/* Units Section */}
      {selectedCompanyIds.length > 0 && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-medium text-neutral-900">
                Seleziona Unità Produttive
              </h2>
              {filteredUnits.length > 0 && (
                <p className="text-sm text-neutral-500 mt-1">
                  {filteredUnits.length} disponibili
                </p>
              )}
            </div>
            <div className="w-full lg:w-auto">
              <Input
                value={searchQuery}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Cerca per nome, coltura o varietà"
                aria-label="Cerca unità produttive"
                disabled={loadingUnits}
                className="bg-white"
              />
            </div>
          </div>

          {loadingUnits ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              {searchQuery
                ? "Nessuna unità trovata"
                : "Nessuna unità disponibile per questa azienda"}
            </div>
          ) : (
            <EditableTable
              columns={productionUnitTableColumns}
              rows={productionUnitTableRows}
              isModify={false}
              addButton={false}
              onSelectionChange={handleUnitSelectionChange}
              showDeleteAction={false}
              getRowId={(row) => (row as { id: string }).id}
              className="bg-white rounded-2xl border border-neutral-200"
            />
          )}
        </div>
      )}

      {/* Products Section */}
      <div className="space-y-4 md:space-y-6 relative">
        {selectedCompanyIds.length === 0 && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
            <div className="text-center p-6">
              <p className="text-base font-medium text-neutral-700 mb-2">
                Seleziona prima un'azienda
              </p>
              <p className="text-sm text-neutral-500">
                Per selezionare i prodotti fitosanitari, devi prima scegliere
                almeno un'azienda nella sezione sopra.
              </p>
            </div>
          </div>
        )}
        <div
          className={
            selectedCompanyIds.length > 0
              ? ""
              : "pointer-events-none opacity-50"
          }
        >
          <div>
            <h2 className="text-lg md:text-xl font-medium text-neutral-900">
              Seleziona prodotti fitosanitari
            </h2>
            {products.length > 0 && (
              <p className="text-sm text-neutral-500 mt-1">
                {products.length} prodotti caricati
              </p>
            )}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-6">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-900">
                  Importa prodotti
                </p>
                <p className="text-sm text-neutral-500">
                  Carica rapidamente i prodotti tramite CSV oppure leggi i DDT
                  in formato PDF.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {" "}
                {(!selectedImportMethod ||
                  ImportMethodPolicy.isSelected(
                    selectedImportMethod,
                    "registry"
                  )) && (
                  <Button
                    variant={showAutomaticCompilation ? "default" : "outline"}
                    className="gap-2"
                    onClick={() => {
                      onSelectImportMethod("registry");
                      setShowAutomaticCompilation((prev) => !prev);
                    }}
                    disabled={
                      !!selectedImportMethod &&
                      !ImportMethodPolicy.isSelected(
                        selectedImportMethod,
                        "registry"
                      )
                    }
                  >
                    <Upload className="h-4 w-4" />
                    <span>Importa prodotti</span>
                  </Button>
                )}{" "}
                {(!selectedImportMethod ||
                  ImportMethodPolicy.isSelected(
                    selectedImportMethod,
                    "warehouse"
                  )) && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      onSelectImportMethod("warehouse");
                      handleImportFromWarehouse();
                    }}
                    disabled={
                      isWarehouseProductsLoading ||
                      isImportingFromWarehouse ||
                      selectedCompanyIds.length === 0 ||
                      (!!selectedImportMethod &&
                        !ImportMethodPolicy.isSelected(
                          selectedImportMethod,
                          "warehouse"
                        ))
                    }
                    title={
                      selectedCompanyIds.length === 0
                        ? "Seleziona almeno un'azienda per importare da magazzino"
                        : selectedCompanyIds.length > 1
                        ? `Importa prodotti da ${selectedCompanyIds.length} aziende selezionate`
                        : "Importa prodotti dal magazzino dell'azienda selezionata"
                    }
                  >
                    {isWarehouseProductsLoading || isImportingFromWarehouse ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {isImportingFromWarehouse
                            ? "Importazione in corso..."
                            : "Caricamento..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4" />
                        <span>
                          Importa da magazzino
                          {selectedCompanyIds.length > 1
                            ? ` (${selectedCompanyIds.length} aziende)`
                            : ""}
                        </span>
                      </>
                    )}
                  </Button>
                )}
                {(!selectedImportMethod ||
                  ImportMethodPolicy.isSelected(
                    selectedImportMethod,
                    "csv"
                  )) && (
                  <ImportProducts
                    onAddRows={handleAddRowsFromCsv}
                    onProductsChange={setProducts}
                    disabled={
                      !!selectedImportMethod &&
                      !ImportMethodPolicy.isSelected(
                        selectedImportMethod,
                        "csv"
                      )
                    }
                    onSelectImportMethod={() => onSelectImportMethod("csv")}
                  />
                )}
                {(!selectedImportMethod ||
                  ImportMethodPolicy.isSelected(
                    selectedImportMethod,
                    "ddt"
                  )) && (
                  <ImportProductsFromDdt
                    onAddRows={handleAddRowsFromDdt}
                    onProductsChange={setProducts}
                    disabled={
                      !!selectedImportMethod &&
                      !ImportMethodPolicy.isSelected(
                        selectedImportMethod,
                        "ddt"
                      )
                    }
                    onSelectImportMethod={() => onSelectImportMethod("ddt")}
                  />
                )}
                {selectedImportMethod && (
                  <Button
                    variant="ghost"
                    className="gap-2 text-neutral-600 hover:text-neutral-900"
                    onClick={() => {
                      onResetImportMethod();
                      setShowAutomaticCompilation(false);
                      setProducts([]);
                      setSelectedProductIds([]);
                      setProductSources(new Map());
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span>
                      Reset ({ImportMethodPolicy.label(selectedImportMethod)})
                    </span>
                  </Button>
                )}
              </div>

              {showAutomaticCompilation && (
                <FitosanitariProductSearch
                  onProductSelected={handleRegistryProductSelected}
                />
              )}
            </div>

            <EditableTable
              ref={editableTableRef}
              columns={productColumns}
              rows={productsAsRows}
              isModify={true}
              addButton={true}
              createMode="inline"
              onSave={handleSaveProducts}
              onSelectionChange={handleProductSelectionChange}
              showDeleteAction={false}
              getRowId={(row, index) =>
                `${row.productName}-${row.registrationNumber}-${index}`
              }
              lastComponent={renderProductLabelAction}
            />
          </div>
          {products.length === 0 && renderEmptyProductsPlaceholder()}
        </div>
      </div>

      {/* Strategy Section */}
      <div className="space-y-6 relative">
        {selectedCompanyIds.length === 0 && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
            <div className="text-center p-6">
              <p className="text-base font-medium text-neutral-700 mb-2">
                Seleziona prima un'azienda
              </p>
              <p className="text-sm text-neutral-500">
                Per selezionare la strategia di calcolo, devi prima scegliere
                almeno un'azienda nella sezione sopra.
              </p>
            </div>
          </div>
        )}
        <div
          className={
            selectedCompanyIds.length > 0
              ? "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full"
              : "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full pointer-events-none opacity-50"
          }
        >
          <div>
            <h2 className="text-lg md:text-xl font-medium text-neutral-900">
              Seleziona la strategia di calcolo dosaggi
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {selectedStrategyOption.description}
            </p>
          </div>
          <Select
            value={strategy}
            onValueChange={(value) => setStrategy(value as DosageStrategy)}
            disabled={selectedCompanyIds.length === 0}
          >
            <SelectTrigger className="w-full max-w-sm h-12 bg-white border-neutral-200">
              <SelectValue placeholder="Seleziona una strategia" />
            </SelectTrigger>
            <SelectContent>
              {strategyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Out Stock Limiter Section */}
        <div
          className={
            selectedCompanyIds.length > 0
              ? "rounded-2xl border border-neutral-200 bg-white p-4 md:p-6 space-y-3"
              : "rounded-2xl border border-neutral-200 bg-white p-4 md:p-6 space-y-3 pointer-events-none opacity-50"
          }
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="outStockLimiter"
              checked={outStockLimiter}
              onCheckedChange={(checked) =>
                setOutStockLimiter(checked === true)
              }
              disabled={selectedCompanyIds.length === 0}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="outStockLimiter"
                className="text-base font-medium text-neutral-900 cursor-pointer"
              >
                {outStockLimiter
                  ? "Protezione stock magazzino (attiva)"
                  : "Protezione stock magazzino (disattiva)"}
              </Label>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {outStockLimiter
                  ? "Il sistema tutela lo stock caricato, evitando di andare sotto le quantità disponibili in magazzino."
                  : "Il sistema esegue un calcolo preciso dei dosaggi, permettendo di andare anche sotto le quantità disponibili in magazzino."}
              </p>
            </div>
          </div>
        </div>

        {/* Treatment Dates Section - Between stock protection and orchestrator */}
        {selectedUnitIds.length > 0 && (
          <div
            className={
              selectedCompanyIds.length > 0
                ? "rounded-2xl border border-neutral-200 bg-white"
                : "rounded-2xl border border-neutral-200 bg-white pointer-events-none opacity-50"
            }
          >
            <Accordion type="single" collapsible>
              <AccordionItem value="treatment-dates" className="border-0">
                <AccordionTrigger className="px-4 md:px-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-neutral-600 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-base font-medium text-neutral-900">
                        Periodo di trattamento (opzionale)
                      </span>
                      <span className="text-sm text-neutral-500">
                        Specifica il periodo di inizio e fine per l'applicazione
                        dei trattamenti
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6">
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-600">
                      Se non specificato, verrà utilizzato l'intero periodo di
                      produzione.
                    </p>
                    {validDateRange.minDate && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                        <p className="text-xs font-medium text-blue-900">
                          Range valido: dal{" "}
                          {new Date(validDateRange.minDate).toLocaleDateString(
                            "it-IT"
                          )}
                          {validDateRange.maxDate
                            ? ` al ${new Date(
                                validDateRange.maxDate
                              ).toLocaleDateString("it-IT")}`
                            : " in poi"}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Il periodo deve essere compreso tra la prima data di
                          inizio e l'ultima data di fine delle unità produttive
                          selezionate.
                        </p>
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="startAt"
                          className="text-sm font-medium text-neutral-900"
                        >
                          Data inizio trattamenti
                        </Label>
                        <Input
                          id="startAt"
                          type="date"
                          value={startAt}
                          onChange={(e) => {
                            const newStartAt = e.target.value;
                            setStartAt(newStartAt);
                            // Se la data fine è prima della nuova data inizio, resettala
                            if (endAt && newStartAt && endAt < newStartAt) {
                              setEndAt("");
                            }
                          }}
                          className="bg-white"
                          placeholder="Seleziona data inizio"
                          min={validDateRange.minDate}
                          max={validDateRange.maxDate}
                        />
                        <p className="text-xs text-neutral-500">
                          Data di inizio del periodo di trattamento
                        </p>
                        {startAt &&
                          validDateRange.minDate &&
                          startAt < validDateRange.minDate && (
                            <p className="text-xs text-red-600">
                              La data non può essere prima del{" "}
                              {new Date(
                                validDateRange.minDate
                              ).toLocaleDateString("it-IT")}
                            </p>
                          )}
                        {startAt &&
                          validDateRange.maxDate &&
                          startAt > validDateRange.maxDate && (
                            <p className="text-xs text-red-600">
                              La data non può essere dopo il{" "}
                              {new Date(
                                validDateRange.maxDate
                              ).toLocaleDateString("it-IT")}
                            </p>
                          )}
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="endAt"
                          className="text-sm font-medium text-neutral-900"
                        >
                          Data fine trattamenti
                        </Label>
                        <Input
                          id="endAt"
                          type="date"
                          value={endAt}
                          onChange={(e) => setEndAt(e.target.value)}
                          className="bg-white"
                          placeholder="Seleziona data fine"
                          min={
                            startAt && startAt >= (validDateRange.minDate || "")
                              ? startAt
                              : validDateRange.minDate
                          }
                          max={validDateRange.maxDate}
                        />
                        <p className="text-xs text-neutral-500">
                          Data di fine del periodo di trattamento
                        </p>
                        {endAt &&
                          validDateRange.minDate &&
                          endAt < validDateRange.minDate && (
                            <p className="text-xs text-red-600">
                              La data non può essere prima del{" "}
                              {new Date(
                                validDateRange.minDate
                              ).toLocaleDateString("it-IT")}
                            </p>
                          )}
                        {endAt &&
                          validDateRange.maxDate &&
                          endAt > validDateRange.maxDate && (
                            <p className="text-xs text-red-600">
                              La data non può essere dopo il{" "}
                              {new Date(
                                validDateRange.maxDate
                              ).toLocaleDateString("it-IT")}
                            </p>
                          )}
                        {endAt && startAt && endAt < startAt && (
                          <p className="text-xs text-red-600">
                            La data fine non può essere prima della data inizio
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* Orchestrator Section */}
        <div
          className={
            selectedCompanyIds.length > 0
              ? "rounded-2xl border border-neutral-200 bg-white"
              : "rounded-2xl border border-neutral-200 bg-white pointer-events-none opacity-50"
          }
        >
          <Accordion type="single" collapsible>
            <AccordionItem value="orchestrator" className="border-0">
              <AccordionTrigger className="px-4 md:px-6">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-neutral-600 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-neutral-900">
                      Parametri strategia
                    </span>
                    <span className="text-sm text-neutral-500">
                      Impostazioni avanzate per ottimizzare selezione e
                      pianificazione
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 md:px-6">
                <div className="space-y-8">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-neutral-900">
                        Obiettivo
                      </Label>
                      <Select
                        value={
                          (orchestratorSettings.objective ??
                            "balanced") as string
                        }
                        onValueChange={(value) => {
                          setOrchestratorSettings((prev) => ({
                            ...prev,
                            objective: value as OrchestratorObjective,
                          }));
                        }}
                      >
                        <SelectTrigger className="w-full h-12 bg-white border-neutral-200">
                          <SelectValue placeholder="Seleziona obiettivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            [
                              "minimize_interventions",
                              "maximize_coverage",
                              "balanced",
                              "cost_effective",
                            ] as OrchestratorObjective[]
                          ).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {OrchestratorLabels.objective(opt)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-neutral-900">
                        Intensità
                      </Label>
                      <Select
                        value={intensityValue as string}
                        onValueChange={(value) => {
                          if (value === "none") {
                            setOrchestratorSettings((prev) => {
                              const next: DosageOrchestratorSettings = {
                                ...prev,
                              };
                              delete (next as Record<string, unknown>)
                                .intensity;
                              return next;
                            });
                            return;
                          }
                          setOrchestratorSettings((prev) => ({
                            ...prev,
                            intensity: value as OrchestratorIntensity,
                          }));
                        }}
                      >
                        <SelectTrigger className="w-full h-12 bg-white border-neutral-200">
                          <SelectValue placeholder="Seleziona intensità" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessun limite</SelectItem>
                          {(
                            ["low", "medium", "high"] as OrchestratorIntensity[]
                          ).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {OrchestratorLabels.intensity(opt)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-fit justify-start gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700 hover:bg-neutral-200"
                        onClick={() => setShowMaxLimits((prev) => !prev)}
                      >
                        <Lock className="h-4 w-4" />
                        <span className="text-sm">Max applicazioni</span>
                        <span className="ml-2 text-xs text-neutral-500">
                          {showMaxLimits ? "Nascondi" : "Mostra"}
                        </span>
                      </Button>

                      {showMaxLimits && (
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-neutral-900">
                              Max prodotti per unità (override)
                            </Label>
                            <Input
                              inputMode="numeric"
                              placeholder={
                                orchestratorSettings.intensity
                                  ? `Default da intensità: ${OrchestratorIntensityDefaults.getMaxProductsPerUnit(
                                      orchestratorSettings.intensity as OrchestratorIntensity
                                    )}`
                                  : "Default da intensità: Nessun limite"
                              }
                              value={
                                orchestratorSettings.maxProductsPerUnit ===
                                undefined
                                  ? ""
                                  : String(
                                      orchestratorSettings.maxProductsPerUnit
                                    )
                              }
                              onChange={(e) => {
                                setOrchestratorSettings((prev) =>
                                  OrchestratorSettingsUpdater.setNumber(
                                    prev,
                                    "maxProductsPerUnit",
                                    e.target.value
                                  )
                                );
                              }}
                              className="bg-white"
                            />
                            <p className="text-xs text-neutral-500">
                              Lascia vuoto per usare il default legato a
                              “Intensità”.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-neutral-900">
                              Max applicazioni per prodotto per unità
                            </Label>
                            <Input
                              inputMode="numeric"
                              placeholder="2"
                              value={
                                orchestratorSettings.maxApplicationsPerProductPerUnit ===
                                undefined
                                  ? ""
                                  : String(
                                      orchestratorSettings.maxApplicationsPerProductPerUnit
                                    )
                              }
                              onChange={(e) => {
                                setOrchestratorSettings((prev) =>
                                  OrchestratorSettingsUpdater.setNumber(
                                    prev,
                                    "maxApplicationsPerProductPerUnit",
                                    e.target.value
                                  )
                                );
                              }}
                              className="bg-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-neutral-900">
                              Max job totali (limite hard)
                            </Label>
                            <Input
                              inputMode="numeric"
                              placeholder="(nessun limite)"
                              value={
                                orchestratorSettings.maxTotalJobs === undefined
                                  ? ""
                                  : String(orchestratorSettings.maxTotalJobs)
                              }
                              onChange={(e) => {
                                setOrchestratorSettings((prev) =>
                                  OrchestratorSettingsUpdater.setNumber(
                                    prev,
                                    "maxTotalJobs",
                                    e.target.value
                                  )
                                );
                              }}
                              className="bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Forced params (hidden): allowOutsideProductionTreatments=true, useLlmForSelection=true */}
                    </div>
                  </div>

                  {/* Category Priority */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">
                        Category priority (ordine)
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Seleziona le categorie e ordinale per priorità (prima =
                        più importante).
                      </p>
                    </div>

                    {orchestratorDatasets?.categories?.length ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                          <p className="text-xs font-medium text-neutral-700">
                            Selezione categorie
                          </p>
                          <MultiSearchableSelect
                            value={categoryPriority}
                            options={categoryOptions}
                            placeholder="Seleziona categorie..."
                            searchPlaceholder="Cerca categoria..."
                            onChange={(next) => {
                              setOrchestratorSettings((prev) => ({
                                ...prev,
                                categoryPriority: next,
                              }));
                            }}
                          />
                        </div>

                        <div className="rounded-xl border border-neutral-200 bg-white p-3 space-y-2">
                          <p className="text-xs font-medium text-neutral-700">
                            Ordine corrente
                          </p>
                          {categoryPriority.length === 0 ? (
                            <p className="text-sm text-neutral-500">
                              Nessuna categoria selezionata.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {categoryPriority.map((id, index) => {
                                const cat =
                                  orchestratorDatasets.categories.find(
                                    (c) => c.id === id
                                  ) ?? null;
                                const label = cat ? cat.label : id;
                                return (
                                  <div
                                    key={`priority-${id}-${index}`}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-neutral-900 truncate">
                                        {index + 1}. {label}
                                      </p>
                                      <p className="text-xs text-neutral-500 truncate">
                                        {id}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() =>
                                          setOrchestratorSettings((prev) => ({
                                            ...prev,
                                            categoryPriority:
                                              OrchestratorCategoryPriorityList.move(
                                                prev.categoryPriority ?? [],
                                                index,
                                                "up"
                                              ),
                                          }))
                                        }
                                        disabled={index === 0}
                                      >
                                        <ChevronUp className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() =>
                                          setOrchestratorSettings((prev) => ({
                                            ...prev,
                                            categoryPriority:
                                              OrchestratorCategoryPriorityList.move(
                                                prev.categoryPriority ?? [],
                                                index,
                                                "down"
                                              ),
                                          }))
                                        }
                                        disabled={
                                          index === categoryPriority.length - 1
                                        }
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                        onClick={() =>
                                          setOrchestratorSettings((prev) => ({
                                            ...prev,
                                            categoryPriority:
                                              OrchestratorCategoryPriorityList.remove(
                                                prev.categoryPriority ?? [],
                                                id
                                              ),
                                          }))
                                        }
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">
                        Dataset categorie non disponibile.
                      </p>
                    )}
                  </div>

                  {/* Priority targets */}
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900">
                          Priority targets (avversità)
                        </h3>
                        <p className="text-xs text-neutral-500">
                          Seleziona le avversità da coprire con priorità.
                        </p>
                      </div>
                    </div>

                    {orchestratorDatasets?.targets?.length ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-neutral-200 bg-white p-3 space-y-2">
                          <p className="text-xs font-medium text-neutral-700">
                            Selezione avversità
                          </p>
                          <MultiSearchableSelect
                            value={priorityTargets}
                            options={targetOptions}
                            placeholder="Seleziona avversità..."
                            searchPlaceholder="Cerca avversità..."
                            onChange={(next) => {
                              setOrchestratorSettings((prev) => ({
                                ...prev,
                                priorityTargets: next,
                              }));
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">
                        Dataset avversità non disponibile.
                      </p>
                    )}
                  </div>

                  {/* Agronomic notes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-neutral-900">
                      Note agronomiche
                    </Label>
                    <Textarea
                      value={orchestratorSettings.agronomicNotes ?? ""}
                      onChange={(e) =>
                        setOrchestratorSettings((prev) => ({
                          ...prev,
                          agronomicNotes: e.target.value || null,
                        }))
                      }
                      placeholder="Es: Pressione oidio alta quest'anno, evitare rame se possibile..."
                      className="min-h-28"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
