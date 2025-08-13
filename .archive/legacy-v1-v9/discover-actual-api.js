#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

class ActualAPIDiscovery {
    constructor() {
        this.token = '86defbf4-62a7-4958-a0b4-21af0dee5d7a';
        this.organizationId = 1964;
        this.discovered = {
            working: [],
            authentication: {},
            structure: {}
        };
    }

    async discover() {
        console.log('🔬 Discovering Actual Virtuoso API Structure\n');
        console.log('Token: 86defbf4-62a7-4958-a0b4-21af0dee5d7a');
        console.log('Organization: 1964');
        console.log('=' .repeat(80) + '\n');
        
        // Step 1: Try the api.virtuoso.qa subdomain (production pattern)
        await this.testAPISubdomain();
        
        // Step 2: Try GraphQL endpoints
        await this.testGraphQLEndpoints();
        
        // Step 3: Try direct project access with org ID
        await this.testOrganizationEndpoints();
        
        // Step 4: Try different authentication patterns
        await this.testAuthenticationPatterns();
        
        // Step 5: Generate findings
        this.generateFindings();
    }

    async testAPISubdomain() {
        console.log('📡 Testing api.virtuoso.qa subdomain patterns\n');
        
        const apiPatterns = [
            { host: 'api.virtuoso.qa', path: '/api/user' },
            { host: 'api.virtuoso.qa', path: '/api/projects' },
            { host: 'api.virtuoso.qa', path: '/api/organizations/1964' },
            { host: 'api.virtuoso.qa', path: '/user' },
            { host: 'api.virtuoso.qa', path: '/projects' },
            { host: 'api.virtuoso.qa', path: '/v1/user' },
            { host: 'api.virtuoso.qa', path: '/v2/user' }
        ];
        
        for (const pattern of apiPatterns) {
            const result = await this.makeAPIRequest(pattern.host, pattern.path);
            console.log(`  ${pattern.host}${pattern.path}:`);
            console.log(`    Status: ${result.status} ${result.success ? '✅' : '❌'}`);
            
            if (result.success) {
                console.log(`    Data: ${JSON.stringify(result.data).substring(0, 100)}`);
                this.discovered.working.push({
                    url: `https://${pattern.host}${pattern.path}`,
                    status: result.status,
                    hasData: !!result.data
                });
            } else if (result.status === 401) {
                console.log(`    Note: Authentication required (good sign - endpoint exists)`);
                this.discovered.structure[`${pattern.host}${pattern.path}`] = 'requires_auth';
            }
        }
    }

    async testGraphQLEndpoints() {
        console.log('\n🔮 Testing GraphQL endpoints\n');
        
        const graphqlHosts = [
            'app2.virtuoso.qa',
            'api.virtuoso.qa',
            'graphql.virtuoso.qa'
        ];
        
        const graphqlPaths = [
            '/graphql',
            '/api/graphql',
            '/query'
        ];
        
        for (const host of graphqlHosts) {
            for (const path of graphqlPaths) {
                const introspectionQuery = {
                    query: '{ __schema { queryType { name } } }'
                };
                
                const result = await this.makeAPIRequest(host, path, {
                    method: 'POST',
                    body: introspectionQuery
                });
                
                if (result.success || result.status === 200) {
                    console.log(`  ✅ GraphQL found at ${host}${path}`);
                    this.discovered.working.push({
                        url: `https://${host}${path}`,
                        type: 'graphql'
                    });
                }
            }
        }
    }

    async testOrganizationEndpoints() {
        console.log('\n🏢 Testing organization-specific endpoints\n');
        
        const orgEndpoints = [
            `/api/organizations/${this.organizationId}`,
            `/api/organizations/${this.organizationId}/projects`,
            `/api/organizations/${this.organizationId}/users`,
            `/api/organizations/${this.organizationId}/settings`,
            `/api/orgs/${this.organizationId}`,
            `/organizations/${this.organizationId}`
        ];
        
        const hosts = ['app2.virtuoso.qa', 'api.virtuoso.qa'];
        
        for (const host of hosts) {
            for (const endpoint of orgEndpoints) {
                const result = await this.makeAPIRequest(host, endpoint);
                
                if (result.success || result.status === 401) {
                    console.log(`  ${result.success ? '✅' : '🔐'} ${host}${endpoint} (${result.status})`);
                    
                    if (result.success) {
                        this.discovered.working.push({
                            url: `https://${host}${endpoint}`,
                            status: result.status
                        });
                    }
                }
            }
        }
    }

