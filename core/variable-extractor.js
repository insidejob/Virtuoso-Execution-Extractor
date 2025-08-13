/**
 * Variable Extractor Module - Core V10
 * 
 * Contains all variable extraction logic developed in V1-V9
 * Includes fixes for:
 * - Empty variable filtering (V9)
 * - Environment value extraction (V9)
 * - GUESS variable handling (V8)
 * - Credential type fixing (V9)
 */

class VariableExtractor {
    constructor() {
        this.filteredEmptyVariables = [];
        this.nlpConverter = null; // Will be injected for selector extraction
        
        // Performance optimizations
        this.selectorCache = new Map(); // Cache for selector extractions
        this.environmentCache = new Map(); // Cache for environment lookups
    }
    
    /**
     * Set NLP converter for selector extraction
     */
    setNLPConverter(converter) {
        this.nlpConverter = converter;
    }
    
    /**
     * Main extraction method - combines all V1-V9 fixes + V10 execution data
     * V10.5: Enhanced with execution outcome tracking
     */
    extract(journeyData, environmentData, executionData = null) {
        const usedVars = new Map();
        const dataAttributeVars = new Map();
        const guessVars = new Map();
        const executionVars = new Map();
        
        // Reset tracking
        this.filteredEmptyVariables = [];
        
        // V10.5: Build execution outcome map for variables
        this.executionOutcomes = this.buildExecutionOutcomeMap(executionData);
        
        // 1. Extract dataAttributeValues (with empty filtering - V9 fix)
        this.extractDataAttributes(journeyData, dataAttributeVars);
        
        // 2. Extract environment values FIRST (V10.2 - use execution's specific environment)
        const envVarValues = this.extractEnvironmentValues(environmentData, executionData);
        
        // 3. Find used variables in journey steps - NOW PASSES envVarValues and execution outcomes
        this.extractUsedVariables(journeyData, usedVars, dataAttributeVars, guessVars, envVarValues);
        
        // 4. Update GUESS variables with actual environment values (V8/V9 fix)
        this.updateGuessVariables(guessVars, envVarValues);
        
        // 5. NEW V10: Extract variables from execution sideEffects
        if (executionData) {
            this.extractExecutionVariables(executionData, journeyData, executionVars);
            // Merge execution data with existing variables
            this.mergeExecutionData(usedVars, dataAttributeVars, executionVars);
        }
        
        // 6. V10.5: Add execution context to variables
        this.addExecutionContext(usedVars, dataAttributeVars, guessVars, executionVars);
        
        // 7. Build final result
        return this.buildResult(usedVars, dataAttributeVars, guessVars, envVarValues.size, executionData);
    }
    
    /**
     * Extract data attribute values with empty filtering (V9 fix)
     */
    extractDataAttributes(journeyData, dataAttributeVars) {
        if (journeyData?.dataAttributeValues) {
            Object.entries(journeyData.dataAttributeValues).forEach(([key, value]) => {
                // V9 FIX: Filter out empty variables
                if (value === '' || value === null || value === undefined) {
                    this.filteredEmptyVariables.push(`$${key}`);
                    return; // Skip empty variables
                }
                
                dataAttributeVars.set(key, {
                    value: value,
                    type: 'DATA_ATTRIBUTE',
                    source: 'dataAttributeValues',
                    usage: []
                });
            });
        }
    }
    
    /**
     * Extract used variables from journey steps
     */
    extractUsedVariables(journeyData, usedVars, dataAttributeVars, guessVars, envVarValues) {
        if (!journeyData?.cases) return;
        
        journeyData.cases.forEach((testCase) => {
            testCase.steps?.forEach((step, stepIndex) => {
                // Extract regular variables
                if (step.variable) {
                    this.processStepVariable(
                        step, 
                        testCase, 
                        stepIndex, 
                        usedVars, 
                        dataAttributeVars,
                        envVarValues  // V10.1: Pass environment variables
                    );
                }
                
                // Extract GUESS variables (V8 fix)
                this.processGuessVariable(
                    step, 
                    testCase, 
                    stepIndex, 
                    dataAttributeVars, 
                    guessVars,
                    journeyData
                );
            });
        });
    }
    
