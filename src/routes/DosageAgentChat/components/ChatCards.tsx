import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ApprovalCard } from "@/components/hitl/ApprovalCard";
import type {
  DosageAgentPendingApproval,
  ActivePlan,
} from "@/hooks/useDosageAgentChat";
import type { PlanStep } from "@/api/dosage-agent-chat";
import { getToolLabel, DESTRUCTIVE_TOOL_DESCRIPTIONS } from "../constants";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOOLS_HIDING_ARGS = new Set(["approve_field_note", "reject_field_note"]);

function hasVisibleArgs(args: Record<string, unknown>): boolean {
  const keys = Object.keys(args);
  return keys.length > 0;
}

function filterSensitiveArgs(args: Record<string, unknown>): Record<string, unknown> {
  const sanitizeValue = (
    value: unknown,
    parentKey?: string,
  ): unknown => {
    if (parentKey && parentKey.toLowerCase().endsWith("id")) {
      return undefined;
    }
    if (typeof value === "string" && UUID_REGEX.test(value)) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => sanitizeValue(item))
        .filter((item) => item !== undefined);
    }
    if (value && typeof value === "object") {
      const entries = Object.entries(value).flatMap(([key, nestedValue]) => {
        const sanitizedValue = sanitizeValue(nestedValue, key);
        if (sanitizedValue === undefined) {
          return [];
        }
        return [[key, sanitizedValue] as const];
      });
      return Object.fromEntries(entries);
    }
    return value;
  };

  const sanitized = sanitizeValue(args);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? (sanitized as Record<string, unknown>)
    : {};
}

function renderDateChangeRow(
  label: string,
  currentValue: unknown,
  nextValue: unknown,
) {
  if (!nextValue || currentValue === nextValue) {
    return null;
  }
  return (
    <div key={label} className="grid grid-cols-[78px_1fr] gap-2 text-[11px]">
      <span className="font-medium text-amber-900">{label}</span>
      <span className="text-amber-800">
        {String(currentValue || "non impostata")} {" -> "} {String(nextValue)}
      </span>
    </div>
  );
}

function renderUpdateProductionUnitsPreview(args: Record<string, unknown>) {
  const updates = Array.isArray(args.updates)
    ? args.updates.filter(
        (update): update is Record<string, unknown> =>
          !!update && typeof update === "object",
      )
    : [];
  if (updates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {typeof args.reason === "string" && args.reason.trim() && (
        <div className="rounded bg-amber-100 p-2 text-[11px] text-amber-900">
          <span className="font-medium">Motivo:</span> {args.reason}
        </div>
      )}
      {updates.map((update, index) => {
        const title = String(update.productionUnitName || `Unità ${index + 1}`);
        const subtitle = [update.cropName, update.variety]
          .filter(Boolean)
          .join(" - ");
        const dateRows = [
          renderDateChangeRow(
            "Inizio",
            update.currentStartDate,
            update.newStartDate,
          ),
          renderDateChangeRow(
            "Fioritura",
            update.currentFloweringDate,
            update.newFloweringDate,
          ),
          renderDateChangeRow(
            "Raccolta",
            update.currentHarvestingDate,
            update.newHarvestingDate,
          ),
          renderDateChangeRow("Fine", update.currentEndDate, update.newEndDate),
        ].filter(Boolean);

        return (
          <div
            key={`${title}-${index}`}
            className="rounded bg-amber-100 p-2 text-[11px] text-amber-900 space-y-1.5"
          >
            <div>
              <p className="font-medium">{title}</p>
              {subtitle && <p className="text-amber-800">{subtitle}</p>}
            </div>
            <div className="space-y-1">{dateRows}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Treatment Plan Card ─────────────────────────────────────
export function TreatmentPlanCard({ plan }: { plan: ActivePlan }) {
  const [isOpen, setIsOpen] = useState(true);
  const completedSteps = plan.steps.filter((s) => s.status === "completed").length;
  const progressPercent =
    plan.totalSteps > 0 ? Math.round((completedSteps / plan.totalSteps) * 100) : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-slate-800">Piano trattamento</span>
              <Badge variant="outline" className="text-[10px]">
                {completedSteps}/{plan.totalSteps}
              </Badge>
            </div>
            {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>
        </CollapsibleTrigger>
        {plan.status === "executing" && (
          <div className="px-4 pb-2"><Progress value={progressPercent} className="h-1.5" /></div>
        )}
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-1.5">
            {plan.steps.map((step) => <PlanStepRow key={step.stepNumber} step={step} />)}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function PlanStepRow({ step }: { step: PlanStep }) {
  const icon = (() => {
    switch (step.status) {
      case "completed": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
      case "in_progress": return <Spinner className="h-3.5 w-3.5" ariaLabel="In corso" />;
      case "modified": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "failed": return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      default: return <Circle className="h-3.5 w-3.5 text-slate-300" />;
    }
  })();

  return (
    <div className={cn("flex items-start gap-2 rounded-md px-2 py-1.5 text-xs", step.status === "in_progress" && "bg-emerald-100/50", step.status === "completed" && "text-slate-500")}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <span className="font-medium">Passo {step.stepNumber}:</span> {step.description}
        {step.toolName && <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0">{getToolLabel(step.toolName)}</Badge>}
      </div>
    </div>
  );
}

// ─── Pending Action Card ──────────────────────────────────────
export function PendingActionCard({
  pendingApproval, isBusy, onApprove, onReject,
}: {
  pendingApproval: DosageAgentPendingApproval;
  isBusy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const toolName = pendingApproval.toolCall.name;
  const destructiveDescription = DESTRUCTIVE_TOOL_DESCRIPTIONS[toolName];

  const renderDosageToolArgs = (args: Record<string, unknown>) => {
    if (!hasVisibleArgs(args) || TOOLS_HIDING_ARGS.has(toolName)) return null;
    const cleaned = filterSensitiveArgs(args);
    if (Object.keys(cleaned).length === 0) return null;
    if (toolName === "update_production_units") {
      return renderUpdateProductionUnitsPreview(cleaned);
    }
    return (
      <pre className="text-[10px] bg-amber-100 rounded p-2 overflow-x-auto">
        {JSON.stringify(cleaned, null, 2)}
      </pre>
    );
  };

  return (
    <ApprovalCard
      toolCall={pendingApproval.toolCall}
      riskLevel={pendingApproval.riskLevel}
      onApprove={onApprove}
      onReject={onReject}
      disabled={isBusy}
      theme="amber"
      toolLabel={getToolLabel(toolName)}
      description={destructiveDescription}
      renderToolArgs={renderDosageToolArgs}
    />
  );
}
