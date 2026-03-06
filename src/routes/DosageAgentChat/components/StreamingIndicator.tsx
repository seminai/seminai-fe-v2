import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { StreamingStatus } from "@/hooks/useDosageAgentChat";
import { getToolLabel } from "../constants";

export function StreamingIndicator({
  streamingStatus,
  activeTool,
  toolCount,
}: {
  streamingStatus: StreamingStatus;
  activeTool: string | null;
  toolCount: number;
}) {
  const statusLabel = (() => {
    switch (streamingStatus) {
      case "thinking":
        return "L'agente sta ragionando...";
      case "tool_running":
        return activeTool
          ? `${getToolLabel(activeTool)}...`
          : "Esecuzione strumento...";
      case "plan_executing":
        return "Esecuzione piano in corso...";
      default:
        return "L'agente sta elaborando...";
    }
  })();

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Spinner className="h-3 w-3" ariaLabel="Agente attivo" />
      <span>{statusLabel}</span>
      {toolCount > 0 && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
          <Wrench className="h-2.5 w-2.5 mr-0.5" />
          {toolCount}
        </Badge>
      )}
    </div>
  );
}
