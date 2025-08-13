#!/usr/bin/env node

/**
 * Check which variables are ACTUALLY USED in journey steps
 */

const https = require('https');

const config = {
    baseUrl: 'https://api-app2.virtuoso.qa/api',
    token: '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
    sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
    clientId: '1754647483711_e9e9c12_production'
};

async function getJourneyData(journeyId) {
    return new Promise((resolve, reject) => {
        const url = `${config.baseUrl}/testsuites/${journeyId}?envelope=false`;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'authorization': `Bearer ${config.token}`,
                'x-v-session-id': config.sessionId,
                'x-virtuoso-client-id': config.clientId
            }
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

async function checkActualUsage() {
    console.log('🔍 Checking ACTUAL Variable Usage in Journey Steps\n');
    console.log('=' .repeat(70));
    
    // Check both journeys
    const journeys = [
        { id: '527211', name: 'Journey without test data' },
        { id: '527218', name: 'Journey WITH test data (60 vars available)' }
    ];
    
    for (const journey of journeys) {
        console.log(`\n📋 ${journey.name} (ID: ${journey.id})`);
        console.log('-' .repeat(70));
        
        try {
            const data = await getJourneyData(journey.id);
            const usedVariables = new Set();
            
            // Scan all steps for variable usage
            if (data.cases) {
                data.cases.forEach((testCase, caseIdx) => {
                    if (testCase.steps) {
                        testCase.steps.forEach((step, stepIdx) => {
                            // Check 'variable' field
                            if (step.variable) {
                                const varName = step.variable.startsWith('$') 
                                    ? step.variable 
                                    : `$${step.variable}`;
                                usedVariables.add(varName);
                                console.log(`  ✓ Step ${caseIdx+1}.${stepIdx+1}: ${step.action} uses ${varName}`);
                            }
                            
                            // Check 'value' field for embedded variables
                            if (step.value && typeof step.value === 'string') {
                                const matches = step.value.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g);
                                if (matches) {
                                    matches.forEach(v => {
                                        usedVariables.add(v);
                                        console.log(`  ✓ Step ${caseIdx+1}.${stepIdx+1}: ${step.action} embeds ${v}`);
                                    });
                                }
                            }
                            
                            // Check element.target.variable
                            if (step.element?.target?.variable) {
                                const varName = step.element.target.variable.startsWith('$')
                                    ? step.element.target.variable
                                    : `$${step.element.target.variable}`;
                                usedVariables.add(varName);
                                console.log(`  ✓ Step ${caseIdx+1}.${stepIdx+1}: ${step.action} targets ${varName}`);
                            }
                        });
                    }
                });
            }
            
            console.log(`\n📊 Summary: ${usedVariables.size} variables ACTUALLY USED`);
            if (usedVariables.size > 0) {
                console.log('Variables used:', Array.from(usedVariables).join(', '));
            }
            
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('⚠️  ISSUE IDENTIFIED:');
    console.log('We were showing ALL 48 test data variables from execution,');
    console.log('but the journey might only USE 2-3 of them in actual steps!');
    console.log('\nSOLUTION: Filter to show ONLY variables referenced in steps.');
}

checkActualUsage();