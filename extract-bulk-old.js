#!/usr/bin/env node

/**
 * Virtuoso Bulk Extractor - High Performance Edition
 * 
 * Scalable bulk extraction system for extracting thousands of executions
 * Target: 10x speed improvement through parallel processing
 * 
 * Features:
 * - Worker pool pattern (10-20 parallel workers)
 * - Queue-based job processing
 * - Progress tracking with ETA
 * - Memory-efficient streaming
 * - Error retry mechanism
 * - Resume capability for interruptions
 * - Shared data caching optimization
 * 
 * Performance Targets:
 * - 10 parallel workers = 10x speed improvement
 * - 1000 executions in ~60 seconds instead of 350 seconds
 * - Memory usage under 500MB even for thousands of executions
 * - 100% accuracy maintained through validation
 */

const path = require('path');
const fs = require('fs');
const BulkExtractor = require('./core/bulk-extractor');

class BulkExtractorCLI {
    constructor() {
        this.startTime = Date.now();
    }
    
    parseArgs() {
        const args = process.argv.slice(2);
        const options = {
            project: null,
            days: 30,
            workers: 10,
            dateFrom: null,
            dateTo: null,
            goals: [],
            executions: [],
            nlp: false,
            vars: false,
            validate: false,
            all: false,
            output: 'bulk-extractions',
            resume: false,
            debug: false,
            help: false,
            dryRun: false,
            format: 'json', // json, csv, both
            maxMemory: 500 * 1024 * 1024, // 500MB
            rateLimit: 50, // requests per second
            retries: 3,\n            // Re-execution intelligence options\n            strategy: 'smart', // smart, all, failures, latest-n, daily, changes\n            latestN: 5 // For latest-n strategy
        };
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const nextArg = args[i + 1];
            
            switch (arg) {
                case '--project':
                case '-p':
                    options.project = nextArg;
                    i++;
                    break;
                case '--days':
                case '-d':
                    options.days = parseInt(nextArg);
                    i++;
                    break;
                case '--workers':
                case '-w':
                    options.workers = parseInt(nextArg);
                    i++;
                    break;
                case '--date-from':
                    options.dateFrom = nextArg;
                    i++;
                    break;
                case '--date-to':
                    options.dateTo = nextArg;
                    i++;
                    break;
                case '--goals':
                    options.goals = nextArg.split(',').map(g => g.trim());
                    i++;
                    break;
                case '--executions':
                    options.executions = nextArg.split(',').map(e => e.trim());
                    i++;
                    break;
                case '--output':
                case '-o':
                    options.output = nextArg;
                    i++;
                    break;
                case '--format':
                    options.format = nextArg;
                    i++;
                    break;
                case '--max-memory':
                    options.maxMemory = parseInt(nextArg) * 1024 * 1024; // MB to bytes
                    i++;
                    break;
                case '--rate-limit':
                    options.rateLimit = parseInt(nextArg);
                    i++;
                    break;
                case '--retries':
                    options.retries = parseInt(nextArg);
                    i++;
                    break;
                case '--nlp':
                    options.nlp = true;
                    break;
                case '--vars':
                    options.vars = true;
                    break;
                case '--validate':
                    options.validate = true;
                    break;
                case '--all':
                    options.all = true;
                    options.nlp = true;
                    options.vars = true;
                    options.validate = true;
                    break;
                case '--resume':
                    options.resume = true;
                    break;
                case '--debug':
                    options.debug = true;
                    break;
                case '--dry-run':
                    options.dryRun = true;
                    break;
                case '--help':
                case '-h':
                    options.help = true;
                    break;
                default:
                    if (!arg.startsWith('--') && !options.project) {
                        options.project = arg;
                    }
                    break;
            }
        }
        
