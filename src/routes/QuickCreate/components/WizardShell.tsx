import * as React from "react";
import { Spinner } from "@/components/ui/spinner";
import StepperIndicator from "./StepperIndicator";
import WizardFooter from "./WizardFooter";
import type { QuickCreateStep } from "../types";
import type { ProductsStepState } from "./WizardFooter";

interface WizardShellProps {
  currentStep: QuickCreateStep;
  isProcessing: boolean;
  loadingMessage?: string;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  isNextDisabled: boolean;
  productsStepState?: ProductsStepState;
  children: React.ReactNode;
}

export default function WizardShell({
  currentStep,
  isProcessing,
  loadingMessage = "Elaborazione in corso...",
  onBack,
  onNext,
  onSkip,
  isNextDisabled,
  productsStepState,
  children,
}: WizardShellProps): React.ReactElement {
  const showStepper =
    currentStep !== "company" &&
    currentStep !== "choose-path" &&
    currentStep !== "completion";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
      {showStepper && (
        <div className="flex-shrink-0 px-6 pt-6 pb-2">
          <StepperIndicator currentStep={currentStep} />
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isProcessing ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="flex flex-col items-center gap-6">
              <Spinner size={80} speed="normal" />
              <p className="text-lg text-neutral-600 font-medium">
                {loadingMessage}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-full p-6 pt-2">{children}</div>
        )}
      </div>

      <div className="flex-shrink-0">
        <WizardFooter
          currentStep={currentStep}
          onBack={onBack}
          onNext={onNext}
          onSkip={onSkip}
          isNextDisabled={isNextDisabled}
          isLoading={isProcessing}
          productsStepState={productsStepState}
        />
      </div>
    </div>
  );
}
