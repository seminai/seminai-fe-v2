import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export type FileMetadata = {
  size: number;
  mimeType: string;
  uploadedBy: string;
  customTag?: string;
};

export type CompanyFile = {
  id: string;
  name: string;
  url: string;
  companyId: string;
  path: string;
  type: string;
  metadata: FileMetadata;
  createdAt: string;
  updatedAt: string;
};

export type FilesListResponse = {
  status: "success";
  data: {
    files: CompanyFile[];
  };
};

export type FileDetailResponse = {
  status: "success";
  data: {
    file: CompanyFile;
  };
};

export type UploadFileRequest = {
  file: File;
  companyId: string;
  path: string;
  type: string;
};

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function getCompanyFiles(
  companyId: string,
  baseUrl: string = BASE_URL
): Promise<FilesListResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/files?companyId=${encodeURIComponent(companyId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load files");
  }

  return (await response.json()) as FilesListResponse;
}

export async function getFile(
  fileId: string,
  baseUrl: string = BASE_URL
): Promise<FileDetailResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/files/${encodeURIComponent(fileId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to load file");
  }

  return (await response.json()) as FileDetailResponse;
}

export async function uploadFile(
  request: UploadFileRequest,
  baseUrl: string = BASE_URL
): Promise<FileDetailResponse> {
  const formData = new FormData();
  formData.append("file", request.file);
  formData.append("companyId", request.companyId);
  formData.append("path", request.path);
  formData.append("type", request.type);

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/files/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to upload file");
  }

  return (await response.json()) as FileDetailResponse;
}

export type BulkDeleteFilesRequest = {
  ids: string[];
  companyId: string;
};

export type BulkDeleteFilesResponse = {
  status: "success";
  data: {
    deleted: number;
  };
};

export async function bulkDeleteFiles(
  request: BulkDeleteFilesRequest,
  baseUrl: string = BASE_URL
): Promise<BulkDeleteFilesResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/files/bulk`,
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
    throw new Error(errorText || "Failed to delete files");
  }

  return (await response.json()) as BulkDeleteFilesResponse;
}

export type UpdateFileRequest = {
  name?: string;
  type?: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

export async function updateFile(
  fileId: string,
  request: UpdateFileRequest,
  baseUrl: string = BASE_URL
): Promise<FileDetailResponse> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/files/${encodeURIComponent(fileId)}`,
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
    throw new Error(errorText || "Failed to update file");
  }

  return (await response.json()) as FileDetailResponse;
}

class FilesApiService {
  private readonly baseUrl: string;

  public constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getCompanyFiles(companyId: string): Promise<FilesListResponse> {
    return await getCompanyFiles(companyId, this.baseUrl);
  }

  public async getFile(fileId: string): Promise<FileDetailResponse> {
    return await getFile(fileId, this.baseUrl);
  }

  public async uploadFile(
    request: UploadFileRequest
  ): Promise<FileDetailResponse> {
    return await uploadFile(request, this.baseUrl);
  }

  public async bulkDeleteFiles(
    request: BulkDeleteFilesRequest
  ): Promise<BulkDeleteFilesResponse> {
    return await bulkDeleteFiles(request, this.baseUrl);
  }

  public async updateFile(
    fileId: string,
    request: UpdateFileRequest
  ): Promise<FileDetailResponse> {
    return await updateFile(fileId, request, this.baseUrl);
  }
}

export const filesApiService = new FilesApiService(BASE_URL);
