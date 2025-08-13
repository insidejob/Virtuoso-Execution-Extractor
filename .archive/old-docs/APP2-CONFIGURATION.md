# 🧪 App2 Demo Environment Configuration

## ✅ IMPORTANT: App2 is the Default Demo Environment

This system is configured to use **app2.virtuoso.qa** as the primary demo environment for all testing and development. This ensures safety and prevents accidental modifications to production data.

## 📋 Configuration Details

### Environment: App2 (Demo)
- **Base URL**: https://app2.virtuoso.qa
- **API URL**: https://app2.virtuoso.qa/api
- **Organization ID**: 1964
- **Environment Type**: Demo (Safe for Testing)
- **Confirmation Required**: No
- **Default Token**: `86defbf4-62a7-4958-a0b4-21af0dee5d7a`

### 🔐 Authentication
```bash
# Demo token for app2 (Organization 1964)
export VIRTUOSO_API_TOKEN="86defbf4-62a7-4958-a0b4-21af0dee5d7a"

# Organization ID
export VIRTUOSO_ORG_ID="1964"

# Environment (defaults to app2)
export VIRTUOSO_ENV="app2"
```

## ⚠️ Environment Safety System

### Automatic Confirmation Prompts

The system will **automatically prompt for Y/N confirmation** when attempting to use any non-demo environment:

| Environment | URL | Requires Confirmation | Warning Level |
|------------|-----|----------------------|---------------|
| **app2** | app2.virtuoso.qa | ❌ No | 🧪 Demo (Safe) |
| app | app.virtuoso.qa | ✅ Yes | ⚠️ PRODUCTION |
| app-staging | app-staging.virtuoso.qa | ✅ Yes | ⚠️ Staging |
| local | localhost:3000 | ❌ No | 🧪 Local (Safe) |

### Example Confirmation Prompt

When attempting to use production environment:
```
============================================================
⚠️  WARNING: This is the PRODUCTION environment. Are you sure you want to continue?
============================================================
Environment: Production Environment
URL: https://app.virtuoso.qa
Description: Live production environment - use with caution
============================================================

Do you want to continue? (Y/N): _
```

## 🚀 Quick Start with App2

### 1. Using the Master Control Center
```bash
# No configuration needed - uses app2 by default
npm start

# The system will automatically:
# - Connect to app2.virtuoso.qa
# - Use organization 1964
# - Apply the demo token
```

### 2. Direct API Testing
```bash
# Test connection to app2
node test-app2-connection.js

# Validate all endpoints on app2
npm run validate

# Discover endpoints on app2
npm run discover
```

### 3. Search and Reference
```bash
# Search works with app2 URLs
npm run search

# Examples will use app2.virtuoso.qa URLs
npm run demo
```

## 📊 API Endpoints on App2

All endpoints are prefixed with `https://app2.virtuoso.qa/api`:

### Core Endpoints
- `GET /api/user` - Get authenticated user details
- `GET /api/projects` - List projects in organization 1964
- `GET /api/projects/{id}/goals` - List goals in a project
- `GET /api/projects/{id}/jobs` - List active jobs
- `GET /api/projects/{id}/snapshots` - List snapshots
- `POST /api/goals/{id}/execute` - Execute test journeys
- `GET /api/organizations/1964` - Organization details

### Example CURL Commands for App2
```bash
# Get user info
curl -H "Authorization: Bearer 86defbf4-62a7-4958-a0b4-21af0dee5d7a" \
     https://app2.virtuoso.qa/api/user

# List projects
curl -H "Authorization: Bearer 86defbf4-62a7-4958-a0b4-21af0dee5d7a" \
     https://app2.virtuoso.qa/api/projects

# Get organization 1964 details
curl -H "Authorization: Bearer 86defbf4-62a7-4958-a0b4-21af0dee5d7a" \
     https://app2.virtuoso.qa/api/organizations/1964
```

## 🔄 Switching Environments (With Safety)

### Using Environment Manager
```javascript
const EnvironmentManager = require('./src/environment-manager');
const manager = new EnvironmentManager();

// Set to app2 (no confirmation)
await manager.setEnvironment('app2');  // ✅ Immediate

// Attempt production (requires confirmation)
await manager.setEnvironment('app');   // ⚠️ Prompts Y/N
```

### Command Line
```bash
# Check current environment
node src/environment-manager.js status

# Set to app2 (safe)
node src/environment-manager.js set app2

# Attempt production (will prompt)
node src/environment-manager.js set app
```

## 🛡️ Safety Features

### 1. **Default to Demo**
- System always defaults to app2
- No accidental production access
- Demo token pre-configured

### 2. **Confirmation Guards**
- Y/N prompt for non-demo environments
- Clear warning messages
- Environment type indicators (🧪 vs ⚠️)

### 3. **Visual Indicators**
```
🧪 Demo Environment (Safe)
⚠️  Production Environment (Danger)
✅ No confirmation needed
❌ Confirmation required
```

### 4. **Automatic Detection**
- URLs are checked against environment configs
- Tokens validated for environment type
- Organization ID verification

## 📝 Configuration Files

### `/config/app2-config.json`
Contains all environment definitions and safety rules:
```json
{
  "defaultEnvironment": "app2",
  "environments": {
    "app2": {
      "isDemoEnvironment": true,
      "requiresConfirmation": false,
      "organizationId": 1964
    }
  }
}
```

### `/src/environment-manager.js`
Handles environment switching and confirmation prompts:
- Validates environment selection
- Prompts for confirmation when needed
- Manages API configuration

## ✅ Verification Tests

Run these tests to verify app2 configuration:

```bash
# Test environment manager
node src/environment-manager.js test

# Test app2 connection
node test-app2-connection.js

# Test confirmation system
node test-environment-confirmation.js
```

Expected results:
- ✅ Default environment is app2
- ✅ App2 requires no confirmation
- ✅ Production requires Y/N confirmation
- ✅ Token validates for app2
- ✅ Organization 1964 is accessible

## 🚨 Important Notes

1. **Always use app2 for testing** - It's the designated demo environment
2. **Never bypass confirmation prompts** - They protect production data
3. **Organization 1964** - This is the demo organization on app2
4. **Token is environment-specific** - The provided token only works on app2
5. **Check environment before operations** - Use `npm run status` to verify

## 📞 Support

If you need to:
- Access a different organization: Update `organizationId` in config
- Use a different token: Set `VIRTUOSO_API_TOKEN` environment variable
- Disable confirmations (NOT RECOMMENDED): Set `skipConfirmation: true` in options

---

**Remember**: App2 is your safe playground. All examples, tests, and demos use app2.virtuoso.qa by default!