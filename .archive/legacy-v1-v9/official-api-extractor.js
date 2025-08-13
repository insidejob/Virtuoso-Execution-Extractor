#!/usr/bin/env node

/**
 * Official Virtuoso API Extractor
 * Using documented endpoints from the API documentation
 */

const https = require('https');
const fs = require('fs');

// Configuration - execution 88715 is the jobId
const CONFIG = {
    baseUrl: 'https://api.virtuoso.qa',  // Using official API domain
    token: '9e141010-eca5-43f5-afb9-20dc6c49833f',
    jobId: 88715,  // The execution ID is actually the jobId
    journeyId: 527218,
    projectId: 4889,
    orgId: 1964
};

class VirtuosoOfficialAPIExtractor {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            jobId: CONFIG.jobId,
            journeyId: CONFIG.journeyId,
            apiResponses: {},
            structuredData: null,
            errors: []
        };
        
        // Try different base URLs
        this.baseUrls = [
            'https://api.virtuoso.qa',
            'https://api-app2.virtuoso.qa', 
            'https://app2.virtuoso.qa/api',
            'https://api.virtuoso.qa/api'
        ];
        
        this.currentBaseUrl = null;
    }

    async makeRequest(path, description, baseUrl = null) {
        const url = `${baseUrl || this.currentBaseUrl || CONFIG.baseUrl}${path}`;
        
        return new Promise((resolve) => {
            console.log(`\n📡 ${description}`);
            console.log(`   URL: ${url}`);
            
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${CONFIG.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Organization-Id': CONFIG.orgId,
                    'User-Agent': 'Virtuoso-Official-API/1.0'
                },
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const result = {
                        url: url,
                        status: res.statusCode,
                        headers: res.headers,
                        description: description
                    };
                    
                    if (res.statusCode === 200) {
                        try {
                            result.data = JSON.parse(data);
                            console.log(`   ✅ Success (HTTP ${res.statusCode})`);
                            
                            // If this worked, save the base URL
                            if (baseUrl && !this.currentBaseUrl) {
                                this.currentBaseUrl = baseUrl;
                                console.log(`   🎯 Found working base URL: ${baseUrl}`);
                            }
                        } catch (e) {
                            result.data = data;
                            console.log(`   ⚠️  Non-JSON response`);
                        }
                    } else if (res.statusCode === 301 || res.statusCode === 302) {
                        const redirect = res.headers.location;
                        console.log(`   ↪️  Redirect to: ${redirect}`);
                        result.redirect = redirect;
                    } else {
                        console.log(`   ❌ HTTP ${res.statusCode}`);
                        result.error = `HTTP ${res.statusCode}`;
                    }
                    
                    resolve(result);
                });
            });
            
            req.on('error', (error) => {
                console.log(`   ❌ Error: ${error.message}`);
                resolve({ error: error.message, url: url });
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                console.log(`   ⏱️  Timeout`);
                resolve({ error: 'Timeout', url: url });
            });
            
            req.end();
        });
    }

    async findWorkingBaseUrl() {
        console.log('🔍 Finding working API base URL...');
        console.log('=' .repeat(50));
        
        // Test the status endpoint with each base URL
        for (const baseUrl of this.baseUrls) {
            const result = await this.makeRequest(
                `/executions/${CONFIG.jobId}/status`,
                `Testing ${baseUrl}`,
                baseUrl
            );
            
            if (result.status === 200 && result.data) {
                console.log(`\n✅ Found working API at: ${baseUrl}`);
                this.currentBaseUrl = baseUrl;
                this.results.apiResponses.status = result.data;
                return true;
            }
        }
        
        console.log('\n❌ No working API URL found with current token');
        return false;
    }

    async extractExecutionData() {
        console.log('\n🚀 Extracting Execution Data Using Official API');
        console.log('=' .repeat(50));
        console.log(`Job ID: ${CONFIG.jobId}`);
        console.log(`Journey ID: ${CONFIG.journeyId}`);
        console.log('=' .repeat(50));

        // First, find a working base URL
        const foundApi = await this.findWorkingBaseUrl();
        
        if (!foundApi) {
            console.log('\n⚠️  Could not find working API endpoint');
            console.log('Token may be UI-only or API requires different authentication');
            return this.results;
        }

        // 1. Get execution status (basic info)
        const status = this.results.apiResponses.status || await this.makeRequest(
            `/executions/${CONFIG.jobId}/status`,
            'Execution Status'
        );
        
        if (status.data) {
            this.results.apiResponses.status = status.data;
            
            // Extract suite information if available
            if (status.data.suites) {
                console.log(`\n📦 Found ${status.data.suites.length || 0} suites`);
            }
        }

        // 2. Get detailed execution report (deprecated but might work)
        const detailed = await this.makeRequest(
            `/executions/${CONFIG.jobId}`,
            'Detailed Execution Report (deprecated)'
        );
        
        if (detailed.data) {
            this.results.apiResponses.detailed = detailed.data;
        }

        // 3. Get execution analysis
        const analysis = await this.makeRequest(
            `/executions/analysis/${CONFIG.jobId}`,
            'Execution Analysis'
        );
        
        if (analysis.data) {
            this.results.apiResponses.analysis = analysis.data;
        }

        // 4. Try to get suite/case/step data
        // We need to discover the suite and case IDs first
        if (this.results.apiResponses.status?.suites) {
            const suites = this.results.apiResponses.status.suites;
            
            for (const suite of suites) {
                const suiteId = suite.id || suite.suiteId;
                
                if (!suiteId) continue;
                
                console.log(`\n📋 Processing Suite: ${suiteId}`);
                
                // Try to get cases for this suite
                const casesResult = await this.makeRequest(
                    `/executions/${CONFIG.jobId}/suites/${suiteId}/cases`,
                    `Cases for Suite ${suiteId}`
                );
                
                if (casesResult.data) {
                    const cases = Array.isArray(casesResult.data) ? casesResult.data : [casesResult.data];
                    
                    for (const testCase of cases) {
                        const caseId = testCase.id || testCase.caseId;
                        
                        if (!caseId) continue;
                        
                        // Get steps for this case
                        const stepsResult = await this.makeRequest(
                            `/executions/${CONFIG.jobId}/suites/${suiteId}/cases/${caseId}/steps`,
                            `Steps for Case ${caseId}`
                        );
                        
                        if (stepsResult.data) {
                            if (!this.results.apiResponses.steps) {
                                this.results.apiResponses.steps = [];
                            }
                            this.results.apiResponses.steps.push({
                                suiteId: suiteId,
                                caseId: caseId,
                                steps: stepsResult.data
                            });
                        }
                    }
                }
            }
        }

        // 5. Try alternative patterns from our discovery
        const alternativeEndpoints = [
            {
                path: `/testsuites/${CONFIG.journeyId}`,
                name: 'TestSuite (Journey)'
            },
            {
                path: `/projects/${CONFIG.projectId}/testsuites/${CONFIG.journeyId}`,
                name: 'Project TestSuite'
            },
            {
                path: `/projects/${CONFIG.projectId}/executions/${CONFIG.jobId}`,
                name: 'Project Execution'
            },
            {
                path: `/journeys/${CONFIG.journeyId}`,
                name: 'Journey Direct'
            },
            {
                path: `/runs/${CONFIG.jobId}`,
                name: 'Run (alternative name)'
            }
        ];

        for (const endpoint of alternativeEndpoints) {
            const result = await this.makeRequest(
                endpoint.path,
                endpoint.name
            );
            
            if (result.data) {
                this.results.apiResponses[endpoint.name.toLowerCase().replace(/\s+/g, '_')] = result.data;
            }
        }

        return this.results;
    }

    structureDataForNLP() {
        console.log('\n📊 Structuring Data for NLP Conversion');
        console.log('=' .repeat(50));

        const structured = {
            executionId: CONFIG.jobId,
            journeyId: CONFIG.journeyId,
            projectId: CONFIG.projectId,
            checkpoints: []
        };

        // Try to extract checkpoints and steps from various sources
        
        // From detailed execution report
        if (this.results.apiResponses.detailed?.checkpoints) {
            structured.checkpoints = this.results.apiResponses.detailed.checkpoints;
            console.log(`✅ Found ${structured.checkpoints.length} checkpoints in detailed report`);
        }
        
        // From steps data
        else if (this.results.apiResponses.steps && this.results.apiResponses.steps.length > 0) {
            for (const caseData of this.results.apiResponses.steps) {
                const checkpoint = {
                    name: `Suite ${caseData.suiteId} - Case ${caseData.caseId}`,
                    steps: Array.isArray(caseData.steps) ? caseData.steps : [caseData.steps]
                };
                structured.checkpoints.push(checkpoint);
            }
            console.log(`✅ Structured ${structured.checkpoints.length} checkpoints from suite/case data`);
        }
        
        // From TestSuite data
        else if (this.results.apiResponses.testsuite?.checkpoints) {
            structured.checkpoints = this.results.apiResponses.testsuite.checkpoints;
            console.log(`✅ Found ${structured.checkpoints.length} checkpoints in TestSuite`);
        }
        
        // From Journey data
        else if (this.results.apiResponses.journey_direct?.checkpoints) {
            structured.checkpoints = this.results.apiResponses.journey_direct.checkpoints;
            console.log(`✅ Found ${structured.checkpoints.length} checkpoints in Journey`);
        }

        if (structured.checkpoints.length > 0) {
            this.results.structuredData = structured;
            
            // Count total steps
            let totalSteps = 0;
            structured.checkpoints.forEach(cp => {
                if (cp.steps) {
                    totalSteps += cp.steps.length;
                }
            });
            
            console.log(`📋 Total steps: ${totalSteps}`);
        } else {
            console.log('⚠️  No checkpoint/step data found for structuring');
        }

        return structured;
    }

    saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Save raw API responses
        const rawFilename = `execution_${CONFIG.jobId}_official_api_${timestamp}.json`;
        fs.writeFileSync(rawFilename, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Raw API responses saved to: ${rawFilename}`);
        
        // Save structured data if available
        if (this.results.structuredData && this.results.structuredData.checkpoints.length > 0) {
            const structuredFilename = `execution_${CONFIG.jobId}_structured_${timestamp}.json`;
            fs.writeFileSync(structuredFilename, JSON.stringify(this.results.structuredData, null, 2));
            console.log(`💾 Structured data saved to: ${structuredFilename}`);
            return structuredFilename;
        }
        
        return rawFilename;
    }

    generateReport() {
        console.log('\n' + '=' .repeat(50));
        console.log('📋 Extraction Report');
        console.log('=' .repeat(50));
        
        const endpoints = Object.keys(this.results.apiResponses);
        
        if (endpoints.length > 0) {
            console.log(`\n✅ Successfully retrieved data from ${endpoints.length} endpoints:`);
            endpoints.forEach(endpoint => {
                const data = this.results.apiResponses[endpoint];
                const size = JSON.stringify(data).length;
                console.log(`   • ${endpoint}: ${(size / 1024).toFixed(2)} KB`);
            });
        } else {
            console.log('\n❌ No data retrieved from API');
        }
        
        if (this.results.structuredData) {
            const { checkpoints } = this.results.structuredData;
            let totalSteps = 0;
            checkpoints.forEach(cp => {
                if (cp.steps) totalSteps += cp.steps.length;
            });
            
            console.log('\n📊 Structured Data Summary:');
            console.log(`   • Checkpoints: ${checkpoints.length}`);
            console.log(`   • Total Steps: ${totalSteps}`);
        }
        
        console.log('\n🚀 Next Steps:');
        
        if (this.results.structuredData) {
            console.log('1. ✅ Data successfully extracted!');
            console.log('2. Run NLP converter:');
            console.log(`   node ENHANCED-NLP-CONVERTER.js execution_${CONFIG.jobId}_structured_*.json`);
        } else if (endpoints.length > 0) {
            console.log('1. ⚠️  Partial data extracted');
            console.log('2. Review raw data file for available information');
            console.log('3. May need to use browser extraction for complete data');
        } else {
            console.log('1. ❌ API extraction failed');
            console.log('2. Token may be UI-only');
            console.log('3. Use browser extraction method:');
            console.log('   node terminal-browser-extractor.js');
        }
    }
}

// Main execution
async function main() {
    const extractor = new VirtuosoOfficialAPIExtractor();
    
    try {
        // Extract data using official API endpoints
        await extractor.extractExecutionData();
        
        // Structure data for NLP conversion
        extractor.structureDataForNLP();
        
        // Save results
        const filename = extractor.saveResults();
        
        // Generate report
        extractor.generateReport();
        
        console.log('\n✨ Extraction complete!');
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        console.log('\n💡 Fallback: Use browser extraction method');
        console.log('   node terminal-browser-extractor.js');
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = VirtuosoOfficialAPIExtractor;