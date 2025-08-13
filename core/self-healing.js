/**
 * Self-Healing System - Core V10
 * 
 * Handles errors and unknown situations automatically
 * Generates fixes and continues extraction
 */

const fs = require('fs');
const path = require('path');

class SelfHealingSystem {
    constructor(options = {}) {
        this.autoFix = options.autoFix !== false;
        this.generateInstructions = options.generateInstructions !== false;
        this.logHealing = options.logHealing || false;
        
        this.healingLog = [];
        this.appliedFixes = [];
        this.failedFixes = [];
    }
    
    /**
     * Handle unknown action with self-healing
     */
    handleUnknownAction(step, context = {}) {
        const healing = {
            timestamp: new Date().toISOString(),
            action: step.action,
            checkpoint: context.checkpoint,
            stepNumber: context.stepNumber,
            applied: false,
            fallback: null
        };
        
        // Try to generate fallback NLP
        const fallback = this.generateFallbackNLP(step);
        if (fallback) {
            healing.fallback = fallback;
            healing.applied = true;
            healing.confidence = this.calculateConfidence(step);
            this.appliedFixes.push(healing);
            
            if (this.logHealing) {
                console.log(`   🔧 Self-healed ${step.action}: ${fallback}`);
            }
            
            return fallback;
        }
        
        // If no fallback possible, log failure
        healing.error = 'No fallback pattern available';
        this.failedFixes.push(healing);
        
        return `# [Unknown action: ${step.action}]`;
    }
    
    /**
     * Generate fallback NLP for unknown action
     */
    generateFallbackNLP(step) {
        const action = step.action.toLowerCase().replace(/_/g, ' ');
        
        // Common patterns based on action name
        const patterns = {
            // Navigation patterns
            navigate: () => `Navigate to "${step.value || step.meta?.url || 'page'}"`,
            goto: () => `Go to "${step.value || 'page'}"`,
            open: () => `Open "${step.value || 'page'}"`,
            
            // Interaction patterns
            click: () => `Click on "${step.value || 'element'}"`,
            tap: () => `Tap on "${step.value || 'element'}"`,
            press: () => `Press "${step.value || 'button'}"`,
            
            // Input patterns
            type: () => `Type "${step.value || ''}" in field`,
            enter: () => `Enter "${step.value || ''}"`,
            input: () => `Input "${step.value || ''}"`,
            fill: () => `Fill "${step.value || ''}" in field`,
            
            // Assertion patterns
            verify: () => `Verify "${step.value || 'condition'}"`,
            check: () => `Check "${step.value || 'element'}" exists`,
            ensure: () => `Ensure "${step.value || 'condition'}"`,
            validate: () => `Validate "${step.value || 'element'}"`,
            
            // Wait patterns
            wait: () => `Wait for ${step.value || '1'} seconds`,
            pause: () => `Pause for ${step.value || '1'} seconds`,
            delay: () => `Delay ${step.value || '1'} seconds`,
            
            // Scroll patterns
            scroll: () => {
                const direction = step.meta?.direction || 'down';
                const amount = step.meta?.amount || step.value || '';
                return amount ? `Scroll ${direction} ${amount}` : `Scroll ${direction}`;
            },
            
            // Mouse patterns
            hover: () => `Hover over "${step.value || 'element'}"`,
            mouseover: () => `Mouse over "${step.value || 'element'}"`,
            drag: () => `Drag "${step.value || 'element'}"`,
            drop: () => `Drop on "${step.value || 'target'}"`,
            
            // Form patterns
            select: () => `Select "${step.value || 'option'}"`,
            choose: () => `Choose "${step.value || 'option'}"`,
            pick: () => `Pick "${step.value || 'option'}"`,
            
            // API patterns
            api: () => `Make API call${step.value ? ` to "${step.value}"` : ''}`,
            request: () => `Send request${step.value ? ` to "${step.value}"` : ''}`,
            call: () => `Call API${step.value ? ` "${step.value}"` : ''}`,
            
            // Storage patterns
            store: () => `Store "${step.value || 'value'}"${step.variable ? ` as $${step.variable}` : ''}`,
            save: () => `Save "${step.value || 'value'}"${step.variable ? ` as $${step.variable}` : ''}`,
            set: () => `Set ${step.variable ? `$${step.variable}` : 'variable'} to "${step.value || ''}"`,
            
            // Browser patterns
            refresh: () => 'Refresh the page',
            reload: () => 'Reload the page',
            back: () => 'Go back',
            forward: () => 'Go forward',
            close: () => 'Close current tab',
            switch: () => `Switch to ${step.value || 'tab'}`,
            
            // Upload patterns
            upload: () => `Upload "${step.value || 'file'}"`,
            attach: () => `Attach "${step.value || 'file'}"`,
            
            // Generic fallback
            default: () => {
                if (step.value && step.variable) {
                    return `${this.capitalize(action)} $${step.variable} with value "${step.value}"`;
                } else if (step.value) {
                    return `${this.capitalize(action)} "${step.value}"`;
                } else if (step.variable) {
                    return `${this.capitalize(action)} $${step.variable}`;
                } else {
                    return `Perform ${action}`;
                }
            }
        };
        
        // Find matching pattern
        for (const [key, generator] of Object.entries(patterns)) {
            if (key === 'default') continue;
            if (action.includes(key)) {
                return generator();
            }
        }
        
        // Use default pattern
        return patterns.default();
    }
    
