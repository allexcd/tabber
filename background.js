// AI Tab Grouper - Background Service Worker

import { AIService } from './services/ai-service.js';
import { secureStorage } from './services/secure-storage.js';
import { logger } from './services/logger.js';
import {
  detectBrowserInfo,
  TAB_GROUP_TITLE_RENDER_FIXED_VERSION_LABEL,
} from './services/browser-info.js';

const aiService = new AIService();

// Track tabs that are being processed to avoid duplicate processing
const processingTabs = new Set();
// Track newly created tabs so they can be regrouped even if browser auto-assigns them to a group.
const pendingNewTabs = new Set();
// Track last processed host per tab to re-evaluate on domain changes.
const lastProcessedHostByTab = new Map();
// Prevent concurrent "Group All Tabs" runs from overlapping.
let groupAllRunInProgress = false;

// Available colors for tab groups
const GROUP_COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey'];
const CONTROL_CHARS_REGEX = /\p{Cc}/gu;
const ZERO_WIDTH_REGEX = /[\u200b-\u200d\ufeff]/g;
const BROWSER_INFO = detectBrowserInfo();

logger.log(
  `Browser detected: ${BROWSER_INFO.browserName} ${BROWSER_INFO.browserVersion || ''} ${
    BROWSER_INFO.isChromiumBased
      ? `(Chromium ${BROWSER_INFO.chromiumMajor || 'unknown'})`
      : '(non-Chromium)'
  }`
);
if (BROWSER_INFO.isAffectedTabGroupLabelBug) {
  logger.warn(
    `Known tab-group title rendering bug detected for Chromium ${BROWSER_INFO.chromiumMajor}. Update to ${TAB_GROUP_TITLE_RENDER_FIXED_VERSION_LABEL}.`
  );
}

function isInternalTabUrl(url) {
  return (
    !url ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:')
  );
}

function getExecutionState() {
  return {
    isGroupingInProgress: groupAllRunInProgress,
  };
}

// Listen for tab updates (when title changes/loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when the page has completed loading.
  if (changeInfo.status !== 'complete' || !tab || tab.pinned) {
    return;
  }

  const isNewTabCandidate = pendingNewTabs.has(tabId);
  const currentHost = getHostname(tab.url);
  const previousHost = lastProcessedHostByTab.get(tabId);
  const hasHostChanged = Boolean(previousHost && currentHost && currentHost !== previousHost);
  const shouldProcess = isNewTabCandidate || hasHostChanged;

  if (!shouldProcess) {
    return;
  }

  if (processingTabs.has(tabId) || isInternalTabUrl(tab.url)) {
    return;
  }

  try {
    const result = await processTab(tabId, tab);
    if (result && currentHost) {
      lastProcessedHostByTab.set(tabId, currentHost);
    }
  } finally {
    pendingNewTabs.delete(tabId);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (!tab?.pinned && Number.isInteger(tab.id)) {
    pendingNewTabs.add(tab.id);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pendingNewTabs.delete(tabId);
  lastProcessedHostByTab.delete(tabId);
  processingTabs.delete(tabId);
});

// Process a tab and assign it to a group
// options.force: if true, process even if extension is disabled (used by Group All Tabs)
// options.promptGroups: optional group list used only as AI prompt context
// options.execute: if false, only return the decision without applying grouping
async function processTab(tabId, tab, options = {}) {
  const { force = false, promptGroups = null, execute = true } = options;
  processingTabs.add(tabId);

  try {
    // Check if AI is configured
    const settings = await secureStorage.get([
      'defaultProvider',
      'openaiKey',
      'claudeKey',
      'localUrl',
      'localModel',
      'groqKey',
      'geminiKey',
      'enabled',
    ]);

    if (!settings.enabled && !force) {
      processingTabs.delete(tabId);
      return;
    }

    if (!isConfigured(settings)) {
      logger.log('No AI provider configured');
      processingTabs.delete(tabId);
      return;
    }

    // Prompt context contains current named groups so AI can reuse them.
    const promptContextGroups = Array.isArray(promptGroups)
      ? promptGroups
      : await getExistingGroups(tab.windowId);

    // Ask AI for grouping decision
    const decision = await aiService.getGroupingDecision(
      tabId,
      tab.title,
      tab.url,
      promptContextGroups
    );

    if (!decision) {
      logger.log('No decision from AI');
      processingTabs.delete(tabId);
      return null;
    }

    if (!execute) {
      return decision;
    }

    // Execute the grouping
    const existingGroups = await getExistingGroups(tab.windowId, { includeUntitled: true });
    await executeGrouping(tabId, tab.windowId, decision, existingGroups);
    return decision;
  } catch (error) {
    logger.error('Error processing tab', error);
    return null;
  } finally {
    processingTabs.delete(tabId);
  }
}

