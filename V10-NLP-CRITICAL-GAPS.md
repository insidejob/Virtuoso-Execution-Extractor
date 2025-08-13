# V10 NLP Critical Gaps Analysis

## Major Discrepancies Found

### 1. ❌ API Call Names Missing
**UI Shows:**
```
API call "Demo.Register_New_User"("https://reqres.in")
API call "Demo.Register_New_User"($url)
```

**V10 Produces:**
```
Make API call (Test ID: 10253)
Make API call (Test ID: 10253)
```

**API Data Has:**
- Only `apiTestId: 10253`
- No name field
- No URL information
- Second call has `inputVariables: {"url": "url"}` but no base URL

**🚨 MISSING DATA:** API test names and URLs are not in the journey data. We need to fetch `/projects/{projectId}/apitests/{apiTestId}` to get the actual name and URL.

### 2. ❌ Cookie vs Environment Operations
**UI Shows:**
```
Cookie create "test" as "test"
Cookie remove "test"
Cookie remove "test"
```

**V10 Produces:**
```
Add environment variable "test"
Delete environment variable "test"
Delete environment variable "test"
```

**API Data Has:**
- `action: "ENVIRONMENT"`
- `type: "ADD"` and `type: "DELETE"`

**🚨 ISSUE:** The API shows ENVIRONMENT actions but UI shows Cookie operations. This might be:
1. A mapping issue (ENVIRONMENT actions display as Cookie in UI)
2. Missing metadata about operation type
3. Need to check `meta.kind` or other fields

### 3. ❌ Store Syntax Wrong
**UI Shows:**
```
Store value "Test" in $test_var
Store value "25" in $age
Store value "2" in $var1
Store value "2" in $var2
```

**V10 Produces:**
```
Store "Test" as $test_var
Store "25" as $age
Store "2" as $var1
Store "2" as $var2
```

**📝 FIX NEEDED:** Change "Store X as Y" to "Store value X in Y"

### 4. ❌ Assert Syntax Wrong
**UI Shows:**
```
Look for element "Submit" on page
Assert that element "Please confirm..." does not exist on page
Assert that element "More options..." equals "More options"
Assert that element "Age" is not equal to "25"
```

**V10 Produces:**
```
Look for element "Submit" on the page
Assert "Please confirm..." does not exist
Assert "More options..." equals "More options"
Assert "Age" does not equal "25"
```

**📝 FIX NEEDED:** 
- Remove "the" from "on the page" → "on page"
- Add "that element" to assertions
- Change "is not equal" format

### 5. ❌ Expression Syntax Wrong
**UI Shows:**
```
Assert ${1 + 2} equals "3"
Assert ${$var1 == $var2} equals "true"
```

**V10 Produces:**
```
Assert expression "1 + 2" equals "3"
Assert expression "$var1 == $var2" equals "true"
```

**📝 FIX NEEDED:** Use ${expression} format instead of "expression"

### 6. ❌ Scroll Syntax Issues
**UI Shows:**
```
Scroll to page bottom
Scroll to top "Search"
Scroll to $button
Scroll by 50, 50
```

**V10 Produces:**
```
Scroll to bottom
Scroll to element "Search"
Scroll to element
Scroll down
```

**API Data Has:**
- For "Scroll by 50, 50": `meta: { x: 50, y: 50, type: "OFFSET" }`
- For "Scroll to top": `type: "ELEMENT"` with Search selector

**📝 FIX NEEDED:**
- "Scroll to bottom" → "Scroll to page bottom"
- "Scroll to element X" → "Scroll to top X" (when appropriate)
- Handle OFFSET type: use x,y coordinates
- Handle variable scrolling: "Scroll to $button"

### 7. ❌ Store Element Text Missing
**UI Shows:**
```
Store element text of "Accept all" in $button
```

**V10 Produces:**
```
Store element "Accept all" as $button
```

**🚨 ISSUE:** The raw data doesn't show this step at all! The journey has a gap - step 19735177 is missing from our data but should be there.

### 8. ❌ Switch Frame Syntax
**UI Shows:**
```
Switch to parent iframe
```

**V10 Produces:**
```
Switch to parent frame
```

**📝 FIX NEEDED:** Use "iframe" instead of "frame"

## Critical Issues Summary

### Data Not Available in API:
1. **API Test Names/URLs** - Need separate API call to get "Demo.Register_New_User" and "https://reqres.in"
2. **Cookie vs Environment** - Unclear why ENVIRONMENT shows as Cookie in UI
3. **Missing Step** - Store element text step (19735177) missing from data

### Syntax Fixes Needed:
1. Store: "as" → "in"
2. Assert: Add "that element", fix "on page" (no "the")
3. Expression: Use ${} format
4. Scroll: Fix "page bottom", handle coordinates, handle variables
5. Switch: "frame" → "iframe"

## Required V10 Updates

### 1. Fetch Additional Data
```javascript
// Need to fetch API test details
const apiTestDetails = await fetchApiTestDetails(projectId, apiTestId);
// Returns: { name: "Demo.Register_New_User", url: "https://reqres.in" }
```

### 2. Update NLP Handlers
```javascript
// Store handler
handleStore(step) {
    const storeVar = step.variable ? `$${step.variable}` : '';
    const storeValue = step.value || '';
    return `Store value "${storeValue}" in ${storeVar}`;
}

// Assert handler
handleAssertExists(step, selectors) {
    return `Look for element ${this.getSelectorDescription(selectors)} on page`;
}

handleAssertNotExists(step, selectors) {
    return `Assert that element ${this.getSelectorDescription(selectors)} does not exist on page`;
}

// Expression handler
handleAssertVariable(step) {
    if (expression) {
        return `Assert \${${expression}} equals "${value}"`;
    }
}

// Scroll handler for OFFSET
handleScroll(step) {
    if (type === 'OFFSET') {
        const x = step.meta?.x || 0;
        const y = step.meta?.y || 0;
        return `Scroll by ${x}, ${y}`;
    }
}
```

### 3. Handle Cookie/Environment Mapping
Need to determine when ENVIRONMENT actions should be displayed as Cookie operations. Possibly:
- Check `meta.kind` field
- Check environment name pattern
- Check additional metadata

## Prevention Strategy

1. **Compare with UI regularly** - Test extractions against actual UI display
2. **Fetch all referenced data** - Don't assume everything is in journey data
3. **Use exact Virtuoso syntax** - No variations like "the page" vs "page"
4. **Handle all meta fields** - x, y coordinates, types, etc.
5. **Check for data gaps** - Missing steps indicate incomplete API response

## Next Steps

1. Update all NLP handlers with correct syntax
2. Add API test fetching to get names/URLs
3. Investigate Cookie vs Environment mapping
4. Handle missing data gracefully with warnings
5. Add validation against known Virtuoso syntax patterns