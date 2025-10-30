import * as React from "react";
import { useState, useCallback } from "react";
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface CsvFieldImporterProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  className?: string;
}

/**
 * CsvFieldImporter - Componente per l'importazione di file CSV con drag & drop
 * Gestisce l'upload dei file e fornisce feedback visivo all'utente
 */
export function CsvFieldImporter({
  onFileSelect,
  isProcessing = false,
  className,
}: CsvFieldImporterProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: "Formato file non valido. Usa file CSV, XLSX o XLS.",
      };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: "File troppo grande. Dimensione massima: 10MB.",
      };
    }

    return { valid: true };
  };

  const handleFileSelection = useCallback(
    (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || "File non valido");
        setSelectedFile(null);
        return;
      }

      setError(null);
      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    },
    [handleFileSelection]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    },
    [handleFileSelection]
  );

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-all duration-200",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-gray-300 hover:border-gray-400",
          isProcessing && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
          id="csv-file-input"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <Upload
            className={cn(
              "h-12 w-12 mb-4 transition-colors",
              isDragging ? "text-primary" : "text-gray-400"
            )}
          />

          <h3 className="text-lg font-medium mb-2">Trascina qui il file CSV</h3>

          <p className="text-sm text-gray-500 mb-4">
            oppure clicca per selezionare un file
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("csv-file-input")?.click()}
            disabled={isProcessing}
          >
            Seleziona File
          </Button>

          <p className="text-xs text-gray-400 mt-4">
            Formati supportati: CSV, XLSX, XLS (max 10MB)
          </p>
        </div>
      </div>

      {selectedFile && (
        <Alert className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <AlertDescription>
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({(selectedFile.size / 1024).toFixed(2)} KB)
                </span>
              </AlertDescription>
            </div>
          </div>
          {!isProcessing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFile}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
