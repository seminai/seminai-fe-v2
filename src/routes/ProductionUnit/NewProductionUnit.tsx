import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/organism/Header";
import { useFieldsAvailability } from "@/hooks/useFieldsAvailability";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Search,
  MapPin,
  Ruler,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

// Tipi TypeScript
type CropVariety = {
  code: string;
  species: string;
  cropType: string;
  sowingPeriod: { minDate: string; maxDate: string };
  floweringPeriod: { minDate: string; maxDate: string };
  harvestPeriod: { minDate: string; maxDate: string };
  estimatedYield: { min: number; max: number };
};

// Helper per convertire una data nel formato "gg-mm" in una Date completa
// usando l'anno del periodo di riferimento (startDate)
const parseCropDate = (dateStr: string, referenceYear: number): Date => {
  const [day, month] = dateStr.split("-").map(Number);
  // month è 1-based nel formato, ma Date vuole 0-based
  return new Date(referenceYear, month - 1, day);
};

// Helper per calcolare le date della coltura in base al periodo selezionato
const calculateCropDates = (crop: CropVariety, startDate: Date) => {
  const startYear = startDate.getFullYear();

  // Calcola le date di semina (usa minDate come default)
  const sowingDate = parseCropDate(crop.sowingPeriod.minDate, startYear);

  // Calcola le date di fioritura (usa minDate come default)
  const floweringDate = parseCropDate(crop.floweringPeriod.minDate, startYear);

  // Calcola le date di raccolta (usa minDate come default)
  const harvestingDate = parseCropDate(crop.harvestPeriod.minDate, startYear);

  // Se le date calcolate sono prima della startDate, usa l'anno successivo
  const adjustedSowingDate =
    sowingDate < startDate
      ? parseCropDate(crop.sowingPeriod.minDate, startYear + 1)
      : sowingDate;

  const adjustedFloweringDate =
    floweringDate < adjustedSowingDate
      ? parseCropDate(crop.floweringPeriod.minDate, startYear + 1)
      : floweringDate;

  const adjustedHarvestingDate =
    harvestingDate < adjustedFloweringDate
      ? parseCropDate(crop.harvestPeriod.minDate, startYear + 1)
      : harvestingDate;

  return {
    sowingDate: adjustedSowingDate,
    floweringDate: adjustedFloweringDate,
    harvestingDate: adjustedHarvestingDate,
  };
};

type ProductionUnitInput = {
  id: string;
  name: string;
  cropCode: string;
  allocations: Map<string, number>; // fieldId -> areaHa
  protectionStructure: string;
  occupazione: string;
  destinazioneDiUso: string;
  acquaTotalePeridoL: number;
};

// Funzione helper per ottenere l'inizio e fine anno corrente
const getCurrentYearRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1); // 1 gennaio anno corrente
  const end = new Date(now.getFullYear(), 11, 31); // 31 dicembre anno corrente
  return { start, end };
};

// Hook per caricare le varietà di colture
const useCropVarieties = () => {
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadVarieties = async () => {
      try {
        const response = await fetch("/datasets/varietà/index.json");
        if (!response.ok) {
          throw new Error("Errore nel caricamento delle varietà");
        }
        const data = await response.json();
        setVarieties(data as CropVariety[]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Errore sconosciuto"));
      } finally {
        setIsLoading(false);
      }
    };

    loadVarieties();
  }, []);

  return { varieties, isLoading, error };
};

