import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  dosageJobSocketService,
  type DosageLogEvent,
  type SocketConnectionState,
} from "@/services/dosageJobSocket";
import { jobsApiService } from "@/api/jobs";
import type { JobCreationTaskStatus } from "@/api/jobs";

const POLL_INTERVAL_MS = 3000;

export type JobCreationTaskCompletionResult =
  | NonNullable<JobCreationTaskStatus["result"]>
  | undefined;

export interface UseJobCreationTaskLiveOptions {
  /** Called on completion. `result` is undefined when the task finished before polling could fetch the result (fast completion). */
  onComplete?: (result: JobCreationTaskCompletionResult) => void;
}

export interface UseJobCreationTaskLiveResult {
  events: DosageLogEvent[];
  connectionState: SocketConnectionState;
  progress: number;
  isComplete: boolean;
  error: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function useJobCreationTaskLive(
  taskId: string | null,
  options?: UseJobCreationTaskLiveOptions,
): UseJobCreationTaskLiveResult {
  const [events, setEvents] = useState<DosageLogEvent[]>([]);
  const [connectionState, setConnectionState] =
    useState<SocketConnectionState>("disconnected");
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(options?.onComplete);
  onCompleteRef.current = options?.onComplete;
  const completedRef = useRef(false);
  const hasSeenActiveRef = useRef(false);

  const handleCompletion = useCallback(
    (result: JobCreationTaskCompletionResult) => {
      if (completedRef.current) return;
      completedRef.current = true;
      setIsComplete(true);
      setProgress(100);
      onCompleteRef.current?.(result);
    },
    [],
  );

  // Socket connection
  useEffect(() => {
    if (!taskId) {
      dosageJobSocketService.disconnect();
      setEvents([]);
      setConnectionState("disconnected");
      setProgress(0);
      setIsComplete(false);
      setError(null);
      completedRef.current = false;
      hasSeenActiveRef.current = false;
      return;
    }

    dosageJobSocketService.disconnect();
    setConnectionState("connecting");
    setEvents([]);
    setProgress(0);
    setIsComplete(false);
    setError(null);
    completedRef.current = false;
    hasSeenActiveRef.current = false;

    dosageJobSocketService.connect(taskId, {
      onConnect: () => setConnectionState("connected"),
      onDisconnect: () => setConnectionState("disconnected"),
      onError: (err) => {
        setConnectionState("error");
        toast.error("Errore connessione live", {
          description: err.message,
        });
      },
      onJoined: (room) => {
        setEvents((prev) => [
          ...prev,
          {
            jobId: taskId,
            userId: "",
            timestamp: new Date().toISOString(),
            type: "info",
            message: `Connesso alla room ${room}`,
          },
        ]);
      },
      onLog: (event) => {
        setEvents((prev) => [...prev, event]);

        if (event.type === "complete") {
          setProgress(100);
        }

        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }, 50);
      },
    });

    return () => {
      dosageJobSocketService.disconnect();
      setConnectionState("disconnected");
    };
  }, [taskId]);

  // Polling fallback for progress and final result
  useEffect(() => {
    if (!taskId || completedRef.current) return;

    let active = true;

    const poll = async () => {
      try {
        const status = await jobsApiService.getJobCreationTaskStatus(taskId);
        if (!active) return;

        setProgress(status.progress ?? 0);

        if (
          status.state === "active" ||
          status.state === "queued" ||
          status.state === "waiting"
        ) {
          hasSeenActiveRef.current = true;
        }

        if (status.state === "completed") {
          handleCompletion(status.result ?? undefined);
          return;
        }

        if (status.state === "failed") {
          setError(status.failedReason ?? "Creazione interventi fallita");
          toast.error("Creazione interventi fallita", {
            description: status.failedReason ?? "Errore sconosciuto",
          });
          return;
        }

        if (status.state === "not_found" || status.stopPolling) {
          // BullMQ job completed and was removed before we could poll.
          // Treat as fast completion: trigger onComplete so queries refresh.
          handleCompletion(undefined);
          return;
        }
      } catch {
        // Polling errors are non-fatal; socket may still be working
      }
    };

    poll();
    const interval = setInterval(() => {
      if (!completedRef.current) poll();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [taskId, handleCompletion]);

  return {
    events,
    connectionState,
    progress,
    isComplete,
    error,
    scrollRef,
  };
}
