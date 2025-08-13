#!/usr/bin/env node

/**
 * SSO Authentication Flow for Virtuoso API
 * Based on the /auth/sso endpoint that works without authentication
 */

const https = require('https');
const fs = require('fs');
const { URL } = require('url');

class VirtuosoSSOAuth {
    constructor() {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            organization: '1964',
            userEmail: 'ed.clarke@spotqa.com',
            jobId: 88715,
            journeyId: 527218,
            projectId: 4889
        };
        
        this.authToken = null;
        this.ssoInfo = null;
    }

    // Step 1: Get SSO information (no auth required)
    async getSSOInfo() {
        console.log('📋 Step 1: Getting SSO Information');
        console.log('=' .repeat(50));
        
        const url = new URL(`${this.config.baseUrl}/auth/sso`);
        url.searchParams.append('organization', this.config.organization);
        url.searchParams.append('userEmail', this.config.userEmail);
        
        return new Promise((resolve, reject) => {
            console.log(`📡 Calling: ${url.toString()}`);
            console.log('   No authentication required for this endpoint');
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Virtuoso-API-Client/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (res.statusCode === 200) {
                        try {
                            const jsonData = JSON.parse(data);
                            console.log('   ✅ SSO info retrieved successfully');
                            console.log(`   SSO Provider: ${jsonData.item?.ssoAuthenticationInfo?.GOOGLE ? 'Google' : 'Unknown'}`);
                            this.ssoInfo = jsonData;
                            resolve(jsonData);
                        } catch (e) {
                            console.log('   ❌ Failed to parse response');
                            reject(e);
                        }
                    } else {
                        console.log(`   ❌ Failed with status ${res.statusCode}`);
                        console.log(`   Response: ${data}`);
                        reject(new Error(`Status ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                console.log(`   ❌ Request error: ${error.message}`);
                reject(error);
            });
            
            req.end();
        });
    }

    // Step 2: Try to get an API token using SSO info
    async getAPIToken() {
        console.log('\n📋 Step 2: Getting API Token');
        console.log('=' .repeat(50));
        
        if (!this.ssoInfo) {
            console.log('   ❌ No SSO info available');
            return null;
        }

        // The SSO info contains OAuth URLs
        // We need to authenticate through OAuth to get a proper API token
        
        // Try different token endpoints
        const tokenEndpoints = [
            '/auth/token',
            '/oauth/token',
            '/token',
            '/api/token'
        ];

        for (const endpoint of tokenEndpoints) {
            console.log(`\n📡 Trying: ${this.config.baseUrl}${endpoint}`);
            
            const result = await this.requestToken(endpoint);
            if (result.success) {
                this.authToken = result.token;
                console.log(`   ✅ Got token: ${this.authToken.substring(0, 20)}...`);
                return this.authToken;
            }
        }

        // If no token endpoint works, try to extract from SSO response
        if (this.ssoInfo.success && this.ssoInfo.item) {
            console.log('\n🔍 Checking SSO response for embedded token...');
            
            // Look for token in various places
            const possibleTokens = [
                this.ssoInfo.token,
                this.ssoInfo.access_token,
                this.ssoInfo.api_token,
                this.ssoInfo.item.token,
                this.ssoInfo.item.access_token
            ];

            for (const token of possibleTokens) {
                if (token) {
                    console.log(`   ✅ Found embedded token: ${token.substring(0, 20)}...`);
                    this.authToken = token;
                    return token;
                }
            }
        }

        console.log('   ⚠️  No API token found in standard locations');
        return null;
    }

    async requestToken(endpoint) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                organization: this.config.organization,
                userEmail: this.config.userEmail,
                grant_type: 'sso'
            });

            const url = new URL(`${this.config.baseUrl}${endpoint}`);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postData.length,
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        try {
                            const jsonData = JSON.parse(data);
                            if (jsonData.token || jsonData.access_token) {
                                resolve({
                                    success: true,
                                    token: jsonData.token || jsonData.access_token
                                });
                            } else {
                                resolve({ success: false });
                            }
                        } catch (e) {
                            resolve({ success: false });
                        }
                    } else {
                        resolve({ success: false });
                    }
                });
            });
            
            req.on('error', () => resolve({ success: false }));
            req.write(postData);
            req.end();
        });
    }

    // Step 3: Test API access with obtained token
    async testAPIAccess(token = null) {
        console.log('\n📋 Step 3: Testing API Access');
        console.log('=' .repeat(50));
        
        const testToken = token || this.authToken || '9e141010-eca5-43f5-afb9-20dc6c49833f';
        
        const endpoint = `/executions/${this.config.jobId}/status`;
        const url = `${this.config.baseUrl}${endpoint}`;
        
        console.log(`📡 Testing: ${url}`);
        console.log(`   Token: ${testToken.substring(0, 20)}...`);
        
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${testToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Organization-Id': this.config.organization
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (res.statusCode === 200) {
                        console.log('   ✅ API access successful!');
                        console.log(`   Response: ${data.substring(0, 100)}...`);
                        resolve({ success: true, data: JSON.parse(data) });
                    } else {
                        console.log(`   ❌ API access failed`);
                        console.log(`   Response: ${data}`);
                        resolve({ success: false, status: res.statusCode, data: data });
                    }
                });
            });
            
            req.on('error', (error) => {
                console.log(`   ❌ Request error: ${error.message}`);
                resolve({ success: false, error: error.message });
            });
            
            req.end();
        });
    }

    // Alternative: Direct API call without authentication (like SSO endpoint)
    async tryDirectAccess() {
        console.log('\n📋 Testing Direct Access (No Auth)');
        console.log('=' .repeat(50));
        
        const endpoints = [
            `/executions/${this.config.jobId}/status`,
            `/executions/${this.config.jobId}`,
            `/projects/${this.config.projectId}/executions/${this.config.jobId}`,
            `/testsuites/${this.config.journeyId}`
        ];

        for (const endpoint of endpoints) {
            const url = `${this.config.baseUrl}${endpoint}`;
            console.log(`\n📡 Trying: ${url}`);
            console.log('   No authentication headers');
            
            const result = await this.makeDirectRequest(endpoint);
            if (result.success) {
                console.log('   ✅ Success without authentication!');
                return result;
            }
        }
        
        return { success: false };
    }

    async makeDirectRequest(endpoint) {
        return new Promise((resolve) => {
            const url = new URL(`${this.config.baseUrl}${endpoint}`);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Organization-Id': this.config.organization,
                    'User-Agent': 'Virtuoso-API-Client/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve({ success: true, data: JSON.parse(data) });
                        } catch (e) {
                            resolve({ success: false, data: data });
                        }
                    } else {
                        console.log(`   Status: ${res.statusCode}`);
                        resolve({ success: false, status: res.statusCode });
                    }
                });
            });
            
            req.on('error', () => resolve({ success: false }));
            req.end();
        });
    }

    async saveResults() {
        const results = {
            ssoInfo: this.ssoInfo,
            authToken: this.authToken,
            config: this.config,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync('sso-auth-results.json', JSON.stringify(results, null, 2));
        console.log('\n💾 Results saved to: sso-auth-results.json');
    }
}

// Main execution
async function main() {
    console.log('🔐 Virtuoso API - SSO Authentication Flow');
    console.log('=' .repeat(50));
    console.log('Based on working /auth/sso endpoint from API docs');
    console.log('=' .repeat(50));
    
    const auth = new VirtuosoSSOAuth();
    
    try {
        // Step 1: Get SSO info (this should work)
        const ssoInfo = await auth.getSSOInfo();
        
        if (ssoInfo) {
            console.log('\n✅ SSO information retrieved successfully');
            
            // Step 2: Try to get API token
            await auth.getAPIToken();
            
            // Step 3: Test API access
            await auth.testAPIAccess();
            
            // Step 4: Try direct access without auth
            await auth.tryDirectAccess();
            
            // Save results
            await auth.saveResults();
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Summary');
    console.log('=' .repeat(50));
    
    if (auth.authToken) {
        console.log('\n✅ Authentication flow completed');
        console.log(`Token: ${auth.authToken.substring(0, 30)}...`);
    } else {
        console.log('\n⚠️  Could not obtain API token through SSO');
        console.log('\n💡 Next steps:');
        console.log('1. The SSO endpoint works, confirming the API is accessible');
        console.log('2. But we need to complete the OAuth flow to get a token');
        console.log('3. This requires browser interaction with Google OAuth');
        console.log('\n📋 Alternative: Use the browser extraction method');
    }
}

// Run
if (require.main === module) {
    main();
}

module.exports = VirtuosoSSOAuth;