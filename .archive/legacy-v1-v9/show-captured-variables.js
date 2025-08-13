#!/usr/bin/env node

/**
 * Show all variables captured from execution 88715, journey 527218
 */

const VariablesEnhancedExtractor = require('./virtuoso-variables-enhanced');

async function showCapturedVariables() {
    console.log('🔍 Variables Captured from Execution URL:');
    console.log('URL: https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218\n');
    console.log('=' .repeat(70));
    
    const extractor = new VariablesEnhancedExtractor({
        token: '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
        sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
        clientId: '1754647483711_e9e9c12_production'
    });
    
    try {
        const report = await extractor.extract({
            execution: '88715',
            journey: '527218',
            project: '4889'
        });
        
        // Show summary
        console.log('\n📊 SUMMARY:');
        console.log(`Total Variables: ${report.summary.total}`);
        console.log(`  📊 TEST DATA: ${report.summary.byType.testData} variables`);
        console.log(`  🌍 ENVIRONMENT: ${report.summary.byType.environment} variables`);
        console.log(`  📝 LOCAL: ${report.summary.byType.local} variables`);
        console.log(`  ⚡ RUNTIME: ${report.summary.byType.runtime} variables`);
        
        // Show TEST DATA variables
        console.log('\n📊 TEST DATA VARIABLES (48):');
        console.log('-' .repeat(70));
        
        const testDataVars = report.variables.testData;
        const testDataKeys = Object.keys(testDataVars).sort();
        
        // Group by category
        const categories = {
            credentials: [],
            questions: [],
            types: [],
            industry: [],
            other: []
        };
        
        testDataKeys.forEach(key => {
            const variable = testDataVars[key];
            const entry = `$${key}: "${variable.value}"`;
            
            if (key.includes('username') || key.includes('password')) {
                categories.credentials.push(entry);
            } else if (key.includes('Question')) {
                categories.questions.push(entry);
            } else if (key.includes('type') || key.includes('Type')) {
                categories.types.push(entry);
            } else if (key.includes('Industry')) {
                categories.industry.push(entry);
            } else {
                categories.other.push(entry);
            }
        });
        
        // Display by category
        console.log('\n🔑 Credentials:');
        categories.credentials.forEach(v => console.log(`  ${v}`));
        
        console.log('\n🏭 Industry & Types:');
        categories.industry.forEach(v => console.log(`  ${v}`));
        categories.types.forEach(v => console.log(`  ${v}`));
        
        console.log('\n❓ Questions (Sample):');
        categories.questions.slice(0, 5).forEach(v => console.log(`  ${v}`));
        console.log(`  ... and ${categories.questions.length - 5} more questions`);
        
        console.log('\n🔧 Other Variables:');
        categories.other.slice(0, 5).forEach(v => console.log(`  ${v}`));
        if (categories.other.length > 5) {
            console.log(`  ... and ${categories.other.length - 5} more`);
        }
        
        // Show ENVIRONMENT variables
        console.log('\n🌍 ENVIRONMENT VARIABLES (12):');
        console.log('-' .repeat(70));
        
        const envVars = report.variables.environment;
        const envKeys = Object.keys(envVars).sort();
        
        envKeys.forEach(key => {
            const variable = envVars[key];
            const value = variable.value.length > 50 
                ? variable.value.substring(0, 50) + '...' 
                : variable.value;
            console.log(`  $${key}: "${value}"`);
        });
        
        // Show LOCAL variables if any
        if (report.summary.byType.local > 0) {
            console.log('\n📝 LOCAL VARIABLES:');
            console.log('-' .repeat(70));
            
            const localVars = report.variables.local;
            Object.keys(localVars).forEach(key => {
                const variable = localVars[key];
                console.log(`  $${key}: "${variable.value}"`);
            });
        }
        
        console.log('\n' + '=' .repeat(70));
        console.log('✅ Extraction Complete\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

showCapturedVariables();