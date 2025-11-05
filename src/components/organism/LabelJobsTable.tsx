import * as React from "react";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { indexDBManager, type LabelJob } from "@/utils/indexDBManager";
import { toast } from "sonner";
import authService from "@/utils/auth";

interface LabelJobsTableProps {
  onRefresh?: () => void;
}

export function LabelJobsTable({
  onRefresh,
}: LabelJobsTableProps): React.ReactElement {
  const [jobs, setJobs] = useState<LabelJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingJobIds, setPollingJobIds] = useState<Set<string>>(new Set());

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

  // Load jobs from IndexedDB
  const loadJobs = async (): Promise<void> => {
    try {
      const allJobs = await indexDBManager.getAllJobs();
      setJobs(allJobs);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Errore nel caricamento dei job");
    } finally {
      setLoading(false);
    }
  };

  // Poll job status from backend
  const pollJobStatus = async (jobId: string): Promise<void> => {
    try {
      const token = authService.getAuthToken();

      if (!token) {
        console.error("Token di autenticazione non trovato");
        return;
      }

      const response = await fetch(`${BASE_URL}/labels/job-status/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

        // If job is completed or failed, stop polling
        if (jobData.state === "completed" || jobData.state === "failed") {
          setPollingJobIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });

          if (jobData.state === "completed") {
            toast.success(
              `Job ${jobId.slice(0, 8)}... completato con successo`
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
  };

  // Initialize polling for active jobs
  useEffect(() => {
    const initPolling = async (): Promise<void> => {
      await indexDBManager.init();
      await loadJobs();

      const activeJobs = await indexDBManager.getActiveJobs();
      const activeJobIds = new Set(activeJobs.map((job) => job.id));
      setPollingJobIds(activeJobIds);
    };

    initPolling();
  }, []);

  // Polling interval
  useEffect(() => {
    if (pollingJobIds.size === 0) return;

    const interval = setInterval(() => {
      pollingJobIds.forEach((jobId) => {
        pollJobStatus(jobId);
      });
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [pollingJobIds]);

  const handleDeleteJob = async (jobId: string): Promise<void> => {
    try {
      await indexDBManager.deleteJob(jobId);
      await loadJobs();
      toast.success("Job eliminato");
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Errore nell'eliminazione del job");
    }
  };

  const handleDeleteAllCompleted = async (): Promise<void> => {
    try {
      await indexDBManager.deleteCompletedJobs();
      await loadJobs();
      toast.success("Tutti i job completati sono stati eliminati");
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting completed jobs:", error);
      toast.error("Errore nell'eliminazione dei job completati");
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setLoading(true);
    await loadJobs();
    onRefresh?.();
  };

  const getStateLabel = (
    state: string
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

  const handleOpenLabel = (result: LabelJob["result"]): void => {
    if (!result?.results) return;

    // Find first successfully extracted label with ID
    const successfulExtraction = result.results.find(
      (r) => r.status === "extracted" && r.labelId
    );

    if (successfulExtraction && successfulExtraction.labelId) {
      // Navigate to label detail page using label ID
      window.open(`/label/${successfulExtraction.labelId}`, "_blank");
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="flex justify-center items-center py-12">
          <Spinner size={32} />
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return null; // Don't show anything if no jobs
  }

  const activeJobs = jobs.filter(
    (job) => job.state === "waiting" || job.state === "active"
  );
  const completedJobs = jobs.filter(
    (job) => job.state === "completed" || job.state === "failed"
  );

  return (
    <div className="space-y-4">
      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              Job in Corso
              <Spinner size={16} />
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              title="Aggiorna"
              className="hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeJobs.map((job) => {
                  const stateLabel = getStateLabel(job.state);
                  return (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">
                        {job.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {job.fileNames.length === 1
                            ? job.fileNames[0]
                            : `${job.fileNames.length} file`}
                        </div>
                        {job.fileNames.length > 1 && (
                          <div className="text-xs text-gray-500">
                            {job.fileNames.join(", ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stateLabel.variant}>
                          {stateLabel.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={job.progress} className="w-24" />
                          <span className="text-xs text-gray-500">
                            {job.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {job.createdAt.toLocaleString("it-IT")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteJob(job.id)}
                          title="Elimina job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <CardTitle className="text-lg font-medium">
              Job Completati
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAllCompleted}
              className="h-9 hover:bg-gray-100"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina tutti
            </Button>
          </CardHeader>
          <CardContent className="px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Risultati</TableHead>
                  <TableHead>Data Completamento</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedJobs.map((job) => {
                  const stateLabel = getStateLabel(job.state);
                  const successCount =
                    job.result?.results.filter((r) => r.status === "extracted")
                      .length || 0;
                  const failCount =
                    job.result?.results.filter((r) => r.status === "failed")
                      .length || 0;

                  return (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">
                        {job.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {job.fileNames.length === 1
                            ? job.fileNames[0]
                            : `${job.fileNames.length} file`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stateLabel.variant}>
                          {stateLabel.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.state === "completed" && (
                          <div className="text-sm">
                            <span className="text-green-600 font-medium">
                              {successCount} successi
                            </span>
                            {failCount > 0 && (
                              <>
                                {" / "}
                                <span className="text-red-600">
                                  {failCount} falliti
                                </span>
                              </>
                            )}
                          </div>
                        )}
                        {job.state === "failed" && (
                          <div className="text-sm text-red-600">
                            {job.error || "Errore sconosciuto"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {job.updatedAt.toLocaleString("it-IT")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {job.state === "completed" && job.result && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenLabel(job.result)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Vai all'etichetta
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteJob(job.id)}
                            title="Elimina job"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
