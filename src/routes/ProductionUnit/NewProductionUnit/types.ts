export type CropVariety = {
  code: string;
  species: string;
  cropType: string;
  sowingPeriod: { minDate: string; maxDate: string };
  floweringPeriod: { minDate: string; maxDate: string };
  harvestPeriod: { minDate: string; maxDate: string };
  estimatedYield: { min: number; max: number };
};

export type ProductionUnitInput = {
  id: string;
  name: string;
  cropCode: string;
  allocations: Map<string, number>;
  protectionStructure: string;
  occupazione: string;
  destinazioneDiUso: string;
  acquaTotalePeridoL: number;
  customSowingDate?: Date | null;
  customFloweringDate?: Date | null;
  customHarvestingDate?: Date | null;
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

