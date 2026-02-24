import { type ReactElement, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface UnitOption {
  id: string;
  name: string;
  cropName: string;
  cropType: string;
  variety: string;
  areaHa: number;
}

interface ProductUnitsDrawerProps {
  open: boolean;
  onClose: () => void;
  units: UnitOption[];
  selectedUnitIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ProductUnitsDrawer({
  open,
  onClose,
  units,
  selectedUnitIds,
  onSelectionChange,
}: ProductUnitsDrawerProps): ReactElement {
  const [search, setSearch] = useState("");

  const filteredUnits = useMemo(() => {
    if (!search.trim()) return units;
    const q = search.toLowerCase();
    return units.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.cropName.toLowerCase().includes(q) ||
        u.variety.toLowerCase().includes(q),
    );
  }, [units, search]);

  const selectedCount = selectedUnitIds.length;
  const allSelected = selectedCount === units.length && units.length > 0;

  const toggleUnit = (unitId: string) => {
    if (selectedUnitIds.includes(unitId)) {
      onSelectionChange(selectedUnitIds.filter((id) => id !== unitId));
    } else {
      onSelectionChange([...selectedUnitIds, unitId]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(units.map((u) => u.id));
    }
  };

  const totalAreaHa = useMemo(() => {
    return units
      .filter((u) => selectedUnitIds.includes(u.id))
      .reduce((sum, u) => sum + u.areaHa, 0);
  }, [units, selectedUnitIds]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Unità produttive</SheetTitle>
          <SheetDescription>
            {selectedCount} di {units.length} selezionate &middot;{" "}
            {totalAreaHa.toFixed(2)} ha totali
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Cerca unità produttiva..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {allSelected ? "Deseleziona tutto" : "Seleziona tutto"}
            </Button>
          </div>

          <div className="space-y-2">
            {filteredUnits.map((unit) => {
              const isSelected = selectedUnitIds.includes(unit.id);
              return (
                <div
                  key={unit.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "border-blue-200 bg-blue-50"
                      : "border-neutral-200 hover:bg-neutral-50"
                  }`}
                  onClick={() => toggleUnit(unit.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleUnit(unit.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {unit.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {unit.cropName} - {unit.cropType}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {unit.areaHa.toFixed(2)} ha
                      </Badge>
                      {unit.variety && (
                        <Badge variant="outline" className="text-xs">
                          {unit.variety}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t">
            <Button onClick={onClose} className="w-full">
              Conferma ({selectedCount} selezionate)
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
