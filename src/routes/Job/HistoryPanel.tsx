import { useMemo, useState } from "react";

import { History, Search, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  type JobHistoryEntry,
  type JobModificationEntry,
  type JobStandardHistoryEntry,
  isJobModificationEntry,
  isJobStandardHistoryEntry,
} from "@/api/jobs";
import {
  HistoryEntryDetails,
  HistoryEntryFormatter,
  ModificationEntryDetails,
} from "./HistoryEntryDetails";

interface HistoryPanelProps {
  history: JobHistoryEntry[];
  jobCode: string;
  onProductClick?: (productName: string, registrationNumber?: string) => void;
}

// Tipo per rappresentare entry raggruppate (standard o modifica)
type GroupedEntry =
  | { type: "standard"; entry: JobStandardHistoryEntry }
  | { type: "modification"; entry: JobModificationEntry };

export function HistoryPanel({
  history,
  jobCode,
  onProductClick,
}: HistoryPanelProps) {
  const [filterText, setFilterText] = useState<string>("");

  const groupedHistory = useMemo(() => {
    const groups: Record<string, GroupedEntry[]> = {};

    // Filtra le entry se c'è un filtro attivo
    let filteredHistory = history;

    if (filterText) {
      const searchText = filterText.toLowerCase();
      filteredHistory = filteredHistory.filter((entry) => {
        // Gestione entry standard
        if (isJobStandardHistoryEntry(entry)) {
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
        }

        // Gestione entry di modifica utente
        if (isJobModificationEntry(entry)) {
          const modEntry = entry;
          // Cerca nel nome utente, email o nei campi modificati
          const matchesUser =
            modEntry.modifiedBy.name.toLowerCase().includes(searchText) ||
            modEntry.modifiedBy.email.toLowerCase().includes(searchText);

          const matchesChanges = modEntry.changes.some(
            (change) =>
              change.field.toLowerCase().includes(searchText) ||
              String(change.oldValue).toLowerCase().includes(searchText) ||
              String(change.newValue).toLowerCase().includes(searchText)
          );

          return matchesUser || matchesChanges;
        }

        return false;
      });
    }

    // Raggruppa le entry per step
    filteredHistory.forEach((entry) => {
      if (isJobModificationEntry(entry)) {
        // Le modifiche utente vanno nel gruppo "user_modification"
        const stepKey = "user_modification";
        if (!groups[stepKey]) {
          groups[stepKey] = [];
        }
        groups[stepKey].push({ type: "modification", entry });
      } else if (isJobStandardHistoryEntry(entry)) {
        // Entry standard raggruppate per step
        const stepKey = entry.step;
        if (!groups[stepKey]) {
          groups[stepKey] = [];
        }
        groups[stepKey].push({ type: "standard", entry });
      }
    });

    return groups;
  }, [history, filterText]);

  // Render per entry standard
  const renderStandardEntry = (
    entry: JobStandardHistoryEntry,
    step: string,
    idx: number
  ) => (
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
      <span className="text-slate-600">{String(entry.value)}</span>
      {entry.metadata?.description && (
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {entry.metadata.description}
        </p>
      )}
      <HistoryEntryDetails entry={entry} onProductClick={onProductClick} />
      <span className="text-[10px] text-slate-400 mt-0.5">
        {HistoryEntryFormatter.formatTimestamp(entry.timestamp)}
      </span>
    </div>
  );

  // Render per entry di modifica utente
  const renderModificationEntry = (
    entry: JobModificationEntry,
    step: string,
    idx: number
  ) => (
    <div
      key={`${step}-mod-${idx}`}
      className="flex flex-col gap-1 py-2 border-l-2 border-indigo-300 pl-2 text-xs bg-indigo-50/30 rounded-r"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-indigo-500" />
          <span className="font-medium text-slate-700 leading-tight">
            Modifica manuale
          </span>
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] shrink-0 px-1.5 py-0 bg-indigo-100 text-indigo-700"
        >
          {entry.modifiedBy.name}
        </Badge>
      </div>
      <ModificationEntryDetails entry={entry} variant="compact" />
      <span className="text-[10px] text-slate-400 mt-0.5">
        {HistoryEntryFormatter.formatTimestamp(entry.timestamp)}
      </span>
    </div>
  );

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
                {entries.map((groupedEntry, idx) => {
                  if (groupedEntry.type === "modification") {
                    return renderModificationEntry(
                      groupedEntry.entry,
                      step,
                      idx
                    );
                  }
                  return renderStandardEntry(groupedEntry.entry, step, idx);
                })}
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