    /**
     * Process regular variables in steps
     */
    processStepVariable(step, testCase, stepIndex, usedVars, dataAttributeVars, envVarValues) {
        const varName = step.variable;
        
        // Check if this variable exists in dataAttributeValues
        if (dataAttributeVars.has(varName)) {
            // It's a TEST_DATA variable - just add usage
            const selectors = this.getCachedSelectors(step);
            
            dataAttributeVars.get(varName).usage.push({
                checkpoint: testCase.title || testCase.name,
                step: stepIndex + 1,
                action: step.action,
                field: selectors.hint || null,
                stepId: step.id  // V10.5: Add stepId for execution mapping
            });
        } else {
            // V10.1: Check if it's an ENVIRONMENT variable
            const isEnvironmentVar = envVarValues && envVarValues.has(varName);
            
            // V10.4: Get the actual value from environment object
            let envValue = null;
            if (isEnvironmentVar) {
                const envData = envVarValues.get(varName);
                envValue = typeof envData === 'object' ? envData.value : envData;
            }
            
            // Create or update the variable
            if (!usedVars.has(varName)) {
                usedVars.set(varName, {
                    value: isEnvironmentVar ? envValue : (step.value || 'Not set'),
                    type: isEnvironmentVar ? 'ENVIRONMENT' : 'LOCAL',
                    source: isEnvironmentVar ? 'environment' : 'step',
                    usage: []
                });
            }
            
            const selectors = this.getCachedSelectors(step);
            
            usedVars.get(varName).usage.push({
                checkpoint: testCase.title || testCase.name,
                step: stepIndex + 1,
                action: step.action,
                field: selectors.hint || null,
                stepId: step.id  // V10.5: Add stepId for execution mapping
            });
        }
    }
    
    /**
     * Process GUESS variables (V8 fix)
     */
    processGuessVariable(step, testCase, stepIndex, dataAttributeVars, guessVars, journeyData) {
        const selectors = this.getCachedSelectors(step);
        
        if (selectors.guessVariable) {
            const varName = selectors.guessVariable;
            
            // Check if it's a data attribute
            if (dataAttributeVars.has(varName)) {
                // It's a data attribute - add usage
                dataAttributeVars.get(varName).usage.push({
                    checkpoint: testCase.title || testCase.name,
                    step: stepIndex + 1,
                    action: step.action,
                    context: 'Element selector',
                    stepId: step.id  // V10.5: Add stepId for execution mapping
                });
            } else {
                // V9 FIX: Check if this variable exists in dataAttributeValues with empty value
                if (journeyData?.dataAttributeValues && 
                    journeyData.dataAttributeValues.hasOwnProperty(varName) &&
                    (journeyData.dataAttributeValues[varName] === '' || 
                     journeyData.dataAttributeValues[varName] === null || 
                     journeyData.dataAttributeValues[varName] === undefined)) {
                    // Skip this empty variable - it was filtered
                    return;
                }
                
                // It's a standalone GUESS variable (not filtered)
                if (!guessVars.has(varName)) {
                    guessVars.set(varName, {
                        value: 'Element selector variable',
                        type: 'SELECTOR_VARIABLE',
                        source: 'GUESS_SELECTOR',
                        usage: []
                    });
                }
                
                guessVars.get(varName).usage.push({
                    checkpoint: testCase.title || testCase.name,
                    step: stepIndex + 1,
                    action: step.action,
                    context: `${step.action} target selector`,
                    stepId: step.id  // V10.5: Add stepId for execution mapping
                });
            }
        }
    }
    
    /**
     * Extract environment variable values (V10.3 - handle inheritance chain)
     */
    extractEnvironmentValues(environmentData, executionData) {
        const envVarValues = new Map();
        
        if (!environmentData || !Array.isArray(environmentData)) {
            return envVarValues;
        }
        
        // V10.2: Get the environment ID from execution
        let targetEnvId = null;
        if (executionData) {
            const execution = executionData.item || executionData;
            targetEnvId = execution.environmentId;
        }
        
        // V10.3: Build environment map for easy lookup
        const envMap = new Map();
        environmentData.forEach(env => {
            envMap.set(env.id, env);
        });
        
        // V10.3: Process inheritance chain
        if (targetEnvId) {
            const targetEnv = envMap.get(targetEnvId);
            if (targetEnv) {
                // First, process parent environment if it exists
                if (targetEnv.inheritsFrom) {
                    const parentEnv = envMap.get(targetEnv.inheritsFrom);
                    if (parentEnv && parentEnv.variables) {
                        // Add all parent variables
                        Object.entries(parentEnv.variables).forEach(([id, varData]) => {
                            if (varData.name && varData.value !== undefined) {
                                envVarValues.set(varData.name, {
                                    value: varData.value,
                                    inherited: true,
                                    source: parentEnv.name
                                });
                            }
                        });
                    }
                }
                
                // Then, process target environment (overrides parent)
                if (targetEnv.variables) {
                    Object.entries(targetEnv.variables).forEach(([id, varData]) => {
                        if (varData.name && varData.value !== undefined) {
                            // Override parent value or add new
                            envVarValues.set(varData.name, {
                                value: varData.value,
                                inherited: false,
                                source: targetEnv.name
                            });
                        }
                    });
                }
            }
        } else {
            // Fallback: process all environments (old behavior)
            environmentData.forEach(env => {
                if (env.variables) {
                    Object.entries(env.variables).forEach(([id, varData]) => {
                        if (varData.name && varData.value !== undefined) {
                            if (!envVarValues.has(varData.name)) {
                                envVarValues.set(varData.name, {
                                    value: varData.value,
                                    inherited: varData.inherited || false,
                                    source: env.name
                                });
                            }
                        }
                    });
                }
            });
        }
        
        return envVarValues;
    }
    
