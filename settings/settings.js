// Settings Page Logic

import { secureStorage } from '../services/secure-storage.js';

document.addEventListener('DOMContentLoaded', () => {
  // Migrate any existing unencrypted API keys
  secureStorage.migrateToEncrypted().then(() => {
    loadSettings();
    setupEventListeners();
    setupChangelogModal();
  });
});

// Check if a model value exists in the select options
function isCustomModel(selectElement, modelValue) {
  const options = Array.from(selectElement.options);
  return !options.some(opt => opt.value === modelValue && opt.value !== 'custom');
}

// Get the actual model value (handles custom model input)
function getModelValue(selectId, customInputId) {
  const select = document.getElementById(selectId);
  if (select.value === 'custom') {
    return document.getElementById(customInputId).value.trim();
  }
  return select.value;
}

// Load saved settings
async function loadSettings() {
  const settings = await secureStorage.get([
    'enabled',
    'provider',
    'defaultProvider',
    'openaiKey',
    'openaiModel',
    'claudeKey',
    'claudeModel',
    'localUrl',
    'localModel',
    'localApiFormat'
  ]);

  // Set enabled toggle
  document.getElementById('enabled').checked = settings.enabled ?? false;

  // Set default provider
  document.getElementById('default-provider').value = settings.defaultProvider || '';

  // Set provider selection
  if (settings.provider) {
    const providerRadio = document.querySelector(`input[name="provider"][value="${settings.provider}"]`);
    if (providerRadio) {
      providerRadio.checked = true;
      showProviderSettings(settings.provider);
    }
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
}

// Setup event listeners
function setupEventListeners() {
  // Provider selection
  document.querySelectorAll('input[name="provider"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      showProviderSettings(e.target.value);
    });
  });

  // Default provider selection - auto-select the radio button
  document.getElementById('default-provider').addEventListener('change', (e) => {
    const provider = e.target.value;
    if (provider) {
      const providerRadio = document.querySelector(`input[name="provider"][value="${provider}"]`);
      if (providerRadio) {
        providerRadio.checked = true;
        showProviderSettings(provider);
      }
    }
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

  // Fetch OpenAI models button
  document.getElementById('fetch-openai-models').addEventListener('click', fetchOpenAIModels);

  // Save button
  document.getElementById('save-btn').addEventListener('click', saveSettings);

  // Test button
  document.getElementById('test-btn').addEventListener('click', testConnection);
}

function setupChangelogModal() {
  const infoButton = document.getElementById('changelog-info');
  const modal = document.getElementById('changelog-modal');
  const closeButton = document.getElementById('changelog-close');
  const content = document.getElementById('changelog-content');

  if (!infoButton || !modal || !closeButton || !content) {
    return;
  }

  const closeModal = () => {
    modal.classList.add('hidden');
  };

  const openModal = async () => {
    modal.classList.remove('hidden');
    content.innerHTML = '<p class="loading">Loading changelog...</p>';
    try {
      const response = await fetch(chrome.runtime.getURL('CHANGELOG.json'));
      if (!response.ok) {
        throw new Error('Failed to load changelog');
      }
      const data = await response.json();
      renderChangelog(data, content);
    } catch (error) {
      content.innerHTML = '<p class="loading">Unable to load changelog.</p>';
    }
  };

  infoButton.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target?.dataset?.close === 'true') {
      closeModal();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

function renderChangelog(data, container) {
  if (!data || !Array.isArray(data.versions) || data.versions.length === 0) {
    container.innerHTML = '<p class="loading">No changelog data available.</p>';
    return;
  }

  const html = data.versions.map((version) => {
    const sections = version.sections || {};
    const sectionHtml = Object.keys(sections).map((sectionTitle) => {
      const items = sections[sectionTitle] || [];
      if (!items.length) {
        return '';
      }
      const listItems = items.map(item => `<li>${item}</li>`).join('');
      return `
        <div class="changelog-section">
          <h4>${sectionTitle}</h4>
          <ul>${listItems}</ul>
        </div>
      `;
    }).join('');

    return `
      <div class="changelog-version">
        <h3>${version.version}</h3>
        ${version.date ? `<div class="changelog-date">${version.date}</div>` : ''}
        ${sectionHtml}
      </div>
    `;
  }).join('');

  container.innerHTML = html || '<p class="loading">No changelog data available.</p>';
}

// Show the settings section for the selected provider
function showProviderSettings(provider) {
  // Hide all provider settings
  document.querySelectorAll('.provider-settings').forEach(section => {
    section.classList.remove('active');
  });

  // Show the selected provider settings
  const settingsSection = document.getElementById(`${provider}-settings`);
  if (settingsSection) {
    settingsSection.classList.add('active');
  }
}

// Save settings to Chrome storage
async function saveSettings() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value;
  const defaultProvider = document.getElementById('default-provider').value;
  
  const settings = {
    enabled: document.getElementById('enabled').checked,
    provider: provider || defaultProvider || '',
    defaultProvider: defaultProvider,
    openaiKey: document.getElementById('openai-key').value.trim(),
    openaiModel: getModelValue('openai-model', 'openai-custom-model'),
    claudeKey: document.getElementById('claude-key').value.trim(),
    claudeModel: getModelValue('claude-model', 'claude-custom-model'),
    localUrl: document.getElementById('local-url').value.trim(),
    localModel: document.getElementById('local-model').value.trim(),
    localApiFormat: document.getElementById('local-api-format').value
  };

  // Validate required fields for the selected provider
  if (settings.enabled && provider) {
    const validation = validateSettings(provider, settings);
    if (!validation.valid) {
      showStatus(validation.message, 'error');
      return;
    }
  }

  try {
    await secureStorage.set(settings);
    // Notify service worker about settings update
    chrome.runtime.sendMessage({ 
      action: 'settingsSaved', 
      provider: settings.provider 
    }).catch(() => {}); // Ignore if service worker isn't running
    showStatus('Settings saved securely!', 'success');
  } catch (error) {
    console.error('Settings: Save failed:', error);
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

  showStatus('Testing connection...', 'info');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'testConnection' });
    
    if (response.success) {
      showStatus('✓ Connection successful!', 'success');
    } else {
      showStatus(`✗ Connection failed: ${response.error}`, 'error');
    }
  } catch (error) {
    console.error('Settings: testConnection error:', error);
    showStatus(`✗ Error: ${error.message}`, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  
  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      status.classList.add('hidden');
    }, 3000);
  }
}

