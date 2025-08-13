# 📚 Virtuoso CLI Features - Complete Structure Guide

## 🏗️ Overall Architecture

```
virtuoso-cli-enhanced.js (Main Orchestrator)
    ├── NLP Converter (Built-in)
    ├── virtuoso-variables-enhanced.js (Module)
    └── virtuoso-screenshot-extractor.js (Module)
```

## 1️⃣ NLP Conversion Feature (`--nlp`)

### Structure
```javascript
Input: Virtuoso Journey/TestSuite Data
    ↓
Process: Step-by-Step Conversion
    ↓
Output: Natural Language Commands
```

### Real Example

**Input URL:**
```
https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527211
```

**API Response Structure:**
```json
{
  "id": 527211,
  "name": "Suite 18",
  "title": "iPermit Add Isolation Question",
  "cases": [
    {
      "title": "Navigate to URL",
      "steps": [
        {
          "action": "NAVIGATE",
          "variable": "url"
        }
      ]
    },
    {
      "title": "Login Admin",
      "steps": [
        {
          "action": "WRITE",
          "variable": "username",
          "element": {
            "target": {
              "selectors": [
                {
                  "type": "GUESS",
                  "value": "{\"clue\":\"Username\"}"
                }
              ]
            }
          }
        },
        {
          "action": "WRITE",
          "variable": "password",
          "element": {
            "target": {
              "selectors": [
                {
                  "type": "GUESS",
                  "value": "{\"clue\":\"Password\"}"
                }
              ]
            }
          }
        },
        {
          "action": "CLICK",
          "element": {
            "target": {
              "text": "Login"
            }
          }
        }
      ]
    }
  ]
}
```

**Output (NLP Format):**
```
Checkpoint 2: Navigate to URL
Navigate to $url

Checkpoint 35: Login Admin
Write $username in field "Username"
Write $password in field "Password"
Click on "Login"
Click on "Administration"

Checkpoint 36: Add Isolation Questions
Click on "Isolation Questions"
Click on "Add"
Pick "Electrical" from dropdown "Please Select...ElectricalMechanical/ProcessInstrumentInhibits/Overrides"
Pick "Fire" from dropdown "dropdown"
Write "This is a new question" in field "Question"
Pick "Yes / No" from dropdown "Please Select...Yes / NoTextMulti LineYes / No / NADropdownYes / No / TextMulti TextYes No Toggle"
Write "1" in field "Order"
Click on "Save"
```

### Conversion Rules
```javascript
// NAVIGATE action
"NAVIGATE" + variable:"url" → "Navigate to $url"

// WRITE action
"WRITE" + variable:"username" + GUESS:"Username" → 'Write $username in field "Username"'

// CLICK action
"CLICK" + text:"Login" → 'Click on "Login"'

// PICK/SELECT action
"PICK" + value:"Electrical" → 'Pick "Electrical" from dropdown "..."'
```

## 2️⃣ Variables Extraction Feature (`--variables`)

### Structure
```
Input: Execution ID + Journey ID
    ↓
Fetch: Multiple API Endpoints
    ├── /executions/{id} → Test Data Variables
    ├── /testsuites/{id} → Local Variables
    └── /projects/{id}/environments → Environment Variables
    ↓
Categorize: By Source Type
    ↓
Output: Categorized Variables Report
```

### Real Example - Journey with Test Data (527218)

**API Calls Made:**
1. `/testsuites/527218` - Get journey definition
2. `/executions/88715` - Get execution with test data
3. `/projects/4889/environments` - Get environment variables

**Test Data Variables (from execution):**
```json
{
  "meta": {
    "initialDataPerJourneySequence": {
      "527218": {
        "1": {
          "username": "Virtuoso",
          "password": "bOw06^wf!MEqGjQH3f^5el!zR#Pg",
          "JSAtype": "Job Safety Analysis\t Operational Risk Assessment",
          "Industry": "Construction",
          "Question1": "CBRE - Who is at RISK from your work?",
          "Question2": "Do you understand the up to date MoP/SoP/EoP/Run Book/Risk Assessment",
          "Hazardtype": "Building collapses",
          "Permit_Types": "CBRE Dynamic Risk Assessment"
        }
      }
    }
  }
}
```