    /**
     * Handle missing variable with self-healing
     */
    handleMissingVariable(varName, context = {}) {
        const healing = {
            timestamp: new Date().toISOString(),
            variable: varName,
            context: context,
            applied: false,
            solution: null
        };
        
        // Try to find variable in different sources
        const sources = [
            () => this.searchInDataAttributes(varName, context),
            () => this.searchInEnvironment(varName, context),
            () => this.searchInSteps(varName, context),
            () => this.inferFromName(varName)
        ];
        
        for (const search of sources) {
            const result = search();
            if (result) {
                healing.solution = result;
                healing.applied = true;
                this.appliedFixes.push(healing);
                
                if (this.logHealing) {
                    console.log(`   🔧 Found missing variable $${varName}: ${result.value}`);
                }
                
                return result;
            }
        }
        
        // If not found, create placeholder
        healing.solution = {
            value: `[Missing: $${varName}]`,
            type: 'PLACEHOLDER',
            source: 'self-healing'
        };
        this.failedFixes.push(healing);
        
        return healing.solution;
    }
    
    /**
     * Search for variable in data attributes
     */
    searchInDataAttributes(varName, context) {
        if (context.dataAttributes) {
            // Case-insensitive search
            for (const [key, value] of Object.entries(context.dataAttributes)) {
                if (key.toLowerCase() === varName.toLowerCase()) {
                    return {
                        value: value,
                        type: 'DATA_ATTRIBUTE',
                        source: 'auto-discovered'
                    };
                }
            }
        }
        return null;
    }
    
    /**
     * Search for variable in environment
     */
    searchInEnvironment(varName, context) {
        if (context.environments) {
            for (const env of context.environments) {
                if (env.variables) {
                    for (const varData of Object.values(env.variables)) {
                        if (varData.name === varName || 
                            varData.name?.toLowerCase() === varName.toLowerCase()) {
                            return {
                                value: varData.value,
                                type: 'ENVIRONMENT',
                                source: 'auto-discovered'
                            };
                        }
                    }
                }
            }
        }
        return null;
    }
    
    /**
     * Search for variable in steps
     */
    searchInSteps(varName, context) {
        if (context.steps) {
            for (const step of context.steps) {
                if (step.variable === varName && step.value) {
                    return {
                        value: step.value,
                        type: 'STEP_VALUE',
                        source: 'auto-discovered'
                    };
                }
            }
        }
        return null;
    }
    
