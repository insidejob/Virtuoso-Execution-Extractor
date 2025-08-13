# Complete Task List - All Phases

## Phase 1: Core Infrastructure Fixes (Priority: CRITICAL)
**Timeline: Day 1 (2-3 hours)**

### 1.1 Fix API Response Unwrapping ✅
```javascript
// Fix in: fetchProjectData, fetchGoalData, fetchExecutionData
const response = await this.fetchData(endpoint);
const data = response?.item || response;  // Unwrap!
```

### 1.2 Update Folder Naming Convention
- Use underscores not hyphens
- `ipermit_testing_4889` not `ipermit-testing-4889`
- `2_permit_check_stage_8519` not `2-permit-check-stage-8519`
- Document naming convention

### 1.3 Add extraction-summary.json
- High-level metadata file
- All IDs in one place
- Extraction statistics
- Status and accuracy

## Phase 2: Flag-Based Architecture (Priority: HIGH)
**Timeline: Day 1-2 (3-4 hours)**

### 2.1 Restructure for Raw Data First
- Raw data ALWAYS saved
- Everything else conditional

### 2.2 Implement --nlp Flag
```javascript
if (options.nlp) {
    generateNLP();
}
```

### 2.3 Implement --vars Flag
```javascript
if (options.vars) {
    extractVariables();
}
```

### 2.4 Add --offline Flag
- Reprocess existing raw data
- No API calls needed

## Phase 3: Self-Healing System (Priority: CRITICAL)
**Timeline: Day 2 (4 hours)**

### 3.1 Unknown Action Handler
```javascript
handleUnknownAction(step) {
    // Generate fallback NLP
    // Log fix instructions
    // Continue extraction
}
```

### 3.2 Variable Auto-Discovery
- Search all sources for missing variables
- Auto-fix when possible
- Report what couldn't be fixed

### 3.3 Selector Fallback Chain
1. Try primary selector
2. Fall back to text
3. Fall back to value
4. Use generic description

### 3.4 Generate FIX_INSTRUCTIONS.md
- Exact code to add
- File locations
- Line numbers

## Phase 4: Error Reporting System (Priority: HIGH)
**Timeline: Day 2-3 (3 hours)**

### 4.1 Create ERROR_REPORT.json
- Structured error data
- Severity levels
- Fix instructions
- Auto-fix status

### 4.2 Clear Console Output
```
⚠️ EXTRACTION COMPLETED WITH ISSUES
Accuracy: 92%
Issues Found: 3
Auto-Fixed: 1

🔴 HIGH PRIORITY ISSUES:
  UNKNOWN_ACTION: SCROLL
  Impact: 2 steps not converted
  Fix: Add SCROLL handler to line 520
```

### 4.3 Implement .accuracy/ Folder
- validation.json
- ERROR_REPORT.json
- FIX_INSTRUCTIONS.md
- Only created if issues found

## Phase 5: File Consolidation (Priority: MEDIUM)
**Timeline: Day 3 (2 hours)**

### 5.1 Merge Variable Files
- Combine 3 files into 1 variables.json
- Include all necessary data
- Remove redundancy

### 5.2 Remove Redundant Files
- No more variables-enhanced.json
- No more variables-report.md
- No more separate metadata.json

### 5.3 Clean Output Structure
```
/raw-data/              # Always
/extraction-summary.json # Always
/output.nlp.txt         # --nlp
/variables.json         # --vars
/.accuracy/             # If issues
```

## Phase 6: Testing & Validation (Priority: CRITICAL)
**Timeline: Day 3-4 (4 hours)**

### 6.1 Test Unknown Actions
- Create test journey with SCROLL, HOVER
- Verify fallback handlers work
- Check FIX_INSTRUCTIONS generation

### 6.2 Test Variable Extraction
- Missing variables
- Empty variables
- Type conflicts
- Auto-discovery

### 6.3 Test Self-Healing
- Break extraction intentionally
- Verify auto-fixes apply
- Check error reporting clarity

### 6.4 Verify 100% Accuracy
- Test multiple journey types
- All action types handled
- All variables extracted
- No silent failures

## Phase 7: Documentation (Priority: MEDIUM)
**Timeline: Day 4 (2 hours)**

### 7.1 Folder Naming Convention
```markdown
# Folder Naming Convention
- Use underscores not hyphens/spaces
- Include name and ID
- Format: {name}_{id}
- Examples:
  - ipermit_testing_4889
  - 2_permit_check_stage_8519
```

### 7.2 Error Handling Guide
- How to read ERROR_REPORT.json
- How to apply fixes
- Common issues and solutions

### 7.3 API Documentation
- All flags explained
- Output structure
- File descriptions

## Phase 8: Advanced Features (Priority: LOW)
**Timeline: Day 5 (Optional, 3 hours)**

### 8.1 Pattern Learning
- Remember fixed actions
- Suggest patterns for new actions
- Build action library

### 8.2 Confidence Scoring
- Rate extraction confidence
- Flag uncertain conversions
- Suggest manual review

### 8.3 Diff Mode
- Compare extractions
- Track changes over time
- Version comparisons

## Success Metrics

### Phase Completion Checklist

#### ✅ Phase 1 Complete When:
- [ ] Folder names show actual names (ipermit_testing_4889)
- [ ] extraction-summary.json created with all IDs
- [ ] API responses properly unwrapped

#### ✅ Phase 2 Complete When:
- [ ] Raw data always saved
- [ ] --nlp flag works
- [ ] --vars flag works
- [ ] --offline flag works

#### ✅ Phase 3 Complete When:
- [ ] Unknown actions don't break extraction
- [ ] FIX_INSTRUCTIONS.md auto-generated
- [ ] Fallback handlers working

#### ✅ Phase 4 Complete When:
- [ ] Clear error messages in console
- [ ] ERROR_REPORT.json created
- [ ] .accuracy/ folder conditional

#### ✅ Phase 5 Complete When:
- [ ] Single variables.json file
- [ ] No redundant files
- [ ] Clean output structure

#### ✅ Phase 6 Complete When:
- [ ] 100% accuracy on test journeys
- [ ] All self-healing tested
- [ ] No silent failures

## Command Line Interface (Final)

```bash
# Basic usage (raw data only)
node extract-v10.js <url>

# With processing
node extract-v10.js <url> --nlp --vars

# Debug mode
node extract-v10.js <url> --nlp --vars --validate

# Offline reprocessing
node extract-v10.js /path/to/extraction --offline --vars

# Full extraction with validation
node extract-v10.js <url> --nlp --vars --validate --debug
```

## Priority Order for Implementation

1. **TODAY**: Phase 1 (Core fixes) + Start Phase 3 (Self-healing)
2. **TOMORROW**: Complete Phase 3 + Phase 4 (Error reporting)
3. **DAY 3**: Phase 2 (Flags) + Phase 5 (Consolidation)
4. **DAY 4**: Phase 6 (Testing) + Phase 7 (Documentation)
5. **OPTIONAL**: Phase 8 (Advanced features)

## Critical Path to 100% Accuracy

```
Fix Unwrapping → Self-Healing → Error Reporting → Testing → 100% Accuracy
```

The most important insight: **Every failure should produce its own fix** - this transforms the system from one that breaks to one that learns and improves.