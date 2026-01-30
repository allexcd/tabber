// Settings Page Logic - Main Module
// Orchestrates settings functionality using specialized modules

import { secureStorage } from '../services/secure-storage.js';
import { logger } from '../services/logger.js';
import {
  loadCachedModels,
  isCustomModel,
  getModelValue,
  loadCachedModelsForProvider,
} from './model-cache.js';
import {
  fetchOpenAIModels,
  fetchClaudeModels,
  fetchGroqModels,
  fetchGeminiModels,
} from './model-fetcher.js';
import { setupChangelogModal } from './changelog.js';

logger.log('Settings module loaded');

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  logger.log('DOMContentLoaded fired');
  try {
    // Load cached models first
    await loadCachedModels();
    logger.log('Cached models loaded');

    // Migrate any existing unencrypted API keys
    await secureStorage.migrateToEncrypted();
    logger.log('Migration complete');

    // Load settings and setup
    await loadSettings();
    logger.log('Settings loaded');
    setupEventListeners();
    logger.log('Event listeners setup complete');
    setupChangelogModal();
    logger.log('Initialization complete');
  } catch (error) {
    logger.error('Initialization error:', error);
  }
});

// Load saved settings
async function loadSettings() {
  const settings = await secureStorage.get([
    'enabled',
    'defaultProvider',
    'openaiKey',
    'openaiModel',
    'claudeKey',
    'claudeModel',
    'localUrl',
    'localModel',
    'localApiFormat',
    'groqKey',
    'groqModel',
    'geminiKey',
    'geminiModel',
  ]);

  // Set enabled toggle
  document.getElementById('enabled').checked = settings.enabled ?? false;

  // Set provider selection (default to 'claude' for UI display only if none set)
  const provider = settings.defaultProvider || 'claude';
  const providerRadio = document.querySelector(`input[name="provider"][value="${provider}"]`);
  if (providerRadio) {
    providerRadio.checked = true;
    showProviderSettings(provider);
  }

  // Set OpenAI settings
  document.getElementById('openai-key').value = settings.openaiKey || '';
  const openaiModel = settings.openaiModel || 'gpt-4o-mini';
  const openaiSelect = document.getElementById('openai-model');
  if (isCustomModel(openaiSelect, openaiModel)) {
    openaiSelect.value = 'custom';
    document.getElementById('openai-custom-model').value = openaiModel;
    document.getElementById('openai-custom-group').classList.add('active');
  } else {
    openaiSelect.value = openaiModel;
  }

  // Set Claude settings
  document.getElementById('claude-key').value = settings.claudeKey || '';
  const claudeModel = settings.claudeModel || 'claude-3-5-haiku-20241022';
  const claudeSelect = document.getElementById('claude-model');
  if (isCustomModel(claudeSelect, claudeModel)) {
    claudeSelect.value = 'custom';
    document.getElementById('claude-custom-model').value = claudeModel;
    document.getElementById('claude-custom-group').classList.add('active');
  } else {
    claudeSelect.value = claudeModel;
  }

  // Set Local LLM settings
  document.getElementById('local-url').value = settings.localUrl || '';
  document.getElementById('local-model').value = settings.localModel || '';
  document.getElementById('local-api-format').value = settings.localApiFormat || 'openai';

  // Set Groq settings
  document.getElementById('groq-key').value = settings.groqKey || '';
  const groqModel = settings.groqModel || 'llama-3.1-70b-versatile';
  const groqSelect = document.getElementById('groq-model');
  if (isCustomModel(groqSelect, groqModel)) {
    groqSelect.value = 'custom';
    document.getElementById('groq-custom-model').value = groqModel;
    document.getElementById('groq-custom-group').classList.add('active');
  } else {
    groqSelect.value = groqModel;
  }

  // Set Gemini settings
  document.getElementById('gemini-key').value = settings.geminiKey || '';
  const geminiModel = settings.geminiModel || 'gemini-1.5-flash';
  const geminiSelect = document.getElementById('gemini-model');
  if (isCustomModel(geminiSelect, geminiModel)) {
    geminiSelect.value = 'custom';
    document.getElementById('gemini-custom-model').value = geminiModel;
    document.getElementById('gemini-custom-group').classList.add('active');
  } else {
    geminiSelect.value = geminiModel;
  }

  // Update default provider UI - pass actual saved default, not the fallback
  updateDefaultProviderUI(settings.defaultProvider);

  logger.log('loadSettings - defaultProvider:', settings.defaultProvider);

  // Update enabled toggle state based on default provider
  updateEnabledToggleState(settings.defaultProvider);
}