    /**
     * Update GUESS variables with actual environment values (V8/V9 fix)
     */
    updateGuessVariables(guessVars, envVarValues) {
        guessVars.forEach((varInfo, varName) => {
            if (envVarValues.has(varName)) {
                // V10.4: Handle environment object structure
                const envData = envVarValues.get(varName);
                const actualValue = typeof envData === 'object' ? envData.value : envData;
                
                varInfo.type = 'ENVIRONMENT';
                varInfo.source = 'Environment variable (used in GUESS selector)';
                varInfo.value = actualValue;
                varInfo.actualValue = actualValue;
                
                // V10.4: Add inheritance info if available
                if (typeof envData === 'object' && envData.inherited) {
                    varInfo.inherited = true;
                    varInfo.inheritedFrom = envData.source;
                }
            }
        });
    }
    
    /**
     * Build final result
     * V10.5: Enhanced with execution summary
     */
    buildResult(usedVars, dataAttributeVars, guessVars, totalEnvVars, executionData = null) {
        const result = {
            summary: {
                total_used: 0,
                total_available: dataAttributeVars.size + totalEnvVars,
                filtered_empty: this.filteredEmptyVariables.length
            },
            variables: {}
        };
        
        // V10.5: Add execution summary if available
        if (executionData) {
            const execution = executionData.item || executionData;
            result.execution_summary = {
                overall_outcome: execution.outcome,
                total_duration: execution.totalDuration,
                failed_steps: 0,
                skipped_steps: 0,
                passed_steps: 0
            };
            
            // Count step outcomes
            this.executionOutcomes.forEach(outcome => {
                if (outcome.outcome === 'ERROR' || outcome.outcome === 'FAIL') {
                    result.execution_summary.failed_steps++;
                } else if (outcome.outcome === 'SKIP') {
                    result.execution_summary.skipped_steps++;
                } else if (outcome.outcome === 'PASS') {
                    result.execution_summary.passed_steps++;
                }
            });
        }
        
        // Add used regular variables
        usedVars.forEach((varInfo, varName) => {
            result.variables[`$${varName}`] = varInfo;
            result.summary.total_used++;
        });
        
        // Add used data attribute variables
        dataAttributeVars.forEach((varInfo, varName) => {
            if (varInfo.usage.length > 0) {
                result.variables[`$${varName}`] = varInfo;
                result.summary.total_used++;
            }
        });
        
        // Add GUESS variables (with actual values from environment)
        guessVars.forEach((varInfo, varName) => {
            result.variables[`$${varName}`] = varInfo;
            result.summary.total_used++;
        });
        
        // Add filtered variables info
        if (this.filteredEmptyVariables.length > 0) {
            result.filtered_empty_variables = this.filteredEmptyVariables;
        }
        
        return result;
    }
    
    /**
     * V10: Extract variables from execution sideEffects
     */
    extractExecutionVariables(executionData, journeyData, executionVars) {
        if (!executionData) return;
        
        // Build a map of step IDs for quick lookup
        const stepIdMap = new Map();
        if (journeyData?.cases) {
            journeyData.cases.forEach(testCase => {
                testCase.steps?.forEach(step => {
                    if (step.id) {
                        stepIdMap.set(step.id, step);
                    }
                });
            });
        }
        
        // Navigate through the execution structure
        const execution = executionData.item || executionData;
        const testSuites = execution.testSuites || {};
        
        Object.values(testSuites).forEach(suite => {
            const testCases = suite.testCases || {};
            
            Object.values(testCases).forEach(testCase => {
                const testSteps = testCase.testSteps || {};
                
                Object.entries(testSteps).forEach(([stepId, stepData]) => {
                    if (stepData.sideEffects?.usedData) {
                        // Get the corresponding journey step
                        const journeyStep = stepIdMap.get(parseInt(stepId));
                        
                        Object.entries(stepData.sideEffects.usedData).forEach(([varName, value]) => {
                            // Determine variable type based on value and context
                            const varType = this.determineVariableType(value, journeyStep);
                            
                            executionVars.set(varName, {
                                value: this.formatVariableValue(value, varType),
                                type: varType,
                                source: 'execution',
                                stepId: stepId,
                                action: journeyStep?.action || 'UNKNOWN'
                            });
                        });
                    }
                });
            });
        });
    }
    
