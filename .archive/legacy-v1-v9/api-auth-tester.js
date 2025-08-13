#!/usr/bin/env node

/**
 * API Authentication Tester
 * Tests various authentication methods and endpoints
 */

const https = require('https');
const http = require('http');

const CONFIG = {
    token: '9e141010-eca5-43f5-afb9-20dc6c49833f',
    executionId: 88715,
    journeyId: 527218,
    projectId: 4889,
    orgId: 1964
};

// Test endpoints
const testEndpoints = [
    // Different subdomains
    { base: 'https://api-app2.virtuoso.qa/api', name: 'api-app2' },
    { base: 'https://api.virtuoso.qa/api', name: 'api' },
    { base: 'https://app2.virtuoso.qa/api', name: 'app2/api' },
    { base: 'https://app2-api.virtuoso.qa/api', name: 'app2-api' },
    
    // Different paths
    { base: 'https://app2.virtuoso.qa/rest', name: 'app2/rest' },
    { base: 'https://app2.virtuoso.qa/v1', name: 'app2/v1' },
    { base: 'https://app2.virtuoso.qa/v2', name: 'app2/v2' },
    
    // GraphQL
    { base: 'https://app2.virtuoso.qa/graphql', name: 'graphql' },
];

// Test auth headers
const authMethods = [
    { name: 'Bearer', headers: { 'Authorization': `Bearer ${CONFIG.token}` } },
    { name: 'Token', headers: { 'Authorization': `Token ${CONFIG.token}` } },
    { name: 'X-Auth-Token', headers: { 'X-Auth-Token': CONFIG.token } },
    { name: 'X-API-Key', headers: { 'X-API-Key': CONFIG.token } },
    { name: 'X-Access-Token', headers: { 'X-Access-Token': CONFIG.token } },
    { name: 'Cookie', headers: { 'Cookie': `auth_token=${CONFIG.token}` } },
];

async function testAuth(endpoint, authMethod) {
    return new Promise((resolve) => {
        const url = `${endpoint.base}/executions/${CONFIG.executionId}`;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname,
            method: 'GET',
            headers: {
                ...authMethod.headers,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Virtuoso-Auth-Tester/1.0'
            }
        };
        
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const req = protocol.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    endpoint: endpoint.name,
                    auth: authMethod.name,
                    status: res.statusCode,
                    isJSON: data.startsWith('{') || data.startsWith('['),
                    sample: data.substring(0, 100)
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                endpoint: endpoint.name,
                auth: authMethod.name,
                status: 'ERROR',
                error: error.message
            });
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({
                endpoint: endpoint.name,
                auth: authMethod.name,
                status: 'TIMEOUT'
            });
        });
        
        req.end();
    });
}

async function runTests() {
    console.log('🔐 Virtuoso API Authentication Tester');
    console.log('=' .repeat(50));
    console.log(`Token: ${CONFIG.token.substring(0, 8)}...`);
    console.log(`Execution: ${CONFIG.executionId}`);
    console.log('=' .repeat(50));
    console.log('');
    
    const results = [];
    
    for (const endpoint of testEndpoints) {
        for (const authMethod of authMethods) {
            process.stdout.write(`Testing ${endpoint.name} with ${authMethod.name}... `);
            
            const result = await testAuth(endpoint, authMethod);
            results.push(result);
            
            if (result.status === 200) {
                console.log(`✅ SUCCESS (${result.status})`);
                if (result.isJSON) {
                    console.log(`   📊 JSON Response received!`);
                }
            } else if (result.status === 401 || result.status === 403) {
                console.log(`🔒 AUTH FAILED (${result.status})`);
            } else if (result.status === 404) {
                console.log(`❓ NOT FOUND (${result.status})`);
            } else if (result.status === 'ERROR') {
                console.log(`❌ ERROR: ${result.error}`);
            } else if (result.status === 'TIMEOUT') {
                console.log(`⏱️  TIMEOUT`);
            } else {
                console.log(`⚠️  ${result.status}`);
            }
        }
        console.log('');
    }
    
    // Analyze results
    console.log('=' .repeat(50));
    console.log('📊 Analysis');
    console.log('=' .repeat(50));
    
    const successful = results.filter(r => r.status === 200);
    const jsonResponses = results.filter(r => r.isJSON);
    
    if (successful.length > 0) {
        console.log('\n✅ Working Combinations:');
        successful.forEach(r => {
            console.log(`   • ${r.endpoint} + ${r.auth}`);
        });
    }
    
    if (jsonResponses.length > 0) {
        console.log('\n📦 JSON Responses:');
        jsonResponses.forEach(r => {
            console.log(`   • ${r.endpoint} + ${r.auth} (HTTP ${r.status})`);
        });
    }
    
    // Check if we found any working combination
    if (successful.length === 0) {
        console.log('\n❌ No working API authentication found');
        console.log('\n💡 This confirms the token is UI-only');
        console.log('   Use browser extraction method instead:');
        console.log('   node terminal-browser-extractor.js');
    } else {
        console.log('\n✅ Found working authentication!');
        console.log('   Update the extraction scripts with:');
        console.log(`   Endpoint: ${successful[0].endpoint}`);
        console.log(`   Auth: ${successful[0].auth}`);
    }
    
    // Save results
    const filename = `auth_test_results_${Date.now()}.json`;
    require('fs').writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n💾 Full results saved to: ${filename}`);
}

// Run tests
runTests().catch(console.error);