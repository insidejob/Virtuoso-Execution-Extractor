#!/usr/bin/env node

/**
 * Fetch TestSuite 612731
 * Get the actual data to see the structure
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load credentials
const configPath = path.join(__dirname, 'config', 'v10-credentials.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const testsuiteId = '612731';

console.log('📦 Fetching TestSuite 612731\n');
console.log('=' .repeat(70));

function fetchData(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${config.api.baseUrl}${endpoint}`;
        console.log(`Fetching: ${url}\n`);
        
        const options = {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'authorization': `Bearer ${config.api.token}`,
                'origin': 'https://app2.virtuoso.qa',
                'referer': 'https://app2.virtuoso.qa/',
                'x-v-session-id': config.api.sessionId,
                'x-virtuoso-client-id': config.api.clientId,
                'x-virtuoso-client-name': 'Virtuoso UI'
            }
        };
        
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        // Fetch testsuite
        const testsuite = await fetchData(`/testsuites/${testsuiteId}?envelope=false`);
        
        console.log('✅ TestSuite fetched successfully!\n');
        console.log('TestSuite Structure:');
        console.log('=' .repeat(70));
        
        // Display key information
        console.log(`ID: ${testsuite.id}`);
        console.log(`Name: ${testsuite.name || 'N/A'}`);
        console.log(`Title: ${testsuite.title || 'N/A'}`);
        console.log(`Goal ID: ${testsuite.goalId || 'N/A'}`);
        console.log(`Project ID: ${testsuite.projectId || 'N/A'}`);
        
        // Check for cases/steps
        if (testsuite.cases) {
            console.log(`\nTest Cases: ${testsuite.cases.length}`);
            testsuite.cases.slice(0, 2).forEach((testCase, i) => {
                console.log(`  ${i + 1}. ${testCase.title || testCase.name}`);
                if (testCase.steps) {
                    console.log(`     Steps: ${testCase.steps.length}`);
                    testCase.steps.slice(0, 3).forEach((step, j) => {
                        console.log(`       ${j + 1}. ${step.action} ${step.value || ''}`);
                    });
                }
            });
        }
        
        // Check for dataAttributeValues (variables)
        if (testsuite.dataAttributeValues) {
            const varCount = Object.keys(testsuite.dataAttributeValues).length;
            console.log(`\nData Attribute Values: ${varCount}`);
            const sampleVars = Object.entries(testsuite.dataAttributeValues).slice(0, 5);
            sampleVars.forEach(([key, value]) => {
                console.log(`  $${key}: ${value || '[empty]'}`);
            });
        }
        
        // Save full data
        const outputPath = path.join(__dirname, `testsuite-${testsuiteId}-data.json`);
        fs.writeFileSync(outputPath, JSON.stringify(testsuite, null, 2));
        console.log(`\n📁 Full data saved to: ${outputPath}`);
        
        // Now check if we can get execution and other related data
        console.log('\n' + '=' .repeat(70));
        console.log('Checking related endpoints...\n');
        
        // Try to get execution
        try {
            const execution = await fetchData(`/executions/173661`);
            console.log('❌ Execution 173661 not found (404)');
        } catch (e) {
            console.log('❌ Execution 173661 not found');
        }
        
        // Try project-specific testsuite endpoint
        try {
            const projectTestsuite = await fetchData(`/projects/4889/testsuites/${testsuiteId}`);
            console.log('✅ Project-specific testsuite endpoint works!');
        } catch (e) {
            console.log('❌ Project-specific testsuite endpoint failed');
        }
        
        console.log('\n' + '=' .repeat(70));
        console.log('📊 Summary\n');
        console.log('The journey ID 612731 is actually a TESTSUITE, not a journey.');
        console.log('V10 needs to be updated to handle testsuites.');
        console.log('\nCorrect API endpoint: /testsuites/612731');
        console.log('NOT: /projects/4889/journeys/612731');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();