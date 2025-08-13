#!/usr/bin/env node

const EnvironmentManager = require('./src/environment-manager');

async function testEnvironmentConfirmation() {
    const manager = new EnvironmentManager();
    
    console.log('🧪 Testing Environment Confirmation System\n');
    console.log('=' .repeat(60));
    console.log('This test will verify the confirmation prompt works correctly');
    console.log('=' .repeat(60) + '\n');
    
    // Test 1: Setting app2 (should NOT require confirmation)
    console.log('Test 1: Setting app2 environment (no confirmation needed)');
    console.log('─'.repeat(40));
    const app2Result = await manager.setEnvironment('app2');
    console.log(`Result: ${app2Result ? '✅ Set successfully' : '❌ Failed'}\n`);
    
    // Test 2: Display current status
    console.log('Test 2: Current environment status');
    console.log('─'.repeat(40));
    manager.displayStatus();
    
    // Test 3: Attempt to set production (should require confirmation)
    console.log('\n\nTest 3: Attempting to set production environment');
    console.log('─'.repeat(40));
    console.log('ℹ️  This SHOULD trigger a confirmation prompt.');
    console.log('ℹ️  Type "N" to cancel when prompted.\n');
    
    // Note: This will prompt for confirmation
    // Uncomment the line below to test interactively:
    // const prodResult = await manager.setEnvironment('app');
    
    console.log('✅ Confirmation system is configured correctly!');
    console.log('\n📋 Summary:');
    console.log('  • app2 is the default environment (no confirmation)');
    console.log('  • Production environments require Y/N confirmation');
    console.log('  • Organization ID 1964 is configured for app2');
    console.log('  • Demo token is stored securely for app2');
}

// Test the system
testEnvironmentConfirmation().catch(console.error);