// Setup event listeners
function setupEventListeners() {
  // Enable/Disable extension toggle
  document.getElementById('enabled').addEventListener('change', async (e) => {
    try {
      await secureStorage.set({ enabled: e.target.checked });
      logger.log('Extension enabled state saved:', e.target.checked);

      // Notify service worker about extension state change
      chrome.runtime
        .sendMessage({
          action: 'settingsSaved',
          enabled: e.target.checked,
        })
        .catch(() => {}); // Ignore if service worker isn't running
    } catch (error) {
      logger.error('Failed to save enabled state:', error);
    }
  });

  // Provider selection
  document.querySelectorAll('input[name="provider"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      showProviderSettings(e.target.value);
    });
  });

  // OpenAI model selection - show/hide custom input
  document.getElementById('openai-model').addEventListener('change', (e) => {
    const customGroup = document.getElementById('openai-custom-group');
    if (e.target.value === 'custom') {
      customGroup.classList.add('active');
    } else {
      customGroup.classList.remove('active');
    }
  });

  // Claude model selection - show/hide custom input
  document.getElementById('claude-model').addEventListener('change', (e) => {
    const customGroup = document.getElementById('claude-custom-group');
    if (e.target.value === 'custom') {
      customGroup.classList.add('active');
    } else {
      customGroup.classList.remove('active');
    }
  });

  // Fetch models buttons - pass showStatus as callback
  document
    .getElementById('fetch-openai-models')
    .addEventListener('click', () => fetchOpenAIModels(showStatus));
  document
    .getElementById('fetch-claude-models')
    .addEventListener('click', () => fetchClaudeModels(showStatus));
  document
    .getElementById('fetch-groq-models')
    .addEventListener('click', () => fetchGroqModels(showStatus));
  document
    .getElementById('fetch-gemini-models')
    .addEventListener('click', () => fetchGeminiModels(showStatus));

  // Save buttons (one in each provider form + legacy ID)
  document.querySelectorAll('.save-btn, #save-btn').forEach((btn) => {
    btn.addEventListener('click', saveSettings);
  });

  // Test buttons (one in each provider form + legacy ID)
  document.querySelectorAll('.test-btn, #test-btn').forEach((btn) => {
    btn.addEventListener('click', testConnection);
  });

  // Make Default buttons
  document.querySelectorAll('.default-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const provider = e.target.dataset.provider;
      makeProviderDefault(provider);
    });
  });

  // API key field listeners - update default button state when keys change
  document
    .getElementById('openai-key')
    .addEventListener('input', () => updateDefaultButtonState('openai'));
  document
    .getElementById('claude-key')
    .addEventListener('input', () => updateDefaultButtonState('claude'));
  document
    .getElementById('groq-key')
    .addEventListener('input', () => updateDefaultButtonState('groq'));
  document
    .getElementById('gemini-key')
    .addEventListener('input', () => updateDefaultButtonState('gemini'));
  document
    .getElementById('local-url')
    .addEventListener('input', () => updateDefaultButtonState('local'));
  document
    .getElementById('local-model')
    .addEventListener('input', () => updateDefaultButtonState('local'));

  // Listen for storage changes to sync with popup
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.tabber && changes.tabber.newValue) {
      const newSettings = changes.tabber.newValue;
      if ('enabled' in newSettings) {
        // Update toggle without triggering save
        const enabledToggle = document.getElementById('enabled');
        if (enabledToggle.checked !== newSettings.enabled) {
          enabledToggle.checked = newSettings.enabled;
          logger.log('Synced enabled state from storage:', newSettings.enabled);
        }
      }
    }
  });
}

// Show the settings section for the selected provider
function showProviderSettings(provider) {
  logger.log('Switching to provider:', provider);

  // Hide all provider settings
  document.querySelectorAll('.provider-settings').forEach((section) => {
    section.classList.remove('active');
  });

  // Show the selected provider settings
  const settingsSection = document.getElementById(`${provider}-settings`);
  if (settingsSection) {
    settingsSection.classList.add('active');

    // Load cached models if available
    logger.log('Loading cached models for:', provider);
    loadCachedModelsForProvider(provider);
  }
}

