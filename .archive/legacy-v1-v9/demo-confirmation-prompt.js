#!/usr/bin/env node

const EnvironmentManager = require('./src/environment-manager');

console.log('🎭 Demonstration: Environment Confirmation System\n');
console.log('This demo shows how the system protects against accidental production use.\n');
console.log('=' .repeat(70) + '\n');

async function demonstrateConfirmation() {
    const manager = new EnvironmentManager();
    
    // Step 1: Show app2 doesn't need confirmation
    console.log('Step 1: Setting app2 environment (Demo - Safe)\n');
    console.log('Executing: manager.setEnvironment("app2")');
    console.log('Expected: ✅ No confirmation needed\n');
    
    await manager.setEnvironment('app2');
    
    console.log('\n' + '─'.repeat(70) + '\n');
    
    // Step 2: Show what happens when trying to use production
    console.log('Step 2: What happens when trying to use production?\n');
    console.log('If we were to run: manager.setEnvironment("app")');
    console.log('The system would show:\n');
    
    console.log('┌' + '─'.repeat(68) + '┐');
    console.log('│ ' + '='.repeat(60).padEnd(66) + ' │');
    console.log('│ ⚠️  WARNING: This is the PRODUCTION environment.'.padEnd(67) + ' │');
    console.log('│ Are you sure you want to continue?'.padEnd(67) + ' │');
    console.log('│ ' + '='.repeat(60).padEnd(66) + ' │');
    console.log('│ Environment: Production Environment'.padEnd(67) + ' │');
    console.log('│ URL: https://app.virtuoso.qa'.padEnd(67) + ' │');
    console.log('│ Description: Live production environment - use with caution'.padEnd(67) + ' │');
    console.log('│ ' + '='.repeat(60).padEnd(66) + ' │');
    console.log('│'.padEnd(67) + ' │');
    console.log('│ Do you want to continue? (Y/N): _'.padEnd(67) + ' │');
    console.log('└' + '─'.repeat(68) + '┘\n');
    
    console.log('User must type Y or N:');
    console.log('  • Y/Yes → Proceeds with production (dangerous!)');
    console.log('  • N/No  → Cancels and stays on app2 (safe)');
    
    console.log('\n' + '=' .repeat(70) + '\n');
    
    // Step 3: Show current safe status
    console.log('Step 3: Current Safe Status\n');
    manager.displayStatus();
    
    console.log('\n' + '=' .repeat(70));
    console.log('\n✅ Safety System Active!\n');
    console.log('The system is configured to:');
    console.log('  1. Default to app2 (demo environment)');
    console.log('  2. Require explicit Y/N confirmation for production');
    console.log('  3. Show clear warnings before environment changes');
    console.log('  4. Protect organization 1964 demo data');
    
    console.log('\n📝 To test the actual prompt:');
    console.log('  Run: node src/environment-manager.js set app');
    console.log('  (This will trigger the real confirmation prompt)');
    
    console.log('\n🔒 Your production data is protected by default!');
}

demonstrateConfirmation().catch(console.error);