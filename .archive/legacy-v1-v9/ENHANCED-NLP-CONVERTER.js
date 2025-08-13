#!/usr/bin/env node

/**
 * Enhanced Virtuoso API to NLP Converter
 * Handles ALL patterns from Virtuoso NLP documentation
 * Ready for execution 88715 and any other execution
 */

class EnhancedVirtuosoNLPConverter {
    constructor() {
        // Complete action mapping including all patterns from NLP PDF
        this.actionPatterns = {
            // Navigation
            'navigate': (data) => `Navigate to "${data.target || data.value || data.url}"`,
            'browse': (data) => `Navigate to "${data.target || data.value}"`,
            'go': (data) => `Navigate to "${data.target || data.value}"`,
            'open': (data) => `Navigate to "${data.target || data.value}"`,
            
            // Click actions
            'click': (data) => this.formatClick(data),
            'mouse_click': (data) => this.formatMouseClick(data),
            'mouse_double_click': (data) => `Mouse double click ${this.formatElement(data.selector || data.target)}`,
            'mouse_right_click': (data) => `Mouse right click ${this.formatElement(data.selector || data.target)}`,
            
            // Mouse actions
            'mouse_hover': (data) => `Mouse hover ${this.formatElement(data.selector || data.target)}`,
            'mouse_over': (data) => `Mouse over ${this.formatElement(data.selector || data.target)}`,
            'mouse_move': (data) => this.formatMouseMove(data),
            'mouse_drag': (data) => `Mouse drag ${this.formatElement(data.source)} to ${this.formatElement(data.target)}`,
            'hover': (data) => `Mouse hover ${this.formatElement(data.selector || data.target)}`,
            
            // Input actions
            'type': (data) => this.formatWrite(data),
            'write': (data) => this.formatWrite(data),
            'enter': (data) => this.formatWrite(data),
            'clear': (data) => `Clear field ${this.formatElement(data.selector)}`,
            
            // Select/Pick actions
            'select': (data) => this.formatSelect(data),
            'pick': (data) => this.formatSelect(data),
            
            // Wait actions
            'wait': (data) => this.formatWait(data),
            'pause': (data) => this.formatWait(data),
            'wait_for_element': (data) => `Look for element ${this.formatElement(data.selector)} on page`,
            'wait_for_text': (data) => `Wait for "${data.text}"`,
            'wait_for_url': (data) => `Wait for URL containing "${data.url}"`,
            
            // Store actions
            'store': (data) => this.formatStore(data),
            'save': (data) => this.formatStore(data),
            'capture': (data) => this.formatStore(data),
            
            // Frame and tab actions
            'switch': (data) => this.formatSwitch(data),
            'switch_iframe': (data) => `Switch iframe to "${data.value || data.frame}"`,
            'switch_tab': (data) => `Switch to ${data.value || 'next'} tab`,
            'switch_window': (data) => `Switch to ${data.value || 'next'} window`,
            
            // Scroll actions
            'scroll': (data) => this.formatScroll(data),
            'scroll_to': (data) => this.formatScroll(data),
            'scroll_by': (data) => `Scroll by ${data.x || 0}, ${data.y || 0}`,
            
            // Upload actions
            'upload': (data) => `Upload "${data.file || data.value}" to ${this.formatElement(data.selector || data.target)}`,
            'attach': (data) => `Upload "${data.file || data.value}" to ${this.formatElement(data.selector || data.target)}`,
            
            // Cookie actions
            'cookie_create': (data) => `Cookie create "${data.name}" as "${data.value}"`,
            'cookie_delete': (data) => `Cookie delete "${data.name}"`,
            'cookie_wipe': (data) => `Cookie wipe all`,
            'cookie_get': (data) => `Cookie get "${data.name}"`,
            
            // Window actions
            'window_resize': (data) => `Window resize to ${data.width || data.x}, ${data.height || data.y}`,
            'window_maximize': (data) => `Window maximize`,
            'window_minimize': (data) => `Window minimize`,
            
            // Execute extension
            'execute': (data) => `Execute "${data.script || data.name || data.value}"`,
            'run_script': (data) => `Execute "${data.script || data.name}"`,
            
            // Dismiss actions
            'dismiss': (data) => this.formatDismiss(data),
            'accept': (data) => `Accept alert`,
            'cancel': (data) => `Cancel alert`,
            
            // Press keyboard keys
            'press': (data) => this.formatPress(data),
            'key': (data) => this.formatPress(data),
            'keyboard': (data) => this.formatPress(data),
            
            // Assertions
            'assert': (data) => this.formatAssertion(data),
            'verify': (data) => this.formatAssertion(data),
            'check': (data) => this.formatAssertion(data),
            'validate': (data) => this.formatAssertion(data),
            'assert_exists': (data) => `Look for element ${this.formatElement(data.selector)} on page`,
            'assert_not_exists': (data) => `Assert that element ${this.formatElement(data.selector)} does not exist on page`,
            'assert_equals': (data) => `Assert that element ${this.formatElement(data.selector)} equals "${data.expected}"`,
            'assert_contains': (data) => `Assert that element ${this.formatElement(data.selector)} contains "${data.expected}"`,
            'assert_selected': (data) => `Assert that "${data.value}" is selected in ${this.formatElement(data.selector)}`,
            'assert_checked': (data) => `Assert that element ${this.formatElement(data.selector)} is checked`,
            
            // API calls
            'api_call': (data) => this.formatAPICall(data),
            'api': (data) => this.formatAPICall(data),
            'request': (data) => this.formatAPICall(data),
            
            // Comments (usually filtered out)
            'comment': (data) => `// ${data.text || data.value}`,
            
            // Screenshot (no NLP representation)
            'screenshot': () => null,
            'capture_screenshot': () => null,
            
            // Special/Custom actions
            'custom': (data) => this.formatCustomAction(data),
            'unknown': (data) => `// Unknown action: ${JSON.stringify(data)}`
        };
    }

