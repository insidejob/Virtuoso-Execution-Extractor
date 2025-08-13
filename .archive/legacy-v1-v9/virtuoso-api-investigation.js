#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

class VirtuosoAPIInvestigator {
    constructor() {
        this.token = '86defbf4-62a7-4958-a0b4-21af0dee5d7a';
        this.journeyDetails = {
            project_id: 4889,
            goal_id: 8519,
            version: 28737,
            journey_id: 527286,
            organization_id: 1964
        };
        this.findings = [];
    }

    async investigate() {
        console.log('🔬 Virtuoso API Deep Investigation\n');
        console.log('Target: Journey 527286 (Project 4889, Goal 8519, Version 28737)');
        console.log('=' .repeat(80) + '\n');
        
        // Based on Virtuoso documentation patterns, test these specific endpoints
        await this.testDocumentedPatterns();
        
        // Test Virtuoso-specific API patterns
        await this.testVirtuosoSpecificPatterns();
        
        // Test TestSuite execution patterns (Virtuoso calls journeys "testsuites")
        await this.testTestSuitePatterns();
        
        // Test snapshot/version patterns
        await this.testSnapshotPatterns();
        
        // Generate comprehensive report
        this.generateReport();
    }

    async testDocumentedPatterns() {
        console.log('📚 Testing Documented Virtuoso Patterns\n');
        
        // From Virtuoso docs: /api/testsuites/{id}/execute
        // Journeys might be called testsuites internally
        const endpoints = [
            // TestSuite patterns (Virtuoso terminology)
            { path: `/api/testsuites/${this.journeyDetails.journey_id}`, desc: 'TestSuite by ID' },
            { path: `/api/testsuites/${this.journeyDetails.journey_id}/steps`, desc: 'TestSuite steps' },
            { path: `/api/testsuites/${this.journeyDetails.journey_id}/checkpoints`, desc: 'TestSuite checkpoints' },
            { path: `/api/testsuites/${this.journeyDetails.journey_id}/execute`, desc: 'Execute TestSuite' },
            
            // Goal-based access (documented pattern)
            { path: `/api/goals/${this.journeyDetails.goal_id}/testsuites`, desc: 'Goal TestSuites' },
            { path: `/api/goals/${this.journeyDetails.goal_id}/journeys`, desc: 'Goal Journeys' },
            { path: `/api/goals/${this.journeyDetails.goal_id}/execute`, desc: 'Execute Goal' },
            
            // Project hierarchy
            { path: `/api/projects/${this.journeyDetails.project_id}/goals/${this.journeyDetails.goal_id}/journeys`, desc: 'Project>Goal>Journeys' },
            { path: `/api/projects/${this.journeyDetails.project_id}/goals/${this.journeyDetails.goal_id}/testsuites`, desc: 'Project>Goal>TestSuites' },
            
            // Snapshot/Version patterns
            { path: `/api/snapshots/${this.journeyDetails.version}`, desc: 'Snapshot by version' },
            { path: `/api/projects/${this.journeyDetails.project_id}/snapshots/${this.journeyDetails.version}`, desc: 'Project snapshot' },
            
            // Organization-scoped
            { path: `/api/organizations/${this.journeyDetails.organization_id}/projects/${this.journeyDetails.project_id}/goals/${this.journeyDetails.goal_id}/journeys/${this.journeyDetails.journey_id}`, desc: 'Full hierarchy' }
        ];
        
        for (const endpoint of endpoints) {
            await this.testEndpoint('api.virtuoso.qa', endpoint.path, endpoint.desc);
        }
    }

    async testVirtuosoSpecificPatterns() {
        console.log('\n🎯 Testing Virtuoso-Specific Patterns\n');
        
        // Virtuoso might use different terminology
        const virtuosoTerms = [
            'test', 'tests',
            'suite', 'suites',
            'testsuite', 'testsuites',
            'scenario', 'scenarios',
            'journey', 'journeys',
            'execution', 'executions',
            'run', 'runs'
        ];
        
        const patterns = [];
        
        // Generate patterns with Virtuoso terminology
        virtuosoTerms.forEach(term => {
            patterns.push(`/api/${term}/${this.journeyDetails.journey_id}`);
            patterns.push(`/api/${term}/${this.journeyDetails.journey_id}/steps`);
            patterns.push(`/api/${term}/${this.journeyDetails.journey_id}/checkpoints`);
        });
        
        // Test the most likely ones
        const priorityPatterns = [
            `/api/tests/${this.journeyDetails.journey_id}`,
            `/api/suites/${this.journeyDetails.journey_id}`,
            `/api/scenarios/${this.journeyDetails.journey_id}`,
            `/api/executions?journey_id=${this.journeyDetails.journey_id}`,
            `/api/runs?journey_id=${this.journeyDetails.journey_id}`
        ];
        
        for (const pattern of priorityPatterns) {
            await this.testEndpoint('api.virtuoso.qa', pattern, `Virtuoso term: ${pattern}`);
        }
    }

    async testTestSuitePatterns() {
        console.log('\n🧪 Testing TestSuite Execution Patterns\n');
        
        // Based on Virtuoso's execution model
        const executionEndpoints = [
            // Direct execution endpoints
            `/api/execute/journey/${this.journeyDetails.journey_id}`,
            `/api/execute/testsuite/${this.journeyDetails.journey_id}`,
            `/api/execute/goal/${this.journeyDetails.goal_id}`,
            
            // Results/History endpoints
            `/api/results/journey/${this.journeyDetails.journey_id}`,
            `/api/history/journey/${this.journeyDetails.journey_id}`,
            `/api/reports/journey/${this.journeyDetails.journey_id}`,
            
            // Step-specific endpoints
            `/api/steps?journey_id=${this.journeyDetails.journey_id}`,
            `/api/checkpoints?journey_id=${this.journeyDetails.journey_id}`,
            `/api/assertions?journey_id=${this.journeyDetails.journey_id}`,
            
            // Version-specific access
            `/api/versions/${this.journeyDetails.version}/journeys`,
            `/api/versions/${this.journeyDetails.version}/journey/${this.journeyDetails.journey_id}`
        ];
        
        for (const endpoint of executionEndpoints) {
            await this.testEndpoint('api.virtuoso.qa', endpoint, `Execution: ${endpoint}`);
        }
    }

