import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  type ExtractedField,
  type ExtractedProductionUnit,
  type PhenologyPredictionInput,
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
  isPredicting: boolean;
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
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const companiesHook = useCompanies();

  /**
   * Predict missing flowering/harvesting dates for PUs that have cropName.
   * Merges predictions into productionUnitsData (only fills null fields).
   */
  const predictMissingPhenologyDates = useCallback(async () => {
    const pusNeedingPrediction = productionUnitsData
      .map((pu, i) => ({ pu, i }))
      .filter(
        ({ pu }) =>
          pu.cropName?.trim() &&
          (!pu.floweringDate || !pu.harvestingDate),
      );

    if (pusNeedingPrediction.length === 0) return;

    // Derive location from fields
    const location =
      fieldsData.find((f) => f.city)?.city ??
      fieldsData.find((f) => f.region)?.region ??
      undefined;

    const inputs: PhenologyPredictionInput[] = pusNeedingPrediction.map(
      ({ pu, i }) => ({
        index: i,
        cropName: pu.cropName!,
        cropType: pu.cropType ?? undefined,
        variety: pu.variety ?? undefined,
        location,
        startDate: pu.startDate ?? undefined,
        endDate: pu.endDate ?? undefined,
      }),
    );

    setIsPredicting(true);
    try {
      const response = await quickCreateApiService.predictPhenology(inputs);
      const predictions = response.data.predictions;

      if (predictions.length > 0) {
        const predictionMap = new Map(predictions.map((p) => [p.index, p]));

        setProductionUnitsData((prev) =>
          prev.map((pu, i) => {
            const pred = predictionMap.get(i);
            if (!pred) return pu;

            const updated = { ...pu };
            if (!updated.floweringDate) {
              updated.floweringDate = pred.floweringDate;
            }
            if (!updated.harvestingDate) {
              updated.harvestingDate = pred.harvestingDate;
            }
            // Append additional cycles for tree/multi-harvest crops
            if (pred.additionalCycles?.length) {
              const existingMaxIndex = Math.max(
                0,
                ...updated.cycles.map((c) => c.cycleIndex),
              );
              const newCycles = pred.additionalCycles.map((ac) => ({
                cycleIndex: existingMaxIndex + ac.cycleIndex,
                cropName: ac.cropName,
                cropType: updated.cropType,
                cropCode: null,
                variety: updated.variety,
                occupazione: null,
                destinazione: null,
                protectionStructure: null,
                startDate: updated.startDate,
                endDate: updated.endDate,
                floweringDate: ac.floweringDate,
                harvestingDate: ac.harvestingDate,
              }));
              updated.cycles = [...updated.cycles, ...newCycles];
            }
            return updated;
          }),
        );
      }
    } catch (err) {
      // Non-blocking: log but don't prevent navigation
      console.warn("Phenology prediction failed:", err);
    } finally {
      setIsPredicting(false);
    }
  }, [productionUnitsData, fieldsData]);

  const goNext = useCallback(async () => {
    setError(null);
    switch (currentStep) {
      case "company":
        setCurrentStep("choose-path");
        break;
      case "choose-path":
        setCurrentStep(selectedPath === "warehouse" ? "products" : "fields");
        break;
      case "fields":
        await predictMissingPhenologyDates();
        setCurrentStep("production-units");
        break;
      case "products":
        setCurrentStep("completion");
        break;
      default:
        break;
    }
  }, [currentStep, selectedPath, predictMissingPhenologyDates]);

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
      queryClient.invalidateQueries({ queryKey: ["fields"] });
      queryClient.invalidateQueries({ queryKey: ["production-units"] });
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

  const isProcessing = isSaving || isPredicting;

  return {
    state: {
      currentStep,
      selectedCompanyId,
      selectedPath,
      selectedFile,
      fieldsData,
      productionUnitsData,
      isSaving,
      isPredicting,
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
