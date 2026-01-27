// Settings Page Logic

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

// Load saved settings
async function loadSettings() {
  const settings = await chrome.storage.sync.get([
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
  document.getElementById('openai-model').value = settings.openaiModel || 'gpt-4o-mini';

  // Set Claude settings
  document.getElementById('claude-key').value = settings.claudeKey || '';
  document.getElementById('claude-model').value = settings.claudeModel || 'claude-3-haiku-20240307';

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

  // Save button
  document.getElementById('save-btn').addEventListener('click', saveSettings);

  // Test button
  document.getElementById('test-btn').addEventListener('click', testConnection);
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
    openaiModel: document.getElementById('openai-model').value,
    claudeKey: document.getElementById('claude-key').value.trim(),
    claudeModel: document.getElementById('claude-model').value,
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

  await chrome.storage.sync.set(settings);
  showStatus('Settings saved successfully!', 'success');
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

  // Save settings first
  await saveSettings();

  showStatus('Testing connection...', 'info');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'testConnection' });
    
    if (response.success) {
      showStatus('✓ Connection successful!', 'success');
    } else {
      showStatus(`✗ Connection failed: ${response.error}`, 'error');
    }
  } catch (error) {
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
