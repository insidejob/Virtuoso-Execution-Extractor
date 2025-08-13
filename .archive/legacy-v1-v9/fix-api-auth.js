#!/usr/bin/env node

/**
 * Fix API Authentication - Try all possible methods
 * Based on official Virtuoso API documentation
 */

const https = require('https');
const fs = require('fs');

// Configuration
const CONFIG = {
    jobId: 88715,
    suiteId: 527218,  // Journey ID might be Suite ID
    projectId: 4889,
    orgId: 1964,
    token: '9e141010-eca5-43f5-afb9-20dc6c49833f'
};

class VirtuosoAPIAuthFixer {
    constructor() {
        this.results = [];
        this.workingCombinations = [];
    }

    async testEndpoint(baseUrl, path, authMethod, authValue) {
        const url = `${baseUrl}${path}`;
        
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Virtuoso-API-Tester/2.0'
            };
            
            // Add authentication based on method
            switch(authMethod) {
                case 'Bearer':
                    headers['Authorization'] = `Bearer ${authValue}`;
                    break;
                case 'Token':
                    headers['Authorization'] = `Token ${authValue}`;
                    break;
                case 'ApiKey':
                    headers['Authorization'] = authValue;
                    break;
                case 'X-API-Key':
                    headers['X-API-Key'] = authValue;
                    break;
                case 'X-Auth-Token':
                    headers['X-Auth-Token'] = authValue;
                    break;
                case 'X-Access-Token':
                    headers['X-Access-Token'] = authValue;
                    break;
                case 'Cookie':
                    headers['Cookie'] = `auth_token=${authValue}`;
                    break;
                case 'api_key_query':
                    // Add to URL as query parameter
                    urlObj.searchParams.append('api_key', authValue);
                    break;
                case 'token_query':
                    urlObj.searchParams.append('token', authValue);
                    break;
                case 'auth_query':
                    urlObj.searchParams.append('auth', authValue);
                    break;
            }
            
            // Add org ID in various ways
            headers['X-Organization-Id'] = CONFIG.orgId;
            headers['X-Org-Id'] = CONFIG.orgId;
            headers['Organization-Id'] = CONFIG.orgId;
            
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
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const isJson = data.startsWith('{') || data.startsWith('[');
                    const hasHtml = data.includes('<html') || data.includes('<!DOCTYPE');
                    
                    const result = {
                        baseUrl: baseUrl,
                        path: path,
                        authMethod: authMethod,
                        status: res.statusCode,
                        isJson: isJson,
                        isHtml: hasHtml,
                        contentType: res.headers['content-type'],
                        sample: data.substring(0, 100)
                    };
                    
                    // Check if this is a successful API response
                    if (res.statusCode === 200 && isJson && !hasHtml) {
                        result.success = true;
                        result.data = JSON.parse(data);
                        this.workingCombinations.push(result);
                    }
                    
