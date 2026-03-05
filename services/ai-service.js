// AI Service - Unified interface for all AI providers

import { OpenAIProvider } from './openai.js';
import { ClaudeProvider } from './claude.js';
import { LocalLLMProvider } from './local-llm.js';
import { GroqProvider } from './groq.js';
import { GeminiProvider } from './gemini.js';
import { sanitizer } from './sanitizer.js';
import { secureStorage } from './secure-storage.js';
import { logger } from './logger.js';

const VALID_COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey'];
const CONTROL_CHARS_REGEX = /\p{Cc}/gu;
const ZERO_WIDTH_REGEX = /[\u200b-\u200d\ufeff]/g;

const ASSIGNMENTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['assignments'],
  properties: {
    assignments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tabId', 'groupName', 'color'],
        properties: {
          tabId: { type: 'integer', minimum: 1 },
          groupName: { type: 'string', minLength: 1, maxLength: 80 },
          color: { type: 'string', enum: VALID_COLORS },
        },
      },
    },
  },
};

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

function normalizeColor(color) {
  const safe = String(color || '')
    .toLowerCase()
    .trim();
  return VALID_COLORS.includes(safe) ? safe : 'grey';
}

function normalizeTabId(value) {
  const tabId = Number(value);
  if (!Number.isInteger(tabId) || tabId <= 0) {
    return null;
  }
  return tabId;
}

function normalizeAssignment(entry, fallbackTabId = null) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const tabId =
    normalizeTabId(entry.tabId) ||
    normalizeTabId(entry.tabID) ||
    normalizeTabId(entry.id) ||
    normalizeTabId(fallbackTabId);
  if (!tabId) {
    return null;
  }

  const groupName = normalizeGroupName(
    entry.groupName || entry.GroupName || entry.group_name || entry.name || entry.title
  );
  if (!groupName) {
    return null;
  }

  return {
    tabId,
    groupName,
    color: normalizeColor(entry.color),
  };
}

function normalizeExistingGroups(existingGroups) {
  const seen = new Set();
  const normalized = [];

  for (const group of Array.isArray(existingGroups) ? existingGroups : []) {
    const groupName = normalizeGroupName(group?.title || group?.groupName);
    if (!groupName) {
      continue;
    }

    const key = groupName.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      groupName,
      color: normalizeColor(group?.color),
    });
  }

  return normalized;
}

function buildAssignmentsPrompt(tabs, existingGroups, ruleOverrides) {
  // Annotate tabs that have rule overrides
  const annotatedTabs = tabs.map((tab) => {
    const override = ruleOverrides?.get(tab.tabId);
    if (override) {
      return { ...tab, ruleAssignment: { groupName: override.groupName, color: override.color } };
    }
    return tab;
  });

  const payload = {
    tabs: annotatedTabs,
    existingGroups,
  };

  const hasRules = ruleOverrides && ruleOverrides.size > 0;

  return `You are a tab-group assignment engine.

TASK
Given:
1) a list of tabs
2) a list of existing groups

Assign each tab to a meaningful group.
${
  hasRules
    ? `
USER RULES
Some tabs have a "ruleAssignment" field. You MUST assign these tabs to exactly
the group specified in their ruleAssignment (same groupName and color).
Do not override or rename these assignments.
`
    : ''
}
GROUPING STRATEGY
1) Group by meaning, not by website/brand/page name.
2) Reuse existing groups whenever they semantically fit.
3) Prefer broad semantic buckets (topic/activity intent), not narrow labels.
4) Keep the number of groups small and reusable; merge similar tabs together.
5) Do NOT create one group per website (avoid groups like "Netflix", "YouTube", "Prime", "OpenAI").
6) If an existing group is close in meaning, you MUST reuse it.
7) Only separate tabs into different groups when their meanings are clearly different.
8) New group names must be short, generic, and reusable.
9) Group names should not be tab titles, page headlines, hostnames, or brand names unless no generic meaning fits.

EXAMPLES
- Netflix + Prime Video + YouTube video tabs -> one group (e.g., "Entertainment")
- GitHub + docs + API references -> one group (e.g., "Development")
- CNN + BBC + Reuters tabs -> one group (e.g., "News")
- Amazon + eBay + store product pages -> one group (e.g., "Shopping")

INPUT (JSON)
${JSON.stringify(payload)}

OUTPUT REQUIREMENT
Return exactly one JSON object that matches this JSON Schema:

${JSON.stringify(ASSIGNMENTS_SCHEMA)}

HARD RULES
1) Return only JSON. No markdown, no code fences, no comments, no extra text.
2) assignments length must equal tabs length.
3) Every input tabId must appear exactly once in assignments.
4) If reusing a group, groupName must exactly match one of existingGroups.groupName.
5) If creating a new group, groupName must be generic (not site/brand specific).
6) Minimize new groups: create a new group only when no existing group semantically fits.`;
}

function extractJsonCandidates(text) {
  const source = String(text || '');
  if (!source.trim()) {
    return [];
  }

  const candidates = [];
  const trimmed = source.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    candidates.push(trimmed);
  }

  const fencedMatches = source.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  for (const match of fencedMatches) {
    const candidate = match?.[1]?.trim();
    if (candidate) {
      candidates.push(candidate);
    }
  }

  let depth = 0;
  let start = -1;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push(source.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return [...new Set(candidates.map((candidate) => candidate.trim()).filter(Boolean))];
}

