# Variables Captured - Clear Summary

## What the Extraction Creates

The V9 extraction creates **3 key files** that clearly show variable types and values:

### Main Output: `variables-used.json`

```json
{
  "variables": {
    "$username": {
      "value": "Virtuoso1",                    // ← ACTUAL VALUE
      "type": "DATA_ATTRIBUTE",                // ← CLEAR TYPE: Test Data
      "source": "dataAttributeValues",         // ← WHERE IT COMES FROM
      "usage": [{
        "checkpoint": "Login",
        "action": "WRITE",
        "field": "Enter your email"            // ← HOW IT'S USED
      }]
    },
    "$password": {
      "value": "jABREx5*Do1U5U%L@vU#9tV8UzyA", // ← ACTUAL VALUE
      "type": "DATA_ATTRIBUTE",                 // ← Test Data
      "source": "dataAttributeValues"
    },
    "$signaturebox": {
      "value": "/html/body/div[3]/div/div/div/div[2]/div/canvas", // ← ACTUAL XPATH
      "type": "ENVIRONMENT",                    // ← CLEAR TYPE: Environment Variable
      "source": "Environment variable"
    }
  }
}
```

## Complete Variable List with Values

| Variable | Type | Value | Purpose |
|----------|------|-------|---------|
| **$username** | TEST DATA | `Virtuoso1` | Login username field |
| **$password** | TEST DATA | `jABREx5*Do1U5U%L@vU#9tV8UzyA` | Login password field |
| **$QuestionType1** | TEST DATA | `Precautions` | Permit check category |
| **$QuestionType2** | TEST DATA | `General Work` | Permit check category |
| **$QuestionType3** | TEST DATA | `PPE` | Permit check category |
| **$QuestionType4** | TEST DATA | `Qualifications / Competence` | Permit check category |
| **$QuestionType5** | TEST DATA | `Isolation` | Permit check category |
| **$QuestionType6** | TEST DATA | `Work at Height` | Permit check category |
| **$QuestionType7** | TEST DATA | `Emergency Procedures` | Permit check category |
| **$QuestionType8** | TEST DATA | `Confined Spaces` | Permit check category |
| **$signaturebox** | ENVIRONMENT | `/html/body/div[3]/div/div/div/div[2]/div/canvas` | XPath to signature element |

## Key Points About Variable Types

### TEST DATA Variables (DATA_ATTRIBUTE)
- **Source**: `dataAttributeValues` in journey data
- **Examples**: $username, $password, $QuestionType1-8
- **Contains**: Actual test data values used during execution
- **Purpose**: Input data for forms, assertions, validations

### ENVIRONMENT Variables
- **Source**: Project environment configuration
- **Examples**: $signaturebox
- **Contains**: XPath selectors, URLs, configuration values
- **Purpose**: Environment-specific settings like element locators

### What Makes It Clear?

1. **Type Field**: Explicitly states `DATA_ATTRIBUTE` or `ENVIRONMENT`
2. **Value Field**: Shows the actual value, not "Not set" or placeholders
3. **Source Field**: Tells you exactly where the value comes from
4. **Usage Field**: Shows how and where each variable is used in the test

## Files Created

1. **variables-used.json** - Core variable data with types and values
2. **variables-enhanced.json** - Deep analysis with validation rules
3. **variables-report.md** - Human-readable markdown table

All files clearly identify:
- ✅ Variable type (TEST DATA vs ENVIRONMENT)
- ✅ Actual value being used
- ✅ Where the value comes from
- ✅ How it's used in the test