                    resolve(result);
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    baseUrl: baseUrl,
                    path: path,
                    authMethod: authMethod,
                    status: 'ERROR',
                    error: error.message
                });
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                resolve({
                    baseUrl: baseUrl,
                    path: path,
                    authMethod: authMethod,
                    status: 'TIMEOUT'
                });
            });
            
            req.end();
        });
    }

    async runComprehensiveTest() {
        console.log('🔐 Comprehensive API Authentication Test');
        console.log('=' .repeat(50));
        console.log(`Job ID: ${CONFIG.jobId}`);
        console.log(`Token: ${CONFIG.token.substring(0, 8)}...`);
        console.log('=' .repeat(50));
        
        // All possible base URLs
        const baseUrls = [
            'https://api.virtuoso.qa',
            'https://api.virtuoso.qa/api',
            'https://api.virtuoso.qa/v1',
            'https://api.virtuoso.qa/v2',
            'https://api-app2.virtuoso.qa',
            'https://api-app2.virtuoso.qa/api',
            'https://app2.virtuoso.qa/api',
            'https://app2.virtuoso.qa/rest',
            'https://app2-api.virtuoso.qa',
            'https://virtuoso.qa/api',
            'https://api.app2.virtuoso.qa'
        ];
        
        // Test paths from documentation
        const testPaths = [
            `/executions/${CONFIG.jobId}/status`,
            `/executions/${CONFIG.jobId}`,
            `/executions/analysis/${CONFIG.jobId}`,
            `/testsuites/${CONFIG.suiteId}`,
            `/projects/${CONFIG.projectId}/testsuites/${CONFIG.suiteId}`,
            `/journeys/${CONFIG.suiteId}`
        ];
        
        // Authentication methods to test
        const authMethods = [
            'Bearer',
            'Token',
            'ApiKey',
            'X-API-Key',
            'X-Auth-Token',
            'X-Access-Token',
            'Cookie',
            'api_key_query',
            'token_query',
            'auth_query'
        ];
        
        let testCount = 0;
        const totalTests = baseUrls.length * testPaths.length * authMethods.length;
        
        console.log(`\n🧪 Running ${totalTests} authentication tests...\n`);
        
        for (const baseUrl of baseUrls) {
            for (const path of testPaths) {
                for (const authMethod of authMethods) {
                    testCount++;
                    
                    // Progress indicator
                    if (testCount % 50 === 0) {
                        console.log(`Progress: ${testCount}/${totalTests} (${Math.round(testCount/totalTests*100)}%)`);
                    }
                    
                    const result = await this.testEndpoint(baseUrl, path, authMethod, CONFIG.token);
                    this.results.push(result);
                    
                    // If we found a working combination, log it immediately
                    if (result.success) {
                        console.log(`\n✅ FOUND WORKING API!`);
                        console.log(`   Base URL: ${result.baseUrl}`);
                        console.log(`   Path: ${result.path}`);
                        console.log(`   Auth Method: ${result.authMethod}`);
                        console.log(`   Response: ${JSON.stringify(result.data).substring(0, 100)}...\n`);
                    }
                }
            }
        }
        
        return this.results;
    }

    generateReport() {
        console.log('\n' + '=' .repeat(50));
        console.log('📊 Authentication Test Report');
        console.log('=' .repeat(50));
        
        console.log(`\nTotal tests run: ${this.results.length}`);
        
        // Analyze results
        const byStatus = {};
        this.results.forEach(r => {
            const status = r.status || 'UNKNOWN';
            byStatus[status] = (byStatus[status] || 0) + 1;
        });
        
        console.log('\nResults by status:');
        Object.entries(byStatus).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
        });
        
        // Working combinations
        if (this.workingCombinations.length > 0) {
            console.log('\n✅ WORKING API COMBINATIONS FOUND:');
            console.log('=' .repeat(50));
            
            this.workingCombinations.forEach((combo, index) => {
                console.log(`\n${index + 1}. ${combo.baseUrl}${combo.path}`);
                console.log(`   Auth: ${combo.authMethod}`);
                console.log(`   Content-Type: ${combo.contentType}`);
                console.log(`   Response preview: ${JSON.stringify(combo.data).substring(0, 200)}...`);
            });
            
            // Save working config
            const workingConfig = {
                baseUrl: this.workingCombinations[0].baseUrl,
                authMethod: this.workingCombinations[0].authMethod,
                token: CONFIG.token,
                example: this.workingCombinations[0]
            };
            
            fs.writeFileSync('working-api-config.json', JSON.stringify(workingConfig, null, 2));
            console.log('\n💾 Working configuration saved to: working-api-config.json');
            
            // Generate ready-to-use curl command
            const combo = this.workingCombinations[0];
            let curlCommand = `curl -X GET "${combo.baseUrl}${combo.path}"`;
            
            if (combo.authMethod === 'Bearer') {
                curlCommand += ` -H "Authorization: Bearer ${CONFIG.token}"`;
            } else if (combo.authMethod === 'X-API-Key') {
                curlCommand += ` -H "X-API-Key: ${CONFIG.token}"`;
            } else if (combo.authMethod === 'X-Auth-Token') {
                curlCommand += ` -H "X-Auth-Token: ${CONFIG.token}"`;
            }
            
            curlCommand += ` -H "Accept: application/json"`;
            curlCommand += ` -H "X-Organization-Id: ${CONFIG.orgId}"`;
            
            console.log('\n📋 Ready-to-use curl command:');
            console.log(curlCommand);
            
        } else {
            console.log('\n❌ No working API combinations found');
            
            // Check for specific issues
            const auth401 = this.results.filter(r => r.status === 401).length;
            const auth403 = this.results.filter(r => r.status === 403).length;
            const htmlResponses = this.results.filter(r => r.isHtml).length;
            
            console.log('\n🔍 Analysis:');
            if (auth401 > 0) {
                console.log(`   • ${auth401} requests returned 401 Unauthorized`);
                console.log('     → Token is not valid for API access');
            }
            if (auth403 > 0) {
                console.log(`   • ${auth403} requests returned 403 Forbidden`);
                console.log('     → Token lacks permissions');
            }
            if (htmlResponses > 0) {
                console.log(`   • ${htmlResponses} requests returned HTML`);
                console.log('     → These endpoints redirect to UI');
            }
            
            console.log('\n💡 Conclusion:');
            console.log('   The provided token appears to be UI-only.');
            console.log('   To get a proper API token:');
            console.log('   1. Log into Virtuoso platform');
            console.log('   2. Go to Settings or API section');
            console.log('   3. Generate an API token (not a session token)');
            console.log('   4. Update the token in CONFIG');
            console.log('\n   For now, use browser extraction:');
            console.log('   node terminal-browser-extractor.js');
        }
        
        // Save all results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `api-auth-test-comprehensive-${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify({
            summary: {
                totalTests: this.results.length,
                workingCombinations: this.workingCombinations.length,
                statusBreakdown: byStatus
            },
            workingCombinations: this.workingCombinations,
            allResults: this.results
        }, null, 2));
        
        console.log(`\n💾 Full results saved to: ${filename}`);
    }
}

// Main execution
async function main() {
    const tester = new VirtuosoAPIAuthFixer();
    
    try {
        await tester.runComprehensiveTest();
        tester.generateReport();
        
        if (tester.workingCombinations.length > 0) {
            console.log('\n✨ Success! API access configured.');
            console.log('Run the official extractor with the working config:');
            console.log('   node official-api-extractor.js');
        }
        
    } catch (error) {
        console.error('\n❌ Error during testing:', error);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = VirtuosoAPIAuthFixer;