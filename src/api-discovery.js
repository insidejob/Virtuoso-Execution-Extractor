#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { VirtuosoAPIClient } = require('./client');

class APIDiscoveryScanner {
    constructor(token, options = {}) {
        this.token = token;
        this.baseUrl = options.baseUrl || 'https://api.virtuoso.qa';
        this.client = new VirtuosoAPIClient(token, { baseUrl: this.baseUrl });
        this.discovered = new Map();
        this.tested = new Set();
        this.rateLimit = options.rateLimit || 100; // ms between requests
        this.maxDepth = options.maxDepth || 3;
        this.verbose = options.verbose || false;
        
        // Load known endpoints
        this.knownEndpoints = this.loadKnownEndpoints();
        
        // Common API patterns to test
        this.patterns = this.generatePatterns();
    }

    loadKnownEndpoints() {
        const schemaPath = path.join(__dirname, '..', 'api-schema.json');
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        const endpoints = [];
        
        Object.values(schema.categories).forEach(category => {
            if (category.endpoints) {
                category.endpoints.forEach(ep => {
                    endpoints.push({
                        path: ep.path,
                        method: ep.method,
                        known: true
                    });
                });
            }
        });
        
        return endpoints;
    }

    generatePatterns() {
        const patterns = {
            // Version patterns
            versions: ['', '/v1', '/v2', '/api', '/api/v1', '/api/v2'],
            
            // Common REST resources
            resources: [
                'users', 'projects', 'goals', 'executions', 'jobs', 'tests',
                'journeys', 'snapshots', 'reports', 'analytics', 'metrics',
                'organizations', 'teams', 'permissions', 'roles', 'settings',
                'webhooks', 'hooks', 'integrations', 'certificates', 'tokens',
                'logs', 'events', 'notifications', 'alerts', 'dashboards',
                'environments', 'variables', 'configs', 'templates', 'workflows',
                'bridges', 'agents', 'nodes', 'clusters', 'deployments',
                'schedules', 'triggers', 'actions', 'results', 'artifacts',
                'screenshots', 'videos', 'recordings', 'sessions', 'traces'
            ],
            
            // Common sub-resources
            subResources: [
                'list', 'all', 'count', 'stats', 'summary', 'details',
                'status', 'health', 'info', 'metadata', 'config', 'settings',
                'history', 'logs', 'events', 'activities', 'audit',
                'permissions', 'roles', 'access', 'members', 'users',
                'export', 'import', 'download', 'upload', 'sync',
                'start', 'stop', 'pause', 'resume', 'cancel', 'retry',
                'validate', 'verify', 'check', 'test', 'preview'
            ],
            
            // GraphQL and special endpoints
            special: [
                '/graphql', '/graphiql', '/query',
                '/health', '/healthz', '/status', '/ping',
                '/version', '/info', '/about',
                '/metrics', '/prometheus', '/stats',
                '/swagger', '/openapi', '/api-docs', '/docs',
                '/admin', '/internal', '/debug',
                '/.well-known', '/discovery'
            ],
            
            // Methods to test
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
        };
        
        return patterns;
    }

    async discover() {
        console.log('🔍 Starting API Discovery Scanner\n');
        console.log(`Base URL: ${this.baseUrl}`);
        console.log(`Known endpoints: ${this.knownEndpoints.length}`);
        console.log('─'.repeat(80) + '\n');
        
        // Phase 1: Test special endpoints
        await this.discoverSpecialEndpoints();
        
        // Phase 2: Test version variations
        await this.discoverVersionedEndpoints();
        
        // Phase 3: Discover resources
        await this.discoverResources();
        
        // Phase 4: Test known endpoint variations
        await this.discoverEndpointVariations();
        
        // Phase 5: Recursive exploration
        await this.recursiveExploration();
        
        // Generate report
        this.generateReport();
    }

    async discoverSpecialEndpoints() {
        console.log('📡 Phase 1: Testing special endpoints...\n');
        
        for (const endpoint of this.patterns.special) {
            await this.testEndpoint('GET', endpoint);
            await this.delay(this.rateLimit);
        }
    }

    async discoverVersionedEndpoints() {
        console.log('\n📡 Phase 2: Testing API versions...\n');
        
        for (const version of this.patterns.versions) {
            const paths = [
                version + '/user',
                version + '/users',
                version + '/projects',
                version + '/status'
            ];
            
            for (const path of paths) {
                await this.testEndpoint('GET', path);
                await this.delay(this.rateLimit);
            }
        }
    }

