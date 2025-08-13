#!/usr/bin/env node

const https = require('https');

async function debugAPIConnection() {
    console.log('🔍 Debugging API Connection\n');
    console.log('=' .repeat(80) + '\n');
    
    const token = '86defbf4-62a7-4958-a0b4-21af0dee5d7a';
    
    // Test different base URLs and paths
    const tests = [
        { host: 'app2.virtuoso.qa', path: '/api/user', description: 'app2 /api/user' },
        { host: 'app2.virtuoso.qa', path: '/api/projects', description: 'app2 /api/projects' },
        { host: 'api.virtuoso.qa', path: '/api/user', description: 'api subdomain /api/user' },
        { host: 'api.virtuoso.qa', path: '/user', description: 'api subdomain /user' },
        { host: 'api-app2.virtuoso.qa', path: '/user', description: 'api-app2 subdomain' },
        { host: 'app2-api.virtuoso.qa', path: '/user', description: 'app2-api subdomain' },
        { host: 'app2.virtuoso.qa', path: '/rest/user', description: 'app2 /rest/user' },
        { host: 'app2.virtuoso.qa', path: '/v1/user', description: 'app2 /v1/user' }
    ];
    
    for (const test of tests) {
        console.log(`Testing: ${test.description}`);
        console.log(`  URL: https://${test.host}${test.path}`);
        
        const result = await makeRequest(test.host, test.path, token);
        
        if (result.success) {
            console.log(`  ✅ SUCCESS - Status: ${result.status}`);
            if (result.data) {
                console.log(`  Data received: ${JSON.stringify(result.data).substring(0, 100)}...`);
            }
            console.log(`  Headers: ${JSON.stringify(result.headers).substring(0, 200)}...`);
        } else if (result.status === 301 || result.status === 302) {
            console.log(`  ↪️ REDIRECT - Status: ${result.status}`);
            console.log(`  Location: ${result.headers.location}`);
        } else {
            console.log(`  ❌ FAILED - Status: ${result.status || 'Error'}`);
            if (result.error) {
                console.log(`  Error: ${result.error}`);
            }
        }
        console.log('');
    }
    
    // Now test with our working connection from earlier
    console.log('Testing known working pattern from test-app2-connection.js:');
    console.log('  URL: https://app2.virtuoso.qa/api/user');
    console.log('  With exact headers from working test...\n');
    
    const workingResult = await makeRequestExact(token);
    if (workingResult.success) {
        console.log('  ✅ Working pattern successful!');
        console.log(`  Response: ${JSON.stringify(workingResult.data).substring(0, 200)}`);
    } else {
        console.log('  ❌ Working pattern failed');
        console.log(`  Status: ${workingResult.status}`);
    }
}

function makeRequest(host, path, token) {
    return new Promise((resolve) => {
        const options = {
            hostname: host,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                let parsedData = null;
                try {
                    if (data && data.trim()) {
                        parsedData = JSON.parse(data);
                    }
                } catch (e) {
                    parsedData = data;
                }
                
                resolve({
                    success: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    data: parsedData,
                    headers: res.headers
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });
        
        req.end();
    });
}

function makeRequestExact(token) {
    // Exact copy of working request from test-app2-connection.js
    return new Promise((resolve) => {
        const options = {
            hostname: 'app2.virtuoso.qa',
            path: '/api/user',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode < 400) {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            data: parsed
                        });
                    } catch (e) {
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            data: data
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        statusCode: res.statusCode,
                        error: `Status ${res.statusCode}`,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });
        
        req.end();
    });
}

// Run the debug
debugAPIConnection().catch(console.error);