// Settings Page Logic - Main Module
// Orchestrates settings functionality using specialized modules.

import { secureStorage } from '../services/secure-storage.js';
import { logger } from '../services/logger.js';
import { PROVIDER_IDS, validateProviderConfig } from '../services/provider-metadata.js';
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

const GITHUB_ISSUES_URL = 'https://github.com/allexcd/tabber/issues/new/choose';

const PROVIDER_FORM_BINDINGS = Object.freeze({
  openai: Object.freeze([
    { key: 'openaiKey', id: 'openai-key', type: 'text' },
    {
      key: 'openaiModel',
      type: 'model',
      selectId: 'openai-model',
      customInputId: 'openai-custom-model',
      customGroupId: 'openai-custom-group',
      defaultValue: 'gpt-4o-mini',
    },
  ]),
  claude: Object.freeze([
    { key: 'claudeKey', id: 'claude-key', type: 'text' },
    {
      key: 'claudeModel',
      type: 'model',
      selectId: 'claude-model',
      customInputId: 'claude-custom-model',
      customGroupId: 'claude-custom-group',
      defaultValue: 'claude-3-5-haiku-20241022',
    },
  ]),
  groq: Object.freeze([
    { key: 'groqKey', id: 'groq-key', type: 'text' },
    {
      key: 'groqModel',
      type: 'model',
      selectId: 'groq-model',
      customInputId: 'groq-custom-model',
      customGroupId: 'groq-custom-group',
      defaultValue: 'llama-3.1-70b-versatile',
    },
  ]),
  gemini: Object.freeze([
    { key: 'geminiKey', id: 'gemini-key', type: 'text' },
    {
      key: 'geminiModel',
      type: 'model',
      selectId: 'gemini-model',
      customInputId: 'gemini-custom-model',
      customGroupId: 'gemini-custom-group',
      defaultValue: 'gemini-1.5-flash',
    },
  ]),
  local: Object.freeze([
    { key: 'localUrl', id: 'local-url', type: 'text' },
    { key: 'localModel', id: 'local-model', type: 'text' },
    { key: 'localApiFormat', id: 'local-api-format', type: 'text', defaultValue: 'auto' },
    {
      key: 'localStrictLoopback',
      id: 'local-strict-loopback',
      type: 'checkbox',
      defaultValue: true,
    },
  ]),
});

const MODEL_FETCH_HANDLERS = Object.freeze({
  'fetch-openai-models': fetchOpenAIModels,
  'fetch-claude-models': fetchClaudeModels,
  'fetch-groq-models': fetchGroqModels,
  'fetch-gemini-models': fetchGeminiModels,
});

const STORAGE_KEYS = Object.freeze([
  'enabled',
  'defaultProvider',
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
  'localStrictLoopback',
]);

logger.log('Settings module loaded');

