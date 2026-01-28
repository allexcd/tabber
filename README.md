# AI Tab Grouper

🗂️ Automatically organize your Chrome tabs using AI

## Features

- **🤖 AI-Powered Grouping**: Uses OpenAI, Claude, or local LLMs to intelligently categorize tabs
- **🎨 Smart Color Coding**: Semantic colors based on content (blue=dev, green=finance, etc.)
- **⚡ Real-time Processing**: New tabs are automatically grouped as they load
- **🔄 Dynamic Model Fetching**: OpenAI models auto-update via API (always current)
- **🆕 Latest AI Models**: GPT-5, GPT-5.2, ChatGPT 5.2, Claude 4.5 Opus support
- **🔧 Custom Models**: Enter any model name for bleeding-edge AI access
- **🔄 Bulk Processing**: Group all existing tabs with one click
- **⚙️ Multiple AI Providers**: Choose from OpenAI, Claude, or local LLMs (Ollama, LM Studio)

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
- **Manual**: Click "Regroup Tab" to reprocess the current tab
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

| Color | Content Type |
|-------|-------------|
| 🔵 Blue | Development, coding, technical |
| 🟢 Green | Finance, money, productivity |
| 🔴 Red | Entertainment, videos, gaming |
| 🟡 Yellow | Social media, communication |
| 🟣 Purple | Education, learning, research |
| 🩷 Pink | Shopping, lifestyle |
| 🩵 Cyan | News, articles, reading |
| 🟠 Orange | Work, business, professional |
| ⚫ Grey | Utilities, settings, misc |

## Privacy & Security

### 🔒 Data Protection
- **API Key Encryption**: All API keys are encrypted using AES-256-GCM before storage
- **Device-bound Keys**: Encryption keys are derived from your unique extension instance
- **Auto-migration**: Existing unencrypted keys are automatically encrypted on update

### 🔓 What Gets Encrypted vs Unencrypted

**Encrypted (Sensitive Data):**
- `openaiKey` - OpenAI API keys (sk-...)
- `claudeKey` - Claude API keys (sk-ant-...)

**Unencrypted (Non-sensitive Settings):**
- `enabled` - Extension on/off toggle
- `provider` - Selected AI provider ("openai", "claude", "local")
- `defaultProvider` - Default provider selection  
- `openaiModel` - Selected OpenAI model name
- `claudeModel` - Selected Claude model name
- `localUrl` - Local LLM server URL (http://localhost:11434)
- `localModel` - Local LLM model name (llama3.2, etc.)
- `localApiFormat` - API format ("openai" or "ollama")

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
├── manifest.json           # Extension manifest
├── background.js           # Service worker (main logic)
├── icons/                  # Extension icons
├── popup/                  # Toolbar popup UI
├── services/               # AI provider integrations
│   ├── ai-service.js       # Unified AI interface
│   ├── openai.js           # OpenAI provider
│   ├── claude.js           # Claude provider
│   ├── local-llm.js        # Local LLM provider
│   ├── sanitizer.js        # Data sanitization
│   ├── crypto.js           # Encryption service
│   └── secure-storage.js   # Secure storage wrapper
└── settings/               # Options page
```

### Security Architecture
The extension uses a modular security architecture:
- **Sanitizer** - Removes PII before AI processing
- **CryptoService** - AES-GCM encryption/decryption
- **SecureStorage** - Transparent encryption layer for Chrome storage

### Building
No build process required - load directly as unpacked extension.

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Version History

See [CHANGELOG.md](CHANGELOG.md) for complete release notes and version history.