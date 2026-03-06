// Local LLM Provider (Ollama, LM Studio, LocalAI, and OpenAI-compatible local endpoints)

import { secureStorage } from './secure-storage.js';
import {
  isLoopbackRestrictionEnabled,
  validateHttpUrl,
  validateLoopbackHttpUrl,
} from './local-url-guard.js';

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

function shouldTryOtherFormat(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('unsupported') ||
    message.includes('unknown') ||
    message.includes('endpoint')
  );
}

export class LocalLLMProvider {
  async complete(prompt) {
    const settings = await secureStorage.get([
      'localUrl',
      'localModel',
      'localApiFormat',
      'localStrictLoopback',
    ]);

    if (!settings.localUrl) {
      throw new Error('Local LLM server URL not configured');
    }

    if (!settings.localModel) {
      throw new Error('Local LLM model name not configured');
    }

    const requireLoopback = isLoopbackRestrictionEnabled(settings.localStrictLoopback, true);
    const urlValidation = requireLoopback
      ? validateLoopbackHttpUrl(settings.localUrl, { label: 'Local LLM server URL' })
      : validateHttpUrl(settings.localUrl, { label: 'Local LLM server URL' });
    if (!urlValidation.valid) {
      throw new Error(urlValidation.message);
    }

    const resolved = {
      ...settings,
      localUrl: urlValidation.normalizedUrl,
    };

    const format = String(settings.localApiFormat || 'auto').toLowerCase();
    if (format === 'openai') {
      return this.completeOpenAIFormat(prompt, resolved);
    }

    if (format === 'ollama') {
      return this.completeOllamaFormat(prompt, resolved);
    }

    // Auto-detect: try OpenAI-compatible first, then fallback to Ollama native.
    try {
      return await this.completeOpenAIFormat(prompt, resolved);
    } catch (openAIError) {
      if (!shouldTryOtherFormat(openAIError)) {
        throw openAIError;
      }

      try {
        return await this.completeOllamaFormat(prompt, resolved);
      } catch (ollamaError) {
        throw new Error(`Local LLM API error: ${ollamaError.message}`);
      }
    }
  }

  async completeOpenAIFormat(prompt, settings) {
    const url = `${settings.localUrl}/v1/chat/completions`;
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

  async completeOllamaFormat(prompt, settings) {
    const url = `${settings.localUrl}/api/generate`;
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

      throw new Error(parseApiError(rawError, response.status, 'Local LLM API error'));
    }

    if (!data) {
      throw new Error('Local LLM API error: empty completion response');
    }

    return data.response || '';
  }
}
