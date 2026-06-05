import { useState } from "react";
import { ChevronDown, ChevronUp, Brain, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_LOGO_URL } from "@/config/brand";

interface DeepThinkingBarsProps {
  thinking: string | undefined;
  toolCalls: { name: string; completed: boolean }[];
  isActive: boolean;
}

function LogoSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <img
        src={APP_LOGO_URL}
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

export function DeepThinkingBars({
  thinking,
  toolCalls,
  isActive,
}: DeepThinkingBarsProps) {
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  if (!isActive) {
    return null;
  }

  const completedTasks = toolCalls.filter((t) => t.completed).length;
  const totalTasks = toolCalls.length;
  const tasksBadge = totalTasks > 0 ? `${completedTasks}/${totalTasks}` : undefined;

  return (
    <div className="flex-shrink-0 z-10 shadow-sm bg-white">
      <ToggleBar
        title="Pensiero AI"
        icon={Brain}
        isOpen={thinkingOpen}
        onToggle={() => setThinkingOpen(!thinkingOpen)}
        showSpinner={!thinkingOpen && !!thinking}
      >
        {thinking ? (
          <p className="text-xs text-slate-600 whitespace-pre-wrap break-words leading-relaxed">
            {thinking}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic">Elaborazione in corso...</p>
        )}
      </ToggleBar>

      <ToggleBar
        title="Task in corso"
        icon={ListChecks}
        isOpen={tasksOpen}
        onToggle={() => setTasksOpen(!tasksOpen)}
        badge={tasksBadge}
        showSpinner={!tasksOpen && totalTasks > 0 && completedTasks < totalTasks}
      >
        {toolCalls.length > 0 ? (
          <ul className="space-y-1.5">
            {toolCalls.map((tool, index) => (
              <li
                key={index}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  tool.completed ? "text-emerald-600" : "text-slate-600"
                )}
              >
                {tool.completed ? (
                  <span className="text-emerald-500">✓</span>
                ) : (
                  <LogoSpinner className="scale-75" />
                )}
                <span>{tool.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 italic">Nessun task avviato</p>
        )}
      </ToggleBar>
    </div>
  );
}

export default DeepThinkingBars;
