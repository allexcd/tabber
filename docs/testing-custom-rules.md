# Manual Testing Guide

## Feature: Custom Rules (Issue #3)

### Prerequisites

Load the extension in Chrome developer mode (see main README).
Open extension settings.

### Test: Add a Domain Rule

1. Open the Settings page
2. Find the **Custom Rules** section
3. Select **Domain** from the match type dropdown
4. Enter `github.com` in the match value field
5. Enter `Development` as the group name
6. Select `Blue` as the color
7. Click **Add**
8. ✅ The rule should appear in the rules list below the form
9. Open a new tab and navigate to `https://github.com/anything`
10. ✅ The tab should be grouped into a "Development" group (blue) WITHOUT an AI API call

### Test: Add a URL Contains Rule

1. Add a rule: **URL contains** `youtube` → `Videos` (red)
2. Open a new tab and go to `https://www.youtube.com`
3. ✅ Should be grouped into "Videos" (red) immediately

### Test: Add a Title Contains Rule

1. Add a rule: **Title contains** `docs` → `Documentation` (purple)
2. Open a new tab and navigate to any page with "docs" in the title
3. ✅ Should be grouped into "Documentation" (purple)

### Test: Rule Takes Priority Over AI

1. Ensure AI is configured and enabled
2. Add a rule for a domain you know the AI would group differently
3. Open a tab for that domain
4. ✅ The rule's group name should be used, not the AI's suggestion

### Test: Delete a Rule

1. Click **✕** on any existing rule
2. ✅ Rule is removed from the list immediately
3. Open a tab that would have matched the deleted rule
4. ✅ AI is now invoked for that tab (rule no longer applies)

### Test: No Rules

1. Delete all rules
2. ✅ "No rules yet. Add one above." message appears
3. ✅ AI grouping still works normally
