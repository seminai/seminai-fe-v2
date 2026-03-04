import * as React from "react";
import { useState, useCallback } from "react";
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const VALID_EXTENSIONS = [".csv", ".xlsx", ".xls", ".pdf", ".shp", ".dbf", ".shx", ".zip"];
const SHAPEFILE_EXTENSIONS = [".shp", ".dbf", ".shx"];
const ACCEPTED_MIME_TYPES = ".csv,.xlsx,.xls,.pdf,.shp,.dbf,.shx,.zip";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getFileExtension(name: string): string {
  return name.substring(name.lastIndexOf(".")).toLowerCase();
}

function isShapefileComponent(file: File): boolean {
  return SHAPEFILE_EXTENSIONS.includes(getFileExtension(file.name));
}

interface CsvFieldImporterProps {
  onFileSelect: (files: File[]) => void;
  isProcessing?: boolean;
  className?: string;
}

/**
 * File importer with drag-and-drop supporting CSV, Excel, PDF, Shapefile (.shp+.dbf+.shx) and ZIP.
 */
export function CsvFieldImporter({
  onFileSelect,
  isProcessing = false,
  className,
}: CsvFieldImporterProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = (files: File[]): { valid: boolean; error?: string } => {
    for (const file of files) {
      const ext = getFileExtension(file.name);
      if (!VALID_EXTENSIONS.includes(ext)) {
        return { valid: false, error: `Formato "${ext}" non supportato. Usa CSV, XLSX, XLS, PDF, Shapefile (.shp/.dbf/.shx) o ZIP.` };
      }
      if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: `"${file.name}" troppo grande. Massimo 10 MB.` };
      }
    }

    const hasShpComponent = files.some(isShapefileComponent);
    if (hasShpComponent) {
      const hasShp = files.some((f) => getFileExtension(f.name) === ".shp");
      const hasDbf = files.some((f) => getFileExtension(f.name) === ".dbf");
      if (!hasShp || !hasDbf) {
        return { valid: false, error: "Per gli shapefile servono almeno i file .shp e .dbf. Selezionali insieme." };
      }
    }

    return { valid: true };
  };

  const handleFilesSelection = useCallback(
    (files: File[]) => {
      const validation = validateFiles(files);
      if (!validation.valid) {
        setError(validation.error ?? "File non valido");
        setSelectedFiles([]);
        return;
      }
      setError(null);
      setSelectedFiles(files);
      onFileSelect(files);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) handleFilesSelection(dropped);
    },
    [handleFilesSelection],
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
      if (files && files.length > 0) handleFilesSelection(Array.from(files));
    },
    [handleFilesSelection],
  );

  const handleClearFile = useCallback(() => {
    setSelectedFiles([]);
    setError(null);
  }, []);

  const displayLabel = selectedFiles.length === 1
    ? selectedFiles[0].name
    : `${selectedFiles.length} file selezionati`;

  const displaySize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

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
          isProcessing && "opacity-50 pointer-events-none",
        )}
      >
        <input
          type="file"
          accept={ACCEPTED_MIME_TYPES}
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          id="csv-file-input"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <Upload
            className={cn(
              "h-12 w-12 mb-4 transition-colors",
              isDragging ? "text-primary" : "text-gray-400",
            )}
          />

          <h3 className="text-lg font-medium mb-2">
            Trascina qui il file da importare
          </h3>

          <p className="text-sm text-gray-500 mb-4">
            oppure clicca per selezionare un file
          </p>

          <Button
            type="button"
            variant="default"
            onClick={() => document.getElementById("csv-file-input")?.click()}
            disabled={isProcessing}
          >
            Seleziona File
          </Button>

          <p className="text-xs text-gray-400 mt-4">
            Formati: CSV, XLSX, XLS, PDF, Shapefile (.shp + .dbf + .shx), ZIP
          </p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <Alert className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <AlertDescription>
                <span className="font-medium">{displayLabel}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({(displaySize / 1024).toFixed(2)} KB)
                </span>
              </AlertDescription>
            </div>
          </div>
          {!isProcessing && (
            <Button variant="ghost" size="sm" onClick={handleClearFile} className="h-6 w-6 p-0">
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
