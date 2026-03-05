// Rules Service - Custom grouping rules matching logic

import { secureStorage } from './secure-storage.js';

export class RulesService {
  async getRules() {
    const data = await secureStorage.get(['customRules']);
    const rules = data.customRules || [];
    return rules.filter((rule) => rule && rule.enabled && rule.urlPattern);
  }

  matchTab(rules, url) {
    if (!url || !Array.isArray(rules)) {
      return null;
    }

    const lowerUrl = url.toLowerCase();

    for (const rule of rules) {
      if (!rule.enabled || !rule.urlPattern) {
        continue;
      }

      if (rule.urlPattern.includes('*')) {
        const regex = this.patternToRegex(rule.urlPattern);
        if (regex.test(lowerUrl)) {
          return rule;
        }
      } else {
        if (lowerUrl.includes(rule.urlPattern.toLowerCase())) {
          return rule;
        }
      }
    }

    return null;
  }

  patternToRegex(pattern) {
    let normalized = pattern.toLowerCase();

    // Leading *. means "optional subdomain" — *.github.com should match
    // both github.com and api.github.com. Strip it and prepend an optional
    // subdomain group instead of a literal leading dot.
    let prefix = '';
    if (normalized.startsWith('*.')) {
      prefix = '(?:[^/]*\\.)?';
      normalized = normalized.slice(2);
    }

    const escaped = normalized.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');

    return new RegExp(prefix + escaped);
  }

  buildRuleOverrides(rules, tabs) {
    const overrides = new Map();

    for (const tab of tabs) {
      const url = tab.url || tab.pendingUrl || '';
      const match = this.matchTab(rules, url);
      if (match) {
        const tabId = tab.id || tab.tabId;
        overrides.set(tabId, {
          groupName: match.groupName,
          color: match.color,
        });
      }
    }

    return overrides;
  }
}
