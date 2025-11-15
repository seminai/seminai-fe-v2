import { AuthorizedHeadersBuilder } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export type Job = {
  id: string;
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
  token: string,
  companyName?: string,
  baseUrl: string = BASE_URL
): Promise<GetJobsResponse> {
  const url = new URL(`${baseUrl}/jobs/me`);
  if (companyName) {
    url.searchParams.append("companyName", companyName);
  }

  console.log("Calling API:", url.toString());

  const headersBuilder = new AuthorizedHeadersBuilder(token);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: headersBuilder.build({
      Accept: "application/json",
    }),
    credentials: "include",
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
  token: string,
  jobId: string,
  payload: UpdateJobPayload,
  baseUrl: string = BASE_URL
): Promise<UpdateJobResponse> {
  console.log("Updating job:", jobId, payload);

  const headersBuilder = new AuthorizedHeadersBuilder(token);

  const response = await fetch(`${baseUrl}/jobs/${jobId}`, {
    method: "PUT",
    headers: headersBuilder.build({
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    credentials: "include",
    body: JSON.stringify(payload),
  });

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
  token: string,
  payload: BulkDeleteJobsPayload,
  baseUrl: string = BASE_URL
): Promise<BulkDeleteJobsResponse> {
  console.log("Bulk deleting jobs:", payload);

  const headersBuilder = new AuthorizedHeadersBuilder(token);

  const response = await fetch(`${baseUrl}/jobs/bulk`, {
    method: "DELETE",
    headers: headersBuilder.build({
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    credentials: "include",
    body: JSON.stringify(payload),
  });

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

  public async getJobs(
    token: string,
    companyName?: string
  ): Promise<GetJobsResponse> {
    return await getJobs(token, companyName, this.baseUrl);
  }

  public async updateJob(
    token: string,
    jobId: string,
    payload: UpdateJobPayload
  ): Promise<UpdateJobResponse> {
    return await updateJob(token, jobId, payload, this.baseUrl);
  }

  public async bulkDelete(
    token: string,
    payload: BulkDeleteJobsPayload
  ): Promise<BulkDeleteJobsResponse> {
    return await bulkDeleteJobs(token, payload, this.baseUrl);
  }
}

export const jobsApiService = new JobsApiService(BASE_URL);
