// Claude (Anthropic) Provider

export class ClaudeProvider {
  constructor() {
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
  }

  async complete(prompt) {
    const settings = await chrome.storage.sync.get(['claudeKey', 'claudeModel']);
    
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
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }
}
