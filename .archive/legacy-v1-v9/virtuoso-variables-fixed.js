#!/usr/bin/env node

/**
 * Virtuoso Variables Fixed Extractor
 * ONLY extracts variables that are actually USED in journey steps
 * Ignores all unused test data and environment variables
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class VariablesFixedExtractor {
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
     * Main extraction method - ONLY extracts used variables
     */
    async extract(ids, options = {}) {
        console.log('🔧 Extracting ONLY used variables...\n');
        
        try {
            // Step 1: Get journey/testsuite definition
            const journeyData = await this.getJourneyData(ids.journey);
            
            // Step 2: Find all variables USED in the journey
            const usedVariables = this.findUsedVariables(journeyData);
            console.log(`📊 Found ${usedVariables.size} variables actually used in journey\n`);
            
            // Step 3: Get execution data for test data values
            const executionData = await this.getFullExecutionData(ids);
            
            // Step 4: Get environment data for environment values  
            const environmentData = await this.getEnvironmentData(ids.project || executionData?.item?.projectId || '4889');
            
            // Step 5: Enrich used variables with actual values
            const enrichedVariables = this.enrichVariablesWithValues(
                usedVariables, 
                executionData, 
                environmentData,
                ids
            );
            
            // Step 6: Generate report
            const report = this.generateReport(enrichedVariables, journeyData);
            
            if (options.verbose) {
                console.log(report.text);
            }
            
            return report;
            
        } catch (error) {
            console.error('❌ Variable extraction failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Find all variables actually USED in journey steps
     */
    findUsedVariables(journeyData) {
        const usedVars = new Map();
        
        if (!journeyData.cases) return usedVars;
        
        journeyData.cases.forEach((testCase, caseIndex) => {
            if (!testCase.steps) return;
            
            testCase.steps.forEach((step, stepIndex) => {
                // Check for variable in step.variable field
                if (step.variable) {
                    const varName = step.variable;
                    if (!usedVars.has(varName)) {
                        usedVars.set(varName, {
                            name: varName,
                            displayName: varName.startsWith('$') ? varName : `$${varName}`,
                            usage: []
                        });
                    }
                    
                    usedVars.get(varName).usage.push({
                        checkpoint: testCase.title,
                        checkpointNumber: caseIndex + 1,
                        step: stepIndex + 1,
                        action: step.action,
                        description: this.getStepDescription(step),
                        field: this.getFieldName(step)
                    });
                }
                
                // Check for variables embedded in values
                if (step.value && typeof step.value === 'string') {
                    const embeddedVars = this.extractEmbeddedVariables(step.value);
                    embeddedVars.forEach(varName => {
                        // Clean the variable name
                        const cleanName = varName.replace(/[\$\{\}]/g, '');
                        if (!usedVars.has(cleanName)) {
                            usedVars.set(cleanName, {
                                name: cleanName,
                                displayName: `$${cleanName}`,
                                embedded: true,
                                usage: []
                            });
                        }
                        
                        usedVars.get(cleanName).usage.push({
                            checkpoint: testCase.title,
                            checkpointNumber: caseIndex + 1,
                            step: stepIndex + 1,
                            action: step.action,
                            description: `Embedded in: ${step.value}`,
                            field: this.getFieldName(step)
                        });
                    });
                }
            });
        });
        
        return usedVars;
    }
    
    /**
     * Extract field name from step
     */
    getFieldName(step) {
        if (!step.element || !step.element.target || !step.element.target.selectors) {
            return null;
        }
        
        const guessSelector = step.element.target.selectors.find(s => s.type === 'GUESS');
        if (guessSelector && guessSelector.value) {
            try {
                const guessData = JSON.parse(guessSelector.value);
                return guessData.clue || guessData.text || null;
            } catch (e) {
                return null;
            }
        }
        return null;
    }
    
    /**
     * Enrich used variables with actual values from execution/environment
     */
    enrichVariablesWithValues(usedVars, executionData, environmentData, ids) {
        const enriched = new Map();
        
        // Get test data values
        const testDataValues = {};
        if (executionData?.item?.meta?.initialDataPerJourneySequence) {
            const testDataForJourney = executionData.item.meta.initialDataPerJourneySequence[ids.journey];
            if (testDataForJourney) {
                Object.values(testDataForJourney).forEach(dataRow => {
                    Object.entries(dataRow).forEach(([key, value]) => {
                        testDataValues[key] = value;
                    });
                });
            }
        }
        
        // Get environment values
        const envValues = {};
        if (environmentData?.item?.environments) {
            const environment = environmentData.item.environments.find(
                env => env.id === executionData?.item?.environmentId
            ) || environmentData.item.environments[0];
            
            if (environment && environment.variables) {
                Object.values(environment.variables).forEach(envVar => {
                    envValues[envVar.name] = envVar.value;
                });
            }
        }
        
        // Enrich each used variable with its value and type
        usedVars.forEach((varInfo, varName) => {
            const enrichedVar = { ...varInfo };
            
            // Check if it's a test data variable
            if (testDataValues.hasOwnProperty(varName)) {
                enrichedVar.value = testDataValues[varName];
                enrichedVar.type = 'TEST_DATA';
                enrichedVar.source = 'Test Data Table';
            }
            // Check if it's an environment variable
            else if (envValues.hasOwnProperty(varName)) {
                enrichedVar.value = envValues[varName];
                enrichedVar.type = 'ENVIRONMENT';
                enrichedVar.source = 'Environment Configuration';
            }
            // Otherwise it's a local variable
            else {
                enrichedVar.value = this.getDefaultValue(varName);
                enrichedVar.type = 'LOCAL';
                enrichedVar.source = 'Journey Definition';
            }
            
            // Mask sensitive values
            if (varName.toLowerCase().includes('password')) {
                enrichedVar.value = '********';
                enrichedVar.masked = true;
            }
            
            enrichedVar.description = this.getVariableDescription(varName);
            enriched.set(varName, enrichedVar);
        });
        
        return enriched;
    }
    
    /**
     * Generate report with ONLY used variables
     */
    generateReport(variables, journeyData) {
        const report = {
            summary: {
                total_used: variables.size,
                byType: {
                    testData: 0,
                    environment: 0,
                    local: 0
                }
            },
            used_variables: {},
            text: '',
            json: null
        };
        
        // Count by type
        variables.forEach(variable => {
            if (variable.type === 'TEST_DATA') report.summary.byType.testData++;
            else if (variable.type === 'ENVIRONMENT') report.summary.byType.environment++;
            else if (variable.type === 'LOCAL') report.summary.byType.local++;
        });
        
        // Build text report
        const textLines = [];
        textLines.push('=== USED VARIABLES ONLY ===\n');
        textLines.push(`Journey: ${journeyData.title || journeyData.name}`);
        textLines.push(`Variables Used: ${report.summary.total_used}\n`);
        
        if (report.summary.byType.testData > 0) {
            textLines.push(`📊 TEST DATA: ${report.summary.byType.testData} variables`);
        }
        if (report.summary.byType.environment > 0) {
            textLines.push(`🌍 ENVIRONMENT: ${report.summary.byType.environment} variables`);
        }
        if (report.summary.byType.local > 0) {
            textLines.push(`📝 LOCAL: ${report.summary.byType.local} variables`);
        }
        textLines.push('');
        
        // Add each variable
        variables.forEach((variable, name) => {
            textLines.push(`\n${variable.displayName}:`);
            textLines.push(`  Value: ${variable.value}`);
            textLines.push(`  Type: ${variable.type}`);
            textLines.push(`  Source: ${variable.source}`);
            
            if (variable.usage.length === 1) {
                const u = variable.usage[0];
                textLines.push(`  Used in: ${u.checkpoint} (Step ${u.step})`);
                if (u.field) {
                    textLines.push(`  Field: "${u.field}"`);
                }
            } else {
                textLines.push(`  Used: ${variable.usage.length} times`);
                variable.usage.slice(0, 3).forEach(u => {
                    textLines.push(`    - ${u.checkpoint} (Step ${u.step})`);
                });
            }
            
            // Add to JSON structure
            report.used_variables[variable.displayName] = {
                value: variable.value,
                type: variable.type,
                source: variable.source,
                usage: variable.usage
            };
        });
        
        report.text = textLines.join('\n');
        report.json = JSON.stringify(report.used_variables, null, 2);
        
        return report;
    }
    
    /**
     * Extract embedded variables from strings
     */
    extractEmbeddedVariables(str) {
        const variables = [];
        
        // Match $variable patterns
        const dollarVars = str.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        dollarVars.forEach(v => variables.push(v.substring(1))); // Remove $
        
        // Match {{variable}} patterns
        const bracketVars = str.match(/\{\{([^}]+)\}\}/g) || [];
        bracketVars.forEach(v => variables.push(v.replace(/[\{\}]/g, '')));
        
        // Match ${variable} patterns
        const dollarBracketVars = str.match(/\$\{([^}]+)\}/g) || [];
        dollarBracketVars.forEach(v => variables.push(v.replace(/[\$\{\}]/g, '')));
        
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
            'email': 'Email address'
        };
        
        return descriptions[varName] || 'Variable used in test';
    }
    
    /**
     * Get default value for known variables
     */
    getDefaultValue(varName) {
        const defaults = {
            'url': 'https://ipermit-demo.com',
            'username': 'admin',
            'password': '********'
        };
        
        return defaults[varName] || 'Not set';
    }
    
    /**
     * Get step description
     */
    getStepDescription(step) {
        switch(step.action) {
            case 'NAVIGATE':
                return `Navigate to ${step.variable ? `$${step.variable}` : 'URL'}`;
            case 'WRITE':
                return `Write ${step.variable ? `$${step.variable}` : 'value'}`;
            case 'CLICK':
                return 'Click element';
            case 'SELECT':
            case 'PICK':
                return `Select ${step.value || 'option'}`;
            default:
                return step.action;
        }
    }
    
    // API methods unchanged
    async getJourneyData(journeyId) {
        const endpoint = `/testsuites/${journeyId}?envelope=false`;
        return await this.apiRequest(endpoint);
    }
    
    async getFullExecutionData(ids) {
        const endpoint = `/executions/${ids.execution}`;
        return await this.apiRequest(endpoint);
    }
    
    async getEnvironmentData(projectId) {
        try {
            const endpoint = `/projects/${projectId}/environments`;
            return await this.apiRequest(endpoint);
        } catch (e) {
            console.log('⚠️  Could not fetch environment data');
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

module.exports = VariablesFixedExtractor;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node virtuoso-variables-fixed.js <executionId> <journeyId> [projectId]');
        console.log('Example: node virtuoso-variables-fixed.js 88715 527211 4889');
        process.exit(1);
    }
    
    const ids = {
        execution: args[0],
        journey: args[1],
        project: args[2] || '4889'
    };
    
    const extractor = new VariablesFixedExtractor();
    
    extractor.extract(ids, { verbose: true })
        .then(report => {
            if (!report.text) {
                console.log('\nJSON Output:');
                console.log(report.json);
            }
        })
        .catch(console.error);
}