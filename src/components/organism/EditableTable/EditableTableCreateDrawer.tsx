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
          className="w-[95vw] max-w-[95vw] sm:w-[85vw] sm:max-w-[600px] overflow-x-hidden"
        >
          <DrawerHeader className="px-4 sm:px-6">
            <DrawerTitle className="text-lg sm:text-xl">Nuovo elemento</DrawerTitle>
            <DrawerDescription className="text-sm">
              Compila i campi per aggiungere un nuovo elemento alla tabella
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-180px)]">
            {drawerChildren.length > 0 && (
              <div className="space-y-4">{drawerChildren}</div>
            )}
            {pendingRow ? (
              <div className="space-y-4 sm:space-y-5">
                {groupedColumns.map(({ group, columns: rowColumns }, groupIndex) => {
                  // Su mobile, le griglie con più colonne diventano a colonna singola
                  const mobileGridClass = group.gridCols === "grid-cols-1" 
                    ? "grid-cols-1" 
                    : "grid-cols-1 sm:" + group.gridCols;
                  return (
                    <div key={groupIndex} className={`grid ${mobileGridClass} gap-3 sm:gap-4`}>
                      {rowColumns.map((column) => (
                        <div key={column.id} className="space-y-1.5 sm:space-y-2">
                          <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                            <span>{column.title}</span>
                            {column.required ? (
                              <span className="text-red-500">*</span>
                            ) : null}
                          </div>
                          <div className="[&_input]:h-11 [&_input]:text-base sm:[&_input]:h-10 sm:[&_input]:text-sm [&_select]:h-11 [&_select]:text-base sm:[&_select]:h-10 sm:[&_select]:text-sm [&_textarea]:text-base sm:[&_textarea]:text-sm">
                            {renderInput(pendingRow, column, {
                              onChange: onCellChange,
                              touchedOverride: createTouched,
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nessun campo disponibile
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border/50 px-4 sm:px-6 py-4">
            <Button variant="ghost" onClick={onCancel} className="h-11 sm:h-10 px-4 sm:px-3">
              Annulla
            </Button>
            <Button onClick={onSave} disabled={disableSave} className="h-11 sm:h-10 px-5 sm:px-4">
              Salva
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
}

