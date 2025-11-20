import * as React from "react";
import { useMemo, useState, useEffect } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Ruler,
  Search,
  Trash2,
  Pencil,
  CheckCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

import { calculateCropDates, getBaseFieldIdFromAllocation } from "../utils";
import type {
  CropVariety,
  DateRange,
  FieldWithCompany,
  ProductionUnitInput,
} from "../types";

type SingleProductionUnitFormProps = {
  cropVarieties: CropVariety[];
  isLoadingVarieties: boolean;
  allocatedFields: Map<string, number>;
  allFields: FieldWithCompany[];
  dateRange: DateRange;
  productionUnits: ProductionUnitInput[];
  editingUnitId?: string;
  showList: boolean;
  onSave: (unit: ProductionUnitInput) => void;
  onAddAnother: () => void;
  onNext: () => void;
  onCancel: () => void;
  onEditUnit: (unitId: string) => void;
  onDeleteUnit: (unitId: string) => void;
};

export const SingleProductionUnitForm: React.FC<
  SingleProductionUnitFormProps
> = ({
  cropVarieties,
  isLoadingVarieties,
  allocatedFields,
  allFields,
  dateRange,
  productionUnits,
  editingUnitId,
  showList,
  onSave,
  onAddAnother,
  onNext,
  onCancel,
  onEditUnit,
  onDeleteUnit,
}) => {
  const [formData, setFormData] = useState<ProductionUnitInput>(() => {
    if (editingUnitId) {
      const unitToEdit = productionUnits.find((u) => u.id === editingUnitId);
      if (unitToEdit) {
        // Assicuriamoci che allocations usi la Map aggiornata dallo step 1
        return {
          ...unitToEdit,
          allocations: new Map(allocatedFields),
        };
      }
    }
    return {
      id: `pu-${Date.now()}`,
      name: "",
      cropCode: "",
      allocations: new Map(allocatedFields),
      protectionStructure: "",
      occupazione: "",
      destinazioneDiUso: "",
      acquaTotalePeridoL: 0,
      customSowingDate: null,
      customFloweringDate: null,
      customHarvestingDate: null,
    };
  });

  const [cropSearchQuery, setCropSearchQuery] = useState("");
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(
    !!editingUnitId
  );

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

  const totalAllocatedSAU = useMemo(() => {
    return Array.from(allocatedFields.values()).reduce(
      (sum, area) => sum + area,
      0
    );
  }, [allocatedFields]);

  // Genera automaticamente il nome dell'unità produttiva
  const generateAutoName = useMemo(() => {
    if (!selectedCrop) return "";

    // Ottieni i nomi dei campi allocati
    const fieldNames = Array.from(allocatedFields.keys())
      .map((allocationKey) => {
        const baseFieldId = getBaseFieldIdFromAllocation(allocationKey);
        const field = allFields.find((f) => f.id === baseFieldId);
        return field?.name;
      })
      .filter(Boolean);

    // Limita a massimo 3 campi nel nome per non farlo troppo lungo
    const fieldsText =
      fieldNames.length > 3
        ? `${fieldNames.slice(0, 3).join(", ")} e altri ${
            fieldNames.length - 3
          }`
        : fieldNames.join(", ");

    return `${selectedCrop.species} - ${fieldsText}`;
  }, [selectedCrop, allocatedFields, allFields]);

  // Auto-compila il nome quando viene selezionata la coltura
  useEffect(() => {
    if (selectedCrop && !isNameManuallyEdited && generateAutoName) {
      setFormData((prev) => ({
        ...prev,
        name: generateAutoName,
      }));
    }
  }, [selectedCrop, generateAutoName, isNameManuallyEdited]);

  const handleSave = () => {
    if (!formData.name || !formData.cropCode) {
      toast.error("Compila tutti i campi obbligatori: Nome e Coltura");
      return;
    }

    // Salva l'unità
    onSave(formData);
    toast.success(
      editingUnitId
        ? "Unità produttiva aggiornata con successo!"
        : "Unità produttiva creata con successo!"
    );
  };

  const handleAddAnother = () => {
    // Torna allo step 1 per aggiungere un'altra UP
    onAddAnother();
  };

  const handleProceedToConfirmation = () => {
    // Vai allo step 3 per confermare tutte le UP create
    onNext();
  };

  if (isLoadingVarieties) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={24} ariaLabel="Caricamento varietà" />
        <span className="ml-2">Caricamento varietà...</span>
      </div>
    );
  }

  if (showList) {
    // Visualizzazione lista unità produttive create
    return (
      <div className="space-y-6">
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Unità Produttive create ({productionUnits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {productionUnits.map((unit) => {
                const crop = cropVarieties.find(
                  (v) => v.code === unit.cropCode
                );
                const unitTotalArea = Array.from(
                  unit.allocations.values()
                ).reduce((sum, area) => sum + area, 0);

                return (
                  <AccordionItem
                    key={unit.id}
                    value={unit.id}
                    className="border rounded-lg mb-2 px-4"
                  >
                    <div className="flex items-center justify-between py-4">
                      <AccordionTrigger className="hover:no-underline py-0 flex-1">
                        <div className="flex items-center gap-4 text-left">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {unit.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {crop?.species} • {unitTotalArea.toFixed(2)} Ha
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditUnit(unit.id);
                          }}
                          title="Modifica"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteUnit(unit.id);
                          }}
                          title="Elimina"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-4 border-t mt-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700 block">
                              Coltura:
                            </span>
                            {crop?.species} ({crop?.cropType})
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 block">
                              Varietà:
                            </span>
                            {crop?.code}
                          </div>
                          {unit.protectionStructure && (
                            <div>
                              <span className="font-medium text-gray-700 block">
                                Struttura:
                              </span>
                              {unit.protectionStructure}
                            </div>
                          )}
                          {unit.destinazioneDiUso && (
                            <div>
                              <span className="font-medium text-gray-700 block">
                                Destinazione:
                              </span>
                              {unit.destinazioneDiUso}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 block mb-2">
                            Campi Allocati:
                          </span>
                          <div className="space-y-1">
                            {Array.from(unit.allocations.entries()).map(
                              ([fieldId, area]) => {
                                const baseFieldId =
                                  getBaseFieldIdFromAllocation(fieldId);
                                const field = allFields.find(
                                  (f) => f.id === baseFieldId
                                );
                                return (
                                  <div
                                    key={fieldId}
                                    className="text-sm flex justify-between bg-gray-50 p-2 rounded"
                                  >
                                    <span>{field?.name || "Campo"}</span>
                                    <span className="font-medium">
                                      {area.toFixed(2)} Ha
                                    </span>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {productionUnits.length === 0 && (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                Nessuna unità produttiva presente.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={handleAddAnother} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi un'altra unità produttiva
          </Button>
          <Button
            onClick={handleProceedToConfirmation}
            size="lg"
            disabled={productionUnits.length === 0}
          >
            Avanti - Conferma Unità Produttive
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {editingUnitId
            ? "Modifica Unità Produttiva"
            : "Configura Unità Produttiva"}
        </h2>
        <p className="text-gray-600">
          Completa i dati per l'unità produttiva con i campi selezionati
        </p>
      </div>

      {/* Campi allocati - Readonly */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <MapPin className="h-5 w-5" />
            Campi Selezionati ({allocatedFields.size})
          </CardTitle>
          <p className="text-sm text-blue-700 mt-1">
            Totale superficie allocata: {totalAllocatedSAU.toFixed(2)} Ha
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from(allocatedFields.entries()).map(
              ([allocationKey, areaHa]) => {
                const baseFieldId = getBaseFieldIdFromAllocation(allocationKey);
                const field = allFields.find((f) => f.id === baseFieldId);
                if (!field) return null;

                return (
                  <div
                    key={allocationKey}
                    className="bg-white rounded-lg p-4 border border-blue-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {field.name}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {field.address ?? "N/A"}, {field.city ?? "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Ruler className="h-3 w-3" />
                            Foglio {field.foglio}, Part. {field.particella}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {field.companyName}
                        </p>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        {areaHa.toFixed(2)} Ha
                      </Badge>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form dati unità produttiva */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli Unità Produttiva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prima: Selezione Coltura */}
          <div>
            <label className="text-sm font-medium">Coltura *</label>
            <p className="text-xs text-gray-500 mt-1 mb-2">
              Seleziona prima la coltura per auto-compilare il nome dell'unità
              produttiva
            </p>
            <Select
              value={formData.cropCode}
              onValueChange={(value) => {
                setFormData({ ...formData, cropCode: value });
                setCropSearchQuery("");
                // Se l'utente non ha modificato manualmente il nome, resetta il flag
                // così il nuovo nome auto-generato verrà applicato
                if (!editingUnitId) {
                  setIsNameManuallyEdited(false);
                }
              }}
            >
              <SelectTrigger className="mt-1">
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

          {/* Poi: Nome Unità Produttiva (auto-compilato) */}
          <div>
            <label className="text-sm font-medium">
              Nome Unità Produttiva *
            </label>
            {!isNameManuallyEdited && formData.name && selectedCrop && (
              <p className="text-xs text-green-600 mt-1 mb-1">
                ✓ Nome auto-generato. Puoi modificarlo se necessario.
              </p>
            )}
            <Input
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setIsNameManuallyEdited(true);
              }}
              placeholder="Seleziona prima una coltura..."
              className="mt-1"
              disabled={!selectedCrop}
            />
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
                className="mt-1"
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
                className="mt-1"
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
                className="mt-1"
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
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-4 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Indietro - Modifica Campi
        </Button>
        <Button onClick={handleSave} size="lg">
          {editingUnitId
            ? "Aggiorna Unità Produttiva"
            : "Aggiungi Unità Produttiva"}{" "}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
