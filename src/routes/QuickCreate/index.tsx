import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuickCreateWizard } from "./hooks/useQuickCreateWizard";
import WizardShell from "./components/WizardShell";
import CompanyStep from "./components/CompanyStep";
import FieldsStep from "./components/FieldsStep";
import ProductionUnitsStep from "./components/ProductionUnitsStep";
import ProductsStep from "./components/ProductsStep";
import CompletionScreen from "./components/CompletionScreen";
import type { ProductsStepState } from "./components/WizardFooter";

const INITIAL_PRODUCTS_STEP_STATE: ProductsStepState = {
  isProductsLoading: false,
  hasProductsToLoad: false,
};

export default function QuickCreatePage(): React.ReactElement {
  const navigate = useNavigate();
  const wizard = useQuickCreateWizard();
  const { state, actions } = wizard;

  // Ref to trigger product import/create from the wizard footer's main button
  const productsImportRef = React.useRef<(() => Promise<void>) | null>(null);

  const [productsStepState, setProductsStepState] =
    React.useState<ProductsStepState>(INITIAL_PRODUCTS_STEP_STATE);

  const handleNext = React.useCallback(async () => {
    if (state.currentStep === "company") {
      actions.goNext();
      return;
    }

    if (state.currentStep === "fields") {
      // Just go to PU step — no saving yet
      actions.goNext();
      return;
    }

    if (state.currentStep === "production-units") {
      // Bulk-create fields + PUs via /onboarding/bulk-create
      actions.savePUs();
      return;
    }

    if (state.currentStep === "products") {
      // Trigger the product import/create via the ref (file import or manual form).
      // On success, onImportCompleted/onProductCreated → onProductsComplete is called automatically.
      if (productsImportRef.current) {
        await productsImportRef.current();
      } else {
        // No trigger (e.g. still on choice screen) — just complete without loading products
        actions.onProductsComplete();
      }
      return;
    }

    actions.goNext();
  }, [state.currentStep, actions]);

  const handleBack = React.useCallback(() => {
    if (state.currentStep === "company") {
      navigate(-1);
      return;
    }
    actions.goBack();
  }, [state.currentStep, actions, navigate]);

  const loadingMessage = state.isSaving
    ? "Salvataggio in corso..."
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

      {state.currentStep === "fields" && (
        <FieldsStep
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
