import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Plus, X } from "lucide-react";
import { MultiSearchableSelect } from "@/routes/DosageManager/MultiSearchableSelect";
import type { MultiSearchableSelectOption } from "@/routes/DosageManager/MultiSearchableSelect";
import type { FitosanitariDatasetRecord } from "@/services/fitosanitariRegistry";

interface ReviewRowPhytosanitaryCellProps {
  rowId: string;
  registrationNumber: string;
  isRejected: boolean;
  matchedFitosanitarioIndex: number | null;
  matchStrategy: "regnum" | "name" | null;
  isSelectMode: boolean;
  isDeselected: boolean;
  isSpinnerVisible: boolean;
  fitosanitariOptions: MultiSearchableSelectOption[];
  getFitosanitarioRecordByIndex: (
    indexStr: string,
  ) => FitosanitariDatasetRecord | null;
  onSelectFromRegistry: (
    rowId: string,
    record: FitosanitariDatasetRecord,
  ) => void;
  onDeselectRegistry: (rowId: string) => void;
  onCloseSelect: () => void;
  onOpenSelect: () => void;
}

/**
 * Compact cell that either shows a searchable phytosanitary select (when a
 * registry match exists or the user opened it manually), a spinner (while the
 * registry is still loading for a likely-phytosanitary row), or a "+" button
 * to open the select. Keeps ReviewRow focused on layout.
 */
export function ReviewRowPhytosanitaryCell({
  rowId,
  registrationNumber,
  isRejected,
  matchedFitosanitarioIndex,
  matchStrategy,
  isSelectMode,
  isDeselected,
  isSpinnerVisible,
  fitosanitariOptions,
  getFitosanitarioRecordByIndex,
  onSelectFromRegistry,
  onDeselectRegistry,
  onCloseSelect,
  onOpenSelect,
}: ReviewRowPhytosanitaryCellProps) {
  const hasMatch = matchedFitosanitarioIndex != null;
  const shouldShowRegistrySelect = (isSelectMode || hasMatch) && !isDeselected;

  if (isSpinnerVisible) {
    return (
      <div className="flex items-center gap-2 h-7 px-2">
        <Spinner size={14} />
        <span className="text-xs text-muted-foreground">
          Caricamento registro...
        </span>
      </div>
    );
  }

  if (shouldShowRegistrySelect) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <MultiSearchableSelect
              value={
                matchedFitosanitarioIndex != null
                  ? [String(matchedFitosanitarioIndex)]
                  : []
              }
              options={fitosanitariOptions}
              placeholder="Cerca fitosanitario..."
              searchPlaceholder="Nome, sostanza attiva o n. registrazione"
              emptyMessage="Nessun prodotto trovato"
              disabled={isRejected}
              maxVisibleBadges={1}
              onChange={(next) => {
                if (next.length === 0) {
                  onDeselectRegistry(rowId);
                  return;
                }
                const last = next[next.length - 1];
                const record = getFitosanitarioRecordByIndex(last);
                if (record) onSelectFromRegistry(rowId, record);
              }}
              onOpenChange={(open) => {
                if (!open) onCloseSelect();
              }}
            />
          </div>
          {!isRejected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-red-500"
              onClick={() => onDeselectRegistry(rowId)}
              title="Rimuovi prodotto fitosanitario"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {matchStrategy && (
          <Badge
            variant="secondary"
            className="text-[10px] font-normal"
            title={
              matchStrategy === "regnum"
                ? "Abbinato automaticamente per numero di registrazione"
                : "Abbinato automaticamente per nome esatto"
            }
          >
            {matchStrategy === "regnum" ? "Match N. reg." : "Match nome"}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground flex-1 truncate">
        {registrationNumber ? `N. ${registrationNumber}` : "Nessun fitosanitario"}
      </span>
      {!isRejected && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={onOpenSelect}
          title="Seleziona dal registro ministeriale"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
