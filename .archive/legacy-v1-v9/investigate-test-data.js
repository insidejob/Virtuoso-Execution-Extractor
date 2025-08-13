#!/usr/bin/env node

/**
 * Investigate test data and variable sources in Virtuoso API
 */

const https = require('https');
const fs = require('fs');

const config = {
    baseUrl: 'https://api-app2.virtuoso.qa/api',
    token: process.env.VIRTUOSO_TOKEN || '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
    sessionId: process.env.VIRTUOSO_SESSION || 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
    clientId: process.env.VIRTUOSO_CLIENT || '1754647483711_e9e9c12_production'
};

async function apiRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${config.baseUrl}${endpoint}`;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'authorization': `Bearer ${config.token}`,
                'origin': 'https://app2.virtuoso.qa',
                'referer': 'https://app2.virtuoso.qa/',
                'x-v-session-id': config.sessionId,
                'x-virtuoso-client-id': config.clientId,
                'x-virtuoso-client-name': 'Virtuoso UI'
            }
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
                        reject(new Error('Failed to parse response'));
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode} for ${endpoint}`));
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function investigate() {
    console.log('🔍 Investigating Test Data and Variable Sources\n');
    console.log('=' .repeat(50));
    
    const executionId = '88715';
    const journeyId = '527211';
    const projectId = '4889';
    
    // List of endpoints to try
    const endpointsToTry = [
        // Test data specific
        `/executions/${executionId}/testdata`,
        `/executions/${executionId}/data`,
        `/executions/${executionId}/variables`,
        `/executions/${executionId}/environment`,
        
        // Data tables
        `/testsuites/${journeyId}/datatable`,
        `/testsuites/${journeyId}/data`,
        `/projects/${projectId}/datatable`,
        
        // Execution details
        `/executions/${executionId}`,
        `/executions/${executionId}/results`,
        `/executions/${executionId}/context`,
        
        // Journey with execution context
        `/executions/${executionId}/testsuites/${journeyId}`,
        `/executions/${executionId}/journeys/${journeyId}`,
        
        // Environment specific
        `/projects/${projectId}/environments`,
        `/projects/${projectId}/variables`,
        
        // Test data sets
        `/projects/${projectId}/testdata`,
        `/projects/${projectId}/datasets`
    ];
    
    console.log(`\n📊 Testing ${endpointsToTry.length} endpoints...\n`);
    
    const results = {
        success: [],
        failed: [],
        variables: {}
    };
    
    for (const endpoint of endpointsToTry) {
        try {
            console.log(`🔄 Testing: ${endpoint}`);
            const data = await apiRequest(endpoint);
            
            console.log(`   ✅ Success!`);
            results.success.push(endpoint);
            
            // Save the response
            const filename = `response-${endpoint.replace(/\//g, '-')}.json`;
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            console.log(`   📁 Saved to: ${filename}`);
            
            // Look for variables in the response
            const foundVars = findVariables(data);
            if (foundVars.length > 0) {
                console.log(`   🎯 Found variables: ${foundVars.join(', ')}`);
                results.variables[endpoint] = foundVars;
            }
            
            // Check for specific variable-related fields
            checkForVariableFields(data, endpoint);
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            results.failed.push(endpoint);
        }
        
        console.log('');
    }
    
    // Summary
    console.log('=' .repeat(50));
    console.log('📊 SUMMARY\n');
    
    console.log(`✅ Successful endpoints (${results.success.length}):`);
    results.success.forEach(e => console.log(`   - ${e}`));
    
    console.log(`\n❌ Failed endpoints (${results.failed.length}):`);
    results.failed.forEach(e => console.log(`   - ${e}`));
    
    if (Object.keys(results.variables).length > 0) {
        console.log('\n🎯 Endpoints with variables:');
        Object.entries(results.variables).forEach(([endpoint, vars]) => {
            console.log(`   ${endpoint}:`);
            vars.forEach(v => console.log(`     - ${v}`));
        });
    }
    
    // Try to get the main execution data for detailed analysis
    if (results.success.includes(`/executions/${executionId}`)) {
        console.log('\n📋 Analyzing main execution data...\n');
        try {
            const execData = await apiRequest(`/executions/${executionId}`);
            analyzeExecutionData(execData);
        } catch (e) {
            console.log('Could not analyze execution data');
        }
    }
}

function findVariables(obj, path = '') {
    const variables = [];
    
    if (!obj) return variables;
    
    if (typeof obj === 'string') {
        // Check for variable patterns
        if (obj.startsWith('$') || obj.includes('{{') || obj.includes('${')) {
            variables.push(obj);
        }
    } else if (Array.isArray(obj)) {
        obj.forEach((item, i) => {
            variables.push(...findVariables(item, `${path}[${i}]`));
        });
    } else if (typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
            // Check key names that might contain variables
            if (key.toLowerCase().includes('variable') || 
                key.toLowerCase().includes('data') ||
                key.toLowerCase().includes('param') ||
                key.toLowerCase().includes('value')) {
                
                if (typeof value === 'string' && value) {
                    // Could be a variable name or value
                    if (value.startsWith('$') || !value.includes(' ')) {
                        variables.push(`${key}: ${value}`);
                    }
                }
            }
            
            // Recurse
            variables.push(...findVariables(value, path ? `${path}.${key}` : key));
        });
    }
    
    return [...new Set(variables)]; // Remove duplicates
}

function checkForVariableFields(data, endpoint) {
    const interestingFields = [
        'variables',
        'testData',
        'dataTable',
        'environment',
        'environmentVariables',
        'parameters',
        'context',
        'inputs',
        'outputs',
        'dataset',
        'datasetId',
        'testDataId'
    ];
    
    const found = [];
    
    interestingFields.forEach(field => {
        if (data && data[field]) {
            found.push(field);
        }
    });
    
    if (found.length > 0) {
        console.log(`   📌 Interesting fields: ${found.join(', ')}`);
    }
}

function analyzeExecutionData(execData) {
    console.log('Execution Details:');
    console.log(`  ID: ${execData.id}`);
    console.log(`  Status: ${execData.status}`);
    
    // Look for test data references
    if (execData.testDataId) {
        console.log(`  Test Data ID: ${execData.testDataId}`);
    }
    
    if (execData.datasetId) {
        console.log(`  Dataset ID: ${execData.datasetId}`);
    }
    
    if (execData.environmentId) {
        console.log(`  Environment ID: ${execData.environmentId}`);
    }
    
    if (execData.environment) {
        console.log(`  Environment: ${execData.environment}`);
    }
    
    // Check for variables in different places
    if (execData.variables) {
        console.log('\n  Variables found in execution:');
        Object.entries(execData.variables).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
        });
    }
    
    if (execData.testData) {
        console.log('\n  Test Data found in execution:');
        console.log(`    ${JSON.stringify(execData.testData, null, 2)}`);
    }
    
    if (execData.context) {
        console.log('\n  Context found in execution:');
        console.log(`    ${JSON.stringify(execData.context, null, 2)}`);
    }
}

// Run investigation
investigate().catch(console.error);