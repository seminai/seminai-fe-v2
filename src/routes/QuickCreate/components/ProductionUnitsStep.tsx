import * as React from "react";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type {
  ExtractedField,
  ExtractedProductionUnit,
  ExtractedFieldAllocation,
} from "@/api/quick-create";
import type {
  ProductionUnitInput,
  FieldWithCompany,
  DateRange,
  ProductionUnitSplitPart,
} from "@/routes/ProductionUnit/NewProductionUnit/types";
import { useCropVarieties } from "@/routes/ProductionUnit/NewProductionUnit/hooks/useCropVarieties";
import { useCultivarHarvestDates } from "@/routes/ProductionUnit/NewProductionUnit/hooks/useCultivarHarvestDates";
import { SingleProductionUnitForm } from "@/routes/ProductionUnit/NewProductionUnit/components/SingleProductionUnitForm";
import { distributeAllocationsProportionally } from "@/routes/ProductionUnit/NewProductionUnit/utils";
import { toast } from "sonner";

interface ProductionUnitsStepProps {
  fieldsData: ExtractedField[];
  productionUnitsData: ExtractedProductionUnit[];
  companyId: string;
  onProductionUnitsChange: (pus: ExtractedProductionUnit[]) => void;
  error: string | null;
}

function adaptFieldsToFieldWithCompany(
  fields: ExtractedField[],
  companyId: string,
): FieldWithCompany[] {
  return fields.map((f, i) => ({
    id: `temp-field-${i}`,
    name: f.name,
    companyId: companyId || "temp-company",
    companyName: "",
    areaAvailable: f.sauHa || (f.superficieCatastaleMq ? f.superficieCatastaleMq / 10000 : 0),
    city: f.city,
    foglio: f.foglio,
    particella: f.particella,
    sezione: f.sezione,
    uso: f.uso,
  }));
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split("T")[0];
}

function adaptExtractedPUsToInputs(
  extractedPUs: ExtractedProductionUnit[],
  fieldsData: ExtractedField[],
  companyId: string | null,
): ProductionUnitInput[] {
  return extractedPUs.map((pu, index) => {
    const allocations = new Map<string, number>();
    const allocationsWithDetails: Array<{
      fieldId: string;
      fieldName: string;
      areaHa: number;
      foglio: string | null;
      particella: string | null;
      sezione: string | null;
    }> = [];

    // Use fieldAllocations from the extracted PU to link to fields
    for (const fa of pu.fieldAllocations) {
      const fieldIndex = fieldsData.findIndex((f) => f.name === fa.fieldName);
      const fieldId =
        fieldIndex >= 0
          ? `temp-field-${fieldIndex}`
          : `unknown-field-${fa.fieldName}`;
      allocations.set(fieldId, fa.areaHa);
      allocationsWithDetails.push({
        fieldId,
        fieldName: fa.fieldName,
        areaHa: fa.areaHa,
        foglio: fa.foglio,
        particella: fa.particella,
        sezione: fa.sezione,
      });
    }

    return {
      id: `pu-qc-${Date.now()}-${index}`,
      name: pu.name,
      cropCode: "",
      cultivarId: null,
      totalAreaHa: pu.areaHa || null,
      allocations,
      allocationsWithDetails,
      protectionStructure: pu.protectionStructure || "",
      occupazione: pu.occupazione || "",
      destinazioneDiUso: pu.destinazioneDiUso || "",
      acquaTotalePeridoL: 0,
      customSowingDate: parseDate(pu.startDate),
      customFloweringDate: parseDate(pu.floweringDate),
      customHarvestingDate: parseDate(pu.harvestingDate),
      importedCropName: pu.cropName,
      importedCropType: pu.cropType,
      importedVariety: pu.variety,
      importedCompanyId: companyId,
    };
  });
}

/**
 * Convert ProductionUnitInput[] back to ExtractedProductionUnit[] for the bulk-create API.
 * Uses original extracted data as base when available, overlaying user modifications.
 */
