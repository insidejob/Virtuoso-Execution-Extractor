# NLP Extraction Rules for Virtuoso API

## Purpose
This document defines the rules for converting Virtuoso journey data to human-readable NLP format that matches the UI display.

## Variable Handling Rules

### 1. Variable Prefix
- **ALL variables MUST be prefixed with $** in the NLP output
- This includes:
  - Direct variables in WRITE actions: `Write $username`
  - Variables in ASSERT_EXISTS: `Look for element $QuestionType1 on page`
  - Variables in MOUSE actions: `Mouse click $signaturebox`

### 2. Variable Sources
Extract variables from three locations:
- **step.variable**: Direct variable assignments in steps
- **dataAttributeValues**: Test data variables (e.g., QuestionType1-10)
- **GUESS selector variables**: Variables referenced in element selectors

### 3. Variable Types
Mark variables with their source type:
- `LOCAL`: Default/hardcoded values
- `TEST_DATA`: From test data sets
- `DATA_ATTRIBUTE`: From dataAttributeValues
- `ENVIRONMENT`: From environment configuration

## Selector Priority Rules

**CRITICAL: HINT is always the preferred selector to use in NLP**

When converting element references, follow this strict priority:
1. **HINT** (from GUESS selector) - ALWAYS use this if available
2. **Text** (if ≤100 characters)
3. **ID** selector (preferred - readable and maintainable)
4. **XPath variants** in order:
   - XPath ID
   - XPath Text
   - XPath Attribute
   - Standard XPath
5. **CSS** selector
6. **JS Path**
7. **ERROR** - Flag if no selectors found

### Important: ID Selectors Are Good!
- ID selectors like "grid", "submit-button", "login-form" are VALID and PREFERRED
- They're more readable than XPath: `"grid"` vs `//*[@id='permits-grid']/div[3]`
- Even generic-sounding IDs are intentional and should be used

### Error Detection:
If NO selectors are found at all, output: `[ERROR: No selector found - needs investigation]`
This helps quickly identify elements that need selector configuration.

### Important Notes:
- **NEVER use element aliases directly** - resolve to HINT or explicit selectors
- The HINT value (e.g., "Edit Permit") is what users see in the UI
- Additional explicit selectors are fallbacks only

### Examples:
```
HINT present: Click on "Edit Permit"
No HINT, has XPath: Click on "/html/body/div[1]/div[2]/div"
No HINT, has ID: Click on "submit-button"
Element alias: Resolve to HINT first, then fallback selectors
No selectors: Click on element
```

## Text Content Rules

### Large Text Handling
- If element text > 100 characters → use XPath/CSS selector instead
- Never dump entire table/grid contents in NLP
- Preserve readability over completeness

### Example:
```
Bad:  Look for "Permit No.Permit TitleStatus... [900 lines]" on page
Good: Look for element "/html/body/div[1]/div[2]/div[2]/div[1]/div/div[3]" on page
```

## Action Formatting Rules

### NAVIGATE
- **Always quote URLs**
```
Navigate to "https://example.com/login"
```

### WRITE
- Include field name when available
```
Write $username in field "Username"
Write $password in field "Password"
```

### CLICK vs MOUSE
- Regular CLICK action → `Click on`
- MOUSE action with meta.action="CLICK" → `Mouse click`
- MOUSE action with meta.action="DOUBLE_CLICK" → `Double-click on`

### ASSERT_EXISTS
- Always use "Look for element" format
- Include $ prefix for variables
```
Look for element $QuestionType1 on page
Look for element "Requested" on page
Look for element "/html/body/div[1]" on page
```

## Checkpoint Numbering Rules

### Duplicate Names
- **Reuse checkpoint numbers for identical titles**
- Track checkpoint names in a Map
- LibraryCheckpoints with same name as previous get same number

### Example:
```
Checkpoint 1: Navigate to URL
Checkpoint 1: Login              (duplicate title = same number)
Checkpoint 2: Check a Permit
Checkpoint 2: Check a Permit     (duplicate title = same number)
```

## Special Cases

### Signature Fields
- Preserve variable format: `Mouse click $signaturebox`

### Toggle Elements
- Keep selector value as-is: `Click on "nz-toggle"`

### Comments/Text Areas
- Show field name: `Write "All Checked and Approved" in field "Comments"`

## Implementation Checklist

When implementing NLP conversion:
- [ ] Track checkpoint names for number reuse
- [ ] Add $ prefix to all variables
- [ ] Extract dataAttributeValues
- [ ] Prioritize selectors correctly
- [ ] Quote all URLs
- [ ] Distinguish MOUSE vs CLICK
- [ ] Limit text content to 100 chars
- [ ] Preserve XPath/CSS when no GUESS

## Testing

Compare output with Virtuoso UI display:
1. Navigate to journey in Virtuoso UI
2. View "Steps" tab
3. Compare NLP output line-by-line
4. Verify all variables, selectors, and actions match