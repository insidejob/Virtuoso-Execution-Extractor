#!/usr/bin/env node

/**
 * Comprehensive Execution Analysis Script
 * Compares old execution (86339/527257) vs new execution (88715/527218)
 * Identifies new action types, edge cases, and conversion patterns
 * Tests NLP converter accuracy and completeness
 */

const fs = require('fs');
const path = require('path');

class ExecutionAnalyzer {
    constructor() {
        this.oldExecutionPath = '/Users/ed/virtuoso-api/EXECUTION-86339-EXAMPLE-RESPONSE.json';
        this.newExecutionPath = null; // Will be provided when new data is available
        
        // Expected action types from PDF documentation
        this.expectedActions = [
            // Navigation
            'navigate', 'browse', 'go', 'open',
            
            // Click actions
            'click', 'mouse_click', 'mouse_double_click', 'mouse_right_click',
            
            // Input actions
            'type', 'write', 'enter',
            
            // Selection
            'select', 'pick',
            
            // Wait actions
            'wait', 'pause', 'wait_for_element', 'wait_for_url',
            
            // Mouse actions
            'mouse_hover', 'mouse_over', 'mouse_move', 'mouse_drag',
            'mouse_up', 'mouse_down', 'mouse_enter',
            
            // Store operations
            'store', 'store_element_text', 'store_element_value', 'store_element_attribute',
            
            // Frame/Tab switching
            'switch', 'switch_iframe', 'switch_tab', 'switch_window',
            
            // Scroll operations
            'scroll', 'scroll_to', 'scroll_by',
            
            // File operations
            'upload', 'file_upload', 'download',
            
            // Cookie operations
            'cookie', 'cookie_create', 'cookie_delete', 'cookie_get', 'cookie_wipe',
            
            // Window operations
            'window', 'window_resize', 'window_maximize', 'window_minimize',
            
            // Execute extension
            'execute', 'execute_script',
            
            // Dismiss operations
            'dismiss', 'dismiss_alert', 'dismiss_prompt', 'dismiss_confirm',
            
            // Keyboard operations
            'press', 'press_key', 'key_press',
            
            // API operations
            'api_call', 'api',
            
            // Verification
            'verify', 'verify_text', 'verify_element', 'assert'
        ];
        
        // Expected assertion types from PDF
        this.expectedAssertions = [
            // Existence
            'element_visible', 'element_exists', 'element_not_exists',
            
            // Value comparisons
            'field_value', 'element_equals', 'element_not_equals',
            'element_less_than', 'element_less_than_or_equal',
            'element_greater_than', 'element_greater_than_or_equal',
            
            // Pattern matching
            'element_matches', 'element_contains', 'text_contains',
            
            // State checks
            'element_selected', 'element_checked', 'element_enabled', 'element_disabled',
            
            // URL/Page checks
            'url_contains', 'url_equals', 'page_title',
            
            // Count checks
            'element_count', 'element_count_greater_than', 'element_count_less_than'
        ];
        
        // Edge cases to test
        this.edgeCases = [
            'empty_values',
            'null_selectors', 
            'variable_expressions',
            'nested_quotes',
            'special_characters',
            'multiline_text',
            'conditional_steps',
            'loop_constructs',
            'relative_selectors',
            'css_vs_xpath',
            'masked_data',
            'failed_steps',
            'skipped_steps',
            'warning_steps'
        ];
        
        this.analysisResults = {
            oldExecution: {},
            newExecution: {},
            differences: {},
            missingPatterns: [],
            edgeCaseResults: {},
            conversionAccuracy: {},
            recommendations: []
        };
    }
    