// Componente Stepper
const Stepper: React.FC<{ currentStep: 1 | 2 | 3 }> = ({ currentStep }) => {
  const steps = [
    {
      number: 1,
      title: "Alloca i campi",
      description: "Seleziona i campi e la superficie da allocare",
    },
    {
      number: 2,
      title: "Abbina la coltura",
      description: "Scegli la varietà da coltivare",
    },
    {
      number: 3,
      title: "Conferma",
      description: "Riepilogo e creazione unità produttiva",
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;

          return (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : isActive
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 bg-white text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive
                        ? "text-blue-600"
                        : isCompleted
                        ? "text-green-600"
                        : "text-gray-500"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-32">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-4 h-0.5 w-16",
                    step.number < currentStep ? "bg-green-500" : "bg-gray-300"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Componente per la gestione delle unità produttive (Passo 2)
const ProductionUnitsManagementStep: React.FC<{
  cropVarieties: CropVariety[];
  isLoadingVarieties: boolean;
  productionUnits: ProductionUnitInput[];
  onProductionUnitsChange: (units: ProductionUnitInput[]) => void;
  allocatedFields: Map<string, number>;
  allFields: Array<{
    id: string;
    name: string;
    companyName: string;
    areaAvailable: number;
    address?: string | null;
    city?: string | null;
  }>;
  onNext: () => void;
  onPrevious: () => void;
}> = ({
  cropVarieties,
  isLoadingVarieties,
  productionUnits,
  onProductionUnitsChange,
  allocatedFields,
  allFields,
  onNext,
  onPrevious,
}) => {
  const [editingUnit, setEditingUnit] = useState<ProductionUnitInput | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);

  const addNewUnit = () => {
    const newUnit: ProductionUnitInput = {
      id: `pu-${Date.now()}`,
      name: "",
      cropCode: "",
      allocations: new Map(),
      protectionStructure: "",
      occupazione: "",
      destinazioneDiUso: "",
      acquaTotalePeridoL: 0,
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
          onSave={saveUnit}
          onCancel={() => {
            setShowForm(false);
            setEditingUnit(null);
          }}
        />
      ) : (
        <>
          {/* Lista unità produttive */}
          <div className="space-y-3">
            {productionUnits.map((unit) => {
              const crop = cropVarieties.find((v) => v.code === unit.cropCode);
              const totalArea = Array.from(unit.allocations.values()).reduce(
                (sum, area) => sum + area,
                0
              );

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
            Aggiungi Unità Produttiva
          </Button>
        </>
      )}

      {/* Navigation buttons */}
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

// Form per creare/modificare un'unità produttiva
const ProductionUnitForm: React.FC<{
  unit: ProductionUnitInput;
  cropVarieties: CropVariety[];
  allocatedFields: Map<string, number>;
  allFields: Array<{
    id: string;
    name: string;
    companyName: string;
    areaAvailable: number;
    address?: string | null;
    city?: string | null;
  }>;
  getTotalAllocatedForField: (fieldId: string) => number;
  onSave: (unit: ProductionUnitInput) => void;
  onCancel: () => void;
}> = ({
  unit,
  cropVarieties,
  allocatedFields,
  allFields,
  getTotalAllocatedForField,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ProductionUnitInput>(unit);
  const selectedCrop = cropVarieties.find((v) => v.code === formData.cropCode);

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

  const updateFieldAllocation = (fieldId: string, area: number) => {
    const newAllocations = new Map(formData.allocations);
    if (area <= 0) {
      newAllocations.delete(fieldId);
    } else {
      newAllocations.set(fieldId, area);
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
          {/* Nome */}
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

          {/* Coltura */}
          <div>
            <label className="text-sm font-medium">Coltura *</label>
            <Select
              value={formData.cropCode}
              onValueChange={(value) =>
                setFormData({ ...formData, cropCode: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona una varietà..." />
              </SelectTrigger>
              <SelectContent>
                {cropVarieties.slice(0, 10).map((variety) => (
                  <SelectItem key={variety.code} value={variety.code}>
                    {variety.species} - {variety.cropType}
                  </SelectItem>
                ))}
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

          <div className="grid grid-cols-2 gap-4">
            {/* Struttura Protezione */}
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

            {/* Occupazione */}
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

            {/* Destinazione d'uso */}
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

            {/* Acqua totale */}
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

      {/* Allocazione campi */}
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
              const availableArea = maxArea - alreadyAllocatedByOthers;

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
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              min="0"
                              max={availableArea}
                              step="0.1"
                              value={allocatedArea}
                              onChange={(e) =>
                                updateFieldAllocation(
                                  fieldId,
                                  Math.min(
                                    parseFloat(e.target.value) || 0,
                                    availableArea
                                  )
                                )
                              }
                              className="w-32"
                            />
                            <span className="text-sm text-gray-600">
                              / {availableArea.toFixed(2)} Ha disponibili
                            </span>
                          </div>
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

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button onClick={handleSave}>Salva Unità Produttiva</Button>
      </div>
    </div>
  );
};

// Componente di conferma (Passo 3)
const ConfirmationStep: React.FC<{
  productionUnits: ProductionUnitInput[];
  cropVarieties: CropVariety[];
  allFields: Array<{
    id: string;
    name: string;
    companyName: string;
    areaAvailable: number;
    address?: string | null;
    city?: string | null;
  }>;
  dateRange: { start: Date; end: Date };
  onPrevious: () => void;
  onConfirm: () => void;
  isCreating: boolean;
}> = ({
  productionUnits,
  cropVarieties,
  allFields,
  dateRange,
  onPrevious,
  onConfirm,
  isCreating,
}) => {
  const totalSAU = productionUnits.reduce((total, unit) => {
    return (
      total +
      Array.from(unit.allocations.values()).reduce((sum, area) => sum + area, 0)
    );
  }, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Riepilogo Unità Produttive
        </h2>
        <p className="text-gray-600">
          Verifica i dati e conferma la creazione di {productionUnits.length}{" "}
          unità {productionUnits.length === 1 ? "produttiva" : "produttive"}
        </p>
      </div>

      {/* Riepilogo generale */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Informazioni Generali</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">
                Unità produttive:
              </span>
              <p className="text-gray-900 text-lg font-semibold">
                {productionUnits.length}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">SAU Totale:</span>
              <p className="text-gray-900 text-lg font-semibold">
                {totalSAU.toFixed(2)} Ha
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Data inizio:</span>
              <p className="text-gray-900">
                {format(dateRange.start, "dd/MM/yyyy", { locale: it })}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Data fine:</span>
              <p className="text-gray-900">
                {format(dateRange.end, "dd/MM/yyyy", { locale: it })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dettaglio unità produttive */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Dettaglio Unità Produttive
        </h3>
        {productionUnits.map((unit, index) => {
          const crop = cropVarieties.find((v) => v.code === unit.cropCode);
          const unitTotalArea = Array.from(unit.allocations.values()).reduce(
            (sum, area) => sum + area,
            0
          );

          // Calcola le date della coltura per mostrare nel riepilogo
          const cropDates = crop
            ? calculateCropDates(crop, dateRange.start)
            : null;

          return (
            <Card key={unit.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Unità {index + 1}
                    </Badge>
                    <CardTitle className="text-xl">{unit.name}</CardTitle>
                    <p className="text-gray-600 mt-1">
                      {crop?.species} - {crop?.cropType}
                    </p>
                  </div>
                  <Badge className="bg-green-600">
                    {unitTotalArea.toFixed(2)} Ha
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info coltura */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3">
                    Informazioni Coltura
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Codice:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {crop?.code}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Resa stimata:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {crop?.estimatedYield.min}-{crop?.estimatedYield.max}{" "}
                        kg/ha
                      </span>
                    </div>
                  </div>

                  {/* Date della coltura */}
                  {cropDates && (
                    <div className="mt-3 pt-3 border-t border-blue-300">
                      <h5 className="text-xs font-medium text-blue-800 mb-2">
                        Calendario Colturale
                      </h5>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white/50 p-2 rounded">
                          <span className="text-gray-600 block">Semina:</span>
                          <span className="font-medium text-gray-900">
                            {format(cropDates.sowingDate, "dd/MM/yyyy", {
                              locale: it,
                            })}
                          </span>
                        </div>
                        <div className="bg-white/50 p-2 rounded">
                          <span className="text-gray-600 block">
                            Fioritura:
                          </span>
                          <span className="font-medium text-gray-900">
                            {format(cropDates.floweringDate, "dd/MM/yyyy", {
                              locale: it,
                            })}
                          </span>
                        </div>
                        <div className="bg-white/50 p-2 rounded">
                          <span className="text-gray-600 block">Raccolta:</span>
                          <span className="font-medium text-gray-900">
                            {format(cropDates.harvestingDate, "dd/MM/yyyy", {
                              locale: it,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dettagli */}
                {(unit.protectionStructure ||
                  unit.occupazione ||
                  unit.destinazioneDiUso ||
                  unit.acquaTotalePeridoL > 0) && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {unit.protectionStructure && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Struttura:
                        </span>
                        <p>{unit.protectionStructure}</p>
                      </div>
                    )}
                    {unit.occupazione && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Occupazione:
                        </span>
                        <p>{unit.occupazione}</p>
                      </div>
                    )}
                    {unit.destinazioneDiUso && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Destinazione:
                        </span>
                        <p>{unit.destinazioneDiUso}</p>
                      </div>
                    )}
                    {unit.acquaTotalePeridoL > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Acqua:
                        </span>
                        <p>{unit.acquaTotalePeridoL.toLocaleString()} L</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Campi allocati */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Campi Allocati ({unit.allocations.size})
                  </h4>
                  <div className="space-y-2">
                    {Array.from(unit.allocations.entries()).map(
                      ([fieldId, area]) => {
                        const field = allFields.find((f) => f.id === fieldId);
                        if (!field) return null;
                        return (
                          <div
                            key={fieldId}
                            className="flex items-center justify-between p-2 bg-white rounded border"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {field.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {field.companyName}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {area.toFixed(2)} Ha
                            </Badge>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between gap-4 mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isCreating}
          className="min-w-32"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Indietro - Modifica Unità Produttive
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isCreating}
          className="min-w-48 bg-green-600 hover:bg-green-700"
        >
          {isCreating ? (
            <>
              <Spinner
                size={16}
                ariaLabel="Creazione in corso"
                className="mr-2"
              />
              Creazione in corso...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Crea {productionUnits.length} Unità{" "}
              {productionUnits.length === 1 ? "Produttiva" : "Produttive"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default function NewProductionUnit(): React.ReactElement {
  const [searchValue, setSearchValue] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  // Map: fieldId -> allocatedArea (in ettari)
  const [allocatedFields, setAllocatedFields] = useState<Map<string, number>>(
    new Map()
  );

  // Range di date per il calendario (default: anno corrente)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(
    getCurrentYearRange()
  );

  // Stepper state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Production units management
  const [productionUnits, setProductionUnits] = useState<ProductionUnitInput[]>(
    []
  );
  const [isCreating, setIsCreating] = useState(false);

  // Load crop varieties
  const { varieties: cropVarieties, isLoading: isLoadingVarieties } =
    useCropVarieties();

  const { companies, isLoading, isError, error } = useFieldsAvailability(
    dateRange.start.toISOString().split("T")[0],
    dateRange.end.toISOString().split("T")[0]
  );

  // Tutti i campi disponibili (flattening da tutte le aziende)
  const allFields = useMemo(() => {
    return companies.flatMap((company) =>
      company.fields.map((field) => ({
        ...field,
        companyName: company.companyName,
        companyId: company.companyId,
      }))
    );
  }, [companies]);

  // Campi filtrati per azienda
  const fieldsFilteredByCompany = useMemo(() => {
    if (selectedCompanyId === "all") return allFields;
    return allFields.filter((field) => field.companyId === selectedCompanyId);
  }, [allFields, selectedCompanyId]);

  // Campi filtrati per ricerca
  const filteredFields = useMemo(() => {
    if (!searchValue.trim()) return fieldsFilteredByCompany;
    const searchLower = searchValue.toLowerCase();
    return fieldsFilteredByCompany.filter(
      (field) =>
        field.name.toLowerCase().includes(searchLower) ||
        field.address.toLowerCase().includes(searchLower) ||
        field.city?.toLowerCase().includes(searchLower) ||
        field.companyName.toLowerCase().includes(searchLower)
    );
  }, [fieldsFilteredByCompany, searchValue]);

  // Calcola il totale SAU allocato
  const totalAllocatedSAU = useMemo(() => {
    return Array.from(allocatedFields.values()).reduce(
      (total, allocatedArea) => {
        return total + allocatedArea;
      },
      0
    );
  }, [allocatedFields]);

  // Gestione allocazione superficie per un campo
  const updateFieldAllocation = useCallback(
    (fieldId: string, allocatedArea: number) => {
      setAllocatedFields((prev) => {
        const newMap = new Map(prev);
        if (allocatedArea <= 0) {
          newMap.delete(fieldId);
          // Rimuovi questo campo da tutte le unità produttive che lo usano
          setProductionUnits((units) =>
            units.map((unit) => {
              const newAllocations = new Map(unit.allocations);
              newAllocations.delete(fieldId);
              return { ...unit, allocations: newAllocations };
            })
          );
        } else {
          newMap.set(fieldId, allocatedArea);
        }
        return newMap;
      });
    },
    []
  );

  // Rimozione allocazione per un campo
  const removeFieldAllocation = useCallback((fieldId: string) => {
    setAllocatedFields((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fieldId);
      return newMap;
    });
    // Rimuovi questo campo da tutte le unità produttive che lo usano
    setProductionUnits((units) =>
      units.map((unit) => {
        const newAllocations = new Map(unit.allocations);
        newAllocations.delete(fieldId);
        return { ...unit, allocations: newAllocations };
      })
    );
  }, []);

  // Allocazione massima per un campo
  const allocateMaxForField = useCallback(
    (fieldId: string) => {
      const field = allFields.find((f) => f.id === fieldId);
      if (field) {
        updateFieldAllocation(fieldId, field.areaAvailable);
      }
    },
    [allFields, updateFieldAllocation]
  );

  // Verifica se un campo ha allocazione
  const isFieldAllocated = useCallback(
    (fieldId: string) => {
      return allocatedFields.has(fieldId);
    },
    [allocatedFields]
  );

  // Ottieni l'area allocata per un campo
  const getAllocatedArea = useCallback(
    (fieldId: string) => {
      return allocatedFields.get(fieldId) || 0;
    },
    [allocatedFields]
  );

  // Handler per la creazione delle unità produttive
  const handleCreateProductionUnits = async () => {
    setIsCreating(true);
    try {
      const { productionUnitApiService } = await import(
        "@/api/production-unit"
      );

      // Preparazione dei dati per la chiamata API
      const request = {
        productionUnits: productionUnits.map((unit) => {
          const crop = cropVarieties.find((v) => v.code === unit.cropCode);
          if (!crop) {
            throw new Error(
              `Coltura non trovata per il codice: ${unit.cropCode}`
            );
          }

          // Trova il companyId dal primo campo allocato
          // (assumiamo che tutti i campi di un'unità produttiva appartengano alla stessa azienda)
          const firstFieldId = Array.from(unit.allocations.keys())[0];
          const field = allFields.find((f) => f.id === firstFieldId);

          if (!field) {
            throw new Error(
              `Campo non trovato per l'unità produttiva: ${unit.name}`
            );
          }

          // Il companyId è nella proprietà companyId del field (aggiunto nel useMemo di allFields)
          const fieldWithCompany = field as typeof field & {
            companyId: string;
          };
          const companyId = fieldWithCompany.companyId;

          if (!companyId) {
            throw new Error(
              `Company ID non trovato per il campo: ${field.name}. Verifica che i dati dei campi includano il companyId.`
            );
          }

          // Calcola le date della coltura in base al periodo selezionato
          const cropDates = calculateCropDates(crop, dateRange.start);

          return {
            name: unit.name,
            companyId: companyId,
            cropName: crop.species,
            cropType: crop.cropType,
            variety: crop.code,
            protocoll: "", // TODO: aggiungere se necessario
            allocations: Array.from(unit.allocations.entries()).map(
              ([fieldId, areaHa]) => ({
                fieldId,
                areaHa,
              })
            ),
            protectionStructure: unit.protectionStructure || "",
            startDate: cropDates.sowingDate.toISOString(),
            floweringDate: cropDates.floweringDate.toISOString(),
            harvestingDate: cropDates.harvestingDate.toISOString(),
            endDate: dateRange.end.toISOString(),
            occupazione: unit.occupazione || null,
            destinazioneDiUso: unit.destinazioneDiUso || null,
            acquaTotalePeridoL: unit.acquaTotalePeridoL || null,
          };
        }),
      };

      await productionUnitApiService.bulkCreate(request);

      toast.success(
        `${productionUnits.length} unità ${
          productionUnits.length === 1
            ? "produttiva creata"
            : "produttive create"
        } con successo!`
      );

      // Redirect to production units list
      window.location.href = "/production-unit";
    } catch (error) {
      console.error("Errore nella creazione delle unità produttive:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nella creazione delle unità produttive"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Nuova Unità Produttiva"
        searchPlaceholder="Cerca per nome campo, indirizzo, città o azienda..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        totalItems={filteredFields.length}
        filteredItems={filteredFields.length}
        rightElement={
          <div className="flex items-center gap-4">
            {/* Selettore range date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.start ? (
                    dateRange.end ? (
                      <>
                        {format(dateRange.start, "dd/MM/yyyy", { locale: it })}{" "}
                        - {format(dateRange.end, "dd/MM/yyyy", { locale: it })}
                      </>
                    ) : (
                      format(dateRange.start, "dd/MM/yyyy", { locale: it })
                    )
                  ) : (
                    <span>Seleziona periodo</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.start}
                  selected={{
                    from: dateRange?.start,
                    to: dateRange?.end,
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ start: range.from, end: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Filtro azienda */}
            <Select
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tutte le aziende" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le aziende</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.companyId} value={company.companyId}>
                    {company.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-6 pb-6">
        <Stepper currentStep={currentStep} />

        {currentStep === 1 && (
          <>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size={20} ariaLabel="Caricamento campi" />
                <span>Caricamento campi disponibili…</span>
              </div>
            ) : isError ? (
              <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium">
                  Errore nel caricamento dei campi
                </p>
                <p className="text-xs mt-1">
                  {error instanceof Error
                    ? error.message
                    : "Errore sconosciuto"}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info banner quando ci sono unità produttive configurate */}
                {productionUnits.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                          Hai già configurato {productionUnits.length} unità{" "}
                          {productionUnits.length === 1
                            ? "produttiva"
                            : "produttive"}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Se rimuovi o modifichi l'allocazione di un campo,
                          verrà automaticamente rimosso dalle unità produttive
                          che lo utilizzano.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Header con totale SAU selezionato */}
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        SAU Totale Allocata
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {totalAllocatedSAU.toFixed(2)} Ha
                      </p>
                    </div>
                  </div>

                  {allocatedFields.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllocatedFields(new Map())}
                      className="ml-4"
                    >
                      Rimuovi tutte le allocazioni
                    </Button>
                  )}
                </div>

                {/* Lista campi */}
                {filteredFields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Nessun campo trovato
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Prova a modificare i filtri di ricerca o il periodo
                      selezionato.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFields.map((field) => {
                      const isAllocated = isFieldAllocated(field.id);
                      const allocatedArea = getAllocatedArea(field.id);
                      const remainingArea = field.areaAvailable - allocatedArea;

                      return (
                        <Card
                          key={field.id}
                          className={cn(
                            "transition-all hover:shadow-md",
                            isAllocated && "ring-2 ring-green-500 bg-green-50"
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">
                                  {field.name}
                                </CardTitle>
                                <p className="text-sm text-gray-600 mt-1">
                                  {field.companyName}
                                </p>
                              </div>
                              {isAllocated && (
                                <Badge
                                  variant="default"
                                  className="bg-green-600"
                                >
                                  Allocato
                                </Badge>
                              )}
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-3">
                            {/* Informazioni principali */}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {field.address}, {field.city}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Ruler className="h-4 w-4" />
                              <span>
                                Foglio {field.foglio}, Part. {field.particella}
                              </span>
                            </div>

                            {/* Input per allocazione superficie */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Superficie da allocare (Ha)
                              </label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={field.areaAvailable}
                                  step="0.1"
                                  value={allocatedArea || ""}
                                  onChange={(e) => {
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    updateFieldAllocation(
                                      field.id,
                                      Math.min(value, field.areaAvailable)
                                    );
                                  }}
                                  placeholder="0.00"
                                  className="text-right"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => allocateMaxForField(field.id)}
                                  disabled={
                                    allocatedArea >= field.areaAvailable
                                  }
                                >
                                  Max
                                </Button>
                              </div>
                              {allocatedArea > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeFieldAllocation(field.id)
                                  }
                                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Rimuovi allocazione
                                </Button>
                              )}
                            </div>

                            {/* Badge con stato disponibilità */}
                            <div className="flex items-center justify-between">
                              <Badge
                                variant={
                                  remainingArea > 0 ? "secondary" : "outline"
                                }
                                className={
                                  remainingArea > 0
                                    ? "bg-green-100 text-green-800"
                                    : ""
                                }
                              >
                                Disponibili ancora {remainingArea.toFixed(2)} Ha
                              </Badge>

                              {field.areaOccupied > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-orange-600 border-orange-200"
                                >
                                  {field.areaOccupied.toFixed(2)} Ha occupati
                                </Badge>
                              )}
                            </div>

                            {/* Tipo suolo e uso */}
                            <div className="flex gap-2 text-xs">
                              {field.soilType && (
                                <Badge variant="outline">
                                  {field.soilType}
                                </Badge>
                              )}
                              {field.uso && (
                                <Badge variant="outline">{field.uso}</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Navigation buttons for step 1 */}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
                  <Button
                    onClick={() => {
                      // Pulisci le allocazioni nelle unità produttive per i campi non più allocati
                      setProductionUnits((units) =>
                        units.map((unit) => {
                          const newAllocations = new Map(unit.allocations);
                          // Rimuovi campi che non sono più allocati globalmente
                          Array.from(newAllocations.keys()).forEach(
                            (fieldId) => {
                              if (!allocatedFields.has(fieldId)) {
                                newAllocations.delete(fieldId);
                              }
                            }
                          );
                          return { ...unit, allocations: newAllocations };
                        })
                      );
                      setCurrentStep(2);
                    }}
                    disabled={totalAllocatedSAU === 0}
                    className="min-w-32"
                  >
                    Avanti
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {currentStep === 2 && (
          <ProductionUnitsManagementStep
            cropVarieties={cropVarieties}
            isLoadingVarieties={isLoadingVarieties}
            productionUnits={productionUnits}
            onProductionUnitsChange={setProductionUnits}
            allocatedFields={allocatedFields}
            allFields={allFields}
            onNext={() => setCurrentStep(3)}
            onPrevious={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <ConfirmationStep
            productionUnits={productionUnits}
            cropVarieties={cropVarieties}
            allFields={allFields}
            dateRange={dateRange}
            onPrevious={() => setCurrentStep(2)}
            onConfirm={handleCreateProductionUnits}
            isCreating={isCreating}
          />
        )}
      </div>
    </div>
  );
}
