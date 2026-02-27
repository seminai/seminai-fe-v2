import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Hash, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useJobGroupsSummary } from "@/hooks/useJobGroups";
import { generateRandomJobId } from "@/routes/Job/utils";

import type {
  DosageStrategy,
  DosageOrchestratorSettings,
  OperationMachineAssignment,
  OperationOperatorAssignment,
} from "@/api/dosage-agent";
import {
  OrchestratorDefaultsFactory,
  OrchestratorDatasetsLoader,
  type OrchestratorDatasets,
} from "@/routes/DosageManager/orchestrator";
import { useNewOperationState } from "./hooks/useNewOperationState";
import { useUnifiedProductTable } from "./hooks/useUnifiedProductTable";
import { useManualSubmission } from "./hooks/useManualSubmission";
import { useAutomaticSubmission } from "./hooks/useAutomaticSubmission";
import { CompanySelector } from "./components/CompanySelector";
import { ModeSelector } from "./components/ModeSelector";
import { OperationTable } from "./components/OperationTable";
import { ImportToolbar } from "./components/ImportToolbar";
import { AutoConfigPanel } from "./components/AutoConfigPanel";
import { OperatorsAndMachinesSection } from "@/routes/DosageManager/steps/OperatorsAndMachinesSection";
import { HistoryTab } from "./components/HistoryTab";

type TabView = "manage" | "history";

