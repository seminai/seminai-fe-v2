import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { X } from "lucide-react";
import type {
  EditableColumn,
  FilterDraft,
  NormalizedSelectOption,
  TableFilterRule,
  SearchableValueConfig,
} from "./index";

interface OperatorOption {
  value: string;
  label: string;
}

interface EditableTableFilterDrawerProps {
  open: boolean;
  columns: EditableColumn[];
  activeFilters: TableFilterRule[];
  filterDraft: FilterDraft;
  operatorOptions: OperatorOption[];
  selectedOperatorValue: string;
  showSecondaryValueInput: boolean;
  disableAdd: boolean;
  inputType: "text" | "number" | "date";
  useValueSelect: boolean;
  valueOptions: NormalizedSelectOption[];
  systemDateSection: React.ReactNode;
  searchableValueOptions: NormalizedSelectOption[];
  showSearchableValueSelect: boolean;
  searchableValueConfig?: SearchableValueConfig;
  onDrawerOpenChange: (open: boolean) => void;
  onFilterDraftChange: (field: keyof FilterDraft, value?: string) => void;
  onAddFilter: () => void;
  onRemoveFilter: (id: string) => void;
  onClearFilters: () => void;
  formatFilterLabel: (filter: TableFilterRule) => React.ReactNode;
}

export class EditableTableFilterDrawer extends React.PureComponent<EditableTableFilterDrawerProps> {
  private handleFieldChange = (
    field: keyof FilterDraft,
    value?: string
  ): void => {
    this.props.onFilterDraftChange(field, value);
  };

