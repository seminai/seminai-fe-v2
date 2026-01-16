import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { EditableColumn, InternalRow } from "../types";

export interface BulkEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectionCount: number;
  editableColumns: EditableColumn[];
  bulkEditValues: Record<string, unknown>;
  onValueChange: (columnId: string, value: unknown) => void;
  onApply: () => void;
  onCancel: () => void;
  renderInput: (
    row: InternalRow,
    col: EditableColumn,
    config?: {
      onChange?: (
        targetRow: InternalRow,
        targetColumn: EditableColumn,
        value: unknown
      ) => void;
      touchedOverride?: Record<string, boolean>;
    }
  ) => React.ReactNode;
}

export function BulkEditDrawer({
  open,
  onOpenChange,
  selectionCount,
  editableColumns,
  bulkEditValues,
  onValueChange,
  onApply,
  onCancel,
  renderInput,
}: BulkEditDrawerProps): React.ReactElement {
  const hasAnyValue = Object.values(bulkEditValues).some(
    (v) => v !== undefined && v !== ""
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={false} direction="right">
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="w-[95vw] max-w-[95vw] sm:w-1/2 sm:max-w-[50vw] shadow-2xl rounded-r-none rounded-l-2xl border-l border-neutral-200"
      >
        <DrawerHeader className="px-4 sm:px-6">
          <DrawerTitle className="text-lg sm:text-xl">
            Modifica {selectionCount} elementi
          </DrawerTitle>
          <DrawerDescription className="text-sm">
            Compila i campi che vuoi modificare. Solo i campi compilati verranno
            applicati a tutti gli elementi selezionati.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-5">
            {editableColumns.map((col) => {
              const fakeRow: InternalRow = {
                id: `bulk-edit-fake-row-${col.id}`,
                data: { [col.id]: bulkEditValues[col.id] ?? "" },
                isNew: false,
                isDirty: false,
              };

              return (
                <div key={col.id} className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    {col.title}
                    {col.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <div className="[&_input]:h-11 [&_input]:text-base sm:[&_input]:h-10 sm:[&_input]:text-sm [&_select]:h-11 [&_select]:text-base sm:[&_select]:h-10 sm:[&_select]:text-sm [&_textarea]:text-base sm:[&_textarea]:text-sm">
                    {renderInput(fakeRow, col, {
                      onChange: (_row, _col, value) =>
                        onValueChange(col.id, value),
                      touchedOverride: {},
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t bg-white">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-11 sm:h-10 px-4 sm:px-3"
          >
            Annulla
          </Button>
          <Button
            onClick={onApply}
            disabled={!hasAnyValue}
            className="h-11 sm:h-10 px-5 sm:px-4"
          >
            Applica a {selectionCount} element
            {selectionCount === 1 ? "o" : "i"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
