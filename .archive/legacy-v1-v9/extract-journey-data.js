#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

class VirtuosoJourneyExtractor {
    constructor() {
        this.token = '86defbf4-62a7-4958-a0b4-21af0dee5d7a';
        this.journeyData = {
            project_id: 4889,
            goal_id: 8519,
            version: 28737,
            journey_id: 527286
        };
        this.results = {};
    }

    async extract() {
        console.log('🔍 Extracting Journey Data from Virtuoso\n');
        console.log('Journey URL: https://app2.virtuoso.qa/#/project/4889/goal/8519/v/28737/journey/527286');
        console.log('=' .repeat(80) + '\n');
        
        // Test different API patterns based on the URL structure
        await this.testAPIEndpoints();
        
        // Test GraphQL queries
        await this.testGraphQLQueries();
        
        // Test organization-specific endpoints
        await this.testOrganizationEndpoints();
        
        // Generate report
        this.generateReport();
    }

    async testAPIEndpoints() {
        console.log('📡 Testing API Endpoints\n');
        
        const endpoints = [
            // Direct journey endpoints
            { host: 'api.virtuoso.qa', path: `/api/journeys/${this.journeyData.journey_id}` },
            { host: 'api.virtuoso.qa', path: `/api/journey/${this.journeyData.journey_id}` },
            { host: 'api.virtuoso.qa', path: `/api/projects/${this.journeyData.project_id}/journeys/${this.journeyData.journey_id}` },
            { host: 'api.virtuoso.qa', path: `/api/projects/${this.journeyData.project_id}/goals/${this.journeyData.goal_id}/journeys/${this.journeyData.journey_id}` },
            
            // Steps and checkpoints
            { host: 'api.virtuoso.qa', path: `/api/journeys/${this.journeyData.journey_id}/steps` },
            { host: 'api.virtuoso.qa', path: `/api/journeys/${this.journeyData.journey_id}/checkpoints` },
            { host: 'api.virtuoso.qa', path: `/api/journeys/${this.journeyData.journey_id}/actions` },
            
            // Goal-based access
            { host: 'api.virtuoso.qa', path: `/api/goals/${this.journeyData.goal_id}` },
            { host: 'api.virtuoso.qa', path: `/api/goals/${this.journeyData.goal_id}/journeys` },
            { host: 'api.virtuoso.qa', path: `/api/goals/${this.journeyData.goal_id}/versions/${this.journeyData.version}` },
            
            // Project-based access
            { host: 'api.virtuoso.qa', path: `/api/projects/${this.journeyData.project_id}` },
            { host: 'api.virtuoso.qa', path: `/api/projects/${this.journeyData.project_id}/goals` },
            
            // Organization 1964 specific
            { host: 'api.virtuoso.qa', path: `/api/organizations/1964/projects/${this.journeyData.project_id}` },
            { host: 'api.virtuoso.qa', path: `/api/organizations/1964/journeys/${this.journeyData.journey_id}` },
            
            // Try app2 subdomain patterns
            { host: 'app2.virtuoso.qa', path: `/api/journeys/${this.journeyData.journey_id}` },
            { host: 'app2.virtuoso.qa', path: `/api/projects/${this.journeyData.project_id}/journeys/${this.journeyData.journey_id}` },
            
            // Alternative API patterns
            { host: 'api.virtuoso.qa', path: `/v1/journeys/${this.journeyData.journey_id}` },
            { host: 'api.virtuoso.qa', path: `/v2/journeys/${this.journeyData.journey_id}` },
            { host: 'api.virtuoso.qa', path: `/rest/journeys/${this.journeyData.journey_id}` }
        ];
        
        for (const endpoint of endpoints) {
            const result = await this.makeRequest(endpoint.host, endpoint.path);
            
            if (result.success || result.status === 401) {
                console.log(`  ${result.success ? '✅' : '🔐'} ${endpoint.host}${endpoint.path}`);
                console.log(`     Status: ${result.status}`);
                
                if (result.data && result.data !== 'Not Found') {
                    console.log(`     Data: ${JSON.stringify(result.data).substring(0, 100)}`);
                    this.results[endpoint.path] = result.data;
                }
            }
        }
    }

    async testGraphQLQueries() {
        console.log('\n🔮 Testing GraphQL Queries\n');
        
        const queries = [
            // Query for journey by ID
            {
                query: `
                    query GetJourney {
                        journey(id: ${this.journeyData.journey_id}) {
                            id
                            name
                            steps {
                                id
                                action
                                selector
                                value
                                description
                            }
                            checkpoints {
                                id
                                type
                                expected
                                actual
                            }
                        }
                    }
                `
            },
            
            // Query for project and nested data
            {
                query: `
                    query GetProjectJourney {
                        project(id: ${this.journeyData.project_id}) {
                            id
                            name
                            goals {
                                id
                                journeys {
                                    id
                                    name
                                    steps {
                                        action
                                        selector
                                    }
                                }
                            }
                        }
                    }
                `
            },
            
            // Query for goal details
            {
                query: `
                    query GetGoal {
                        goal(id: ${this.journeyData.goal_id}) {
                            id
                            name
                            journeys {
                                id
                                name
                                version
                                steps {
                                    id
                                    action
                                    description
                                }
                            }
                        }
                    }
                `
            },
            
            // Simple introspection to see available types
            {
                query: `
                    {
                        __type(name: "Journey") {
                            name
                            fields {
                                name
                                type {
                                    name
                                }
                            }
                        }
                    }
                `
            }
        ];
        
        const graphqlEndpoints = [
            { host: 'api.virtuoso.qa', path: '/graphql' },
            { host: 'api.virtuoso.qa', path: '/query' },
            { host: 'app2.virtuoso.qa', path: '/graphql' }
        ];
        
        for (const endpoint of graphqlEndpoints) {
            console.log(`  Testing ${endpoint.host}${endpoint.path}:`);
            
            for (const query of queries) {
                const result = await this.makeRequest(endpoint.host, endpoint.path, {
                    method: 'POST',
                    body: query
                });
                
                if (result.success) {
                    console.log(`    ✅ Query successful`);
                    if (result.data && result.data.data) {
                        console.log(`    Data: ${JSON.stringify(result.data.data).substring(0, 150)}`);
                        this.results[`graphql_${endpoint.path}`] = result.data.data;
                    }
                } else if (result.status === 401) {
                    console.log(`    🔐 Authentication required`);
                }
            }
        }
    }

