#!/usr/bin/env node

/**
 * Try to create/start an execution first to get a Job ID
 * Maybe we need to initiate something before we can query it
 */

const https = require('https');
const fs = require('fs');

class ExecutionCreator {
    constructor() {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: '9e141010-eca5-43f5-afb9-20dc6c49833f',
            organization: '1964',
            projectId: '4889',
            journeyId: '527218',  // TestSuite ID
            userEmail: 'ed.clarke@spotqa.com'
        };
    }

    async makeRequest(method, endpoint, body = null, description = '') {
        const url = `${this.config.baseUrl}${endpoint}`;
        
        return new Promise((resolve) => {
            console.log(`\n📡 ${description || endpoint}`);
            console.log(`   Method: ${method}`);
            console.log(`   URL: ${url}`);
            
            const urlObj = new URL(url);
            const postData = body ? JSON.stringify(body) : '';
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };
            
            if (postData) {
                options.headers['Content-Length'] = postData.length;
                console.log(`   Body: ${JSON.stringify(body, null, 2)}`);
            }

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
                        try {
                            const jsonData = JSON.parse(data);
                            console.log(`   ✅ Success!`);
                            console.log(`   Response: ${JSON.stringify(jsonData, null, 2).substring(0, 500)}`);
                            resolve({ success: true, data: jsonData });
                        } catch (e) {
                            console.log(`   ✅ Success (non-JSON)`);
                            resolve({ success: true, data: data });
                        }
                    } else {
                        console.log(`   ❌ Failed`);
                        console.log(`   Response: ${data.substring(0, 200)}`);
                        resolve({ success: false, status: res.statusCode, data: data });
                    }
                });
            });
            
            req.on('error', (error) => {
                console.log(`   ❌ Error: ${error.message}`);
                resolve({ success: false, error: error.message });
            });
            
            if (postData) {
                req.write(postData);
            }
            
            req.end();
        });
    }

    async tryCreateExecution() {
        console.log('🚀 Attempting to Create/Start Execution');
        console.log('=' .repeat(50));
        
        // Try different ways to create an execution
        
        // Method 1: Start execution for a testsuite
        console.log('\n📋 Method 1: Start TestSuite Execution');
        await this.makeRequest('POST', `/testsuites/${this.config.journeyId}/execute`, {
            projectId: this.config.projectId
        }, 'Start TestSuite execution');
        
        // Method 2: Create execution with project context
        console.log('\n📋 Method 2: Create Project Execution');
        await this.makeRequest('POST', `/projects/${this.config.projectId}/executions`, {
            testSuiteId: this.config.journeyId
        }, 'Create project execution');
        
        // Method 3: Run journey
        console.log('\n📋 Method 3: Run Journey');
        await this.makeRequest('POST', `/journeys/${this.config.journeyId}/run`, {
            projectId: this.config.projectId
        }, 'Run journey');
        
        // Method 4: Generic execution creation
        console.log('\n📋 Method 4: Generic Execution Create');
        await this.makeRequest('POST', '/executions', {
            projectId: this.config.projectId,
            testSuiteId: this.config.journeyId,
            journeyId: this.config.journeyId
        }, 'Create execution');
        
        // Method 5: Start job
        console.log('\n📋 Method 5: Start Job');
        await this.makeRequest('POST', '/jobs', {
            projectId: this.config.projectId,
            testSuiteId: this.config.journeyId,
            type: 'execution'
        }, 'Start job');
        
        // Method 6: Queue execution
        console.log('\n📋 Method 6: Queue Execution');
        await this.makeRequest('POST', '/queue/execution', {
            projectId: this.config.projectId,
            testSuiteId: this.config.journeyId
        }, 'Queue execution');
    }

    async tryListingMethods() {
        console.log('\n📋 Trying Different Listing Methods');
        console.log('=' .repeat(50));
        
        // Try with different auth headers
        const authVariations = [
            { key: 'Authorization', value: `Bearer ${this.config.token}` },
            { key: 'X-API-Key', value: this.config.token },
            { key: 'X-Auth-Token', value: this.config.token }
        ];
        
        for (const auth of authVariations) {
            console.log(`\n🔑 Testing with ${auth.key}`);
            
            const url = `${this.config.baseUrl}/projects/${this.config.projectId}`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'GET',
                headers: {
                    [auth.key]: auth.value,
                    'Accept': 'application/json'
                }
            };
            
            const result = await new Promise((resolve) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        console.log(`   Status: ${res.statusCode}`);
                        if (res.statusCode === 200) {
                            console.log('   ✅ This auth method works!');
                        }
                        resolve({ status: res.statusCode });
                    });
                });
                req.on('error', () => resolve({ error: true }));
                req.end();
            });
        }
    }

    async checkExecutionExists() {
        console.log('\n📋 Checking if Execution 88715 Exists');
        console.log('=' .repeat(50));
        
        // Maybe it's not a jobId but something else
        const idTypes = [
            { type: 'execution', endpoint: `/executions/88715` },
            { type: 'job', endpoint: `/jobs/88715` },
            { type: 'run', endpoint: `/runs/88715` },
            { type: 'result', endpoint: `/results/88715` },
            { type: 'report', endpoint: `/reports/88715` }
        ];
        
        for (const idType of idTypes) {
            const result = await this.makeRequest('GET', idType.endpoint, null, `Check as ${idType.type}`);
            if (result.success) {
                console.log(`\n✅ FOUND! 88715 is a ${idType.type} ID`);
                return idType;
            }
        }
        
        return null;
    }
}

// Main
async function main() {
    console.log('🔍 Execution Creation and Discovery');
    console.log('=' .repeat(50));
    
    const creator = new ExecutionCreator();
    
    // First check if 88715 exists as different types
    const existingType = await creator.checkExecutionExists();
    
    if (existingType) {
        console.log('\n✅ Execution exists!');
        console.log(`Use endpoint: ${existingType.endpoint}`);
    } else {
        console.log('\n❌ Execution 88715 not found');
        
        // Try to create one
        await creator.tryCreateExecution();
        
        // Try different auth methods
        await creator.tryListingMethods();
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Summary');
    console.log('=' .repeat(50));
    
    console.log('\n💡 Key Finding:');
    console.log('The token is consistently returning 401 Unauthorized');
    console.log('This means either:');
    console.log('1. The token format is wrong');
    console.log('2. The token has expired');
    console.log('3. The token is for a different environment');
    console.log('\n🔧 Please verify in Postman:');
    console.log('1. Copy the EXACT token value from Postman');
    console.log('2. Check if Postman has environment variables set');
    console.log('3. Check Postman Console (View → Show Postman Console)');
    console.log('   to see the actual request being sent');
    console.log('4. Export the working Postman request as cURL');
}

if (require.main === module) {
    main();
}

module.exports = ExecutionCreator;