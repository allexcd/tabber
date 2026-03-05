// Popup Logic

import { secureStorage } from '../services/secure-storage.js';
import { logger } from '../services/logger.js';
import { detectBrowserInfo } from '../services/browser-info.js';

document.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  setupEventListeners();
  setupFastTooltips();

  // Listen for storage changes to sync with settings page
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.tabber && changes.tabber.newValue) {
      const newSettings = changes.tabber.newValue;
      if ('enabled' in newSettings || 'defaultProvider' in newSettings) {
        // Reload status to update UI
        logger.log('Detected settings change, reloading status');
        loadStatus();
      }
    }
  });
});

function setGroupAllButtonState(button, { enabled, busy }) {
  if (!button) {
    return;
  }

  const isEnabled = Boolean(enabled) && !busy;
  button.disabled = !isEnabled;
  button.style.opacity = isEnabled ? '1' : '0.5';
  button.textContent = busy ? '⏳ Grouping tabs...' : '🧠 Group All Tabs';
}

// Load current status
async function loadStatus() {
  try {
    // Get status from background service (handles encrypted keys properly)
    const response = await chrome.runtime.sendMessage({ action: 'getFullStatus' });

    logger.log('loadStatus - response:', response);

    if (!response) {
      // Fallback if background service doesn't respond
      logger.log('No response from background, using fallback');
      await loadStatusFallback();
      return;
    }

    const indicator = document.getElementById('status-indicator');
    const statusLabel = document.getElementById('status-label');
    const providerLabel = document.getElementById('provider-label');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleText = document.getElementById('toggle-text');
    const groupAllBtn = document.getElementById('group-all-btn');
    const isGroupingInProgress = Boolean(response.isGroupingInProgress);

    renderBrowserMitigationWarning(resolveBrowserInfo(response.browserInfo));

    if (!response.isConfigured) {
      indicator.className = 'status-indicator unconfigured';
      statusLabel.textContent = 'Not Configured';
      providerLabel.textContent = 'Open settings to configure';
      toggleText.textContent = 'Enable';
      toggleBtn.disabled = true;
      toggleBtn.style.opacity = '0.5';
      setGroupAllButtonState(groupAllBtn, { enabled: false, busy: isGroupingInProgress });
    } else if (response.enabled) {
      indicator.className = 'status-indicator active';
      statusLabel.textContent = 'Active';
      providerLabel.textContent = getProviderName(response.provider);
      toggleText.textContent = 'Disable';
      toggleBtn.classList.add('danger');
      toggleBtn.disabled = false;
      toggleBtn.style.opacity = '1';
      setGroupAllButtonState(groupAllBtn, { enabled: true, busy: isGroupingInProgress });
    } else {
      indicator.className = 'status-indicator inactive';
      statusLabel.textContent = 'Disabled';
      providerLabel.textContent = getProviderName(response.provider);
      toggleText.textContent = 'Enable';
      toggleBtn.classList.remove('danger');
      toggleBtn.disabled = false;
      toggleBtn.style.opacity = '1';
      setGroupAllButtonState(groupAllBtn, { enabled: false, busy: isGroupingInProgress });
    }
  } catch (error) {
    logger.error('Failed to get status from background:', error);
    await loadStatusFallback();
  }
}

