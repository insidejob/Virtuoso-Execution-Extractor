#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { VirtuosoAPIClient } = require('./client');
const APIDiscoveryScanner = require('./api-discovery');
const WorkflowEngine = require('./workflow-engine');

class APIValidator {
    constructor(token, options = {}) {
        this.token = token;
        this.client = new VirtuosoAPIClient(token, options);
        this.scanner = new APIDiscoveryScanner(token, options);
        this.engine = new WorkflowEngine(token, options);
        this.results = {
            authentication: null,
            endpoints: [],
            rateLimits: null,
            permissions: null,
            performance: [],
            discoveries: [],
            workflows: []
        };
        this.verbose = options.verbose || false;
    }

    async validateAll() {
        console.log('🔬 Comprehensive API Validation Suite\n');
        console.log('=' .repeat(80) + '\n');
        
        // Phase 1: Authentication validation
        await this.validateAuthentication();
        
        // Phase 2: Validate all documented endpoints
        await this.validateDocumentedEndpoints();
        
        // Phase 3: Discover hidden endpoints
        await this.discoverHiddenEndpoints();
        
        // Phase 4: Test rate limits
        await this.testRateLimits();
        
        // Phase 5: Check permissions
        await this.checkPermissions();
        
        // Phase 6: Performance benchmarks
        await this.performanceBenchmarks();
        
        // Phase 7: Test workflows
        await this.testWorkflows();
        
        // Generate comprehensive report
        await this.generateComprehensiveReport();
    }

    async validateAuthentication() {
        console.log('🔐 Phase 1: Authentication Validation\n');
        
        const tests = {
            validToken: false,
            tokenType: null,
            userDetails: null,
            expirationCheck: false,
            headerFormats: []
        };
        
        try {
            // Test basic authentication
            const userResponse = await this.client.getUser();
            tests.validToken = true;
            tests.userDetails = userResponse.data;
            console.log('✅ Token is valid');
            console.log(`   User: ${tests.userDetails.email || tests.userDetails.name || 'Unknown'}`);
            
            // Test different header formats
            const headerTests = [
                { format: 'Bearer', header: `Bearer ${this.token}` },
                { format: 'Token', header: `Token ${this.token}` },
                { format: 'Basic', header: `Basic ${Buffer.from(this.token).toString('base64')}` }
            ];
            
            for (const test of headerTests) {
                try {
                    await this.client.request('GET', '/user', {
                        headers: { 'Authorization': test.header }
                    });
                    tests.headerFormats.push(test.format);
                } catch (e) {
                    // Header format not supported
                }
            }
            
            console.log(`   Supported formats: ${tests.headerFormats.join(', ')}`);
            
            // Determine token type
            if (tests.userDetails.permissions) {
                const perms = tests.userDetails.permissions;
                if (perms.includes('ALL') || perms.includes('*')) {
                    tests.tokenType = 'ALL';
                } else if (perms.includes('BRIDGE')) {
                    tests.tokenType = 'BRIDGE';
                } else {
                    tests.tokenType = 'LIMITED';
                }
            }
            
            console.log(`   Token type: ${tests.tokenType || 'Unknown'}`);
            
        } catch (error) {
            console.log('❌ Authentication failed:', error.message);
            tests.error = error.message;
        }
        
        this.results.authentication = tests;
        console.log('');
    }

    async validateDocumentedEndpoints() {
        console.log('📋 Phase 2: Validating Documented Endpoints\n');
        
        const schemaPath = path.join(__dirname, '..', 'api-schema.json');
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        
        let totalEndpoints = 0;
        let validEndpoints = 0;
        
        for (const category of Object.values(schema.categories)) {
            if (!category.endpoints) continue;
            
            for (const endpoint of category.endpoints) {
                totalEndpoints++;
                
                const result = await this.validateEndpoint(endpoint);
                this.results.endpoints.push(result);
                
                if (result.valid) {
                    validEndpoints++;
                    console.log(`✅ ${endpoint.method} ${endpoint.path}`);
                } else {
                    console.log(`❌ ${endpoint.method} ${endpoint.path} - ${result.error || result.statusCode}`);
                }
                
                await this.delay(100); // Rate limiting
            }
        }
        
        console.log(`\nValidation complete: ${validEndpoints}/${totalEndpoints} endpoints valid\n`);
    }

