import * as React from "react";

import { CheckCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type StepperProps = {
  currentStep: 1 | 2 | 3;
};

type StepMetadata = {
  number: 1 | 2 | 3;
  title: string;
  description: string;
};

class StepDescriptor {
  private readonly metadata: StepMetadata;

  constructor(metadata: StepMetadata) {
    this.metadata = metadata;
  }

  public getNumber(): StepMetadata["number"] {
    return this.metadata.number;
  }

  public getTitle(): string {
    return this.metadata.title;
  }

  public getDescription(): string {
    return this.metadata.description;
  }

  public isActive(currentStep: StepperProps["currentStep"]): boolean {
    return this.metadata.number === currentStep;
  }

  public isCompleted(currentStep: StepperProps["currentStep"]): boolean {
    return this.metadata.number < currentStep;
  }
}

class StepCollection {
  private readonly steps: StepDescriptor[];

  private constructor(steps: StepDescriptor[]) {
    this.steps = steps;
  }

  public static createDefault(): StepCollection {
    return new StepCollection([
      new StepDescriptor({
        number: 1,
        title: "Alloca i campi",
        description: "Seleziona i campi e la superficie da allocare",
      }),
      new StepDescriptor({
        number: 2,
        title: "Abbina la coltura",
        description: "Scegli la varietà da coltivare",
      }),
      new StepDescriptor({
        number: 3,
        title: "Conferma",
        description: "Riepilogo e creazione unità produttiva",
      }),
    ]);
  }

  public getDescriptors(): StepDescriptor[] {
    return this.steps;
  }
}

const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  const stepCollection = React.useMemo(
    () => StepCollection.createDefault(),
    []
  );

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-4">
        {stepCollection.getDescriptors().map((step, index, array) => {
          const isActive = step.isActive(currentStep);
          const isCompleted = step.isCompleted(currentStep);
          const shouldRenderConnector = index < array.length - 1;

          return (
            <React.Fragment key={step.getNumber()}>
              <div className="flex flex-col items-center text-center lg:flex-1 lg:flex-row lg:items-center lg:text-left">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-semibold transition-colors",
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : isActive
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 bg-white text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.getNumber()
                  )}
                </div>
                <div className="mt-3 lg:mt-0 lg:ml-3 max-w-[12rem]">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive
                        ? "text-blue-600"
                        : isCompleted
                        ? "text-green-600"
                        : "text-gray-500"
                    )}
                  >
                    {step.getTitle()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {step.getDescription()}
                  </p>
                </div>
              </div>

              {shouldRenderConnector && (
                <>
                  <div
                    className={cn(
                      "hidden lg:flex flex-1 h-0.5",
                      isCompleted ? "bg-green-500" : "bg-gray-300"
                    )}
                    aria-hidden="true"
                  />
                  <div
                    className="lg:hidden flex justify-center"
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        "w-0.5 h-6",
                        isCompleted ? "bg-green-500" : "bg-gray-300"
                      )}
                    />
                  </div>
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export { Stepper };
