import * as React from "react";
import { useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

import { calculateCropDates } from "../../utils";
import type {
  CropVariety,
  DateRange,
  FieldWithCompany,
  ProductionUnitInput,
} from "../../types";

type ProductionUnitsManagementStepProps = {
  cropVarieties: CropVariety[];
  isLoadingVarieties: boolean;
  productionUnits: ProductionUnitInput[];
  onProductionUnitsChange: (units: ProductionUnitInput[]) => void;
  allocatedFields: Map<string, number>;
  allFields: FieldWithCompany[];
  dateRange: DateRange;
  onNext: () => void;
  onPrevious: () => void;
};

const ProductionUnitsManagementStep: React.FC<
  ProductionUnitsManagementStepProps
> = ({
  cropVarieties,
  isLoadingVarieties,
  productionUnits,
  onProductionUnitsChange,
  allocatedFields,
  allFields,
  dateRange,
  onNext,
  onPrevious,
}) => {
  const [editingUnit, setEditingUnit] = useState<ProductionUnitInput | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);

  const unitIssuesMap = useMemo(() => {
    const issues = new Map<string, string[]>();
    productionUnits.forEach((unit) => {
      const unitIssues: string[] = [];
      if (!unit.name?.trim()) {
        unitIssues.push("Nome dell'unità mancante");
      }
      if (!unit.cropCode?.trim()) {
        unitIssues.push("Coltura non selezionata");
      }
      if (unit.allocations.size === 0) {
        unitIssues.push("Nessun campo allocato");
      }
      if (unitIssues.length > 0) {
        issues.set(unit.id, unitIssues);
      }
    });
    return issues;
  }, [productionUnits]);

  const addNewUnit = () => {
    const newUnit: ProductionUnitInput = {
      id: `pu-${Date.now()}`,
      name: "",
      cropCode: "",
      totalAreaHa: null,
      allocations: new Map(),
      protectionStructure: "",
      occupazione: "",
      destinazioneDiUso: "",
      acquaTotalePeridoL: 0,
      customSowingDate: null,
      customFloweringDate: null,
      customHarvestingDate: null,
    };
    setEditingUnit(newUnit);
    setShowForm(true);
  };

  const saveUnit = (unit: ProductionUnitInput) => {
    const existingIndex = productionUnits.findIndex((u) => u.id === unit.id);
    if (existingIndex >= 0) {
      const updated = [...productionUnits];
      updated[existingIndex] = unit;
      onProductionUnitsChange(updated);
    } else {
      onProductionUnitsChange([...productionUnits, unit]);
    }
    setShowForm(false);
    setEditingUnit(null);
  };

  const deleteUnit = (id: string) => {
    onProductionUnitsChange(productionUnits.filter((u) => u.id !== id));
  };

  const getTotalAllocatedForField = (fieldId: string): number => {
    return productionUnits.reduce((total, unit) => {
      return total + (unit.allocations.get(fieldId) || 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Configura le Unità Produttive
        </h2>
        <p className="text-gray-600">
          Crea una o più unità produttive con le relative colture
        </p>
      </div>

      {isLoadingVarieties ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size={24} ariaLabel="Caricamento varietà" />
          <span className="ml-2">Caricamento varietà...</span>
        </div>
      ) : showForm ? (
        <ProductionUnitForm
          unit={editingUnit!}
          cropVarieties={cropVarieties}
          allocatedFields={allocatedFields}
          allFields={allFields}
          getTotalAllocatedForField={getTotalAllocatedForField}
          dateRange={dateRange}
          onSave={saveUnit}
          onCancel={() => {
            setShowForm(false);
            setEditingUnit(null);
          }}
        />
      ) : (
        <>
          <div className="space-y-3">
            {productionUnits.map((unit) => {
              const crop = cropVarieties.find((v) => v.code === unit.cropCode);
              const totalArea =
                unit.totalAreaHa ??
                Array.from(unit.allocations.values()).reduce(
                  (sum, area) => sum + area,
                  0
                );
              const issues = unitIssuesMap.get(unit.id) ?? [];

              return (
                <Card key={unit.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{unit.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {crop?.species} - {crop?.cropType}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingUnit(unit);
                            setShowForm(true);
                          }}
                        >
                          Modifica
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUnit(unit.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {issues.length > 0 && (
                      <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                        <p className="font-semibold text-sm mb-1">
                          Completa questi campi:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">
                          SAU Totale:
                        </span>
                        <p>{totalArea.toFixed(2)} Ha</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Campi allocati:
                        </span>
                        <p>{unit.allocations.size}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Struttura:
                        </span>
                        <p>{unit.protectionStructure || "-"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Destinazione:
                        </span>
                        <p>{unit.destinazioneDiUso || "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {productionUnits.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600">
                  Nessuna unità produttiva configurata
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Clicca su "Aggiungi Unità Produttiva" per iniziare
                </p>
              </div>
            )}
          </div>

          <Button onClick={addNewUnit} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi
          </Button>
        </>
      )}

      {!showForm && (
        <div className="flex justify-between gap-4 mt-8 pt-6 border-t">
          <Button variant="outline" onClick={onPrevious} className="min-w-32">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Indietro - Modifica Allocazione Campi
          </Button>
          <Button
            onClick={onNext}
            disabled={productionUnits.length === 0}
            className="min-w-32"
          >
            Avanti
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

type ProductionUnitFormProps = {
  unit: ProductionUnitInput;
  cropVarieties: CropVariety[];
  allocatedFields: Map<string, number>;
  allFields: FieldWithCompany[];
  getTotalAllocatedForField: (fieldId: string) => number;
  dateRange: DateRange;
  onSave: (unit: ProductionUnitInput) => void;
  onCancel: () => void;
};

const ProductionUnitForm: React.FC<ProductionUnitFormProps> = ({
  unit,
  cropVarieties,
  allocatedFields,
  allFields,
  getTotalAllocatedForField,
  dateRange,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ProductionUnitInput>(unit);
  const [cropSearchQuery, setCropSearchQuery] = useState("");
  const selectedCrop = cropVarieties.find((v) => v.code === formData.cropCode);

  const filteredCropVarieties = useMemo(() => {
    if (!cropSearchQuery.trim()) return cropVarieties;
    const query = cropSearchQuery.toLowerCase();
    return cropVarieties.filter(
      (variety) =>
        variety.species.toLowerCase().includes(query) ||
        variety.cropType.toLowerCase().includes(query) ||
        variety.code.toLowerCase().includes(query)
    );
  }, [cropVarieties, cropSearchQuery]);

  const defaultCropDates = selectedCrop
    ? calculateCropDates(selectedCrop, dateRange.start)
    : null;

  const effectiveSowingDate =
    formData.customSowingDate || defaultCropDates?.sowingDate;
  const effectiveFloweringDate =
    formData.customFloweringDate || defaultCropDates?.floweringDate;
  const effectiveHarvestingDate =
    formData.customHarvestingDate || defaultCropDates?.harvestingDate;

  const handleSave = () => {
    if (
      !formData.name ||
      !formData.cropCode ||
      formData.allocations.size === 0
    ) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    onSave(formData);
  };

  const toggleFieldAllocation = (fieldId: string, maxArea: number) => {
    const newAllocations = new Map(formData.allocations);
    if (newAllocations.has(fieldId)) {
      newAllocations.delete(fieldId);
    } else {
      newAllocations.set(fieldId, maxArea);
    }
    setFormData({ ...formData, allocations: newAllocations });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dettagli Unità Produttiva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Nome Unità Produttiva *
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="es. Unità Produttiva Nord"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Coltura *</label>
            <Select
              value={formData.cropCode}
              onValueChange={(value) => {
                setFormData({ ...formData, cropCode: value });
                setCropSearchQuery("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona una varietà..." />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                <div className="sticky top-0 z-10 bg-white border-b p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cerca coltura..."
                      value={cropSearchQuery}
                      onChange={(e) => setCropSearchQuery(e.target.value)}
                      className="pl-8"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  {filteredCropVarieties.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Nessuna coltura trovata
                    </div>
                  ) : (
                    filteredCropVarieties.map((variety) => (
                      <SelectItem key={variety.code} value={variety.code}>
                        <div className="flex flex-col">
                          <span className="font-medium">{variety.species}</span>
                          <span className="text-xs text-gray-500">
                            {variety.cropType} • {variety.code}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </div>

                {cropSearchQuery && (
                  <div className="sticky bottom-0 bg-gray-50 border-t p-2 text-xs text-gray-600 text-center">
                    {filteredCropVarieties.length} colture trovate su{" "}
                    {cropVarieties.length}
                  </div>
                )}
              </SelectContent>
            </Select>
            {selectedCrop && (
              <div className="mt-2 p-3 bg-blue-50 rounded text-sm">
                <p className="font-medium text-blue-900">
                  {selectedCrop.species}
                </p>
                <p className="text-gray-600 mt-1">
                  Resa stimata: {selectedCrop.estimatedYield.min} -{" "}
                  {selectedCrop.estimatedYield.max} kg/ha
                </p>
              </div>
            )}
          </div>

          {selectedCrop && defaultCropDates && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">
                Calendario Colturale
                <span className="text-xs text-gray-500 ml-2">
                  (Date calcolate dalla coltura - modificabili)
                </span>
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Data Semina</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !effectiveSowingDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {effectiveSowingDate
                          ? format(effectiveSowingDate, "dd/MM/yyyy", {
                              locale: it,
                            })
                          : "Seleziona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={effectiveSowingDate}
                        onSelect={(date) =>
                          setFormData({
                            ...formData,
                            customSowingDate: date || null,
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {!formData.customSowingDate && defaultCropDates && (
                    <p className="text-xs text-gray-500 mt-1">
                      Default: {selectedCrop.sowingPeriod.minDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Data Fioritura</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !effectiveFloweringDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {effectiveFloweringDate
                          ? format(effectiveFloweringDate, "dd/MM/yyyy", {
                              locale: it,
                            })
                          : "Seleziona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={effectiveFloweringDate}
                        onSelect={(date) =>
                          setFormData({
                            ...formData,
                            customFloweringDate: date || null,
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {!formData.customFloweringDate && defaultCropDates && (
                    <p className="text-xs text-gray-500 mt-1">
                      Default: {selectedCrop.floweringPeriod.minDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Data Raccolta</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !effectiveHarvestingDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {effectiveHarvestingDate
                          ? format(effectiveHarvestingDate, "dd/MM/yyyy", {
                              locale: it,
                            })
                          : "Seleziona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={effectiveHarvestingDate}
                        onSelect={(date) =>
                          setFormData({
                            ...formData,
                            customHarvestingDate: date || null,
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {!formData.customHarvestingDate && defaultCropDates && (
                    <p className="text-xs text-gray-500 mt-1">
                      Default: {selectedCrop.harvestPeriod.minDate}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">
                Struttura Protezione
              </label>
              <Input
                value={formData.protectionStructure}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    protectionStructure: e.target.value,
                  })
                }
                placeholder="es. Serra, Tunnel, Campo aperto"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Occupazione</label>
              <Input
                value={formData.occupazione}
                onChange={(e) =>
                  setFormData({ ...formData, occupazione: e.target.value })
                }
                placeholder="es. Principale, Secondaria"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Destinazione d'Uso</label>
              <Input
                value={formData.destinazioneDiUso}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    destinazioneDiUso: e.target.value,
                  })
                }
                placeholder="es. Consumo fresco, Industria"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Acqua Totale (L)</label>
              <Input
                type="number"
                value={formData.acquaTotalePeridoL || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    acquaTotalePeridoL: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="es. 50000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allocazione Campi *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from(allocatedFields.entries()).map(([fieldId, maxArea]) => {
              const field = allFields.find((f) => f.id === fieldId);
              if (!field) return null;

              const isAllocated = formData.allocations.has(fieldId);
              const allocatedArea = formData.allocations.get(fieldId) || 0;
              const alreadyAllocatedByOthers =
                getTotalAllocatedForField(fieldId) -
                (isAllocated ? allocatedArea : 0);
              const availableArea = Math.max(
                maxArea - alreadyAllocatedByOthers,
                0
              );

              return (
                <Card
                  key={fieldId}
                  className={cn(
                    "cursor-pointer transition-all",
                    isAllocated && "ring-2 ring-green-500 bg-green-50"
                  )}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isAllocated}
                        onCheckedChange={() =>
                          toggleFieldAllocation(
                            fieldId,
                            Math.min(availableArea, maxArea)
                          )
                        }
                      />
                      <div className="flex-1">
                        <p className="font-medium">{field.name}</p>
                        <p className="text-sm text-gray-600">
                          {field.companyName}
                        </p>
                        {isAllocated && (
                          <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-900">
                            Area assegnata a questa unità:{" "}
                            <span className="font-semibold">
                              {allocatedArea.toFixed(2)} Ha
                            </span>
                          </div>
                        )}
                        {!isAllocated && (
                          <p className="text-xs text-gray-500 mt-2">
                            Disponibili {availableArea.toFixed(2)} Ha
                          </p>
                        )}
                        {alreadyAllocatedByOthers > 0 && (
                          <p className="text-xs text-orange-600 mt-1">
                            {alreadyAllocatedByOthers.toFixed(2)} Ha già
                            allocati ad altre unità
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button onClick={handleSave}>Salva</Button>
      </div>
    </div>
  );
};

export { ProductionUnitsManagementStep };
