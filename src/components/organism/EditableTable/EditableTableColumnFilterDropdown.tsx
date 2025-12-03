import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowUp, ArrowDown, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import type { EditableColumn, NormalizedSelectOption } from "./index";

interface EditableTableColumnFilterDropdownProps {
  column: EditableColumn;
  uniqueValues: NormalizedSelectOption[];
  selectedValues: Set<string>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onValueToggle: (value: string) => void;
  onSort: (direction: "asc" | "desc") => void;
  onApply: () => void;
  onClearFilter: () => void;
  currentSortColumn?: string;
  currentSortDirection?: "asc" | "desc";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  // Date-specific props
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  selectedDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
}

export class EditableTableColumnFilterDropdown extends React.PureComponent<EditableTableColumnFilterDropdownProps> {
  private handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    this.props.onSearchChange(e.target.value);
  };

  private handleValueToggle = (value: string): void => {
    this.props.onValueToggle(value);
  };

  private handleSortAsc = (): void => {
    this.props.onSort("asc");
  };

  private handleSortDesc = (): void => {
    this.props.onSort("desc");
  };

  private handleApply = (): void => {
    this.props.onApply();
    this.props.onOpenChange(false);
  };

  private getFilteredValues(): NormalizedSelectOption[] {
    const { uniqueValues, searchQuery } = this.props;
    if (!searchQuery.trim()) {
      return uniqueValues;
    }
    const query = searchQuery.toLowerCase().trim();
    return uniqueValues.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    );
  }

  private isDateColumn(): boolean {
    return this.props.column.type === "date";
  }

  private isNumericColumn(): boolean {
    return (
      this.props.column.type === "number" ||
      this.props.column.type === "currency"
    );
  }

  private getSortLabels(): { asc: string; desc: string } {
    if (this.isNumericColumn()) {
      return {
        asc: "Ordina crescente",
        desc: "Ordina decrescente",
      };
    }
    return {
      asc: "Ordina A-Z",
      desc: "Ordina Z-A",
    };
  }

  private handleDateRangeSelect = (range: DateRange | undefined): void => {
    if (this.props.onDateRangeChange) {
      this.props.onDateRangeChange(range);
    }
  };

  private handleDateSelect = (date: Date | undefined): void => {
    if (this.props.onDateChange) {
      this.props.onDateChange(date);
    }
  };

  private clearDateFilter = (): void => {
    if (this.props.onDateRangeChange) {
      this.props.onDateRangeChange(undefined);
    }
    if (this.props.onDateChange) {
      this.props.onDateChange(undefined);
    }
  };

  private handleClearFilter = (): void => {
    this.props.onClearFilter();
    this.props.onOpenChange(false);
  };

  render(): React.ReactNode {
    const {
      column,
      selectedValues,
      searchQuery,
      currentSortColumn,
      currentSortDirection,
      isOpen,
      onOpenChange,
      children,
      dateRange,
      selectedDate,
    } = this.props;

    const filteredValues = this.getFilteredValues();
    const isColumnSorted = currentSortColumn === column.id;
    const isAsc = isColumnSorted && currentSortDirection === "asc";
    const isDesc = isColumnSorted && currentSortDirection === "desc";
    const sortLabels = this.getSortLabels();
    const isDate = this.isDateColumn();
    const hasDateFilter = Boolean(dateRange?.from || selectedDate);
    const hasActiveFilter = isDate ? hasDateFilter : selectedValues.size > 0;

    return (
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className={cn(
            "p-0 bg-white rounded-lg shadow-lg border border-gray-200",
            isDate ? "w-auto" : "w-[300px]"
          )}
          align="start"
          sideOffset={5}
        >
          <div className="p-3 space-y-3">
            {/* Sort Options */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={this.handleSortAsc}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  isAsc
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "hover:bg-gray-50 text-gray-700"
                )}
              >
                <ArrowUp className="h-4 w-4" />
                <span>{sortLabels.asc}</span>
              </button>
              <button
                type="button"
                onClick={this.handleSortDesc}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  isDesc
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "hover:bg-gray-50 text-gray-700"
                )}
              >
                <ArrowDown className="h-4 w-4" />
                <span>{sortLabels.desc}</span>
              </button>
            </div>

            {isDate ? (
              /* Date Calendar Filter */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Seleziona data
                  </span>
                  {hasDateFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={this.clearDateFilter}
                      className="text-xs h-7"
                    >
                      Pulisci
                    </Button>
                  )}
                </div>
                {/* Default to range mode, but allow single date if selectedDate is set */}
                {selectedDate !== undefined ? (
                  /* Single Date Mode */
                  <div>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={this.handleDateSelect}
                      numberOfMonths={1}
                      locale={it}
                    />
                    {selectedDate && (
                      <div className="mt-2 pt-2 border-t text-xs text-gray-600 text-center">
                        {format(selectedDate, "dd/MM/yyyy", { locale: it })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Range Mode (default) */
                  <div>
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={this.handleDateRangeSelect}
                      numberOfMonths={1}
                      locale={it}
                    />
                    {dateRange?.from && dateRange?.to && (
                      <div className="mt-2 pt-2 border-t text-xs text-gray-600 text-center">
                        {format(dateRange.from, "dd/MM/yyyy", { locale: it })} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: it })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cerca..."
                    value={searchQuery}
                    onChange={this.handleSearchChange}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                {/* Filter Checkboxes */}
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {filteredValues.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nessun risultato
                    </p>
                  ) : (
                    filteredValues.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedValues.has(option.value)}
                          onCheckedChange={() =>
                            this.handleValueToggle(option.value)
                          }
                          className="border-gray-300"
                        />
                        <span className="text-sm text-gray-700 flex-1">
                          {option.label}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={this.handleClearFilter}
                variant="outline"
                disabled={!hasActiveFilter}
                className={cn(
                  "flex-1 border-gray-300 text-gray-700 hover:bg-gray-50",
                  !hasActiveFilter && "opacity-50 cursor-not-allowed"
                )}
                size="sm"
              >
                Pulisci filtro
              </Button>
              <Button
                onClick={this.handleApply}
                className="flex-1 bg-agri-green-600 hover:bg-agri-green-700 text-white"
                size="sm"
              >
                OK
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
}
