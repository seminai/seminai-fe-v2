import { useState, useMemo, type ReactElement, type Dispatch, type SetStateAction } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Lock,
  RotateCcw,
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
} from "@/routes/DosageManager/orchestrator";
import {
  MultiSearchableSelect,
  type MultiSearchableSelectOption,
} from "@/routes/DosageManager/MultiSearchableSelect";

interface AutoConfigPanelProps {
  strategy: DosageStrategy;
  setStrategy: Dispatch<SetStateAction<DosageStrategy>>;
  outStockLimiter: boolean;
  setOutStockLimiter: Dispatch<SetStateAction<boolean>>;
  loadWarehouse: boolean;
  setLoadWarehouse: Dispatch<SetStateAction<boolean>>;
  orchestratorSettings: DosageOrchestratorSettings;
  setOrchestratorSettings: Dispatch<SetStateAction<DosageOrchestratorSettings>>;
  orchestratorDatasets: OrchestratorDatasets | null;
  selectedUnitIds: string[];
  filteredUnits: ProductionUnit[];
  startAt: string;
  setStartAt: Dispatch<SetStateAction<string>>;
  endAt: string;
  setEndAt: Dispatch<SetStateAction<string>>;
  suggestedStartAt?: string;
  suggestedEndAt?: string;
}

const STRATEGY_OPTIONS: Array<{
  value: DosageStrategy;
  label: string;
  description: string;
}> = [
  {
    value: "current",
    label: "Dose Corrente",
    description: "Applica i dosaggi consigliati presenti in etichetta.",
  },
  {
    value: "max",
    label: "Dose Massima",
    description: "Utilizza la dose massima consentita per ciascun prodotto.",
  },
  {
    value: "min",
    label: "Dose Minima",
    description:
      "Applica la dose minima certificata per la coltura selezionata.",
  },
  {
    value: "avg",
    label: "Dose Media",
    description: "Calcola la media tra la dose minima e quella massima.",
  },
];

