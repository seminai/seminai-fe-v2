import * as React from "react";
import { IoCheckmarkCircle } from "react-icons/io5";
import { cn } from "@/lib/utils";
import { QUICK_CREATE_STEPS, type QuickCreateStep } from "../types";

interface StepperIndicatorProps {
  currentStep: QuickCreateStep;
}

export default function StepperIndicator({
  currentStep,
}: StepperIndicatorProps): React.ReactElement | null {
  if (currentStep === "completion") return null;

  const currentIndex = QUICK_CREATE_STEPS.findIndex(
    (s) => s.key === currentStep,
  );

  return (
    <div className="flex items-center justify-center gap-2">
      {QUICK_CREATE_STEPS.map((step, index) => {
        const isCompleted = currentIndex > index;
        const isCurrent = step.key === currentStep;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                  isCompleted
                    ? "bg-agri-green-600 border-agri-green-600 text-white"
                    : isCurrent
                      ? "bg-white border-agri-green-600 text-black"
                      : "bg-white border-neutral-300 text-neutral-400",
                )}
              >
                {isCompleted ? (
                  <IoCheckmarkCircle className="w-6 h-6" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-black" : "text-neutral-500",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < QUICK_CREATE_STEPS.length - 1 && (
              <div
                className={cn(
                  "w-24 h-0.5 mb-8",
                  currentIndex > index ? "bg-agri-green-600" : "bg-neutral-200",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
