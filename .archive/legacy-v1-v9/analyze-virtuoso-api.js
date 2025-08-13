#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

class VirtuosoAPIAnalyzer {
    constructor() {
        this.token = '86defbf4-62a7-4958-a0b4-21af0dee5d7a';
        this.baseUrl = 'https://app2.virtuoso.qa';
        this.discovered = {
            workingEndpoints: [],
            apiStructure: {},
            graphqlEndpoint: null,
            restEndpoints: [],
            authentication: {}
        };
    }

    async analyze() {
        console.log('🔬 Analyzing Virtuoso API Structure\n');
        console.log('=' .repeat(80) + '\n');
        
        // Step 1: Test known working endpoints
        await this.testKnownEndpoints();
        
        // Step 2: Analyze API structure
        await this.analyzeAPIStructure();
        
        // Step 3: Discover GraphQL
        await this.discoverGraphQL();
        
        // Step 4: Map REST endpoints
        await this.mapRESTEndpoints();
        
        // Step 5: Generate accurate report
        this.generateAccurateReport();
    }

    async testKnownEndpoints() {
        console.log('📍 Step 1: Testing Known Endpoints\n');
        
        // These are the endpoints we know should work based on documentation
        const knownEndpoints = [
            { path: '/api/user', method: 'GET', description: 'User details' },
            { path: '/api/projects', method: 'GET', description: 'List projects' },
            { path: '/api/organizations/1964', method: 'GET', description: 'Organization details' },
            { path: '/api/auth/user', method: 'GET', description: 'Auth user' },
            { path: '/api/v1/user', method: 'GET', description: 'V1 user' },
            { path: '/api/v2/user', method: 'GET', description: 'V2 user' }
        ];
        
        for (const endpoint of knownEndpoints) {
            const result = await this.testEndpoint(endpoint.path, endpoint.method);
            
            if (result.success) {
                console.log(`✅ ${endpoint.path} - Status: ${result.status}`);
                this.discovered.workingEndpoints.push({
                    ...endpoint,
                    status: result.status,
                    hasData: result.hasData,
                    response: result.data
                });
            } else {
                console.log(`❌ ${endpoint.path} - ${result.error || `Status: ${result.status}`}`);
            }
        }
    }

    async analyzeAPIStructure() {
        console.log('\n📐 Step 2: Analyzing API Structure\n');
        
        // Test different API path structures
        const structures = [
            '/api',
            '/v1',
            '/v2',
            '/rest',
            '/graphql',
            '/query'
        ];
        
        for (const structure of structures) {
            const result = await this.testEndpoint(structure, 'GET');
            if (result.success) {
                console.log(`  Found API structure at: ${structure}`);
                this.discovered.apiStructure[structure] = result.data;
            }
        }
        
        // Test for API documentation endpoints
        const docEndpoints = [
            '/api/docs',
            '/api/swagger',
            '/api/openapi',
            '/api/schema',
            '/api-docs',
            '/swagger.json',
            '/openapi.json'
        ];
        
        for (const doc of docEndpoints) {
            const result = await this.testEndpoint(doc, 'GET');
            if (result.success) {
                console.log(`  📚 Found API documentation at: ${doc}`);
                this.discovered.apiStructure[`docs_${doc}`] = result.data;
            }
        }
    }

