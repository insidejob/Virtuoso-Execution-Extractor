# Final Variables Output - Check a Permit Journey

## Summary
- **Total Variables Used:** 11
- **Total Available:** 56 
- **Filtered Empty:** 3 (Question27, QuestionType9, QuestionType10)

## Variables Captured with Actual Values

| Variable | Value | Type | Usage |
|----------|-------|------|-------|
| **$username** | `Virtuoso1` | DATA_ATTRIBUTE (Test Data) | Login - Enter email field |
| **$password** | `jABREx5*Do1U5U%L@vU#9tV8UzyA` | DATA_ATTRIBUTE (Test Data) | Login - Password field |
| **$QuestionType1** | `Precautions` | DATA_ATTRIBUTE (Test Data) | Check a Permit - Assert exists |
| **$QuestionType2** | `General Work` | DATA_ATTRIBUTE (Test Data) | Check a Permit - Assert exists |
| **$QuestionType3** | `PPE` | DATA_ATTRIBUTE (Test Data) | Check a Permit - Assert exists |
| **$QuestionType4** | `Qualifications / Competence` | DATA_ATTRIBUTE (Test Data) | Check a Permit - Assert exists |
| **$QuestionType5** | `Isolation` | DATA_ATTRIBUTE (Test Data) | Check a Permit - Assert exists |
| **$QuestionType6** | `Work at Height` | DATA_ATTRIBUTE (Test Data) | Check a Permit - Assert exists |
| **$QuestionType7** | `Emergency Procedures` | DATA_ATTRIBUTE (Test Data) | Check a Permit - Assert exists |
| **$QuestionType8** | `Confined Spaces` | DATA_ATTRIBUTE (Test Data) | Check a Permit - Assert exists |
| **$signaturebox** | `/html/body/div[3]/div/div/div/div[2]/div/canvas` | ENVIRONMENT | Mouse click - XPath to signature canvas |

## Key Improvements in Final Version

### ✅ Fixed Issues:
1. **Username/Password Values:** Now correctly shows actual test data values instead of "Not set"
2. **Variable Type:** Username/password correctly categorized as DATA_ATTRIBUTE (Test Data) instead of LOCAL
3. **Empty Variables:** QuestionType9/10 and Question27 filtered out (had empty values)
4. **Environment Variables:** $signaturebox shows actual XPath value from environment

### Variable Categories:
- **10 Test Data Variables:** All with proper values (username, password, QuestionType1-8)
- **1 Environment Variable:** $signaturebox with XPath selector
- **0 Local Variables:** None (username/password correctly identified as test data)

## Raw JSON Output Location
`extractions/project-4889/no-goal/2025-08-11T20-10-06-execution-86332/check-a-permit/variables-used.json`