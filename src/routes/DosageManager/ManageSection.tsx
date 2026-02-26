import {
  type Dispatch,
  type ReactElement,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  type EditableColumn,
  type EditableTableRef,
} from "@/components/organism/EditableTable";
import type {
  DosageStrategy,
  DosageProduct,
  DosageOrchestratorSettings,
  OperationMachineAssignment,
  OperationOperatorAssignment,
} from "@/api/dosage-agent";
import type { ProductionUnit } from "@/api/production-unit";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";
import type { OrchestratorDatasets } from "./orchestrator";
import { OrchestratorDefaultsFactory } from "./orchestrator";
import type { ImportMethod } from "./importMethod";
import type { UseDosageWizardReturn } from "./wizard/useDosageWizard";
import { DosageWizardFooter } from "./wizard/DosageWizardFooter";
import { CompanyStep } from "./steps/CompanyStep";
import { UnitsStep } from "./steps/UnitsStep";
import { ProductsStep } from "./steps/ProductsStep";
import { ConfigurationStep } from "./steps/ConfigurationStep";

// Extended product type with internal ID for unique row identification
type ProductWithInternalId = DosageProduct & { _internalId: string };

interface ManageSectionProps {
  companies: { id: string; name: string }[];
  selectedCompanyIds: string[];
  setSelectedCompanyIds: Dispatch<SetStateAction<string[]>>;
  selectedUnitIds: string[];
  setSelectedUnitIds: Dispatch<SetStateAction<string[]>>;
  totalAreaHa: number;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  loadingUnits: boolean;
  filteredUnits: ProductionUnit[];
  productionUnitTableColumns: EditableColumn[];
  productionUnitTableRows: Array<Record<string, unknown>>;
  handleUnitSelectionChange: (rows: Array<Record<string, unknown>>) => void;
  handleUnitTableSave: (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => void;
  products: ProductWithInternalId[];
  setProducts: Dispatch<SetStateAction<ProductWithInternalId[]>>;
  setSelectedProductIds: Dispatch<SetStateAction<string[]>>;
  setProductSources: Dispatch<
    SetStateAction<Map<string, "warehouse" | "csv" | "ddt" | "notes">>
  >;
  productColumns: EditableColumn[];
  productsAsRows: Array<Record<string, unknown>>;
  handleSaveProducts: (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => void;
  handleDeleteProducts: (rows: Array<Record<string, unknown>>) => void;
  handleProductSelectionChange: (rows: Array<Record<string, unknown>>) => void;
  handleAddRowsFromCsv: (rows: Array<Record<string, unknown>>) => void;
  handleAddRowsFromDdt: (rows: Array<Record<string, unknown>>) => void;
  handleImportFromWarehouse: () => void;
  handleImportFromNotes: () => void;
  isWarehouseProductsLoading: boolean;
  isImportingFromWarehouse: boolean;
  isImportingFromNotes: boolean;
  handleRegistryProductSelected: (record: FitosanitariDatasetRecord) => void;
  editableTableRef: RefObject<EditableTableRef | null>;
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
  operationMachines: OperationMachineAssignment[];
  setOperationMachines: Dispatch<SetStateAction<OperationMachineAssignment[]>>;
  operationOperators: OperationOperatorAssignment[];
  setOperationOperators: Dispatch<SetStateAction<OperationOperatorAssignment[]>>;
  // Wizard-specific props
  onCalculateDosages: () => void;
  isSubmitting: boolean;
  isCalculateDisabled: boolean;
  selectionSummary: string;
  selectedCompanyNames: string[];
  orchestratorSummary: {
    objectiveLabel: string;
    intensityLabel: string;
    categoriesCount: number;
    targetsCount: number;
    llm: boolean;
  };
  isMobile: boolean;
  sidebarState: string;
  mobileBottomOccupied: number;
  wizard: UseDosageWizardReturn;
}

export function ManageSection({
  companies,
  selectedCompanyIds,
  setSelectedCompanyIds,
  selectedUnitIds,
  setSelectedUnitIds,
  totalAreaHa,
  searchQuery,
  setSearchQuery,
  loadingUnits,
  filteredUnits,
  productionUnitTableColumns,
  productionUnitTableRows,
  handleUnitSelectionChange,
  handleUnitTableSave,
  products,
  setProducts,
  setSelectedProductIds,
  setProductSources,
  productColumns,
  productsAsRows,
  handleSaveProducts,
  handleDeleteProducts,
  handleProductSelectionChange,
  handleAddRowsFromCsv,
  handleAddRowsFromDdt,
  handleImportFromWarehouse,
  handleImportFromNotes,
  isWarehouseProductsLoading,
  isImportingFromWarehouse,
  isImportingFromNotes,
  handleRegistryProductSelected,
  editableTableRef,
  strategy,
  setStrategy,
  strategyOptions,
  selectedStrategyOption,
  outStockLimiter,
  setOutStockLimiter,
  loadWarehouse,
  setLoadWarehouse,
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
  operationMachines,
  setOperationMachines,
  operationOperators,
  setOperationOperators,
  onCalculateDosages,
  isSubmitting,
  isCalculateDisabled,
  selectionSummary,
  selectedCompanyNames,
  orchestratorSummary,
  isMobile,
  sidebarState,
  mobileBottomOccupied,
  wizard,
}: ManageSectionProps): ReactElement {
  const handleCompanyChange = (ids: string[]) => {
    setSelectedCompanyIds(ids);
    setSelectedUnitIds([]);
    setSearchQuery("");
    setProducts([]);
    setProductSources(new Map());
    onResetImportMethod();
    setStrategy("avg");
    setOutStockLimiter(true);
    setLoadWarehouse(false);
    setOrchestratorSettings(OrchestratorDefaultsFactory.create());
    setStartAt("");
    setEndAt("");
  };

  const handleNext = () => {
    if (wizard.isLastStep) {
      onCalculateDosages();
    } else {
      wizard.goNext();
    }
  };

  const isNextDisabled = wizard.isLastStep
    ? isCalculateDisabled
    : !wizard.canGoNext;

  return (
    <div className="mx-auto flex flex-col min-h-full">
      <div className="flex-1">
        {wizard.currentStep === "company" && (
          <CompanyStep
            companies={companies}
            selectedCompanyIds={selectedCompanyIds}
            onCompanyChange={handleCompanyChange}
          />
        )}

        {wizard.currentStep === "units" && (
          <UnitsStep
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            loadingUnits={loadingUnits}
            filteredUnits={filteredUnits}
            productionUnitTableColumns={productionUnitTableColumns}
            productionUnitTableRows={productionUnitTableRows}
            handleUnitSelectionChange={handleUnitSelectionChange}
            handleUnitTableSave={handleUnitTableSave}
          />
        )}

        {wizard.currentStep === "products" && (
          <ProductsStep
            selectedCompanyIds={selectedCompanyIds}
            products={products}
            setProducts={setProducts}
            setSelectedProductIds={setSelectedProductIds}
            setProductSources={setProductSources}
            productColumns={productColumns}
            productsAsRows={productsAsRows}
            handleSaveProducts={handleSaveProducts}
            handleDeleteProducts={handleDeleteProducts}
            handleProductSelectionChange={handleProductSelectionChange}
            handleAddRowsFromCsv={handleAddRowsFromCsv}
            handleAddRowsFromDdt={handleAddRowsFromDdt}
            handleImportFromWarehouse={handleImportFromWarehouse}
            handleImportFromNotes={handleImportFromNotes}
            isWarehouseProductsLoading={isWarehouseProductsLoading}
            isImportingFromWarehouse={isImportingFromWarehouse}
            isImportingFromNotes={isImportingFromNotes}
            handleRegistryProductSelected={handleRegistryProductSelected}
            editableTableRef={editableTableRef}
            renderEmptyProductsPlaceholder={renderEmptyProductsPlaceholder}
            totalAreaHa={totalAreaHa}
            selectedImportMethod={selectedImportMethod}
            onSelectImportMethod={onSelectImportMethod}
            onResetImportMethod={onResetImportMethod}
          />
        )}

        {wizard.currentStep === "configuration" && (
          <ConfigurationStep
            strategy={strategy}
            setStrategy={setStrategy}
            strategyOptions={strategyOptions}
            selectedStrategyOption={selectedStrategyOption}
            outStockLimiter={outStockLimiter}
            setOutStockLimiter={setOutStockLimiter}
            loadWarehouse={loadWarehouse}
            setLoadWarehouse={setLoadWarehouse}
            orchestratorSettings={orchestratorSettings}
            setOrchestratorSettings={setOrchestratorSettings}
            orchestratorDatasets={orchestratorDatasets}
            selectedUnitIds={selectedUnitIds}
            filteredUnits={filteredUnits}
            startAt={startAt}
            setStartAt={setStartAt}
            endAt={endAt}
            setEndAt={setEndAt}
            companies={companies}
            selectedCompanyIds={selectedCompanyIds}
            operationMachines={operationMachines}
            setOperationMachines={setOperationMachines}
            operationOperators={operationOperators}
            setOperationOperators={setOperationOperators}
          />
        )}
      </div>

      <div
        className="fixed bottom-0 right-0 z-40"
        style={{
          bottom: isMobile ? mobileBottomOccupied : undefined,
          left: isMobile
            ? 0
            : sidebarState === "collapsed"
              ? "calc(var(--sidebar-width-icon) + 1rem)"
              : "var(--sidebar-width)",
        }}
      >
        <DosageWizardFooter
          currentStep={wizard.currentStep}
          onBack={wizard.goBack}
          onNext={handleNext}
          isNextDisabled={isNextDisabled}
          isSubmitting={isSubmitting}
          summaryInfo={
            wizard.isLastStep
              ? {
                  selectionSummary,
                  companyNames: selectedCompanyNames,
                  strategyLabel: selectedStrategyOption.label,
                  orchestratorSummary,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
