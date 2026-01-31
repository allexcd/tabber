// Model Fetcher Module
// Handles fetching models from AI provider APIs via the background service worker

import { cachedModels, saveCachedModels } from './model-cache.js';

// Send a fetch request to the background worker and update the UI
async function fetchModels({ provider, apiKeyId, btnId, selectId, providerLabel, showStatus }) {
  const apiKey = document.getElementById(apiKeyId).value.trim();
  const btn = document.getElementById(btnId);
  const select = document.getElementById(selectId);
  const currentValue = select.value;

  if (!apiKey) {
    showStatus(`Please enter your ${providerLabel} API key first`, 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Loading...';

  try {
    const result = await chrome.runtime.sendMessage({
      action: 'fetchModels',
      provider: provider,
      apiKey: apiKey,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch models');
    }

    const models = result.models;

    // Cache the models
    cachedModels[provider] = models;
    await saveCachedModels();

    // Clear and repopulate select
    select.innerHTML = '';

    models.forEach((model) => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.displayName;
      select.appendChild(option);
    });

    // Add custom option at the end
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Model...';
    select.appendChild(customOption);

    // Restore previous selection if it exists, otherwise select first
    const modelIds = models.map((m) => m.id);
    if (modelIds.includes(currentValue)) {
      select.value = currentValue;
    } else if (models.length > 0) {
      select.value = models[0].id;
    }

    showStatus(`✓ Loaded ${models.length} models from ${providerLabel}`, 'success');
  } catch (error) {
    showStatus(`Failed to fetch models: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Fetch';
  }
}

// Fetch available models from OpenAI API
export async function fetchOpenAIModels(showStatus) {
  return fetchModels({
    provider: 'openai',
    apiKeyId: 'openai-key',
    btnId: 'fetch-openai-models',
    selectId: 'openai-model',
    providerLabel: 'OpenAI',
    showStatus,
  });
}

// Fetch available models from Claude/Anthropic API
export async function fetchClaudeModels(showStatus) {
  return fetchModels({
    provider: 'claude',
    apiKeyId: 'claude-key',
    btnId: 'fetch-claude-models',
    selectId: 'claude-model',
    providerLabel: 'Anthropic',
    showStatus,
  });
}

// Fetch available models from Groq API
export async function fetchGroqModels(showStatus) {
  return fetchModels({
    provider: 'groq',
    apiKeyId: 'groq-key',
    btnId: 'fetch-groq-models',
    selectId: 'groq-model',
    providerLabel: 'Groq',
    showStatus,
  });
}

// Fetch available models from Google Gemini API
export async function fetchGeminiModels(showStatus) {
  return fetchModels({
    provider: 'gemini',
    apiKeyId: 'gemini-key',
    btnId: 'fetch-gemini-models',
    selectId: 'gemini-model',
    providerLabel: 'Google AI',
    showStatus,
  });
}
