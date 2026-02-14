/**
 * IndexedDB Manager for Label Extraction Jobs
 * Manages asynchronous job tracking for PDF label extraction
 */

export interface LabelJob {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  state: "waiting" | "active" | "completed" | "failed";
  progress: number;
  fileNames: string[];
  concurrency: number;
  result?: LabelJobResult;
  error?: string;
}

export interface LabelJobResult {
  results: LabelExtractionResult[];
  cost?: {
    [key: string]: unknown;
  };
}

export interface LabelExtractionResult {
  fileName: string;
  status: "extracted" | "failed";
  name: string | null;
  regNumber: string | null;
  bucketUrl: string;
  label: ExtractedLabelData | null;
  labelId?: string; // ID dell'etichetta creata/estratta
  error: string | null;
}

export interface ExtractedLabelData {
  prodotto: string;
  categoria: string;
  numero_registrazione: string;
  dosaggi_dettagliati: unknown[];
  extraction_confidence: number;
  [key: string]: unknown;
}

class IndexDBManager {
  private readonly baseDbName = "SeminaiLabelJobs";
  private dbName = this.baseDbName;
  private version = 1;
  private storeName = "jobs";
  private db: IDBDatabase | null = null;
  private useLocalStorage = false;
  private readonly baseLocalStorageKey = "SeminaiLabelJobs";
  private localStorageKey = this.baseLocalStorageKey;
  private currentUserId: string | null = null;

  private configureForUser(userId: string): void {
    if (this.currentUserId === userId) {
      return;
    }

    this.close();
    this.currentUserId = userId;
    this.dbName = `${this.baseDbName}_${userId}`;
    this.localStorageKey = `${this.baseLocalStorageKey}_${userId}`;
    this.useLocalStorage = false;
  }

  /**
   * Initialize the IndexedDB connection
   */
  async init(userId: string): Promise<void> {
    this.configureForUser(userId);

    if (typeof indexedDB === "undefined" || indexedDB === null) {
      this.useLocalStorage = true;
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
          this.useLocalStorage = true;
          resolve();
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.useLocalStorage = false;
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
      } catch {
        this.useLocalStorage = true;
        resolve();
      }
    });
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureDB(): Promise<IDBDatabase | null> {
    if (!this.currentUserId) {
      throw new Error("IndexDBManager not initialized with userId");
    }

    if (this.useLocalStorage) {
      return null;
    }

    if (!this.db) {
      await this.init(this.currentUserId);
    }
    return this.db;
  }

  private getJobsFromLocalStorage(): LabelJob[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (!stored) return [];
      const jobs = JSON.parse(stored) as LabelJob[];
      return jobs.map((job) => ({
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
      }));
    } catch {
      return [];
    }
  }

  private saveJobsToLocalStorage(jobs: LabelJob[]): void {
    localStorage.setItem(this.localStorageKey, JSON.stringify(jobs));
  }

  /**
   * Save a new job to IndexedDB
   */
  async saveJob(job: LabelJob): Promise<void> {
    const db = await this.ensureDB();

    if (!db || this.useLocalStorage) {
      const jobs = this.getJobsFromLocalStorage();
      const existingIndex = jobs.findIndex((j) => j.id === job.id);
      if (existingIndex >= 0) {
        jobs[existingIndex] = job;
      } else {
        jobs.push(job);
      }
      this.saveJobsToLocalStorage(jobs);
      return;
    }

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
  async getJob(jobId: string): Promise<LabelJob | null> {
    const db = await this.ensureDB();

    if (!db || this.useLocalStorage) {
      const jobs = this.getJobsFromLocalStorage();
      return jobs.find((job) => job.id === jobId) || null;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(jobId);

      request.onsuccess = () => {
        const job = request.result as LabelJob | undefined;
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
  async getAllJobs(): Promise<LabelJob[]> {
    const db = await this.ensureDB();

    if (!db || this.useLocalStorage) {
      const jobs = this.getJobsFromLocalStorage();
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return jobs;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const jobs = (request.result as LabelJob[]).map((job) => ({
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
  async getActiveJobs(): Promise<LabelJob[]> {
    const allJobs = await this.getAllJobs();
    return allJobs.filter(
      (job) => job.state === "waiting" || job.state === "active"
    );
  }

  /**
   * Get all completed jobs
   */
  async getCompletedJobs(): Promise<LabelJob[]> {
    const allJobs = await this.getAllJobs();
    return allJobs.filter((job) => job.state === "completed");
  }

  /**
   * Update an existing job
   */
  async updateJob(
    jobId: string,
    updates: Partial<Omit<LabelJob, "id" | "createdAt">>
  ): Promise<void> {
    const db = await this.ensureDB();
    const existingJob = await this.getJob(jobId);

    if (!existingJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob: LabelJob = {
      ...existingJob,
      ...updates,
      updatedAt: new Date(),
    };

    if (!db || this.useLocalStorage) {
      await this.saveJob(updatedJob);
      return;
    }

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

    if (!db || this.useLocalStorage) {
      const jobs = this.getJobsFromLocalStorage().filter((job) => job.id !== jobId);
      this.saveJobsToLocalStorage(jobs);
      return;
    }

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
export const indexDBManager = new IndexDBManager();