    async discoverGraphQL() {
        console.log('\n🔮 Step 3: Discovering GraphQL\n');
        
        const graphqlPaths = [
            '/graphql',
            '/api/graphql',
            '/graphiql',
            '/api/graphiql',
            '/query',
            '/api/query'
        ];
        
        for (const path of graphqlPaths) {
            // Try introspection query
            const introspectionQuery = {
                query: `
                    query IntrospectionQuery {
                        __schema {
                            queryType { name }
                            mutationType { name }
                            subscriptionType { name }
                            types {
                                name
                                kind
                                description
                            }
                        }
                    }
                `
            };
            
            const result = await this.testEndpoint(path, 'POST', {
                body: introspectionQuery,
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (result.success && result.data && (result.data.data || result.data.__schema)) {
                console.log(`✅ GraphQL endpoint found at: ${path}`);
                this.discovered.graphqlEndpoint = {
                    path,
                    schema: result.data
                };
                break;
            }
        }
        
        if (!this.discovered.graphqlEndpoint) {
            console.log('  No GraphQL endpoint found');
        }
    }

    async mapRESTEndpoints() {
        console.log('\n🗺️ Step 4: Mapping REST Endpoints\n');
        
        // Based on working endpoints, map the full API
        if (this.discovered.workingEndpoints.length > 0) {
            const firstWorking = this.discovered.workingEndpoints[0];
            const basePath = firstWorking.path.substring(0, firstWorking.path.lastIndexOf('/'));
            
            console.log(`  Base API path detected: ${basePath}`);
            
            // Common REST resources
            const resources = [
                'users',
                'projects',
                'goals',
                'journeys',
                'executions',
                'tests',
                'suites',
                'organizations',
                'teams',
                'webhooks',
                'settings'
            ];
            
            for (const resource of resources) {
                const resourcePath = `${basePath}/${resource}`;
                const result = await this.testEndpoint(resourcePath, 'GET');
                
                if (result.success) {
                    console.log(`  ✓ Found resource: ${resourcePath}`);
                    this.discovered.restEndpoints.push({
                        path: resourcePath,
                        method: 'GET',
                        status: result.status,
                        type: 'collection'
                    });
                    
                    // If we got data, test single resource access
                    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                        const firstItem = result.data[0];
                        if (firstItem.id) {
                            const singlePath = `${resourcePath}/${firstItem.id}`;
                            const singleResult = await this.testEndpoint(singlePath, 'GET');
                            
                            if (singleResult.success) {
                                console.log(`    ✓ Single ${resource}: ${singlePath}`);
                                this.discovered.restEndpoints.push({
                                    path: singlePath,
                                    method: 'GET',
                                    status: singleResult.status,
                                    type: 'single'
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    async testEndpoint(path, method, options = {}) {
        return new Promise((resolve) => {
            const url = new URL(path, this.baseUrl);
            
            const requestOptions = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    ...options.headers
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
                        if (data && data.trim()) {
                            parsedData = JSON.parse(data);
                        }
                    } catch (e) {
                        parsedData = data;
                    }
                    
                    resolve({
                        success: res.statusCode < 400 && res.statusCode !== 301,
                        status: res.statusCode,
                        data: parsedData,
                        hasData: !!parsedData,
                        headers: res.headers
                    });
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    success: false,
                    error: 'Request timeout'
                });
            });
            
            if (options.body) {
                req.write(JSON.stringify(options.body));
            }
            
            req.end();
        });
    }

    generateAccurateReport() {
        console.log('\n' + '=' .repeat(80));
        console.log('📊 Accurate API Analysis Report');
        console.log('=' .repeat(80) + '\n');
        
        console.log('✅ Working Endpoints:');
        if (this.discovered.workingEndpoints.length > 0) {
            this.discovered.workingEndpoints.forEach(endpoint => {
                console.log(`  ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
            });
        } else {
            console.log('  None found (check authentication)');
        }
        
        console.log('\n📐 API Structure:');
        Object.keys(this.discovered.apiStructure).forEach(key => {
            console.log(`  ${key}: Found`);
        });
        
        console.log('\n🔮 GraphQL:');
        if (this.discovered.graphqlEndpoint) {
            console.log(`  Endpoint: ${this.discovered.graphqlEndpoint.path}`);
        } else {
            console.log('  Not found');
        }
        
        console.log('\n🗺️ REST Resources:');
        const uniquePaths = [...new Set(this.discovered.restEndpoints.map(e => e.path))];
        uniquePaths.forEach(path => {
            console.log(`  ${path}`);
        });
        
        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            authentication: {
                token: 'Bearer token',
                working: this.discovered.workingEndpoints.length > 0
            },
            workingEndpoints: this.discovered.workingEndpoints,
            apiStructure: this.discovered.apiStructure,
            graphql: this.discovered.graphqlEndpoint,
            restEndpoints: this.discovered.restEndpoints,
            summary: {
                totalWorkingEndpoints: this.discovered.workingEndpoints.length,
                hasGraphQL: !!this.discovered.graphqlEndpoint,
                restResourcesFound: uniquePaths.length
            }
        };
        
        const reportPath = path.join(__dirname, `accurate-api-analysis-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        console.log('\n🎯 Key Findings:');
        console.log(`  • Working endpoints: ${this.discovered.workingEndpoints.length}`);
        console.log(`  • GraphQL available: ${!!this.discovered.graphqlEndpoint}`);
        console.log(`  • REST resources: ${uniquePaths.length}`);
        
        if (this.discovered.workingEndpoints.length === 0) {
            console.log('\n⚠️  WARNING: No working endpoints found!');
            console.log('  Possible issues:');
            console.log('  1. Authentication token may be invalid');
            console.log('  2. API structure may be different than expected');
            console.log('  3. Endpoints may require different paths');
        }
    }
}

// Run the analysis
if (require.main === module) {
    const analyzer = new VirtuosoAPIAnalyzer();
    analyzer.analyze().catch(console.error);
}

module.exports = VirtuosoAPIAnalyzer;