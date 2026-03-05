# AI Tab Grouper

[![CI](https://github.com/allexcd/tabber/actions/workflows/ci.yml/badge.svg)](https://github.com/allexcd/tabber/actions)

🗂️ Automatically organize your Chrome tabs using AI

## Features

- **🤖 AI-Powered Grouping**: OpenAI, Claude, Groq, Gemini, or local LLMs
- **📋 Custom Grouping Rules**: Pin specific URLs to specific groups — AI handles the rest
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

## Tab Grouping

### AI Grouping

By default, every tab is grouped automatically by AI. The AI groups tabs by **meaning and intent**, not by website or brand — so Netflix, YouTube, and Prime Video all land in "Entertainment" rather than three separate groups.

### Custom Grouping Rules

For deterministic control, open **📋 Rules** (popup or settings header) to define URL-based rules. A rule matches a tab's URL and forces it into a specific group and color, bypassing AI entirely.

**How rules work:**

- Rules match top to bottom — the **first match wins**
- Put **specific patterns above broad ones** (e.g. `github.com/*/pull/*` before `github.com`)
- Tabs that match no rule fall through to AI grouping as normal
- Rules are synced across Chrome instances via `chrome.storage.sync`

**Pattern syntax:**

| Pattern | Matches |
|---------|---------|
| `github.com` | Any URL containing `github.com` (substring) |
| `*.github.com/*/pull/*` | GitHub PRs on any subdomain (glob) |
| `youtube.com/watch` | YouTube video pages only |
| `docs.*.io` | Docs sites on any `.io` domain |

Glob rules use `*` as a wildcard for any sequence of characters. A leading `*.` is treated as an optional subdomain — `*.github.com` matches both `github.com` and `api.github.com`.

**Example setup:**

| URL Pattern | Group | Color |
|-------------|-------|-------|
| `*.github.com/*/pull/*` | PRs | green |
| `github.com` | Code | blue |
| `youtube.com/watch` | Videos | red |
| `figma.com` | Design | purple |

With this setup, GitHub PR tabs go to "PRs", other GitHub tabs go to "Code", YouTube video pages go to "Videos", and everything else is grouped by AI.

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

For complete privacy details, see [PRIVACY.md](PRIVACY.md).

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
├── PRIVACY.md              # Full privacy policy
├── RELEASE_PROCESS.md      # Release workflow guide
├── CHANGELOG.json          # Structured changelog data
├── popup/                  # Toolbar popup UI
├── settings/               # Options page
│   ├── settings.js         # Settings orchestration
│   ├── rules.html          # Custom grouping rules page
│   ├── rules.js            # Custom grouping rules UI logic
│   ├── model-fetcher.js    # Dynamic model fetching via message passing
│   ├── model-cache.js      # Model caching
│   ├── changelog.js        # Version history modal
│   └── settings-fallback.js # Settings fallback handling
├── services/               # Core services & providers
│   ├── ai-service.js       # Unified AI interface
│   ├── rules-service.js    # Custom rule matching logic
│   ├── openai.js           # OpenAI provider (complete + listModels)
│   ├── claude.js           # Claude provider (complete + listModels)
│   ├── groq.js             # Groq provider (complete + listModels)
│   ├── gemini.js           # Gemini provider (complete + listModels)
│   ├── local-llm.js        # Local LLM provider
│   ├── sanitizer.js        # PII removal
│   ├── crypto.js           # AES-256-GCM encryption
│   ├── secure-storage.js   # Encrypted storage wrapper
│   ├── browser-info.js     # Browser detection & tab group bug detection
│   ├── local-storage.js    # Local storage wrapper
│   └── logger.js           # Debug logging
└── scripts/                # Release and version management scripts
    ├── bump-version.js
    ├── changeset.js
    ├── package.js
    ├── tag-release.js
    └── verify-changeset.js
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture diagrams.

### Release Management

See [RELEASE_PROCESS.md](RELEASE_PROCESS.md) for the complete release workflow including versioning, changesets, and tagging.

### Code Quality

```bash
npm install              # Install dependencies
npm run check            # Run all checks (lint + format + stylelint)
npm run fix:all          # Auto-fix all issues
npm run package          # Build extension.zip for Chrome Web Store
npm run changeset        # Create a changeset for your changes
npm run release:patch    # Create a patch release (x.x.1)
npm run release:minor    # Create a minor release (x.1.0)
npm run release:major    # Create a major release (1.0.0)
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

For detailed type definitions and when to use each (including which types trigger releases), see the [Conventional Commit Types](RELEASE_PROCESS.md#conventional-commit-types) section in RELEASE_PROCESS.md.

### Changesets

Every feature branch requires a changeset before pushing. A changeset documents what changed and why.

```bash
npm run changeset          # Interactive prompt for type + description
```

This generates a `.changeset/<timestamp>-<slug>.md` file, stages it, and commits it. The pre-push hook blocks pushes without a changeset. To skip in exceptional cases: `git push --no-verify`.

## Contributing

1. Fork and clone the repository
2. Create a feature branch
3. Make changes following code standards
4. Run `npm run check` before committing
5. Follow Conventional Commits format
6. Run `npm run changeset` to document your changes
7. Create PR with descriptive title

## License

MIT License - see LICENSE file for details

## Version History

See [CHANGELOG.md](CHANGELOG.md) for complete release notes.
