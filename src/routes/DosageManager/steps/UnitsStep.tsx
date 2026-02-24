import { type ChangeEvent, type ReactElement } from "react";
import { Input } from "@/components/ui/input";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { Loader2 } from "lucide-react";
import type { ProductionUnit } from "@/api/production-unit";

interface UnitsStepProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadingUnits: boolean;
  filteredUnits: ProductionUnit[];
  productionUnitTableColumns: EditableColumn[];
  productionUnitTableRows: Array<Record<string, unknown>>;
  handleUnitSelectionChange: (rows: Array<Record<string, unknown>>) => void;
  handleUnitTableSave: (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => void;
}

export function UnitsStep({
  searchQuery,
  setSearchQuery,
  loadingUnits,
  filteredUnits,
  productionUnitTableColumns,
  productionUnitTableRows,
  handleUnitSelectionChange,
  handleUnitTableSave,
}: UnitsStepProps): ReactElement {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-medium text-neutral-900">
            Seleziona Unità Produttive
          </h2>
          {filteredUnits.length > 0 && (
            <p className="text-sm text-neutral-500 mt-1">
              {filteredUnits.length} disponibili
            </p>
          )}
        </div>
        <div className="w-full lg:w-auto">
          <Input
            value={searchQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Cerca per nome, coltura o varietà"
            aria-label="Cerca unità produttive"
            disabled={loadingUnits}
            className="bg-white"
          />
        </div>
      </div>

      {loadingUnits ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          {searchQuery
            ? "Nessuna unità trovata"
            : "Nessuna unità disponibile per questa azienda"}
        </div>
      ) : (
        <EditableTable
          columns={productionUnitTableColumns}
          rows={productionUnitTableRows}
          isModify={true}
          addButton={false}
          onSelectionChange={handleUnitSelectionChange}
          showDeleteAction={false}
          onSave={handleUnitTableSave}
          getRowId={(row: Record<string, unknown>) =>
            (row as { id: string }).id
          }
          className="bg-white rounded-2xl border border-neutral-200"
          exportFileName="unitaproduttive_selezione"
        />
      )}
    </div>
  );
}
