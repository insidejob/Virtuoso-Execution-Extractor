# Virtuoso API V10 - Project Guide

## Overview
This project extracts Virtuoso test execution data and converts it to NLP format with 100% accuracy focus.

## Quick Start

```bash
# Extract journey data with NLP conversion and variables
node extract-v10.js --nlp --vars --validate

# With custom URL
node extract-v10.js --nlp --vars --validate --url https://app2.virtuoso.qa/#/project/4889/execution/173661/journey/612731
```

## Project Structure

```
virtuoso-api/
├── extract-v10.js              # Main V10 extractor
├── core/                       # Core V10 modules
│   ├── nlp-converter.js        # NLP conversion engine
│   ├── variable-extractor.js   # Variable extraction
│   ├── validator.js            # Data validation
│   └── folder-structure.js     # Folder naming
├── intelligence/               # Intelligence modules
│   ├── self-healing.js         # Self-healing for unknown actions
│   └── knowledge-base.js       # Knowledge base system
├── config/                     # Configuration
│   └── v10-credentials.json    # API credentials
├── .knowledge/                 # Knowledge base
│   ├── nlp-syntax-patterns.md  # NLP syntax reference
│   └── action-handlers/        # Action-specific handlers
├── extractions/                # Extracted data
└── .archive/                   # Archived legacy files
```

## Configuration

### API Token
Update `config/v10-credentials.json`:
```json
{
  "apiToken": "your-token-here",
  "baseUrl": "https://api.virtuoso.qa/api"
}
```

## Features

### NLP Conversion (--nlp)
- Converts API data to Virtuoso NLP syntax
- 85%+ accuracy with current API data
- Self-healing for unknown actions

### Variable Extraction (--vars)
- Extracts all variables used in tests
- Shows variable values from environment
- Identifies unused variables

### Validation (--validate)
- Validates NLP syntax patterns
- Checks for missing data
- Reports conversion accuracy

## Known Limitations

### API Data Gaps
1. **API Test Names**: Only IDs available, names require separate fetch
2. **Cookie vs Environment**: Mapping rules unclear
3. **Missing Steps**: Some steps may be missing from API

### Required Improvements
- Fetch API test details separately
- Determine Cookie/Environment rules
- Handle missing step data gracefully

## NLP Syntax Requirements

### Critical Patterns
- Store: `Store value "X" in $var` (NOT "as")
- Assert: `Assert that element "X" does not exist on page`
- Expression: `Assert ${1 + 2} equals "3"` (NOT quotes)
- Scroll: `Scroll by 50, 50` (comma-separated)
- Cookie: `Cookie create "X" as "Y"`

See `.knowledge/nlp-syntax-patterns.md` for complete reference.

## Troubleshooting

### Authentication Error
```
Error: Authentication failed
```
Solution: Update token in `config/v10-credentials.json`

### Journey Not Found
```
Error: Journey endpoint returned 404
```
Solution: Journey might be a testsuite, extractor handles this automatically

### Missing NLP Data
Some NLP conversions show IDs instead of names. This is due to missing API data that requires additional fetches.

## Development

### Adding New Action Handlers
1. Add handler to `core/nlp-converter.js`
2. Update knowledge base in `.knowledge/action-handlers/`
3. Test with real journey data

### Self-Healing System
Unknown actions are handled by:
1. Checking knowledge base
2. Applying self-healing patterns
3. Logging for future learning

## Support

For issues or questions:
- Check `.knowledge/` folder for patterns
- Review V10 documentation files
- Test with `--validate` flag for diagnostics