export type CropVariety = {
  code: string;
  species: string;
  cropType: string;
  sowingPeriod: { minDate: string; maxDate: string };
  floweringPeriod: { minDate: string; maxDate: string };
  harvestPeriod: { minDate: string; maxDate: string };
  estimatedYield: { min: number; max: number };
};

export type FieldAllocation = {
  fieldId: string;
  fieldName: string;
  areaHa: number;
  foglio: string | null;
  particella: string | null;
  sezione: string | null;
  subalterno?: string | null;
};

export type ProductionUnitInput = {
  id: string;
  name: string;
  cropCode: string;
  cultivarId?: string | null;
  totalAreaHa?: number | null;
  allocations: Map<string, number>;
  allocationsWithDetails?: FieldAllocation[];
  protectionStructure: string;
  occupazione: string;
  destinazioneDiUso: string;
  acquaTotalePeridoL: number;
  customSowingDate?: Date | null;
  customFloweringDate?: Date | null;
  customHarvestingDate?: Date | null;
  // Dati originali dall'import (usati come fallback se cropCode non è abbinato)
  importedCropName?: string | null;
  importedCropType?: string | null;
  importedVariety?: string | null;
  importedCompanyId?: string | null;
};

export type DateRange = {
  start: Date;
  end: Date;
};

export type FieldWithCompany = {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  areaAvailable: number;
  areaOccupied?: number;
  address?: string | null;
  city?: string | null;
  foglio?: string | null;
  particella?: string | null;
  sezione?: string | null;
  soilType?: string | null;
  uso?: string | null;
};

export type CultivarHarvestRecord = {
  id: string;
  species: string;
  cultivar: string;
  offsetDays: number | null;
  harvestLabel: string;
};

export type ProductionUnitSplitPart = {
  id: string;
  name: string;
  areaHa: number;
};