// Check if AI provider is properly configured
function isConfigured(settings) {
  const provider = settings.defaultProvider;

  if (provider === 'openai' && settings.openaiKey && settings.openaiKey.trim()) return true;
  if (provider === 'claude' && settings.claudeKey && settings.claudeKey.trim()) return true;
  if (provider === 'local' && settings.localUrl && settings.localModel) return true;
  if (provider === 'groq' && settings.groqKey && settings.groqKey.trim()) return true;
  if (provider === 'gemini' && settings.geminiKey && settings.geminiKey.trim()) return true;

  return false;
}

// Get existing tab groups in a window
async function getExistingGroups(windowId, options = {}) {
  const { includeUntitled = false } = options;
  const groups = await chrome.tabGroups.query({ windowId });
  const normalizedGroups = groups.map((g) => ({
    id: g.id,
    title: normalizeGroupName(g.title),
    color: g.color,
  }));

  if (includeUntitled) {
    return normalizedGroups;
  }

  return normalizedGroups.filter((g) => g.title);
}

// Execute the grouping decision
async function executeGrouping(tabId, windowId, decision, existingGroups) {
  try {
    const normalizedDecision = {
      groupName: normalizeGroupName(decision.groupName) || 'Misc',
      color: validateColor(decision.color),
    };

    // Check if we should use an existing group
    const existingGroup = existingGroups.find(
      (g) =>
        normalizeGroupName(g.title).toLowerCase() === normalizedDecision.groupName.toLowerCase()
    );

    if (existingGroup) {
      // Add to existing group
      await chrome.tabs.group({ tabIds: tabId, groupId: existingGroup.id });
      logger.log(`Added tab to existing group "${existingGroup.title}"`);

      // Work around Chromium/Brave label rendering regression by re-applying metadata.
      await forceGroupTitleRender(
        existingGroup.id,
        normalizedDecision.groupName,
        validateColor(existingGroup.color || normalizedDecision.color)
      );
    } else {
      // Create new group
      const groupId = await chrome.tabs.group({ tabIds: tabId, createProperties: { windowId } });

      // Set group properties
      logger.log(
        `About to set group ${groupId} title="${normalizedDecision.groupName}" color=${normalizedDecision.color}`
      );

      // Set group metadata and force a render-friendly update sequence.
      await forceGroupTitleRender(groupId, normalizedDecision.groupName, normalizedDecision.color);

      // Verify what was actually set
      const verifyGroup = await chrome.tabGroups.get(groupId);
      logger.log(
        `Verified group ${groupId}: title="${verifyGroup.title}" color=${verifyGroup.color}`
      );

      logger.log(
        `Created new group "${normalizedDecision.groupName}" with color ${normalizedDecision.color}`
      );
    }
  } catch (error) {
    logger.error('Error executing grouping', error);
  }
}

async function forceGroupTitleRender(groupId, title, color) {
  const safeTitle = normalizeGroupName(title);
  const safeColor = validateColor(color);
  if (!safeTitle) {
    return;
  }

  try {
    // Always apply title and color once.
    await chrome.tabGroups.update(groupId, { title: safeTitle, color: safeColor });

    // Color nudge is only needed on Chromium 145 label-render regression builds.
    if (!BROWSER_INFO.isAffectedTabGroupLabelBug) {
      return;
    }

    const nudgeColor = pickDifferentColor(safeColor);
    if (nudgeColor) {
      logger.log(`Color nudge for group ${groupId}: ${safeColor} -> ${nudgeColor}`);
      await chrome.tabGroups.update(groupId, { color: nudgeColor });

      const afterNudge = await chrome.tabGroups.get(groupId);
      logger.log(`Color after nudge for group ${groupId}: ${afterNudge.color}`);

      await chrome.tabGroups.update(groupId, { color: safeColor });

      const afterRestore = await chrome.tabGroups.get(groupId);
      logger.log(`Color nudge restore for group ${groupId}: ${nudgeColor} -> ${safeColor}`);
      logger.log(`Color after restore for group ${groupId}: ${afterRestore.color}`);
    }
  } catch (error) {
    logger.debug(`Failed to force title render for group ${groupId}`, error);
  }
}

