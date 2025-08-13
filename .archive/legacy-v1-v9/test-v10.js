#!/usr/bin/env node

/**
 * V10 Test Script
 * Tests all V10 modules are working correctly
 */

const fs = require('fs');
const path = require('path');

// Import V10 modules
const NLPConverter = require('./core/nlp-converter');
const VariableExtractor = require('./core/variable-extractor');
const FolderStructure = require('./core/folder-structure');
const SelfHealingSystem = require('./core/self-healing');
const ValidationTracker = require('./core/validation-tracker');
const UniversalKnowledge = require('./.knowledge/universal-knowledge');

console.log('🧪 Testing V10 Architecture\n');
console.log('=' .repeat(70));

let testsPassed = 0;
let testsFailed = 0;

// Test 1: Core modules exist
console.log('\n📋 Test 1: Core Modules');
try {
    const nlpConverter = new NLPConverter();
    const variableExtractor = new VariableExtractor();
    const folderStructure = new FolderStructure();
    console.log('✅ Core modules loaded successfully');
    testsPassed++;
} catch (error) {
    console.log('❌ Failed to load core modules:', error.message);
    testsFailed++;
}

// Test 2: Intelligence module
console.log('\n📋 Test 2: Intelligence Module');
try {
    const EnhancedVariableIntelligence = require('./intelligence/variable-intelligence-v2');
    const intelligence = new EnhancedVariableIntelligence();
    console.log('✅ Intelligence module loaded successfully');
    testsPassed++;
} catch (error) {
    console.log('❌ Failed to load intelligence module:', error.message);
    testsFailed++;
}

// Test 3: Knowledge base
console.log('\n📋 Test 3: Knowledge Base');
try {
    const knowledge = new UniversalKnowledge();
    console.log('✅ Knowledge base loaded successfully');
    
    // Test unknown action handling
    const testStep = { action: 'SCROLL', value: '500px', meta: { direction: 'down' } };
    const result = knowledge.handleUnknown(testStep, {});
    if (result && result.includes('Scroll')) {
        console.log('✅ Knowledge base handles unknown actions');
        testsPassed++;
    } else {
        console.log('❌ Knowledge base failed to handle unknown action');
        testsFailed++;
    }
} catch (error) {
    console.log('❌ Failed with knowledge base:', error.message);
    testsFailed++;
}

// Test 4: Self-healing system
console.log('\n📋 Test 4: Self-Healing System');
try {
    const selfHealing = new SelfHealingSystem();
    const unknownStep = { action: 'HOVER', value: 'button' };
    const healed = selfHealing.handleUnknownAction(unknownStep);
    
    if (healed && !healed.includes('[Unknown')) {
        console.log('✅ Self-healing system works');
        console.log(`   Generated: ${healed}`);
        testsPassed++;
    } else {
        console.log('❌ Self-healing failed');
        testsFailed++;
    }
} catch (error) {
    console.log('❌ Failed with self-healing:', error.message);
    testsFailed++;
}

// Test 5: Validation tracker
console.log('\n📋 Test 5: Validation Tracker');
try {
    const validator = new ValidationTracker();
    
    // Track some test steps
    validator.trackStep(
        { action: 'NAVIGATE', value: 'https://example.com' },
        { success: true }
    );
    validator.trackStep(
        { action: 'CLICK', value: 'button' },
        { success: true }
    );
    validator.trackStep(
        { action: 'UNKNOWN_ACTION' },
        { success: false, error: new Error('Unknown action') }
    );
    
    const accuracy = validator.calculateAccuracy();
    const report = validator.generateReport();
    
    if (report && report.summary && report.summary.totalSteps === 3) {
        console.log('✅ Validation tracker works');
        console.log(`   Accuracy: ${accuracy}%`);
        console.log(`   Steps tracked: ${report.summary.totalSteps}`);
        testsPassed++;
    } else {
        console.log('❌ Validation tracker failed');
        testsFailed++;
    }
} catch (error) {
    console.log('❌ Failed with validation tracker:', error.message);
    testsFailed++;
}

// Test 6: Folder structure with underscores
console.log('\n📋 Test 6: Folder Naming Convention');
try {
    const folderStructure = new FolderStructure();
    const sanitized = folderStructure.sanitizeName('2. Permit (Check Stage)', '8519');
    
    if (sanitized === '2_permit_check_stage_8519') {
        console.log('✅ Folder naming uses underscores correctly');
        console.log(`   Input: "2. Permit (Check Stage)" + ID 8519`);
        console.log(`   Output: ${sanitized}`);
        testsPassed++;
    } else {
        console.log('❌ Folder naming incorrect:', sanitized);
        testsFailed++;
    }
} catch (error) {
    console.log('❌ Failed with folder naming:', error.message);
    testsFailed++;
}

// Test 7: NLP Converter with sample data
console.log('\n📋 Test 7: NLP Conversion');
try {
    const nlpConverter = new NLPConverter();
    const sampleJourney = {
        cases: [{
            title: 'Test Checkpoint',
            steps: [
                { action: 'NAVIGATE', value: 'https://example.com' },
                { action: 'CLICK', element: { target: { text: 'Submit' } } },
                { action: 'WRITE', variable: 'username', selectors: { hint: 'Username' } }
            ]
        }]
    };
    
    const result = nlpConverter.convert(sampleJourney, null);
    
    if (result.nlp && result.nlp.includes('Navigate') && result.nlp.includes('Click')) {
        console.log('✅ NLP conversion works');
        console.log('   Generated NLP preview:');
        result.nlp.split('\n').slice(0, 3).forEach(line => {
            console.log(`     ${line}`);
        });
        testsPassed++;
    } else {
        console.log('❌ NLP conversion failed');
        testsFailed++;
    }
} catch (error) {
    console.log('❌ Failed with NLP conversion:', error.message);
    testsFailed++;
}

// Test 8: Variable extraction
console.log('\n📋 Test 8: Variable Extraction');
try {
    const variableExtractor = new VariableExtractor();
    const nlpConverter = new NLPConverter();
    variableExtractor.setNLPConverter(nlpConverter);
    
    const sampleJourney = {
        dataAttributeValues: {
            'username': 'testuser',
            'password': 'testpass',
            'emptyVar': ''  // Should be filtered
        },
        cases: [{
            steps: [
                { action: 'WRITE', variable: 'username' },
                { action: 'WRITE', variable: 'password' }
            ]
        }]
    };
    
    const variables = variableExtractor.extract(sampleJourney, []);
    
    if (variables && variables.variables['$username'] && !variables.variables['$emptyVar']) {
        console.log('✅ Variable extraction works');
        console.log(`   Extracted: ${Object.keys(variables.variables).join(', ')}`);
        console.log(`   Filtered empty: ${variables.summary.filtered_empty}`);
        testsPassed++;
    } else {
        console.log('❌ Variable extraction failed');
        testsFailed++;
    }
} catch (error) {
    console.log('❌ Failed with variable extraction:', error.message);
    testsFailed++;
}

// Final summary
console.log('\n' + '=' .repeat(70));
console.log('📊 Test Results Summary\n');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! V10 architecture is ready.');
} else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
}

console.log('\n' + '=' .repeat(70));
console.log('Next steps:');
console.log('1. Test with a real URL:');
console.log('   node extract-v10.js <url> --nlp --vars --validate');
console.log('2. Review generated files in extractions/ folder');
console.log('3. Check .accuracy/ folder if any issues found');

process.exit(testsFailed > 0 ? 1 : 0);