import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

// Types for violations
export interface ConformityViolation {
  type: string;
  message: string;
  severity: "ERROR" | "WARNING" | "INFO";
  source: "LABEL" | "DISCIPLINARI" | "USER_NOTES" | "SYSTEM";
  field: string;
  currentValue: number | string;
  expectedValue: number | string;
}

// Types for job values
export interface JobValues {
  quantity: number;
  unitOfMeasureQuantity: string;
  dateOfOpeation: string;
  treatedSurface: number;
  note?: string;
}

// Types for proposal
export interface ConformityProposal {
  jobId: string;
  productionUnitId: string;
  productName: string;
  registrationNumber: string;
  wasAlreadyChecked: boolean;
  isConform: boolean;
  violations: ConformityViolation[];
  originalValues: JobValues;
  proposedValues: JobValues;
  shouldExclude: boolean;
  exclusionReason: string | null;
}

// Types for summary
export interface ConformitySummary {
  totalJobs: number;
  alreadyCheckedJobs: number;
  newlyCheckedJobs: number;
  conformJobs: number;
  nonConformJobs: number;
  jobsToExclude: number;
  totalViolations: number;
  errorCount: number;
  warningCount: number;
}

// Types for user notes analysis
export interface UserNotesAnalysis {
  originalNotes: string;
  appliedRules: string[];
  ignoredRules: string[];
}

// Full response from conformity check
export interface ConformityCheckResult {
  jobGroupId: string;
  proposals: ConformityProposal[];
  summary: ConformitySummary;
  userNotesAnalysis?: UserNotesAnalysis;
  checkedAt: string;
}

// Job status types
export type ConformityJobState = "active" | "completed" | "failed" | "waiting";

export interface ConformityJobStatusActive {
  id: string;
  state: "active" | "waiting";
  progress: number;
  data: {
    jobGroupId: string;
    userId: string;
    notes?: string;
  };
}

export interface ConformityJobStatusCompleted {
  id: string;
  state: "completed";
  progress: 100;
  result: ConformityCheckResult;
}

export interface ConformityJobStatusFailed {
  id: string;
  state: "failed";
  progress: number;
  failedReason: string;
  processedOn?: number;
  finishedOn?: number;
}

export type ConformityJobStatus =
  | ConformityJobStatusActive
  | ConformityJobStatusCompleted
  | ConformityJobStatusFailed;

// API Response wrappers
interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
}

interface StartJobResponse {
  jobId: string;
  message: string;
}

class ConformityCheckerApiService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = `${BASE_URL}/conformity-checker`;
  }

  /**
   * Start a conformity check job
   */
  public async startJob(
    jobGroupId: string,
    notes?: string
  ): Promise<StartJobResponse> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/start-job`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobGroupId,
          notes: notes || "",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to start conformity job: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    return result.data ?? result;
  }

  /**
   * Get the status of a conformity check job
   */
  public async getJobStatus(jobId: string): Promise<ConformityJobStatus> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/job-status/${jobId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get job status: ${response.status} - ${errorText}`
      );
    }

    const result: ApiResponse<ConformityJobStatus> = await response.json();
    return result.data;
  }

  /**
   * Confirm the conformity check proposals
   */
  public async confirmProposals(
    jobGroupId: string,
    proposals: ConformityProposal[]
  ): Promise<void> {
    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/confirm`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobGroupId,
          proposals,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to confirm proposals: ${response.status} - ${errorText}`
      );
    }
  }

  /**
   * Poll for job completion with configurable interval and timeout
   */
  public async pollJobStatus(
    jobId: string,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      onProgress?: (progress: number, state: ConformityJobState) => void;
    } = {}
  ): Promise<ConformityJobStatus> {
    const { intervalMs = 2000, timeoutMs = 300000, onProgress } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getJobStatus(jobId);

      if (onProgress) {
        onProgress(status.progress, status.state);
      }

      if (status.state === "completed" || status.state === "failed") {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Polling timeout exceeded");
  }
}

export const conformityCheckerApiService = new ConformityCheckerApiService();

