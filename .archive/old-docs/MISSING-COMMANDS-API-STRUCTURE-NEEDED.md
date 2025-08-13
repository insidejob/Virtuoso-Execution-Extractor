# 📋 Missing Virtuoso Commands - API Structure Examples Needed

## Current v6 Implementation Status

### ✅ Fully Implemented (5 core actions from real data)
These actions are proven from actual journey.json data and working correctly:

| Action | API Structure | NLP Conversion |
|--------|--------------|----------------|
| `NAVIGATE` | `{action: "NAVIGATE", target: {variable: "url"}}` | Navigate to "url" |
| `WRITE` | `{action: "WRITE", variable: "text", selectors: {hint: "field"}}` | Write text in field "field" |
| `CLICK` | `{action: "CLICK", selectors: {hint/text/id/xpath/css}}` | Click on "element" |
| `ASSERT_EXISTS` | `{action: "ASSERT_EXISTS", selectors: {...}}` | Look for element "x" on the page |
| `MOUSE` | `{action: "MOUSE", meta: {action: "CLICK/DOUBLE_CLICK"}}` | Mouse click/Double-click on element |

### ⚠️ Partially Implemented (14 documented but no API examples)
These are mentioned in documentation but we need API structure:

| Action | Current Guess | Need API Structure For |
|--------|--------------|------------------------|
| `SELECT/PICK` | Assumed similar to WRITE | How option values are passed |
| `WAIT_FOR_ELEMENT` | Assumed similar to ASSERT_EXISTS | Timeout parameters |
| `DISMISS` | Basic implementation | Alert types, meta parameters |
| `SCROLL` | Basic implementation | Direction, amount parameters |
| `CLEAR_FIELD` | Basic implementation | Field identification |
| `HOVER` | Basic implementation | Element targeting |
| `SWITCH_FRAME` | Basic implementation | Frame identification |
| `SWITCH_TAB` | Basic implementation | Tab indexing/naming |
| `UPLOAD` | Basic implementation | File path handling |
| `STORE` | Basic implementation | Variable storage format |
| `EXECUTE_SCRIPT` | Basic implementation | Script passing |
| `PRESS_KEY` | Basic implementation | Key combinations |
| `DOUBLE_CLICK` | As MOUSE meta.action | Standalone vs MOUSE variant |

## ❌ Missing from v6 - Need API Examples

### 1. Assertion Commands (11 types)
According to Virtuoso docs, these assertions exist but aren't in v6:

```
Assert not exists
Assert equals  
Assert not equals
Assert less than
Assert greater than  
Assert matches
Assert selected
Assert checked
Assert variable
```

**Need to know:**
- Is it `{action: "ASSERT_NOT_EXISTS"}` or `{action: "ASSERT", meta: {type: "NOT_EXISTS"}}`?
- How are comparison values passed for equals/greater than/less than?
- How is the regex pattern passed for "matches"?
- How are checkbox/radio states verified?
- How is variable assertion structured?

### 2. Cookie Commands
Documentation shows cookie manipulation:

```
Set cookie "name" to "value"
Delete cookie "name"
Clear all cookies
```

**Need to know:**
- Action names: `COOKIE_SET`, `SET_COOKIE`, or something else?
- Domain/path parameters?
- Expiry handling?

### 3. Window Commands
Documentation mentions:

```
Resize window to width X and height Y
```

**Need to know:**
- Action name: `RESIZE_WINDOW`, `WINDOW_RESIZE`?
- Parameter structure for dimensions?

### 4. API Call Command
Documentation shows:

```
Make API call to "endpoint"
```

**Need to know:**
- Action name: `API_CALL`, `API_REQUEST`?
- How are method, headers, body passed?
- Response handling?

### 5. Comment Support
Documentation mentions comments in tests.

**Need to know:**
- Action name: `COMMENT`, `NOTE`?
- How are comments distinguished from executable steps?

## 📊 Impact Analysis

| Category | Currently Working | Missing | Impact |
|----------|------------------|---------|--------|
| Basic Actions | 5 | 0 | ✅ Core functionality works |
| Assertions | 1 (EXISTS) | 10 | ⚠️ Limited validation capability |
| Browser Control | 14 (partial) | 3 | ⚠️ Some automation gaps |
| API/Data | 0 | 4 | ❌ No API testing support |

## 🎯 Priority Order for Implementation

### High Priority (Common use cases)
1. **Assert equals/not equals** - Basic validation
2. **Assert not exists** - Negative testing
3. **Cookie commands** - Session management
4. **API calls** - Backend testing

### Medium Priority (Specific scenarios)
5. **Assert greater/less than** - Numeric validation
6. **Assert matches** - Pattern validation
7. **Window resize** - Responsive testing
8. **Comments** - Test documentation

### Low Priority (Edge cases)
9. **Assert selected/checked** - Form validation
10. **Assert variable** - Data validation

## 📝 Example API Structures Needed

To properly implement these, we need actual API response examples like:

```javascript
// Example: What does assert equals look like?
{
  "action": "ASSERT_EQUALS", // or "ASSERT" with meta?
  "selectors": {
    "hint": "Price field"
  },
  "expected": "$99.99", // how is expected value passed?
  "variable": "actual_price" // or different structure?
}

// Example: What does a cookie command look like?
{
  "action": "SET_COOKIE", // actual action name?
  "name": "session_id",
  "value": "abc123",
  "domain": ".example.com", // are these included?
  "path": "/",
  "secure": true
}

// Example: What does API call look like?
{
  "action": "API_CALL", // actual action name?
  "url": "https://api.example.com/users",
  "method": "POST",
  "headers": {...}, // how are these passed?
  "body": {...},
  "store_response": "api_response" // variable storage?
}
```

## 🚀 Next Steps

1. **Get real API examples** for missing commands from actual Virtuoso journeys that use them
2. **Update v6 extractor** with correct action names and structures
3. **Add proper NLP conversion** based on actual Virtuoso syntax
4. **Test extraction** with journeys containing these commands
5. **Validate output** matches Virtuoso UI display

## 📌 Questions for API Structure Discovery

1. Can you create a simple Virtuoso journey that uses "Assert equals" and share the API response?
2. Can you create a journey with cookie commands and share the JSON?
3. Do API calls appear as regular steps or special structures?
4. How do comments appear in the journey.json structure?
5. Are there any other undocumented actions in your Virtuoso instance?

---

*This document tracks what we need to achieve 100% coverage of Virtuoso's command set. Once we have the API examples, we can update v6 to be truly comprehensive.*