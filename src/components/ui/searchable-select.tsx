import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  label: string;
  value: string;
};

export interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noneOptionLabel?: string;
  loading?: boolean;
  loadingMessage?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  wrapperClassName?: string;
  contentClassName?: string;
  maxVisibleOptions?: number;
  maxHeight?: string;
  keepOpenOnSelect?: (value: string) => boolean; // Funzione per determinare se mantenere aperta la select dopo la selezione
}

export function SearchableSelect({
  value,
  options,
  placeholder = "Seleziona...",
  searchPlaceholder = "Cerca...",
  emptyMessage = "Nessun risultato trovato",
  noneOptionLabel = "Nessuna selezione",
  loading = false,
  loadingMessage = "Caricamento...",
  disabled = false,
  onChange,
  wrapperClassName,
  contentClassName,
  maxVisibleOptions,
  maxHeight = "max-h-60",
  keepOpenOnSelect,
}: SearchableSelectProps): React.ReactElement {
  const EMPTY_VALUE_TOKEN = "__SEARCHABLE_SELECT_EMPTY__";
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [open, setOpen] = React.useState<boolean>(false);
  const lastSelectedValueRef = React.useRef<string>("");

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredOptions = React.useMemo(() => {
    if (!normalizedSearch) return options;
    return options.filter((option) => {
      const label = option.label.toLowerCase();
      const optionValue = option.value.toLowerCase();
      return (
        label.includes(normalizedSearch) ||
        optionValue.includes(normalizedSearch)
      );
    });
  }, [options, normalizedSearch]);

  const visibleOptions = React.useMemo(() => {
    if (!maxVisibleOptions || maxVisibleOptions <= 0) {
      return filteredOptions;
    }
    return filteredOptions.slice(0, maxVisibleOptions);
  }, [filteredOptions, maxVisibleOptions]);

  const isTruncated = React.useMemo(() => {
    if (!maxVisibleOptions) return false;
    return filteredOptions.length > visibleOptions.length;
  }, [filteredOptions, visibleOptions, maxVisibleOptions]);

  React.useEffect(() => {
    setSearchTerm("");
  }, [options]);

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      const mappedValue =
        nextValue === EMPTY_VALUE_TOKEN ? "" : nextValue ?? "";
      lastSelectedValueRef.current = mappedValue;
      onChange(mappedValue);
      setSearchTerm("");
      
      // Se keepOpenOnSelect è definita e ritorna true per il nuovo valore,
      // mantieni la select aperta usando setTimeout per assicurarsi che Radix UI
      // non l'abbia già chiusa
      if (keepOpenOnSelect && keepOpenOnSelect(mappedValue)) {
        // Usa setTimeout per riaprire la select dopo che Radix UI ha processato la chiusura
        setTimeout(() => {
          setOpen(true);
        }, 0);
      }
    },
    [onChange, keepOpenOnSelect]
  );

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      // Se la select sta per chiudersi e keepOpenOnSelect è definita
      if (!newOpen && keepOpenOnSelect) {
        // Controlla se l'ultimo valore selezionato richiede di mantenere aperta la select
        const valueToCheck = lastSelectedValueRef.current;
        if (keepOpenOnSelect(valueToCheck)) {
          // Mantieni la select aperta - non aggiornare lo stato
          return;
        }
      }
      // Altrimenti aggiorna normalmente lo stato
      setOpen(newOpen);
    },
    [keepOpenOnSelect]
  );

  const shouldShowNoneOption = React.useMemo(() => {
    if (!normalizedSearch) return false;
    if (!noneOptionLabel) return true;
    return noneOptionLabel.toLowerCase().includes(normalizedSearch);
  }, [noneOptionLabel, normalizedSearch]);

  const selectValue =
    value === null || value === undefined || value === ""
      ? EMPTY_VALUE_TOKEN
      : value;

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={disabled || loading}
      open={open}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger
        className={cn(
          "h-10 w-full rounded-xl border border-black/5 bg-white/70 px-3 text-sm focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80",
          wrapperClassName
        )}
      >
        <SelectValue placeholder={loading ? loadingMessage : placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("p-0", contentClassName)}>
        <div className="sticky top-0 z-10 border-b border-black/5 bg-white p-2">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            autoFocus
          />
        </div>
        <div className={cn("overflow-y-auto py-1", maxHeight)}>
          {shouldShowNoneOption && (
            <SelectItem value={EMPTY_VALUE_TOKEN}>{noneOptionLabel}</SelectItem>
          )}
          {visibleOptions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            visibleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          )}
        </div>
        {isTruncated && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t border-black/5">
            Risultati limitati, raffina la ricerca.
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
