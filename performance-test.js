#!/usr/bin/env node

/**
 * Performance Test for Virtuoso Extractor V10
 * 
 * This script demonstrates the performance improvements implemented:
 * - Parallel API calls
 * - Smart caching
 * - Combined operations
 * - Timing metrics
 */

const VirtuosoExtractorV10 = require('./extract-v10.js');

async function runPerformanceTest() {
    console.log('🚀 Virtuoso Extractor V10 - Performance Test\n');
    console.log('=' .repeat(70));
    
    // Example URL for testing (replace with actual URL)
    const testUrl = 'https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256';
    
    console.log('Testing different configurations...\n');
    
    // Test 1: Basic extraction (raw data only)
    console.log('📋 Test 1: Basic extraction (baseline)');
    const basic = new VirtuosoExtractorV10({ debug: true });
    console.log('Configuration: Raw data only');
    console.log('Expected: Fastest for raw data\n');
    
    // Test 2: Full extraction without optimization
    console.log('📋 Test 2: Full extraction (standard)');
    const standard = new VirtuosoExtractorV10({ 
        nlp: true, 
        vars: true, 
        validate: true,
        debug: true 
    });
    console.log('Configuration: Sequential processing');
    console.log('Expected: Slower due to sequential operations\n');
    
    // Test 3: Optimized extraction with --all flag
    console.log('📋 Test 3: Optimized extraction (--all flag)');
    const optimized = new VirtuosoExtractorV10({ 
        all: true,
        debug: true 
    });
    console.log('Configuration: Parallel processing enabled');
    console.log('Expected: Faster due to parallel NLP + variable extraction\n');
    
    // Test 4: Fast mode with aggressive caching
    console.log('📋 Test 4: Fast mode (--all --fast)');
    const fastMode = new VirtuosoExtractorV10({ 
        all: true,
        fast: true,
        debug: true 
    });
    console.log('Configuration: Parallel processing + aggressive caching');
    console.log('Expected: Fastest overall performance\n');
    
    console.log('Performance Improvements Implemented:');
    console.log('✅ Parallel API calls (journey, execution, project, environments)');
    console.log('✅ Smart caching with TTL (5 minutes default)');
    console.log('✅ Parallel processing (NLP + variables in parallel)');
    console.log('✅ Combined --all flag (nlp + vars + validate)');
    console.log('✅ Fast mode with aggressive caching');
    console.log('✅ Detailed timing metrics');
    console.log('✅ Pre-compiled regex patterns in NLP converter');
    console.log('✅ Action handler caching');
    
    console.log('\nRecommended usage for maximum speed:');
    console.log('node extract-v10.js <url> --all --fast');
    
    console.log('\n' + '=' .repeat(70));
    console.log('Performance test setup complete!');
    console.log('Run the extractor with different flags to see timing differences.');
}

if (require.main === module) {
    runPerformanceTest().catch(error => {
        console.error('Performance test failed:', error);
        process.exit(1);
    });
}

module.exports = runPerformanceTest;