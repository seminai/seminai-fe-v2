import { useState } from "react";
import { ChevronDown, ChevronUp, Brain, ListTodo, Check, Wrench, Search, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { AgentTask } from "@/api/job-verification-agent";
import type { ThinkingStep } from "@/hooks/useJobVerificationAgent";

interface JobDeepThinkingBarsProps {
  thinkingSteps: ThinkingStep[];
  tasks: AgentTask[];
  currentTaskId: string | null;
  isLoading: boolean;
}

function LogoSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <img
        src="/logo.png"
        alt="Seminai"
        className="w-5 h-5 animate-spin"
        style={{ animationDuration: "2s" }}
      />
    </div>
  );
}

function ToggleBar({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
  showSpinner,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  showSpinner?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {showSpinner ? (
            <LogoSpinner />
          ) : (
            <Icon className="w-4 h-4 text-emerald-600" />
          )}
          <span className="text-sm font-medium text-slate-700">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 max-h-48 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function getStepIcon(type: ThinkingStep["type"]) {
  switch (type) {
    case "thinking":
      return <Brain className="h-3 w-3" />;
    case "tool_start":
      return <Wrench className="h-3 w-3" />;
    case "tool_result":
      return <CheckCircle2 className="h-3 w-3" />;
    case "data_inspection":
      return <Search className="h-3 w-3" />;
    case "task_progress":
      return <ListTodo className="h-3 w-3" />;
    case "reasoning":
      return <Brain className="h-3 w-3" />;
    default:
      return <Info className="h-3 w-3" />;
  }
}

function getStepStyle(type: ThinkingStep["type"]) {
  switch (type) {
    case "thinking":
      return "bg-blue-50 border-l-2 border-blue-300 text-blue-700";
    case "tool_start":
      return "bg-amber-50 border-l-2 border-amber-300 text-amber-700";
    case "tool_result":
      return "bg-emerald-50 border-l-2 border-emerald-300 text-emerald-700";
    case "data_inspection":
      return "bg-purple-50 border-l-2 border-purple-300 text-purple-700";
    case "task_progress":
      return "bg-slate-100 border-l-2 border-slate-300 text-slate-700";
    case "reasoning":
      return "bg-indigo-50 border-l-2 border-indigo-300 text-indigo-700";
    default:
      return "bg-slate-50 border-l-2 border-slate-300 text-slate-700";
  }
}

export function JobDeepThinkingBars({
  thinkingSteps,
  tasks,
  currentTaskId,
  isLoading,
}: JobDeepThinkingBarsProps) {
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  // Hide bars when not loading and no content
  if (!isLoading && thinkingSteps.length === 0 && tasks.length === 0) {
    return null;
  }

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const tasksBadge = totalTasks > 0 ? `${completedTasks}/${totalTasks}` : undefined;

  return (
    <div className="flex-shrink-0 z-10 shadow-sm bg-white">
      {/* Thinking Bar */}
      <ToggleBar
        title="Pensiero AI"
        icon={Brain}
        isOpen={thinkingOpen}
        onToggle={() => setThinkingOpen(!thinkingOpen)}
        showSpinner={!thinkingOpen && isLoading}
      >
        {thinkingSteps.length > 0 ? (
          <div className="space-y-1">
            {thinkingSteps.slice(-10).map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-r text-xs",
                  getStepStyle(step.type)
                )}
              >
                <span className="flex-shrink-0 mt-0.5">{getStepIcon(step.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="break-words">{step.message}</p>
                  {step.toolName && (
                    <code className="text-[10px] bg-white/50 px-1 py-0.5 rounded mt-1 inline-block">
                      {step.toolName}
                    </code>
                  )}
                </div>
              </div>
            ))}
            {thinkingSteps.length > 10 && (
              <p className="text-[10px] text-slate-400 text-center">
                ... e altri {thinkingSteps.length - 10} passaggi
              </p>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Spinner className="h-3 w-3" ariaLabel="Pensando" />
            <span>Inizializzazione...</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Nessun pensiero</p>
        )}
      </ToggleBar>

      {/* Tasks Bar */}
      <ToggleBar
        title="Piano di lavoro"
        icon={ListTodo}
        isOpen={tasksOpen}
        onToggle={() => setTasksOpen(!tasksOpen)}
        badge={tasksBadge}
        showSpinner={!tasksOpen && isLoading && tasks.length > 0 && completedTasks < totalTasks}
      >
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-colors",
                  task.id === currentTaskId && "bg-blue-50 border border-blue-200"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0",
                    task.status === "completed" && "bg-emerald-500 text-white",
                    task.status === "in_progress" && "bg-blue-500 text-white",
                    task.status === "pending" && "bg-slate-200 text-slate-600"
                  )}
                >
                  {task.status === "completed" ? (
                    <Check className="h-3 w-3" />
                  ) : task.status === "in_progress" ? (
                    <LogoSpinner className="scale-75" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs flex-1",
                    task.status === "completed" && "text-slate-500 line-through",
                    task.status === "in_progress" && "text-blue-700 font-medium",
                    task.status === "pending" && "text-slate-700"
                  )}
                >
                  {task.description}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Nessun task avviato</p>
        )}
      </ToggleBar>
    </div>
  );
}

export default JobDeepThinkingBars;
