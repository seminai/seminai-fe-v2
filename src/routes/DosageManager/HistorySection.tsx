import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { Loader2, Trash2, Clock } from "lucide-react";
import {
  type ActiveJobTableRow,
  type JobHistoryTableRow,
  type DosageJob,
} from "./types";

interface HistorySectionProps {
  activeJobsCount: number;
  activeSelectionLabel: string;
  isCancellingJobs: boolean;
  selectedActiveJobIds: string[];
  onCancelSelectedActiveJobs: () => void;
  activeJobColumns: EditableColumn[];
  activeJobRows: ActiveJobTableRow[];
  onActiveSelectionChange: (rows: Array<Record<string, unknown>>) => void;
  historyJobColumns: EditableColumn[];
  historyJobRows: JobHistoryTableRow[];
  onOpenJobDetails: (job: DosageJob) => void;
}

export function HistorySection({
  activeJobsCount,
  activeSelectionLabel,
  isCancellingJobs,
  selectedActiveJobIds,
  onCancelSelectedActiveJobs,
  activeJobColumns,
  activeJobRows,
  onActiveSelectionChange,
  historyJobColumns,
  historyJobRows,
  onOpenJobDetails,
}: HistorySectionProps): ReactElement {
  return (
    <div className="mx-auto space-y-6">
      <div className="space-y-4 md:space-y-6">
        {activeJobsCount > 0 && (
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  Job attivi ({activeJobsCount})
                </h3>
                <p className="text-sm text-neutral-500">
                  {activeSelectionLabel}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 self-start lg:self-auto"
                disabled={selectedActiveJobIds.length === 0 || isCancellingJobs}
                onClick={onCancelSelectedActiveJobs}
              >
                {isCancellingJobs ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Annullamento...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Annulla selezionati</span>
                  </>
                )}
              </Button>
            </div>
            <EditableTable
              columns={activeJobColumns}
              rows={activeJobRows}
              isModify={false}
              addButton={false}
              showDeleteAction={false}
              onSelectionChange={onActiveSelectionChange}
              getRowId={(row) => (row as ActiveJobTableRow).id}
              className="bg-white"
              exportFileName="calcoli_attivi"
            />
            <div className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-600 leading-tight">
                Ci vorranno da 1 a massimo 10 minuti per elaborare i dosaggi.
                Puoi annullare i job selezionandoli nella tabella.
              </p>
            </div>
          </section>
        )}

        <section className="space-y-4">
          {historyJobRows.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 bg-white rounded-2xl border border-neutral-200">
              <Clock className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
              <p>Nessun calcolo effettuato</p>
            </div>
          ) : (
            <EditableTable
              columns={historyJobColumns}
              rows={historyJobRows}
              isModify={false}
              addButton={false}
              showDeleteAction={false}
              getRowId={(row) => (row as JobHistoryTableRow).id}
              onOpenDetails={(row) => {
                const typedRow = row as JobHistoryTableRow;
                onOpenJobDetails(typedRow.job);
              }}
              className="bg-white rounded-2xl border border-neutral-200"
              exportFileName="storico_calcoli"
            />
          )}
        </section>
      </div>
    </div>
  );
}