function convertPUInputsToExtracted(
  inputs: ProductionUnitInput[],
  originalPUsMap: Map<string, ExtractedProductionUnit>,
  fieldsData: ExtractedField[],
): ExtractedProductionUnit[] {
  return inputs.map((input) => {
    const original = originalPUsMap.get(input.id);

    const fieldAllocations: ExtractedFieldAllocation[] = (
      input.allocationsWithDetails || []
    ).map((d) => ({
      fieldName: d.fieldName,
      sezione: d.sezione || null,
      foglio: d.foglio || null,
      particella: d.particella || null,
      subalterno: null,
      areaHa: d.areaHa,
    }));

    // If we have the original, merge user changes on top
    if (original) {
      return {
        ...original,
        name: input.name,
        areaHa: input.totalAreaHa ?? original.areaHa,
        protectionStructure:
          input.protectionStructure || original.protectionStructure,
        occupazione: input.occupazione || original.occupazione,
        destinazioneDiUso:
          input.destinazioneDiUso || original.destinazioneDiUso,
        startDate: formatDate(input.customSowingDate) ?? original.startDate,
        endDate: original.endDate,
        floweringDate:
          formatDate(input.customFloweringDate) ?? original.floweringDate,
        harvestingDate:
          formatDate(input.customHarvestingDate) ?? original.harvestingDate,
        fieldAllocations,
      };
    }

    // New PU added by user - create from scratch
    return {
      name: input.name,
      cropName: input.importedCropName || null,
      cropType: input.importedCropType || null,
      variety: input.importedVariety || null,
      protocoll: null,
      protectionStructure: input.protectionStructure || null,
      startDate: formatDate(input.customSowingDate),
      endDate: formatDate(input.customHarvestingDate),
      floweringDate: formatDate(input.customFloweringDate),
      harvestingDate: formatDate(input.customHarvestingDate),
      occupazione: input.occupazione || null,
      destinazioneDiUso: input.destinazioneDiUso || null,
      areaHa: input.totalAreaHa ?? 0,
      cycles: [],
      fieldAllocations,
    };
  });
}

