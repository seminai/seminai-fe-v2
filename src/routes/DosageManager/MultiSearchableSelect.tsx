import { useMemo, useState, type ReactElement } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MultiSearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  groupLabel?: string;
  searchAliases?: string[];
};

export interface MultiSearchableSelectProps {
  value: string[];
  options: MultiSearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  maxVisibleBadges?: number;
  onChange: (next: string[]) => void;
}

class MultiSelectValueController {
  public static toggle(current: string[], value: string): string[] {
    if (current.includes(value)) {
      return current.filter((v) => v !== value);
    }
    return [...current, value];
  }

  public static clear(): string[] {
    return [];
  }
}

class MultiSelectSearchEngine {
  public static filter(
    options: MultiSearchableSelectOption[],
    query: string
  ): MultiSearchableSelectOption[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;

    return options.filter((opt) => {
      const haystack = [
        opt.label,
        opt.value,
        opt.description ?? "",
        opt.groupLabel ?? "",
        ...(opt.searchAliases ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }
}

class MultiSelectGroupBuilder {
  public static group(
    options: MultiSearchableSelectOption[]
  ): Array<{ group: string | null; items: MultiSearchableSelectOption[] }> {
    const grouped = new Map<string, MultiSearchableSelectOption[]>();
    const ungrouped: MultiSearchableSelectOption[] = [];

    options.forEach((opt) => {
      const key = (opt.groupLabel ?? "").trim();
      if (!key) {
        ungrouped.push(opt);
        return;
      }
      const list = grouped.get(key) ?? [];
      list.push(opt);
      grouped.set(key, list);
    });

    const result: Array<{
      group: string | null;
      items: MultiSearchableSelectOption[];
    }> = [];

    if (ungrouped.length > 0) {
      result.push({
        group: null,
        items: [...ungrouped].sort((a, b) => a.label.localeCompare(b.label)),
      });
    }

    const sortedGroups = [...grouped.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    );
    sortedGroups.forEach(([group, items]) => {
      result.push({
        group,
        items: [...items].sort((a, b) => a.label.localeCompare(b.label)),
      });
    });

    return result;
  }
}

class MultiSelectSummaryBuilder {
  public static buildLabel(selectedCount: number, placeholder: string): string {
    if (selectedCount === 0) return placeholder;
    if (selectedCount === 1) return "1 selezionato";
    return `${selectedCount} selezionati`;
  }
}

export function MultiSearchableSelect({
  value,
  options,
  placeholder = "Seleziona...",
  searchPlaceholder = "Cerca...",
  emptyMessage = "Nessun risultato trovato",
  disabled = false,
  maxVisibleBadges = 6,
  onChange,
}: MultiSearchableSelectProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(
    () => MultiSelectSearchEngine.filter(options, query),
    [options, query]
  );

  const groupedFiltered = useMemo(
    () => MultiSelectGroupBuilder.group(filtered),
    [filtered]
  );

  const selectedOptions = useMemo(() => {
    const byValue = new Map(options.map((o) => [o.value, o]));
    return value
      .map((v) => byValue.get(v))
      .filter((v): v is MultiSearchableSelectOption => Boolean(v));
  }, [options, value]);

  const visibleBadges = selectedOptions.slice(0, maxVisibleBadges);
  const overflowCount =
    selectedOptions.length > visibleBadges.length
      ? selectedOptions.length - visibleBadges.length
      : 0;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full h-12 justify-between rounded-xl border-neutral-200 bg-white"
          >
            <span className="text-sm text-neutral-700">
              {MultiSelectSummaryBuilder.buildLabel(value.length, placeholder)}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-neutral-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(480px,calc(100vw-2rem))] p-0 bg-white border border-neutral-200 shadow-lg"
        >
          <div className="border-b border-black/5 p-2 flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-neutral-600"
              onClick={() => onChange(MultiSelectValueController.clear())}
              disabled={value.length === 0}
              title="Svuota selezione"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-2 py-6 text-sm text-neutral-500">
                {emptyMessage}
              </div>
            ) : (
              <div className="space-y-3">
                {groupedFiltered.map((bucket) => (
                  <div
                    key={bucket.group ?? "__ungrouped__"}
                    className="space-y-1"
                  >
                    {bucket.group && (
                      <div className="sticky top-0 z-10 -mx-2 px-2 py-1 bg-white border-y border-black/5">
                        <p className="text-[11px] font-semibold text-neutral-600 uppercase">
                          {bucket.group}
                        </p>
                      </div>
                    )}
                    {bucket.items.map((opt) => {
                      const checked = selectedSet.has(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={cn(
                            "w-full rounded-lg px-2 py-2 text-left transition hover:bg-neutral-50 border border-transparent",
                            checked && "bg-neutral-50 border-neutral-200"
                          )}
                          onClick={() => {
                            onChange(
                              MultiSelectValueController.toggle(
                                value,
                                opt.value
                              )
                            );
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 items-center justify-center rounded border",
                                checked
                                  ? "bg-neutral-900 text-white border-neutral-900"
                                  : "bg-white text-transparent border-neutral-200"
                              )}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-neutral-900 truncate">
                                {opt.label}
                              </p>
                              {(opt.groupLabel || opt.description) && (
                                <p className="text-xs text-neutral-500 truncate">
                                  {[opt.groupLabel, opt.description]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleBadges.map((opt) => (
            <Badge key={`selected-${opt.value}`} variant="secondary">
              {opt.label}
            </Badge>
          ))}
          {overflowCount > 0 && (
            <Badge variant="outline">+{overflowCount}</Badge>
          )}
        </div>
      )}
    </div>
  );
}