    async testSnapshotPatterns() {
        console.log('\n📸 Testing Snapshot/Version Patterns\n');
        
        // Virtuoso uses snapshots for versioning
        const snapshotEndpoints = [
            `/api/snapshots/${this.journeyDetails.version}/journeys`,
            `/api/snapshots/${this.journeyDetails.version}/journey/${this.journeyDetails.journey_id}`,
            `/api/goals/${this.journeyDetails.goal_id}/snapshots/${this.journeyDetails.version}`,
            `/api/goals/${this.journeyDetails.goal_id}/versions/${this.journeyDetails.version}/journeys`,
            `/api/projects/${this.journeyDetails.project_id}/versions/${this.journeyDetails.version}/journeys/${this.journeyDetails.journey_id}`
        ];
        
        for (const endpoint of snapshotEndpoints) {
            await this.testEndpoint('api.virtuoso.qa', endpoint, `Snapshot: ${endpoint}`);
        }
    }

    async testEndpoint(host, path, description) {
        const result = await this.makeRequest(host, path);
        
        if (result.success) {
            console.log(`✅ SUCCESS: ${description}`);
            console.log(`   URL: https://${host}${path}`);
            console.log(`   Status: ${result.status}`);
            if (result.data) {
                console.log(`   Data: ${JSON.stringify(result.data).substring(0, 100)}`);
            }
            
            this.findings.push({
                success: true,
                url: `https://${host}${path}`,
                description,
                status: result.status,
                data: result.data
            });
        } else if (result.status === 401) {
            console.log(`🔐 AUTH REQUIRED: ${description}`);
            console.log(`   URL: https://${host}${path}`);
            console.log(`   This endpoint exists but needs proper authentication`);
            
            this.findings.push({
                success: false,
                authRequired: true,
                url: `https://${host}${path}`,
                description,
                status: 401
            });
        } else if (result.status === 404) {
            // Don't log 404s to reduce noise
        } else if (result.status) {
            console.log(`⚠️  Status ${result.status}: ${description}`);
        }
    }

    async makeRequest(host, path) {
        return new Promise((resolve) => {
            const options = {
                hostname: host,
                path: path,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Organization-Id': this.journeyDetails.organization_id.toString(),
                    'X-Project-Id': this.journeyDetails.project_id.toString(),
                    'User-Agent': 'VirtuosoAPIInvestigator/1.0'
                },
                timeout: 5000
            };
            
            const req = https.request(options, (res) => {
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
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        data: parsedData
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
                    error: 'Timeout'
                });
            });
            
            req.end();
        });
    }

    generateReport() {
        console.log('\n' + '=' .repeat(80));
        console.log('📊 Investigation Report');
        console.log('=' .repeat(80) + '\n');
        
        const successful = this.findings.filter(f => f.success);
        const authRequired = this.findings.filter(f => f.authRequired);
        
        console.log('✅ Working Endpoints:');
        if (successful.length > 0) {
            successful.forEach(f => {
                console.log(`  ${f.url}`);
            });
        } else {
            console.log('  None found with current token');
        }
        
        console.log('\n🔐 Endpoints Requiring Authentication:');
        if (authRequired.length > 0) {
            authRequired.forEach(f => {
                console.log(`  ${f.url}`);
            });
            
            console.log('\n💡 These endpoints exist but need proper API authentication!');
        } else {
            console.log('  None found');
        }
        
        console.log('\n🎯 Recommended GET Requests:\n');
        console.log('Based on Virtuoso patterns, try these in browser DevTools:');
        console.log('```javascript');
        console.log('// While on the journey page, run in console:');
        console.log('');
        console.log('// Check for API calls in window.fetch');
        console.log('const originalFetch = window.fetch;');
        console.log('window.fetch = function(...args) {');
        console.log('  console.log("API Call:", args[0]);');
        console.log('  return originalFetch.apply(this, args).then(response => {');
        console.log('    response.clone().json().then(data => {');
        console.log('      console.log("Response:", data);');
        console.log('    });');
        console.log('    return response;');
        console.log('  });');
        console.log('};');
        console.log('');
        console.log('// Then refresh the page to see all API calls');
        console.log('```');
        
        console.log('\n📝 Most Likely API Patterns:');
        console.log('  GET /api/testsuites/{journey_id}');
        console.log('  GET /api/testsuites/{journey_id}/steps');
        console.log('  GET /api/testsuites/{journey_id}/checkpoints');
        console.log('  GET /api/goals/{goal_id}/testsuites');
        console.log('  GET /api/projects/{project_id}/goals/{goal_id}/testsuites/{journey_id}');
        
        // Save report
        const report = {
            timestamp: new Date().toISOString(),
            journey: this.journeyDetails,
            findings: this.findings,
            summary: {
                successful: successful.length,
                authRequired: authRequired.length,
                total: this.findings.length
            }
        };
        
        const reportPath = path.join(__dirname, `api-investigation-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n📄 Full report saved to: ${reportPath}`);
    }
}

// Run investigation
if (require.main === module) {
    const investigator = new VirtuosoAPIInvestigator();
    investigator.investigate().catch(console.error);
}

module.exports = VirtuosoAPIInvestigator;