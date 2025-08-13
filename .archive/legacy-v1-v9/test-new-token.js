#!/usr/bin/env node

/**
 * Test NEW API Token provided by user
 * Testing token: 2d313def-7ec2-4526-b0b6-57028c343aba
 */

const https = require('https');

class NewTokenTester {
    constructor() {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            
            // NEW TOKEN FROM USER
            newToken: '2d313def-7ec2-4526-b0b6-57028c343aba',
            
            // Old session headers (may or may not still be valid)
            oldSessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
            oldClientId: '1754647483711_e9e9c12_production',
            
            // Test endpoints
            testEndpoints: [
                '/testsuites/527211?envelope=false',
                '/testsuites/527218?envelope=false',
                '/executions/88715',
                '/projects/4889/environments',
                '/projects/4889'
            ]
        };
        
        this.results = [];
    }
    
    async runTests() {
        console.log('🔑 Testing NEW API Token\n');
        console.log('=' .repeat(70));
        console.log(`Token: ${this.config.newToken.substring(0, 20)}...`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log('=' .repeat(70));
        
        // Test different header combinations
        const headerCombinations = [
            {
                name: 'New Token with Full Headers',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'authorization': `Bearer ${this.config.newToken}`,
                    'origin': 'https://app2.virtuoso.qa',
                    'referer': 'https://app2.virtuoso.qa/',
                    'x-v-session-id': this.config.oldSessionId,
                    'x-virtuoso-client-id': this.config.oldClientId,
                    'x-virtuoso-client-name': 'Virtuoso UI',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            },
            {
                name: 'New Token Only (Minimal)',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.config.newToken}`
                }
            },
            {
                name: 'New Token without Session',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'authorization': `Bearer ${this.config.newToken}`,
                    'origin': 'https://app2.virtuoso.qa',
                    'referer': 'https://app2.virtuoso.qa/',
                    'x-virtuoso-client-name': 'Virtuoso UI'
                }
            },
            {
                name: 'New Token with Different Accept',
                headers: {
                    'accept': '*/*',
                    'authorization': `Bearer ${this.config.newToken}`,
                    'x-v-session-id': this.config.oldSessionId,
                    'x-virtuoso-client-id': this.config.oldClientId
                }
            }
        ];
        
        console.log('\n🧪 TESTING DIFFERENT HEADER COMBINATIONS\n');
        
        let workingCombination = null;
        
        for (const combo of headerCombinations) {
            console.log(`\n📡 Testing: ${combo.name}`);
            console.log('-' .repeat(50));
            
            const result = await this.testEndpoint(this.config.testEndpoints[0], combo.headers);
            
            console.log(`Endpoint: ${this.config.testEndpoints[0]}`);
            console.log(`Status: ${result.status}`);
            
            if (result.status === 200) {
                console.log(`✅ SUCCESS! This combination works!`);
                console.log(`Response size: ${result.size} bytes`);
                workingCombination = combo;
                break;
            } else if (result.status === 401) {
                console.log(`❌ FAILED - Still getting 401 Unauthorized`);
                if (result.error) {
                    console.log(`Error: ${result.error}`);
                }
            } else {
                console.log(`⚠️  Unexpected status: ${result.status}`);
                if (result.error) {
                    console.log(`Error: ${result.error}`);
                }
            }
        }
        
        if (workingCombination) {
            console.log('\n' + '=' .repeat(70));
            console.log('🎉 SUCCESS - Found working configuration!\n');
            console.log('Testing all endpoints with working headers...\n');
            
            // Test all endpoints with the working combination
            for (const endpoint of this.config.testEndpoints) {
                const result = await this.testEndpoint(endpoint, workingCombination.headers);
                console.log(`${result.status === 200 ? '✅' : '❌'} ${endpoint}: ${result.status}`);
                this.results.push({
                    endpoint,
                    status: result.status,
                    success: result.status === 200
                });
            }
            
            // Save working configuration
            this.saveWorkingConfig(workingCombination);
            
        } else {
            console.log('\n' + '=' .repeat(70));
            console.log('❌ FAILURE - New token does not work\n');
            
            console.log('🔍 TROUBLESHOOTING INFORMATION:\n');
            console.log('1. Token Format Analysis:');
            console.log(`   - Length: ${this.config.newToken.length} characters`);
            console.log(`   - Format: ${this.validateTokenFormat(this.config.newToken)}`);
            console.log(`   - Pattern: UUID v4 format ✅`);
            
            console.log('\n2. Possible Issues:');
            console.log('   - Token might be for a different environment (not app2)');
            console.log('   - Token might require specific session headers');
            console.log('   - Token might not have API access permissions');
            console.log('   - Token might be a UI-only token');
            
            console.log('\n3. What We Need:');
            console.log('   - The COMPLETE authorization header from browser');
            console.log('   - The x-v-session-id header (may be required)');
            console.log('   - The x-virtuoso-client-id header');
            
            console.log('\n4. How to Get Complete Headers:');
            console.log('   a. Open https://app2.virtuoso.qa in browser');
            console.log('   b. Open DevTools → Network tab');
            console.log('   c. Navigate to a journey or execution');
            console.log('   d. Find a SUCCESSFUL (200) API call to api-app2.virtuoso.qa');
            console.log('   e. Right-click the request → Copy → Copy as cURL');
            console.log('   f. Share the cURL command (you can redact sensitive data)');
        }
        
        // Generate report
        this.generateReport();
    }
    
    async testEndpoint(endpoint, headers) {
        return new Promise((resolve) => {
            const url = `${this.config.baseUrl}${endpoint}`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: headers,
                timeout: 5000
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', chunk => data += chunk);
                
                res.on('end', () => {
                    let error = null;
                    let responseBody = null;
                    
                    try {
                        responseBody = JSON.parse(data);
                        if (res.statusCode !== 200) {
                            error = responseBody.error?.message || responseBody.message || 'Unknown error';
                        }
                    } catch (e) {
                        if (res.statusCode !== 200) {
                            error = data.substring(0, 200);
                        }
                    }
                    
                    resolve({
                        status: res.statusCode,
                        size: data.length,
                        error: error,
                        body: responseBody
                    });
                });
            });
            
            req.on('error', (err) => {
                resolve({
                    status: 0,
                    size: 0,
                    error: err.message,
                    body: null
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    status: 0,
                    size: 0,
                    error: 'Request timeout (5s)',
                    body: null
                });
            });
            
            req.end();
        });
    }
    
    validateTokenFormat(token) {
        // Check if it's a valid UUID v4 format
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidV4Regex.test(token)) {
            return 'Valid UUID v4 format ✅';
        }
        
        // Check if it's base64
        if (/^[A-Za-z0-9+/]+=*$/.test(token)) {
            return 'Base64 format';
        }
        
        // Check if it's hex
        if (/^[0-9a-f]+$/i.test(token)) {
            return 'Hexadecimal format';
        }
        
        return 'Custom format';
    }
    
    saveWorkingConfig(combination) {
        const fs = require('fs');
        const config = {
            token: this.config.newToken,
            headers: combination.headers,
            timestamp: new Date().toISOString(),
            results: this.results
        };
        
        fs.writeFileSync('WORKING-CREDENTIALS.json', JSON.stringify(config, null, 2));
        console.log('\n✅ Working configuration saved to WORKING-CREDENTIALS.json');
    }
    
    generateReport() {
        const fs = require('fs');
        const report = {
            timestamp: new Date().toISOString(),
            token: this.config.newToken,
            tokenAnalysis: {
                length: this.config.newToken.length,
                format: this.validateTokenFormat(this.config.newToken),
                pattern: 'UUID v4'
            },
            results: this.results,
            conclusion: this.results.some(r => r.success) ? 'TOKEN_WORKS' : 'TOKEN_FAILED'
        };
        
        fs.writeFileSync('NEW-TOKEN-TEST-REPORT.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Full report saved to NEW-TOKEN-TEST-REPORT.json');
    }
}

// Run tests
const tester = new NewTokenTester();
tester.runTests().catch(console.error);