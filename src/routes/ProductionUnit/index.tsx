import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  type ProductionUnit,
  type ProductionUnitUpdateInput,
  type FieldInfo,
  type FieldAllocationInput,
  productionUnitApiService,
} from "@/api/production-unit";
import {
  type ProductionCycle,
  type ProductionCycleUpdateInput,
} from "@/api/production-unit-cycle";
import type { Company } from "@/api/companies";
import type { Field as CompanyField } from "@/api/fields";
import { Spinner } from "@/components/ui/spinner";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { useCompanies } from "@/hooks/useCompanies";
import { useFields } from "@/hooks/useFields";
import { useFieldsAvailability } from "@/hooks/useFieldsAvailability";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Pencil, Save, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useProductionUnitCycles } from "@/hooks/useProductionUnitCycles";
import { KanbanTimelineView } from "./KanbanTimelineView";

// Helper function to format dates as DD-MM-YYYY
const formatDateDDMMYYYY = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "-";
  }
};

// Helper per ottenere formato YYYY-MM-DD per input date
const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  return String(dateStr).split("T")[0] ?? "";
};

// Opzioni per il campo Protocollo
const PROTOCOLL_OPTIONS = [
  { label: "Biologico", value: "bio" },
  { label: "Convenzionale", value: "convenzionale" },
  { label: "In conversione", value: "in conversione" },
];

type CropPeriod = {
  minDate: string;
  maxDate: string;
};

type CropCatalogItem = {
  code: string;
  species: string;
  cropType: string;
  sowingPeriod: CropPeriod;
  floweringPeriod: CropPeriod;
  harvestPeriod: CropPeriod;
  estimatedYield: {
    min: number;
    max: number;
  };
};

type CropSelection = {
  species: string;
  cropType: string;
  code: string;
};

class CropCatalog {
  private readonly items: CropCatalogItem[];
  private readonly byCode: Map<string, CropCatalogItem>;
  private readonly speciesOptions: Array<{ label: string; value: string }>;
  private readonly cropTypeOptions: Array<{ label: string; value: string }>;
  private readonly varietyOptions: Array<{ label: string; value: string }>;
  private readonly codeToLabel: Map<string, { label: string; value: string }>;

  constructor(items: CropCatalogItem[]) {
    this.items = items;
    this.byCode = new Map(items.map((item) => [item.code, item]));
    this.speciesOptions = this.buildOptions(items.map((item) => item.species));
    this.cropTypeOptions = this.buildOptions(
      items.map((item) => item.cropType),
    );
    this.codeToLabel = new Map(
      items.map((item) => [
        item.code,
        {
          label: `${item.species} • ${item.cropType} (${item.code})`,
          value: item.code,
        },
      ]),
    );
    this.varietyOptions = Array.from(this.codeToLabel.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }

  private buildOptions(
    values: string[],
    mapFn?: (value: string) => { label: string; value: string },
  ): Array<{ label: string; value: string }> {
    const unique = Array.from(new Set(values)).sort((a, b) =>
      a.localeCompare(b),
    );
    return unique.map((value) =>
      mapFn ? mapFn(value) : { label: value, value },
    );
  }

  private toSelection(item: CropCatalogItem): CropSelection {
    return {
      species: item.species,
      cropType: item.cropType,
      code: item.code,
    };
  }

  public getSpeciesOptions(): Array<{ label: string; value: string }> {
    return this.speciesOptions;
  }

  public getCropTypeOptions(): Array<{ label: string; value: string }> {
    return this.cropTypeOptions;
  }

  public getVarietyOptions(): Array<{ label: string; value: string }> {
    return this.varietyOptions;
  }

  public getVarietyLabel(code: string): string {
    return this.codeToLabel.get(code)?.label ?? code;
  }

  public resolve(
    rowData: Record<string, unknown>,
    overrides: Partial<CropSelection>,
  ): CropSelection | null {
    const current: Partial<CropSelection> = {
      species:
        typeof rowData.cropName === "string" ? rowData.cropName : undefined,
      cropType:
        typeof rowData.cropType === "string" ? rowData.cropType : undefined,
      code: typeof rowData.variety === "string" ? rowData.variety : undefined,
    };

    const request: Partial<CropSelection> = {
      ...current,
      ...overrides,
    };

    if (request.code) {
      const matchByCode = this.byCode.get(request.code);
      if (matchByCode) {
        return this.toSelection(matchByCode);
      }
    }

    let candidates = this.items;

    if (request.species) {
      candidates = candidates.filter(
        (item) => item.species === request.species,
      );
    }

    if (request.cropType) {
      candidates = candidates.filter(
        (item) => item.cropType === request.cropType,
      );
    }

    if (candidates.length === 0) {
      return null;
    }

    if (request.code) {
      const candidateByCode = candidates.find(
        (item) => item.code === request.code,
      );
      if (candidateByCode) {
        return this.toSelection(candidateByCode);
      }
    }

    if (current.code) {
      const stillValid = candidates.find((item) => item.code === current.code);
      if (stillValid) {
        return this.toSelection(stillValid);
      }
    }

    return this.toSelection(candidates[0]);
  }

  public buildSelection(
    rowData: Record<string, unknown>,
    overrides: Partial<CropSelection>,
  ): CropSelection {
    const shouldClear = Object.values(overrides).some(
      (value) => typeof value === "string" && value.length === 0,
    );

    if (shouldClear) {
      return { species: "", cropType: "", code: "" };
    }

    const resolved = this.resolve(rowData, overrides);

    if (resolved) {
      return resolved;
    }

    return {
      species:
        overrides.species !== undefined
          ? String(overrides.species)
          : typeof rowData.cropName === "string"
            ? rowData.cropName
            : "",
      cropType:
        overrides.cropType !== undefined
          ? String(overrides.cropType)
          : typeof rowData.cropType === "string"
            ? rowData.cropType
            : "",
      code:
        overrides.code !== undefined
          ? String(overrides.code)
          : typeof rowData.variety === "string"
            ? rowData.variety
            : "",
    };
  }
}

class CompanyDirectory {
  private readonly companyOptions: Array<{ label: string; value: string }>;
  private readonly companyNameById: Map<string, string>;
  private readonly fieldsByCompany: Map<
    string,
    Array<{ label: string; value: string }>
  >;
  private readonly fieldInfoById: Map<string, FieldInfo>;

