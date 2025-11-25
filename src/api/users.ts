import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL;

export type CurrentUser = {
  id: string;
  email: string;
  password?: string;
  name: string;
  surname: string;
  fiscalCode: string;
  companyId: string;
  companyName: string;
  vatNumber: string;
  phoneNumber: string;
  address: string;
  profilePictureUrl: string;
  emailVerified: boolean;
  credits: number;
  createdAt: string;
  updatedAt: string;
};

export type UsersMeResponse = {
  status: "success";
  data: {
    user: CurrentUser;
  };
};

export type UpdateCurrentUserRequest = Partial<
  Pick<
    CurrentUser,
    | "name"
    | "surname"
    | "fiscalCode"
    | "companyName"
    | "vatNumber"
    | "phoneNumber"
    | "address"
    | "profilePictureUrl"
  >
>;

export type UpdateCurrentUserResponse = UsersMeResponse;

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function getCurrentUserWithBearer(
  baseUrl: string = BASE_URL
): Promise<UsersMeResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/users/me`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Unauthorized");
  }

  return (await response.json()) as UsersMeResponse;
}

class UsersApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async updateCurrentUserWithBearer(
    payload: UpdateCurrentUserRequest
  ): Promise<UpdateCurrentUserResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/users/me`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Update failed");
    }

    return (await response.json()) as UpdateCurrentUserResponse;
  }

  public async uploadProfilePictureWithBearer(
    file: File
  ): Promise<UsersMeResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/users/me/profile-picture`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Upload failed");
    }

    return (await response.json()) as UsersMeResponse;
  }
}

export const usersApiService = new UsersApiService(BASE_URL);

export async function updateCurrentUserWithBearer(
  payload: UpdateCurrentUserRequest,
  baseUrl: string = BASE_URL
): Promise<UpdateCurrentUserResponse> {
  // Delegate to the OOP service to keep a consistent API surface
  const service =
    baseUrl === BASE_URL ? usersApiService : new UsersApiService(baseUrl);
  return await service.updateCurrentUserWithBearer(payload);
}

export async function uploadProfilePictureWithBearer(
  file: File,
  baseUrl: string = BASE_URL
): Promise<UsersMeResponse> {
  const service =
    baseUrl === BASE_URL ? usersApiService : new UsersApiService(baseUrl);
  return await service.uploadProfilePictureWithBearer(file);
}
