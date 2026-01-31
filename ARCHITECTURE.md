# Architecture

This document describes the architecture and security model of the AI Tab Grouper extension.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CHROME BROWSER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌──────────┐    ┌───────────────────────────┐  │
│  │  Popup  │◄──►│ Settings │◄──►│  Background Service       │  │
│  └─────────┘    └──────────┘    │  Worker (background.js)   │  │
│                                  └────────────┬──────────────┘  │
│                                               │                 │
│                                               ▼                 │
│                                  ┌────────────────────────────┐ │
│                                  │   AI Service + Providers   │ │
│                                  │   (services/*.js)          │ │
│                                  └────────────┬───────────────┘ │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────┐
                                │    External APIs          │
                                │ (OpenAI, Claude, etc.)    │
                                └───────────────────────────┘
```

## Security Architecture

### Centralized API Calls

All external HTTP requests are isolated in provider classes that run exclusively in the background service worker:

```
Settings Page (settings/model-fetcher.js)
    ↓ chrome.runtime.sendMessage({ action: 'fetchModels', provider, apiKey })
Background Worker (background.js)
    ↓ aiService.listModels(provider, apiKey)
AI Service (services/ai-service.js)
    ↓ provider.listModels(apiKey) or provider.complete(prompt)
Provider Classes (services/openai.js, claude.js, groq.js, gemini.js)
    ↓ fetch() — ALL external HTTP requests happen here
External APIs
```

**Key Points**:

- Settings page never makes direct API calls
- All providers have `complete(prompt)` and `listModels(apiKey)` methods
- Message passing isolates API keys from the DOM
- Background worker has `host_permissions` for CORS bypass

### Data Protection

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: INPUT SANITIZATION (sanitizer.js)                    │
│  • Emails → [EMAIL]                                            │
│  • Phone → [PHONE]                                             │
│  • Cards → [CARD]                                              │
│  • SSN → [SSN]                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: ENCRYPTION AT REST (crypto.js)                       │
│  • AES-256-GCM encryption                                      │
│  • PBKDF2 key derivation (100k iterations)                     │
│  • Device-bound keys                                           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: SECURE STORAGE (secure-storage.js)                   │
│  • Auto-encrypts API keys on save                              │
│  • Auto-decrypts on retrieval                                  │
│  • Migration from unencrypted to encrypted                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: TRANSPORT SECURITY                                   │
│  • HTTPS for all API calls                                     │
│  • host_permissions in manifest.json                           │
└─────────────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
background.js
├── services/ai-service.js
│   ├── services/openai.js
│   ├── services/claude.js
│   ├── services/groq.js
│   ├── services/gemini.js
│   └── services/local-llm.js
├── services/secure-storage.js
│   └── services/crypto.js
└── services/logger.js

settings/settings.js
├── settings/model-fetcher.js      # Message passing to background
├── settings/model-cache.js        # Local storage for cached models
└── services/secure-storage.js

popup/popup.js
├── services/secure-storage.js
└── services/logger.js
```

## Message Flow

### Tab Grouping

```
Chrome Tab Load
    ↓
background.js: processTab()
    ↓
ai-service.js: getGroupingDecision()
    ↓
sanitizer.js: Strip PII
    ↓
Provider: complete(prompt) — fetch() to external API
    ↓
Parse JSON response
    ↓
chrome.tabs.group() — Create/join group
```

### Model Fetching (Secure)

```
Settings Page: User clicks "Fetch"
    ↓
model-fetcher.js: chrome.runtime.sendMessage({ action: 'fetchModels' })
    ↓
background.js: Message handler
    ↓
ai-service.js: listModels(provider, apiKey)
    ↓
Provider: listModels(apiKey) — fetch() to external API
    ↓
Return models array to settings page
    ↓
model-cache.js: Save to chrome.storage.local
```

## Storage Structure

All data stored under unified `tabber` key:

### Sync Storage (`chrome.storage.sync.tabber`)

```javascript
{
  enabled: boolean,
  defaultProvider: "openai" | "claude" | "groq" | "gemini" | "local",

  // API Keys (AES-256-GCM encrypted)
  openaiKey: "encrypted:v1:...",
  claudeKey: "encrypted:v1:...",
  groqKey: "encrypted:v1:...",
  geminiKey: "encrypted:v1:...",

  // Model selections (unencrypted)
  openaiModel: "gpt-4o-mini",
  claudeModel: "claude-3-5-haiku-20241022",
  groqModel: "llama-3.1-70b-versatile",
  geminiModel: "gemini-1.5-flash",

  // Local LLM settings (unencrypted)
  localUrl: "http://localhost:11434",
  localModel: "llama3.2",
  localApiFormat: "openai" | "ollama"
}
```

### Local Storage (`chrome.storage.local.tabber`)

```javascript
{
  // Cached models from API (persists across sessions)
  fetchedModels: {
    openai: [{ id: "gpt-4o", displayName: "GPT-4o" }, ...],
    claude: [{ id: "claude-3-5-sonnet-20241022", displayName: "..." }, ...],
    groq: [...],
    gemini: [...]
  }
}
```

## File Descriptions

### Core

- `manifest.json` — Extension manifest (MV3), permissions, entry points
- `background.js` — Service worker, tab listeners, message routing

### UI

- `popup/` — Toolbar popup (status, quick actions)
- `settings/` — Options page (provider config, model selection)

### Services

| File                | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `ai-service.js`     | Unified interface for all providers        |
| `openai.js`         | OpenAI provider (`complete`, `listModels`) |
| `claude.js`         | Claude provider (`complete`, `listModels`) |
| `groq.js`           | Groq provider (`complete`, `listModels`)   |
| `gemini.js`         | Gemini provider (`complete`, `listModels`) |
| `local-llm.js`      | Local LLM provider (Ollama, LM Studio)     |
| `sanitizer.js`      | PII removal before API calls               |
| `crypto.js`         | AES-256-GCM encryption/decryption          |
| `secure-storage.js` | Encrypted `chrome.storage.sync` wrapper    |
| `local-storage.js`  | `chrome.storage.local` wrapper             |
| `logger.js`         | Centralized debug logging                  |

## Adding a New Provider

1. Create `services/newprovider.js`:

   ```javascript
   export class NewProvider {
     async complete(prompt) {
       /* ... */
     }
     async listModels(apiKey) {
       /* ... */
     }
   }
   ```

2. Register in `services/ai-service.js`:

   ```javascript
   import { NewProvider } from './newprovider.js';
   this.providers.newprovider = new NewProvider();
   ```

3. Add UI in `settings/settings.html`
4. Add validation in `settings/settings.js`
5. Update `background.js` (`isConfigured` function)
6. Add key to `secure-storage.js` `sensitiveKeys` if needed

## Debug Logging

Edit `services/logger.js`:

```javascript
const DEBUG_ENABLED = true; // Set to true for verbose logging
```

All logs prefixed with `[Tabber]` for easy filtering.
