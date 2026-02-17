import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Building2,
  Leaf,
  FlaskConical,
  Ruler,
  Droplets,
  Warehouse,
  Tractor,
  User,
  MapPin,
  Crosshair,
  FileText,
  Beaker,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  EditableColumn,
  InternalRow,
} from "@/components/organism/EditableTable";

type RowData = Record<string, unknown>;

interface JobCardItemProps {
  row: InternalRow;
  isSelected: boolean;
  onSelect: (row: InternalRow) => void;
  visibleColumnIds: string[];
  columns: EditableColumn[];
  isEditMode: boolean;
  onCellChange: (
    row: InternalRow,
    col: EditableColumn,
    value: unknown,
  ) => void;
}

function formatDate(value: unknown): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value as string);
  return date.toLocaleDateString("it-IT");
}

function formatNumber(value: unknown, decimals = 3): string {
  const num = Number(value);
  if (isNaN(num) || num === 0) return "-";
  return num.toFixed(decimals);
}

function VerificationBadge({ row }: { row: RowData }) {
  const isVerified = row._isVerifiedBoolean as boolean | undefined;
  const conformityChecked = row._conformityChecked as boolean | undefined;

  if (!conformityChecked) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-100 text-amber-800 border-amber-300 text-xs"
      >
        Conformità N/V
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        "text-xs text-white",
        isVerified
          ? "bg-green-500 hover:bg-green-600"
          : "bg-red-500 hover:bg-red-600",
      )}
    >
      {isVerified ? "Verificata" : "Non verificata"}
    </Badge>
  );
}

