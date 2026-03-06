// Provider Metadata
// Central definition for provider labels, required config, and model-fetch behavior.

import {
  buildLoopbackRestrictionMessage,
  isLoopbackRestrictionEnabled,
  validateHttpUrl,
  validateLoopbackHttpUrl,
} from './local-url-guard.js';

export const PROVIDER_DEFINITIONS = Object.freeze({
  openai: Object.freeze({
    id: 'openai',
    name: 'OpenAI',
    statusLabel: 'Using OpenAI',
    requiredConfigKeys: Object.freeze(['openaiKey']),
    modelFetchRequiresCredential: true,
    modelFetchCredentialLabel: 'OpenAI API key',
  }),
  claude: Object.freeze({
    id: 'claude',
    name: 'Claude',
    statusLabel: 'Using Claude',
    requiredConfigKeys: Object.freeze(['claudeKey']),
    modelFetchRequiresCredential: true,
    modelFetchCredentialLabel: 'Anthropic API key',
  }),
  groq: Object.freeze({
    id: 'groq',
    name: 'Groq',
    statusLabel: 'Using Groq',
    requiredConfigKeys: Object.freeze(['groqKey']),
    modelFetchRequiresCredential: true,
    modelFetchCredentialLabel: 'Groq API key',
  }),
  gemini: Object.freeze({
    id: 'gemini',
    name: 'Gemini',
    statusLabel: 'Using Gemini',
    requiredConfigKeys: Object.freeze(['geminiKey']),
    modelFetchRequiresCredential: true,
    modelFetchCredentialLabel: 'Google Gemini API key',
  }),
  local: Object.freeze({
    id: 'local',
    name: 'Local LLM',
    statusLabel: 'Using Local LLM',
    requiredConfigKeys: Object.freeze(['localUrl', 'localModel']),
    modelFetchRequiresCredential: false,
    modelFetchCredentialLabel: null,
  }),
});

export const PROVIDER_IDS = Object.freeze(Object.keys(PROVIDER_DEFINITIONS));

const REQUIRED_FIELD_MESSAGES = Object.freeze({
  openaiKey: 'Please enter your OpenAI API key',
  claudeKey: 'Please enter your Claude API key',
  groqKey: 'Please enter your Groq API key',
  geminiKey: 'Please enter your Google Gemini API key',
  localUrl: 'Please enter your local LLM server URL',
  localModel: 'Please enter your local LLM model name',
});

function hasValue(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

export function getProviderDefinition(providerId) {
  return PROVIDER_DEFINITIONS[providerId] || null;
}

export function getProviderStatusLabel(providerId) {
  return getProviderDefinition(providerId)?.statusLabel || 'Unknown provider';
}

export function validateProviderConfig(providerId, settings = {}) {
  const definition = getProviderDefinition(providerId);
  if (!definition) {
    return { valid: false, message: `Unknown provider: ${providerId}` };
  }

  for (const key of definition.requiredConfigKeys) {
    if (!hasValue(settings[key])) {
      return {
        valid: false,
        message: REQUIRED_FIELD_MESSAGES[key] || `Missing required setting: ${key}`,
      };
    }
  }

  if (providerId === 'local') {
    const requireLoopback = isLoopbackRestrictionEnabled(settings.localStrictLoopback, true);
    const localUrlLabel = 'Local LLM server URL';
    const loopbackOptions = {
      label: localUrlLabel,
      loopbackMessage: buildLoopbackRestrictionMessage(localUrlLabel),
    };
    const urlValidation = requireLoopback
      ? validateLoopbackHttpUrl(settings.localUrl, loopbackOptions)
      : validateHttpUrl(settings.localUrl, { label: localUrlLabel });
    if (!urlValidation.valid) {
      return { valid: false, message: urlValidation.message };
    }
  }

  return { valid: true };
}

export function isProviderConfigured(providerId, settings = {}) {
  return validateProviderConfig(providerId, settings).valid;
}

export function getConfiguredDefaultProvider(settings = {}) {
  const provider = settings.defaultProvider;
  if (!provider) {
    return null;
  }

  return isProviderConfigured(provider, settings) ? provider : null;
}
