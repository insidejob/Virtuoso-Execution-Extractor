#!/usr/bin/env node

/**
 * Test API Token
 * Quick test to verify if the token is valid
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load credentials
const configPath = path.join(__dirname, 'config', 'v10-credentials.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('🔐 Testing API Token\n');
console.log('=' .repeat(70));
console.log(`Token: ${config.api.token.substring(0, 8)}...`);
console.log(`Session: ${config.api.sessionId.substring(0, 8)}...`);
console.log('=' .repeat(70));

// Test endpoints
const testEndpoints = [
    '/user',  // Get current user
    '/projects',  // List projects
    '/projects/4889',  // Specific project
];

function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        const url = `${config.api.baseUrl}${endpoint}`;
        console.log(`\n📋 Testing: ${endpoint}`);
        console.log(`   URL: ${url}`);
        
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
                console.log(`   Content-Type: ${res.headers['content-type']}`);
                
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`   ✅ Success - Valid JSON response`);
                        
                        // Show some data
                        if (endpoint === '/user' && parsed.name) {
                            console.log(`   User: ${parsed.name}`);
                        } else if (endpoint === '/projects' && parsed.items) {
                            console.log(`   Projects found: ${parsed.items.length}`);
                        } else if (parsed.name) {
                            console.log(`   Name: ${parsed.name}`);
                        }
                        
                        resolve({ endpoint, success: true, status: res.statusCode });
                    } catch (e) {
                        console.log(`   ❌ Failed to parse JSON: ${e.message}`);
                        resolve({ endpoint, success: false, status: res.statusCode, error: 'Invalid JSON' });
                    }
                } else if (res.statusCode === 401) {
                    console.log(`   ❌ Authentication failed - Token or session invalid`);
                    resolve({ endpoint, success: false, status: res.statusCode, error: 'Auth failed' });
                } else if (res.statusCode === 403) {
                    console.log(`   ❌ Forbidden - No access to this resource`);
                    resolve({ endpoint, success: false, status: res.statusCode, error: 'Forbidden' });
                } else {
                    // Check if HTML was returned
                    if (data.startsWith('<html') || data.startsWith('<!DOCTYPE')) {
                        console.log(`   ❌ HTML returned - Likely login page (auth expired)`);
                        console.log(`   First 100 chars: ${data.substring(0, 100)}...`);
                    } else {
                        console.log(`   ❌ Error: ${res.statusCode}`);
                        console.log(`   Response: ${data.substring(0, 200)}`);
                    }
                    resolve({ endpoint, success: false, status: res.statusCode, error: data.substring(0, 100) });
                }
            });
        }).on('error', (err) => {
            console.log(`   ❌ Request failed: ${err.message}`);
            resolve({ endpoint, success: false, error: err.message });
        });
    });
}

// Run tests
async function runTests() {
    const results = [];
    
    for (const endpoint of testEndpoints) {
        const result = await testEndpoint(endpoint);
        results.push(result);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('📊 Test Summary\n');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (successful === 0) {
        console.log('\n⚠️ Authentication is not working!');
        console.log('\nPossible issues:');
        console.log('1. Token has expired');
        console.log('2. Session ID is invalid');
        console.log('3. Token and session ID don\'t match');
        console.log('\nTo get new credentials:');
        console.log('1. Login to https://app2.virtuoso.qa');
        console.log('2. Open DevTools → Network tab');
        console.log('3. Navigate to any page');
        console.log('4. Look for API calls and copy:');
        console.log('   - authorization header (Bearer token)');
        console.log('   - x-v-session-id header');
        console.log('   - x-virtuoso-client-id header');
    } else if (successful === results.length) {
        console.log('\n🎉 Token is working perfectly!');
        console.log('You can now run extractions with V10.');
    } else {
        console.log('\n⚠️ Token partially working.');
        console.log('Some endpoints may require additional permissions.');
    }
    
    // Save results
    const reportPath = path.join(__dirname, 'token-test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        token: config.api.token,
        results: results,
        summary: { successful, failed, total: results.length }
    }, null, 2));
    
    console.log(`\n📁 Results saved to: ${reportPath}`);
    console.log('=' .repeat(70));
}

runTests();