        return options;
    }
    
    showHelp() {
        console.log(`
Virtuoso Bulk Extractor - High Performance Edition

Usage: node extract-bulk.js --project <project_id> [options]

Required:
  --project, -p <id>      Project ID to extract executions from

Date Range (choose one):
  --days, -d <days>       Extract executions from last N days (default: 30)
  --date-from <date>      Start date (YYYY-MM-DD)
  --date-to <date>        End date (YYYY-MM-DD)

Filtering:
  --goals <goal1,goal2>   Only extract specific goals (comma-separated)
  --executions <id1,id2>  Only extract specific execution IDs (comma-separated)

Processing:
  --workers, -w <count>   Number of parallel workers (default: 10, max: 20)
  --nlp                   Generate NLP conversion for each execution
  --vars                  Extract variables for each execution
  --validate              Run validation for each execution
  --all                   Enable nlp + vars + validate (recommended for quality)

Output:
  --output, -o <dir>      Output directory (default: bulk-extractions)
  --format <type>         Export format: json, csv, both (default: json)

Performance:
  --max-memory <mb>       Max memory usage in MB (default: 500)
  --rate-limit <rps>      API requests per second (default: 50)
  --retries <count>       Retry attempts for failed extractions (default: 3)

Control:
  --resume                Resume interrupted bulk extraction
  --dry-run               Show what would be extracted without doing it
  --debug                 Show detailed progress and timing information
  --help, -h              Show this help message

Examples:
  # Extract last 30 days from project 4889 with 10 workers
  node extract-bulk.js --project 4889

  # High-performance extraction with full processing
  node extract-bulk.js --project 4889 --days 7 --workers 15 --all

  # Extract specific date range with CSV export
  node extract-bulk.js --project 4889 --date-from 2025-08-01 --date-to 2025-08-13 --format csv

  # Extract only specific goals
  node extract-bulk.js --project 4889 --goals "Demo,Admin Section" --workers 20

  # Resume interrupted extraction
  node extract-bulk.js --project 4889 --resume

  # Dry run to see what would be extracted
  node extract-bulk.js --project 4889 --days 7 --dry-run

Performance Targets:
  • 10 parallel workers = 10x speed improvement over single extraction
  • 1000 executions in ~60 seconds (vs 350 seconds sequential)
  • Memory usage under 500MB for thousands of executions
  • 100% accuracy maintained through validation
  • Automatic retry and error handling
  • Progress tracking with ETA

Architecture:
  • Worker pool pattern for maximum parallelization
  • Shared data caching (projects, environments, API tests)
  • Queue-based job distribution with rate limiting
  • Memory-efficient streaming for large datasets
  • Resume capability for handling interruptions
`);
    }
    
    async run() {
        const options = this.parseArgs();
        
        if (options.help) {
            this.showHelp();
            return;
        }
        
        if (!options.project) {
            console.error('❌ Error: Project ID is required');
            console.error('Use --help for usage information');
            process.exit(1);
        }
        
        // Validate options
        if (options.workers > 20) {
            console.warn('⚠️  Warning: More than 20 workers may hit API rate limits. Reducing to 20.');
            options.workers = 20;
        }
        
        if (options.workers < 1) {
            console.error('❌ Error: At least 1 worker is required');
            process.exit(1);
        }
        
        // Setup date range
        if (!options.dateFrom && !options.dateTo) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - options.days);
            
            options.dateFrom = startDate.toISOString().split('T')[0];
            options.dateTo = endDate.toISOString().split('T')[0];
        }
        
        console.log('🚀 Virtuoso Bulk Extractor V2.0 - Re-execution Intelligence Edition\n');
        console.log('=' .repeat(80));
        console.log(`Project ID: ${options.project}`);
        console.log(`Date Range: ${options.dateFrom} to ${options.dateTo}`);
        console.log(`Workers: ${options.workers} parallel workers`);
        console.log(`Processing: ${options.all ? 'Full (NLP + Variables + Validation)' : 'Raw data only'}`);
        console.log(`Re-execution Strategy: ${options.strategy} (intelligent storage)`);
        if (options.strategy === 'latest-n') {
            console.log(`  └── Keep latest ${options.latestN} executions per journey`);
        }
        console.log(`Output: ${options.output}/ (SEPARATE from individual extractions)`);
        console.log(`Format: ${options.format} (enhanced with re-execution insights)`);
        console.log(`Max Memory: ${Math.round(options.maxMemory / 1024 / 1024)}MB`);
        console.log(`Rate Limit: ${options.rateLimit} requests/second`);
        console.log('=' .repeat(80));
        
        if (options.dryRun) {
            console.log('\n🔍 DRY RUN MODE - No actual extraction will be performed\n');
        }
        
        try {
            // Initialize bulk extractor
            const bulkExtractor = new BulkExtractor(options);
            
            // Run the bulk extraction
            const results = await bulkExtractor.extract();
            
            // Print final summary
            this.printFinalSummary(results, options);
            
        } catch (error) {
            console.error('\n❌ Bulk extraction failed:', error.message);
            if (options.debug) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }
    
    printFinalSummary(results, options) {
        const totalTime = Date.now() - this.startTime;
        const timeInSeconds = Math.round(totalTime / 1000);
        const timeInMinutes = Math.round(timeInSeconds / 60);
        
        console.log('\n' + '=' .repeat(80));
        console.log('📊 BULK EXTRACTION COMPLETE\n');
        
        console.log(`⏱️  Total Time: ${timeInMinutes}m ${timeInSeconds % 60}s (${totalTime}ms)`);
        console.log(`✅ Successful: ${results.successful.length} executions`);
        console.log(`❌ Failed: ${results.failed.length} executions`);
        console.log(`⏭️  Skipped: ${results.skipped.length} executions`);
        
        if (results.total > 0) {
            const successRate = Math.round((results.successful.length / results.total) * 100);
            const avgTimePerExecution = Math.round(totalTime / results.total);
            const extractionsPerSecond = Math.round(results.total / (totalTime / 1000));
            
            console.log(`📈 Success Rate: ${successRate}%`);
            console.log(`⚡ Average Time: ${avgTimePerExecution}ms per execution`);
            console.log(`🚀 Throughput: ${extractionsPerSecond} extractions/second`);
            
            // Performance comparison
            const singleExtractorTime = results.total * 350; // 350ms per execution
            const speedImprovement = Math.round(singleExtractorTime / totalTime * 10) / 10;
            console.log(`📊 Speed Improvement: ${speedImprovement}x faster than sequential extraction`);
        }
        
        console.log(`\n📁 Output Directory: ${path.resolve(options.output)}`);
        
        if (results.exports?.summary) {
            console.log(`📋 Summary Report: ${results.exports.summary}`);
        }
        if (results.exports?.csv) {
            console.log(`📊 CSV Export: ${results.exports.csv}`);
        }
        
        if (results.failed.length > 0) {
            console.log(`\n⚠️  Failed Extractions:`);
            results.failed.slice(0, 5).forEach(failure => {
                console.log(`  - ${failure.executionId}: ${failure.error}`);
            });
            if (results.failed.length > 5) {
                console.log(`  ... and ${results.failed.length - 5} more`);
            }
        }
        
        console.log('\n' + '=' .repeat(80));
    }
}

// Main execution
async function main() {
    const cli = new BulkExtractorCLI();
    await cli.run();
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = BulkExtractorCLI;