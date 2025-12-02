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

export type JobHistoryEntry = {
  step: string;
  title: string;
  value: string | number;
  source: string;
  timestamp: string;
  metadata?: JobHistoryMetadata;
};

export type Job = {
  id: string;
  jobId: string;
  productionUnitId: string;
  dateOfOpeation: string;
  isVerified: boolean;
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

export type JobWithRelations = {
  job: Job;
  productionUnit: ProductionUnit;
  fields: Field[];
  company: Company;
  products: Product[];
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
}

export const jobsApiService = new JobsApiService(BASE_URL);
