// Popup Logic

document.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  setupEventListeners();
});

// Load current status
async function loadStatus() {
  try {
    // Get status from background service (handles encrypted keys properly)
    const response = await chrome.runtime.sendMessage({ action: 'getFullStatus' });
    
    if (!response) {
      // Fallback if background service doesn't respond
      await loadStatusFallback();
      return;
    }
    
    const indicator = document.getElementById('status-indicator');
    const statusLabel = document.getElementById('status-label');
    const providerLabel = document.getElementById('provider-label');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleText = document.getElementById('toggle-text');

    if (!response.isConfigured) {
      indicator.className = 'status-indicator unconfigured';
      statusLabel.textContent = 'Not Configured';
      providerLabel.textContent = 'Open settings to configure';
      toggleText.textContent = 'Enable';
      toggleBtn.disabled = true;
      toggleBtn.style.opacity = '0.5';
    } else if (response.enabled) {
      indicator.className = 'status-indicator active';
      statusLabel.textContent = 'Active';
      providerLabel.textContent = getProviderName(response.provider);
      toggleText.textContent = 'Disable';
      toggleBtn.classList.add('danger');
      toggleBtn.disabled = false;
      toggleBtn.style.opacity = '1';
    } else {
      indicator.className = 'status-indicator inactive';
      statusLabel.textContent = 'Disabled';
      providerLabel.textContent = getProviderName(response.provider);
      toggleText.textContent = 'Enable';
      toggleBtn.classList.remove('danger');
      toggleBtn.disabled = false;
      toggleBtn.style.opacity = '1';
    }
  } catch (error) {
    console.error('Failed to get status from background:', error);
    await loadStatusFallback();
  }
}

// Fallback status check using direct storage access
async function loadStatusFallback() {
  const settings = await chrome.storage.sync.get(['enabled', 'provider', 'openaiKey', 'claudeKey', 'localUrl', 'localModel']);
  
  const indicator = document.getElementById('status-indicator');
  const statusLabel = document.getElementById('status-label');
  const providerLabel = document.getElementById('provider-label');
  const toggleBtn = document.getElementById('toggle-btn');
  const toggleText = document.getElementById('toggle-text');

  const isConfigured = checkConfiguration(settings);
  
  if (!isConfigured) {
    indicator.className = 'status-indicator unconfigured';
    statusLabel.textContent = 'Not Configured';
    providerLabel.textContent = 'Open settings to configure';
    toggleText.textContent = 'Enable';
    toggleBtn.disabled = true;
    toggleBtn.style.opacity = '0.5';
  } else if (settings.enabled) {
    indicator.className = 'status-indicator active';
    statusLabel.textContent = 'Active';
    providerLabel.textContent = getProviderName(settings.provider);
    toggleText.textContent = 'Disable';
    toggleBtn.classList.add('danger');
    toggleBtn.disabled = false;
    toggleBtn.style.opacity = '1';
  } else {
    indicator.className = 'status-indicator inactive';
    statusLabel.textContent = 'Disabled';
    providerLabel.textContent = getProviderName(settings.provider);
    toggleText.textContent = 'Enable';
    toggleBtn.classList.remove('danger');
    toggleBtn.disabled = false;
    toggleBtn.style.opacity = '1';
  }
}

// Check if a provider is properly configured (fallback method)
function checkConfiguration(settings) {
  const provider = settings.provider;
  if (!provider) return false;
  
  // For encrypted keys, just check if they exist and are non-empty
  // The actual validation happens in the background service
  if (provider === 'openai' && settings.openaiKey && settings.openaiKey.trim()) return true;
  if (provider === 'claude' && settings.claudeKey && settings.claudeKey.trim()) return true;
  if (provider === 'local' && settings.localUrl && settings.localModel) return true;
  
  return false;
}

// Get human-readable provider name
function getProviderName(provider) {
  const names = {
    'openai': 'Using OpenAI',
    'claude': 'Using Claude',
    'local': 'Using Local LLM'
  };
  return names[provider] || 'Unknown provider';
}

// Setup event listeners
function setupEventListeners() {
  // Toggle button
  document.getElementById('toggle-btn').addEventListener('click', async () => {
    const settings = await chrome.storage.sync.get(['enabled']);
    await chrome.storage.sync.set({ enabled: !settings.enabled });
    loadStatus();
  });

  // Reprocess button
  document.getElementById('reprocess-btn').addEventListener('click', async () => {
    const btn = document.getElementById('reprocess-btn');
    btn.textContent = 'Processing...';
    btn.disabled = true;
    
    try {
      await chrome.runtime.sendMessage({ action: 'reprocessTab' });
      btn.textContent = 'Done!';
      setTimeout(() => {
        btn.textContent = 'Regroup Tab';
        btn.disabled = false;
      }, 1500);
    } catch (error) {
      btn.textContent = 'Error';
      setTimeout(() => {
        btn.textContent = 'Regroup Tab';
        btn.disabled = false;
      }, 1500);
    }
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Group all tabs button
  document.getElementById('group-all-btn').addEventListener('click', async () => {
    const btn = document.getElementById('group-all-btn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Grouping tabs...';
    btn.disabled = true;
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'groupAllTabs' });
      if (response.success) {
        btn.textContent = `✓ Grouped ${response.count} tabs!`;
      } else {
        btn.textContent = `✗ ${response.error || 'Failed'}`;
      }
    } catch (error) {
      btn.textContent = '✗ Error';
    }
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2500);
  });
}
