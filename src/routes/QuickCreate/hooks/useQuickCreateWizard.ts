import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  type ExtractedField,
  type ExtractedProductionUnit,
  quickCreateApiService,
} from "@/api/quick-create";
import { useCompanies } from "@/hooks/useCompanies";
import type { QuickCreateStep, QuickCreatePath } from "../types";

export interface QuickCreateWizardState {
  currentStep: QuickCreateStep;
  selectedCompanyId: string;
  selectedPath: QuickCreatePath | null;
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
  choosePath: (path: QuickCreatePath) => void;
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

export function useQuickCreateWizard(): UseQuickCreateWizardReturn {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] =
    useState<QuickCreateStep>("company");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedPath, setSelectedPath] = useState<QuickCreatePath | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fieldsData, setFieldsData] = useState<ExtractedField[]>([]);
  const [productionUnitsData, setProductionUnitsData] = useState<
    ExtractedProductionUnit[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companiesHook = useCompanies();

  const goNext = useCallback(() => {
    setError(null);
    switch (currentStep) {
      case "company":
        setCurrentStep("choose-path");
        break;
      case "choose-path":
        setCurrentStep(selectedPath === "warehouse" ? "products" : "fields");
        break;
      case "fields":
        setCurrentStep("production-units");
        break;
      case "products":
        setCurrentStep("completion");
        break;
      default:
        break;
    }
  }, [currentStep, selectedPath]);

  const goBack = useCallback(() => {
    setError(null);
    switch (currentStep) {
      case "choose-path":
        setCurrentStep("company");
        break;
      case "fields":
        setCurrentStep("choose-path");
        break;
      case "production-units":
        setCurrentStep("fields");
        break;
      case "products":
        setCurrentStep(
          selectedPath === "warehouse" ? "choose-path" : "production-units",
        );
        break;
      default:
        break;
    }
  }, [currentStep, selectedPath]);

  const choosePath = useCallback((path: QuickCreatePath) => {
    setError(null);
    setSelectedPath(path);
    setCurrentStep(path === "warehouse" ? "products" : "fields");
  }, []);

  /**
   * Step 3 → 4: Bulk-create fields + production units via /onboarding/bulk-create.
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
      selectedPath,
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
      choosePath,
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