    async discoverResources() {
        console.log('\n📡 Phase 3: Discovering resources...\n');
        
        for (const resource of this.patterns.resources) {
            // Test main resource
            const resourcePath = `/api/${resource}`;
            const result = await this.testEndpoint('GET', resourcePath);
            
            if (result && result.valid) {
                // If resource exists, test sub-resources
                for (const sub of this.patterns.subResources.slice(0, 5)) {
                    await this.testEndpoint('GET', `${resourcePath}/${sub}`);
                    await this.delay(this.rateLimit);
                }
                
                // Test with ID pattern
                await this.testEndpoint('GET', `${resourcePath}/1`);
                await this.testEndpoint('GET', `${resourcePath}/test-id`);
            }
            
            await this.delay(this.rateLimit);
        }
    }

    async discoverEndpointVariations() {
        console.log('\n📡 Phase 4: Testing endpoint variations...\n');
        
        for (const known of this.knownEndpoints) {
            const basePath = known.path.replace(/{[^}]+}/g, 'test-id');
            
            // Test different methods
            for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
                if (method !== known.method) {
                    await this.testEndpoint(method, basePath);
                    await this.delay(this.rateLimit);
                }
            }
            
            // Test sub-resources
            const subPaths = [
                basePath + '/status',
                basePath + '/details',
                basePath + '/history',
                basePath + '/logs'
            ];
            
