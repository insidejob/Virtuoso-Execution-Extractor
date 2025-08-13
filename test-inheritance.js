/**
 * Test script to understand environment variable inheritance
 */

const fs = require('fs');

// Load the environment data
const envData = JSON.parse(fs.readFileSync('extractions/ipermit_testing_4889/demo_15069/2025-08-12T21-03-04_execution_173818/demo_test_612863/raw_data/environments.json', 'utf8'));

console.log('=== ENVIRONMENT INHERITANCE ANALYSIS ===\n');

// Check each environment
envData.forEach(env => {
    console.log(`\nEnvironment: ${env.name} (ID: ${env.id})`);
    console.log('----------------------------------------');
    
    if (env.variables) {
        const variables = Object.values(env.variables);
        
        // Count inherited vs non-inherited
        const inherited = variables.filter(v => v.inherited === true);
        const notInherited = variables.filter(v => v.inherited === false);
        
        console.log(`Total variables: ${variables.length}`);
        console.log(`Inherited: ${inherited.length}`);
        console.log(`Not inherited: ${notInherited.length}`);
        
        // Show inherited variables if any
        if (inherited.length > 0) {
            console.log('\nInherited variables:');
            inherited.forEach(v => {
                console.log(`  - ${v.name}: "${v.value}" (hidden: ${v.hidden})`);
            });
        }
        
        // Show first few non-inherited
        if (notInherited.length > 0) {
            console.log('\nNon-inherited variables (first 3):');
            notInherited.slice(0, 3).forEach(v => {
                console.log(`  - ${v.name}: "${v.value}" (hidden: ${v.hidden})`);
            });
        }
    }
});

// Check if environments reference each other
console.log('\n\n=== ENVIRONMENT RELATIONSHIPS ===\n');

// Check for parent references
envData.forEach(env => {
    console.log(`\nEnvironment: ${env.name}`);
    console.log('Fields present:', Object.keys(env).join(', '));
    
    // Look for any parent/child indicators
    if (env.parentId) console.log(`  Parent ID: ${env.parentId}`);
    if (env.parent) console.log(`  Parent: ${env.parent}`);
    if (env.extends) console.log(`  Extends: ${env.extends}`);
    if (env.base) console.log(`  Base: ${env.base}`);
});

// Theory: Inheritance might come from project default environment
const projectData = JSON.parse(fs.readFileSync('extractions/ipermit_testing_4889/demo_15069/2025-08-12T21-03-04_execution_173818/demo_test_612863/raw_data/project.json', 'utf8'));
const executionData = JSON.parse(fs.readFileSync('extractions/ipermit_testing_4889/demo_15069/2025-08-12T21-03-04_execution_173818/demo_test_612863/raw_data/execution.json', 'utf8'));

console.log('\n\n=== INHERITANCE THEORY ===\n');
console.log(`Project default environment: ${projectData.environmentId}`);
console.log(`Execution environment: ${executionData.environmentId}`);

if (projectData.environmentId !== executionData.environmentId) {
    console.log('\n⚠️ Execution uses different environment than project default!');
    console.log('Variables might be inherited from project default to execution environment.');
    
    // Find both environments
    const defaultEnv = envData.find(e => e.id === projectData.environmentId);
    const execEnv = envData.find(e => e.id === executionData.environmentId);
    
    if (defaultEnv && execEnv) {
        console.log(`\nDefault env: ${defaultEnv.name}`);
        console.log(`Execution env: ${execEnv.name}`);
        
        // Check for overlapping variables
        const defaultVars = Object.values(defaultEnv.variables || {});
        const execVars = Object.values(execEnv.variables || {});
        
        const defaultVarNames = new Set(defaultVars.map(v => v.name));
        const execVarNames = new Set(execVars.map(v => v.name));
        
        // Find common variable names
        const common = [...defaultVarNames].filter(name => execVarNames.has(name));
        
        if (common.length > 0) {
            console.log(`\nCommon variables (${common.length}):`, common.slice(0, 5));
        }
    }
}