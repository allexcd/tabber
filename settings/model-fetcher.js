// Model Fetcher Module
// Handles fetching models from provider APIs via the background service worker.

import { cachedModels, saveCachedModels } from './model-cache.js';
import { getProviderDefinition } from '../services/provider-metadata.js';

function populateModelSelect(select, models, currentValue) {
  select.innerHTML = '';

  models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.displayName;
    select.appendChild(option);
  });

  const customOption = document.createElement('option');
  customOption.value = 'custom';
  customOption.textContent = 'Custom Model...';
  select.appendChild(customOption);

  const modelIds = models.map((model) => model.id);
  if (modelIds.includes(currentValue)) {
    select.value = currentValue;
  } else if (models.length > 0) {
    select.value = models[0].id;
  }
}

async function fetchModels({
  provider,
  credentialInputId,
  btnId,
  selectId,
  providerLabel,
  showStatus,
}) {
  const definition = getProviderDefinition(provider);
  if (!definition) {
    showStatus(`Unknown provider: ${provider}`, 'error');
    return;
  }

  const btn = document.getElementById(btnId);
  const select = document.getElementById(selectId);
  const currentValue = select.value;
  const credentialInput = credentialInputId ? document.getElementById(credentialInputId) : null;
  const credential = credentialInput ? credentialInput.value.trim() : '';

  if (definition.modelFetchRequiresCredential && !credential) {
    const label = definition.modelFetchCredentialLabel || `${providerLabel} credential`;
    showStatus(`Please enter your ${label} first`, 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Loading...';

  try {
    const result = await chrome.runtime.sendMessage({
      action: 'fetchModels',
      provider,
      credential,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch models');
    }

    const models = result.models;
    cachedModels[provider] = models;
    await saveCachedModels();

    populateModelSelect(select, models, currentValue);
    showStatus(`✓ Loaded ${models.length} models from ${providerLabel}`, 'success');
  } catch (error) {
    showStatus(`Failed to fetch models: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Fetch';
  }
}

export async function fetchOpenAIModels(showStatus) {
  return fetchModels({
    provider: 'openai',
    credentialInputId: 'openai-key',
    btnId: 'fetch-openai-models',
    selectId: 'openai-model',
    providerLabel: 'OpenAI',
    showStatus,
  });
}

export async function fetchClaudeModels(showStatus) {
  return fetchModels({
    provider: 'claude',
    credentialInputId: 'claude-key',
    btnId: 'fetch-claude-models',
    selectId: 'claude-model',
    providerLabel: 'Anthropic',
    showStatus,
  });
}

export async function fetchGroqModels(showStatus) {
  return fetchModels({
    provider: 'groq',
    credentialInputId: 'groq-key',
    btnId: 'fetch-groq-models',
    selectId: 'groq-model',
    providerLabel: 'Groq',
    showStatus,
  });
}

export async function fetchGeminiModels(showStatus) {
  return fetchModels({
    provider: 'gemini',
    credentialInputId: 'gemini-key',
    btnId: 'fetch-gemini-models',
    selectId: 'gemini-model',
    providerLabel: 'Google AI',
    showStatus,
  });
}
