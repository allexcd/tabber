// AI Tab Grouper - Background Service Worker

import { AIService } from './services/ai-service.js';
import { secureStorage } from './services/secure-storage.js';

const aiService = new AIService();

// Track tabs that are being processed to avoid duplicate processing
const processingTabs = new Set();

// Available colors for tab groups
const GROUP_COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey'];

// Listen for tab updates (when title changes/loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when the tab has finished loading and has a title
  if (changeInfo.status === 'complete' && tab.title && !tab.pinned) {
    // Skip if already in a group or being processed
    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE || processingTabs.has(tabId)) {
      return;
    }

    // Skip browser internal pages
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
      return;
    }

    await processTab(tabId, tab);
  }
});

// Process a tab and assign it to a group
// force: if true, process even if extension is disabled (used by Group All Tabs)
async function processTab(tabId, tab, force = false) {
  processingTabs.add(tabId);

  try {
    // Check if AI is configured
    const settings = await secureStorage.get(['provider', 'openaiKey', 'claudeKey', 'localUrl', 'localModel', 'enabled']);
    
    if (!settings.enabled && !force) {
      processingTabs.delete(tabId);
      return;
    }

    if (!isConfigured(settings)) {
      console.log('AI Tab Grouper: No AI provider configured');
      processingTabs.delete(tabId);
      return;
    }

    // Get existing groups in this window
    const existingGroups = await getExistingGroups(tab.windowId);

    // Ask AI for grouping decision
    const decision = await aiService.getGroupingDecision(tab.title, tab.url, existingGroups);

    if (!decision) {
      console.log('AI Tab Grouper: No decision from AI');
      processingTabs.delete(tabId);
      return;
    }

    // Execute the grouping
    await executeGrouping(tabId, tab.windowId, decision, existingGroups);

  } catch (error) {
    console.error('AI Tab Grouper: Error processing tab', error);
  } finally {
    processingTabs.delete(tabId);
  }
}

// Check if AI provider is properly configured
function isConfigured(settings) {
  const provider = settings.provider;
  
  if (provider === 'openai' && settings.openaiKey) return true;
  if (provider === 'claude' && settings.claudeKey) return true;
  if (provider === 'local' && settings.localUrl && settings.localModel) return true;
  
  return false;
}

// Get existing tab groups in a window
async function getExistingGroups(windowId) {
  const groups = await chrome.tabGroups.query({ windowId });
  return groups.map(g => ({
    id: g.id,
    title: g.title || 'Unnamed',
    color: g.color
  }));
}

// Execute the grouping decision
async function executeGrouping(tabId, windowId, decision, existingGroups) {
  try {
    // Check if we should use an existing group
    const existingGroup = existingGroups.find(
      g => g.title.toLowerCase() === decision.groupName.toLowerCase()
    );

    if (existingGroup) {
      // Add to existing group
      await chrome.tabs.group({ tabIds: tabId, groupId: existingGroup.id });
      console.log(`AI Tab Grouper: Added tab to existing group "${existingGroup.title}"`);
    } else {
      // Create new group
      const groupId = await chrome.tabs.group({ tabIds: tabId, createProperties: { windowId } });
      
      // Set group properties
      const color = validateColor(decision.color);
      await chrome.tabGroups.update(groupId, {
        title: decision.groupName,
        color: color
      });
      
      console.log(`AI Tab Grouper: Created new group "${decision.groupName}" with color ${color}`);
    }
  } catch (error) {
    console.error('AI Tab Grouper: Error executing grouping', error);
  }
}

// Validate and return a valid color
function validateColor(color) {
  const lowerColor = color?.toLowerCase();
  if (GROUP_COLORS.includes(lowerColor)) {
    return lowerColor;
  }
  // Return a random color if invalid
  return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
}

// Listen for messages from popup/settings
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'testConnection') {
    console.log('🔗 Testing AI provider connection...');
    aiService.testConnection()
      .then(result => {
        if (result.success) {
          console.log('✅ AI connection test successful');
        } else {
          console.log('❌ AI connection test failed:', result.error);
        }
        sendResponse(result);
      })
      .catch(error => {
        console.log('❌ AI connection test error:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'settingsSaved') {
    console.log('⚙️ Settings updated - provider:', message.provider || 'none');
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'reprocessTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        // Remove from current group first
        if (tabs[0].groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          await chrome.tabs.ungroup(tabs[0].id);
        }
        await processTab(tabs[0].id, tabs[0]);
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (message.action === 'getStatus') {
    chrome.storage.sync.get(['provider', 'enabled'], (settings) => {
      sendResponse({
        enabled: settings.enabled ?? false,
        provider: settings.provider ?? 'none'
      });
    });
    return true;
  }

  if (message.action === 'getFullStatus') {
    secureStorage.get(['provider', 'enabled', 'openaiKey', 'claudeKey', 'localUrl', 'localModel'])
      .then(settings => {
        sendResponse({
          enabled: settings.enabled ?? false,
          provider: settings.provider ?? 'none',
          isConfigured: isConfigured(settings)
        });
      })
      .catch(error => {
        sendResponse({
          enabled: false,
          provider: 'none',
          isConfigured: false,
          error: error.message
        });
      });
    return true;
  }

  if (message.action === 'groupAllTabs') {
    groupAllTabs()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  // Load default provider if set, otherwise just disable
  const settings = await chrome.storage.sync.get(['defaultProvider']);
  await chrome.storage.sync.set({ 
    enabled: false,
    provider: settings.defaultProvider || ''
  });
  console.log('AI Tab Grouper: Extension installed');
});

// Group all open tabs in the current window
async function groupAllTabs() {
  const settings = await secureStorage.get(['provider', 'openaiKey', 'claudeKey', 'localUrl', 'localModel']);
  
  if (!isConfigured(settings)) {
    return { success: false, error: 'AI not configured. Open settings first.' };
  }

  // Get all tabs in current window that aren't pinned or already grouped
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const ungroupedTabs = tabs.filter(tab => 
    !tab.pinned && 
    tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE &&
    !tab.url?.startsWith('chrome://') &&
    !tab.url?.startsWith('chrome-extension://') &&
    !tab.url?.startsWith('about:')
  );

  if (ungroupedTabs.length === 0) {
    return { success: true, count: 0 };
  }

  let groupedCount = 0;

  // Process tabs sequentially to avoid race conditions
  for (const tab of ungroupedTabs) {
    try {
      // Skip if tab doesn't have a title yet
      if (!tab.title || tab.title === 'New Tab') continue;
      
      // Pass force=true to bypass the enabled check
      await processTab(tab.id, tab, true);
      groupedCount++;
      
      // Small delay to avoid overwhelming the AI API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`AI Tab Grouper: Failed to group tab "${tab.title}"`, error);
    }
  }

  return { success: true, count: groupedCount };
}
