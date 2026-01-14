import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export type JobHistoryMetadata = {
  productionUnitId?: string;
  productionUnitName?: string;
  productId?: string;
  productName?: string;
  productRegistrationNumber?: string;
  companyId?: string;
  companyName?: string;
  cropName?: string;
  variety?: string;
  areaHa?: number;
  stockId?: string;
  stockQuantity?: number;
  stockUnit?: string;
  description?: string;
};

// Tipo per le modifiche manuali dell'utente
export type JobModificationChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type JobModificationEntry = {
  type: "modification";
  timestamp: string;
  modifiedBy: {
    userId: string;
    name: string;
    email: string;
  };
  changes: JobModificationChange[];
  previousJobSnapshot?: Record<string, unknown>;
};

// Entry standard dello storico (senza type o con type diverso da "modification")
export type JobStandardHistoryEntry = {
  type?: string;
  step: string;
  title: string;
  value: string | number;
  source: string;
  timestamp: string;
  metadata?: JobHistoryMetadata;
};

// Union type per supportare entrambi i tipi di entry
export type JobHistoryEntry = JobStandardHistoryEntry | JobModificationEntry;

// Type guard per distinguere i tipi di entry
export function isJobModificationEntry(
  entry: JobHistoryEntry
): entry is JobModificationEntry {
  return (entry as JobModificationEntry).type === "modification";
}

export function isJobStandardHistoryEntry(
  entry: JobHistoryEntry
): entry is JobStandardHistoryEntry {
  return !isJobModificationEntry(entry);
}

export type Job = {
  id: string;
  jobId: string;
  productionUnitId: string;
  dateOfOpeation: string;
  isVerified: boolean;
  conformityChecked: boolean;
  category: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  productQuantityTreated: number | null;
  unitOfMeasureProductQuantityTreated: string | null;
  modeOfApplication: string;
  avversity: string | null;
  giustification: string | null;
  treatedSurface: number;
  isLocalizedTreatment: boolean;
  userId: string;
  note: string;
  history: JobHistoryEntry[];
  totalDistributedWaterL: number | null;
  machineId: string | null;
  alertNotes?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type ProductionUnit = {
  id: string;
  name: string;
  cropName: string;
  cropType: string;
};

export type Field = {
  id: string;
  name: string;
};

export type Company = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  registrationNumber: string | null;
};

export type Machine = {
  id: string;
  name: string;
  identifier: string;
  lastPositiveRevisionDate: string | null;
};

export type JobWithRelations = {
  job: Job;
  productionUnit: ProductionUnit;
  fields: Field[];
  company: Company;
  products: Product[];
  machine: Machine | null;
};

export type GetJobsResponse = {
  status: "success" | string;
  data: {
    jobs: JobWithRelations[];
  };
};

export type UpdateJobPayload = {
  isVerified?: boolean;
  quantity?: number;
  dateOfOpeation?: string;
  machineId?: string | null;
  userId?: string;
  isLocalizedTreatment?: boolean;
  modeOfApplication?: string;
};

export type UpdateJobResponse = {
  status: "success" | string;
  data?: unknown;
};

export type BulkDeleteJobsPayload = {
  jobIds: string[];
};

export type BulkDeleteJobsResponse = {
  status: "success" | string;
  data?: unknown;
};

// Types for create-product-and-job endpoint
export type CreateJobProductStock = {
  product: {
    name: string;
    category: string;
    type: string;
    registrationNumber: string;
    sku?: string;
  };
  quantity: number;
  unitOfMeasureQuantity: string;
  price?: number;
  unitOfMeasurePrice?: string;
  type: "OUT" | "IN";
};

export type CreateJobPayload = {
  productionUnitId: string;
  dateOfOpeation: string;
  category: string;
  quantity: number;
  unitOfMeasureQuantity: string;
  stocks: CreateJobProductStock[];
  jobId?: string; // Optional: if provided, the job will be added to an existing job group
};

export type CreateProductAndJobResponse = {
  status: "success" | string;
  data?: {
    jobs: JobWithRelations[];
  };
};

// Types for groups-summary endpoint
export type JobGroupSummaryCompany = {
  id: string;
  name: string;
};

export type JobGroupSummaryItem = {
  jobId: string;
  createdAt: string;
  company: JobGroupSummaryCompany;
  totalOperations: number;
  verifiedOperations: number;
  pendingOperations: number;
};

export type GetJobGroupsSummaryResponse = {
  status: "success" | string;
  data: {
    groups: JobGroupSummaryItem[];
  };
};

// Types for group/{jobId} endpoint
export type GetJobGroupDetailResponse = {
  status: "success" | string;
  data: {
    jobs: JobWithRelations[];
  };
};

// Types for verified jobs endpoint with pagination
export type PaginationInfo = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type GetVerifiedJobsResponse = {
  status: "success" | string;
  data: {
    jobs: JobWithRelations[];
    pagination: PaginationInfo;
  };
};

