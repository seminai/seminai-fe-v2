import { useMemo, useState, type Dispatch, type ReactElement, type SetStateAction } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Lock,
  Settings,
  X,
} from "lucide-react";
import type {
  DosageStrategy,
  DosageOrchestratorSettings,
  OrchestratorIntensity,
  OrchestratorObjective,
} from "@/api/dosage-agent";
import type { ProductionUnit } from "@/api/production-unit";
import {
  type OrchestratorDatasets,
  OrchestratorCategoryPriorityList,
  OrchestratorIntensityDefaults,
  OrchestratorLabels,
  OrchestratorSettingsUpdater,
} from "../orchestrator";
import {
  MultiSearchableSelect,
  type MultiSearchableSelectOption,
} from "../MultiSearchableSelect";
import type {
  OperationMachineAssignment,
  OperationOperatorAssignment,
} from "@/api/dosage-agent";
import { OperatorsAndMachinesSection } from "./OperatorsAndMachinesSection";

interface ConfigurationStepProps {
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
  loadWarehouse: boolean;
  setLoadWarehouse: Dispatch<SetStateAction<boolean>>;
  orchestratorSettings: DosageOrchestratorSettings;
  setOrchestratorSettings: Dispatch<SetStateAction<DosageOrchestratorSettings>>;
  orchestratorDatasets: OrchestratorDatasets | null;
  selectedUnitIds: string[];
  filteredUnits: ProductionUnit[];
  companies: Array<{ id: string; name: string }>;
  selectedCompanyIds: string[];
  operationMachines: OperationMachineAssignment[];
  setOperationMachines: Dispatch<SetStateAction<OperationMachineAssignment[]>>;
  operationOperators: OperationOperatorAssignment[];
  setOperationOperators: Dispatch<SetStateAction<OperationOperatorAssignment[]>>;
  startAt: string;
  setStartAt: Dispatch<SetStateAction<string>>;
  endAt: string;
  setEndAt: Dispatch<SetStateAction<string>>;
}