            for (const subPath of subPaths) {
                await this.testEndpoint('GET', subPath);
                await this.delay(this.rateLimit);
            }
        }
    }

    async recursiveExploration() {
        console.log('\n📡 Phase 5: Recursive exploration...\n');
        
        // Start from discovered valid endpoints
        const validEndpoints = Array.from(this.discovered.values())
            .filter(e => e.valid && e.statusCode < 400);
        
        for (const endpoint of validEndpoints.slice(0, 10)) {
            await this.exploreEndpoint(endpoint.path, 1);
        }
    }

    async exploreEndpoint(basePath, depth) {
        if (depth > this.maxDepth) return;
        
        const explorePaths = [
            'list', 'all', 'count', 'stats',
            'status', 'config', 'history',
            '1', 'test-id', 'latest', 'current'
        ];
        
        for (const explore of explorePaths) {
            const newPath = `${basePath}/${explore}`;
            
            if (!this.tested.has(newPath)) {
                const result = await this.testEndpoint('GET', newPath);
                
                if (result && result.valid && result.statusCode < 400) {
                    await this.exploreEndpoint(newPath, depth + 1);
                }
                
                await this.delay(this.rateLimit);
            }
        }
    }

    async testEndpoint(method, path, options = {}) {
        const key = `${method} ${path}`;
        
        if (this.tested.has(key)) {
            return this.discovered.get(key);
        }
        
        this.tested.add(key);
        
        try {
            const startTime = Date.now();
            const response = await this.makeRequest(method, path, options);
            const duration = Date.now() - startTime;
            
            const result = {
                method,
                path,
                statusCode: response.status,
                valid: response.status < 500,
                authenticated: response.status !== 401,
                found: response.status !== 404,
                duration,
                headers: response.headers,
                hasBody: response.body && response.body.length > 0,
                timestamp: new Date().toISOString()
            };
            
            // Check if this is a new discovery
            const isKnown = this.knownEndpoints.some(k => 
                k.method === method && this.normalizePath(k.path) === this.normalizePath(path)
            );
            
            if (!isKnown && result.valid && result.found) {
                console.log(`✨ NEW DISCOVERY: ${method} ${path} (${response.status})`);
                result.discovery = true;
            } else if (this.verbose) {
                const icon = result.found ? '✓' : '✗';
                console.log(`${icon} ${method} ${path} (${response.status})`);
            }
            
            this.discovered.set(key, result);
            return result;
            
        } catch (error) {
            const result = {
                method,
                path,
                error: error.message,
                valid: false,
                timestamp: new Date().toISOString()
            };
            
            this.discovered.set(key, result);
            
            if (this.verbose) {
                console.log(`✗ ${method} ${path} (ERROR: ${error.message})`);
            }
            
            return result;
        }
    }

    makeRequest(method, path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            
            const requestOptions = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Virtuoso-API-Discovery/1.0',
                    ...options.headers
                },
                timeout: 10000
            };
            
            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });
            
            req.on('error', (error) => {
                // Don't reject on network errors, return as result
                resolve({
                    status: 0,
                    error: error.message,
                    body: ''
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    status: 0,
                    error: 'Request timeout',
                    body: ''
                });
            });
            
            if (options.body) {
                req.write(JSON.stringify(options.body));
            }
            
            req.end();
        });
    }

    normalizePath(path) {
        return path.replace(/{[^}]+}/g, '*');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 Discovery Report');
        console.log('='.repeat(80) + '\n');
        
        const all = Array.from(this.discovered.values());
        const newDiscoveries = all.filter(e => e.discovery);
        const valid = all.filter(e => e.valid);
        const authenticated = all.filter(e => e.authenticated);
        const found = all.filter(e => e.found);
        
        console.log(`Total endpoints tested: ${this.tested.size}`);
        console.log(`Valid responses: ${valid.length}`);
        console.log(`Authenticated: ${authenticated.length}`);
        console.log(`Found (not 404): ${found.length}`);
        console.log(`New discoveries: ${newDiscoveries.length}`);
        
        if (newDiscoveries.length > 0) {
            console.log('\n✨ New Endpoints Discovered:');
            console.log('─'.repeat(80));
            
            newDiscoveries.forEach(endpoint => {
                console.log(`  ${endpoint.method.padEnd(7)} ${endpoint.path.padEnd(50)} (${endpoint.statusCode})`);
            });
        }
        
        // Group by status code
        console.log('\n📈 Response Status Distribution:');
        console.log('─'.repeat(80));
        
        const statusGroups = {};
        all.forEach(e => {
            const status = e.statusCode || 'ERROR';
            statusGroups[status] = (statusGroups[status] || 0) + 1;
        });
        
        Object.entries(statusGroups)
            .sort((a, b) => b[1] - a[1])
            .forEach(([status, count]) => {
                const bar = '█'.repeat(Math.min(50, Math.floor(count / 2)));
                console.log(`  ${status.toString().padEnd(5)} ${count.toString().padEnd(5)} ${bar}`);
            });
        
        // Save detailed report
        const reportPath = path.join(__dirname, '..', `discovery-report-${Date.now()}.json`);
        const report = {
            summary: {
                tested: this.tested.size,
                valid: valid.length,
                newDiscoveries: newDiscoveries.length,
                timestamp: new Date().toISOString()
            },
            discoveries: newDiscoveries,
            allEndpoints: Array.from(this.discovered.entries()).map(([key, value]) => ({
                ...value,
                key
            }))
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        // Update schema with discoveries
        if (newDiscoveries.length > 0) {
            this.updateSchema(newDiscoveries);
        }
    }

    updateSchema(discoveries) {
        const schemaPath = path.join(__dirname, '..', 'api-schema.json');
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        
        // Add discovered endpoints to schema
        if (!schema.categories.discovered) {
            schema.categories.discovered = {
                name: "Discovered Endpoints",
                description: "Endpoints found through automated discovery",
                endpoints: []
            };
        }
        
        discoveries.forEach(endpoint => {
            schema.categories.discovered.endpoints.push({
                id: `discovered-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: `${endpoint.method} ${endpoint.path}`,
                method: endpoint.method,
                path: endpoint.path,
                description: "Automatically discovered endpoint",
                authentication: endpoint.authenticated,
                discovered: true,
                discoveredAt: endpoint.timestamp,
                statusCode: endpoint.statusCode
            });
        });
        
        fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
        console.log('✅ Schema updated with discoveries');
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    const token = process.env.VIRTUOSO_API_TOKEN;
    
    if (!token) {
        console.error('❌ VIRTUOSO_API_TOKEN environment variable is required');
        console.log('\nUsage:');
        console.log('  export VIRTUOSO_API_TOKEN="your-token"');
        console.log('  node api-discovery.js [--verbose] [--rate-limit ms]');
        process.exit(1);
    }
    
    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        rateLimit: args.includes('--rate-limit') 
            ? parseInt(args[args.indexOf('--rate-limit') + 1]) 
            : 100
    };
    
    const scanner = new APIDiscoveryScanner(token, options);
    
    scanner.discover().catch(error => {
        console.error('❌ Discovery failed:', error.message);
        process.exit(1);
    });
}

module.exports = APIDiscoveryScanner;