    async testOrganizationEndpoints() {
        console.log('\n🏢 Testing Organization-Specific Endpoints\n');
        
        // Based on URL structure and organization 1964
        const orgEndpoints = [
            `/api/org/1964/project/${this.journeyData.project_id}/journey/${this.journeyData.journey_id}`,
            `/api/orgs/1964/projects/${this.journeyData.project_id}/goals/${this.journeyData.goal_id}`,
            `/api/organizations/1964/projects/${this.journeyData.project_id}/goals/${this.journeyData.goal_id}/journeys/${this.journeyData.journey_id}`,
            `/api/1964/journeys/${this.journeyData.journey_id}`,
            `/org/1964/api/journeys/${this.journeyData.journey_id}`
        ];
        
        for (const path of orgEndpoints) {
            const result = await this.makeRequest('api.virtuoso.qa', path);
            
            if (result.success || result.status === 401) {
                console.log(`  ${result.success ? '✅' : '🔐'} ${path} (${result.status})`);
                
                if (result.data && result.data !== 'Not Found') {
                    this.results[path] = result.data;
                }
            }
        }
    }

    async makeRequest(host, path, options = {}) {
        return new Promise((resolve) => {
            const requestOptions = {
                hostname: host,
                path: path,
                method: options.method || 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Organization-Id': '1964',
                    'X-Project-Id': this.journeyData.project_id.toString(),
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

    generateReport() {
        console.log('\n' + '=' .repeat(80));
        console.log('📊 Journey Extraction Report');
        console.log('=' .repeat(80) + '\n');
        
        console.log('🎯 Journey Details:');
        console.log(`  Project ID: ${this.journeyData.project_id}`);
        console.log(`  Goal ID: ${this.journeyData.goal_id}`);
        console.log(`  Version: ${this.journeyData.version}`);
        console.log(`  Journey ID: ${this.journeyData.journey_id}`);
        
        console.log('\n📦 Data Extracted:');
        if (Object.keys(this.results).length > 0) {
            Object.entries(this.results).forEach(([key, value]) => {
                console.log(`  ${key}:`);
                console.log(`    ${JSON.stringify(value).substring(0, 200)}`);
            });
        } else {
            console.log('  No data successfully extracted with current token');
        }
        
        console.log('\n💡 Alternative Approaches:');
        console.log('\n1. Browser DevTools Method:');
        console.log('   a. Open the journey URL in Chrome');
        console.log('   b. Press F12 to open DevTools');
        console.log('   c. Go to Network tab');
        console.log('   d. Refresh the page');
        console.log('   e. Look for API calls containing:');
        console.log('      - "527286" (journey ID)');
        console.log('      - "steps"');
        console.log('      - "checkpoints"');
        console.log('   f. Copy the response JSON');
        
        console.log('\n2. Browser Console Method:');
        console.log('   Run this in browser console while on the journey page:');
        console.log('   ```javascript');
        console.log('   // Check for data in window object');
        console.log('   console.log(window.__INITIAL_STATE__);');
        console.log('   console.log(window.journeyData);');
        console.log('   ');
        console.log('   // Check Angular scope (if using Angular)');
        console.log('   angular.element(document.querySelector("[ng-controller]")).scope();');
        console.log('   ');
        console.log('   // Check React props (if using React)');
        console.log('   const reactRoot = document.querySelector("#root")._reactInternalFiber;');
        console.log('   console.log(reactRoot);');
        console.log('   ```');
        
        console.log('\n3. Export Feature:');
        console.log('   Look for export buttons in the UI:');
        console.log('   - Three dots menu (⋮)');
        console.log('   - Download/Export button');
        console.log('   - Share options');
        console.log('   - API/Integration settings');
        
        // Save results
        const report = {
            timestamp: new Date().toISOString(),
            journey: this.journeyData,
            extractedData: this.results,
            summary: {
                dataPointsExtracted: Object.keys(this.results).length,
                authenticationIssues: true,
                recommendation: 'Need proper API token or use browser extraction'
            }
        };
        
        const reportPath = path.join(__dirname, `journey-extraction-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n📄 Report saved to: ${reportPath}`);
    }
}

// Run extraction
if (require.main === module) {
    const extractor = new VirtuosoJourneyExtractor();
    extractor.extract().catch(console.error);
}

module.exports = VirtuosoJourneyExtractor;