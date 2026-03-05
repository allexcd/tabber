// Local LLM Provider (Ollama, LM Studio, etc.)

import { secureStorage } from './secure-storage.js';

const JSON_ONLY_SYSTEM_PROMPT =
  'You organize browser tabs into groups. Return exactly one JSON object. No markdown. No prose.';

function parseApiError(rawText, statusCode, fallbackPrefix) {
  try {
    const parsed = JSON.parse(rawText);
    const message =
      parsed?.error?.message || parsed?.error || parsed?.message || parsed?.detail || null;
    if (message) {
      return String(message);
    }
  } catch {
    // Ignore and fallback to raw text.
  }

  const cleaned = String(rawText || '').trim();
  if (cleaned) {
    return cleaned;
  }

  return `${fallbackPrefix}: ${statusCode}`;
}

function isUnsupportedJsonModeResponse(statusCode, rawText) {
  if (statusCode < 400 || statusCode >= 500) {
    return false;
  }

  const message = String(rawText || '').toLowerCase();
  return (
    message.includes('response_format') ||
    message.includes('json_object') ||
    message.includes('json mode') ||
    message.includes('"format"')
  );
}

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
    const basePayload = {
      model: settings.localModel,
      messages: [
        {
          role: 'system',
          content: JSON_ONLY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
    };

    const payloads = [{ ...basePayload, response_format: { type: 'json_object' } }, basePayload];
    let data = null;

    for (let index = 0; index < payloads.length; index += 1) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloads[index]),
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      const rawError = await response.text().catch(() => '');
      const canRetryWithoutJsonMode =
        index === 0 && isUnsupportedJsonModeResponse(response.status, rawError);
      if (canRetryWithoutJsonMode) {
        continue;
      }

      throw new Error(parseApiError(rawError, response.status, 'Local LLM API error'));
    }

    if (!data) {
      throw new Error('Local LLM API error: empty completion response');
    }

    return data.choices[0]?.message?.content || '';
  }

  // Ollama native API format
  async completeOllama(prompt, settings) {
    const url = settings.localUrl.replace(/\/$/, '') + '/api/generate';
    const basePayload = {
      model: settings.localModel,
      prompt: `${JSON_ONLY_SYSTEM_PROMPT}\n\n${prompt}`,
      stream: false,
      options: {
        temperature: 0.2,
      },
    };
    const payloads = [{ ...basePayload, format: 'json' }, basePayload];
    let data = null;

    for (let index = 0; index < payloads.length; index += 1) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloads[index]),
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      const rawError = await response.text().catch(() => '');
      const canRetryWithoutJsonMode =
        index === 0 && isUnsupportedJsonModeResponse(response.status, rawError);
      if (canRetryWithoutJsonMode) {
        continue;
      }

      throw new Error(parseApiError(rawError, response.status, 'Ollama API error'));
    }

    if (!data) {
      throw new Error('Ollama API error: empty completion response');
    }

    return data.response || '';
  }
}
