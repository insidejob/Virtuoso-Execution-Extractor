/**
 * Universal Knowledge System - V10
 * 
 * Handles ONLY unknown actions not covered by core logic
 * Variables are always dynamic - never pre-typed here!
 */

const fs = require('fs');
const path = require('path');

class UniversalKnowledge {
    constructor() {
        this.actionHandlers = this.loadActionHandlers();
        this.patterns = this.loadPatterns();
        this.learnedActions = new Map();
    }
    
    /**
     * Load action handlers from JSON
     */
    loadActionHandlers() {
        try {
            const handlersPath = path.join(__dirname, 'action-handlers.json');
            if (fs.existsSync(handlersPath)) {
                const data = fs.readFileSync(handlersPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Warning: Could not load action handlers:', error.message);
        }
        return { handlers: {}, fallback: { pattern: 'Perform {action}' } };
    }
    
    /**
     * Load patterns from JSON
     */
    loadPatterns() {
        try {
            const patternsPath = path.join(__dirname, 'patterns.json');
            if (fs.existsSync(patternsPath)) {
                const data = fs.readFileSync(patternsPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Warning: Could not load patterns:', error.message);
        }
        return { selector_patterns: {}, action_patterns: {} };
    }
    
    /**
     * Handle unknown action
     */
    handleUnknown(step, selectors) {
        const action = step.action;
        
        // Check if we have a handler for this action
        if (this.actionHandlers.handlers[action]) {
            return this.applyHandler(step, selectors, this.actionHandlers.handlers[action]);
        }
        
        // Check if we've learned this action
        if (this.learnedActions.has(action)) {
            return this.applyLearnedHandler(step, selectors);
        }
        
        // Apply fallback pattern
        return this.applyFallback(step, selectors);
    }
    
    /**
     * Apply known handler
     */
    applyHandler(step, selectors, handler) {
        let nlp = handler.pattern;
        
        // Replace parameters
        if (handler.parameters) {
            handler.parameters.forEach(param => {
                let value = '';
                
                switch (param) {
                    case 'direction':
                        value = step.meta?.direction || 'down';
                        break;
                    case 'amount':
                        value = step.meta?.amount || step.value || '';
                        break;
                    case 'element':
                    case 'source':
                    case 'target':
                        value = this.getSelectorDescription(selectors, step);
                        break;
                    case 'filename':
                        value = step.meta?.filename || step.value || 'file';
                        break;
                    case 'identifier':
                        value = step.meta?.identifier || step.value || '1';
                        break;
                    default:
                        value = step[param] || step.meta?.[param] || '';
                }
                
                nlp = nlp.replace(`{${param}}`, value);
            });
        }
        
        return nlp.trim();
    }
    
    /**
     * Apply learned handler
     */
    applyLearnedHandler(step, selectors) {
        const handler = this.learnedActions.get(step.action);
        return this.applyHandler(step, selectors, handler);
    }
    
    /**
     * Apply fallback pattern
     */
    applyFallback(step, selectors) {
        const action = step.action.toLowerCase().replace(/_/g, ' ');
        
        // Determine which pattern to use
        if (selectors && (selectors.hint || selectors.text || selectors.xpath)) {
            // Action with target
            const target = this.getSelectorDescription(selectors, step);
            return `${this.capitalize(action)} on ${target}`;
        } else if (step.value) {
            // Action with value
            return `${this.capitalize(action)} with value "${step.value}"`;
        } else {
            // Simple action
            return `Perform ${action}`;
        }
    }
    
    /**
     * Get selector description with fallbacks
     */
    getSelectorDescription(selectors, step) {
        if (!selectors) {
            return step.variable ? `$${step.variable}` : 'element';
        }
        
        // Check for GUESS variable first
        if (selectors.guessVariable) {
            return `$${selectors.guessVariable}`;
        }
        
        // Use priority from patterns
        const priority = this.patterns.selector_patterns?.missing_selector?.priority || 
                        ['hint', 'text', 'id', 'xpath', 'css'];
        
        for (const type of priority) {
            if (selectors[type]) {
                return `"${selectors[type]}"`;
            }
        }
        
        // Final fallback
        return this.patterns.selector_patterns?.missing_selector?.fallback || 'element';
    }
    
    /**
     * Learn from successful conversion
     */
    learn(action, handler) {
        if (!this.actionHandlers.handlers[action]) {
            this.learnedActions.set(action, handler);
            
            // Optionally persist to file
            this.saveLearnedAction(action, handler);
        }
    }
    
    /**
     * Save learned action to file
     */
    saveLearnedAction(action, handler) {
        try {
            const learnedPath = path.join(__dirname, 'learned-actions.json');
            let learned = {};
            
            if (fs.existsSync(learnedPath)) {
                const data = fs.readFileSync(learnedPath, 'utf8');
                learned = JSON.parse(data);
            }
            
            learned[action] = {
                ...handler,
                learned_at: new Date().toISOString()
            };
            
            fs.writeFileSync(learnedPath, JSON.stringify(learned, null, 2));
        } catch (error) {
            console.warn('Warning: Could not save learned action:', error.message);
        }
    }
    
    /**
     * Generate fix instructions for unknown action
     */
    generateFixInstructions(action) {
        const autoFix = this.patterns.auto_fix_rules?.[action];
        
        if (autoFix) {
            return {
                action: action,
                file: 'core/nlp-converter.js',
                location: 'convertStepToNLP method, switch statement',
                suggested_code: `
            case '${action}':
                return this.${autoFix.suggested_handler}(step, selectors);`,
                handler_code: `
    ${autoFix.suggested_handler}(step, selectors) {
        ${autoFix.implementation}
    }`,
                confidence: 0.9
            };
        }
        
        return {
            action: action,
            file: 'core/nlp-converter.js',
            location: 'convertStepToNLP method, switch statement',
            suggested_code: `
            case '${action}':
                // TODO: Implement ${action} handler
                return \`${this.capitalize(action.replace(/_/g, ' '))} \${this.getSelectorDescription(selectors)}\`;`,
            confidence: 0.5
        };
    }
    
    /**
     * Capitalize first letter
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Get all unknown actions that need handlers
     */
    getUnknownActions() {
        return Array.from(this.learnedActions.keys());
    }
}

module.exports = UniversalKnowledge;