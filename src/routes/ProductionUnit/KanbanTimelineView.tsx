import * as React from "react";
import { useState, useMemo } from "react";
import type { ProductionUnit } from "@/api/production-unit";
import { Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MONTHS_IT = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

const BAR_COLORS = [
  "bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-violet-500",
  "bg-rose-500", "bg-teal-500", "bg-orange-500", "bg-indigo-500",
  "bg-lime-500", "bg-cyan-500",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getBarColor(cropName: string): string {
  return BAR_COLORS[hashString(cropName) % BAR_COLORS.length];
}

function getBarPosition(
  startDate: string,
  endDate: string | null,
  year: number
): { left: number; width: number } {
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 0, 1).getTime();
  const totalMs = yearEnd - yearStart;
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : yearEnd;
  const clampedStart = Math.max(start, yearStart);
  const clampedEnd = Math.min(end, yearEnd);
  if (clampedStart >= clampedEnd) return { left: 0, width: 0 };
  const left = ((clampedStart - yearStart) / totalMs) * 100;
  const width = ((clampedEnd - clampedStart) / totalMs) * 100;
  return { left: Math.max(0, left), width: Math.max(0.5, width) };
}

function getTodayPosition(year: number): number {
  const now = new Date();
  if (now.getFullYear() !== year) return -1;
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 0, 1).getTime();
  return ((now.getTime() - yearStart) / (yearEnd - yearStart)) * 100;
}

function formatDateDDMMYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
  } catch {
    return "-";
  }
}

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return String(dateStr).split("T")[0] ?? "";
}

type EditingState = { id: string; startDate: string; endDate: string };

type KanbanTimelineViewProps = {
  productionUnits: ProductionUnit[];
  companyOptions: Array<{ label: string; value: string }>;
  onUpdatePeriod: (
    id: string,
    startDate: string,
    endDate: string | null
  ) => Promise<void>;
  onRowClick: (pu: ProductionUnit) => void;
};