export function AutoConfigPanel({
  strategy,
  setStrategy,
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
  suggestedStartAt,
  suggestedEndAt,
}: AutoConfigPanelProps): ReactElement {
  const [showMaxLimits, setShowMaxLimits] = useState(false);

  const categoryPriority = orchestratorSettings.categoryPriority ?? [];
  const priorityTargets = orchestratorSettings.priorityTargets ?? [];
  const intensityValue = (orchestratorSettings.intensity ?? "none") as
    | OrchestratorIntensity
    | "none";

  const selectedStrategyOption = useMemo(
    () => STRATEGY_OPTIONS.find((o) => o.value === strategy) ?? STRATEGY_OPTIONS[3],
    [strategy],
  );

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
    const earliestDate = startDates.reduce((earliest, current) =>
      current < earliest ? current : earliest,
    );
    const minDateObj = new Date(earliestDate);
    minDateObj.setMonth(minDateObj.getMonth() - 3);
    const minDate = minDateObj.toISOString().split("T")[0];
    const endDates = selectedUnits
      .map((unit) => unit.productionUnit.endDate ?? unit.productionUnit.harvestingDate)
      .filter((date): date is string => Boolean(date));
    let maxDate: string | undefined;
    if (endDates.length > 0) {
      const latestDate = endDates.reduce((latest, current) =>
        current > latest ? current : latest,
      );
      const maxDateObj = new Date(latestDate);
      maxDateObj.setMonth(maxDateObj.getMonth() + 3);
      maxDate = maxDateObj.toISOString().split("T")[0];
    }
    return { minDate, maxDate };
  }, [selectedUnitIds, filteredUnits]);

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
      {/* Strategy + toggles in compact row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex-1 space-y-1">
          <Label className="text-sm font-medium text-neutral-700">
            Strategia globale
          </Label>
          <Select
            value={strategy}
            onValueChange={(v) => setStrategy(v as DosageStrategy)}
          >
            <SelectTrigger className="h-10 bg-white">
              <SelectValue placeholder="Seleziona strategia" />
            </SelectTrigger>
            <SelectContent>
              {STRATEGY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-neutral-500">
            {selectedStrategyOption.description}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="autoOutStockLimiter"
              checked={outStockLimiter}
              onCheckedChange={(c) => setOutStockLimiter(c === true)}
            />
            <Label
              htmlFor="autoOutStockLimiter"
              className="text-sm cursor-pointer"
            >
              Proteggi stock
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="autoLoadWarehouse"
              checked={loadWarehouse}
              onCheckedChange={(c) => setLoadWarehouse(c === true)}
            />
            <Label
              htmlFor="autoLoadWarehouse"
              className="text-sm cursor-pointer"
            >
              Carica in magazzino
            </Label>
          </div>
        </div>
      </div>

      {/* Advanced settings accordion */}
      <Accordion type="single" collapsible>
        {/* Treatment dates */}
        {selectedUnitIds.length > 0 && (
          <AccordionItem value="treatment-dates" className="border-0">
            <AccordionTrigger className="py-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium">
                  Periodo trattamento
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data inizio</Label>
                    <Input
                      type="date"
                      value={startAt}
                      onChange={(e) => {
                        setStartAt(e.target.value);
                        if (endAt && e.target.value && endAt < e.target.value) {
                          setEndAt("");
                        }
                      }}
                      min={validDateRange.minDate}
                      max={validDateRange.maxDate}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data fine</Label>
                    <Input
                      type="date"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      min={
                        startAt && startAt >= (validDateRange.minDate || "")
                          ? startAt
                          : validDateRange.minDate
                      }
                      max={validDateRange.maxDate}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Suggested range hint */}
                {(suggestedStartAt || suggestedEndAt) && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">
                      Suggerito:{" "}
                      {suggestedStartAt
                        ? new Date(suggestedStartAt).toLocaleDateString("it-IT")
                        : "—"}{" "}
                      →{" "}
                      {suggestedEndAt
                        ? new Date(suggestedEndAt).toLocaleDateString("it-IT")
                        : "—"}{" "}
                      <span className="text-neutral-300">
                        (±3 mesi dalle unità selezionate)
                      </span>
                    </p>
                    {(startAt !== (suggestedStartAt ?? "") ||
                      endAt !== (suggestedEndAt ?? "")) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs text-neutral-500"
                        onClick={() => {
                          if (suggestedStartAt) setStartAt(suggestedStartAt);
                          if (suggestedEndAt) setEndAt(suggestedEndAt);
                        }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Usa suggeriti
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Orchestrator params */}
        <AccordionItem value="orchestrator" className="border-0">
          <AccordionTrigger className="py-2">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-neutral-500" />
              <span className="text-sm font-medium">Parametri strategia</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Obiettivo</Label>
                  <Select
                    value={(orchestratorSettings.objective ?? "balanced") as string}
                    onValueChange={(v) =>
                      setOrchestratorSettings((prev) => ({
                        ...prev,
                        objective: v as OrchestratorObjective,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
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

                <div className="space-y-1">
                  <Label className="text-xs">Intensità</Label>
                  <Select
                    value={intensityValue as string}
                    onValueChange={(v) => {
                      if (v === "none") {
                        setOrchestratorSettings((prev) => {
                          const next = { ...prev };
                          delete (next as Record<string, unknown>).intensity;
                          return next;
                        });
                        return;
                      }
                      setOrchestratorSettings((prev) => ({
                        ...prev,
                        intensity: v as OrchestratorIntensity,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessun limite</SelectItem>
                      {(["low", "medium", "high"] as OrchestratorIntensity[]).map(
                        (opt) => (
                          <SelectItem key={opt} value={opt}>
                            {OrchestratorLabels.intensity(opt)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Max limits toggle */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-neutral-600"
                  onClick={() => setShowMaxLimits((p) => !p)}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Max applicazioni
                  <span className="text-xs text-neutral-400">
                    {showMaxLimits ? "Nascondi" : "Mostra"}
                  </span>
                </Button>

                {showMaxLimits && (
                  <div className="rounded-lg border bg-neutral-50 p-3 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Max prodotti/unità</Label>
                      <Input
                        inputMode="numeric"
                        placeholder={
                          orchestratorSettings.intensity
                            ? `Default: ${OrchestratorIntensityDefaults.getMaxProductsPerUnit(
                                orchestratorSettings.intensity as OrchestratorIntensity,
                              )}`
                            : "Nessun limite"
                        }
                        value={
                          orchestratorSettings.maxProductsPerUnit === undefined
                            ? ""
                            : String(orchestratorSettings.maxProductsPerUnit)
                        }
                        onChange={(e) =>
                          setOrchestratorSettings((prev) =>
                            OrchestratorSettingsUpdater.setNumber(
                              prev,
                              "maxProductsPerUnit",
                              e.target.value,
                            ),
                          )
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max applicazioni/prodotto</Label>
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
                        onChange={(e) =>
                          setOrchestratorSettings((prev) =>
                            OrchestratorSettingsUpdater.setNumber(
                              prev,
                              "maxApplicationsPerProductPerUnit",
                              e.target.value,
                            ),
                          )
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max job totali</Label>
                      <Input
                        inputMode="numeric"
                        placeholder="(nessun limite)"
                        value={
                          orchestratorSettings.maxTotalJobs === undefined
                            ? ""
                            : String(orchestratorSettings.maxTotalJobs)
                        }
                        onChange={(e) =>
                          setOrchestratorSettings((prev) =>
                            OrchestratorSettingsUpdater.setNumber(
                              prev,
                              "maxTotalJobs",
                              e.target.value,
                            ),
                          )
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Category Priority */}
              {orchestratorDatasets?.categories?.length ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Category priority</Label>
                  <MultiSearchableSelect
                    value={categoryPriority}
                    options={categoryOptions}
                    placeholder="Seleziona categorie..."
                    searchPlaceholder="Cerca categoria..."
                    onChange={(next) =>
                      setOrchestratorSettings((prev) => ({
                        ...prev,
                        categoryPriority: next,
                      }))
                    }
                  />
                  {categoryPriority.length > 0 && (
                    <div className="space-y-1">
                      {categoryPriority.map((id, index) => {
                        const cat = orchestratorDatasets!.categories.find(
                          (c) => c.id === id,
                        );
                        return (
                          <div
                            key={`cp-${id}-${index}`}
                            className="flex items-center justify-between rounded border px-2 py-1 text-xs"
                          >
                            <span>
                              {index + 1}. {cat?.label ?? id}
                            </span>
                            <div className="flex gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                disabled={index === 0}
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
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                disabled={index === categoryPriority.length - 1}
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
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500"
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
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Priority targets */}
              {orchestratorDatasets?.targets?.length ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Priority targets</Label>
                  <MultiSearchableSelect
                    value={priorityTargets}
                    options={targetOptions}
                    placeholder="Seleziona avversità..."
                    searchPlaceholder="Cerca avversità..."
                    onChange={(next) =>
                      setOrchestratorSettings((prev) => ({
                        ...prev,
                        priorityTargets: next,
                      }))
                    }
                  />
                </div>
              ) : null}

              {/* Agronomic notes */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Note agronomiche</Label>
                <Textarea
                  value={orchestratorSettings.agronomicNotes ?? ""}
                  onChange={(e) =>
                    setOrchestratorSettings((prev) => ({
                      ...prev,
                      agronomicNotes: e.target.value || null,
                    }))
                  }
                  placeholder="Es: Pressione oidio alta, evitare rame..."
                  className="min-h-20"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
