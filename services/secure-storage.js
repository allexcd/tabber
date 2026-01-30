// Secure Storage Service
// Wraps Chrome storage with automatic encryption for sensitive keys
// Provides a clean interface for storing/retrieving encrypted data
// All data is stored under a single 'tabber' key for organization

import { cryptoService } from './crypto.js';
import { logger } from './logger.js';

const STORAGE_KEY = 'tabber';

export class SecureStorage {
  constructor(options = {}) {
    this.options = {
      // Keys that should be encrypted when stored
      sensitiveKeys: ['openaiKey', 'claudeKey', 'groqKey', 'geminiKey'],
      // Storage type: 'sync' or 'local'
      storageType: 'sync',
      ...options,
    };

    this.storage = chrome.storage[this.options.storageType];
  }

  // Check if a key is marked as sensitive
  isSensitiveKey(key) {
    return this.options.sensitiveKeys.includes(key);
  }

  // Get the entire tabber storage object
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

  // Save the entire tabber storage object
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

  // Get values from storage, auto-decrypting sensitive keys
  async get(keys) {
    try {
      const tabberData = await this.getTabberData();
      const result = {};

      // If keys is an array, get only those keys
      const keysToGet = Array.isArray(keys) ? keys : [keys];

      for (const key of keysToGet) {
        if (Object.hasOwn(tabberData, key)) {
          let value = tabberData[key];

          // Decrypt sensitive keys
          if (this.isSensitiveKey(key) && value) {
            try {
              if (cryptoService.isEncrypted(value)) {
                value = await cryptoService.decrypt(value);
              }
            } catch (error) {
              logger.warn(`SecureStorage: Failed to decrypt ${key}, using raw value`, error);
            }
          }

          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      logger.error('SecureStorage: Get failed', error);
      throw error;
    }
  }

  // Set values in storage, auto-encrypting sensitive keys
  async set(items) {
    try {
      const tabberData = await this.getTabberData();

      // Process each item
      for (const key of Object.keys(items)) {
        let value = items[key];

        // Encrypt sensitive keys
        if (this.isSensitiveKey(key) && value) {
          if (typeof value === 'string' && value.trim()) {
            value = await cryptoService.encrypt(value);
          }
        }

        tabberData[key] = value;
      }

      await this.setTabberData(tabberData);
    } catch (error) {
      logger.error('SecureStorage: Set failed', error);
      throw error;
    }
  }

  // Remove keys from storage
  async remove(keys) {
    try {
      const tabberData = await this.getTabberData();
      const keysToRemove = Array.isArray(keys) ? keys : [keys];

      for (const key of keysToRemove) {
        delete tabberData[key];
      }

      await this.setTabberData(tabberData);
    } catch (error) {
      logger.error('SecureStorage: Remove failed', error);
      throw error;
    }
  }

  // Clear all tabber storage
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

  // Add a key to the sensitive keys list
  addSensitiveKey(key) {
    if (!this.options.sensitiveKeys.includes(key)) {
      this.options.sensitiveKeys.push(key);
    }
  }

  // Remove a key from the sensitive keys list
  removeSensitiveKey(key) {
    const index = this.options.sensitiveKeys.indexOf(key);
    if (index > -1) {
      this.options.sensitiveKeys.splice(index, 1);
    }
  }

  // Migrate existing unencrypted data to encrypted format
  // Also migrates from old flat storage to new nested 'tabber' key format
  async migrateToEncrypted() {
    try {
      // First, check for old flat storage format and migrate to new format
      await this.migrateFromFlatStorage();

      // Then encrypt any unencrypted sensitive keys
      const tabberData = await this.getTabberData();

      for (const key of this.options.sensitiveKeys) {
        if (tabberData[key] && !cryptoService.isEncrypted(tabberData[key])) {
          // Re-save to encrypt
          await this.set({ [key]: tabberData[key] });
          logger.log(`SecureStorage: Migrated ${key} to encrypted format`);
        }
      }
    } catch (error) {
      logger.error('SecureStorage: Migration failed', error);
    }
  }

  // Migrate from old flat storage format to nested 'tabber' key format
  async migrateFromFlatStorage() {
    return new Promise((resolve, reject) => {
      // Get all old flat keys
      const oldKeys = [
        'enabled',
        'defaultProvider',
        'provider',
        'openaiKey',
        'openaiModel',
        'claudeKey',
        'claudeModel',
        'groqKey',
        'groqModel',
        'geminiKey',
        'geminiModel',
        'localUrl',
        'localModel',
        'localApiFormat',
      ];

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
          logger.log('SecureStorage: Migrating from flat storage to tabber key format');

          // Get existing tabber data or start fresh
          const tabberData = result[STORAGE_KEY] || {};

          // Copy old data into tabber object (don't overwrite existing tabber data)
          for (const key of oldKeys) {
            if (
              Object.hasOwn(result, key) &&
              result[key] !== undefined &&
              !Object.hasOwn(tabberData, key)
            ) {
              tabberData[key] = result[key];
            }
          }

          // Save to new format and remove old keys
          this.storage.set({ [STORAGE_KEY]: tabberData }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }

            // Remove old flat keys
            this.storage.remove(oldKeys, () => {
              logger.log('SecureStorage: Migration complete - old flat keys removed');
              resolve();
            });
          });
        } else {
          resolve();
        }
      });
    });
  }

  // Get raw values without decryption (for migration/debugging)
  async getRaw(keys) {
    try {
      const tabberData = await this.getTabberData();
      const result = {};
      const keysToGet = Array.isArray(keys) ? keys : [keys];

      for (const key of keysToGet) {
        if (Object.hasOwn(tabberData, key)) {
          result[key] = tabberData[key];
        }
      }

      return result;
    } catch (error) {
      logger.error('SecureStorage: getRaw failed', error);
      throw error;
    }
  }

  // Get all settings (for debugging)
  async getAll() {
    try {
      const tabberData = await this.getTabberData();
      const result = { ...tabberData };

      // Decrypt sensitive keys
      for (const key of this.options.sensitiveKeys) {
        if (result[key]) {
          try {
            if (cryptoService.isEncrypted(result[key])) {
              result[key] = await cryptoService.decrypt(result[key]);
            }
          } catch (error) {
            logger.warn(`SecureStorage: Failed to decrypt ${key}`, error);
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('SecureStorage: getAll failed', error);
      throw error;
    }
  }
}

// Export singleton instance with default options
export const secureStorage = new SecureStorage();
