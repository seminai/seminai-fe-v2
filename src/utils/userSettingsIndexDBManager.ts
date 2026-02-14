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
  private readonly baseDbName = "SeminaiUserSettings";
  private dbName = this.baseDbName;
  private version = 1;
  private storeName = "settings";
  private db: IDBDatabase | null = null;
  private useLocalStorage = false;
  private readonly baseLocalStorageKey = "SeminaiUserSettings";
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
            objectStore.createIndex("page", "page", { unique: false });
            objectStore.createIndex("key", "key", { unique: false });
            objectStore.createIndex("updatedAt", "updatedAt", { unique: false });
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
      throw new Error("UserSettingsIndexDBManager not initialized with userId");
    }

    if (this.useLocalStorage) {
      return null;
    }

    if (!this.db) {
      await this.init(this.currentUserId);
    }

    return this.db;
  }

  /**
   * Generate a unique ID for a setting based on page and key
   */
  private generateId(page: string, key: string): string {
    return `${page}:${key}`;
  }

  private getSettingsMapFromLocalStorage(): Record<string, UserSettings> {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (!stored) return {};

      const parsed = JSON.parse(stored) as Record<string, UserSettings>;
      const normalized: Record<string, UserSettings> = {};
      Object.entries(parsed).forEach(([id, value]) => {
        normalized[id] = {
          ...value,
          updatedAt: new Date(value.updatedAt),
        };
      });
      return normalized;
    } catch {
      return {};
    }
  }

  private saveSettingsMapToLocalStorage(
    settingsMap: Record<string, UserSettings>
  ): void {
    localStorage.setItem(this.localStorageKey, JSON.stringify(settingsMap));
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

    if (!db || this.useLocalStorage) {
      const settingsMap = this.getSettingsMapFromLocalStorage();
      settingsMap[id] = setting;
      this.saveSettingsMapToLocalStorage(settingsMap);
      return;
    }

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

    if (!db || this.useLocalStorage) {
      const settingsMap = this.getSettingsMapFromLocalStorage();
      const setting = settingsMap[id];
      if (!setting) return null;
      return (setting.value as T) ?? null;
    }

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

    if (!db || this.useLocalStorage) {
      const settingsMap = this.getSettingsMapFromLocalStorage();
      return Object.values(settingsMap).filter((setting) => setting.page === page);
    }

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

    if (!db || this.useLocalStorage) {
      const settingsMap = this.getSettingsMapFromLocalStorage();
      delete settingsMap[id];
      this.saveSettingsMapToLocalStorage(settingsMap);
      return;
    }

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
