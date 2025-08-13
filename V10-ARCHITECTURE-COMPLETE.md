# V10 Complete Architecture - Where Everything Lives

## Core Realization

**Our developed NLP/variable logic (v1-v9) is the CORE ENGINE, not learned knowledge!**

## Architecture Overview

```
virtuoso-api/
├── extract-v10.js                    # Main entry point
├── core/                             # Our developed logic (v1-v9)
│   ├── nlp-converter.js             # All NLP handlers we built
│   ├── variable-extractor.js        # All variable fixes
│   ├── folder-structure.js          # Naming with underscores
│   └── validation-tracker.js        # Accuracy tracking
│
├── intelligence/                     # Analysis engines
│   ├── variable-intelligence-v2.js  # Runtime type inference
│   └── selector-fallbacks.js        # Fallback chains
│
├── .knowledge/                       # ONLY for unknowns
│   ├── action-handlers.json         # Learned unknown actions
│   └── patterns.json                # Fallback patterns
│
└── extractions/                      # Output
```

## Where Our Logic Lives

### 1. NLP Conversion Logic (core/nlp-converter.js)
```javascript
// ALL our developed handlers from v1-v9
export class NLPConverter {
    constructor() {
        // Hardcoded handlers we developed
        this.handlers = {
            'NAVIGATE': this.handleNavigate,
            'CLICK': this.handleClick,
            'WRITE': this.handleWrite,
            'TYPE': this.handleWrite,
            'MOUSE': this.handleMouse,
            'ASSERT_EXISTS': this.handleAssertExists,
            'ASSERT_NOT_EXISTS': this.handleAssertNotExists,
            'ASSERT_EQUALS': this.handleAssertEquals,
            'ASSERT_VARIABLE': this.handleAssertVariable,
            'API_CALL': this.handleApiCall,
            'STORE': this.handleStore,
            'ENVIRONMENT': this.handleEnvironment
            // ... all 20+ handlers we built
        };
    }
    
    convert(step, environmentData) {
        const handler = this.handlers[step.action];
        if (handler) {
            return handler.call(this, step, environmentData);
        }
        return null; // Let knowledge base handle
    }
    
    // All our v9 logic
    handleNavigate(step) {
        const url = step.meta?.url || step.value || `$${step.variable}`;
        return `Navigate to "${url}"`;
    }
    
    handleMouse(step, selectors) {
        const mouseAction = step.meta?.action || 'CLICK';
        let mouseTarget;
        
        if (selectors.guessVariable) {
            mouseTarget = `$${selectors.guessVariable}`;  // Our v8 fix!
        } else if (step.variable) {
            mouseTarget = `$${step.variable}`;
        } else {
            mouseTarget = this.getSelectorDescription(selectors);
        }
        
        return `Mouse ${mouseAction.toLowerCase()} on ${mouseTarget}`;
    }
}
```

### 2. Variable Extraction Logic (core/variable-extractor.js)
```javascript
// ALL our fixes from v1-v9
export class VariableExtractor {
    extract(journeyData, environmentData) {
        const variables = {};
        
        // 1. Extract dataAttributeValues
        this.extractDataAttributes(journeyData, variables);
        
        // 2. Filter empty (v9 fix)
        this.filterEmptyVariables(variables);
        
        // 3. Extract GUESS variables (v8 fix)
        this.extractGuessVariables(journeyData, variables);
        
        // 4. Get environment values (v9 fix)
        this.extractEnvironmentValues(environmentData, variables);
        
        // 5. Fix username/password typing (v9 fix)
        this.fixCredentialTypes(variables);
        
        return variables;
    }
    
    filterEmptyVariables(variables) {
        // Our v9 logic
        Object.keys(variables).forEach(key => {
            if (variables[key] === '' || variables[key] === null) {
                delete variables[key];
            }
        });
    }
    
    extractEnvironmentValues(environmentData, variables) {
        // Our v9 fix - search by name field not key!
        environmentData?.forEach(env => {
            if (env.variables) {
                Object.entries(env.variables).forEach(([id, varData]) => {
                    if (varData.name && variables[varData.name]) {
                        variables[varData.name].value = varData.value;
                    }
                });
            }
        });
    }
}
```

