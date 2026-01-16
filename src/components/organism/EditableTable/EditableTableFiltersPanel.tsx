import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { EditableTableFilterDrawer } from "./EditableTableFilterDrawer";
import type {
  EditableColumn,
  FilterDraft,
  FilterInputType,
  NormalizedSelectOption,
  SearchableValueConfig,
  TableFilterRule,
} from "./index";

interface OperatorOption {
  value: string;
  label: string;
}

interface EditableTableFilterActivatorProps {
  activeCount: number;
  disabled: boolean;
  onClick: () => void;
}

export class EditableTableFilterActivator extends React.PureComponent<EditableTableFilterActivatorProps> {
  render(): React.ReactNode {
    const { activeCount, disabled, onClick } = this.props;
    const hasFilters = activeCount > 0;
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onClick}
        aria-label="Apri filtri"
        className={cn(
          "cursor-pointer",
          hasFilters
            ? "bg-agri-green-100 text-black border border-agri-green-200 hover:bg-agri-green-200"
            : "bg-agri-green-50 text-black border border-agri-green-100 hover:bg-agri-green-100"
        )}
      >
        <Filter className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">
          Filtri{hasFilters ? ` (${activeCount})` : ""}
        </span>
      </Button>
    );
  }
}

interface EditableTableFiltersPanelProps {
  open: boolean;
  columns: EditableColumn[];
  activeFilters: TableFilterRule[];
  filterDraft: FilterDraft;
  operatorOptions: OperatorOption[];
  selectedOperatorValue: string;
  showSecondaryValueInput: boolean;
  disableAdd: boolean;
  inputType: FilterInputType;
  useValueSelect: boolean;
  valueOptions: NormalizedSelectOption[];
  searchableValueOptions: NormalizedSelectOption[];
  showSearchableValueSelect: boolean;
  searchableValueConfig?: SearchableValueConfig;
  systemColumns: EditableColumn[];
  systemDateRanges: Record<string, DateRange | undefined>;
  onDrawerOpenChange: (open: boolean) => void;
  onFilterDraftChange: (field: keyof FilterDraft, value?: string) => void;
  onAddFilter: () => void;
  onRemoveFilter: (id: string) => void;
  onClearFilters: () => void;
  onSystemDateRangeChange: (columnId: string, range?: DateRange) => void;
  formatFilterLabel: (filter: TableFilterRule) => React.ReactNode;
}

export class EditableTableFiltersPanel extends React.PureComponent<EditableTableFiltersPanelProps> {
  private renderSystemDatePicker(column: EditableColumn): React.ReactNode {
    const range = this.props.systemDateRanges[column.id];
    const hasRange = Boolean(range?.from && range?.to);
    const fromLabel = range?.from ? format(range.from, "dd/MM/yyyy") : "";
    const toLabel = range?.to ? format(range.to, "dd/MM/yyyy") : "";
    const label = hasRange
      ? `${fromLabel} → ${toLabel}`
      : "Seleziona intervallo";

    return (
      <div key={`system-filter-${column.id}`} className="space-y-1.5">
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          {column.title}
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-10 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 hover:bg-white",
                !hasRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 border border-border/40 rounded-2xl shadow-xl bg-white"
            align="end"
          >
            <Calendar
              mode="range"
              selected={range}
              onSelect={(selectedRange) =>
                this.props.onSystemDateRangeChange(
                  column.id,
                  selectedRange ?? undefined
                )
              }
              numberOfMonths={1}
              initialFocus
            />
            <div className="flex items-center justify-end gap-2 border-t border-border/40 px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  this.props.onSystemDateRangeChange(column.id, undefined)
                }
              >
                Pulisci
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  private renderSystemDateSection(): React.ReactNode {
    const { systemColumns } = this.props;
    if (systemColumns.length === 0) {
      return null;
    }
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground">
          Date di sistema
        </h4>
        <div className="space-y-3">
          {systemColumns.map((column) => this.renderSystemDatePicker(column))}
        </div>
      </div>
    );
  }

  render(): React.ReactNode {
    return (
      <EditableTableFilterDrawer
        open={this.props.open}
        columns={this.props.columns}
        activeFilters={this.props.activeFilters}
        filterDraft={this.props.filterDraft}
        operatorOptions={this.props.operatorOptions}
        selectedOperatorValue={this.props.selectedOperatorValue}
        showSecondaryValueInput={this.props.showSecondaryValueInput}
        disableAdd={this.props.disableAdd}
        inputType={this.props.inputType}
        useValueSelect={this.props.useValueSelect}
        valueOptions={this.props.valueOptions}
        systemDateSection={this.renderSystemDateSection()}
        searchableValueOptions={this.props.searchableValueOptions}
        showSearchableValueSelect={this.props.showSearchableValueSelect}
        searchableValueConfig={this.props.searchableValueConfig}
        onDrawerOpenChange={this.props.onDrawerOpenChange}
        onFilterDraftChange={this.props.onFilterDraftChange}
        onAddFilter={this.props.onAddFilter}
        onRemoveFilter={this.props.onRemoveFilter}
        onClearFilters={this.props.onClearFilters}
        formatFilterLabel={this.props.formatFilterLabel}
      />
    );
  }
}
