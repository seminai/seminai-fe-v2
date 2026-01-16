import { Badge } from "@/components/ui/badge";
import { type JobGroupSummaryItem } from "@/api/jobs";
import { Building2, Calendar, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface JobGroupCardProps {
  group: JobGroupSummaryItem;
  isSelected: boolean;
  onClick: () => void;
}

export function JobGroupCard({
  group,
  isSelected,
  onClick,
}: JobGroupCardProps) {
  const formattedDate = new Date(group.createdAt).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        isSelected
          ? "bg-agri-green-50 border-agri-green-300 ring-1 ring-agri-green-200"
          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge className="font-mono text-xs bg-agri-green-50">
              #{group.jobId}
            </Badge>
            {group.pendingOperations > 0 && (
              <Badge variant="destructive" className="text-xs  text-black">
                {group.pendingOperations} da verificare
              </Badge>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {group.company.name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {group.totalOperations} operazion
            {group.totalOperations === 1 ? "e" : "i"}
          </div>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isSelected ? "text-black" : "text-slate-300"
          )}
        />
      </div>
    </button>
  );
}

export default JobGroupCard;