    async validateEndpoint(endpoint) {
        const result = {
            id: endpoint.id,
            method: endpoint.method,
            path: endpoint.path,
            valid: false,
            statusCode: null,
            responseTime: null,
            hasExpectedStructure: false
        };
        
        try {
            // Prepare path with test data
            let actualPath = endpoint.path;
            const testParams = {};
            
            // Replace path parameters with test values
            if (endpoint.parameters) {
                endpoint.parameters.forEach(param => {
                    if (param.type === 'path') {
                        const testValue = this.getTestValue(param.name);
                        actualPath = actualPath.replace(`{${param.name}}`, testValue);
                        testParams[param.name] = testValue;
                    }
                });
            }
            
            const startTime = Date.now();
            const response = await this.client.request(endpoint.method, actualPath);
            result.responseTime = Date.now() - startTime;
            
            result.statusCode = response.status;
            result.valid = response.status < 400;
            
            // Validate response structure if example is provided
            if (endpoint.example && endpoint.example.response) {
                result.hasExpectedStructure = this.validateResponseStructure(
                    response.data,
                    endpoint.example.response
                );
            }
            
        } catch (error) {
            result.error = error.message;
            result.statusCode = error.response?.status;
        }
        
        return result;
    }

    validateResponseStructure(actual, expected) {
        if (!actual || !expected) return false;
        
        if (typeof expected === 'object') {
            for (const key of Object.keys(expected)) {
                if (!(key in actual)) {
                    return false;
                }
            }
        }
        
        return true;
    }

    getTestValue(paramName) {
        const testValues = {
            project_id: process.env.VIRTUOSO_TEST_PROJECT_ID || 'test-project',
            goal_id: process.env.VIRTUOSO_TEST_GOAL_ID || 'test-goal',
            user_id: process.env.VIRTUOSO_TEST_USER_ID || 'test-user',
            id: 'test-id'
        };
        
        return testValues[paramName] || 'test-value';
    }

    async discoverHiddenEndpoints() {
        console.log('🔍 Phase 3: Discovering Hidden Endpoints\n');
        
        // Use limited discovery for validation
        const discoveryOptions = {
            verbose: false,
            rateLimit: 200,
            maxDepth: 2
        };
        
        const scanner = new APIDiscoveryScanner(this.token, discoveryOptions);
        
        // Test a subset of patterns
        const testPatterns = [
            '/api/v2/user',
            '/api/metrics',
            '/api/webhooks',
            '/api/executions',
            '/api/reports',
            '/api/analytics',
            '/graphql',
            '/api/organizations',
            '/api/permissions',
            '/api/logs'
        ];
        
        for (const pattern of testPatterns) {
            const result = await scanner.testEndpoint('GET', pattern);
            
            if (result && result.found && result.statusCode < 400) {
                console.log(`✨ Found: GET ${pattern} (${result.statusCode})`);
                this.results.discoveries.push(result);
            }
            
            await this.delay(200);
        }
        
        console.log(`\nDiscovered ${this.results.discoveries.length} new endpoints\n`);
    }

    async testRateLimits() {
        console.log('⚡ Phase 4: Testing Rate Limits\n');
        
        const rateLimitTest = {
            requestsPerSecond: 0,
            burstLimit: 0,
            headers: {},
            throttled: false
        };
        
        // Test burst requests
        const burstSize = 20;
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < burstSize; i++) {
            promises.push(
                this.client.request('GET', '/user')
                    .then(r => ({ success: true, headers: r.headers }))
                    .catch(e => ({ success: false, status: e.response?.status }))
            );
        }
        
        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;
        
        const successful = results.filter(r => r.success).length;
        const rateLimited = results.filter(r => r.status === 429).length;
        
        rateLimitTest.requestsPerSecond = Math.floor((successful * 1000) / duration);
        rateLimitTest.burstLimit = successful;
        rateLimitTest.throttled = rateLimited > 0;
        
        // Check for rate limit headers
        const successfulResponse = results.find(r => r.success);
        if (successfulResponse?.headers) {
            const headers = successfulResponse.headers;
            rateLimitTest.headers = {
                limit: headers['x-ratelimit-limit'],
                remaining: headers['x-ratelimit-remaining'],
                reset: headers['x-ratelimit-reset']
            };
        }
        
        console.log(`   Burst limit: ${rateLimitTest.burstLimit} requests`);
        console.log(`   Max rate: ${rateLimitTest.requestsPerSecond} req/s`);
        console.log(`   Rate limited: ${rateLimitTest.throttled ? 'Yes' : 'No'}`);
        
        if (rateLimitTest.headers.limit) {
            console.log(`   Headers: Limit=${rateLimitTest.headers.limit}, Remaining=${rateLimitTest.headers.remaining}`);
        }
        
