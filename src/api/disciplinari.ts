import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

// Document metadata
export interface DisciplinariDocumentMetadata {
  region: string;
  year: number;
  version?: string;
  title?: string;
  sourceUrlOrFile?: string;
  validFrom?: string;
  validUntil?: string;
  isExpired?: boolean;
}

// Scope entities
export interface DisciplinariScopeEntity {
  crop?: {
    name: string;
    group?: string;
  };
  section?: {
    name: string;
  };
  subsection?: {
    name: string;
  };
}

// Rules
export interface DisciplinariRules {
  generalPrinciples?: string[];
  prohibitions?: string[];
  mandatoryActions?: string[];
  definitions?: Array<{
    term: string;
    definition: string;
  }>;
}

// Intervention details
export interface DisciplinariIntervention {
  productOrActive?: {
    name: string;
    normalized?: string;
  };
  formulation?: string;
  dose?: {
    min?: number;
    max?: number;
    unit?: string;
    notes?: string;
  };
  applications?: {
    min?: number;
    max?: number;
    scope?: string;
  };
  interval?: {
    minDays?: number;
  };
  phi?: {
    preharvestIntervalDays?: number;
  };
  phenology?: {
    from?: string;
    to?: string;
  };
  constraints?: string[];
  environmentalConstraints?: string[];
  resistanceManagement?: string[];
  notes?: string;
  sourceLocator?: {
    page?: number;
    tableId?: string;
    rowHint?: string;
  };
}

// Defense target
export interface DisciplinariDefenseTarget {
  target?: {
    name: string;
    type?: string;
  };
  monitoring?: string[];
  agronomicMeasures?: string[];
  biologicalMeasures?: string[];
  interventions?: DisciplinariIntervention[];
}

// Full extracted data
export interface DisciplinariExtractedData {
  documentMetadata?: DisciplinariDocumentMetadata;
  scopeEntities?: DisciplinariScopeEntity[];
  rules?: DisciplinariRules;
  defenseTargets?: DisciplinariDefenseTarget[];
  normalizationOutputs?: unknown;
  extractionConfidence?: number;
  extractionErrors?: string[];
}

// Summary type for list views
export interface DisciplinariSummary {
  id: string;
  region: string;
  year: number;
  title?: string;
  version?: string;
  validFrom?: string;
  validUntil?: string;
  isExpired: boolean;
  extractionConfidence: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Detail type for single item view
export interface DisciplinariDetail {
  id: string;
  region: string;
  year: number;
  title?: string;
  version?: string;
  sourceUrl?: string;
  bucketUrl?: string;
  fileHash?: string;
  extractedData: DisciplinariExtractedData;
  rawText?: string;
  extractionConfidence: number;
  extractionErrors: string[];
  isVerified: boolean;
  validFrom?: string;
  validUntil?: string;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface DisciplinariSummaryResponse {
  status: "success";
  data: DisciplinariSummary[];
}

export interface DisciplinariDetailResponse {
  status: "success";
  data: DisciplinariDetail;
}

export interface DisciplinariSearchResponse {
  status: "success";
  data: DisciplinariDetail[];
}

// Upload/extraction types
export interface ExtractJobStartResponse {
  status: "success";
  data: {
    jobId: string;
    filesQueued: number;
    forceReExtract: boolean;
    message: string;
  };
}

export interface ExtractJobResultItem {
  fileName: string;
  status: "extracted" | "cached" | "failed";
  fileHash?: string;
  bucketUrl?: string;
  data?: DisciplinariExtractedData;
  error?: string;
}

export interface ExtractJobCost {
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  costWithMarginUsd: number;
}

export interface ExtractJobResult {
  results: ExtractJobResultItem[];
  totalProcessed: number;
  totalExtracted: number;
  totalCached: number;
  totalFailed: number;
  cost?: ExtractJobCost;
}

export type DisciplinariJobState =
  | "active"
  | "waiting"
  | "completed"
  | "failed";

export interface DisciplinariJobStatusActive {
  id: string;
  state: "active" | "waiting";
  progress: number;
}

export interface DisciplinariJobStatusCompleted {
  id: string;
  state: "completed";
  progress: 100;
  result: ExtractJobResult;
}

export interface DisciplinariJobStatusFailed {
  id: string;
  state: "failed";
  progress: number;
  failedReason: string;
}

export type DisciplinariJobStatus =
  | DisciplinariJobStatusActive
  | DisciplinariJobStatusCompleted
  | DisciplinariJobStatusFailed;

// Validity check
export interface ValidityCheckResponse {
  status: "success";
  data: {
    exists: boolean;
    isValid: boolean;
    isExpired: boolean;
    validUntil?: string;
    needsUpdate: boolean;
    lastUpdated?: string;
  };
}

// Bulk delete
export interface BulkDeleteResponse {
  status: "success";
  message: string;
  deleted_count: number;
}

// Helper function
async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

class DisciplinariApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = `${baseUrl}/disciplinari`;
  }

