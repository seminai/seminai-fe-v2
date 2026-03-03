import { useState, useCallback, type ReactElement } from "react";
import { Upload, X, AlertCircle, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  brogliacciApiService,
  type BrogliacciPayload,
} from "@/api/brogliacci";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface BrogliacciImportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportRows: (payloads: BrogliacciPayload[]) => void;
}

export function BrogliacciImportDrawer({
  open,
  onOpenChange,
  onImportRows,
}: BrogliacciImportDrawerProps): ReactElement {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(file.type)) {
      return `"${file.name}" non è un'immagine valida. Usa JPG, PNG o WebP.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" supera i 10MB.`;
    }
    return null;
  };

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const filesToAdd: File[] = [];
      const errors: string[] = [];

      Array.from(newFiles).forEach((file) => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          return;
        }
        // Skip duplicates by name
        const alreadyAdded =
          files.some((f) => f.name === file.name && f.size === file.size) ||
          filesToAdd.some((f) => f.name === file.name && f.size === file.size);
        if (!alreadyAdded) {
          filesToAdd.push(file);
        }
      });

      if (errors.length > 0) {
        setError(errors.join(" "));
      } else {
        setError(null);
      }

      if (filesToAdd.length > 0) {
        setFiles((prev) => [...prev, ...filesToAdd]);
      }
    },
    [files],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
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
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset input so same files can be re-selected
      e.target.value = "";
    },
    [addFiles],
  );

  const handleExtract = useCallback(async () => {
    if (files.length === 0) return;

    setIsExtracting(true);
    setError(null);
    const toastId = toast.loading(
      `Estrazione in corso da ${files.length} ${files.length === 1 ? "immagine" : "immagini"}... Potrebbe richiedere fino a un minuto.`,
    );

    try {
      const response = await brogliacciApiService.extractBrogliacci(files);
      const allPayloads: BrogliacciPayload[] = [];
      const failedFiles: string[] = [];

      for (const result of response.data.results) {
        if (result.status === "extracted" && result.payload) {
          allPayloads.push(...result.payload);
        } else if (result.status === "failed") {
          failedFiles.push(result.fileName);
        }
      }

      if (failedFiles.length > 0) {
        toast.warning(
          `Estrazione parziale: ${failedFiles.length} file non elaborati`,
          {
            id: toastId,
            description: failedFiles.join(", "),
          },
        );
      }

      if (allPayloads.length > 0) {
        onImportRows(allPayloads);

        // Check for products with missing registration numbers
        const productsWithoutRegNumber = allPayloads
          .flatMap((p) => p.stocks)
          .filter((s) => !s.product.registrationNumber)
          .map((s) => s.product.name);

        if (productsWithoutRegNumber.length > 0) {
          const uniqueNames = [...new Set(productsWithoutRegNumber)];
          toast.warning(
            "Numero di registrazione non trovato",
            {
              description: `I seguenti prodotti non hanno un numero di registrazione: ${uniqueNames.join(", ")}. Verifica che il prodotto selezionato sia corretto.`,
              duration: 10000,
            },
          );
        }

        if (failedFiles.length === 0) {
          toast.success(
            `Dati estratti da ${response.data.results.length} ${response.data.results.length === 1 ? "brogliaccio" : "brogliacci"}`,
            { id: toastId },
          );
        }
        // Close drawer and reset
        setFiles([]);
        onOpenChange(false);
      } else {
        toast.error("Nessun dato estratto dai brogliacci", { id: toastId });
      }
    } catch (err) {
      toast.error("Errore durante l'estrazione", {
        id: toastId,
        description:
          err instanceof Error ? err.message : "Riprova più tardi",
      });
    } finally {
      setIsExtracting(false);
    }
  }, [files, onImportRows, onOpenChange]);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (isExtracting) return; // Don't close while extracting
      if (!nextOpen) {
        setFiles([]);
        setError(null);
      }
      onOpenChange(nextOpen);
    },
    [isExtracting, onOpenChange],
  );

  return (
    <Drawer open={open} onOpenChange={handleClose} direction="right">
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="!w-[95vw] !max-w-[95vw] sm:!w-[480px] sm:!max-w-[480px] overflow-x-hidden"
      >
        <DrawerHeader>
          <DrawerTitle>Importa Brogliaccio</DrawerTitle>
          <DrawerDescription>
            Carica una o più immagini di brogliacci per estrarre
            automaticamente i dati dei trattamenti.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 transition-all duration-200",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-gray-300 hover:border-gray-400",
              isExtracting && "opacity-50 pointer-events-none",
            )}
          >
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              id="brogliacci-file-input"
              disabled={isExtracting}
            />

            <div className="flex flex-col items-center justify-center text-center">
              <Upload
                className={cn(
                  "h-12 w-12 mb-4 transition-colors",
                  isDragging ? "text-primary" : "text-gray-400",
                )}
              />
              <h3 className="text-lg font-medium mb-2">
                Trascina qui le immagini
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                oppure clicca per selezionare
              </p>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() =>
                  document.getElementById("brogliacci-file-input")?.click()
                }
                disabled={isExtracting}
              >
                Seleziona Immagini
              </Button>
              <p className="text-xs text-gray-400 mt-4">
                Formati: JPG, PNG, WebP (max 10MB per file)
              </p>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">
                {files.length} {files.length === 1 ? "file selezionato" : "file selezionati"}
              </p>
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2"
                >
                  <ImageIcon className="h-4 w-4 text-neutral-500 shrink-0" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  {!isExtracting && (
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-neutral-400 hover:text-neutral-600 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DrawerFooter>
          <Button
            onClick={handleExtract}
            disabled={files.length === 0 || isExtracting}
            className="w-full"
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Estrazione in corso...
              </>
            ) : (
              "Estrai dati"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
