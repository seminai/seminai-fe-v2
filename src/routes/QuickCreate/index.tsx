import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuickCreateWizard } from "./hooks/useQuickCreateWizard";
import WizardShell from "./components/WizardShell";
import CompanyStep from "./components/CompanyStep";
import ChoosePathStep from "./components/ChoosePathStep";
import FieldsStep from "./components/FieldsStep";
import ProductionUnitsStep from "./components/ProductionUnitsStep";
import ProductsStep from "./components/ProductsStep";
import CompletionScreen from "./components/CompletionScreen";
import type { ProductsStepState } from "./components/WizardFooter";

const INITIAL_PRODUCTS_STEP_STATE: ProductsStepState = {
  isProductsLoading: false,
  hasProductsToLoad: false,
  needsExtraction: false,
  importStep: "edit",
};

export default function QuickCreatePage(): React.ReactElement {
  const navigate = useNavigate();
  const wizard = useQuickCreateWizard();
  const { state, actions } = wizard;

  // Ref to trigger product import/create from the wizard footer's main button
  const productsImportRef = React.useRef<(() => Promise<void>) | null>(null);
  // Ref to trigger product extraction (pre-extraction primary CTA)
  const productsExtractionRef = React.useRef<(() => Promise<void>) | null>(
    null,
  );
  // Ref to go back from review to edit within the import panel
  const productsBackRef = React.useRef<(() => void) | null>(null);

  const [productsStepState, setProductsStepState] =
    React.useState<ProductsStepState>(INITIAL_PRODUCTS_STEP_STATE);

  const handleNext = React.useCallback(async () => {
    if (state.currentStep === "company") {
      actions.goNext();
      return;
    }

    if (state.currentStep === "fields") {
      actions.goNext();
      return;
    }

    if (state.currentStep === "production-units") {
      actions.savePUs();
      return;
    }

    if (state.currentStep === "products") {
      if (productsStepState.needsExtraction && productsExtractionRef.current) {
        await productsExtractionRef.current();
        return;
      }
      if (productsImportRef.current) {
        await productsImportRef.current();
      } else {
        actions.onProductsComplete();
      }
      return;
    }

    actions.goNext();
  }, [state.currentStep, actions, productsStepState.needsExtraction]);

  const handleBack = React.useCallback(() => {
    if (state.currentStep === "company") {
      navigate(-1);
      return;
    }
    if (
      state.currentStep === "products" &&
      productsBackRef.current &&
      productsStepState.importStep === "review"
    ) {
      productsBackRef.current();
      return;
    }
    actions.goBack();
  }, [state.currentStep, actions, navigate, productsStepState.importStep]);

  const loadingMessage = state.isSaving
    ? "Salvataggio in corso..."
    : state.isPredicting
      ? "Predizione date fenologiche..."
      : "Elaborazione in corso...";

  return (
    <WizardShell
      currentStep={state.currentStep}
      isProcessing={wizard.isProcessing}
      loadingMessage={loadingMessage}
      onBack={handleBack}
      onNext={handleNext}
      onSkip={
        state.currentStep === "products" ? actions.onProductsSkip : undefined
      }
      isNextDisabled={wizard.isActionDisabled}
      productsStepState={
        state.currentStep === "products" ? productsStepState : undefined
      }
    >
      {state.currentStep === "company" && <CompanyStep wizard={wizard} />}

      {state.currentStep === "choose-path" && (
        <ChoosePathStep onChoosePath={actions.choosePath} />
      )}

      {state.currentStep === "fields" && (
        <FieldsStep
          companyId={state.selectedCompanyId}
          fieldsData={state.fieldsData}
          onFieldsChange={actions.setFieldsData}
          onProductionUnitsExtracted={actions.setProductionUnitsData}
          onFileSelected={actions.setSelectedFile}
          selectedFile={state.selectedFile}
          error={state.error}
          onError={actions.setError}
        />
      )}

      {state.currentStep === "production-units" && (
        <ProductionUnitsStep
          fieldsData={state.fieldsData}
          productionUnitsData={state.productionUnitsData}
          companyId={state.selectedCompanyId}
          onProductionUnitsChange={actions.setProductionUnitsData}
          error={state.error}
        />
      )}

      {state.currentStep === "products" && (
        <ProductsStep
          companyId={state.selectedCompanyId}
          onComplete={actions.onProductsComplete}
          importTriggerRef={productsImportRef}
          extractionTriggerRef={productsExtractionRef}
          importBackTriggerRef={productsBackRef}
          onProductsStepStateChange={setProductsStepState}
        />
      )}

      {state.currentStep === "completion" && (
        <CompletionScreen
          onGoToDosage={actions.navigateToDosageManager}
          onGoToDashboard={() => navigate("/dashboard")}
        />
      )}
    </WizardShell>
  );
}
