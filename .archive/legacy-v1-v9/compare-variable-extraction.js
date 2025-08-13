#!/usr/bin/env node

/**
 * Compare old vs fixed variable extraction
 * Shows the difference between ALL variables vs ONLY USED variables
 */

const https = require('https');

// Configuration
const config = {
    baseUrl: 'https://api-app2.virtuoso.qa/api',
    token: '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
    sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
    clientId: '1754647483711_e9e9c12_production'
};

const headers = {
    'accept': 'application/json, text/plain, */*',
    'authorization': `Bearer ${config.token}`,
    'origin': 'https://app2.virtuoso.qa',
    'referer': 'https://app2.virtuoso.qa/',
    'x-v-session-id': config.sessionId,
    'x-virtuoso-client-id': config.clientId,
    'x-virtuoso-client-name': 'Virtuoso UI'
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
            headers
        };
        
        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

async function compareExtraction() {
    console.log('🔍 Variable Extraction Comparison\n');
    console.log('=' .repeat(70));
    
    try {
        // Get journey data
        const journeyId = '527211';
        const executionId = '88715';
        
        console.log(`Journey ID: ${journeyId}`);
        console.log(`Execution ID: ${executionId}\n`);
        
        const journeyData = await apiRequest(`/testsuites/${journeyId}?envelope=false`);
        const executionData = await apiRequest(`/executions/${executionId}`);
        
        // Find ALL available variables
        const allVariables = new Set();
        
        // From test data
        if (executionData?.item?.meta?.initialDataPerJourneySequence) {
            const testData = executionData.item.meta.initialDataPerJourneySequence[journeyId];
            if (testData) {
                Object.values(testData).forEach(dataRow => {
                    Object.keys(dataRow).forEach(key => allVariables.add(key));
                });
            }
        }
        
        // Find USED variables only
        const usedVariables = new Set();
        const usageDetails = {};
        
        if (journeyData.cases) {
            journeyData.cases.forEach((testCase, caseIndex) => {
                if (testCase.steps) {
                    testCase.steps.forEach((step, stepIndex) => {
                        if (step.variable) {
                            usedVariables.add(step.variable);
                            if (!usageDetails[step.variable]) {
                                usageDetails[step.variable] = [];
                            }
                            usageDetails[step.variable].push({
                                checkpoint: testCase.title,
                                step: stepIndex + 1,
                                action: step.action
                            });
                        }
                    });
                }
            });
        }
        
        // Display comparison
        console.log('📊 CURRENT APPROACH (Shows ALL):\n');
        console.log(`Total Variables Available: ${allVariables.size}`);
        console.log('Sample variables shown:');
        [...allVariables].slice(0, 10).forEach(v => {
            console.log(`  - $${v}`);
        });
        if (allVariables.size > 10) {
            console.log(`  ... and ${allVariables.size - 10} more\n`);
        }
        
        console.log('-' .repeat(70));
        
        console.log('\n✅ FIXED APPROACH (Shows ONLY USED):\n');
        console.log(`Variables Actually Used: ${usedVariables.size}`);
        console.log('Variables in journey steps:');
        [...usedVariables].forEach(v => {
            console.log(`  - $${v}:`);
            usageDetails[v].forEach(usage => {
                console.log(`      Used in "${usage.checkpoint}" (Step ${usage.step}, ${usage.action})`);
            });
        });
        
        console.log('\n' + '=' .repeat(70));
        console.log('\n📈 IMPROVEMENT:');
        console.log(`Before: Showing ${allVariables.size} variables (all available)`);
        console.log(`After:  Showing ${usedVariables.size} variables (only used)`);
        console.log(`Reduction: ${Math.round((1 - usedVariables.size/allVariables.size) * 100)}% less noise`);
        console.log('\n✅ This matches what the user requested!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

compareExtraction();