# Changelog

All notable changes to the AI Tab Grouper extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-01-29

### Added
- Initial release of AI Tab Grouper extension
- Support for multiple AI providers: Claude/Anthropic, Google Gemini, Groq, OpenAI, Local LLM
- Support for Groq AI provider with fast inference and generous free tier (14,400 requests/day)
- Support for Google Gemini provider with free tier availability
- New provider options: Groq (⚡ Fast & Free) and Google Gemini (💎 Free Tier Available)
- Groq models: Llama 3.1 70B Versatile (recommended), Llama 3.1 8B Instant, Mixtral 8x7B, Gemma variants
- Google Gemini models: Gemini 1.5 Flash (fast & free), Gemini 1.5 Pro, Gemini 2.0 Flash (experimental)
- Free AI alternatives for users who prefer not to use paid OpenAI/Claude subscriptions
- Automatic tab grouping based on content analysis
- Manual tab grouping with "Group All Tabs" functionality
- Modern AI-powered tab grouping design for extension icons
- Circular design with browser window and colored tab groups
- AI neural network symbol with connected nodes
- Sparkle effects suggesting AI automation
- Professional appearance suitable for Chrome Web Store
- Comprehensive security features:
  - AES-256-GCM encryption for API keys using Web Crypto API
  - Secure storage service with automatic encryption/decryption
  - Data sanitization service to remove PII before AI processing
  - Crypto service with PBKDF2 key derivation (100k iterations)
  - Migration system for existing unencrypted keys
- Settings page with:
  - Provider selection (OpenAI, Claude, Groq, Gemini, Local LLM)
  - Default provider configuration with "Make Default" buttons
  - Dynamic model fetching for OpenAI
  - Custom model input support
  - API key management with secure storage
  - Connection testing functionality
- Popup interface with extension status and manual controls
- Background service worker for automatic tab processing
- Support for Ollama and LM Studio local LLMs
- Detailed documentation and setup instructions
- All icon sizes (16px, 48px, 128px) with professional design
- Both SVG source files and PNG exports for icons
- Centralized debug logger service with toggleable DEBUG_ENABLED flag
- Logger methods: log, info, warn, error, debug, group, table, time for development debugging
- Make Default button for each AI provider with color-coded states (grey/yellow/green)
- Warning message when no default provider is configured on settings page
- Cross-page synchronization between popup and settings for enabled toggle state
- Provider-specific settings saving (only saves credentials for selected provider)

### Changed
- Modularized settings.js into separate focused modules (model-cache.js, model-fetcher.js, changelog.js)
- Renamed "Regroup Tab" button to "Regroup Tabs" in popup
- Save Settings button now saves only the selected provider's settings instead of all providers
- Make Default button now validates and saves provider settings before setting as default

### Fixed
- Default provider button showing incorrectly when no provider is set
- Inline script causing CSP violation - moved to external settings-fallback.js
- Enable Extension toggle now persists immediately on click
- Popup buttons now properly disabled when no default provider is configured
- Popup and settings page now sync enabled toggle state via chrome.storage.onChanged
- Warning message visibility now properly tied to default provider state via CSS .hidden class
- Regroup Tabs and Group All Open Tabs buttons now disabled when extension is disabled

### Security
- All API keys stored encrypted at rest (OpenAI, Claude, Groq, Gemini)
- User data sanitized before being sent to AI providers
- Strong key derivation with PBKDF2 (100k iterations)
- Seamless migration from unencrypted to encrypted storage
- Extended secure storage to encrypt Groq and Gemini API keys

### Technical
- Chrome Extension Manifest V3 compliance
- Vanilla JavaScript implementation (no build step required)
- Modular architecture with separate services
- Updated AI service architecture to support additional providers
- Enhanced background service worker with new provider configurations
- Clean separation of concerns between providers
- Replaced all console.log/error/warn calls with centralized logger service
- All logs prefixed with [Tabber] for easy console filtering
- Warnings and errors always shown regardless of DEBUG_ENABLED setting
- Error handling and fallback mechanisms throughout

### Documentation
- Comprehensive README with setup instructions
- Security documentation explaining encryption approach
- LM Studio CORS configuration guide
- MIT License for open-source development