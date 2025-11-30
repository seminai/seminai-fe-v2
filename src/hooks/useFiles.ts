import { useState, useEffect, useCallback } from "react";
import {
  type CompanyFile,
  filesApiService,
  type UploadFileRequest,
} from "@/api/files";

interface UseFilesResult {
  files: CompanyFile[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  uploadFile: (request: UploadFileRequest) => Promise<void>;
  isUploading: boolean;
}

export function useFiles(companyId: string): UseFilesResult {
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await filesApiService.getCompanyFiles(companyId);
      setFiles(response.data.files);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  const handleUploadFile = useCallback(
    async (request: UploadFileRequest) => {
      setIsUploading(true);
      try {
        await filesApiService.uploadFile(request);
        await fetchFiles();
      } catch (err) {
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [fetchFiles]
  );

  return {
    files,
    isLoading,
    isError,
    error,
    refetch: fetchFiles,
    uploadFile: handleUploadFile,
    isUploading,
  };
}

