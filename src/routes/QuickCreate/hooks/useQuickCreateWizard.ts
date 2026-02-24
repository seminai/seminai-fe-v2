import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  type ExtractedField,
  type ExtractedProductionUnit,
  quickCreateApiService,
} from "@/api/quick-create";
import { useCompanies } from "@/hooks/useCompanies";
import type { QuickCreateStep } from "../types";
import { QUICK_CREATE_STEPS } from "../types";

export interface QuickCreateWizardState {
  currentStep: QuickCreateStep;
  selectedCompanyId: string;
  selectedFile: File | null;
  fieldsData: ExtractedField[];
  productionUnitsData: ExtractedProductionUnit[];
  isSaving: boolean;
  error: string | null;
}

export interface QuickCreateWizardActions {
  setCurrentStep: (step: QuickCreateStep) => void;
  goNext: () => void;
  goBack: () => void;
  setSelectedCompanyId: (id: string) => void;
  setSelectedFile: (file: File | null) => void;
  setFieldsData: (data: ExtractedField[]) => void;
  setProductionUnitsData: (data: ExtractedProductionUnit[]) => void;
  setError: (error: string | null) => void;
  /** Step 3 → 4: bulk-create fields + PUs via /onboarding/bulk-create */
  savePUs: () => Promise<void>;
  onProductsComplete: () => void;
  onProductsSkip: () => void;
  navigateToDosageManager: () => void;
  navigateBack: () => void;
}

export interface UseQuickCreateWizardReturn {
  state: QuickCreateWizardState;
  actions: QuickCreateWizardActions;
  companies: ReturnType<typeof useCompanies>;
  isActionDisabled: boolean;
  isProcessing: boolean;
}

const STEP_ORDER: QuickCreateStep[] = QUICK_CREATE_STEPS.map((s) => s.key);

export function useQuickCreateWizard(): UseQuickCreateWizardReturn {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] =
    useState<QuickCreateStep>("company");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fieldsData, setFieldsData] = useState<ExtractedField[]>([]);
  const [productionUnitsData, setProductionUnitsData] = useState<
    ExtractedProductionUnit[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) {
      setError(null);
      setCurrentStep(STEP_ORDER[idx + 1]);
    }
  }, [currentStep]);

  const companiesHook = useCompanies();

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) {
      setError(null);
      setCurrentStep(STEP_ORDER[idx - 1]);
    }
  }, [currentStep]);

  /**
   * Step 3 → 4: Bulk-create fields + production units via /onboarding/bulk-create.
   * Sends the companyId + all fields + all PUs (potentially modified by user) to the backend.
   */
  const savePUs = useCallback(async () => {
    if (!selectedCompanyId) return;

    setIsSaving(true);
    setError(null);

    try {
      await quickCreateApiService.bulkCreate({
        companyId: selectedCompanyId,
        fields: fieldsData,
        productionUnits: productionUnitsData,
      });
      setCurrentStep("products");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore durante il salvataggio",
      );
    } finally {
      setIsSaving(false);
    }
  }, [selectedCompanyId, fieldsData, productionUnitsData]);

  const onProductsComplete = useCallback(() => {
    setCurrentStep("completion");
  }, []);

  const onProductsSkip = useCallback(() => {
    setCurrentStep("completion");
  }, []);

  const navigateToDosageManager = useCallback(() => {
    navigate("/job/new");
  }, [navigate]);

  const navigateBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const isActionDisabled = useMemo(() => {
    if (currentStep === "company") return !selectedCompanyId;
    if (currentStep === "fields") return fieldsData.length === 0;
    if (currentStep === "production-units")
      return productionUnitsData.length === 0;
    return false;
  }, [currentStep, selectedCompanyId, fieldsData, productionUnitsData]);

  const isProcessing = isSaving;

  return {
    state: {
      currentStep,
      selectedCompanyId,
      selectedFile,
      fieldsData,
      productionUnitsData,
      isSaving,
      error,
    },
    actions: {
      setCurrentStep,
      goNext,
      goBack,
      setSelectedCompanyId,
      setSelectedFile,
      setFieldsData,
      setProductionUnitsData,
      setError,
      savePUs,
      onProductsComplete,
      onProductsSkip,
      navigateToDosageManager,
      navigateBack,
    },
    companies: companiesHook,
    isActionDisabled,
    isProcessing,
  };
}
