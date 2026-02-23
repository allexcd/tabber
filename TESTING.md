# Manual Testing Guide

## Feature: Backup & Restore Settings (Issue #2)

### Prerequisites

Load the extension in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the repo folder
4. Open the extension settings (click the extension icon → Settings, or right-click → Options)

### Test: Export Settings

1. Configure at least one AI provider (e.g. enter a Groq API key and save)
2. Go to Settings page
3. Scroll to the **Backup & Restore** section in the left column
4. Click **⬇️ Export Settings**
5. ✅ A JSON file named `tabber-settings-YYYY-MM-DD.json` should download
6. Open the file — verify it contains your model preferences and provider selection
7. ✅ Verify API keys are NOT present in the export (only model names, URLs, etc.)

### Test: Import Settings

1. Open the downloaded JSON file in a text editor
2. Change `defaultProvider` to a different value (e.g. `"openai"`)
3. Save the file
4. In Settings, click **⬆️ Import Settings** and select the modified file
5. ✅ The provider selection should update to reflect the imported value
6. ✅ A success message "Settings imported! Re-enter your API keys." should appear
7. ✅ Your API keys should still be there (import does not overwrite them)

### Test: Invalid File

1. Click **⬆️ Import Settings**
2. Select a non-JSON file or a JSON file without a `settings` key
3. ✅ An error message "Invalid settings file format" should appear

### Test: Re-import Same File

1. Export settings
2. Import the same file twice in a row
3. ✅ Should work both times without errors (file input resets between imports)
