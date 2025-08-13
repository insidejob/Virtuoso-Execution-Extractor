# Universal Knowledge System for 100% Accuracy

## The Missing Piece: Shared Learning

### Current Problem
Every extraction starts from zero knowledge:
- Encounter SCROLL action → Don't know how to handle
- Fix it for one extraction → Next extraction has same issue
- No learning between extractions

### Solution: Universal Knowledge Base

```
virtuoso-api/
├── .knowledge/                         # SHARED ACROSS ALL EXTRACTIONS
│   ├── action-handlers.json           # All learned action handlers
│   ├── variable-patterns.json         # Variable type inference rules
│   ├── selector-strategies.json       # Proven selector patterns
│   ├── fixes-database.json           # All fixes ever applied
│   ├── project-profiles/              # Project-specific patterns
│   │   ├── ipermit.json              # iPermit-specific handlers
│   │   └── default.json              # Generic patterns
│   └── accuracy-history.json         # Track accuracy over time
└── extractions/
    └── [individual extractions]
```

## 1. Action Handler Library

### action-handlers.json
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-08-11T20:00:00Z",
  "handlers": {
    "NAVIGATE": {
      "handler": "Navigate to \"{url}\"",
      "confidence": 100,
      "usageCount": 523,
      "lastUsed": "2025-08-11"
    },
    "SCROLL": {
      "handler": "Scroll {direction} {amount}",
      "confidence": 95,
      "usageCount": 12,
      "addedBy": "extraction-86332",
      "autoLearned": true
    },
    "HOVER": {
      "handler": "Hover over {element}",
      "confidence": 90,
      "usageCount": 8,
      "variants": [
        "Hover on {element}",
        "Mouse over {element}"
      ]
    },
    "DRAG_AND_DROP": {
      "handler": "Drag {source} and drop on {target}",
      "confidence": 85,
      "usageCount": 3,
      "needsReview": true
    }
  },
  "unknownActions": {
    "SWIPE": {
      "firstSeen": "2025-08-10",
      "occurrences": 1,
      "suggestedHandler": "Swipe {direction} on {element}"
    }
  }
}
```

### How It Works:
```javascript
class UniversalKnowledge {
    constructor() {
        this.loadKnowledgeBase();
    }
    
    loadKnowledgeBase() {
        const knowledgePath = path.join(__dirname, '.knowledge');
        
        // Load all learned handlers
        this.actionHandlers = this.loadJSON('action-handlers.json');
        this.variablePatterns = this.loadJSON('variable-patterns.json');
        this.selectorStrategies = this.loadJSON('selector-strategies.json');
    }
    
    handleAction(action, step) {
        // Check if we've seen this before
        if (this.actionHandlers[action]) {
            const handler = this.actionHandlers[action];
            handler.usageCount++;
            handler.lastUsed = new Date().toISOString();
            this.saveKnowledge();
            return handler.handler;
        }
        
        // New action - learn it
        return this.learnNewAction(action, step);
    }
    
    learnNewAction(action, step) {
        // Generate handler
        const handler = this.generateHandler(action, step);
        
        // Add to knowledge base
        this.actionHandlers[action] = {
            handler: handler,
            confidence: 70,  // Lower confidence for auto-learned
            usageCount: 1,
            autoLearned: true,
            needsReview: true
        };
        
        // Save immediately
        this.saveKnowledge();
        
        // Alert user
        console.log(`🧠 LEARNED NEW ACTION: ${action}`);
        console.log(`   Generated handler: ${handler}`);
        console.log(`   Added to knowledge base for future use`);
        
        return handler;
    }
}
```

## 2. Variable Pattern Intelligence

### variable-patterns.json
```json
{
  "patterns": {
    "credentials": {
      "patterns": ["password", "pwd", "pass", "secret", "token", "apikey"],
      "type": "CREDENTIAL",
      "hideValue": true,
      "validation": "minLength:8"
    },
    "usernames": {
      "patterns": ["username", "user", "login", "userid"],
      "type": "USERNAME",
      "validation": "alphanumeric"
    },
    "urls": {
      "patterns": ["url", "link", "endpoint", "uri"],
      "type": "URL",
      "validation": "validURL"
    },
    "selectors": {
      "patterns": ["box", "button", "field", "element", "selector"],
      "type": "ELEMENT_SELECTOR",
      "expectedFormat": "xpath|css"
    }
  },
  "learned": {
    "signaturebox": {
      "type": "XPATH_SELECTOR",
      "confidence": 100,
      "evidence": "Always contains XPath in iPermit projects"
    },
    "QuestionType": {
      "type": "ENUM",
      "confidence": 95,
      "values": ["Precautions", "General Work", "PPE", ...],
      "evidence": "Pattern from 15 extractions"
    }
  }
}
```

## 3. Pre-Flight Check System

### Before extraction starts:
```javascript
async runPreFlightCheck(journeyData) {
    console.log('\n🔍 PRE-FLIGHT CHECK\n');
    
    const issues = [];
    const warnings = [];
    const optimizations = [];
    
    // Check action coverage
    const unknownActions = this.checkActionCoverage(journeyData);
    if (unknownActions.length > 0) {
        warnings.push({
            type: 'UNKNOWN_ACTIONS',
            actions: unknownActions,
            message: 'These actions are not in knowledge base yet',
            impact: 'Will use auto-generated handlers'
        });
    }
    
    // Check for known problematic patterns
    const knownIssues = this.checkKnownIssues(journeyData);
    if (knownIssues.length > 0) {
        warnings.push({
            type: 'KNOWN_ISSUES',
            issues: knownIssues,
            message: 'These patterns have caused issues before'
        });
    }
    
    // Suggest optimizations
    if (this.hasProjectProfile(journeyData.projectId)) {
        optimizations.push({
            type: 'PROJECT_PROFILE',
            message: 'Loading iPermit-specific handlers'
        });
        this.loadProjectProfile('ipermit');
    }
    
    // Print report
    if (warnings.length === 0) {
        console.log('✅ All systems go - 100% coverage expected\n');
    } else {
        console.log('⚠️  Potential issues detected:\n');
        warnings.forEach(w => {
            console.log(`  - ${w.message}`);
            console.log(`    Impact: ${w.impact}\n`);
        });
    }
    
    return { issues, warnings, optimizations };
}
```

## 4. Accuracy Verification System

### Post-extraction verification:
```javascript
async verifyAccuracy(extraction) {
    const verification = {
        semantic: this.verifySemanticCoherence(extraction.nlp),
        coverage: this.verifyActionCoverage(extraction),
        variables: this.verifyVariableCompleteness(extraction),
        reversible: this.verifyReversibility(extraction)
    };
    
    // Semantic check - does NLP make sense?
    if (!verification.semantic.valid) {
        console.warn('⚠️  Semantic issues detected:');
        verification.semantic.issues.forEach(issue => {
            console.warn(`  - ${issue}`);
        });
    }
    
    // Can we recreate the journey from NLP?
    if (!verification.reversible.valid) {
        console.warn('⚠️  NLP may not be reversible to original journey');
    }
    
    return verification;
}

