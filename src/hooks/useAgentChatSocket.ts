import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  agentChatSocketService,
  type AgentSocketToolCall,
  type AgentSocketMemoryUpdate,
  type AgentSocketTaskUpdate,
  type AgentSocketSubagentProgress,
  type AgentSocketAlert,
  type AgentSocketExtractionComplete,
  type AgentSocketExtractionFailed,
  type AgentSocketExtractionProgress,
  type SocketConnectionState,
} from "@/services/agentChatSocket";

export interface AgentActivityItem {
  readonly id: string;
  readonly type: "tool_call" | "memory" | "task" | "subagent" | "alert" | "extraction";
  readonly label: string;
  readonly detail?: string;
  readonly timestamp: number;
}

export interface AgentChatSocketOptions {
  /** Called when async file extraction completes, use to trigger a follow-up agent message */
  readonly onExtractionComplete?: (event: AgentSocketExtractionComplete) => void;
}

export interface TaskItem {
  readonly id: string;
  readonly content: string;
  readonly status: string;
}

const MAX_ACTIVITY_ITEMS = 50;

export function useAgentChatSocket(
  threadId: string,
  enabled: boolean,
  options?: AgentChatSocketOptions,
) {
  const [connectionState, setConnectionState] =
    useState<SocketConnectionState>("disconnected");
  const [activityLog, setActivityLog] = useState<AgentActivityItem[]>([]);
  const [taskList, setTaskList] = useState<TaskItem[]>([]);
  const [memoryKeys, setMemoryKeys] = useState<
    Map<string, { preview: string; updatedAt: number }>
  >(new Map());
  const [subagentProgress, setSubagentProgress] = useState<
    Map<string, { progress: number; step: string }>
  >(new Map());
  const [extractionProgress, setExtractionProgress] = useState<{
    progress: number;
    step: string;
  } | null>(null);

  const activityIdRef = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const pushActivity = useCallback(
    (type: AgentActivityItem["type"], label: string, detail?: string) => {
      const item: AgentActivityItem = {
        id: `act-${activityIdRef.current++}`,
        type,
        label,
        detail,
        timestamp: Date.now(),
      };
      setActivityLog((prev) => {
        const next = [item, ...prev];
        return next.length > MAX_ACTIVITY_ITEMS
          ? next.slice(0, MAX_ACTIVITY_ITEMS)
          : next;
      });
    },
    [],
  );

  const clearActivity = useCallback(() => {
    setActivityLog([]);
    setTaskList([]);
    setMemoryKeys(new Map());
    setSubagentProgress(new Map());
    setExtractionProgress(null);
  }, []);

  useEffect(() => {
    if (!enabled || !threadId) {
      agentChatSocketService.disconnect();
      setConnectionState("disconnected");
      return;
    }

    agentChatSocketService.connect(threadId, {
      onConnect: () => setConnectionState("connected"),
      onDisconnect: () => setConnectionState("disconnected"),
      onError: () => setConnectionState("error"),

      onToolCall: (event: AgentSocketToolCall) => {
        pushActivity("tool_call", event.toolName, JSON.stringify(event.args));
      },

      onMemoryUpdate: (event: AgentSocketMemoryUpdate) => {
        pushActivity("memory", `Memoria: ${event.key}`, event.preview);
        setMemoryKeys((prev) => {
          const next = new Map(prev);
          next.set(event.key, {
            preview: event.preview,
            updatedAt: event.timestamp,
          });
          return next;
        });
      },

      onTaskUpdate: (event: AgentSocketTaskUpdate) => {
        const tasks = event.taskList.map((t) => ({
          id: t.id,
          content: t.content,
          status: t.status,
        }));
        setTaskList(tasks);
        pushActivity(
          "task",
          `Piano aggiornato (${tasks.length} task)`,
        );
      },

      onSubagentProgress: (event: AgentSocketSubagentProgress) => {
        setSubagentProgress((prev) => {
          const next = new Map(prev);
          next.set(event.subAgentId, {
            progress: event.progress,
            step: event.step,
          });
          return next;
        });
        pushActivity(
          "subagent",
          `Sub-agent: ${event.step}`,
          `${event.progress}%`,
        );
      },

      onOuterLoopAlert: (event: AgentSocketAlert) => {
        pushActivity("alert", event.title, event.type);
        toast.info(event.title, {
          description: `Alert proattivo: ${event.type}`,
          duration: 8000,
        });
      },

      onExtractionProgress: (event: AgentSocketExtractionProgress) => {
        setExtractionProgress({ progress: event.progress, step: event.step });
      },

      onExtractionComplete: (event: AgentSocketExtractionComplete) => {
        setExtractionProgress(null);
        pushActivity("extraction", "Estrazione completata", event.summary);
        toast.success("File elaborato", {
          description: event.summary,
          duration: 6000,
        });
        options?.onExtractionComplete?.(event);
      },

      onExtractionFailed: (event: AgentSocketExtractionFailed) => {
        setExtractionProgress(null);
        pushActivity("extraction", "Estrazione fallita", event.error);
        toast.error("Errore elaborazione file", {
          description: event.error,
          duration: 8000,
        });
      },
    });

    return () => {
      agentChatSocketService.disconnect();
      setConnectionState("disconnected");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- options callbacks are stable refs
  }, [threadId, enabled, pushActivity]);

  return {
    connectionState,
    activityLog,
    taskList,
    memoryKeys,
    subagentProgress,
    extractionProgress,
    clearActivity,
  };
}
