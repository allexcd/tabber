// Secure Storage Service
// Wraps Chrome storage with automatic encryption for sensitive keys
// Provides a clean interface for storing/retrieving encrypted data

import { cryptoService } from './crypto.js';

export class SecureStorage {
  constructor(options = {}) {
    this.options = {
      // Keys that should be encrypted when stored
      sensitiveKeys: ['openaiKey', 'claudeKey'],
      // Storage type: 'sync' or 'local'
      storageType: 'sync',
      ...options
    };

    this.storage = chrome.storage[this.options.storageType];
  }

  // Check if a key is marked as sensitive
  isSensitiveKey(key) {
    return this.options.sensitiveKeys.includes(key);
  }

  // Get values from storage, auto-decrypting sensitive keys
  async get(keys) {
    return new Promise((resolve, reject) => {
      this.storage.get(keys, async (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        try {
          const decrypted = { ...result };

          // Decrypt sensitive keys
          for (const key of Object.keys(decrypted)) {
            if (this.isSensitiveKey(key) && decrypted[key]) {
              try {
                // Check if value is encrypted
                if (cryptoService.isEncrypted(decrypted[key])) {
                  decrypted[key] = await cryptoService.decrypt(decrypted[key]);
                }
              } catch (error) {
                console.warn(`SecureStorage: Failed to decrypt ${key}, using raw value`, error);
                // Keep raw value if decryption fails (might be old unencrypted data)
              }
            }
          }

          resolve(decrypted);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Set values in storage, auto-encrypting sensitive keys
  async set(items) {
    return new Promise(async (resolve, reject) => {
      try {
        const encrypted = { ...items };

        // Encrypt sensitive keys
        for (const key of Object.keys(encrypted)) {
          if (this.isSensitiveKey(key) && encrypted[key]) {
            // Only encrypt non-empty values
            if (encrypted[key].trim()) {
              encrypted[key] = await cryptoService.encrypt(encrypted[key]);
            }
          }
        }

        this.storage.set(encrypted, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve();
        });
      } catch (error) {
        console.error('SecureStorage: Set failed', error);
        reject(error);
      }
    });
  }

  // Remove keys from storage
  async remove(keys) {
    return new Promise((resolve, reject) => {
      this.storage.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  // Clear all storage
  async clear() {
    return new Promise((resolve, reject) => {
      this.storage.clear(() => {
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
  async migrateToEncrypted() {
    try {
      const allData = await this.getRaw(this.options.sensitiveKeys);
      
      for (const key of this.options.sensitiveKeys) {
        if (allData[key] && !cryptoService.isEncrypted(allData[key])) {
          // Re-save to encrypt
          await this.set({ [key]: allData[key] });
          console.log(`SecureStorage: Migrated ${key} to encrypted format`);
        }
      }
    } catch (error) {
      console.error('SecureStorage: Migration failed', error);
    }
  }

  // Get raw values without decryption (for migration/debugging)
  async getRaw(keys) {
    return new Promise((resolve, reject) => {
      this.storage.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result);
      });
    });
  }
}

// Export singleton instance with default options
export const secureStorage = new SecureStorage();
