#!/usr/bin/env node

/**
 * Exact Replication of API Documentation Interface
 * Mimics exactly what the Swagger/OpenAPI interface does
 */

const https = require('https');
const fs = require('fs');

// EXACT configuration from API docs
const CONFIG = {
    baseUrl: 'https://api-app2.virtuoso.qa/api',  // Exactly as shown
    token: '9e141010-eca5-43f5-afb9-20dc6c49833f',
    jobId: 88715,
    executionDetailId: 88715,  // Sometimes same as jobId
    suiteId: 527218,
    projectId: 4889,
    orgId: 1964
};

class ExactAPIReplication {
    constructor() {
        this.cookies = [];
        this.results = {};
    }

    async makeAPICall(endpoint, description) {
        const url = `${CONFIG.baseUrl}${endpoint}`;
        
        return new Promise((resolve, reject) => {
            console.log(`\n📡 ${description}`);
            console.log(`   URL: ${url}`);
            console.log(`   Method: GET`);
            console.log(`   Auth: Bearer ${CONFIG.token.substring(0, 8)}...`);
            
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'GET',
                headers: {
                    // EXACT headers that API documentation would send
                    'Authorization': `Bearer ${CONFIG.token}`,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/json',
                    'Origin': 'https://api-app2.virtuoso.qa',
                    'Referer': 'https://api-app2.virtuoso.qa/api-docs',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                rejectUnauthorized: false  // In case of cert issues
            };

            // Add cookies if we have any
            if (this.cookies.length > 0) {
                options.headers['Cookie'] = this.cookies.join('; ');
            }

            const req = https.request(options, (res) => {
                let data = '';
                let chunks = [];
                
                // Handle compressed responses
                const encoding = res.headers['content-encoding'];
                
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                    data += chunk;
                });
                
                res.on('end', () => {
                    // Capture cookies
                    if (res.headers['set-cookie']) {
                        this.cookies = res.headers['set-cookie'].map(cookie => {
                            return cookie.split(';')[0];
                        });
                        console.log(`   🍪 Cookies captured: ${this.cookies.length}`);
                    }
                    
                    // Handle compressed data if needed
                    if (encoding === 'gzip' || encoding === 'br' || encoding === 'deflate') {
                        const zlib = require('zlib');
                        const buffer = Buffer.concat(chunks);
                        
                        try {
                            if (encoding === 'gzip') {
                                data = zlib.gunzipSync(buffer).toString();
                            } else if (encoding === 'br') {
                                data = zlib.brotliDecompressSync(buffer).toString();
                            } else if (encoding === 'deflate') {
                                data = zlib.inflateSync(buffer).toString();
                            }
                        } catch (e) {
                            console.log(`   ⚠️  Decompression failed, using raw data`);
                        }
                    }
                    
                    console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
                    console.log(`   Content-Type: ${res.headers['content-type']}`);
                    
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        try {
                            const jsonData = JSON.parse(data);
                            console.log(`   ✅ Success! Got JSON response`);
                            console.log(`   Data preview: ${JSON.stringify(jsonData).substring(0, 100)}...`);
                            resolve({ success: true, data: jsonData, headers: res.headers });
                        } catch (e) {
                            console.log(`   ⚠️  Got response but not JSON`);
                            console.log(`   Response: ${data.substring(0, 100)}...`);
                            resolve({ success: false, data: data, headers: res.headers });
                        }
                    } else if (res.statusCode === 401) {
                        console.log(`   🔐 Authentication failed`);
                        console.log(`   Response: ${data}`);
                        resolve({ success: false, status: 401, data: data });
                    } else if (res.statusCode === 404) {
                        console.log(`   ❌ Not found`);
                        resolve({ success: false, status: 404, data: data });
                    } else {
                        console.log(`   ⚠️  Unexpected status`);
                        console.log(`   Response: ${data.substring(0, 200)}...`);
                        resolve({ success: false, status: res.statusCode, data: data });
                    }
                });
            });
            
            req.on('error', (error) => {
                console.log(`   ❌ Request error: ${error.message}`);
                reject(error);
            });
            
