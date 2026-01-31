# AI Tab Grouper

[![CI](https://github.com/allexcd/tabber/actions/workflows/ci.yml/badge.svg)](https://github.com/allexcd/tabber/actions)

🗂️ Automatically organize your Chrome tabs using AI

## Features

- **🤖 AI-Powered Grouping**: OpenAI, Claude, Groq, Gemini, or local LLMs
- **🆓 Free Options**: Groq and Google Gemini offer generous free tiers
- **🎨 Smart Color Coding**: Semantic colors (blue=dev, green=finance, red=entertainment)
- **⚡ Real-time**: Auto-groups new tabs as they load
- **🔄 Dynamic Models**: Fetch latest models via API for all providers
- **🔧 Custom Models**: Use any model name for bleeding-edge access
- **🔒 Secure**: AES-256-GCM encrypted API keys, PII sanitization

## Installation

### From Source

1. Clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select project folder
5. Configure your AI provider in settings

### From Chrome Web Store

Coming soon...

## Quick Start

1. Click extension icon → **Settings**
2. Select AI provider and enter API key
3. Click **🔄 Fetch** to load available models (optional)
4. Save and enable extension

## AI Provider Setup

### OpenAI

- **API Key**: Get from [OpenAI Dashboard](https://platform.openai.com/api-keys)
- **Models**: GPT-4o, GPT-4.1, GPT-5, o1/o3 series
- **Tip**: Use **Fetch** button to auto-load all your available models

### Claude (Anthropic)

- **API Key**: Get from [Anthropic Console](https://console.anthropic.com/)
- **Models**: Claude 3.5/3.7/4/4.5 (Haiku, Sonnet, Opus)
- **Tip**: Use **Fetch** button to auto-load current models

### Groq (Free Tier)

- **API Key**: Get from [Groq Console](https://console.groq.com/)
- **Models**: Llama 3.1/3.2, Mixtral, Gemma

### Google Gemini (Free Tier)

- **API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Models**: Gemini 1.5/2.0 (Flash, Pro)

### Local LLM

- **Server**: Ollama (`http://localhost:11434`) or LM Studio (`http://localhost:1234`)
- **LM Studio**: Enable CORS in Developer settings
- **Format**: OpenAI Compatible or Ollama Native

## Privacy & Security

### Data Protection

- **Encrypted Storage**: API keys use AES-256-GCM with PBKDF2 (100k iterations)
- **Device-Bound**: Encryption keys derived from unique extension instance
- **Auto-Migration**: Existing keys encrypted automatically on update

### Data Sanitization

Before sending to AI, sensitive data is automatically redacted:

- Email addresses → `[EMAIL]`
- Phone numbers → `[PHONE]`
- Credit cards → `[CARD]`
- SSN → `[SSN]`
- IP addresses → `[IP]`

### Network Security

- All API calls use HTTPS
- Only tab titles and sanitized URLs sent to AI
- No data stored on external servers
- **Local LLM option** for maximum privacy (data never leaves your machine)

### Security Architecture

All external API requests are centralized in provider classes, which execute exclusively in the background service worker:

```
Settings Page
    ↓ chrome.runtime.sendMessage (no direct API calls)
Background Worker
    ↓ AI Service
Provider Classes (openai.js, claude.js, etc.)
    ↓ fetch() — all HTTP requests here
External APIs
```

API keys encrypted at rest, decrypted only in memory within the background worker for requests.

## Development

### Project Structure

```
Tabber/
├── manifest.json           # Extension manifest (MV3)
├── background.js           # Service worker, tab processing
├── popup/                  # Toolbar popup UI
├── settings/               # Options page
│   ├── settings.js         # Settings orchestration
│   ├── model-fetcher.js    # Dynamic model fetching via message passing
│   └── model-cache.js      # Model caching
└── services/               # Core services & providers
    ├── ai-service.js       # Unified AI interface
    ├── openai.js           # OpenAI provider (complete + listModels)
    ├── claude.js           # Claude provider (complete + listModels)
    ├── groq.js             # Groq provider (complete + listModels)
    ├── gemini.js           # Gemini provider (complete + listModels)
    ├── local-llm.js        # Local LLM provider
    ├── sanitizer.js        # PII removal
    ├── crypto.js           # AES-256-GCM encryption
    ├── secure-storage.js   # Encrypted storage wrapper
    └── logger.js           # Debug logging
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture diagrams.

### Code Quality

```bash
npm install              # Install dependencies
npm run check            # Run all checks (lint + format + stylelint)
npm run fix:all          # Auto-fix all issues
npm run package          # Build extension.zip for Chrome Web Store
```

#### Pre-commit Hooks

- Auto-fixes JavaScript (ESLint), CSS (Stylelint), and formatting (Prettier)
- Validates commit messages (Conventional Commits)

#### CI/CD

- Automated code quality checks on all PRs
- CodeQL security scanning
- Package verification

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <Subject starting with capital letter>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

**Examples**:

```
feat: Add GPT-5 model support
fix: Resolve tab grouping race condition
docs: Update installation instructions
```

## Contributing

1. Fork and clone the repository
2. Create a feature branch
3. Make changes following code standards
4. Run `npm run check` before committing
5. Follow Conventional Commits format
6. Create PR with descriptive title

## License

MIT License - see LICENSE file for details

## Version History

See [CHANGELOG.md](CHANGELOG.md) for complete release notes.
