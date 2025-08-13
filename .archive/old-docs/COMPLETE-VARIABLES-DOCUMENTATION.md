# Complete Variables Documentation - Check a Permit Journey

## Files Created by V9 Extraction

### 1. Primary File: `variables-used.json`
**Location:** `extractions/project-4889/no-goal/2025-08-11T20-10-06-execution-86332/check-a-permit/variables-used.json`

This file contains the core variable data with clear type identification and values:

```json
{
  "summary": {
    "total_used": 11,
    "total_available": 56,
    "filtered_empty": 3
  },
  "variables": {
    "$username": {
      "value": "Virtuoso1",
      "type": "DATA_ATTRIBUTE",
      "source": "dataAttributeValues",
      "usage": [{
        "checkpoint": "Login",
        "step": 1,
        "action": "WRITE",
        "field": "Enter your email"
      }]
    },
    "$password": {
      "value": "jABREx5*Do1U5U%L@vU#9tV8UzyA",
      "type": "DATA_ATTRIBUTE",
      "source": "dataAttributeValues",
      "usage": [{
        "checkpoint": "Login",
        "step": 3,
        "action": "WRITE",
        "field": "Password"
      }]
    },
    "$signaturebox": {
      "value": "/html/body/div[3]/div/div/div/div[2]/div/canvas",
      "type": "ENVIRONMENT",
      "source": "Environment variable (used in GUESS selector)",
      "usage": [{
        "checkpoint": "Check a Permit",
        "step": 26,
        "action": "MOUSE",
        "context": "MOUSE target selector"
      }]
    }
    // ... plus QuestionType1-8 with their values
  }
}
```

### 2. Enhanced Analysis: `variables-enhanced.json`
**Location:** `extractions/project-4889/no-goal/2025-08-11T20-10-06-execution-86332/check-a-permit/variables-enhanced.json`

This file provides deep intelligence about each variable:

```json
{
  "variables": {
    "$QuestionType1": {
      "category": "TEST_DATA",
      "dataType": {
        "primary": "string",
        "format": "enum",
        "constraint": "FIXED_LIST",
        "allowedValues": [
          "Precautions",
          "General Work",
          "PPE",
          "Qualifications / Competence",
          "Isolation",
          "Work at Height",
          "Emergency Procedures",
          "Confined Spaces"
        ]
      },
      "currentValue": "Precautions",
      "validation": {
        "constraintType": "FIXED_LIST",
        "message": "Must be one of the allowed values exactly"
      }
    },
    "$username": {
      "category": "TEST_DATA",
      "dataType": {
        "primary": "string",
        "format": "username",
        "constraint": "PATTERN_MATCH"
      },
      "currentValue": "Virtuoso1",
      "validation": {
        "pattern": "^[a-zA-Z0-9_-]+$",
        "message": "Login username (not email format)"
      }
    },
    "$signaturebox": {
      "category": "ENVIRONMENT",
      "dataType": {
        "primary": "string",
        "format": "xpath_selector",
        "constraint": "ELEMENT_SELECTOR"
      },
      "currentValue": "/html/body/div[3]/div/div/div/div[2]/div/canvas",
      "validation": {
        "message": "Valid XPath to canvas element for signature"
      }
    }
  }
}
```

### 3. Human-Readable Report: `variables-report.md`

This markdown file provides a clear table view:

| Variable | Category | Type | Format | Value | Description |
|----------|----------|------|--------|-------|-------------|
| **$username** | TEST_DATA | string | username | Virtuoso1 | Login username (not email format) |
| **$password** | TEST_DATA | string | password | jABREx5*Do1U5U%L@vU#9tV8UzyA | Secure credential for authentication |
| **$QuestionType1** | TEST_DATA | string | enum | Precautions | Permit check question category from fixed list |
| **$QuestionType2** | TEST_DATA | string | enum | General Work | Permit check question category from fixed list |
| **$QuestionType3** | TEST_DATA | string | enum | PPE | Permit check question category from fixed list |
| **$QuestionType4** | TEST_DATA | string | enum | Qualifications / Competence | Permit check question category from fixed list |
| **$QuestionType5** | TEST_DATA | string | enum | Isolation | Permit check question category from fixed list |
| **$QuestionType6** | TEST_DATA | string | enum | Work at Height | Permit check question category from fixed list |
| **$QuestionType7** | TEST_DATA | string | enum | Emergency Procedures | Permit check question category from fixed list |
| **$QuestionType8** | TEST_DATA | string | enum | Confined Spaces | Permit check question category from fixed list |
| **$signaturebox** | ENVIRONMENT | string | xpath_selector | /html/body/div[3]/div/div/div/div[2]/div/canvas | XPath selector for signature canvas element |

## Key Features of the Output

### 1. Clear Variable Type Identification

Each variable clearly shows:
- **Type**: DATA_ATTRIBUTE (Test Data) or ENVIRONMENT
- **Source**: Where the value comes from (dataAttributeValues, Environment variable)
- **Category**: TEST_DATA, ENVIRONMENT, LOCAL

### 2. Actual Values Displayed

- **Test Data Variables**: Show actual values like "Virtuoso1", "Precautions", etc.
- **Environment Variables**: Show actual XPath values like "/html/body/div[3]/div/div/div/div[2]/div/canvas"
- **No More "Not set"**: All values properly extracted from their sources

### 3. Usage Context

Each variable shows exactly where and how it's used:
- **Checkpoint**: Which test checkpoint uses it
- **Step**: Which step number
- **Action**: What action (WRITE, ASSERT_EXISTS, MOUSE, etc.)
- **Field/Context**: Specific field or context of usage

### 4. Data Type Intelligence

Enhanced analysis provides:
- **Format**: username, password, enum, xpath_selector
- **Constraints**: FIXED_LIST, PATTERN_MATCH, ELEMENT_SELECTOR
- **Allowed Values**: For enums, lists all valid options
- **Validation Rules**: Patterns and requirements

### 5. Filtered Empty Variables

Automatically excludes variables with empty values:
- QuestionType9 (empty)
- QuestionType10 (empty)
- Question27 (empty)

## Summary

The extraction creates multiple complementary files:

1. **variables-used.json**: Core data with values and usage
2. **variables-enhanced.json**: Deep analysis with data types and validation
3. **variables-report.md**: Human-readable markdown report

Together, these files provide:
- ✅ Clear variable type identification (TEST_DATA vs ENVIRONMENT)
- ✅ Actual values being used (no more "Not set")
- ✅ Usage context (where and how each variable is used)
- ✅ Data type specifications (format, constraints, validation)
- ✅ Clean output (empty variables filtered out)