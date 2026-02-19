import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Octagon,
} from "lucide-react";
import { type DosageLogEvent } from "@/services/dosageJobSocket";

export function LiveLogEventCard({
  event,
}: {
  event: DosageLogEvent;
}): ReactElement {
  const timestamp = new Date(event.timestamp);
  const timeLabel = timestamp.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const getTypeStyles = (
    type: DosageLogEvent["type"],
  ): { bg: string; text: string; border: string; icon: ReactElement } => {
    switch (type) {
      case "match":
        return {
          bg: "bg-green-50",
          text: "text-green-700",
          border: "border-green-200",
          icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          text: "text-yellow-700",
          border: "border-yellow-200",
          icon: <Clock className="h-4 w-4 text-yellow-600" />,
        };
      case "error":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
          icon: <Octagon className="h-4 w-4 text-red-600" />,
        };
      case "progress":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
        };
      case "complete":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        };
      default:
        return {
          bg: "bg-neutral-50",
          text: "text-neutral-700",
          border: "border-neutral-200",
          icon: <FileText className="h-4 w-4 text-neutral-500" />,
        };
    }
  };

  const styles = getTypeStyles(event.type);

  return (
    <div
      className={`rounded-xl border ${styles.border} ${styles.bg} p-3 space-y-2`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {styles.icon}
          <Badge variant="outline" className="text-xs uppercase">
            {event.type}
          </Badge>
        </div>
        <span className="text-xs text-neutral-500 font-mono">{timeLabel}</span>
      </div>
      <p className={`text-sm ${styles.text} leading-relaxed break-words`}>
        {event.message}
      </p>
      {event.metadata && Object.keys(event.metadata).length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {event.metadata.productName && (
            <Badge variant="secondary" className="text-xs">
              Prodotto: {event.metadata.productName}
            </Badge>
          )}
          {event.metadata.quantity !== undefined && (
            <Badge variant="secondary" className="text-xs">
              Quantità: {event.metadata.quantity}
            </Badge>
          )}
          {event.metadata.unitId && (
            <Badge variant="outline" className="text-xs font-mono">
              Unit: {event.metadata.unitId.slice(0, 8)}...
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
