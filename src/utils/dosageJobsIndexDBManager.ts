/**
 * IndexedDB Manager for Dosage Calculation Jobs
 * Manages asynchronous job tracking for dosage calculations
 */

import type { DosageJobStatus } from "@/api/dosage-agent";

export interface DosageJob {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  state: "waiting" | "active" | "completed" | "failed";
  progress: number;
  productsCount: number;
  unitsCount: number;
  result?: DosageJobStatus["result"];
  error?: string;
}

class DosageJobsIndexDBManager {
  private dbName = "SeminaiDosageJobs";
  private version = 1;
  private storeName = "dosageJobs";
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: "id",
          });
          objectStore.createIndex("state", "state", { unique: false });
          objectStore.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db;
  }

  /**
   * Save a new job to IndexedDB
   */
  async saveJob(job: DosageJob): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(job);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to save job"));
    });
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<DosageJob | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(jobId);

      request.onsuccess = () => {
        const job = request.result as DosageJob | undefined;
        if (job) {
          // Convert date strings back to Date objects
          job.createdAt = new Date(job.createdAt);
          job.updatedAt = new Date(job.updatedAt);
        }
        resolve(job || null);
      };
      request.onerror = () => reject(new Error("Failed to get job"));
    });
  }

  /**
   * Get all jobs
   */
  async getAllJobs(): Promise<DosageJob[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const jobs = (request.result as DosageJob[]).map((job) => ({
          ...job,
          createdAt: new Date(job.createdAt),
          updatedAt: new Date(job.updatedAt),
        }));
        // Sort by createdAt descending (newest first)
        jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        resolve(jobs);
      };
      request.onerror = () => reject(new Error("Failed to get all jobs"));
    });
  }

  /**
   * Get all active jobs (waiting or active)
   */
  async getActiveJobs(): Promise<DosageJob[]> {
    const allJobs = await this.getAllJobs();
    return allJobs.filter(
      (job) => job.state === "waiting" || job.state === "active"
    );
  }

  /**
   * Get all completed jobs
   */
  async getCompletedJobs(): Promise<DosageJob[]> {
    const allJobs = await this.getAllJobs();
    return allJobs.filter((job) => job.state === "completed");
  }

  /**
   * Update an existing job
   */
  async updateJob(
    jobId: string,
    updates: Partial<Omit<DosageJob, "id" | "createdAt">>
  ): Promise<void> {
    const db = await this.ensureDB();
    const existingJob = await this.getJob(jobId);

    if (!existingJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob: DosageJob = {
      ...existingJob,
      ...updates,
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(updatedJob);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to update job"));
    });
  }

  /**
   * Delete a job by ID
   */
  async deleteJob(jobId: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(jobId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to delete job"));
    });
  }

  /**
   * Delete all completed jobs
   */
  async deleteCompletedJobs(): Promise<void> {
    const completedJobs = await this.getCompletedJobs();
    const promises = completedJobs.map((job) => this.deleteJob(job.id));
    await Promise.all(promises);
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const dosageJobsIndexDBManager = new DosageJobsIndexDBManager();
