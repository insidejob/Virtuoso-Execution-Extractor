#!/usr/bin/env node

/**
 * Debug script to examine API response structure
 */

const https = require('https');
const fs = require('fs');

const config = {
    baseUrl: 'https://api-app2.virtuoso.qa/api',
    token: process.env.VIRTUOSO_TOKEN || '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
    sessionId: process.env.VIRTUOSO_SESSION || 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
    clientId: process.env.VIRTUOSO_CLIENT || '1754647483711_e9e9c12_production'
};

async function fetchJourney(journeyId) {
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
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function analyzeJourney() {
    console.log('🔍 Fetching journey 527211...\n');
    
    try {
        const data = await fetchJourney('527211');
        
        // Save full response
        fs.writeFileSync('journey-527211-full.json', JSON.stringify(data, null, 2));
        console.log('✅ Full response saved to journey-527211-full.json\n');
        
        // Analyze structure
        console.log('📊 Journey Structure Analysis:');
        console.log('================================');
        console.log(`Name: ${data.name}`);
        console.log(`Title: ${data.title}`);
        console.log(`Cases: ${data.cases ? data.cases.length : 0}`);
        
        // Look for variables in different places
        const foundVariables = new Set();
        
        // Check data table
        if (data.dataTable) {
            console.log('\n📋 Data Table Found:');
            data.dataTable.forEach(item => {
                console.log(`  - ${JSON.stringify(item)}`);
            });
        }
        
        // Check each case
        if (data.cases) {
            console.log('\n📝 Analyzing Steps for Variables:');
            
            data.cases.forEach((testCase, caseIdx) => {
                console.log(`\nCheckpoint ${caseIdx + 1}: ${testCase.title}`);
                
                if (testCase.steps) {
                    testCase.steps.forEach((step, stepIdx) => {
                        const stepInfo = [];
                        stepInfo.push(`  Step ${stepIdx + 1}: ${step.action}`);
                        
                        // Check all fields that might contain variables
                        const fieldsToCheck = ['value', 'variable', 'target', 'assertion', 'data'];
                        
                        fieldsToCheck.forEach(field => {
                            if (step[field]) {
                                const value = step[field];
                                if (typeof value === 'string') {
                                    // Check for variable patterns
                                    if (value.startsWith('$') || value.includes('{{') || value.includes('${')) {
                                        stepInfo.push(`    ⚡ Variable in ${field}: ${value}`);
                                        foundVariables.add(value);
                                    } else if (field === 'variable') {
                                        // Sometimes variables don't have $ prefix in API
                                        stepInfo.push(`    🔧 Potential variable in ${field}: ${value}`);
                                        foundVariables.add(`$${value}`);
                                    }
                                }
                            }
                        });
                        
                        // Check element properties
                        if (step.element) {
                            if (step.element.variable) {
                                stepInfo.push(`    📌 Element variable: ${step.element.variable}`);
                                foundVariables.add(step.element.variable);
                            }
                            
                            if (step.element.target) {
                                const target = step.element.target;
                                if (target.variable) {
                                    stepInfo.push(`    🎯 Target variable: ${target.variable}`);
                                    foundVariables.add(target.variable);
                                }
                            }
                        }
                        
                        // Check parameters
                        if (step.parameters) {
                            Object.entries(step.parameters).forEach(([key, val]) => {
                                if (typeof val === 'string' && (val.startsWith('$') || key === 'variable')) {
                                    stepInfo.push(`    📦 Parameter ${key}: ${val}`);
                                    foundVariables.add(val);
                                }
                            });
                        }
                        
                        if (stepInfo.length > 1) {
                            stepInfo.forEach(line => console.log(line));
                        }
                    });
                }
            });
        }
        
        console.log('\n🎯 Variables Found:');
        if (foundVariables.size > 0) {
            foundVariables.forEach(v => console.log(`  - ${v}`));
        } else {
            console.log('  None found in step definitions');
            console.log('\n  💡 This journey might be using:');
            console.log('     - Hard-coded values instead of variables');
            console.log('     - Variables defined at execution time');
            console.log('     - Data tables defined elsewhere');
        }
        
        // Check first few steps in detail
        if (data.cases && data.cases[0] && data.cases[0].steps) {
            console.log('\n🔬 First Step Detailed Structure:');
            console.log(JSON.stringify(data.cases[0].steps[0], null, 2));
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

analyzeJourney();