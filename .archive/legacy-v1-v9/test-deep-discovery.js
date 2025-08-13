#!/usr/bin/env node

const DeepDiscoverySystem = require('./src/deep-discovery-system');

async function testDeepDiscovery() {
    console.log('🧪 Testing Deep Discovery System\n');
    console.log('This will run a LIMITED discovery to test the system.\n');
    console.log('=' .repeat(80) + '\n');
    
    // Create discovery system with limited scope for testing
    const discoverySystem = new DeepDiscoverySystem(
        '86defbf4-62a7-4958-a0b4-21af0dee5d7a',
        {
            baseUrl: 'https://app2.virtuoso.qa',
            organizationId: 1964,
            maxDepth: 2,           // Limited depth for testing
            requestDelay: 300,     // Slower to be safe
            batchSize: 3,          // Smaller batches
            timeout: 5000,
            verbose: true
        }
    );
    
    // Override patterns for limited test
    discoverySystem.patterns.resources = [
        // Test just a few key resources
        'user', 'users',
        'project', 'projects', 
        'goal', 'goals',
        'organization', 'organizations',
        'test', 'tests',
        'execution', 'executions'
    ];
    
    discoverySystem.patterns.apiVersions = [
        '/api',  // Just test main API path
        ''       // And root
    ];
    
    try {
        console.log('Starting limited discovery...\n');
        const report = await discoverySystem.discover();
        
        console.log('\n' + '='.repeat(80));
        console.log('🎯 Test Discovery Results');
        console.log('='.repeat(80) + '\n');
        
        // Show what we found
        console.log('✅ Working Endpoints Found:');
        const endpoints = Array.from(discoverySystem.discovered.endpoints.values());
        const workingEndpoints = endpoints.filter(e => e.status < 400);
        
        workingEndpoints.slice(0, 20).forEach(endpoint => {
            console.log(`  ${endpoint.method} ${endpoint.endpoint} (${endpoint.status})`);
        });
        
        if (workingEndpoints.length > 20) {
            console.log(`  ... and ${workingEndpoints.length - 20} more`);
        }
        
        console.log('\n📊 Quick Stats:');
        console.log(`  Total endpoints tested: ${discoverySystem.tested.size}`);
        console.log(`  Successful endpoints: ${workingEndpoints.length}`);
        console.log(`  Success rate: ${((workingEndpoints.length / discoverySystem.tested.size) * 100).toFixed(1)}%`);
        
        // Check for critical endpoints
        console.log('\n🔍 Critical Endpoints Check:');
        const criticalEndpoints = [
            '/api/user',
            '/api/projects',
            '/api/organizations'
        ];
        
        criticalEndpoints.forEach(endpoint => {
            const found = workingEndpoints.find(e => e.endpoint === endpoint);
            if (found) {
                console.log(`  ✅ ${endpoint} - Found`);
            } else {
                console.log(`  ❌ ${endpoint} - Not found`);
            }
        });
        
        console.log('\n✅ Test completed successfully!');
        console.log('\nTo run FULL discovery:');
        console.log('  node src/deep-discovery-system.js');
        
        return report;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run the test
testDeepDiscovery().catch(console.error);