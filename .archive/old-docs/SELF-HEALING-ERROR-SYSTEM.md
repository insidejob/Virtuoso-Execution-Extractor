# Self-Healing & Error Reporting System

## Self-Healing Strategy

### 1. Unknown Action Types - AUTO-FIX
When we encounter an unknown action like `SCROLL`:

```javascript
// CURRENT: Fails silently or shows generic error
case 'SCROLL':
    // Unknown action

// SELF-HEALING: Generate handler automatically
handleUnknownAction(step) {
    const action = step.action;
    
    // 1. Generate basic handler
    const fallbackNLP = this.generateFallbackNLP(step);
    
    // 2. Log detailed fix instructions
    this.addFixInstruction({
        action: action,
        suggestedCode: `
case '${action}':
    const target = this.getSelectorDescription(selectors);
    const value = step.value || '';
    return \`${action.toLowerCase()} ${target} ${value}\`;`,
        location: 'convertStepToNLP() line 520',
        example: fallbackNLP
    });
    
    // 3. Use fallback for now
    console.warn(`⚠️ Unknown action '${action}' - using fallback handler`);
    return fallbackNLP;
}

// Fallback generation
generateFallbackNLP(step) {
    // Smart fallback based on action name
    const action = step.action.toLowerCase().replace('_', ' ');
    const target = this.getSelectorDescription(this.extractSelectors(step));
    const value = step.value || step.variable ? `$${step.variable}` : '';
    
    return `${action} ${target} ${value}`.trim();
}
```

### 2. Variable Extraction Issues - AUTO-DETECT & FIX

```javascript
// Detect common variable issues
detectVariableIssues(variables, rawData) {
    const issues = [];
    
    // Check for variables in steps but not in results
    rawData.journey.cases.forEach(testCase => {
        testCase.steps.forEach(step => {
            if (step.variable && !variables[`$${step.variable}`]) {
                issues.push({
                    type: 'MISSING_VARIABLE',
                    variable: step.variable,
                    location: `${testCase.title} - Step ${step.index}`,
                    fix: 'Check dataAttributeValues or environment variables',
                    autoFix: () => {
                        // Try to find in other sources
                        const value = this.searchForVariable(step.variable, rawData);
                        if (value) {
                            variables[`$${step.variable}`] = {
                                value: value,
                                type: 'AUTO_DISCOVERED',
                                source: 'Self-healing search'
                            };
                            return true;
                        }
                        return false;
                    }
                });
            }
        });
    });
    
    return issues;
}
```

### 3. Selector Extraction Failures - FALLBACK CHAIN

```javascript
extractSelectorsWithFallback(step) {
    const selectors = this.extractSelectors(step);
    
    // If no selectors found, try fallback chain
    if (!this.hasValidSelector(selectors)) {
        // Try 1: Element text
        if (step.element?.target?.text) {
            selectors.text = step.element.target.text;
            this.logFallback('Using element text as fallback');
        }
        // Try 2: Step value
        else if (step.value) {
            selectors.hint = step.value;
            this.logFallback('Using step value as fallback');
        }
        // Try 3: Generic description
        else {
            selectors.hint = `[${step.action} action]`;
            this.logFallback('Using generic action description');
        }
    }
    
    return selectors;
}
```

## Clear Error Reporting

### ERROR_REPORT.json Structure
```json
{
  "status": "PARTIAL_SUCCESS",
  "accuracy": "92%",
  "errors": [
    {
      "severity": "HIGH",
      "type": "UNKNOWN_ACTION",
      "action": "SCROLL",
      "occurrences": 2,
      "impact": "2 steps not converted to NLP",
      "locations": [
        "Check a Permit - Step 15",
        "Submit Form - Step 22"
      ],
      "fix": {
        "automatic": false,
        "instructions": "Add SCROLL handler to convertStepToNLP()",
        "suggestedCode": "case 'SCROLL':\n    return `Scroll ${this.getSelectorDescription(selectors)}`;",
        "file": "comprehensive-extraction-v10.js",
        "line": 520
      },
      "fallbackUsed": "scroll [element]"
    },
    {
      "severity": "MEDIUM",
      "type": "MISSING_VARIABLE_VALUE",
      "variable": "$customField",
      "impact": "Variable shown as 'Not set'",
      "fix": {
        "automatic": true,
        "applied": "Found value in environment variables",
        "value": "custom_value_123"
      }
    }
  ],
  "autoFixed": [
    {
      "issue": "Missing $customField value",
      "resolution": "Found in environment variables",
      "confidence": "HIGH"
    }
  ],
  "requiresAttention": [
    {
      "issue": "Unknown action: SCROLL",
      "userAction": "Review suggested code and add to parser",
      "priority": "HIGH"
    }
  ]
}
```

### Console Output for Errors

```javascript
printErrorSummary() {
    if (this.errors.length === 0) {
        console.log('\n✅ Extraction completed successfully (100% accuracy)\n');
        return;
    }
    
    console.log('\n⚠️  EXTRACTION COMPLETED WITH ISSUES\n');
    console.log('━'.repeat(60));
    console.log(`Accuracy: ${this.accuracy}%`);
    console.log(`Issues Found: ${this.errors.length}`);
    console.log(`Auto-Fixed: ${this.autoFixed.length}`);
    console.log('━'.repeat(60));
    
    // High priority issues
    const highPriority = this.errors.filter(e => e.severity === 'HIGH');
    if (highPriority.length > 0) {
        console.log('\n🔴 HIGH PRIORITY ISSUES (Require Manual Fix):\n');
        highPriority.forEach(error => {
            console.log(`  ${error.type}: ${error.action || error.variable}`);
            console.log(`  Impact: ${error.impact}`);
            console.log(`  Fix: ${error.fix.instructions}`);
            if (error.fix.suggestedCode) {
                console.log(`  Suggested Code:\n${this.indent(error.fix.suggestedCode, 4)}`);
            }
            console.log();
        });
    }
    
    // Auto-fixed issues
    if (this.autoFixed.length > 0) {
        console.log('\n✅ AUTO-FIXED ISSUES:\n');
        this.autoFixed.forEach(fix => {
            console.log(`  ✓ ${fix.issue}`);
            console.log(`    Resolution: ${fix.resolution}`);
        });
    }
    
    console.log('\n📁 Full error report: .accuracy/ERROR_REPORT.json');
    console.log('💡 To fix issues, see: .accuracy/FIX_INSTRUCTIONS.md\n');
}
```

## Folder Naming & Metadata

### Folder Structure (with underscores)
```
ipermit_testing_4889/                    # Underscores, not hyphens
└── 2_permit_check_stage_8519/          # Underscores
    └── 2025_08_11_20_10_06_execution_86332/
        ├── raw-data/
        ├── extraction-summary.json      # NEW: High-level metadata
        ├── output.nlp.txt
        ├── variables.json
        └── .accuracy/
            ├── validation.json
            ├── ERROR_REPORT.json
            └── FIX_INSTRUCTIONS.md
