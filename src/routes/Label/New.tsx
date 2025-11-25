import * as React from "react";
import { useState, useRef, useEffect } from "react";
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
import { Trash2, Plus, Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { indexDBManager, type LabelJob } from "@/utils/indexDBManager";
import { LabelJobsTable } from "@/components/organism/LabelJobsTable";

interface LabelFormItem extends BulkExtractItem {
  id: string;
}

type UploadMode = "manual" | "pdf";

interface PdfFile {
  id: string;
  file: File;
}

export default function NewLabel(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadMode, setUploadMode] = useState<UploadMode>("manual");
  const [items, setItems] = useState<LabelFormItem[]>([
    { id: crypto.randomUUID(), name: "", regNumber: "" },
  ]);
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [concurrency, setConcurrency] = useState<number>(5);
  const [jobsRefreshKey, setJobsRefreshKey] = useState(0);

  // Initialize IndexedDB
  useEffect(() => {
    indexDBManager.init();
  }, []);

  const mutation = useMutation({
    mutationFn: async (request: BulkExtractRequest) => {
      return await labelsApiService.bulkExtract(request);
    },
    onSuccess: (response) => {
      const { processed, successful, failed } = response.data;
      toast.success(
        `Elaborazione completata: ${successful}/${processed} successi, ${failed} falliti`
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
        }
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
        setJobsRefreshKey((prev) => prev + 1);

        queryClient.invalidateQueries({ queryKey: ["labels", "summary"] });
      }
    },
    onError: (error: Error) => {
      toast.error(`Errore durante l'estrazione PDF: ${error.message}`);
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
    value: string
  ): void => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

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
    e: React.ChangeEvent<HTMLInputElement>
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

    if (uploadMode === "manual") {
      const validItems = items.filter(
        (item) => item.name.trim() !== "" && item.regNumber.trim() !== ""
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

  const isLoading = mutation.isPending || pdfMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold mb-3 text-gray-900">
            Aggiungi Etichette
          </h1>
          <p className="text-base text-gray-500">
            Inserisci le informazioni delle etichette da cui estrarre i dati
          </p>
        </div>

        {/* Jobs Status Table */}
        <div className="mb-12">
          <LabelJobsTable
            key={jobsRefreshKey}
            onRefresh={() => setJobsRefreshKey((prev) => prev + 1)}
          />
        </div>

        {/* Mode Toggle */}
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {uploadMode === "manual" ? (
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-lg font-medium">
                  Etichette da Processare
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-6 items-start p-6 border border-gray-200/60 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${item.id}`}>
                          Nome Prodotto <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`name-${item.id}`}
                          type="text"
                          placeholder="es. REVOLUTION"
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(item.id, "name", e.target.value)
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
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "regNumber",
                              e.target.value
                            )
                          }
                          required
                        />
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
                        canRemove ? "Rimuovi" : "Almeno un'etichetta richiesta"
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
                  className="w-full h-11 border-dashed border-2 hover:border-gray-400 hover:bg-gray-50"
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
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50"
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
                <Label htmlFor="concurrency" className="text-sm font-medium">
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
              className="h-11 px-6"
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading} className="h-11 px-6">
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
      </div>
    </div>
  );
}