  /**
   * Get summary list of all disciplinari
   */
  public async getSummary(): Promise<DisciplinariSummaryResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/summary`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to load disciplinari summary");
    }

    return (await response.json()) as DisciplinariSummaryResponse;
  }

  /**
   * Get detail by ID
   */
  public async getById(id: string): Promise<DisciplinariDetailResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to load disciplinare detail");
    }

    return (await response.json()) as DisciplinariDetailResponse;
  }

  /**
   * Upload and extract data from PDF files
   */
  public async extractFromPdf(
    files: File[],
    options: { concurrency?: number; forceReExtract?: boolean } = {},
  ): Promise<ExtractJobStartResponse> {
    const { concurrency = 3, forceReExtract = false } = options;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("concurrency", String(concurrency));
    formData.append("forceReExtract", String(forceReExtract));

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/extract-data-from-disciplinari`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to start extraction");
    }

    return (await response.json()) as ExtractJobStartResponse;
  }

  /**
   * Get job status
   */
  public async getJobStatus(jobId: string): Promise<DisciplinariJobStatus> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/job-status/${encodeURIComponent(jobId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to get job status");
    }

    const result = await response.json();
    return result.data as DisciplinariJobStatus;
  }

  /**
   * Poll job status until completion
   */
  public async pollJobStatus(
    jobId: string,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      onProgress?: (progress: number, state: DisciplinariJobState) => void;
    } = {},
  ): Promise<DisciplinariJobStatus> {
    const { intervalMs = 2000, timeoutMs = 300000, onProgress } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getJobStatus(jobId);

      if (onProgress) {
        onProgress(status.progress, status.state);
      }

      if (status.state === "completed" || status.state === "failed") {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Polling timeout exceeded");
  }

  /**
   * Search disciplinari by region and year
   */
  public async search(params: {
    region?: string;
    year?: number;
  }): Promise<DisciplinariSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params.region) queryParams.append("region", params.region);
    if (params.year) queryParams.append("year", String(params.year));

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/search?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to search disciplinari");
    }

    return (await response.json()) as DisciplinariSearchResponse;
  }

  /**
   * Get expired disciplinari
   */
  public async getExpired(): Promise<DisciplinariSummaryResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/expired`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to get expired disciplinari");
    }

    return (await response.json()) as DisciplinariSummaryResponse;
  }

  /**
   * Check validity of a disciplinare
   */
  public async checkValidity(params: {
    region: string;
    year: number;
  }): Promise<ValidityCheckResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("region", params.region);
    queryParams.append("year", String(params.year));

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/check-validity?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to check validity");
    }

    return (await response.json()) as ValidityCheckResponse;
  }

  /**
   * Bulk delete disciplinari
   */
  public async bulkDelete(ids: string[]): Promise<BulkDeleteResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/bulk`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ ids }),
      },
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to delete disciplinari");
    }

    return (await response.json()) as BulkDeleteResponse;
  }
}

export const disciplinariApiService = new DisciplinariApiService(BASE_URL);