    formatClick(data) {
        const element = this.formatElement(data.selector || data.target);
        
        // Handle position hints (top, bottom, left, right)
        if (data.position) {
            return `Click on ${data.position} ${element}`;
        }
        
        // Handle element type hints
        if (data.elementType) {
            return `Click on ${data.elementType} ${element}`;
        }
        
        return `Click on ${element}`;
    }

    formatMouseClick(data) {
        // Handle coordinate-based clicks
        if (data.coordinates || (data.x !== undefined && data.y !== undefined)) {
            if (data.variable) {
                return `Mouse click ${data.variable}`;
            }
            return `Mouse click coordinates(${data.x || 0},${data.y || 0})`;
        }
        
        // Handle element-based clicks
        return `Mouse click ${this.formatElement(data.selector || data.target)}`;
    }

    formatMouseMove(data) {
        if (data.relative) {
            return `Mouse move by ${data.x || 0}, ${data.y || 0}`;
        }
        if (data.x !== undefined && data.y !== undefined) {
            return `Mouse move to ${data.x}, ${data.y}`;
        }
        return `Mouse move to ${this.formatElement(data.selector || data.target)}`;
    }

    formatWrite(data) {
        const value = this.formatValue(data.value);
        const field = this.formatElement(data.selector || data.target);
        
        // Handle append mode
        if (data.append) {
            return `Append ${value} to field ${field}`;
        }
        
        // Handle clear and type
        if (data.clear) {
            return `Clear and write ${value} in field ${field}`;
        }
        
        // Standard write
        const fieldName = field.replace(/^"|"$/g, '');
        return `Write ${value} in field "${fieldName}"`;
    }

    formatSelect(data) {
        // Handle option by index
        if (data.index !== undefined) {
            if (data.index === -1) {
                return `Pick last option from ${this.formatElement(data.selector)}`;
            }
            return `Pick option ${data.index} from ${this.formatElement(data.selector)}`;
        }
        
        // Handle option by value
        const value = this.formatValue(data.value || data.option);
        const selector = this.formatElement(data.selector || data.target);
        return `Pick ${value} from ${selector}`;
    }

    formatWait(data) {
        if (data.duration) {
            const seconds = Math.round(data.duration / 1000);
            if (seconds === 1) {
                return `Wait 1 second`;
            }
            return `Wait ${seconds} seconds`;
        }
        
        if (data.element || data.selector) {
            const element = this.formatElement(data.element || data.selector);
            if (data.timeout) {
                const seconds = Math.round(data.timeout / 1000);
                return `Wait ${seconds} seconds for ${element}`;
            }
            return `Wait for ${element}`;
        }
        
        return null;
    }

    formatStore(data) {
        const storeTypes = {
            'text': 'element text',
            'value': 'value',
            'attribute': 'attribute',
            'property': 'property',
            'url': 'current URL',
            'title': 'page title'
        };
        
        const type = storeTypes[data.type] || 'value';
        
        if (data.selector) {
            return `Store ${type} of ${this.formatElement(data.selector)} in ${data.variable}`;
        }
        
        return `Store ${type} "${data.value}" in ${data.variable}`;
    }