        this.results.rateLimits = rateLimitTest;
        console.log('');
    }

    async checkPermissions() {
        console.log('🔒 Phase 5: Checking Permissions\n');
        
        const permissions = {
            read: {},
            write: {},
            execute: {},
            admin: {}
        };
        
        // Test read permissions
        const readTests = [
            { path: '/user', resource: 'user' },
            { path: '/projects', resource: 'projects' },
            { path: '/organizations', resource: 'organizations' }
        ];
        
        for (const test of readTests) {
            try {
                await this.client.request('GET', test.path);
                permissions.read[test.resource] = true;
                console.log(`✅ Read access: ${test.resource}`);
            } catch (e) {
                permissions.read[test.resource] = false;
                console.log(`❌ No read access: ${test.resource}`);
            }
        }
        
        // Test write permissions (with dry-run or safe data)
        const writeTests = [
            { method: 'POST', path: '/goals/test/execute', resource: 'execution' }
        ];
        
        for (const test of writeTests) {
            try {
                // Use dry-run or test endpoint if available
                await this.client.request(test.method, test.path, {
                    body: { dryRun: true }
                });
                permissions.write[test.resource] = true;
                console.log(`✅ Write access: ${test.resource}`);
            } catch (e) {
                permissions.write[test.resource] = e.response?.status !== 403;
                console.log(`${permissions.write[test.resource] ? '⚠️' : '❌'} Write access: ${test.resource}`);
            }
        }
        
        this.results.permissions = permissions;
        console.log('');
    }

    async performanceBenchmarks() {
        console.log('📊 Phase 6: Performance Benchmarks\n');
        
        const benchmarks = [];
        
        const endpoints = [
            { name: 'User', method: 'GET', path: '/user' },
            { name: 'Projects', method: 'GET', path: '/projects' }
        ];
        
        for (const endpoint of endpoints) {
            const samples = [];
            
            // Take multiple samples
            for (let i = 0; i < 5; i++) {
                const startTime = Date.now();
                
                try {
                    await this.client.request(endpoint.method, endpoint.path);
                    samples.push(Date.now() - startTime);
                } catch (e) {
                    // Skip failed requests
                }
                
                await this.delay(100);
            }
            
            if (samples.length > 0) {
                const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
                const min = Math.min(...samples);
                const max = Math.max(...samples);
                
                benchmarks.push({
                    endpoint: endpoint.name,
                    samples: samples.length,
                    avg: Math.round(avg),
                    min,
                    max
                });
                
                console.log(`   ${endpoint.name}: avg=${Math.round(avg)}ms, min=${min}ms, max=${max}ms`);
            }
        }
        
        this.results.performance = benchmarks;
        console.log('');
    }

    async testWorkflows() {
        console.log('🔄 Phase 7: Testing Workflows\n');
        
        const workflowTests = [];
        
        // Test natural language parsing
        const commands = [
            'run regression tests',
            'execute smoke tests',
            'start nightly run'
        ];
        
        for (const command of commands) {
            const parsed = this.engine.parseNaturalCommand(command);
            
            if (parsed) {
                workflowTests.push({
                    command,
                    workflow: parsed.workflow,
                    recognized: true
                });
                console.log(`✅ Recognized: "${command}" → ${parsed.workflow}`);
            } else {
                workflowTests.push({
                    command,
                    recognized: false
                });
                console.log(`❌ Not recognized: "${command}"`);
            }
        }
        
        // Test workflow creation
        try {
            const workflow = await this.engine.createWorkflow('test-workflow', {
                name: 'Test Workflow',
                steps: [{ type: 'getAllGoals' }]
            });
            
            workflowTests.push({
                type: 'creation',
                success: true,
                workflowId: workflow.id
            });
            
            console.log(`✅ Workflow creation successful`);
        } catch (e) {
            workflowTests.push({
                type: 'creation',
                success: false,
                error: e.message
            });
            console.log(`❌ Workflow creation failed`);
        }
        
        this.results.workflows = workflowTests;
        console.log('');
    }

    async generateComprehensiveReport() {
        console.log('=' .repeat(80));
        console.log('📊 Comprehensive API Validation Report');
        console.log('=' .repeat(80) + '\n');
        
        // Authentication Summary
        console.log('🔐 Authentication:');
        console.log(`   Valid: ${this.results.authentication?.validToken ? '✅' : '❌'}`);
        console.log(`   Token Type: ${this.results.authentication?.tokenType || 'Unknown'}`);
        console.log('');
        
        // Endpoints Summary
        const validEndpoints = this.results.endpoints.filter(e => e.valid).length;
        const totalEndpoints = this.results.endpoints.length;
        console.log('📋 Documented Endpoints:');
        console.log(`   Valid: ${validEndpoints}/${totalEndpoints} (${((validEndpoints/totalEndpoints) * 100).toFixed(1)}%)`);
        
        const avgResponseTime = this.results.endpoints
            .filter(e => e.responseTime)
            .reduce((sum, e) => sum + e.responseTime, 0) / validEndpoints || 0;
        console.log(`   Avg Response Time: ${Math.round(avgResponseTime)}ms`);
        console.log('');
        
        // Discoveries
        console.log('🔍 Discoveries:');
        console.log(`   New Endpoints Found: ${this.results.discoveries.length}`);
        if (this.results.discoveries.length > 0) {
            this.results.discoveries.slice(0, 5).forEach(d => {
                console.log(`     - ${d.method} ${d.path}`);
            });
        }
        console.log('');
        
        // Rate Limits
        console.log('⚡ Rate Limits:');
        console.log(`   Burst Limit: ${this.results.rateLimits?.burstLimit || 'Unknown'} requests`);
        console.log(`   Max Rate: ${this.results.rateLimits?.requestsPerSecond || 'Unknown'} req/s`);
        console.log('');
        
        // Performance
        console.log('📊 Performance:');
        this.results.performance.forEach(p => {
            console.log(`   ${p.endpoint}: ${p.avg}ms average`);
        });
        console.log('');
        
        // Save detailed report
        const reportPath = path.join(__dirname, '..', `validation-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 Detailed report saved to: ${reportPath}\n`);
        
        // Overall health score
        const healthScore = this.calculateHealthScore();
        console.log(`🎯 Overall API Health Score: ${healthScore}%`);
        
        if (healthScore >= 90) {
            console.log('   Status: Excellent ✨');
        } else if (healthScore >= 70) {
            console.log('   Status: Good ✅');
        } else if (healthScore >= 50) {
            console.log('   Status: Fair ⚠️');
        } else {
            console.log('   Status: Poor ❌');
        }
    }

    calculateHealthScore() {
        let score = 0;
        let maxScore = 0;
        
        // Authentication (20 points)
        maxScore += 20;
        if (this.results.authentication?.validToken) score += 20;
        
        // Endpoint validity (40 points)
        maxScore += 40;
        const validRatio = this.results.endpoints.filter(e => e.valid).length / 
                          (this.results.endpoints.length || 1);
        score += Math.round(validRatio * 40);
        
        // Performance (20 points)
        maxScore += 20;
        const avgTime = this.results.performance.reduce((sum, p) => sum + p.avg, 0) / 
                       (this.results.performance.length || 1);
        if (avgTime < 100) score += 20;
        else if (avgTime < 300) score += 15;
        else if (avgTime < 500) score += 10;
        else if (avgTime < 1000) score += 5;
        
        // Rate limits (10 points)
        maxScore += 10;
        if (this.results.rateLimits && !this.results.rateLimits.throttled) score += 10;
        
        // Discoveries (10 points bonus)
        if (this.results.discoveries.length > 0) {
            score += Math.min(10, this.results.discoveries.length * 2);
            maxScore += 10;
        }
        
        return Math.round((score / maxScore) * 100);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI execution
if (require.main === module) {
    const token = process.env.VIRTUOSO_API_TOKEN;
    
    if (!token) {
        console.error('❌ VIRTUOSO_API_TOKEN environment variable is required\n');
        console.log('This validator will:');
        console.log('  1. Test authentication and token type');
        console.log('  2. Validate all documented endpoints');
        console.log('  3. Discover hidden/undocumented endpoints');
        console.log('  4. Test rate limits and throttling');
        console.log('  5. Check permission levels');
        console.log('  6. Run performance benchmarks');
        console.log('  7. Test workflow automation');
        console.log('  8. Generate comprehensive report');
        console.log('\nUsage:');
        console.log('  export VIRTUOSO_API_TOKEN="your-token"');
        console.log('  node api-validator.js [--verbose]');
        process.exit(1);
    }
    
    const options = {
        verbose: process.argv.includes('--verbose')
    };
    
    const validator = new APIValidator(token, options);
    
    validator.validateAll()
        .then(() => {
            console.log('\n✅ Validation complete!');
        })
        .catch(error => {
            console.error('\n❌ Validation failed:', error.message);
            process.exit(1);
        });
}

module.exports = APIValidator;