    async testAuthenticationPatterns() {
        console.log('\n🔐 Testing authentication patterns\n');
        
        // Try different auth headers
        const authPatterns = [
            { header: 'Authorization', value: `Bearer ${this.token}` },
            { header: 'Authorization', value: `Token ${this.token}` },
            { header: 'X-API-Key', value: this.token },
            { header: 'X-Auth-Token', value: this.token },
            { header: 'apikey', value: this.token }
        ];
        
        const testEndpoint = '/api/user';
        const hosts = ['app2.virtuoso.qa', 'api.virtuoso.qa'];
        
        for (const host of hosts) {
            console.log(`  Testing ${host}:`);
            
            for (const auth of authPatterns) {
                const result = await this.makeAPIRequest(host, testEndpoint, {
                    headers: { [auth.header]: auth.value }
                });
                
                if (result.success || (result.status !== 401 && result.status !== 403)) {
                    console.log(`    ✅ ${auth.header}: ${auth.value.substring(0, 20)}... - Status: ${result.status}`);
                    this.discovered.authentication[auth.header] = true;
                }
            }
        }
    }

    async makeAPIRequest(host, path, options = {}) {
        return new Promise((resolve) => {
            const requestOptions = {
                hostname: host,
                path: path,
                method: options.method || 'GET',
                headers: options.headers || {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            };
            
            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    let parsedData = null;
                    
                    try {
                        if (data && data.trim() && data.trim() !== '') {
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
                    status: 0,
                    error: error.message
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    success: false,
                    status: 0,
                    error: 'Timeout'
                });
            });
            
            if (options.body) {
                req.write(JSON.stringify(options.body));
            }
            
            req.end();
        });
    }

    generateFindings() {
        console.log('\n' + '=' .repeat(80));
        console.log('📊 API Discovery Findings');
        console.log('=' .repeat(80) + '\n');
        
        console.log('✅ Working Endpoints:');
        if (this.discovered.working.length > 0) {
            this.discovered.working.forEach(endpoint => {
                console.log(`  ${endpoint.url} ${endpoint.type ? `(${endpoint.type})` : ''}`);
            });
        } else {
            console.log('  None found with current token');
        }
        
        console.log('\n🔐 Authentication Methods That Responded:');
        Object.keys(this.discovered.authentication).forEach(method => {
            console.log(`  ${method}`);
        });
        
        console.log('\n🏗️ API Structure Discovered:');
        Object.entries(this.discovered.structure).forEach(([endpoint, info]) => {
            console.log(`  ${endpoint}: ${info}`);
        });
        
        // Save findings
        const report = {
            timestamp: new Date().toISOString(),
            token: 'Bearer token used',
            organizationId: this.organizationId,
            discovered: this.discovered,
            summary: {
                workingEndpoints: this.discovered.working.length,
                authMethodsFound: Object.keys(this.discovered.authentication).length
            }
        };
        
        const reportPath = path.join(__dirname, `actual-api-discovery-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n📄 Report saved to: ${reportPath}`);
        
        console.log('\n🎯 Recommendations:');
        if (this.discovered.working.length === 0) {
            console.log('  1. The token might be app-specific, not API-specific');
            console.log('  2. The API might use session-based authentication');
            console.log('  3. We might need to authenticate through the web app first');
            console.log('  4. The API might be internal only or IP-restricted');
        } else {
            console.log('  1. Use the working endpoints as base for further discovery');
            console.log('  2. Explore sub-resources of working endpoints');
            console.log('  3. Test different HTTP methods on working paths');
        }
    }
}

// Run discovery
if (require.main === module) {
    const discovery = new ActualAPIDiscovery();
    discovery.discover().catch(console.error);
}

module.exports = ActualAPIDiscovery;