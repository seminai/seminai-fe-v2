import { useState, useCallback, useMemo } from "react";
import { type DosageWizardStep, DOSAGE_WIZARD_STEPS } from "./types";

const STEP_ORDER: DosageWizardStep[] = DOSAGE_WIZARD_STEPS.map((s) => s.key);

interface UseDosageWizardParams {
  hasCompany: boolean;
  hasUnits: boolean;
  hasProducts: boolean;
}

export interface UseDosageWizardReturn {
  currentStep: DosageWizardStep;
  setCurrentStep: (step: DosageWizardStep) => void;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: DosageWizardStep) => void;
  canNavigateTo: (step: DosageWizardStep) => boolean;
  canGoNext: boolean;
  stepIndex: number;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function useDosageWizard({
  hasCompany,
  hasUnits,
  hasProducts,
}: UseDosageWizardParams): UseDosageWizardReturn {
  const [currentStep, setCurrentStep] =
    useState<DosageWizardStep>("company");

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case "company":
        return hasCompany;
      case "units":
        return hasUnits;
      case "products":
        return hasProducts;
      case "configuration":
        return true;
      default:
        return false;
    }
  }, [currentStep, hasCompany, hasUnits, hasProducts]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    if (stepIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[stepIndex + 1]);
    }
  }, [canGoNext, stepIndex]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      setCurrentStep(STEP_ORDER[stepIndex - 1]);
    }
  }, [stepIndex]);

  const canNavigateTo = useCallback(
    (step: DosageWizardStep): boolean => {
      switch (step) {
        case "company":
          return true;
        case "units":
          return hasCompany;
        case "products":
          return hasCompany && hasUnits;
        case "configuration":
          return hasCompany && hasUnits && hasProducts;
        default:
          return false;
      }
    },
    [hasCompany, hasUnits, hasProducts],
  );

  const goToStep = useCallback(
    (step: DosageWizardStep) => {
      if (canNavigateTo(step)) {
        setCurrentStep(step);
      }
    },
    [canNavigateTo],
  );

  return {
    currentStep,
    setCurrentStep,
    goNext,
    goBack,
    goToStep,
    canNavigateTo,
    canGoNext,
    stepIndex,
    isFirstStep,
    isLastStep,
  };
}