export default function NewOperation() {
  const navigate = useNavigate();
  const location = useLocation();
  const jobIdFromState = (location.state as { jobId?: string } | null)?.jobId;

  const [activeTab, setActiveTab] = useState<TabView>("manage");

  // Auto config state
  const [strategy, setStrategy] = useState<DosageStrategy>("avg");
  const [outStockLimiter, setOutStockLimiter] = useState(true);
  const [loadWarehouse, setLoadWarehouse] = useState(false);
  const [orchestratorSettings, setOrchestratorSettings] =
    useState<DosageOrchestratorSettings>(() =>
      OrchestratorDefaultsFactory.create(),
    );
  const [orchestratorDatasets, setOrchestratorDatasets] =
    useState<OrchestratorDatasets | null>(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [operationMachines, setOperationMachines] = useState<
    OperationMachineAssignment[]
  >([]);
  const [operationOperators, setOperationOperators] = useState<
    OperationOperatorAssignment[]
  >([]);

  // Operation code state (manual mode only)
  const [operationCode, setOperationCode] = useState<string>(() =>
    generateRandomJobId(),
  );
  const [operationCodeMode, setOperationCodeMode] = useState<
    "random" | "existing"
  >("random");
  const { groups: jobGroups, isLoading: isLoadingJobGroups } =
    useJobGroupsSummary();

  // Main state hook
  const state = useNewOperationState();

  // Suggested treatment date range based on selected production units
  const suggestedDateRange = useMemo(() => {
    if (state.globalSelectedUnitIds.length === 0) {
      return { suggestedStartAt: undefined, suggestedEndAt: undefined };
    }
    const selectedUnits = state.productionUnits.filter((pu) =>
      state.globalSelectedUnitIds.includes(pu.productionUnit.id),
    );
    if (selectedUnits.length === 0) {
      return { suggestedStartAt: undefined, suggestedEndAt: undefined };
    }

    // Earliest startDate - 3 months
    const startDates = selectedUnits
      .map((u) => u.productionUnit.startDate)
      .filter((d): d is string => Boolean(d));
    let suggestedStartAt: string | undefined;
    if (startDates.length > 0) {
      const earliest = startDates.reduce((a, b) => (a < b ? a : b));
      const d = new Date(earliest);
      d.setMonth(d.getMonth() - 3);
      suggestedStartAt = d.toISOString().split("T")[0];
    }

    // Latest (endDate ?? harvestingDate) + 3 months
    const endOrHarvestDates = selectedUnits
      .map((u) => u.productionUnit.endDate ?? u.productionUnit.harvestingDate)
      .filter((d): d is string => Boolean(d));
    let suggestedEndAt: string | undefined;
    if (endOrHarvestDates.length > 0) {
      const latest = endOrHarvestDates.reduce((a, b) => (a > b ? a : b));
      const d = new Date(latest);
      d.setMonth(d.getMonth() + 3);
      suggestedEndAt = d.toISOString().split("T")[0];
    }

    return { suggestedStartAt, suggestedEndAt };
  }, [state.globalSelectedUnitIds, state.productionUnits]);

  // Auto-fill dates when units are selected and dates are still empty
  useEffect(() => {
    if (startAt === "" && suggestedDateRange.suggestedStartAt) {
      setStartAt(suggestedDateRange.suggestedStartAt);
    }
    if (endAt === "" && suggestedDateRange.suggestedEndAt) {
      setEndAt(suggestedDateRange.suggestedEndAt);
    }
  }, [suggestedDateRange.suggestedStartAt, suggestedDateRange.suggestedEndAt]);

  // Load orchestrator datasets
  useEffect(() => {
    const loader = new OrchestratorDatasetsLoader();
    loader
      .load()
      .then(setOrchestratorDatasets)
      .catch((e) => console.error("Failed to load orchestrator datasets", e));
  }, []);

  // Production unit map for manual submission
  const productionUnitMap = useMemo(() => {
    const map = new Map<string, { id: string; areaHa: number }>();
    state.productionUnitOptions.forEach((pu) => {
      map.set(pu.id, { id: pu.id, areaHa: pu.areaHa });
    });
    return map;
  }, [state.productionUnitOptions]);

  // Product table hook
  const table = useUnifiedProductTable(
    state.operationMode,
    state.selectedCompanyId,
    state.selectedCompanyName,
    state.warehouseProducts,
    state.isLoadingWarehouseProducts,
    state.globalSelectedUnitIds,
  );

  // Submission hooks
  const manualSubmission = useManualSubmission(productionUnitMap);
  const automaticSubmission = useAutomaticSubmission();

  const isSubmitting =
    manualSubmission.isSubmitting || automaticSubmission.isSubmitting;

  // Handle generate button
  const handleGenerate = useCallback(async () => {
    if (!state.operationMode) return;

    if (state.operationMode === "manual") {
      const manualJobId = operationCode || jobIdFromState;
      await manualSubmission.submit(table.rows, manualJobId);
    } else {
      const selectedUnits = state.productionUnits.filter((pu) =>
        state.globalSelectedUnitIds.includes(pu.productionUnit.id),
      );
      await automaticSubmission.submit({
        rows: table.rows,
        globalStrategy: strategy,
        outStockLimiter,
        loadWarehouse,
        orchestratorSettings,
        orchestratorDatasets,
        selectedUnits,
        startAt,
        endAt,
        operationMachines,
        operationOperators,
      });
    }
  }, [
    state.operationMode,
    state.productionUnits,
    state.globalSelectedUnitIds,
    table.rows,
    manualSubmission,
    automaticSubmission,
    operationCode,
    jobIdFromState,
    strategy,
    outStockLimiter,
    loadWarehouse,
    orchestratorSettings,
    orchestratorDatasets,
    startAt,
    endAt,
    operationMachines,
    operationOperators,
  ]);

  const canGenerate =
    table.rows.length > 0 &&
    !isSubmitting &&
    (state.operationMode === "manual"
      ? table.rows.every(
          (r) =>
            r.productName.trim() !== "" &&
            r.dateOfOperation &&
            r.selectedUnitIds.length > 0,
        )
      : state.globalSelectedUnitIds.length > 0);

  // Step indicator
  const stepLabels = [
    { key: "company", label: "Azienda", done: !!state.selectedCompanyId },
    { key: "mode", label: "Modalità", done: !!state.operationMode },
    { key: "table", label: "Operazione", done: false },
  ] as const;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 flex-shrink-0 grid grid-cols-3 items-center px-4 sm:px-6 py-3">
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (state.currentStep === "company") {
                navigate("/job");
              } else {
                state.goBack();
              }
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Indietro
          </Button>
        </div>

        <div className="flex justify-center">
          {state.selectedCompanyName && (
            <span className="text-sm font-semibold text-neutral-900 truncate">
              {state.selectedCompanyName}
            </span>
          )}
        </div>

        {/* Step indicator */}
        <div className="hidden md:flex items-center gap-1 justify-end">
          {stepLabels.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => state.goToStep(s.key)}
                disabled={!state.canGoToStep(s.key)}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  state.currentStep === s.key
                    ? "bg-neutral-900 text-white"
                    : s.done
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-neutral-100 text-neutral-400"
                } ${state.canGoToStep(s.key) ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                {i + 1}. {s.label}
              </button>
              {i < stepLabels.length - 1 && (
                <span className="text-neutral-300 text-xs">&rarr;</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Company step */}
        {state.currentStep === "company" && (
          <CompanySelector
            companyOptions={state.companyOptions}
            selectedCompanyId={state.selectedCompanyId}
            onCompanyChange={state.handleCompanyChange}
          />
        )}

        {/* Mode step */}
        {state.currentStep === "mode" && (
          <ModeSelector onModeChange={state.handleModeChange} />
        )}

        {/* Table step */}
        {state.currentStep === "table" && state.operationMode && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Tab switcher (only show history tab for automatic) */}
            {state.operationMode === "automatic" && (
              <div className="flex items-center gap-1 border-b border-neutral-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("manage")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "manage"
                      ? "border-neutral-900 text-neutral-900"
                      : "border-transparent text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  Gestisci
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "history"
                      ? "border-neutral-900 text-neutral-900"
                      : "border-transparent text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  Storico
                </button>
              </div>
            )}

            {activeTab === "manage" ? (
              <div className="space-y-4">
                {/* Import toolbar (automatic mode) */}
                {state.operationMode === "automatic" && (
                  <ImportToolbar
                    onImportFromWarehouse={table.handleImportFromWarehouse}
                    onImportFromNotes={table.handleImportFromNotes}
                    onAddRowsFromCsv={table.handleAddRowsFromCsv}
                    onAddRowsFromDdt={table.handleAddRowsFromDdt}
                    isImportingFromWarehouse={table.isImportingFromWarehouse}
                    isImportingFromNotes={table.isImportingFromNotes}
                    isLoadingWarehouse={state.isLoadingWarehouseProducts}
                  />
                )}

                {/* Loading indicator */}
                {state.isLoadingUnits ? (
                  <div className="flex items-center justify-center py-8 text-neutral-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Caricamento unità produttive...
                  </div>
                ) : (
                  <OperationTable
                    mode={state.operationMode}
                    rows={table.rows}
                    unitOptions={state.productionUnitOptions}
                    productSelectOptions={table.productSelectOptions}
                    globalSelectedUnitIds={state.globalSelectedUnitIds}
                    onGlobalSelectedUnitIdsChange={
                      state.setGlobalSelectedUnitIds
                    }
                    onUpdateRow={table.updateRow}
                    onRemoveRows={table.removeRows}
                    onChangeRowProduct={table.changeRowProduct}
                    onAddEmptyRow={table.addEmptyRow}
                  />
                )}

                {/* Auto config panel (below table) */}
                {state.operationMode === "automatic" && (
                  <AutoConfigPanel
                    strategy={strategy}
                    setStrategy={setStrategy}
                    outStockLimiter={outStockLimiter}
                    setOutStockLimiter={setOutStockLimiter}
                    loadWarehouse={loadWarehouse}
                    setLoadWarehouse={setLoadWarehouse}
                    orchestratorSettings={orchestratorSettings}
                    setOrchestratorSettings={setOrchestratorSettings}
                    orchestratorDatasets={orchestratorDatasets}
                    selectedUnitIds={state.globalSelectedUnitIds}
                    filteredUnits={state.productionUnits}
                    startAt={startAt}
                    setStartAt={setStartAt}
                    endAt={endAt}
                    setEndAt={setEndAt}
                    suggestedStartAt={suggestedDateRange.suggestedStartAt}
                    suggestedEndAt={suggestedDateRange.suggestedEndAt}
                    companies={state.companies}
                    selectedCompanyIds={state.selectedCompanyId ? [state.selectedCompanyId] : []}
                    operationMachines={operationMachines}
                    setOperationMachines={setOperationMachines}
                    operationOperators={operationOperators}
                    setOperationOperators={setOperationOperators}
                  />
                )}

                {/* Manual mode: operation code + machines/operators */}
                {state.operationMode === "manual" && state.selectedCompanyId && (
                  <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
                    <Accordion type="multiple">
                      {/* Operation Code */}
                      <AccordionItem value="operation-code" className="border-0">
                        <AccordionTrigger className="py-2">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-neutral-500" />
                            <span className="text-sm font-medium">
                              Codice operazione
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            <p className="text-xs text-neutral-500">
                              Genera un nuovo codice casuale o associa a un job esistente
                            </p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={operationCodeMode === "random" ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setOperationCodeMode("random");
                                  setOperationCode(generateRandomJobId());
                                }}
                              >
                                Genera nuovo
                              </Button>
                              <Button
                                type="button"
                                variant={operationCodeMode === "existing" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setOperationCodeMode("existing")}
                                disabled={!jobGroups || jobGroups.length === 0}
                              >
                                Usa esistente
                              </Button>
                            </div>

                            {operationCodeMode === "random" ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={operationCode}
                                  readOnly
                                  className="max-w-[180px] font-mono text-base tracking-wider bg-neutral-50 h-9"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-9 w-9 p-0"
                                  onClick={() => setOperationCode(generateRandomJobId())}
                                  title="Rigenera codice"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Select
                                value={operationCode}
                                onValueChange={setOperationCode}
                              >
                                <SelectTrigger className="h-9 bg-white">
                                  <SelectValue
                                    placeholder={
                                      isLoadingJobGroups
                                        ? "Caricamento..."
                                        : "Seleziona un job esistente"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {(jobGroups ?? []).map((group) => (
                                    <SelectItem key={group.jobId} value={group.jobId}>
                                      <span className="font-mono">{group.jobId}</span>
                                      <span className="ml-2 text-neutral-500">
                                        — {group.company.name} ({new Date(group.createdAt).toLocaleDateString("it-IT")})
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Machines and operators */}
                      <AccordionItem value="machines-operators" className="border-0">
                        <AccordionTrigger className="py-2">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-neutral-500" />
                            <span className="text-sm font-medium">
                              Macchinari e operatori
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <OperatorsAndMachinesSection
                            companies={state.companies}
                            selectedCompanyIds={[state.selectedCompanyId]}
                            operationMachines={operationMachines}
                            setOperationMachines={setOperationMachines}
                            operationOperators={operationOperators}
                            setOperationOperators={setOperationOperators}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}

                {/* Generate button */}
                <div className="flex justify-end pt-4 border-t border-neutral-200">
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="h-11 px-8"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {state.operationMode === "manual"
                          ? "Creazione..."
                          : "Avvio calcolo..."}
                      </>
                    ) : state.operationMode === "manual" ? (
                      "Crea operazioni"
                    ) : (
                      "Calcola dosaggi"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <HistoryTab />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
