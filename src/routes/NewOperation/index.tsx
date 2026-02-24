import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import type {
  DosageStrategy,
  DosageOrchestratorSettings,
} from "@/api/dosage-agent";
import {
  OrchestratorDefaultsFactory,
  OrchestratorDatasetsLoader,
  type OrchestratorDatasets,
} from "@/routes/DosageManager/orchestrator";
import type { OperationMode } from "./types";
import { useNewOperationState } from "./hooks/useNewOperationState";
import { useUnifiedProductTable } from "./hooks/useUnifiedProductTable";
import { useManualSubmission } from "./hooks/useManualSubmission";
import { useAutomaticSubmission } from "./hooks/useAutomaticSubmission";
import { CompanySelector } from "./components/CompanySelector";
import { ModeSelector } from "./components/ModeSelector";
import { OperationTable } from "./components/OperationTable";
import { ImportToolbar } from "./components/ImportToolbar";
import { AutoConfigPanel } from "./components/AutoConfigPanel";
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

  // Load orchestrator datasets
  useEffect(() => {
    const loader = new OrchestratorDatasetsLoader();
    loader
      .load()
      .then(setOrchestratorDatasets)
      .catch((e) => console.error("Failed to load orchestrator datasets", e));
  }, []);

  // Main state hook
  const state = useNewOperationState();

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
      await manualSubmission.submit(table.rows, jobIdFromState);
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
      });
    }
  }, [
    state.operationMode,
    state.productionUnits,
    state.globalSelectedUnitIds,
    table.rows,
    manualSubmission,
    automaticSubmission,
    jobIdFromState,
    strategy,
    outStockLimiter,
    loadWarehouse,
    orchestratorSettings,
    orchestratorDatasets,
    startAt,
    endAt,
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
      <div className="border-b border-border/50 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/job")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>

        {/* Step indicator */}
        <div className="hidden md:flex items-center gap-1">
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
            {/* Company name */}
            <h2 className="text-lg font-semibold text-neutral-900">
              {state.selectedCompanyName}
            </h2>

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
                    selectedCompanyIds={
                      state.selectedCompanyId
                        ? [state.selectedCompanyId]
                        : []
                    }
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
                    onAddProductFromKey={table.addProductFromKey}
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
                  />
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
