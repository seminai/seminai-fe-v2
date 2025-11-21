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
    <div className="mb-4 md:mb-8">
      <div className="flex items-center gap-2 md:gap-4">
        {stepCollection.getDescriptors().map((step, index, array) => {
          const isActive = step.isActive(currentStep);
          const isCompleted = step.isCompleted(currentStep);
          const shouldRenderConnector = index < array.length - 1;

          return (
            <React.Fragment key={step.getNumber()}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border-2 text-sm md:text-base font-semibold transition-colors",
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : isActive
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 bg-white text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                  ) : (
                    step.getNumber()
                  )}
                </div>
                <div className="mt-2 max-w-[8rem] md:max-w-[12rem]">
                  <p
                    className={cn(
                      "text-xs md:text-sm font-medium",
                      isActive
                        ? "text-blue-600"
                        : isCompleted
                        ? "text-green-600"
                        : "text-gray-500"
                    )}
                  >
                    {step.getTitle()}
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1 hidden md:block">
                    {step.getDescription()}
                  </p>
                </div>
              </div>

              {shouldRenderConnector && (
                <div
                  className={cn(
                    "flex flex-1 h-0.5 min-w-[1rem] md:min-w-[2rem]",
                    isCompleted ? "bg-green-500" : "bg-gray-300"
                  )}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export { Stepper };
