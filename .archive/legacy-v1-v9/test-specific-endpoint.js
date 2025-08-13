#!/usr/bin/env node

/**
 * Test the SPECIFIC endpoint provided by user
 * https://api-app2.virtuoso.qa/api/testsuites/527211?envelope=false
 */

const https = require('https');
const fs = require('fs');

class SpecificEndpointTest {
    constructor() {
        this.config = {
            url: 'https://api-app2.virtuoso.qa/api/testsuites/527211?envelope=false',
            token: '9e141010-eca5-43f5-afb9-20dc6c49833f'
        };
    }

    async testEndpoint() {
        console.log('🎯 Testing Specific Endpoint');
        console.log('=' .repeat(50));
        console.log(`URL: ${this.config.url}`);
        console.log(`Token: Bearer ${this.config.token.substring(0, 20)}...`);
        console.log('=' .repeat(50));
        
        return new Promise((resolve) => {
            const url = new URL(this.config.url);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,  // Include query params
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            console.log('\n📡 Making Request...');
            console.log(`   Path: ${url.pathname + url.search}`);

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Content-Type: ${res.headers['content-type']}`);
                    
                    if (res.statusCode === 200) {
                        console.log('   ✅ SUCCESS! The endpoint works!');
                        
                        try {
                            const jsonData = JSON.parse(data);
                            console.log('\n📊 Response Data:');
                            console.log(JSON.stringify(jsonData, null, 2).substring(0, 2000));
                            
                            // Save the response
                            fs.writeFileSync('testsuite-527211-response.json', JSON.stringify(jsonData, null, 2));
                            console.log('\n💾 Full response saved to: testsuite-527211-response.json');
                            
                            // Analyze the response
                            this.analyzeResponse(jsonData);
                            
                            resolve({ success: true, data: jsonData });
                        } catch (e) {
                            console.log('   Response (non-JSON):');
                            console.log(data.substring(0, 500));
                            resolve({ success: true, data: data });
                        }
                    } else {
                        console.log('   ❌ Failed');
                        console.log(`   Response: ${data}`);
                        resolve({ success: false, status: res.statusCode, data: data });
                    }
                });
            });
            
            req.on('error', (error) => {
                console.log(`   ❌ Error: ${error.message}`);
                resolve({ success: false, error: error.message });
            });
            
            req.end();
        });
    }

    analyzeResponse(data) {
        console.log('\n📋 Response Analysis:');
        console.log('=' .repeat(50));
        
        // Check for checkpoints
        if (data.checkpoints) {
            console.log(`✅ Found ${data.checkpoints.length} checkpoints`);
            
            // Count steps
            let totalSteps = 0;
            data.checkpoints.forEach(cp => {
                if (cp.steps) {
                    totalSteps += cp.steps.length;
                }
            });
            console.log(`✅ Total steps: ${totalSteps}`);
        }
        
        // Check for execution data
        if (data.id || data.testsuiteId) {
            console.log(`✅ TestSuite ID: ${data.id || data.testsuiteId}`);
        }
        
        if (data.name) {
            console.log(`✅ TestSuite Name: ${data.name}`);
        }
        
        // Check structure
        console.log('\n📦 Data Structure:');
        const keys = Object.keys(data);
        keys.forEach(key => {
            const value = data[key];
            const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
            console.log(`   • ${key}: ${type}`);
        });
    }

    async testVariations() {
        console.log('\n📋 Testing Variations');
        console.log('=' .repeat(50));
        
        const variations = [
            // Original journey ID with envelope=false
            'https://api-app2.virtuoso.qa/api/testsuites/527218?envelope=false',
            // Without envelope parameter
            'https://api-app2.virtuoso.qa/api/testsuites/527211',
            // With envelope=true
            'https://api-app2.virtuoso.qa/api/testsuites/527211?envelope=true',
            // Execution endpoint with envelope
            'https://api-app2.virtuoso.qa/api/executions/88715?envelope=false',
            // Different format
            'https://api-app2.virtuoso.qa/api/projects/4889/testsuites/527211?envelope=false'
        ];
        
        for (const url of variations) {
            console.log(`\n🔍 Testing: ${url}`);
            
            const result = await new Promise((resolve) => {
                const urlObj = new URL(url);
                
                const options = {
                    hostname: urlObj.hostname,
                    port: 443,
                    path: urlObj.pathname + urlObj.search,
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
                        console.log(`   Status: ${res.statusCode}`);
                        if (res.statusCode === 200) {
                            console.log('   ✅ This variation works!');
                            try {
                                const json = JSON.parse(data);
                                const filename = `variation-${url.split('/').pop().replace('?', '-')}.json`;
                                fs.writeFileSync(filename, JSON.stringify(json, null, 2));
                                console.log(`   💾 Saved to: ${filename}`);
                            } catch (e) {}
                        }
                        resolve({ status: res.statusCode });
                    });
                });
                
                req.on('error', () => resolve({ error: true }));
                req.end();
            });
        }
    }

    generateCurlCommand() {
        console.log('\n📋 cURL Commands');
        console.log('=' .repeat(50));
        
        console.log('\n1. Exact endpoint you provided:');
        console.log(`curl -X GET "${this.config.url}" \\`);
        console.log(`  -H "Authorization: Bearer ${this.config.token}" \\`);
        console.log(`  -H "Accept: application/json"`);
        
        console.log('\n2. Without envelope parameter:');
        console.log(`curl -X GET "https://api-app2.virtuoso.qa/api/testsuites/527211" \\`);
        console.log(`  -H "Authorization: Bearer ${this.config.token}" \\`);
        console.log(`  -H "Accept: application/json"`);
        
        console.log('\n3. With verbose output:');
        console.log(`curl -v "${this.config.url}" \\`);
        console.log(`  -H "Authorization: Bearer ${this.config.token}"`);
    }
}

// Main execution
async function main() {
    const tester = new SpecificEndpointTest();
    
    // Test the specific endpoint
    const result = await tester.testEndpoint();
    
    if (result.success) {
        console.log('\n' + '=' .repeat(50));
        console.log('✅ SUCCESS! The endpoint works!');
        console.log('=' .repeat(50));
        console.log('\nThis confirms:');
        console.log('1. The token IS valid');
        console.log('2. The testsuite ID 527211 exists');
        console.log('3. The envelope=false parameter might be required');
        console.log('\nNow we can extract the data and convert to NLP!');
    } else {
        console.log('\n' + '=' .repeat(50));
        console.log('❌ This endpoint also failed');
        console.log('=' .repeat(50));
        
        // Try variations
        await tester.testVariations();
    }
    
    // Generate curl commands
    tester.generateCurlCommand();
}

if (require.main === module) {
    main();
}

module.exports = SpecificEndpointTest;