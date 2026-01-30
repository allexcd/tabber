// Local Storage Service
// Wraps Chrome local storage with all data under a single 'tabber' key
// Used for non-sensitive data like cached models, preferences, etc.

import { logger } from './logger.js';

const STORAGE_KEY = 'tabber';

export class LocalStorageService {
  constructor() {
    this.storage = chrome.storage.local;
  }

  // Get the entire tabber local storage object
  async getTabberData() {
    return new Promise((resolve, reject) => {
      this.storage.get([STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result[STORAGE_KEY] || {});
      });
    });
  }

  // Save the entire tabber local storage object
  async setTabberData(data) {
    return new Promise((resolve, reject) => {
      this.storage.set({ [STORAGE_KEY]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  // Get values from local storage
  async get(keys) {
    try {
      const tabberData = await this.getTabberData();
      const result = {};

      // If keys is an array, get only those keys
      const keysToGet = Array.isArray(keys) ? keys : [keys];

      for (const key of keysToGet) {
        if (Object.hasOwn(tabberData, key)) {
          result[key] = tabberData[key];
        }
      }

      return result;
    } catch (error) {
      logger.error('LocalStorage: Get failed', error);
      throw error;
    }
  }

  // Set values in local storage
  async set(items) {
    try {
      const tabberData = await this.getTabberData();

      // Merge new items into existing data
      for (const key of Object.keys(items)) {
        tabberData[key] = items[key];
      }

      await this.setTabberData(tabberData);
    } catch (error) {
      logger.error('LocalStorage: Set failed', error);
      throw error;
    }
  }

  // Remove keys from local storage
  async remove(keys) {
    try {
      const tabberData = await this.getTabberData();
      const keysToRemove = Array.isArray(keys) ? keys : [keys];

      for (const key of keysToRemove) {
        delete tabberData[key];
      }

      await this.setTabberData(tabberData);
    } catch (error) {
      logger.error('LocalStorage: Remove failed', error);
      throw error;
    }
  }

  // Clear all tabber local storage
  async clear() {
    return new Promise((resolve, reject) => {
      this.storage.remove([STORAGE_KEY], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  // Get all local storage data (for debugging)
  async getAll() {
    try {
      return await this.getTabberData();
    } catch (error) {
      logger.error('LocalStorage: getAll failed', error);
      throw error;
    }
  }

  // Migrate from old flat storage format to nested 'tabber' key format
  async migrateFromFlatStorage() {
    return new Promise((resolve, reject) => {
      // Get all old flat keys that might exist
      const oldKeys = ['tabber-fetched-models', 'fetchedModels', 'cachedModels'];

      this.storage.get([STORAGE_KEY, ...oldKeys], async (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        // Check if there's old flat data to migrate
        const hasOldData = oldKeys.some(
          (key) => Object.hasOwn(result, key) && result[key] !== undefined
        );

        if (hasOldData) {
          logger.log('LocalStorage: Migrating from flat storage to tabber key format');

          // Get existing tabber data or start fresh
          const tabberData = result[STORAGE_KEY] || {};

          // Copy old data into tabber object with new key names
          if (result['tabber-fetched-models'] && !tabberData.fetchedModels) {
            tabberData.fetchedModels = result['tabber-fetched-models'];
          }
          if (result['fetchedModels'] && !tabberData.fetchedModels) {
            tabberData.fetchedModels = result['fetchedModels'];
          }
          if (result['cachedModels'] && !tabberData.fetchedModels) {
            tabberData.fetchedModels = result['cachedModels'];
          }

          // Save to new format and remove old keys
          this.storage.set({ [STORAGE_KEY]: tabberData }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }

            // Remove old flat keys
            this.storage.remove(oldKeys, () => {
              logger.log('LocalStorage: Migration complete - old flat keys removed');
              resolve();
            });
          });
        } else {
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
export const localStorage = new LocalStorageService();
