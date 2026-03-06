import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { ColumnFilterPopover } from "./ColumnFilterPopover";

const COLLAPSED_ROW_LIMIT = 5;

export function DownloadableTable({ children }: { children: React.ReactNode }) {
  const sourceRef = useRef<HTMLTableElement>(null);
  const [parsed, setParsed] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<number, Set<string>>>({});
  const [sortConfig, setSortConfig] = useState<{ col: number; dir: "asc" | "desc" } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const table = sourceRef.current;
    if (!table) return;
    const headers: string[] = [];
    table.querySelectorAll("thead th").forEach((th) => {
      headers.push((th as HTMLElement).textContent?.trim() ?? "");
    });
    const rows: string[][] = [];
    table.querySelectorAll("tbody tr").forEach((tr) => {
      const cells: string[] = [];
      tr.querySelectorAll("td").forEach((td) => {
        cells.push((td as HTMLElement).textContent?.trim() ?? "");
      });
      if (cells.length > 0) rows.push(cells);
    });
    if (headers.length > 0) setParsed({ headers, rows });
  }, [children]);

  const getUniqueValues = useCallback(
    (colIdx: number): string[] => {
      if (!parsed) return [];
      const values = new Set(parsed.rows.map((row) => row[colIdx] ?? ""));
      return Array.from(values).sort((a, b) => a.localeCompare(b, "it"));
    },
    [parsed],
  );

  const getFilteredRows = useCallback(() => {
    if (!parsed) return [];
    let rows = [...parsed.rows];
    for (const [colStr, allowed] of Object.entries(columnFilters)) {
      const col = Number(colStr);
      if (allowed.size > 0) rows = rows.filter((row) => allowed.has(row[col] ?? ""));
    }
    if (sortConfig) {
      const { col, dir } = sortConfig;
      rows.sort((a, b) => {
        const va = a[col] ?? "";
        const vb = b[col] ?? "";
        const na = parseFloat(va.replace(",", "."));
        const nb = parseFloat(vb.replace(",", "."));
        if (!isNaN(na) && !isNaN(nb)) return dir === "asc" ? na - nb : nb - na;
        return dir === "asc" ? va.localeCompare(vb, "it") : vb.localeCompare(va, "it");
      });
    }
    return rows;
  }, [parsed, columnFilters, sortConfig]);

  const handleDownload = (format: "csv" | "xlsx") => {
    if (!parsed) return;
    const data = [parsed.headers, ...parsed.rows];
    if (format === "csv") {
      const csv = data
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tabella-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dati");
      XLSX.writeFile(wb, `tabella-${Date.now()}.xlsx`);
    }
  };

  const filteredRows = getFilteredRows();
  const hasMore = filteredRows.length > COLLAPSED_ROW_LIMIT;
  const visibleRows = isExpanded ? filteredRows : filteredRows.slice(0, COLLAPSED_ROW_LIMIT);

  return (
    <div className="my-3 min-w-0 overflow-x-auto">
      <table ref={sourceRef} className="hidden">{children}</table>
      {parsed && (
        <>
          <table className="border-collapse text-left text-sm text-slate-800 w-full">
            <thead className="border-b border-slate-200 bg-slate-50/80">
              <tr>
                {parsed.headers.map((header, i) => (
                  <th key={i} className="whitespace-nowrap px-2 py-1.5 font-semibold text-slate-700 first:pl-0 last:pr-0">
                    <ColumnFilterPopover
                      header={header} colIdx={i} uniqueValues={getUniqueValues(i)}
                      activeFilter={columnFilters[i]}
                      sortDir={sortConfig?.col === i ? sortConfig.dir : null}
                      onSort={(dir) => setSortConfig({ col: i, dir })}
                      onApplyFilter={(col, values) => setColumnFilters((prev) => ({ ...prev, [col]: values }))}
                      onClearFilter={(col) => setColumnFilters((prev) => { const next = { ...prev }; delete next[col]; return next; })}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-b-0">
                  {row.map((cell, j) => (
                    <td key={j} className="whitespace-normal break-words sm:whitespace-nowrap px-2 py-1.5 first:pl-0 last:pr-0">{cell}</td>
                  ))}
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={parsed.headers.length} className="px-2 py-4 text-center text-xs text-slate-400">Nessun risultato</td>
                </tr>
              )}
            </tbody>
          </table>
          {hasMore && (
            <button type="button" onClick={() => setIsExpanded((v) => !v)}
              className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
              {isExpanded ? (<><ChevronUp className="h-3 w-3" />Chiudi ({filteredRows.length} righe)</>) : (<><ChevronDown className="h-3 w-3" />Mostra tutte le {filteredRows.length} righe</>)}
            </button>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <button type="button" className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer" onClick={() => handleDownload("csv")}>
              <Download className="h-3 w-3" />Scarica CSV
            </button>
            <button type="button" className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer" onClick={() => handleDownload("xlsx")}>
              <Download className="h-3 w-3" />Scarica Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
