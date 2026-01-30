# AI Tab Grouper

[![CI](https://github.com/allexcd/tabber/actions/workflows/ci.yml/badge.svg)](https://github.com/allexcd/tabber/actions)

🗂️ Automatically organize your Chrome tabs using AI

## Features

- **🤖 AI-Powered Grouping**: Uses OpenAI, Claude, Groq, Gemini, or local LLMs to intelligently categorize tabs
- **🆓 Free AI Options**: Groq and Google Gemini offer generous free tiers
- **🎨 Smart Color Coding**: Semantic colors based on content (blue=dev, green=finance, etc.)
- **⚡ Real-time Processing**: New tabs are automatically grouped as they load
- **🔄 Dynamic Model Fetching**: Models auto-update via API for all providers
- **🆕 Latest AI Models**: GPT-5, Claude 4.5 Opus, Llama 3.2, Gemini 2.0 support
- **🔧 Custom Models**: Enter any model name for bleeding-edge AI access
- **🔄 Bulk Processing**: Group all existing tabs with one click
- **⚙️ 5 AI Providers**: OpenAI, Claude, Groq, Google Gemini, Local LLMs
- **💾 Persistent Model Cache**: Fetched models are saved across browser sessions

## Installation

### From Source

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder
5. Configure your AI provider in the extension settings

### From Chrome Web Store

Coming soon...

## Configuration

1. Click the extension icon → **Settings**
2. Select your AI provider:
   - **OpenAI**: Requires API key from [OpenAI Dashboard](https://platform.openai.com/api-keys)
   - **Claude**: Requires API key from [Anthropic Console](https://console.anthropic.com/)
   - **Local LLM**: Requires running Ollama, LM Studio, or compatible server
3. Enter your credentials and save
4. Toggle **Enable Extension** on

## Usage

- **Automatic**: New tabs are grouped automatically when enabled
- **Manual**: Click "Regroup Tabs" to reprocess the current tab
- **Bulk**: Click "Group All Open Tabs" to organize all existing tabs

## AI Provider Setup

### OpenAI

```
API Key: sk-...
Models: Dynamic fetching available + static options:
  - GPT-4o Mini, GPT-4o
  - GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano
  - GPT-5, GPT-5.2, ChatGPT 5.2
  - o1, o1 Mini, o1 Pro, o3 Mini
  - Custom model input for any model
```

**Pro Tip**: Enter your API key and click the "🔄 Fetch" button to automatically load all models available to your account, including beta/preview models!

### Claude (Anthropic)

```
API Key: sk-ant-...
Models: Manual selection (no API endpoint available):
  - Claude 3.5 Haiku, Claude 3.5 Sonnet
  - Claude 3.7 Sonnet, Claude 4 Sonnet
  - Claude 4 Opus, Claude 4.5 Opus, Claude Opus 4.5
  - Custom model input for latest releases
```

### Local LLM

```
Server URL: http://localhost:11434 (Ollama)
Model Name: llama3.2, mistral, etc.
API Format: OpenAI Compatible or Ollama Native
```

**LM Studio Setup:**

1. Start your model server in LM Studio
2. Go to **Server Settings** → **Developer** section
3. **Enable CORS** (required for browser extensions)
4. Use API Format: "OpenAI Compatible"
5. Server URL: `http://localhost:1234` (default LM Studio port)

## Dynamic Model Fetching

Stay current with the latest AI models:

### OpenAI Auto-Update

1. Enter your OpenAI API key in settings
2. Click **"🔄 Fetch"** next to the model dropdown
3. Extension queries OpenAI's API for all available models
4. Dropdown updates with your account's accessible models
5. Includes beta/preview models if you have access

### Custom Model Support

Both OpenAI and Claude support custom model names:

1. Select **"Custom Model..."** from dropdown
2. Enter exact model name (e.g., `gpt-6`, `claude-5-opus`)
3. Use bleeding-edge models as soon as they're released

## Group Colors

| Color     | Content Type                   |
| --------- | ------------------------------ |
| 🔵 Blue   | Development, coding, technical |
| 🟢 Green  | Finance, money, productivity   |
| 🔴 Red    | Entertainment, videos, gaming  |
| 🟡 Yellow | Social media, communication    |
| 🟣 Purple | Education, learning, research  |
| 🩷 Pink   | Shopping, lifestyle            |
| 🩵 Cyan   | News, articles, reading        |
| 🟠 Orange | Work, business, professional   |
| ⚫ Grey   | Utilities, settings, misc      |

## Privacy & Security

### 🔒 Data Protection

- **API Key Encryption**: All API keys are encrypted using AES-256-GCM before storage
- **Device-bound Keys**: Encryption keys are derived from your unique extension instance
- **Auto-migration**: Existing unencrypted keys are automatically encrypted on update
- **Unified Storage**: All data organized under single `tabber` key for security auditing

### 🔓 What Gets Encrypted vs Unencrypted

**Encrypted (Sensitive Data):**

- `openaiKey` - OpenAI API keys (sk-...)
- `claudeKey` - Claude API keys (sk-ant-...)
- `groqKey` - Groq API keys (gsk\_...)
- `geminiKey` - Google Gemini API keys

**Unencrypted (Non-sensitive Settings):**

- `enabled` - Extension on/off toggle
- `defaultProvider` - Selected AI provider ("claude", "gemini", "groq", "openai", "local")
- `*Model` - Selected model names for each provider
- `localUrl` - Local LLM server URL (http://localhost:11434)
- `localApiFormat` - API format ("openai" or "ollama")
- `fetchedModels` - Cached model lists from API fetches

**Why this split?** API keys are secrets that grant access to paid services and need maximum protection. Settings like model names and toggles aren't sensitive and encrypting everything would hurt performance and cross-device syncing.

### 🛡️ Data Sanitization

Before sending tab data to AI providers, sensitive information is automatically removed:

- Email addresses → `[EMAIL]`
- Phone numbers → `[PHONE]`
- Account numbers → `[ACCOUNT]`
- Credit card numbers → `[CARD]`
- Social Security Numbers → `[SSN]`
- IP addresses → `[IP]`
- Sensitive URL parameters are redacted

### 📡 Network Security

- All API calls use HTTPS encryption
- Tab titles and sanitized URLs are sent to your chosen AI provider
- No data is stored on external servers beyond the AI API calls
- The extension only processes tabs when enabled

### 💡 Privacy Tips

- Use **Local LLM** for maximum privacy (no data leaves your machine)
- Review tab titles before bulk processing sensitive windows
- API keys are never exposed in the UI after being saved

## Development

### Project Structure

```
Tabber/
├── manifest.json           # Extension manifest (MV3)
├── background.js           # Service worker (main logic)
├── icons/                  # Extension icons (16, 48, 128px)
├── popup/                  # Toolbar popup UI
│   ├── popup.html          # Popup markup
│   ├── popup.css           # Popup styles
│   └── popup.js            # Popup logic & status display
├── services/               # Core services & AI providers
│   ├── ai-service.js       # Unified AI interface
│   ├── openai.js           # OpenAI provider
│   ├── claude.js           # Claude provider
│   ├── groq.js             # Groq provider (free tier)
│   ├── gemini.js           # Google Gemini provider (free tier)
│   ├── local-llm.js        # Local LLM provider
│   ├── sanitizer.js        # Data sanitization (PII removal)
│   ├── crypto.js           # AES-256-GCM encryption
│   ├── secure-storage.js   # Encrypted sync storage wrapper
│   ├── local-storage.js    # Local storage wrapper
│   └── logger.js           # Centralized debug logging
└── settings/               # Options page
    ├── settings.html       # Settings markup
    ├── settings.css        # Settings styles
    ├── settings.js         # Main settings orchestration
    ├── model-cache.js      # Model caching logic
    ├── model-fetcher.js    # Dynamic model fetching
    ├── changelog.js        # Changelog modal display
    └── settings-fallback.js # CSP-compliant fallback script
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams and module relationships.

### Persistence Architecture

The extension uses Chrome's storage APIs with a unified key structure for organized data management.

#### Storage Services

| Service         | Storage Type           | Purpose                                               |
| --------------- | ---------------------- | ----------------------------------------------------- |
| `secureStorage` | `chrome.storage.sync`  | Encrypted API keys & settings (synced across devices) |
| `localStorage`  | `chrome.storage.local` | Cached data & preferences (device-specific)           |

#### Data Structure

All extension data is stored under a single `tabber` key in each storage type:

**Sync Storage** (`chrome.storage.sync.tabber`):

```javascript
{
  tabber: {
    // Extension state
    enabled: boolean,
    defaultProvider: "claude" | "gemini" | "groq" | "openai" | "local",

    // API Keys (AES-256-GCM encrypted)
    openaiKey: "encrypted:v1:...",
    claudeKey: "encrypted:v1:...",
    groqKey: "encrypted:v1:...",
    geminiKey: "encrypted:v1:...",

    // Model selections
    openaiModel: "gpt-4o-mini",
    claudeModel: "claude-3-5-haiku-20241022",
    groqModel: "llama-3.1-70b-versatile",
    geminiModel: "gemini-1.5-flash",

    // Local LLM settings
    localUrl: "http://localhost:11434",
    localModel: "llama3.2",
    localApiFormat: "openai" | "ollama"
  }
}
```

**Local Storage** (`chrome.storage.local.tabber`):

```javascript
{
  tabber: {
    // Cached models from API fetches (persisted across sessions)
    fetchedModels: {
      openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", ...],
      claude: ["claude-3-5-sonnet-20241022", ...],
      groq: ["llama-3.1-70b-versatile", ...],
      gemini: ["gemini-1.5-flash", "gemini-1.5-pro", ...]
    }
  }
}
```

#### Why This Structure?

1. **Organization**: Single `tabber` key prevents namespace collisions with other extensions
2. **Debugging**: Easy to inspect all extension data in DevTools → Application → Extension Storage
3. **Migration**: Simplifies data migration between versions
4. **Sync Efficiency**: Chrome sync storage has quota limits; nested structure is more efficient

#### Automatic Migration

Both storage services include automatic migration from legacy flat-key formats:

```javascript
// Old format (migrated automatically)
{ openaiKey: "sk-...", enabled: true, ... }

// New format
{ tabber: { openaiKey: "encrypted:v1:...", enabled: true, ... } }
```

Migration runs on:

- Extension installation
- First settings page load
- First popup interaction

### Security Architecture

The extension uses a modular security architecture:

- **Sanitizer** - Removes PII before AI processing
- **CryptoService** - AES-GCM encryption/decryption with device-bound keys
- **SecureStorage** - Transparent encryption layer for Chrome sync storage
- **LocalStorage** - Non-sensitive cached data management

### Code Quality

The project uses ESLint, Prettier, and Stylelint for code quality. Each tool serves a different purpose:

- **Prettier** (`format:check`) - Formatting only: indentation, spacing, quotes, semicolons
- **ESLint** (`lint`) - Code quality: unused variables, potential bugs, best practices, code patterns
- **Stylelint** (`stylelint`) - CSS quality: selector patterns, specificity, vendor prefixes, CSS-specific rules

```bash
# Install dev dependencies
npm install

# Check code quality
npm run lint              # Check JavaScript
npm run format:check      # Check code formatting
npm run stylelint         # Check CSS

# Auto-fix issues
npm run lint:fix          # Fix JavaScript issues
npm run format            # Format all files
npm run stylelint:fix     # Fix CSS issues

# Run all checks at once
npm run check             # Runs lint + format:check + stylelint

# Auto-fix all issues at once
npm run fix:all           # Runs lint:fix + format + stylelint:fix
```

#### Pre-commit Hooks

The project uses Husky and lint-staged to automatically run code quality checks before each commit:

- **JavaScript files**: Auto-fixed with ESLint and formatted with Prettier
- **CSS files**: Auto-fixed with Stylelint
- **HTML/MD/JSON files**: Formatted with Prettier
- **Commit messages**: Validated with commitlint to ensure conventional format

If any checks fail, the commit will be blocked until issues are resolved. This ensures all committed code meets quality standards.

#### Continuous Integration

GitHub Actions automatically runs on all pushes and pull requests:

- **Code Quality**: Runs ESLint, Prettier, and Stylelint checks
- **PR Title Validation**: Ensures PR titles follow Conventional Commits format
- **Package Verification**: Tests the extension packaging process
- **Security Scanning**: CodeQL analyzes code for vulnerabilities (weekly + on PRs)

All checks must pass before a PR can be merged.

#### Editor Configuration

An `.editorconfig` file is provided for consistent coding styles across different editors:

- UTF-8 encoding
- LF line endings
- 2-space indentation for JS/CSS/HTML/JSON
- Trim trailing whitespace
- Insert final newline

Most modern editors (VS Code, WebStorm, Sublime, etc.) support EditorConfig automatically.

### Building

Package the extension for Chrome Web Store:

```bash
npm run package           # Creates extension.zip (~62KB)
```

The packaging script:

- Creates a clean `dist/` directory
- Copies only extension files (no dev dependencies)
- Generates `extension.zip` ready for upload
- Excludes `node_modules/`, config files, and dev tools

For development, no build process is required - load directly as unpacked extension.

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please follow these guidelines:

### Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean and semantic commit history. All commits are validated using [commitlint](https://commitlint.js.org/).

#### Commit Format

```
<type>: <Subject starting with capital letter>
```

#### Valid Types

- `feat`: New feature or enhancement
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes (dependencies, config, etc.)
- `revert`: Revert a previous commit

#### Examples

**Valid commits:**

```
feat: Add dynamic model fetching for all AI providers
fix: Resolve memory leak in tab grouping
docs: Update installation instructions
chore: Update dependencies to latest versions
refactor: Simplify API key encryption logic
```

**Invalid commits:**

```
added new feature            # Missing type
feat: add new feature        # Subject must start with capital
feature: Add tabs            # Invalid type
Updated the README           # Missing type
```

#### Local Validation

The project uses Husky pre-commit hooks to automatically:

- Lint and fix JavaScript files with ESLint
- Format code with Prettier
- Lint and fix CSS files with Stylelint
- **Validate commit messages** with commitlint

If your commit message doesn't follow the convention, the commit will be rejected with a helpful error message.

### Pull Request Guidelines

1. **Fork the repository** and create a feature branch
2. **Make your changes** following the code quality standards
3. **Test thoroughly** to ensure everything works
4. **Follow commit conventions** for all commits
5. **Create a PR** with a descriptive title following the same format

#### PR Title Format

PR titles must follow the same Conventional Commits format:

```
<type>: <Subject starting with capital letter>
```

**Examples:**

```
feat: Add support for GPT-5 model
fix: Resolve tab grouping race condition
docs: Add contributing guidelines
chore: Add commit message linting
```

The PR title validation runs automatically in GitHub Actions and will block merging if the title doesn't follow the convention.

### Development Workflow

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Make your changes
4. Run quality checks: `npm run check`
5. Fix any issues: `npm run fix:all`
6. Commit with conventional format: `git commit -m "feat: Your feature"`
7. Push and create a pull request

## Version History

See [CHANGELOG.md](CHANGELOG.md) for complete release notes and version history.