// Fallback status check using direct storage access
async function loadStatusFallback() {
  const settings = await secureStorage.get([
    'enabled',
    'defaultProvider',
    'openaiKey',
    'claudeKey',
    'groqKey',
    'geminiKey',
    'localUrl',
    'localModel',
  ]);

  logger.log('loadStatusFallback - settings:', settings);

  const indicator = document.getElementById('status-indicator');
  const statusLabel = document.getElementById('status-label');
  const providerLabel = document.getElementById('provider-label');
  const toggleBtn = document.getElementById('toggle-btn');
  const toggleText = document.getElementById('toggle-text');
  const groupAllBtn = document.getElementById('group-all-btn');
  const executionState = await getExecutionStateFromBackground();
  const isGroupingInProgress = Boolean(executionState?.isGroupingInProgress);

  renderBrowserMitigationWarning(resolveBrowserInfo(await getBrowserInfoFromBackground()));

  const isConfigured = checkConfiguration(settings);

  logger.log('loadStatusFallback - isConfigured:', isConfigured);

  if (!isConfigured) {
    indicator.className = 'status-indicator unconfigured';
    statusLabel.textContent = 'Not Configured';
    providerLabel.textContent = 'Open settings to configure';
    toggleText.textContent = 'Enable';
    toggleBtn.disabled = true;
    toggleBtn.style.opacity = '0.5';
    setGroupAllButtonState(groupAllBtn, { enabled: false, busy: isGroupingInProgress });
  } else if (settings.enabled) {
    indicator.className = 'status-indicator active';
    statusLabel.textContent = 'Active';
    providerLabel.textContent = getProviderName(settings.defaultProvider);
    toggleText.textContent = 'Disable';
    toggleBtn.classList.add('danger');
    toggleBtn.disabled = false;
    toggleBtn.style.opacity = '1';
    setGroupAllButtonState(groupAllBtn, { enabled: true, busy: isGroupingInProgress });
  } else {
    indicator.className = 'status-indicator inactive';
    statusLabel.textContent = 'Disabled';
    providerLabel.textContent = getProviderName(settings.defaultProvider);
    toggleText.textContent = 'Enable';
    toggleBtn.classList.remove('danger');
    toggleBtn.disabled = false;
    toggleBtn.style.opacity = '1';
    setGroupAllButtonState(groupAllBtn, { enabled: false, busy: isGroupingInProgress });
  }
}

// Check if a provider is properly configured (fallback method)
function checkConfiguration(settings) {
  const provider = settings.defaultProvider;
  if (!provider) return false;

  // For encrypted keys, just check if they exist and are non-empty
  // The actual validation happens in the background service
  if (provider === 'openai' && settings.openaiKey && settings.openaiKey.trim()) return true;
  if (provider === 'claude' && settings.claudeKey && settings.claudeKey.trim()) return true;
  if (provider === 'groq' && settings.groqKey && settings.groqKey.trim()) return true;
  if (provider === 'gemini' && settings.geminiKey && settings.geminiKey.trim()) return true;
  if (provider === 'local' && settings.localUrl && settings.localModel) return true;

  return false;
}

async function getBrowserInfoFromBackground() {
  try {
    return await chrome.runtime.sendMessage({ action: 'getBrowserInfo' });
  } catch (error) {
    logger.debug('Failed to fetch browser info from background', error);
    return null;
  }
}

async function getExecutionStateFromBackground() {
  try {
    return await chrome.runtime.sendMessage({ action: 'getExecutionState' });
  } catch (error) {
    logger.debug('Failed to fetch execution state from background', error);
    return null;
  }
}

function renderBrowserMitigationWarning(browserInfo) {
  const warningEl = document.getElementById('browser-warning');
  if (!warningEl) {
    return;
  }

  if (!browserInfo?.isAffectedTabGroupLabelBug) {
    warningEl.textContent = '';
    warningEl.classList.add('hidden');
    return;
  }

  const browserName = browserInfo.browserName || 'This browser';
  const chromiumMajor = browserInfo.chromiumMajor || 'unknown';
  const fixedVersionLabel = browserInfo.fixedVersionLabel || 'Chromium 146+';

  warningEl.textContent = `${browserName} (Chromium ${chromiumMajor}) has a known tab-group label render bug. Update to ${fixedVersionLabel} for the permanent fix.`;
  warningEl.classList.remove('hidden');
}

function resolveBrowserInfo(backgroundInfo) {
  const localInfo = detectBrowserInfo();
  if (!backgroundInfo) {
    return localInfo;
  }

  // Use local detection as baseline (popup context), but don't lose background-specific metadata.
  const merged = { ...localInfo, ...backgroundInfo };

  if (localInfo.isAffectedTabGroupLabelBug) {
    merged.isAffectedTabGroupLabelBug = true;
    merged.chromiumMajor = localInfo.chromiumMajor;
    merged.browserName = localInfo.browserName || merged.browserName;
    merged.browserVersion = localInfo.browserVersion || merged.browserVersion;
  }

  return merged;
}

