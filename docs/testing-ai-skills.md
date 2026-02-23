# Manual Testing Guide

## Feature: AI Instructions / Skills (Issue #28)

### Prerequisites

Load the extension in Chrome developer mode (see main README).
Ensure an AI provider is configured and working (test connection passes).

### Test: Save and Verify Instructions

1. Open the Settings page
2. Find the **AI Instructions** section in the left column
3. Enter some instructions, e.g.:
   ```
   Always group cooking and recipe tabs under 'Food'
   Never create a group called Misc — use 'Other' instead
   ```
4. Click **Save Instructions**
5. ✅ "Instructions saved!" success message appears
6. Reload the settings page
7. ✅ Instructions are still there (persisted in storage)

### Test: Instructions Affect Grouping

1. Save instructions: "Always group any tab about food or recipes under 'Kitchen'"
2. Enable the extension
3. Open a new tab and navigate to a food/recipe website (e.g. `allrecipes.com`)
4. ✅ The tab should be grouped into "Kitchen" or a name influenced by your instructions
5. Compare behavior with instructions cleared — the AI should use a generic group name without instructions

### Test: Clear Instructions

1. Clear the instructions textarea
2. Click **Save Instructions**
3. ✅ Success message appears
4. Open new tabs — AI behaves without custom guidance (uses default logic)

### Test: Instructions with Existing Rules (Integration)

If custom rules (issue #3) are also implemented:

1. Set a custom rule for `github.com → Development`
2. Set an instruction: "Always put GitHub tabs in 'Code'"
3. Open `github.com`
4. ✅ The rule wins — tab goes to "Development" (rules take priority over AI)
5. Delete the rule, keep the instruction
6. Open `github.com` again
7. ✅ AI uses the instruction — tab likely goes to "Code"

### Test: Long Instructions

1. Enter a very long set of instructions (500+ characters)
2. Save and reload — ✅ all text persists
3. Open a tab — ✅ extension still works (doesn't break on large prompts)
