#!/usr/bin/env node

/**
 * Session-based API Access
 * Tries to establish a session like the API docs interface might do
 */

const https = require('https');
const fs = require('fs');

class SessionBasedAPI {
    constructor() {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa',
            apiPath: '/api',
            token: '9e141010-eca5-43f5-afb9-20dc6c49833f',
            jobId: 88715
        };
        
        this.cookies = [];
        this.sessionToken = null;
    }

    async establishSession() {
        console.log('🔐 Attempting to establish session...\n');
        
        // Try to access the API docs page first (this might set cookies)
        await this.accessAPIDocsPage();
        
        // Try to authenticate/login
        await this.tryAuthentication();
        
        // Try to get a CSRF token
        await this.getCSRFToken();
    }

    async accessAPIDocsPage() {
        console.log('📄 Accessing API documentation page...');
        
        return new Promise((resolve) => {
            const options = {
                hostname: 'api-app2.virtuoso.qa',
                port: 443,
                path: '/api-docs',
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            };

            const req = https.request(options, (res) => {
                // Capture cookies
                if (res.headers['set-cookie']) {
                    this.cookies = [...this.cookies, ...res.headers['set-cookie'].map(c => c.split(';')[0])];
                    console.log(`   ✅ Got ${res.headers['set-cookie'].length} cookies`);
                }
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    // Look for CSRF token in HTML
                    const csrfMatch = data.match(/csrf[_-]?token["\s:]+([a-zA-Z0-9\-_]+)/i);
                    if (csrfMatch) {
                        this.csrfToken = csrfMatch[1];
                        console.log(`   ✅ Found CSRF token: ${this.csrfToken.substring(0, 8)}...`);
                    }
                    resolve();
                });
            });
            
            req.on('error', (e) => {
                console.log(`   ❌ Error: ${e.message}`);
                resolve();
            });
            
            req.end();
        });
    }

    async tryAuthentication() {
        console.log('\n🔑 Trying authentication endpoints...');
        
        // Try various auth endpoints
        const authEndpoints = [
            '/api/auth/token',
            '/api/auth/login',
            '/api/authenticate',
            '/auth/token',
            '/login'
        ];
        
        for (const endpoint of authEndpoints) {
            const result = await this.makeAuthRequest(endpoint);
            if (result.success) {
                console.log(`   ✅ Authentication successful at ${endpoint}`);
                break;
            }
        }
    }

    async makeAuthRequest(endpoint) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                token: this.config.token,
                api_key: this.config.token,
                bearer: this.config.token
            });
            
            const options = {
                hostname: 'api-app2.virtuoso.qa',
                port: 443,
                path: endpoint,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postData.length,
                    'Authorization': `Bearer ${this.config.token}`,
                    'Accept': 'application/json'
                }
            };
            
            if (this.cookies.length > 0) {
                options.headers['Cookie'] = this.cookies.join('; ');
            }

            const req = https.request(options, (res) => {
                if (res.headers['set-cookie']) {
                    this.cookies = [...this.cookies, ...res.headers['set-cookie'].map(c => c.split(';')[0])];
                }
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        resolve({ success: true, data: data });
                    } else {
                        resolve({ success: false, status: res.statusCode });
                    }
                });
            });
            
            req.on('error', () => resolve({ success: false }));
            req.write(postData);
            req.end();
        });
    }

    async getCSRFToken() {
        console.log('\n🔒 Looking for CSRF token...');
        
        // Try to get CSRF token from a meta endpoint
        const csrfEndpoints = [
            '/api/csrf',
            '/api/token',
            '/csrf-token'
        ];
        
        for (const endpoint of csrfEndpoints) {
            const result = await this.makeGetRequest(endpoint);
            if (result.data && result.data.includes('token')) {
                try {
                    const parsed = JSON.parse(result.data);
                    if (parsed.token || parsed.csrf_token || parsed.csrfToken) {
                        this.csrfToken = parsed.token || parsed.csrf_token || parsed.csrfToken;
                        console.log(`   ✅ Got CSRF token from ${endpoint}`);
                        break;
                    }
                } catch (e) {
                    // Not JSON
                }
            }
        }
    }

    async makeGetRequest(path) {
        return new Promise((resolve) => {
            const options = {
                hostname: 'api-app2.virtuoso.qa',
                port: 443,
                path: path,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            };
            
            if (this.cookies.length > 0) {
                options.headers['Cookie'] = this.cookies.join('; ');
            }

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({ status: res.statusCode, data: data });
                });
            });
            
            req.on('error', () => resolve({ status: 'error' }));
            req.end();
        });
    }

    async makeAPICall() {
        console.log('\n📡 Making API call with session context...\n');
        
        const endpoint = `/api/executions/${this.config.jobId}/status`;
        
        return new Promise((resolve) => {
            const options = {
                hostname: 'api-app2.virtuoso.qa',
                port: 443,
                path: endpoint,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Origin': 'https://api-app2.virtuoso.qa',
                    'Referer': 'https://api-app2.virtuoso.qa/api-docs'
                }
            };
            
            // Add cookies if we have them
            if (this.cookies.length > 0) {
                options.headers['Cookie'] = this.cookies.join('; ');
                console.log(`   🍪 Sending ${this.cookies.length} cookies`);
            }
            
            // Add CSRF token if we have it
            if (this.csrfToken) {
                options.headers['X-CSRF-Token'] = this.csrfToken;
                options.headers['X-XSRF-Token'] = this.csrfToken;
                console.log(`   🔒 Sending CSRF token`);
            }

            console.log(`   📍 URL: https://api-app2.virtuoso.qa${endpoint}`);
            console.log(`   🔑 Auth: Bearer ${this.config.token.substring(0, 8)}...`);

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`   📊 Status: ${res.statusCode}`);
                    console.log(`   📄 Response: ${data.substring(0, 200)}...`);
                    
                    if (res.statusCode === 200) {
                        console.log('\n✅ SUCCESS! API call worked with session context');
                        resolve({ success: true, data: JSON.parse(data) });
                    } else {
                        console.log('\n❌ Still getting authentication error');
                        resolve({ success: false, status: res.statusCode, data: data });
                    }
                });
            });
            
            req.on('error', (e) => {
                console.log(`   ❌ Error: ${e.message}`);
                resolve({ success: false, error: e.message });
            });
            
            req.end();
        });
    }
}

// Main execution
async function main() {
    console.log('🔬 Session-Based API Access Attempt');
    console.log('=' .repeat(50));
    
    const api = new SessionBasedAPI();
    
    // Try to establish session
    await api.establishSession();
    
    // Make API call
    const result = await api.makeAPICall();
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Summary');
    console.log('=' .repeat(50));
    
    if (result.success) {
        console.log('\n✅ Successfully accessed API!');
        console.log('Session method worked. Saving configuration...');
        
        fs.writeFileSync('working-session-config.json', JSON.stringify({
            cookies: api.cookies,
            csrfToken: api.csrfToken,
            result: result.data
        }, null, 2));
        
        console.log('💾 Configuration saved to: working-session-config.json');
    } else {
        console.log('\n❌ Session-based approach also failed');
        console.log('\n📋 Please follow these steps:');
        console.log('1. Check browser-network-checker.md for instructions');
        console.log('2. Copy the exact cURL command from browser DevTools');
        console.log('3. Check what cookies and headers are being sent');
        console.log('\n💡 The API docs interface is doing something we\'re not aware of');
    }
}

// Run
if (require.main === module) {
    main();
}

module.exports = SessionBasedAPI;