### 3. Main Extractor (extract-v10.js)
```javascript
import { NLPConverter } from './core/nlp-converter.js';
import { VariableExtractor } from './core/variable-extractor.js';
import { EnhancedVariableIntelligence } from './intelligence/variable-intelligence-v2.js';
import { UniversalKnowledge } from './knowledge/universal-knowledge.js';

class VirtuosoExtractorV10 {
    constructor(options = {}) {
        // Our developed engines
        this.nlpConverter = new NLPConverter();
        this.variableExtractor = new VariableExtractor();
        this.variableIntelligence = new EnhancedVariableIntelligence();
        
        // Knowledge for unknowns only
        this.knowledge = new UniversalKnowledge();
        
        // Options
        this.config = {
            generateNLP: options.nlp || false,
            extractVars: options.vars || false,
            validate: options.validate || false
        };
    }
    
    async extract(url) {
        // 1. Fetch and save raw data (always)
        const rawData = await this.fetchAndSaveRawData(url);
        
        // 2. Optional NLP generation
        if (this.config.generateNLP) {
            const nlp = this.convertToNLP(rawData);
            this.saveNLP(nlp);
        }
        
        // 3. Optional variable extraction
        if (this.config.extractVars) {
            const vars = this.extractVariables(rawData);
            this.saveVariables(vars);
        }
    }
    
    convertToNLP(rawData) {
        const lines = [];
        
        rawData.journey.cases.forEach(testCase => {
            testCase.steps.forEach(step => {
                // Try our core logic first
                let nlp = this.nlpConverter.convert(step);
                
                // If unknown, use knowledge base
                if (!nlp) {
                    nlp = this.knowledge.handleUnknown(step);
                }
                
                lines.push(nlp);
            });
        });
        
        return lines.join('\n');
    }
    
    extractVariables(rawData) {
        // Use our developed extractor
        const variables = this.variableExtractor.extract(
            rawData.journey,
            rawData.environments
        );
        
        // Runtime intelligence (not stored)
        const enhanced = this.variableIntelligence.analyze(variables);
        
        return enhanced;
    }
}
```

## What Goes Where

### Core Logic (Hardcoded)
**Location:** `/core/` folder
- All v1-v9 NLP handlers
- All variable extraction fixes
- Folder naming logic
- API unwrapping logic

### Intelligence (Runtime Analysis)
**Location:** `/intelligence/` folder
- Variable type inference (at runtime!)
- Data validation
- Pattern matching

### Knowledge Base (Learned)
**Location:** `/.knowledge/` folder
- ONLY unknown action handlers
- ONLY fallback patterns
- NOT variable types/values!

### Output
**Location:** `/extractions/` folder
- Raw data (always)
- NLP (--nlp flag)
- Variables (--vars flag)
- .accuracy/ (if issues)

## The Key Insight

**Our v1-v9 work is the CORE ENGINE, not something to learn!**

We spent days developing:
- Perfect NLP handlers for 20+ actions
- Variable extraction with all edge cases
- Empty filtering
- Environment value extraction
- Correct typing

This is our **source code**, not knowledge to acquire!

The knowledge base is ONLY for:
- Actions we haven't seen (SCROLL, HOVER)
- Patterns for unknowns
- NOT for variables (they're dynamic!)

## Complete V10 Task List

### Phase 0A: Organize Core Logic (NEW)
1. Extract NLP handlers from v9 → core/nlp-converter.js
2. Extract variable logic from v9 → core/variable-extractor.js
3. Copy variable-intelligence-v2.js → intelligence/

### Phase 0B: Knowledge Base (Simplified)
1. Create .knowledge/ for UNKNOWN actions only
2. Simple action-handlers.json
3. NO variable type storage!

### Then continue with existing phases...

## Bottom Line

- **Core Logic** (v1-v9): Our developed code - the engine
- **Knowledge Base**: Only for unknown actions - the safety net
- **Variables**: Always dynamic, never pre-typed
- **Intelligence**: Runtime analysis, not stored assumptions

This architecture uses all our hard work from v1-v9 as the foundation, with knowledge base as a small addition for handling unknowns, not a replacement for our logic!