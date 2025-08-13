#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class DeepDiscoverySystem {
    constructor(token, options = {}) {
        this.token = token || '86defbf4-62a7-4958-a0b4-21af0dee5d7a';
        this.baseUrl = options.baseUrl || 'https://app2.virtuoso.qa';
        this.organizationId = options.organizationId || 1964;
        
        // Discovery configuration
        this.config = {
            maxDepth: options.maxDepth || 4,
            requestDelay: options.requestDelay || 200,
            batchSize: options.batchSize || 5,
            timeout: options.timeout || 10000,
            retryAttempts: options.retryAttempts || 2,
            verbose: options.verbose !== false
        };
        
        // Discovery state
        this.discovered = {
            endpoints: new Map(),
            schemas: new Map(),
            relationships: new Map(),
            errors: new Map(),
            statistics: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                discoveredEndpoints: 0,
                hiddenEndpoints: 0
            }
        };
        
        // Pattern definitions for systematic exploration
        this.patterns = this.definePatterns();
        this.queue = [];
        this.tested = new Set();
    }

    definePatterns() {
        return {
            // API version patterns
            apiVersions: [
                '/api',
                '/api/v1', 
                '/api/v2',
                '/v1',
                '/v2',
                ''
            ],
            
            // Core resources to explore
            resources: [
                // User & Auth
                'user', 'users', 'auth', 'authentication', 'login', 'logout', 'session',
                'profile', 'account', 'me', 'current-user', 'whoami',
                
                // Organization
                'organization', 'organizations', 'org', 'orgs', 'company', 'companies',
                'team', 'teams', 'group', 'groups', 'members', 'roles', 'permissions',
                
                // Projects & Tests
                'project', 'projects', 'goal', 'goals', 'journey', 'journeys',
                'test', 'tests', 'suite', 'suites', 'scenario', 'scenarios',
                'step', 'steps', 'action', 'actions', 'command', 'commands',
                
                // Execution
                'execution', 'executions', 'run', 'runs', 'job', 'jobs',
                'result', 'results', 'report', 'reports', 'status', 'statuses',
                
                // Data & Assets
                'data', 'testdata', 'dataset', 'datasets', 'variable', 'variables',
                'environment', 'environments', 'config', 'configs', 'setting', 'settings',
                'screenshot', 'screenshots', 'video', 'videos', 'log', 'logs',
                'artifact', 'artifacts', 'asset', 'assets', 'file', 'files',
                
                // Analytics & Monitoring
                'metric', 'metrics', 'analytic', 'analytics', 'insight', 'insights',
                'dashboard', 'dashboards', 'chart', 'charts', 'stat', 'stats',
                'monitor', 'monitors', 'alert', 'alerts', 'notification', 'notifications',
                
                // Integration
                'webhook', 'webhooks', 'integration', 'integrations', 'app', 'apps',
                'plugin', 'plugins', 'extension', 'extensions', 'bridge', 'bridges',
                'agent', 'agents', 'runner', 'runners', 'node', 'nodes',
                
                // API Discovery
                'endpoint', 'endpoints', 'route', 'routes', 'path', 'paths',
                'openapi', 'swagger', 'graphql', 'graphiql', 'schema', 'schemas',
                'health', 'healthz', 'ready', 'readyz', 'ping', 'version', 'info'
            ],
            
            // Sub-resource patterns
            subResources: [
                '', // Base resource
                '/{id}',
                '/{id}/details',
                '/{id}/status',
                '/{id}/history',
                '/{id}/logs',
                '/{id}/results',
                '/{id}/metrics',
                '/{id}/relationships',
                '/{id}/children',
                '/{id}/parent',
                '/list',
                '/all',
                '/count',
                '/search',
                '/filter',
                '/export',
                '/import'
            ],
            
            // Query parameter patterns
            queryPatterns: [
                '',
                '?page=1',
                '?page=1&limit=10',
                '?offset=0&limit=10',
                '?sort=created_at',
                '?order=desc',
                '?filter[status]=active',
                '?include=all',
                '?expand=true',
                '?fields=id,name,status',
                '?q=test'
            ],
            
            // HTTP methods to test
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
            
            // Special endpoints to check
            specialEndpoints: [
                '/graphql',
                '/graphiql', 
                '/.well-known/openapi',
                '/api-docs',
                '/swagger.json',
                '/openapi.json',
                '/health',
                '/metrics',
                '/version'
            ]
        };
    }

    async discover() {
        console.log('🔬 Deep Discovery System Starting\n');
        console.log('Configuration:');
        console.log(`  Base URL: ${this.baseUrl}`);
        console.log(`  Organization: ${this.organizationId}`);
        console.log(`  Max Depth: ${this.config.maxDepth}`);
        console.log(`  Batch Size: ${this.config.batchSize}`);
        console.log('─'.repeat(80) + '\n');
        
        try {
            // Phase 1: Test authentication and basic access
            await this.testAuthentication();
            
            // Phase 2: Discover base resources
            await this.discoverBaseResources();
            
            // Phase 3: Explore discovered resources deeply
            await this.exploreResourcesDepth();
            
            // Phase 4: Test special endpoints
            await this.discoverSpecialEndpoints();
            
            // Phase 5: Analyze relationships
            await this.analyzeRelationships();
            
            // Phase 6: Extract and validate schemas
            await this.extractSchemas();
            
            // Phase 7: Test GraphQL if available
            await this.testGraphQL();
            
            // Phase 8: Generate comprehensive report
            const report = await this.generateReport();
            
            return report;
            
        } catch (error) {
            console.error('❌ Discovery failed:', error.message);
            throw error;
        }
    }

    async testAuthentication() {
        console.log('📐 Phase 1: Testing Authentication\n');
        
        const endpoints = [
            '/api/user',
            '/api/users/me',
            '/api/whoami',
            '/api/auth/verify'
        ];
        
        for (const endpoint of endpoints) {
            const result = await this.testEndpoint('GET', endpoint);
            if (result.success) {
                console.log(`✅ Authentication verified at: ${endpoint}`);
                this.discovered.endpoints.set('auth', { 
                    endpoint, 
                    method: 'GET', 
                    authenticated: true 
                });
                break;
            }
        }
    }

    async discoverBaseResources() {
        console.log('\n📦 Phase 2: Discovering Base Resources\n');
        
        const batches = this.createBatches(this.patterns.resources, this.config.batchSize);
        let discoveredCount = 0;
        
        for (const [index, batch] of batches.entries()) {
            console.log(`  Processing batch ${index + 1}/${batches.length}...`);
            
            const promises = batch.map(resource => 
                this.exploreResource(resource)
            );
            
            const results = await Promise.allSettled(promises);
            
            results.forEach((result, i) => {
                if (result.status === 'fulfilled' && result.value) {
                    discoveredCount += result.value.discovered || 0;
                }
            });
            
            // Rate limiting delay between batches
            await this.delay(this.config.requestDelay * 2);
        }
        
        console.log(`\n✅ Discovered ${discoveredCount} base resources\n`);
    }

    async exploreResource(resource) {
        const discovered = [];
        
        for (const version of this.patterns.apiVersions) {
            const basePath = `${version}/${resource}`.replace('//', '/');
            
            // Test the base resource
            const result = await this.testEndpoint('GET', basePath);
            
            if (result.success) {
                discovered.push({
                    path: basePath,
                    method: 'GET',
                    status: result.status,
                    hasData: result.hasData
                });
                
                // If successful, explore sub-resources
                if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                    const firstItem = result.data[0];
                    if (firstItem.id) {
                        await this.exploreSubResources(basePath, firstItem.id);
                    }
                }
                
                // Test other methods
                await this.testMethods(basePath);
            }
        }
        
        return { resource, discovered: discovered.length };
    }

    async exploreSubResources(basePath, sampleId) {
        const subPaths = [
            `${basePath}/${sampleId}`,
            `${basePath}/${sampleId}/details`,
            `${basePath}/${sampleId}/status`,
            `${basePath}/${sampleId}/history`,
            `${basePath}/${sampleId}/relationships`
        ];
        
        for (const path of subPaths) {
            if (!this.tested.has(path)) {
                await this.testEndpoint('GET', path);
                await this.delay(this.config.requestDelay);
            }
        }
    }

    async testMethods(path) {
        const methods = ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
        
        for (const method of methods) {
            const key = `${method} ${path}`;
            if (!this.tested.has(key)) {
                await this.testEndpoint(method, path);
            }
        }
    }

    async exploreResourcesDepth() {
        console.log('🔍 Phase 3: Deep Resource Exploration\n');
        
        const endpoints = Array.from(this.discovered.endpoints.values())
            .filter(e => e.method === 'GET' && e.hasData);
        
        for (const endpoint of endpoints.slice(0, 20)) { // Limit for safety
            await this.exploreEndpointDepth(endpoint.endpoint, 1);
        }
    }

    async exploreEndpointDepth(path, depth) {
        if (depth > this.config.maxDepth) return;
        
        // Try common sub-paths
        const subPaths = [
            `${path}/count`,
            `${path}/stats`,
            `${path}/summary`,
            `${path}/export`
        ];
        
        for (const subPath of subPaths) {
            if (!this.tested.has(subPath)) {
                const result = await this.testEndpoint('GET', subPath);
                if (result.success) {
                    await this.exploreEndpointDepth(subPath, depth + 1);
                }
            }
        }
    }

    async discoverSpecialEndpoints() {
        console.log('\n🎯 Phase 4: Testing Special Endpoints\n');
        
        for (const endpoint of this.patterns.specialEndpoints) {
            const result = await this.testEndpoint('GET', endpoint);
            
            if (result.success) {
                console.log(`✨ Found special endpoint: ${endpoint}`);
                this.discovered.endpoints.set(`special_${endpoint}`, {
                    endpoint,
                    method: 'GET',
                    type: 'special',
                    response: result.data
                });
            }
            
            await this.delay(this.config.requestDelay);
        }
    }

    async testGraphQL() {
        console.log('\n🔮 Phase 7: Testing GraphQL\n');
        
        const graphqlEndpoints = ['/graphql', '/api/graphql', '/query'];
        
        for (const endpoint of graphqlEndpoints) {
            const introspectionQuery = {
                query: `
                    {
                        __schema {
                            types {
                                name
                                kind
                                fields {
                                    name
                                    type {
                                        name
                                    }
                                }
                            }
                        }
                    }
                `
            };
            
            const result = await this.testEndpoint('POST', endpoint, {
                body: introspectionQuery,
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (result.success && result.data && result.data.data) {
                console.log(`✅ GraphQL endpoint found at: ${endpoint}`);
                this.discovered.endpoints.set('graphql', {
                    endpoint,
                    method: 'POST',
                    type: 'graphql',
                    schema: result.data.data.__schema
                });
                break;
            }
        }
    }

    async testEndpoint(method, path, options = {}) {
        const key = `${method} ${path}`;
        
        if (this.tested.has(key)) {
            return { success: false, cached: true };
        }
        
        this.tested.add(key);
        this.discovered.statistics.totalRequests++;
        
        try {
            const response = await this.makeRequest(method, path, options);
            
            if (response.status < 400) {
                this.discovered.statistics.successfulRequests++;
                
                // Store successful endpoint
                this.discovered.endpoints.set(key, {
                    endpoint: path,
                    method,
                    status: response.status,
                    headers: response.headers,
                    hasData: response.data && Object.keys(response.data).length > 0,
                    dataType: this.detectDataType(response.data),
                    timestamp: new Date().toISOString()
                });
                
                // Extract schema if data present
                if (response.data) {
                    this.discovered.schemas.set(key, this.extractSchema(response.data));
                }
                
                if (this.config.verbose && response.status < 300) {
                    console.log(`  ✓ ${method} ${path} (${response.status})`);
                }
                
                return {
                    success: true,
                    status: response.status,
                    data: response.data,
                    hasData: response.data && Object.keys(response.data).length > 0
                };
            } else {
                this.discovered.statistics.failedRequests++;
                
                if (response.status !== 404 && response.status !== 405) {
                    this.discovered.errors.set(key, {
                        status: response.status,
                        error: response.error
                    });
                }
                
                return { success: false, status: response.status };
            }
        } catch (error) {
            this.discovered.statistics.failedRequests++;
            this.discovered.errors.set(key, { error: error.message });
            return { success: false, error: error.message };
        }
    }

    makeRequest(method, path, options = {}) {
        return new Promise((resolve) => {
            const url = new URL(path, this.baseUrl);
            
            const requestOptions = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                timeout: this.config.timeout
            };
            
            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    let parsedData = null;
                    
                    try {
                        if (data) {
                            parsedData = JSON.parse(data);
                        }
                    } catch (e) {
                        parsedData = data;
                    }
                    
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: parsedData,
                        raw: data
                    });
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    status: 0,
                    error: error.message
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    status: 0,
                    error: 'Request timeout'
                });
            });
            
            if (options.body) {
                req.write(JSON.stringify(options.body));
            }
            
            req.end();
        });
    }

    extractSchema(data) {
        if (!data) return null;
        
        const schema = {
            type: typeof data,
            properties: {}
        };
        
        if (Array.isArray(data)) {
            schema.type = 'array';
            if (data.length > 0) {
                schema.items = this.extractSchema(data[0]);
            }
        } else if (typeof data === 'object') {
            schema.type = 'object';
            for (const [key, value] of Object.entries(data)) {
                schema.properties[key] = {
                    type: typeof value,
                    example: value
                };
            }
        }
        
        return schema;
    }

    detectDataType(data) {
        if (!data) return 'empty';
        if (Array.isArray(data)) return 'array';
        if (typeof data === 'object') return 'object';
        return typeof data;
    }

    async analyzeRelationships() {
        console.log('\n🔗 Phase 5: Analyzing Relationships\n');
        
        const endpoints = Array.from(this.discovered.endpoints.values());
        const relationships = new Map();
        
        // Find parent-child relationships
        endpoints.forEach(endpoint => {
            const path = endpoint.endpoint;
            const parts = path.split('/').filter(p => p && !p.startsWith('{'));
            
            if (parts.length > 2) {
                const parent = parts[parts.length - 2];
                const child = parts[parts.length - 1];
                
                if (!relationships.has(parent)) {
                    relationships.set(parent, new Set());
                }
                relationships.get(parent).add(child);
            }
        });
        
        this.discovered.relationships = relationships;
        
        console.log(`  Found ${relationships.size} resource relationships`);
    }

    async extractSchemas() {
        console.log('\n📋 Phase 6: Extracting Schemas\n');
        
        const schemas = Array.from(this.discovered.schemas.entries());
        console.log(`  Extracted ${schemas.length} response schemas`);
    }

    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generateReport() {
        console.log('\n📊 Generating Comprehensive Report\n');
        
        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                baseUrl: this.baseUrl,
                organizationId: this.organizationId,
                totalEndpointsTested: this.tested.size,
                successfulEndpoints: this.discovered.endpoints.size
            },
            statistics: this.discovered.statistics,
            endpoints: this.categorizeEndpoints(),
            schemas: Object.fromEntries(this.discovered.schemas),
            relationships: Array.from(this.discovered.relationships.entries()).map(([k, v]) => ({
                resource: k,
                related: Array.from(v)
            })),
            errors: Object.fromEntries(this.discovered.errors),
            discoveries: this.identifyDiscoveries()
        };
        
        // Save report
        const reportPath = path.join(__dirname, '..', `deep-discovery-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n✅ Report saved to: ${reportPath}`);
        
        this.printSummary(report);
        
        return report;
    }

    categorizeEndpoints() {
        const categories = {
            authentication: [],
            resources: [],
            operations: [],
            special: [],
            graphql: []
        };
        
        this.discovered.endpoints.forEach((endpoint, key) => {
            if (endpoint.type === 'graphql') {
                categories.graphql.push(endpoint);
            } else if (endpoint.type === 'special') {
                categories.special.push(endpoint);
            } else if (key.includes('auth') || key.includes('user')) {
                categories.authentication.push(endpoint);
            } else if (endpoint.method === 'GET') {
                categories.resources.push(endpoint);
            } else {
                categories.operations.push(endpoint);
            }
        });
        
        return categories;
    }

    identifyDiscoveries() {
        const knownPatterns = [
            '/api/user',
            '/api/projects',
            '/api/goals',
            '/api/organizations'
        ];
        
        const discoveries = [];
        
        this.discovered.endpoints.forEach((endpoint, key) => {
            const isKnown = knownPatterns.some(pattern => 
                endpoint.endpoint.includes(pattern)
            );
            
            if (!isKnown && endpoint.status < 300) {
                discoveries.push({
                    endpoint: endpoint.endpoint,
                    method: endpoint.method,
                    status: endpoint.status,
                    type: 'undocumented'
                });
            }
        });
        
        return discoveries;
    }

    printSummary(report) {
        console.log('\n' + '='.repeat(80));
        console.log('📊 Discovery Summary');
        console.log('='.repeat(80));
        
        console.log('\n📈 Statistics:');
        console.log(`  Total Requests: ${report.statistics.totalRequests}`);
        console.log(`  Successful: ${report.statistics.successfulRequests}`);
        console.log(`  Failed: ${report.statistics.failedRequests}`);
        console.log(`  Success Rate: ${((report.statistics.successfulRequests / report.statistics.totalRequests) * 100).toFixed(1)}%`);
        
        console.log('\n🎯 Endpoints by Category:');
        Object.entries(report.endpoints).forEach(([category, endpoints]) => {
            console.log(`  ${category}: ${endpoints.length}`);
        });
        
        console.log('\n✨ New Discoveries:');
        if (report.discoveries.length > 0) {
            report.discoveries.slice(0, 10).forEach(d => {
                console.log(`  ${d.method} ${d.endpoint}`);
            });
            if (report.discoveries.length > 10) {
                console.log(`  ... and ${report.discoveries.length - 10} more`);
            }
        } else {
            console.log('  No undocumented endpoints found');
        }
        
        console.log('\n🔗 Relationships:');
        report.relationships.slice(0, 5).forEach(rel => {
            console.log(`  ${rel.resource} → ${rel.related.join(', ')}`);
        });
        
        console.log('\n✅ Discovery Complete!');
    }
}

// Export for use
module.exports = DeepDiscoverySystem;

// CLI execution
if (require.main === module) {
    const system = new DeepDiscoverySystem();
    
    system.discover()
        .then(report => {
            console.log('\n🎉 Deep discovery completed successfully!');
            console.log(`Found ${report.metadata.successfulEndpoints} working endpoints`);
        })
        .catch(error => {
            console.error('❌ Discovery failed:', error);
            process.exit(1);
        });
}