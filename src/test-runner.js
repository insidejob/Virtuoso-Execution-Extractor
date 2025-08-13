#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { VirtuosoAPIClient } = require('./client');

class VirtuosoAPITester {
    constructor(config = {}) {
        this.config = this.loadConfig(config);
        this.schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'api-schema.json'), 'utf8'));
        this.results = [];
        this.client = null;
    }

    loadConfig(userConfig) {
        // Load environment config
        const configPath = path.join(__dirname, '..', 'config', 'environments.json');
        let envConfig = {};
        
        if (fs.existsSync(configPath)) {
            envConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        // Merge with user config
        const environment = userConfig.environment || process.env.VIRTUOSO_ENV || 'development';
        const config = {
            ...envConfig[environment],
            ...userConfig,
            environment
        };

        // Get token from env or config
        config.token = config.token || process.env.VIRTUOSO_API_TOKEN;
        
        return config;
    }

    async initialize() {
        if (!this.config.token) {
            throw new Error('API token is required. Set VIRTUOSO_API_TOKEN environment variable or provide in config.');
        }

        this.client = new VirtuosoAPIClient(this.config.token, {
            baseUrl: this.config.baseUrl
        });

        console.log(`🚀 Initializing Virtuoso API Tester`);
        console.log(`Environment: ${this.config.environment}`);
        console.log(`Base URL: ${this.client.baseUrl}`);
        console.log('─'.repeat(80));
    }

    async testEndpoint(endpoint, params = {}) {
        const startTime = Date.now();
        const result = {
            endpoint: endpoint.id,
            name: endpoint.name,
            method: endpoint.method,
            path: endpoint.path,
            status: 'pending',
            response: null,
            error: null,
            duration: 0
        };

        try {
            console.log(`\nTesting: ${endpoint.method} ${endpoint.path}`);
            
            // Build the actual path with parameters
            let actualPath = endpoint.path;
            if (params.pathParams) {
                Object.entries(params.pathParams).forEach(([key, value]) => {
                    actualPath = actualPath.replace(`{${key}}`, value);
                });
            }

            // Make the request
            const response = await this.client.request(
                endpoint.method,
                actualPath,
                {
                    body: params.body,
                    headers: params.headers
                }
            );

            result.status = 'success';
            result.response = response;
            result.duration = Date.now() - startTime;
            
            console.log(`✅ Success (${response.status}) - ${result.duration}ms`);
            
            // Validate response if schema is provided
            if (endpoint.example && endpoint.example.response) {
                this.validateResponse(response.data, endpoint.example.response);
            }
            
        } catch (error) {
            result.status = 'failed';
            result.error = error.message;
            result.duration = Date.now() - startTime;
            
            if (error.response) {
                result.response = error.response;
                console.log(`❌ Failed (${error.response.status}) - ${error.message}`);
            } else {
                console.log(`❌ Error - ${error.message}`);
            }
        }

        this.results.push(result);
        return result;
    }

    validateResponse(actual, expected) {
        // Basic structure validation
        if (typeof expected === 'object' && expected !== null) {
            Object.keys(expected).forEach(key => {
                if (!(key in actual)) {
                    console.log(`  ⚠️  Missing expected field: ${key}`);
                }
            });
        }
    }

    async testAllEndpoints() {
        console.log('\n📋 Running comprehensive API tests...\n');
        
        for (const category of Object.values(this.schema.categories)) {
            if (!category.endpoints) continue;
            
            console.log(`\n${'='.repeat(80)}`);
            console.log(`📁 Category: ${category.name}`);
            console.log(`${'='.repeat(80)}`);
            
            for (const endpoint of category.endpoints) {
                // Skip endpoints that require specific IDs without mock data
                if (endpoint.path.includes('{') && !this.config.testData) {
                    console.log(`\n⏭️  Skipping ${endpoint.name} (requires parameters)`);
                    continue;
                }
                
                // Use test data if available
                const params = this.getTestParams(endpoint);
                await this.testEndpoint(endpoint, params);
                
                // Add delay between requests to avoid rate limiting
                await this.delay(this.config.requestDelay || 500);
            }
        }
        
        this.generateReport();
    }

    getTestParams(endpoint) {
        const params = {};
        
        // Use configured test data if available
        if (this.config.testData && this.config.testData[endpoint.id]) {
            return this.config.testData[endpoint.id];
        }
        
        // Generate default test parameters
        if (endpoint.parameters) {
            endpoint.parameters.forEach(param => {
                if (param.type === 'path' && param.required) {
                    if (!params.pathParams) params.pathParams = {};
                    
                    // Use default test values
                    switch(param.name) {
                        case 'project_id':
                            params.pathParams[param.name] = this.config.testProjectId || 'test-project';
                            break;
                        case 'goal_id':
                            params.pathParams[param.name] = this.config.testGoalId || 'test-goal';
                            break;
                        default:
                            params.pathParams[param.name] = 'test-id';
                    }
                }
            });
        }
        
        return params;
    }

    async testSpecificEndpoints(endpointIds) {
        console.log(`\n📋 Testing specific endpoints: ${endpointIds.join(', ')}\n`);
        
        for (const id of endpointIds) {
            const endpoint = this.findEndpoint(id);
            if (!endpoint) {
                console.log(`❓ Endpoint not found: ${id}`);
                continue;
            }
            
            const params = this.getTestParams(endpoint);
            await this.testEndpoint(endpoint, params);
        }
        
        this.generateReport();
    }

    findEndpoint(id) {
        for (const category of Object.values(this.schema.categories)) {
            if (!category.endpoints) continue;
            
            const endpoint = category.endpoints.find(e => e.id === id);
            if (endpoint) return endpoint;
        }
        return null;
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 Test Results Summary');
        console.log('='.repeat(80));
        
        const successful = this.results.filter(r => r.status === 'success').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const total = this.results.length;
        
        console.log(`\nTotal Tests: ${total}`);
        console.log(`✅ Successful: ${successful}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
        
        // Average response time
        const successfulResults = this.results.filter(r => r.status === 'success');
        if (successfulResults.length > 0) {
            const avgTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
            console.log(`Average Response Time: ${avgTime.toFixed(0)}ms`);
        }
        
        // Failed endpoints details
        if (failed > 0) {
            console.log('\n❌ Failed Endpoints:');
            this.results.filter(r => r.status === 'failed').forEach(r => {
                console.log(`  - ${r.method} ${r.path}: ${r.error}`);
            });
        }
        
        // Save detailed report
        const reportPath = path.join(__dirname, '..', `test-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }

    async runMockTest() {
        console.log('\n🧪 Running mock test (no actual API calls)...\n');
        
        // Test the search functionality
        const APISearcher = require('./search');
        const searcher = new APISearcher();
        
        console.log('Testing search functionality:');
        
        // Test various searches
        const testQueries = [
            'user',
            'GET project',
            'execute',
            'POST',
            'authentication'
        ];
        
        testQueries.forEach(query => {
            const results = searcher.search(query, { limit: 3 });
            console.log(`\nQuery: "${query}" - Found ${results.length} results`);
            if (results.length > 0) {
                console.log(`  Top result: ${results[0].name} (${results[0].method} ${results[0].path || results[0].type})`);
            }
        });
        
        console.log('\n✅ Mock test completed successfully!');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const tester = new VirtuosoAPITester();
    
    const runTests = async () => {
        try {
            if (args.includes('--mock')) {
                // Run mock test without API calls
                await tester.runMockTest();
            } else {
                // Initialize with real API
                await tester.initialize();
                
                if (args.includes('--all')) {
                    // Test all endpoints
                    await tester.testAllEndpoints();
                } else if (args.includes('--endpoint')) {
                    // Test specific endpoints
                    const endpointIndex = args.indexOf('--endpoint');
                    const endpointIds = args[endpointIndex + 1].split(',');
                    await tester.testSpecificEndpoints(endpointIds);
                } else {
                    // Default: show available options
                    console.log('\nUsage:');
                    console.log('  node test-runner.js --mock           Run mock tests (no API calls)');
                    console.log('  node test-runner.js --all            Test all endpoints');
                    console.log('  node test-runner.js --endpoint id    Test specific endpoint(s)');
                    console.log('\nEnvironment Variables:');
                    console.log('  VIRTUOSO_API_TOKEN    Your API token');
                    console.log('  VIRTUOSO_ENV          Environment (development/staging/production)');
                    
                    if (!process.env.VIRTUOSO_API_TOKEN) {
                        console.log('\n⚠️  No API token found. Set VIRTUOSO_API_TOKEN to run real tests.');
                        console.log('Running mock test instead...');
                        await tester.runMockTest();
                    }
                }
            }
        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            process.exit(1);
        }
    };
    
    runTests();
}

module.exports = VirtuosoAPITester;