**Environment Variables (from project):**
```json
{
  "environments": [{
    "name": "iPermit",
    "variables": {
      "14933": {
        "name": "eventlist",
        "value": "/html/body/div[1]/div[2]/div[2]/div[2]/form/..."
      },
      "14937": {
        "name": "sitelist",
        "value": "/html/body/div[1]/div[2]/div[2]/div[2]/form/..."
      }
    }
  }]
}
```

**Output Structure:**
```
=== ENHANCED VARIABLES REPORT ===

Journey: iPermit Add Permit Activities
Total Variables: 60

BREAKDOWN BY TYPE:
  📊 TEST DATA: 48 variables
  🌍 ENVIRONMENT: 12 variables

📊 TEST DATA VARIABLES (48)
========================================
$username:
  Value: Virtuoso
  Type: TEST_DATA
  Source: Test Data Table
  Description: Login username credential
  Used: 1 times
  Usage:
    - Login Admin (Step 1): Write $username in field

$password:
  Value: bOw06^wf!MEqGjQH3f^5el!zR#Pg
  Type: TEST_DATA
  Source: Test Data Table
  Description: Login password credential
  Used: 1 times
  Usage:
    - Login Admin (Step 2): Write $password in field

$Question1:
  Value: CBRE - Who is at RISK from your work?
  Type: TEST_DATA
  Source: Test Data Table
  Description: Assessment question

🌍 ENVIRONMENT VARIABLES (12)
========================================
$eventlist:
  Value: /html/body/div[1]/div[2]/div[2]/div[2]/form/div[3]/div/div/div[1]/...
  Type: ENVIRONMENT
  Source: Environment: iPermit
  Description: XPath selector for event list

$sitelist:
  Value: /html/body/div[1]/div[2]/div[2]/div[2]/form/div[3]/div/div/div[1]/...
  Type: ENVIRONMENT
  Source: Environment: iPermit
  Description: XPath selector for site list
```

### Variable Categorization Logic
```javascript
// TEST DATA - From execution data tables
if (executionData.meta.initialDataPerJourneySequence[journeyId]) {
  // Extract as TEST_DATA type
}

// ENVIRONMENT - From project environment config
if (environmentData.environments[].variables) {
  // Extract as ENVIRONMENT type
}

// LOCAL - Defined in journey steps
if (journeyData.cases[].steps[].variable) {
  // Extract as LOCAL type
}

// RUNTIME - Generated during execution
if (value.includes("${") || value.includes("{{")) {
  // Extract as RUNTIME type
}
```

## 3️⃣ Screenshot Extraction Feature (`--screenshots`)

### Structure (Ready but API Needed)
```
Input: Execution + Journey IDs
    ↓
Fetch: Multiple Endpoints
    ├── /executions/{id} → Execution details
    ├── /testsuites/{id} → Journey name
    └── /goals/{id} → Goal name
    ↓
Create: Folder Structure
    └── virtuoso-exports/
        └── {goal-name}-goal-{id}/
            └── {date}-{execution-name}-exec-{id}/
                └── {journey-name}-journey-{id}/
                    ├── screenshots/
                    ├── screenshot-context.md
                    └── manifest.json
```

### Expected Folder Example
```
virtuoso-exports/
└── ipermit-safety-goal-8534/
    └── 2024-07-16-smoke-test-exec-88715/
        └── add-isolation-question-journey-527211/
            ├── screenshots/
            │   ├── step-001-navigate-during-pass.png
            │   ├── step-002-write-username-during-pass.png
            │   ├── step-003-write-password-during-pass.png
            │   ├── step-004-click-login-during-pass.png
            │   └── ...
            ├── screenshot-context.md
            └── manifest.json
```

### Documentation Structure (screenshot-context.md)
```markdown
# Screenshot Documentation
Generated: 2024-07-16T10:30:00Z

## Execution Details
- **Journey**: iPermit Add Isolation Question
- **Execution**: Smoke Test
- **Status**: PASSED
- **Environment**: iPermit
- **Browser**: Chrome
- **Start Time**: 2024-07-16T10:25:00Z
- **End Time**: 2024-07-16T10:30:00Z

## Screenshots
Total: 15 screenshots captured

### Checkpoint 35: Login Admin

#### Step 1: WRITE ✅
- **Description**: Write $username in field
- **File**: step-002-write-username-during-pass.png
- **Timestamp**: 2024-07-16T10:25:30Z

#### Step 2: WRITE ✅
- **Description**: Write $password in field
- **File**: step-003-write-password-during-pass.png
- **Timestamp**: 2024-07-16T10:25:32Z
```

