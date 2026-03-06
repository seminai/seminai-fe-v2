import { useState, useEffect } from "react";
import { ChevronDown, ListFilter } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function ColumnFilterPopover({
  header,
  colIdx,
  uniqueValues,
  activeFilter,
  sortDir,
  onSort,
  onApplyFilter,
  onClearFilter,
}: {
  header: string;
  colIdx: number;
  uniqueValues: string[];
  activeFilter: Set<string> | undefined;
  sortDir: "asc" | "desc" | null;
  onSort: (dir: "asc" | "desc") => void;
  onApplyFilter: (col: number, values: Set<string>) => void;
  onClearFilter: (col: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isFiltered =
    activeFilter &&
    activeFilter.size > 0 &&
    activeFilter.size < uniqueValues.length;

  useEffect(() => {
    if (open) {
      setSelected(
        activeFilter && activeFilter.size > 0
          ? new Set(activeFilter)
          : new Set(uniqueValues),
      );
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredValues = uniqueValues.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleValue = (v: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 font-semibold text-slate-700"
        >
          {header}
          {isFiltered ? (
            <ListFilter className="h-3 w-3 text-emerald-600" />
          ) : (
            <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <div className="p-3 space-y-2">
          <button
            type="button"
            onClick={() => { onSort("asc"); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 w-full text-xs py-1 rounded px-1",
              sortDir === "asc" ? "font-semibold text-slate-900" : "text-slate-600",
            )}
          >
            <span className="text-sm">↑</span> Ordina A-Z
          </button>
          <button
            type="button"
            onClick={() => { onSort("desc"); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 w-full text-xs py-1 rounded px-1",
              sortDir === "desc" ? "font-semibold text-slate-900" : "text-slate-600",
            )}
          >
            <span className="text-sm">↓</span> Ordina Z-A
          </button>
          <input
            type="text"
            placeholder="Cerca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-300"
          />
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <button type="button" onClick={() => setSelected(new Set(uniqueValues))} className="underline">Tutti</button>
            <button type="button" onClick={() => setSelected(new Set())} className="underline">Nessuno</button>
          </div>
          <div className="max-h-[180px] overflow-y-auto space-y-0.5">
            {filteredValues.map((v) => (
              <label
                key={v}
                className="flex items-center gap-2 rounded px-1 py-1 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(v)}
                  onChange={() => toggleValue(v)}
                  className="h-3.5 w-3.5 rounded-sm border-slate-300 accent-slate-800"
                />
                <span className="truncate">
                  {v || <em className="text-slate-400">(vuoto)</em>}
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { onClearFilter(colIdx); setOpen(false); }}
              className="flex-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
            >
              Pulisci filtro
            </button>
            <button
              type="button"
              onClick={() => {
                if (selected.size === uniqueValues.length || selected.size === 0) {
                  onClearFilter(colIdx);
                } else {
                  onApplyFilter(colIdx, selected);
                }
                setOpen(false);
              }}
              className="flex-1 rounded-full bg-slate-800 px-3 py-1.5 text-xs text-white"
            >
              OK
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
