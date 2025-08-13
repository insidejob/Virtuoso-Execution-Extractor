# Complete Plan for 100% Accuracy & File Structure

## What Else Goes in .accuracy/ Folder?

### Essential for 100% Accuracy

#### 1. validation.json (Enhanced Version)
```json
{
  "summary": {
    "totalSteps": 37,
    "successfulSteps": 35,
    "failedSteps": 2,
    "successRate": 94.6,
    "status": "PARTIAL_SUCCESS"
  },
  "unknownActions": {
    "SCROLL": {
      "count": 1,
      "firstOccurrence": "step_15",
      "checkpoint": "Check a Permit"
    },
    "HOVER": {
      "count": 1,
      "firstOccurrence": "step_22",
      "checkpoint": "Submit Form"
    }
  },
  "failedSteps": [
    {
      "stepNumber": 15,
      "checkpoint": "Check a Permit",
      "action": "SCROLL",
      "reason": "Unhandled action type",
      "impact": "Step skipped in NLP conversion",
      "rawData": {
        "action": "SCROLL",
        "target": "bottom",
        "value": "500px"
      }
    }
  ],
  "variableIssues": {
    "missing": [],
    "typeConflicts": [],
    "emptyFiltered": ["$Question27", "$QuestionType9", "$QuestionType10"]
  }
}
```

#### 2. failed-steps-detail.json (Only if failures exist)
```json
{
  "step_15": {
    "checkpoint": "Check a Permit",
    "originalStep": {
      "action": "SCROLL",
      "element": {...},
      "meta": {...}
    },
    "attemptedConversion": null,
    "error": "Unknown action type: SCROLL",
    "suggestion": "Add SCROLL handler to convertStepToNLP()"
  }
}
```

### NOT Needed Right Now
- ❌ selector-analysis.json - Overcomplicated
- ❌ performance-metrics.json - Not accuracy related
- ❌ data-quality-report.json - Nice to have, not essential

## Implementation Plan - Priority Order

### Phase 1: Fix Folder Structure (Quick Win) 🔥
**File:** `comprehensive-extraction-v9-final.js`

```javascript
// Fix 1: Unwrap API responses
async fetchProjectData(ids) {
    const endpoint = `/projects/${ids.project}`;
    const response = await this.fetchData(endpoint);
    
    // FIXED: Unwrap the response
    const data = response?.item || response;
    if (data) {
        console.log(`✅ Project: ${data.name}`);
    }
    return data;  // Return unwrapped
}

async fetchGoalData(ids, journeyData) {
    const endpoint = `/goals/${goalId}`;
    const response = await this.fetchData(endpoint);
    
    // FIXED: Unwrap the response
    const data = response?.item || response;
    if (data) {
        console.log(`✅ Goal: ${data.name}`);
    }
    return data;  // Return unwrapped
}

// Fix 2: Better folder names
createFolderStructure(ids, journeyData, executionData, goalData, projectData) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    
    // Use actual names with IDs
    const projectFolder = this.sanitizeFolderName(
        `${projectData?.name || 'project'}-${ids.project}`
    );
    const goalFolder = this.sanitizeFolderName(
        `${goalData?.name || 'goal'}-${goalData?.id || ids.journey}`
    );
    
    return path.join(
        'extractions',
        projectFolder,      // "ipermit-testing-4889"
        goalFolder,         // "2-permit-check-stage-8519"
        `${timestamp}-execution-${ids.execution}`
    );
}
```

### Phase 2: Restructure for Flags 
**New file:** `virtuoso-extractor-v10.js`

```javascript
class VirtuosoExtractorV10 {
    constructor(options = {}) {
        this.config = {
            generateNLP: options.nlp || false,
            extractVars: options.vars || false,
            saveValidation: options.validate || false,
            offline: options.offline || false,
            debug: options.debug || false
        };
        
        this.validation = {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: [],
            unknownActions: {},
            variableIssues: {}
        };
    }
    
    async extract(url) {
        // Step 1: ALWAYS save raw data
        const folderPath = await this.fetchAndSaveRawData(url);
        
        // Step 2: Optional processing
        if (this.config.generateNLP) {
            await this.generateNLP(folderPath);
        }
        
        if (this.config.extractVars) {
            await this.extractVariables(folderPath);
        }
        
        // Step 3: Save validation if needed
        if (this.shouldSaveValidation()) {
            await this.saveValidation(folderPath);
        }
        
        this.printSummary(folderPath);
    }
    
    shouldSaveValidation() {
        return (
            this.config.saveValidation ||  // User requested
            this.validation.failedSteps.length > 0 ||  // Had failures
            Object.keys(this.validation.unknownActions).length > 0  // Unknown actions
        );
    }
}
```

### Phase 3: Enhanced Validation Tracking

