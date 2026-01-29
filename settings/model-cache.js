// Model Cache Module
// Handles caching of fetched models for all providers

import { localStorage } from '../services/local-storage.js';
import { logger } from '../services/logger.js';

// Cache for fetched models per provider
export let cachedModels = {
  openai: null,
  claude: null,
  groq: null,
  gemini: null
};

// Load cached models from Chrome storage
export async function loadCachedModels() {
  try {
    // Migrate from old flat storage format if needed
    await localStorage.migrateFromFlatStorage();
    
    const result = await localStorage.get(['fetchedModels']);
    if (result.fetchedModels) {
      cachedModels = { ...cachedModels, ...result.fetchedModels };
    }
  } catch (error) {
    logger.warn('Failed to load cached models:', error);
  }
}

// Save cached models to Chrome storage
export async function saveCachedModels() {
  try {
    await localStorage.set({ fetchedModels: cachedModels });
  } catch (error) {
    logger.warn('Failed to save cached models:', error);
  }
}

// Check if a model value exists in the select options
export function isCustomModel(selectElement, modelValue) {
  const options = Array.from(selectElement.options);
  return !options.some(opt => opt.value === modelValue && opt.value !== 'custom');
}

// Get the actual model value (handles custom model input)
export function getModelValue(selectId, customInputId) {
  const select = document.getElementById(selectId);
  if (select.value === 'custom') {
    return document.getElementById(customInputId).value.trim();
  }
  return select.value;
}

// Load cached models for a specific provider
export function loadCachedModelsForProvider(provider) {
  logger.debug('Loading cached models for provider:', provider);
  logger.debug('Available cached models:', cachedModels);
  
  if (!cachedModels[provider]) {
    logger.debug('No cached models found for provider:', provider);
    return; // No cached models, keep defaults
  }
  
  const selectId = `${provider}-model`;
  const select = document.getElementById(selectId);
  
  if (!select || provider === 'local') {
    logger.debug('No select element or local provider, skipping');
    return; // Local LLM uses text input, not select
  }
  
  const currentValue = select.value;
  const models = cachedModels[provider];
  logger.log('Found', models.length, 'cached models for', provider);
  
  // Clear and repopulate select with cached models
  select.innerHTML = '';
  
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.displayName || model.id;
    select.appendChild(option);
  });
  
  // Add custom option at the end
  const customOption = document.createElement('option');
  customOption.value = 'custom';
  customOption.textContent = 'Custom Model...';
  select.appendChild(customOption);
  
  // Restore previous selection if it exists
  const modelIds = models.map(m => m.id);
  if (modelIds.includes(currentValue)) {
    select.value = currentValue;
  } else if (models.length > 0) {
    select.value = models[0].id;
  }
  logger.debug('Populated select with', models.length, 'models');
}
