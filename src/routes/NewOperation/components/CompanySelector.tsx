import { useState, useMemo, type ReactElement } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanySelectorProps {
  companyOptions: Array<{ value: string; label: string }>;
  selectedCompanyId: string;
  onCompanyChange: (companyId: string) => void;
}

export function CompanySelector({
  companyOptions,
  selectedCompanyId,
  onCompanyChange,
}: CompanySelectorProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel = companyOptions.find(
    (c) => c.value === selectedCompanyId,
  )?.label;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companyOptions;
    return companyOptions.filter((c) => c.label.toLowerCase().includes(q));
  }, [companyOptions, search]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-900">
            Seleziona azienda
          </h2>
          <p className="text-sm text-neutral-500">
            Scegli l'azienda per cui creare l'operazione
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-neutral-700">
            Azienda
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full h-12 justify-between font-normal"
              >
                {selectedLabel ?? (
                  <span className="text-muted-foreground">
                    Seleziona azienda...
                  </span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <div className="p-2">
                <Input
                  placeholder="Cerca azienda..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                    Nessuna azienda trovata
                  </p>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-neutral-100 transition-colors",
                        selectedCompanyId === c.value && "bg-neutral-50",
                      )}
                      onClick={() => {
                        onCompanyChange(c.value);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedCompanyId === c.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {c.label}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
