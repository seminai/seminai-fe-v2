import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Sparkles } from "lucide-react";
import { JobCardItem } from "./JobCardItem";
import type {
  EditableColumn,
  InternalRow,
} from "@/components/organism/EditableTable";

interface JobCardsViewProps {
  rows: InternalRow[];
  isLoading: boolean;
  selectedRowIds: Set<string>;
  onToggleSelect: (row: InternalRow) => void;
  visibleColumnIds: string[];
  columns: EditableColumn[];
  isEditMode: boolean;
  onCellChange: (
    row: InternalRow,
    col: EditableColumn,
    value: unknown,
  ) => void;
}

export function JobCardsView({
  rows,
  isLoading,
  selectedRowIds,
  onToggleSelect,
  visibleColumnIds,
  columns,
  isEditMode,
  onCellChange,
}: JobCardsViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner ariaLabel="Caricamento operazioni" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Sparkles className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Nessuna operazione trovata</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-1 pb-6">
        {rows.map((row) => (
          <JobCardItem
            key={row.id}
            row={row}
            isSelected={selectedRowIds.has(row.id)}
            onSelect={onToggleSelect}
            visibleColumnIds={visibleColumnIds}
            columns={columns}
            isEditMode={isEditMode}
            onCellChange={onCellChange}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

export default JobCardsView;
