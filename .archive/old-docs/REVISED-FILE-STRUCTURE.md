# Revised File Structure - Raw Data First Approach

## Your Requirements (Makes Perfect Sense!)

1. **Raw API data** - ALWAYS captured (source of truth)
2. **NLP conversion** - Only with `--nlp` flag
3. **Variables extraction** - Only with `--vars` flag

## Why This Is Better

### Raw Data as Foundation
- **Source of truth** - Exact API responses preserved
- **Reprocessable** - Can regenerate NLP/vars without re-fetching
- **Debuggable** - See exactly what API returned
- **Flexible** - Users can process data their own way

### On-Demand Processing
- Some users only need raw data
- Others only need NLP conversion
- Some need variables extraction
- Avoid generating unnecessary files

## Proposed Structure

### Default (No Flags) - Raw Data Only
```
ipermit-testing-4889/
└── permit-check-stage-8519/
    └── 2025-08-11-execution-86332/
        └── raw-data/
            ├── journey.json
            ├── goal.json
            ├── project.json
            ├── execution.json
            └── environments.json
```

### With --nlp Flag
```
ipermit-testing-4889/
└── permit-check-stage-8519/
    └── 2025-08-11-execution-86332/
        ├── raw-data/           # Always present
        │   └── ...
        └── check-a-permit.nlp.txt    # Generated NLP
```

### With --vars Flag
```
ipermit-testing-4889/
└── permit-check-stage-8519/
    └── 2025-08-11-execution-86332/
        ├── raw-data/           # Always present
        │   └── ...
        └── variables.json      # Extracted variables
```

### With Both Flags (--nlp --vars)
```
ipermit-testing-4889/
└── permit-check-stage-8519/
    └── 2025-08-11-execution-86332/
        ├── raw-data/           # Always present
        │   └── ...
        ├── check-a-permit.nlp.txt    # NLP conversion
        └── variables.json             # Variables extraction
```

## Implementation Approach

### Command Examples
```bash
# Just fetch raw data (default)
node extract.js <url>

# Generate NLP from raw data
node extract.js <url> --nlp

# Extract variables from raw data
node extract.js <url> --vars

# Generate both
node extract.js <url> --nlp --vars

# Reprocess existing raw data (no API calls)
node extract.js <url> --offline --nlp --vars
```

### Code Structure
```javascript
class VirtuosoExtractor {
    constructor(options = {}) {
        this.config = {
            generateNLP: options.nlp || false,
            extractVars: options.vars || false,
            offline: options.offline || false,  // Use existing raw data
            ...
        };
    }
    
    async extract(url) {
        // Step 1: Always get/fetch raw data
        let rawData;
        if (this.config.offline) {
            rawData = this.loadExistingRawData(url);
        } else {
            rawData = await this.fetchAllData(url);
            this.saveRawData(rawData);  // Always save
        }
        
        // Step 2: Optional NLP generation
        if (this.config.generateNLP) {
            const nlp = this.convertToNLP(rawData);
            this.saveNLP(nlp);
        }
        
        // Step 3: Optional variable extraction
        if (this.config.extractVars) {
            const vars = this.extractVariables(rawData);
            this.saveVariables(vars);
        }
    }
}
```

## Benefits of This Approach

### 1. Separation of Concerns
- **Fetching** - Get data from API
- **Processing** - Convert/extract on demand
- **Storage** - Raw data always preserved

### 2. Efficiency
- Don't generate files users don't need
- Can reprocess without API calls
- Faster when only raw data needed

### 3. Flexibility
- Users choose what they need
- Can add more processors later (--api, --test, etc.)
- Raw data enables custom processing

### 4. Debugging
- Raw data always available for inspection
- Can trace issues back to source
- Can replay processing with different options

## Folder Naming Still Needs Fixing

### Current Issue
```javascript
// Project and Goal names showing as undefined
const projectName = projectData?.name || `project-${ids.project}`;  
// Result: "project-4889" because projectData.name is undefined
```

### Fix Required
```javascript
async fetchProjectData(ids) {
    const data = await this.fetchData(endpoint);
    // Unwrap the response
    return data?.item || data;  // Return the actual project object
}

// Then in folder creation:
const projectName = projectData?.name || `project-${ids.project}`;
// Result: "iPermit Testing-4889" ✓
```

## Variables File Structure (When Using --vars)

Single consolidated JSON:
```json
{
  "metadata": {
    "source": "raw-data/",
    "extraction_date": "2025-08-11T20:10:06Z",
    "journey": "Check a Permit",
    "total_variables": 11
  },
  "variables": {
    "$username": {
      "value": "Virtuoso1",
      "type": "TEST_DATA",
      "source": "dataAttributeValues",
      "usage": "Login - Enter email field"
    },
    "$password": {
      "value": "jABREx5*Do1U5U%L@vU#9tV8UzyA",
      "type": "TEST_DATA",
      "source": "dataAttributeValues",
      "usage": "Login - Password field"
    },
    "$signaturebox": {
      "value": "/html/body/div[3]/div/div/div/div[2]/div/canvas",
      "type": "ENVIRONMENT",
      "source": "Environment variable",
      "usage": "Signature canvas XPath selector"
    }
  },
  "summary": {
    "by_type": {
      "TEST_DATA": 10,
      "ENVIRONMENT": 1
    },
    "filtered_empty": ["$Question27", "$QuestionType9", "$QuestionType10"]
  }
}
```

## Summary

Your approach is **much better**:
- Raw data = Always (foundation)
- NLP = Optional (--nlp)
- Variables = Optional (--vars)

This gives users exactly what they need, when they need it, without generating unnecessary files. The raw data serves as the source of truth that can be reprocessed multiple times with different options.