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
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate, type NavigateFunction } from "react-router-dom";

import {
  CalendarIcon,
  ChevronRight,
  MapPin,
  Ruler,
  Search,
  SplitSquareVertical,
  RefreshCcw,
  Filter,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { ParsedBulkImport } from "@/utils/csvProductionUnitParser";

import { SingleProductionUnitForm } from "./components/SingleProductionUnitForm";
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

class NavigationManager {
  private readonly navigateFn: NavigateFunction;

  constructor(navigateFn: NavigateFunction) {
    this.navigateFn = navigateFn;
  }

  public goBack(): void {
    this.navigateFn(-1);
  }
}

export default function NewProductionUnit(): React.ReactElement {
  const [searchValue, setSearchValue] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  // Map: fieldId -> allocatedArea (in ettari)
  const [allocatedFields, setAllocatedFields] = useState<Map<string, number>>(
    new Map()
  );
  // Set di campi selezionati per multiselect
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(
    new Set()
  );

  // Range di date per il calendario (default: anno corrente)
  const [dateRange, setDateRange] = useState<DateRange>(getCurrentYearRange());
  const [tempDateRange, setTempDateRange] = useState<DateRange>(
    getCurrentYearRange()
  );

  const navigate = useNavigate();
  const navigationManager = useMemo(
    () => new NavigationManager(navigate),
    [navigate]
  );
  const handleCancelNavigation = useCallback(() => {
    navigationManager.goBack();
  }, [navigationManager]);

  const handleSearch = () => {
    setDateRange(tempDateRange);
  };

  const handleReset = () => {
    const defaultRange = getCurrentYearRange();
    setTempDateRange(defaultRange);
    setDateRange(defaultRange);
  };

  const [showSearch, setShowSearch] = useState(false);

  // Stepper state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Production units management
  const [productionUnits, setProductionUnits] = useState<ProductionUnitInput[]>(
    []
  );
  const [isCreating, setIsCreating] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // State to control whether Step 2 shows the Form or the List
  const [step2ShowList, setStep2ShowList] = useState(false);

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

  // Verifica che tutti i campi allocati appartengano alla stessa company
  const getAllocatedFieldsCompanies = useCallback(() => {
    const companies = new Set<string>();
    allocatedFields.forEach((_, allocationKey) => {
      const baseFieldId = getBaseFieldIdFromAllocation(allocationKey);
      const field = allFields.find((f) => f.id === baseFieldId);
      if (field?.companyId) {
        companies.add(field.companyId);
      }
    });
    return companies;
  }, [allocatedFields, allFields]);

  const canProceedToNextStep = useMemo(() => {
    if (totalAllocatedSAU === 0)
      return { canProceed: false, error: "Nessun campo allocato" };

    const companies = getAllocatedFieldsCompanies();
    if (companies.size === 0)
      return { canProceed: false, error: "Nessuna azienda selezionata" };
    if (companies.size > 1)
      return {
        canProceed: false,
        error: "Puoi allocare campi di una sola azienda per volta",
      };

    return { canProceed: true, error: null };
  }, [totalAllocatedSAU, getAllocatedFieldsCompanies]);

  // Calcola i campi già allocati nelle production units create
  const getFieldsAlreadyUsedInPUs = useCallback(() => {
    const usedFields = new Map<string, number>();
    productionUnits.forEach((unit) => {
      // Se stiamo modificando questa unità, non contare le sue allocazioni come "già usate"
      // perché le stiamo ricalcolando in allocatedFields
      if (unit.id === editingUnitId) return;

      unit.allocations.forEach((areaHa, fieldId) => {
        const currentUsed = usedFields.get(fieldId) || 0;
        usedFields.set(fieldId, currentUsed + areaHa);
      });
    });
    return usedFields;
  }, [productionUnits, editingUnitId]);

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

      // Calcola quanto è già usato nelle PU create (escludendo quella in edit)
      const usedInPUs = getFieldsAlreadyUsedInPUs();
      const totalUsedInPUs = usedInPUs.get(fieldId) || 0;

      // Calcola quanto è allocato nelle altre allocazioni correnti (allocatedFields)
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

      return Math.max(field.areaAvailable - totalUsedInPUs - totalOther, 0);
    },
    [allFields, allocatedFields, getFieldsAlreadyUsedInPUs]
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
    // Crea direttamente le unità produttive dall'import
    handleCreateProductionUnitsFromImport(data);
  };

  const handleEditUnit = (unitId: string) => {
    const unitToEdit = productionUnits.find((u) => u.id === unitId);
    if (unitToEdit) {
      setAllocatedFields(new Map(unitToEdit.allocations));
      setEditingUnitId(unitId);
      setSelectedFieldIds(new Set()); // Reset selezione visuale
      setCurrentStep(1);
    }
  };

  const handleDeleteUnit = (unitId: string) => {
    setProductionUnits((prev) => prev.filter((u) => u.id !== unitId));
    if (editingUnitId === unitId) {
      setEditingUnitId(null);
      setAllocatedFields(new Map());
      setCurrentStep(1);
    }
  };

  // Handler per la creazione delle unità produttive da import CSV
  const handleCreateProductionUnitsFromImport = async (
    data: ParsedBulkImport[]
  ) => {
    setIsCreating(true);
    try {
      const { productionUnitApiService } = await import(
        "@/api/production-unit"
      );

      // Chiama bulk-import per ogni azienda
      for (const companyData of data) {
        await productionUnitApiService.bulkImport(companyData);
      }

      toast.success(
        `Importazione completata con successo! ${data.length} ${
          data.length === 1 ? "azienda" : "aziende"
        }, ${data.reduce(
          (sum, d) => sum + d.productionUnits.length,
          0
        )} unità produttive.`
      );

      // Redirect to production units list
      window.location.href = "/production-unit";
    } catch (error) {
      console.error("Errore nell'importazione:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nell'importazione delle unità produttive"
      );
    } finally {
      setIsCreating(false);
    }
  };

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

          const finalSowingDate = unit.customSowingDate || cropDates.sowingDate;
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
    <div className="flex flex-col h-[calc(100vh-6rem)] lg:h-screen">
      <div className="flex-shrink-0 bg-gray-50/50 backdrop-blur-sm z-10">
        <PageHeader
          title="Nuova Unità Produttiva"
          totalItems={filteredFields.length}
          filteredItems={filteredFields.length}
        >
          <Button
            variant="outline"
            onClick={handleCancelNavigation}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            Annulla
          </Button>
        </PageHeader>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto px-6 pb-6">
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
                  {/* Calendario per periodo di disponibilità */}
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-semibold text-blue-900 flex items-center gap-2">
                          <CalendarIcon className="h-6 w-6" />
                          Periodo di disponibilità dei campi
                        </CardTitle>
                        <p className="text-sm text-blue-700">
                          Seleziona il periodo per visualizzare i campi
                          disponibili
                        </p>
                      </div>
                      {dateRange?.start && dateRange?.end && (
                        <div className="hidden md:block px-3 py-2 bg-white/60 rounded-md border border-blue-100 shadow-sm">
                          <p className="text-sm font-medium text-blue-900">
                            Periodo selezionato:{" "}
                            <span className="font-bold">
                              {format(dateRange.start, "dd MMMM yyyy", {
                                locale: it,
                              })}{" "}
                              -{" "}
                              {format(dateRange.end, "dd MMMM yyyy", {
                                locale: it,
                              })}
                            </span>
                          </p>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                          <label className="text-sm font-medium text-blue-900">
                            Data Inizio
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full md:w-[240px] justify-start text-left font-normal",
                                  !tempDateRange.start &&
                                    "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {tempDateRange.start ? (
                                  format(tempDateRange.start, "dd/MM/yyyy", {
                                    locale: it,
                                  })
                                ) : (
                                  <span>Seleziona data</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 bg-white"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={tempDateRange.start}
                                onSelect={(date) =>
                                  date &&
                                  setTempDateRange((prev) => ({
                                    ...prev,
                                    start: date,
                                  }))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="flex flex-col gap-2 w-full md:w-auto">
                          <label className="text-sm font-medium text-blue-900">
                            Data Fine
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full md:w-[240px] justify-start text-left font-normal",
                                  !tempDateRange.end && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {tempDateRange.end ? (
                                  format(tempDateRange.end, "dd/MM/yyyy", {
                                    locale: it,
                                  })
                                ) : (
                                  <span>Seleziona data</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 bg-white"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={tempDateRange.end}
                                onSelect={(date) =>
                                  date &&
                                  setTempDateRange((prev) => ({
                                    ...prev,
                                    end: date,
                                  }))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto pb-0.5">
                          <Button
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Search className="mr-2 h-4 w-4" />
                            Cerca
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleReset}
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Reset
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                            Hai già creato {productionUnits.length} unità{" "}
                            {productionUnits.length === 1
                              ? "produttiva"
                              : "produttive"}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            I campi già allocati nelle unità produttive create
                            sono evidenziati e non possono essere riselezionati.
                            Seleziona altri campi per creare una nuova unità
                            produttiva.
                          </p>
                          {editingUnitId && (
                            <p className="text-sm font-bold text-blue-900 mt-2">
                              Stai modificando un'unità esistente. Le modifiche
                              verranno salvate solo alla conferma.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Header con azioni bulk - solo su desktop */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4 gap-4">
                    {/* Ricerca Toggle */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {showSearch ? (
                          <div className="relative flex-1 min-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="text"
                              placeholder="Cerca campi..."
                              value={searchValue}
                              onChange={(e) => setSearchValue(e.target.value)}
                              className="pl-10 pr-10 w-full h-9 bg-white"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                              onClick={() => {
                                setSearchValue("");
                                setShowSearch(false);
                              }}
                            >
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSearch(true)}
                            className="bg-white hover:bg-green-50 text-green-700 border-green-200"
                          >
                            <Filter className="mr-2 h-4 w-4" />
                            Filtra Campi
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:ml-auto">
                      <ProductionUnitCsvImporter
                        onImportSuccess={handleCsvImport}
                      />
                      <div className="w-full sm:w-[240px]">
                        <Select
                          value={selectedCompanyId}
                          onValueChange={setSelectedCompanyId}
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Tutte le aziende" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              Tutte le aziende
                            </SelectItem>
                            {companies.map((company) => (
                              <SelectItem
                                key={company.companyId}
                                value={company.companyId}
                              >
                                {company.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(selectedFieldIds.size > 0 ||
                      allocatedFields.size > 0) && (
                      <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
                        {selectedFieldIds.size > 0 && (
                          <>
                            <Badge variant="secondary" className="text-sm">
                              {selectedFieldIds.size}{" "}
                              {selectedFieldIds.size === 1
                                ? "campo selezionato"
                                : "campi selezionati"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                selectedFieldIds.forEach((fieldId) => {
                                  const baseFieldId =
                                    getBaseFieldIdFromAllocation(fieldId);
                                  allocateMaxForField(baseFieldId, fieldId);
                                });
                              }}
                            >
                              Alloca Max su selezionati
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                selectedFieldIds.forEach((fieldId) => {
                                  removeFieldAllocation(fieldId);
                                });
                                setSelectedFieldIds(new Set());
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              Rimuovi selezionati
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFieldIds(new Set())}
                            >
                              Deseleziona tutto
                            </Button>
                          </>
                        )}
                        {allocatedFields.size > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              removeAllocationEntries(
                                Array.from(allocatedFields.keys())
                              );
                              setSelectedFieldIds(new Set());
                            }}
                          >
                            Rimuovi tutte le allocazioni
                          </Button>
                        )}
                      </div>
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
                    <div className="space-y-3">
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

                        // Calcola quanto è già usato nelle PU
                        const usedInPUs = getFieldsAlreadyUsedInPUs();
                        const areaUsedInPUs = usedInPUs.get(baseFieldId) || 0;
                        const isPartiallyUsedInPUs = areaUsedInPUs > 0;
                        const isFullyUsedInPUs =
                          areaUsedInPUs >= baseField.areaAvailable;

                        const remainingArea = Math.max(
                          baseField.areaAvailable -
                            totalAllocatedForField -
                            areaUsedInPUs,
                          0
                        );
                        const normalizedAllocationValue = allocationValue ?? 0;
                        const fieldHasAllocations = totalAllocatedForField > 0;
                        const isCardAllocated = isSplitField
                          ? normalizedAllocationValue > 0
                          : fieldHasAllocations;
                        const canIncreaseAllocation =
                          allocationCapacity - normalizedAllocationValue >
                          0.0001;
                        const areaBadgeLabel = isSplitField
                          ? getSplitDisplayLabel(allocationKey)
                          : "Area 1";
                        const shouldShowRemoveButton =
                          isSplitField || fieldHasAllocations;
                        const isSelected = selectedFieldIds.has(allocationKey);
                        const isDisabled =
                          isFullyUsedInPUs || allocationCapacity <= 0;

                        return (
                          <Card
                            key={allocationKey}
                            className={cn(
                              "transition-all hover:shadow-md",
                              !isDisabled && "cursor-pointer",
                              isDisabled &&
                                "opacity-60 cursor-not-allowed bg-gray-100",
                              isCardAllocated &&
                                !isDisabled &&
                                "ring-2 ring-green-500 bg-green-50",
                              isSelected &&
                                !isDisabled &&
                                "ring-2 ring-blue-500 bg-blue-50"
                            )}
                            onClick={() => {
                              if (isDisabled) return;
                              const newSelected = new Set(selectedFieldIds);
                              if (isSelected) {
                                newSelected.delete(allocationKey);
                              } else {
                                newSelected.add(allocationKey);
                              }
                              setSelectedFieldIds(newSelected);
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                {/* Checkbox per multiselect */}
                                <div
                                  className="flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={isDisabled}
                                    onCheckedChange={(checked) => {
                                      if (isDisabled) return;
                                      const newSelected = new Set(
                                        selectedFieldIds
                                      );
                                      if (checked) {
                                        newSelected.add(allocationKey);
                                      } else {
                                        newSelected.delete(allocationKey);
                                      }
                                      setSelectedFieldIds(newSelected);
                                    }}
                                  />
                                </div>

                                {/* Info campo */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                  {/* Nome e azienda */}
                                  <div className="md:col-span-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-semibold text-base">
                                        {baseField.name}
                                      </h3>
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {areaBadgeLabel}
                                      </Badge>
                                      {isCardAllocated && (
                                        <Badge
                                          variant="default"
                                          className="bg-green-600 text-xs"
                                        >
                                          Allocato
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {baseField.companyName}
                                    </p>
                                  </div>

                                  {/* Dettagli località */}
                                  <div className="md:col-span-3 space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <MapPin className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate">
                                        {baseField.address ?? "N/A"},{" "}
                                        {baseField.city ?? "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Ruler className="h-4 w-4 flex-shrink-0" />
                                      <span>
                                        Foglio {baseField.foglio}, Part.{" "}
                                        {baseField.particella}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Disponibilità e badge */}
                                  <div className="md:col-span-4 flex flex-wrap gap-2">
                                    {isFullyUsedInPUs ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-gray-200 text-gray-700 border-gray-400"
                                      >
                                        Campo già allocato
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant={
                                          remainingArea > 0
                                            ? "secondary"
                                            : "outline"
                                        }
                                        className={
                                          remainingArea > 0
                                            ? "bg-green-100 text-green-800"
                                            : ""
                                        }
                                      >
                                        Disp. {remainingArea.toFixed(2)} Ha
                                      </Badge>
                                    )}

                                    {isPartiallyUsedInPUs &&
                                      !isFullyUsedInPUs && (
                                        <Badge
                                          variant="outline"
                                          className="bg-purple-100 text-purple-800 border-purple-300"
                                        >
                                          {areaUsedInPUs.toFixed(2)} Ha in UP
                                          create
                                        </Badge>
                                      )}

                                    {typeof baseField.areaOccupied ===
                                      "number" &&
                                      baseField.areaOccupied > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-orange-600 border-orange-200"
                                        >
                                          {baseField.areaOccupied.toFixed(2)} Ha
                                          occ.
                                        </Badge>
                                      )}

                                    {baseField.soilType && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {baseField.soilType}
                                      </Badge>
                                    )}
                                    {baseField.uso && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {baseField.uso}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Controlli allocazione */}
                                  <div
                                    className="md:col-span-2 flex items-center justify-end gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Input
                                      type="number"
                                      min="0"
                                      max={allocationCapacity}
                                      step="0.1"
                                      value={allocationValue ?? ""}
                                      onChange={(e) => {
                                        if (isDisabled) return;
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
                                      className="text-right w-24"
                                      disabled={isDisabled}
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
                                      disabled={
                                        isDisabled || !canIncreaseAllocation
                                      }
                                    >
                                      Max
                                    </Button>
                                  </div>
                                </div>

                                {/* Azioni */}
                                <div
                                  className="flex-shrink-0 flex gap-2 w-[180px] justify-end"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {!isSplitField && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleAddIndependentArea(baseFieldId)
                                      }
                                      disabled={remainingArea <= 0}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                                      title="Aggiungi area indipendente"
                                    >
                                      <SplitSquareVertical className="h-4 w-4" />
                                      <span className="hidden lg:inline">
                                        Dividi
                                      </span>
                                    </Button>
                                  )}
                                  {shouldShowRemoveButton && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        removeFieldAllocation(allocationKey)
                                      }
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title="Rimuovi area"
                                    >
                                      <span>Rimuovi</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Navigation buttons for step 1 - MOVED TO FOOTER */}
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <SingleProductionUnitForm
              cropVarieties={cropVarieties}
              isLoadingVarieties={isLoadingVarieties}
              allocatedFields={allocatedFields}
              allFields={allFieldsWithSplits}
              dateRange={dateRange}
              productionUnits={productionUnits}
              editingUnitId={editingUnitId || undefined}
              showList={step2ShowList}
              onEditUnit={handleEditUnit}
              onDeleteUnit={handleDeleteUnit}
              onSave={(unit) => {
                if (editingUnitId) {
                  // Aggiorna l'unità esistente
                  setProductionUnits((prev) =>
                    prev.map((u) => (u.id === editingUnitId ? unit : u))
                  );
                } else {
                  // Aggiungi l'unità all'array
                  setProductionUnits((prev) => [...prev, unit]);
                }
                setStep2ShowList(true);
              }}
              onAddAnother={() => {
                // Torna allo step 1 e azzera le allocazioni correnti
                setAllocatedFields(new Map());
                setSelectedFieldIds(new Set());
                setEditingUnitId(null);
                setCurrentStep(1);
              }}
              onNext={handleCreateProductionUnits}
              onCancel={() => setCurrentStep(1)}
              isCreating={isCreating}
            />
          )}
        </div>

        {/* Footer Step 1 - FIXED BOTTOM */}
        {currentStep === 1 && (
          <div className="flex-shrink-0 border-t bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-end items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">
                SAU Totale Allocata
              </p>
              <p className="text-2xl font-bold text-green-600">
                {totalAllocatedSAU.toFixed(2)} Ha
              </p>
            </div>
            <Button
              onClick={() => {
                if (!canProceedToNextStep.canProceed) {
                  toast.error(
                    canProceedToNextStep.error || "Errore nella validazione"
                  );
                  return;
                }
                setStep2ShowList(false);
                setCurrentStep(2);
              }}
              disabled={!canProceedToNextStep.canProceed}
              className="min-w-48"
              size="lg"
            >
              Associa
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