function parseJsonCandidates(text) {
  const parsed = [];

  for (const candidate of extractJsonCandidates(text)) {
    try {
      parsed.push(JSON.parse(candidate));
    } catch {
      // Ignore malformed candidate and keep searching.
    }
  }

  return parsed;
}

function buildAssignmentMap(parsedObject, expectedTabIds) {
  const expectedSet = new Set(expectedTabIds);
  const allowFallbackTabId = expectedTabIds.length === 1 ? expectedTabIds[0] : null;
  const map = new Map();

  const add = (entry, fallbackTabId = null) => {
    const normalized = normalizeAssignment(entry, fallbackTabId);
    if (!normalized) {
      return;
    }
    if (!expectedSet.has(normalized.tabId) || map.has(normalized.tabId)) {
      return;
    }
    map.set(normalized.tabId, {
      groupName: normalized.groupName,
      color: normalized.color,
    });
  };

  if (Array.isArray(parsedObject)) {
    parsedObject.forEach((entry) => add(entry, allowFallbackTabId));
    return map;
  }

  if (!parsedObject || typeof parsedObject !== 'object') {
    return map;
  }

  if (Array.isArray(parsedObject.assignments)) {
    parsedObject.assignments.forEach((entry) => add(entry, allowFallbackTabId));
    return map;
  }

  // Backward compatibility for single-tab responses with {groupName,color}.
  add(parsedObject, allowFallbackTabId);

  return map;
}

function parseAssignments(response, expectedTabIds) {
  const parsedObjects = parseJsonCandidates(response);
  let bestMap = new Map();

  for (const parsed of parsedObjects) {
    const candidate = buildAssignmentMap(parsed, expectedTabIds);
    if (candidate.size > bestMap.size) {
      bestMap = candidate;
    }
  }

  return bestMap;
}

export class AIService {
  constructor() {
    this.providers = {
      claude: new ClaudeProvider(),
      gemini: new GeminiProvider(),
      groq: new GroqProvider(),
      openai: new OpenAIProvider(),
      local: new LocalLLMProvider(),
    };

    this.sanitizer = sanitizer;
  }

  async getProvider() {
    const settings = await secureStorage.get(['defaultProvider']);
    return this.providers[settings.defaultProvider] || null;
  }

  async completeWithSchema(provider, prompt, expectedTabIds, logLabel) {
    const response = await provider.complete(prompt);
    logger.log(`${logLabel}:`, response);
    return parseAssignments(response, expectedTabIds);
  }

  async getGroupingDecision(tabId, title, url, existingGroups = [], ruleOverride = null) {
    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('No AI provider configured');
    }

    const normalizedTabId = normalizeTabId(tabId);
    if (!normalizedTabId) {
      return null;
    }

    const sanitized = this.sanitizer.sanitizeTabData(title, url);
    const tabsPayload = [
      {
        tabId: normalizedTabId,
        title: sanitized.title || 'Untitled tab',
        url: sanitized.url || '',
      },
    ];
    const groupsPayload = normalizeExistingGroups(existingGroups);
    const ruleOverrides = new Map();
    if (ruleOverride) {
      ruleOverrides.set(normalizedTabId, ruleOverride);
    }
    const prompt = buildAssignmentsPrompt(tabsPayload, groupsPayload, ruleOverrides);

    const assignments = await this.completeWithSchema(
      provider,
      prompt,
      [normalizedTabId],
      'AI single-tab response'
    );

    const decision = assignments.get(normalizedTabId) || null;
    logger.log('Parsed decision:', decision);
    return decision;
  }

  async getBatchGroupingPlan(tabs, existingGroups = [], ruleOverrides = null) {
    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('No AI provider configured');
    }

    const preparedTabs = (Array.isArray(tabs) ? tabs : [])
      .filter((tab) => tab && Number.isInteger(tab.id))
      .map((tab) => {
        const sanitized = this.sanitizer.sanitizeTabData(tab.title || '', tab.url || '');
        return {
          tabId: tab.id,
          title: sanitized.title || 'Untitled tab',
          url: sanitized.url || '',
        };
      });

    if (preparedTabs.length === 0) {
      return [];
    }

    const expectedTabIds = preparedTabs.map((tab) => tab.tabId);
    const groupsPayload = normalizeExistingGroups(existingGroups);
    const prompt = buildAssignmentsPrompt(preparedTabs, groupsPayload, ruleOverrides);

    const assignments = await this.completeWithSchema(
      provider,
      prompt,
      expectedTabIds,
      'AI batch response'
    );

    const plans = preparedTabs
      .filter((tab) => assignments.has(tab.tabId))
      .map((tab) => ({
        tabId: tab.tabId,
        decision: assignments.get(tab.tabId),
      }));

    logger.log(`Parsed batch assignments: ${plans.length}/${preparedTabs.length}`);
    return plans;
  }

  async listModels(providerName, apiKey) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    if (!provider.listModels) {
      throw new Error(`Provider ${providerName} does not support model listing`);
    }

    return provider.listModels(apiKey);
  }

  async testConnection() {
    const provider = await this.getProvider();
    if (!provider) {
      return { success: false, error: 'No provider configured' };
    }

    try {
      const response = await provider.complete('Respond with just the word "OK"');
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
