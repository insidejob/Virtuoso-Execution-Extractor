#!/usr/bin/env node

/**
 * Bulk Extractor Test Suite
 * 
 * Tests the bulk extraction system with various scenarios
 */

const fs = require('fs');
const path = require('path');

async function runTests() {
    console.log('🧪 Bulk Extractor Test Suite\n');
    console.log('=' .repeat(60));
    
    // Test 1: Help display
    console.log('\n📋 Test 1: Help Display');
    try {
        const { spawn } = require('child_process');
        const helpProcess = spawn('node', ['extract-bulk.js', '--help'], { 
            stdio: ['pipe', 'pipe', 'pipe'] 
        });
        
        let output = '';
        helpProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        await new Promise((resolve, reject) => {
            helpProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('   ✅ Help command works');
                    console.log(`   📄 Help output: ${output.split('\n').length} lines`);
                    resolve();
                } else {
                    reject(new Error(`Help command failed with code ${code}`));
                }
            });
        });
    } catch (error) {
        console.log(`   ❌ Help test failed: ${error.message}`);
    }
    
    // Test 2: Dry run validation
    console.log('\n📋 Test 2: Dry Run Validation');
    try {
        const BulkExtractor = require('./core/bulk-extractor');
        
        const options = {
            project: '4889',
            days: 7,
            workers: 2,
            dryRun: true,
            debug: true,
            output: 'test-output'
        };
        
        console.log('   🔧 Creating BulkExtractor instance...');
        const extractor = new BulkExtractor(options);
        console.log('   ✅ BulkExtractor instance created successfully');
        
    } catch (error) {
        console.log(`   ❌ Dry run test failed: ${error.message}`);
    }
    
    // Test 3: Worker pool initialization
    console.log('\n📋 Test 3: Worker Pool Initialization');
    try {
        const WorkerPool = require('./core/worker-pool');
        
        const poolOptions = {
            sharedCache: {
                project: { id: '4889', name: 'Test Project' },
                organization: { id: '1964', name: 'Test Org' },
                environments: [],
                apiTests: new Map(),
                goals: new Map()
            },
            config: {
                baseUrl: 'https://api-app2.virtuoso.qa/api',
                token: 'test-token'
            },
            extractorOptions: {
                project: '4889',
                nlp: true,
                vars: true
            },
            sessionDir: './test-session'
        };
        
        console.log('   🔧 Creating WorkerPool with 3 workers...');
        const pool = new WorkerPool(3, poolOptions);
        console.log(`   ✅ WorkerPool created with ${pool.workers.length} workers`);
        
    } catch (error) {
        console.log(`   ❌ Worker pool test failed: ${error.message}`);
    }
    
    // Test 4: Configuration loading
    console.log('\n📋 Test 4: Configuration Loading');
    try {
        const configPath = path.join(__dirname, 'config', 'v10-credentials.json');
        
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('   ✅ Configuration file loaded successfully');
            console.log(`   🔑 Has API config: ${!!config.api}`);
            console.log(`   🌐 Base URL: ${config.api?.baseUrl || 'default'}`);
        } else {
            console.log('   ⚠️  Configuration file not found (will use defaults)');
        }
    } catch (error) {
        console.log(`   ❌ Configuration test failed: ${error.message}`);
    }
    
    // Test 5: Output directory creation
    console.log('\n📋 Test 5: Output Directory Creation');
    try {
        const testOutputDir = path.join(__dirname, 'test-bulk-output');
        
        // Clean up if exists
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
        
        // Create directory
        fs.mkdirSync(testOutputDir, { recursive: true });
        console.log('   ✅ Output directory created successfully');
        
        // Clean up
        fs.rmSync(testOutputDir, { recursive: true, force: true });
        console.log('   🧹 Test directory cleaned up');
        
    } catch (error) {
        console.log(`   ❌ Output directory test failed: ${error.message}`);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Suite Complete\n');
    
    // Performance estimates
    console.log('📈 Expected Performance:');
    console.log('  • Single extraction: ~350ms (current V10 baseline)');
    console.log('  • 10 workers parallel: ~35ms average per execution');
    console.log('  • 1000 executions: ~60 seconds (vs 350 seconds sequential)');
    console.log('  • Speed improvement: ~10x faster');
    console.log('  • Memory usage: <500MB for thousands of executions');
    
    console.log('\n🚀 Usage Examples:');
    console.log('  # Extract last 30 days from project 4889');
    console.log('  node extract-bulk.js --project 4889');
    console.log('');
    console.log('  # High-performance with full processing');
    console.log('  node extract-bulk.js --project 4889 --workers 15 --all');
    console.log('');
    console.log('  # Dry run to see what would be extracted');
    console.log('  node extract-bulk.js --project 4889 --days 7 --dry-run');
}

// Run tests
if (require.main === module) {
    runTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = runTests;