    formatSwitch(data) {
        if (data.target === 'iframe' || data.type === 'iframe') {
            if (data.value === 'parent') {
                return `Switch to parent iframe`;
            }
            return `Switch iframe to "${data.value || data.frame}"`;
        }
        
        if (data.target === 'tab' || data.type === 'tab') {
            if (data.value === 'next') {
                return `Switch to next tab`;
            }
            if (data.value === 'previous') {
                return `Switch to previous tab`;
            }
            return `Switch to tab ${data.value || data.index}`;
        }
        
        if (data.target === 'window' || data.type === 'window') {
            return `Switch to ${data.value || 'next'} window`;
        }
        
        return `Switch to ${data.target}`;
    }

    formatScroll(data) {
        if (data.selector || data.element) {
            return `Scroll to ${this.formatElement(data.selector || data.element)}`;
        }
        
        if (data.position === 'top') {
            return `Scroll to page top`;
        }
        
        if (data.position === 'bottom') {
            return `Scroll to page bottom`;
        }
        
        if (data.x !== undefined || data.y !== undefined) {
            return `Scroll to ${data.x || 0}, ${data.y || 0}`;
        }
        
        return `Scroll`;
    }

    formatDismiss(data) {
        if (data.type === 'prompt' && data.value) {
            return `Dismiss prompt respond "${data.value}"`;
        }
        
        if (data.type === 'confirm') {
            return data.accept ? `Accept confirm` : `Cancel confirm`;
        }
        
        return `Dismiss alert`;
    }

    formatPress(data) {
        const key = data.key || data.value;
        const target = data.selector ? ` in ${this.formatElement(data.selector)}` : '';
        
        // Handle key combinations (CTRL_A, COMMAND_C, etc.)
        if (key && key.includes('_')) {
            return `Press "${key}"${target}`;
        }
        
        // Handle special keys
        if (key && key.toUpperCase() === key) {
            return `Press ${key}${target}`;
        }
        
        return `Press "${key}"${target}`;
    }

    formatAssertion(data) {
        const assertionTypes = {
            'exists': () => `Look for element ${this.formatElement(data.selector)} on page`,
            'not_exists': () => `Assert that element ${this.formatElement(data.selector)} does not exist on page`,
            'equals': () => `Assert that element ${this.formatElement(data.selector)} equals "${data.expected}"`,
            'not_equals': () => `Assert that element ${this.formatElement(data.selector)} is not equal to "${data.expected}"`,
            'contains': () => `Assert that element ${this.formatElement(data.selector)} contains "${data.expected}"`,
            'less_than': () => `Assert that element ${this.formatElement(data.selector)} is less than "${data.expected}"`,
            'greater_than': () => `Assert that element ${this.formatElement(data.selector)} is greater than "${data.expected}"`,
            'matches': () => `Assert that element ${this.formatElement(data.selector)} matches "${data.expected}"`,
            'selected': () => `Assert that "${data.value}" is selected in ${this.formatElement(data.selector)}`,
            'checked': () => `Assert that element ${this.formatElement(data.selector)} is checked`,
            'visible': () => `Assert that element ${this.formatElement(data.selector)} is visible`,
            'enabled': () => `Assert that element ${this.formatElement(data.selector)} is enabled`
        };
        
        const formatter = assertionTypes[data.type || data.assertion];
        if (formatter) {
            return formatter();
        }
        
        // Default assertion
        return `Assert ${data.type || 'condition'}`;
    }

    formatAPICall(data) {
        const name = data.name || data.endpoint || data.api;
        const params = data.params || data.parameters || [];
        const variable = data.variable || data.returning || '$response';
        
        if (Array.isArray(params) && params.length > 0) {
            const paramString = params.map(p => {
                if (typeof p === 'string' && p.startsWith('$')) {
                    return p;
                }
                return `"${p}"`;
            }).join(', ');
            return `API call "${name}"(${paramString}) returning ${variable}`;
        }
        
        return `API call "${name}" returning ${variable}`;
    }

    formatCustomAction(data) {
        // Handle any custom actions that don't fit standard patterns
        if (data.nlp) {
            return data.nlp; // Use provided NLP if available
        }
        
        return `// Custom action: ${data.description || data.action}`;
    }

