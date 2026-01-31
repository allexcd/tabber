// Google Gemini Provider

import { secureStorage } from './secure-storage.js';

export class GeminiProvider {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async complete(prompt) {
    const settings = await secureStorage.get(['geminiKey', 'geminiModel']);

    if (!settings.geminiKey) {
      throw new Error('Google Gemini API key not configured');
    }

    const model = settings.geminiModel || 'gemini-1.5-flash';

    const response = await fetch(
      `${this.baseUrl}/${model}:generateContent?key=${settings.geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a helpful assistant that organizes browser tabs into groups. Always respond with valid JSON only.\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 100,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Google Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return content;
  }

  async listModels(apiKey) {
    const response = await fetch(`${this.baseUrl}?key=${apiKey}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    return data.models
      .filter(
        (m) =>
          m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent')
      )
      .map((m) => ({
        id: m.name.replace('models/', ''),
        displayName: m.displayName || m.name.replace('models/', ''),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
}
