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
  private useLocalStorage = false;
  private localStorageKey = "SeminaiDosageJobs";
  private readonly MAX_JOBS = 50;

  /**
   * Initialize the IndexedDB connection
   */
  async init(): Promise<void> {
    // Check if IndexedDB is available
    if (typeof indexedDB === "undefined" || indexedDB === null) {
      this.useLocalStorage = true;
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
          // Fallback to localStorage if IndexedDB fails
          this.useLocalStorage = true;
          resolve();
        };

        request.onsuccess = () => {
          const db = request.result;
          this.db = db;
          this.useLocalStorage = false;

          // Listen for database close events (important for iOS Safari)
          db.onclose = () => {
            this.db = null;
            // If connection closes, try to use localStorage as fallback
            this.useLocalStorage = true;
          };

          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(this.storeName)) {
            const objectStore = db.createObjectStore(this.storeName, {
              keyPath: "id",
            });
            objectStore.createIndex("state", "state", { unique: false });
            objectStore.createIndex("createdAt", "createdAt", {
              unique: false,
            });
          }
        };
      } catch (error) {
        // Fallback to localStorage if IndexedDB initialization fails
        this.useLocalStorage = true;
        resolve();
      }
    });
  }

  /**
   * Check if database connection is still valid
   */
  private isConnectionValid(db: IDBDatabase): boolean {
    try {
      // Try to access objectStoreNames - if connection is closed, this will throw
      return db.objectStoreNames.length >= 0;
    } catch {
      return false;
    }
  }

  /**
   * Ensure DB is initialized and connection is valid
   */
  private async ensureDB(): Promise<IDBDatabase | null> {
    // If using localStorage, return null
    if (this.useLocalStorage) {
      return null;
    }

    // Check if we have a database reference
    if (this.db) {
      // Verify the connection is still valid (important for iOS Safari)
      if (this.isConnectionValid(this.db)) {
        return this.db;
      } else {
        // Connection was closed by browser, reset it
        this.db = null;
      }
    }

    // Initialize or reinitialize the database
    await this.init();

    // If initialization failed and we're using localStorage, return null
    if (this.useLocalStorage || !this.db) {
      return null;
    }

    return this.db;
  }

  /**
   * LocalStorage helper methods
   */
  private getJobsFromLocalStorage(): DosageJob[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (!stored) {
        return [];
      }
      const jobs = JSON.parse(stored) as DosageJob[];
      // Convert date strings back to Date objects
      return jobs.map((job) => ({
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
      }));
    } catch {
      return [];
    }
  }

  private saveJobsToLocalStorage(jobs: DosageJob[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(jobs));
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof Error && error.name === "QuotaExceededError") {
        throw new Error(
          "LocalStorage quota exceeded. Please delete some completed jobs."
        );
      }
      throw error;
    }
  }

  /**
   * Maintain maximum number of jobs by removing oldest ones
   */
  private async maintainMaxJobs(): Promise<void> {
    const db = await this.ensureDB();

    // Fallback to localStorage
    if (!db || this.useLocalStorage) {
      const jobs = this.getJobsFromLocalStorage();
      if (jobs.length > this.MAX_JOBS) {
        // Sort by createdAt descending (newest first), keep only MAX_JOBS
        jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const jobsToKeep = jobs.slice(0, this.MAX_JOBS);
        // Save only the jobs to keep (this effectively deletes the oldest ones)
        this.saveJobsToLocalStorage(jobsToKeep);
      }
      return;
    }

    // For IndexedDB, get all jobs and delete oldest ones
    const allJobs = await this.getAllJobs();
    if (allJobs.length > this.MAX_JOBS) {
      // Jobs are already sorted by createdAt descending (newest first)
      const jobsToDelete = allJobs.slice(this.MAX_JOBS);

      // Delete oldest jobs directly using IndexedDB transaction
      const deletePromises = jobsToDelete.map((job) => {
        return new Promise<void>((resolve) => {
          try {
            const transaction = db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(job.id);

            request.onsuccess = () => resolve();
            request.onerror = () => {
              console.error(`Failed to delete old job ${job.id}`);
              resolve(); // Don't fail the whole operation
            };
          } catch (error) {
            console.error(`Failed to delete old job ${job.id}:`, error);
            resolve(); // Don't fail the whole operation
          }
        });
      });

      await Promise.all(deletePromises);
    }
  }

  /**
   * Save a new job to IndexedDB or localStorage
   */
  async saveJob(job: DosageJob): Promise<void> {
    const db = await this.ensureDB();

    // Fallback to localStorage
    if (!db || this.useLocalStorage) {
      try {
        const jobs = this.getJobsFromLocalStorage();
        const existingIndex = jobs.findIndex((j) => j.id === job.id);
        if (existingIndex >= 0) {
          jobs[existingIndex] = job;
        } else {
          jobs.push(job);
        }
        this.saveJobsToLocalStorage(jobs);

        // Maintain max jobs limit
        await this.maintainMaxJobs();
        return;
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to save job to localStorage"
        );
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.put(job);

        request.onsuccess = async () => {
          // Maintain max jobs limit after successful save
          try {
            await this.maintainMaxJobs();
          } catch (error) {
            console.error("Failed to maintain max jobs:", error);
            // Don't fail the save operation if maintenance fails
          }
          resolve();
        };
        request.onerror = () => {
          // Fallback to localStorage on error
          this.useLocalStorage = true;
          this.saveJob(job).then(resolve).catch(reject);
        };

        transaction.onerror = () => {
          const errorMsg = transaction.error?.message || "Unknown error";
          // If connection is closing, fallback to localStorage
          if (errorMsg.includes("closing")) {
            this.db = null;
            this.useLocalStorage = true;
            this.saveJob(job).then(resolve).catch(reject);
          } else {
            reject(new Error(`Transaction failed: ${errorMsg}`));
          }
        };
      } catch (error) {
        // If connection was closed during transaction creation, fallback to localStorage
        if (error instanceof Error && error.message.includes("closing")) {
          this.db = null;
          this.useLocalStorage = true;
          this.saveJob(job).then(resolve).catch(reject);
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * Get a job by ID from IndexedDB or localStorage
   */
  async getJob(jobId: string): Promise<DosageJob | null> {
    const db = await this.ensureDB();

    // Fallback to localStorage
    if (!db || this.useLocalStorage) {
      const jobs = this.getJobsFromLocalStorage();
      return jobs.find((j) => j.id === jobId) || null;
    }

    return new Promise((resolve, reject) => {
      try {
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
        request.onerror = () => {
          // Fallback to localStorage on error
          this.useLocalStorage = true;
          const jobs = this.getJobsFromLocalStorage();
          resolve(jobs.find((j) => j.id === jobId) || null);
        };

        transaction.onerror = () => {
          const errorMsg = transaction.error?.message || "Unknown error";
          // If connection is closing, fallback to localStorage
          if (errorMsg.includes("closing")) {
            this.db = null;
            this.useLocalStorage = true;
            const jobs = this.getJobsFromLocalStorage();
            resolve(jobs.find((j) => j.id === jobId) || null);
          } else {
            reject(new Error(`Transaction failed: ${errorMsg}`));
          }
        };
      } catch (error) {
        // If connection was closed during transaction creation, fallback to localStorage
        if (error instanceof Error && error.message.includes("closing")) {
          this.db = null;
          this.useLocalStorage = true;
          const jobs = this.getJobsFromLocalStorage();
          resolve(jobs.find((j) => j.id === jobId) || null);
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * Get all jobs from IndexedDB or localStorage
   */
  async getAllJobs(): Promise<DosageJob[]> {
    const db = await this.ensureDB();

    // Fallback to localStorage
    if (!db || this.useLocalStorage) {
      const jobs = this.getJobsFromLocalStorage();
      // Sort by createdAt descending (newest first)
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return jobs;
    }

    return new Promise((resolve, reject) => {
      try {
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
        request.onerror = () => {
          // Fallback to localStorage on error
          this.useLocalStorage = true;
          const jobs = this.getJobsFromLocalStorage();
          jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          resolve(jobs);
        };

        transaction.onerror = () => {
          const errorMsg = transaction.error?.message || "Unknown error";
          // If connection is closing, fallback to localStorage
          if (errorMsg.includes("closing")) {
            this.db = null;
            this.useLocalStorage = true;
            const jobs = this.getJobsFromLocalStorage();
            jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            resolve(jobs);
          } else {
            reject(new Error(`Transaction failed: ${errorMsg}`));
          }
        };
      } catch (error) {
        // If connection was closed during transaction creation, fallback to localStorage
        if (error instanceof Error && error.message.includes("closing")) {
          this.db = null;
          this.useLocalStorage = true;
          const jobs = this.getJobsFromLocalStorage();
          jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          resolve(jobs);
        } else {
          reject(error);
        }
      }
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
   * Update an existing job in IndexedDB or localStorage
   */
  async updateJob(
    jobId: string,
    updates: Partial<Omit<DosageJob, "id" | "createdAt">>
  ): Promise<void> {
    const existingJob = await this.getJob(jobId);

    if (!existingJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob: DosageJob = {
      ...existingJob,
      ...updates,
      updatedAt: new Date(),
    };

    // Use saveJob which handles both IndexedDB and localStorage
    await this.saveJob(updatedJob);
  }

  /**
   * Delete a job by ID from IndexedDB or localStorage
   */
  async deleteJob(jobId: string): Promise<void> {
    const db = await this.ensureDB();

    // Fallback to localStorage
    if (!db || this.useLocalStorage) {
      try {
        const jobs = this.getJobsFromLocalStorage();
        const filteredJobs = jobs.filter((j) => j.id !== jobId);
        this.saveJobsToLocalStorage(filteredJobs);
        return;
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to delete job from localStorage"
        );
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(jobId);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          // Fallback to localStorage on error
          this.useLocalStorage = true;
          this.deleteJob(jobId).then(resolve).catch(reject);
        };

        transaction.onerror = () => {
          const errorMsg = transaction.error?.message || "Unknown error";
          // If connection is closing, fallback to localStorage
          if (errorMsg.includes("closing")) {
            this.db = null;
            this.useLocalStorage = true;
            this.deleteJob(jobId).then(resolve).catch(reject);
          } else {
            reject(new Error(`Transaction failed: ${errorMsg}`));
          }
        };
      } catch (error) {
        // If connection was closed during transaction creation, fallback to localStorage
        if (error instanceof Error && error.message.includes("closing")) {
          this.db = null;
          this.useLocalStorage = true;
          this.deleteJob(jobId).then(resolve).catch(reject);
        } else {
          reject(error);
        }
      }
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
