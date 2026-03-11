import { useState } from "react";
import {
  Wrench,
  Brain,
  ListChecks,
  Cpu,
  Bell,
  ChevronRight,
  Wifi,
  WifiOff,
  Activity,
  FileSearch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { SocketConnectionState } from "@/services/agentChatSocket";
import type {
  AgentActivityItem,
  TaskItem,
} from "@/hooks/useAgentChatSocket";
import { getToolLabel } from "../constants";

interface AgentActivityPanelProps {
  readonly connectionState: SocketConnectionState;
  readonly activityLog: readonly AgentActivityItem[];
  readonly taskList: readonly TaskItem[];
  readonly memoryKeys: ReadonlyMap<
    string,
    { preview: string; updatedAt: number }
  >;
  readonly subagentProgress: ReadonlyMap<
    string,
    { progress: number; step: string }
  >;
}

const ACTIVITY_ICON: Record<AgentActivityItem["type"], React.ReactNode> = {
  tool_call: <Wrench className="h-3 w-3 text-amber-600" />,
  memory: <Brain className="h-3 w-3 text-purple-600" />,
  task: <ListChecks className="h-3 w-3 text-sky-600" />,
  subagent: <Cpu className="h-3 w-3 text-teal-600" />,
  alert: <Bell className="h-3 w-3 text-rose-600" />,
  extraction: <FileSearch className="h-3 w-3 text-emerald-600" />,
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AgentActivityPanel({
  connectionState,
  activityLog,
  taskList,
  memoryKeys,
  subagentProgress,
}: AgentActivityPanelProps) {
  const [tasksOpen, setTasksOpen] = useState(true);
  const [memoryOpen, setMemoryOpen] = useState(false);

  const isConnected = connectionState === "connected";

  return (
    <div className="flex flex-col h-full w-[280px] border-l border-slate-200 bg-slate-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">
            Attivita agente
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] gap-1",
            isConnected ? "text-emerald-600" : "text-slate-400",
          )}
        >
          {isConnected ? (
            <Wifi className="h-2.5 w-2.5" />
          ) : (
            <WifiOff className="h-2.5 w-2.5" />
          )}
          {isConnected ? "Live" : "Offline"}
        </Badge>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {/* Task List */}
          {taskList.length > 0 && (
            <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-slate-700 w-full">
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform",
                    tasksOpen && "rotate-90",
                  )}
                />
                <ListChecks className="h-3 w-3 text-sky-600" />
                Task ({taskList.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5 space-y-1">
                {taskList.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-2 rounded px-2 py-1 text-[11px]"
                  >
                    <StatusDot status={t.status} />
                    <span className="text-slate-700 leading-tight">
                      {t.content}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Sub-agent Progress */}
          {subagentProgress.size > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <Cpu className="h-3 w-3 text-teal-600" />
                Sub-agenti
              </div>
              {Array.from(subagentProgress.entries()).map(([id, data]) => (
                <div key={id} className="space-y-0.5 px-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-600">
                    <span className="truncate">{data.step}</span>
                    <span>{data.progress}%</span>
                  </div>
                  <Progress value={data.progress} className="h-1" />
                </div>
              ))}
            </div>
          )}

          {/* Memory Keys */}
          {memoryKeys.size > 0 && (
            <Collapsible open={memoryOpen} onOpenChange={setMemoryOpen}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-slate-700 w-full">
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform",
                    memoryOpen && "rotate-90",
                  )}
                />
                <Brain className="h-3 w-3 text-purple-600" />
                Memoria ({memoryKeys.size})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5 space-y-1">
                {Array.from(memoryKeys.entries()).map(([key, data]) => (
                  <div
                    key={key}
                    className="rounded bg-white border border-slate-100 px-2 py-1.5"
                  >
                    <div className="text-[10px] font-medium text-purple-700">
                      {key}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {data.preview}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Activity Feed */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-700">
              Log attivita
            </div>
            {activityLog.length === 0 && (
              <p className="text-[10px] text-slate-400 italic">
                Nessuna attivita recente
              </p>
            )}
            {activityLog.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-1.5 text-[10px]"
              >
                <div className="mt-0.5 shrink-0">{ACTIVITY_ICON[item.type]}</div>
                <div className="min-w-0 flex-1">
                  <span className="text-slate-700">
                    {item.type === "tool_call"
                      ? getToolLabel(item.label)
                      : item.label}
                  </span>
                  <span className="ml-1.5 text-slate-400">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "bg-emerald-500"
      : status === "in_progress"
        ? "bg-sky-500 animate-pulse"
        : status === "cancelled"
          ? "bg-slate-300"
          : "bg-slate-300";

  return <div className={cn("mt-1 h-1.5 w-1.5 rounded-full shrink-0", color)} />;
}
