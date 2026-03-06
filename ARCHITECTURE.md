# Architecture

This document describes the runtime architecture, message flow, and security model of AI Tab Grouper.

## System Overview

```mermaid
flowchart LR
  Popup["Popup UI (popup/*)"]
  Settings["Settings UI (settings/*)"]
  Background["Background Service Worker (background.js)"]
  AIService["AI Service (services/ai-service.js)"]
  Providers["Providers (openai/claude/groq/gemini/local-llm)"]
  External["AI Endpoints (cloud or local)"]
  SyncStore["chrome.storage.sync (encrypted keys + settings)"]
  LocalStore["chrome.storage.local (model cache)"]

  Popup -->|chrome.runtime.sendMessage| Background
  Settings -->|chrome.runtime.sendMessage| Background
  Background --> AIService
  AIService --> Providers
  Providers -->|fetch| External
  Background <--> SyncStore
  Settings <--> LocalStore
```

## Runtime Diagrams

### Group All Tabs

`groupAllTabs`, `smartRegroupTabs`, and `rebuildTabs` all execute the same batch command.

```mermaid
flowchart TD
  A["User clicks Group All Tabs"] --> B["background.js message handler"]
  B --> C{"groupAllRunInProgress?"}
  C -->|yes| D["Return: Grouping already in progress"]
  C -->|no| E["Set lock = true"]
  E --> F["Load provider settings"]
  F --> G{"Provider configured?"}
  G -->|no| H["Return configuration error"]
  G -->|yes| I["Query current window tabs"]
  I --> J["Filter out pinned + internal URLs"]
  J --> K["Read named existing groups (prompt context)"]
  K --> L["AIService.getBatchGroupingPlan(tabs, existingGroups)"]
  L --> M{"Assignments parsed?"}
  M -->|no| N["Return AI assignment error"]
  M -->|yes| O["For each tab: executeGrouping()"]
  O --> P{"Group name exists?"}
  P -->|yes| Q["Move tab to existing group"]
  P -->|no| R["Create group + set title/color"]
  Q --> S["forceGroupTitleRender()"]
  R --> S
  S --> T["Return grouped/skipped counters"]
  T --> U["Set lock = false"]
  H --> U
  D --> V["Done"]
  N --> U
  U --> V
```

### Auto-Grouping for New Tabs

```mermaid
flowchart TD
  A["chrome.tabs.onCreated"] --> B["Add tabId to pendingNewTabs"]
  C["chrome.tabs.onUpdated(status=complete)"] --> D{"pending new tab OR host changed?"}
  D -->|no| Z["Skip"]
  D -->|yes| E{"Pinned/internal/already processing?"}
  E -->|yes| Z
  E -->|no| F["processTab(tabId, tab)"]
  F --> G["Load extension + provider settings"]
  G --> H{"Enabled and configured?"}
  H -->|no| Z
  H -->|yes| I["Read existing named groups (prompt context)"]
  I --> J["AIService.getGroupingDecision(tabId,title,url,groups)"]
  J --> K{"Decision exists?"}
  K -->|no| Z
  K -->|yes| L["executeGrouping()"]
  L --> M["forceGroupTitleRender()"]
  M --> N["Update lastProcessedHostByTab"]
  N --> O["Remove tabId from pendingNewTabs"]
  Z --> O
```

## Security Architecture

### API Isolation and Message Boundary

```mermaid
sequenceDiagram
  participant UI as "Settings/Popup"
  participant BG as "Background Worker"
  participant AI as "AI Service"
  participant P as "Provider"
  participant API as "External API"

  UI->>BG: chrome.runtime.sendMessage(...)
  BG->>AI: getGroupingDecision/getBatchGroupingPlan/listModels
  AI->>P: complete(prompt) or listModels(credential)
  P->>API: fetch(...)
  API-->>P: JSON response
  P-->>AI: normalized content
  AI-->>BG: parsed decisions/models
  BG-->>UI: response payload
```

### Data Protection Layers

```mermaid
flowchart TD
  A["Tab metadata"] --> B["sanitizer.js (PII redaction)"]
  C["API keys/settings"] --> D["secure-storage.js"]
  D --> E["crypto.js (AES-256-GCM + PBKDF2)"]
  B --> F["Provider request payload"]
  E --> G["chrome.storage.sync"]
  F --> H["HTTPS fetch to provider endpoint"]
```

Key points:

- UI pages do not call provider APIs directly.
- External HTTP calls are centralized in provider classes.
- Sensitive keys are encrypted at rest in `chrome.storage.sync`.
- Tab payloads are sanitized before provider calls.

## Module Dependencies

```mermaid
flowchart LR
  BG["background.js"] --> AIS["services/ai-service.js"]
  BG --> SS["services/secure-storage.js"]
  BG --> PM["services/provider-metadata.js"]
  BG --> BI["services/browser-info.js"]
  BG --> LOG["services/logger.js"]

  AIS --> OA["services/openai.js"]
  AIS --> CL["services/claude.js"]
  AIS --> GR["services/groq.js"]
  AIS --> GE["services/gemini.js"]
  AIS --> LL["services/local-llm.js"]
  AIS --> SAN["services/sanitizer.js"]
  AIS --> SS

  PM --> LUG["services/local-url-guard.js"]
  LL --> LUG

  SS --> CR["services/crypto.js"]

  SET["settings/settings.js"] --> MF["settings/model-fetcher.js"]
  SET --> MC["settings/model-cache.js"]
  SET --> PM
  SET --> SS

  POP["popup/popup.js"] --> SS
  POP --> PM
  POP --> LOG
```

## Storage Structure

All extension data is stored under a unified `tabber` key namespace.

### Sync Storage (`chrome.storage.sync.tabber`)

```javascript
{
  enabled: boolean,
  defaultProvider: "openai" | "claude" | "groq" | "gemini" | "local",

  // Encrypted API keys
  openaiKey: "encrypted:v1:...",
  claudeKey: "encrypted:v1:...",
  groqKey: "encrypted:v1:...",
  geminiKey: "encrypted:v1:...",

  // Model selection
  openaiModel: string,
  claudeModel: string,
  groqModel: string,
  geminiModel: string,

  // Local model config (Ollama/LM Studio/OpenAI-compatible endpoint)
  localUrl: string,
  localModel: string,
  localApiFormat: "auto" | "openai" | "ollama",
  localStrictLoopback: boolean,
  localLoopbackUpgradeNoticeSeen: boolean
}
```

### Local Storage (`chrome.storage.local.tabber`)

```javascript
{
  fetchedModels: {
    openai: [{ id, displayName }],
    claude: [{ id, displayName }],
    groq: [{ id, displayName }],
    gemini: [{ id, displayName }]
  }
}
```

## Notes for Extending Providers

1. Implement `complete(prompt)` in a new provider class.
2. Optionally implement `listModels(apiKey)` for dynamic model discovery.
3. Register the provider in `services/ai-service.js`.
4. Add settings UI + validation.
5. Update `background.js` provider-configuration checks.