    /**
     * V10: Determine variable type based on stored value
     */
    determineVariableType(value, journeyStep) {
        // Check if it's a Store operation
        if (journeyStep?.action === 'STORE') {
            // Check if value is a JSON element object
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (parsed.selectors && parsed.signature) {
                        return 'ELEMENT_REFERENCE';
                    }
                } catch (e) {
                    // Not JSON, continue checking
                }
            }
            
            // If has element but simple string value, it's element text
            if (journeyStep.element && typeof value === 'string') {
                return 'ELEMENT_TEXT';
            }
            
            // Otherwise it's a stored value
            return 'LOCAL';
        }
        
        // Check for URL patterns
        if (typeof value === 'string' && value.match(/^https?:\/\//)) {
            return 'URL';
        }
        
        // Check for API variables
        if (journeyStep?.action === 'API_CALL') {
            return 'API_VARIABLE';
        }
        
        // Default to LOCAL
        return 'LOCAL';
    }
    
    /**
     * V10: Format variable value for display
     */
    formatVariableValue(value, varType) {
        if (varType === 'ELEMENT_REFERENCE') {
            // Parse and return element description
            try {
                const parsed = JSON.parse(value);
                return parsed.text || 'Element reference';
            } catch (e) {
                return 'Element reference';
            }
        }
        
        // Return raw value for other types
        return value;
    }
    
    /**
     * V10: Merge execution data with existing variables
     */
    mergeExecutionData(usedVars, dataAttributeVars, executionVars) {
        executionVars.forEach((execVar, varName) => {
            // Update existing variables with execution data
            if (usedVars.has(varName)) {
                const existing = usedVars.get(varName);
                // Execution data takes precedence for value
                existing.value = execVar.value;
                // V10.1: Keep ENVIRONMENT type if already set, otherwise use execution type
                if (existing.type !== 'ENVIRONMENT') {
                    existing.actualType = execVar.type;
                }
                existing.executionSource = true;
            } else if (dataAttributeVars.has(varName)) {
                const existing = dataAttributeVars.get(varName);
                // Update with actual runtime value
                existing.runtimeValue = execVar.value;
                existing.actualType = execVar.type;
                existing.executionSource = true;
            } else {
                // New variable from execution
                usedVars.set(varName, {
                    ...execVar,
                    usage: [{
                        action: execVar.action,
                        stepId: execVar.stepId,
                        source: 'execution'
                    }]
                });
            }
        });
    }
    
    /**
     * Fix credential types (V9 fix for username/password)
     */
    fixCredentialTypes(variables) {
        Object.entries(variables).forEach(([varName, varInfo]) => {
            const name = varName.toLowerCase();
            
            // Fix username type
            if (name.includes('username') || name.includes('user') || name.includes('email')) {
                varInfo.dataType = {
                    primary: 'string',
                    format: 'username',
                    confidence: 0.95
                };
            }
            
            // Fix password type
            if (name.includes('password') || name.includes('pwd') || name.includes('pass')) {
                varInfo.dataType = {
                    primary: 'string',
                    format: 'password',
                    confidence: 0.95
                };
                // Mask password values
                if (varInfo.value && varInfo.value !== 'Not set') {
                    varInfo.maskedValue = '********';
                }
            }
            
            // Fix URL type
            if (name.includes('url') || name.includes('link') || name.includes('endpoint')) {
                varInfo.dataType = {
                    primary: 'string',
                    format: 'url',
                    confidence: 0.9
                };
            }
            
            // Fix selector type (V10.4: Handle both string and object values)
            const valueStr = typeof varInfo.value === 'object' ? varInfo.value.value : varInfo.value;
            if (varInfo.type === 'ENVIRONMENT' && valueStr && typeof valueStr === 'string' &&
                (valueStr.startsWith('/') || valueStr.includes('xpath') || 
                 valueStr.includes('css='))) {
                varInfo.dataType = {
                    primary: 'string',
                    format: valueStr.startsWith('/') ? 'xpath_selector' : 'css_selector',
                    confidence: 0.95
                };
            }
        });
        
        return variables;
    }
    
    /**
     * Get filtered empty variables list
     */
    getFilteredVariables() {
        return this.filteredEmptyVariables;
    }
    
    /**
     * Performance optimization: Cache selector extractions
     */
    getCachedSelectors(step) {
        const cacheKey = step.id || JSON.stringify(step);
        
        if (this.selectorCache.has(cacheKey)) {
            return this.selectorCache.get(cacheKey);
        }
        
        const selectors = this.nlpConverter ? 
            this.nlpConverter.extractSelectors(step) : {};
        
        this.selectorCache.set(cacheKey, selectors);
        return selectors;
    }
    /**
     * V10.5: Build execution outcome map for variables
     */
    buildExecutionOutcomeMap(executionData) {
        const outcomeMap = new Map();
        
        if (!executionData) return outcomeMap;
        
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
                        duration: stepData.duration
                    });
                });
            });
        });
        
        return outcomeMap;
    }
    
    /**
     * V10.5: Add execution context to variables
     */
    addExecutionContext(usedVars, dataAttributeVars, guessVars, executionVars) {
        // Add execution outcome info to all variables
        [usedVars, dataAttributeVars, guessVars, executionVars].forEach(varMap => {
            varMap.forEach((varInfo, varName) => {
                // V10.5: Add clear execution status at variable level
                const executionStatus = this.determineVariableExecutionStatus(varInfo);
                varInfo.execution_status = executionStatus;
                
                if (varInfo.usage && varInfo.usage.length > 0) {
                    // Add execution outcomes to usage entries
                    varInfo.usage = varInfo.usage.map(usage => {
                        if (usage.stepId) {
                            // V10.5: Handle both string and integer stepId
                            const stepIdInt = typeof usage.stepId === 'string' ? parseInt(usage.stepId) : usage.stepId;
                            const outcome = this.executionOutcomes.get(stepIdInt);
                            if (outcome) {
                                return {
                                    ...usage,
                                    executionOutcome: outcome.outcome,
                                    executionError: outcome.error ? outcome.error.message : null,
                                    duration: outcome.duration
                                };
                            }
                        }
                        return usage;
                    });
                }
            });
        });
    }
    
    /**
     * V10.5: Determine overall execution status for a variable
     */
    determineVariableExecutionStatus(varInfo) {
        if (!varInfo.usage || varInfo.usage.length === 0) {
            return {
                status: "NOT_USED",
                description: "Variable defined but not used in any executed steps",
                executed_steps: 0,
                failed_steps: 0,
                skipped_steps: 0,
                successful_steps: 0
            };
        }
        
        let executedSteps = 0;
        let failedSteps = 0;
        let skippedSteps = 0;
        let successfulSteps = 0;
        let hasExecutionData = false;
        
        varInfo.usage.forEach(usage => {
            if (usage.stepId) {
                // V10.5: Handle both string and integer stepId
                const stepIdInt = typeof usage.stepId === 'string' ? parseInt(usage.stepId) : usage.stepId;
                if (this.executionOutcomes.has(stepIdInt)) {
                    hasExecutionData = true;
                    const outcome = this.executionOutcomes.get(stepIdInt);
                
                    if (outcome.outcome === 'PASS') {
                        successfulSteps++;
                        executedSteps++;
                    } else if (outcome.outcome === 'ERROR' || outcome.outcome === 'FAIL') {
                        failedSteps++;
                        executedSteps++;
                    } else if (outcome.outcome === 'SKIP') {
                        skippedSteps++;
                    }
                }
            }
        });
        
        // Determine overall status
        let status, description;
        
        if (!hasExecutionData) {
            status = "UNKNOWN";
            description = "No execution data available for this variable";
        } else if (failedSteps > 0) {
            status = "PARTIALLY_FAILED";
            description = `Variable used in ${failedSteps} failed step(s) out of ${executedSteps + skippedSteps} total`;
        } else if (skippedSteps > 0 && successfulSteps === 0) {
            status = "NOT_EXECUTED";
            description = `All ${skippedSteps} step(s) using this variable were skipped`;
        } else if (skippedSteps > 0 && successfulSteps > 0) {
            status = "PARTIALLY_EXECUTED";
            description = `${successfulSteps} step(s) executed successfully, ${skippedSteps} step(s) skipped`;
        } else if (successfulSteps > 0) {
            status = "FULLY_EXECUTED";
            description = `All ${successfulSteps} step(s) using this variable executed successfully`;
        } else {
            status = "UNKNOWN";
            description = "Unable to determine execution status";
        }
        
        return {
            status,
            description,
            executed_steps: executedSteps,
            failed_steps: failedSteps,
            skipped_steps: skippedSteps,
            successful_steps: successfulSteps
        };
    }
    
}

module.exports = VariableExtractor;