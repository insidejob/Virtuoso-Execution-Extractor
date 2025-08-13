/**
 * Bulk Extractor - Core Orchestration V2.0
 * 
 * Enhanced bulk extraction orchestrator with re-execution intelligence:
 * - Execution list fetching
 * - Shared data caching
 * - Worker pool management
 * - Smart re-execution handling with configurable strategies
 * - Journey-centric organization with failure clustering
 * - Progress tracking and trend analysis
 * - Results aggregation with historical data
 * - Export generation with journey insights
 * 
 * COMPLETELY SEPARATE from individual extraction (extract-v10.js)
 * Uses different folder structure optimized for bulk operations
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const WorkerPool = require('./worker-pool');
const VirtuosoExtractorV10 = require('../extract-v10');
const BulkFolderStructure = require('./bulk-folders');

class BulkExtractor {
    constructor(options) {
        this.options = options;
        this.startTime = Date.now();
        
        // Load credentials from config
        this.loadConfig();
        
        // Initialize bulk folder structure with re-execution intelligence
        this.bulkFolders = new BulkFolderStructure({
            baseDir: this.options.output || 'bulk-extractions',
            strategy: this.options.strategy || 'smart',
            latestN: this.options.latestN || 5
        });
        
        // Initialize shared cache for stable data
        this.sharedCache = {
            project: null,
            organization: null,
            environments: null,
            apiTests: null,
            goals: new Map()
        };
        
        // Enhanced results tracking with journey insights
        this.results = {
            total: 0,
            successful: [],
            failed: [],
            skipped: [],
            reexecutions: {
                total: 0,
                by_strategy: {},
                storage_decisions: []
            },
            journey_insights: {},
            exports: {}
        };
        
        // Progress tracking
        this.progress = {
            fetched: 0,
            processed: 0,
            reexecutions_handled: 0,
            startTime: Date.now(),
            estimatedTotal: 0,
            lastUpdate: Date.now()
        };
        
        // Worker pool
        this.workerPool = null;
        
        // Session info will be set after creating bulk session
        this.sessionInfo = null;
    }
    
    loadConfig() {
        try {
            const configPath = path.join(__dirname, '..', 'config', 'v10-credentials.json');
            if (fs.existsSync(configPath)) {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.config = configData.api || {};
            } else {
                throw new Error('Config file not found');
            }
        } catch (error) {
            console.warn('⚠️  Warning: Could not load config/v10-credentials.json, using defaults');
            this.config = {
                baseUrl: 'https://api-app2.virtuoso.qa/api',
                token: 'a29eaf70-2a14-41aa-9a14-06bb3381cdce',
                sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
                clientId: '1754647483711_e9e9c12_production',
                organizationId: '1964'
            };
        }
        
        // Set up headers for API requests
        this.headers = {
            'accept': 'application/json, text/plain, */*',
            'authorization': `Bearer ${this.config.token}`,
            'origin': 'https://app2.virtuoso.qa',
            'referer': 'https://app2.virtuoso.qa/',
            'x-v-session-id': this.config.sessionId,
            'x-virtuoso-client-id': this.config.clientId,
            'x-virtuoso-client-name': 'Virtuoso UI'
        };
    }
    
    /**
     * Main extraction method with re-execution intelligence
     */
    async extract() {
        console.log('\n📋 Phase 1: Discovering executions...');
        
        // Step 1: Fetch execution list
        const executionList = await this.fetchExecutionList();
        
        if (this.options.dryRun) {
            return this.generateDryRunSummary(executionList);
        }
        
        console.log(`\n📋 Phase 2: Setting up bulk session with re-execution intelligence...`);
        
        // Step 2: Create bulk session structure
        await this.initializeBulkSession();
        
        console.log(`\n📋 Phase 3: Building shared cache...`);
        
        // Step 3: Build shared cache for optimal performance
        await this.buildSharedCache(executionList);
        
        console.log(`\n📋 Phase 4: Analyzing re-execution patterns...`);
        
        // Step 4: Analyze execution patterns and prepare strategy
        await this.analyzeExecutionPatterns(executionList);
        
        console.log(`\n📋 Phase 5: Parallel extraction with ${this.options.workers} workers and smart storage...`);
        
        // Step 5: Initialize enhanced worker pool with bulk strategies
        this.workerPool = new WorkerPool(this.options.workers, {
            sharedCache: this.sharedCache,
            config: this.config,
            extractorOptions: this.options,
            sessionInfo: this.sessionInfo,
            bulkFolders: this.bulkFolders,
            onProgress: this.updateProgress.bind(this),
            onComplete: this.onExtractionComplete.bind(this),
            onError: this.onExtractionError.bind(this),
            onReexecution: this.onReexecutionHandled.bind(this)
        });
        
        // Start parallel processing with intelligent storage
        await this.workerPool.processExecutions(executionList);
        
        console.log(`\n📋 Phase 6: Generating journey insights and aggregated reports...`);
        
        // Step 6: Generate enhanced reports with journey insights
        await this.generateEnhancedReports();
        
        return this.results;
    }
    
    /**
     * Fetch list of executions from API
     */
    async fetchExecutionList() {
        const startTime = Date.now();
        console.log('   🔍 Fetching execution list from API...');
        
        let executions = [];
        
        try {
            // If specific execution IDs are provided, use them directly
            if (this.options.executions && this.options.executions.length > 0) {
                console.log(`   📝 Using provided execution IDs: ${this.options.executions.length} executions`);
                
                executions = this.options.executions.map(id => ({
                    executionId: id,
                    projectId: this.options.project,
                    // We'll fetch the rest of the data when we process each execution
                    source: 'manual'
                }));
                
            } else {
                // Try multiple API endpoints to get execution lists
                executions = await this.fetchExecutionsFromAPI();
            }
            
            // Apply goal filtering if specified
            if (this.options.goals && this.options.goals.length > 0) {
                console.log(`   🎯 Filtering by goals: ${this.options.goals.join(', ')}`);
                executions = await this.filterExecutionsByGoals(executions);
            }
            
            // Apply date filtering
            executions = this.filterExecutionsByDate(executions);
            
            const fetchTime = Date.now() - startTime;
            console.log(`   ✅ Found ${executions.length} executions (${fetchTime}ms)`);
            
            this.results.total = executions.length;
            this.progress.estimatedTotal = executions.length;
            
            return executions;
            
        } catch (error) {
            console.error(`   ❌ Failed to fetch execution list: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Fetch executions from various API endpoints
     */
    async fetchExecutionsFromAPI() {
        let executions = [];
        
        // Fix date calculation - convert to milliseconds properly
        const startDate = new Date(this.options.dateFrom);
        const endDate = new Date(this.options.dateTo);
        const dateBegin = startDate.getTime();
        const dateEnd = endDate.getTime();
        
        console.log(`   📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`   📅 Timestamps: ${dateBegin} to ${dateEnd}`);
        
        // Try goals/metrics/executions endpoint first (most comprehensive)
        try {
            console.log('   🔗 Trying goals/metrics/executions endpoint...');
            
            const endpoint = `/goals/metrics/executions?projectId=${this.options.project}&dateBegin=${dateBegin}&dateEnd=${dateEnd}&cursor=0&limit=1000&orderBy=CREATED_DATE&orderDirection=DESC&envelope=false`;
            
            const data = await this.apiRequest(endpoint);
            
            if (data && (data.items || data.item)) {
                const items = data.items || (data.item ? [data.item] : []);
                executions = items.map(item => ({
                    executionId: item.executionId || item.id,
                    goalId: item.goalId,
                    goalName: item.goalName,
                    journeyId: item.journeyId,
                    journeyName: item.journeyName,
                    projectId: this.options.project,
                    status: item.status,
                    outcome: item.outcome,
                    createdDate: item.createdDate,
                    duration: item.duration,
                    source: 'goals_metrics'
                }));
                
                console.log(`   ✅ Found ${executions.length} executions from goals/metrics endpoint`);
                return executions;
            }
            
        } catch (error) {
            console.log(`   ⚠️  goals/metrics/executions failed: ${error.message}`);
            if (this.options.debug) {
                console.log(`   🔍 Error details: ${error.stack}`);
            }
        }
        
        // Try projects/metrics/executions endpoint as fallback
        try {
            console.log('   🔗 Trying projects/metrics/executions endpoint...');
            
            const endpoint = `/projects/metrics/executions?dateBegin=${dateBegin}&projectIds%5B%5D=${this.options.project}&envelope=false`;
            
            const data = await this.apiRequest(endpoint);
            
            if (data && (data.items || data.item)) {
                const items = data.items || (data.item ? [data.item] : []);
                executions = items.map(item => ({
                    executionId: item.executionId || item.id,
                    goalId: item.goalId,
                    goalName: item.goalName,
                    journeyId: item.journeyId,
                    journeyName: item.journeyName,
                    projectId: this.options.project,
                    status: item.status,
                    outcome: item.outcome,
                    createdDate: item.createdDate,
                    duration: item.duration,
                    source: 'projects_metrics'
                }));
                
                console.log(`   ✅ Found ${executions.length} executions from projects/metrics endpoint`);
                return executions;
            }
            
        } catch (error) {
            console.log(`   ⚠️  projects/metrics/executions failed: ${error.message}`);
            if (this.options.debug) {
                console.log(`   🔍 Error details: ${error.stack}`);
            }
        }
        
        // Try simpler endpoints as last resort
        try {
            console.log('   🔗 Trying simplified goals endpoint...');
            
            const endpoint = `/goals/metrics/executions/history?projectId=${this.options.project}&cursor=0&orderBy=NAME&orderDirection=ASC&envelope=false`;
            
            const data = await this.apiRequest(endpoint);
            
            if (data && (data.items || data.item)) {
                const items = data.items || (data.item ? [data.item] : []);
                
                // Filter by date manually if needed
                executions = items
                    .filter(item => {
                        if (item.createdDate) {
                            const itemDate = new Date(item.createdDate);
                            return itemDate >= startDate && itemDate <= endDate;
                        }
                        return true; // Include if no date to check
                    })
                    .map(item => ({
                        executionId: item.executionId || item.id,
                        goalId: item.goalId,
                        goalName: item.goalName,
                        journeyId: item.journeyId,
                        journeyName: item.journeyName,
                        projectId: this.options.project,
                        status: item.status,
                        outcome: item.outcome,
                        createdDate: item.createdDate,
                        duration: item.duration,
                        source: 'goals_history'
                    }));
                
                console.log(`   ✅ Found ${executions.length} executions from goals/history endpoint (filtered by date)`);
                return executions;
            }
            
        } catch (error) {
            console.log(`   ⚠️  goals/history endpoint failed: ${error.message}`);
            if (this.options.debug) {
                console.log(`   🔍 Error details: ${error.stack}`);
            }
        }
        
        // If all fail, provide helpful guidance
        console.log('\n   📋 API Endpoint Discovery Failed - Trying Alternative Approach...');
        console.log('   💡 You can still use the bulk extractor by providing specific execution IDs:');
        console.log(`   💡 Example: node extract-bulk.js --project ${this.options.project} --executions "173822,173819,173818"`);
        console.log('   💡 Or try a shorter date range to see if the API has data limits.');
        
        throw new Error('Could not fetch execution list from any API endpoint. Please provide specific execution IDs using --executions option.');
    }
    
    /**
     * Filter executions by goals
     */
    async filterExecutionsByGoals(executions) {
        // If executions already have goal names, filter directly
        const goalNames = this.options.goals.map(g => g.toLowerCase());
        
        return executions.filter(exec => {
            if (exec.goalName) {
                return goalNames.some(goalName => 
                    exec.goalName.toLowerCase().includes(goalName)
                );
            }
            // If no goal name, we'll need to fetch it during processing
            return true;
        });
    }
    
    /**
     * Filter executions by date range
     */
    filterExecutionsByDate(executions) {
        const startDate = new Date(this.options.dateFrom);
        const endDate = new Date(this.options.dateTo);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        
        return executions.filter(exec => {
            if (exec.createdDate) {
                const execDate = new Date(exec.createdDate);
                return execDate >= startDate && execDate <= endDate;
            }
            // If no date, include it and we'll check during processing
            return true;
        });
    }
    
    /**
     * Build shared cache for stable data to optimize worker performance
     */
    async buildSharedCache(executionList) {
        const startTime = Date.now();
        
        console.log('   📦 Caching stable data shared across all extractions...');
        
        try {
            // Fetch shared data in parallel
            const [projectData, organizationData, environmentData, apiTestData] = await Promise.all([
                this.fetchProjectData(),
                this.fetchOrganizationData(),
                this.fetchEnvironmentData(),
                this.fetchApiTestData()
            ]);
            
            this.sharedCache.project = projectData;
            this.sharedCache.organization = organizationData;
            this.sharedCache.environments = environmentData;
            this.sharedCache.apiTests = apiTestData;
            
            // Cache unique goals
            const uniqueGoalIds = [...new Set(executionList.map(e => e.goalId).filter(Boolean))];
            if (uniqueGoalIds.length > 0) {
                console.log(`   🎯 Caching ${uniqueGoalIds.length} unique goals...`);
                
                const goalPromises = uniqueGoalIds.map(goalId => 
                    this.fetchGoalData(goalId).catch(err => {
                        console.warn(`   ⚠️  Could not cache goal ${goalId}: ${err.message}`);
                        return null;
                    })
                );
                
                const goalResults = await Promise.all(goalPromises);
                
                for (let i = 0; i < uniqueGoalIds.length; i++) {
                    if (goalResults[i]) {
                        this.sharedCache.goals.set(uniqueGoalIds[i], goalResults[i]);
                    }
                }
            }
            
            const cacheTime = Date.now() - startTime;
            const cacheSize = this.calculateCacheSize();
            
            console.log(`   ✅ Shared cache built: ${cacheSize}MB (${cacheTime}ms)`);
            console.log(`   📊 Cached: Project, Organization, ${this.sharedCache.environments?.length || 0} environments, ${this.sharedCache.apiTests?.size || 0} API tests, ${this.sharedCache.goals.size} goals`);
            
        } catch (error) {
            console.warn(`   ⚠️  Failed to build shared cache: ${error.message}`);
            console.warn('   Continuing without shared cache (performance may be reduced)');
        }
    }
    
    calculateCacheSize() {
        try {
            const cacheStr = JSON.stringify({
                project: this.sharedCache.project,
                organization: this.sharedCache.organization,
                environments: this.sharedCache.environments,
                apiTests: this.sharedCache.apiTests ? Array.from(this.sharedCache.apiTests.values()) : [],
                goals: Array.from(this.sharedCache.goals.values())
            });
            return Math.round(cacheStr.length / 1024 / 1024 * 100) / 100; // MB
        } catch {
            return 0;
        }
    }
    
    // API request helpers (similar to extract-v10.js but optimized for bulk)
    async apiRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const url = `${this.config.baseUrl}${endpoint}`;
            
            if (this.options.debug) {
                console.log(`   🌐 API: ${endpoint}`);
            }
            
            https.get(url, { headers: this.headers }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        
                        if (res.statusCode !== 200) {
                            reject(new Error(`API error (${res.statusCode}): ${parsed.message || data}`));
                            return;
                        }
                        
                        resolve(parsed);
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${e.message}`));
                    }
                });
            }).on('error', reject);
        });
    }
    
    async fetchProjectData() {
        const endpoint = `/projects/${this.options.project}`;
        const data = await this.apiRequest(endpoint);
        return data?.item || data;
    }
    
    async fetchOrganizationData() {
        const endpoint = `/organizations/${this.config.organizationId}`;
        const data = await this.apiRequest(endpoint);
        return data?.item || data;
    }
    
    async fetchEnvironmentData() {
        const endpoint = `/projects/${this.options.project}/environments`;
        const data = await this.apiRequest(endpoint);
        
        if (data && data.item && data.item.environments) {
            return data.item.environments;
        } else if (data && data.items) {
            return data.items;
        }
        return data || [];
    }
    
    async fetchApiTestData() {
        try {
            const endpoint = `/api-tests`;
            const data = await this.apiRequest(endpoint);
            
            const apiTests = new Map();
            const allTests = data?.item?.apiTests || [];
            const folders = data?.item?.folders || {};
            
            // Build folder map for full test names
            const folderMap = new Map();
            function mapFolders(folderObj, parentPath = '') {
                for (const [id, folder] of Object.entries(folderObj)) {
                    const path = parentPath ? `${parentPath}.${folder.name}` : folder.name;
                    folderMap.set(id, path);
                    if (folder.folders) {
                        mapFolders(folder.folders, path);
                    }
                }
            }
            mapFolders(folders);
            
            // Process all tests
            allTests.forEach(test => {
                const folderPath = folderMap.get(test.folder) || '';
                const fullName = folderPath ? `${folderPath}.${test.name}` : test.name;
                
                apiTests.set(test.id, {
                    id: test.id,
                    name: fullName,
                    url: '', // Not available in API
                    method: 'GET',
                    _metadata: {
                        fromApi: true,
                        urlManual: false
                    }
                });
            });
            
            return apiTests;
            
        } catch (error) {
            console.warn(`   ⚠️  Could not fetch API tests: ${error.message}`);
            return new Map();
        }
    }
    
    async fetchGoalData(goalId) {
        try {
            const endpoint = `/goals/${goalId}`;
            const data = await this.apiRequest(endpoint);
            return data?.item || data;
        } catch (error) {
            // Try project-specific endpoint
            try {
                const endpoint = `/projects/${this.options.project}/goals/${goalId}`;
                const data = await this.apiRequest(endpoint);
                return data?.item || data;
            } catch (e2) {
                throw new Error(`Goal ${goalId} not accessible: ${e2.message}`);
            }
        }
    }
    
    /**
     * Initialize bulk session with intelligent folder structure
     */
    async initializeBulkSession() {
        console.log('   \ud83c\udfaf Creating bulk session with re-execution intelligence...');\n        \n        // Create bulk session structure\n        this.sessionInfo = this.bulkFolders.createBulkSession(\n            this.sharedCache.organization || { name: 'Unknown Organization' },\n            this.sharedCache.project || { name: 'Unknown Project' }\n        );\n        \n        console.log(`   ✅ Bulk session created: ${this.sessionInfo.sessionId}`);\n        console.log(`   \ud83d\udcc1 Session path: ${this.sessionInfo.sessionPath}`);\n        console.log(`   \ud83d\udce6 Strategy: ${this.options.strategy || 'smart'} (${this.bulkFolders.strategies[this.options.strategy || 'smart']})`);\n        \n        if (this.options.strategy === 'latest-n') {\n            console.log(`   \ud83d\udd22 Keeping latest ${this.bulkFolders.latestN} executions per journey`);\n        }\n    }\n    \n    /**\n     * Analyze execution patterns for re-execution intelligence\n     */\n    async analyzeExecutionPatterns(executionList) {\n        console.log('   \ud83d\udd0d Analyzing execution patterns...');\n        \n        // Group executions by journey to identify re-executions\n        const journeyGroups = {};\n        const reexecutionStats = {\n            total_executions: executionList.length,\n            unique_journeys: 0,\n            reexecutions_detected: 0,\n            avg_executions_per_journey: 0,\n            max_executions_single_journey: 0,\n            most_executed_journey: null\n        };\n        \n        executionList.forEach(execution => {\n            const journeyKey = execution.journeyName || execution.journeyId || 'unknown';\n            if (!journeyGroups[journeyKey]) {\n                journeyGroups[journeyKey] = [];\n            }\n            journeyGroups[journeyKey].push(execution);\n        });\n        \n        // Analyze patterns\n        const journeyKeys = Object.keys(journeyGroups);\n        reexecutionStats.unique_journeys = journeyKeys.length;\n        reexecutionStats.avg_executions_per_journey = Math.round(executionList.length / journeyKeys.length);\n        \n        let maxExecutions = 0;\n        let mostExecutedJourney = null;\n        \n        journeyKeys.forEach(journeyKey => {\n            const executions = journeyGroups[journeyKey];\n            if (executions.length > 1) {\n                reexecutionStats.reexecutions_detected += (executions.length - 1);\n            }\n            if (executions.length > maxExecutions) {\n                maxExecutions = executions.length;\n                mostExecutedJourney = journeyKey;\n            }\n        });\n        \n        reexecutionStats.max_executions_single_journey = maxExecutions;\n        reexecutionStats.most_executed_journey = mostExecutedJourney;\n        \n        // Store analysis for reporting\n        this.results.reexecutions.total = reexecutionStats.reexecutions_detected;\n        this.results.journey_insights = {\n            patterns: reexecutionStats,\n            journey_groups: Object.keys(journeyGroups).map(key => ({\n                journey_name: key,\n                execution_count: journeyGroups[key].length,\n                is_reexecution: journeyGroups[key].length > 1,\n                executions: journeyGroups[key].map(e => ({\n                    id: e.executionId,\n                    outcome: e.outcome,\n                    timestamp: e.createdDate\n                }))\n            }))\n        };\n        \n        console.log(`   ✅ Analysis complete:`);\n        console.log(`      \ud83c\udfaf ${reexecutionStats.unique_journeys} unique journeys`);\n        console.log(`      \ud83d\udd04 ${reexecutionStats.reexecutions_detected} re-executions detected`);\n        console.log(`      \ud83d\udcc8 Avg ${reexecutionStats.avg_executions_per_journey} executions per journey`);\n        \n        if (mostExecutedJourney && maxExecutions > 5) {\n            console.log(`      \ud83c\udf86 Most executed: \"${mostExecutedJourney}\" (${maxExecutions} times)`);\n            console.log(`      \ud83e\udde0 Strategy \"${this.options.strategy || 'smart'}\" will handle these intelligently`);\n        }\n    }\n    \n    // Enhanced progress tracking and event handlers\n    updateProgress(progress) {
        this.progress.processed = progress.processed;
        this.progress.lastUpdate = Date.now();
        
        // Update progress display every 2 seconds
        if (Date.now() - this.progress.lastUpdate > 2000) {
            this.displayProgress();
        }
    }
    
    displayProgress() {
        const { processed, estimatedTotal } = this.progress;
        const elapsed = Date.now() - this.startTime;
        const rate = processed / (elapsed / 1000);
        const eta = estimatedTotal > processed ? Math.round((estimatedTotal - processed) / rate) : 0;
        
        const percentage = Math.round((processed / estimatedTotal) * 100);
        const progressBar = this.generateProgressBar(percentage);
        
        console.log(`[${progressBar}] ${processed}/${estimatedTotal} (${percentage}%) | ETA: ${eta}s | Speed: ${Math.round(rate)}/sec`);
    }
    
    generateProgressBar(percentage, width = 20) {
        const filled = Math.round(width * percentage / 100);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
    
    onExtractionComplete(execution, result) {
        this.results.successful.push({
            executionId: execution.executionId,
            goalName: execution.goalName,
            journeyName: execution.journeyName,
            duration: result.duration,
            outputPath: result.outputPath,
            files: result.files
        });
    }
    
    onExtractionError(execution, error) {
        this.results.failed.push({
            executionId: execution.executionId,
            goalName: execution.goalName,
            journeyName: execution.journeyName,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Handle re-execution storage decision callback
     */
    onReexecutionHandled(execution, storageDecision) {
        this.progress.reexecutions_handled++;
        
        // Track storage decisions for analysis
        this.results.reexecutions.storage_decisions.push({
            execution_id: execution.executionId,
            journey_name: execution.journeyName,
            strategy: storageDecision.strategy,
            stored: storageDecision.stored,
            location: storageDecision.location,
            reason: storageDecision.reason,
            replaced: storageDecision.replaced,
            timestamp: new Date().toISOString()
        });
        
        // Update strategy statistics
        const strategy = storageDecision.strategy;
        if (!this.results.reexecutions.by_strategy[strategy]) {
            this.results.reexecutions.by_strategy[strategy] = {
                total: 0,
                stored: 0,
                skipped: 0,
                replaced: 0
            };
        }
        
        this.results.reexecutions.by_strategy[strategy].total++;
        if (storageDecision.stored) {
            this.results.reexecutions.by_strategy[strategy].stored++;
        } else {
            this.results.reexecutions.by_strategy[strategy].skipped++;
        }
        if (storageDecision.replaced) {
            this.results.reexecutions.by_strategy[strategy].replaced++;
        }
    }
    
    // Enhanced report generation with journey insights
    async generateEnhancedReports() {
        const startTime = Date.now();
        
        try {
            console.log('   \ud83d\udccb Generating comprehensive bulk reports...');\n            \n            // Generate session summary with aggregation\n            const allExecutions = [...this.results.successful, ...this.results.failed]\n                .map(r => ({\n                    executionId: r.executionId,\n                    journeyName: r.journeyName,\n                    outcome: r.error ? 'FAILED' : 'SUCCESS',\n                    timestamp: r.timestamp || new Date().toISOString()\n                }));\n            \n            const sessionSummary = this.bulkFolders.generateSessionSummary(\n                this.sessionInfo, \n                allExecutions\n            );\n            \n            this.results.exports.session_summary = path.join(this.sessionInfo.sessionPath, 'session-summary.json');\n            this.results.exports.journey_aggregates = path.join(this.sessionInfo.aggregatesPath, 'journey-aggregates.json');\n            this.results.exports.daily_aggregates = path.join(this.sessionInfo.aggregatesPath, 'daily-aggregates.json');\n            \n            // Generate enhanced CSV export with re-execution insights\n            if (this.options.format === 'csv' || this.options.format === 'both') {\n                const csvPath = await this.generateEnhancedCSVExport();\n                this.results.exports.csv = csvPath;\n            }\n            \n            // Generate re-execution analysis report\n            const reexecutionReportPath = await this.generateReexecutionReport();\n            this.results.exports.reexecution_analysis = reexecutionReportPath;\n            \n            // Generate journey trend analysis\n            const trendReportPath = await this.generateJourneyTrendReport();\n            this.results.exports.journey_trends = trendReportPath;\n            \n            const reportTime = Date.now() - startTime;\n            console.log(`   ✅ Enhanced reports generated (${reportTime}ms)`);\n            console.log(`      \ud83d\udcc4 Session summary: ${path.basename(this.results.exports.session_summary)}`);\n            console.log(`      \ud83d\udcc8 Journey aggregates: ${path.basename(this.results.exports.journey_aggregates)}`);\n            console.log(`      \ud83d\udd04 Re-execution analysis: ${path.basename(this.results.exports.reexecution_analysis)}`);\n            console.log(`      \ud83d\udcc9 Journey trends: ${path.basename(this.results.exports.journey_trends)}`);\n            \n        } catch (error) {\n            console.warn(`   ⚠️  Failed to generate enhanced reports: ${error.message}`);\n            if (this.options.debug) {\n                console.error(error.stack);\n            }\n        }\n    }
    
    async generateSummaryReport() {
        const summary = {
            bulk_extraction: {
                session_id: path.basename(this.sessionDir),
                timestamp: new Date().toISOString(),
                version: 'bulk-v1.0.0',
                project_id: this.options.project,
                date_range: {
                    from: this.options.dateFrom,
                    to: this.options.dateTo,
                    days: this.options.days
                },
                configuration: {
                    workers: this.options.workers,
                    processing: {
                        nlp: this.options.nlp,
                        vars: this.options.vars,
                        validate: this.options.validate
                    },
                    filters: {
                        goals: this.options.goals,
                        specific_executions: this.options.executions?.length || 0
                    }
                }
            },
            performance: {
                total_time_ms: Date.now() - this.startTime,
                total_extractions: this.results.total,
                successful: this.results.successful.length,
                failed: this.results.failed.length,
                skipped: this.results.skipped.length,
                success_rate: Math.round((this.results.successful.length / this.results.total) * 100),
                avg_time_per_extraction: Math.round((Date.now() - this.startTime) / this.results.total),
                extractions_per_second: Math.round(this.results.total / ((Date.now() - this.startTime) / 1000))
            },
            shared_cache: {
                size_mb: this.calculateCacheSize(),
                project: !!this.sharedCache.project,
                organization: !!this.sharedCache.organization,
                environments: this.sharedCache.environments?.length || 0,
                api_tests: this.sharedCache.apiTests?.size || 0,
                goals: this.sharedCache.goals.size
            },
            results: {
                successful_extractions: this.results.successful,
                failed_extractions: this.results.failed,
                skipped_extractions: this.results.skipped
            }
        };
        
        const summaryPath = path.join(this.sessionDir, 'bulk-extraction-summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        
        return summaryPath;
    }
    
    async generateCSVExport() {
        const csvData = [];
        const header = [
            'execution_id', 'goal_name', 'journey_name', 'status', 'duration_ms',
            'extraction_status', 'output_path', 'error_message', 'timestamp'
        ];
        csvData.push(header.join(','));
        
        // Add successful extractions
        this.results.successful.forEach(result => {
            csvData.push([
                result.executionId,
                `"${result.goalName || ''}"`,
                `"${result.journeyName || ''}"`,
                'success',
                result.duration || '',
                'completed',
                `"${result.outputPath || ''}"`,
                '',
                new Date().toISOString()
            ].join(','));
        });
        
        // Add failed extractions
        this.results.failed.forEach(result => {
            csvData.push([
                result.executionId,
                `"${result.goalName || ''}"`,
                `"${result.journeyName || ''}"`,
                'failed',
                '',
                'error',
                '',
                `"${result.error || ''}"`,
                result.timestamp
            ].join(','));
        });
        
        const csvPath = path.join(this.sessionDir, 'bulk-extraction-results.csv');
        fs.writeFileSync(csvPath, csvData.join('\n'));
        
        return csvPath;
    }
    
    /**
     * Generate enhanced CSV export with re-execution insights
     */
    async generateEnhancedCSVExport() {
        const csvData = [];
        const header = [
            'execution_id', 'journey_name', 'goal_name', 'outcome', 'duration_ms',
            'extraction_status', 'storage_strategy', 'storage_location', 'storage_reason',
            'is_reexecution', 'failure_pattern', 'timestamp'
        ];
        csvData.push(header.join(','));
        
        // Add successful extractions
        this.results.successful.forEach(result => {
            const storageDecision = this.results.reexecutions.storage_decisions
                .find(d => d.execution_id === result.executionId) || {};
                
            csvData.push([
                result.executionId,
                `"${result.journeyName || ''}"`,
                `"${result.goalName || ''}"`,
                'SUCCESS',
                result.duration || '',
                'completed',
                storageDecision.strategy || 'unknown',
                `"${storageDecision.location || ''}"`,
                `"${storageDecision.reason || ''}"`,
                storageDecision.stored ? 'true' : 'false',
                '',
                new Date().toISOString()
            ].join(','));
        });
        
        // Add failed extractions
        this.results.failed.forEach(result => {
            const storageDecision = this.results.reexecutions.storage_decisions
                .find(d => d.execution_id === result.executionId) || {};
                
            csvData.push([
                result.executionId,
                `"${result.journeyName || ''}"`,
                `"${result.goalName || ''}"`,
                'FAILED',
                '',
                'error',
                storageDecision.strategy || 'unknown',
                `"${storageDecision.location || ''}"`,
                `"${storageDecision.reason || ''}"`,
                storageDecision.stored ? 'true' : 'false',
                'failure_pattern_detected',
                result.timestamp
            ].join(','));
        });
        
        const csvPath = path.join(this.sessionInfo.sessionPath, 'bulk-extraction-enhanced.csv');
        fs.writeFileSync(csvPath, csvData.join('\n'));
        
        return csvPath;
    }
    
    /**
     * Generate re-execution analysis report
     */
    async generateReexecutionReport() {
        const reexecutionReport = {
            analysis: {
                timestamp: new Date().toISOString(),
                strategy_used: this.options.strategy || 'smart',
                total_executions: this.results.total,
                reexecutions_detected: this.results.reexecutions.total,
                reexecutions_handled: this.progress.reexecutions_handled
            },
            strategy_performance: this.results.reexecutions.by_strategy,
            storage_decisions: this.results.reexecutions.storage_decisions,
            journey_insights: this.results.journey_insights,
            recommendations: this.generateReexecutionRecommendations()
        };
        
        const reportPath = path.join(this.sessionInfo.aggregatesPath, 'reexecution-analysis.json');
        fs.writeFileSync(reportPath, JSON.stringify(reexecutionReport, null, 2));
        
        return reportPath;
    }
    
    /**
     * Generate journey trend analysis
     */
    async generateJourneyTrendReport() {
        const trendReport = {
            analysis: {
                timestamp: new Date().toISOString(),
                analysis_period: {
                    from: this.options.dateFrom,
                    to: this.options.dateTo
                }
            },
            journey_trends: [],
            summary: {
                most_stable_journey: null,
                most_problematic_journey: null,
                trending_failures: [],
                improvement_opportunities: []
            }
        };
        
        // Analyze each journey from insights
        if (this.results.journey_insights.journey_groups) {
            this.results.journey_insights.journey_groups.forEach(journey => {
                const outcomes = journey.executions.reduce((acc, exec) => {
                    acc[exec.outcome] = (acc[exec.outcome] || 0) + 1;
                    return acc;
                }, {});
                
                const successRate = journey.execution_count > 0 
                    ? Math.round(((outcomes.PASS || 0) + (outcomes.SUCCESS || 0)) / journey.execution_count * 100)
                    : 0;
                
                const trend = {
                    journey_name: journey.journey_name,
                    execution_count: journey.execution_count,
                    success_rate: successRate,
                    outcomes: outcomes,
                    stability_score: this.calculateStabilityScore(journey),
                    trend_direction: this.calculateTrendDirection(journey.executions)
                };
                
                trendReport.journey_trends.push(trend);
            });
            
            // Sort by stability score
            trendReport.journey_trends.sort((a, b) => b.stability_score - a.stability_score);
            
            // Identify most stable and problematic journeys
            if (trendReport.journey_trends.length > 0) {
                trendReport.summary.most_stable_journey = trendReport.journey_trends[0];
                trendReport.summary.most_problematic_journey = trendReport.journey_trends[trendReport.journey_trends.length - 1];
            }
        }
        
        const reportPath = path.join(this.sessionInfo.aggregatesPath, 'journey-trends.json');
        fs.writeFileSync(reportPath, JSON.stringify(trendReport, null, 2));
        
        return reportPath;
    }
    
    /**
     * Generate recommendations based on re-execution analysis
     */
    generateReexecutionRecommendations() {
        const recommendations = [];
        
        const patterns = this.results.journey_insights.patterns;
        
        if (patterns.reexecutions_detected > patterns.total_executions * 0.5) {
            recommendations.push({
                type: 'HIGH_REEXECUTION_RATE',
                message: 'High re-execution rate detected. Consider investigating test stability.',
                severity: 'HIGH',
                suggested_action: 'Review journey reliability and environment stability'
            });
        }
        
        if (patterns.max_executions_single_journey > 10) {
            recommendations.push({
                type: 'JOURNEY_OVER_EXECUTION',
                message: `Journey "${patterns.most_executed_journey}" has ${patterns.max_executions_single_journey} executions`,
                severity: 'MEDIUM',
                suggested_action: 'Investigate why this journey requires frequent re-execution'
            });
        }
        
        const strategy = this.options.strategy || 'smart';
        if (strategy === 'all' && patterns.reexecutions_detected > 50) {
            recommendations.push({
                type: 'STORAGE_OPTIMIZATION',
                message: 'Consider using "smart" strategy to reduce storage usage',
                severity: 'LOW',
                suggested_action: 'Switch to --strategy smart to keep only latest success + unique failures'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Calculate stability score for a journey (0-100)
     */
    calculateStabilityScore(journey) {
        if (journey.execution_count === 0) return 0;
        
        const successCount = journey.executions.filter(e => 
            e.outcome === 'PASS' || e.outcome === 'SUCCESS'
        ).length;
        
        const baseSuccessRate = (successCount / journey.execution_count) * 100;
        
        // Penalize for high re-execution count
        const reexecutionPenalty = Math.min(journey.execution_count * 2, 20);
        
        return Math.max(0, Math.round(baseSuccessRate - reexecutionPenalty));
    }
    
    /**
     * Calculate trend direction based on execution history
     */
    calculateTrendDirection(executions) {
        if (executions.length < 2) return 'STABLE';
        
        // Sort by timestamp
        const sorted = executions.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Look at recent vs earlier success rates
        const halfPoint = Math.floor(sorted.length / 2);
        const earlier = sorted.slice(0, halfPoint);
        const recent = sorted.slice(halfPoint);
        
        const earlierSuccess = earlier.filter(e => 
            e.outcome === 'PASS' || e.outcome === 'SUCCESS'
        ).length / earlier.length;
        
        const recentSuccess = recent.filter(e => 
            e.outcome === 'PASS' || e.outcome === 'SUCCESS'
        ).length / recent.length;
        
        const diff = recentSuccess - earlierSuccess;
        
        if (diff > 0.2) return 'IMPROVING';
        if (diff < -0.2) return 'DEGRADING';
        return 'STABLE';
    }
    
    generateDryRunSummary(executionList) {
        console.log('\n🔍 DRY RUN RESULTS\n');
        console.log(`Would extract ${executionList.length} executions:`);
        
        // Group by goal
        const byGoal = {};
        executionList.forEach(exec => {
            const goalName = exec.goalName || 'Unknown Goal';
            if (!byGoal[goalName]) byGoal[goalName] = [];
            byGoal[goalName].push(exec);
        });
        
        Object.entries(byGoal).forEach(([goalName, executions]) => {
            console.log(`  📁 ${goalName}: ${executions.length} executions`);
        });
        
        // Estimate performance
        const estimatedTime = executionList.length * 350; // 350ms per execution sequential
        const parallelTime = Math.ceil(estimatedTime / this.options.workers);
        const speedImprovement = Math.round(estimatedTime / parallelTime * 10) / 10;
        
        console.log(`\n📊 Performance Estimate:`);
        console.log(`  Sequential time: ${Math.round(estimatedTime / 1000)}s`);
        console.log(`  Parallel time (${this.options.workers} workers): ${Math.round(parallelTime / 1000)}s`);
        console.log(`  Speed improvement: ${speedImprovement}x`);
        
        return {
            total: executionList.length,
            successful: [],
            failed: [],
            skipped: [],
            dryRun: true,
            estimatedTime: parallelTime
        };
    }
}

module.exports = BulkExtractor;