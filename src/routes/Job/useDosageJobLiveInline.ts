import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  dosageJobSocketService,
  type DosageLogEvent,
  type SocketConnectionState,
} from "@/services/dosageJobSocket";

export interface UseDosageJobLiveInlineResult {
  events: DosageLogEvent[];
  connectionState: SocketConnectionState;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  clearEvents: () => void;
  /** Whether the job has completed (received a "complete" event via socket) */
  isComplete: boolean;
}

export interface UseDosageJobLiveInlineOptions {
  /** Called when the socket receives a "complete" event for the job */
  onComplete?: (jobId: string) => void;
}

export function useDosageJobLiveInline(
  jobId: string | null,
  options?: UseDosageJobLiveInlineOptions,
): UseDosageJobLiveInlineResult {
  const [events, setEvents] = useState<DosageLogEvent[]>([]);
  const [connectionState, setConnectionState] =
    useState<SocketConnectionState>("disconnected");
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(options?.onComplete);
  onCompleteRef.current = options?.onComplete;

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (jobId === null) {
      dosageJobSocketService.disconnect();
      setEvents([]);
      setConnectionState("disconnected");
      setIsComplete(false);
      return;
    }

    dosageJobSocketService.disconnect();
    setConnectionState("connecting");
    setEvents([]);
    setIsComplete(false);

    dosageJobSocketService.connect(jobId, {
      onConnect: () => {
        setConnectionState("connected");
      },
      onDisconnect: () => {
        setConnectionState("disconnected");
      },
      onError: (error) => {
        setConnectionState("error");
        toast.error("Errore connessione live", {
          description: error.message,
        });
      },
      onJoined: (room) => {
        setEvents((prev) => [
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
        setEvents((prev) => [...prev, event]);

        if (event.type === "complete") {
          setIsComplete(true);
          onCompleteRef.current?.(jobId);
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
  }, [jobId]);

  return {
    events,
    connectionState,
    scrollRef,
    clearEvents,
    isComplete,
  };
}
