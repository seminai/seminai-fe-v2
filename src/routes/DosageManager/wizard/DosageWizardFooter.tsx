import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import { Calculator, Loader2 } from "lucide-react";
import type { DosageWizardStep } from "./types";

interface DosageWizardFooterProps {
  currentStep: DosageWizardStep;
  onBack: () => void;
  onNext: () => void;
  isNextDisabled: boolean;
  isSubmitting: boolean;
  summaryInfo?: {
    selectionSummary: string;
    companyNames: string[];
    strategyLabel: string;
    orchestratorSummary: {
      objectiveLabel: string;
      intensityLabel: string;
      categoriesCount: number;
      targetsCount: number;
      llm: boolean;
    };
  };
}

function getNextLabel(step: DosageWizardStep, isSubmitting: boolean): string {
  if (step === "configuration") {
    return isSubmitting ? "Calcolo..." : "Calcola Dosaggi";
  }
  return "Avanti";
}

function getBackLabel(step: DosageWizardStep): string {
  if (step === "company") {
    return "";
  }
  return "Indietro";
}

export function DosageWizardFooter({
  currentStep,
  onBack,
  onNext,
  isNextDisabled,
  isSubmitting,
  summaryInfo,
}: DosageWizardFooterProps): ReactElement {
  const isLastStep = currentStep === "configuration";
  const isFirstStep = currentStep === "company";
  const backLabel = getBackLabel(currentStep);
  const nextLabel = getNextLabel(currentStep, isSubmitting);

  return (
    <div className="bg-white border-t border-neutral-200 py-4 px-4 md:px-6 shadow-sm">
      <div className="max-w-7xl mx-auto">
        {isLastStep && summaryInfo && (
          <div className="hidden md:block mb-3">
            <p className="text-sm text-neutral-500">
              {summaryInfo.companyNames.length > 0
                ? `Aziend${summaryInfo.companyNames.length === 1 ? "a" : "e"} selezionat${summaryInfo.companyNames.length === 1 ? "a" : "e"}: ${summaryInfo.companyNames.join(", ")}`
                : "Nessuna azienda selezionata"}
            </p>
            <p className="text-sm text-neutral-500">
              Strategia selezionata: {summaryInfo.strategyLabel}
            </p>
            <p className="text-sm text-neutral-500">
              Orchestrator: {summaryInfo.orchestratorSummary.objectiveLabel} •{" "}
              {summaryInfo.orchestratorSummary.intensityLabel} • cat.{" "}
              {summaryInfo.orchestratorSummary.categoriesCount} • target{" "}
              {summaryInfo.orchestratorSummary.targetsCount} • LLM{" "}
              {summaryInfo.orchestratorSummary.llm ? "ON" : "OFF"}
            </p>
            <p className="text-base font-medium text-neutral-900">
              {summaryInfo.selectionSummary}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between">
          {!isFirstStep ? (
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={isSubmitting}
              className="gap-2"
            >
              <IoArrowBack className="w-4 h-4" />
              {backLabel}
            </Button>
          ) : (
            <div />
          )}
          <Button
            size={isLastStep ? "lg" : "default"}
            onClick={onNext}
            disabled={isNextDisabled || isSubmitting}
            className="gap-2 min-w-32"
          >
            {isLastStep ? (
              isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{nextLabel}</span>
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
                  <span>{nextLabel}</span>
                </>
              )
            ) : (
              <>
                <span>{nextLabel}</span>
                <IoArrowForward className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
