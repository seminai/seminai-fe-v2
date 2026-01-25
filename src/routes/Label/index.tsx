import * as React from "react";
import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labelsApiService, type LabelSummary } from "@/api/labels";
import {
  disciplinariApiService,
  type DisciplinariSummary,
} from "@/api/disciplinari";
import { Spinner } from "@/components/ui/spinner";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { buildColumns, formatConfidence } from "@/utils/tableHelpers";
import { toast } from "sonner";
import { PageHeader } from "@/components/organism/Header";
import { useMe, UserRole } from "@/hooks/useAuth";
import { Trash2, Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Columns for Labels table
const buildLabelSummaryColumns = (): EditableColumn[] =>
  buildColumns<LabelSummary>([
    {
      id: "productName",
      title: "Nome commerciale",
      type: "text",
      width: "25%",
    },
    {
      id: "registrationNumber",
      title: "Numero di registrazione",
      type: "text",
      width: "20%",
    },
    {
      id: "category",
      title: "Categoria",
      type: "text",
      width: "15%",
      render: (value: unknown) => {
        const category = value as string | undefined;
        if (!category) return "-";

        const label =
          category === "FITO"
            ? "Fitosanitario"
            : category === "FERTILIZER"
            ? "Fertilizzante"
            : category;

        const colorClass =
          category === "FITO"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            : category === "FERTILIZER"
            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
            : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";

        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
          >
            {label}
          </span>
        );
      },
    },
    {
      id: "isVerified",
      title: "Verificata",
      type: "text",
      width: "10%",
      render: (value: unknown) => {
        const isVerified = Boolean(value);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isVerified
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}
          >
            {isVerified ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Verificata
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                Non verificata
              </>
            )}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      title: "Data creazione",
      type: "text",
      width: "15%",
      render: (value: unknown) => {
        if (!value) return "-";
        const date = new Date(value as string);
        return new Intl.DateTimeFormat("it-IT", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);
      },
    },
    {
      id: "extractionConfidence",
      title: "Qualità estrazione",
      type: "number",
      width: "10%",
      render: (value: unknown) =>
        formatConfidence(
          typeof value === "number" ? value : Number(value ?? 0)
        ),
    },
  ]);