            req.setTimeout(30000, () => {
                req.destroy();
                console.log(`   ⏱️  Request timeout`);
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
    }

    async testAllEndpoints() {
        console.log('🔬 Testing Virtuoso API - Exact Replication');
        console.log('=' .repeat(50));
        console.log(`Server: ${CONFIG.baseUrl}`);
        console.log(`Token: Bearer ${CONFIG.token.substring(0, 8)}...`);
        console.log('=' .repeat(50));

        // Test endpoints from the API documentation
        const endpoints = [
            // From the documentation image
            {
                path: `/executions/${CONFIG.jobId}/status`,
                description: 'Execution Status'
            },
            {
                path: `/executions/analysis/${CONFIG.executionDetailId}`,
                description: 'Execution Analysis'
            },
            {
                path: `/executions/${CONFIG.jobId}`,
                description: 'Execution Details (deprecated)'
            },
            {
                path: `/executions/${CONFIG.jobId}/failures/rerun`,
                description: 'Re-execute failed journeys',
                method: 'POST'
            },
            // Try with suite/case structure
            {
                path: `/executions/${CONFIG.jobId}/suites/${CONFIG.suiteId}/cases`,
                description: 'Suite Cases'
            },
            {
                path: `/executions/${CONFIG.jobId}/suites/${CONFIG.suiteId}/cases/1/steps`,
                description: 'Case Steps'
            },
            // Alternative patterns
            {
                path: `/testsuites/${CONFIG.suiteId}`,
                description: 'TestSuite (Journey)'
            },
            {
                path: `/projects/${CONFIG.projectId}/testsuites/${CONFIG.suiteId}`,
                description: 'Project TestSuite'
            },
            {
                path: `/projects/${CONFIG.projectId}/executions/${CONFIG.jobId}`,
                description: 'Project Execution'
            }
        ];

        for (const endpoint of endpoints) {
            try {
                const result = await this.makeAPICall(endpoint.path, endpoint.description);
                
                if (result.success) {
                    this.results[endpoint.description] = result.data;
                    
                    // If we got suite data, try to get more details
                    if (result.data.suites) {
                        console.log(`\n   📦 Found ${result.data.suites.length} suites, fetching details...`);
                        for (const suite of result.data.suites) {
                            if (suite.id || suite.suiteId) {
                                const suiteId = suite.id || suite.suiteId;
                                await this.makeAPICall(
                                    `/executions/${CONFIG.jobId}/suites/${suiteId}/cases`,
                                    `Cases for suite ${suiteId}`
                                );
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(`   Error: ${error.message}`);
            }
        }

        return this.results;
    }

    async tryWithDifferentAuth() {
        console.log('\n🔐 Trying different authentication formats...\n');

        // Try with just the token (no "Bearer" prefix)
        const directTokenTest = await this.makeDirectTokenCall();
        
        // Try with API key header
        const apiKeyTest = await this.makeAPIKeyCall();
        
        // Try with session cookie
        const sessionTest = await this.makeSessionCall();
        
        return { directTokenTest, apiKeyTest, sessionTest };
    }

    async makeDirectTokenCall() {
        const url = `${CONFIG.baseUrl}/executions/${CONFIG.jobId}/status`;
        
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'GET',
                headers: {
                    'Authorization': CONFIG.token,  // Without "Bearer"
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    console.log(`   Direct token test: ${res.statusCode}`);
                    resolve({ status: res.statusCode, data: data });
                });
            });
            
            req.on('error', (e) => resolve({ error: e.message }));
            req.end();
        });
    }

    async makeAPIKeyCall() {
        const url = `${CONFIG.baseUrl}/executions/${CONFIG.jobId}/status`;
        
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'GET',
                headers: {
                    'X-API-Key': CONFIG.token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    console.log(`   API Key test: ${res.statusCode}`);
                    resolve({ status: res.statusCode, data: data });
                });
            });
            
            req.on('error', (e) => resolve({ error: e.message }));
            req.end();
        });
    }

    async makeSessionCall() {
        const url = `${CONFIG.baseUrl}/executions/${CONFIG.jobId}/status`;
        
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'GET',
                headers: {
                    'Cookie': `session_token=${CONFIG.token}; auth_token=${CONFIG.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    console.log(`   Session cookie test: ${res.statusCode}`);
                    resolve({ status: res.statusCode, data: data });
                });
            });
            
            req.on('error', (e) => resolve({ error: e.message }));
            req.end();
        });
    }

    saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `exact-api-results-${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify({
            config: CONFIG,
            results: this.results,
            timestamp: new Date().toISOString()
        }, null, 2));
        
        console.log(`\n💾 Results saved to: ${filename}`);
        
        // If we have successful data, create structured version
        if (Object.keys(this.results).length > 0) {
            const structured = {
                executionId: CONFIG.jobId,
                journeyId: CONFIG.suiteId,
                data: this.results
            };
            
            const structuredFile = `structured-${timestamp}.json`;
            fs.writeFileSync(structuredFile, JSON.stringify(structured, null, 2));
            console.log(`💾 Structured data saved to: ${structuredFile}`);
        }
    }
}

// Main execution
async function main() {
    const api = new ExactAPIReplication();
    
    try {
        // Test all endpoints
        await api.testAllEndpoints();
        
        // If no success, try different auth methods
        if (Object.keys(api.results).length === 0) {
            console.log('\n⚠️  Standard Bearer auth didn\'t work, trying alternatives...');
            await api.tryWithDifferentAuth();
        }
        
        // Save results
        api.saveResults();
        
        // Report
        console.log('\n' + '=' .repeat(50));
        console.log('📊 Summary');
        console.log('=' .repeat(50));
        
        if (Object.keys(api.results).length > 0) {
            console.log(`\n✅ Successfully retrieved data from ${Object.keys(api.results).length} endpoints`);
            for (const [key, value] of Object.entries(api.results)) {
                console.log(`   • ${key}: ${JSON.stringify(value).length} bytes`);
            }
            
            console.log('\n🎯 Next: Run NLP converter on the structured data');
        } else {
            console.log('\n❌ Could not retrieve data from API');
            console.log('\n💡 Possible issues:');
            console.log('   1. Token may need to be refreshed');
            console.log('   2. API documentation interface may have session cookies');
            console.log('   3. The execution may not exist in this environment');
            console.log('\n🔧 Try:');
            console.log('   1. Copy a fresh token from the API docs after testing');
            console.log('   2. Check browser DevTools Network tab when using API docs');
            console.log('   3. Use browser extraction as fallback');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error);
    }
}

// Run
if (require.main === module) {
    main();
}

module.exports = ExactAPIReplication;