export function ConfigurationStep({
  strategy,
  setStrategy,
  strategyOptions,
  selectedStrategyOption,
  outStockLimiter,
  setOutStockLimiter,
  loadWarehouse,
  setLoadWarehouse,
  orchestratorSettings,
  setOrchestratorSettings,
  orchestratorDatasets,
  selectedUnitIds,
  filteredUnits,
  startAt,
  setStartAt,
  endAt,
  setEndAt,
  companies,
  selectedCompanyIds,
  operationMachines,
  setOperationMachines,
  operationOperators,
  setOperationOperators,
}: ConfigurationStepProps): ReactElement {
  const [showMaxLimits, setShowMaxLimits] = useState(false);

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
    [orchestratorDatasets],
  );

  const targetOptions = useMemo<MultiSearchableSelectOption[]>(
    () =>
      (orchestratorDatasets?.targets ?? []).map((t) => ({
        value: t.id,
        label: t.label,
        description: t.scientificName,
        groupLabel: t.group,
        searchAliases: t.aliases,
      })),
    [orchestratorDatasets],
  );

  const validDateRange = useMemo(() => {
    if (selectedUnitIds.length === 0) {
      return { minDate: undefined, maxDate: undefined };
    }

    const selectedUnits = filteredUnits.filter((unit) =>
      selectedUnitIds.includes(unit.productionUnit.id),
    );

    if (selectedUnits.length === 0) {
      return { minDate: undefined, maxDate: undefined };
    }

    const startDates = selectedUnits
      .map((unit) => unit.productionUnit.startDate)
      .filter((date): date is string => Boolean(date));

    if (startDates.length === 0) {
      return { minDate: undefined, maxDate: undefined };
    }

    const earliestDate = startDates.reduce((earliest, current) => {
      return current < earliest ? current : earliest;
    }, startDates[0]);

    const minDateObj = new Date(earliestDate);
    minDateObj.setMonth(minDateObj.getMonth() - 3);
    const minDate = minDateObj.toISOString().split("T")[0];

    const endDates = selectedUnits
      .map((unit) => unit.productionUnit.endDate)
      .filter((date): date is string => Boolean(date));

    let maxDate: string | undefined;
    if (endDates.length > 0) {
      const latestDate = endDates.reduce((latest, current) => {
        return current > latest ? current : latest;
      }, endDates[0]);

      const maxDateObj = new Date(latestDate);
      maxDateObj.setMonth(maxDateObj.getMonth() + 3);
      maxDate = maxDateObj.toISOString().split("T")[0];
    }

    return { minDate, maxDate };
  }, [selectedUnitIds, filteredUnits]);

  return (
    <div className="space-y-6">
      {/* Strategy Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full">
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
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="outStockLimiter"
            checked={outStockLimiter}
            onCheckedChange={(checked) =>
              setOutStockLimiter(checked === true)
            }
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

      {/* Load Warehouse Section */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="loadWarehouse"
            checked={loadWarehouse}
            onCheckedChange={(checked) => setLoadWarehouse(checked === true)}
            className="mt-0.5"
          />
          <div className="flex-1 space-y-1">
            <Label
              htmlFor="loadWarehouse"
              className="text-base font-medium text-neutral-900 cursor-pointer"
            >
              {loadWarehouse
                ? "Carica prodotti in magazzino (attivo)"
                : "Carica prodotti in magazzino (disattivo)"}
            </Label>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {loadWarehouse
                ? "I prodotti importati verranno caricati nel magazzino aziendale. Attiva questa opzione se stai importando prodotti da DDT."
                : "I prodotti importati non verranno caricati nel magazzino. Disattiva questa opzione per calcoli dosaggio senza modificare lo stock."}
            </p>
          </div>
        </div>
      </div>

      {/* Operators and Machines Section */}
      {selectedCompanyIds.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
          <OperatorsAndMachinesSection
            companies={companies}
            selectedCompanyIds={selectedCompanyIds}
            operationMachines={operationMachines}
            setOperationMachines={setOperationMachines}
            operationOperators={operationOperators}
            setOperationOperators={setOperationOperators}
          />
        </div>
      )}

      {/* Treatment Dates Section */}
      {selectedUnitIds.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white">
          <Accordion type="single" collapsible>
            <AccordionItem value="treatment-dates" className="border-0">
              <AccordionTrigger className="px-4 md:px-6">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-neutral-600 flex-shrink-0" />
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
                          "it-IT",
                        )}
                        {validDateRange.maxDate
                          ? ` al ${new Date(
                              validDateRange.maxDate,
                            ).toLocaleDateString("it-IT")}`
                          : " in poi"}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Puoi selezionare date fino a 3 mesi prima o dopo il
                        periodo delle unità produttive selezionate.
                      </p>
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-neutral-900">
                        Data inizio trattamenti
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-white"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startAt
                              ? format(parseISO(startAt), "dd/MM/yyyy", { locale: it })
                              : "Seleziona data inizio"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startAt ? parseISO(startAt) : undefined}
                            onSelect={(date) => {
                              const iso = date ? format(date, "yyyy-MM-dd") : "";
                              setStartAt(iso);
                              if (endAt && iso && endAt < iso) {
                                setEndAt("");
                              }
                            }}
                            disabled={(d) => {
                              if (validDateRange.minDate && d < parseISO(validDateRange.minDate)) return true;
                              if (validDateRange.maxDate && d > parseISO(validDateRange.maxDate)) return true;
                              return false;
                            }}
                            locale={it}
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-neutral-500">
                        Data di inizio del periodo di trattamento
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-neutral-900">
                        Data fine trattamenti
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-white"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endAt
                              ? format(parseISO(endAt), "dd/MM/yyyy", { locale: it })
                              : "Seleziona data fine"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endAt ? parseISO(endAt) : undefined}
                            onSelect={(date) => {
                              setEndAt(date ? format(date, "yyyy-MM-dd") : "");
                            }}
                            disabled={(d) => {
                              const minStr = startAt && startAt >= (validDateRange.minDate || "")
                                ? startAt
                                : validDateRange.minDate;
                              if (minStr && d < parseISO(minStr)) return true;
                              if (validDateRange.maxDate && d > parseISO(validDateRange.maxDate)) return true;
                              return false;
                            }}
                            locale={it}
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-neutral-500">
                        Data di fine del periodo di trattamento
                      </p>
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
      <div className="rounded-2xl border border-neutral-200 bg-white">
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
                                    orchestratorSettings.intensity as OrchestratorIntensity,
                                  )}`
                                : "Default da intensità: Nessun limite"
                            }
                            value={
                              orchestratorSettings.maxProductsPerUnit ===
                              undefined
                                ? ""
                                : String(
                                    orchestratorSettings.maxProductsPerUnit,
                                  )
                            }
                            onChange={(e) => {
                              setOrchestratorSettings((prev) =>
                                OrchestratorSettingsUpdater.setNumber(
                                  prev,
                                  "maxProductsPerUnit",
                                  e.target.value,
                                ),
                              );
                            }}
                            className="bg-white"
                          />
                          <p className="text-xs text-neutral-500">
                            Lascia vuoto per usare il default legato a
                            "Intensità".
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
                                    orchestratorSettings.maxApplicationsPerProductPerUnit,
                                  )
                            }
                            onChange={(e) => {
                              setOrchestratorSettings((prev) =>
                                OrchestratorSettingsUpdater.setNumber(
                                  prev,
                                  "maxApplicationsPerProductPerUnit",
                                  e.target.value,
                                ),
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
                                  e.target.value,
                                ),
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
                                  (c) => c.id === id,
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
                                              "up",
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
                                              "down",
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
                                              id,
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
  );
}
