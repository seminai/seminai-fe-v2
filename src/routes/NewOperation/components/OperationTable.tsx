import { useMemo, useState, useCallback, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, TreeDeciduous, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DosageStrategy } from "@/api/dosage-agent";
import type { OperationMode, UnifiedProductRow } from "../types";
import { UNIT_MEASURE_OPTIONS, STRATEGY_OPTIONS, STRATEGY_DEFAULT_VALUE } from "../types";
import { ProductUnitsDrawer } from "./ProductUnitsDrawer";
import {
  type MultiSearchableSelectOption,
} from "@/routes/DosageManager/MultiSearchableSelect";

interface UnitOption {
  id: string;
  name: string;
  cropName: string;
  cropType: string;
  variety: string;
  areaHa: number;
}

interface OperationTableProps {
  mode: OperationMode;
  rows: UnifiedProductRow[];
  unitOptions: UnitOption[];
  productSelectOptions: MultiSearchableSelectOption[];
  globalSelectedUnitIds: string[];
  onGlobalSelectedUnitIdsChange: (ids: string[]) => void;
  onUpdateRow: (
    internalId: string,
    field: keyof UnifiedProductRow,
    value: unknown,
  ) => void;
  onRemoveRows: (internalIds: string[]) => void;
  onAddProductFromKey: (key: string) => void;
  onChangeRowProduct: (internalId: string, key: string) => void;
  onAddEmptyRow: () => void;
}