    formatElement(selector) {
        if (!selector || selector === undefined || selector === null) {
            return '"element"';
        }
        
        // If it's already a variable
        if (typeof selector === 'string' && selector.startsWith('$')) {
            return selector;
        }
        
        // If it's an XPath
        if (typeof selector === 'string' && selector.startsWith('/')) {
            return `"${selector}"`;
        }
        
        // If it's a CSS selector
        if (typeof selector === 'string' && (selector.startsWith('#') || selector.startsWith('.'))) {
            // Try to extract a readable name
            const match = selector.match(/#([^.\s]+)|\.([^.\s]+)/);
            if (match) {
                const name = match[1] || match[2];
                return `"${name.replace(/[-_]/g, ' ')}"`;
            }
            return `"${selector}"`;
        }
        
        // If it's an object with selector type
        if (selector.type === 'xpath') {
            return `"${selector.value}"`;
        } else if (selector.type === 'css') {
            return this.formatElement(selector.value);
        }
        
        // Default: treat as element name
        return `"${selector}"`;
    }

    formatValue(value) {
        if (value === null || value === undefined || value === '') {
            return '""';
        }
        
        // If it's a variable
        if (typeof value === 'string' && value.startsWith('$')) {
            return value;
        }
        
        // If it contains variable expression syntax ${...}
        if (typeof value === 'string' && value.includes('${')) {
            return value;
        }
        
        // Handle masked values
        if (typeof value === 'string' && value === '********') {
            return '"********"';
        }
        
        // Regular value
        return `"${value}"`;
    }

    /**
     * Main conversion method
     */
    convertToNLP(executionData, options = {}) {
        const nlpCommands = [];
        
        // Handle both execution and journey data structures
        const checkpoints = executionData.checkpoints || executionData.item?.checkpoints || [];
        
        checkpoints.forEach((checkpoint, checkpointIndex) => {
            // Add checkpoint header
            if (options.includeCheckpoints !== false) {
                nlpCommands.push(`// Checkpoint ${checkpointIndex + 1}: ${checkpoint.name || 'Unnamed'}`);
            }
            
            if (options.includeTimings && checkpoint.duration) {
                const seconds = (checkpoint.duration / 1000).toFixed(3);
                nlpCommands.push(`// Duration: ${seconds}s`);
            }
            
            // Process steps
            const steps = checkpoint.steps || [];
            steps.forEach(step => {
                // Skip failed or skipped steps if requested
                if (options.skipFailed && step.status === 'failed') return;
                if (options.skipSkipped && step.status === 'skipped') return;
                
                const nlpCommand = this.convertStepToNLP(step);
                if (nlpCommand) {
                    let output = nlpCommand;
                    
                    // Add timing if requested
                    if (options.includeTimings && step.duration) {
                        const ms = step.duration;
                        const seconds = (ms / 1000).toFixed(3);
                        output += ` // ${seconds}s`;
                    }
                    
                    // Add status if requested
                    if (options.includeStatus && step.status) {
                        output += ` [${step.status.toUpperCase()}]`;
                    }
                    
                    nlpCommands.push(output);
                }
            });
            
            // Add assertions if present
            if (checkpoint.assertions) {
                checkpoint.assertions.forEach(assertion => {
                    const assertionNLP = this.convertAssertionToNLP(assertion);
                    if (assertionNLP) {
                        nlpCommands.push(assertionNLP);
                    }
                });
            }
            
            // Add blank line between checkpoints
            if (options.includeCheckpoints !== false) {
                nlpCommands.push('');
            }
        });
        
        return nlpCommands;
    }

    /**
     * Convert individual step to NLP
     */
    convertStepToNLP(step) {
        const action = step.action?.toLowerCase();
        
        if (!action) {
            return null;
        }
        
        // Check if we have a converter for this action
        const converter = this.actionPatterns[action];
        if (converter) {
            return converter(step);
        }
        
        // Log unknown action for debugging
        console.warn(`Unknown action type: ${action}`);
        return `// Unknown action: ${action}`;
    }

    /**
     * Convert assertion to NLP
     */
    convertAssertionToNLP(assertion) {
        return this.formatAssertion(assertion);
    }
}

// Export for use in other modules
module.exports = EnhancedVirtuosoNLPConverter;

// CLI interface
if (require.main === module) {
    const fs = require('fs');
    const converter = new EnhancedVirtuosoNLPConverter();
    
    // Example usage
    console.log('Enhanced Virtuoso NLP Converter - Ready for ALL patterns');
    console.log('Supports: navigation, clicks, mouse actions, inputs, selects, waits,');
    console.log('          store, frames, scrolls, uploads, cookies, windows, execute,');
    console.log('          dismiss, keyboard, assertions, API calls, and more!\n');
    
    const args = process.argv.slice(2);
    if (args[0]) {
        const inputFile = args[0];
        const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
        const options = {
            includeTimings: args.includes('--timings'),
            includeStatus: args.includes('--status'),
            skipFailed: args.includes('--skip-failed'),
            skipSkipped: args.includes('--skip-skipped')
        };
        
        const nlpCommands = converter.convertToNLP(data, options);
        nlpCommands.forEach(cmd => console.log(cmd));
    }
}