# 📋 NLP Conversion - Final Adjustments

## 🔍 Findings from Analysis

### 1. **ASSERT_EXISTS Actions** (11 instances)
Looking at the actual data, ASSERT_EXISTS is checking for:
- First one: Permit grid table (no GUESS clue, only XPATH)
- `"Requested"` text on page
- `QuestionType1` through `QuestionType10` variables
- `"Comments"` field

**Current output**: `ASSERT_EXISTS`  
**Should be**: 
- When has clue: `Look for "Requested" on page`
- When has variable: `Look for QuestionType1 on page`
- When only XPATH: `Look for element on page`

### 2. **MOUSE Actions** (2 instances)
TWO MOUSE actions exist in the execution:
- First: `meta.action: "DOUBLE_CLICK"` (appears in Checkpoint 4, line 17)
- Second: `meta.action: "CLICK"` on signature box (`{"clue":"","variable":"signaturebox"}`)

**Current output**: `MOUSE`  
**Should be**: 
- First: `Double-click on element`
- Second: `Click on signaturebox` (using the variable name since clue is empty)

### 3. **"nz-toggle" Clicks** (10 instances)
These have GUESS selector: `{"clue":"nz-toggle"}`

**Current output**: `Click on "nz-toggle"`  
**Should remain**: `Click on "nz-toggle"` ✅ (NO CHANGE - keep selector value as is)

## ✅ Key Principle: DON'T CHANGE SELECTOR VALUES

You're absolutely right - we should NOT change what's in the selectors:
- If clue says "nz-toggle", output "nz-toggle"
- If clue says "Edit Permit", output "Edit Permit"
- We should use exactly what the selector provides

## 🔧 Minimal Adjustments Needed

### 1. Handle ASSERT_EXISTS
```javascript
case 'ASSERT_EXISTS':
case 'ASSERT':
    // Extract what we're looking for from GUESS selector
    if (step.element?.target?.selectors) {
        const guess = step.element.target.selectors.find(s => s.type === 'GUESS');
        if (guess?.value) {
            try {
                const guessData = JSON.parse(guess.value);
                if (guessData.clue) {
                    return `Look for "${guessData.clue}" on page`;
                } else if (guessData.variable) {
                    return `Look for ${guessData.variable} on page`;
                }
            } catch (e) {}
        }
    }
    return 'Look for element on page';
```

### 2. Handle MOUSE
```javascript
case 'MOUSE':
    const mouseAction = step.meta?.action || 'Click';
    // Get element name from GUESS selector
    let elementName = 'element';
    if (step.element?.target?.selectors) {
        const guess = step.element.target.selectors.find(s => s.type === 'GUESS');
        if (guess?.value) {
            try {
                const guessData = JSON.parse(guess.value);
                if (guessData.clue) {
                    elementName = `"${guessData.clue}"`;
                } else if (guessData.variable) {
                    elementName = guessData.variable;
                }
            } catch (e) {}
        }
    }
    // Convert CLICK to Click, DOUBLE_CLICK to Double-click
    const action = mouseAction.toLowerCase().replace('_', '-');
    return `${action.charAt(0).toUpperCase() + action.slice(1)} on ${elementName}`;
```

### 3. Keep CLICK Actions AS IS
No changes needed - already working correctly:
- `Click on "Edit Permit"` ✅
- `Click on "nz-toggle"` ✅ (keep as is)
- `Click on "Confirm"` ✅

## 📊 Expected Output After Adjustments

```
Checkpoint 3: Check a Permit
Look for element on page                           // First ASSERT (grid table)
Look for "Requested" on page                       // Second ASSERT  
Click on "Edit Permit"                             // ✅ Already correct

Checkpoint 4: Check a Permit  
Click on element                                   // Generic click
Double-click on element                            // First MOUSE action (DOUBLE_CLICK)
Look for QuestionType1 on page                     // ASSERT with variable
Click on "nz-toggle"                               // ✅ Keep as is - don't change!
Look for QuestionType2 on page
Click on "nz-toggle"                               // ✅ Keep as is
... (pattern continues)
Write All Checked and Approved in field "Comments" // ✅ Already correct
Click on "Permit Check Signature"                  // ✅ Already correct
Click on signaturebox                              // Second MOUSE action (CLICK)
Click on "Confirm"                                 // ✅ Already correct
```

## 🎯 Summary

**Main adjustments**:
1. Convert `ASSERT_EXISTS` to "Look for X on page" (where X is from the selector)
2. Convert `MOUSE` to the actual action (Click/Double-click) with element name
3. **DO NOT CHANGE** selector values - keep "nz-toggle" as "nz-toggle"

**Impact**: Will fix ~64% of issues (13 out of 36 steps) while preserving the accuracy of what's already working.