interface FieldMeta {
  columnId: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const FIELD_SECTIONS: FieldMeta[][] = [
  [
    { columnId: "companyName", label: "Azienda", icon: Building2 },
    { columnId: "productionUnitName", label: "Unità Produttiva", icon: MapPin },
    { columnId: "cropName", label: "Coltura", icon: Leaf },
    { columnId: "cropType", label: "Tipo Coltura" },
    { columnId: "productName", label: "Prodotto", icon: FlaskConical },
    {
      columnId: "productRegistrationNumber",
      label: "N. Registrazione",
    },
    { columnId: "principioAttivo", label: "Principio Attivo", icon: Beaker },
    { columnId: "avversity", label: "Avversità" },
  ],
  [
    { columnId: "quantity", label: "Quantità", icon: Ruler },
    { columnId: "quantityPerHa", label: "Quantità/ha" },
    { columnId: "treatedSurface", label: "Superficie (ha)" },
    { columnId: "sauHa", label: "SAU (ha)" },
    { columnId: "fields", label: "Campi" },
  ],
  [
    { columnId: "doseEtichetta", label: "Dose Etichetta" },
    { columnId: "acquaHl", label: "Acqua (hl)", icon: Droplets },
    {
      columnId: "stockInWarehouse",
      label: "Stock Magazzino",
      icon: Warehouse,
    },
    { columnId: "machineId", label: "Macchina", icon: Tractor },
    { columnId: "userId", label: "Operatore", icon: User },
  ],
  [
    { columnId: "modeOfApplication", label: "Modalità Trattamento" },
    {
      columnId: "isLocalizedTreatment",
      label: "Trattamento Localizzato",
      icon: Crosshair,
    },
    { columnId: "note", label: "Note", icon: FileText },
  ],
];

function CardFieldLabel({
  icon: Icon,
  label,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

function EditInput({
  column,
  row,
  onCellChange,
}: {
  column: EditableColumn;
  row: InternalRow;
  onCellChange: (row: InternalRow, col: EditableColumn, value: unknown) => void;
}) {
  const value = row.data[column.id];

  if (column.type === "select") {
    const options = column.getOptions
      ? column.getOptions(row.data)
      : column.options ?? [];

    const normalizedOptions = options.map((opt) => {
      if (typeof opt === "string") return { label: opt, value: opt };
      return opt as { label: string; value: string; disabled?: boolean };
    });

    return (
      <select
        className="w-full h-8 text-sm border border-slate-300 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={String(value ?? "")}
        onChange={(e) => onCellChange(row, column, e.target.value)}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">{column.placeholder ?? "Seleziona..."}</option>
        {normalizedOptions.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            disabled={(opt as { disabled?: boolean }).disabled}
          >
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "date") {
    const dateValue = value instanceof Date ? value : value ? new Date(value as string) : null;
    const isoDate = dateValue ? dateValue.toISOString().split("T")[0] : "";

    return (
      <Input
        type="date"
        className="h-8 text-sm"
        value={isoDate}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const newDate = e.target.value ? new Date(e.target.value) : null;
          onCellChange(row, column, newDate);
        }}
      />
    );
  }

  if (column.type === "number") {
    return (
      <Input
        type="number"
        className="h-8 text-sm font-mono"
        value={value != null ? String(value) : ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const numVal = e.target.value === "" ? null : Number(e.target.value);
          onCellChange(row, column, numVal);
        }}
      />
    );
  }

  return (
    <Input
      type="text"
      className="h-8 text-sm"
      value={String(value ?? "")}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onCellChange(row, column, e.target.value)}
    />
  );
}

function ReadOnlyValue({
  columnId,
  row,
}: {
  columnId: string;
  row: RowData;
}) {
  const value = row[columnId];

  switch (columnId) {
    case "quantity": {
      const um = (row.unitOfMeasureQuantity as string) ?? "";
      return (
        <span className="font-mono text-sm">
          {formatNumber(value)} {um}
        </span>
      );
    }
    case "quantityPerHa": {
      const qty = Number(row.quantity ?? 0);
      const surf = Number(row.treatedSurface ?? row.sauHa ?? 0);
      const perHa = surf > 0 && qty > 0 ? (qty / surf).toFixed(4) : "-";
      return <span className="font-mono text-sm">{perHa}</span>;
    }
    case "treatedSurface":
      return (
        <span className="font-mono text-sm">
          {formatNumber(row.treatedSurface ?? row.sauHa, 2)}
        </span>
      );
    case "sauHa":
      return (
        <span className="font-mono text-sm">{formatNumber(row.sauHa, 2)}</span>
      );
    case "doseEtichetta": {
      const min = row.doseMinima as number | null | undefined;
      const max = row.doseMassima as number | null | undefined;
      const um = row.doseUm as string | null | undefined;
      const unit = um ? ` ${um}` : "";
      if (min == null && max == null) return <>-</>;
      if (min != null && max != null && min === max)
        return <span className="font-mono">{min}{unit}</span>;
      if (min != null && max != null)
        return <span className="font-mono">{min} - {max}{unit}</span>;
      return <span className="font-mono">{min ?? max}{unit}</span>;
    }
    case "acquaHl": {
      const hl = value as number | null | undefined;
      return hl != null ? <span className="font-mono">{hl} hl</span> : <>-</>;
    }
    case "stockInWarehouse": {
      const stock = value as number | null | undefined;
      const um = row.stockInWarehouseUm as string | null | undefined;
      return stock != null ? (
        <span className="font-mono">{stock} {um ?? ""}</span>
      ) : (
        <>-</>
      );
    }
    case "machineId":
      return <>{(row.machineName as string) ?? "-"}</>;
    case "userId":
      return <>{(row.userName as string) ?? "-"}</>;
    case "isLocalizedTreatment": {
      const bool =
        typeof row.isLocalizedTreatment === "boolean"
          ? row.isLocalizedTreatment
          : row.isLocalizedTreatment === "true";
      return (
        <Badge
          variant={bool ? "default" : "outline"}
          className={cn(
            "text-xs",
            bool
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-gray-100 text-gray-700",
          )}
        >
          {bool ? "Sì" : "No"}
        </Badge>
      );
    }
    case "productName":
      return <span className="font-medium">{String(value ?? "-")}</span>;
    case "productRegistrationNumber":
      return <span className="font-mono text-xs">{String(value ?? "-")}</span>;
    case "note":
      return value ? (
        <span className="line-clamp-2 text-xs">{String(value)}</span>
      ) : (
        <>-</>
      );
    default: {
      const display = value == null || value === "" ? "-" : String(value);
      return <>{display}</>;
    }
  }
}

export function JobCardItem({
  row,
  isSelected,
  onSelect,
  visibleColumnIds,
  columns,
  isEditMode,
  onCellChange,
}: JobCardItemProps) {
  const data = row.data;
  const quantity = Number(data.quantity ?? 0);
  const visibleSet = new Set(visibleColumnIds);
  const columnMap = new Map(columns.map((c) => [c.id, c]));

  const renderField = (meta: FieldMeta) => {
    if (!visibleSet.has(meta.columnId)) return null;

    const col = columnMap.get(meta.columnId);
    const canEdit = isEditMode && col && !col.readOnly;

    return (
      <div key={meta.columnId} className="flex flex-col gap-0.5">
        <CardFieldLabel icon={meta.icon} label={meta.label} />
        {canEdit ? (
          <EditInput column={col} row={row} onCellChange={onCellChange} />
        ) : (
          <span
            className={cn(
              "text-sm",
              (data[meta.columnId] == null || data[meta.columnId] === "" || data[meta.columnId] === "-")
                ? "text-slate-300"
                : "text-slate-800",
            )}
          >
            <ReadOnlyValue columnId={meta.columnId} row={data} />
          </span>
        )}
      </div>
    );
  };

  const renderSection = (fields: FieldMeta[], idx: number) => {
    const rendered = fields.map(renderField).filter(Boolean);
    if (rendered.length === 0) return null;

    return (
      <div
        key={idx}
        className={cn(
          "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-2",
          idx > 0 && "pt-2 border-t border-slate-100",
        )}
      >
        {rendered}
      </div>
    );
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(row);
      }}
      className={cn(
        "w-full text-left rounded-xl border transition-all p-4 space-y-3",
        isSelected
          ? "bg-blue-50/60 border-blue-300 ring-1 ring-blue-200 shadow-sm"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm",
        quantity === 0 && "opacity-60",
        row.isDirty && "ring-2 ring-amber-300",
      )}
    >
      {/* Header - always visible */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {visibleSet.has("jobCode") && (
            <Badge variant="outline" className="font-mono text-xs">
              {data.jobCode as string}
            </Badge>
          )}
          {visibleSet.has("isVerified") && <VerificationBadge row={data} />}
        </div>
        {visibleSet.has("dateOfOpeation") && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            {isEditMode ? (
              <EditInput
                column={columnMap.get("dateOfOpeation")!}
                row={row}
                onCellChange={onCellChange}
              />
            ) : (
              formatDate(data.dateOfOpeation)
            )}
          </div>
        )}
      </div>

      {/* Data sections */}
      {FIELD_SECTIONS.map((fields, idx) => renderSection(fields, idx))}
    </div>
  );
}

export default JobCardItem;
