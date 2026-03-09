import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";

import { PageHeader } from "@/components/organism/Header";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  ProductionUnitCsvImporter,
  type ImportResult,
} from "@/components/organism/ProductionUnitCsvImporter";
import { useFieldsAvailability } from "@/hooks/useFieldsAvailability";
import { useCompanies } from "@/hooks/useCompanies";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
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
  PenLine,
  FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
// import { format } from "date-fns";
// import { it } from "date-fns/locale";
import { toast } from "sonner";

import { SingleProductionUnitForm } from "./components/SingleProductionUnitForm";
import { useCropVarieties } from "./hooks/useCropVarieties";
import { useCultivarHarvestDates } from "./hooks/useCultivarHarvestDates";
import {
  buildSplitAllocationKey,
  calculateCropDates,
  distributeAllocationsProportionally,
  getBaseFieldIdFromAllocation,
  getCurrentYearRange,
  getSplitDisplayLabel,
  getSplitIndexFromAllocation,
  isSplitAllocationKey,
} from "./utils";
import type {
  CropVariety,
  DateRange,
  FieldWithCompany,
  ProductionUnitInput,
  ProductionUnitSplitPart,
} from "./types";

class NavigationManager {
  private readonly navigateFn: NavigateFunction;

  constructor(navigateFn: NavigateFunction) {
    this.navigateFn = navigateFn;
  }

  public goBack(): void {
    this.navigateFn(-1);
  }
}

class ImportedCropResolver {
  private readonly varieties: CropVariety[];

  constructor(varieties: CropVariety[]) {
    this.varieties = varieties;
  }

  public resolve(unit: ImportResult["productionUnits"][number]): string {
    for (const label of this.buildCandidateLabels(unit)) {
      const match = this.findMatch(label);
      if (match) {
        return match.code;
      }
    }
    return "";
  }

  private buildCandidateLabels(
    unit: ImportResult["productionUnits"][number],
  ): string[] {
    const labels = [unit.cropName, unit.cropType, unit.occupazione, unit.name];
    const expanded = new Set<string>();

    labels.forEach((label) => {
      if (!label) {
        return;
      }
      expanded.add(label);
      const cleanedParentheses = label
        .replace(/[()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleanedParentheses) {
        expanded.add(cleanedParentheses);
      }
      const parenthesisMatches = label.match(/\(([^)]+)\)/g);
      if (parenthesisMatches) {
        parenthesisMatches.forEach((match) => {
          const inner = match.replace(/[()]/g, "").trim();
          if (inner) {
            expanded.add(inner);
          }
        });
      }
    });

    return Array.from(expanded).filter(Boolean);
  }

  private findMatch(label: string): CropVariety | undefined {
    const normalizedLabel = this.normalize(label);
    if (!normalizedLabel) {
      return undefined;
    }

    return this.varieties.find((variety) => {
      const speciesNorm = this.normalize(variety.species);
      const cropTypeNorm = this.normalize(variety.cropType);
      return (
        normalizedLabel.includes(speciesNorm) ||
        speciesNorm.includes(normalizedLabel) ||
        normalizedLabel.includes(cropTypeNorm) ||
        cropTypeNorm.includes(normalizedLabel)
      );
    });
  }

