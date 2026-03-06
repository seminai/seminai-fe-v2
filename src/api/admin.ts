import { authenticatedHttpClient } from "./http";
import { UserRole } from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL;

export type AdminApiError = Error & { code?: string };

export type AdminAccessStatusResponse = {
  status: "success";
  data: {
    isUnlocked: boolean;
    durationMinutes: number;
  };
};

export type AdminUnlockRequest = {
  password: string;
};

export type AdminUserCompanyMetrics = {
  companyId: string;
  companyName: string;
  companyRole: "ADMIN" | "EDITOR" | "VIEWER" | null;
  relationshipType: "OWNER" | "MEMBER" | "OWNER_MEMBER";
  usersCount: number;
  fieldsCount: number;
  productionUnitsCount: number;
  warehouseProductsCount: number;
};

export type AdminUserSummary = {
  userId: string;
  email: string;
  name: string;
  surname: string | null;
  role: UserRole;
  lastAccessAt: string | null;
  daysSinceLastAccess: number | null;
  isInactive: boolean;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  isDeactivated: boolean;
  deactivatedAt: string | null;
  deactivatedReason: string | null;
  ownedCompaniesCount: number;
  associatedCompaniesCount: number;
  totalRelevantCompaniesCount: number;
  jobGroupsCount: number;
  jobsCount: number;
  companies: AdminUserCompanyMetrics[];
};

export type AdminDashboardSummaryResponse = {
  status: "success";
  data: {
    totals: {
      totalUsers: number;
      inactiveUsers: number;
      blockedUsers: number;
      deactivatedUsers: number;
      totalCompanies: number;
      totalOwnedCompanies: number;
      totalJobs: number;
      totalJobGroups: number;
    };
    users: AdminUserSummary[];
  };
};

export type AdminSetUserBlockedRequest = {
  userId: string;
  isBlocked: boolean;
};

export type AdminDeactivateUserRequest = {
  userId: string;
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function parseAdminError(response: Response): Promise<AdminApiError> {
  try {
    const data = (await response.json()) as { message?: string; code?: string };
    const error = new Error(data.message || "Admin request failed") as AdminApiError;
    if (data.code) {
      error.code = data.code;
    }
    return error;
  } catch {
    const text = await safeReadText(response);
    return new Error(text || "Admin request failed") as AdminApiError;
  }
}

export async function getAdminAccessStatus(
  baseUrl: string = BASE_URL,
): Promise<AdminAccessStatusResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/admin/access-status`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw await parseAdminError(response);
  }
  return (await response.json()) as AdminAccessStatusResponse;
}

export async function unlockAdminAccess(
  payload: AdminUnlockRequest,
  baseUrl: string = BASE_URL,
): Promise<AdminAccessStatusResponse> {
  const response = await authenticatedHttpClient.request(`${baseUrl}/admin/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await parseAdminError(response);
  }
  return (await response.json()) as AdminAccessStatusResponse;
}

export async function getAdminDashboardSummary(
  baseUrl: string = BASE_URL,
): Promise<AdminDashboardSummaryResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/admin/data-totals`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw await parseAdminError(response);
  }
  return (await response.json()) as AdminDashboardSummaryResponse;
}

export async function setAdminUserBlockedStatus(
  payload: AdminSetUserBlockedRequest,
  baseUrl: string = BASE_URL,
): Promise<void> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/admin/users/${payload.userId}/block`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: payload.isBlocked }),
    },
  );
  if (!response.ok) {
    throw await parseAdminError(response);
  }
}

export async function deactivateAdminUser(
  payload: AdminDeactivateUserRequest,
  baseUrl: string = BASE_URL,
): Promise<void> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/admin/users/${payload.userId}/deactivate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  if (!response.ok) {
    throw await parseAdminError(response);
  }
}
