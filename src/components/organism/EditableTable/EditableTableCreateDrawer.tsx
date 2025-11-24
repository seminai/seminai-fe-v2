import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type {
  EditableColumn,
  InternalRow,
} from "./index";

interface EditableTableCreateDrawerProps {
  open: boolean;
  columns: EditableColumn[];
  pendingRow?: InternalRow;
  createTouched: Record<string, boolean>;
  drawerChildren: React.ReactNode[];
  disableSave: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
  onCellChange: (
    row: InternalRow,
    column: EditableColumn,
    value: unknown
  ) => void;
  renderInput: (
    row: InternalRow,
    column: EditableColumn,
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

export class EditableTableCreateDrawer extends React.PureComponent<EditableTableCreateDrawerProps> {
  render(): React.ReactNode {
    const {
      open,
      onOpenChange,
      onCancel,
      onSave,
      columns,
      pendingRow,
      drawerChildren,
      disableSave,
      onCellChange,
      createTouched,
      renderInput,
    } = this.props;

    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Nuovo elemento</DrawerTitle>
            <DrawerDescription>
              Compila i campi per aggiungere un nuovo elemento alla tabella
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {drawerChildren.length > 0 && (
              <div className="space-y-4">{drawerChildren}</div>
            )}
            {pendingRow ? (
              columns.map((column) => (
                <div key={column.id} className="space-y-2">
                  <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                    <span>{column.title}</span>
                    {column.required ? (
                      <span className="text-red-500">*</span>
                    ) : null}
                  </div>
                  {renderInput(pendingRow, column, {
                    onChange: onCellChange,
                    touchedOverride: createTouched,
                  })}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nessun campo disponibile
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border/50 px-6 py-4">
            <Button variant="ghost" onClick={onCancel}>
              Annulla
            </Button>
            <Button onClick={onSave} disabled={disableSave}>
              Salva
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
}

