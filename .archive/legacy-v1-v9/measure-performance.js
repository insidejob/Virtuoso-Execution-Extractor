#!/usr/bin/env node

/**
 * Measure actual performance of wrapper operations
 */

const https = require('https');

const config = {
    baseUrl: 'https://api-app2.virtuoso.qa/api',
    token: '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
    sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
    clientId: '1754647483711_e9e9c12_production'
};

async function timeOperation(name, operation) {
    const start = Date.now();
    try {
        const result = await operation();
        const duration = Date.now() - start;
        console.log(`✅ ${name}: ${duration}ms`);
        return { name, duration, success: true, result };
    } catch (error) {
        const duration = Date.now() - start;
        console.log(`❌ ${name}: ${duration}ms (failed: ${error.message})`);
        return { name, duration, success: false, error: error.message };
    }
}

async function apiRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${config.baseUrl}${endpoint}`;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${config.token}`,
                'x-v-session-id': config.sessionId,
                'x-virtuoso-client-id': config.clientId
            }
        };
        
        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

async function measurePerformance() {
    console.log('⏱️  Measuring Actual Wrapper Performance\n');
    console.log('=' .repeat(50));
    
    const results = [];
    const journeyId = '527211';
    const executionId = '88715';
    const projectId = '4889';
    
    // Measure URL parsing
    results.push(await timeOperation('URL Parsing', async () => {
        const url = "https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527211";
        const patterns = {
            execution: /execution\/(\d+)/,
            journey: /journey\/(\d+)/,
            project: /project\/(\d+)/
        };
        const ids = {};
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = url.match(pattern);
            if (match) ids[key] = match[1];
        }
        return ids;
    }));
    
    // Measure Journey API call
    let journeyData;
    results.push(await timeOperation('Journey API Call', async () => {
        journeyData = await apiRequest(`/testsuites/${journeyId}?envelope=false`);
        return journeyData;
    }));
    
    // Measure NLP conversion (if journey data available)
    if (journeyData) {
        results.push(await timeOperation('NLP Conversion', async () => {
            const nlpLines = [];
            if (journeyData.cases) {
                journeyData.cases.forEach(testCase => {
                    nlpLines.push(`Checkpoint: ${testCase.title}`);
                    if (testCase.steps) {
                        testCase.steps.forEach(step => {
                            nlpLines.push(`  ${step.action}`);
                        });
                    }
                });
            }
            return nlpLines;
        }));
    }
    
    // Measure Execution API call
    results.push(await timeOperation('Execution API Call', async () => {
        return await apiRequest(`/executions/${executionId}`);
    }));
    
    // Measure Environment API call
    results.push(await timeOperation('Environment API Call', async () => {
        return await apiRequest(`/projects/${projectId}/environments`);
    }));
    
    // Measure Variable extraction (in-memory)
    results.push(await timeOperation('Variable Processing', async () => {
        // Simulate variable extraction
        const variables = {};
        if (journeyData && journeyData.cases) {
            journeyData.cases.forEach(testCase => {
                if (testCase.steps) {
                    testCase.steps.forEach(step => {
                        if (step.variable) {
                            variables[step.variable] = 'extracted';
                        }
                    });
                }
            });
        }
        return variables;
    }));
    
    // Test Screenshot API (expect failure)
    results.push(await timeOperation('Screenshot API Test', async () => {
        return await apiRequest(`/executions/${executionId}/screenshots`);
    }));
    
    // Calculate totals
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Performance Summary\n');
    
    const successful = results.filter(r => r.success);
    const totalTime = successful.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('Successful Operations:');
    successful.forEach(r => {
        console.log(`  ${r.name}: ${r.duration}ms`);
    });
    
    console.log(`\n⏱️  Total Time (without screenshots): ${totalTime}ms (~${(totalTime/1000).toFixed(1)} seconds)`);
    
    // Estimate with screenshots
    const screenshotEstimate = 13 * 1000; // 13 screenshots × 1 second each
    console.log(`⏱️  Estimated with screenshots: ${totalTime + screenshotEstimate}ms (~${((totalTime + screenshotEstimate)/1000).toFixed(1)} seconds)`);
    
    // Show parallel potential
    const apiCalls = results.filter(r => r.name.includes('API'));
    const maxApiTime = Math.max(...apiCalls.map(r => r.duration));
    const processingTime = results.filter(r => !r.name.includes('API')).reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`\n🚀 Optimization Potential:`);
    console.log(`  Current (sequential): ${totalTime}ms`);
    console.log(`  If parallel API calls: ${maxApiTime + processingTime}ms (~${((maxApiTime + processingTime)/1000).toFixed(1)} seconds)`);
    console.log(`  Potential savings: ${totalTime - (maxApiTime + processingTime)}ms`);
}

measurePerformance().catch(console.error);