import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Shared tool call shape used across all agents.
 * Compatible with both DosageAgentToolCall and AgentToolCall.
 */
export interface ApprovalToolCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
  readonly id?: string;
}

export type ApprovalTheme = "amber" | "blue";

const THEME_CLASSES: Record<
  ApprovalTheme,
  {
    container: string;
    icon: string;
    iconBg: string;
    title: string;
    subtitle: string;
    rejectBorder: string;
    rejectLabel: string;
    rejectButton: string;
  }
> = {
  amber: {
    container: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "text-amber-600",
    iconBg: "",
    title: "text-amber-900",
    subtitle: "text-amber-800",
    rejectBorder: "border-amber-200",
    rejectLabel: "text-amber-800",
    rejectButton: "",
  },
  blue: {
    container: "border-blue-200 bg-blue-50 text-blue-900",
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
    title: "text-blue-900",
    subtitle: "text-blue-800",
    rejectBorder: "border-blue-200",
    rejectLabel: "text-blue-800",
    rejectButton: "border-blue-300 text-blue-700 hover:bg-blue-50",
  },
};

export interface ApprovalCardProps {
  /** Tool call awaiting approval */
  readonly toolCall: ApprovalToolCall;
  /** Risk level shown as visual hint (only used in amber theme) */
  readonly riskLevel?: "low" | "medium" | "high";
  /** Called when user approves the action */
  readonly onApprove: () => void;
  /** Called when user rejects with a reason */
  readonly onReject: (reason: string) => void;
  /** Disables all interactive elements */
  readonly disabled?: boolean;
  /** Color theme: amber for dosage warnings, blue for field note confirmations */
  readonly theme?: ApprovalTheme;
  /** Title shown at the top of the card */
  readonly title?: string;
  /** Subtitle shown below the title */
  readonly subtitle?: string;
  /** Human-readable label for the tool */
  readonly toolLabel?: string;
  /** Description for the tool action */
  readonly description?: string;
  /** Agent-specific rendering of tool arguments */
  readonly renderToolArgs?: (args: Record<string, unknown>) => React.ReactNode;
  /** Placeholder for the reject textarea */
  readonly rejectPlaceholder?: string;
  /** Label for the reject confirmation button */
  readonly rejectButtonLabel?: string;
  /** Label for the initial reject toggle */
  readonly rejectToggleLabel?: string;
  /** Label for the approve button */
  readonly approveLabel?: string;
}

/**
 * Shared approval card used by any agent with a HITL approve/reject flow.
 * Supports two themes (amber for destructive warnings, blue for confirmations)
 * and a slot for agent-specific tool argument rendering.
 */
export function ApprovalCard({
  toolCall,
  onApprove,
  onReject,
  disabled = false,
  theme = "amber",
  title = "Azione in attesa di approvazione",
  subtitle,
  toolLabel,
  description,
  renderToolArgs,
  rejectPlaceholder = "Motivo del rifiuto...",
  rejectButtonLabel = "Conferma rifiuto",
  rejectToggleLabel = "Rifiuta",
  approveLabel = "Approva",
}: ApprovalCardProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const t = THEME_CLASSES[theme];

  const handleReject = () => {
    if (showRejectInput) {
      if (rejectReason.trim()) {
        onReject(rejectReason.trim());
        setRejectReason("");
        setShowRejectInput(false);
      }
    } else {
      setShowRejectInput(true);
    }
  };

  const Icon = theme === "blue" ? Check : AlertTriangle;

  return (
    <div className={cn("rounded-lg border p-4 text-sm space-y-3", t.container)}>
      <div className="flex items-start gap-2">
        {theme === "blue" ? (
          <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center", t.iconBg)}>
            <Icon className={cn("h-4 w-4", t.icon)} />
          </div>
        ) : (
          <Icon className={cn("h-4 w-4 shrink-0", t.icon)} />
        )}
        <div className="flex-1">
          <p className={cn("font-medium", t.title)}>{title}</p>
          {subtitle && <p className={cn("text-xs mt-1", t.subtitle)}>{subtitle}</p>}
        </div>
      </div>

      {toolLabel && (
        <p className={cn("text-xs", t.subtitle)}>
          L'agente vuole eseguire: <strong>{toolLabel}</strong>
        </p>
      )}

      {description && (
        <p className={cn("text-xs rounded p-2", theme === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
          {description}
        </p>
      )}

      {renderToolArgs?.(toolCall.args)}

      {showRejectInput && (
        <div className={cn("space-y-2 pt-2 border-t", t.rejectBorder)}>
          {theme === "blue" && (
            <label className={cn("text-xs font-medium", t.rejectLabel)}>
              Cosa vuoi correggere?
            </label>
          )}
          <Textarea
            placeholder={rejectPlaceholder}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[60px] resize-none text-xs bg-white"
            autoFocus
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className={cn(
            "bg-emerald-600 hover:bg-emerald-700 text-white",
            theme === "blue" && "flex-1",
          )}
          onClick={onApprove}
          disabled={disabled}
        >
          {theme === "blue" && <Check className="h-4 w-4 mr-1" />}
          {approveLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn(theme === "blue" && "flex-1", t.rejectButton)}
          onClick={handleReject}
          disabled={disabled}
        >
          {showRejectInput ? rejectButtonLabel : rejectToggleLabel}
        </Button>
        {showRejectInput && theme !== "blue" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
          >
            Annulla
          </Button>
        )}
      </div>
    </div>
  );
}
