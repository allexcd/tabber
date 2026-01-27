// AI Service - Unified interface for all AI providers

import { OpenAIProvider } from './openai.js';
import { ClaudeProvider } from './claude.js';
import { LocalLLMProvider } from './local-llm.js';

export class AIService {
  constructor() {
    this.providers = {
      openai: new OpenAIProvider(),
      claude: new ClaudeProvider(),
      local: new LocalLLMProvider()
    };
  }

  // Get the currently configured provider
  async getProvider() {
    const settings = await chrome.storage.sync.get(['provider']);
    return this.providers[settings.provider] || null;
  }

  // Get grouping decision from AI
  async getGroupingDecision(title, url, existingGroups) {
    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('No AI provider configured');
    }

    const prompt = this.buildPrompt(title, url, existingGroups);
    const response = await provider.complete(prompt);
    
    return this.parseResponse(response);
  }

  // Build the prompt for the AI
  buildPrompt(title, url, existingGroups) {
    const groupList = existingGroups.length > 0
      ? existingGroups.map(g => `- "${g.title}" (${g.color})`).join('\n')
      : 'No existing groups';

    return `You are a tab organization assistant. Analyze the following browser tab and decide how to group it.

TAB INFORMATION:
- Title: ${title}
- URL: ${url || 'Not available'}

EXISTING GROUPS:
${groupList}

AVAILABLE COLORS: blue, red, yellow, green, pink, purple, cyan, orange, grey

INSTRUCTIONS:
1. If the tab fits an existing group, use that exact group name
2. If no existing group fits, create a new descriptive group name (2-3 words max)
3. Choose a color that semantically matches the content:
   - blue: Development, coding, technical
   - green: Finance, money, productivity
   - red: Entertainment, videos, gaming
   - yellow: Social media, communication
   - purple: Education, learning, research
   - pink: Shopping, lifestyle
   - cyan: News, articles, reading
   - orange: Work, business, professional
   - grey: Utilities, settings, misc

Respond ONLY with valid JSON in this exact format:
{"groupName": "Group Name", "color": "colorname"}

Do not include any explanation, just the JSON.`;
  }

  // Parse the AI response
  parseResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          groupName: parsed.groupName || 'Misc',
          color: parsed.color || 'grey'
        };
      }
    } catch (error) {
      console.error('AI Tab Grouper: Failed to parse AI response', error);
    }
    
    // Default fallback
    return { groupName: 'Misc', color: 'grey' };
  }

  // Test the connection to the current provider
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
