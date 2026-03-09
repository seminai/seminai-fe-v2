import { Button } from "@/components/ui/button";
import type { ExtractionProgressState } from "@/hooks/useExtractionProgress";
import type { ExtractionPhase } from "@/services/extractionJobSocket";

const PHASE_LABELS: Record<ExtractionPhase, string> = {
  validating: "Validazione file",
  parsing_pdf: "Lettura PDF",
  parsing_csv: "Lettura CSV/Excel",
  parsing_shapefile: "Lettura shapefile",
  extracting_fields: "Estrazione campi",
  extracting_production_units: "Estrazione unità produttive",
  finalizing: "Finalizzazione",
  completed: "Completato",
};

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

interface ExtractionProgressPanelProps {
  readonly state: ExtractionProgressState;
  readonly onCancel?: () => void;
}

export default function ExtractionProgressPanel({
  state,
  onCancel,
}: ExtractionProgressPanelProps) {
  const phaseLabel = state.phase ? PHASE_LABELS[state.phase] : "Preparazione";
  const progressPercent = Math.min(Math.max(state.progress, 0), 100);

  return (
    <div className="flex items-center justify-center flex-1">
      <div className="flex flex-col items-center gap-5 w-full max-w-md px-6">
        {/* Circular progress indicator */}
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-neutral-100"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
              strokeLinecap="round"
              className="text-agri-green-600 transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold text-neutral-800">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </div>

        {/* Phase label */}
        <div className="text-center space-y-1">
          <p className="text-lg font-medium text-neutral-800">{phaseLabel}</p>
          <p className="text-sm text-neutral-500">{state.message}</p>
        </div>

        {/* Linear progress bar */}
        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-agri-green-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Elapsed time */}
        <p className="text-xs text-neutral-400">
          Tempo trascorso: {formatElapsed(state.elapsedMs)}
        </p>

        {/* Cancel button */}
        {onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="mt-2"
          >
            Annulla
          </Button>
        )}

        {/* Error */}
        {state.error && (
          <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
}
