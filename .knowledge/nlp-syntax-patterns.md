# Virtuoso NLP Syntax Patterns - Complete Reference

## Verified Syntax Patterns (100% Accurate)

### Navigation
```
Navigate to "https://example.com"
Navigate to $url_variable
```

### Store Operations
```
Store value "text" in $variable
Store value "25" in $age
Store element text of "element" in $variable  # When storing text content
Store element "element" in $variable          # When storing element reference
```

### Cookie/Environment Operations
```
Cookie create "name" as "value"
Cookie remove "name"
Clear all cookies
```
Note: ENVIRONMENT actions are hardcoded to display as Cookie operations but should sometimes be Environment variables:
- `Add environment variable "name"` (when not a cookie)
- `Delete environment variable "name"` (when not a cookie)
- `Clear all environment variables` (when not cookies)

### Assertions - Element
```
Look for element "text" on page
Assert that element "text" does not exist on page
Assert that element "text" equals "value"
Assert that element "text" is not equal to "value"
Assert that element "text" contains "value"
```

### Assertions - Variable
```
Assert variable $var equals "value"
Assert variable $var does not equal "value"
Assert variable $var is less than "value"
Assert variable $var is less than or equal to "value"
Assert variable $var is greater than "value"
Assert variable $var is greater than or equal to "value"
```

### Assertions - Expression
```
Assert ${1 + 2} equals "3"
Assert ${$var1 == $var2} equals "true"
Assert ${$price > 100} equals "false"
```

### Click Operations
```
Click on "button text"
Click on $element_variable
Mouse click on "element"
Double-click on "element"
Right-click on "element"
```

### Input Operations
```
Write "text" in field "field name"
Write $variable in field "field name"
Clear field "field name"
```

### Scroll Operations
```
Scroll to page bottom
Scroll to page top
Scroll to top "element"
Scroll to $element_variable
Scroll by 50, 50
Scroll down
Scroll up
```

### API Calls
```
API call "Test.Name"("https://base.url")
API call "Test.Name"($url_variable)
Make API call (Test ID: 12345)  # Fallback when name not available
```

### Frame/Window Operations
```
Switch to parent iframe
Switch to iframe "frame name"
Switch to window "window name"
Switch to tab 2
```

### Wait Operations
```
Wait for 3 seconds
Wait for element "text" to appear
Wait for element "text" to disappear
```

### Hover Operations
```
Hover over "element"
Hover over $element_variable
```

### Select/Pick Operations
```
Pick "option" from "dropdown"
Pick $variable from "dropdown"
Select "option" in "dropdown"
```

## Critical Syntax Rules

### 1. Article Usage
- ✅ "on page" (NOT "on the page")
- ✅ "that element" (NOT just element name)
- ✅ "to page bottom" (NOT "to bottom")

### 2. Preposition Usage
- ✅ Store value "X" **in** $var (NOT "as")
- ✅ Cookie create "X" **as** "Y" (NOT "in")
- ✅ Assert **that element** (NOT just "Assert")

### 3. Expression Format
- ✅ Use ${expression} format
- ✅ NOT "expression" in quotes
- ✅ Variables inside expressions: ${$var1 + $var2}

### 4. Coordinate Format
- ✅ Scroll by X, Y (comma-separated)
- ✅ Numbers without quotes: Scroll by 50, 50

## Critical Data Sources

### Journey Data Limitations
1. **API Test Names** - Only have IDs, need /api-tests fetch
2. **Store Types** - Cannot distinguish element vs element text

### Execution Data Requirements (V10)
**MUST use execution.sideEffects.usedData for:**
1. **Actual variable values** - Runtime values stored during execution
2. **Store type determination**:
   - JSON with selectors = Store element
   - Simple string = Store element text or value
3. **API variables** - $url and other API parameters
4. **Variable verification** - Confirm what was actually stored

### Required Additional Fetches
```javascript
// To get API test details:
GET /projects/{projectId}/apitests/{apiTestId}

// Expected response:
{
  "name": "Demo.Register_New_User",
  "url": "https://reqres.in",
  "method": "POST"
}
```

## Variable Patterns

### Variable Declaration
- Always prefix with $: `$variable_name`
- Case sensitive: `$Age` ≠ `$age`
- Valid characters: letters, numbers, underscores

### Variable Usage Context
```
Navigate to $url
Write $username in field "Username"
Assert variable $age equals "25"
Scroll to $button_element
API call "Test"($base_url)
```

## Checkpoint Structure
```
Checkpoint 1: Name
Step 1
Step 2

Checkpoint 2: Name
Step 1
Step 2
```

## Known Limitations

1. **Cookie vs Environment**: ENVIRONMENT actions are hardcoded as Cookie operations (~1% impact)
   - API provides no distinction between cookies and environment variables
   - Both use identical `action: "ENVIRONMENT"` structure
   - Only affects ENVIRONMENT actions, no other operations impacted

## Validation Checklist

- [ ] All assertions include "that element" when referencing elements
- [ ] Store operations use "in" not "as" for variables
- [ ] Expressions use ${} format not quotes
- [ ] Scroll coordinates include comma separation
- [ ] API calls show name when available, fallback to ID
- [ ] No "the" in "on page" phrases
- [ ] Frame operations use "iframe" not "frame"