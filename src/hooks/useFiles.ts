import { useState, useEffect, useCallback, useRef } from "react";
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
  updateFileLocally: (fileId: string, updates: Partial<CompanyFile>) => void;
}

export function useFiles(companyId: string): UseFilesResult {
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const fetchFiles = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setIsError(false);
    setError(null);

    try {
      const response = await filesApiService.getCompanyFiles(companyId);
      setFiles(response.data.files);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    void fetchFiles();
  }, [fetchFiles]);

  const handleUploadFile = useCallback(
    async (request: UploadFileRequest) => {
      setIsUploading(true);
      try {
        await filesApiService.uploadFile(request);
        await fetchFiles();
      } finally {
        setIsUploading(false);
      }
    },
    [fetchFiles],
  );

  const updateFileLocally = useCallback(
    (fileId: string, updates: Partial<CompanyFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  return {
    files,
    isLoading,
    isError,
    error,
    refetch: fetchFiles,
    uploadFile: handleUploadFile,
    isUploading,
    updateFileLocally,
  };
}