function pickDifferentColor(currentColor) {
  const safeCurrent = validateColor(currentColor);
  const highContrastFallbacks = {
    blue: 'orange',
    cyan: 'red',
    green: 'red',
    grey: 'red',
    orange: 'blue',
    pink: 'blue',
    purple: 'yellow',
    red: 'blue',
    yellow: 'purple',
  };

  const preferred = highContrastFallbacks[safeCurrent];
  if (preferred && preferred !== safeCurrent) {
    return preferred;
  }

  return GROUP_COLORS.find((color) => color !== safeCurrent) || null;
}

function normalizeGroupName(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name
    .replace(CONTROL_CHARS_REGEX, ' ')
    .replace(ZERO_WIDTH_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

// Validate and return a valid color
function validateColor(color) {
  const lowerColor = color?.toLowerCase();
  if (GROUP_COLORS.includes(lowerColor)) {
    return lowerColor;
  }
  return 'grey';
}

// Listen for messages from popup/settings
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'testConnection') {
    const providerName = message.config?.provider || 'unknown';
    logger.log(`🔗 Testing ${providerName.toUpperCase()} connection...`);
    testConnectionWithConfig(message.config)
      .then((result) => {
        if (result.success) {
          logger.log(`✅ ${providerName.toUpperCase()} connection test successful`);
        } else {
          logger.log(`❌ ${providerName.toUpperCase()} connection test failed:`, result.error);
        }
        sendResponse(result);
      })
      .catch((error) => {
        logger.log(`❌ ${providerName.toUpperCase()} connection test error:`, error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.action === 'settingsSaved') {
    logger.log('⚙️ Settings updated - provider:', message.provider || 'none');
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'getStatus') {
    secureStorage
      .get(['defaultProvider', 'enabled'])
      .then((settings) => {
        sendResponse({
          enabled: settings.enabled ?? false,
          provider: settings.defaultProvider ?? 'none',
          ...getExecutionState(),
        });
      })
      .catch(() => {
        sendResponse({
          enabled: false,
          provider: 'none',
          ...getExecutionState(),
        });
      });
    return true;
  }

  if (message.action === 'getFullStatus') {
    secureStorage
      .get([
        'defaultProvider',
        'enabled',
        'openaiKey',
        'claudeKey',
        'localUrl',
        'localModel',
        'groqKey',
        'geminiKey',
      ])
      .then((settings) => {
        sendResponse({
          enabled: settings.enabled ?? false,
          provider: settings.defaultProvider ?? 'none',
          isConfigured: isConfigured(settings),
          browserInfo: BROWSER_INFO,
          ...getExecutionState(),
        });
      })
      .catch((error) => {
        sendResponse({
          enabled: false,
          provider: 'none',
          isConfigured: false,
          browserInfo: BROWSER_INFO,
          ...getExecutionState(),
          error: error.message,
        });
      });
    return true;
  }

  if (message.action === 'getBrowserInfo') {
    sendResponse(BROWSER_INFO);
    return true;
  }

  if (message.action === 'getExecutionState') {
    sendResponse(getExecutionState());
    return true;
  }

  if (
    message.action === 'smartRegroupTabs' ||
    message.action === 'groupAllTabs' ||
    message.action === 'rebuildTabs'
  ) {
    groupAllTabs()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'fetchModels') {
    aiService
      .listModels(message.provider, message.apiKey)
      .then((models) => sendResponse({ success: true, models }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  // Migrate from old flat storage format if needed
  await secureStorage.migrateToEncrypted();

  // Load default provider if set, otherwise just disable
  const settings = await secureStorage.get(['defaultProvider']);
  await secureStorage.set({
    enabled: false,
    provider: settings.defaultProvider || '',
  });
  logger.log('Extension installed');
});

// Single regroup command: evaluate all tabs together and apply one grouping plan.
async function groupAllTabs() {
  if (groupAllRunInProgress) {
    return { success: false, error: 'Grouping already in progress. Please wait.' };
  }

  groupAllRunInProgress = true;
  try {
    return await regroupAllTabs();
  } finally {
    groupAllRunInProgress = false;
  }
}

async function regroupAllTabs() {
  const settings = await secureStorage.get([
    'defaultProvider',
    'openaiKey',
    'claudeKey',
    'localUrl',
    'localModel',
    'groqKey',
    'geminiKey',
  ]);

  if (!isConfigured(settings)) {
    return { success: false, error: 'AI not configured. Open settings first.' };
  }

  // Get all tabs in current window that can be regrouped.
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const regroupableTabs = tabs.filter(
    (tab) =>
      !tab.pinned &&
      !tab.url?.startsWith('chrome://') &&
      !tab.url?.startsWith('chrome-extension://') &&
      !tab.url?.startsWith('about:')
  );

  if (regroupableTabs.length === 0) {
    return { success: true, count: 0 };
  }

  const windowId = regroupableTabs[0].windowId;
  const promptGroups = await getExistingGroups(windowId);
  let planEntries = [];
  try {
    planEntries = await aiService.getBatchGroupingPlan(regroupableTabs, promptGroups);
  } catch (error) {
    logger.error('Batch grouping plan failed', error);
    return { success: false, error: 'AI request failed while building tab-group plan.' };
  }

  if (!Array.isArray(planEntries) || planEntries.length === 0) {
    return { success: false, error: 'AI returned no valid tab assignments.' };
  }

  const planByTabId = new Map(
    planEntries
      .filter((entry) => entry && Number.isInteger(entry.tabId) && entry.decision)
      .map((entry) => [entry.tabId, entry.decision])
  );

  let groupedCount = 0;
  let skippedCount = 0;

  // Execute grouping from AI plan.
  for (const tab of regroupableTabs) {
    try {
      const decision = planByTabId.get(tab.id);
      if (!decision) {
        skippedCount++;
        logger.warn(`Skipping tab ${tab.id} - AI did not return an assignment`);
        continue;
      }

      const existingGroups = await getExistingGroups(tab.windowId, { includeUntitled: true });
      await executeGrouping(tab.id, tab.windowId, decision, existingGroups);
      groupedCount++;
    } catch (error) {
      logger.error(`Failed to apply grouping plan for tab "${tab.title}"`, error);
    }
  }

  return { success: true, count: groupedCount, skipped: skippedCount, mode: 'group-all' };
}

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

// Test connection with provided configuration (used by settings page)
async function testConnectionWithConfig(config) {
  if (!config || !config.provider) {
    return { success: false, error: 'No provider specified' };
  }

  try {
    let provider;

    // Create provider instance based on config
    switch (config.provider) {
      case 'openai':
        if (!config.openaiKey) {
          return { success: false, error: 'OpenAI API key is required' };
        }
        // Temporarily use the provided config for testing
        provider = aiService.providers.openai;
        break;

      case 'claude':
        if (!config.claudeKey) {
          return { success: false, error: 'Claude API key is required' };
        }
        provider = aiService.providers.claude;
        break;

      case 'local':
        if (!config.localUrl || !config.localModel) {
          return { success: false, error: 'Local LLM URL and model are required' };
        }
        provider = aiService.providers.local;
        break;

      case 'groq':
        if (!config.groqKey) {
          return { success: false, error: 'Groq API key is required' };
        }
        provider = aiService.providers.groq;
        break;

      case 'gemini':
        if (!config.geminiKey) {
          return { success: false, error: 'Google Gemini API key is required' };
        }
        provider = aiService.providers.gemini;
        break;

      default:
        return { success: false, error: `Unknown provider: ${config.provider}` };
    }

    // Test the connection using a simple test prompt
    const response = await testProviderWithConfig(provider, config);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test a specific provider with the given configuration
async function testProviderWithConfig(provider, config) {
  // Create a mock storage that returns our test config
  const mockStorage = {
    get: (keys) => {
      return new Promise((resolve) => {
        const result = {};
        if (keys.includes) {
          // Array of keys
          keys.forEach((key) => {
            if (config[key] !== undefined) {
              result[key] = config[key];
            }
          });
        } else if (typeof keys === 'string') {
          // Single key
          if (config[keys] !== undefined) {
            result[keys] = config[keys];
          }
        } else {
          // All keys
          Object.assign(result, config);
        }
        resolve(result);
      });
    },
  };

  // Temporarily replace secureStorage's get method to use our config
  const originalSecureGet = secureStorage.get;
  secureStorage.get = mockStorage.get;

  try {
    const response = await provider.complete('Respond with just the word "OK"');
    return response;
  } finally {
    // Restore original storage
    secureStorage.get = originalSecureGet;
  }
}