  private renderActiveFilters(): React.ReactNode {
    const { activeFilters, onRemoveFilter, formatFilterLabel, onClearFilters } =
      this.props;
    if (activeFilters.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">Nessun filtro attivo</p>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <span
            key={filter.id}
            className="inline-flex items-center gap-2 rounded-full bg-agri-green-100 text-agri-green-800 px-3 py-1 text-sm"
          >
            {formatFilterLabel(filter)}
            <button
              type="button"
              onClick={() => onRemoveFilter(filter.id)}
              className="text-agri-green-900 hover:text-red-500 transition"
              aria-label="Rimuovi filtro"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearFilters}
          className="text-muted-foreground"
        >
          Rimuovi tutti
        </Button>
      </div>
    );
  }

  private renderColumnSelector(): React.ReactNode {
    const { columns, filterDraft } = this.props;
    return (
      <div className="space-y-1.5">
        <label className="text-sm sm:text-xs font-semibold text-muted-foreground">
          Colonna
        </label>
        <select
          className="w-full h-12 sm:h-10 rounded-xl bg-white/70 dark:bg-input/30 backdrop-blur border border-black/5 dark:border-white/10 px-3 text-base sm:text-sm focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 outline-none transition"
          value={filterDraft.columnId ?? ""}
          onChange={(event) =>
            this.handleFieldChange("columnId", event.target.value || undefined)
          }
        >
          <option value="">Seleziona colonna</option>
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title || column.id}
            </option>
          ))}
        </select>
      </div>
    );
  }

  private renderOperatorSelector(): React.ReactNode {
    const { filterDraft, operatorOptions } = this.props;
    return (
      <div className="space-y-1.5">
        <label className="text-sm sm:text-xs font-semibold text-muted-foreground">
          Operatore
        </label>
        <select
          className={cn(
            "w-full h-12 sm:h-10 rounded-xl bg-white/70 dark:bg-input/30 backdrop-blur border border-black/5 dark:border-white/10 px-3 text-base sm:text-sm focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 outline-none transition",
            !filterDraft.columnId && "opacity-50 cursor-not-allowed"
          )}
          value={this.props.selectedOperatorValue}
          onChange={(event) =>
            this.handleFieldChange("operator", event.target.value || undefined)
          }
          disabled={!filterDraft.columnId}
        >
          <option value="">Seleziona operatore</option>
          {operatorOptions.map((operator) => (
            <option key={operator.value} value={operator.value}>
              {operator.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  private renderSearchableValue(): React.ReactNode {
    const {
      showSearchableValueSelect,
      searchableValueOptions,
      filterDraft,
      searchableValueConfig,
    } = this.props;
    if (!showSearchableValueSelect || !searchableValueConfig) {
      return null;
    }
    const {
      label,
      placeholder,
      searchPlaceholder,
      emptyMessage,
      noneOptionLabel,
    } = searchableValueConfig;
    return (
      <div className="space-y-1.5">
        <label className="text-sm sm:text-xs font-semibold text-muted-foreground">
          {label}
        </label>
        <SearchableSelect
          value={filterDraft.value ?? ""}
          options={searchableValueOptions}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          noneOptionLabel={noneOptionLabel}
          onChange={(newValue) =>
            this.handleFieldChange("value", newValue ?? "")
          }
          wrapperClassName="w-full h-12 sm:h-10 text-base sm:text-sm"
        />
      </div>
    );
  }

  private renderValueSelector(): React.ReactNode {
    const { useValueSelect, valueOptions, filterDraft, inputType } = this.props;
    return (
      <div className="space-y-1.5">
        <label className="text-sm sm:text-xs font-semibold text-muted-foreground">
          Valore
        </label>
        {useValueSelect ? (
          <select
            className="w-full h-12 sm:h-10 rounded-xl bg-white/70 dark:bg-input/30 backdrop-blur border border-black/5 dark:border-white/10 px-3 text-base sm:text-sm focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 outline-none transition"
            value={filterDraft.value ?? ""}
            onChange={(event) =>
              this.handleFieldChange("value", event.target.value)
            }
          >
            <option value="">Seleziona valore</option>
            {valueOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={inputType}
            value={filterDraft.value ?? ""}
            onChange={(event) =>
              this.handleFieldChange("value", event.target.value)
            }
            className="h-12 sm:h-10 text-base sm:text-sm"
          />
        )}
      </div>
    );
  }

  private renderSecondaryValue(): React.ReactNode {
    const { filterDraft, inputType, showSecondaryValueInput } = this.props;
    if (!showSecondaryValueInput) {
      return null;
    }
    return (
      <div className="space-y-1.5">
        <label className="text-sm sm:text-xs font-semibold text-muted-foreground">
          Valore finale
        </label>
        <Input
          type={inputType}
          value={filterDraft.secondaryValue ?? ""}
          onChange={(event) =>
            this.handleFieldChange("secondaryValue", event.target.value)
          }
          className="h-12 sm:h-10 text-base sm:text-sm"
        />
      </div>
    );
  }

  private renderValueSection(): React.ReactNode {
    return (
      <>
        {this.renderSearchableValue()}
        {this.renderValueSelector()}
        {this.renderSecondaryValue()}
      </>
    );
  }

  render(): React.ReactNode {
    const {
      open,
      onDrawerOpenChange,
      systemDateSection,
      onAddFilter,
      disableAdd,
      filterDraft,
    } = this.props;

    return (
      <Drawer open={open} onOpenChange={onDrawerOpenChange}>
        <DrawerContent 
          data-vaul-drawer-direction="right"
          className="w-[95vw] max-w-[95vw] sm:w-[85vw] sm:max-w-[500px]"
        >
          <DrawerHeader className="px-4 sm:px-6">
            <DrawerTitle className="text-lg sm:text-xl">Filtri tabella</DrawerTitle>
            <DrawerDescription className="text-sm">
              Applica condizioni mirate per restringere i risultati
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                Filtri attivi
              </h4>
              {this.renderActiveFilters()}
            </div>
            {systemDateSection}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Aggiungi filtro
              </h4>
              <div className="space-y-3">
                {this.renderColumnSelector()}
                {this.renderOperatorSelector()}
                {filterDraft.operator ? this.renderValueSection() : null}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={onAddFilter} disabled={disableAdd} className="h-11 sm:h-10 px-5 sm:px-4">
                  Aggiungi filtro
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
}
