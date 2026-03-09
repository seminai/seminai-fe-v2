import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractionJobSocketService,
  type ExtractionPhase,
  type ExtractionProgressEvent,
} from "@/services/extractionJobSocket";
import {
  quickCreateApiService,
  type ExtractFromFileResponse,
} from "@/api/quick-create";

export interface ExtractionProgressState {
  readonly jobId: string | null;
  readonly isExtracting: boolean;
  readonly phase: ExtractionPhase | null;
  readonly progress: number;
  readonly message: string;
  readonly error: string | null;
  readonly result: ExtractFromFileResponse["data"] | null;
  readonly elapsedMs: number;
}

const INITIAL_STATE: ExtractionProgressState = {
  jobId: null,
  isExtracting: false,
  phase: null,
  progress: 0,
  message: "",
  error: null,
  result: null,
  elapsedMs: 0,
};

const POLL_INTERVALS_NO_SOCKET = [2000, 3000, 5000, 5000, 5000];
const POLL_INTERVAL_WITH_SOCKET = 8000;

export function useExtractionProgress() {
  const [state, setState] = useState<ExtractionProgressState>(INITIAL_STATE);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pollIndexRef = useRef(0);
  const socketConnectedRef = useRef(false);
  const jobIdRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const startElapsedTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        elapsedMs: Date.now() - startTimeRef.current,
      }));
    }, 1000);
  }, []);

  const fetchResult = useCallback(async (jobId: string) => {
    try {
      const response = await quickCreateApiService.getExtractResult(jobId);
      setState((prev) => ({
        ...prev,
        isExtracting: false,
        phase: "completed",
        progress: 100,
        message: `Estratti ${response.data.fieldCount} campi e ${response.data.productionUnitCount} unità produttive`,
        result: response.data,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isExtracting: false,
        error:
          err instanceof Error ? err.message : "Errore nel recupero risultati",
      }));
    }
  }, []);

  const pollStatus = useCallback(
    async (jobId: string) => {
      try {
        const response = await quickCreateApiService.getExtractStatus(jobId);
        const { data } = response;

        if (data.state === "completed") {
          clearTimers();
          await fetchResult(jobId);
          return;
        }
        if (data.state === "failed") {
          clearTimers();
          setState((prev) => ({
            ...prev,
            isExtracting: false,
            error: data.failedReason ?? "Elaborazione fallita",
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          progress: data.progress,
          phase: (data.phase as ExtractionPhase) ?? prev.phase,
          message: data.message ?? prev.message,
        }));
      } catch {
        // Ignore polling errors, will retry on next interval
      }

      const delay = socketConnectedRef.current
        ? POLL_INTERVAL_WITH_SOCKET
        : POLL_INTERVALS_NO_SOCKET[
            Math.min(
              pollIndexRef.current,
              POLL_INTERVALS_NO_SOCKET.length - 1,
            )
          ];
      pollIndexRef.current++;
      pollTimerRef.current = setTimeout(() => pollStatus(jobId), delay);
    },
    [clearTimers, fetchResult],
  );

  const connectSocket = useCallback(
    (jobId: string) => {
      extractionJobSocketService.connect(jobId, {
        onConnect: () => {
          socketConnectedRef.current = true;
        },
        onDisconnect: () => {
          socketConnectedRef.current = false;
          if (jobIdRef.current) {
            pollIndexRef.current = 0;
            pollTimerRef.current = setTimeout(
              () => pollStatus(jobIdRef.current!),
              1000,
            );
          }
        },
        onError: () => {
          socketConnectedRef.current = false;
          if (jobIdRef.current) {
            pollIndexRef.current = 0;
            pollTimerRef.current = setTimeout(
              () => pollStatus(jobIdRef.current!),
              1000,
            );
          }
        },
        onProgress: (event: ExtractionProgressEvent) => {
          setState((prev) => ({
            ...prev,
            phase: event.phase,
            progress: event.progress,
            message: event.message,
          }));
        },
        onCompleted: () => {
          clearTimers();
          void fetchResult(jobId);
        },
        onFailed: (event) => {
          clearTimers();
          setState((prev) => ({
            ...prev,
            isExtracting: false,
            error: event.message,
          }));
        },
      });
    },
    [clearTimers, fetchResult, pollStatus],
  );

  const startExtraction = useCallback(
    async (files: File | File[]) => {
      clearTimers();
      extractionJobSocketService.disconnect();
      socketConnectedRef.current = false;
      pollIndexRef.current = 0;

      setState({
        ...INITIAL_STATE,
        isExtracting: true,
        message: "Avvio elaborazione...",
      });
      startElapsedTimer();

      try {
        const response = await quickCreateApiService.startExtract(files);
        const { jobId } = response.data;
        jobIdRef.current = jobId;

        setState((prev) => ({
          ...prev,
          jobId,
          message: "Elaborazione avviata...",
        }));

        connectSocket(jobId);

        pollTimerRef.current = setTimeout(() => pollStatus(jobId), 2000);
      } catch (err) {
        clearTimers();
        setState((prev) => ({
          ...prev,
          isExtracting: false,
          error:
            err instanceof Error
              ? err.message
              : "Errore nell'avvio dell'elaborazione",
        }));
      }
    },
    [clearTimers, startElapsedTimer, connectSocket, pollStatus],
  );

  const cancelExtraction = useCallback(async () => {
    const jobId = jobIdRef.current;
    clearTimers();
    extractionJobSocketService.disconnect();
    socketConnectedRef.current = false;
    jobIdRef.current = null;
    setState(INITIAL_STATE);

    if (jobId) {
      try {
        await quickCreateApiService.cancelExtract(jobId);
      } catch (err) {
        console.warn("Failed to cancel extraction job:", err);
      }
    }
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    extractionJobSocketService.disconnect();
    socketConnectedRef.current = false;
    jobIdRef.current = null;
    setState(INITIAL_STATE);
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      extractionJobSocketService.disconnect();
    };
  }, [clearTimers]);

  return { state, startExtraction, cancelExtraction, reset };
}
