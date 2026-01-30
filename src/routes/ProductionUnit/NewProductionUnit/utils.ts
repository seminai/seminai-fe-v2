import type { CropVariety, ProductionUnitSplitPart } from "./types";

const FIELD_SPLIT_DELIMITER = "__split__";

const parseCropDate = (dateStr: string, referenceYear: number): Date => {
  const [day, month] = dateStr.split("-").map(Number);
  return new Date(referenceYear, month - 1, day);
};

const calculateCropDates = (crop: CropVariety, startDate: Date) => {
  const startYear = startDate.getFullYear();

  const sowingDate = parseCropDate(crop.sowingPeriod.minDate, startYear);
  const floweringDate = parseCropDate(crop.floweringPeriod.minDate, startYear);
  const harvestingDate = parseCropDate(crop.harvestPeriod.minDate, startYear);

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

const isSplitAllocationKey = (allocationKey: string): boolean =>
  allocationKey.includes(FIELD_SPLIT_DELIMITER);

const getBaseFieldIdFromAllocation = (allocationKey: string): string =>
  isSplitAllocationKey(allocationKey)
    ? allocationKey.split(FIELD_SPLIT_DELIMITER)[0]!
    : allocationKey;

const getSplitIndexFromAllocation = (allocationKey: string): number | null => {
  if (!isSplitAllocationKey(allocationKey)) {
    return null;
  }
  const parts = allocationKey.split(FIELD_SPLIT_DELIMITER);
  const lastPart = parts[parts.length - 1];
  const parsed = Number(lastPart);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildSplitAllocationKey = (fieldId: string, index: number): string =>
  `${fieldId}${FIELD_SPLIT_DELIMITER}${index}`;

const getSplitDisplayLabel = (allocationKey: string): string => {
  const index = getSplitIndexFromAllocation(allocationKey);
  if (index === null) {
    return "Area indipendente";
  }
  return `Area ${index}`;
};

const getCurrentYearRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  return { start, end };
};

const generateSplitUnitName = (originalName: string, index: number): string => {
  const baseName = originalName.replace(/\s+\d+$/, "").trim();
  return `${baseName} ${index + 1}`;
};

const distributeAllocationsProportionally = (
  originalAllocations: Map<string, number>,
  originalTotalArea: number,
  partAreaHa: number
): Map<string, number> => {
  if (originalTotalArea <= 0) {
    return new Map();
  }
  const ratio = partAreaHa / originalTotalArea;
  const newAllocations = new Map<string, number>();

  originalAllocations.forEach((area, fieldId) => {
    const newArea = parseFloat((area * ratio).toFixed(4));
    if (newArea > 0) {
      newAllocations.set(fieldId, newArea);
    }
  });

  return newAllocations;
};

const validateSplitSum = (
  parts: ProductionUnitSplitPart[],
  totalAreaHa: number,
  tolerance: number = 0.01
): { isValid: boolean; difference: number } => {
  const sum = parts.reduce((acc, part) => acc + part.areaHa, 0);
  const difference = Math.abs(sum - totalAreaHa);
  return {
    isValid: difference <= tolerance,
    difference,
  };
};

export {
  FIELD_SPLIT_DELIMITER,
  buildSplitAllocationKey,
  calculateCropDates,
  distributeAllocationsProportionally,
  generateSplitUnitName,
  getBaseFieldIdFromAllocation,
  getCurrentYearRange,
  getSplitDisplayLabel,
  getSplitIndexFromAllocation,
  isSplitAllocationKey,
  validateSplitSum,
};

