import { useMemo, useState } from "react";

import { History, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { type JobHistoryEntry } from "@/api/jobs";
import { HistoryEntryDetails, HistoryEntryFormatter } from "./HistoryEntryDetails";

interface HistoryPanelProps {
  history: JobHistoryEntry[];
  jobCode: string;
  onProductClick?: (productName: string, registrationNumber?: string) => void;
}

export function HistoryPanel({
  history,
  jobCode,
  onProductClick,
}: HistoryPanelProps) {
  const [filterText, setFilterText] = useState<string>("");

  const groupedHistory = useMemo(() => {
    const groups: Record<string, JobHistoryEntry[]> = {};

    let filteredHistory = history;

    if (filterText) {
      const searchText = filterText.toLowerCase();
      filteredHistory = filteredHistory.filter((entry) => {
        return (
          entry.title.toLowerCase().includes(searchText) ||
          String(entry.value).toLowerCase().includes(searchText) ||
          entry.metadata?.description?.toLowerCase().includes(searchText) ||
          entry.metadata?.productName?.toLowerCase().includes(searchText) ||
          entry.metadata?.productRegistrationNumber
            ?.toLowerCase()
            .includes(searchText) ||
          entry.metadata?.productionUnitName
            ?.toLowerCase()
            .includes(searchText) ||
          entry.metadata?.cropName?.toLowerCase().includes(searchText)
        );
      });
    }

    filteredHistory.forEach((entry) => {
      if (!groups[entry.step]) {
        groups[entry.step] = [];
      }
      groups[entry.step].push(entry);
    });
    return groups;
  }, [history, filterText]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex-shrink-0 p-4 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Storico Operazione
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs shrink-0">
            {jobCode}
          </Badge>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cerca nello storico..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        <div className="space-y-4">
          {Object.entries(groupedHistory).map(([step, entries]) => (
            <div key={step} className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-1">
                {HistoryEntryFormatter.formatStep(step)}
              </h4>
              <div className="space-y-1.5">
                {entries.map((entry, idx) => (
                  <div
                    key={`${step}-${idx}`}
                    className="flex flex-col gap-0.5 py-1.5 border-l-2 border-slate-200 pl-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-medium text-slate-700 leading-tight">
                        {entry.title}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] shrink-0 px-1.5 py-0 ${HistoryEntryFormatter.getSourceColor(
                          entry.source
                        )}`}
                      >
                        {HistoryEntryFormatter.formatSource(entry.source)}
                      </Badge>
                    </div>
                    <span className="text-slate-600">
                      {String(entry.value)}
                    </span>
                    {entry.metadata?.description && (
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        {entry.metadata.description}
                      </p>
                    )}
                    <HistoryEntryDetails
                      entry={entry}
                      onProductClick={onProductClick}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedHistory).length === 0 && (
            <div className="text-center py-6 text-slate-400 text-xs">
              {filterText
                ? "Nessun risultato trovato"
                : "Nessuno storico disponibile"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryPanel;

