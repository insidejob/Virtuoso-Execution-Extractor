# 🚀 Virtuoso CLI Wrapper - Implementation Guide

## What This Solves

**Before CLI Wrapper:**
- 20+ different scripts to remember
- Inconsistent command formats
- No fallback mechanisms
- Manual discovery of API changes
- Confusion about which script to use

**After CLI Wrapper:**
- 1 command: `virtuoso`
- Consistent flag-based interface
- Automatic fallbacks
- Self-updating knowledge base
- Always know exactly what to run

## Installation

```bash
# Install dependencies
npm install commander chalk

# Make CLI executable
chmod +x virtuoso-cli.js

# Create global link (optional)
npm link

# Now you can use 'virtuoso' from anywhere!
```

## Core Commands & Examples

### 1. Extract Journey Data (Your Main Use Case)

```bash
# Quick extraction
virtuoso extract journey 527286 --basic

# Detailed with all steps and checkpoints  
virtuoso extract journey 527286 --detailed

# With natural language descriptions
virtuoso extract journey 527286 --nlp
# Output: "User navigates to login → Enters credentials → Clicks submit → Sees welcome"

# Including screenshots and visual data
virtuoso extract journey 527286 --screenshots

# Everything available
virtuoso extract journey 527286 --comprehensive

# Force specific extraction method
virtuoso extract journey 527286 --method browser  # Use browser console
virtuoso extract journey 527286 --method api     # Use API (needs proper token)
virtuoso extract journey 527286 --method auto    # Try API, fallback to browser
```

### 2. Test API Endpoints

```bash
# Quick connectivity test
virtuoso test --basic
# Output: ✅ API accessible, ✅ Token valid, ✅ 47/47 endpoints responding

# Test specific endpoints
virtuoso test user projects goals

# Comprehensive test with schema updates
virtuoso test all --comprehensive --update-schema

# Verbose output showing all details
virtuoso test all --verbose
```

### 3. Search API Documentation

```bash
# Simple search
virtuoso search "execute goal"

# With code examples
virtuoso search "testsuites" --examples

# With curl commands
virtuoso search "checkpoints" --curl

# With JavaScript code
virtuoso search "journey steps" --code

# Different output formats
virtuoso search "authentication" --format json
virtuoso search "endpoints" --format markdown
```

### 4. Validate Everything

```bash
# Validate all endpoints
virtuoso validate endpoints

# Comprehensive validation with auto-fix
virtuoso validate all --comprehensive --fix

# Validate schema
virtuoso validate schema
```

### 5. Discover New APIs

```bash
# Quick discovery
virtuoso discover

# Deep discovery with testing
virtuoso discover --deep --test-new

# Discover and update schema
virtuoso discover --deep --update-schema
```

### 6. Authentication Management

```bash
# Check current auth status
virtuoso auth check
# Output: ❌ Current token is UI token, not API token
#         💡 Get API token at: https://app2.virtuoso.qa/#/settings/api

# Setup new token
virtuoso auth setup --token "your-new-api-token"

# Test authentication
virtuoso auth test
```

### 7. Map IDs Between Entities

```bash
# Map journey to all related endpoints
virtuoso map journey 527286
# Output: Journey 527286 maps to:
#   - TestSuite ID: 527286
#   - GET /api/testsuites/527286
#   - GET /api/testsuites/527286/steps
#   - GET /api/testsuites/527286/checkpoints

# Map goal to endpoints
virtuoso map goal 8519

# Map project to endpoints  
virtuoso map project 4889
```

### 8. System Status

```bash
# Quick status
virtuoso status --basic
# Output: API: ✅  Auth: ❌  Schema: ✅  Endpoints: 45/47

# Detailed status
virtuoso status --detailed
```

### 9. Update Knowledge Base

```bash
# Update everything
virtuoso update knowledge

# Update just schema
virtuoso update schema

# Update examples
virtuoso update examples
```

### 10. Export Documentation