    /**
     * Infer variable value from name
     */
    inferFromName(varName) {
        const lowerName = varName.toLowerCase();
        
        // Common patterns
        if (lowerName.includes('url')) {
            return {
                value: 'https://example.com',
                type: 'INFERRED',
                source: 'name-pattern'
            };
        }
        
        if (lowerName.includes('username') || lowerName.includes('user')) {
            return {
                value: 'testuser',
                type: 'INFERRED',
                source: 'name-pattern'
            };
        }
        
        if (lowerName.includes('password') || lowerName.includes('pwd')) {
            return {
                value: '********',
                type: 'INFERRED',
                source: 'name-pattern'
            };
        }
        
        if (lowerName.includes('email')) {
            return {
                value: 'test@example.com',
                type: 'INFERRED',
                source: 'name-pattern'
            };
        }
        
        return null;
    }
    
    /**
     * Handle selector fallback chain
     */
    handleSelectorFallback(step, selectors) {
        const fallbackChain = [
            () => selectors.guessVariable ? `$${selectors.guessVariable}` : null,
            () => selectors.hint ? `"${selectors.hint}"` : null,
            () => selectors.text ? `"${selectors.text}"` : null,
            () => selectors.id ? `element with id "${selectors.id}"` : null,
            () => selectors.xpath ? 'element by xpath' : null,
            () => selectors.css ? 'element by css' : null,
            () => step.variable ? `$${step.variable}` : null,
            () => step.value ? `"${step.value}"` : null,
            () => 'element on page'
        ];
        
        for (const getFallback of fallbackChain) {
            const result = getFallback();
            if (result) {
                if (this.logHealing) {
                    console.log(`   🔧 Using selector fallback: ${result}`);
                }
                return result;
            }
        }
        
        return 'element';
    }
    
    /**
     * Calculate confidence for a fix
     */
    calculateConfidence(step) {
        let confidence = 0.5; // Base confidence
        
        // Increase confidence based on available data
        if (step.value) confidence += 0.2;
        if (step.variable) confidence += 0.1;
        if (step.meta && Object.keys(step.meta).length > 0) confidence += 0.1;
        if (step.selectors || step.element) confidence += 0.1;
        
        // Known action patterns increase confidence
        const knownPatterns = ['click', 'write', 'navigate', 'assert', 'store'];
        const actionLower = step.action.toLowerCase();
        if (knownPatterns.some(p => actionLower.includes(p))) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }
    
    /**
     * Generate healing report
     */
    generateHealingReport() {
        return {
            timestamp: new Date().toISOString(),
            summary: {
                total_healed: this.appliedFixes.length,
                total_failed: this.failedFixes.length,
                success_rate: this.appliedFixes.length / 
                    (this.appliedFixes.length + this.failedFixes.length) * 100
            },
            applied_fixes: this.appliedFixes,
            failed_fixes: this.failedFixes,
            recommendations: this.generateRecommendations()
        };
    }
    
    /**
     * Generate recommendations for permanent fixes
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Group unknown actions
        const unknownActions = {};
        this.appliedFixes.forEach(fix => {
            if (fix.action) {
                unknownActions[fix.action] = (unknownActions[fix.action] || 0) + 1;
            }
        });
        
        // Generate recommendations for frequently occurring unknowns
        Object.entries(unknownActions).forEach(([action, count]) => {
            if (count >= 2) {
                recommendations.push({
                    type: 'ADD_HANDLER',
                    action: action,
                    frequency: count,
                    priority: 'HIGH',
                    suggestion: `Add permanent handler for ${action} action (occurred ${count} times)`
                });
            }
        });
        
        // Recommendations for failed fixes
        if (this.failedFixes.length > 0) {
            recommendations.push({
                type: 'REVIEW_FAILURES',
                count: this.failedFixes.length,
                priority: 'MEDIUM',
                suggestion: 'Review failed self-healing attempts to improve patterns'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Save healing report to file
     */
    saveHealingReport(folderPath) {
        const report = this.generateHealingReport();
        const reportPath = path.join(folderPath, '.accuracy', 'HEALING_REPORT.json');
        
        // Ensure directory exists
        const dir = path.dirname(reportPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        return reportPath;
    }
    
    /**
     * Capitalize first letter
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Reset healing system
     */
    reset() {
        this.healingLog = [];
        this.appliedFixes = [];
        this.failedFixes = [];
    }
}

module.exports = SelfHealingSystem;