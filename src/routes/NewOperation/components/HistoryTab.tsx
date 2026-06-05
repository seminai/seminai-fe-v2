import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactElement,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  CheckCircle2,
  Octagon,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { APP_LOGO_URL } from "@/config/brand";
import type { EditableColumn } from "@/components/organism/EditableTable";
import {
  dosageAgentApiService,
  type DosageJobState,
} from "@/api/dosage-agent";
import {
  type DosageJob,
  type ActiveJobTableRow,
  type JobHistoryTableRow,
  normalizeJob,
} from "@/routes/DosageManager/types";
import { HistorySection } from "@/routes/DosageManager/HistorySection";
import { JobDetails } from "@/routes/DosageManager/JobDetails";
import { useLiveLogs } from "@/routes/DosageManager/useLiveLogs";
import { dosageJobStateSynchronizer } from "@/routes/DosageManager/jobStateSynchronizer";
import { useUserId } from "@/contexts/UserIdContext";
import { LiveLogEventCard } from "@/components/organism/LiveLogEventCard";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

const STATE_VARIANTS: Record<DosageJobState, { label: string; variant: BadgeVariant }> = {
  queued: { label: "In coda", variant: "secondary" },
  waiting: { label: "In attesa", variant: "secondary" },
  active: { label: "In esecuzione", variant: "default" },
  completed: { label: "Completato", variant: "default" },
  failed: { label: "Fallito", variant: "destructive" },
  stalled: { label: "Bloccato", variant: "destructive" },
  delayed: { label: "Ritardato", variant: "secondary" },
};

const PENDING_STATES: DosageJobState[] = ["queued", "waiting", "active", "delayed"];
const FAILED_STATES: DosageJobState[] = ["failed", "stalled"];

