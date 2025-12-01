import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";
// Types for starting a dosage job
export type DosageProduct = {
  productName: string;
  registrationNumber: string;
  quantity: number;
  quantityUnitOfMeasure: string;
  loadWarehouse: boolean;
  supplierName?: string;
  supplierVat?: string;
};

export type DosageUnitOfProduction = {
  id: string;
  name: string;
  cropName: string;
  cropType: string;
  variety: string;
  cropVariety: string;
  areaHa: number;
  startDate: string;
  floweringDate: string | null;
  harvestingDate: string | null;
  endDate: string | null;
  protocoll: string;
  protectionStructure: string;
  disciplinari: string[];
  occupazione: string | null;
  destinazioneDiUso: string | null;
  acquaTotalePeridoL: number | null;
};

export type DosageStrategy = "min" | "max" | "avg" | "current";

export type StartDosageJobRequest = {
  products: DosageProduct[];
  unitOfProduction: DosageUnitOfProduction[];
  strategy: DosageStrategy;
};

export type StartDosageJobResponse = {
  status: "success";
  data: {
    jobId: string;
    message: string;
  };
};

// Types for job status
export type DosageJobState = "waiting" | "active" | "completed" | "failed";

export type DosageJobStatusData = {
  productsCount: number;
  unitsCount: number;
  userId: string;
};

export type DosageDosageInfo = {
  minDosage: number;
  maxDosage: number;
  recommendedDosage: number;
  unitOfMeasure: string;
};

export type DosageProductResult = {
  productName: string;
  registrationNumber: string;
  quantity: number;
  quantityUnitOfMeasure: string;
  dosage?: DosageDosageInfo;
  label?: unknown; // Label completo
  extractionConfidence?: number;
};

export type UnitScheduledJob = {
  id: string;
  scheduledDate: string;
  product: string;
  dosage: string;
  notes?: string;
};

export type DosageOutcome = {
  unitProductionId: string;
  cropName: string;
  variety: string;
  areaHa: number;
  products: DosageProductResult[];
  jobs: UnitScheduledJob[];
};

export type StockBalanceProduct = {
  productName: string;
  registrationNumber: string;
  availableStock: number;
  requiredStock: number;
  difference: number;
};

export type StockBalance = {
  productsOverused: number;
  productsWithinLimit: number;
  products: StockBalanceProduct[];
};

export type DosageJobResult = {
  outcome: DosageOutcome[];
  outcomeWithDosage: DosageOutcome[];
  stockBalance: StockBalance;
};

export type DosageJobStatus = {
  id: string;
  state: DosageJobState;
  progress: number;
  data: DosageJobStatusData;
  result?: DosageJobResult;
  processedOn: number;
  finishedOn: number | null;
};

export type DosageJobStatusResponse = {
  status: "success";
  data: DosageJobStatus;
};

export type CancelDosageJobsRequest = {
  jobIds: string[];
};

export type CancelDosageJobsResponse = {
  status: "success" | string;
  data?: unknown;
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

// Start a new dosage calculation job
export async function startDosageJob(
  request: StartDosageJobRequest,
  baseUrl: string = BASE_URL
): Promise<StartDosageJobResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/dosage-agent/start-job`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to start dosage job");
  }

  return (await response.json()) as StartDosageJobResponse;
}

// Get status of a dosage job
export async function getDosageJobStatus(
  jobId: string,
  baseUrl: string = BASE_URL
): Promise<DosageJobStatusResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/dosage-agent/job-status/${jobId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to get job status");
  }

  return (await response.json()) as DosageJobStatusResponse;
}

export async function cancelDosageJobs(
  payload: CancelDosageJobsRequest,
  baseUrl: string = BASE_URL
): Promise<CancelDosageJobsResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/jobs/bulk`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to cancel jobs");
  }

  if (response.status === 204) {
    return { status: "success" };
  }

  try {
    return (await response.json()) as CancelDosageJobsResponse;
  } catch {
    return { status: "success" };
  }
}

class DosageAgentApiService {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async startJob(
    request: StartDosageJobRequest
  ): Promise<StartDosageJobResponse> {
    return await startDosageJob(request, this.baseUrl);
  }

  public async getJobStatus(jobId: string): Promise<DosageJobStatusResponse> {
    return await getDosageJobStatus(jobId, this.baseUrl);
  }

  public async cancelJobs(jobIds: string[]): Promise<CancelDosageJobsResponse> {
    return await cancelDosageJobs({ jobIds }, this.baseUrl);
  }
}

export const dosageAgentApiService = new DosageAgentApiService(BASE_URL);
