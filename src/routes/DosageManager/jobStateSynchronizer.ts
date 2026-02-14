import {
  dosageAgentApiService,
  type DosageProduct,
} from "@/api/dosage-agent";
import {
  dosageJobsIndexDBManager,
  type DosageJob,
} from "@/utils/dosageJobsIndexDBManager";

class DosageJobStateSynchronizer {
  private readonly api: typeof dosageAgentApiService;
  private readonly storage = dosageJobsIndexDBManager;

  constructor(api: typeof dosageAgentApiService = dosageAgentApiService) {
    this.api = api;
  }

  public async initialize(userId: string): Promise<void> {
    await this.storage.init(userId);
  }

  public async reloadAll(): Promise<DosageJob[]> {
    return await this.storage.getAllJobs();
  }

  public async refreshActiveJobs(jobs: DosageJob[]): Promise<DosageJob[]> {
    const activeJobs = jobs.filter(
      (job) =>
        job.state === "queued" ||
        job.state === "waiting" ||
        job.state === "active" ||
        job.state === "delayed"
    );

    if (activeJobs.length === 0) {
      return jobs;
    }

    for (const job of activeJobs) {
      try {
        const response = await this.api.getJobStatus(job.id);
        const statusData = response.data;
        await this.storage.updateJob(job.id, {
          state: statusData.state,
          progress: statusData.progress,
          result: statusData.result,
          productsCount: statusData.data?.productsCount ?? job.productsCount,
          unitsCount: statusData.data?.unitsCount ?? job.unitsCount,
          updatedAt: new Date(),
          error:
            statusData.state === "failed" || statusData.state === "stalled"
              ? "The dosage job has failed"
              : undefined,
        });
      } catch (error) {
        console.error(`Failed to refresh job ${job.id} during resume`, error);
      }
    }

    return await this.storage.getAllJobs();
  }
}

export const dosageJobStateSynchronizer = new DosageJobStateSynchronizer();

export type { DosageJob, DosageProduct };