document.addEventListener('DOMContentLoaded', async () => {
  logger.log('DOMContentLoaded fired');
  try {
    await loadCachedModels();
    logger.log('Cached models loaded');

    await secureStorage.migrateToEncrypted();
    logger.log('Migration complete');

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

function getBindings(provider) {
  return PROVIDER_FORM_BINDINGS[provider] || [];
}

function readProviderSettingsFromForm(provider) {
  const bindings = getBindings(provider);
  const result = {};

  bindings.forEach((binding) => {
    if (binding.type === 'model') {
      result[binding.key] = getModelValue(binding.selectId, binding.customInputId);
      return;
    }

    const input = document.getElementById(binding.id);
    if (!input) {
      result[binding.key] = '';
      return;
    }

    if (binding.type === 'checkbox') {
      result[binding.key] = Boolean(input.checked);
      return;
    }

    result[binding.key] = input.value.trim();
  });

  return result;
}

function readAllProviderSettingsFromForm() {
  return PROVIDER_IDS.reduce((allSettings, provider) => {
    return { ...allSettings, ...readProviderSettingsFromForm(provider) };
  }, {});
}

function setProviderSettingsInForm(provider, settings) {
  const bindings = getBindings(provider);

  bindings.forEach((binding) => {
    if (binding.type === 'model') {
      const select = document.getElementById(binding.selectId);
      const customInput = document.getElementById(binding.customInputId);
      const customGroup = document.getElementById(binding.customGroupId);
      const modelValue = settings[binding.key] || binding.defaultValue || '';

      if (!select || !customInput || !customGroup) {
        return;
      }

      if (isCustomModel(select, modelValue)) {
        select.value = 'custom';
        customInput.value = modelValue;
        customGroup.classList.add('active');
      } else {
        select.value = modelValue;
        customInput.value = '';
        customGroup.classList.remove('active');
      }
      return;
    }

    const input = document.getElementById(binding.id);
    if (input) {
      if (binding.type === 'checkbox') {
        input.checked = Boolean(settings[binding.key] ?? binding.defaultValue ?? false);
      } else {
        input.value = settings[binding.key] || binding.defaultValue || '';
      }
    }
  });
}

function validateSettings(provider, settings) {
  return validateProviderConfig(provider, settings);
}

async function loadSettings() {
  const settings = await secureStorage.get(STORAGE_KEYS);

  document.getElementById('enabled').checked = settings.enabled ?? false;

  Object.keys(PROVIDER_FORM_BINDINGS).forEach((provider) => {
    setProviderSettingsInForm(provider, settings);
  });

  const provider = settings.defaultProvider || 'claude';
  const providerRadio = document.querySelector(`input[name="provider"][value="${provider}"]`);
  if (providerRadio) {
    providerRadio.checked = true;
    showProviderSettings(provider);
  }

  updateDefaultProviderUI(settings.defaultProvider);
  updateEnabledToggleState(settings.defaultProvider);
  logger.log('loadSettings - defaultProvider:', settings.defaultProvider);
}

function setupEventListeners() {
  document.getElementById('enabled').addEventListener('change', async (e) => {
    try {
      await secureStorage.set({ enabled: e.target.checked });
      logger.log('Extension enabled state saved:', e.target.checked);

      chrome.runtime
        .sendMessage({
          action: 'settingsSaved',
          enabled: e.target.checked,
        })
        .catch(() => {});
    } catch (error) {
      logger.error('Failed to save enabled state:', error);
    }
  });

  document.querySelectorAll('input[name="provider"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      showProviderSettings(e.target.value);
    });
  });

  document.getElementById('custom-rules-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/rules.html') });
  });

  document.getElementById('report-issue-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: GITHUB_ISSUES_URL });
  });

  Object.values(PROVIDER_FORM_BINDINGS)
    .flat()
    .filter((binding) => binding.type === 'model')
    .forEach((binding) => {
      const select = document.getElementById(binding.selectId);
      const customGroup = document.getElementById(binding.customGroupId);
      if (!select || !customGroup) {
        return;
      }

      select.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          customGroup.classList.add('active');
        } else {
          customGroup.classList.remove('active');
        }
      });
    });

  Object.entries(MODEL_FETCH_HANDLERS).forEach(([buttonId, handler]) => {
    const button = document.getElementById(buttonId);
    if (!button) {
      return;
    }

    button.addEventListener('click', () => handler(showStatus));
  });

  document.querySelectorAll('.save-btn, #save-btn').forEach((btn) => {
    btn.addEventListener('click', saveSettings);
  });

  document.querySelectorAll('.test-btn, #test-btn').forEach((btn) => {
    btn.addEventListener('click', testConnection);
  });

  document.querySelectorAll('.default-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      makeProviderDefault(e.target.dataset.provider);
    });
  });

  Object.entries(PROVIDER_FORM_BINDINGS).forEach(([provider, bindings]) => {
    bindings.forEach((binding) => {
      let inputIds = [];
      if (binding.type === 'model') {
        inputIds = [binding.selectId, binding.customInputId];
      } else if (binding.id) {
        inputIds = [binding.id];
      }

      inputIds.forEach((inputId) => {
        const input = document.getElementById(inputId);
        if (!input) {
          return;
        }

        const eventName =
          input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventName, () => updateDefaultButtonState(provider));
      });
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.tabber && changes.tabber.newValue) {
      const newSettings = changes.tabber.newValue;
      if ('enabled' in newSettings) {
        const enabledToggle = document.getElementById('enabled');
        if (enabledToggle.checked !== newSettings.enabled) {
          enabledToggle.checked = newSettings.enabled;
          logger.log('Synced enabled state from storage:', newSettings.enabled);
        }
      }
    }
  });
}

function showProviderSettings(provider) {
  logger.log('Switching to provider:', provider);

  document.querySelectorAll('.provider-settings').forEach((section) => {
    section.classList.remove('active');
  });

  const settingsSection = document.getElementById(`${provider}-settings`);
  if (settingsSection) {
    settingsSection.classList.add('active');
    logger.log('Loading cached models for:', provider);
    loadCachedModelsForProvider(provider);
  }
}

