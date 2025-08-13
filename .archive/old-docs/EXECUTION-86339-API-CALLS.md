# 🎯 Extracting Data from Execution 86339

## Execution URL Analysis
```
https://app2.virtuoso.qa/#/project/4889/execution/86339/journey/527257
```

**Components:**
- Project ID: 4889
- Execution ID: 86339 (specific test run)
- Journey ID: 527257 (the journey that was executed)

## Key Difference: Execution vs Journey Data

### Journey Data (What we extracted before):
- **Definition**: The test template/blueprint
- **Static**: Doesn't change between runs
- **Content**: Steps to perform, expected results

### Execution Data (What we're extracting now):
- **Results**: What actually happened during test run
- **Dynamic**: Unique to each execution
- **Content**: Pass/fail status, timings, screenshots, errors

## 🔥 Primary API Calls for Execution 86339

### 1. Get Execution Overview
```http
GET https://api-app2.virtuoso.qa/api/executions/analysis/86339
Authorization: Bearer {{api_token}}
X-Virtuoso-Client-ID: {{client_id}}
X-Virtuoso-Client-Name: Virtuoso UI
```

**Returns**: High-level execution summary with pass/fail counts

### 2. Get Execution Status
```http
GET https://api-app2.virtuoso.qa/api/jobs/86339/status
Authorization: Bearer {{api_token}}
```

**Returns**: Current execution status (running/completed/failed)

### 3. Get Journey Structure with Execution Context
```http
GET https://api-app2.virtuoso.qa/api/testsuites/527257?executionId=86339
Authorization: Bearer {{api_token}}
```

**Returns**: Journey structure with execution-specific data

### 4. Get Step-by-Step Execution Results
```http
GET https://api-app2.virtuoso.qa/api/executions/86339/suites/527257/results
Authorization: Bearer {{api_token}}
```

**Returns**: Detailed results for each step in the execution

### 5. Get Checkpoint Execution Results
For each checkpoint in the journey:
```http
GET https://api-app2.virtuoso.qa/api/executions/86339/suites/527257/cases/{checkpointId}/results
Authorization: Bearer {{api_token}}
```

### 6. Get Individual Step Execution Detail
For specific step results:
```http
GET https://api-app2.virtuoso.qa/api/executions/86339/suites/527257/cases/{checkpointId}/steps/{stepId}
Authorization: Bearer {{api_token}}
```

### 7. Get Failure Analysis (if execution failed)
```http
POST https://api-app2.virtuoso.qa/api/executions/86339/failures/explain
Authorization: Bearer {{api_token}}
Content-Type: application/json

{
  "testSuiteId": 527257,
  "sequence": 1,
  "humanReadableCheckpointList": []
}
```

**Returns**: AI-powered analysis of why the execution failed

### 8. Get Execution Timeline
```http
GET https://api-app2.virtuoso.qa/api/timelines/journeys/527257/executions/86339
Authorization: Bearer {{api_token}}
```

**Returns**: Complete timeline of the execution

## 📊 Additional Execution-Specific Endpoints

### Get Execution Screenshots
```http
GET https://api-app2.virtuoso.qa/api/executions/86339/screenshots
Authorization: Bearer {{api_token}}
```

### Get Execution Logs
```http
GET https://api-app2.virtuoso.qa/api/executions/86339/logs
Authorization: Bearer {{api_token}}
```

### Get Performance Metrics
```http
GET https://api-app2.virtuoso.qa/api/executions/86339/metrics
Authorization: Bearer {{api_token}}
```

### Get Browser Console Output
```http
GET https://api-app2.virtuoso.qa/api/executions/86339/console
Authorization: Bearer {{api_token}}
```

### Get Network Traffic
```http
GET https://api-app2.virtuoso.qa/api/executions/86339/network
Authorization: Bearer {{api_token}}
```

## 🔄 Complete Extraction Sequence

```javascript
// Step 1: Check execution status
const status = await fetch('/api/jobs/86339/status');

// Step 2: Get execution overview
const analysis = await fetch('/api/executions/analysis/86339');

// Step 3: Get journey structure with execution context
const journey = await fetch('/api/testsuites/527257?executionId=86339');

// Step 4: Get all execution results
const results = await fetch('/api/executions/86339/suites/527257/results');

// Step 5: If failed, get AI analysis
if (analysis.status === 'failed') {
  const failureAnalysis = await fetch('/api/executions/86339/failures/explain', {
    method: 'POST',
    body: JSON.stringify({ testSuiteId: 527257 })
  });
}

// Step 6: Get screenshots and logs
const screenshots = await fetch('/api/executions/86339/screenshots');
const logs = await fetch('/api/executions/86339/logs');
```

## 🎯 Benefits of Execution Data

1. **Real Results**: See what actually happened, not just what should happen
2. **Performance Data**: Actual execution times and resource usage
3. **Failure Diagnostics**: Detailed error messages and AI analysis
4. **Visual Evidence**: Screenshots showing the actual state during execution
5. **Historical Context**: Compare this execution with previous runs
6. **Debugging Info**: Console logs, network traffic, browser state

## 💡 Key Insight

While journey data shows the **test definition** (what should be tested), execution data shows the **test results** (what actually happened during testing). For debugging and analysis, execution data is much more valuable as it contains:

- ✅ Actual pass/fail status
- ⏱️ Real execution timings
- 📸 Screenshots at failure points
- 🔍 Detailed error messages
- 🤖 AI-powered failure analysis
- 📊 Performance metrics
- 🔗 Network request data

This makes execution data extraction essential for understanding test failures and performance issues.