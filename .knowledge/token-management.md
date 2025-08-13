# Token Management Knowledge

## Current Working Token
**Token**: `a29eaf70-2a14-41aa-9a14-06bb3381cdce`
**Location**: `config/v10-credentials.json`
**Status**: CONFIRMED WORKING (2025-08-11)

## Important Notes

### DO NOT Update Old Files
The following files contain old tokens but should NOT be updated:
- `comprehensive-extraction-v*.js` (V1-V9 are legacy)
- Old test files
- Historical documentation

These are kept for historical reference and are not used by V10.

### V10 Token System
V10 uses a centralized configuration system:
1. Token stored in `config/v10-credentials.json`
2. Automatically loaded by `extract-v10.js`
3. No hardcoded tokens in V10 code

### Token Update Process
When token expires:
1. Get new token from browser DevTools
2. Update `config/v10-credentials.json`
3. Test with `node test-api-token.js`
4. No code changes needed

### Key Discovery
Journeys in the UI are actually "testsuites" in the API:
- UI shows: `/journey/612731`
- API uses: `/testsuites/612731`

V10 automatically handles this by trying testsuite endpoint first.

## Token History
- Old token (expired): `2d313def-7ec2-4526-b0b6-57028c343aba`
- New token (working): `a29eaf70-2a14-41aa-9a14-06bb3381cdce`

## Test Commands
```bash
# Test token validity
node test-api-token.js

# Test specific journey/testsuite
node test-journey-endpoint.js

# Full extraction test
node extract-v10.js <url> --nlp --vars --validate
```