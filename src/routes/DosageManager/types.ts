import type React from "react";
import { type DosageAgentJob } from "@/api/dosage-agent";

export interface DosageJob extends DosageAgentJob {
  productsCount: number;
  unitsCount: number;
  error?: string | null;
}

export const normalizeJob = (job: DosageAgentJob): DosageJob => ({
  ...job,
  productsCount: job.productsCount ?? 0,
  unitsCount: job.unitsCount ?? 0,
  error: job.failedReason ?? null,
});

export interface ActiveJobTableRow extends Record<string, unknown> {
  id: string;
  jobId: string;
  createdAtLabel: string;
  state: DosageJob["state"];
  stateLabel: string;
  stateBadgeVariant: React.ComponentProps<
    typeof import("@/components/ui/badge").Badge
  >["variant"];
  progress: number;
  progressLabel: string;
  productsCount: number;
  unitsCount: number;
}

export interface JobHistoryTableRow extends ActiveJobTableRow {
  job: DosageJob;
}
