# Architecture

This document describes the architecture and module relationships of the AI Tab Grouper extension.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CHROME BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │   Popup     │    │  Settings   │    │      Background Service         │ │
│  │  (popup/)   │◄──►│ (settings/) │◄──►│        Worker                   │ │
│  └──────┬──────┘    └──────┬──────┘    │     (background.js)             │ │
│         │                  │           └───────────────┬─────────────────┘ │
│         │                  │                           │                   │
│         └──────────────────┼───────────────────────────┘                   │
│                            │                                               │
│                            ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SERVICES LAYER                                │   │
│  │                         (services/)                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       EXTERNAL APIs            │
                    │  (OpenAI, Claude, Groq, etc.) │
                    └───────────────────────────────┘
```

## Module Dependency Graph

```
                                ┌──────────────┐
                                │  manifest.json│
                                └───────┬──────┘
                                        │ loads
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌───────────────┐   ┌───────────┐   ┌─────────────────┐
            │ background.js │   │ popup/    │   │ settings/       │
            │               │   │ popup.js  │   │ settings.js     │
            └───────┬───────┘   └─────┬─────┘   └────────┬────────┘
                    │                 │                  │
                    │                 │                  ├──► model-cache.js
                    │                 │                  ├──► model-fetcher.js
                    │                 │                  └──► changelog.js
                    │                 │
                    └────────┬────────┴──────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │   ai-service   │
                    └────────┬───────┘
                             │ uses
        ┌────────────┬───────┼───────┬────────────┐
        ▼            ▼       ▼       ▼            ▼
   ┌─────────┐ ┌─────────┐ ┌────┐ ┌──────┐ ┌───────────┐
   │ openai  │ │ claude  │ │groq│ │gemini│ │ local-llm │
   └─────────┘ └─────────┘ └────┘ └──────┘ └───────────┘
        │            │       │       │            │
        └────────────┴───────┴───────┴────────────┘
                             │
                             ▼
                      ┌───────────┐
                      │ sanitizer │  (removes PII before API calls)
                      └───────────┘
```

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      secure-storage.js                               │   │
│   │                  (chrome.storage.sync)                               │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                     crypto.js                                │   │   │
│   │   │              (AES-256-GCM encryption)                        │   │   │
│   │   │                                                              │   │   │
│   │   │  • Encrypts: API keys (openaiKey, claudeKey, groqKey,       │   │   │
│   │   │              geminiKey)                                      │   │   │
│   │   │  • PBKDF2 key derivation (100k iterations)                  │   │   │
│   │   │  • Device-bound encryption keys                              │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   │   Stores (under 'tabber' key):                                      │   │
│   │   • enabled, defaultProvider                                         │   │
│   │   • *Key (encrypted), *Model                                         │   │
│   │   • localUrl, localApiFormat                                         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      local-storage.js                                │   │
│   │                  (chrome.storage.local)                              │   │
│   │                                                                      │   │
│   │   Stores (under 'tabber' key):                                      │   │
│   │   • fetchedModels (cached API model lists)                          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        logger.js                                     │   │
│   │                  (Centralized Debug Logging)                         │   │
│   │                                                                      │   │
│   │   • DEBUG_ENABLED flag to toggle verbose logging                    │   │
│   │   • All logs prefixed with [Tabber] for filtering                   │   │
│   │   • warn() and error() always shown                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Message Flow

### Tab Grouping Flow

```
┌────────────────┐     ┌─────────────────┐     ┌────────────────┐
│  Chrome Tab    │────►│  background.js  │────►│  ai-service.js │
│  onUpdated     │     │  processTab()   │     │  getGrouping() │
└────────────────┘     └─────────────────┘     └───────┬────────┘
                                                       │
                              ┌─────────────────────────┘
                              ▼
                       ┌─────────────┐
                       │  sanitizer  │  Strip PII from tab data
                       └──────┬──────┘
                              │
                              ▼
                       ┌─────────────┐
                       │  Provider   │  (openai/claude/groq/gemini/local)
                       │   API Call  │
                       └──────┬──────┘
                              │
                              ▼
                       ┌─────────────┐
                       │   Parse     │  Extract groupName & color
                       │  Response   │
                       └──────┬──────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ chrome.tabs     │
                       │ .group()        │  Create/join tab group
                       └─────────────────┘
