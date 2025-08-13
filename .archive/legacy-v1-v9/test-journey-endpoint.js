#!/usr/bin/env node

/**
 * Test Journey Endpoint
 * Test specific journey access
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load credentials
const configPath = path.join(__dirname, 'config', 'v10-credentials.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const projectId = '4889';
const journeyId = '612731';
const executionId = '173661';

console.log('🔍 Testing Journey Access\n');
console.log('=' .repeat(70));
console.log(`Project: ${projectId}`);
console.log(`Journey: ${journeyId}`);
console.log(`Execution: ${executionId}`);
console.log('=' .repeat(70));

// Test endpoints in order
const testEndpoints = [
    `/projects/${projectId}`,
    `/projects/${projectId}/journeys`,
    `/projects/${projectId}/journeys/${journeyId}`,
    `/projects/${projectId}/executions/${executionId}`,
    `/journeys/${journeyId}`,  // Alternative endpoint
    `/testsuites/${journeyId}`,  // Journeys might be testsuites
];

function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        const url = `${config.api.baseUrl}${endpoint}`;
        console.log(`\n📋 Testing: ${endpoint}`);
        
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
                console.log(`   Status: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`   ✅ Success`);
                        
                        // Show relevant info
                        if (parsed.name) {
                            console.log(`   Name: ${parsed.name}`);
                        }
                        if (parsed.id) {
                            console.log(`   ID: ${parsed.id}`);
                        }
                        if (parsed.items && Array.isArray(parsed.items)) {
                            console.log(`   Items found: ${parsed.items.length}`);
                            // Show first few journey IDs
                            const journeyIds = parsed.items.slice(0, 5).map(j => j.id);
                            if (journeyIds.length > 0) {
                                console.log(`   First IDs: ${journeyIds.join(', ')}`);
                            }
                        }
                        if (parsed.goalId) {
                            console.log(`   Goal ID: ${parsed.goalId}`);
                        }
                        
                        resolve({ endpoint, success: true, data: parsed });
                    } catch (e) {
                        console.log(`   ❌ Invalid JSON`);
                        resolve({ endpoint, success: false });
                    }
                } else if (res.statusCode === 404) {
                    console.log(`   ❌ Not Found - Resource doesn't exist`);
                    
                    // Try to parse error message
                    try {
                        const error = JSON.parse(data);
                        if (error.error && error.error.message) {
                            console.log(`   Error: ${error.error.message}`);
                        }
                    } catch (e) {
                        // Ignore parse error
                    }
                    
                    resolve({ endpoint, success: false, status: 404 });
                } else {
                    console.log(`   ❌ Error: ${res.statusCode}`);
                    
                    // Check if HTML
                    if (data.startsWith('<html') || data.startsWith('<!DOCTYPE')) {
                        console.log(`   HTML returned (login page)`);
                    } else {
                        // Try to show error
                        try {
                            const error = JSON.parse(data);
                            if (error.error && error.error.message) {
                                console.log(`   Error: ${error.error.message}`);
                            }
                        } catch (e) {
                            console.log(`   Response: ${data.substring(0, 100)}`);
                        }
                    }
                    
                    resolve({ endpoint, success: false, status: res.statusCode });
                }
            });
        }).on('error', (err) => {
            console.log(`   ❌ Request failed: ${err.message}`);
            resolve({ endpoint, success: false });
        });
    });
}

// Run tests
async function runTests() {
    const results = [];
    
    for (const endpoint of testEndpoints) {
        const result = await testEndpoint(endpoint);
        results.push(result);
        
        // If we found journeys, check if our ID is there
        if (result.success && result.data && result.data.items) {
            const journeyFound = result.data.items.some(j => j.id == journeyId);
            if (journeyFound) {
                console.log(`   🎯 Journey ${journeyId} found in list!`);
            } else {
                console.log(`   ⚠️ Journey ${journeyId} NOT in list`);
                console.log(`   Available journey IDs: ${result.data.items.map(j => j.id).slice(0, 10).join(', ')}`);
            }
        }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('📊 Summary\n');
    
    const successful = results.filter(r => r.success);
    
    if (successful.length === 0) {
        console.log('❌ No endpoints worked - authentication issue');
    } else {
        console.log(`✅ ${successful.length} endpoints worked`);
        
        // Check if journey was found
        const journeyEndpoint = results.find(r => r.endpoint.includes(`journeys/${journeyId}`));
        if (journeyEndpoint && journeyEndpoint.success) {
            console.log(`✅ Journey ${journeyId} is accessible!`);
        } else {
            console.log(`❌ Journey ${journeyId} is NOT accessible`);
            console.log('\nPossible reasons:');
            console.log('1. Journey ID doesn\'t exist');
            console.log('2. Journey belongs to different project');
            console.log('3. Journey was deleted');
            console.log('4. No permission to access this journey');
        }
    }
    
    console.log('=' .repeat(70));
}

runTests();