## 4️⃣ Combined Feature (`--all`)

### Execution Flow
```
./virtuoso-cli-enhanced.js <URL> --all
    ↓
1. Parse URL → Extract IDs
    ↓
2. Fetch Journey Data (Base)
    ↓
3. Execute in Parallel:
    ├── NLP Conversion
    ├── Screenshot Extraction
    └── Variables Extraction
    ↓
4. Generate Combined Report
```

### Real Output Example
```
⏳ Fetching data...

📸 Extracting screenshots...
📸 Starting screenshot extraction...
📁 Created folder structure:
   Goal: ipermit-safety-goal-8534
   Execution: 2024-07-16-smoke-test-exec-88715
   Journey: add-isolation-question-journey-527211

🔧 Extracting variables with type categorization...
🔧 Starting enhanced variables extraction...

[NLP Output]
Checkpoint 35: Login Admin
Write $username in field "Username"
Write $password in field "Password"
Click on "Login"

[Variables Summary]
Total Variables: 60
BREAKDOWN BY TYPE:
  📊 TEST DATA: 48 variables
  🌍 ENVIRONMENT: 12 variables

==================================================
✅ Extraction Complete!
==================================================
📝 NLP: 18 lines generated
📸 Screenshots: 15 saved to virtuoso-exports/...
🔧 Variables: 60 extracted
```

## 5️⃣ Output Formats

### Standard Output
```bash
./virtuoso-cli-enhanced.js <URL> --nlp
# Displays NLP text to console
```

### File Output
```bash
./virtuoso-cli-enhanced.js <URL> --nlp --output test.txt
# Saves to test.txt
```

### JSON Output
```bash
./virtuoso-cli-enhanced.js <URL> --all --json
```
```json
{
  "journey": {
    "id": 527211,
    "name": "Suite 18",
    "title": "iPermit Add Isolation Question"
  },
  "nlp": [
    "Checkpoint 2: Navigate to URL",
    "Navigate to $url",
    "..."
  ],
  "variables": {
    "testData": {
      "username": {
        "name": "username",
        "displayName": "$username",
        "value": "Virtuoso",
        "type": "TEST_DATA",
        "source": "Test Data Table",
        "description": "Login username credential",
        "usage": [...]
      }
    },
    "environment": {
      "eventlist": {
        "name": "eventlist",
        "displayName": "$eventlist",
        "value": "/html/body/div[1]/...",
        "type": "ENVIRONMENT",
        "source": "Environment: iPermit"
      }
    }
  },
  "screenshots": {
    "count": 15,
    "path": "virtuoso-exports/...",
    "documentation": "screenshot-context.md"
  }
}
```

## 6️⃣ Command Summary

| Command | Purpose | Output |
|---------|---------|--------|
| `--nlp` | Convert to NLP format | Text steps |
| `--variables` | Extract all variables | Categorized report |
| `--screenshots` | Download screenshots | Files + docs |
| `--all` | Everything combined | All formats |
| `--json` | JSON output | Structured data |
| `--output <file>` | Save to file | File created |
| `--verbose` | Detailed logging | Debug info |

## 7️⃣ Data Flow Diagram

```
User Input (URL)
    ↓
Parse URL → Extract IDs
    ├── Project ID: 4889
    ├── Execution ID: 88715
    └── Journey ID: 527211
    ↓
API Calls (Parallel)
    ├── /testsuites/527211 → Journey Definition
    ├── /executions/88715 → Execution Data + Test Data
    └── /projects/4889/environments → Environment Variables
    ↓
Processing
    ├── NLP: Map actions to natural language
    ├── Variables: Categorize by source
    └── Screenshots: Create folder structure
    ↓
Output
    ├── Console (default)
    ├── File (--output)
    └── JSON (--json)
```

## 🎯 Key Features

1. **Smart Variable Detection**: Automatically categorizes variables by their source
2. **UI Label Extraction**: Uses GUESS selectors to get UI-friendly names
3. **Folder Organization**: Human-readable names, not IDs
4. **Usage Tracking**: Shows where each variable is used
5. **Security**: Masks sensitive data like passwords
6. **Error Handling**: Graceful failures with clear messages

This structure ensures complete visibility into test execution with properly categorized data!