import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStepId: string;
  className?: string;
}

/**
 * Compact horizontal stepper used to communicate a linear, small-N flow
 * (e.g. "Modifica dati" -> "Revisione"). Past steps are marked as done,
 * the current step is highlighted, future steps are muted.
 */
export function Stepper({ steps, currentStepId, className }: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <ol
      className={cn(
        "flex items-center gap-2 text-xs font-medium",
        className,
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                isCompleted && "border-agri-green-600 bg-agri-green-600 text-white",
                isActive && "border-agri-green-600 text-agri-green-700",
                !isCompleted && !isActive && "border-gray-300 text-gray-400",
              )}
            >
              {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <span
              className={cn(
                "whitespace-nowrap transition-colors",
                isActive && "text-foreground",
                isCompleted && "text-muted-foreground",
                !isActive && !isCompleted && "text-muted-foreground/60",
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span
                className={cn(
                  "mx-1 h-px w-6 bg-gray-200",
                  isCompleted && "bg-agri-green-500",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
