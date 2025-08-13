# Quick View: Journey 527229 Extraction

## NLP Output (execution.nlp.txt)
```
Checkpoint 1: Navigate to URL
Navigate to "$url"

Checkpoint 2: Login Admin
Write $username in field "Username"
Write $password in field "Password"
Click on " Login"
Click on "Permit"
Click on "Administration"

Checkpoint 3: Add Question Types
Click on "Question Types"
Click on "Add"
Write Testing in field "Question Type"
Write 1 in field "Order"
Click on "Save"
```

## Variables (variables.json)
```json
{
  "total_used": 3,
  "variables": {
    "$url": {
      "value": "https://mobile-pretest.dev.iamtechapps.com/#/login",
      "type": "URL",
      "source": "execution"
    },
    "$username": {
      "value": "Virtuoso1",
      "type": "DATA_ATTRIBUTE",
      "source": "dataAttributeValues"
    },
    "$password": {
      "value": "****",
      "type": "DATA_ATTRIBUTE",
      "source": "dataAttributeValues",
      "maskedValue": "********"
    }
  },
  "filtered_empty": ["$Question27", "$QuestionType9", "$QuestionType10"]
}
```

## Raw Journey Structure (journey.json excerpt)
```json
{
  "title": "iPermit Add Question Type",
  "cases": [
    {
      "title": "Navigate to URL",
      "steps": [{
        "action": "NAVIGATE",
        "variable": "url"
      }]
    },
    {
      "title": "Login Admin",
      "steps": [
        {"action": "WRITE", "variable": "username"},
        {"action": "WRITE", "variable": "password"},
        {"action": "CLICK", "element": " Login"}
      ]
    },
    {
      "title": "Add Question Types",
      "steps": [
        {"action": "CLICK", "element": "Question Types"},
        {"action": "CLICK", "element": "Add"},
        {"action": "WRITE", "value": "Testing"},
        {"action": "WRITE", "value": "1"},
        {"action": "CLICK", "element": "Save"}
      ]
    }
  ]
}
```

## Quick Access Paths

### Full Path:
```bash
cd extractions/ipermit_testing_4889/admin_section_8534/2025-08-12T19-55-55_execution_88727/ipermit_add_question_type_527229/
```

### View NLP:
```bash
cat extractions/ipermit_testing_4889/admin_section_8534/2025-08-12T19-55-55_execution_88727/ipermit_add_question_type_527229/execution.nlp.txt
```

### View Variables:
```bash
jq . extractions/ipermit_testing_4889/admin_section_8534/2025-08-12T19-55-55_execution_88727/ipermit_add_question_type_527229/variables.json
```

### View Summary:
```bash
jq . extractions/ipermit_testing_4889/admin_section_8534/2025-08-12T19-55-55_execution_88727/ipermit_add_question_type_527229/extraction_summary.json
```

## Folder Size
```
Total: ~100KB
- Raw data: ~80KB
- Processed outputs: ~20KB
```