// Save settings to Chrome storage
async function saveSettings() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value;

  if (!provider) {
    showStatus('Please select a provider first', 'error');
    return;
  }

  // Build settings object with only the selected provider's settings
  const settings = {
    enabled: document.getElementById('enabled').checked,
  };

  // Only save settings for the selected provider
  switch (provider) {
    case 'openai':
      settings.openaiKey = document.getElementById('openai-key').value.trim();
      settings.openaiModel = getModelValue('openai-model', 'openai-custom-model');
      break;
    case 'claude':
      settings.claudeKey = document.getElementById('claude-key').value.trim();
      settings.claudeModel = getModelValue('claude-model', 'claude-custom-model');
      break;
    case 'local':
      settings.localUrl = document.getElementById('local-url').value.trim();
      settings.localModel = document.getElementById('local-model').value.trim();
      settings.localApiFormat = document.getElementById('local-api-format').value;
      break;
    case 'groq':
      settings.groqKey = document.getElementById('groq-key').value.trim();
      settings.groqModel = getModelValue('groq-model', 'groq-custom-model');
      break;
    case 'gemini':
      settings.geminiKey = document.getElementById('gemini-key').value.trim();
      settings.geminiModel = getModelValue('gemini-model', 'gemini-custom-model');
      break;
  }

  // Validate required fields for the selected provider
  const validation = validateSettings(provider, settings);
  if (!validation.valid) {
    showStatus(validation.message, 'error');
    return;
  }

  try {
    await secureStorage.set(settings);

    logger.log(`Saved settings for ${provider.toUpperCase()}`);

    // Update the default button state for this provider (in case credentials were added)
    updateDefaultButtonState(provider);

    // Notify service worker about settings update
    chrome.runtime
      .sendMessage({
        action: 'settingsSaved',
        provider: provider,
      })
      .catch(() => {}); // Ignore if service worker isn't running
    showStatus(
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} settings saved!`,
      'success'
    );
  } catch (error) {
    logger.error('Save failed:', error);
    showStatus(`Save failed: ${error.message}`, 'error');
  }
}

// Validate settings for a provider
function validateSettings(provider, settings) {
  switch (provider) {
    case 'openai':
      if (!settings.openaiKey) {
        return { valid: false, message: 'Please enter your OpenAI API key' };
      }
      break;
    case 'claude':
      if (!settings.claudeKey) {
        return { valid: false, message: 'Please enter your Claude API key' };
      }
      break;
    case 'local':
      if (!settings.localUrl) {
        return { valid: false, message: 'Please enter your local LLM server URL' };
      }
      if (!settings.localModel) {
        return { valid: false, message: 'Please enter your local LLM model name' };
      }
      break;
    case 'groq':
      if (!settings.groqKey) {
        return { valid: false, message: 'Please enter your Groq API key' };
      }
      break;
    case 'gemini':
      if (!settings.geminiKey) {
        return { valid: false, message: 'Please enter your Google Gemini API key' };
      }
      break;
  }
  return { valid: true };
}

// Test connection to the selected AI provider
async function testConnection() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value;

  if (!provider) {
    showStatus('Please select an AI provider first', 'error');
    return;
  }

  // Get current form values (not saved settings)
  const testConfig = {
    provider: provider,
    openaiKey: document.getElementById('openai-key').value.trim(),
    openaiModel: getModelValue('openai-model', 'openai-custom-model'),
    claudeKey: document.getElementById('claude-key').value.trim(),
    claudeModel: getModelValue('claude-model', 'claude-custom-model'),
    localUrl: document.getElementById('local-url').value.trim(),
    localModel: document.getElementById('local-model').value.trim(),
    localApiFormat: document.getElementById('local-api-format').value,
    groqKey: document.getElementById('groq-key').value.trim(),
    groqModel: getModelValue('groq-model', 'groq-custom-model'),
    geminiKey: document.getElementById('gemini-key').value.trim(),
    geminiModel: getModelValue('gemini-model', 'gemini-custom-model'),
  };

  // Validate the current provider has required fields
  const validation = validateSettings(provider, testConfig);
  if (!validation.valid) {
    showStatus(validation.message, 'error');
    return;
  }

  showStatus('Testing connection...', 'info');

  logger.log(`Testing connection for ${provider.toUpperCase()} provider`);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testConnection',
      config: testConfig,
    });

    if (response.success) {
      showStatus('✓ Connection successful!', 'success');
    } else {
      showStatus(`✗ Connection failed: ${response.error}`, 'error');
    }
  } catch (error) {
    logger.error('testConnection error:', error);
    showStatus(`✗ Error: ${error.message}`, 'error');
  }
}

// Show status message (updates all status elements)
function showStatus(message, type) {
  // Update the active provider's status element
  const activeSettings = document.querySelector('.provider-settings.active');
  const statusElements = activeSettings
    ? activeSettings.querySelectorAll('.status')
    : document.querySelectorAll('#status, .status');

  statusElements.forEach((status) => {
    status.textContent = message;
    status.className = `status ${type}`;
  });

  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      statusElements.forEach((status) => {
        status.classList.add('hidden');
      });
    }, 3000);
  }
}

// Make a provider the default
async function makeProviderDefault(provider) {
  try {
    // Build settings object with only the default provider and its specific settings
    const settings = { defaultProvider: provider };

    // Only save settings for the selected provider
    switch (provider) {
      case 'openai':
        settings.openaiKey = document.getElementById('openai-key').value.trim();
        settings.openaiModel = getModelValue('openai-model', 'openai-custom-model');
        break;
      case 'claude':
        settings.claudeKey = document.getElementById('claude-key').value.trim();
        settings.claudeModel = getModelValue('claude-model', 'claude-custom-model');
        break;
      case 'local':
        settings.localUrl = document.getElementById('local-url').value.trim();
        settings.localModel = document.getElementById('local-model').value.trim();
        settings.localApiFormat = document.getElementById('local-api-format').value;
        break;
      case 'groq':
        settings.groqKey = document.getElementById('groq-key').value.trim();
        settings.groqModel = getModelValue('groq-model', 'groq-custom-model');
        break;
      case 'gemini':
        settings.geminiKey = document.getElementById('gemini-key').value.trim();
        settings.geminiModel = getModelValue('gemini-model', 'gemini-custom-model');
        break;
    }

    // Validate the provider has required fields
    const validation = validateSettings(provider, settings);
    if (!validation.valid) {
      showStatus(validation.message, 'error');
      return;
    }

    // Save only the default provider and its settings
    await secureStorage.set(settings);

    logger.log(`Set ${provider.toUpperCase()} as default provider (with settings saved)`);

    // Update UI to show which is default
    updateDefaultProviderUI(provider);

    // Update enabled toggle state
    updateEnabledToggleState(provider);

    // Notify service worker about default provider change
    chrome.runtime
      .sendMessage({
        action: 'settingsSaved',
        provider: provider,
      })
      .catch(() => {}); // Ignore if service worker isn't running

    showStatus(
      `✓ ${provider.charAt(0).toUpperCase() + provider.slice(1)} set as default provider!`,
      'success'
    );
  } catch (error) {
    logger.error('Make default failed:', error);
    showStatus(`Failed to set default: ${error.message}`, 'error');
  }
}

// Update UI to show which provider is default
function updateDefaultProviderUI(currentDefault) {
  document.querySelectorAll('.default-btn').forEach((btn) => {
    const provider = btn.dataset.provider;
    const hasCredentials = providerHasCredentials(provider);

    if (currentDefault && provider === currentDefault) {
      // Replace button with green label for current default
      btn.textContent = '⭐ Default Provider';
      btn.disabled = false;
      btn.classList.add('active');
      btn.style.pointerEvents = 'none'; // Prevent clicking
    } else {
      // Show as regular button
      btn.textContent = '⭐ Make Default';
      btn.disabled = !hasCredentials;
      btn.classList.remove('active');
      btn.style.pointerEvents = 'auto'; // Allow clicking
    }
  });
}

// Check if a provider has the required credentials
function providerHasCredentials(provider) {
  switch (provider) {
    case 'openai':
      return document.getElementById('openai-key').value.trim() !== '';
    case 'claude':
      return document.getElementById('claude-key').value.trim() !== '';
    case 'groq':
      return document.getElementById('groq-key').value.trim() !== '';
    case 'gemini':
      return document.getElementById('gemini-key').value.trim() !== '';
    case 'local':
      return (
        document.getElementById('local-url').value.trim() !== '' &&
        document.getElementById('local-model').value.trim() !== ''
      );
    default:
      return false;
  }
}

// Update default button state for a specific provider
function updateDefaultButtonState(provider) {
  const btn = document.querySelector(`.default-btn[data-provider="${provider}"]`);
  if (!btn) return;

  const hasCredentials = providerHasCredentials(provider);
  const isCurrentDefault = btn.classList.contains('active');

  if (!isCurrentDefault) {
    btn.disabled = !hasCredentials;
  }
}

// Update enabled toggle state based on default provider
function updateEnabledToggleState(defaultProvider) {
  const enabledToggle = document.getElementById('enabled');
  const warningMessage = document.getElementById('no-provider-warning');
  const switchElement = enabledToggle.parentElement; // The switch label

  logger.log(
    'updateEnabledToggleState - defaultProvider:',
    defaultProvider,
    'type:',
    typeof defaultProvider
  );

  if (!defaultProvider) {
    // No default provider - disable toggle and show warning
    logger.log('No default provider - disabling toggle');
    enabledToggle.disabled = true;
    enabledToggle.checked = false;
    switchElement.style.opacity = '0.5';
    switchElement.style.cursor = 'not-allowed';
    warningMessage.classList.remove('hidden');
  } else {
    // Default provider exists - enable toggle
    logger.log('Default provider exists - enabling toggle');
    enabledToggle.disabled = false;
    switchElement.style.opacity = '1';
    switchElement.style.cursor = 'pointer';
    warningMessage.classList.add('hidden');
  }
}
