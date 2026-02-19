import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type Company = {
  id: string;
  name: string;
  vatNumber: string;
  ownerId: string | null;
  fiscalCode: string;
  cuaa: string | null;
  nation: string | null;
  city: string | null;
  address: string | null;
  cap: string | null;
  email: string | null;
  phoneNumber: string | null;
  website: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompaniesResponse = {
  status: "success";
  data: {
    companies: Company[];
  };
};

export type BulkCompanyInput = {
  name: string;
  vatNumber: string;
  fiscalCode: string;
  cuaa?: string | null;
  nation?: string | null;
  city?: string | null;
  address?: string | null;
  cap?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  logoUrl?: string | null;
};

export type BulkCompaniesRequest = {
  companies: BulkCompanyInput[];
};

export type BulkCompaniesResponse = {
  status: "success";
  data: {
    companies: Company[];
  };
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function getCompanies(
  baseUrl: string = BASE_URL
): Promise<CompaniesResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/companies`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load companies");
  }

  return (await response.json()) as CompaniesResponse;
}

export async function bulkCreateCompanies(
  request: BulkCompaniesRequest,
  baseUrl: string = BASE_URL
): Promise<BulkCompaniesResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/companies/bulk`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to create companies");
  }

  const data = await response.json();
  console.log("Risposta bulkCreateCompanies:", data);
  return data as BulkCompaniesResponse;
}

export type BulkCompanyUpdateInput = {
  id: string;
} & Partial<BulkCompanyInput>;

export type BulkCompaniesUpdateRequest = {
  companies: BulkCompanyUpdateInput[];
};

export async function bulkUpdateCompanies(
  request: BulkCompaniesUpdateRequest,
  baseUrl: string = BASE_URL
): Promise<BulkCompaniesResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/companies/bulk`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update companies");
  }

  const data = await response.json();
  console.log("Risposta bulkUpdateCompanies:", data);
  return data as BulkCompaniesResponse;
}

export type BulkDeleteCompaniesRequest = {
  companyIds: string[];
};

export async function bulkDeleteCompanies(
  request: BulkDeleteCompaniesRequest,
  baseUrl: string = BASE_URL
): Promise<{ status: "success" }> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/companies/bulk/all`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to delete companies");
  }

  return (await response.json()) as { status: "success" };
}

class CompaniesApiService {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getAll(): Promise<CompaniesResponse> {
    return await getCompanies(this.baseUrl);
  }

  public async bulkCreate(
    request: BulkCompaniesRequest
  ): Promise<BulkCompaniesResponse> {
    return await bulkCreateCompanies(request, this.baseUrl);
  }

  public async bulkUpdate(
    request: BulkCompaniesUpdateRequest
  ): Promise<BulkCompaniesResponse> {
    return await bulkUpdateCompanies(request, this.baseUrl);
  }

  public async bulkDelete(
    request: BulkDeleteCompaniesRequest
  ): Promise<{ status: "success" }> {
    return await bulkDeleteCompanies(request, this.baseUrl);
  }
}

export const companiesApiService = new CompaniesApiService(BASE_URL);