```

### Settings Save Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│ User clicks     │────►│  settings.js    │────►│  secure-storage.js  │
│ "Make Default"  │     │ makeProvider    │     │  .set()             │
└─────────────────┘     │ Default()       │     └──────────┬──────────┘
                        └─────────────────┘                │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │   crypto.js     │
                                                  │   .encrypt()    │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ chrome.storage  │
                                                  │ .sync.set()     │
                                                  └────────┬────────┘
                                                           │
                              ┌─────────────────────────────┘
                              ▼
                       ┌─────────────────┐
                       │ chrome.storage  │  Storage change event
                       │ .onChanged      │
                       └────────┬────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       ┌───────────┐     ┌───────────┐     ┌─────────────┐
       │ popup.js  │     │ settings  │     │ background  │
       │ loadStatus│     │ .js       │     │ .js         │
       └───────────┘     └───────────┘     └─────────────┘
```

### Popup ↔ Background Communication

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           MESSAGE TYPES                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  popup.js ──────────────────────────────────► background.js              │
│                                                                          │
│  { action: 'getFullStatus' }                                             │
│      ◄── { enabled, provider, isConfigured }                             │
│                                                                          │
│  { action: 'reprocessTab' }                                              │
│      ◄── { success: true }                                               │
│                                                                          │
│  { action: 'groupAllTabs' }                                              │
│      ◄── { success: true, count: N }                                     │
│                                                                          │
│  settings.js ───────────────────────────────► background.js              │
│                                                                          │
│  { action: 'testConnection', config: {...} }                             │
│      ◄── { success: true/false, error?: string }                         │
│                                                                          │
│  { action: 'settingsSaved', provider: 'claude' }                         │
│      ◄── { success: true }                                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## File Descriptions

### Core Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome Extension manifest (MV3), permissions, entry points |
| `background.js` | Service worker: tab listeners, grouping logic, message handling |

### Popup (`popup/`)

| File | Purpose |
|------|---------|
| `popup.html` | Popup UI structure |
| `popup.css` | Popup styling |
| `popup.js` | Status display, button handlers, storage sync listener |

### Settings (`settings/`)

| File | Purpose |
|------|---------|
| `settings.html` | Settings page markup with provider cards |
| `settings.css` | Settings page styling, provider cards, modals |
| `settings.js` | Main orchestration: load/save settings, event handlers |
| `model-cache.js` | Load/save cached models from local storage |
| `model-fetcher.js` | Fetch models from provider APIs dynamically |
| `changelog.js` | Display changelog modal from changelog.json |
| `settings-fallback.js` | CSP-compliant fallback validation script |

### Services (`services/`)

| File | Purpose |
|------|---------|
| `ai-service.js` | Unified interface for all AI providers |
| `openai.js` | OpenAI API integration (GPT models) |
| `claude.js` | Anthropic Claude API integration |
| `groq.js` | Groq API integration (free tier) |
| `gemini.js` | Google Gemini API integration (free tier) |
| `local-llm.js` | Local LLM support (Ollama, LM Studio) |
| `sanitizer.js` | Remove PII from tab data before AI processing |
| `crypto.js` | AES-256-GCM encryption/decryption |
| `secure-storage.js` | Encrypted chrome.storage.sync wrapper |
| `local-storage.js` | chrome.storage.local wrapper for cached data |
| `logger.js` | Centralized debug logging with toggle |

## Import Dependencies

