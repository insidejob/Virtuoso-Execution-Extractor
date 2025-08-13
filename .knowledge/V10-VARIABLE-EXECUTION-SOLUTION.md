# V10 Variable Extraction - Execution Data Integration

## Overview
V10 introduces execution data integration for variable extraction, using `sideEffects.usedData` to get actual runtime values and determine correct variable types.

## The Problem (Pre-V10)
- Variables extracted only from journey and environment data
- Missing runtime values from execution
- Incorrect Store operation types
- Missing API variables like $url

## The Solution

### 1. Architecture Changes

#### variable-extractor.js
```javascript
// Updated signature to accept execution data
extract(journeyData, environmentData, executionData = null) {
    // ... existing logic ...
    
    // NEW: Extract from execution sideEffects
    if (executionData) {
        this.extractExecutionVariables(executionData, journeyData, executionVars);
        this.mergeExecutionData(usedVars, dataAttributeVars, executionVars);
    }
}
```

#### extract-v10.js
```javascript
// Pass execution data to variable extractor
const variables = this.variableExtractor.extract(
    this.rawData.journey,
    this.rawData.environments,
    this.rawData.execution  // NEW: execution data
);
```

### 2. Execution Data Extraction

The `extractExecutionVariables` method navigates the execution structure:
```
execution.testSuites
  └── suite.testCases
      └── testCase.testSteps
          └── step.sideEffects.usedData
              └── { varName: value }
```

### 3. Variable Type Determination

Based on the stored value and context:

#### Store Operations
```javascript
determineVariableType(value, journeyStep) {
    if (journeyStep?.action === 'STORE') {
        // Element reference: JSON with selectors
        if (isJSON(value) && hasSelectors(value)) {
            return 'ELEMENT_REFERENCE';
        }
        
        // Element text: has element but simple string
        if (journeyStep.element && typeof value === 'string') {
            return 'ELEMENT_TEXT';
        }
        
        // Store value: direct value
        return 'LOCAL';
    }
}
```

#### Other Types
- **URL**: String matching `^https?://`
- **API_VARIABLE**: From API_CALL actions
- **LOCAL**: Default for other cases

### 4. Value Formatting

For element references, extract the text:
```javascript
formatVariableValue(value, varType) {
    if (varType === 'ELEMENT_REFERENCE') {
        const parsed = JSON.parse(value);
        return parsed.text || 'Element reference';
    }
    return value;
}
```

## Test Results

### Before V10
```json
{
  "total_used": 8,
  "$button": {
    "value": "Element selector variable",  // Wrong
    "type": "SELECTOR_VARIABLE"
  },
  "$button2": {
    "value": "Not set"  // Wrong
  }
  // Missing: $url
}
```

### After V10
```json
{
  "total_used": 9,
  "$button": {
    "value": "Accept all",
    "actualType": "ELEMENT_TEXT",
    "executionSource": true
  },
  "$button2": {
    "value": "Accept all",
    "actualType": "ELEMENT_REFERENCE",
    "executionSource": true
  },
  "$url": {
    "value": "https://reqres.in",
    "type": "URL",
    "source": "execution"
  }
}
```

## Key Patterns Discovered

### Store Element vs Store Element Text

#### Store Element (Reference)
- **Journey**: `{action: "STORE", element: {...}, variable: "button2"}`
- **Execution**: `{"button2": "{\"selectors\":[...],\"signature\":\"...\"}"}` 
- **Type**: ELEMENT_REFERENCE

#### Store Element Text
- **Journey**: `{action: "STORE", element: {...}, variable: "button"}`
- **Execution**: `{"button": "Accept all"}`
- **Type**: ELEMENT_TEXT

#### Store Value
- **Journey**: `{action: "STORE", value: "Test", variable: "test_var"}`
- **Execution**: `{"test_var": "Test"}`
- **Type**: LOCAL

### API Variables
- **Journey**: `{action: "API_CALL", apiTestId: 10253}`
- **Execution**: `{"url": "https://reqres.in"}`
- **Type**: URL or API_VARIABLE

## Implementation Files

1. **core/variable-extractor.js**
   - Added `extractExecutionVariables` method
   - Added `determineVariableType` method
   - Added `mergeExecutionData` method
   - Updated `extract` signature

2. **extract-v10.js**
   - Updated `processVariables` to pass execution data

## Known Issues

1. **GUESS variables**: May not always merge correctly with execution data
2. **Multiple uses**: When same variable used differently, last execution wins

## Benefits

1. **Accurate values**: Actual runtime values from execution
2. **Correct types**: Proper distinction between Store types
3. **Complete extraction**: Captures API variables like $url
4. **Execution tracking**: Shows which variables come from execution

## Status: IMPLEMENTED ✅

The V10 variable extraction now successfully integrates execution data, providing accurate runtime values and proper type classification for all variables.