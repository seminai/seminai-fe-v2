import * as React from "react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  labelsApiService,
  type BulkExtractItem,
  type BulkExtractRequest,
} from "@/api/labels";
import { authenticatedHttpClient } from "@/api/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Trash2, Plus, Upload, FileText, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { indexDBManager, type LabelJob } from "@/utils/indexDBManager";
import { PageHeader } from "@/components/organism/Header";
import Papa from "papaparse";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import { buildColumns } from "@/utils/tableHelpers";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, Trash2 as Trash2Icon } from "lucide-react";
import { useUserId } from "@/contexts/UserIdContext";

interface LabelFormItem extends BulkExtractItem {
  id: string;
}

type UploadMode = "manual" | "pdf";
type LabelType = "fitofarmaci" | "fertilizzanti";

interface PdfFile {
  id: string;
  file: File;
}

type LabelCsvRow = Record<string, string>;

class LabelCsvImporter {
  private readonly productNameKey: string;
  private readonly registrationNumberKey: string;

  constructor() {
    this.productNameKey = this.normalizeKey("nome prodotto");
    this.registrationNumberKey = this.normalizeKey("numero registrazione");
  }

  public parse(file: File): Promise<LabelFormItem[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<LabelCsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedItems: LabelFormItem[] = [];
          const rowErrors: string[] = [];

          results.data.forEach((row, index) => {
            const normalizedRow = this.normalizeRow(row);
            const nameValue = normalizedRow[this.productNameKey]?.trim() ?? "";
            const registrationValue =
              normalizedRow[this.registrationNumberKey]?.trim() ?? "";

            if (!nameValue || !registrationValue) {
              rowErrors.push(
                `Riga ${
                  index + 2
                }: campi obbligatori mancanti (nome prodotto, numero registrazione)`,
              );
              return;
            }

            parsedItems.push(
              this.createLabelItem(nameValue, registrationValue),
            );
          });

          if (rowErrors.length > 0) {
            reject(new Error(rowErrors.join(" | ")));
            return;
          }

          if (parsedItems.length === 0) {
            reject(
              new Error(
                "Nessuna etichetta valida trovata. Verifica il formato del file.",
              ),
            );
            return;
          }

          resolve(parsedItems);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  private normalizeKey(key: string): string {
    return key.trim().toLowerCase();
  }

  private normalizeRow(row: LabelCsvRow): Record<string, string> {
    return Object.entries(row).reduce(
      (acc, [key, value]) => {
        if (!key) return acc;
        acc[this.normalizeKey(key)] = (value ?? "").toString();
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  private createLabelItem(name: string, regNumber: string): LabelFormItem {
    return {
      id: crypto.randomUUID(),
      name,
      regNumber,
    };
  }
}

interface LabelJobRow extends Record<string, unknown> {
  id: string;
  jobId: string;
  fileNames: string;
  state: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  results: string;
  labelJob: LabelJob;
}

const buildLabelJobColumns = (): EditableColumn[] =>
  buildColumns<LabelJobRow>([
    {
      id: "jobId",
      title: "Job ID",
      type: "text",
      width: "10%",
      render: (value: unknown) => {
        const jobId = value as string;
        return (
          <span className="font-mono text-xs">{jobId.slice(0, 8)}...</span>
        );
      },
    },
    {
      id: "fileNames",
      title: "File",
      type: "text",
      width: "20%",
    },
    {
      id: "state",
      title: "Stato",
      type: "text",
      width: "12%",
      render: (value: unknown) => {
        const state = value as string;
        const getStateLabel = (
          state: string,
        ): {
          text: string;
          variant: "default" | "secondary" | "destructive" | "outline";
        } => {
          switch (state) {
            case "waiting":
              return { text: "In attesa", variant: "secondary" };
            case "active":
              return { text: "In elaborazione", variant: "default" };
            case "completed":
              return { text: "Completato", variant: "outline" };
            case "failed":
              return { text: "Fallito", variant: "destructive" };
            default:
              return { text: state, variant: "outline" };
          }
        };
        const stateLabel = getStateLabel(state);
        return <Badge variant={stateLabel.variant}>{stateLabel.text}</Badge>;
      },
    },
    {
      id: "progress",
      title: "Progresso",
      type: "text",
      width: "10%",
      render: (value: unknown, row: LabelJobRow) => {
        const progress = value as number;
        const state = row.state as string;
        if (state === "waiting" || state === "active") {
          return <Spinner size={16} />;
        }
        return <span className="text-xs text-gray-500">{progress}%</span>;
      },
    },
    {
      id: "createdAt",
      title: "Data Creazione",
      type: "text",
      width: "15%",
    },
    {
      id: "results",
      title: "Risultati",
      type: "text",
      width: "15%",
      render: (_value: unknown, row: LabelJobRow) => {
        const state = row.state as string;
        const labelJob = row.labelJob;
        if (state === "completed" && labelJob.result?.results) {
          const successCount = labelJob.result.results.filter(
            (r) => r.status === "extracted",
          ).length;
          const failCount = labelJob.result.results.filter(
            (r) => r.status === "failed",
          ).length;
          return (
            <div className="text-sm">
              <span className="text-green-600 font-medium">
                {successCount} successi
              </span>
              {failCount > 0 && (
                <>
                  {" / "}
                  <span className="text-red-600">{failCount} falliti</span>
                </>
              )}
            </div>
          );
        }
        if (state === "failed") {
          return (
            <div className="text-sm text-red-600">
              {labelJob.error || "Errore sconosciuto"}
            </div>
          );
        }
        return "-";
      },
    },
    {
      id: "updatedAt",
      title: "Data Completamento",
      type: "text",
      width: "15%",
    },
  ]);

export default function NewLabel(): React.ReactElement {
  const userId = useUserId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const csvImporter = useMemo(() => new LabelCsvImporter(), []);

  const [labelType, setLabelType] = useState<LabelType>("fitofarmaci");
  const [uploadMode, setUploadMode] = useState<UploadMode>("manual");
  const [items, setItems] = useState<LabelFormItem[]>([
    { id: crypto.randomUUID(), name: "", regNumber: "" },
  ]);
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [concurrency, setConcurrency] = useState<number>(5);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [isCsvImporting, setIsCsvImporting] = useState(false);
  const [jobs, setJobs] = useState<LabelJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [pollingJobIds, setPollingJobIds] = useState<Set<string>>(new Set());

  const duplicateItemIds = useMemo(() => {
    const occurrences = new Map<string, number>();
    items.forEach((item) => {
      const normalized = item.regNumber.trim().toLowerCase();
      if (!normalized) return;
      occurrences.set(normalized, (occurrences.get(normalized) ?? 0) + 1);
    });

    const duplicates = new Set<string>();
    items.forEach((item) => {
      const normalized = item.regNumber.trim().toLowerCase();
      if (normalized && (occurrences.get(normalized) ?? 0) > 1) {
        duplicates.add(item.id);
      }
    });

    return duplicates;
  }, [items]);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

  // Load jobs from IndexedDB
  const loadJobs = useCallback(async (): Promise<void> => {
    try {
      const allJobs = await indexDBManager.getAllJobs();
      setJobs(allJobs);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Errore nel caricamento dei job");
    } finally {
      setJobsLoading(false);
    }
  }, []);

  // Poll job status from backend
  const pollJobStatus = useCallback(
    async (jobId: string): Promise<void> => {
      try {
        const response = await authenticatedHttpClient.request(
          `${BASE_URL}/labels/job-status/${jobId}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === "success" && data.data) {
          const jobData = data.data;

          await indexDBManager.updateJob(jobId, {
            state: jobData.state,
            progress: jobData.progress,
            result: jobData.result,
          });

          if (jobData.state === "completed" || jobData.state === "failed") {
            setPollingJobIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(jobId);
              return newSet;
            });

            if (jobData.state === "completed") {
              toast.success(
                `Job ${jobId.slice(0, 8)}... completato con successo`,
              );
            } else {
              toast.error(`Job ${jobId.slice(0, 8)}... fallito`);
            }
          }

          await loadJobs();
        }
      } catch (error) {
        console.error(`Error polling job ${jobId}:`, error);
      }
    },
    [BASE_URL, loadJobs],
  );

  // Initialize IndexedDB and load jobs
  useEffect(() => {
    const initPolling = async (): Promise<void> => {
      await indexDBManager.init(userId);
      await loadJobs();

      const activeJobs = await indexDBManager.getActiveJobs();
      const activeJobIds = new Set(activeJobs.map((job) => job.id));
      setPollingJobIds(activeJobIds);
    };

    initPolling();
  }, [loadJobs, userId]);

  // Polling interval
  useEffect(() => {
    if (pollingJobIds.size === 0) return;

    const interval = setInterval(() => {
      pollingJobIds.forEach((jobId) => {
        pollJobStatus(jobId);
      });
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [pollingJobIds, pollJobStatus]);

  const handleActiveJobsChange = useCallback((count: number) => {
    setActiveJobsCount(count);
  }, []);

  const handleToggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev);
  }, []);

  // Update active jobs count
  useEffect(() => {
    const activeJobs = jobs.filter(
      (job) => job.state === "waiting" || job.state === "active",
    );
    setActiveJobsCount(activeJobs.length);
    handleActiveJobsChange(activeJobs.length);
  }, [jobs, handleActiveJobsChange]);

  // Reset upload mode when label type changes
  useEffect(() => {
    if (labelType === "fertilizzanti") {
      setUploadMode("pdf");
    } else {
      setUploadMode("manual");
    }
  }, [labelType]);

  const mutation = useMutation({
    mutationFn: async (request: BulkExtractRequest) => {
      return await labelsApiService.bulkExtract(request);
    },
    onSuccess: (response) => {
      const { processed, successful, failed } = response.data;
      toast.success(
        `Elaborazione completata: ${successful}/${processed} successi, ${failed} falliti`,
      );
      queryClient.invalidateQueries({ queryKey: ["labels", "summary"] });
      navigate("/label");
    },
    onError: (error: Error) => {
      toast.error(`Errore durante l'estrazione: ${error.message}`);
    },
  });

  const pdfMutation = useMutation({
    mutationFn: async ({
      files,
      concurrency,
    }: {
      files: File[];
      concurrency: number;
    }) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("concurrency", concurrency.toString());

      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";
      const response = await authenticatedHttpClient.request(
        `${BASE_URL}/labels/bulk-pdf-label-async`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Errore HTTP: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: async (response, variables) => {
      if (response.status === "success" && response.data?.jobId) {
        const jobId = response.data.jobId;

        // Save job to IndexedDB
        const job: LabelJob = {
          id: jobId,
          createdAt: new Date(),
          updatedAt: new Date(),
          state: "waiting",
          progress: 0,
          fileNames: variables.files.map((f) => f.name),
          concurrency: variables.concurrency,
        };

        await indexDBManager.saveJob(job);

        toast.success(`Job creato con successo! ID: ${jobId.slice(0, 8)}...`);

        // Clear PDF files
        setPdfFiles([]);

        // Trigger jobs table refresh
        await loadJobs();

        queryClient.invalidateQueries({ queryKey: ["labels", "summary"] });
      }
    },
    onError: (error: Error) => {
      toast.error(`Errore durante l'estrazione PDF: ${error.message}`);
    },
  });

  const fertilizerPdfMutation = useMutation({
    mutationFn: async ({
      files,
      concurrency,
    }: {
      files: File[];
      concurrency: number;
    }) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("concurrency", concurrency.toString());

      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";
      const response = await authenticatedHttpClient.request(
        `${BASE_URL}/labels/bulk-pdf-label-fertilizer-async`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Errore HTTP: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: async (response, variables) => {
      if (response.status === "success" && response.data?.jobId) {
        const jobId = response.data.jobId;

        // Save job to IndexedDB
        const job: LabelJob = {
          id: jobId,
          createdAt: new Date(),
          updatedAt: new Date(),
          state: "waiting",
          progress: 0,
          fileNames: variables.files.map((f) => f.name),
          concurrency: variables.concurrency,
        };

        await indexDBManager.saveJob(job);

        toast.success(
          `Job fertilizzanti creato con successo! ID: ${jobId.slice(0, 8)}...`,
        );

        // Clear PDF files
        setPdfFiles([]);

        // Trigger jobs table refresh
        await loadJobs();

        queryClient.invalidateQueries({ queryKey: ["labels", "summary"] });
      }
    },
    onError: (error: Error) => {
      toast.error(
        `Errore durante l'estrazione PDF (Fertilizzanti): ${error.message}`,
      );
    },
  });

  const handleAddItem = (): void => {
    setItems([...items, { id: crypto.randomUUID(), name: "", regNumber: "" }]);
  };

  const handleRemoveItem = (id: string): void => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (
    id: string,
    field: keyof BulkExtractItem,
    value: string,
  ): void => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleCsvImportClick = useCallback(() => {
    csvFileInputRef.current?.click();
  }, []);

  const handleCsvFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0];
      if (!file) return;

      const input = event.target;
      setIsCsvImporting(true);

      csvImporter
        .parse(file)
        .then((parsedItems) => {
          setItems((prev) => {
            const hasOnlyEmptyItem =
              prev.length === 1 &&
              prev[0].name.trim() === "" &&
              prev[0].regNumber.trim() === "";

            return hasOnlyEmptyItem ? parsedItems : [...prev, ...parsedItems];
          });

          toast.success(
            `Importazione completata: ${parsedItems.length} etichette aggiunte`,
          );
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "Errore sconosciuto durante l'importazione";
          toast.error(`Errore importazione CSV: ${message}`);
        })
        .finally(() => {
          setIsCsvImporting(false);
          input.value = "";
        });
    },
    [csvImporter],
  );

  const validatePdfFile = (file: File): boolean => {
    if (file.type !== "application/pdf") {
      toast.error(`${file.name} non è un file PDF valido`);
      return false;
    }
    // Note: Page count validation would require reading the PDF, which is complex client-side
    // The server will validate the 6-page limit
    return true;
  };

  const handlePdfFiles = (files: FileList | File[]): void => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(validatePdfFile);

    if (validFiles.length === 0) return;

    const newPdfFiles: PdfFile[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));

    setPdfFiles((prev) => [...prev, ...newPdfFiles]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      handlePdfFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    if (e.target.files) {
      handlePdfFiles(e.target.files);
    }
  };

  const handleRemovePdfFile = (id: string): void => {
    setPdfFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    if (labelType === "fertilizzanti") {
      if (pdfFiles.length === 0) {
        toast.error("Carica almeno un file PDF");
        return;
      }

      const files = pdfFiles.map((pdfFile) => pdfFile.file);
      fertilizerPdfMutation.mutate({ files, concurrency });
      return;
    }

    if (uploadMode === "manual") {
      const validItems = items.filter(
        (item) => item.name.trim() !== "" && item.regNumber.trim() !== "",
      );

      if (validItems.length === 0) {
        toast.error("Inserisci almeno un'etichetta valida");
        return;
      }

      const request: BulkExtractRequest = {
        items: validItems.map(({ name, regNumber }) => ({ name, regNumber })),
        concurrency,
      };

      mutation.mutate(request);
    } else {
      if (pdfFiles.length === 0) {
        toast.error("Carica almeno un file PDF");
        return;
      }

      const files = pdfFiles.map((pdfFile) => pdfFile.file);
      pdfMutation.mutate({ files, concurrency });
    }
  };

  const canRemove = items.length > 1;

  const isLoading =
    mutation.isPending ||
    pdfMutation.isPending ||
    fertilizerPdfMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <PageHeader title="Aggiungi Etichette">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleToggleHistory}
            className="gap-2 text-neutral-500 cursor-pointer"
          >
            <Clock className="h-4 w-4" />
            <span>
              {showHistory ? "Nascondi storico" : "Storico operazioni"}
            </span>
          </Button>
          {activeJobsCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-neutral-600 border border-neutral-200 rounded-lg px-3 py-1.5 bg-white">
              <Spinner size={14} />
              <span>{activeJobsCount} Job attivi</span>
            </div>
          )}
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-8 pb-12">
        {/* Jobs Status Table - Shown when showHistory is true */}
        {showHistory && (
          <div className="mb-12">
            {jobsLoading ? (
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardContent className="flex justify-center items-center py-12">
                  <Spinner size={32} />
                </CardContent>
              </Card>
            ) : jobs.length === 0 ? (
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardContent className="flex justify-center items-center py-12">
                  <p className="text-gray-500">Nessun job trovato</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      setJobsLoading(true);
                      await loadJobs();
                    }}
                    title="Aggiorna"
                    className="hover:bg-gray-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <EditableTable
                  columns={buildLabelJobColumns()}
                  rows={jobs.map((job) => {
                    const successCount =
                      job.result?.results.filter(
                        (r) => r.status === "extracted",
                      ).length || 0;
                    const failCount =
                      job.result?.results.filter((r) => r.status === "failed")
                        .length || 0;
                    const resultsText =
                      job.state === "completed"
                        ? `${successCount} successi${failCount > 0 ? ` / ${failCount} falliti` : ""}`
                        : job.state === "failed"
                          ? job.error || "Errore sconosciuto"
                          : "-";

                    const row: LabelJobRow = {
                      id: job.id,
                      jobId: job.id,
                      fileNames:
                        job.fileNames.length === 1
                          ? job.fileNames[0]
                          : `${job.fileNames.length} file`,
                      state: job.state,
                      progress: job.progress,
                      createdAt: job.createdAt.toLocaleString("it-IT"),
                      updatedAt: job.updatedAt.toLocaleString("it-IT"),
                      results: resultsText,
                      labelJob: job,
                    };
                    return row as Record<string, unknown>;
                  })}
                  getRowId={(row) => row.id as string}
                  isModify={false}
                  addButton={false}
                  showDeleteAction={false}
                  lastComponent={(row) => {
                    const labelJob = (row as unknown as LabelJobRow).labelJob;
                    return (
                      <div className="flex justify-end gap-2">
                        {labelJob.state === "completed" && labelJob.result && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!labelJob.result?.results) return;
                              const successfulExtraction =
                                labelJob.result.results.find(
                                  (r) => r.status === "extracted" && r.labelId,
                                );
                              if (
                                successfulExtraction &&
                                successfulExtraction.labelId
                              ) {
                                const url = `${window.location.origin}/label/${successfulExtraction.labelId}`;
                                window.open(url, "_blank");
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Vai all'etichetta
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              await indexDBManager.deleteJob(labelJob.id);
                              await loadJobs();
                              toast.success("Job eliminato");
                            } catch (error) {
                              console.error("Error deleting job:", error);
                              toast.error("Errore nell'eliminazione del job");
                            }
                          }}
                          title="Elimina job"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  }}
                  tableId="label-jobs-table"
                />
              </div>
            )}
          </div>
        )}

        {/* Form and other content - Hidden when showHistory is true */}
        {!showHistory && (
          <>
            {/* Type Toggle */}
            <div className="mb-6 flex justify-start">
              <div className="inline-flex p-1 bg-gray-100/80 rounded-xl gap-1 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setLabelType("fitofarmaci")}
                  disabled={isLoading}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    labelType === "fitofarmaci"
                      ? "bg-white shadow-md text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Fitofarmaci
                </button>
                <button
                  type="button"
                  onClick={() => setLabelType("fertilizzanti")}
                  disabled={isLoading}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    labelType === "fertilizzanti"
                      ? "bg-white shadow-md text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Fertilizzanti
                </button>
              </div>
            </div>

            {/* Mode Toggle - Only for Fitofarmaci */}
            {labelType === "fitofarmaci" && (
              <div className="mb-10 flex justify-start">
                <div className="inline-flex p-1 bg-gray-100/80 rounded-xl gap-1 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => setUploadMode("manual")}
                    disabled={isLoading}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      uploadMode === "manual"
                        ? "bg-white shadow-md text-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Carica numero di registrazione e nome
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode("pdf")}
                    disabled={isLoading}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      uploadMode === "pdf"
                        ? "bg-white shadow-md text-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Carica PDF etichette
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {uploadMode === "manual" ? (
                <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <CardTitle className="text-lg font-medium">
                        Etichette da Processare
                      </CardTitle>
                      <div className="flex flex-col gap-2 md:items-end">
                        <input
                          ref={csvFileInputRef}
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleCsvFileChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCsvImportClick}
                          disabled={isLoading || isCsvImporting}
                          className="gap-2 bg-transparent"
                        >
                          {isCsvImporting ? (
                            <>
                              <Spinner size={14} />
                              Import in corso...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Importa da CSV
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-gray-500">
                          Colonne richieste: nome prodotto, numero registrazione
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex gap-6 items-start p-6 border border-gray-200/60 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors",
                          duplicateItemIds.has(item.id) &&
                            "border-red-300 bg-red-50/80 hover:bg-red-50",
                        )}
                      >
                        <div className="flex-1 grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor={`name-${item.id}`}>
                              Nome Prodotto{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`name-${item.id}`}
                              type="text"
                              placeholder="es. REVOLUTION"
                              value={item.name}
                              className={cn(
                                duplicateItemIds.has(item.id) &&
                                  "border-red-500 focus-visible:ring-red-500",
                              )}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "name",
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`regNumber-${item.id}`}>
                              Numero Registrazione{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`regNumber-${item.id}`}
                              type="text"
                              placeholder="es. 16667"
                              value={item.regNumber}
                              className={cn(
                                duplicateItemIds.has(item.id) &&
                                  "border-red-500 focus-visible:ring-red-500",
                              )}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "regNumber",
                                  e.target.value,
                                )
                              }
                              required
                            />
                            {duplicateItemIds.has(item.id) && (
                              <p className="text-xs text-red-500">
                                Etichetta già presente
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={!canRemove}
                          className="mt-8"
                          title={
                            canRemove
                              ? "Rimuovi"
                              : "Almeno un'etichetta richiesta"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddItem}
                      className="w-full h-11 border-dashed border-2 bg-transparent hover:border-gray-400 hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Etichetta
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-lg font-medium">
                      Carica File PDF
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Drag & Drop Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                        isDragging
                          ? "border-primary bg-primary/5 scale-[1.02]"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50",
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">
                        Trascina i file PDF qui
                      </p>
                      <p className="text-sm text-gray-500 mb-1">
                        oppure clicca per selezionare i file
                      </p>
                      <p className="text-xs text-gray-400">
                        Ogni file può contenere massimo 6 pagine
                      </p>
                    </div>

                    {/* File List */}
                    {pdfFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>File caricati ({pdfFiles.length})</Label>
                        <div className="space-y-2">
                          {pdfFiles.map((pdfFile) => (
                            <div
                              key={pdfFile.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-red-500" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {pdfFile.file.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(pdfFile.file.size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemovePdfFile(pdfFile.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="text-lg font-medium">
                    Impostazioni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label
                      htmlFor="concurrency"
                      className="text-sm font-medium"
                    >
                      Concorrenza (numero di elaborazioni parallele)
                    </Label>
                    <Input
                      id="concurrency"
                      type="number"
                      min={1}
                      max={10}
                      value={concurrency}
                      onChange={(e) => setConcurrency(Number(e.target.value))}
                      className="max-w-xs h-11"
                    />
                    <p className="text-sm text-gray-500">
                      Numero di etichette elaborate contemporaneamente (1-10)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/label")}
                  disabled={isLoading}
                  className="h-11 px-6 bg-transparent"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 px-6"
                >
                  {isLoading ? (
                    <>
                      <Spinner size={16} className="mr-2" />
                      Elaborazione in corso...
                    </>
                  ) : (
                    "Avvia Estrazione"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
