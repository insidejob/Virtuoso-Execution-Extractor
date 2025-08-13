#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying App2 Setup and Safety System\n');
console.log('=' .repeat(70));

let totalTests = 0;
let passedTests = 0;

function test(name, condition, details = '') {
    totalTests++;
    const passed = typeof condition === 'function' ? condition() : condition;
    if (passed) {
        passedTests++;
        console.log(`✅ ${name}`);
    } else {
        console.log(`❌ ${name}`);
    }
    if (details) {
        console.log(`   ${details}`);
    }
    return passed;
}

// Test 1: Check configuration files exist
console.log('\n📁 Configuration Files:');
test('app2-config.json exists', fs.existsSync(path.join(__dirname, 'config', 'app2-config.json')));
test('environment-manager.js exists', fs.existsSync(path.join(__dirname, 'src', 'environment-manager.js')));
test('APP2-CONFIGURATION.md exists', fs.existsSync(path.join(__dirname, 'APP2-CONFIGURATION.md')));

// Test 2: Verify app2 configuration
console.log('\n🔧 App2 Configuration:');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'app2-config.json'), 'utf8'));
test('Default environment is app2', config.defaultEnvironment === 'app2');
test('App2 is marked as demo environment', config.environments.app2.isDemoEnvironment === true);
test('App2 does NOT require confirmation', config.environments.app2.requiresConfirmation === false);
test('Organization ID is 1964', config.environments.app2.organizationId === 1964);
test('Demo token is configured', config.environments.app2.token === '86defbf4-62a7-4958-a0b4-21af0dee5d7a');

// Test 3: Verify production safety
console.log('\n⚠️  Production Safety:');
test('Production requires confirmation', config.environments.app?.requiresConfirmation === true);
test('Staging requires confirmation', config.environments['app-staging']?.requiresConfirmation === true);
test('Production has warning message', !!config.environments.app?.warningMessage);

// Test 4: Check API schema updates
console.log('\n📋 API Schema:');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'api-schema.json'), 'utf8'));
test('Base URL is app2.virtuoso.qa', schema.baseUrls.api === 'https://app2.virtuoso.qa/api');
test('Organization ID in schema', schema.organizationId === 1964);
test('Default environment in schema', schema.defaultEnvironment === 'app2');

// Test 5: Environment Manager functionality
console.log('\n🔄 Environment Manager:');
const EnvironmentManager = require('./src/environment-manager');
const manager = new EnvironmentManager();
const currentEnv = manager.getCurrentEnvironment();
test('Current environment is app2', currentEnv.name === 'App2 Demo Environment');
test('Environment is safe', manager.isSafeEnvironment());
const tokenValidation = manager.validateTokenForEnvironment('86defbf4-62a7-4958-a0b4-21af0dee5d7a', 'app2');
test('Demo token validates', tokenValidation.valid && tokenValidation.isDemoToken);

// Test 6: Client configuration
console.log('\n🔌 Client Configuration:');
test('Client imports environment manager', () => {
    const clientCode = fs.readFileSync(path.join(__dirname, 'src', 'client.js'), 'utf8');
    return clientCode.includes('require(\'./environment-manager\')');
});
test('Client defaults to app2 URL', () => {
    const clientCode = fs.readFileSync(path.join(__dirname, 'src', 'client.js'), 'utf8');
    return clientCode.includes('https://app2.virtuoso.qa/api');
});

// Test 7: Safety features
console.log('\n🛡️ Safety Features:');
test('Safe environments list includes app2', config.safeEnvironments.includes('app2'));
test('Safe environments list excludes production', !config.safeEnvironments.includes('app'));

// Summary
console.log('\n' + '=' .repeat(70));
console.log('📊 Verification Summary:');
console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
const percentage = Math.round((passedTests / totalTests) * 100);
console.log(`   Success Rate: ${percentage}%`);

if (percentage === 100) {
    console.log('\n✅ SUCCESS: App2 setup is complete and working correctly!');
    console.log('\n🎯 Key Points:');
    console.log('  • App2 is the default environment (no confirmation needed)');
    console.log('  • Production/Staging require Y/N confirmation');
    console.log('  • Organization 1964 is configured');
    console.log('  • Demo token is ready to use');
    console.log('  • All safety checks are in place');
    
    console.log('\n📝 Next Steps:');
    console.log('  1. Run: npm start (uses app2 automatically)');
    console.log('  2. Test: node test-app2-connection.js');
    console.log('  3. Explore: npm run search');
} else {
    console.log('\n⚠️  WARNING: Some tests failed. Please review the configuration.');
    console.log('Check APP2-CONFIGURATION.md for setup instructions.');
}

console.log('\n🔗 App2 Demo Environment:');
console.log('  URL: https://app2.virtuoso.qa');
console.log('  Organization: 1964');
console.log('  API Token: 86defbf4-62a7-4958-a0b4-21af0dee5d7a');
console.log('=' .repeat(70));