```bash
# Export as JSON
virtuoso export json --output my-api-docs.json

# Export as Markdown documentation
virtuoso export markdown --output API-DOCS.md

# Export as OpenAPI spec
virtuoso export openapi --output openapi.yaml

# Export as Postman collection
virtuoso export postman --output postman-collection.json
```

## Real-World Workflows

### Daily API Health Check
```bash
#!/bin/bash
# daily-check.sh
virtuoso status --basic
virtuoso test all --basic
virtuoso validate endpoints
```

### Extract All Journeys in a Project
```bash
# List all journey IDs, then extract each
virtuoso search "project 4889 journeys" --format json | \
  jq -r '.journeys[].id' | \
  xargs -I {} virtuoso extract journey {} --basic
```

### Complete System Sync
```bash
# Discover, test, validate, and document everything
virtuoso discover --deep --update-schema && \
virtuoso test all --comprehensive && \
virtuoso validate all --fix && \
virtuoso export markdown --output LATEST-DOCS.md
```

### Debug Authentication Issues
```bash
# Full auth debugging workflow
virtuoso auth check
virtuoso test auth --verbose
virtuoso extract journey 527286 --method browser  # Fallback if API auth fails
```

## Configuration

The CLI stores configuration in `.virtuoso-cli-config.json`:

```json
{
  "token": "your-api-token",
  "environment": "app2",
  "baseUrl": "https://app2.virtuoso.qa",
  "defaultFormat": "json",
  "autoFallback": true
}
```

## Environment Variables

```bash
# Set default token
export VIRTUOSO_API_TOKEN="your-token"

# Set default environment
export VIRTUOSO_ENV="app2"

# Set output format
export VIRTUOSO_OUTPUT="json"
```

## Benefits Summary

### 1. **Predictability**
Every command follows the same pattern:
```
virtuoso <command> <target> --<flags>
```

### 2. **Intelligence**
The CLI knows about:
- Journey = TestSuite mapping
- UI token vs API token differences
- Fallback methods when one fails
- Schema changes and updates

### 3. **Efficiency**
- One command replaces 20+ scripts
- Automatic retries and fallbacks
- Batch operations support
- Parallel execution where possible

### 4. **Documentation**
The CLI itself is documentation:
```bash
virtuoso --help              # General help
virtuoso extract --help      # Extract command help
virtuoso test --help        # Test command help
```

### 5. **Extensibility**
Easy to add new commands:
```javascript
// Add a new command in virtuoso-cli.js
program
  .command('analyze <journey>')
  .description('Analyze journey performance')
  .action(async (journey) => {
    // Your analysis logic
  });
```

## Migration Path

### Phase 1: Run alongside existing scripts
```bash
# Keep using existing scripts
node extract-journey-data.js 527286

# Start using CLI for new tasks
virtuoso extract journey 527286 --basic
```

### Phase 2: Gradual migration
```bash
# Replace script usage one by one
# Old: node src/search.js "execute goal"
# New: virtuoso search "execute goal"
```

### Phase 3: Full CLI adoption
```bash
# All operations through CLI
virtuoso extract journey 527286 --comprehensive
virtuoso test all --verbose
virtuoso discover --deep --update-schema
```

## Quick Start Right Now

```bash
# 1. Test it immediately
node virtuoso-cli.js extract journey 527286 --basic

# 2. Check your authentication
node virtuoso-cli.js auth check

# 3. Search for something
node virtuoso-cli.js search "testsuites"

# 4. See system status
node virtuoso-cli.js status --basic
```

## Why This Is 100x Better

**Without CLI Wrapper:**
```bash
# Which script do I use?
ls *.js | grep extract
# extract-journey-data.js? EXTRACT-NOW.js? browser-journey-extractor.js?

# Try one...
node extract-journey-data.js 527286
# Error: Invalid token

# Try another...
node browser-journey-extractor.js
# Error: Not meant to run in Node

# Give up and check documentation...
```

**With CLI Wrapper:**
```bash
virtuoso extract journey 527286
# Automatically tries API, falls back to browser method, provides clear instructions
```

The CLI wrapper transforms your collection of scripts into a **professional, production-ready tool** that anyone can use confidently.