```javascript
convertStepToNLP(step, environmentData) {
    this.validation.totalSteps++;
    
    try {
        const nlpLine = this.processStep(step);
        if (nlpLine) {
            this.validation.successfulSteps++;
            return nlpLine;
        }
    } catch (error) {
        // Detailed failure tracking
        this.validation.failedSteps.push({
            stepNumber: this.validation.totalSteps,
            checkpoint: this.currentCheckpoint,
            action: step.action,
            reason: error.message,
            impact: "Step not converted to NLP",
            rawData: step
        });
        
        // Track unknown actions
        if (error.message.includes('Unknown action')) {
            if (!this.validation.unknownActions[step.action]) {
                this.validation.unknownActions[step.action] = {
                    count: 0,
                    firstOccurrence: `step_${this.validation.totalSteps}`,
                    checkpoint: this.currentCheckpoint
                };
            }
            this.validation.unknownActions[step.action].count++;
        }
        
        return `# [ERROR: ${error.message}]`;
    }
}
```

### Phase 4: File Consolidation

```javascript
async extractVariables(folderPath) {
    const rawData = this.loadRawData(folderPath);
    
    // Single consolidated output
    const variables = {
        metadata: {
            project: rawData.project.name,
            goal: rawData.goal.name,
            journey: rawData.journey.title,
            extractionDate: new Date().toISOString()
        },
        variables: {
            // Consolidated variable data
            "$username": {
                value: "Virtuoso1",
                type: "TEST_DATA",
                source: "dataAttributeValues",
                usage: "Login - email field"
            }
        },
        summary: {
            totalUsed: 11,
            byType: { TEST_DATA: 10, ENVIRONMENT: 1 },
            filteredEmpty: ["$Question27", "$QuestionType9", "$QuestionType10"]
        }
    };
    
    // One file instead of three
    fs.writeFileSync(
        path.join(folderPath, 'variables.json'),
        JSON.stringify(variables, null, 2)
    );
}
```

## Next Steps - Priority Order

### 1. Immediate Fixes (Today)
- [ ] Fix API response unwrapping (fetchProjectData, fetchGoalData)
- [ ] Update folder naming to include actual names
- [ ] Test with current journey to verify names appear

### 2. Core Restructure (Tomorrow)
- [ ] Create v10 with flag-based architecture
- [ ] Always save raw-data/
- [ ] Make NLP conditional on --nlp flag
- [ ] Make variables conditional on --vars flag

### 3. Accuracy Implementation (Day 3)
- [ ] Add enhanced validation tracking
- [ ] Create .accuracy/ folder conditionally
- [ ] Include detailed failure information
- [ ] Test with various journeys

### 4. File Consolidation (Day 4)
- [ ] Merge 3 variable files into 1
- [ ] Remove redundant files
- [ ] Clean up output structure

### 5. Testing for 100% Accuracy (Day 5)
- [ ] Test with multiple journey types
- [ ] Identify any missing action handlers
- [ ] Add handlers for SCROLL, HOVER, etc.
- [ ] Verify 100% success rate

## Command Line Interface

```bash
# V10 Usage Examples

# Just raw data (default)
node virtuoso-extractor-v10.js <url>
Output: /raw-data/ only

# With NLP
node virtuoso-extractor-v10.js <url> --nlp
Output: /raw-data/ + output.nlp.txt

# With Variables
node virtuoso-extractor-v10.js <url> --vars
Output: /raw-data/ + variables.json

# Both
node virtuoso-extractor-v10.js <url> --nlp --vars
Output: /raw-data/ + output.nlp.txt + variables.json

# Force validation output
node virtuoso-extractor-v10.js <url> --nlp --validate
Output: /raw-data/ + output.nlp.txt + .accuracy/

# Reprocess existing data
node virtuoso-extractor-v10.js /path/to/extraction --offline --vars
```

## Success Metrics

### How We Know We've Achieved 100% Accuracy

1. **validation.json shows:**
   - `successRate: 100`
   - `unknownActions: {}`
   - `failedSteps: []`

2. **All journeys convert successfully:**
   - Simple login flows ✓
   - Complex forms with conditions ✓
   - API calls ✓
   - Mouse actions ✓
   - Assertions ✓

3. **Variable extraction complete:**
   - All TEST_DATA captured with values ✓
   - All ENVIRONMENT variables found ✓
   - Empty variables filtered ✓
   - Types correctly identified ✓

## File Structure After Implementation

```
ipermit-testing-4889/                      # ✓ Has name!
└── 2-permit-check-stage-8519/             # ✓ Has name!
    └── 2025-08-11T20-10-06-execution-86332/
        ├── raw-data/                      # Always
        │   ├── journey.json
        │   ├── goal.json
        │   ├── project.json
        │   ├── execution.json
        │   └── environments.json
        ├── output.nlp.txt                 # With --nlp
        ├── variables.json                 # With --vars
        └── .accuracy/                     # If issues or --validate
            ├── validation.json
            └── failed-steps-detail.json   # If failures
```

## Bottom Line

For 100% accuracy, the `.accuracy/` folder needs:
1. **validation.json** - Overall metrics and issues
2. **failed-steps-detail.json** - Only if failures exist

That's it. Keep it simple, focused on accuracy, and only create files when there's something to investigate.