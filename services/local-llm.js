// Local LLM Provider (Ollama, LM Studio, etc.)

import { secureStorage } from './secure-storage.js';

export class LocalLLMProvider {
  async complete(prompt) {
    const settings = await secureStorage.get(['localUrl', 'localModel', 'localApiFormat']);
    
    if (!settings.localUrl) {
      throw new Error('Local LLM server URL not configured');
    }

    if (!settings.localModel) {
      throw new Error('Local LLM model name not configured');
    }

    const apiFormat = settings.localApiFormat || 'openai';
    
    if (apiFormat === 'ollama') {
      return this.completeOllama(prompt, settings);
    } else {
      return this.completeOpenAIFormat(prompt, settings);
    }
  }

  // OpenAI-compatible API format (LM Studio, LocalAI, etc.)
  async completeOpenAIFormat(prompt, settings) {
    const url = settings.localUrl.replace(/\/$/, '') + '/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.localModel,
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
      throw new Error(error.error?.message || `Local LLM API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // Ollama native API format
  async completeOllama(prompt, settings) {
    const url = settings.localUrl.replace(/\/$/, '') + '/api/generate';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.localModel,
        prompt: `You are a helpful assistant that organizes browser tabs into groups. Always respond with valid JSON only.\n\n${prompt}`,
        stream: false,
        options: {
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '';
  }
}
