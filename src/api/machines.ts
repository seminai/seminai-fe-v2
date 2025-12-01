import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type Machine = {
  id: string;
  name: string;
  identifier: string;
  lastPositiveRevisionDate: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateMachineRequest = {
  name: string;
  identifier: string;
  companyId: string;
  lastPositiveRevisionDate?: string | null;
};

export type BulkCreateMachineRequest = {
  machines: CreateMachineRequest[];
};

export type UpdateMachineRequest = {
  name?: string;
  identifier?: string;
  lastPositiveRevisionDate?: string | null;
};

export type BulkDeleteMachineRequest = {
  ids: string[];
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

class MachinesApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async listByCompany(companyId: string): Promise<Machine[]> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/machines/company/${encodeURIComponent(companyId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to load company machines");
    }

    const payload = await response.json();
    if (payload?.status === "success" && payload?.data?.machines) {
      return payload.data.machines.map((item: Machine) =>
        this.normalizeMachine(item)
      );
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizeMachine(item));
    }

    return [];
  }

  public async bulkCreate(
    request: BulkCreateMachineRequest
  ): Promise<Machine[]> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/machines/bulk`,
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
      throw new Error(errorText || "Failed to create machines");
    }

    const payload = await response.json();
    if (payload?.status === "success" && payload?.data?.machines) {
      return payload.data.machines.map((item: Machine) =>
        this.normalizeMachine(item)
      );
    }

    return [];
  }

  public async update(
    machineId: string,
    request: UpdateMachineRequest
  ): Promise<Machine> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/machines/${encodeURIComponent(machineId)}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to update machine");
    }

    const payload = await response.json();
    if (payload?.status === "success" && payload?.data?.machine) {
      return this.normalizeMachine(payload.data.machine);
    }

    return this.normalizeMachine(payload);
  }

  public async bulkDelete(request: BulkDeleteMachineRequest): Promise<void> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/machines/bulk`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || "Failed to delete machines");
    }
  }

  private normalizeMachine(data: Partial<Machine>): Machine {
    return {
      id: data.id ?? "",
      name: data.name ?? "",
      identifier: data.identifier ?? "",
      lastPositiveRevisionDate: data.lastPositiveRevisionDate ?? null,
      companyId: data.companyId ?? "",
      createdAt: data.createdAt ?? "",
      updatedAt: data.updatedAt ?? "",
    };
  }
}

export const machinesApiService = new MachinesApiService(BASE_URL);

export function createMachinesApiService(
  baseUrl: string
): MachinesApiService {
  return new MachinesApiService(baseUrl);
}

