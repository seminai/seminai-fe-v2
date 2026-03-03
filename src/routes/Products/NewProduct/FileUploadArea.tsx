import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const CSV_EXCEL_ACCEPT = ".csv,.xls,.xlsx";
const DDT_ACCEPT =
  "application/pdf,image/png,image/jpeg,image/jpg,.pdf,.png,.jpg,.jpeg";
const INVOICE_ACCEPT =
  ".pdf,.xml,image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg";

interface FileUploadAreaProps {
  mode: "csv" | "ddt" | "invoice";
  disabled?: boolean;
  isProcessing?: boolean;
  onConfirmExtraction: (files: File[]) => void;
}

class FileTypeValidator {
  public static validateCsvExcel(file: File): void {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["csv", "xls", "xlsx"].includes(ext)) {
      throw new Error("Formato non supportato. Usa file CSV o Excel.");
    }
  }

  public static validatePdf(file: File): void {
    const type = file.type?.toLowerCase() ?? "";
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isPdf = type === "application/pdf" || ext === "pdf";
    const isImage =
      ["image/png", "image/jpeg", "image/jpg"].includes(type) ||
      [".png", ".jpg", ".jpeg"].includes(`.${ext}`);
    if (!isPdf && !isImage) {
      throw new Error("Usa file PDF o immagini (PNG, JPG, JPEG) per DDT.");
    }
  }

  public static validateInvoice(file: File): void {
    const type = file.type?.toLowerCase() ?? "";
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isPdf = type === "application/pdf" || ext === "pdf";
    const isXml =
      type === "application/xml" || type === "text/xml" || ext === "xml";
    const isImage =
      ["image/png", "image/jpeg", "image/jpg"].includes(type) ||
      [".png", ".jpg", ".jpeg"].includes(`.${ext}`);
    if (!isPdf && !isXml && !isImage) {
      throw new Error(
        "Formato non supportato. Usa file PDF, XML o immagini (PNG, JPG, JPEG)."
      );
    }
  }
}

export default function FileUploadArea({
  mode,
  disabled,
  isProcessing,
  onConfirmExtraction,
}: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      try {
        if (mode === "csv") {
          if (fileArray.length > 0) {
            FileTypeValidator.validateCsvExcel(fileArray[0]);
            setSelectedFiles([fileArray[0]]);
          }
        } else if (mode === "invoice") {
          const validInvoiceFiles = fileArray.filter((f) => {
            try {
              FileTypeValidator.validateInvoice(f);
              return true;
            } catch {
              return false;
            }
          });
          if (validInvoiceFiles.length === 0) {
            throw new Error("Nessun file PDF, XML o immagine valido trovato.");
          }
          if (validInvoiceFiles.length > 10) {
            throw new Error("Massimo 10 file per upload.");
          }
          setSelectedFiles((prev) => {
            const existingNames = new Set(prev.map((f) => f.name));
            const newFiles = validInvoiceFiles.filter(
              (f) => !existingNames.has(f.name),
            );
            const combined = [...prev, ...newFiles];
            if (combined.length > 10) {
              setError("Massimo 10 file per upload.");
              return prev;
            }
            return combined;
          });
        } else {
          const pdfs = fileArray.filter((f) => {
            try {
              FileTypeValidator.validatePdf(f);
              return true;
            } catch {
              return false;
            }
          });
          if (pdfs.length === 0) {
            throw new Error("Nessun file PDF valido trovato.");
          }
          setSelectedFiles((prev) => {
            const existingNames = new Set(prev.map((f) => f.name));
            const newFiles = pdfs.filter((f) => !existingNames.has(f.name));
            return [...prev, ...newFiles];
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nel caricamento");
      }
    },
    [mode],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleInputChange = useCallback(() => {
    if (inputRef.current?.files?.length) handleFiles(inputRef.current.files);
  }, [handleFiles]);

  const handleRemoveFile = useCallback((file: File) => {
    setSelectedFiles((prev) => prev.filter((f) => f !== file));
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFiles([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedFiles.length > 0) {
      onConfirmExtraction(selectedFiles);
    }
  }, [selectedFiles, onConfirmExtraction]);

  const accept =
    mode === "csv"
      ? CSV_EXCEL_ACCEPT
      : mode === "invoice"
        ? INVOICE_ACCEPT
        : DDT_ACCEPT;
  const hasFiles = selectedFiles.length > 0;
  const supportsMultiple = mode === "ddt" || mode === "invoice";

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          hasFiles
            ? "border-green-500 bg-green-50/50"
            : dragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
        } ${disabled || isProcessing ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={supportsMultiple}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled || isProcessing}
        />

        <div className="space-y-2">
          {isProcessing ? (
            <>
              <Spinner size={36} ariaLabel="Elaborazione file" />
              <p className="text-sm text-gray-600">
                Estrazione in corso... Potrebbe richiedere alcuni secondi.
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm font-medium text-gray-700">
                {mode === "csv"
                  ? "Trascina qui il file CSV o Excel"
                  : mode === "invoice"
                    ? "Trascina qui le fatture (PDF, XML o immagini)"
                    : "Trascina qui i file DDT (PDF o immagini)"}
              </p>
              <p className="text-xs text-gray-500">
                oppure clicca per selezionare
              </p>
              <p className="text-xs text-gray-400">
                {mode === "csv"
                  ? "Formati: CSV, XLS, XLSX"
                  : mode === "invoice"
                    ? "Formati: PDF, XML, PNG, JPG, JPEG (max 10 file)"
                    : "Formati: PDF, PNG, JPG, JPEG (max 10 file)"}
              </p>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Lista file selezionati */}
      {hasFiles && !isProcessing && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {selectedFiles.length === 1
              ? "1 file selezionato"
              : `${selectedFiles.length} file selezionati`}
          </p>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {selectedFiles.map((file) => (
              <div
                key={`${file.name}-${file.lastModified}`}
                className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2 bg-white"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm truncate block">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(file);
                  }}
                  className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground text-xs"
            >
              Rimuovi tutti
            </Button>

            <div className="flex-1" />

            <Button
              size="sm"
              onClick={handleConfirm}
              className="gap-2 bg-agri-green-600 text-white hover:bg-agri-green-700"
            >
              <Search className="h-3.5 w-3.5" />
              Estrai prodotti
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
