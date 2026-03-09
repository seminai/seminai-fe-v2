/**
 * Field allocation within a production unit
 */
export interface ExtractedFieldAllocation {
  fieldName: string;
  sezione: string | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  areaHa: number;
}

/**
 * Production unit cycle
 */
export interface ProductionUnitCycle {
  cycleIndex: number;
  cropName: string | null;
  cropType: string | null;
  cropCode: string | null;
  variety: string | null;
  occupazione: string | null;
  destinazione: string | null;
  protectionStructure: string | null;
  startDate: string | null;
  endDate: string | null;
  floweringDate: string | null;
  harvestingDate: string | null;
}

/**
 * Extracted field data from /onboarding/extract
 */
export interface ExtractedField {
  sourceFileId?: string | null;
  name: string;
  nation: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  cap: string | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  sezione: string | null;
  superficieCatastaleMq: number | null;
  gisHa: number | null;
  sauHa: number | null;
  variazioneMq: number | null;
  uso: string | null;
  qualita: string | null;
  soilType: string | null;
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  calcium: number | null;
  magnesium: number | null;
  latitude: number | null;
  longitude: number | null;
  inizioConduzione: string | null;
  fineConduzione: string | null;
}

/**
 * Extracted production unit data from /onboarding/extract
 */
export interface ExtractedProductionUnit {
  name: string;
  cropName: string | null;
  cropType: string | null;
  variety: string | null;
  protocoll: string | null;
  protectionStructure: string | null;
  startDate: string | null;
  endDate: string | null;
  floweringDate: string | null;
  harvestingDate: string | null;
  occupazione: string | null;
  destinazioneDiUso: string | null;
  areaHa: number;
  cycles: ProductionUnitCycle[];
  fieldAllocations: ExtractedFieldAllocation[];
}

/**
 * Response from POST /onboarding/extract
 */
export interface ExtractFromFileResponse {
  status: "success";
  data: {
    fields: ExtractedField[];
    productionUnits: ExtractedProductionUnit[];
    fieldCount: number;
    productionUnitCount: number;
  };
}

/**
 * Input for POST /onboarding/bulk-create
 */
export interface BulkCreateInput {
  companyId: string;
  fields: ExtractedField[];
  productionUnits: ExtractedProductionUnit[];
}

/**
 * Response from POST /onboarding/bulk-create
 */
export interface BulkCreateResponse {
  status: "success";
  data: {
    fields: Array<{
      id: string;
      companyId: string;
      name: string;
      foglio: string | null;
      particella: string | null;
      superficieCatastaleMq: number | null;
      sauHa: number | null;
      region: string | null;
      city: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    productionUnits: Array<{
      id: string;
      cycleId: string;
      name: string;
      cropName: string | null;
      cropType: string | null;
      variety: string | null;
      areaHa: number;
      startDate: string | null;
      endDate: string | null;
      createdAt: string;
    }>;
    fieldCount: number;
    productionUnitCount: number;
  };
}

/**
 * Response from POST /onboarding/extract/start
 */
export interface StartExtractResponse {
  status: "accepted";
  data: {
    jobId: string;
  };
}

/**
 * Response from GET /onboarding/extract/status/:jobId
 */
export interface ExtractJobStatusResponse {
  status: "success";
  data: {
    id: string;
    state: string;
    progress: number;
    phase?: string;
    message?: string;
    failedReason?: string;
  };
}
