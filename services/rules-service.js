// Rules Service - Manages custom tab grouping rules
// Rules are checked before the AI to provide deterministic, cost-free grouping

import { secureStorage } from './secure-storage.js';
import { logger } from './logger.js';

const RULES_KEY = 'customRules';

export const rulesService = {
  // Get all saved rules
  async getRules() {
    const settings = await secureStorage.get([RULES_KEY]);
    return settings[RULES_KEY] || [];
  },

  // Save the full rules array
  async saveRules(rules) {
    await secureStorage.set({ [RULES_KEY]: rules });
    logger.log(`Rules saved: ${rules.length} rule(s)`);
  },

  // Add a new rule
  async addRule(rule) {
    const rules = await this.getRules();
    const newRule = {
      id: Date.now().toString(),
      ...rule,
    };
    rules.push(newRule);
    await this.saveRules(rules);
    return newRule;
  },

  // Delete a rule by id
  async deleteRule(id) {
    const rules = await this.getRules();
    const filtered = rules.filter((r) => r.id !== id);
    await this.saveRules(filtered);
  },

  // Check if a tab matches any rule; returns the matching rule or null
  async matchTab(title, url) {
    const rules = await this.getRules();
    const lowerUrl = (url || '').toLowerCase();
    const lowerTitle = (title || '').toLowerCase();

    for (const rule of rules) {
      const value = rule.matchValue.toLowerCase();

      let matched = false;
      switch (rule.matchType) {
        case 'domain': {
          try {
            const hostname = new URL(url || '').hostname.toLowerCase();
            matched = hostname === value || hostname.endsWith(`.${value}`);
          } catch {
            matched = false;
          }
          break;
        }
        case 'urlContains':
          matched = lowerUrl.includes(value);
          break;
        case 'titleContains':
          matched = lowerTitle.includes(value);
          break;
        default:
          matched = false;
      }

      if (matched) {
        logger.log(`Rule matched: "${rule.groupName}" for "${title}"`);
        return rule;
      }
    }

    return null;
  },
};