// Get human-readable provider name
function getProviderName(provider) {
  const names = {
    openai: 'Using OpenAI',
    claude: 'Using Claude',
    groq: 'Using Groq',
    gemini: 'Using Gemini',
    local: 'Using Local LLM',
  };
  return names[provider] || 'Unknown provider';
}

// Setup event listeners
function setupEventListeners() {
  // Toggle button
  document.getElementById('toggle-btn').addEventListener('click', async () => {
    const settings = await secureStorage.get(['enabled']);
    await secureStorage.set({ enabled: !settings.enabled });
    loadStatus();
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Group all tabs button
  document.getElementById('group-all-btn').addEventListener('click', async () => {
    const btn = document.getElementById('group-all-btn');
    if (btn.disabled) {
      return;
    }
    setGroupAllButtonState(btn, { enabled: false, busy: true });

    try {
      const response = await chrome.runtime.sendMessage({ action: 'groupAllTabs' });
      if (response.success) {
        btn.textContent = `✓ Grouped ${response.count} tabs`;
      } else {
        btn.textContent = `✗ ${response.error || 'Failed'}`;
      }
    } catch (error) {
      btn.textContent = '✗ Error';
    }
    await loadStatus();
  });
}

function setupFastTooltips() {
  const tooltip = document.getElementById('fast-tooltip');
  const targets = Array.from(document.querySelectorAll('[data-tooltip]'));
  if (!tooltip || targets.length === 0) {
    return;
  }

  let activeTarget = null;

  const showTooltip = (target) => {
    const message = target.getAttribute('data-tooltip');
    if (!message) {
      return;
    }

    activeTarget = target;
    applyTooltipTheme(tooltip, target);
    tooltip.textContent = message;
    tooltip.classList.remove('hidden');
    tooltip.setAttribute('aria-hidden', 'false');
    positionTooltip(tooltip, target);
  };

  const hideTooltip = (target) => {
    if (target && activeTarget && target !== activeTarget) {
      return;
    }

    activeTarget = null;
    tooltip.classList.add('hidden');
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.textContent = '';
    tooltip.classList.remove('theme-group');
  };

  const refreshActiveTooltip = () => {
    if (activeTarget && !tooltip.classList.contains('hidden')) {
      positionTooltip(tooltip, activeTarget);
    }
  };

  for (const target of targets) {
    target.addEventListener('mouseenter', () => showTooltip(target));
    target.addEventListener('mouseleave', () => hideTooltip(target));
    target.addEventListener('focus', () => showTooltip(target));
    target.addEventListener('blur', () => hideTooltip(target));
  }

  window.addEventListener('resize', refreshActiveTooltip);
  window.addEventListener('scroll', refreshActiveTooltip, true);
}

function applyTooltipTheme(tooltip, target) {
  tooltip.classList.remove('theme-group');
  const theme = target.getAttribute('data-tooltip-theme');
  if (!theme) {
    return;
  }

  if (theme === 'group') {
    tooltip.classList.add('theme-group');
  }
}

function positionTooltip(tooltip, target) {
  const targetRect = target.getBoundingClientRect();
  const gap = 10;
  const viewportPadding = 8;
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
  const minLeft = viewportPadding;
  const maxLeft = Math.max(
    viewportPadding,
    window.innerWidth - tooltipRect.width - viewportPadding
  );
  left = Math.min(Math.max(left, minLeft), maxLeft);

  let top = targetRect.top - tooltipRect.height - gap;
  top = Math.max(viewportPadding, top);

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;

  const arrowLeftRaw = targetRect.left + targetRect.width / 2 - left;
  const arrowLeft = Math.min(Math.max(arrowLeftRaw, 10), tooltipRect.width - 10);
  tooltip.style.setProperty('--tooltip-arrow-left', `${Math.round(arrowLeft)}px`);
}
