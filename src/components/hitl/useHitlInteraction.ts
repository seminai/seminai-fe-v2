import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { Questionnaire } from "./QuestionnaireCard";

/**
 * Generic tool call shape for HITL pending approvals.
 * Compatible with both DosageAgentToolCall and AgentToolCall.
 */
export interface HitlToolCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
  readonly id?: string;
}

/**
 * Standard response from an approve/reject API call.
 * Each agent's API service should return this shape.
 */
export interface HitlActionResponse {
  readonly status: "COMPLETED" | "REQUIRES_APPROVAL" | "ERROR";
  readonly message?: string;
  readonly error?: string;
  readonly pendingToolCalls?: HitlToolCall[];
}

export interface UseHitlInteractionOptions {
  /** API call for approving the pending action */
  readonly onApprove: () => Promise<HitlActionResponse>;
  /** API call for rejecting with a reason */
  readonly onReject: (reason: string) => Promise<HitlActionResponse>;
  /** Called when a new questionnaire answer should be sent as a message */
  readonly onSubmitQuestionnaire?: (formattedMessage: string) => Promise<void>;
  /** Called after a successful approve/reject/completion */
  readonly onCompleted?: (response: HitlActionResponse) => void;
  /** Called when the response requires another approval */
  readonly onRequiresApproval?: (response: HitlActionResponse) => void;
  /** Called when the API call fails */
  readonly onError?: (error: string) => void;
  /** Whether the parent hook is currently busy (streaming, processing, etc.) */
  readonly isBusy?: boolean;
}

export interface UseHitlInteractionResult {
  readonly pendingApproval: HitlToolCall | null;
  readonly setPendingApproval: (toolCall: HitlToolCall | null) => void;
  readonly activeQuestionnaire: Questionnaire | null;
  readonly setActiveQuestionnaire: (q: Questionnaire | null) => void;
  readonly approveAction: () => Promise<void>;
  readonly rejectAction: (reason: string) => Promise<void>;
  readonly submitQuestionnaire: (answers: Record<string, string | string[]>) => Promise<void>;
  readonly isApprovalInFlight: boolean;
}

/**
 * Manages HITL approval/reject/questionnaire state for any agent.
 * Delegates actual API calls and message handling to the parent hook
 * via callbacks, keeping the state management generic.
 */
export function useHitlInteraction(
  options: UseHitlInteractionOptions,
): UseHitlInteractionResult {
  const {
    onApprove,
    onReject,
    onSubmitQuestionnaire,
    onCompleted,
    onRequiresApproval,
    onError,
    isBusy = false,
  } = options;

  const [pendingApproval, setPendingApproval] = useState<HitlToolCall | null>(null);
  const [activeQuestionnaire, setActiveQuestionnaire] = useState<Questionnaire | null>(null);
  const inFlightRef = useRef(false);

  const handleResponse = useCallback(
    (response: HitlActionResponse) => {
      if (response.status === "ERROR") {
        const errorMessage = response.error || "Errore sconosciuto";
        onError?.(errorMessage);
        toast.error("Errore", { description: errorMessage });
        return;
      }
      if (
        response.status === "REQUIRES_APPROVAL" &&
        response.pendingToolCalls &&
        response.pendingToolCalls.length > 0
      ) {
        setPendingApproval(response.pendingToolCalls[0]);
        onRequiresApproval?.(response);
        return;
      }
      setPendingApproval(null);
      onCompleted?.(response);
    },
    [onCompleted, onRequiresApproval, onError],
  );

  const approveAction = useCallback(async () => {
    if (isBusy || inFlightRef.current || !pendingApproval) return;
    inFlightRef.current = true;
    setPendingApproval(null);
    try {
      const response = await onApprove();
      handleResponse(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      onError?.(errorMessage);
      toast.error("Errore approvazione", { description: errorMessage });
    } finally {
      inFlightRef.current = false;
    }
  }, [isBusy, pendingApproval, onApprove, handleResponse, onError]);

  const rejectAction = useCallback(
    async (reason: string) => {
      if (!reason.trim() || isBusy || inFlightRef.current || !pendingApproval) return;
      inFlightRef.current = true;
      setPendingApproval(null);
      try {
        const response = await onReject(reason);
        handleResponse(response);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
        onError?.(errorMessage);
        toast.error("Errore rifiuto", { description: errorMessage });
      } finally {
        inFlightRef.current = false;
      }
    },
    [isBusy, pendingApproval, onReject, handleResponse, onError],
  );

  const submitQuestionnaire = useCallback(
    async (answers: Record<string, string | string[]>) => {
      setActiveQuestionnaire(null);
      if (!onSubmitQuestionnaire) return;
      const lines = Object.entries(answers)
        .map(([questionId, answer]) => {
          const value = Array.isArray(answer) ? answer.join(", ") : answer;
          return `- ${questionId}: ${value}`;
        })
        .join("\n");
      await onSubmitQuestionnaire(`Risposte al questionario:\n${lines}`);
    },
    [onSubmitQuestionnaire],
  );

  return {
    pendingApproval,
    setPendingApproval,
    activeQuestionnaire,
    setActiveQuestionnaire,
    approveAction,
    rejectAction,
    submitQuestionnaire,
    isApprovalInFlight: inFlightRef.current,
  };
}
