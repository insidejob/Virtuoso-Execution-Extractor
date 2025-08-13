#!/usr/bin/env node

/**
 * Virtuoso Variables Extractor
 * Extracts all variables used in test execution with their values and context
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class VariablesExtractor {
    constructor(config) {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: config.token || process.env.VIRTUOSO_TOKEN,
            sessionId: config.sessionId || process.env.VIRTUOSO_SESSION,
            clientId: config.clientId || process.env.VIRTUOSO_CLIENT || '1754647483711_e9e9c12_production'
        };
        
        this.headers = {
            'accept': 'application/json, text/plain, */*',
            'authorization': `Bearer ${this.config.token}`,
            'origin': 'https://app2.virtuoso.qa',
            'referer': 'https://app2.virtuoso.qa/',
            'x-v-session-id': this.config.sessionId,
            'x-virtuoso-client-id': this.config.clientId,
            'x-virtuoso-client-name': 'Virtuoso UI'
        };
    }
    
    /**
     * Main extraction method
     * @param {Object} ids - Contains execution and journey IDs
     * @param {Object} options - Extraction options
     */
    async extract(ids, options = {}) {
        console.log('🔧 Starting variables extraction...\n');
        
        try {
            // Step 1: Get journey/testsuite definition
            const journeyData = await this.getJourneyData(ids.journey);
            
            // Step 2: Get execution data with actual values
            const executionData = await this.getExecutionData(ids);
            
            // Step 3: Extract variables from journey definition
            const variables = this.extractVariablesFromJourney(journeyData);
            
            // Step 4: Get actual runtime values from execution
            const enrichedVariables = await this.enrichVariablesWithExecutionData(
                variables,
                executionData,
                ids
            );
            
            // Step 5: Analyze variable usage context
            const analyzedVariables = this.analyzeVariableContext(
                enrichedVariables,
                journeyData
            );
            
            // Step 6: Generate report
            const report = this.generateVariablesReport(analyzedVariables, journeyData);
            
            if (options.verbose) {
                console.log(report.text);
            }
            
            return report;
            
        } catch (error) {
            console.error('❌ Variables extraction failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Get journey/testsuite data
     */
    async getJourneyData(journeyId) {
        const endpoint = `/testsuites/${journeyId}?envelope=false`;
        const data = await this.apiRequest(endpoint);
        return data;
    }
    
    /**
     * Get execution data with runtime values
     */
    async getExecutionData(ids) {
        // Try multiple endpoints to get execution data
        const endpoints = [
            `/executions/${ids.execution}/journeyExecutions/${ids.journey}`,
            `/executions/${ids.execution}/results`,
            `/executions/${ids.execution}`
        ];
        
        for (const endpoint of endpoints) {
            try {
                const data = await this.apiRequest(endpoint);
                if (data) return data;
            } catch (e) {
                // Try next endpoint
            }
        }
        
        return null;
    }
    
    /**
     * Extract all variables from journey definition
     */
    extractVariablesFromJourney(journeyData) {
        const variables = new Map();
        
        // Check data table for variables
        if (journeyData.dataTable) {
            journeyData.dataTable.forEach(row => {
                if (row.variable) {
                    const varName = row.variable.startsWith('$') ? row.variable : `$${row.variable}`;
                    variables.set(varName, {
                        name: varName,
                        type: 'data-table',
                        defaultValue: row.value,
                        usage: []
                    });
                }
            });
        }
        
        // Extract from test cases
        if (journeyData.cases) {
            journeyData.cases.forEach((testCase, caseIndex) => {
                if (testCase.steps) {
                    testCase.steps.forEach((step, stepIndex) => {
                        // Check for variable usage in different fields
                        const checkFields = ['variable', 'value', 'target', 'assertion'];
                        
                        checkFields.forEach(field => {
                            if (step[field]) {
                                const value = step[field];
                                
                                // Check if it's a variable reference
                                if (typeof value === 'string') {
                                    // Handle 'variable' field specially - it's a variable name without $
                                    if (field === 'variable' && value && !value.startsWith('$')) {
                                        const varName = `$${value}`;
                                        if (!variables.has(varName)) {
                                            variables.set(varName, {
                                                name: varName,
                                                type: 'runtime',
                                                defaultValue: null,
                                                usage: []
                                            });
                                        }
                                        
                                        // Record usage
                                        variables.get(varName).usage.push({
                                            checkpoint: testCase.title,
                                            checkpointNumber: caseIndex + 1,
                                            step: stepIndex + 1,
                                            action: step.action,
                                            field: field,
                                            description: this.getStepDescription(step)
                                        });
                                    }
                                    // Direct variable reference with $
                                    else if (value.startsWith('$')) {
                                        if (!variables.has(value)) {
                                            variables.set(value, {
                                                name: value,
                                                type: 'runtime',
                                                defaultValue: null,
                                                usage: []
                                            });
                                        }
                                        
                                        // Record usage
                                        variables.get(value).usage.push({
                                            checkpoint: testCase.title,
                                            checkpointNumber: caseIndex + 1,
                                            step: stepIndex + 1,
                                            action: step.action,
                                            field: field,
                                            description: this.getStepDescription(step)
                                        });
                                    }
                                    
                                    // Check for embedded variables in strings
                                    const embeddedVars = value.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g);
                                    if (embeddedVars) {
                                        embeddedVars.forEach(varName => {
                                            if (!variables.has(varName)) {
                                                variables.set(varName, {
                                                    name: varName,
                                                    type: 'embedded',
                                                    defaultValue: null,
                                                    usage: []
                                                });
                                            }
                                            
                                            variables.get(varName).usage.push({
                                                checkpoint: testCase.title,
                                                checkpointNumber: caseIndex + 1,
                                                step: stepIndex + 1,
                                                action: step.action,
                                                field: field,
                                                context: value,
                                                description: this.getStepDescription(step)
                                            });
                                        });
                                    }
                                }
                            }
                        });
                        
                        // Check element properties for variables
                        if (step.element && step.element.target) {
                            const target = step.element.target;
                            if (target.variable) {
                                const varName = target.variable.startsWith('$') ? target.variable : `$${target.variable}`;
                                if (!variables.has(varName)) {
                                    variables.set(varName, {
                                        name: varName,
                                        type: 'element',
                                        defaultValue: null,
                                        usage: []
                                    });
                                }
                                
                                variables.get(varName).usage.push({
                                    checkpoint: testCase.title,
                                    checkpointNumber: caseIndex + 1,
                                    step: stepIndex + 1,
                                    action: step.action,
                                    field: 'element',
                                    description: this.getStepDescription(step)
                                });
                            }
                        }
                    });
                }
            });
        }
        
        return variables;
    }
    
    /**
     * Enrich variables with actual runtime values from execution
     */
    async enrichVariablesWithExecutionData(variables, executionData, ids) {
        // Try to get variable values from execution data
        if (executionData) {
            // Check for variables in execution metadata
            if (executionData.variables) {
                Object.entries(executionData.variables).forEach(([key, value]) => {
                    const varName = key.startsWith('$') ? key : `$${key}`;
                    if (variables.has(varName)) {
                        variables.get(varName).actualValue = value;
                        variables.get(varName).source = 'execution-metadata';
                    }
                });
            }
            
            // Check for data table values in execution
            if (executionData.dataTableValues) {
                executionData.dataTableValues.forEach(item => {
                    const varName = item.variable || item.name;
                    if (varName && variables.has(varName)) {
                        variables.get(varName).actualValue = item.value;
                        variables.get(varName).source = 'data-table';
                    }
                });
            }
        }
        
        // Try to get values from test data endpoint
        try {
            const testDataEndpoint = `/executions/${ids.execution}/testdata`;
            const testData = await this.apiRequest(testDataEndpoint);
            
            if (testData && testData.variables) {
                Object.entries(testData.variables).forEach(([key, value]) => {
                    const varName = key.startsWith('$') ? key : `$${key}`;
                    if (variables.has(varName)) {
                        variables.get(varName).actualValue = value;
                        variables.get(varName).source = 'test-data';
                    }
                });
            }
        } catch (e) {
            // Test data endpoint might not exist
        }
        
        // Add common default values for known variables
        const commonDefaults = {
            '$url': 'https://ipermit-demo.com',
            '$username': 'admin',
            '$password': '********', // Masked for security
            '$email': 'test@example.com',
            '$timestamp': new Date().toISOString()
        };
        
        variables.forEach((variable, name) => {
            if (!variable.actualValue && commonDefaults[name]) {
                variable.actualValue = commonDefaults[name];
                variable.source = 'common-defaults';
            }
        });
        
        return variables;
    }
    
    /**
     * Analyze variable context and categorize
     */
    analyzeVariableContext(variables, journeyData) {
        variables.forEach(variable => {
            // Categorize by usage pattern
            const categories = new Set();
            
            variable.usage.forEach(use => {
                if (use.action === 'NAVIGATE') {
                    categories.add('navigation');
                } else if (use.action === 'WRITE' && use.field === 'value') {
                    if (variable.name.includes('password') || variable.name.includes('pwd')) {
                        categories.add('authentication');
                    } else if (variable.name.includes('email') || variable.name.includes('mail')) {
                        categories.add('contact');
                    } else if (variable.name.includes('username') || variable.name.includes('user')) {
                        categories.add('authentication');
                    } else {
                        categories.add('input');
                    }
                } else if (use.action === 'VERIFY' || use.action === 'ASSERT') {
                    categories.add('validation');
                } else if (use.action === 'SELECT' || use.action === 'PICK') {
                    categories.add('selection');
                }
            });
            
            variable.categories = Array.from(categories);
            
            // Determine primary purpose
            if (categories.has('authentication')) {
                variable.purpose = 'Authentication credential';
            } else if (categories.has('navigation')) {
                variable.purpose = 'URL or navigation target';
            } else if (categories.has('validation')) {
                variable.purpose = 'Expected value for validation';
            } else if (categories.has('input')) {
                variable.purpose = 'Form input data';
            } else if (categories.has('selection')) {
                variable.purpose = 'Dropdown or selection option';
            } else {
                variable.purpose = 'General test data';
            }
            
            // Security classification
            const sensitivePatterns = ['password', 'pwd', 'secret', 'token', 'api', 'key'];
            variable.sensitive = sensitivePatterns.some(pattern => 
                variable.name.toLowerCase().includes(pattern)
            );
            
            // Usage frequency
            variable.frequency = variable.usage.length;
            variable.checkpoints = [...new Set(variable.usage.map(u => u.checkpoint))];
        });
        
        return variables;
    }
    
    /**
     * Generate variables report
     */
    generateVariablesReport(variables, journeyData) {
        const report = {
            summary: {
                totalVariables: variables.size,
                byType: {},
                byCategory: {},
                sensitive: []
            },
            variables: {},
            text: '',
            json: null,
            markdown: ''
        };
        
        // Count by type and category
        variables.forEach((variable, name) => {
            // Type counting
            report.summary.byType[variable.type] = (report.summary.byType[variable.type] || 0) + 1;
            
            // Category counting
            variable.categories.forEach(cat => {
                report.summary.byCategory[cat] = (report.summary.byCategory[cat] || 0) + 1;
            });
            
            // Track sensitive variables
            if (variable.sensitive) {
                report.summary.sensitive.push(name);
            }
            
            // Add to report
            report.variables[name] = {
                name: variable.name,
                value: variable.sensitive ? '********' : (variable.actualValue || variable.defaultValue || 'undefined'),
                type: variable.type,
                source: variable.source || 'not-found',
                purpose: variable.purpose,
                categories: variable.categories,
                sensitive: variable.sensitive,
                frequency: variable.frequency,
                checkpoints: variable.checkpoints,
                usage: variable.usage.map(u => ({
                    checkpoint: u.checkpoint,
                    step: u.step,
                    action: u.action,
                    description: u.description
                }))
            };
        });
        
        // Generate text report
        const textLines = [];
        textLines.push('=== VARIABLES REPORT ===\n');
        textLines.push(`Journey: ${journeyData.title || journeyData.name}`);
        textLines.push(`Total Variables: ${report.summary.totalVariables}\n`);
        
        textLines.push('SUMMARY:');
        textLines.push(`  By Type: ${JSON.stringify(report.summary.byType)}`);
        textLines.push(`  By Category: ${JSON.stringify(report.summary.byCategory)}`);
        textLines.push(`  Sensitive: ${report.summary.sensitive.length} variables\n`);
        
        textLines.push('VARIABLES:\n');
        
        Object.entries(report.variables).forEach(([name, variable]) => {
            textLines.push(`${name}:`);
            textLines.push(`  Value: ${variable.value}`);
            textLines.push(`  Purpose: ${variable.purpose}`);
            textLines.push(`  Source: ${variable.source}`);
            textLines.push(`  Used: ${variable.frequency} times in ${variable.checkpoints.length} checkpoints`);
            
            if (variable.usage.length > 0 && variable.usage.length <= 3) {
                textLines.push('  Usage:');
                variable.usage.forEach(u => {
                    textLines.push(`    - ${u.description}`);
                });
            }
            textLines.push('');
        });
        
        report.text = textLines.join('\n');
        
        // Generate markdown report
        const mdLines = [];
        mdLines.push('# Variables Report');
        mdLines.push(`**Journey**: ${journeyData.title || journeyData.name}\n`);
        
        mdLines.push('## Summary');
        mdLines.push(`- **Total Variables**: ${report.summary.totalVariables}`);
        mdLines.push(`- **Sensitive Variables**: ${report.summary.sensitive.length}`);
        mdLines.push('');
        
        mdLines.push('## Variables Detail\n');
        
        Object.entries(report.variables).forEach(([name, variable]) => {
            const icon = variable.sensitive ? '🔒' : '📝';
            mdLines.push(`### ${icon} \`${name}\``);
            mdLines.push('');
            mdLines.push(`**Value**: \`${variable.value}\``);
            mdLines.push(`**Purpose**: ${variable.purpose}`);
            mdLines.push(`**Source**: ${variable.source}`);
            mdLines.push(`**Usage**: ${variable.frequency} times in ${variable.checkpoints.length} checkpoints`);
            mdLines.push('');
            
            if (variable.usage.length > 0) {
                mdLines.push('**Where Used**:');
                variable.usage.slice(0, 5).forEach(u => {
                    mdLines.push(`- ${u.checkpoint} (Step ${u.step}): ${u.description}`);
                });
                if (variable.usage.length > 5) {
                    mdLines.push(`- ... and ${variable.usage.length - 5} more`);
                }
                mdLines.push('');
            }
        });
        
        report.markdown = mdLines.join('\n');
        
        // JSON format
        report.json = JSON.stringify(report.variables, null, 2);
        
        return report;
    }
    
    /**
     * Get human-readable step description
     */
    getStepDescription(step) {
        switch(step.action) {
            case 'NAVIGATE':
                const navTarget = step.variable ? `$${step.variable}` : (step.value || 'URL');
                return `Navigate to ${navTarget}`;
            case 'WRITE':
                const writeValue = step.variable ? `$${step.variable}` : (step.value || 'value');
                const target = step.target || step.element?.target?.text || 'field';
                return `Write ${writeValue} in ${target}`;
            case 'CLICK':
                return `Click on ${step.target || step.element?.target?.text || 'element'}`;
            case 'SELECT':
            case 'PICK':
                const selectValue = step.variable ? `$${step.variable}` : (step.value || 'option');
                return `Select ${selectValue} from dropdown`;
            case 'WAIT_FOR_ELEMENT':
                return `Wait for ${step.target || 'element'}`;
            case 'VERIFY':
            case 'ASSERT':
                return `Verify ${step.assertion || step.target || 'condition'}`;
            default:
                return step.action;
        }
    }
    
    /**
     * Make API request
     */
    async apiRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const url = `${this.config.baseUrl}${endpoint}`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: this.headers
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error('Failed to parse API response'));
                        }
                    } else {
                        reject(new Error(`API returned status ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
        });
    }
}

module.exports = VariablesExtractor;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node virtuoso-variables-extractor.js <executionId> <journeyId>');
        process.exit(1);
    }
    
    const ids = {
        execution: args[0],
        journey: args[1]
    };
    
    const extractor = new VariablesExtractor({
        token: process.env.VIRTUOSO_TOKEN,
        sessionId: process.env.VIRTUOSO_SESSION
    });
    
    extractor.extract(ids, { verbose: true })
        .then(report => {
            console.log('\nJSON Output:');
            console.log(report.json);
        })
        .catch(console.error);
}