```

### extraction-summary.json (NEW FILE)
```json
{
  "extraction": {
    "timestamp": "2025-08-11T20:10:06Z",
    "version": "v10.0.0",
    "flags": ["--nlp", "--vars"],
    "accuracy": "100%",
    "status": "SUCCESS"
  },
  "project": {
    "id": 4889,
    "name": "iPermit Testing",
    "organization_id": 1964
  },
  "goal": {
    "id": 8519,
    "name": "2. Permit (Check Stage)",
    "url": "https://mobile-pretest.dev.iamtechapps.com/#/login"
  },
  "journey": {
    "id": 527256,
    "name": "Check a Permit",
    "checkpoints": 2,
    "totalSteps": 37
  },
  "execution": {
    "id": 86332,
    "status": "passed",
    "duration": "45s"
  },
  "statistics": {
    "variablesExtracted": 11,
    "variablesFiltered": 3,
    "nlpLinesGenerated": 949,
    "unknownActions": [],
    "autoFixesApplied": 0
  },
  "urls": {
    "virtuosoUI": "https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256",
    "apiBase": "https://api-app2.virtuoso.qa/api"
  }
}
```

## FIX_INSTRUCTIONS.md (Auto-generated)
```markdown
# Fix Instructions for Extraction Issues

## Unknown Actions Found

### SCROLL (2 occurrences)
**File:** comprehensive-extraction-v10.js
**Line:** 520 (in convertStepToNLP method)

Add this code:
```javascript
case 'SCROLL':
    const direction = step.meta?.direction || 'down';
    const amount = step.value || 'to element';
    return `Scroll ${direction} ${amount}`;
```

### HOVER (1 occurrence)
**File:** comprehensive-extraction-v10.js
**Line:** 520

Add this code:
```javascript
case 'HOVER':
    return `Hover over ${this.getSelectorDescription(selectors)}`;
```

## How to Apply Fixes

1. Open `comprehensive-extraction-v10.js`
2. Find the `convertStepToNLP()` method
3. Add the cases above to the switch statement
4. Re-run extraction with `--offline` flag

## Temporary Workaround
The extraction used fallback handlers for unknown actions.
Check the NLP output to verify the fallback descriptions are acceptable.
```

## Updated Implementation Plan

### Phase 1: Core Fixes (2 hours)
- [x] Fix API unwrapping
- [x] Folder naming with underscores
- [x] Add extraction-summary.json

### Phase 2: Self-Healing System (3 hours)
- [ ] Implement unknown action handler with fallback
- [ ] Add variable auto-discovery
- [ ] Create selector fallback chain
- [ ] Generate FIX_INSTRUCTIONS.md automatically

### Phase 3: Error Reporting (2 hours)
- [ ] Create ERROR_REPORT.json structure
- [ ] Implement clear console output
- [ ] Add severity levels (HIGH/MEDIUM/LOW)
- [ ] Show exact fix locations and code

### Phase 4: Testing & Validation (2 hours)
- [ ] Test with journey containing SCROLL/HOVER
- [ ] Test with missing variables
- [ ] Verify auto-fixes work
- [ ] Ensure 100% accuracy on known journeys

### Phase 5: Documentation (1 hour)
- [ ] Document folder naming convention
- [ ] Create troubleshooting guide
- [ ] Add examples of common fixes

## Benefits of This System

### For Users
1. **Clear errors** - Know exactly what failed and why
2. **Auto-fixes** - System fixes what it can automatically
3. **Instructions** - Exact code to add for manual fixes
4. **Fallbacks** - Extraction continues even with issues

### For Accuracy
1. **Nothing silently fails** - All issues tracked
2. **Progressive enhancement** - Fallback → Auto-fix → Manual fix
3. **Learning system** - Each fix improves future extractions

### For Maintenance
1. **Self-documenting** - Errors include fix instructions
2. **Traceable** - Know exactly where issues occurred
3. **Debuggable** - Full error context saved

## My Input

**Critical additions:**

1. **extraction-summary.json** is essential - gives high-level overview without digging through files
2. **Self-healing for unknown actions** - Use smart fallbacks so extraction doesn't fail
3. **FIX_INSTRUCTIONS.md** - Auto-generated exact code fixes
4. **Folder underscores** - Better compatibility (no spaces/special chars)

The key insight: **Make failures productive** - when something fails, generate the exact fix needed rather than just reporting an error. This turns every failure into a learning opportunity that improves the system.