```
background.js
├── services/ai-service.js
├── services/secure-storage.js
└── services/logger.js

popup/popup.js
├── services/secure-storage.js
└── services/logger.js

settings/settings.js
├── services/secure-storage.js
├── services/logger.js
├── settings/model-cache.js
├── settings/model-fetcher.js
└── settings/changelog.js

settings/model-cache.js
├── services/local-storage.js
└── services/logger.js

settings/model-fetcher.js
├── services/secure-storage.js
└── services/logger.js

services/ai-service.js
├── services/openai.js
├── services/claude.js
├── services/groq.js
├── services/gemini.js
├── services/local-llm.js
├── services/sanitizer.js
├── services/secure-storage.js
└── services/logger.js

services/secure-storage.js
├── services/crypto.js
└── services/logger.js

services/local-storage.js
└── services/logger.js

services/crypto.js
└── services/logger.js
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Layer 1: INPUT SANITIZATION                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  sanitizer.js - Removes PII before sending to AI                      │  │
│  │  • Emails → [EMAIL]                                                   │  │
│  │  • Phone numbers → [PHONE]                                            │  │
│  │  • Credit cards → [CARD]                                              │  │
│  │  • SSN → [SSN]                                                        │  │
│  │  • IP addresses → [IP]                                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 2: ENCRYPTION AT REST                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  crypto.js - AES-256-GCM encryption                                   │  │
│  │  • PBKDF2 key derivation (100,000 iterations)                         │  │
│  │  • Device-bound encryption keys                                       │  │
│  │  • Random IV per encryption                                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: SECURE STORAGE                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  secure-storage.js - Transparent encryption wrapper                   │  │
│  │  • Auto-encrypts sensitive keys (API keys)                            │  │
│  │  • Auto-decrypts on retrieval                                         │  │
│  │  • Migration from unencrypted to encrypted                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 4: TRANSPORT SECURITY                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  All API calls use HTTPS                                              │  │
│  │  • OpenAI: https://api.openai.com                                     │  │
│  │  • Claude: https://api.anthropic.com                                  │  │
│  │  • Groq: https://api.groq.com                                         │  │
│  │  • Gemini: https://generativelanguage.googleapis.com                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## State Management

The extension uses Chrome's storage APIs for state management with automatic synchronization:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STATE SYNCHRONIZATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                     chrome.storage.onChanged                                │
│                              │                                              │
│           ┌──────────────────┼──────────────────┐                          │
│           ▼                  ▼                  ▼                          │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│    │   popup.js  │    │ settings.js │    │ background  │                   │
│    │             │    │             │    │    .js      │                   │
│    │ Listens for:│    │ Listens for:│    │             │                   │
│    │ • enabled   │    │ (Updates UI │    │ Processes   │                   │
│    │ • default   │    │  on direct  │    │ tabs based  │                   │
│    │   Provider  │    │  storage    │    │ on settings │                   │
│    │             │    │  access)    │    │             │                   │
│    │ → loadStatus│    │             │    │             │                   │
│    └─────────────┘    └─────────────┘    └─────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Development Guidelines

### Adding a New AI Provider

1. Create `services/newprovider.js` implementing:
   ```javascript
   export class NewProvider {
     async configure(settings) { ... }
     async chat(prompt) { ... }
     async testConnection() { ... }
   }
   ```

2. Register in `services/ai-service.js`:
   ```javascript
   import { NewProvider } from './newprovider.js';
   this.providers.newprovider = new NewProvider();
   ```

3. Add UI in `settings/settings.html` (provider card)

4. Add validation in `settings/settings.js` (`validateSettings`)

5. Update `background.js` (`isConfigured` function)

6. Add key to `secure-storage.js` sensitiveKeys if needed

### Enabling Debug Logging

Edit `services/logger.js`:
```javascript
const DEBUG_ENABLED = true; // Set to true for verbose logging
```

All `logger.log()`, `logger.debug()`, `logger.info()` calls will output to console with `[Tabber]` prefix.
