#!/usr/bin/env node

/**
 * Virtuoso Variables Extractor - ONLY USED VARIABLES
 * Only shows variables that are actually referenced in journey steps
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class VariablesUsedOnlyExtractor {
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
     * Main extraction method - ONLY USED VARIABLES
     */
    async extract(ids, options = {}) {
        console.log('🔧 Extracting ONLY USED variables...\n');
        
        try {
            // Step 1: Get journey definition to find USED variables
            const journeyData = await this.getJourneyData(ids.journey);
            
            // Step 2: Find which variables are actually USED in steps
            const usedVariables = this.findUsedVariables(journeyData);
            console.log(`📊 Found ${usedVariables.size} variables USED in journey steps\n`);
            
            // Step 3: Get execution data for values
            const executionData = await this.getFullExecutionData(ids);
            
            // Step 4: Get environment data
            const environmentData = await this.getEnvironmentData(
                ids.project || executionData?.item?.projectId || '4889'
            );
            
            // Step 5: Extract ONLY the USED variables with their values
            const categorizedVariables = await this.extractUsedVariables(
                usedVariables,
                journeyData,
                executionData,
                environmentData,
                ids
            );
            
            // Step 6: Generate report
            const report = this.generateReport(categorizedVariables, journeyData);
            
            if (!options.json) {
                console.log(report.text);
            }
            
            return report;
            
        } catch (error) {
            console.error('❌ Extraction failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Find variables that are ACTUALLY USED in journey steps
     */
    findUsedVariables(journeyData) {
        const usedVariables = new Map();
        
        if (journeyData.cases) {
            journeyData.cases.forEach((testCase, caseIndex) => {
                if (testCase.steps) {
                    testCase.steps.forEach((step, stepIndex) => {
                        // Check 'variable' field
                        if (step.variable) {
                            const varName = step.variable.startsWith('$') 
                                ? step.variable 
                                : step.variable;
                            
                            if (!usedVariables.has(varName)) {
                                usedVariables.set(varName, {
                                    name: varName,
                                    usage: []
                                });
                            }
                            
                            usedVariables.get(varName).usage.push({
                                checkpoint: testCase.title,
                                checkpointNum: caseIndex + 1,
                                step: stepIndex + 1,
                                action: step.action,
                                context: this.getStepDescription(step)
                            });
                        }
                        
                        // Check 'value' field for embedded variables
                        if (step.value && typeof step.value === 'string') {
                            const matches = step.value.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g);
                            if (matches) {
                                matches.forEach(v => {
                                    const varName = v.substring(1); // Remove $
                                    if (!usedVariables.has(varName)) {
                                        usedVariables.set(varName, {
                                            name: varName,
                                            usage: []
                                        });
                                    }
                                    
                                    usedVariables.get(varName).usage.push({
                                        checkpoint: testCase.title,
                                        checkpointNum: caseIndex + 1,
                                        step: stepIndex + 1,
                                        action: step.action,
                                        context: `Embedded in: ${step.value}`
                                    });
                                });
                            }
                        }
                        
                        // Check element.target.variable
                        if (step.element?.target?.variable) {
                            const varName = step.element.target.variable.startsWith('$')
                                ? step.element.target.variable.substring(1)
                                : step.element.target.variable;
                            
                            if (!usedVariables.has(varName)) {
                                usedVariables.set(varName, {
                                    name: varName,
                                    usage: []
                                });
                            }
                            
                            usedVariables.get(varName).usage.push({
                                checkpoint: testCase.title,
                                checkpointNum: caseIndex + 1,
                                step: stepIndex + 1,
                                action: step.action,
                                context: `Target element: ${varName}`
                            });
                        }
                    });
                }
            });
        }
        
        return usedVariables;
    }
    
    /**
     * Extract ONLY the USED variables with their values
     */
    async extractUsedVariables(usedVariables, journeyData, executionData, environmentData, ids) {
        const result = {
            testData: new Map(),
            environment: new Map(),
            local: new Map(),
            notFound: new Map()
        };
        
        // Get available test data
        const availableTestData = {};
        if (executionData?.item?.meta?.initialDataPerJourneySequence) {
            const testDataForJourney = executionData.item.meta.initialDataPerJourneySequence[ids.journey];
            if (testDataForJourney) {
                Object.values(testDataForJourney).forEach(dataRow => {
                    Object.assign(availableTestData, dataRow);
                });
            }
        }
        
        // Get available environment variables
        const availableEnvVars = {};
        if (environmentData?.item?.environments) {
            const environment = environmentData.item.environments.find(
                env => env.id === executionData?.item?.environmentId
            ) || environmentData.item.environments[0];
            
            if (environment?.variables) {
                Object.values(environment.variables).forEach(envVar => {
                    availableEnvVars[envVar.name] = envVar.value;
                });
            }
        }
        
        // Now match USED variables with their values
        usedVariables.forEach((varInfo, varName) => {
            let found = false;
            
            // Check test data
            if (availableTestData[varName]) {
                result.testData.set(varName, {
                    name: varName,
                    displayName: `$${varName}`,
                    value: availableTestData[varName],
                    type: 'TEST_DATA',
                    source: 'Test Data Table',
                    usage: varInfo.usage
                });
                found = true;
            }
            // Check environment
            else if (availableEnvVars[varName]) {
                result.environment.set(varName, {
                    name: varName,
                    displayName: `$${varName}`,
                    value: availableEnvVars[varName],
                    type: 'ENVIRONMENT',
                    source: 'Environment Config',
                    usage: varInfo.usage
                });
                found = true;
            }
            // Local variable
            else {
                // Check for common defaults
                const defaults = {
                    'url': 'https://ipermit-demo.com',
                    'username': 'admin',
                    'password': '********'
                };
                
                result.local.set(varName, {
                    name: varName,
                    displayName: `$${varName}`,
                    value: defaults[varName] || 'Not set',
                    type: 'LOCAL',
                    source: 'Journey Definition',
                    usage: varInfo.usage
                });
            }
        });
        
        return result;
    }
    
    /**
     * Generate report
     */
    generateReport(variables, journeyData) {
        const report = {
            summary: {
                total: 0,
                byType: {
                    testData: variables.testData.size,
                    environment: variables.environment.size,
                    local: variables.local.size
                }
            },
            variables: {},
            text: ''
        };
        
        report.summary.total = variables.testData.size + variables.environment.size + variables.local.size;
        
        // Build text report
        const lines = [];
        lines.push('=== VARIABLES ACTUALLY USED IN JOURNEY ===\n');
        lines.push(`Journey: ${journeyData.title || journeyData.name}`);
        lines.push(`Total Variables USED: ${report.summary.total}\n`);
        
        lines.push('BREAKDOWN:');
        if (variables.testData.size > 0) {
            lines.push(`  📊 TEST DATA: ${variables.testData.size} variables`);
        }
        if (variables.environment.size > 0) {
            lines.push(`  🌍 ENVIRONMENT: ${variables.environment.size} variables`);
        }
        if (variables.local.size > 0) {
            lines.push(`  📝 LOCAL: ${variables.local.size} variables`);
        }
        lines.push('');
        
        // Show variables by category
        if (variables.testData.size > 0) {
            lines.push('📊 TEST DATA VARIABLES (USED):');
            lines.push('=' .repeat(40));
            variables.testData.forEach(v => {
                lines.push(`\n${v.displayName}:`);
                lines.push(`  Value: ${v.value}`);
                lines.push(`  Usage:`);
                v.usage.forEach(u => {
                    lines.push(`    - ${u.checkpoint} (Step ${u.step}): ${u.context}`);
                });
            });
            lines.push('');
        }
        
        if (variables.environment.size > 0) {
            lines.push('🌍 ENVIRONMENT VARIABLES (USED):');
            lines.push('=' .repeat(40));
            variables.environment.forEach(v => {
                lines.push(`\n${v.displayName}:`);
                const shortValue = v.value.length > 60 
                    ? v.value.substring(0, 60) + '...' 
                    : v.value;
                lines.push(`  Value: ${shortValue}`);
                lines.push(`  Usage:`);
                v.usage.forEach(u => {
                    lines.push(`    - ${u.checkpoint} (Step ${u.step}): ${u.context}`);
                });
            });
            lines.push('');
        }
        
        if (variables.local.size > 0) {
            lines.push('📝 LOCAL VARIABLES (USED):');
            lines.push('=' .repeat(40));
            variables.local.forEach(v => {
                lines.push(`\n${v.displayName}:`);
                lines.push(`  Value: ${v.value}`);
                lines.push(`  Usage:`);
                v.usage.forEach(u => {
                    lines.push(`    - ${u.checkpoint} (Step ${u.step}): ${u.context}`);
                });
            });
        }
        
        report.text = lines.join('\n');
        return report;
    }
    
    getStepDescription(step) {
        switch(step.action) {
            case 'NAVIGATE':
                return `Navigate to ${step.variable ? '$' + step.variable : step.value}`;
            case 'WRITE':
                return `Write ${step.variable ? '$' + step.variable : step.value} in field`;
            case 'CLICK':
                return `Click on element`;
            case 'SELECT':
            case 'PICK':
                return `Select ${step.value || step.variable} from dropdown`;
            default:
                return step.action;
        }
    }
    
    // API methods
    async getJourneyData(journeyId) {
        const endpoint = `/testsuites/${journeyId}?envelope=false`;
        return await this.apiRequest(endpoint);
    }
    
    async getFullExecutionData(ids) {
        const endpoint = `/executions/${ids.execution}`;
        const data = await this.apiRequest(endpoint);
        return data;
    }
    
    async getEnvironmentData(projectId) {
        try {
            const endpoint = `/projects/${projectId}/environments`;
            return await this.apiRequest(endpoint);
        } catch (e) {
            return null;
        }
    }
    
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
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error('Failed to parse response'));
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

module.exports = VariablesUsedOnlyExtractor;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node virtuoso-variables-used-only.js <executionId> <journeyId> [projectId]');
        process.exit(1);
    }
    
    const ids = {
        execution: args[0],
        journey: args[1],
        project: args[2] || '4889'
    };
    
    const extractor = new VariablesUsedOnlyExtractor();
    
    extractor.extract(ids).catch(console.error);
}