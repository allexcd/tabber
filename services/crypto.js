// Cryptography Service
// Provides encryption/decryption for sensitive data like API keys
// Uses Web Crypto API for secure operations

export class CryptoService {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12; // 96 bits for AES-GCM
    this.saltLength = 16;
    this.iterations = 100000;
  }

  // Generate a cryptographic key from a password
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive a key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Generate a device-specific key based on extension ID and browser fingerprint
  async getDeviceKey() {
    // Use extension ID as a stable identifier
    const extensionId = chrome.runtime.id || 'ai-tab-grouper';
    
    // Create a device-specific salt using extension ID
    const encoder = new TextEncoder();
    const idBuffer = encoder.encode(extensionId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', idBuffer);
    
    return new Uint8Array(hashBuffer).slice(0, this.saltLength);
  }

  // Encrypt data with optional user password
  async encrypt(plaintext, userPassword = null) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

      // Use user password or device-specific key
      const password = userPassword || await this.getDevicePassword();
      const key = await this.deriveKey(password, salt);

      // Encrypt the data
      const encryptedData = await crypto.subtle.encrypt(
        { name: this.algorithm, iv: iv },
        key,
        data
      );

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(
        salt.length + iv.length + encryptedData.byteLength
      );
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

      // Return as base64 string
      return this.arrayBufferToBase64(combined.buffer);
    } catch (error) {
      console.error('CryptoService: Encryption failed', error);
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data with optional user password
  async decrypt(ciphertext, userPassword = null) {
    try {
      // Convert from base64
      const combined = new Uint8Array(this.base64ToArrayBuffer(ciphertext));

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const encryptedData = combined.slice(this.saltLength + this.ivLength);

      // Use user password or device-specific key
      const password = userPassword || await this.getDevicePassword();
      const key = await this.deriveKey(password, salt);

      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        { name: this.algorithm, iv: iv },
        key,
        encryptedData
      );

      // Return as string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('CryptoService: Decryption failed', error);
      throw new Error('Decryption failed - invalid data or password');
    }
  }

  // Get device-specific password (used when no user password is provided)
  async getDevicePassword() {
    const deviceKey = await this.getDeviceKey();
    return this.arrayBufferToBase64(deviceKey.buffer);
  }

  // Check if a string appears to be encrypted (base64 with minimum length)
  isEncrypted(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    // Check if it's base64 and has minimum expected length
    // (salt + iv + at least some encrypted data)
    const minLength = (this.saltLength + this.ivLength + 16) * 4 / 3;
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    
    // OpenAI keys start with "sk-" so they're not encrypted
    // Claude keys start with "sk-ant-" so they're not encrypted
    if (value.startsWith('sk-')) {
      return false;
    }
    
    return value.length >= minLength && base64Regex.test(value);
  }

  // Utility: Convert ArrayBuffer to Base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Utility: Convert Base64 to ArrayBuffer
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Generate a random token (for various uses)
  generateToken(length = 32) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return this.arrayBufferToBase64(bytes.buffer);
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();
