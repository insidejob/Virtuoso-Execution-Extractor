#!/usr/bin/env node

/**
 * Virtuoso Variables Enhanced Extractor
 * Extracts all variables with proper categorization:
 * - Test Data Variables (from data tables)
 * - Environment Variables (from environment config)
 * - Local Variables (defined in journey)
 * - Runtime Variables (generated during execution)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class VariablesEnhancedExtractor {
    constructor(config = {}) {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: config.token || process.env.VIRTUOSO_TOKEN || '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
            sessionId: config.sessionId || process.env.VIRTUOSO_SESSION || 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
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
     * Main extraction method with enhanced categorization
     */
    async extract(ids, options = {}) {
        console.log('🔧 Starting enhanced variables extraction...\n');
        
        try {
            // Step 1: Get journey/testsuite definition
            const journeyData = await this.getJourneyData(ids.journey);
            
            // Step 2: Get full execution data including test data
            const executionData = await this.getFullExecutionData(ids);
            
            // Step 3: Get environment variables
            const environmentData = await this.getEnvironmentData(ids.project || executionData?.item?.projectId || '4889');
            
            // Step 4: Extract and categorize all variables
            const categorizedVariables = await this.extractAndCategorizeVariables(
                journeyData,
                executionData,
                environmentData,
                ids
            );
            
            // Step 5: Generate comprehensive report
            const report = this.generateEnhancedReport(categorizedVariables, journeyData);
            
            if (options.verbose) {
                console.log(report.text);
            }
            
            return report;
            
        } catch (error) {
            console.error('❌ Enhanced variables extraction failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Get journey/testsuite data
     */
    async getJourneyData(journeyId) {
        const endpoint = `/testsuites/${journeyId}?envelope=false`;
        return await this.apiRequest(endpoint);
    }
    
    /**
     * Get full execution data including test data values
     */
    async getFullExecutionData(ids) {
        const endpoint = `/executions/${ids.execution}`;
        const data = await this.apiRequest(endpoint);
        return data;
    }
    
    /**
     * Get environment variables for the project
     */
    async getEnvironmentData(projectId) {
        try {
            const endpoint = `/projects/${projectId}/environments`;
            const data = await this.apiRequest(endpoint);
            return data;
        } catch (e) {
            console.log('⚠️  Could not fetch environment data');
            return null;
        }
    }
    
    /**
     * Extract and categorize all variables
     */
    async extractAndCategorizeVariables(journeyData, executionData, environmentData, ids) {
        const variables = {
            testData: new Map(),      // From test data tables
            environment: new Map(),   // From environment config
            local: new Map(),        // Defined in journey
            runtime: new Map()       // Generated during execution
        };
        
        // 1. Extract test data variables from execution
        if (executionData?.item?.meta?.initialDataPerJourneySequence) {
            const testDataForJourney = executionData.item.meta.initialDataPerJourneySequence[ids.journey];
            if (testDataForJourney) {
                // Get the first data row (or iterate through all if multiple)
                Object.values(testDataForJourney).forEach(dataRow => {
                    Object.entries(dataRow).forEach(([key, value]) => {
                        const varName = key.startsWith('$') ? key : key;
                        variables.testData.set(varName, {
                            name: varName,
                            displayName: `$${varName}`,
                            value: value,
                            type: 'TEST_DATA',
                            source: 'Test Data Table',
                            description: this.getVariableDescription(key),
                            usage: []
                        });
                    });
                });
            }
        }
        
        // 2. Extract environment variables
        if (environmentData?.item?.environments) {
            const environment = environmentData.item.environments.find(
                env => env.id === executionData?.item?.environmentId
            ) || environmentData.item.environments[0];
            
            if (environment && environment.variables) {
                Object.values(environment.variables).forEach(envVar => {
                    variables.environment.set(envVar.name, {
                        name: envVar.name,
                        displayName: `$${envVar.name}`,
                        value: envVar.value,
                        type: 'ENVIRONMENT',
                        source: `Environment: ${environment.name}`,
                        hidden: envVar.hidden,
                        inherited: envVar.inherited,
                        description: this.getVariableDescription(envVar.name),
                        usage: []
                    });
                });
            }
        }
        
        // 3. Extract local variables from journey definition
        if (journeyData.cases) {
            journeyData.cases.forEach((testCase, caseIndex) => {
                if (testCase.steps) {
                    testCase.steps.forEach((step, stepIndex) => {
                        // Check for variable references
                        if (step.variable) {
                            const varName = step.variable;
                            const displayName = varName.startsWith('$') ? varName : `$${varName}`;
                            
                            // Determine which category this variable belongs to
                            let category = 'local';
                            let varMap = variables.local;
                            
                            // Check if it's a test data variable
                            if (variables.testData.has(varName)) {
                                category = 'testData';
                                varMap = variables.testData;
                            }
                            // Check if it's an environment variable
                            else if (variables.environment.has(varName)) {
                                category = 'environment';
                                varMap = variables.environment;
                            }
                            // Otherwise it's a local variable
                            else {
                                if (!varMap.has(varName)) {
                                    varMap.set(varName, {
                                        name: varName,
                                        displayName: displayName,
                                        value: this.getDefaultValue(varName),
                                        type: 'LOCAL',
                                        source: 'Journey Definition',
                                        description: this.getVariableDescription(varName),
                                        usage: []
                                    });
                                }
                            }
                            
                            // Record usage
                            const variable = varMap.get(varName);
                            if (variable) {
                                variable.usage.push({
                                    checkpoint: testCase.title,
                                    checkpointNumber: caseIndex + 1,
                                    step: stepIndex + 1,
                                    action: step.action,
                                    description: this.getStepDescription(step)
                                });
                            }
                        }
                        
                        // Check for variables in values
                        if (step.value && typeof step.value === 'string') {
                            const embeddedVars = this.extractEmbeddedVariables(step.value);
                            embeddedVars.forEach(varName => {
                                if (!variables.runtime.has(varName)) {
                                    variables.runtime.set(varName, {
                                        name: varName,
                                        displayName: varName,
                                        value: 'Generated at runtime',
                                        type: 'RUNTIME',
                                        source: 'Generated During Execution',
                                        description: this.getVariableDescription(varName),
                                        usage: []
                                    });
                                }
                                
                                variables.runtime.get(varName).usage.push({
                                    checkpoint: testCase.title,
                                    checkpointNumber: caseIndex + 1,
                                    step: stepIndex + 1,
                                    action: step.action,
                                    description: this.getStepDescription(step)
                                });
                            });
                        }
                    });
                }
            });
        }
        
        return variables;
    }
    
    /**
     * Extract embedded variables from strings
     */
    extractEmbeddedVariables(str) {
        const variables = [];
        
        // Match $variable patterns
        const dollarVars = str.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        variables.push(...dollarVars);
        
        // Match {{variable}} patterns
        const bracketVars = str.match(/\{\{([^}]+)\}\}/g) || [];
        bracketVars.forEach(v => variables.push(v));
        
        // Match ${variable} patterns
        const dollarBracketVars = str.match(/\$\{([^}]+)\}/g) || [];
        dollarBracketVars.forEach(v => variables.push(v));
        
        return [...new Set(variables)];
    }
    
    /**
     * Get variable description based on name
     */
    getVariableDescription(varName) {
        const descriptions = {
            'url': 'Target URL for navigation',
            'username': 'Login username credential',
            'password': 'Login password credential',
            'email': 'Email address',
            'eventlist': 'XPath selector for event list',
            'sitelist': 'XPath selector for site list',
            'plantlist': 'XPath selector for plant list',
            'arealist': 'XPath selector for area list',
            'JSAtype': 'Job Safety Analysis type',
            'Industry': 'Industry category',
            'Question': 'Assessment question text',
            'Hazardtype': 'Type of hazard',
            'Permit_Types': 'Permit type selection',
            'Questiontype': 'Question response type',
            'Isolationtype': 'Isolation category'
        };
        
        // Check exact match
        if (descriptions[varName]) {
            return descriptions[varName];
        }
        
        // Check patterns
        if (varName.includes('Question')) return 'Assessment question';
        if (varName.includes('password')) return 'Password credential';
        if (varName.includes('username')) return 'Username credential';
        if (varName.includes('email')) return 'Email address';
        if (varName.includes('url')) return 'URL address';
        if (varName.includes('list')) return 'List selector';
        if (varName.includes('type')) return 'Type selection';
        
        return 'Variable used in test';
    }
    
    /**
     * Get default value for known variables
     */
    getDefaultValue(varName) {
        const defaults = {
            'url': 'https://ipermit-demo.com',
            'username': 'admin',
            'password': '********', // Masked
            'email': 'test@example.com'
        };
        
        return defaults[varName] || 'Not set';
    }
    
    /**
     * Get step description
     */
    getStepDescription(step) {
        switch(step.action) {
            case 'NAVIGATE':
                const navTarget = step.variable ? `$${step.variable}` : (step.value || 'URL');
                return `Navigate to ${navTarget}`;
            case 'WRITE':
                const writeValue = step.variable ? `$${step.variable}` : (step.value || 'value');
                return `Write ${writeValue} in field`;
            case 'CLICK':
                return `Click on element`;
            case 'SELECT':
            case 'PICK':
                const selectValue = step.variable ? `$${step.variable}` : (step.value || 'option');
                return `Select ${selectValue} from dropdown`;
            case 'WAIT_FOR_ELEMENT':
                return `Wait for element`;
            case 'VERIFY':
            case 'ASSERT':
                return `Verify condition`;
            default:
                return step.action;
        }
    }
    
    /**
     * Generate enhanced report with categorization
     */
    generateEnhancedReport(variables, journeyData) {
        const report = {
            summary: {
                total: 0,
                byType: {
                    testData: variables.testData.size,
                    environment: variables.environment.size,
                    local: variables.local.size,
                    runtime: variables.runtime.size
                }
            },
            variables: {
                testData: {},
                environment: {},
                local: {},
                runtime: {}
            },
            text: '',
            json: null,
            markdown: ''
        };
        
        // Calculate total
        report.summary.total = Object.values(report.summary.byType).reduce((a, b) => a + b, 0);
        
        // Process each category
        const categories = [
            { name: 'TEST DATA', map: variables.testData, key: 'testData', icon: '📊' },
            { name: 'ENVIRONMENT', map: variables.environment, key: 'environment', icon: '🌍' },
            { name: 'LOCAL', map: variables.local, key: 'local', icon: '📝' },
            { name: 'RUNTIME', map: variables.runtime, key: 'runtime', icon: '⚡' }
        ];
        
        // Build text report
        const textLines = [];
        textLines.push('=== ENHANCED VARIABLES REPORT ===\n');
        textLines.push(`Journey: ${journeyData.title || journeyData.name}`);
        textLines.push(`Total Variables: ${report.summary.total}\n`);
        
        textLines.push('BREAKDOWN BY TYPE:');
        categories.forEach(cat => {
            if (cat.map.size > 0) {
                textLines.push(`  ${cat.icon} ${cat.name}: ${cat.map.size} variables`);
            }
        });
        textLines.push('');
        
        // Add variables by category
        categories.forEach(category => {
            if (category.map.size > 0) {
                textLines.push(`\n${category.icon} ${category.name} VARIABLES (${category.map.size})`);
                textLines.push('=' .repeat(40));
                
                category.map.forEach((variable, name) => {
                    textLines.push(`\n${variable.displayName}:`);
                    textLines.push(`  Value: ${variable.value}`);
                    textLines.push(`  Type: ${variable.type}`);
                    textLines.push(`  Source: ${variable.source}`);
                    textLines.push(`  Description: ${variable.description}`);
                    
                    if (variable.usage.length > 0) {
                        textLines.push(`  Used: ${variable.usage.length} times`);
                        if (variable.usage.length <= 3) {
                            textLines.push('  Usage:');
                            variable.usage.forEach(u => {
                                textLines.push(`    - ${u.checkpoint} (Step ${u.step}): ${u.description}`);
                            });
                        }
                    }
                    
                    // Add to report structure
                    report.variables[category.key][name] = {
                        name: variable.name,
                        displayName: variable.displayName,
                        value: variable.value,
                        type: variable.type,
                        source: variable.source,
                        description: variable.description,
                        usage: variable.usage
                    };
                });
            }
        });
        
        report.text = textLines.join('\n');
        
        // Generate markdown
        const mdLines = [];
        mdLines.push('# Enhanced Variables Report');
        mdLines.push(`**Journey**: ${journeyData.title || journeyData.name}\n`);
        
        mdLines.push('## Summary');
        mdLines.push(`- **Total Variables**: ${report.summary.total}`);
        mdLines.push('');
        
        mdLines.push('### Breakdown by Type');
        categories.forEach(cat => {
            if (cat.map.size > 0) {
                mdLines.push(`- **${cat.icon} ${cat.name}**: ${cat.map.size} variables`);
            }
        });
        mdLines.push('');
        
        // Add detailed sections
        categories.forEach(category => {
            if (category.map.size > 0) {
                mdLines.push(`## ${category.icon} ${category.name} Variables\n`);
                
                category.map.forEach((variable, name) => {
                    mdLines.push(`### \`${variable.displayName}\``);
                    mdLines.push('');
                    mdLines.push(`- **Value**: \`${variable.value}\``);
                    mdLines.push(`- **Type**: ${variable.type}`);
                    mdLines.push(`- **Source**: ${variable.source}`);
                    mdLines.push(`- **Description**: ${variable.description}`);
                    
                    if (variable.usage.length > 0) {
                        mdLines.push(`- **Usage**: ${variable.usage.length} times`);
                    }
                    mdLines.push('');
                });
            }
        });
        
        report.markdown = mdLines.join('\n');
        report.json = JSON.stringify(report.variables, null, 2);
        
        return report;
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

module.exports = VariablesEnhancedExtractor;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node virtuoso-variables-enhanced.js <executionId> <journeyId> [projectId]');
        process.exit(1);
    }
    
    const ids = {
        execution: args[0],
        journey: args[1],
        project: args[2] || '4889'
    };
    
    const extractor = new VariablesEnhancedExtractor({
        token: process.env.VIRTUOSO_TOKEN,
        sessionId: process.env.VIRTUOSO_SESSION
    });
    
    extractor.extract(ids, { verbose: true })
        .then(report => {
            if (!report.text) {
                console.log('\nJSON Output:');
                console.log(report.json);
            }
        })
        .catch(console.error);
}