export function KanbanTimelineView({
  productionUnits,
  companyOptions,
  onUpdatePeriod,
  onRowClick,
}: KanbanTimelineViewProps): React.ReactElement {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedCompany, setSelectedCompany] = useState("");
  const [editingUnit, setEditingUnit] = useState<EditingState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const todayPos = useMemo(() => getTodayPosition(selectedYear), [selectedYear]);

  const unitsInYear = useMemo(() => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31);

    return productionUnits.filter((pu) => {
      if (selectedCompany && pu.companyId !== selectedCompany) return false;
      const startStr = pu.productionUnit.startDate;
      if (!startStr) return false;
      const start = new Date(startStr);
      const end = pu.productionUnit.endDate
        ? new Date(pu.productionUnit.endDate)
        : new Date(start.getFullYear(), 11, 31);
      return start <= yearEnd && end >= yearStart;
    });
  }, [productionUnits, selectedYear, selectedCompany]);

  const handleStartEdit = (pu: ProductionUnit) => {
    setEditingUnit({
      id: pu.productionUnit.id,
      startDate: formatDateForInput(pu.productionUnit.startDate),
      endDate: formatDateForInput(pu.productionUnit.endDate),
    });
  };

  const handleSave = async () => {
    if (!editingUnit) return;
    setIsSaving(true);
    try {
      await onUpdatePeriod(
        editingUnit.id,
        editingUnit.startDate,
        editingUnit.endDate || null
      );
      setEditingUnit(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: company filter + year navigation */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchableSelect
            value={selectedCompany}
            options={companyOptions}
            placeholder="Tutte le aziende"
            searchPlaceholder="Cerca azienda..."
            emptyMessage="Nessuna azienda trovata"
            noneOptionLabel="Tutte le aziende"
            onChange={setSelectedCompany}
          />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedYear((y) => y - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-xl font-bold tabular-nums min-w-[4ch] text-center">
            {selectedYear}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedYear((y) => y + 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {/* Month headers */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-52 min-w-52 shrink-0 px-3 py-2.5 text-xs font-semibold text-gray-600 border-r border-gray-200">
            Unità Produttiva
          </div>
          <div className="flex-1 grid grid-cols-12">
            {MONTHS_IT.map((month, i) => (
              <div
                key={i}
                className="py-2.5 text-center text-xs font-medium text-gray-500 border-r last:border-r-0 border-gray-100"
              >
                {month}
              </div>
            ))}
          </div>
          <div className="w-10 min-w-10 shrink-0" />
        </div>

        {/* Rows */}
        {unitsInYear.length === 0 ? (
          <div className="px-4 py-16 text-center text-gray-400 text-sm">
            Nessuna unità produttiva
            {selectedCompany ? " per questa azienda" : ""} nel {selectedYear}
          </div>
        ) : (
          unitsInYear.map((pu) => (
            <TimelineRow
              key={pu.productionUnit.id}
              pu={pu}
              year={selectedYear}
              todayPos={todayPos}
              editingUnit={editingUnit}
              isSaving={isSaving}
              onStartEdit={handleStartEdit}
              onSave={handleSave}
              onEditChange={setEditingUnit}
              onRowClick={onRowClick}
            />
          ))
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        {unitsInYear.length} unità produttiv
        {unitsInYear.length === 1 ? "a" : "e"} nel {selectedYear}
      </p>
    </div>
  );
}

type TimelineRowProps = {
  pu: ProductionUnit;
  year: number;
  todayPos: number;
  editingUnit: EditingState | null;
  isSaving: boolean;
  onStartEdit: (pu: ProductionUnit) => void;
  onSave: () => Promise<void>;
  onEditChange: (state: EditingState | null) => void;
  onRowClick: (pu: ProductionUnit) => void;
};

function TimelineRow({
  pu,
  year,
  todayPos,
  editingUnit,
  isSaving,
  onStartEdit,
  onSave,
  onEditChange,
  onRowClick,
}: TimelineRowProps): React.ReactElement {
  const puData = pu.productionUnit;
  const { left, width } = getBarPosition(puData.startDate, puData.endDate, year);
  const barColor = getBarColor(puData.cropName || "default");
  const isEditingThis = editingUnit?.id === puData.id;

  return (
    <div className="flex items-center border-b last:border-b-0 border-gray-100 group hover:bg-gray-50/60 transition-colors">
      {/* Unit info — clickable to open details */}
      <button
        type="button"
        className="w-52 min-w-52 shrink-0 px-3 py-3 border-r border-gray-200 text-left cursor-pointer hover:bg-gray-100/60 transition-colors"
        onClick={() => onRowClick(pu)}
      >
        <p className="text-sm font-medium text-gray-900 truncate">
          {puData.name}
        </p>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {puData.cropName}
          {pu.companyName ? ` · ${pu.companyName}` : ""}
        </p>
      </button>

      {/* Timeline area */}
      <div className="flex-1 relative h-14">
        <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
          {MONTHS_IT.map((_, i) => (
            <div key={i} className="border-r last:border-r-0 border-gray-50" />
          ))}
        </div>

        {todayPos >= 0 && todayPos <= 100 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-400/50 pointer-events-none z-10"
            style={{ left: `${todayPos}%` }}
          />
        )}

        {width > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`absolute top-2.5 bottom-2.5 rounded-md ${barColor} opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm flex items-center justify-center overflow-hidden`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  minWidth: "6px",
                }}
                onClick={() => onRowClick(pu)}
              >
                {width > 10 && (
                  <span className="text-[10px] font-semibold text-white truncate px-1.5 drop-shadow-sm">
                    {puData.cropName}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs space-y-0.5">
              <p className="font-semibold">{puData.name}</p>
              <p>{puData.cropName} · {pu.companyName}</p>
              <p>
                {formatDateDDMMYYYY(puData.startDate)} →{" "}
                {puData.endDate ? formatDateDDMMYYYY(puData.endDate) : "In corso"}
              </p>
              {puData.areaHa > 0 && <p>{puData.areaHa} Ha</p>}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Edit button */}
      <div className="w-10 min-w-10 shrink-0 flex justify-center">
        <Popover
          open={isEditingThis}
          onOpenChange={(open) => { if (!open) onEditChange(null); }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-300 group-hover:text-gray-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(pu);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Modifica Periodo</h4>
              <p className="text-xs text-gray-500 truncate">{puData.name}</p>
              <div>
                <Label className="text-xs text-gray-500">Data Inizio</Label>
                <Input
                  type="date"
                  value={editingUnit?.startDate ?? ""}
                  onChange={(e) =>
                    onEditChange(
                      editingUnit ? { ...editingUnit, startDate: e.target.value } : null
                    )
                  }
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Data Fine</Label>
                <Input
                  type="date"
                  value={editingUnit?.endDate ?? ""}
                  onChange={(e) =>
                    onEditChange(
                      editingUnit ? { ...editingUnit, endDate: e.target.value } : null
                    )
                  }
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving || !editingUnit?.startDate}
                  className="bg-agri-green-500 hover:bg-agri-green-600 flex-1"
                >
                  {isSaving ? (
                    <>
                      <Spinner size={14} ariaLabel="Salvataggio" />
                      <span className="ml-1">Salvataggio...</span>
                    </>
                  ) : (
                    "Salva"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditChange(null)}
                  disabled={isSaving}
                >
                  Annulla
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
