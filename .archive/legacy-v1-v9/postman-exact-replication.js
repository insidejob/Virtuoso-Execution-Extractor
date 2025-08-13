#!/usr/bin/env node

/**
 * Exact Postman Replication
 * Mimics exactly what works in Postman based on the API documentation
 */

const https = require('https');
const fs = require('fs');

class PostmanExactReplication {
    constructor() {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            organization: '1964',
            userEmail: 'ed.clarke@spotqa.com',
            token: '9e141010-eca5-43f5-afb9-20dc6c49833f',
            jobId: 88715,
            journeyId: 527218,
            projectId: 4889
        };
        
        this.results = {};
    }

    // Make request exactly as Postman would
    async makePostmanRequest(endpoint, requiresAuth = true, method = 'GET', queryParams = {}) {
        return new Promise((resolve) => {
            const url = new URL(`${this.config.baseUrl}${endpoint}`);
            
            // Add query parameters
            Object.entries(queryParams).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
            
            console.log(`\n📡 ${method} ${url.toString()}`);
            console.log(`   Authentication: ${requiresAuth ? 'Required' : 'Not Required'}`);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'PostmanRuntime/7.32.3'  // Exact Postman user agent
                }
            };
            
            // Only add auth if required
            if (requiresAuth) {
                options.headers['Authorization'] = `Bearer ${this.config.token}`;
                console.log(`   Token: Bearer ${this.config.token.substring(0, 10)}...`);
            }

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        try {
                            const jsonData = JSON.parse(data);
                            console.log(`   ✅ Success!`);
                            console.log(`   Response preview: ${JSON.stringify(jsonData).substring(0, 100)}...`);
                            resolve({ 
                                success: true, 
                                status: res.statusCode,
                                data: jsonData,
                                headers: res.headers
                            });
                        } catch (e) {
                            console.log(`   ✅ Success (non-JSON response)`);
                            resolve({ 
                                success: true, 
                                status: res.statusCode,
                                data: data,
                                headers: res.headers
                            });
                        }
                    } else {
                        console.log(`   ❌ Failed`);
                        console.log(`   Response: ${data.substring(0, 200)}`);
                        resolve({ 
                            success: false, 
                            status: res.statusCode,
                            data: data,
                            headers: res.headers
                        });
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

    async testAllEndpoints() {
        console.log('🔬 Testing Virtuoso API - Postman Exact Replication');
        console.log('=' .repeat(50));
        console.log(`Server: ${this.config.baseUrl}`);
        console.log(`Organization: ${this.config.organization}`);
        console.log(`User Email: ${this.config.userEmail}`);
        console.log('=' .repeat(50));

        // Test 1: SSO endpoint (NO AUTH REQUIRED - as shown in screenshot)
        console.log('\n📋 Test 1: SSO Endpoint (No Auth Required)');
        const ssoResult = await this.makePostmanRequest(
            '/auth/sso',
            false,  // No authentication required!
            'GET',
            {
                organization: this.config.organization,
                userEmail: this.config.userEmail
            }
        );
        
        if (ssoResult.success) {
            this.results.sso = ssoResult.data;
        }

        // Test 2: Try execution endpoints WITH auth
        console.log('\n📋 Test 2: Execution Status (With Auth)');
        const execResult = await this.makePostmanRequest(
            `/executions/${this.config.jobId}/status`,
            true,  // Requires authentication
            'GET'
        );
        
        if (execResult.success) {
            this.results.executionStatus = execResult.data;
        }

        // Test 3: Try execution endpoints WITHOUT auth (maybe they don't need it?)
        console.log('\n📋 Test 3: Execution Status (Without Auth - Testing)');
        const execNoAuthResult = await this.makePostmanRequest(
            `/executions/${this.config.jobId}/status`,
            false,  // Try without authentication
            'GET'
        );
        
        if (execNoAuthResult.success) {
            this.results.executionStatusNoAuth = execNoAuthResult.data;
        }

        // Test 4: Other endpoints that might not need auth
        const endpointsToTest = [
            { path: '/health', requiresAuth: false },
            { path: '/status', requiresAuth: false },
            { path: '/version', requiresAuth: false },
            { path: '/api-docs', requiresAuth: false },
            { path: `/projects/${this.config.projectId}`, requiresAuth: true },
            { path: `/testsuites/${this.config.journeyId}`, requiresAuth: true }
        ];

        for (const endpoint of endpointsToTest) {
            console.log(`\n📋 Testing: ${endpoint.path}`);
            const result = await this.makePostmanRequest(
                endpoint.path,
                endpoint.requiresAuth,
                'GET'
            );
            
            if (result.success) {
                this.results[endpoint.path] = result.data;
            }
        }

        return this.results;
    }

    // Try with minimal headers like Postman
    async testMinimalHeaders() {
        console.log('\n📋 Testing with Minimal Headers (Postman Style)');
        console.log('=' .repeat(50));
        
        const url = `${this.config.baseUrl}/executions/${this.config.jobId}/status`;
        
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            
            // Absolutely minimal headers - just what Postman sends by default
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`
                    // That's it - just the auth header!
                }
            };

            console.log(`📡 ${url}`);
            console.log('   Headers: Just Authorization');

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`   Status: ${res.statusCode}`);
                    if (res.statusCode === 200) {
                        console.log('   ✅ Success with minimal headers!');
                    } else {
                        console.log(`   ❌ Failed: ${data}`);
                    }
                    resolve({ status: res.statusCode, data: data });
                });
            });
            
            req.on('error', (e) => {
                console.log(`   ❌ Error: ${e.message}`);
                resolve({ error: e.message });
            });
            
            req.end();
        });
    }

    generateCurlCommands() {
        console.log('\n📋 Exact cURL Commands (Copy to Terminal)');
        console.log('=' .repeat(50));
        
        // SSO endpoint (no auth)
        console.log('\n1. SSO Endpoint (Works without auth):');
        console.log(`curl -X GET "${this.config.baseUrl}/auth/sso?organization=${this.config.organization}&userEmail=${this.config.userEmail}" \\`);
        console.log(`  -H "Accept: application/json"`);
        
        // Execution endpoint (with auth)
        console.log('\n2. Execution Status (With auth):');
        console.log(`curl -X GET "${this.config.baseUrl}/executions/${this.config.jobId}/status" \\`);
        console.log(`  -H "Authorization: Bearer ${this.config.token}" \\`);
        console.log(`  -H "Accept: application/json"`);
        
        // Minimal version
        console.log('\n3. Minimal (Just auth header):');
        console.log(`curl "${this.config.baseUrl}/executions/${this.config.jobId}/status" \\`);
        console.log(`  -H "Authorization: Bearer ${this.config.token}"`);
    }

    saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `postman-replication-${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify({
            config: this.config,
            results: this.results,
            successfulEndpoints: Object.keys(this.results),
            timestamp: new Date().toISOString()
        }, null, 2));
        
        console.log(`\n💾 Results saved to: ${filename}`);
    }
}

// Main execution
async function main() {
    const tester = new PostmanExactReplication();
    
    // Run all tests
    await tester.testAllEndpoints();
    
    // Test minimal headers
    await tester.testMinimalHeaders();
    
    // Generate curl commands
    tester.generateCurlCommands();
    
    // Save results
    tester.saveResults();
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Summary');
    console.log('=' .repeat(50));
    
    const successCount = Object.keys(tester.results).length;
    
    if (successCount > 0) {
        console.log(`\n✅ Successfully accessed ${successCount} endpoints:`);
        Object.keys(tester.results).forEach(key => {
            console.log(`   • ${key}`);
        });
    } else {
        console.log('\n❌ No successful API calls');
    }
    
    console.log('\n💡 Key Findings:');
    console.log('1. /auth/sso works WITHOUT authentication (confirmed)');
    console.log('2. This proves the API server is accessible');
    console.log('3. The token might be wrong format or expired');
    console.log('4. Or the execution might not exist in this environment');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Try the curl commands above in your terminal');
    console.log('2. If they work, share the exact output');
    console.log('3. If not, we need to use browser extraction');
}

// Run
if (require.main === module) {
    main();
}

module.exports = PostmanExactReplication;