export async function getJobs(
  companyName?: string,
  baseUrl: string = BASE_URL
): Promise<GetJobsResponse> {
  const url = new URL(`${baseUrl}/jobs/me`);
  if (companyName) {
    url.searchParams.append("companyName", companyName);
  }

  console.log("Calling API:", url.toString());

  const response = await authenticatedHttpClient.request(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  console.log("API response status:", response.status);

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error("API error response:", errorText);
    throw new Error(errorText || "Get jobs failed");
  }

  const jsonData = await response.json();
  console.log("API response data:", jsonData);

  return jsonData as GetJobsResponse;
}

export async function updateJob(
  jobId: string,
  payload: UpdateJobPayload,
  baseUrl: string = BASE_URL
): Promise<UpdateJobResponse> {
  console.log("Updating job:", jobId, payload);

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/jobs/${jobId}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  console.log("Update job response status:", response.status);

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error("Update job error:", errorText);
    throw new Error(errorText || "Update job failed");
  }

  const jsonData = await response.json();
  console.log("Update job response data:", jsonData);

  return jsonData as UpdateJobResponse;
}

export async function bulkDeleteJobs(
  payload: BulkDeleteJobsPayload,
  baseUrl: string = BASE_URL
): Promise<BulkDeleteJobsResponse> {
  console.log("Bulk deleting jobs:", payload);

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

  console.log("Bulk delete response status:", response.status);

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error("Bulk delete error:", errorText);
    throw new Error(errorText || "Bulk delete jobs failed");
  }

  const jsonData = await response.json();
  console.log("Bulk delete response data:", jsonData);

  return jsonData as BulkDeleteJobsResponse;
}

export async function getJobGroupsSummary(
  baseUrl: string = BASE_URL
): Promise<GetJobGroupsSummaryResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/jobs/groups-summary`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error("Get job groups summary error:", errorText);
    throw new Error(errorText || "Get job groups summary failed");
  }

  const jsonData = await response.json();
  return jsonData as GetJobGroupsSummaryResponse;
}

export async function getJobGroupDetail(
  jobId: string,
  baseUrl: string = BASE_URL
): Promise<GetJobGroupDetailResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/jobs/group/${jobId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error("Get job group detail error:", errorText);
    throw new Error(errorText || "Get job group detail failed");
  }

  const jsonData = await response.json();
  return jsonData as GetJobGroupDetailResponse;
}

export async function createProductAndJob(
  payload: CreateJobPayload[],
  baseUrl: string = BASE_URL
): Promise<CreateProductAndJobResponse> {
  console.log("Creating product and job:", payload);

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/jobs/create-product-and-job`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  console.log("Create product and job response status:", response.status);

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error("Create product and job error:", errorText);
    throw new Error(errorText || "Create product and job failed");
  }

  const jsonData = await response.json();
  console.log("Create product and job response data:", jsonData);

  return jsonData as CreateProductAndJobResponse;
}

export async function getVerifiedJobs(
  options: {
    companyName?: string;
    page?: number;
    limit?: number;
  } = {},
  baseUrl: string = BASE_URL
): Promise<GetVerifiedJobsResponse> {
  const url = new URL(`${baseUrl}/jobs/me/verified`);
  
  if (options.companyName) {
    url.searchParams.append("companyName", options.companyName);
  }
  if (options.page !== undefined) {
    url.searchParams.append("page", String(options.page));
  }
  if (options.limit !== undefined) {
    url.searchParams.append("limit", String(options.limit));
  }

  console.log("Calling verified jobs API:", url.toString());

  const response = await authenticatedHttpClient.request(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  console.log("Verified jobs API response status:", response.status);

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error("Verified jobs API error response:", errorText);
    throw new Error(errorText || "Get verified jobs failed");
  }

  const jsonData = await response.json();
  console.log("Verified jobs API response data:", jsonData);

  return jsonData as GetVerifiedJobsResponse;
}

class JobsApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getJobs(companyName?: string): Promise<GetJobsResponse> {
    return await getJobs(companyName, this.baseUrl);
  }

  public async updateJob(
    jobId: string,
    payload: UpdateJobPayload
  ): Promise<UpdateJobResponse> {
    return await updateJob(jobId, payload, this.baseUrl);
  }

  public async bulkDelete(
    payload: BulkDeleteJobsPayload
  ): Promise<BulkDeleteJobsResponse> {
    return await bulkDeleteJobs(payload, this.baseUrl);
  }

  public async getGroupsSummary(): Promise<GetJobGroupsSummaryResponse> {
    return await getJobGroupsSummary(this.baseUrl);
  }

  public async getGroupDetail(
    jobId: string
  ): Promise<GetJobGroupDetailResponse> {
    return await getJobGroupDetail(jobId, this.baseUrl);
  }

  public async createProductAndJob(
    payload: CreateJobPayload[]
  ): Promise<CreateProductAndJobResponse> {
    return await createProductAndJob(payload, this.baseUrl);
  }

  public async getVerifiedJobs(options?: {
    companyName?: string;
    page?: number;
    limit?: number;
  }): Promise<GetVerifiedJobsResponse> {
    return await getVerifiedJobs(options, this.baseUrl);
  }
}

export const jobsApiService = new JobsApiService(BASE_URL);
