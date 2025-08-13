#!/usr/bin/env node

/**
 * Find the correct Job ID by exploring the API
 * The UI execution ID might not be the API jobId
 */

const https = require('https');
const fs = require('fs');

class JobIdFinder {
    constructor() {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: '9e141010-eca5-43f5-afb9-20dc6c49833f',
            organization: '1964',
            projectId: '4889',
            executionId: '88715',  // From UI
            journeyId: '527218',   // From UI
            userEmail: 'ed.clarke@spotqa.com'
        };
        
        this.discoveries = {
            jobs: [],
            executions: [],
            projects: [],
            testsuites: [],
            workingEndpoints: []
        };
    }

    async makeRequest(endpoint, requiresAuth = true, description = '') {
        const url = `${this.config.baseUrl}${endpoint}`;
        
        return new Promise((resolve) => {
            console.log(`\n📡 ${description || endpoint}`);
            console.log(`   URL: ${url}`);
            console.log(`   Auth: ${requiresAuth ? 'Yes' : 'No'}`);
            
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };
            
            if (requiresAuth) {
                options.headers['Authorization'] = `Bearer ${this.config.token}`;
            }

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
                            console.log(`   ✅ Success!`);
                            
                            // Look for IDs in the response
                            this.extractIds(jsonData, endpoint);
                            
                            // Save working endpoint
                            this.discoveries.workingEndpoints.push({
                                endpoint,
                                requiresAuth,
                                data: jsonData
                            });
                            
                            resolve({ success: true, data: jsonData });
                        } catch (e) {
                            console.log(`   ⚠️  Non-JSON response`);
                            resolve({ success: false, data: data });
                        }
                    } else {
                        console.log(`   ❌ Failed (${res.statusCode})`);
                        resolve({ success: false, status: res.statusCode });
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

    extractIds(data, endpoint) {
        // Recursively search for IDs
        const searchForIds = (obj, path = '') => {
            if (!obj) return;
            
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    searchForIds(item, `${path}[${index}]`);
                });
            } else if (typeof obj === 'object') {
                Object.keys(obj).forEach(key => {
                    const value = obj[key];
                    const keyLower = key.toLowerCase();
                    
                    // Look for job IDs
                    if (keyLower.includes('jobid') || keyLower === 'job_id' || keyLower === 'id' && path.includes('job')) {
                        console.log(`   📌 Found Job ID: ${value} at ${path}.${key}`);
                        this.discoveries.jobs.push({ id: value, path: `${path}.${key}`, endpoint });
                    }
                    
                    // Look for execution IDs
                    if (keyLower.includes('execution') && keyLower.includes('id')) {
                        console.log(`   📌 Found Execution ID: ${value} at ${path}.${key}`);
                        this.discoveries.executions.push({ id: value, path: `${path}.${key}`, endpoint });
                    }
                    
                    // Look for test suite IDs
                    if (keyLower.includes('suite') || keyLower.includes('testsuite')) {
                        if (typeof value === 'string' || typeof value === 'number') {
                            console.log(`   📌 Found Suite ID: ${value} at ${path}.${key}`);
                            this.discoveries.testsuites.push({ id: value, path: `${path}.${key}`, endpoint });
                        }
                    }
                    
                    // Recurse
                    if (typeof value === 'object') {
                        searchForIds(value, `${path}.${key}`);
                    }
                });
            }
        };
        
        searchForIds(data);
    }

    async exploreAPI() {
        console.log('🔍 API Explorer - Finding Job IDs');
        console.log('=' .repeat(50));
        console.log(`UI Execution ID: ${this.config.executionId}`);
        console.log(`Project ID: ${this.config.projectId}`);
        console.log(`Journey ID: ${this.config.journeyId}`);
        console.log('=' .repeat(50));

        // Phase 1: Try endpoints that might not need auth
        console.log('\n📋 Phase 1: No-Auth Endpoints');
        console.log('-' .repeat(40));
        
        const noAuthEndpoints = [
            '/auth/sso?organization=1964&userEmail=ed.clarke@spotqa.com',
            '/health',
            '/status',
            '/version',
            '/api-docs',
            `/organizations/${this.config.organization}`,
            `/projects`,
            `/projects/${this.config.projectId}`
        ];
        
        for (const endpoint of noAuthEndpoints) {
            await this.makeRequest(endpoint, false, `Testing ${endpoint}`);
        }

        // Phase 2: Try to list resources (with auth)
        console.log('\n📋 Phase 2: List Resources (With Auth)');
        console.log('-' .repeat(40));
        
        const listEndpoints = [
            '/executions',
            '/jobs',
            '/runs',
            '/testsuites',
            '/journeys',
            `/projects/${this.config.projectId}/executions`,
            `/projects/${this.config.projectId}/jobs`,
            `/projects/${this.config.projectId}/testsuites`,
            `/organizations/${this.config.organization}/executions`,
            `/organizations/${this.config.organization}/projects`
        ];
        
        for (const endpoint of listEndpoints) {
            await this.makeRequest(endpoint, true, `Listing ${endpoint}`);
        }

        // Phase 3: Try to get project details
        console.log('\n📋 Phase 3: Project Details');
        console.log('-' .repeat(40));
        
        await this.makeRequest(`/projects/${this.config.projectId}`, true, 'Get project details');
        await this.makeRequest(`/projects/${this.config.projectId}/latest-execution`, true, 'Get latest execution');
        await this.makeRequest(`/projects/${this.config.projectId}/executions/latest`, true, 'Alternative latest execution');

        // Phase 4: Try different ID mappings
        console.log('\n📋 Phase 4: ID Mapping Attempts');
        console.log('-' .repeat(40));
        
        // Maybe the execution ID needs to be mapped
        await this.makeRequest(`/executions/by-ui-id/${this.config.executionId}`, true, 'Map UI ID to Job ID');
        await this.makeRequest(`/ui/executions/${this.config.executionId}`, true, 'UI execution endpoint');
        await this.makeRequest(`/map/execution/${this.config.executionId}`, true, 'Execution mapping');
        
        // Try journey/testsuite mapping
        await this.makeRequest(`/testsuites/${this.config.journeyId}`, true, 'TestSuite by journey ID');
        await this.makeRequest(`/journeys/${this.config.journeyId}`, true, 'Journey details');
        await this.makeRequest(`/journeys/${this.config.journeyId}/executions`, true, 'Journey executions');

        // Phase 5: Try recent executions
        console.log('\n📋 Phase 5: Recent Executions');
        console.log('-' .repeat(40));
        
        const recentEndpoints = [
            '/executions/recent',
            '/executions/latest',
            `/projects/${this.config.projectId}/executions/recent`,
            `/organizations/${this.config.organization}/executions/recent`
        ];
        
        for (const endpoint of recentEndpoints) {
            await this.makeRequest(endpoint, true, `Recent: ${endpoint}`);
        }

        // Phase 6: Try with query parameters
        console.log('\n📋 Phase 6: Query Parameters');
        console.log('-' .repeat(40));
        
        await this.makeRequest(`/executions?project=${this.config.projectId}`, true, 'Executions by project');
        await this.makeRequest(`/executions?uiId=${this.config.executionId}`, true, 'Executions by UI ID');
        await this.makeRequest(`/jobs?executionId=${this.config.executionId}`, true, 'Jobs by execution ID');
    }

    async tryDiscoveredJobIds() {
        if (this.discoveries.jobs.length === 0) {
            console.log('\n⚠️  No Job IDs discovered');
            return;
        }
        
        console.log('\n📋 Phase 7: Testing Discovered Job IDs');
        console.log('-' .repeat(40));
        
        const uniqueJobIds = [...new Set(this.discoveries.jobs.map(j => j.id))];
        
        for (const jobId of uniqueJobIds) {
            console.log(`\n🔑 Testing Job ID: ${jobId}`);
            
            // Try the status endpoint with this job ID
            const result = await this.makeRequest(
                `/executions/${jobId}/status`,
                true,
                `Status for Job ${jobId}`
            );
            
            if (result.success) {
                console.log(`\n✅ FOUND WORKING JOB ID: ${jobId}`);
                console.log('This is the correct Job ID to use!');
                
                // Try more endpoints with this job ID
                await this.makeRequest(`/executions/${jobId}`, true, `Full details for Job ${jobId}`);
                await this.makeRequest(`/executions/analysis/${jobId}`, true, `Analysis for Job ${jobId}`);
                
                return jobId;
            }
        }
    }

    generateReport() {
        console.log('\n' + '=' .repeat(50));
        console.log('📊 Discovery Report');
        console.log('=' .repeat(50));
        
        console.log(`\n✅ Working Endpoints: ${this.discoveries.workingEndpoints.length}`);
        this.discoveries.workingEndpoints.forEach(ep => {
            console.log(`   • ${ep.endpoint} (Auth: ${ep.requiresAuth ? 'Yes' : 'No'})`);
        });
        
        console.log(`\n📌 Discovered Job IDs: ${this.discoveries.jobs.length}`);
        const uniqueJobs = [...new Set(this.discoveries.jobs.map(j => j.id))];
        uniqueJobs.forEach(id => {
            console.log(`   • ${id}`);
        });
        
        console.log(`\n📌 Discovered Execution IDs: ${this.discoveries.executions.length}`);
        const uniqueExecs = [...new Set(this.discoveries.executions.map(e => e.id))];
        uniqueExecs.forEach(id => {
            console.log(`   • ${id}`);
        });
        
        // Save discoveries
        const filename = 'job-id-discoveries.json';
        fs.writeFileSync(filename, JSON.stringify(this.discoveries, null, 2));
        console.log(`\n💾 Full discoveries saved to: ${filename}`);
        
        console.log('\n💡 Key Insights:');
        if (uniqueJobs.length > 0) {
            console.log(`✅ Found ${uniqueJobs.length} potential Job IDs`);
            console.log(`   The UI execution ID (${this.config.executionId}) might map to one of these`);
        } else {
            console.log('❌ No Job IDs found in API responses');
            console.log('   This suggests:');
            console.log('   1. We need to create/start an execution first');
            console.log('   2. Or the token doesn\'t have access to any executions');
            console.log('   3. Or executions are in a different environment');
        }
    }
}

// Main execution
async function main() {
    const finder = new JobIdFinder();
    
    // Explore the API
    await finder.exploreAPI();
    
    // Try any discovered job IDs
    const workingJobId = await finder.tryDiscoveredJobIds();
    
    // Generate report
    finder.generateReport();
    
    if (workingJobId) {
        console.log('\n' + '=' .repeat(50));
        console.log('✅ SUCCESS! Found Working Job ID');
        console.log('=' .repeat(50));
        console.log(`\nUse Job ID: ${workingJobId}`);
        console.log('Update your scripts to use this ID instead of 88715');
    } else {
        console.log('\n' + '=' .repeat(50));
        console.log('📋 Next Steps');
        console.log('=' .repeat(50));
        console.log('\n1. Check if you need to start/create an execution first');
        console.log('2. Try listing executions in Postman to see the format');
        console.log('3. The execution might be in a different project/environment');
    }
}

if (require.main === module) {
    main();
}

module.exports = JobIdFinder;