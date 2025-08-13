#!/usr/bin/env node

/**
 * API Health Check - Test ALL API endpoints and authentication
 * This will identify exactly which APIs are accessible and which are failing
 */

const https = require('https');

class APIHealthCheck {
    constructor() {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
            sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
            clientId: '1754647483711_e9e9c12_production'
        };
        
        this.results = {
            timestamp: new Date().toISOString(),
            authentication: {},
            endpoints: {},
            summary: {
                total: 0,
                successful: 0,
                failed: 0,
                errors: []
            }
        };
    }
    
    async runHealthCheck() {
        console.log('🏥 Virtuoso API Health Check\n');
        console.log('=' .repeat(70));
        console.log(`Timestamp: ${this.results.timestamp}`);
        console.log(`Base URL: ${this.config.baseUrl}`);
        console.log(`Token: ${this.config.token.substring(0, 20)}...`);
        console.log(`Session: ${this.config.sessionId.substring(0, 20)}...`);
        console.log('=' .repeat(70));
        
        // Test different header combinations
        const headerSets = [
            {
                name: 'Full Headers (with session)',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'authorization': `Bearer ${this.config.token}`,
                    'origin': 'https://app2.virtuoso.qa',
                    'referer': 'https://app2.virtuoso.qa/',
                    'x-v-session-id': this.config.sessionId,
                    'x-virtuoso-client-id': this.config.clientId,
                    'x-virtuoso-client-name': 'Virtuoso UI'
                }
            },
            {
                name: 'Bearer Token Only',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${this.config.token}`
                }
            },
            {
                name: 'No Authentication',
                headers: {
                    'accept': 'application/json'
                }
            }
        ];
        
        // Test critical endpoints
        const endpoints = [
            { path: '/testsuites/527211?envelope=false', name: 'Journey/TestSuite 527211' },
            { path: '/testsuites/527218?envelope=false', name: 'Journey/TestSuite 527218' },
            { path: '/executions/88715', name: 'Execution 88715' },
            { path: '/executions/88715/status', name: 'Execution Status' },
            { path: '/projects/4889/environments', name: 'Project Environments' },
            { path: '/projects/4889', name: 'Project Details' },
            { path: '/executions/88715/journeyExecutions/527211/testsuiteExecutions', name: 'Screenshots (suspected)' },
            { path: '/executions/88715/screenshots', name: 'Screenshots (alternative)' }
        ];
        
        // Test each header set with first endpoint
        console.log('\n📡 AUTHENTICATION TEST\n');
        for (const headerSet of headerSets) {
            console.log(`\nTesting: ${headerSet.name}`);
            console.log('-' .repeat(40));
            const result = await this.testEndpoint(endpoints[0].path, headerSet.headers);
            this.results.authentication[headerSet.name] = {
                status: result.status,
                success: result.status === 200,
                error: result.error
            };
            
            if (result.status === 200) {
                console.log(`✅ SUCCESS - This authentication method works!`);
                // Use this header set for remaining tests
                await this.testAllEndpoints(endpoints, headerSet.headers);
                break;
            } else {
                console.log(`❌ FAILED - Status: ${result.status}`);
                if (result.error) {
                    console.log(`   Error: ${result.error}`);
                }
            }
        }
        
        // If no auth method worked, test all endpoints anyway with full headers
        if (!Object.values(this.results.authentication).some(a => a.success)) {
            console.log('\n⚠️  No authentication method succeeded. Testing all endpoints anyway...\n');
            await this.testAllEndpoints(endpoints, headerSets[0].headers);
        }
        
        // Generate summary
        this.generateSummary();
        
        // Save results
        const fs = require('fs');
        const reportPath = 'API-HEALTH-CHECK-REPORT.json';
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Full report saved to: ${reportPath}\n`);
        
        return this.results;
    }
    
    async testAllEndpoints(endpoints, headers) {
        console.log('\n📡 ENDPOINT TESTS\n');
        
        for (const endpoint of endpoints) {
            console.log(`Testing: ${endpoint.name}`);
            console.log(`Path: ${endpoint.path}`);
            
            const result = await this.testEndpoint(endpoint.path, headers);
            this.results.endpoints[endpoint.name] = {
                path: endpoint.path,
                status: result.status,
                success: result.status === 200,
                error: result.error,
                responseSize: result.size
            };
            
            this.results.summary.total++;
            if (result.status === 200) {
                this.results.summary.successful++;
                console.log(`✅ SUCCESS - Status: ${result.status}, Size: ${result.size} bytes`);
            } else {
                this.results.summary.failed++;
                console.log(`❌ FAILED - Status: ${result.status}`);
                if (result.error) {
                    console.log(`   Error: ${result.error}`);
                    this.results.summary.errors.push({
                        endpoint: endpoint.name,
                        error: result.error
                    });
                }
            }
            console.log('-' .repeat(40));
        }
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
                    if (res.statusCode !== 200) {
                        try {
                            const parsed = JSON.parse(data);
                            error = parsed.error?.message || parsed.message || 'Unknown error';
                        } catch (e) {
                            error = data.substring(0, 100);
                        }
                    }
                    
                    resolve({
                        status: res.statusCode,
                        size: data.length,
                        error: error
                    });
                });
            });
            
            req.on('error', (err) => {
                resolve({
                    status: 0,
                    size: 0,
                    error: err.message
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    status: 0,
                    size: 0,
                    error: 'Request timeout (5s)'
                });
            });
            
            req.end();
        });
    }
    
    generateSummary() {
        console.log('\n' + '=' .repeat(70));
        console.log('📊 SUMMARY\n');
        
        console.log('Authentication Results:');
        Object.entries(this.results.authentication).forEach(([name, result]) => {
            console.log(`  ${result.success ? '✅' : '❌'} ${name}: ${result.status}`);
        });
        
        console.log('\nEndpoint Results:');
        console.log(`  Total Tested: ${this.results.summary.total}`);
        console.log(`  ✅ Successful: ${this.results.summary.successful}`);
        console.log(`  ❌ Failed: ${this.results.summary.failed}`);
        
        if (this.results.summary.successful > 0) {
            console.log('\nWorking Endpoints:');
            Object.entries(this.results.endpoints).forEach(([name, result]) => {
                if (result.success) {
                    console.log(`  ✅ ${name}`);
                }
            });
        }
        
        if (this.results.summary.failed > 0) {
            console.log('\nFailed Endpoints:');
            Object.entries(this.results.endpoints).forEach(([name, result]) => {
                if (!result.success) {
                    console.log(`  ❌ ${name} (${result.status}): ${result.error}`);
                }
            });
        }
        
        console.log('\n' + '=' .repeat(70));
        
        // Critical issues
        console.log('\n🚨 CRITICAL ISSUES:\n');
        
        if (this.results.summary.successful === 0) {
            console.log('❌ BLOCKING: No API endpoints are accessible!');
            console.log('   - Token may be expired');
            console.log('   - Session may be expired');
            console.log('   - Credentials need to be refreshed from browser\n');
        }
        
        const screenshotEndpoints = Object.entries(this.results.endpoints)
            .filter(([name]) => name.includes('Screenshots'));
        const screenshotWorking = screenshotEndpoints.some(([_, result]) => result.success);
        
        if (!screenshotWorking) {
            console.log('⚠️  WARNING: Screenshot API endpoints not working');
            console.log('   - Need to discover correct endpoint from browser network traffic\n');
        }
        
        console.log('🔧 REQUIRED ACTIONS:\n');
        if (this.results.summary.successful === 0) {
            console.log('1. Get fresh credentials from browser:');
            console.log('   - Open https://app2.virtuoso.qa in browser');
            console.log('   - Login and navigate to a journey');
            console.log('   - Open DevTools > Network tab');
            console.log('   - Find an API call to api-app2.virtuoso.qa');
            console.log('   - Copy the authorization Bearer token');
            console.log('   - Copy x-v-session-id header');
            console.log('   - Copy x-virtuoso-client-id header');
            console.log('');
            console.log('2. Update credentials in wrapper:');
            console.log('   export VIRTUOSO_TOKEN="new-token-here"');
            console.log('   export VIRTUOSO_SESSION="new-session-here"');
            console.log('   export VIRTUOSO_CLIENT="new-client-here"');
        }
        
        if (!screenshotWorking) {
            console.log('3. Discover screenshot API endpoint:');
            console.log('   - In browser, navigate to an execution with screenshots');
            console.log('   - Open Network tab and filter for image requests');
            console.log('   - Find the API endpoint that returns screenshot data');
        }
    }
}

// Run health check
if (require.main === module) {
    const checker = new APIHealthCheck();
    checker.runHealthCheck().then(results => {
        if (results.summary.successful === 0) {
            process.exit(1);
        }
    });
}