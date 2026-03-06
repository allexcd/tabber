# Privacy Policy for AI Tab Grouper

**Last updated: March 6, 2026**

## Overview

AI Tab Grouper ("the Extension") is a Chrome browser extension that uses artificial intelligence to automatically organize your browser tabs. This privacy policy explains how we handle your data.

## Data Collection and Use

### What Data We Access

- **Tab Information**: Tab titles and URLs from your active browsing sessions
- **API Keys**: Your cloud provider API keys (OpenAI, Claude, Groq, Gemini)
- **Settings**: Your extension preferences and configuration

### How We Use Your Data

1. **Tab Processing**: Tab titles and URLs are processed to generate intelligent grouping decisions
2. **AI Provider Communication**: Sanitized tab data is sent to your chosen AI provider (OpenAI, Claude, Groq, Google Gemini) or to your local model provider (Local LLM)
3. **Settings Storage**: Your preferences are stored locally in Chrome's secure storage

### Data Protection

- **Encryption**: All API keys are encrypted using AES-256-GCM encryption before storage
- **Local Storage**: All data is stored locally in your browser - we do not maintain external servers
- **Data Sanitization**: Before sending to AI providers, we automatically remove:
  - Email addresses → `[EMAIL]`
  - Phone numbers → `[PHONE]`
  - Credit card numbers → `[CARD]`
  - Social Security Numbers → `[SSN]`
  - Account numbers → `[ACCOUNT]`
  - IP addresses → `[IP]`

## Data Sharing

### AI Providers

When you use the extension, sanitized tab data (titles and cleaned URLs) is sent to your selected AI provider:

- **OpenAI**: If you choose OpenAI as your provider
- **Anthropic**: If you choose Claude as your provider
- **Groq**: If you choose Groq as your provider
- **Google**: If you choose Gemini as your provider
- **Local LLM**: Supports Ollama, LM Studio, and OpenAI-compatible local servers; loopback URL restriction is enabled by default and can be disabled in settings

Each provider has their own privacy policies governing their use of data.

### No Other Sharing

- We do not sell, trade, or transfer your data to third parties
- We do not use your data for advertising or marketing
- We do not store your data on external servers

## Your Privacy Rights

- **Control**: You control which AI provider to use
- **Local-Only Option**: Choose "Local LLM" and keep loopback-only URL restriction enabled to keep data on your machine
- **Data Deletion**: Uninstalling the extension removes all stored data
- **Selective Processing**: Enable/disable the extension at any time

## Data Retention

- **Browser Storage**: Data is stored locally in Chrome's storage until you uninstall the extension
- **AI Provider Retention**: Refer to your chosen AI provider's data retention policy
- **No External Storage**: We do not retain copies of your data on external servers

## Security Measures

- **Encrypted Storage**: API keys encrypted with AES-256-GCM
- **HTTPS Communication**: All AI provider communications use HTTPS
- **Minimal Data**: Only necessary tab information is processed
- **Device-Bound Keys**: Encryption keys are unique to your browser installation
- **Loopback Guard**: Local LLM URLs are restricted to localhost/loopback hosts by default (optional override in settings)

## Children's Privacy

This extension is not intended for use by children under 13. We do not knowingly collect personal information from children under 13.

## Changes to This Policy

We may update this privacy policy from time to time. Updates will be posted with a new "Last updated" date.

## Contact Information

For questions about this privacy policy or the extension:

- **GitHub Issues**: [https://github.com/allexcd/tabber/issues](https://github.com/allexcd/tabber/issues)
- **Repository**: [https://github.com/allexcd/tabber](https://github.com/allexcd/tabber)

## Third-Party AI Provider Policies

When using AI providers, also review their privacy policies:

- **OpenAI**: [https://openai.com/privacy](https://openai.com/privacy)
- **Anthropic**: [https://www.anthropic.com/privacy](https://www.anthropic.com/privacy)
- **Groq**: [https://groq.com/privacy-policy](https://groq.com/privacy-policy)
- **Google Gemini**: [https://policies.google.com/privacy](https://policies.google.com/privacy)
