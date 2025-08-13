#!/usr/bin/env node

/**
 * Terminal-based Execution 88715 Extraction via API
 * Uses all discovered API patterns from our analysis
 */

const https = require('https');
const fs = require('fs');

// Configuration from our discovered patterns
const CONFIG = {
    baseUrl: 'https://api-app2.virtuoso.qa/api',
    token: '9e141010-eca5-43f5-afb9-20dc6c49833f',
    executionId: 88715,
    journeyId: 527218,
    projectId: 4889,
    orgId: 1964
};

class VirtuosoAPIExtractor {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            executionId: CONFIG.executionId,
            journeyId: CONFIG.journeyId,
            projectId: CONFIG.projectId,
            apiCalls: [],
            extractedData: {},
            errors: []
        };
    }

    // Make API request with proper headers
    async makeRequest(path, description) {
        return new Promise((resolve, reject) => {
            const url = new URL(CONFIG.baseUrl + path);
            
            console.log(`\n📡 ${description}`);
            console.log(`   URL: ${url.href}`);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${CONFIG.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Organization-Id': CONFIG.orgId,
                    'User-Agent': 'Virtuoso-API-Extractor/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const result = {
                        url: url.href,
                        status: res.statusCode,
                        headers: res.headers,
                        description: description
                    };
                    
                    try {
                        result.data = JSON.parse(data);
                        if (res.statusCode === 200) {
                            console.log(`   ✅ Success (${res.statusCode})`);
                        } else {
                            console.log(`   ⚠️  Status ${res.statusCode}`);
                        }
                    } catch (e) {
                        result.data = data;
                        console.log(`   ⚠️  Non-JSON response`);
                    }
                    
                    this.results.apiCalls.push(result);
                    resolve(result);
                });
            });
            
            req.on('error', (error) => {
                console.log(`   ❌ Error: ${error.message}`);
                this.results.errors.push({
                    url: url.href,
                    error: error.message,
                    description: description
                });
                resolve({ error: error.message, url: url.href });
            });
            
            req.end();
        });
    }

    // Try all discovered API patterns
    async extractAllData() {
        console.log('🚀 Virtuoso API Execution Extractor');
        console.log('=' .repeat(50));
        console.log(`Execution: ${CONFIG.executionId}`);
        console.log(`Journey: ${CONFIG.journeyId}`);
        console.log(`Project: ${CONFIG.projectId}`);
        console.log('=' .repeat(50));

        // Pattern 1: Direct execution endpoint
        const execution = await this.makeRequest(
            `/executions/${CONFIG.executionId}`,
            'Fetching execution details'
        );
        if (execution.data && !execution.error) {
            this.results.extractedData.execution = execution.data;
        }

        // Pattern 2: Execution with journey
        const executionJourney = await this.makeRequest(
            `/executions/${CONFIG.executionId}/journeys/${CONFIG.journeyId}`,
            'Fetching execution journey details'
        );
        if (executionJourney.data && !executionJourney.error) {
            this.results.extractedData.executionJourney = executionJourney.data;
        }

        // Pattern 3: Project execution endpoint
        const projectExecution = await this.makeRequest(
            `/projects/${CONFIG.projectId}/executions/${CONFIG.executionId}`,
            'Fetching project execution'
        );
        if (projectExecution.data && !projectExecution.error) {
            this.results.extractedData.projectExecution = projectExecution.data;
        }

        // Pattern 4: TestSuite endpoint (journeys are called testsuites)
        const testSuite = await this.makeRequest(
            `/projects/${CONFIG.projectId}/testsuites/${CONFIG.journeyId}`,
            'Fetching journey as testsuite'
        );
        if (testSuite.data && !testSuite.error) {
            this.results.extractedData.testSuite = testSuite.data;
        }

        // Pattern 5: Execution checkpoints
        const checkpoints = await this.makeRequest(
            `/executions/${CONFIG.executionId}/checkpoints`,
            'Fetching execution checkpoints'
        );
        if (checkpoints.data && !checkpoints.error) {
            this.results.extractedData.checkpoints = checkpoints.data;
        }

        // Pattern 6: Execution steps
        const steps = await this.makeRequest(
            `/executions/${CONFIG.executionId}/steps`,
            'Fetching execution steps'
        );
        if (steps.data && !steps.error) {
            this.results.extractedData.steps = steps.data;
        }

        // Pattern 7: Journey/TestSuite steps
        const journeySteps = await this.makeRequest(
            `/projects/${CONFIG.projectId}/testsuites/${CONFIG.journeyId}/steps`,
            'Fetching journey steps'
        );
        if (journeySteps.data && !journeySteps.error) {
            this.results.extractedData.journeySteps = journeySteps.data;
        }

        // Pattern 8: Screenshots
        const screenshots = await this.makeRequest(
            `/executions/${CONFIG.executionId}/screenshots`,
            'Fetching screenshots'
        );
        if (screenshots.data && !screenshots.error) {
            this.results.extractedData.screenshots = screenshots.data;
        }

        // Pattern 9: Logs
        const logs = await this.makeRequest(
            `/executions/${CONFIG.executionId}/logs`,
            'Fetching execution logs'
        );
        if (logs.data && !logs.error) {
            this.results.extractedData.logs = logs.data;
        }

        // Pattern 10: Results
        const results = await this.makeRequest(
            `/executions/${CONFIG.executionId}/results`,
            'Fetching execution results'
        );
        if (results.data && !results.error) {
            this.results.extractedData.results = results.data;
        }

        // Pattern 11: Test data
        const testData = await this.makeRequest(
            `/projects/${CONFIG.projectId}/testdata/${CONFIG.journeyId}`,
            'Fetching test data'
        );
        if (testData.data && !testData.error) {
            this.results.extractedData.testData = testData.data;
        }

        // Pattern 12: Journey metadata
        const metadata = await this.makeRequest(
            `/journeys/${CONFIG.journeyId}/metadata`,
            'Fetching journey metadata'
        );
        if (metadata.data && !metadata.error) {
            this.results.extractedData.metadata = metadata.data;
        }

        // Pattern 13: Organization project endpoint
        const orgProject = await this.makeRequest(
            `/organizations/${CONFIG.orgId}/projects/${CONFIG.projectId}/executions/${CONFIG.executionId}`,
            'Fetching via organization endpoint'
        );
        if (orgProject.data && !orgProject.error) {
            this.results.extractedData.orgProject = orgProject.data;
        }

        // Pattern 14: GraphQL attempt
        const graphqlQuery = {
            query: `
                query GetExecution {
                    execution(id: ${CONFIG.executionId}) {
                        id
                        status
                        journey {
                            id
                            name
                            checkpoints {
                                name
                                steps {
                                    action
                                    selector
                                    value
                                    status
                                }
                            }
                        }
                    }
                }
            `
        };
        
        // GraphQL endpoint if available
        const graphql = await this.makeGraphQLRequest(graphqlQuery, 'Attempting GraphQL query');
        if (graphql.data && !graphql.error) {
            this.results.extractedData.graphql = graphql.data;
        }

        return this.results;
    }

    // GraphQL request helper
    async makeGraphQLRequest(query, description) {
        return new Promise((resolve, reject) => {
            const url = new URL(CONFIG.baseUrl.replace('/api', '/graphql'));
            
            console.log(`\n🔷 ${description}`);
            console.log(`   URL: ${url.href}`);
            
            const postData = JSON.stringify(query);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.token}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'X-Organization-Id': CONFIG.orgId
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const result = {
                        url: url.href,
                        status: res.statusCode,
                        description: description
                    };
                    
                    try {
                        result.data = JSON.parse(data);
                        if (res.statusCode === 200) {
                            console.log(`   ✅ GraphQL Success`);
                        } else {
                            console.log(`   ⚠️  GraphQL Status ${res.statusCode}`);
                        }
                    } catch (e) {
                        result.data = data;
                    }
                    
                    resolve(result);
                });
            });
            
            req.on('error', (error) => {
                console.log(`   ❌ GraphQL Error: ${error.message}`);
                resolve({ error: error.message });
            });
            
            req.write(postData);
            req.end();
        });
    }

    // Process and structure the extracted data
    processExtractedData() {
        console.log('\n' + '=' .repeat(50));
        console.log('📊 Processing Extracted Data');
        console.log('=' .repeat(50));

        const successfulCalls = this.results.apiCalls.filter(call => 
            call.status === 200 && call.data
        );

        console.log(`\nSuccessful API calls: ${successfulCalls.length}`);
        console.log(`Failed API calls: ${this.results.errors.length}`);
        console.log(`Total data points: ${Object.keys(this.results.extractedData).length}`);

        // Structure checkpoints and steps for NLP conversion
        if (this.results.extractedData.checkpoints || this.results.extractedData.steps) {
            console.log('\n✅ Found checkpoint/step data for NLP conversion');
            
            const structuredData = {
                executionId: CONFIG.executionId,
                journeyId: CONFIG.journeyId,
                checkpoints: []
            };

            // Process checkpoints if available
            if (this.results.extractedData.checkpoints) {
                const checkpoints = Array.isArray(this.results.extractedData.checkpoints) 
                    ? this.results.extractedData.checkpoints 
                    : [this.results.extractedData.checkpoints];
                    
                structuredData.checkpoints = checkpoints;
            }

            // Process steps if available
            if (this.results.extractedData.steps) {
                const steps = Array.isArray(this.results.extractedData.steps)
                    ? this.results.extractedData.steps
                    : [this.results.extractedData.steps];
                    
                if (structuredData.checkpoints.length === 0) {
                    structuredData.checkpoints.push({
                        name: 'Execution Steps',
                        steps: steps
                    });
                } else {
                    // Merge steps into checkpoints if needed
                    structuredData.checkpoints[0].steps = steps;
                }
            }

            this.results.structuredData = structuredData;
            console.log(`Structured ${structuredData.checkpoints.length} checkpoints`);
        }

        return this.results;
    }

    // Save results to file
    saveResults() {
        const filename = `execution_${CONFIG.executionId}_api_data.json`;
        fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Results saved to: ${filename}`);
        
        // Save structured data separately if available
        if (this.results.structuredData) {
            const structuredFilename = `execution_${CONFIG.executionId}_structured.json`;
            fs.writeFileSync(structuredFilename, JSON.stringify(this.results.structuredData, null, 2));
            console.log(`💾 Structured data saved to: ${structuredFilename}`);
        }
    }

    // Generate summary report
    generateReport() {
        console.log('\n' + '=' .repeat(50));
        console.log('📋 Extraction Summary Report');
        console.log('=' .repeat(50));

        const report = [];
        
        for (const [key, value] of Object.entries(this.results.extractedData)) {
            if (value && typeof value === 'object') {
                const size = JSON.stringify(value).length;
                const itemCount = Array.isArray(value) ? value.length : Object.keys(value).length;
                report.push({
                    endpoint: key,
                    items: itemCount,
                    size: `${(size / 1024).toFixed(2)} KB`
                });
            }
        }

        if (report.length > 0) {
            console.log('\nExtracted Data:');
            console.table(report);
        }

        if (this.results.errors.length > 0) {
            console.log('\n⚠️  Failed Endpoints:');
            this.results.errors.forEach(err => {
                console.log(`  - ${err.description}: ${err.error}`);
            });
        }

        // Provide next steps
        console.log('\n🚀 Next Steps:');
        console.log('1. Review extracted data in the JSON files');
        console.log('2. Run NLP converter on structured data:');
        console.log(`   node ENHANCED-NLP-CONVERTER.js execution_${CONFIG.executionId}_structured.json`);
        console.log('3. If API access failed, use browser extraction as fallback');
    }
}

// Run extraction
async function main() {
    const extractor = new VirtuosoAPIExtractor();
    
    try {
        await extractor.extractAllData();
        extractor.processExtractedData();
        extractor.saveResults();
        extractor.generateReport();
    } catch (error) {
        console.error('❌ Extraction failed:', error);
        console.log('\n💡 Fallback: Use browser extraction script instead');
    }
}

// Execute if run directly
if (require.main === module) {
    main();
}

module.exports = VirtuosoAPIExtractor;