// OpenAI Provider

import { secureStorage } from './secure-storage.js';

export class OpenAIProvider {
  constructor() {
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  async complete(prompt) {
    const settings = await secureStorage.get(['openaiKey', 'openaiModel']);
    
    if (!settings.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = settings.openaiModel || 'gpt-4o-mini';

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.openaiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that organizes browser tabs into groups. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
