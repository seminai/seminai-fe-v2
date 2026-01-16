import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DATE_DISPLAY_FORMAT, DATE_PLACEHOLDER_LABEL } from "../constants";

export interface DateCellPickerProps {
  value: unknown;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  isInvalid?: boolean;
}

function parseValue(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLabel(date: Date | null, placeholder?: string): string {
  if (date) {
    return format(date, DATE_DISPLAY_FORMAT, { locale: it });
  }
  return placeholder ?? DATE_PLACEHOLDER_LABEL;
}

export function DateCellPicker({
  value,
  onChange,
  placeholder,
  isInvalid,
}: DateCellPickerProps): React.ReactElement {
  const [open, setOpen] = useState(false);

  const resolvedDate = useMemo(() => parseValue(value), [value]);
  const label = useMemo(
    () => formatLabel(resolvedDate, placeholder),
    [resolvedDate, placeholder]
  );

  const handleSelect = useCallback(
    (selectedDate?: Date): void => {
      onChange(selectedDate ?? null);
      if (selectedDate) {
        setOpen(false);
      }
    },
    [onChange]
  );

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10 rounded-xl border border-black/5 bg-white hover:bg-white",
            !resolvedDate && "text-muted-foreground",
            isInvalid && "ring-1 ring-red-200/50 border-red-200/60"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-transparent border-0 shadow-none">
        <Calendar
          mode="single"
          selected={resolvedDate ?? undefined}
          onSelect={handleSelect}
          initialFocus
          locale={it}
        />
      </PopoverContent>
    </Popover>
  );
}
