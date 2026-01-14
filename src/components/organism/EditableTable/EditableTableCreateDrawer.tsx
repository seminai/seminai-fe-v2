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

/**
 * Definisce il layout dei campi nella drawer
 * Ogni gruppo rappresenta una riga nella griglia
 */
interface FieldGroup {
  columns: string[];
  gridCols: string;
}

const FIELD_LAYOUT: FieldGroup[] = [
  { columns: ["companyName"], gridCols: "grid-cols-1" },
  { columns: ["name"], gridCols: "grid-cols-1" },
  { columns: ["address", "city"], gridCols: "grid-cols-2" },
  { columns: ["sezione", "foglio", "particella"], gridCols: "grid-cols-3" },
  { columns: ["superficieCatastaleMq", "sauHa"], gridCols: "grid-cols-2" },
  { columns: ["uso", "soilType"], gridCols: "grid-cols-2" },
  { columns: ["currentProductionUnitLabel"], gridCols: "grid-cols-1" },
];

export class EditableTableCreateDrawer extends React.PureComponent<EditableTableCreateDrawerProps> {
  /**
   * Organizza le colonne in gruppi per il layout a griglia
   */
  private organizeColumns(): Map<string, FieldGroup> {
    const columnMap = new Map<string, FieldGroup>();
    
    FIELD_LAYOUT.forEach((group) => {
      group.columns.forEach((columnId) => {
        columnMap.set(columnId, group);
      });
    });

    return columnMap;
  }

  /**
   * Raggruppa le colonne per riga
   */
  private groupColumnsByRow(): Array<{ group: FieldGroup; columns: EditableColumn[] }> {
    const columnMap = this.organizeColumns();
    const grouped = new Map<string, { group: FieldGroup; columns: EditableColumn[] }>();
    const unmappedColumns: EditableColumn[] = [];

    // Raggruppa le colonne mappate
    this.props.columns.forEach((column) => {
      const group = columnMap.get(column.id);
      if (group) {
        const groupKey = group.columns.join(",");
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, { group, columns: [] });
        }
        grouped.get(groupKey)!.columns.push(column);
      } else {
        // Colonne non mappate vanno in un array separato
        unmappedColumns.push(column);
      }
    });

    // Ordina i gruppi secondo FIELD_LAYOUT e ordina le colonne all'interno di ogni gruppo
    const result: Array<{ group: FieldGroup; columns: EditableColumn[] }> = [];
    FIELD_LAYOUT.forEach((group) => {
      const groupKey = group.columns.join(",");
      const groupData = grouped.get(groupKey);
      if (groupData && groupData.columns.length > 0) {
        // Ordina le colonne secondo l'ordine nel gruppo
        const sortedColumns = group.columns
          .map((id) => groupData.columns.find((c) => c.id === id))
          .filter((c): c is EditableColumn => c !== undefined);
        if (sortedColumns.length > 0) {
          result.push({ group, columns: sortedColumns });
        }
      }
    });

    // Aggiungi colonne non mappate alla fine, ognuna in un gruppo full-width
    unmappedColumns.forEach((column) => {
      result.push({
        group: { columns: [column.id], gridCols: "grid-cols-1" },
        columns: [column],
      });
    });

    return result;
  }

  render(): React.ReactNode {
    const {
      open,
      onOpenChange,
      onCancel,
      onSave,
      pendingRow,
      drawerChildren,
      disableSave,
      onCellChange,
      createTouched,
      renderInput,
    } = this.props;

    const groupedColumns = this.groupColumnsByRow();

    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent 
          data-vaul-drawer-direction="right"
          className="!w-1/2 !max-w-[50vw] overflow-x-hidden"
        >
          <DrawerHeader>
            <DrawerTitle>Nuovo elemento</DrawerTitle>
            <DrawerDescription>
              Compila i campi per aggiungere un nuovo elemento alla tabella
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6 space-y-5 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-180px)]">
            {drawerChildren.length > 0 && (
              <div className="space-y-4">{drawerChildren}</div>
            )}
            {pendingRow ? (
              <div className="space-y-5">
                {groupedColumns.map(({ group, columns: rowColumns }, groupIndex) => (
                  <div key={groupIndex} className={`grid ${group.gridCols} gap-4`}>
                    {rowColumns.map((column) => (
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
                    ))}
                  </div>
                ))}
              </div>
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