// Fetch available models from OpenAI API
async function fetchOpenAIModels() {
  const apiKey = document.getElementById('openai-key').value.trim();
  const btn = document.getElementById('fetch-openai-models');
  const select = document.getElementById('openai-model');
  const currentValue = select.value;
  
  if (!apiKey) {
    showStatus('Please enter your OpenAI API key first', 'error');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '⏳ Loading...';
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter for chat models (gpt, o1, o3, chatgpt)
    const chatModels = data.data
      .filter(m => 
        m.id.includes('gpt') || 
        m.id.startsWith('o1') || 
        m.id.startsWith('o3') ||
        m.id.includes('chatgpt')
      )
      .map(m => m.id)
      .sort((a, b) => {
        // Sort: gpt-4 and newer first, then by name
        const aScore = a.includes('gpt-4') || a.includes('gpt-5') || a.startsWith('o') ? 0 : 1;
        const bScore = b.includes('gpt-4') || b.includes('gpt-5') || b.startsWith('o') ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return b.localeCompare(a); // Reverse alphabetical (newer versions first)
      });
    
    // Clear and repopulate select
    select.innerHTML = '';
    
    chatModels.forEach(modelId => {
      const option = document.createElement('option');
      option.value = modelId;
      option.textContent = modelId;
      select.appendChild(option);
    });
    
    // Add custom option at the end
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Model...';
    select.appendChild(customOption);
    
    // Restore previous selection if it exists, otherwise select first
    if (chatModels.includes(currentValue)) {
      select.value = currentValue;
    } else if (chatModels.length > 0) {
      select.value = chatModels[0];
    }
    
    showStatus(`✓ Loaded ${chatModels.length} models from OpenAI`, 'success');
    
  } catch (error) {
    showStatus(`Failed to fetch models: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Fetch';
  }
}
