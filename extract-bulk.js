#!/usr/bin/env node

/**
 * Virtuoso Bulk Extractor V2.0 - Re-execution Intelligence Edition
 * 
 * COMPLETELY SEPARATE from individual extraction (extract-v10.js)
 * 
 * Advanced bulk extraction system designed for handling journeys that run 100s of times:
 * - Smart re-execution handling with configurable strategies
 * - Journey-centric organization with failure pattern clustering
 * - Trend analysis and performance degradation detection
 * - Worker pool pattern (10-20 parallel workers)
 * - Shared data caching optimization
 * - Comprehensive aggregation and reporting
 * 
 * Key Features:
 * - Smart storage strategies (smart, all, failures, latest-n, daily, changes)
 * - Unique failure pattern detection and clustering
 * - Journey execution timeline and trend analysis
 * - Success/failure rate tracking with recommendations
 * - Variable value changes over time analysis
 * - Memory-efficient streaming for large datasets
 * 
 * Performance + Intelligence:
 * - 10x speed improvement through parallelization
 * - Smart storage prevents disk bloat from re-executions
 * - Journey insights for test stability analysis
 * - Failure pattern clustering for debugging efficiency
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
            retries: 3,
            // Re-execution intelligence options
            strategy: 'smart', // smart, all, failures, latest-n, daily, changes
            latestN: 5 // For latest-n strategy
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
                case '--strategy':
                    options.strategy = nextArg;
                    i++;
                    break;
                case '--latest-n':
                    options.latestN = parseInt(nextArg);
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
Virtuoso Bulk Extractor V2.0 - Re-execution Intelligence Edition

🚨 IMPORTANT: This is COMPLETELY SEPARATE from individual extraction (extract-v10.js)
    • Different folder structure optimized for bulk operations
    • Smart re-execution handling prevents storage bloat
    • Journey-centric analysis with trend insights

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

Re-execution Intelligence (NEW!):
  --strategy <strategy>   How to handle re-executed journeys (default: smart):
                            smart    - Latest success + unique failures (recommended)
                            all      - Keep everything (like individual extractions)
                            failures - Only keep failures
                            latest-n - Keep last N executions of each journey
                            daily    - Keep one per day per journey  
                            changes  - Keep when outcome changes
  --latest-n <count>      Number of executions to keep for latest-n strategy (default: 5)

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

  # Smart extraction (recommended) - handles re-executions intelligently
  node extract-bulk.js --project 4889 --strategy smart

  # High-performance extraction with full processing and smart storage
  node extract-bulk.js --project 4889 --days 7 --workers 15 --all --strategy smart

  # Keep only failures for debugging problem journeys
  node extract-bulk.js --project 4889 --strategy failures

  # Keep last 10 executions of each journey for trend analysis
  node extract-bulk.js --project 4889 --strategy latest-n --latest-n 10

  # Daily snapshots for long-term monitoring
  node extract-bulk.js --project 4889 --strategy daily --days 90

  # Track outcome changes for regression detection  
  node extract-bulk.js --project 4889 --strategy changes

  # Keep everything (like individual extractions) - use with caution
  node extract-bulk.js --project 4889 --strategy all

  # Extract specific date range with enhanced CSV export
  node extract-bulk.js --project 4889 --date-from 2025-08-01 --date-to 2025-08-13 --format csv

  # Extract only specific goals with smart storage
  node extract-bulk.js --project 4889 --goals "Demo,Admin Section" --workers 20 --strategy smart

  # Dry run to see re-execution patterns and storage strategy impact
  node extract-bulk.js --project 4889 --days 7 --dry-run --strategy smart

Performance + Intelligence Targets:
  • 10x speed improvement through parallel processing
  • Smart storage prevents disk bloat from re-executions
  • Journey trend analysis detects performance degradation
  • Failure pattern clustering improves debugging efficiency
  • Memory usage under 500MB for thousands of executions
  • 100% accuracy maintained through validation
  
Re-execution Intelligence:
  • Journey executed 100 times? Smart strategy keeps latest success + unique failures
  • Failure pattern clustering groups similar errors together
  • Trend analysis shows journey stability over time
  • Outcome change detection identifies regressions
  • Variable value tracking across executions
  • Success rate monitoring with recommendations

Folder Structure (SEPARATE from individual extractions):
  bulk-extractions/
  └── {org-name}/
      └── {project-name}/
          └── {session-id}/
              ├── session-summary.json (comprehensive analysis)
              ├── by-journey/ (organized by journey with re-execution handling)
              │   └── {journey-name}/
              │       ├── execution-history.json (all executions timeline)
              │       ├── latest-success/ (most recent successful run)
              │       ├── unique-failures/ (clustered failure patterns)
              │       └── metrics.json (success rates, trends, stability)
              ├── by-date/ (chronological organization)
              └── aggregates/ (trend reports, journey insights)

Architecture:
  • Worker pool pattern for maximum parallelization
  • Shared data caching (projects, environments, API tests)
  • Intelligent storage with configurable strategies
  • Failure pattern clustering using signature matching
  • Journey-centric analysis with historical tracking
  • Comprehensive aggregation and trend reporting
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
        
        // Validate strategy
        const validStrategies = ['smart', 'all', 'failures', 'latest-n', 'daily', 'changes'];
        if (!validStrategies.includes(options.strategy)) {
            console.error(`❌ Error: Invalid strategy '${options.strategy}'. Valid options: ${validStrategies.join(', ')}`);
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
        
        // Show re-execution intelligence results
        if (results.reexecutions) {
            console.log(`\n🧠 Re-execution Intelligence:`);
            console.log(`   🔄 Re-executions detected: ${results.reexecutions.total}`);
            console.log(`   📦 Storage decisions made: ${results.reexecutions.storage_decisions?.length || 0}`);
            
            if (results.journey_insights?.patterns) {
                const patterns = results.journey_insights.patterns;
                console.log(`   🎯 Unique journeys: ${patterns.unique_journeys}`);
                console.log(`   📊 Avg executions per journey: ${patterns.avg_executions_per_journey}`);
                
                if (patterns.most_executed_journey && patterns.max_executions_single_journey > 3) {
                    console.log(`   🏆 Most executed: "${patterns.most_executed_journey}" (${patterns.max_executions_single_journey} times)`);
                }
            }
        }
        
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
            console.log(`🚀 Speed Improvement: ${speedImprovement}x faster than sequential extraction`);
            console.log(`🧠 Storage Efficiency: Smart re-execution handling prevents disk bloat`);
        }
        
        console.log(`\n📁 Output Directory: ${path.resolve(options.output)}`);
        console.log(`\n📊 Enhanced Reports Generated:`);
        
        if (results.exports?.session_summary) {
            console.log(`   📋 Session Summary: ${path.basename(results.exports.session_summary)}`);
        }
        if (results.exports?.journey_aggregates) {
            console.log(`   🎯 Journey Aggregates: ${path.basename(results.exports.journey_aggregates)}`);
        }
        if (results.exports?.reexecution_analysis) {
            console.log(`   🔄 Re-execution Analysis: ${path.basename(results.exports.reexecution_analysis)}`);
        }
        if (results.exports?.journey_trends) {
            console.log(`   📈 Journey Trends: ${path.basename(results.exports.journey_trends)}`);
        }
        if (results.exports?.csv) {
            console.log(`   📊 Enhanced CSV Export: ${path.basename(results.exports.csv)}`);
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