// Columns for Disciplinari table
const buildDisciplinariSummaryColumns = (): EditableColumn[] =>
  buildColumns<DisciplinariSummary>([
    {
      id: "region",
      title: "Regione",
      type: "text",
      width: "20%",
    },
    {
      id: "year",
      title: "Anno",
      type: "number",
      width: "10%",
    },
    {
      id: "title",
      title: "Titolo",
      type: "text",
      width: "25%",
      render: (value: unknown) => {
        const title = value as string | undefined;
        return title || "-";
      },
    },
    {
      id: "isExpired",
      title: "Stato",
      type: "text",
      width: "12%",
      render: (value: unknown) => {
        const isExpired = Boolean(value);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isExpired
                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            }`}
          >
            {isExpired ? "Scaduto" : "Valido"}
          </span>
        );
      },
    },
    {
      id: "isVerified",
      title: "Verificato",
      type: "text",
      width: "10%",
      render: (value: unknown) => {
        const isVerified = Boolean(value);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isVerified
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}
          >
            {isVerified ? "Verificato" : "Non verificato"}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      title: "Data creazione",
      type: "text",
      width: "13%",
      render: (value: unknown) => {
        if (!value) return "-";
        const date = new Date(value as string);
        return new Intl.DateTimeFormat("it-IT", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(date);
      },
    },
    {
      id: "extractionConfidence",
      title: "Qualità",
      type: "number",
      width: "10%",
      render: (value: unknown) =>
        formatConfidence(
          typeof value === "number" ? value : Number(value ?? 0)
        ),
    },
  ]);

// PDF File Uploader Component
interface PdfUploaderProps {
  onFileSelect: (files: File[]) => void;
  isProcessing?: boolean;
  multiple?: boolean;
}

function PdfUploader({
  onFileSelect,
  isProcessing = false,
  multiple = true,
}: PdfUploaderProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.type !== "application/pdf") {
      return {
        valid: false,
        error: `${file.name}: Formato non valido. Usa file PDF.`,
      };
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `${file.name}: File troppo grande. Dimensione massima: 50MB.`,
      };
    }

    return { valid: true };
  };

  const handleFileSelection = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      fileArray.forEach((file) => {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          errors.push(validation.error || "File non valido");
        }
      });

      if (errors.length > 0) {
        setError(errors.join("\n"));
      } else {
        setError(null);
      }

      if (validFiles.length > 0) {
        setSelectedFiles(validFiles);
        onFileSelect(validFiles);
      }
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
        handleFileSelection(files);
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
        handleFileSelection(files);
      }
    },
    [handleFileSelection]
  );

  const handleClearFiles = useCallback(() => {
    setSelectedFiles([]);
    setError(null);
  }, []);

  return (
    <div className={cn("space-y-4")}>
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
          accept=".pdf"
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          id="pdf-file-input"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <Upload
            className={cn(
              "h-12 w-12 mb-4 transition-colors",
              isDragging ? "text-primary" : "text-gray-400"
            )}
          />

          <h3 className="text-lg font-medium mb-2">
            Trascina qui i file PDF dei disciplinari
          </h3>

          <p className="text-sm text-gray-500 mb-4">
            oppure clicca per selezionare i file
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("pdf-file-input")?.click()}
            disabled={isProcessing}
          >
            Seleziona File
          </Button>

          <p className="text-xs text-gray-400 mt-4">
            Formato supportato: PDF (max 50MB per file)
          </p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <Alert className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <AlertDescription>
                <span className="font-medium">
                  {selectedFiles.length} file selezionat
                  {selectedFiles.length === 1 ? "o" : "i"}:
                </span>
                <ul className="mt-1 text-xs text-gray-500">
                  {selectedFiles.map((file, index) => (
                    <li key={index}>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </div>
          </div>
          {!isProcessing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFiles}
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
          <AlertDescription className="whitespace-pre-line">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function Label(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: userData } = useMe();
  const userRole = userData?.role;

  // Verifica se l'utente può modificare (solo ADMIN e LABEL_MANAGER)
  const canModify =
    userRole === UserRole.ADMIN || userRole === UserRole.LABEL_MANAGER;

  // State for labels
  const [selectedLabelRows, setSelectedLabelRows] = useState<
    Array<Record<string, unknown>>
  >([]);

  // State for disciplinari
  const [selectedDisciplinariRows, setSelectedDisciplinariRows] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  // Labels query
  const {
    data: labelsData,
    isLoading: labelsLoading,
    error: labelsError,
  } = useQuery({
    queryKey: ["labels", "summary"],
    queryFn: async () => labelsApiService.getSummary(),
  });

  // Disciplinari query
  const {
    data: disciplinariData,
    isLoading: disciplinariLoading,
    error: disciplinariError,
  } = useQuery({
    queryKey: ["disciplinari", "summary"],
    queryFn: async () => disciplinariApiService.getSummary(),
  });

  // Labels delete mutation
  const deleteLabelsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await labelsApiService.bulkDelete(ids);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["labels", "summary"] });
      toast.success(
        `${response.deleted_count} etichet${
          response.deleted_count === 1 ? "ta eliminata" : "te eliminate"
        } con successo`
      );
    },
    onError: (error: Error) => {
      toast.error(`Errore durante l'eliminazione: ${error.message}`);
    },
  });

  // Disciplinari delete mutation
  const deleteDisciplinariMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await disciplinariApiService.bulkDelete(ids);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["disciplinari", "summary"] });
      toast.success(
        `${response.deleted_count} disciplinar${
          response.deleted_count === 1 ? "e eliminato" : "i eliminati"
        } con successo`
      );
    },
    onError: (error: Error) => {
      toast.error(`Errore durante l'eliminazione: ${error.message}`);
    },
  });

  const labelColumns = buildLabelSummaryColumns();
  const disciplinariColumns = buildDisciplinariSummaryColumns();

  const labelItems: LabelSummary[] = useMemo(
    () => labelsData?.data ?? [],
    [labelsData]
  );
  const disciplinariItems: DisciplinariSummary[] = useMemo(
    () => disciplinariData?.data ?? [],
    [disciplinariData]
  );

  // Handler for labels deletion
  const handleDeleteLabels = (removedRows: Array<Record<string, unknown>>) => {
    const ids = removedRows.map((row) => String(row.id)).filter(Boolean);

    if (ids.length === 0) {
      toast.error("Nessun elemento selezionato per l'eliminazione");
      return;
    }

    const confirmMessage =
      ids.length === 1
        ? "Sei sicuro di voler eliminare questa etichetta?"
        : `Sei sicuro di voler eliminare ${ids.length} etichette?`;

    if (window.confirm(confirmMessage)) {
      deleteLabelsMutation.mutate(ids);
      setSelectedLabelRows([]);
    }
  };

  // Handler for disciplinari deletion
  const handleDeleteDisciplinari = (
    removedRows: Array<Record<string, unknown>>
  ) => {
    const ids = removedRows.map((row) => String(row.id)).filter(Boolean);

    if (ids.length === 0) {
      toast.error("Nessun elemento selezionato per l'eliminazione");
      return;
    }

    const confirmMessage =
      ids.length === 1
        ? "Sei sicuro di voler eliminare questo disciplinare?"
        : `Sei sicuro di voler eliminare ${ids.length} disciplinari?`;

    if (window.confirm(confirmMessage)) {
      deleteDisciplinariMutation.mutate(ids);
      setSelectedDisciplinariRows([]);
    }
  };

  // Handler for disciplinari extraction
  const handleExtractDisciplinari = async (files: File[]) => {
    if (files.length === 0) return;

    setIsExtracting(true);
    setExtractionProgress(0);

    try {
      toast.info("Avvio estrazione disciplinari...", {
        description: "L'operazione potrebbe richiedere alcuni minuti",
      });

      const response = await disciplinariApiService.extractFromPdf(files);
      const jobId = response.data.jobId;

      // Poll for job status
      const result = await disciplinariApiService.pollJobStatus(jobId, {
        intervalMs: 2000,
        timeoutMs: 600000, // 10 minutes
        onProgress: (progress, state) => {
          setExtractionProgress(progress);
          if (state === "active") {
            toast.info(`Estrazione in corso: ${progress}%`, {
              id: "extraction-progress",
            });
          }
        },
      });

      if (result.state === "completed") {
        queryClient.invalidateQueries({ queryKey: ["disciplinari", "summary"] });
        toast.success(
          `Estrazione completata: ${result.result.totalExtracted} estratti, ${result.result.totalCached} dalla cache`,
          { id: "extraction-progress" }
        );
        setIsDrawerOpen(false);
      } else if (result.state === "failed") {
        toast.error(`Estrazione fallita: ${result.failedReason}`, {
          id: "extraction-progress",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error(`Errore nell'estrazione: ${errorMessage}`);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(0);
    }
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!isExtracting) {
      setIsDrawerOpen(open);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Etichette e Disciplinari" className="hidden md:block" />

      <div className="flex-1 overflow-auto px-6 pb-6">
        <Tabs defaultValue="labels" className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="labels">
              <FileText className="w-4 h-4 mr-2" />
              Etichette
            </TabsTrigger>
            <TabsTrigger value="disciplinari">
              <FileText className="w-4 h-4 mr-2" />
              Disciplinari
            </TabsTrigger>
          </TabsList>

          {/* Labels Tab */}
          <TabsContent value="labels" className="h-[calc(100%-48px)]">
            {labelsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size={20} ariaLabel="Caricamento etichette" />
                <span>Caricamento etichette…</span>
              </div>
            ) : labelsError ? (
              <div className="text-sm text-red-600">
                Impossibile caricare le etichette.
              </div>
            ) : labelItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Nessuna etichetta disponibile</p>
              </div>
            ) : (
              <EditableTable
                columns={labelColumns}
                rows={labelItems}
                isModify={false}
                getRowId={(row, index) =>
                  (typeof row.id === "string" && row.id) || index
                }
                onDeleteSelected={canModify ? handleDeleteLabels : undefined}
                showDeleteAction={canModify && selectedLabelRows.length > 0}
                onSelectionChange={setSelectedLabelRows}
                onOpenDetails={(row) => navigate(`/label/${row.id}`)}
                className="bg-background"
                exportFileName="etichette"
              >
                {canModify && (
                  <Button
                    data-table-slot="right"
                    variant="ghost"
                    className="order-last gap-2"
                    onClick={() => navigate("/new-label")}
                  >
                    Aggiungi
                  </Button>
                )}
                {canModify && selectedLabelRows.length > 0 && (
                  <Button
                    data-table-slot="right"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => handleDeleteLabels(selectedLabelRows)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Elimina ({selectedLabelRows.length})
                  </Button>
                )}
              </EditableTable>
            )}
          </TabsContent>

          {/* Disciplinari Tab */}
          <TabsContent value="disciplinari" className="h-[calc(100%-48px)]">
            {disciplinariLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size={20} ariaLabel="Caricamento disciplinari" />
                <span>Caricamento disciplinari…</span>
              </div>
            ) : disciplinariError ? (
              <div className="text-sm text-red-600">
                Impossibile caricare i disciplinari.
              </div>
            ) : disciplinariItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm mb-4">Nessun disciplinare disponibile</p>
                {canModify && (
                  <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
                    <DrawerTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Carica disciplinare
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent
                      data-vaul-drawer-direction="right"
                      className="!w-1/2 !max-w-[50vw] h-full overflow-y-auto overflow-x-hidden bg-white p-2"
                    >
                      <DrawerHeader>
                        <DrawerTitle>Estrazione Disciplinari</DrawerTitle>
                        <DrawerDescription>
                          Carica uno o più file PDF dei disciplinari di produzione
                          integrata regionali. Il sistema estrarrà automaticamente i
                          dati strutturati.
                        </DrawerDescription>
                      </DrawerHeader>
                      <div className="p-4">
                        <PdfUploader
                          onFileSelect={handleExtractDisciplinari}
                          isProcessing={isExtracting}
                          multiple={true}
                        />
                        {isExtracting && (
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Spinner size={20} ariaLabel="Estrazione in corso" />
                              <span>Estrazione in corso...</span>
                            </div>
                            <Progress value={extractionProgress} className="h-2" />
                            <p className="text-xs text-gray-400 text-center">
                              {extractionProgress}% completato
                            </p>
                          </div>
                        )}
                      </div>
                    </DrawerContent>
                  </Drawer>
                )}
              </div>
            ) : (
              <EditableTable
                columns={disciplinariColumns}
                rows={disciplinariItems as unknown as Record<string, unknown>[]}
                isModify={false}
                getRowId={(row, index) =>
                  (typeof row.id === "string" && row.id) || index
                }
                onDeleteSelected={
                  canModify ? handleDeleteDisciplinari : undefined
                }
                showDeleteAction={
                  canModify && selectedDisciplinariRows.length > 0
                }
                onSelectionChange={setSelectedDisciplinariRows}
                onOpenDetails={(row) => navigate(`/disciplinari/${row.id}`)}
                className="bg-background"
                exportFileName="disciplinari"
              >
                {canModify && (
                  <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
                    <DrawerTrigger asChild>
                      <Button
                        data-table-slot="right"
                        variant="ghost"
                        className="order-last gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Aggiungi
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent
                      data-vaul-drawer-direction="right"
                      className="!w-1/2 !max-w-[50vw] h-full overflow-y-auto overflow-x-hidden bg-white p-2"
                    >
                      <DrawerHeader>
                        <DrawerTitle>Estrazione Disciplinari</DrawerTitle>
                        <DrawerDescription>
                          Carica uno o più file PDF dei disciplinari di produzione
                          integrata regionali. Il sistema estrarrà automaticamente i
                          dati strutturati.
                        </DrawerDescription>
                      </DrawerHeader>
                      <div className="p-4">
                        <PdfUploader
                          onFileSelect={handleExtractDisciplinari}
                          isProcessing={isExtracting}
                          multiple={true}
                        />
                        {isExtracting && (
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Spinner size={20} ariaLabel="Estrazione in corso" />
                              <span>Estrazione in corso...</span>
                            </div>
                            <Progress value={extractionProgress} className="h-2" />
                            <p className="text-xs text-gray-400 text-center">
                              {extractionProgress}% completato
                            </p>
                          </div>
                        )}
                      </div>
                    </DrawerContent>
                  </Drawer>
                )}
                {canModify && selectedDisciplinariRows.length > 0 && (
                  <Button
                    data-table-slot="right"
                    variant="destructive"
                    className="gap-2"
                    onClick={() =>
                      handleDeleteDisciplinari(selectedDisciplinariRows)
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                    Elimina ({selectedDisciplinariRows.length})
                  </Button>
                )}
              </EditableTable>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