async function saveSettings() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value;
  if (!provider) {
    showStatus('Please select a provider first', 'error');
    return;
  }

  const settings = {
    enabled: document.getElementById('enabled').checked,
    ...readProviderSettingsFromForm(provider),
  };

  const validation = validateSettings(provider, settings);
  if (!validation.valid) {
    showStatus(validation.message, 'error');
    return;
  }

  try {
    await secureStorage.set(settings);
    logger.log(`Saved settings for ${provider.toUpperCase()}`);

    updateDefaultButtonState(provider);

    chrome.runtime
      .sendMessage({
        action: 'settingsSaved',
        provider,
      })
      .catch(() => {});

    showStatus(
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} settings saved!`,
      'success'
    );
  } catch (error) {
    logger.error('Save failed:', error);
    showStatus(`Save failed: ${error.message}`, 'error');
  }
}

async function testConnection() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value;
  if (!provider) {
    showStatus('Please select an AI provider first', 'error');
    return;
  }

  const testConfig = {
    provider,
    ...readAllProviderSettingsFromForm(),
  };

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

function showStatus(message, type) {
  const activeSettings = document.querySelector('.provider-settings.active');
  const statusElements = activeSettings
    ? activeSettings.querySelectorAll('.status')
    : document.querySelectorAll('#status, .status');

  statusElements.forEach((status) => {
    status.textContent = message;
    status.className = `status ${type}`;
  });
}

async function makeProviderDefault(provider) {
  try {
    const settings = {
      defaultProvider: provider,
      ...readProviderSettingsFromForm(provider),
    };

    const validation = validateSettings(provider, settings);
    if (!validation.valid) {
      showStatus(validation.message, 'error');
      return;
    }

    await secureStorage.set(settings);
    logger.log(`Set ${provider.toUpperCase()} as default provider (with settings saved)`);

    updateDefaultProviderUI(provider);
    updateEnabledToggleState(provider);

    chrome.runtime
      .sendMessage({
        action: 'settingsSaved',
        provider,
      })
      .catch(() => {});

    showStatus(
      `✓ ${provider.charAt(0).toUpperCase() + provider.slice(1)} set as default provider!`,
      'success'
    );
  } catch (error) {
    logger.error('Make default failed:', error);
    showStatus(`Failed to set default: ${error.message}`, 'error');
  }
}

function updateDefaultProviderUI(currentDefault) {
  document.querySelectorAll('.default-btn').forEach((btn) => {
    const provider = btn.dataset.provider;
    const hasCredentials = providerHasCredentials(provider);

    if (currentDefault && provider === currentDefault) {
      btn.textContent = '⭐ Default Provider';
      btn.disabled = false;
      btn.classList.add('active');
      btn.style.pointerEvents = 'none';
    } else {
      btn.textContent = '⭐ Make Default';
      btn.disabled = !hasCredentials;
      btn.classList.remove('active');
      btn.style.pointerEvents = 'auto';
    }
  });
}

function providerHasCredentials(provider) {
  const values = readProviderSettingsFromForm(provider);
  return validateSettings(provider, values).valid;
}

function updateDefaultButtonState(provider) {
  const btn = document.querySelector(`.default-btn[data-provider="${provider}"]`);
  if (!btn) {
    return;
  }

  const hasCredentials = providerHasCredentials(provider);
  const isCurrentDefault = btn.classList.contains('active');

  if (!isCurrentDefault) {
    btn.disabled = !hasCredentials;
  }
}

function updateEnabledToggleState(defaultProvider) {
  const enabledToggle = document.getElementById('enabled');
  const warningMessage = document.getElementById('no-provider-warning');
  const switchElement = enabledToggle.parentElement;

  logger.log(
    'updateEnabledToggleState - defaultProvider:',
    defaultProvider,
    'type:',
    typeof defaultProvider
  );

  if (!defaultProvider) {
    logger.log('No default provider - disabling toggle');
    enabledToggle.disabled = true;
    enabledToggle.checked = false;
    switchElement.style.opacity = '0.5';
    switchElement.style.cursor = 'not-allowed';
    warningMessage.classList.remove('hidden');
  } else {
    logger.log('Default provider exists - enabling toggle');
    enabledToggle.disabled = false;
    switchElement.style.opacity = '1';
    switchElement.style.cursor = 'pointer';
    warningMessage.classList.add('hidden');
  }
}
