#!/usr/bin/env node

/**
 * Diagnose why it works in Postman but not in our scripts
 * Tests the EXACT same request in multiple ways
 */

const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');

class PostmanDiagnostic {
    constructor() {
        this.config = {
            url: 'https://api-app2.virtuoso.qa/api/executions/88715/status',
            token: '9e141010-eca5-43f5-afb9-20dc6c49833f'
        };
    }

    // Test 1: Node.js HTTPS (our current approach)
    async testNodeJS() {
        console.log('📋 Test 1: Node.js HTTPS Request');
        console.log('=' .repeat(50));
        
        return new Promise((resolve) => {
            const url = new URL(this.config.url);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`
                }
            };

            console.log(`URL: ${this.config.url}`);
            console.log(`Headers: Authorization: Bearer ${this.config.token.substring(0, 10)}...`);

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`Status: ${res.statusCode}`);
                    console.log(`Response: ${data}\n`);
                    resolve({ method: 'nodejs', status: res.statusCode, data });
                });
            });
            
            req.on('error', (e) => {
                console.log(`Error: ${e.message}\n`);
                resolve({ method: 'nodejs', error: e.message });
            });
            
            req.end();
        });
    }

    // Test 2: cURL command (exactly as Postman would generate)
    async testCURL() {
        console.log('📋 Test 2: cURL Command');
        console.log('=' .repeat(50));
        
        const curlCommand = `curl -s -w "\\nHTTP_STATUS:%{http_code}" "${this.config.url}" -H "Authorization: Bearer ${this.config.token}"`;
        
        console.log(`Command: ${curlCommand}\n`);
        
        return new Promise((resolve) => {
            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                    console.log(`Error: ${error.message}\n`);
                    resolve({ method: 'curl', error: error.message });
                    return;
                }
                
                // Extract status code and response
                const parts = stdout.split('\nHTTP_STATUS:');
                const response = parts[0];
                const statusCode = parts[1]?.trim();
                
                console.log(`Status: ${statusCode}`);
                console.log(`Response: ${response}\n`);
                
                resolve({ method: 'curl', status: statusCode, data: response });
            });
        });
    }

    // Test 3: Try different token formats
    async testTokenFormats() {
        console.log('📋 Test 3: Different Token Formats');
        console.log('=' .repeat(50));
        
        const formats = [
            { name: 'Bearer with space', value: `Bearer ${this.config.token}` },
            { name: 'Bearer no space', value: `Bearer${this.config.token}` },
            { name: 'Token only', value: this.config.token },
            { name: 'bearer lowercase', value: `bearer ${this.config.token}` },
            { name: 'Token prefix', value: `Token ${this.config.token}` }
        ];

        for (const format of formats) {
            console.log(`\nTesting: ${format.name}`);
            
            const result = await new Promise((resolve) => {
                const url = new URL(this.config.url);
                
                const options = {
                    hostname: url.hostname,
                    port: 443,
                    path: url.pathname,
                    method: 'GET',
                    headers: {
                        'Authorization': format.value
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        console.log(`  Status: ${res.statusCode}`);
                        resolve({ format: format.name, status: res.statusCode });
                    });
                });
                
                req.on('error', () => resolve({ format: format.name, error: true }));
                req.end();
            });
        }
    }

    // Test 4: Check if token needs refresh
    async checkTokenStatus() {
        console.log('\n📋 Test 4: Token Validation');
        console.log('=' .repeat(50));
        
        // Try to decode the token (if it's a JWT)
        const tokenParts = this.config.token.split('.');
        
        if (tokenParts.length === 3) {
            console.log('Token appears to be JWT format');
            try {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                console.log('Token payload:', JSON.stringify(payload, null, 2));
                
                if (payload.exp) {
                    const expiry = new Date(payload.exp * 1000);
                    const now = new Date();
                    console.log(`Token expiry: ${expiry}`);
                    console.log(`Current time: ${now}`);
                    console.log(`Token ${expiry > now ? 'is still valid' : 'has expired'}`);
                }
            } catch (e) {
                console.log('Could not decode token as JWT');
            }
        } else {
            console.log('Token is not JWT format (opaque token)');
            console.log(`Token: ${this.config.token}`);
            console.log(`Length: ${this.config.token.length} characters`);
            console.log(`Format: ${this.config.token.match(/^[a-f0-9-]+$/i) ? 'Hex/UUID format' : 'Mixed format'}`);
        }
    }

    // Test 5: Generate exact Postman request
    generatePostmanRequest() {
        console.log('\n📋 Postman Request for Import');
        console.log('=' .repeat(50));
        
        const postmanCollection = {
            info: {
                name: "Virtuoso API Test",
                schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            item: [
                {
                    name: "Execution Status",
                    request: {
                        method: "GET",
                        header: [
                            {
                                key: "Authorization",
                                value: `Bearer ${this.config.token}`,
                                type: "text"
                            }
                        ],
                        url: {
                            raw: this.config.url,
                            protocol: "https",
                            host: ["api-app2", "virtuoso", "qa"],
                            path: ["api", "executions", "88715", "status"]
                        }
                    }
                }
            ]
        };

        const filename = 'postman-test-collection.json';
        fs.writeFileSync(filename, JSON.stringify(postmanCollection, null, 2));
        
        console.log(`Postman collection saved to: ${filename}`);
        console.log('\nTo test:');
        console.log('1. Import this collection into Postman');
        console.log('2. Run the "Execution Status" request');
        console.log('3. Check if it works there');
        console.log('4. If it works, export the working request as cURL');
        console.log('5. Share the exact cURL command Postman generates');
    }

    // Test 6: Try alternative endpoints
    async testAlternativeEndpoints() {
        console.log('\n📋 Test 6: Alternative Endpoints');
        console.log('=' .repeat(50));
        
        const endpoints = [
            '/executions/88715',
            '/executions/88715/status',
            '/projects/4889/executions/88715',
            '/testsuites/527218',
            '/journeys/527218'
        ];

        for (const endpoint of endpoints) {
            const url = `https://api-app2.virtuoso.qa/api${endpoint}`;
            console.log(`\nTesting: ${endpoint}`);
            
            const result = await new Promise((resolve) => {
                const urlObj = new URL(url);
                
                const options = {
                    hostname: urlObj.hostname,
                    port: 443,
                    path: urlObj.pathname,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.config.token}`,
                        'Accept': 'application/json'
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        console.log(`  Status: ${res.statusCode}`);
                        if (res.statusCode === 200) {
                            console.log(`  ✅ SUCCESS! This endpoint works!`);
                            console.log(`  Response: ${data.substring(0, 100)}...`);
                        }
                        resolve({ endpoint, status: res.statusCode });
                    });
                });
                
                req.on('error', () => resolve({ endpoint, error: true }));
                req.end();
            });
        }
    }

    async runAllTests() {
        console.log('🔍 Comprehensive Postman Diagnostic');
        console.log('=' .repeat(50));
        console.log(`URL: ${this.config.url}`);
        console.log(`Token: ${this.config.token.substring(0, 20)}...`);
        console.log('=' .repeat(50));
        console.log('');

        // Run all tests
        await this.testNodeJS();
        await this.testCURL();
        await this.testTokenFormats();
        await this.checkTokenStatus();
        await this.testAlternativeEndpoints();
        this.generatePostmanRequest();

        // Final instructions
        console.log('\n' + '=' .repeat(50));
        console.log('📊 Diagnostic Complete');
        console.log('=' .repeat(50));
        
        console.log('\n🔧 Please Try These:');
        console.log('\n1. Run this exact cURL in your terminal:');
        console.log(`   curl -v "${this.config.url}" -H "Authorization: Bearer ${this.config.token}"`);
        
        console.log('\n2. In Postman:');
        console.log('   - Import postman-test-collection.json');
        console.log('   - Run the request');
        console.log('   - If it works, click Code → cURL and share the exact command');
        
        console.log('\n3. Check if the execution exists:');
        console.log('   - Try execution ID: 88715');
        console.log('   - In environment: api-app2.virtuoso.qa');
        console.log('   - For project: 4889');
        
        console.log('\n4. Verify the token:');
        console.log('   - Is this the exact token from Postman?');
        console.log('   - Has it been refreshed recently?');
        console.log('   - Copy it again from Postman to be sure');
        
        console.log('\n💡 The Issue Must Be:');
        console.log('   1. Token has expired/changed');
        console.log('   2. Execution 88715 doesn\'t exist in api-app2');
        console.log('   3. Postman has additional session context');
        console.log('   4. There\'s a typo in the token');
    }
}

// Run diagnostic
async function main() {
    const diagnostic = new PostmanDiagnostic();
    await diagnostic.runAllTests();
}

if (require.main === module) {
    main();
}

module.exports = PostmanDiagnostic;