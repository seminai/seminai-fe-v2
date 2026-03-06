import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type {
  DosageAgentPendingApproval,
  ActivePlan,
} from "@/hooks/useDosageAgentChat";
import type { PlanStep } from "@/api/dosage-agent-chat";
import { getToolLabel, DESTRUCTIVE_TOOL_DESCRIPTIONS } from "../constants";

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
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const toolName = pendingApproval.toolCall.name;
  const destructiveDescription = DESTRUCTIVE_TOOL_DESCRIPTIONS[toolName];

  const handleReject = () => {
    if (showRejectInput) {
      if (rejectReason.trim()) { onReject(rejectReason.trim()); setRejectReason(""); setShowRejectInput(false); }
    } else { setShowRejectInput(true); }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="font-medium">Azione in attesa di approvazione</p>
      </div>
      <p className="text-xs text-amber-800">
        L'agente vuole eseguire: <strong>{getToolLabel(toolName)}</strong>
      </p>
      {destructiveDescription && (
        <p className="text-xs text-amber-700 bg-amber-100 rounded p-2">{destructiveDescription}</p>
      )}
      {pendingApproval.toolCall.args && Object.keys(pendingApproval.toolCall.args).length > 0 && (
        <pre className="text-[10px] bg-amber-100 rounded p-2 overflow-x-auto">
          {JSON.stringify(pendingApproval.toolCall.args, null, 2)}
        </pre>
      )}
      {showRejectInput && (
        <Textarea placeholder="Motivo del rifiuto..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[60px] resize-none text-xs bg-white" />
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onApprove} disabled={isBusy}>Approva</Button>
        <Button size="sm" variant="outline" onClick={handleReject} disabled={isBusy}>{showRejectInput ? "Conferma rifiuto" : "Rifiuta"}</Button>
        {showRejectInput && <Button size="sm" variant="ghost" onClick={() => { setShowRejectInput(false); setRejectReason(""); }}>Annulla</Button>}
      </div>
    </div>
  );
}
