// Local URL Guard
// Validates local loopback HTTP(S) endpoints for providers like Ollama.

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const LOOPBACK_DISABLED_VALUES = new Set(['false', '0', 'off', 'no']);
const LOOPBACK_ENABLED_VALUES = new Set(['true', '1', 'on', 'yes']);

export function isLoopbackHostname(hostname) {
  const normalized = String(hostname || '')
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '');
  return LOOPBACK_HOSTS.has(normalized);
}

export function isLoopbackRestrictionEnabled(value, defaultValue = true) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (LOOPBACK_DISABLED_VALUES.has(normalized)) {
      return false;
    }
    if (LOOPBACK_ENABLED_VALUES.has(normalized)) {
      return true;
    }
  }

  return Boolean(value);
}

export function validateHttpUrl(rawUrl, options = {}) {
  const label = options.label || 'URL';
  const value = String(rawUrl || '').trim();
  const requireLoopback = Boolean(options.requireLoopback);

  if (!value) {
    return { valid: false, message: `Please enter your ${label}` };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return {
      valid: false,
      message: `${label} must be a valid URL (e.g., http://localhost:11434)`,
    };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      valid: false,
      message: `${label} must use http:// or https://`,
    };
  }

  if (requireLoopback && !isLoopbackHostname(parsed.hostname)) {
    return {
      valid: false,
      message: options.loopbackMessage || `${label} must use localhost, 127.0.0.1, or [::1]`,
    };
  }

  return { valid: true, normalizedUrl: value.replace(/\/$/, '') };
}

export function validateLoopbackHttpUrl(rawUrl, options = {}) {
  return validateHttpUrl(rawUrl, { ...options, requireLoopback: true });
}

export function buildLoopbackRestrictionMessage(label = 'URL') {
  return `${label} must use localhost, 127.0.0.1, or [::1] while Local-Only URL Restriction is enabled. Disable Local-Only URL Restriction in Local LLM settings to allow remote URLs.`;
}
