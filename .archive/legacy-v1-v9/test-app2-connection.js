#!/usr/bin/env node

const https = require('https');
const EnvironmentManager = require('./src/environment-manager');

// Initialize environment manager
const envManager = new EnvironmentManager();
const config = envManager.getAPIConfig();

console.log('🔬 Testing App2 Connection\n');
console.log('Environment: App2 Demo Environment');
console.log('Organization: 1964');
console.log('API Token: 86defbf4-62a7-4958-a0b4-21af0dee5d7a');
console.log('─'.repeat(60) + '\n');

// Test function
async function testApp2Connection() {
    const token = '86defbf4-62a7-4958-a0b4-21af0dee5d7a';
    
    // Test 1: Check /api/user endpoint
    console.log('Test 1: Checking /api/user endpoint...');
    
    const userResult = await makeRequest('/api/user', token);
    if (userResult.success) {
        console.log('✅ Authentication successful!');
        console.log('   User data received:', JSON.stringify(userResult.data).substring(0, 100) + '...');
    } else {
        console.log('❌ Authentication failed:', userResult.error);
    }
    
    // Test 2: Check /api/projects endpoint
    console.log('\nTest 2: Checking /api/projects endpoint...');
    
    const projectsResult = await makeRequest('/api/projects', token);
    if (projectsResult.success) {
        console.log('✅ Projects endpoint working!');
        const projects = projectsResult.data;
        if (Array.isArray(projects)) {
            console.log(`   Found ${projects.length} project(s)`);
            if (projects.length > 0) {
                console.log(`   First project: ${projects[0].name || projects[0].title || 'Unnamed'}`);
            }
        }
    } else {
        console.log('❌ Projects endpoint failed:', projectsResult.error);
    }
    
    // Test 3: Check organization-specific endpoint
    console.log('\nTest 3: Checking organization 1964 specific data...');
    
    const orgResult = await makeRequest('/api/organizations/1964', token);
    if (orgResult.success) {
        console.log('✅ Organization endpoint accessible!');
        console.log('   Organization data received');
    } else {
        // This might not exist, so just note it
        console.log('ℹ️  Organization endpoint returned:', orgResult.statusCode);
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log('📊 Connection Test Summary:');
    console.log('   Base URL: https://app2.virtuoso.qa');
    console.log('   API endpoints tested: 3');
    console.log('   Authentication: ' + (userResult.success ? '✅ Working' : '❌ Failed'));
    console.log('   Environment: 🧪 Demo (Safe for testing)');
}

// Helper function to make API requests
function makeRequest(path, token) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'app2.virtuoso.qa',
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode < 400) {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            data: parsed
                        });
                    } catch (e) {
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            data: data
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        statusCode: res.statusCode,
                        error: `Status ${res.statusCode}`,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });
        
        req.end();
    });
}

// Run the test
testApp2Connection().catch(console.error);