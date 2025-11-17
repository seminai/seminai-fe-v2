import * as React from "react";
import { useState, useMemo, useCallback } from "react";

import { Calendar } from "@/components/ui/calendar";
import { PageHeader } from "@/components/organism/Header";
import { ProductionUnitCsvImporter } from "@/components/organism/ProductionUnitCsvImporter";
import { useFieldsAvailability } from "@/hooks/useFieldsAvailability";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import {
  CalendarIcon,
  CheckCircle,
  ChevronRight,
  MapPin,
  Ruler,
  Search,
  SplitSquareVertical,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

import type { ParsedBulkImport } from "@/utils/csvProductionUnitParser";

import { Stepper } from "./components/Stepper";
import { ProductionUnitsManagementStep } from "./components/ProductionUnitsManagementStep";
import { ImportedDataConfirmationStep } from "./components/ImportedDataConfirmationStep";
import { ConfirmationStep } from "./components/ConfirmationStep";
import { useCropVarieties } from "./hooks/useCropVarieties";
import {
  buildSplitAllocationKey,
  calculateCropDates,
  getBaseFieldIdFromAllocation,
  getCurrentYearRange,
  getSplitDisplayLabel,
  getSplitIndexFromAllocation,
  isSplitAllocationKey,
} from "./utils";
import type { DateRange, FieldWithCompany, ProductionUnitInput } from "./types";

export default function NewProductionUnit(): React.ReactElement {
  const [searchValue, setSearchValue] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  // Map: fieldId -> allocatedArea (in ettari)
  const [allocatedFields, setAllocatedFields] = useState<Map<string, number>>(
    new Map()
  );

  // Range di date per il calendario (default: anno corrente)
  const [dateRange, setDateRange] = useState<DateRange>(getCurrentYearRange());

  // Stepper state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Production units management
  const [productionUnits, setProductionUnits] = useState<ProductionUnitInput[]>(
    []
  );
  const [isCreating, setIsCreating] = useState(false);

  // CSV Import state
  const [importedData, setImportedData] = useState<ParsedBulkImport[] | null>(
    null
  );

  // Load crop varieties
  const { varieties: cropVarieties, isLoading: isLoadingVarieties } =
    useCropVarieties();

  const { companies, isLoading, isError, error } = useFieldsAvailability(
    dateRange.start.toISOString().split("T")[0],
    dateRange.end.toISOString().split("T")[0]
  );

  // Tutti i campi disponibili (flattening da tutte le aziende)
  const allFields = useMemo<FieldWithCompany[]>(() => {
    return companies
      .flatMap((company) =>
        company.fields.map((field) => ({
          ...field,
          companyName: company.companyName,
          companyId: company.companyId,
        }))
      )
      .map((field) => field as FieldWithCompany);
  }, [companies]);

  const allFieldsWithSplits = useMemo<FieldWithCompany[]>(() => {
    return allFields.flatMap((field) => {
      const splits = Array.from(allocatedFields.keys())
        .filter(
          (allocationKey) =>
            isSplitAllocationKey(allocationKey) &&
            getBaseFieldIdFromAllocation(allocationKey) === field.id
        )
        .map((allocationKey) => ({
          ...field,
          id: allocationKey,
          name: `${field.name} • ${getSplitDisplayLabel(allocationKey)}`,
        }));

      return [field, ...splits];
    });
  }, [allFields, allocatedFields]);

  // Campi filtrati per azienda
  const fieldsFilteredByCompany = useMemo<FieldWithCompany[]>(() => {
    const dataset =
      selectedCompanyId === "all"
        ? allFieldsWithSplits
        : allFieldsWithSplits.filter(
            (field) => field.companyId === selectedCompanyId
          );
    return dataset;
  }, [allFieldsWithSplits, selectedCompanyId]);

  // Campi filtrati per ricerca
  const filteredFields = useMemo(() => {
    if (!searchValue.trim()) return fieldsFilteredByCompany;
    const searchLower = searchValue.toLowerCase();
    return fieldsFilteredByCompany.filter((field) => {
      const addressMatch = field.address
        ? field.address.toLowerCase().includes(searchLower)
        : false;
      return (
        field.name.toLowerCase().includes(searchLower) ||
        addressMatch ||
        field.city?.toLowerCase().includes(searchLower) ||
        field.companyName.toLowerCase().includes(searchLower)
      );
    });
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

  const getTotalAllocatedForField = useCallback(
    (fieldId: string) => {
      let total = 0;
      allocatedFields.forEach((area, key) => {
        if (getBaseFieldIdFromAllocation(key) === fieldId) {
          total += area;
        }
      });
      return total;
    },
    [allocatedFields]
  );

  const getAvailableCapacityForAllocation = useCallback(
    (fieldId: string, allocationKey: string) => {
      const field = allFields.find((f) => f.id === fieldId);
      if (!field) {
        return 0;
      }
      let totalOther = 0;
      allocatedFields.forEach((area, key) => {
        if (getBaseFieldIdFromAllocation(key) !== fieldId) {
          return;
        }
        if (key === allocationKey) {
          return;
        }
        totalOther += area;
      });
      return Math.max(field.areaAvailable - totalOther, 0);
    },
    [allFields, allocatedFields]
  );

  const getNextSplitIndex = useCallback(
    (fieldId: string) => {
      const existingSplits = Array.from(allocatedFields.keys()).filter(
        (key) =>
          isSplitAllocationKey(key) &&
          getBaseFieldIdFromAllocation(key) === fieldId
      );
      if (existingSplits.length === 0) {
        return 2;
      }
      const maxIndex = existingSplits.reduce((max, key) => {
        const currentIndex = getSplitIndexFromAllocation(key) ?? 0;
        return Math.max(max, currentIndex);
      }, 0);
      return maxIndex + 1;
    },
    [allocatedFields]
  );

  const removeAllocationEntries = useCallback((allocationKeys: string[]) => {
    if (allocationKeys.length === 0) {
      return;
    }
    setProductionUnits((units) =>
      units.map((unit) => {
        const newAllocations = new Map(unit.allocations);
        allocationKeys.forEach((key) => newAllocations.delete(key));
        return { ...unit, allocations: newAllocations };
      })
    );
    setAllocatedFields((prev) => {
      const newMap = new Map(prev);
      allocationKeys.forEach((key) => newMap.delete(key));
      return newMap;
    });
  }, []);

  const removeFieldAllocation = useCallback(
    (allocationKey: string) => {
      removeAllocationEntries([allocationKey]);
    },
    [removeAllocationEntries]
  );

  const updateFieldAllocation = useCallback(
    (fieldId: string, allocatedArea: number | null, allocationKey?: string) => {
      const targetField = allFields.find((f) => f.id === fieldId);
      if (!targetField) {
        return;
      }
      const key = allocationKey ?? fieldId;
      if (allocatedArea === null) {
        removeAllocationEntries([key]);
        return;
      }

      const numericValue = Number.isFinite(allocatedArea) ? allocatedArea : 0;

      if (numericValue < 0) {
        removeAllocationEntries([key]);
        return;
      }

      const capacity = getAvailableCapacityForAllocation(fieldId, key);
      const safeValue = Math.min(numericValue, capacity);

      setAllocatedFields((prev) => {
        const newMap = new Map(prev);
        newMap.set(key, safeValue);
        return newMap;
      });
    },
    [allFields, getAvailableCapacityForAllocation, removeAllocationEntries]
  );

  const allocateMaxForField = useCallback(
    (fieldId: string, allocationKey?: string) => {
      const key = allocationKey ?? fieldId;
      const capacity = getAvailableCapacityForAllocation(fieldId, key);
      if (capacity <= 0) {
        return;
      }
      setAllocatedFields((prev) => {
        const newMap = new Map(prev);
        newMap.set(key, parseFloat(capacity.toFixed(2)));
        return newMap;
      });
    },
    [getAvailableCapacityForAllocation]
  );

  const handleAddIndependentArea = useCallback(
    (fieldId: string) => {
      const field = allFields.find((f) => f.id === fieldId);
      if (!field) {
        return;
      }
      const remainingArea = Math.max(
        field.areaAvailable - getTotalAllocatedForField(fieldId),
        0
      );
      if (remainingArea <= 0) {
        toast.error(
          "Non ci sono superfici disponibili per creare una nuova area."
        );
        return;
      }
      const nextIndex = getNextSplitIndex(fieldId);
      const splitKey = buildSplitAllocationKey(fieldId, nextIndex);
      setAllocatedFields((prev) => {
        const newMap = new Map(prev);
        newMap.set(splitKey, 0);
        return newMap;
      });
    },
    [allFields, getNextSplitIndex, getTotalAllocatedForField]
  );

  const getAllocatedArea = useCallback(
    (fieldId: string) => {
      return allocatedFields.has(fieldId)
        ? allocatedFields.get(fieldId)
        : undefined;
    },
    [allocatedFields]
  );

  // Handler per l'importazione CSV
  const handleCsvImport = (data: ParsedBulkImport[]) => {
    setImportedData(data);
    // Vai direttamente allo step 3 (conferma) per mostrare il riepilogo
    setCurrentStep(3);
    toast.success(
      `Dati importati con successo! ${data.length} aziende, ${data.reduce(
        (sum, d) => sum + d.productionUnits.length,
        0
      )} unità produttive.`
    );
  };

  // Handler per tornare indietro quando ci sono dati importati
  const handleCancelImport = () => {
    setImportedData(null);
    setCurrentStep(1);
  };

  // Handler per la creazione delle unità produttive
  const handleCreateProductionUnits = async () => {
    setIsCreating(true);
    try {
      const { productionUnitApiService } = await import(
        "@/api/production-unit"
      );

      // Se i dati provengono da un import CSV, usa il bulk-import
      if (importedData) {
        // Chiama bulk-import per ogni azienda
        for (const companyData of importedData) {
          await productionUnitApiService.bulkImport(companyData);
        }

        toast.success(
          `Importazione completata con successo! ${importedData.length} ${
            importedData.length === 1 ? "azienda" : "aziende"
          }, ${importedData.reduce(
            (sum, d) => sum + d.productionUnits.length,
            0
          )} unità produttive.`
        );
      } else {
        // Altrimenti usa il flusso normale
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
            const baseFieldId = firstFieldId
              ? getBaseFieldIdFromAllocation(firstFieldId)
              : undefined;
            const field = baseFieldId
              ? allFields.find((f) => f.id === baseFieldId)
              : undefined;

            if (!field) {
              throw new Error(
                `Campo non trovato per l'unità produttiva: ${unit.name}`
              );
            }

            if (!field.companyId) {
              throw new Error(
                `Company ID non trovato per il campo: ${field.name}. Verifica che i dati dei campi includano il companyId.`
              );
            }

            // Calcola le date della coltura in base al periodo selezionato
            // Se l'utente ha personalizzato le date, usale, altrimenti usa quelle calcolate
            const cropDates = calculateCropDates(crop, dateRange.start);

            const finalSowingDate =
              unit.customSowingDate || cropDates.sowingDate;
            const finalFloweringDate =
              unit.customFloweringDate || cropDates.floweringDate;
            const finalHarvestingDate =
              unit.customHarvestingDate || cropDates.harvestingDate;

            const allocationsByField = Array.from(
              unit.allocations.entries()
            ).reduce<Map<string, number>>((acc, [allocationKey, areaHa]) => {
              const targetFieldId = getBaseFieldIdFromAllocation(allocationKey);
              acc.set(targetFieldId, (acc.get(targetFieldId) || 0) + areaHa);
              return acc;
            }, new Map());

            return {
              name: unit.name,
              companyId: field.companyId,
              cropName: crop.species,
              cropType: crop.cropType,
              variety: crop.code,
              protocoll: "", // TODO: aggiungere se necessario
              allocations: Array.from(allocationsByField.entries()).map(
                ([fieldId, areaHa]) => ({
                  fieldId,
                  areaHa,
                })
              ),
              protectionStructure: unit.protectionStructure || "",
              startDate: finalSowingDate.toISOString(),
              floweringDate: finalFloweringDate.toISOString(),
              harvestingDate: finalHarvestingDate.toISOString(),
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
      }

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
          <div className="flex flex-wrap items-center gap-3 justify-end w-full md:w-auto">
            {/* Import CSV/Excel */}
            <ProductionUnitCsvImporter onImportSuccess={handleCsvImport} />

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
          </div>
        }
        filterElement={
          <div className="w-full md:w-[220px]">
            <Select
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
            >
              <SelectTrigger className="w-full">
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
                      onClick={() =>
                        removeAllocationEntries(
                          Array.from(allocatedFields.keys())
                        )
                      }
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
                      const isSplitField = isSplitAllocationKey(field.id);
                      const baseFieldId = getBaseFieldIdFromAllocation(
                        field.id
                      );
                      const baseField = allFields.find(
                        (item) => item.id === baseFieldId
                      );
                      if (!baseField) {
                        return null;
                      }

                      const allocationKey = field.id;
                      const allocationValue = getAllocatedArea(allocationKey);
                      const totalAllocatedForField =
                        getTotalAllocatedForField(baseFieldId);
                      const allocationCapacity =
                        getAvailableCapacityForAllocation(
                          baseFieldId,
                          allocationKey
                        );
                      const remainingArea = Math.max(
                        baseField.areaAvailable - totalAllocatedForField,
                        0
                      );
                      const normalizedAllocationValue = allocationValue ?? 0;
                      const fieldHasAllocations = totalAllocatedForField > 0;
                      const isCardAllocated = isSplitField
                        ? normalizedAllocationValue > 0
                        : fieldHasAllocations;
                      const canIncreaseAllocation =
                        allocationCapacity - normalizedAllocationValue > 0.0001;
                      const areaBadgeLabel = isSplitField
                        ? getSplitDisplayLabel(allocationKey)
                        : "Area 1";
                      const shouldShowRemoveButton =
                        isSplitField || fieldHasAllocations;

                      return (
                        <Card
                          key={allocationKey}
                          className={cn(
                            "transition-all hover:shadow-md",
                            isCardAllocated &&
                              "ring-2 ring-green-500 bg-green-50"
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">
                                    {baseField.name}
                                  </CardTitle>
                                  <Badge variant="secondary">
                                    {areaBadgeLabel}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {baseField.companyName}
                                </p>
                              </div>
                              {isCardAllocated && (
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
                                {baseField.address ?? "N/A"},{" "}
                                {baseField.city ?? "N/A"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Ruler className="h-4 w-4" />
                              <span>
                                Foglio {baseField.foglio}, Part.{" "}
                                {baseField.particella}
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
                                  max={allocationCapacity}
                                  step="0.1"
                                  value={allocationValue ?? ""}
                                  onChange={(e) => {
                                    const rawValue = e.target.value;
                                    const parsedValue =
                                      rawValue === ""
                                        ? null
                                        : Number.parseFloat(rawValue);
                                    const value =
                                      parsedValue === null ||
                                      Number.isNaN(parsedValue)
                                        ? null
                                        : parsedValue;
                                    updateFieldAllocation(
                                      baseFieldId,
                                      value,
                                      allocationKey
                                    );
                                  }}
                                  placeholder="0.00"
                                  className="text-right"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    allocateMaxForField(
                                      baseFieldId,
                                      allocationKey
                                    )
                                  }
                                  disabled={!canIncreaseAllocation}
                                >
                                  Max
                                </Button>
                              </div>
                              {shouldShowRemoveButton && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeFieldAllocation(allocationKey)
                                  }
                                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Rimuovi area
                                </Button>
                              )}
                            </div>

                            {!isSplitField && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleAddIndependentArea(baseFieldId)
                                }
                                disabled={remainingArea <= 0}
                                className="mt-1 w-full justify-start gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <SplitSquareVertical className="h-4 w-4" />
                                Aggiungi area indipendente
                              </Button>
                            )}

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

                              {typeof baseField.areaOccupied === "number" &&
                                baseField.areaOccupied > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-orange-600 border-orange-200"
                                  >
                                    {baseField.areaOccupied.toFixed(2)} Ha
                                    occupati
                                  </Badge>
                                )}
                            </div>

                            {/* Tipo suolo e uso */}
                            <div className="flex gap-2 text-xs">
                              {baseField.soilType && (
                                <Badge variant="outline">
                                  {baseField.soilType}
                                </Badge>
                              )}
                              {baseField.uso && (
                                <Badge variant="outline">{baseField.uso}</Badge>
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
            allFields={allFieldsWithSplits}
            dateRange={dateRange}
            onNext={() => setCurrentStep(3)}
            onPrevious={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <>
            {importedData ? (
              <ImportedDataConfirmationStep
                importedData={importedData}
                onPrevious={handleCancelImport}
                onConfirm={handleCreateProductionUnits}
                isCreating={isCreating}
              />
            ) : (
              <ConfirmationStep
                productionUnits={productionUnits}
                cropVarieties={cropVarieties}
                allFields={allFieldsWithSplits}
                dateRange={dateRange}
                onPrevious={() => setCurrentStep(2)}
                onConfirm={handleCreateProductionUnits}
                isCreating={isCreating}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