export default function ProductionUnitsStep({
  fieldsData,
  productionUnitsData,
  companyId,
  onProductionUnitsChange,
  error,
}: ProductionUnitsStepProps): React.ReactElement {
  const { varieties: cropVarieties, isLoading: isLoadingVarieties } =
    useCropVarieties();
  const {
    catalog: cultivarCatalog,
    isLoading: isLoadingCultivars,
    error: cultivarCatalogError,
  } = useCultivarHarvestDates();

  const adaptedFields = useMemo(
    () => adaptFieldsToFieldWithCompany(fieldsData, companyId),
    [fieldsData, companyId],
  );

  // Map from PU input ID → original extracted PU (for converting back)
  const originalPUsMap = useRef<Map<string, ExtractedProductionUnit>>(
    new Map(),
  );

  const [productionUnits, setProductionUnits] = useState<
    ProductionUnitInput[]
  >(() => {
    const inputs = adaptExtractedPUsToInputs(
      productionUnitsData,
      fieldsData,
      companyId,
    );
    // Build the mapping from input ID → original extracted PU
    const map = new Map<string, ExtractedProductionUnit>();
    inputs.forEach((input, i) => {
      if (productionUnitsData[i]) {
        map.set(input.id, productionUnitsData[i]);
      }
    });
    originalPUsMap.current = map;
    return inputs;
  });

  // Sync modifications back to parent in extract format
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Debounce the sync to avoid excessive updates
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      const extracted = convertPUInputsToExtracted(
        productionUnits,
        originalPUsMap.current,
        fieldsData,
      );
      onProductionUnitsChange(extracted);
    }, 300);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [productionUnits, fieldsData, onProductionUnitsChange]);

  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);

  const allocatedFields = useMemo(() => {
    if (editingUnitId) {
      const unit = productionUnits.find((u) => u.id === editingUnitId);
      if (unit) return new Map(unit.allocations);
    }
    return new Map<string, number>();
  }, [editingUnitId, productionUnits]);

  const dateRange: DateRange = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
    };
  }, []);

  const updateUnits = useCallback(
    (updater: (prev: ProductionUnitInput[]) => ProductionUnitInput[]) => {
      setProductionUnits(updater);
    },
    [],
  );

  const handleEditUnit = useCallback(
    (unitId: string) => {
      const unitToEdit = productionUnits.find((u) => u.id === unitId);
      if (unitToEdit) {
        setEditingUnitId(unitId);
        setShowList(false);
      }
    },
    [productionUnits],
  );

  const handleDeleteUnit = useCallback(
    (unitId: string) => {
      // Also remove from original mapping
      originalPUsMap.current.delete(unitId);
      updateUnits((prev) => prev.filter((u) => u.id !== unitId));
      if (editingUnitId === unitId) {
        setEditingUnitId(null);
        setShowList(true);
      }
    },
    [editingUnitId, updateUnits],
  );

  const handleSplitUnit = useCallback(
    (originalUnitId: string, parts: ProductionUnitSplitPart[]) => {
      const originalUnit = productionUnits.find(
        (u) => u.id === originalUnitId,
      );
      if (!originalUnit) return;

      const originalExtracted = originalPUsMap.current.get(originalUnitId);

      const totalArea =
        originalUnit.totalAreaHa ??
        Array.from(originalUnit.allocations.values()).reduce(
          (sum, a) => sum + a,
          0,
        );

      const splitUnits: ProductionUnitInput[] = parts.map((part, index) => {
        const newId = `${originalUnitId}__pu_split__${index}`;
        // Carry the original extracted data for each split part
        if (originalExtracted) {
          originalPUsMap.current.set(newId, originalExtracted);
        }
        return {
          ...originalUnit,
          id: newId,
          name: part.name,
          totalAreaHa: part.areaHa,
          allocations: distributeAllocationsProportionally(
            originalUnit.allocations,
            totalArea,
            part.areaHa,
          ),
        };
      });

      // Remove original from mapping
      originalPUsMap.current.delete(originalUnitId);

      updateUnits((prev) => {
        const withoutOriginal = prev.filter((u) => u.id !== originalUnitId);
        return [...withoutOriginal, ...splitUnits];
      });

      toast.success(
        `Unità "${originalUnit.name}" frazionata in ${parts.length} parti`,
      );
    },
    [productionUnits, updateUnits],
  );

  const handleMoveField = useCallback(
    (
      sourceUnitId: string,
      targetUnitId: string,
      fieldId: string,
      areaHa: number,
    ) => {
      updateUnits((prev) => {
        const sourceUnit = prev.find((u) => u.id === sourceUnitId);
        const movedFieldDetail = sourceUnit?.allocationsWithDetails?.find(
          (d) => d.fieldId === fieldId,
        );

        return prev.map((unit) => {
          if (unit.id === sourceUnitId) {
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
                unit.totalAreaHa != null
                  ? Math.max(unit.totalAreaHa - areaHa, 0)
                  : null,
            };
          } else if (unit.id === targetUnitId) {
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
                unit.totalAreaHa != null ? unit.totalAreaHa + areaHa : null,
            };
          }
          return unit;
        });
      });
    },
    [updateUnits],
  );

  const handleRemoveFieldFromUnit = useCallback(
    (unitId: string, fieldId: string, areaHa: number) => {
      updateUnits((prev) =>
        prev.map((unit) => {
          if (unit.id === unitId) {
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
                unit.totalAreaHa != null
                  ? Math.max(unit.totalAreaHa - areaHa, 0)
                  : null,
            };
          }
          return unit;
        }),
      );
    },
    [updateUnits],
  );

  const handleSaveUnit = useCallback(
    (unit: ProductionUnitInput) => {
      if (editingUnitId) {
        updateUnits((prev) =>
          prev.map((u) => (u.id === editingUnitId ? unit : u)),
        );
        setEditingUnitId(null);
      } else {
        updateUnits((prev) => [...prev, unit]);
      }
      setShowList(true);
    },
    [editingUnitId, updateUnits],
  );

  const handleAddAnother = useCallback(() => {
    setEditingUnitId(null);
    setShowList(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (editingUnitId) {
      setShowList(true);
      setEditingUnitId(null);
    }
  }, [editingUnitId]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h2 className="text-xl font-semibold text-neutral-800 mb-2 text-center">
        Configura le Unità Produttive
      </h2>
      <p className="text-neutral-500 mb-6 text-center">
        {productionUnits.length} unità produttive trovate. Modifica, aggiungi o
        elimina le unità produttive.
      </p>
      <div className="flex-1 min-h-0">
        <SingleProductionUnitForm
          cropVarieties={cropVarieties}
          isLoadingVarieties={isLoadingVarieties}
          cultivarCatalog={cultivarCatalog}
          isLoadingCultivars={isLoadingCultivars}
          cultivarCatalogError={cultivarCatalogError}
          allocatedFields={allocatedFields}
          allFields={adaptedFields}
          dateRange={dateRange}
          productionUnits={productionUnits}
          editingUnitId={editingUnitId || undefined}
          showList={showList}
          onSave={handleSaveUnit}
          onAddAnother={handleAddAnother}
          onNext={() => {}}
          onCancel={handleCancel}
          onEditUnit={handleEditUnit}
          onDeleteUnit={handleDeleteUnit}
          onSplitUnit={handleSplitUnit}
          onMoveField={handleMoveField}
          onRemoveFieldFromUnit={handleRemoveFieldFromUnit}
          isCreating={false}
          hideFooter
        />
      </div>
      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
