import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  dosageJobSocketService,
  type DosageLogEvent,
  type SocketConnectionState,
} from "@/services/dosageJobSocket";

interface UseLiveLogsResult {
  isLiveLogsDrawerOpen: boolean;
  setIsLiveLogsDrawerOpen: (open: boolean) => void;
  liveLogsJobId: string | null;
  liveLogEvents: DosageLogEvent[];
  liveSocketState: SocketConnectionState;
  liveLogsScrollRef: React.RefObject<HTMLDivElement | null>;
  handleOpenLiveLogs: (jobId: string) => void;
  handleCloseLiveLogs: () => void;
  reconnectLiveLogs: () => void;
  clearLiveLogEvents: () => void;
}

export function useLiveLogs(): UseLiveLogsResult {
  const [isLiveLogsDrawerOpen, setIsLiveLogsDrawerOpen] = useState(false);
  const [liveLogsJobId, setLiveLogsJobId] = useState<string | null>(null);
  const [liveLogEvents, setLiveLogEvents] = useState<DosageLogEvent[]>([]);
  const [liveSocketState, setLiveSocketState] =
    useState<SocketConnectionState>("disconnected");
  const liveLogsScrollRef = useRef<HTMLDivElement | null>(null);
  const clearLiveLogEvents = useCallback(() => {
    setLiveLogEvents([]);
  }, []);

  const connectLiveLogs = useCallback(
    (jobId: string, options?: { resetEvents?: boolean }) => {
      const shouldResetEvents = options?.resetEvents ?? true;

      dosageJobSocketService.disconnect();
      setLiveSocketState("connecting");

      if (shouldResetEvents) {
        setLiveLogEvents([]);
      }

      dosageJobSocketService.connect(jobId, {
        onConnect: () => {
          setLiveSocketState("connected");
        },
        onDisconnect: () => {
          setLiveSocketState("disconnected");
        },
        onError: (error) => {
          setLiveSocketState("error");
          toast.error("Errore connessione live", {
            description: error.message,
          });
        },
        onJoined: (room) => {
          setLiveLogEvents((prev) => [
            ...prev,
            {
              jobId,
              userId: "",
              timestamp: new Date().toISOString(),
              type: "info",
              message: `Connesso alla room ${room}`,
            },
          ]);
        },
        onLog: (event) => {
          setLiveLogEvents((prev) => [...prev, event]);
          // Auto-scroll to bottom
          setTimeout(() => {
            liveLogsScrollRef.current?.scrollTo({
              top: liveLogsScrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          }, 50);
        },
      });
    },
    []
  );

  const handleOpenLiveLogs = useCallback(
    (jobId: string) => {
      setLiveLogsJobId(jobId);
      setIsLiveLogsDrawerOpen(true);
      connectLiveLogs(jobId, { resetEvents: true });
    },
    [connectLiveLogs]
  );

  const reconnectLiveLogs = useCallback(() => {
    if (!liveLogsJobId || !isLiveLogsDrawerOpen) {
      return;
    }
    connectLiveLogs(liveLogsJobId, { resetEvents: false });
  }, [connectLiveLogs, isLiveLogsDrawerOpen, liveLogsJobId]);

  const handleCloseLiveLogs = useCallback(() => {
    dosageJobSocketService.disconnect();
    setIsLiveLogsDrawerOpen(false);
    setLiveLogsJobId(null);
    clearLiveLogEvents();
    setLiveSocketState("disconnected");
  }, [clearLiveLogEvents]);

  useEffect(() => {
    return () => {
      dosageJobSocketService.disconnect();
    };
  }, []);

  return {
    isLiveLogsDrawerOpen,
    setIsLiveLogsDrawerOpen,
    liveLogsJobId,
    liveLogEvents,
    liveSocketState,
    liveLogsScrollRef,
    handleOpenLiveLogs,
    handleCloseLiveLogs,
    reconnectLiveLogs,
    clearLiveLogEvents,
  };
}