  private normalize(value: string | undefined | null): string {
    if (!value) {
      return "";
    }
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
}

export default function NewProductionUnit(): React.ReactElement {
  const [searchValue, setSearchValue] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  // Map: fieldId -> allocatedArea (in ettari)
  const [allocatedFields, setAllocatedFields] = useState<Map<string, number>>(
    new Map(),
  );
  // Set di campi selezionati per multiselect
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(
    new Set(),
  );

  // Range di date per il calendario (default: anno corrente)
  const [dateRange, setDateRange] = useState<DateRange>(getCurrentYearRange());
  const [tempDateRange, setTempDateRange] = useState<DateRange>(
    getCurrentYearRange(),
  );
  const [entryMode, setEntryMode] = useState<"search" | "import" | null>(null);
  const [hasPerformedSearch, setHasPerformedSearch] = useState(false);

  const navigate = useNavigate();
  const navigationManager = useMemo(
    () => new NavigationManager(navigate),
    [navigate],
  );
  const handleCancelNavigation = useCallback(() => {
    navigationManager.goBack();
  }, [navigationManager]);

  const handleSearch = () => {
    setEntryMode("search");
    setHasPerformedSearch(true);
    setDateRange(tempDateRange);
  };

  const handleReset = () => {
    const defaultRange = getCurrentYearRange();
    setTempDateRange(defaultRange);
    setDateRange(defaultRange);
  };

  const [showSearch, setShowSearch] = useState(false);

  // Modalità creazione: null = scelta iniziale, "manual" = form manuale, "import" = import da file
  const [creationMode, setCreationMode] = useState<null | "manual" | "import">(
    null,
  );

  const handleBackToChoice = useCallback(() => {
    setCreationMode(null);
    setCurrentStep(1);
    setProductionUnits([]);
    setAllocatedFields(new Map());
    setSelectedFieldIds(new Set());
    setEditingUnitId(null);
    setStep2ShowList(false);
  }, []);

  // Stepper state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Production units management
  const [productionUnits, setProductionUnits] = useState<ProductionUnitInput[]>(
    [],
  );
  const [isCreating, setIsCreating] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // State to control whether Step 2 shows the Form or the List
  const [step2ShowList, setStep2ShowList] = useState(false);

  // Load crop varieties
  const { varieties: cropVarieties, isLoading: isLoadingVarieties } =
    useCropVarieties();
  const {
    catalog: cultivarCatalog,
    isLoading: isLoadingCultivarCatalog,
    error: cultivarCatalogError,
  } = useCultivarHarvestDates();
  const { companies: registeredCompanies } = useCompanies();

  useEffect(() => {
    if (cultivarCatalogError) {
      toast.error(
        "Impossibile caricare il dataset delle cultivar. Continuerai senza suggerimenti automatici.",
      );
    }
  }, [cultivarCatalogError]);

  const isAvailabilitySearchEnabled =
    entryMode === "search" && hasPerformedSearch;
  const availabilityStart = isAvailabilitySearchEnabled
    ? dateRange.start.toISOString().split("T")[0]
    : "";
  const availabilityEnd = isAvailabilitySearchEnabled
    ? dateRange.end.toISOString().split("T")[0]
    : "";

  const { companies, isLoading, isError, error } = useFieldsAvailability(
    availabilityStart,
    availabilityEnd,
    { enabled: isAvailabilitySearchEnabled },
  );

  // Tutti i campi disponibili (flattening da tutte le aziende)
  const allFields = useMemo<FieldWithCompany[]>(() => {
    return companies
      .flatMap((company) =>
        company.fields.map((field) => ({
          ...field,
          companyName: company.companyName,
          companyId: company.companyId,
        })),
      )
      .map((field) => field as FieldWithCompany);
  }, [companies]);

  const importerCompanies = useMemo(() => {
    if (registeredCompanies.length === 0) {
      return [];
    }

    const fieldsByCompanyId = new Map<
      string,
      (typeof companies)[number]["fields"]
    >();
    companies.forEach((company) => {
      fieldsByCompanyId.set(company.companyId, company.fields);
    });

    return registeredCompanies.map((company) => {
      const relatedFields = fieldsByCompanyId.get(company.id) ?? [];
      return {
        companyId: company.id,
        companyName: company.name,
        vatNumber: company.vatNumber,
        fields: relatedFields.map((field) => ({
          id: field.id,
          name: field.name,
          foglio: field.foglio,
          particella: field.particella,
          sezione: field.sezione,
          areaAvailable: field.areaAvailable,
        })),
      };
    });
  }, [registeredCompanies, companies]);

  const allFieldsWithSplits = useMemo<FieldWithCompany[]>(() => {
    return allFields.flatMap((field) => {
      const splits = Array.from(allocatedFields.keys())
        .filter(
          (allocationKey) =>
            isSplitAllocationKey(allocationKey) &&
            getBaseFieldIdFromAllocation(allocationKey) === field.id,
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
            (field) => field.companyId === selectedCompanyId,
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

  const displayedFieldsCount = isAvailabilitySearchEnabled
    ? filteredFields.length
    : 0;
  const showPreSearchEmptyState =
    !isAvailabilitySearchEnabled && entryMode !== "import";

  // Calcola il totale SAU allocato
  const totalAllocatedSAU = useMemo(() => {
    return Array.from(allocatedFields.values()).reduce(
      (total, allocatedArea) => {
        return total + allocatedArea;
      },
      0,
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
    [allocatedFields],
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
    [allFields, allocatedFields, getFieldsAlreadyUsedInPUs],
  );

  const getNextSplitIndex = useCallback(
    (fieldId: string) => {
      const existingSplits = Array.from(allocatedFields.keys()).filter(
        (key) =>
          isSplitAllocationKey(key) &&
          getBaseFieldIdFromAllocation(key) === fieldId,
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
    [allocatedFields],
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
    [removeAllocationEntries],
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
    [allFields, getAvailableCapacityForAllocation, removeAllocationEntries],
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
    [getAvailableCapacityForAllocation],
  );

  const handleAddIndependentArea = useCallback(
    (fieldId: string) => {
      const field = allFields.find((f) => f.id === fieldId);
      if (!field) {
        return;
      }
      const remainingArea = Math.max(
        field.areaAvailable - getTotalAllocatedForField(fieldId),
        0,
      );
      if (remainingArea <= 0) {
        toast.error(
          "Non ci sono superfici disponibili per creare una nuova area.",
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
    [allFields, getNextSplitIndex, getTotalAllocatedForField],
  );

  const getAllocatedArea = useCallback(
    (fieldId: string) => {
      return allocatedFields.has(fieldId)
        ? allocatedFields.get(fieldId)
        : undefined;
    },
    [allocatedFields],
  );

  // Handler per l'importazione CSV - popola lo stato locale per revisione
  const handleCsvImport = (result: ImportResult) => {
    if (result.productionUnits.length === 0) {
      toast.error("Nessuna unità produttiva trovata nel file.");
      return;
    }

    setEntryMode("import");
    setHasPerformedSearch(false);

    // Filtra per l'azienda selezionata
    setSelectedCompanyId(result.companyId);

    const cropResolver = new ImportedCropResolver(cropVarieties);

    // Converti le unità importate nel formato ProductionUnitInput
    const convertedUnits: ProductionUnitInput[] = result.productionUnits.map(
      (importedUnit) => {
        const cropCode = cropResolver.resolve(importedUnit);

        return {
          id: importedUnit.id,
          name: importedUnit.name,
          cropCode,
          cultivarId: null,
          totalAreaHa: importedUnit.totalAreaHa ?? null,
          allocations: importedUnit.allocations,
          allocationsWithDetails: importedUnit.allocationsWithDetails,
          protectionStructure: importedUnit.protectionStructure,
          occupazione: importedUnit.occupazione,
          destinazioneDiUso: importedUnit.destinazioneDiUso,
          acquaTotalePeridoL: importedUnit.acquaTotalePeridoL,
          customSowingDate: importedUnit.startDate,
          customFloweringDate: null,
          customHarvestingDate: importedUnit.endDate,
          // Salva i dati originali dall'import per usarli come fallback
          importedCropName: importedUnit.cropName || null,
          importedCropType: importedUnit.cropType || null,
          importedVariety: importedUnit.variety || null,
          importedCompanyId: result.companyId || null,
        };
      },
    );

    const importedStartDates = convertedUnits
      .map((unit) => unit.customSowingDate)
      .filter((date): date is Date => Boolean(date));
    const importedEndDates = convertedUnits
      .map((unit) => unit.customHarvestingDate)
      .filter((date): date is Date => Boolean(date));

    if (importedStartDates.length > 0 && importedEndDates.length > 0) {
      const minStart = new Date(
        Math.min(...importedStartDates.map((date) => date.getTime())),
      );
      const maxEnd = new Date(
        Math.max(...importedEndDates.map((date) => date.getTime())),
      );
      setDateRange({ start: minStart, end: maxEnd });
      setTempDateRange({ start: minStart, end: maxEnd });
    }

    // Imposta le unità produttive
    setProductionUnits(convertedUnits);

    // Mostra messaggi di successo/warning
    const totalAllocations = convertedUnits.reduce(
      (sum, u) => sum + u.allocations.size,
      0,
    );
    const unitsWithMissingCrop = convertedUnits.filter((u) => !u.cropCode);

    toast.success(
      `Importate ${convertedUnits.length} unità produttive con ${totalAllocations} allocazioni campi.`,
    );

    if (unitsWithMissingCrop.length > 0) {
      toast.warning(
        `${unitsWithMissingCrop.length} unità non hanno una varietà abbinata. Selezionala manualmente.`,
        { duration: 5000 },
      );
    }

    // Passa allo step 2 per mostrare la lista con anteprima
    setCurrentStep(2);
    setStep2ShowList(true);
  };

  const handleEditUnit = (unitId: string) => {
    const unitToEdit = productionUnits.find((u) => u.id === unitId);
    if (unitToEdit) {
      setAllocatedFields(new Map(unitToEdit.allocations));
      setEditingUnitId(unitId);
      setSelectedFieldIds(new Set()); // Reset selezione visuale
      // Vai direttamente al form di modifica (step 2) invece che alla selezione campi
      setStep2ShowList(false);
      setCurrentStep(2);
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

  const handleDeleteUnits = (unitIds: string[]) => {
    setProductionUnits((prev) => prev.filter((u) => !unitIds.includes(u.id)));
    if (editingUnitId && unitIds.includes(editingUnitId)) {
      setEditingUnitId(null);
      setAllocatedFields(new Map());
      setCurrentStep(1);
    }
  };

  const handleSplitUnit = useCallback(
    (originalUnitId: string, parts: ProductionUnitSplitPart[]) => {
      const originalUnit = productionUnits.find((u) => u.id === originalUnitId);
      if (!originalUnit) return;

      const totalArea =
        originalUnit.totalAreaHa ??
        Array.from(originalUnit.allocations.values()).reduce(
          (sum, a) => sum + a,
          0,
        );

      const splitUnits: ProductionUnitInput[] = parts.map((part, index) => ({
        ...originalUnit,
        id: `${originalUnitId}__pu_split__${index}`,
        name: part.name,
        totalAreaHa: part.areaHa,
        allocations: distributeAllocationsProportionally(
          originalUnit.allocations,
          totalArea,
          part.areaHa,
        ),
      }));

      setProductionUnits((prev) => {
        const withoutOriginal = prev.filter((u) => u.id !== originalUnitId);
        return [...withoutOriginal, ...splitUnits];
      });

      toast.success(
        `Unità "${originalUnit.name}" frazionata in ${parts.length} parti`,
      );
    },
    [productionUnits],
  );

  const handleMoveField = useCallback(
    (
      sourceUnitId: string,
      targetUnitId: string,
      fieldId: string,
      areaHa: number,
    ) => {
      setProductionUnits((prev) => {
        // Trova i dettagli del campo nell'unità di origine
        const sourceUnit = prev.find((u) => u.id === sourceUnitId);
        const movedFieldDetail = sourceUnit?.allocationsWithDetails?.find(
          (d) => d.fieldId === fieldId,
        );

        return prev.map((unit) => {
          if (unit.id === sourceUnitId) {
            // Rimuovi il campo dall'unità di origine
            const newAllocations = new Map(unit.allocations);
            newAllocations.delete(fieldId);
            const newDetails = unit.allocationsWithDetails?.filter(
              (d) => d.fieldId !== fieldId,
            );
            return {
              ...unit,
              allocations: newAllocations,
              allocationsWithDetails: newDetails,
              totalAreaHa:
                unit.totalAreaHa !== null && unit.totalAreaHa !== undefined
                  ? Math.max(unit.totalAreaHa - areaHa, 0)
                  : null,
            };
          } else if (unit.id === targetUnitId) {
            // Aggiungi il campo all'unità di destinazione
            const newAllocations = new Map(unit.allocations);
            newAllocations.set(fieldId, areaHa);
            const newDetails = [
              ...(unit.allocationsWithDetails ?? []),
              ...(movedFieldDetail ? [movedFieldDetail] : []),
            ];
            return {
              ...unit,
              allocations: newAllocations,
              allocationsWithDetails: newDetails,
              totalAreaHa:
                unit.totalAreaHa !== null && unit.totalAreaHa !== undefined
                  ? unit.totalAreaHa + areaHa
                  : null,
            };
          }
          return unit;
        });
      });
    },
    [],
  );

  const handleRemoveFieldFromUnit = useCallback(
    (unitId: string, fieldId: string, areaHa: number) => {
      setProductionUnits((prev) => {
        return prev.map((unit) => {
          if (unit.id === unitId) {
            // Rimuovi il campo dall'unità
            const newAllocations = new Map(unit.allocations);
            newAllocations.delete(fieldId);
            const newDetails = unit.allocationsWithDetails?.filter(
              (d) => d.fieldId !== fieldId,
            );
            return {
              ...unit,
              allocations: newAllocations,
              allocationsWithDetails: newDetails,
              totalAreaHa:
                unit.totalAreaHa !== null && unit.totalAreaHa !== undefined
                  ? Math.max(unit.totalAreaHa - areaHa, 0)
                  : null,
            };
          }
          return unit;
        });
      });
    },
    [],
  );

  // Handler per la creazione delle unità produttive
  const handleCreateProductionUnits = async () => {
    setIsCreating(true);
    try {
      const { productionUnitApiService } =
        await import("@/api/production-unit");

      // Filtra le unità senza allocazioni: le saltiamo ma avvisiamo l'utente
      const unitsWithAllocations = productionUnits.filter(
        (unit) => unit.allocations.size > 0,
      );
      const skippedUnits = productionUnits.length - unitsWithAllocations.length;

      if (unitsWithAllocations.length === 0) {
        toast.error(
          "Nessuna unità ha campi allocati. Assegna almeno un campo e riprova.",
        );
        return;
      }

      if (skippedUnits > 0) {
        toast.warning(
          `${skippedUnits} unità senza campi allocati sono state escluse dalla creazione.`,
        );
      }

      // Preparazione dei dati per la chiamata API
      const request = {
        productionUnits: unitsWithAllocations.map((unit) => {
          // Cerca la crop locale, ma non è obbligatoria se abbiamo i dati importati
          const crop = unit.cropCode
            ? cropVarieties.find((v) => v.code === unit.cropCode)
            : null;

          // Raggruppa per campo base
          const allocationsByField = Array.from(
            unit.allocations.entries(),
          ).reduce<Map<string, number>>((acc, [allocationKey, areaHa]) => {
            const targetFieldId = getBaseFieldIdFromAllocation(allocationKey);
            acc.set(targetFieldId, (acc.get(targetFieldId) || 0) + areaHa);
            return acc;
          }, new Map());

          const firstAllocatedFieldId =
            Array.from(allocationsByField.keys())[0] ?? null;
          const matchedField = firstAllocatedFieldId
            ? allFields.find((f) => f.id === firstAllocatedFieldId)
            : undefined;

          // Determina companyId: usa quello del campo locale, quello importato, o quello selezionato
          const companyId =
            matchedField?.companyId ??
            unit.importedCompanyId ??
            (selectedCompanyId !== "all" ? selectedCompanyId : null);

          if (!companyId) {
            throw new Error(
              `Impossibile determinare l'azienda per l'unità "${unit.name}". Seleziona un'azienda o assegna almeno un campo valido.`,
            );
          }

          // Usa le date importate o quelle calcolate dalla crop locale
          let finalSowingDate = unit.customSowingDate;
          let finalFloweringDate = unit.customFloweringDate;
          let finalHarvestingDate = unit.customHarvestingDate;

          if (crop) {
            const cropDates = calculateCropDates(crop, dateRange.start);
            finalSowingDate = finalSowingDate || cropDates.sowingDate;
            finalFloweringDate = finalFloweringDate || cropDates.floweringDate;
            finalHarvestingDate =
              finalHarvestingDate || cropDates.harvestingDate;
          }

          // Fallback per le date se ancora mancanti
          const now = new Date();
          finalSowingDate = finalSowingDate || now;
          finalFloweringDate = finalFloweringDate || null;
          finalHarvestingDate = finalHarvestingDate || null;

          // Usa dati crop locale se disponibili, altrimenti usa i dati importati
          const cropName = crop?.species || unit.importedCropName || unit.name;
          const cropType = crop?.cropType || unit.importedCropType || unit.name;
          const resolvedVariety =
            (unit.cultivarId &&
              cultivarCatalog?.getCultivarName(unit.cultivarId)) ||
            unit.importedVariety ||
            crop?.code ||
            unit.name;

          return {
            name: unit.name,
            companyId,
            cropName,
            cropType,
            variety: resolvedVariety,
            protocoll: "",
            allocations: Array.from(allocationsByField.entries()).map(
              ([fieldId, areaHa]) => ({
                fieldId,
                areaHa,
              }),
            ),
            protectionStructure: unit.protectionStructure || "",
            startDate: finalSowingDate.toISOString(),
            floweringDate: finalFloweringDate?.toISOString() || null,
            harvestingDate: finalHarvestingDate?.toISOString() || null,
            endDate: finalHarvestingDate?.toISOString() || null,
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
        } con successo!`,
      );

      // Redirect to production units list
      window.location.href = "/production-unit";
    } catch (error) {
      console.error("Errore nella creazione delle unità produttive:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nella creazione delle unità produttive",
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
          totalItems={creationMode ? displayedFieldsCount : 0}
          filteredItems={creationMode ? displayedFieldsCount : 0}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCancelNavigation}
              className="border-red-200 text-red-600 bg-transparent hover:bg-transparent hover:text-red-600 hover:border-red-200"
            >
              Annulla
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Schermata scelta: Creazione manuale o Importa da file */}
        {creationMode === null && (
          <div className="flex-1 overflow-auto px-6 pb-6">
            <div className="max-w-2xl mx-auto w-full space-y-4 mt-8">
              <h2 className="text-lg font-semibold text-foreground text-center mb-6">
                Come vuoi creare le unità produttive?
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCreationMode("manual")}
                  className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-8 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md cursor-pointer"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-200">
                    <PenLine className="h-7 w-7" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-base font-semibold text-foreground">
                      Creazione manuale
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Seleziona campi e compila i dati
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode("import")}
                  className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-8 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md cursor-pointer"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-200">
                    <FileUp className="h-7 w-7" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-base font-semibold text-foreground">
                      Importa da file
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CSV, XLS, XLSX, PDF, Shapefile, ZIP
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {creationMode !== null && currentStep === 1 && (
          <div className="flex-1 overflow-auto px-6 pb-6">
            {/* Step 1 - Import da file: solo importer inline */}
            {creationMode === "import" ? (
              <div className="py-6">
                <h3 className="text-lg font-semibold mb-2">Importa da file</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Supporta il template AGEA (CSV, XLS, XLSX, PDF), Shapefile
                  (.shp + .dbf + .shx) e ZIP. Seleziona l'azienda e carica un file;
                  i dati verranno estratti automaticamente.
                </p>
                <ProductionUnitCsvImporter
                  embedded
                  companies={importerCompanies}
                  onImportSuccess={handleCsvImport}
                  onCloseParentDrawer={handleBackToChoice}
                />
              </div>
            ) : (
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
                    {/* Durata unità produttiva e ricerca parcelle disponibili */}
                    <Card className="bg-white shadow-md">
                      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
                        <div className="flex flex-col gap-2 w-full lg:max-w-lg">
                          <div className="flex items-center gap-3">
                            <CalendarIcon className="h-6 w-6" />
                            <div className="flex flex-col">
                              <span className="text-base font-semibold">
                                Scegli la durata dell'unità produttiva
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Verranno mostrate solo le parcelle disponibili
                                in questo intervallo.
                              </span>
                            </div>
                          </div>
                          {/* {dateRange?.start && dateRange?.end && (
                            <p className="text-xs font-medium text-foreground">
                              Periodo selezionato:{" "}
                              <span className="font-semibold">
                                {format(dateRange.start, "dd MMMM yyyy", {
                                  locale: it,
                                })}{" "}
                                -{" "}
                                {format(dateRange.end, "dd MMMM yyyy", {
                                  locale: it,
                                })}
                              </span>
                            </p>
                          )} */}
                        </div>
                        <div className="flex flex-col gap-4 w-full lg:w-auto lg:flex-row lg:items-end">
                          <div className="flex flex-col gap-2 w-full lg:w-[220px]">
                            <label className="text-sm font-medium text-foreground">
                              Data Inizio unità produttiva
                            </label>
                            <DatePickerInput
                              value={tempDateRange.start}
                              onChange={(date) =>
                                date &&
                                setTempDateRange((prev) => ({
                                  ...prev,
                                  start: date,
                                }))
                              }
                              placeholder="gg/mm/aaaa"
                            />
                          </div>

                          <div className="flex flex-col gap-2 w-full lg:w-[220px]">
                            <label className="text-sm font-medium text-foreground">
                              Data Fine unità produttiva
                            </label>
                            <DatePickerInput
                              value={tempDateRange.end}
                              onChange={(date) =>
                                date &&
                                setTempDateRange((prev) => ({
                                  ...prev,
                                  end: date,
                                }))
                              }
                              placeholder="gg/mm/aaaa"
                            />
                          </div>

                          <div className="flex gap-2 w-full lg:w-auto lg:justify-end">
                            <Button
                              onClick={handleSearch}
                              className="bg-transparent hover:bg-transparent hover:text-black hover:border-agri-green-600"
                              variant="outline"
                            >
                              <Search className="mr-2 h-4 w-4" />
                              Cerca
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleReset}
                              className="bg-transparent hover:bg-transparent hover:text-black hover:border-agri-green-600"
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
                      <div className="bg-white shadow-md border border-border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-foreground"
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
                            <p className="text-sm font-medium text-foreground">
                              Hai già creato {productionUnits.length} unità{" "}
                              {productionUnits.length === 1
                                ? "produttiva"
                                : "produttive"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              I campi già allocati nelle unità produttive create
                              sono evidenziati e non possono essere
                              riselezionati. Seleziona altri campi per creare
                              una nuova unità produttiva.
                            </p>
                            {editingUnitId && (
                              <p className="text-sm font-bold text-foreground mt-2">
                                Stai modificando un'unità esistente. Le
                                modifiche verranno salvate solo alla conferma.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Header con azioni bulk - solo su desktop */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white shadow-md rounded-lg p-4 gap-4">
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
                              className="bg-white"
                            >
                              <Filter className="mr-2 h-4 w-4" />
                              Filtra Campi
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:ml-auto">
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
                                  Array.from(allocatedFields.keys()),
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
                          {showPreSearchEmptyState
                            ? "Imposta la durata e cerca le parcelle"
                            : "Nessun campo trovato"}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {showPreSearchEmptyState
                            ? "Scegli il periodo di attività dell'unità produttiva e premi \"Cerca\" per visualizzare le parcelle disponibili in quell'intervallo."
                            : "Prova a modificare i filtri di ricerca o il periodo selezionato."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredFields.map((field) => {
                          const isSplitField = isSplitAllocationKey(field.id);
                          const baseFieldId = getBaseFieldIdFromAllocation(
                            field.id,
                          );
                          const baseField = allFields.find(
                            (item) => item.id === baseFieldId,
                          );
                          if (!baseField) {
                            return null;
                          }

                          const allocationKey = field.id;
                          const allocationValue =
                            getAllocatedArea(allocationKey);
                          const totalAllocatedForField =
                            getTotalAllocatedForField(baseFieldId);
                          const allocationCapacity =
                            getAvailableCapacityForAllocation(
                              baseFieldId,
                              allocationKey,
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
                            0,
                          );
                          const normalizedAllocationValue =
                            allocationValue ?? 0;
                          const fieldHasAllocations =
                            totalAllocatedForField > 0;
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
                          const isSelected =
                            selectedFieldIds.has(allocationKey);
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
                                  "ring-2 ring-muted bg-muted/20",
                                isSelected &&
                                  !isDisabled &&
                                  "ring-2 ring-agri-green-500 bg-agri-green-50",
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
                                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                  {/* Checkbox per multiselect */}
                                  <div
                                    className="flex-shrink-0 self-start lg:self-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={isDisabled}
                                      onCheckedChange={(checked) => {
                                        if (isDisabled) return;
                                        const newSelected = new Set(
                                          selectedFieldIds,
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
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
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
                                            className="bg-muted text-muted-foreground text-xs"
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
                                          {baseField.foglio || baseField.particella
                                            ? `Foglio ${baseField.foglio ?? "-"}, Part. ${baseField.particella ?? "-"}`
                                            : "Senza rif. catastali"}
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
                                              ? "bg-muted text-muted-foreground"
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
                                            {baseField.areaOccupied.toFixed(2)}{" "}
                                            Ha occ.
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
                                      className="md:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:justify-end md:self-center"
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
                                            allocationKey,
                                          );
                                        }}
                                        placeholder="0.00"
                                        className="text-right w-full sm:w-24"
                                        disabled={isDisabled}
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          allocateMaxForField(
                                            baseFieldId,
                                            allocationKey,
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
                                    className="flex-shrink-0 flex flex-col md:flex-row gap-2 w-full md:w-auto lg:w-[180px] items-stretch md:items-center md:justify-end md:self-center"
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
                                        className="text-foreground hover:text-foreground hover:bg-muted gap-1"
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
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex-1 flex flex-col min-h-0 overflow-auto px-6 pb-6">
            <SingleProductionUnitForm
              cropVarieties={cropVarieties}
              isLoadingVarieties={isLoadingVarieties}
              cultivarCatalog={cultivarCatalog}
              isLoadingCultivars={isLoadingCultivarCatalog}
              cultivarCatalogError={cultivarCatalogError}
              allocatedFields={allocatedFields}
              allFields={allFieldsWithSplits}
              dateRange={dateRange}
              productionUnits={productionUnits}
              editingUnitId={editingUnitId || undefined}
              showList={step2ShowList}
              onEditUnit={handleEditUnit}
              onDeleteUnit={handleDeleteUnit}
              onDeleteUnits={handleDeleteUnits}
              onSplitUnit={handleSplitUnit}
              onMoveField={handleMoveField}
              onRemoveFieldFromUnit={handleRemoveFieldFromUnit}
              onSave={(unit) => {
                if (editingUnitId) {
                  // Aggiorna l'unità esistente
                  setProductionUnits((prev) =>
                    prev.map((u) => (u.id === editingUnitId ? unit : u)),
                  );
                  setEditingUnitId(null);
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
              onCancel={() => {
                // Se stiamo modificando un'unità, torna alla lista
                // Se stiamo creando una nuova, torna alla selezione campi
                if (editingUnitId) {
                  setStep2ShowList(true);
                  setEditingUnitId(null);
                } else {
                  setCurrentStep(1);
                }
              }}
              isCreating={isCreating}
            />
          </div>
        )}

        {/* Footer Step 1 - FIXED BOTTOM (solo creazione manuale) */}
        {creationMode === "manual" && currentStep === 1 && (
          <div className="flex-shrink-0 border-t bg-white p-4 flex justify-end items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">
                SAU Totale Allocata
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalAllocatedSAU.toFixed(2)} Ha
              </p>
            </div>
            <Button
              onClick={() => {
                if (!canProceedToNextStep.canProceed) {
                  toast.error(
                    canProceedToNextStep.error || "Errore nella validazione",
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
