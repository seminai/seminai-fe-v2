import * as React from "react";
import { Button } from "@/components/ui/button";
import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import { Search } from "lucide-react";
import type { QuickCreateStep } from "../types";

export interface ProductsStepState {
  isProductsLoading: boolean;
  hasProductsToLoad: boolean;
  /** True when files are selected but not yet extracted. */
  needsExtraction: boolean;
  /** Current internal step of the import panel. */
  importStep: "edit" | "review";
}

interface WizardFooterProps {
  currentStep: QuickCreateStep;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  isNextDisabled: boolean;
  isLoading: boolean;
  productsStepState?: ProductsStepState;
}

function getNextLabel(
  step: QuickCreateStep,
  productsStepState?: ProductsStepState,
): string {
  if (step === "products" && productsStepState) {
    if (productsStepState.isProductsLoading) return "Caricamento...";
    if (productsStepState.needsExtraction) return "Estrai prodotti";
    if (productsStepState.hasProductsToLoad) {
      return productsStepState.importStep === "edit"
        ? "Continua"
        : "Carica prodotti";
    }
    return "Carica prodotti";
  }
  switch (step) {
    case "company":
      return "Avanti";
    case "fields":
      return "Avanti";
    case "production-units":
      return "Salva e Continua";
    case "products":
      return "Carica prodotti";
    default:
      return "Avanti";
  }
}

function getBackLabel(step: QuickCreateStep): string {
  switch (step) {
    case "company":
      return "Annulla";
    default:
      return "Indietro";
  }
}

export default function WizardFooter({
  currentStep,
  onBack,
  onNext,
  onSkip,
  isNextDisabled,
  isLoading,
  productsStepState,
}: WizardFooterProps): React.ReactElement | null {
  if (currentStep === "completion") return null;

  const isChoosePathStep = currentStep === "choose-path";
  const isProductsStep = currentStep === "products";
  const productsLoading =
    isProductsStep && productsStepState?.isProductsLoading;
  const showExtractCta =
    isProductsStep && !!productsStepState?.needsExtraction;
  const nextDisabled =
    isNextDisabled ||
    isLoading ||
    (isProductsStep && productsStepState?.isProductsLoading) ||
    (isProductsStep &&
      !productsStepState?.hasProductsToLoad &&
      !productsStepState?.needsExtraction);

  return (
    <div className="bg-white border-t border-neutral-200 py-4 px-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
          className="gap-2"
        >
          <IoArrowBack className="w-4 h-4" />
          {getBackLabel(currentStep)}
        </Button>
        {!isChoosePathStep && (
          <div className="flex items-center gap-2">
            {isProductsStep && onSkip && (
              <Button
                variant="ghost"
                onClick={onSkip}
                disabled={isLoading || productsLoading}
                className="text-neutral-500"
              >
                Salta
              </Button>
            )}
            <Button
              onClick={onNext}
              disabled={nextDisabled}
              className={
                showExtractCta
                  ? "gap-2 bg-agri-green-600 text-white hover:bg-agri-green-700"
                  : "gap-2"
              }
            >
              {showExtractCta && <Search className="w-4 h-4" />}
              {getNextLabel(currentStep, productsStepState)}
              {currentStep !== "production-units" &&
                currentStep !== "products" && (
                  <IoArrowForward className="w-4 h-4" />
                )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
