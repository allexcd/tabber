// Debug Logger Service
// Centralized logging that can be enabled/disabled for development

const DEBUG_ENABLED = false; // Set to true to enable debug logging

const logger = {
  // Check if debug is enabled
  get isEnabled() {
    return DEBUG_ENABLED;
  },

  // Standard log
  log(...args) {
    if (DEBUG_ENABLED) {
      console.log('[Tabber]', ...args);
    }
  },

  // Info level
  info(...args) {
    if (DEBUG_ENABLED) {
      console.info('[Tabber:INFO]', ...args);
    }
  },

  // Warning level - always shown
  warn(...args) {
    console.warn('[Tabber:WARN]', ...args);
  },

  // Error level - always shown
  error(...args) {
    console.error('[Tabber:ERROR]', ...args);
  },

  // Debug level - more verbose
  debug(...args) {
    if (DEBUG_ENABLED) {
      console.debug('[Tabber:DEBUG]', ...args);
    }
  },

  // Group logging
  group(label) {
    if (DEBUG_ENABLED) {
      console.group(`[Tabber] ${label}`);
    }
  },

  groupEnd() {
    if (DEBUG_ENABLED) {
      console.groupEnd();
    }
  },

  // Table logging for objects/arrays
  table(data, label = '') {
    if (DEBUG_ENABLED) {
      if (label) console.log(`[Tabber] ${label}:`);
      console.table(data);
    }
  },

  // Time tracking
  time(label) {
    if (DEBUG_ENABLED) {
      console.time(`[Tabber] ${label}`);
    }
  },

  timeEnd(label) {
    if (DEBUG_ENABLED) {
      console.timeEnd(`[Tabber] ${label}`);
    }
  }
};

export { logger };
