#!/usr/bin/env node

/**
 * WORKING API Extractor - Using the CORRECT token and headers
 * Based on the actual working cURL from browser
 */

const https = require('https');
const fs = require('fs');

class WorkingAPIExtractor {
    constructor() {
        // CORRECT CONFIGURATION FROM THE CURL
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',  // The REAL working token!
            sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
            clientId: '1754647483711_e9e9c12_production',
            
            // IDs to test
            testsuiteId: 527211,
            executionId: 88715,
            journeyId: 527218,
            projectId: 4889
        };
        
        this.results = {};
    }

    async makeRequest(endpoint, description = '') {
        const url = `${this.config.baseUrl}${endpoint}`;
        
        return new Promise((resolve) => {
            console.log(`\n📡 ${description || endpoint}`);
            console.log(`   URL: ${url}`);
            
            const urlObj = new URL(url);
            
            // Exact headers from the working cURL
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                    'authorization': `Bearer ${this.config.token}`,
                    'origin': 'https://app2.virtuoso.qa',
                    'referer': 'https://app2.virtuoso.qa/',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'x-v-session-id': this.config.sessionId,
                    'x-virtuoso-client-id': this.config.clientId,
                    'x-virtuoso-client-name': 'Virtuoso UI'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (res.statusCode === 200) {
                        try {
                            const jsonData = JSON.parse(data);
                            console.log(`   ✅ SUCCESS!`);
                            console.log(`   Data preview: ${JSON.stringify(jsonData).substring(0, 200)}...`);
                            
                            resolve({ success: true, data: jsonData });
                        } catch (e) {
                            console.log(`   ✅ Success (non-JSON)`);
                            resolve({ success: true, data: data });
                        }
                    } else {
                        console.log(`   ❌ Failed (${res.statusCode})`);
                        console.log(`   Response: ${data.substring(0, 100)}`);
                        resolve({ success: false, status: res.statusCode, data: data });
                    }
                });
            });
            
            req.on('error', (error) => {
                console.log(`   ❌ Error: ${error.message}`);
                resolve({ success: false, error: error.message });
            });
            
            req.end();
        });
    }

    async extractAllData() {
        console.log('🚀 WORKING API Extractor');
        console.log('=' .repeat(50));
        console.log(`Token: ${this.config.token.substring(0, 20)}...`);
        console.log(`Session: ${this.config.sessionId.substring(0, 20)}...`);
        console.log('=' .repeat(50));

        // Test the original endpoint first
        console.log('\n📋 Phase 1: Original TestSuite');
        const testsuite = await this.makeRequest(
            `/testsuites/${this.config.testsuiteId}?envelope=false`,
            'TestSuite 527211 with envelope=false'
        );
        
        if (testsuite.success) {
            this.results.testsuite = testsuite.data;
            
            // Save immediately
            fs.writeFileSync('testsuite-527211.json', JSON.stringify(testsuite.data, null, 2));
            console.log('   💾 Saved to: testsuite-527211.json');
        }

        // Try other endpoints now that we have working auth
        console.log('\n📋 Phase 2: Execution Data');
        
        const endpoints = [
            `/executions/${this.config.executionId}/status`,
            `/executions/${this.config.executionId}?envelope=false`,
            `/testsuites/${this.config.journeyId}?envelope=false`,
            `/projects/${this.config.projectId}`,
            `/executions/${this.config.executionId}/analysis/${this.config.executionId}`,
            `/executions/${this.config.executionId}/suites/${this.config.journeyId}/cases`
        ];
        
        for (const endpoint of endpoints) {
            const result = await this.makeRequest(endpoint, `Testing ${endpoint}`);
            if (result.success) {
                const key = endpoint.split('/').filter(p => p && !p.includes('?')).join('_');
                this.results[key] = result.data;
                
                // Save successful responses
                const filename = `${key.replace(/[^a-z0-9_]/gi, '_')}.json`;
                fs.writeFileSync(filename, JSON.stringify(result.data, null, 2));
                console.log(`   💾 Saved to: ${filename}`);
            }
        }

        return this.results;
    }

    async processForNLP() {
        console.log('\n📋 Processing for NLP Conversion');
        console.log('=' .repeat(50));
        
        // Structure data for NLP converter
        const structured = {
            executionId: this.config.executionId,
            journeyId: this.config.journeyId,
            checkpoints: []
        };
        
        // Check testsuite data
        if (this.results.testsuite) {
            if (this.results.testsuite.checkpoints) {
                structured.checkpoints = this.results.testsuite.checkpoints;
                console.log(`✅ Found ${structured.checkpoints.length} checkpoints in testsuite`);
            }
            
            // Count steps
            let totalSteps = 0;
            structured.checkpoints.forEach(cp => {
                if (cp.steps) totalSteps += cp.steps.length;
            });
            console.log(`✅ Total steps: ${totalSteps}`);
        }
        
        // Save structured data
        fs.writeFileSync('structured-data.json', JSON.stringify(structured, null, 2));
        console.log('💾 Structured data saved to: structured-data.json');
        
        return structured;
    }

    generateReport() {
        console.log('\n' + '=' .repeat(50));
        console.log('📊 Extraction Report');
        console.log('=' .repeat(50));
        
        const successCount = Object.keys(this.results).length;
        console.log(`\n✅ Successfully extracted ${successCount} endpoints`);
        
        Object.keys(this.results).forEach(key => {
            const data = this.results[key];
            const size = JSON.stringify(data).length;
            console.log(`   • ${key}: ${(size/1024).toFixed(2)} KB`);
        });
        
        console.log('\n🚀 Next Steps:');
        console.log('1. Data successfully extracted!');
        console.log('2. Run NLP converter:');
        console.log('   node ENHANCED-NLP-CONVERTER.js structured-data.json');
        console.log('3. Or process specific files:');
        console.log('   node ENHANCED-NLP-CONVERTER.js testsuite-527211.json');
    }
}

// Main execution
async function main() {
    const extractor = new WorkingAPIExtractor();
    
    // Extract all data
    await extractor.extractAllData();
    
    // Process for NLP
    await extractor.processForNLP();
    
    // Generate report
    extractor.generateReport();
    
    console.log('\n✨ Extraction complete with WORKING credentials!');
}

if (require.main === module) {
    main();
}

module.exports = WorkingAPIExtractor;