import { FileText } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export function ExtractionProgressIndicator({
  progress,
  step,
}: {
  readonly progress: number;
  readonly step: string;
}) {
  const clamped = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl max-w-sm">
      <FileText className="h-4 w-4 text-agri-green-600 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Spinner className="h-3 w-3" ariaLabel="Elaborazione file" />
          <span className="truncate">{step}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-agri-green-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-medium text-slate-700 tabular-nums shrink-0">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