export function HistoryTab(): ReactElement {
  const userId = useUserId();
  const queryClient = useQueryClient();

  const [jobs, setJobs] = useState<DosageJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DosageJob | null>(null);
  const [isJobDetailsLoading, setIsJobDetailsLoading] = useState(false);
  const [isCancellingJobs, setIsCancellingJobs] = useState(false);
  const [selectedActiveJobIds, setSelectedActiveJobIds] = useState<string[]>([]);
  const isResumeSyncRef = useRef(false);

  const {
    isLiveLogsDrawerOpen,
    liveLogsJobId,
    liveLogEvents,
    liveSocketState,
    liveLogsScrollRef,
    handleOpenLiveLogs,
    handleCloseLiveLogs,
    reconnectLiveLogs,
    clearLiveLogEvents,
  } = useLiveLogs();

  const fetchJobs = useCallback(async () => {
    try {
      const previousJobs = jobs;
      const response = await dosageAgentApiService.listJobs();
      const normalized = response.data.map(normalizeJob);
      setJobs(normalized);

      if (previousJobs.length > 0 && normalized.length > 0) {
        const hasJobCompleted = normalized.some((newJob) => {
          const oldJob = previousJobs.find((j) => j.id === newJob.id);
          if (!oldJob) return false;
          const wasActive = PENDING_STATES.includes(oldJob.state);
          return wasActive && newJob.state === "completed";
        });
        if (hasJobCompleted) {
          queryClient.invalidateQueries({ queryKey: ["job-groups-summary"], refetchType: "none" });
          queryClient.invalidateQueries({ queryKey: ["job-group-detail"], refetchType: "none" });
        }
      }
    } catch (error) {
      console.error("Failed to load dosage jobs", error);
    }
  }, [jobs, queryClient]);

  // Initialize on mount
  useEffect(() => {
    void (async () => {
      try {
        await dosageJobStateSynchronizer.initialize(userId);
      } catch (e) {
        console.error("Failed to init dosage jobs storage", e);
      }
      await fetchJobs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const activeJobs = useMemo(
    () => jobs.filter((j) => PENDING_STATES.includes(j.state)),
    [jobs],
  );

  // Poll active jobs
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.visibilityState === "hidden" || activeJobs.length === 0) return;
      await fetchJobs();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs, activeJobs.length]);

  // Resume sync
  useEffect(() => {
    const syncOnResume = () => {
      if (document.visibilityState !== "visible") return;
      if (isResumeSyncRef.current) return;
      if (activeJobs.length === 0 && !isLiveLogsDrawerOpen) return;
      isResumeSyncRef.current = true;
      (async () => {
        try {
          await fetchJobs();
          if (isLiveLogsDrawerOpen && liveLogsJobId) reconnectLiveLogs();
        } finally {
          isResumeSyncRef.current = false;
        }
      })();
    };
    window.addEventListener("visibilitychange", syncOnResume);
    window.addEventListener("focus", syncOnResume);
    return () => {
      window.removeEventListener("visibilitychange", syncOnResume);
      window.removeEventListener("focus", syncOnResume);
    };
  }, [fetchJobs, isLiveLogsDrawerOpen, liveLogsJobId, reconnectLiveLogs, activeJobs.length]);

  // Clean stale selection
  useEffect(() => {
    setSelectedActiveJobIds((prev) => {
      const ids = new Set(activeJobs.map((j) => j.id));
      const filtered = prev.filter((id) => ids.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [activeJobs]);

  // Build table data
  const activeJobRows = useMemo<ActiveJobTableRow[]>(() => {
    return activeJobs.map((job) => {
      const desc = STATE_VARIANTS[job.state] ?? { label: job.state, variant: "secondary" as BadgeVariant };
      const createdAt = new Date(job.createdAt);
      return {
        id: job.id,
        jobId: job.id,
        state: job.state,
        createdAtLabel: createdAt.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        stateLabel: desc.label,
        stateBadgeVariant: desc.variant,
        progress: job.progress,
        progressLabel: `${job.progress}%`,
        productsCount: job.productsCount,
        unitsCount: job.unitsCount,
      };
    });
  }, [activeJobs]);

  const historyJobRows = useMemo<JobHistoryTableRow[]>(() => {
    return [...jobs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((job) => {
        const desc = STATE_VARIANTS[job.state] ?? { label: job.state, variant: "secondary" as BadgeVariant };
        const createdAt = new Date(job.createdAt);
        return {
          id: job.id,
          jobId: job.id,
          state: job.state,
          createdAtLabel: createdAt.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          stateLabel: desc.label,
          stateBadgeVariant: desc.variant,
          progress: job.progress,
          progressLabel: `${job.progress}%`,
          productsCount: job.productsCount,
          unitsCount: job.unitsCount,
          job,
        };
      });
  }, [jobs]);

  // Active job columns
  const activeJobColumns = useMemo<EditableColumn[]>(() => [
    { id: "jobId", title: "Job ID", width: "200px", type: "text" },
    { id: "createdAtLabel", title: "Creato il", width: "180px", type: "text" },
    {
      id: "stateLabel",
      title: "Stato",
      width: "160px",
      render: (_v, row) => {
        const d = row as ActiveJobTableRow;
        return <Badge variant={d.stateBadgeVariant}><span className="text-xs font-medium">{d.stateLabel}</span></Badge>;
      },
    },
    {
      id: "progress",
      title: "Progresso",
      width: "240px",
      type: "number",
      render: (_v, row) => {
        const d = row as ActiveJobTableRow;
        if (PENDING_STATES.includes(d.state)) {
          return (
            <div className="flex items-center gap-2">
              <img src={APP_LOGO_URL} alt="" className="h-5 w-5 animate-spin" />
              <span className="text-sm text-neutral-500">In elaborazione...</span>
            </div>
          );
        }
        if (FAILED_STATES.includes(d.state)) {
          return (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <Octagon className="h-4 w-4" /><span>STOP</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /><span>Completato</span>
          </div>
        );
      },
    },
    { id: "productsCount", title: "Prodotti", width: "120px", type: "number" },
    { id: "unitsCount", title: "Unità", width: "120px", type: "number" },
    {
      id: "liveActions",
      title: "Live",
      width: "120px",
      render: (_v, row) => {
        const d = row as ActiveJobTableRow;
        const isLive = isLiveLogsDrawerOpen && liveLogsJobId === d.jobId;
        return (
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            className={isLive ? "gap-2 bg-green-600 text-white hover:bg-green-700" : "gap-2 text-green-600 border-green-600 hover:bg-green-50"}
            onClick={(e) => {
              e.stopPropagation();
              if (isLive) {
                handleCloseLiveLogs();
                return;
              }
              handleOpenLiveLogs(d.jobId);
            }}
          >
            <Radio className="h-3.5 w-3.5" /><span>Live</span>
          </Button>
        );
      },
    },
  ], [isLiveLogsDrawerOpen, liveLogsJobId, handleOpenLiveLogs, handleCloseLiveLogs]);

  // History job columns
  const historyJobColumns = useMemo<EditableColumn[]>(() => [
    { id: "jobId", title: "Job ID", width: "200px", type: "text" },
    { id: "createdAtLabel", title: "Creato il", width: "180px", type: "text" },
    {
      id: "stateLabel",
      title: "Stato",
      width: "160px",
      render: (_v, row) => {
        const d = row as JobHistoryTableRow;
        return <Badge variant={d.stateBadgeVariant}><span className="text-xs font-medium">{d.stateLabel}</span></Badge>;
      },
    },
    {
      id: "progress",
      title: "Progresso",
      width: "240px",
      type: "number",
      render: (_v, row) => {
        const d = row as JobHistoryTableRow;
        if (PENDING_STATES.includes(d.state)) {
          return <div className="flex items-center gap-2"><img src={APP_LOGO_URL} alt="" className="h-5 w-5 animate-spin" /><span className="text-sm text-neutral-500">In elaborazione...</span></div>;
        }
        if (FAILED_STATES.includes(d.state)) {
          return <div className="flex items-center gap-2 text-sm text-red-600"><Octagon className="h-4 w-4" /><span>STOP</span></div>;
        }
        return <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" /><span>Completato</span></div>;
      },
    },
    { id: "productsCount", title: "Prodotti", width: "120px", type: "number" },
    { id: "unitsCount", title: "Unità", width: "120px", type: "number" },
    {
      id: "details",
      title: "Azioni",
      width: "140px",
      render: (_v, row) => {
        const d = row as JobHistoryTableRow;
        return (
          <Button variant="outline" size="sm" onClick={() => handleShowJobDetails(d.job)}>
            Dettagli
          </Button>
        );
      },
    },
  ], []);

  const handleShowJobDetails = useCallback(async (job: DosageJob) => {
    setSelectedJob(job);
    setIsJobDetailsLoading(true);
    try {
      if (job.state === "completed" && job.result) {
        setSelectedJob(job);
      } else {
        const res = await dosageAgentApiService.getJobStatus(job.id);
        const detailed: DosageJob = {
          ...job,
          state: res.data.state,
          progress: res.data.progress,
          result: res.data.result,
          productsCount: res.data.data?.productsCount ?? job.productsCount,
          unitsCount: res.data.data?.unitsCount ?? job.unitsCount,
          updatedAt: new Date().toISOString(),
        };
        const normalized = normalizeJob(detailed);
        setSelectedJob(normalized);
        setJobs((prev) => prev.map((j) => (j.id === normalized.id ? normalized : j)));
      }
    } catch {
      // keep job as-is
    } finally {
      setIsJobDetailsLoading(false);
    }
  }, []);

  const handleCancelJobs = useCallback(async () => {
    if (isCancellingJobs || selectedActiveJobIds.length === 0) return;
    setIsCancellingJobs(true);
    try {
      await dosageAgentApiService.cancelJobs(selectedActiveJobIds);
      const res = await dosageAgentApiService.listJobs();
      setJobs(res.data.map(normalizeJob));
      setSelectedActiveJobIds([]);
    } catch (e) {
      console.error("Failed to cancel jobs", e);
    } finally {
      setIsCancellingJobs(false);
    }
  }, [isCancellingJobs, selectedActiveJobIds]);

  const activeSelectionLabel = useMemo(() => {
    if (selectedActiveJobIds.length === 0) return "Nessun job selezionato";
    if (selectedActiveJobIds.length === 1) return "1 job selezionato";
    return `${selectedActiveJobIds.length} job selezionati`;
  }, [selectedActiveJobIds]);

  return (
    <div className="space-y-4">
      <HistorySection
        activeJobsCount={activeJobs.length}
        activeSelectionLabel={activeSelectionLabel}
        isCancellingJobs={isCancellingJobs}
        selectedActiveJobIds={selectedActiveJobIds}
        onCancelSelectedActiveJobs={handleCancelJobs}
        activeJobColumns={activeJobColumns}
        activeJobRows={activeJobRows}
        onActiveSelectionChange={(rows) =>
          setSelectedActiveJobIds(
            rows.map((r) => (r as ActiveJobTableRow).jobId || (r as ActiveJobTableRow).id),
          )
        }
        historyJobColumns={historyJobColumns}
        historyJobRows={historyJobRows}
        onOpenJobDetails={handleShowJobDetails}
      />

      <JobDetails
        selectedJob={selectedJob}
        jobDetailsLoading={isJobDetailsLoading}
        onSelectedJobChange={(job) => { if (!job) setSelectedJob(null); }}
      />

      {/* Live logs drawer */}
      <Drawer
        open={isLiveLogsDrawerOpen}
        onOpenChange={(open) => !open && handleCloseLiveLogs()}
      >
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              Live Logs
              {liveLogsJobId && (
                <span className="text-sm font-normal text-neutral-500">
                  Job: {liveLogsJobId}
                </span>
              )}
              <Badge
                variant={liveSocketState === "connected" ? "default" : "destructive"}
                className="ml-2 gap-1"
              >
                {liveSocketState === "connected" ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {liveSocketState}
              </Badge>
            </DrawerTitle>
            <DrawerDescription>
              Eventi in tempo reale dal calcolo dosaggi
            </DrawerDescription>
          </DrawerHeader>

          <div
            ref={liveLogsScrollRef}
            className="flex-1 overflow-y-auto px-4 space-y-2 max-h-[60vh]"
          >
            {liveLogEvents.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">
                In attesa di eventi...
              </p>
            ) : (
              liveLogEvents.map((event, i) => (
                <LiveLogEventCard key={`${event.timestamp}-${i}`} event={event} />
              ))
            )}
          </div>

          <DrawerFooter>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearLiveLogEvents}
                disabled={liveLogEvents.length === 0}
              >
                Pulisci
              </Button>
              {liveSocketState !== "connected" && (
                <Button variant="outline" size="sm" onClick={reconnectLiveLogs}>
                  Riconnetti
                </Button>
              )}
            </div>
            <DrawerClose asChild>
              <Button variant="ghost">Chiudi</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
