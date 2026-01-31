// Claude (Anthropic) Provider

import { secureStorage } from './secure-storage.js';

export class ClaudeProvider {
  constructor() {
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
  }

  async complete(prompt) {
    const settings = await secureStorage.get(['claudeKey', 'claudeModel']);

    if (!settings.claudeKey) {
      throw new Error('Claude API key not configured');
    }

    const model = settings.claudeModel || 'claude-3-haiku-20240307';

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  async listModels(apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    return data.data
      .map((m) => ({
        id: m.id,
        displayName: m.id
          .replace('claude-', 'Claude ')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
      }))
      .sort((a, b) => {
        const aFamily = a.id.split('-')[1];
        const bFamily = b.id.split('-')[1];
        if (aFamily !== bFamily) {
          return bFamily.localeCompare(aFamily);
        }
        return b.id.localeCompare(a.id);
      });
  }
}
