const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type UserOnCompanyRole = "ADMIN" | "EDITOR" | string;

export type UserInfo = {
  id: string;
  name: string;
  email: string;
  surname: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
};

export type CompanyInfo = {
  id: string;
  name: string;
  email: string | null;
  vatNumber: string;
  fiscalCode: string;
};

export type UserOnCompany = {
  id: string;
  companyId: string;
  userId: string;
  type: string | null;
  role: UserOnCompanyRole;
  user?: UserInfo;
  company?: CompanyInfo;
};

export type CreateUserOnCompanyRequest = {
  companyId: string;
  email: string;
  name: string;
  role: UserOnCompanyRole;
};

export type CreateUserOnCompanyResponse = {
  status: "success" | string;
  data?: {
    userOnCompany: UserOnCompany;
  };
};

export type ListCompanyUsersResponse = {
  status: "success" | string;
  data?: {
    users: UserOnCompany[];
  };
};

export type UpdateUserOnCompanyRoleRequest = {
  role: UserOnCompanyRole;
  companyId: string;
};

export type UpdateUserOnCompanyRoleResponse = {
  status: "success" | string;
  data?: {
    userOnCompany: UserOnCompany;
  };
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

class UserOnCompanyApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async listByCompany(
    token: string,
    companyId: string
  ): Promise<ListCompanyUsersResponse> {
    const response = await fetch(
      `${this.baseUrl}/user-on-company/company/${encodeURIComponent(
        companyId
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to load company users");
    }

    return (await response.json()) as ListCompanyUsersResponse;
  }

  public async create(
    token: string,
    payload: CreateUserOnCompanyRequest
  ): Promise<CreateUserOnCompanyResponse> {
    const response = await fetch(`${this.baseUrl}/user-on-company`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to create user on company");
    }

    return (await response.json()) as CreateUserOnCompanyResponse;
  }

  public async delete(
    token: string,
    companyId: string,
    userId: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/user-on-company/company/${encodeURIComponent(
        companyId
      )}/user/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to remove user from company");
    }
  }

  public async updateRole(
    token: string,
    relationId: string,
    payload: UpdateUserOnCompanyRoleRequest
  ): Promise<UpdateUserOnCompanyRoleResponse> {
    const response = await fetch(
      `${this.baseUrl}/user-on-company/${encodeURIComponent(relationId)}/role`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to update company user role");
    }

    return (await response.json()) as UpdateUserOnCompanyRoleResponse;
  }
}

export const userOnCompanyApiService = new UserOnCompanyApiService(BASE_URL);

export function createUserOnCompanyApiService(
  baseUrl: string
): UserOnCompanyApiService {
  return new UserOnCompanyApiService(baseUrl);
}