    /**
     * Main analysis function
     */
    async analyzeExecutions() {
        console.log('🔍 Starting Comprehensive Execution Analysis');
        console.log('=' .repeat(60));
        
        // Load old execution data
        this.analysisResults.oldExecution = this.loadExecutionData(this.oldExecutionPath);
        console.log(`📊 Loaded old execution: ${this.oldExecutionPath}`);
        
        // Analyze old execution structure
        this.analyzeExecutionStructure(this.analysisResults.oldExecution, 'old');
        
        // Generate test cases for new execution
        this.generateNewExecutionTestCases();
        
        // Test current converter accuracy
        await this.testConverterAccuracy();
        
        // Generate comprehensive report
        this.generateAnalysisReport();
        
        return this.analysisResults;
    }
    
    /**
     * Load execution data from file
     */
    loadExecutionData(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`❌ Error loading execution data from ${filePath}:`, error.message);
            return null;
        }
    }
    
    /**
     * Analyze execution structure and extract patterns
     */
    analyzeExecutionStructure(executionData, label) {
        if (!executionData) return;
        
        const analysis = {
            metadata: this.extractMetadata(executionData),
            actions: this.extractActions(executionData),
            assertions: this.extractAssertions(executionData),
            variables: this.extractVariables(executionData),
            selectors: this.extractSelectors(executionData),
            errorPatterns: this.extractErrorPatterns(executionData),
            performance: this.extractPerformanceData(executionData),
            edgeCases: this.identifyEdgeCases(executionData)
        };
        
        console.log(`\\n📋 ${label.toUpperCase()} Execution Analysis:`);
        console.log(`  Actions found: ${analysis.actions.unique.length}`);
        console.log(`  Assertions found: ${analysis.assertions.unique.length}`);
        console.log(`  Variables found: ${analysis.variables.length}`);
        console.log(`  Selectors found: ${analysis.selectors.length}`);
        console.log(`  Error patterns: ${analysis.errorPatterns.length}`);
        console.log(`  Edge cases: ${analysis.edgeCases.length}`);
        
        this.analysisResults[`${label}Execution`] = analysis;
    }
    
    /**
     * Extract metadata from execution
     */
    extractMetadata(executionData) {
        const item = executionData.item || executionData;
        
        return {
            executionId: item.executionId,
            journeyId: item.journeyId,
            projectId: item.projectId,
            status: item.status,
            duration: item.duration,
            executionType: item.executionType,
            environment: item.environment,
            summary: item.summary,
            checkpointCount: item.checkpoints?.length || 0,
            totalSteps: this.countTotalSteps(item.checkpoints || [])
        };
    }
    
    /**
     * Extract all action types and patterns
     */
    extractActions(executionData) {
        const actions = [];
        const actionTypes = new Set();
        const actionPatterns = new Map();
        
        const checkpoints = executionData.checkpoints || executionData.item?.checkpoints || [];
        
        checkpoints.forEach((checkpoint, checkpointIndex) => {
            const steps = checkpoint.steps || [];
            
            steps.forEach((step, stepIndex) => {
                if (step.action) {
                    const actionType = step.action.toLowerCase();
                    actionTypes.add(actionType);
                    
                    actions.push({
                        checkpointIndex,
                        stepIndex,
                        action: actionType,
                        selector: step.selector,
                        target: step.target,
                        value: step.value,
                        status: step.status,
                        duration: step.duration,
                        error: step.error,
                        raw: step
                    });
                    
                    // Track patterns for each action type
                    if (!actionPatterns.has(actionType)) {
                        actionPatterns.set(actionType, []);
                    }
                    actionPatterns.get(actionType).push(step);
                }
            });
        });
        
        return {
            all: actions,
            unique: Array.from(actionTypes).sort(),
            patterns: Object.fromEntries(actionPatterns),
            counts: this.countActionTypes(actions)
        };
    }
    
    /**
     * Extract assertion types and patterns
     */
    extractAssertions(executionData) {
        const assertions = [];
        const assertionTypes = new Set();
        
        const checkpoints = executionData.checkpoints || executionData.item?.checkpoints || [];
        
        checkpoints.forEach((checkpoint, checkpointIndex) => {
            const checkpointAssertions = checkpoint.assertions || [];
            
            checkpointAssertions.forEach((assertion, assertionIndex) => {
                if (assertion.type) {
                    const assertionType = assertion.type.toLowerCase();
                    assertionTypes.add(assertionType);
                    
                    assertions.push({
                        checkpointIndex,
                        assertionIndex,
                        type: assertionType,
                        selector: assertion.selector,
                        expected: assertion.expected,
                        actual: assertion.actual,
                        status: assertion.status,
                        message: assertion.message,
                        raw: assertion
                    });
                }
            });
        });
        
        return {
            all: assertions,
            unique: Array.from(assertionTypes).sort(),
            counts: this.countAssertionTypes(assertions)
        };
    }
    
    /**
     * Extract variables and their types
     */
    extractVariables(executionData) {
        const variables = new Set();
        const variablePatterns = [];
        
        const checkpoints = executionData.checkpoints || executionData.item?.checkpoints || [];
        
        checkpoints.forEach(checkpoint => {
            const steps = checkpoint.steps || [];
            
            steps.forEach(step => {
                // Check all step properties for variables
                Object.values(step).forEach(value => {
                    if (typeof value === 'string') {
                        // Find $variable patterns
                        const matches = value.match(/\\$\\w+/g);
                        if (matches) {
                            matches.forEach(match => {
                                variables.add(match);
                                variablePatterns.push({
                                    variable: match,
                                    context: step.action,
                                    value: value
                                });
                            });
                        }
                        
                        // Find ${expression} patterns
                        const exprMatches = value.match(/\\$\\{[^}]+\\}/g);
                        if (exprMatches) {
                            exprMatches.forEach(match => {
                                variables.add(match);
                                variablePatterns.push({
                                    variable: match,
                                    context: step.action,
                                    value: value,
                                    type: 'expression'
                                });
                            });
                        }
                    }
                });
            });
        });
        
        return {
            unique: Array.from(variables),
            patterns: variablePatterns,
            types: this.classifyVariables(Array.from(variables))
        };
    }
    
    /**
     * Extract selector patterns
     */
    extractSelectors(executionData) {
        const selectors = [];
        const selectorTypes = {
            css: [],
            xpath: [],
            id: [],
            class: [],
            text: [],
            attribute: [],
            complex: [],
            variable: []
        };
        
        const checkpoints = executionData.checkpoints || executionData.item?.checkpoints || [];
        
        checkpoints.forEach(checkpoint => {
            const steps = checkpoint.steps || [];
            
            steps.forEach(step => {
                const selector = step.selector || step.target;
                if (selector) {
                    selectors.push({
                        selector,
                        action: step.action,
                        type: this.identifySelectorType(selector)
                    });
                    
                    const type = this.identifySelectorType(selector);
                    if (selectorTypes[type]) {
                        selectorTypes[type].push(selector);
                    }
                }
            });
        });
        
        return {
            all: selectors,
            types: selectorTypes,
            stats: this.calculateSelectorStats(selectors)
        };
    }
    
    /**
     * Extract error patterns
     */
    extractErrorPatterns(executionData) {
        const errorPatterns = [];
        
        const checkpoints = executionData.checkpoints || executionData.item?.checkpoints || [];
        
        checkpoints.forEach((checkpoint, checkpointIndex) => {
            if (checkpoint.status === 'failed') {
                errorPatterns.push({
                    level: 'checkpoint',
                    index: checkpointIndex,
                    reason: checkpoint.failureReason,
                    type: 'checkpoint_failure'
                });
            }
            
            const steps = checkpoint.steps || [];
            steps.forEach((step, stepIndex) => {
                if (step.status === 'failed' && step.error) {
                    errorPatterns.push({
                        level: 'step',
                        checkpointIndex,
                        stepIndex,
                        error: step.error,
                        type: step.error.type || 'unknown_error'
                    });
                }
            });
        });
        
        return errorPatterns;
    }
    
    /**
     * Extract performance data
     */
    extractPerformanceData(executionData) {
        const item = executionData.item || executionData;
        
        return {
            totalDuration: item.duration,
            metrics: item.metrics,
            checkpointDurations: this.extractCheckpointDurations(item.checkpoints || []),
            stepDurations: this.extractStepDurations(item.checkpoints || []),
            networkActivity: this.extractNetworkActivity(item.checkpoints || [])
        };
    }
    
    /**
     * Identify edge cases in execution
     */
    identifyEdgeCases(executionData) {
        const edgeCases = [];
        
        const checkpoints = executionData.checkpoints || executionData.item?.checkpoints || [];
        
        checkpoints.forEach((checkpoint, checkpointIndex) => {
            const steps = checkpoint.steps || [];
            
            steps.forEach((step, stepIndex) => {
                // Empty values
                if (step.value === '' || step.value === null || step.value === undefined) {
                    edgeCases.push({
                        type: 'empty_value',
                        location: `checkpoint_${checkpointIndex}_step_${stepIndex}`,
                        data: step
                    });
                }
                
                // Special characters
                if (typeof step.value === 'string' && /[<>\"'&\\n\\r\\t]/.test(step.value)) {
                    edgeCases.push({
                        type: 'special_characters',
                        location: `checkpoint_${checkpointIndex}_step_${stepIndex}`,
                        data: step
                    });
                }
                
                // Masked data
                if (typeof step.value === 'string' && step.value.includes('*')) {
                    edgeCases.push({
                        type: 'masked_data',
                        location: `checkpoint_${checkpointIndex}_step_${stepIndex}`,
                        data: step
                    });
                }
                
                // Complex selectors
                if (step.selector && this.isComplexSelector(step.selector)) {
                    edgeCases.push({
                        type: 'complex_selector',
                        location: `checkpoint_${checkpointIndex}_step_${stepIndex}`,
                        data: step
                    });
                }
                
                // Failed steps
                if (step.status === 'failed') {
                    edgeCases.push({
                        type: 'failed_step',
                        location: `checkpoint_${checkpointIndex}_step_${stepIndex}`,
                        data: step
                    });
                }
                
                // Skipped steps
                if (step.status === 'skipped') {
                    edgeCases.push({
                        type: 'skipped_step',
                        location: `checkpoint_${checkpointIndex}_step_${stepIndex}`,
                        data: step
                    });
                }
            });
        });
        
        return edgeCases;
    }
    
    /**
     * Generate test cases for new execution analysis
     */
    generateNewExecutionTestCases() {
        console.log('\\n🧪 Generating Test Cases for New Execution (88715/527218)');
        
        const testCases = {
            expectedNewActions: [
                'hover', 'drag_drop', 'file_upload', 'api_call', 'execute_extension',
                'switch_iframe', 'switch_tab', 'scroll_actions', 'cookie_operations',
                'window_operations', 'keyboard_shortcuts', 'dismiss_operations',
                'select_dropdown', 'pick_option', 'store_operations', 'assertions'
            ],
            
            expectedEdgeCases: [
                { type: 'empty_values', description: 'Steps with null/undefined values' },
                { type: 'complex_expressions', description: 'Variables with ${...} syntax' },
                { type: 'nested_quotes', description: 'Values with embedded quotes' },
                { type: 'special_chars', description: 'Unicode, emojis, special symbols' },
                { type: 'multiline_text', description: 'Text values spanning multiple lines' },
                { type: 'conditional_logic', description: 'If/then step logic' },
                { type: 'loop_constructs', description: 'Repeated step patterns' },
                { type: 'data_driven_vars', description: 'Data table variable references' },
                { type: 'relative_selectors', description: 'Position-based selectors' },
                { type: 'mixed_selectors', description: 'CSS + XPath combinations' },
                { type: 'sensitive_data', description: 'Masked/encrypted values' },
                { type: 'error_scenarios', description: 'Failed step handling' },
                { type: 'timing_issues', description: 'Timeout and retry patterns' },
                { type: 'parallel_execution', description: 'Concurrent step execution' }
            ],
            
            expectedVariableTypes: [
                { type: 'journey', color: 'yellow', description: 'Store command output' },
                { type: 'data_table', color: 'blue', description: 'Test data variables' },
                { type: 'environment', color: 'green', description: 'Project settings' },
                { type: 'execution', color: 'orange', description: 'Runtime data' },
                { type: 'unknown', color: 'red', description: 'Undefined variables' }
            ],
            
            expectedApiFields: [
                'different_action_names',
                'new_selector_formats', 
                'enhanced_value_encoding',
                'extended_metadata_fields',
                'improved_error_structures',
                'additional_performance_metrics',
                'new_assertion_types',
                'variable_classification_data'
            ]
        };
        
        this.analysisResults.testCases = testCases;
        
        console.log(`  📝 Generated ${testCases.expectedNewActions.length} action type tests`);
        console.log(`  📝 Generated ${testCases.expectedEdgeCases.length} edge case tests`);
        console.log(`  📝 Generated ${testCases.expectedVariableTypes.length} variable type tests`);
        console.log(`  📝 Generated ${testCases.expectedApiFields.length} API field tests`);
    }
    
    /**
     * Test current converter accuracy
     */
    async testConverterAccuracy() {
        console.log('\\n🎯 Testing Current Converter Accuracy');
        
        try {
            // Load both converters
            const OriginalConverter = require('./API-TO-NLP-CONVERTER.js');
            const EnhancedConverter = require('./ENHANCED-NLP-CONVERTER.js');
            
            const originalConverter = new OriginalConverter();
            const enhancedConverter = new EnhancedConverter();
            
            // Test with old execution data
            const oldData = this.analysisResults.oldExecution;
            if (!oldData) return;
            
            const originalResults = originalConverter.convertToNLP(oldData);
            const enhancedResults = enhancedConverter.convertToNLP(oldData);
            
            // Compare results
            const accuracy = {
                original: this.analyzeConversionAccuracy(originalResults, oldData),
                enhanced: this.analyzeConversionAccuracy(enhancedResults, oldData),
                differences: this.compareConversions(originalResults, enhancedResults)
            };
            
            this.analysisResults.conversionAccuracy = accuracy;
            
            console.log(`  🔸 Original converter: ${accuracy.original.successRate.toFixed(1)}% success rate`);
            console.log(`  🔸 Enhanced converter: ${accuracy.enhanced.successRate.toFixed(1)}% success rate`);
            console.log(`  🔸 Improvement: ${(accuracy.enhanced.successRate - accuracy.original.successRate).toFixed(1)}%`);
            
        } catch (error) {
            console.error('❌ Error testing converter accuracy:', error.message);
        }
    }
    
    /**
     * Generate comprehensive analysis report
     */
    generateAnalysisReport() {
        console.log('\\n📊 Generating Comprehensive Analysis Report');
        
        const report = {
            executionComparison: this.compareExecutions(),
            missingActionPatterns: this.identifyMissingPatterns(),
            edgeCaseAnalysis: this.analyzeEdgeCases(),
            recommendations: this.generateRecommendations(),
            testingStrategy: this.createTestingStrategy()
        };
        
        // Save report to file
        const reportPath = '/Users/ed/virtuoso-api/EXECUTION-ANALYSIS-REPORT.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Generate markdown summary
        const markdownReport = this.generateMarkdownReport(report);
        const markdownPath = '/Users/ed/virtuoso-api/EXECUTION-ANALYSIS-SUMMARY.md';
        fs.writeFileSync(markdownPath, markdownReport);
        
        console.log(`  💾 Saved detailed report: ${reportPath}`);
        console.log(`  💾 Saved summary report: ${markdownPath}`);
        
        this.analysisResults.report = report;
    }
    
    // Helper methods
    countTotalSteps(checkpoints) {
        return checkpoints.reduce((total, checkpoint) => {
            return total + (checkpoint.steps?.length || 0);
        }, 0);
    }
    
    countActionTypes(actions) {
        const counts = {};
        actions.forEach(action => {
            counts[action.action] = (counts[action.action] || 0) + 1;
        });
        return counts;
    }
    
    countAssertionTypes(assertions) {
        const counts = {};
        assertions.forEach(assertion => {
            counts[assertion.type] = (counts[assertion.type] || 0) + 1;
        });
        return counts;
    }
    
    classifyVariables(variables) {
        return variables.map(variable => {
            // This would be enhanced with actual classification logic
            // based on variable naming patterns and context
            return {
                variable,
                type: this.guessVariableType(variable),
                color: this.getVariableColor(variable)
            };
        });
    }
    
    identifySelectorType(selector) {
        if (typeof selector !== 'string') return 'object';
        if (selector.startsWith('$')) return 'variable';
        if (selector.startsWith('//') || selector.startsWith('/')) return 'xpath';
        if (selector.startsWith('#')) return 'id';
        if (selector.startsWith('.')) return 'class';
        if (selector.includes('[') && selector.includes(']')) return 'attribute';
        if (selector.includes('>') || selector.includes('+') || selector.includes('~')) return 'complex';
        return 'text';
    }
    
    isComplexSelector(selector) {
        if (typeof selector !== 'string') return true;
        return selector.length > 50 || 
               selector.includes('//') || 
               selector.includes('[contains') ||
               selector.includes('nth-child') ||
               selector.includes('::');
    }
    
    calculateSelectorStats(selectors) {
        const stats = {
            totalSelectors: selectors.length,
            averageLength: 0,
            typeDistribution: {}
        };
        
        let totalLength = 0;
        selectors.forEach(item => {
            if (typeof item.selector === 'string') {
                totalLength += item.selector.length;
            }
            
            stats.typeDistribution[item.type] = (stats.typeDistribution[item.type] || 0) + 1;
        });
        
        stats.averageLength = selectors.length > 0 ? totalLength / selectors.length : 0;
        
        return stats;
    }
    
    extractCheckpointDurations(checkpoints) {
        return checkpoints.map((checkpoint, index) => ({
            index,
            name: checkpoint.name,
            duration: checkpoint.duration,
            status: checkpoint.status
        }));
    }
    
    extractStepDurations(checkpoints) {
        const durations = [];
        checkpoints.forEach((checkpoint, checkpointIndex) => {
            const steps = checkpoint.steps || [];
            steps.forEach((step, stepIndex) => {
                if (step.duration) {
                    durations.push({
                        checkpointIndex,
                        stepIndex,
                        action: step.action,
                        duration: step.duration,
                        status: step.status
                    });
                }
            });
        });
        return durations;
    }
    
    extractNetworkActivity(checkpoints) {
        const networkActivity = [];
        checkpoints.forEach((checkpoint, checkpointIndex) => {
            const steps = checkpoint.steps || [];
            steps.forEach((step, stepIndex) => {
                if (step.networkActivity) {
                    networkActivity.push({
                        checkpointIndex,
                        stepIndex,
                        action: step.action,
                        activity: step.networkActivity
                    });
                }
            });
        });
        return networkActivity;
    }
    
    guessVariableType(variable) {
        // Simple heuristics - would be enhanced with actual data
        if (variable.includes('_pass') || variable.includes('_secret')) return 'environment';
        if (variable.includes('$data') || variable.includes('$table')) return 'data_table';
        if (variable.includes('$store') || variable.includes('$result')) return 'journey';
        if (variable.includes('$exec') || variable.includes('$runtime')) return 'execution';
        return 'unknown';
    }
    
    getVariableColor(variable) {
        const type = this.guessVariableType(variable);
        const colorMap = {
            'journey': 'yellow',
            'data_table': 'blue', 
            'environment': 'green',
            'execution': 'orange',
            'unknown': 'red'
        };
        return colorMap[type] || 'red';
    }
    
    analyzeConversionAccuracy(nlpCommands, originalData) {
        const totalSteps = this.countTotalSteps(originalData.checkpoints || originalData.item?.checkpoints || []);
        const convertedSteps = nlpCommands.filter(cmd => !cmd.startsWith('//') && cmd.trim()).length;
        const errorCommands = nlpCommands.filter(cmd => cmd.includes('ERROR') || cmd.includes('UNKNOWN')).length;
        
        return {
            totalSteps,
            convertedSteps,
            errorCommands,
            successRate: totalSteps > 0 ? ((convertedSteps - errorCommands) / totalSteps) * 100 : 0,
            errors: nlpCommands.filter(cmd => cmd.includes('ERROR') || cmd.includes('UNKNOWN'))
        };
    }
    
    compareConversions(original, enhanced) {
        return {
            originalCount: original.length,
            enhancedCount: enhanced.length,
            difference: enhanced.length - original.length,
            newCommands: enhanced.filter(cmd => !original.includes(cmd)),
            improvedCommands: enhanced.filter(cmd => cmd.includes('//') && !original.includes(cmd))
        };
    }
    
    compareExecutions() {
        // Would compare old vs new execution when new data is available
        return {
            status: 'pending_new_execution_data',
            note: 'Comparison will be performed once new execution data (88715/527218) is available'
        };
    }
    
    identifyMissingPatterns() {
        const found = this.analysisResults.oldExecution?.actions?.unique || [];
        return this.expectedActions.filter(expected => !found.includes(expected));
    }
    
    analyzeEdgeCases() {
        const edgeCases = this.analysisResults.oldExecution?.edgeCases || [];
        const caseTypes = {};
        
        edgeCases.forEach(edgeCase => {
            caseTypes[edgeCase.type] = (caseTypes[edgeCase.type] || 0) + 1;
        });
        
        return {
            totalCases: edgeCases.length,
            typeDistribution: caseTypes,
            coverage: (Object.keys(caseTypes).length / this.edgeCases.length) * 100
        };
    }
    
    generateRecommendations() {
        return [
            {
                category: 'Data Extraction',
                priority: 'High',
                recommendation: 'Extract data from new execution (88715/527218) using updated browser script',
                rationale: 'Need actual data to identify new patterns and edge cases'
            },
            {
                category: 'Converter Enhancement',
                priority: 'High', 
                recommendation: 'Implement comprehensive error handling for unknown action types',
                rationale: 'Current converter fails silently on unknown actions'
            },
            {
                category: 'Edge Case Handling',
                priority: 'Medium',
                recommendation: 'Add specific handlers for masked data, special characters, and expressions',
                rationale: 'These patterns commonly cause conversion failures'
            },
            {
                category: 'Variable Support',
                priority: 'Medium',
                recommendation: 'Implement variable type classification based on color coding',
                rationale: 'PDF specifies different variable types with visual indicators'
            },
            {
                category: 'Testing Strategy',
                priority: 'High',
                recommendation: 'Create comprehensive test suite with all PDF patterns',
                rationale: 'Need to validate 100% accuracy against official documentation'
            }
        ];
    }
    
    createTestingStrategy() {
        return {
            phases: [
                {
                    phase: 'Data Collection',
                    tasks: [
                        'Extract new execution data (88715/527218)',
                        'Compare API response structures',
                        'Identify new action types and patterns'
                    ]
                },
                {
                    phase: 'Pattern Analysis',
                    tasks: [
                        'Map all new actions to NLP patterns',
                        'Test edge case handling',
                        'Validate variable classification'
                    ]
                },
                {
                    phase: 'Converter Enhancement',
                    tasks: [
                        'Implement missing action handlers',
                        'Add comprehensive error handling',
                        'Enhance assertion support'
                    ]
                },
                {
                    phase: 'Validation Testing',
                    tasks: [
                        'Test against both executions',
                        'Validate 100% conversion accuracy',
                        'Performance benchmarking'
                    ]
                }
            ],
            successCriteria: [
                '100% action type coverage',
                '100% assertion type coverage', 
                'Zero conversion errors',
                'Proper edge case handling',
                'Variable type classification',
                'Performance within 2x original'
            ]
        };
    }
    
    generateMarkdownReport(report) {
        return `# Execution Analysis Report - 88715/527218 vs 86339/527257
        
## Executive Summary

This comprehensive analysis compares the old execution (86339/527257) with the new execution (88715/527218) to identify:
- New action types and patterns
- Edge cases requiring special handling
- NLP converter accuracy and completeness
- Recommendations for 100% conversion accuracy

## Key Findings

### Old Execution Analysis (86339/527257)
- **Actions Found:** ${this.analysisResults.oldExecution?.actions?.unique?.length || 0} unique types
- **Assertions Found:** ${this.analysisResults.oldExecution?.assertions?.unique?.length || 0} unique types
- **Variables Found:** ${this.analysisResults.oldExecution?.variables?.unique?.length || 0} unique variables
- **Edge Cases:** ${this.analysisResults.oldExecution?.edgeCases?.length || 0} identified

### Converter Accuracy
- **Original Converter:** ${this.analysisResults.conversionAccuracy?.original?.successRate?.toFixed(1) || 'N/A'}% success rate
- **Enhanced Converter:** ${this.analysisResults.conversionAccuracy?.enhanced?.successRate?.toFixed(1) || 'N/A'}% success rate
- **Improvement:** ${this.analysisResults.conversionAccuracy ? (this.analysisResults.conversionAccuracy.enhanced?.successRate - this.analysisResults.conversionAccuracy.original?.successRate).toFixed(1) : 'N/A'}%

## Missing Action Patterns

The following action types from the PDF documentation are not yet handled:

${this.analysisResults.missingPatterns?.map(pattern => `- ${pattern}`).join('\\n') || 'Analysis pending'}

## Edge Cases Identified

${this.analysisResults.edgeCaseResults ? Object.entries(this.analysisResults.edgeCaseResults).map(([type, count]) => `- **${type}:** ${count} instances`).join('\\n') : 'Analysis pending'}

## Recommendations

${report.recommendations?.map(rec => `### ${rec.category} (Priority: ${rec.priority})
**Recommendation:** ${rec.recommendation}
**Rationale:** ${rec.rationale}
`).join('\\n') || 'Analysis pending'}

## Next Steps

1. **Immediate:** Extract data from new execution (88715/527218)
2. **Short-term:** Implement missing action handlers in enhanced converter
3. **Medium-term:** Add comprehensive edge case handling
4. **Long-term:** Achieve 100% conversion accuracy validation

## Testing Strategy

${report.testingStrategy ? report.testingStrategy.phases?.map(phase => `### ${phase.phase}
${phase.tasks?.map(task => `- ${task}`).join('\\n')}
`).join('\\n') : 'Analysis pending'}

---
*Report generated on ${new Date().toISOString()}*
*Analysis covers execution comparison and converter enhancement recommendations*
`;
    }
}

// Main execution
if (require.main === module) {
    const analyzer = new ExecutionAnalyzer();
    
    analyzer.analyzeExecutions()
        .then(results => {
            console.log('\\n✅ Analysis Complete!');
            console.log('📊 Results saved to EXECUTION-ANALYSIS-REPORT.json');
            console.log('📝 Summary saved to EXECUTION-ANALYSIS-SUMMARY.md');
            
            // Print key recommendations
            console.log('\\n🎯 Key Recommendations:');
            results.report?.recommendations?.forEach(rec => {
                console.log(`  ${rec.priority === 'High' ? '🔴' : '🟡'} ${rec.category}: ${rec.recommendation}`);
            });
        })
        .catch(error => {
            console.error('❌ Analysis failed:', error);
        });
}

module.exports = ExecutionAnalyzer;