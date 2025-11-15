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

type AuthorizedHeaders = Record<string, string>;

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function buildAuthorizedHeaders(
  token: string,
  headers: AuthorizedHeaders = {}
): AuthorizedHeaders {
  if (!token) {
    throw new Error("Missing authentication token");
  }

  return {
    Authorization: `Bearer ${token}`,
    ...headers,
  };
}

export async function getCompanies(
  token: string,
  baseUrl: string = BASE_URL
): Promise<CompaniesResponse> {
  const response = await fetch(`${baseUrl}/companies`, {
    method: "GET",
    headers: buildAuthorizedHeaders(token, {
      Accept: "application/json",
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load companies");
  }

  return (await response.json()) as CompaniesResponse;
}

export async function bulkCreateCompanies(
  token: string,
  request: BulkCompaniesRequest,
  baseUrl: string = BASE_URL
): Promise<BulkCompaniesResponse> {
  const response = await fetch(`${baseUrl}/companies/bulk`, {
    method: "POST",
    headers: buildAuthorizedHeaders(token, {
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    credentials: "include",
    body: JSON.stringify(request),
  });

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
  token: string,
  request: BulkCompaniesUpdateRequest,
  baseUrl: string = BASE_URL
): Promise<BulkCompaniesResponse> {
  const response = await fetch(`${baseUrl}/companies/bulk`, {
    method: "PUT",
    headers: buildAuthorizedHeaders(token, {
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update companies");
  }

  const data = await response.json();
  console.log("Risposta bulkUpdateCompanies:", data);
  return data as BulkCompaniesResponse;
}

class CompaniesApiService {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getAll(token: string): Promise<CompaniesResponse> {
    return await getCompanies(token, this.baseUrl);
  }

  public async bulkCreate(
    token: string,
    request: BulkCompaniesRequest
  ): Promise<BulkCompaniesResponse> {
    return await bulkCreateCompanies(token, request, this.baseUrl);
  }

  public async bulkUpdate(
    token: string,
    request: BulkCompaniesUpdateRequest
  ): Promise<BulkCompaniesResponse> {
    return await bulkUpdateCompanies(token, request, this.baseUrl);
  }
}

export const companiesApiService = new CompaniesApiService(BASE_URL);
