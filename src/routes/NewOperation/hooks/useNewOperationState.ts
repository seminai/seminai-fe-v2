import { useState, useMemo, useCallback, useEffect } from "react";
import { useCompanies } from "@/hooks/useCompanies";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/api/products";
import type { NewOperationStep, OperationMode } from "../types";

export function useNewOperationState() {
  const [currentStep, setCurrentStep] = useState<NewOperationStep>("company");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [operationMode, setOperationMode] = useState<OperationMode | null>(
    null,
  );

  // Global unit selection for automatic mode
  const [globalSelectedUnitIds, setGlobalSelectedUnitIds] = useState<string[]>(
    [],
  );

  // Fetch data
  const { companies } = useCompanies();
  const { productionUnits, isLoading: isLoadingUnits } = useProductionUnit({
    companyIds: selectedCompanyId ? [selectedCompanyId] : [],
  });

  const selectedCompanyName = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId)?.name;
  }, [companies, selectedCompanyId]);

  const {
    products: warehouseProducts,
    isLoading: isLoadingWarehouseProducts,
  } = useProducts(selectedCompanyName);

  // Company select options
  const companyOptions = useMemo(() => {
    return companies.map((c) => ({
      value: c.id,
      label: c.name,
    }));
  }, [companies]);

  // Production unit options with area
  const productionUnitOptions = useMemo(() => {
    return productionUnits.map((pu) => {
      const areaHa =
        typeof pu.productionUnit.areaHa === "number"
          ? pu.productionUnit.areaHa
          : pu.fields?.reduce((sum, f) => sum + (f.areaHaOnField ?? 0), 0);
      return {
        id: pu.productionUnit.id,
        name: pu.productionUnit.name,
        cropName: pu.productionUnit.cropName,
        cropType: pu.productionUnit.cropType ?? "",
        variety: pu.productionUnit.variety ?? "",
        areaHa: areaHa ?? 0,
        label: `${pu.productionUnit.name} (${pu.productionUnit.cropName})`,
      };
    });
  }, [productionUnits]);

  // Auto-select all units when production units load (only for automatic mode)
  useEffect(() => {
    if (productionUnits.length > 0 && operationMode === "automatic") {
      setGlobalSelectedUnitIds(
        productionUnits.map((pu) => pu.productionUnit.id),
      );
    }
  }, [productionUnits, operationMode]);

  // Reset downstream state when company changes
  const handleCompanyChange = useCallback((companyId: string) => {
    setSelectedCompanyId(companyId);
    setOperationMode(null);
    setCurrentStep("mode");
    setGlobalSelectedUnitIds([]);
  }, []);

  // Set mode and go to table step
  const handleModeChange = useCallback((mode: OperationMode) => {
    setOperationMode(mode);
    setCurrentStep("table");
  }, []);

  // Step navigation
  const goToStep = useCallback(
    (step: NewOperationStep) => {
      if (step === "company") {
        setCurrentStep("company");
        return;
      }
      if (step === "mode" && selectedCompanyId) {
        setCurrentStep("mode");
        return;
      }
      if (step === "table" && selectedCompanyId && operationMode) {
        setCurrentStep("table");
      }
    },
    [selectedCompanyId, operationMode],
  );

  const canGoToStep = useCallback(
    (step: NewOperationStep): boolean => {
      if (step === "company") return true;
      if (step === "mode") return !!selectedCompanyId;
      if (step === "table") return !!selectedCompanyId && !!operationMode;
      return false;
    },
    [selectedCompanyId, operationMode],
  );

  return {
    // Step
    currentStep,
    goToStep,
    canGoToStep,

    // Company
    selectedCompanyId,
    selectedCompanyName,
    companyOptions,
    handleCompanyChange,
    companies,

    // Mode
    operationMode,
    handleModeChange,

    // Production units
    productionUnits,
    productionUnitOptions,
    isLoadingUnits,
    globalSelectedUnitIds,
    setGlobalSelectedUnitIds,

    // Warehouse
    warehouseProducts: warehouseProducts as Product[],
    isLoadingWarehouseProducts,
  };
}
