import * as React from "react";
import { IoCheckmarkCircle } from "react-icons/io5";
import { cn } from "@/lib/utils";
import { DOSAGE_WIZARD_STEPS, type DosageWizardStep } from "./types";

interface DosageStepperIndicatorProps {
  currentStep: DosageWizardStep;
  onStepClick: (step: DosageWizardStep) => void;
  canNavigateTo: (step: DosageWizardStep) => boolean;
}

export function DosageStepperIndicator({
  currentStep,
  onStepClick,
  canNavigateTo,
}: DosageStepperIndicatorProps): React.ReactElement {
  const currentIndex = DOSAGE_WIZARD_STEPS.findIndex(
    (s) => s.key === currentStep,
  );

  return (
    <div className="flex items-stretch border-b border-neutral-200">
      {DOSAGE_WIZARD_STEPS.map((step, index) => {
        const isCompleted = currentIndex > index;
        const isCurrent = step.key === currentStep;
        const isClickable = canNavigateTo(step.key);

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => isClickable && onStepClick(step.key)}
            disabled={!isClickable}
            className={cn(
              "flex items-center gap-2 px-3 md:px-5 py-3 text-sm font-medium transition-all relative",
              "border-b-2 -mb-px",
              isCurrent
                ? "border-agri-green-600 text-agri-green-700 bg-agri-green-50/50"
                : isCompleted
                  ? "border-transparent text-neutral-700 hover:text-agri-green-600 hover:bg-neutral-50"
                  : "border-transparent text-neutral-400",
              isClickable && !isCurrent
                ? "cursor-pointer"
                : !isClickable
                  ? "cursor-not-allowed"
                  : "",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all flex-shrink-0",
                isCurrent
                  ? "bg-agri-green-600 text-white"
                  : isCompleted
                    ? "bg-agri-green-100 text-agri-green-700"
                    : "bg-neutral-100 text-neutral-400",
              )}
            >
              {isCompleted ? (
                <IoCheckmarkCircle className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className="hidden md:inline whitespace-nowrap">
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
