import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { it } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerInputProps {
  value: Date | undefined | null;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DATE_FORMAT = "dd/MM/yyyy";

function DatePickerInput({
  value,
  onChange,
  placeholder = "gg/mm/aaaa",
  disabled = false,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    value ? format(value, DATE_FORMAT, { locale: it }) : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inputValue when value prop changes externally
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, DATE_FORMAT, { locale: it }));
    } else if (!value) {
      setInputValue("");
    }
  }, [value]);

  const commitTextValue = useCallback(
    (text: string) => {
      if (!text.trim()) {
        onChange(undefined);
        return;
      }
      const parsed = parse(text, DATE_FORMAT, new Date());
      if (isValid(parsed) && text.length === 10) {
        onChange(parsed);
      }
    },
    [onChange],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    if (raw.length === 10) {
      const parsed = parse(raw, DATE_FORMAT, new Date());
      if (isValid(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    commitTextValue(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitTextValue(inputValue);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <div
      className={cn(
        "flex items-center border border-input rounded-md bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 h-9 px-3 py-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="h-9 w-9 shrink-0 rounded-l-none"
            type="button"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white" align="end">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={handleCalendarSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DatePickerInput };
