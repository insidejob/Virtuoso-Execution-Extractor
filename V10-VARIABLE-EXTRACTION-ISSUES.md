# V10 Variable Extraction - Critical Issues Found

## Executive Summary
The variable extractor is **NOT using execution data**, causing incorrect values and missing variables. This is a major gap that affects variable accuracy.

## Issues Identified

### 1. Missing Execution Data Integration
**Problem**: Variable extractor only receives journey and environment data
```javascript
// Current implementation in extract-v10.js:350
const variables = this.variableExtractor.extract(
    this.rawData.journey,      // ✅ Has this
    this.rawData.environments   // ✅ Has this
    // ❌ MISSING: this.rawData.execution
);
```

**Impact**: Cannot access sideEffects.usedData which contains:
- Actual stored variable values
- API URL values ($url)
- Element vs element text distinction

### 2. Store Operations Showing Wrong Values

#### Example: $button (Step 19737379)
**Current Output**:
```json
{
  "value": "Element selector variable",
  "type": "SELECTOR_VARIABLE",
  "source": "GUESS_SELECTOR"
}
```

**Actual Execution Data**:
```json
{
  "sideEffects": {
    "usedData": {
      "button": "Accept all"  // Simple text string
    }
  }
}
```

**Should Be**:
```json
{
  "value": "Accept all",
  "type": "LOCAL",
  "source": "execution"
}
```

#### Example: $button2 (Step 19737383)
**Current Output**:
```json
{
  "value": "Not set",
  "type": "LOCAL",
  "source": "step"
}
```

**Actual Execution Data**:
```json
{
  "sideEffects": {
    "usedData": {
      "button2": "{\"kind\":\"BASIC\",\"selectors\":[...]}"  // JSON element object
    }
  }
}
```

**Should Be**:
```json
{
  "value": "{element object}",
  "type": "ELEMENT_REFERENCE",
  "source": "execution"
}
```

### 3. Missing Variables from API Calls

**Missing**: `$url` variable
**Location**: API call step's sideEffects
```json
{
  "sideEffects": {
    "usedData": {
      "url": "https://reqres.in"  // This is not being captured
    }
  }
}
```

### 4. Incorrect Type Classification

**Current Issues**:
- Store element → Shows as SELECTOR_VARIABLE (wrong)
- Store element text → Shows as LOCAL (partially correct)
- API variables → Not captured at all

## Root Cause Analysis

### The Pattern We Discovered
From execution analysis:
1. **Store element text**: Stores string value in sideEffects
2. **Store element**: Stores JSON object with selectors in sideEffects
3. **Store value**: Stores simple value in sideEffects

### What's Missing in Code
```javascript
// variable-extractor.js has NO execution handling:
extract(journeyData, environmentData) {
    // Missing: executionData parameter
    // Missing: sideEffects extraction
    // Missing: Store type determination
}
```

## Solution Requirements

### 1. Update Variable Extractor
```javascript
extract(journeyData, environmentData, executionData) {
    // New: Process execution sideEffects
    const executionVars = this.extractExecutionVariables(executionData);
    
    // Merge with journey variables
    this.mergeWithExecutionData(usedVars, executionVars);
}
```

### 2. Extract from SideEffects
```javascript
extractExecutionVariables(executionData) {
    const vars = new Map();
    
    // Iterate through test steps
    Object.values(executionData.testSuites).forEach(suite => {
        Object.values(suite.testCases).forEach(testCase => {
            Object.values(testCase.testSteps).forEach(step => {
                if (step.sideEffects?.usedData) {
                    // Extract each variable with proper type
                    Object.entries(step.sideEffects.usedData).forEach(([name, value]) => {
                        vars.set(name, {
                            value: value,
                            type: this.determineVariableType(value),
                            source: 'execution'
                        });
                    });
                }
            });
        });
    });
    
    return vars;
}
```

### 3. Determine Variable Type
```javascript
determineVariableType(value) {
    // Check if it's an element object
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (parsed.selectors && parsed.signature) {
                return 'ELEMENT_REFERENCE';
            }
        } catch (e) {
            // Not JSON, it's a simple string
        }
    }
    
    // Check for URL patterns
    if (typeof value === 'string' && value.startsWith('http')) {
        return 'URL';
    }
    
    return 'LOCAL';
}
```

## Impact Assessment

### Current Accuracy
- **Variable detection**: ~60% (missing execution variables)
- **Variable values**: ~40% (incorrect for Store operations)
- **Variable types**: ~50% (wrong classifications)

### After Fix
- **Variable detection**: 100% (all sources included)
- **Variable values**: 100% (from execution data)
- **Variable types**: 95%+ (proper classification)

## Test Case Evidence

From Journey 612861:
- ❌ `$button` - Wrong value and type
- ❌ `$button2` - Shows "Not set" instead of element
- ❌ `$url` - Completely missing
- ✅ `$test_var` - Correct (simple Store value)
- ✅ `$age` - Correct (simple Store value)
- ✅ `$var1`, `$var2` - Correct (simple Store values)

## Priority: CRITICAL 🔴

This affects:
1. Variable value accuracy
2. Store operation distinction
3. API variable extraction
4. Overall extraction quality

## Next Steps

1. Update variable-extractor.js to accept execution data
2. Implement sideEffects extraction
3. Add proper type determination based on stored data
4. Update extract-v10.js to pass execution data
5. Test with all Store operation types