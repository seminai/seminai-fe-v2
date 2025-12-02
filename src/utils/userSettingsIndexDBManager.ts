/**
 * IndexedDB Manager for User Settings
 * Manages user preferences and UI settings
 */

export interface UserSettings {
  id: string;
  page: string;
  key: string;
  value: unknown;
  updatedAt: Date;
}

class UserSettingsIndexDBManager {
  private dbName = "SeminaiUserSettings";
  private version = 1;
  private storeName = "settings";
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
          objectStore.createIndex("page", "page", { unique: false });
          objectStore.createIndex("key", "key", { unique: false });
          objectStore.createIndex("updatedAt", "updatedAt", { unique: false });
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
   * Generate a unique ID for a setting based on page and key
   */
  private generateId(page: string, key: string): string {
    return `${page}:${key}`;
  }

  /**
   * Save or update a setting
   */
  async saveSetting(page: string, key: string, value: unknown): Promise<void> {
    const db = await this.ensureDB();
    const id = this.generateId(page, key);

    const setting: UserSettings = {
      id,
      page,
      key,
      value,
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(setting);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to save setting"));
    });
  }

  /**
   * Get a setting by page and key
   */
  async getSetting<T = unknown>(page: string, key: string): Promise<T | null> {
    const db = await this.ensureDB();
    const id = this.generateId(page, key);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const setting = request.result as UserSettings | undefined;
        if (setting) {
          // Convert date string back to Date object
          setting.updatedAt = new Date(setting.updatedAt);
          resolve((setting.value as T) ?? null);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(new Error("Failed to get setting"));
    });
  }

  /**
   * Get all settings for a specific page
   */
  async getPageSettings(page: string): Promise<UserSettings[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("page");
      const request = index.getAll(page);

      request.onsuccess = () => {
        const settings = (request.result as UserSettings[]).map((setting) => ({
          ...setting,
          updatedAt: new Date(setting.updatedAt),
        }));
        resolve(settings);
      };
      request.onerror = () => reject(new Error("Failed to get page settings"));
    });
  }

  /**
   * Delete a setting by page and key
   */
  async deleteSetting(page: string, key: string): Promise<void> {
    const db = await this.ensureDB();
    const id = this.generateId(page, key);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to delete setting"));
    });
  }

  /**
   * Delete all settings for a specific page
   */
  async deletePageSettings(page: string): Promise<void> {
    const pageSettings = await this.getPageSettings(page);
    const promises = pageSettings.map((setting) =>
      this.deleteSetting(setting.page, setting.key)
    );
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
export const userSettingsIndexDBManager = new UserSettingsIndexDBManager();