export function OperationTable({
  mode,
  rows,
  unitOptions,
  productSelectOptions,
  globalSelectedUnitIds,
  onGlobalSelectedUnitIdsChange,
  onUpdateRow,
  onRemoveRows,
  onAddProductFromKey,
  onChangeRowProduct,
  onAddEmptyRow,
}: OperationTableProps): ReactElement {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [unitsDrawerOpen, setUnitsDrawerOpen] = useState(false);
  const [unitsDrawerRowId, setUnitsDrawerRowId] = useState<string | null>(null);

  const isAutomatic = mode === "automatic";

  // Unit options for multi-select in manual mode
  const unitMultiSelectOptions = useMemo(
    () =>
      unitOptions.map((u) => ({
        value: u.id,
        label: u.name,
        description: `${u.cropName} - ${u.areaHa.toFixed(2)} ha`,
      })),
    [unitOptions],
  );

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllRows = useCallback(() => {
    setSelectedRowIds((prev) => {
      if (prev.size === rows.length) return new Set();
      return new Set(rows.map((r) => r._internalId));
    });
  }, [rows]);

  const deleteSelected = useCallback(() => {
    onRemoveRows([...selectedRowIds]);
    setSelectedRowIds(new Set());
  }, [selectedRowIds, onRemoveRows]);

  // Open units drawer
  const openUnitsDrawer = useCallback(
    (rowId: string | null) => {
      setUnitsDrawerRowId(rowId);
      setUnitsDrawerOpen(true);
    },
    [],
  );

  // Get current unit IDs for the drawer context
  const drawerUnitIds = useMemo(() => {
    if (isAutomatic) return globalSelectedUnitIds;
    if (unitsDrawerRowId) {
      const row = rows.find((r) => r._internalId === unitsDrawerRowId);
      return row?.selectedUnitIds ?? [];
    }
    return [];
  }, [isAutomatic, globalSelectedUnitIds, unitsDrawerRowId, rows]);

  const handleDrawerSelectionChange = useCallback(
    (ids: string[]) => {
      if (isAutomatic) {
        onGlobalSelectedUnitIdsChange(ids);
      } else if (unitsDrawerRowId) {
        onUpdateRow(unitsDrawerRowId, "selectedUnitIds", ids);
        // Recalculate treated surface
        const totalHa = unitOptions
          .filter((u) => ids.includes(u.id))
          .reduce((sum, u) => sum + u.areaHa, 0);
        onUpdateRow(unitsDrawerRowId, "treatedSurfaceHa", totalHa);
      }
    },
    [
      isAutomatic,
      unitsDrawerRowId,
      onGlobalSelectedUnitIdsChange,
      onUpdateRow,
      unitOptions,
    ],
  );

  return (
    <div className="space-y-2">
      {/* Table toolbar */}
      <div className="flex items-center justify-end gap-2">
        {selectedRowIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={deleteSelected}
            className="gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Elimina ({selectedRowIds.size})
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onAddEmptyRow} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Aggiungi riga
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="p-2 w-10">
                <input
                  type="checkbox"
                  checked={
                    selectedRowIds.size === rows.length && rows.length > 0
                  }
                  onChange={toggleAllRows}
                  className="rounded border-neutral-300"
                />
              </th>
              {!isAutomatic && (
                <th className="p-2 text-left font-medium text-neutral-600 min-w-[140px]">
                  Data operazione
                </th>
              )}
              {isAutomatic && (
                <th className="p-2 text-left font-medium text-neutral-400 min-w-[140px] bg-neutral-100">
                  Data operazione
                </th>
              )}
              <th className="p-2 text-left font-medium text-neutral-600 min-w-[160px]">
                Unità produttive
              </th>
              <th className="p-2 text-left font-medium text-neutral-600 min-w-[280px]">
                Prodotto
              </th>
              <th className="p-2 text-left font-medium text-neutral-600 min-w-[100px]">
                Quantità
              </th>
              <th className="p-2 text-left font-medium text-neutral-600 min-w-[80px]">
                UM
              </th>
              <th className="p-2 text-left font-medium text-neutral-600 min-w-[100px]">
                Dose/ha
              </th>
              <th className="p-2 text-left font-medium text-neutral-600 min-w-[100px]">
                Sup. trattata
              </th>
              <th className="p-2 text-left font-medium text-neutral-600 min-w-[100px]">
                Giacenza
              </th>
              {isAutomatic && (
                <th className="p-2 text-left font-medium text-neutral-600 min-w-[120px]">
                  Strategia
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={isAutomatic ? 10 : 9}
                  className="p-8 text-center text-neutral-400"
                >
                  Nessun prodotto. Aggiungi prodotti usando i pulsanti sopra.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <OperationTableRow
                  key={row._internalId}
                  row={row}
                  mode={mode}
                  isSelected={selectedRowIds.has(row._internalId)}
                  onToggleSelect={() => toggleRowSelection(row._internalId)}
                  unitMultiSelectOptions={unitMultiSelectOptions}
                  globalSelectedUnitIds={globalSelectedUnitIds}
                  onUpdateRow={onUpdateRow}
                  onOpenUnitsDrawer={() =>
                    openUnitsDrawer(isAutomatic ? null : row._internalId)
                  }
                  productSelectOptions={productSelectOptions}
                  onSelectProduct={(key) => onChangeRowProduct(row._internalId, key)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Units drawer */}
      <ProductUnitsDrawer
        open={unitsDrawerOpen}
        onClose={() => setUnitsDrawerOpen(false)}
        units={unitOptions}
        selectedUnitIds={drawerUnitIds}
        onSelectionChange={handleDrawerSelectionChange}
      />
    </div>
  );
}

// Row component
interface OperationTableRowProps {
  row: UnifiedProductRow;
  mode: OperationMode;
  isSelected: boolean;
  onToggleSelect: () => void;
  unitMultiSelectOptions: MultiSearchableSelectOption[];
  globalSelectedUnitIds: string[];
  onUpdateRow: (
    internalId: string,
    field: keyof UnifiedProductRow,
    value: unknown,
  ) => void;
  onOpenUnitsDrawer: () => void;
  productSelectOptions: MultiSearchableSelectOption[];
  onSelectProduct: (key: string) => void;
}

function OperationTableRow({
  row,
  mode,
  isSelected,
  onToggleSelect,
  unitMultiSelectOptions,
  globalSelectedUnitIds,
  onUpdateRow,
  onOpenUnitsDrawer,
  productSelectOptions,
  onSelectProduct,
}: OperationTableRowProps): ReactElement {
  const isAutomatic = mode === "automatic";
  const unitCount = isAutomatic
    ? globalSelectedUnitIds.length
    : row.selectedUnitIds.length;

  // Product search state
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productSelectOptions.slice(0, 50); // limit initial display
    return productSelectOptions.filter((opt) => {
      const haystack = [
        opt.label,
        opt.description ?? "",
        opt.groupLabel ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    }).slice(0, 50);
  }, [productSelectOptions, productSearch]);

  // Group filtered products by groupLabel
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, MultiSearchableSelectOption[]>();
    for (const opt of filteredProducts) {
      const group = opt.groupLabel ?? "";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(opt);
    }
    return groups;
  }, [filteredProducts]);

  const sourceLabel =
    row.source === "warehouse"
      ? "Magazzino"
      : row.source === "registry"
        ? "Registro"
        : row.source === "manual"
          ? ""
          : row.source.toUpperCase();

  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50/50">
      {/* Checkbox */}
      <td className="p-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-neutral-300"
        />
      </td>

      {/* Date */}
      <td className={cn("p-2", isAutomatic && "bg-neutral-100")}>
        {isAutomatic ? (
          <span className="text-xs text-neutral-400 italic">Calcolata AI</span>
        ) : (
          <Input
            type="date"
            value={row.dateOfOperation}
            onChange={(e) =>
              onUpdateRow(row._internalId, "dateOfOperation", e.target.value)
            }
            className="h-8 text-xs"
          />
        )}
      </td>

      {/* Units */}
      <td className="p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenUnitsDrawer}
          className="gap-1.5 h-8 text-xs"
        >
          <TreeDeciduous className="h-3.5 w-3.5" />
          {unitCount} unità
        </Button>
      </td>

      {/* Product */}
      <td className="p-2">
        <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={productSearchOpen}
              className="w-full h-auto min-h-[2rem] justify-between text-left font-normal px-2 py-1"
            >
              {row.productName ? (
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-xs font-medium truncate">
                    {row.productName}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {row.registrationNumber && (
                      <span className="text-[10px] text-neutral-400">
                        N. {row.registrationNumber}
                      </span>
                    )}
                    {sourceLabel && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        {sourceLabel}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Seleziona prodotto...
                </span>
              )}
              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-0" align="start">
            <div className="p-2 border-b border-neutral-100">
              <Input
                placeholder="Cerca prodotto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-8 text-xs"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                  Nessun prodotto trovato
                </p>
              ) : (
                Array.from(groupedProducts.entries()).map(([group, items]) => (
                  <div key={group}>
                    {group && (
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-50 sticky top-0">
                        {group}
                      </div>
                    )}
                    {items.map((opt) => {
                      // Check if this product matches the current row's product
                      const isCurrentProduct =
                        row.productName === opt.label;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={cn(
                            "flex w-full items-start gap-2 px-3 py-2 text-left cursor-pointer hover:bg-neutral-100 transition-colors",
                            isCurrentProduct && "bg-neutral-50",
                          )}
                          onClick={() => {
                            onSelectProduct(opt.value);
                            setProductSearchOpen(false);
                            setProductSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "h-3.5 w-3.5 mt-0.5 shrink-0",
                              isCurrentProduct ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium truncate">
                              {opt.label}
                            </span>
                            {opt.description && (
                              <span className="text-[10px] text-neutral-400 truncate">
                                {opt.description}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </td>

      {/* Quantity */}
      <td className="p-2">
        <Input
          type="number"
          step="0.001"
          min={0}
          value={row.quantity || ""}
          onChange={(e) =>
            onUpdateRow(
              row._internalId,
              "quantity",
              parseFloat(e.target.value) || 0,
            )
          }
          placeholder="0"
          className="h-8 w-24 text-xs"
        />
      </td>

      {/* Unit of measure */}
      <td className="p-2">
        <Select
          value={row.unitOfMeasure}
          onValueChange={(v) =>
            onUpdateRow(row._internalId, "unitOfMeasure", v)
          }
        >
          <SelectTrigger className="h-8 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_MEASURE_OPTIONS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Dose per ha */}
      <td className="p-2">
        <Input
          type="number"
          step="0.001"
          min={0}
          value={row.dosePerHa ?? ""}
          onChange={(e) =>
            onUpdateRow(
              row._internalId,
              "dosePerHa",
              e.target.value ? parseFloat(e.target.value) : null,
            )
          }
          placeholder="0"
          className="h-8 w-24 text-xs"
        />
      </td>

      {/* Treated surface */}
      <td className="p-2">
        <Input
          type="number"
          step="0.01"
          min={0}
          value={row.treatedSurfaceHa || ""}
          onChange={(e) =>
            onUpdateRow(
              row._internalId,
              "treatedSurfaceHa",
              parseFloat(e.target.value) || 0,
            )
          }
          placeholder="0"
          className="h-8 w-24 text-xs"
        />
      </td>

      {/* Stock */}
      <td className="p-2">
        {row.availableStock != null ? (
          <span
            className={cn(
              "font-mono text-xs",
              row.availableStock > 0 ? "text-green-600" : "text-red-500",
            )}
          >
            {row.availableStock.toFixed(2)} {row.stockUnit}
          </span>
        ) : (
          <span className="text-neutral-300 text-xs">—</span>
        )}
      </td>

      {/* Strategy (automatic only) */}
      {isAutomatic && (
        <td className="p-2">
          <Select
            value={row.strategy ?? STRATEGY_DEFAULT_VALUE}
            onValueChange={(v) =>
              onUpdateRow(
                row._internalId,
                "strategy",
                v === STRATEGY_DEFAULT_VALUE ? null : (v as DosageStrategy),
              )
            }
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              {STRATEGY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
      )}
    </tr>
  );
}
