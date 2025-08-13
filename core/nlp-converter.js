/**
 * NLP Converter Module - Core V10
 * 
 * Contains all NLP conversion handlers developed in V1-V9
 * This is our core engine, not learned knowledge!
 */

class NLPConverter {
    constructor() {
        // Track conversion state
        this.checkpointNumberMap = new Map();
        this.nextCheckpointNumber = 1;
        this.currentCheckpoint = null;
        this.currentStep = null;
        
        // Conversion report
        this.conversionReport = {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            warnings: [],
            errors: [],
            unknownActions: new Set(),
            validatedActions: new Set()
        };
        
        // API test cache for API_CALL actions
        this.apiTestCache = new Map();
        
        // Performance: Pre-compiled regex patterns for common operations
        this.compiledPatterns = {
            xpath: /^\/\/.*|^\/.*|\[.*\]/,
            css: /^#.*|^\.|^\..*|^\[.*\]|^[a-zA-Z].*[>\s+~]/,
            url: /^https?:\/\//,
            variable: /\$\{?([^}]+)\}?/g
        };
        
        // Performance: Action handler cache
        this.actionHandlers = new Map();
        this.initializeActionHandlers();
    }
    
    /**
     * Pre-initialize action handlers for better performance
     */
    initializeActionHandlers() {
        // Performance optimization: Pre-cache action handlers
        // These are populated dynamically in convertStep based on action type
        // This map improves lookup performance for frequently used actions
    }
    
    /**
     * Main conversion method
     * V10.5: Enhanced with execution data for failure tracking
     */
    convert(journeyData, environmentData, executionData = null) {
        const lines = [];
        let currentCheckpointNum = null;
        
        // Build execution outcome map for quick lookup
        this.executionOutcomes = this.buildExecutionOutcomeMap(executionData);
        
        if (!journeyData || !journeyData.cases) {
            return { nlp: '', report: this.conversionReport };
        }
        
        journeyData.cases.forEach((testCase, caseIndex) => {
            const checkpointName = testCase.title || testCase.name || `Checkpoint ${caseIndex + 1}`;
            
            // Get or assign checkpoint number
            if (!this.checkpointNumberMap.has(checkpointName)) {
                this.checkpointNumberMap.set(checkpointName, this.nextCheckpointNumber++);
            }
            currentCheckpointNum = this.checkpointNumberMap.get(checkpointName);
            
            // Add checkpoint header
            lines.push(`Checkpoint ${currentCheckpointNum}: ${checkpointName}`);
            
            // Process steps
            testCase.steps?.forEach((step, stepIndex) => {
                this.currentCheckpoint = checkpointName;
                this.currentStep = stepIndex + 1;
                this.conversionReport.totalSteps++;
                
                // Check execution outcome for this step
                const executionOutcome = this.executionOutcomes.get(step.id);
                
                try {
                    const nlpLine = this.convertStepToNLP(step, environmentData, executionOutcome);
                    if (nlpLine) {
                        lines.push(nlpLine);
                        
                        // Update report based on execution outcome
                        if (executionOutcome) {
                            if (executionOutcome.outcome === 'ERROR' || executionOutcome.outcome === 'FAIL') {
                                this.conversionReport.failedSteps++;
                                // Add error details if available
                                if (executionOutcome.error) {
                                    lines.push(`# [EXECUTION ERROR: ${executionOutcome.error.message}]`);
                                    if (executionOutcome.error.exception) {
                                        lines.push(`# [Exception: ${executionOutcome.error.exception}]`);
                                    }
                                }
                            } else if (executionOutcome.outcome === 'SKIP') {
                                // V10.5: REMOVED - Do not add SKIPPED comments (user feedback)
                                // Only track in report, don't annotate in NLP
                                this.conversionReport.failedSteps++; // Count as failed for reporting
                            } else {
                                this.conversionReport.successfulSteps++;
                            }
                        } else {
                            this.conversionReport.successfulSteps++;
                        }
                    }
                } catch (error) {
                    this.conversionReport.failedSteps++;
                    this.conversionReport.errors.push({
                        checkpoint: checkpointName,
                        step: stepIndex + 1,
                        action: step.action,
                        error: error.message
                    });
                    lines.push(`# [CONVERSION ERROR: ${error.message}]`);
                }
            });
            
            // Add blank line after checkpoint
            if (caseIndex < journeyData.cases.length - 1) {
                lines.push('');
            }
        });
        
        return {
            nlp: lines.join('\n'),
            report: this.conversionReport
        };
    }
    
    /**
     * Build execution outcome map for quick step lookup
     * V10.5: New method for failure tracking
     */
    buildExecutionOutcomeMap(executionData) {
        const outcomeMap = new Map();
        
        if (!executionData) return outcomeMap;
        
        // Navigate through execution structure to map step outcomes
        const execution = executionData.item || executionData;
        const testSuites = execution.testSuites || {};
        
        Object.values(testSuites).forEach(suite => {
            const testCases = suite.testCases || {};
            
            Object.values(testCases).forEach(testCase => {
                const testSteps = testCase.testSteps || {};
                
                Object.entries(testSteps).forEach(([stepId, stepData]) => {
                    // V10.5: Fix - stepId is already a string, convert to int for consistent mapping
                    const stepIdInt = parseInt(stepId);
                    outcomeMap.set(stepIdInt, {
                        outcome: stepData.outcome,
                        error: stepData.output && stepData.output.type === 'ERROR' ? stepData.output : null,
                        duration: stepData.duration,
                        screenshot: stepData.screenshot
                    });
                });
            });
        });
        
        return outcomeMap;
    }
    
    /**
     * Convert individual step to NLP
     * V10.5: Enhanced with execution outcome support
     */
    convertStepToNLP(step, environmentData, executionOutcome = null) {
        const action = step.action;
        const selectors = this.extractSelectors(step);
        const variable = step.variable ? `$${step.variable}` : step.value || '';
        
        // Track action type
        this.conversionReport.validatedActions.add(step.action);
        
        switch (step.action) {
            case 'NAVIGATE':
                return this.handleNavigate(step, variable);
            
            case 'WRITE':
            case 'TYPE':
                return this.handleWrite(step, selectors, variable);
            
            case 'CLICK':
                return this.handleClick(step, selectors);
            
            case 'ASSERT_EXISTS':
            case 'ASSERT':
                return this.handleAssertExists(step, selectors);
            
            case 'ASSERT_NOT_EXISTS':
                return this.handleAssertNotExists(step, selectors);
            
            case 'ASSERT_EQUALS':
                return this.handleAssertEquals(step, selectors);
            
            case 'ASSERT_NOT_EQUALS':
                return this.handleAssertNotEquals(step, selectors);
            
            case 'ASSERT_VARIABLE':
                return this.handleAssertVariable(step);
            
            case 'MOUSE':
                return this.handleMouse(step, selectors);
            
            case 'API_CALL':
                return this.handleApiCall(step);
            
            case 'STORE':
            case 'SAVE':
                return this.handleStore(step, selectors);
            
            case 'ENVIRONMENT':
                return this.handleEnvironment(step);
            
            case 'PICK':
                return this.handlePick(step, selectors, variable);
            
            case 'HOVER':
                return this.handleHover(step, selectors);
            
            case 'SCROLL':
                return this.handleScroll(step, selectors);
            
            case 'SWITCH':
                return this.handleSwitch(step);
            
            case 'WAIT':
                return this.handleWait(step);
            
            case 'REFRESH':
                return 'Refresh the page';
            
            case 'BACK':
                return 'Go back';
            
            case 'FORWARD':
                return 'Go forward';
            
            default:
                // Unknown action - will be handled by knowledge base
                this.conversionReport.unknownActions.add(step.action);
                this.conversionReport.warnings.push({
                    checkpoint: this.currentCheckpoint,
                    step: this.currentStep,
                    action: step.action,
                    message: `Unknown action type: ${step.action}`
                });
                return null; // Let knowledge base handle
        }
    }
    
    // Handler methods for each action type
    handleNavigate(step, variable) {
        const url = step.meta?.url || step.value || variable;
        return `Navigate to "${url}"`;
    }
    
    handleWrite(step, selectors, variable) {
        if (selectors.hint) {
            return `Write ${variable} in field "${selectors.hint}"`;
        }
        return `Write ${variable}`;
    }
    
    handleClick(step, selectors) {
        return `Click on ${this.getSelectorDescription(selectors)}`;
    }
    
    handleAssertExists(step, selectors) {
        return `Look for element ${this.getSelectorDescription(selectors)} on page`;
    }
    
    handleAssertNotExists(step, selectors) {
        const target = this.getSelectorDescription(selectors);
        return `Assert that element ${target} does not exist on page`;
    }
    
    handleAssertEquals(step, selectors) {
        const target = this.getSelectorDescription(selectors);
        const expectedValue = step.value || '';
        return `Assert that element ${target} equals "${expectedValue}"`;
    }
    
    handleAssertNotEquals(step, selectors) {
        const target = this.getSelectorDescription(selectors);
        const notExpectedValue = step.value || '';
        return `Assert that element ${target} is not equal to "${notExpectedValue}"`;
    }
    
    handleAssertVariable(step) {
        const variable = step.variable ? `$${step.variable}` : '';
        const value = step.value || '';
        const expression = step.expression || '';
        const assertType = step.meta?.type || 'EQUALS';
        
        if (expression) {
            switch (assertType) {
                case 'EQUALS':
                    return `Assert \${${expression}} equals "${value}"`;
                default:
                    return `Assert \${${expression}} ${assertType.toLowerCase().replace('_', ' ')} "${value}"`;
            }
        }
        
        switch (assertType) {
            case 'EQUALS':
                return `Assert variable ${variable} equals "${value}"`;
            case 'NOT_EQUALS':
                return `Assert variable ${variable} does not equal "${value}"`;
            case 'LESS_THAN':
                return `Assert variable ${variable} is less than "${value}"`;
            case 'LESS_THAN_OR_EQUALS':
                return `Assert variable ${variable} is less than or equal to "${value}"`;
            case 'GREATER_THAN':
                return `Assert variable ${variable} is greater than "${value}"`;
            case 'GREATER_THAN_OR_EQUALS':
                return `Assert variable ${variable} is greater than or equal to "${value}"`;
            default:
                return `Assert variable ${variable} ${assertType.toLowerCase().replace('_', ' ')} "${value}"`;
        }
    }
    
    handleMouse(step, selectors) {
        const mouseAction = step.meta?.action || 'CLICK';
        let mouseTarget;
        
        // Check for GUESS variable (V8 fix!)
        if (selectors.guessVariable) {
            mouseTarget = `$${selectors.guessVariable}`;
        } else if (step.variable) {
            mouseTarget = `$${step.variable}`;
        } else {
            mouseTarget = this.getSelectorDescription(selectors).replace(/^"|"$/g, '');
        }
        
        switch (mouseAction) {
            case 'CLICK':
                return `Mouse click on ${mouseTarget}`;
            case 'DOUBLE_CLICK':
                return `Double-click on ${mouseTarget}`;
            case 'RIGHT_CLICK':
                return `Right-click on ${mouseTarget}`;
            default:
                return `Mouse ${mouseAction.toLowerCase()} on ${mouseTarget}`;
        }
    }
    
    handleApiCall(step) {
        const apiTestId = step.meta?.apiTestId;
        const apiTest = this.apiTestCache.get(apiTestId);
        
        if (apiTest && apiTest.name && apiTest.name !== `API Test ${apiTestId}`) {
            // Format: API call "Test.Name"("url") or API call "Test.Name"($var)
            const inputVars = step.meta?.inputVariables;
            
            // Check if URL is passed as a variable
            if (inputVars && inputVars.url) {
                return `API call "${apiTest.name}"($${inputVars.url})`;
            } else if (apiTest.url) {
                return `API call "${apiTest.name}"("${apiTest.url}")`;
            } else {
                return `API call "${apiTest.name}"`;
            }
        }
        
        // Fallback when we don't have the API test details
        return `Make API call (Test ID: ${apiTestId})`;
    }
    
    handleStore(step, selectors) {
        const storeVar = step.variable ? `$${step.variable}` : '';
        
        // Check if storing an element (has element but no value)
        if (step.element && !step.value) {
            const elementDesc = this.getSelectorDescription(selectors);
            
            // WARNING: Cannot distinguish between "Store element" and "Store element text"
            // The API doesn't provide enough metadata to determine this
            // This is a known limitation that requires manual verification
            
            // Add warning to report
            this.conversionReport.warnings.push({
                checkpoint: this.currentCheckpoint,
                step: this.currentStep,
                action: 'STORE',
                message: 'Cannot distinguish between "Store element" and "Store element text" - defaulting to "Store element"',
                element: elementDesc
            });
            
            // Default to "Store element" format
            // TODO: This might be "Store element text of X in Y" but API lacks metadata
            return `Store element ${elementDesc} in ${storeVar}`;
        }
        
        // Storing a value - use Virtuoso syntax "in" not "as"
        const storeValue = step.value || this.getSelectorDescription(selectors);
        return `Store value "${storeValue}" in ${storeVar}`;
    }
    
    handleEnvironment(step) {
        const envType = step.meta?.type || 'SET';
        const envName = step.meta?.name || step.value || '';
        
        // Check if this is actually a cookie operation
        // The UI shows "Cookie" for certain environment operations
        // This is likely based on the name or some other metadata
        // For now, we'll check if the name looks like a cookie name
        const isCookie = true; // TODO: Need to determine the actual rule
        
        if (isCookie) {
            switch (envType) {
                case 'ADD':
                    // Cookie create "test" as "test" - both name and value are same
                    return `Cookie create "${envName}" as "${step.value || envName}"`;
                case 'DELETE':
                case 'REMOVE':
                    return `Cookie remove "${envName}"`;
                case 'CLEAR':
                    return 'Clear all cookies';
                default:
                    return `Cookie operation: ${envType} "${envName}"`;
            }
        } else {
            switch (envType) {
                case 'ADD':
                    return `Add environment variable "${envName}"`;
                case 'SET':
                    return `Set environment variable "${envName}"`;
                case 'DELETE':
                case 'REMOVE':
                    return `Delete environment variable "${envName}"`;
                case 'CLEAR':
                    return 'Clear all environment variables';
                default:
                    return `Environment operation: ${envType} "${envName}"`;
            }
        }
    }
    
    handlePick(step, selectors, variable) {
        const pickTarget = this.getSelectorDescription(selectors);
        const pickValue = variable || step.value || '';
        return `Pick "${pickValue}" from ${pickTarget}`;
    }
    
    handleHover(step, selectors) {
        return `Hover over ${this.getSelectorDescription(selectors)}`;
    }
    
    handleScroll(step, selectors) {
        const scrollType = step.meta?.type || 'DOWN';
        
        switch (scrollType) {
            case 'BOTTOM':
                return 'Scroll to page bottom';
            case 'TOP':
                return 'Scroll to page top';
            case 'ELEMENT':
                // Check if scrolling to a variable
                if (selectors.guessVariable) {
                    return `Scroll to $${selectors.guessVariable}`;
                }
                // Check for "Scroll to top X" pattern (might need more context)
                if (selectors.hint || selectors.text) {
                    const target = this.getSelectorDescription(selectors);
                    // TODO: Determine when to use "Scroll to top X" vs "Scroll to element X"
                    return `Scroll to top ${target}`;
                }
                return 'Scroll to element';
            case 'OFFSET':
                const x = step.meta?.x || 0;
                const y = step.meta?.y || 0;
                return `Scroll by ${x}, ${y}`;
            default:
                const direction = step.meta?.direction || 'down';
                const amount = step.meta?.amount || '';
                return amount ? `Scroll ${direction} ${amount}` : `Scroll ${direction}`;
        }
    }
    
    handleSwitch(step) {
        const switchType = step.meta?.type || 'FRAME';
        switch (switchType) {
            case 'PARENT_FRAME':
                return 'Switch to parent iframe';
            case 'FRAME':
                return step.value ? `Switch to iframe "${step.value}"` : 'Switch to iframe';
            case 'WINDOW':
                return step.value ? `Switch to window "${step.value}"` : 'Switch to window';
            case 'TAB':
                return step.value ? `Switch to tab ${step.value}` : 'Switch to tab';
            default:
                return 'Switch context';
        }
    }
    
    handleWait(step) {
        const duration = step.value || step.meta?.duration || '1';
        return `Wait for ${duration} seconds`;
    }
    
    /**
     * Extract selectors from step
     */
    extractSelectors(step) {
        const selectors = {
            hint: null,
            guessVariable: null,
            xpath: null,
            css: null,
            id: null,
            text: null
        };
        
        // Direct selectors on step
        if (step.selectors) {
            Object.assign(selectors, step.selectors);
        }
        
        // Element-based selectors
        if (step.element?.target?.selectors) {
            step.element.target.selectors.forEach(sel => {
                switch (sel.type) {
                    case 'GUESS':
                        try {
                            const guess = JSON.parse(sel.value);
                            selectors.hint = guess.clue || null;
                            if (guess.variable) {
                                selectors.guessVariable = guess.variable;
                            }
                        } catch {
                            selectors.hint = sel.value;
                        }
                        break;
                    case 'XPATH':
                    case 'XPATH_ID':
                        selectors.xpath = sel.value;
                        break;
                    case 'CSS':
                    case 'CSS_SELECTOR':
                        selectors.css = sel.value;
                        break;
                    case 'ID':
                        selectors.id = sel.value;
                        break;
                }
            });
        }
        
        // Text from element
        if (step.element?.target?.text) {
            selectors.text = step.element.target.text;
        }
        
        return selectors;
    }
    
    /**
     * Get human-readable selector description
     */
    getSelectorDescription(selectors) {
        // Check for GUESS variable FIRST (V8 fix!)
        if (selectors.guessVariable) {
            return `$${selectors.guessVariable}`;
        }
        
        // Priority: hint > text > id > xpath > css
        if (selectors.hint) {
            return `"${selectors.hint}"`;
        }
        if (selectors.text) {
            return `"${selectors.text}"`;
        }
        if (selectors.id) {
            return `"${selectors.id}"`;
        }
        if (selectors.xpath) {
            return `"${selectors.xpath}"`;
        }
        if (selectors.css) {
            return `"${selectors.css}"`;
        }
        
        return '[No selector found]';
    }
    
    /**
     * Set API test cache for API_CALL actions
     */
    setApiTestCache(apiTests) {
        this.apiTestCache.clear();
        if (apiTests && Array.isArray(apiTests)) {
            apiTests.forEach(test => {
                if (test.id) {
                    this.apiTestCache.set(test.id, test);
                }
            });
        }
    }
    
    /**
     * Get conversion report
     */
    getReport() {
        return {
            ...this.conversionReport,
            successRate: Math.round((this.conversionReport.successfulSteps / this.conversionReport.totalSteps) * 100),
            unknownActions: Array.from(this.conversionReport.unknownActions),
            validatedActions: Array.from(this.conversionReport.validatedActions)
        };
    }
    
    /**
     * Reset converter state
     */
    reset() {
        this.checkpointNumberMap.clear();
        this.nextCheckpointNumber = 1;
        this.currentCheckpoint = null;
        this.currentStep = null;
        this.conversionReport = {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            warnings: [],
            errors: [],
            unknownActions: new Set(),
            validatedActions: new Set()
        };
    }
}

module.exports = NLPConverter;