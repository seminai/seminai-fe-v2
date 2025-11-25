const BASE_URL = import.meta.env.VITE_API_URL;

export enum UserRole {
  ADMIN = "ADMIN",
  BASIC = "BASIC",
  LABEL_MANAGER = "LABEL_MANAGER",
}

export type User = {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  status: "success";
  data: {
    token: string;
    user: User;
  };
};

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
  surname: string;
  fiscalCode: string;
  phoneNumber: string;
  address: string;
};

export type RegisterResponse = {
  status: "success";
  data: {
    user: User;
    message: string;
  };
};

export type MeResponse = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role: UserRole;
};

export type UpdatePasswordRequest = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type UpdatePasswordResponse = {
  status: "success";
  data: {
    message: string;
  };
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function login(
  payload: LoginRequest,
  baseUrl: string = BASE_URL
): Promise<LoginResponse> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Login failed");
  }

  return (await response.json()) as LoginResponse;
}

export async function register(
  payload: RegisterRequest,
  baseUrl: string = BASE_URL
): Promise<RegisterResponse> {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Registration failed");
  }

  return (await response.json()) as RegisterResponse;
}

export async function me(baseUrl: string = BASE_URL): Promise<MeResponse> {
  const response = await fetch(`${baseUrl}/auth/me`, {
    method: "GET",
    credentials: "include", // Il server legge il cookie httpOnly
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Unauthorized");
  }

  return (await response.json()) as MeResponse;
}

export async function updatePasswordWithBearer(
  payload: UpdatePasswordRequest,
  baseUrl: string = BASE_URL
): Promise<UpdatePasswordResponse> {
  const response = await fetch(`${baseUrl}/auth/update-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Update password failed");
  }

  return (await response.json()) as UpdatePasswordResponse;
}

export async function logout(baseUrl: string = BASE_URL): Promise<void> {
  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include", // Include i cookie httpOnly per invalidarli server-side
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Logout failed");
  }
}

export async function wakeUp(baseUrl: string = BASE_URL): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/wake-up`, { method: "GET" });
    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Wake-up call failed");
    }
    console.log("Backend is awake.");
  } catch (error) {
    console.error("Error waking up the backend:", error);
    // Non rilanciare l'errore per non bloccare l'app se il backend non risponde subito
  }
}
