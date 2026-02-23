import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Columns3, Eye, EyeOff } from "lucide-react";
import type { EditableColumn } from "./index";

interface EditableTableColumnVisibilityDropdownProps {
  columns: EditableColumn[];
  visibleColumnIds: string[];
  maxVisibleColumns: number;
  onVisibilityChange: (columnId: string, visible: boolean) => void;
  onShowAll: () => void;
  onShowDefault: () => void;
}

interface EditableTableColumnVisibilityDropdownState {
  open: boolean;
}

export class EditableTableColumnVisibilityDropdown extends React.PureComponent<
  EditableTableColumnVisibilityDropdownProps,
  EditableTableColumnVisibilityDropdownState
> {
  state: EditableTableColumnVisibilityDropdownState = {
    open: false,
  };

  private handleOpenChange = (open: boolean): void => {
    this.setState({ open });
  };

  private handleColumnToggle = (columnId: string, checked: boolean): void => {
    this.props.onVisibilityChange(columnId, checked);
  };

  private renderColumnItem(
    column: EditableColumn,
    index: number
  ): React.ReactNode {
    const isVisible = this.props.visibleColumnIds.includes(column.id);
    const visibleCount = this.props.visibleColumnIds.length;
    const isDefaultColumn = index < this.props.maxVisibleColumns;

    // Non permettere di nascondere se è l'ultima colonna visibile
    const canHide = visibleCount > 1;
    // Le colonne obbligatorie restano sempre visibili
    const cannotHide = column.required === true || (isVisible && !canHide);

    return (
      <div
        key={column.id}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg",
          isDefaultColumn && "border-l-2 border-agri-green-300"
        )}
      >
        <Checkbox
          id={`col-visibility-${column.id}`}
          checked={isVisible}
          disabled={cannotHide}
          onCheckedChange={(checked) =>
            this.handleColumnToggle(column.id, Boolean(checked))
          }
          className={cn("border-gray-300", isVisible && "border-agri-green-500")}
        />
        <label
          htmlFor={`col-visibility-${column.id}`}
          className={cn(
            "flex-1 text-sm cursor-pointer select-none",
            isVisible ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          {column.title}
          {column.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {isVisible ? (
          <Eye className="h-4 w-4 text-black" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    );
  }

  render(): React.ReactNode {
    const { columns, visibleColumnIds, maxVisibleColumns } = this.props;
    const hiddenCount = columns.length - visibleColumnIds.length;
    const hasHiddenColumns = hiddenCount > 0;

    return (
      <Popover open={this.state.open} onOpenChange={this.handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-black cursor-pointer"
          >
            <Columns3 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              Colonne{hasHiddenColumns ? ` (${hiddenCount})` : ""}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80 p-0 border border-border/40 rounded-2xl shadow-xl"
        >
          <div className="p-4 border-b border-border/30">
            <h4 className="font-semibold text-sm text-foreground">
              Gestisci colonne visibili
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Massimo {maxVisibleColumns} colonne visibili di default. Seleziona
              quali colonne mostrare.
            </p>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
            {columns.map((column, index) =>
              this.renderColumnItem(column, index)
            )}
          </div>

          <div className="p-3 border-t border-border/30 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={this.props.onShowDefault}
              className="text-xs text-black hover:text-gray-700"
            >
              Mostra default ({maxVisibleColumns})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={this.props.onShowAll}
              className="text-xs text-black hover:text-black"
            >
              Mostra tutte
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
}