  constructor(companies: Company[], fields: CompanyField[]) {
    this.companyNameById = new Map(
      companies.map((company) => [company.id, company.name]),
    );
    this.companyOptions = companies
      .map((company) => ({
        label: company.name,
        value: company.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    this.fieldsByCompany = new Map();
    this.fieldInfoById = new Map();

    fields.forEach((field) => {
      const option = { label: field.name, value: field.id };
      const list = this.fieldsByCompany.get(field.companyId) ?? [];
      list.push(option);
      this.fieldsByCompany.set(field.companyId, list);
      this.fieldInfoById.set(field.id, CompanyDirectory.buildFieldInfo(field));
    });

    this.fieldsByCompany.forEach((options) =>
      options.sort((first, second) =>
        first.label.localeCompare(second.label, "it", {
          sensitivity: "base",
        }),
      ),
    );
  }

  private static buildFieldInfo(field: CompanyField): FieldInfo {
    const areaHaValue = (field as CompanyField & { areaHa?: number | null })
      .areaHa;
    return {
      id: field.id,
      name: field.name,
      sauHa: field.sauHa ?? 0,
      gisHa: field.gisHa,
      areaHaOnField:
        typeof areaHaValue === "number" ? areaHaValue : (field.sauHa ?? 0),
    };
  }

  public getCompanyOptions(): Array<{ label: string; value: string }> {
    return this.companyOptions;
  }

  public getCompanyName(companyId: string): string {
    if (!companyId) {
      return "";
    }
    return this.companyNameById.get(companyId) ?? companyId;
  }

  public getFieldsOptions(
    companyId: string | undefined,
  ): Array<{ label: string; value: string }> {
    if (!companyId) {
      return [];
    }
    return this.fieldsByCompany.get(companyId) ?? [];
  }

  public getFieldInfo(fieldId: string): FieldInfo | null {
    if (!fieldId) {
      return null;
    }
    return this.fieldInfoById.get(fieldId) ?? null;
  }
}

type CycleFormState = {
  floweringDate: string;
  harvestingDate: string;
  destinazioneDiUso: string;
};

type ProductionUnitCyclesSectionProps = {
  productionUnitId: string;
};

const buildEmptyCycleFormState = (): CycleFormState => ({
  floweringDate: "",
  harvestingDate: "",
  destinazioneDiUso: "",
});

const getStatusStyle = (status?: string): string => {
  switch (status) {
    case "current":
      return "bg-green-100 text-green-800";
    case "future":
      return "bg-blue-100 text-blue-800";
    case "past":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

// === Fields Allocation Section ===

type FieldAllocationRow = {
  id: string;
  fieldId: string;
  fieldName: string;
  companyName: string;
  sauHa: number;
  areaAvailable: number;
  areaHa: number;
  isNew?: boolean;
};

type FieldsAllocationSectionProps = {
  productionUnitId: string;
  companyId: string;
  startDate: string | null;
  endDate: string | null;
  currentFields: FieldInfo[];
  isEditing: boolean;
  onSaveSuccess?: () => void;
};

function FieldsAllocationSection({
  productionUnitId,
  companyId,
  startDate,
  endDate,
  currentFields,
  isEditing,
  onSaveSuccess,
}: FieldsAllocationSectionProps): React.ReactElement {
  const [allocations, setAllocations] = useState<FieldAllocationRow[]>([]);
  const [selectedFieldToAdd, setSelectedFieldToAdd] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Formatta le date per la query
  const formattedStartDate = startDate ? startDate.split("T")[0] : "";
  const formattedEndDate = endDate ? endDate.split("T")[0] : "";

  // Ottieni i campi disponibili nel range di date
  const { companies: availableCompanies, isLoading: isLoadingAvailability } =
    useFieldsAvailability(formattedStartDate, formattedEndDate, {
      enabled: isEditing && !!formattedStartDate && !!formattedEndDate,
    });

  // Trova i campi disponibili per la company dell'unità produttiva
  const availableFieldsForCompany = useMemo(() => {
    const companyData = availableCompanies.find(
      (c) => c.companyId === companyId,
    );
    if (!companyData) return [];

    // Filtra i campi già allocati
    const allocatedFieldIds = new Set(allocations.map((a) => a.fieldId));
    return companyData.fields.filter(
      (f) => !allocatedFieldIds.has(f.id) && f.areaAvailable > 0,
    );
  }, [availableCompanies, companyId, allocations]);

  // Opzioni per il dropdown dei campi disponibili
  const availableFieldOptions = useMemo(() => {
    return availableFieldsForCompany.map((f) => ({
      label: `${f.name} (${f.areaAvailable.toFixed(2)} Ha disponibili)`,
      value: f.id,
    }));
  }, [availableFieldsForCompany]);

  // Inizializza le allocazioni dai campi correnti
  useEffect(() => {
    const initialAllocations: FieldAllocationRow[] = currentFields.map(
      (field) => ({
        id: field.id,
        fieldId: field.id,
        fieldName: field.name,
        companyName: "",
        sauHa: field.sauHa,
        areaAvailable: field.sauHa,
        areaHa: field.areaHaOnField,
        isNew: false,
      }),
    );
    setAllocations(initialAllocations);
  }, [currentFields]);

  const handleAddField = () => {
    if (!selectedFieldToAdd) return;

    const fieldData = availableFieldsForCompany.find(
      (f) => f.id === selectedFieldToAdd,
    );
    if (!fieldData) return;

    const newAllocation: FieldAllocationRow = {
      id: `new-${Date.now()}`,
      fieldId: fieldData.id,
      fieldName: fieldData.name,
      companyName: "",
      sauHa: fieldData.sauHa,
      areaAvailable: fieldData.areaAvailable,
      areaHa: fieldData.areaAvailable,
      isNew: true,
    };

    setAllocations((prev) => [...prev, newAllocation]);
    setSelectedFieldToAdd("");
  };

  const handleRemoveAllocation = (allocationId: string) => {
    setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
  };

  const handleAreaChange = (allocationId: string, newArea: number) => {
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.id === allocationId) {
          // Limita l'area al massimo disponibile
          const maxArea = a.isNew ? a.areaAvailable : a.sauHa;
          const validArea = Math.min(Math.max(0, newArea), maxArea);
          return { ...a, areaHa: validArea };
        }
        return a;
      }),
    );
  };

  const handleSaveAllocations = async () => {
    if (allocations.length === 0) {
      toast.error("Devi selezionare almeno un campo");
      return;
    }

    const totalArea = allocations.reduce((sum, a) => sum + a.areaHa, 0);
    if (totalArea === 0) {
      toast.error("L'area totale deve essere maggiore di 0");
      return;
    }

    setIsSaving(true);
    try {
      const allocationInputs: FieldAllocationInput[] = allocations.map((a) => ({
        fieldId: a.fieldId,
        areaHa: a.areaHa,
      }));

      await productionUnitApiService.update(productionUnitId, {
        areaHa: totalArea,
        allocations: allocationInputs,
      });

      toast.success("Allocazioni campi aggiornate con successo");
      onSaveSuccess?.();
    } catch (error) {
      console.error("Errore salvataggio allocazioni:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nel salvataggio delle allocazioni",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Calcola area totale allocata
  const totalAllocatedArea = allocations.reduce((sum, a) => sum + a.areaHa, 0);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold">Campi Allocati</h4>
        {isEditing && (
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveAllocations}
            disabled={isSaving}
            className="bg-agri-green-500 hover:bg-agri-green-600"
          >
            {isSaving ? (
              <>
                <Spinner size={14} ariaLabel="Salvataggio" />
                <span className="ml-2">Salvataggio...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salva
              </>
            )}
          </Button>
        )}
      </div>

      {/* Area totale */}
      <div className="text-sm text-gray-600">
        Area totale allocata:{" "}
        <span className="font-semibold">
          {totalAllocatedArea.toFixed(2)} Ha
        </span>
      </div>

      {/* Tabella allocazioni */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                Campo
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                SAU (Ha)
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                Area Allocata (Ha)
              </th>
              {isEditing && (
                <th className="px-4 py-2 text-center font-medium text-gray-600 w-20">
                  Azioni
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {allocations.length === 0 ? (
              <tr>
                <td
                  colSpan={isEditing ? 4 : 3}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  Nessun campo allocato
                </td>
              </tr>
            ) : (
              allocations.map((allocation) => (
                <tr key={allocation.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{allocation.fieldName}</span>
                      {allocation.isNew && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-700"
                        >
                          Nuovo
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {allocation.sauHa.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={
                          allocation.isNew
                            ? allocation.areaAvailable
                            : allocation.sauHa
                        }
                        value={allocation.areaHa}
                        onChange={(e) =>
                          handleAreaChange(
                            allocation.id,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-28 h-8"
                      />
                    ) : (
                      <span>{allocation.areaHa.toFixed(2)}</span>
                    )}
                  </td>
                  {isEditing && (
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAllocation(allocation.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Aggiungi campo */}
      {isEditing && (
        <div className="flex items-end gap-3 pt-2">
          <div className="flex-1">
            <Label className="text-xs text-gray-500 mb-1 block">
              Aggiungi Campo
            </Label>
            {isLoadingAvailability ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size={14} ariaLabel="Caricamento campi" />
                <span>Caricamento campi disponibili...</span>
              </div>
            ) : !formattedStartDate || !formattedEndDate ? (
              <p className="text-sm text-gray-500">
                Imposta le date di inizio e fine per vedere i campi disponibili
              </p>
            ) : availableFieldOptions.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nessun campo disponibile nel periodo selezionato
              </p>
            ) : (
              <SearchableSelect
                value={selectedFieldToAdd}
                options={availableFieldOptions}
                placeholder="Seleziona un campo..."
                searchPlaceholder="Cerca campo..."
                emptyMessage="Nessun campo trovato"
                noneOptionLabel="Nessuna selezione"
                onChange={setSelectedFieldToAdd}
              />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddField}
            disabled={!selectedFieldToAdd}
            className="h-9"
          >
            <Plus className="w-4 h-4 mr-1" />
            Aggiungi
          </Button>
        </div>
      )}
    </div>
  );
}

// === Production Unit Cycles Section ===

function ProductionUnitCyclesSection({
  productionUnitId,
}: ProductionUnitCyclesSectionProps): React.ReactElement {
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [cycleForm, setCycleForm] = useState<CycleFormState>(
    buildEmptyCycleFormState(),
  );

  const {
    cycles,
    isLoading,
    isError,
    error,
    refetch,
    updateCycle,
    deleteCycle,
    isUpdating,
    isDeleting,
  } = useProductionUnitCycles(productionUnitId);

  const handleStartEdit = (cycle: ProductionCycle) => {
    setEditingCycleId(cycle.id);
    setCycleForm({
      floweringDate: formatDateForInput(cycle.floweringDate),
      harvestingDate: formatDateForInput(cycle.harvestingDate),
      destinazioneDiUso:
        (cycle as { destinazioneDiUso?: string | null }).destinazioneDiUso ??
        "",
    });
  };

  const handleCancelEdit = () => {
    setEditingCycleId(null);
    setCycleForm(buildEmptyCycleFormState());
  };

  const handleSave = async () => {
    if (!editingCycleId) return;

    const payload: ProductionCycleUpdateInput = {
      floweringDate: cycleForm.floweringDate
        ? new Date(cycleForm.floweringDate).toISOString()
        : null,
      harvestingDate: cycleForm.harvestingDate
        ? new Date(cycleForm.harvestingDate).toISOString()
        : null,
      destinazioneDiUso:
        cycleForm.destinazioneDiUso.trim().length === 0
          ? null
          : cycleForm.destinazioneDiUso,
    };

    try {
      await updateCycle({ cycleId: editingCycleId, data: payload });
      toast.success("Ciclo aggiornato con successo");
      handleCancelEdit();
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Errore nell'aggiornamento del ciclo",
      );
    }
  };

  const handleDelete = async (cycleId: string) => {
    const confirmed = window.confirm(
      "Sei sicuro di voler eliminare questo ciclo?",
    );
    if (!confirmed) return;

    try {
      await deleteCycle(cycleId);
      toast.success("Ciclo eliminato con successo");
      if (editingCycleId === cycleId) {
        handleCancelEdit();
      }
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Errore nell'eliminazione del ciclo",
      );
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold">Cicli produttivi</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          Aggiorna
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={16} ariaLabel="Caricamento cicli" />
          <span>Caricamento cicli…</span>
        </div>
      )}

      {isError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded">
          {error?.message || "Errore nel caricamento dei cicli"}
        </div>
      )}

      {!isLoading && !isError && cycles.length === 0 && (
        <p className="text-sm text-gray-500">Nessun ciclo disponibile</p>
      )}

      {cycles.map((cycle) => {
        const isEditing = editingCycleId === cycle.id;
        return (
          <div
            key={cycle.id}
            className="border border-gray-200 rounded-lg bg-slate-50 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  Ciclo {cycle.cycleIndex ?? "-"} • {cycle.cropName ?? "-"}{" "}
                  {cycle.seasonYear ? `(${cycle.seasonYear})` : ""}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <Badge
                    variant="secondary"
                    className={getStatusStyle(
                      (cycle as { status?: string }).status,
                    )}
                  >
                    {(cycle as { status?: string }).status ?? "N/D"}
                  </Badge>
                  {cycle.variety && (
                    <Badge variant="outline">{cycle.variety}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSave}
                      disabled={isUpdating}
                      className="bg-agri-green-500 hover:bg-agri-green-600"
                    >
                      {isUpdating ? "Salvataggio..." : "Salva"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                    >
                      Annulla
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(cycle)}
                    >
                      Modifica
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(cycle.id)}
                      disabled={isDeleting}
                    >
                      Elimina
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className="text-xs text-gray-500">
                    Data Fioritura
                  </Label>
                  <Input
                    type="date"
                    value={cycleForm.floweringDate}
                    onChange={(e) =>
                      setCycleForm({
                        ...cycleForm,
                        floweringDate: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Data Raccolta</Label>
                  <Input
                    type="date"
                    value={cycleForm.harvestingDate}
                    onChange={(e) =>
                      setCycleForm({
                        ...cycleForm,
                        harvestingDate: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">
                    Destinazione d'Uso
                  </Label>
                  <Input
                    value={cycleForm.destinazioneDiUso}
                    onChange={(e) =>
                      setCycleForm({
                        ...cycleForm,
                        destinazioneDiUso: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm text-gray-700">
                <div>
                  <p className="text-xs text-gray-500">Data Fioritura</p>
                  <p>{formatDateDDMMYYYY(cycle.floweringDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Data Raccolta</p>
                  <p>{formatDateDDMMYYYY(cycle.harvestingDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Destinazione d'Uso</p>
                  <p>
                    {(cycle as { destinazioneDiUso?: string | null })
                      .destinazioneDiUso ?? "-"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const buildProductionUnitColumns = (
  catalog: CropCatalog | null,
  directory: CompanyDirectory | null,
): EditableColumn[] => {
  const speciesOptions = catalog?.getSpeciesOptions() ?? [];
  const cropTypeOptions = catalog?.getCropTypeOptions() ?? [];
  const varietyOptions = catalog?.getVarietyOptions() ?? [];
  const companyOptions = directory?.getCompanyOptions() ?? [];

  return [
    {
      id: "companyName",
      title: "Azienda",
      type: "select",
      options: companyOptions,
      placeholder: "Seleziona azienda",
      enableSearch: true,
      searchPlaceholder: "Cerca azienda...",
      emptyStateMessage: "Nessuna azienda trovata",
      noneOptionLabel: "Nessuna selezione",
      onValueChange: ({ value }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!directory) {
          return {
            companyName: sanitizedValue,
            companyId: sanitizedValue,
          };
        }

        if (sanitizedValue === "") {
          return {
            companyName: "",
            companyId: "",
            fieldSelection: "",
            fields: [],
          };
        }

        const label = directory.getCompanyName(sanitizedValue);
        return {
          companyName: label,
          companyId: sanitizedValue,
          fieldSelection: "",
          fields: [],
        };
      },
    },
    {
      id: "name",
      title: "Nome Unità Produttiva",
      type: "text",
    },
    {
      id: "cropName",
      title: "Coltura",
      type: "select",
      options: speciesOptions,
      placeholder: "Seleziona coltura",
      enableSearch: true,
      searchPlaceholder: "Cerca coltura...",
      emptyStateMessage: "Nessuna coltura trovata",
      noneOptionLabel: "Nessuna selezione",
      onValueChange: ({ value, rowData }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!catalog) {
          return sanitizedValue === ""
            ? { cropName: "", cropType: "", variety: "" }
            : { cropName: sanitizedValue };
        }

        const selection = catalog.buildSelection(rowData, {
          species: sanitizedValue,
        });

        return {
          cropName: selection.species,
          cropType: selection.cropType,
          variety: selection.code,
        };
      },
    },
    {
      id: "cropType",
      title: "Tipo Coltura",
      type: "select",
      options: cropTypeOptions,
      placeholder: "Seleziona tipo coltura",
      enableSearch: true,
      searchPlaceholder: "Cerca tipo coltura...",
      emptyStateMessage: "Nessun tipo coltura trovato",
      noneOptionLabel: "Nessuna selezione",
      onValueChange: ({ value, rowData }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!catalog) {
          return sanitizedValue === ""
            ? { cropName: "", cropType: "", variety: "" }
            : { cropType: sanitizedValue };
        }

        const selection = catalog.buildSelection(rowData, {
          cropType: sanitizedValue,
        });

        return {
          cropName: selection.species,
          cropType: selection.cropType,
          variety: selection.code,
        };
      },
    },
    {
      id: "variety",
      title: "Varietà",
      type: "select",
      options: varietyOptions,
      placeholder: "Seleziona varietà",
      enableSearch: true,
      searchPlaceholder: "Cerca varietà...",
      emptyStateMessage: "Nessuna varietà trovata",
      noneOptionLabel: "Nessuna selezione",
      render: (value: unknown) => {
        if (!catalog) {
          return String(value ?? "");
        }
        return catalog.getVarietyLabel(String(value ?? ""));
      },
      onValueChange: ({ value, rowData }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!catalog) {
          return sanitizedValue === ""
            ? { cropName: "", cropType: "", variety: "" }
            : { variety: sanitizedValue };
        }

        const selection = catalog.buildSelection(rowData, {
          code: sanitizedValue,
        });

        return {
          cropName: selection.species,
          cropType: selection.cropType,
          variety: selection.code,
        };
      },
    },
    {
      id: "protocoll",
      title: "Protocollo",
      type: "select",
      options: PROTOCOLL_OPTIONS,
      placeholder: "Seleziona protocollo",
      enableSearch: true,
      searchPlaceholder: "Cerca protocollo...",
      emptyStateMessage: "Nessun protocollo trovato",
      noneOptionLabel: "Nessuna selezione",
      render: (value: unknown) => {
        const option = PROTOCOLL_OPTIONS.find((o) => o.value === value);
        return option?.label ?? String(value ?? "-");
      },
    },
    {
      id: "areaHa",
      title: "Area (Ha)",
      type: "number",
    },
    {
      id: "protectionStructure",
      title: "Struttura Protezione",
      type: "text",
    },
    {
      id: "fieldSelection",
      title: "Campi",
      type: "select",
      placeholder: "Seleziona campo",
      enableSearch: true,
      searchPlaceholder: "Cerca campo...",
      emptyStateMessage: "Nessun campo trovato",
      noneOptionLabel: "Nessuna selezione",
      getOptions: (rowData) => {
        if (!directory) {
          return [];
        }
        const companyId =
          typeof rowData.companyId === "string" ? rowData.companyId : "";
        return directory.getFieldsOptions(companyId);
      },
      render: (_value: unknown, rowData: Record<string, unknown>) => {
        const fields = rowData.fields as FieldInfo[] | undefined;
        if (!fields || fields.length === 0) {
          return <span className="text-gray-400">0 campi</span>;
        }
        const countLabel =
          fields.length === 1 ? "1 campo" : `${fields.length} campi`;
        return <Badge variant="secondary">{countLabel}</Badge>;
      },
      onValueChange: ({ value, rowData }) => {
        const sanitizedValue =
          typeof value === "string" ? value : String(value ?? "");

        if (!directory) {
          return { fieldSelection: sanitizedValue };
        }

        if (sanitizedValue === "") {
          return { fieldSelection: "", fields: [] };
        }

        const fieldInfo = directory.getFieldInfo(sanitizedValue);

        return {
          fieldSelection: sanitizedValue,
          fields: fieldInfo
            ? [fieldInfo]
            : ((rowData.fields as FieldInfo[]) ?? []),
        };
      },
    },
    {
      id: "startDate",
      title: "Data Inizio",
      type: "date",
      render: (value: unknown) => {
        if (!value) return "-";
        const dateStr = typeof value === "string" ? value : String(value);
        return formatDateDDMMYYYY(dateStr);
      },
    },
    {
      id: "endDate",
      title: "Data Fine",
      type: "date",
      render: (value: unknown) => {
        if (!value) return "-";
        const dateStr = typeof value === "string" ? value : String(value);
        return formatDateDDMMYYYY(dateStr);
      },
    },
  ];
};

export default function ProductionUnit(): React.ReactElement {
  const [activeView, setActiveView] = useState<string>("table");
  const [timelineDetailUnit, setTimelineDetailUnit] =
    useState<ProductionUnit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<ProductionUnitUpdateInput>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);
  const [cropCatalog, setCropCatalog] = useState<CropCatalog | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<Error | null>(null);

  const { productionUnits, isLoading, error, refetch } = useProductionUnit();
  const { companies } = useCompanies();
  const { fields: availableFields } = useFields();

  const companyDirectory = useMemo(() => {
    if (companies.length === 0 && availableFields.length === 0) {
      return null;
    }
    return new CompanyDirectory(companies, availableFields);
  }, [companies, availableFields]);

  const companyOptions = useMemo(
    () => companyDirectory?.getCompanyOptions() ?? [],
    [companyDirectory],
  );

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      try {
        const response = await fetch("/datasets/varietà/index.json");
        if (!response.ok) {
          throw new Error("Impossibile caricare le varietà");
        }
        const data = (await response.json()) as CropCatalogItem[];
        if (!isMounted) return;
        setCropCatalog(new CropCatalog(data));
      } catch (err) {
        if (!isMounted) return;
        setCatalogError(
          err instanceof Error
            ? err
            : new Error("Errore nel caricamento delle varietà"),
        );
      } finally {
        if (isMounted) {
          setIsCatalogLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (catalogError) {
      toast.error(catalogError.message);
    }
  }, [catalogError]);

  // Converti i dati delle unità produttive in formato row per la tabella
  const rows = useMemo(() => {
    return productionUnits.map((pu) => ({
      id: pu.productionUnit.id,
      companyId: pu.companyId,
      companyName: pu.companyName,
      name: pu.productionUnit.name,
      cropName: pu.productionUnit.cropName,
      cropType: pu.productionUnit.cropType,
      variety: pu.productionUnit.variety,
      protocoll: pu.productionUnit.protocoll,
      areaHa: pu.productionUnit.areaHa,
      protectionStructure: pu.productionUnit.protectionStructure,
      fields: pu.fields || [],
      fieldSelection: pu.fields && pu.fields.length > 0 ? pu.fields[0].id : "",
      startDate: pu.productionUnit.startDate
        ? new Date(pu.productionUnit.startDate).toISOString().split("T")[0]
        : "",
      endDate: pu.productionUnit.endDate
        ? new Date(pu.productionUnit.endDate).toISOString().split("T")[0]
        : "",
      // Mantieni i dati completi per i dettagli
      productionUnit: pu,
    }));
  }, [productionUnits]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const { productionUnitApiService } =
        await import("@/api/production-unit");
      await productionUnitApiService.delete(id);
      toast.success("Unità produttiva eliminata con successo");
      refetch();
      setDeletingId(null);
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'eliminazione dell'unità produttiva",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (productionUnit: ProductionUnit) => {
    const pu = productionUnit.productionUnit;
    setEditingId(pu.id);
    setEditFormData({
      name: pu.name,
      cropName: pu.cropName,
      cropType: pu.cropType,
      variety: pu.variety,
      protocoll: pu.protocoll,
      areaHa: pu.areaHa,
      protectionStructure: pu.protectionStructure,
      startDate: pu.startDate,
      floweringDate: pu.floweringDate,
      harvestingDate: pu.harvestingDate,
      endDate: pu.endDate,
      occupazione: pu.occupazione,
      destinazioneDiUso: pu.destinazioneDiUso,
      acquaTotalePeridoL: pu.acquaTotalePeridoL,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setIsSaving(true);
    try {
      const { productionUnitApiService } =
        await import("@/api/production-unit");
      await productionUnitApiService.update(editingId, editFormData);
      toast.success("Unità produttiva aggiornata con successo");
      refetch();
      setEditingId(null);
      setEditFormData({});
    } catch (error) {
      console.error("Errore nell'aggiornamento:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento dell'unità produttiva",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCropSelection = (overrides: Partial<CropSelection>) => {
    setEditFormData((prev) => {
      const normalized: Partial<CropSelection> = {
        species:
          overrides.species !== undefined
            ? String(overrides.species ?? "")
            : undefined,
        cropType:
          overrides.cropType !== undefined
            ? String(overrides.cropType ?? "")
            : undefined,
        code:
          overrides.code !== undefined
            ? String(overrides.code ?? "")
            : undefined,
      };

      if (!cropCatalog) {
        const shouldClear = Object.values(normalized).some(
          (value) => value === "",
        );

        if (shouldClear) {
          return {
            ...prev,
            cropName: "",
            cropType: "",
            variety: "",
          };
        }

        return {
          ...prev,
          ...(normalized.species !== undefined
            ? { cropName: normalized.species }
            : {}),
          ...(normalized.cropType !== undefined
            ? { cropType: normalized.cropType }
            : {}),
          ...(normalized.code !== undefined
            ? { variety: normalized.code }
            : {}),
        };
      }

      const selection = cropCatalog.buildSelection(
        {
          cropName: prev.cropName ?? "",
          cropType: prev.cropType ?? "",
          variety: prev.variety ?? "",
        },
        normalized,
      );

      return {
        ...prev,
        cropName: selection.species,
        cropType: selection.cropType,
        variety: selection.code,
      };
    });
  };

  const handleBulkSave = async (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }) => {
    if (payload.updated.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const { productionUnitApiService } =
        await import("@/api/production-unit");

      // Converti i dati della tabella in formato API
      const productionUnitsToUpdate = payload.updated.map((row) => {
        const id = String(row.id ?? "");
        const updateData: Record<string, unknown> = {
          id,
        };

        // Aggiungi solo i campi che possono essere modificati
        if (row.name !== undefined) updateData.name = String(row.name);
        if (row.cropName !== undefined)
          updateData.cropName = String(row.cropName);
        if (row.cropType !== undefined)
          updateData.cropType = String(row.cropType);
        if (row.variety !== undefined) updateData.variety = String(row.variety);
        if (row.protocoll !== undefined)
          updateData.protocoll = String(row.protocoll);
        if (row.areaHa !== undefined) updateData.areaHa = Number(row.areaHa);
        if (row.protectionStructure !== undefined)
          updateData.protectionStructure = String(row.protectionStructure);
        if (row.startDate !== undefined)
          updateData.startDate = String(row.startDate);
        if (row.endDate !== undefined) updateData.endDate = String(row.endDate);

        return updateData;
      });

      await productionUnitApiService.bulkUpdate({
        productionUnits: productionUnitsToUpdate as Array<{
          id: string;
          name?: string;
          cropName?: string;
          cropType?: string;
          variety?: string;
          protocoll?: string;
          areaHa?: number;
          protectionStructure?: string;
          startDate?: string;
          endDate?: string;
        }>,
      });

      toast.success(
        `${productionUnitsToUpdate.length} unità produttive aggiornate con successo`,
      );
      refetch();
    } catch (error) {
      console.error("Errore nell'aggiornamento bulk:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'aggiornamento delle unità produttive",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSelected = async (
    removed: Array<Record<string, unknown>>,
  ) => {
    if (removed.length === 0) {
      return;
    }

    setIsDeleting(true);
    try {
      const { productionUnitApiService } =
        await import("@/api/production-unit");

      const ids = removed
        .map((row) => {
          const id = row.id;
          return typeof id === "string" ? id : String(id ?? "");
        })
        .filter((id) => id.length > 0);

      if (ids.length === 0) {
        toast.error("Nessun ID valido trovato per l'eliminazione");
        return;
      }

      await productionUnitApiService.bulkDelete({ ids });

      toast.success("Unità produttive eliminate", {
        description: `${ids.length} unità produttiva${
          ids.length === 1 ? "" : "e"
        } eliminata${ids.length === 1 ? "" : "e"} con successo`,
      });
      refetch();
    } catch (error) {
      console.error("Errore nell'eliminazione bulk:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'eliminazione delle unità produttive",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdatePeriod = async (
    id: string,
    startDate: string,
    endDate: string | null,
  ) => {
    try {
      await productionUnitApiService.update(id, {
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : null,
      });
      toast.success("Periodo aggiornato con successo");
      refetch();
    } catch (err) {
      console.error("Errore nell'aggiornamento del periodo:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Errore nell'aggiornamento del periodo",
      );
      throw err;
    }
  };

  const renderDetails = (row: Record<string, unknown>): React.ReactNode => {
    const productionUnit = row.productionUnit as ProductionUnit;
    if (!productionUnit) {
      return <div>Dettagli non disponibili</div>;
    }

    const pu = productionUnit.productionUnit;
    const isEditing = editingId === pu.id;

    return (
      <div className="p-4 space-y-4">
        {/* Header con pulsante edit */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {isEditing
              ? "Modifica Unità Produttiva"
              : "Dettagli Unità Produttiva"}
          </h3>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(productionUnit)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Modifica
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Nome Unità Produttiva */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Nome Unità Produttiva
            </Label>
            {isEditing ? (
              <Input
                value={editFormData.name || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.name}</p>
            )}
          </div>

          {/* Azienda - Non modificabile */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Azienda</Label>
            <p className="text-sm">{productionUnit.companyName}</p>
          </div>

          {/* Coltura */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Coltura</Label>
            {isEditing ? (
              <SearchableSelect
                value={editFormData.cropName ?? ""}
                options={cropCatalog?.getSpeciesOptions() ?? []}
                placeholder="Seleziona coltura"
                searchPlaceholder="Cerca coltura..."
                emptyMessage="Nessuna coltura trovata"
                noneOptionLabel="Nessuna selezione"
                loading={isCatalogLoading}
                loadingMessage="Caricamento varietà..."
                disabled={!cropCatalog}
                onChange={(selected) =>
                  handleEditCropSelection({ species: selected })
                }
                wrapperClassName="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.cropName}</p>
            )}
          </div>

          {/* Tipo Coltura */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Tipo Coltura
            </Label>
            {isEditing ? (
              <SearchableSelect
                value={editFormData.cropType ?? ""}
                options={cropCatalog?.getCropTypeOptions() ?? []}
                placeholder="Seleziona tipo coltura"
                searchPlaceholder="Cerca tipo coltura..."
                emptyMessage="Nessun tipo coltura trovato"
                noneOptionLabel="Nessuna selezione"
                loading={isCatalogLoading}
                loadingMessage="Caricamento varietà..."
                disabled={!cropCatalog}
                onChange={(selected) =>
                  handleEditCropSelection({ cropType: selected })
                }
                wrapperClassName="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.cropType}</p>
            )}
          </div>

          {/* Varietà */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Varietà</Label>
            {isEditing ? (
              <SearchableSelect
                value={editFormData.variety ?? ""}
                options={cropCatalog?.getVarietyOptions() ?? []}
                placeholder="Seleziona varietà"
                searchPlaceholder="Cerca varietà..."
                emptyMessage="Nessuna varietà trovata"
                noneOptionLabel="Nessuna selezione"
                loading={isCatalogLoading}
                loadingMessage="Caricamento varietà..."
                disabled={!cropCatalog}
                onChange={(selected) =>
                  handleEditCropSelection({ code: selected })
                }
                wrapperClassName="mt-1"
              />
            ) : (
              <p className="text-sm">
                {cropCatalog
                  ? cropCatalog.getVarietyLabel(pu.variety)
                  : pu.variety}
              </p>
            )}
          </div>

          {/* Protocollo */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Protocollo
            </Label>
            {isEditing ? (
              <SearchableSelect
                value={editFormData.protocoll ?? ""}
                options={PROTOCOLL_OPTIONS}
                placeholder="Seleziona protocollo"
                searchPlaceholder="Cerca protocollo..."
                emptyMessage="Nessun protocollo trovato"
                noneOptionLabel="Nessuna selezione"
                onChange={(selected) =>
                  setEditFormData({
                    ...editFormData,
                    protocoll: selected,
                  })
                }
                wrapperClassName="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.protocoll || "-"}</p>
            )}
          </div>

          {/* Area Totale */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Area Totale (Ha)
            </Label>
            {isEditing ? (
              <Input
                type="number"
                step="0.01"
                value={editFormData.areaHa || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    areaHa: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.areaHa}</p>
            )}
          </div>

          {/* Struttura Protezione */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Struttura Protezione
            </Label>
            {isEditing ? (
              <Input
                value={editFormData.protectionStructure || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    protectionStructure: e.target.value,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.protectionStructure}</p>
            )}
          </div>

          {/* Data Inizio */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Data Inizio
            </Label>
            {isEditing ? (
              <Input
                type="date"
                value={formatDateForInput(editFormData.startDate || "")}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    startDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{formatDateDDMMYYYY(pu.startDate)}</p>
            )}
          </div>

          {/* Data Fine */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Data Fine
            </Label>
            {isEditing ? (
              <Input
                type="date"
                value={formatDateForInput(editFormData.endDate || "")}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    endDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{formatDateDDMMYYYY(pu.endDate)}</p>
            )}
          </div>

          {/* Occupazione */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Occupazione
            </Label>
            {isEditing ? (
              <Input
                value={editFormData.occupazione || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    occupazione: e.target.value || null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.occupazione || "-"}</p>
            )}
          </div>

          {/* Destinazione d'Uso */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Destinazione d'Uso
            </Label>
            {isEditing ? (
              <Input
                value={editFormData.destinazioneDiUso || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    destinazioneDiUso: e.target.value || null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">{pu.destinazioneDiUso || "-"}</p>
            )}
          </div>

          {/* Acqua Totale Periodo */}
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Acqua Totale Periodo (L)
            </Label>
            {isEditing ? (
              <Input
                type="number"
                value={editFormData.acquaTotalePeridoL || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    acquaTotalePeridoL: parseInt(e.target.value) || null,
                  })
                }
                className="mt-1"
              />
            ) : (
              <p className="text-sm">
                {pu.acquaTotalePeridoL
                  ? pu.acquaTotalePeridoL.toLocaleString("it-IT")
                  : "-"}
              </p>
            )}
          </div>
        </div>

        {/* Sezione Campi Allocati */}
        <FieldsAllocationSection
          productionUnitId={pu.id}
          companyId={productionUnit.companyId}
          startDate={pu.startDate}
          endDate={pu.endDate}
          currentFields={productionUnit.fields || []}
          isEditing={isEditing}
          onSaveSuccess={() => refetch()}
        />

        {/* Sezione Cicli Produttivi */}
        <ProductionUnitCyclesSection productionUnitId={pu.id} />

        {/* Pulsanti azioni */}
        <div className="mt-6 pt-4 border-t flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="default"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="bg-agri-green-500 hover:bg-agri-green-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Salvataggio..." : "Salva"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Annulla
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setDeletingId(pu.id)}
              disabled={isDeleting}
            >
              Elimina Unità Produttiva
            </Button>
          )}
        </div>
      </div>
    );
  };

  const columns = useMemo(
    () => buildProductionUnitColumns(cropCatalog, companyDirectory),
    [cropCatalog, companyDirectory],
  );

  return (
    <Tabs
      value={activeView}
      onValueChange={setActiveView}
      className="flex flex-col h-full"
    >
      <PageHeader title="Unità Produttive" className="hidden md:block">
        <TabsList>
          <TabsTrigger value="table">Tabella</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
      </PageHeader>

      {/* Area contenuto */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 px-6 py-4">
            <Spinner size={20} ariaLabel="Caricamento dati" />
            <span>Caricamento dati…</span>
          </div>
        ) : error ? (
          <div className="px-6 py-8">
            <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium">
                Nessuna unità produttiva disponibile
              </p>
              <p className="text-xs mt-1 text-gray-500">
                Al momento non ci sono unità produttive da visualizzare
              </p>
            </div>
          </div>
        ) : (
          <>
            <TabsContent
              value="table"
              className="flex-1 min-h-0 px-6 pb-6 mt-0"
            >
              <EditableTable
                columns={columns}
                rows={rows}
                isModify={true}
                addButton={false}
                getRowId={(row, index) =>
                  (typeof row.id === "string" && row.id) || index
                }
                onSave={handleBulkSave}
                onDeleteSelected={handleDeleteSelected}
                showDeleteAction={true}
                exportFileName="unitaproduttive"
                detailsRenderer={renderDetails}
                detailsTitle="Dettagli Unità Produttiva"
                className="bg-background"
              >
                <Button
                  data-table-slot="right"
                  variant="ghost"
                  className="order-last gap-2 cursor-pointer text-gray-600 hover:text-gray-600"
                  asChild
                >
                  <Link to="/new-production-unit">
                    <Plus className="w-4 h-4" />
                    Aggiungi
                  </Link>
                </Button>
              </EditableTable>
              {productionUnits.length === 0 && (
                <div className="mt-4 text-center py-8 text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium">
                    Nessuna unità produttiva disponibile
                  </p>
                  <p className="text-xs mt-1 text-gray-500">
                    Al momento non ci sono unità produttive da visualizzare
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="timeline"
              className="flex-1 overflow-auto px-6 pb-6 mt-0"
            >
              <KanbanTimelineView
                productionUnits={productionUnits}
                companyOptions={companyOptions}
                onUpdatePeriod={handleUpdatePeriod}
                onRowClick={setTimelineDetailUnit}
              />
            </TabsContent>
          </>
        )}
      </div>

      {/* Drawer dettagli dalla timeline */}
      <Sheet
        open={timelineDetailUnit !== null}
        onOpenChange={(open) => {
          if (!open) setTimelineDetailUnit(null);
        }}
      >
        <SheetContent
          side="right"
          className="sm:max-w-2xl w-full overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Dettagli Unità Produttiva</SheetTitle>
            <SheetDescription>
              {timelineDetailUnit?.productionUnit.name}
            </SheetDescription>
          </SheetHeader>
          {timelineDetailUnit &&
            renderDetails({ productionUnit: timelineDetailUnit })}
        </SheetContent>
      </Sheet>

      {/* Dialog di conferma eliminazione */}
      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa unità produttiva? Questa
              azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