verifySemanticCoherence(nlp) {
    const issues = [];
    
    // Check for common problems
    if (nlp.includes('[ERROR')) {
        issues.push('Contains error markers');
    }
    if (nlp.includes('undefined')) {
        issues.push('Contains undefined values');
    }
    if (nlp.match(/\$\w+/g)?.some(v => v === '$')) {
        issues.push('Contains empty variable references');
    }
    
    // Check action sequence makes sense
    const lines = nlp.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].includes('Navigate') && lines[i+1].includes('Navigate')) {
            issues.push('Multiple navigations in sequence (unusual)');
        }
    }
    
    return {
        valid: issues.length === 0,
        issues
    };
}
```

## 5. Project Profiles

### .knowledge/project-profiles/ipermit.json
```json
{
  "projectName": "iPermit Testing",
  "projectId": 4889,
  "patterns": {
    "signaturebox": {
      "type": "XPATH_SELECTOR",
      "description": "Always an XPath to canvas element"
    },
    "QuestionType*": {
      "type": "ENUM",
      "values": ["Precautions", "General Work", "PPE", ...]
    }
  },
  "customHandlers": {
    "SIGN": "Draw signature in {signaturebox}"
  },
  "commonVariables": {
    "username": "Virtuoso1",
    "password": "[CREDENTIAL]",
    "url": "https://mobile-pretest.dev.iamtechapps.com/#/login"
  }
}
```

## 6. Continuous Learning Loop

```javascript
class ContinuousLearning {
    async afterExtraction(extraction, accuracy) {
        // Update confidence scores
        if (accuracy === 100) {
            this.increaseConfidence(extraction.actionsUsed);
        } else {
            this.reviewHandlers(extraction.failedActions);
        }
        
        // Learn new patterns
        this.learnVariablePatterns(extraction.variables);
        this.learnSelectorStrategies(extraction.selectors);
        
        // Update project profile
        if (extraction.projectId) {
            this.updateProjectProfile(extraction);
        }
        
        // Save learning
        this.saveKnowledgeBase();
        
        console.log('🧠 Knowledge base updated with new learnings');
    }
    
    reviewHandlers(failedActions) {
        failedActions.forEach(action => {
            if (this.actionHandlers[action.type]) {
                // Reduce confidence
                this.actionHandlers[action.type].confidence *= 0.9;
                this.actionHandlers[action.type].needsReview = true;
                
                console.log(`📉 Reduced confidence for ${action.type} handler`);
            }
        });
    }
}
```

## 7. Global Accuracy Dashboard

### .knowledge/accuracy-history.json
```json
{
  "overall": {
    "totalExtractions": 147,
    "perfect": 134,
    "accuracyRate": "91.2%",
    "trend": "improving"
  },
  "recentExtractions": [
    {
      "date": "2025-08-11",
      "project": "iPermit",
      "accuracy": "100%",
      "newLearnings": ["SCROLL", "HOVER"]
    }
  ],
  "problemActions": {
    "DRAG_AND_DROP": {
      "successRate": "60%",
      "needsWork": true
    }
  }
}
```

## Implementation Benefits

### With Universal Knowledge:
1. **First extraction**: 85% accuracy → Learns patterns
2. **Second extraction**: 95% accuracy → Uses learned patterns
3. **Third extraction**: 100% accuracy → Full coverage

### Without Universal Knowledge:
1. **Every extraction**: Starts at 0% knowledge
2. **Same issues**: SCROLL unknown every time
3. **No improvement**: Each extraction is isolated

## Quick Wins for 100% Accuracy

### 1. Start Simple
Create `.knowledge/action-handlers.json` with known actions

### 2. Auto-Learn
Every unknown action gets added automatically

### 3. Share Between Extractions
Load knowledge base at start of every extraction

### 4. Project Profiles
Create profiles for projects with specific patterns

### 5. Pre-Flight Checks
Warn about potential issues before starting

## The Key Insight

**"The system should get smarter with every extraction"**

Instead of isolated extractions, we build a cumulative knowledge base that:
- Remembers every fix
- Learns from every pattern
- Improves with every use
- Shares knowledge across all extractions

This transforms the system from:
- **Static** (same accuracy every time)
- To **Learning** (improves with use)

With this approach, achieving 100% accuracy becomes:
- **Faster** with each extraction
- **Automatic** for known patterns
- **Predictable** with pre-flight checks