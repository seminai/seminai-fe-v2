import * as React from "react";
import { Button } from "@/components/ui/button";
import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import type { QuickCreateStep } from "../types";

interface WizardFooterProps {
  currentStep: QuickCreateStep;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  isNextDisabled: boolean;
  isLoading: boolean;
}

function getNextLabel(step: QuickCreateStep): string {
  switch (step) {
    case "company":
      return "Avanti";
    case "fields":
      return "Avanti";
    case "production-units":
      return "Salva e Continua";
    case "products":
      return "Completa";
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
}: WizardFooterProps): React.ReactElement | null {
  if (currentStep === "completion") return null;

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
        <div className="flex items-center gap-2">
          {currentStep === "products" && onSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={isLoading}
              className="text-neutral-500"
            >
              Salta
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={isNextDisabled || isLoading}
            className="gap-2"
          >
            {getNextLabel(currentStep)}
            {currentStep !== "production-units" && currentStep !== "products" && (
              <IoArrowForward className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
