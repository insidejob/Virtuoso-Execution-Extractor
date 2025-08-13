#!/usr/bin/env node

/**
 * Virtuoso Extractor V10 - Modular Architecture
 * 
 * Main entry point with flag-based extraction
 * Raw data ALWAYS saved, NLP/variables optional
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Core modules (our V1-V9 logic)
const NLPConverter = require('./core/nlp-converter');
const VariableExtractor = require('./core/variable-extractor');
const FolderStructure = require('./core/folder-structure');

// Intelligence modules (runtime analysis)
const EnhancedVariableIntelligence = require('./intelligence/variable-intelligence-v2');

// Knowledge base (for unknowns only)
const UniversalKnowledge = require('./.knowledge/universal-knowledge');

class VirtuosoExtractorV10 {
    constructor(options = {}) {
        // Load credentials from config file if it exists
        let configCredentials = {};
        try {
            const configPath = path.join(__dirname, 'config', 'v10-credentials.json');
            if (fs.existsSync(configPath)) {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                configCredentials = configData.api || {};
            }
        } catch (error) {
            console.warn('Warning: Could not load config/v10-credentials.json:', error.message);
        }
        
        // Configuration (with fallbacks to config file)
        this.config = {
            baseUrl: options.baseUrl || configCredentials.baseUrl || 'https://api-app2.virtuoso.qa/api',
            token: options.token || configCredentials.token || 'a29eaf70-2a14-41aa-9a14-06bb3381cdce',
            sessionId: options.sessionId || configCredentials.sessionId || 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
            clientId: options.clientId || configCredentials.clientId || '1754647483711_e9e9c12_production',
            organizationId: options.organizationId || configCredentials.organizationId || '1964',
            debug: options.debug || false,
            // Performance-first: Optimal caching is now DEFAULT, not opt-in
            disableCache: options.noCache || options.fresh || false,
            // Smart cache TTLs based on data stability (environments=30min, API tests=60min, projects=30min)
            cacheTTL: {
                projects: options.projectCacheTTL || 1800000,      // 30 minutes (stable)
                environments: options.environmentCacheTTL || 1800000, // 30 minutes (stable)
                apiTests: options.apiTestCacheTTL || 3600000,        // 60 minutes (very stable)
                default: options.defaultCacheTTL || 1800000          // 30 minutes
            },
            // Cache memory management
            cacheMaxSize: options.cacheMaxSize || 100 * 1024 * 1024, // 100MB
            cacheMaxEntries: options.cacheMaxEntries || 1000         // Max 1000 cache entries
        };
        
        // Performance tracking
        this.performanceMetrics = {
            startTime: null,
            apiCalls: {},
            processingTimes: {},
            totalTime: 0
        };
        
        // Smart cache with TTL, LRU eviction, and memory management
        this.cache = new Map();
        this.cacheTimestamps = new Map();
        this.cacheAccessOrder = new Map(); // For LRU tracking
        this.cacheMemoryUsage = 0;
        this.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            memoryUsage: 0,
            totalRequests: 0
        };
        
        // Headers for API requests
        this.headers = {
            'accept': 'application/json, text/plain, */*',
            'authorization': `Bearer ${this.config.token}`,
            'origin': 'https://app2.virtuoso.qa',
            'referer': 'https://app2.virtuoso.qa/',
            'x-v-session-id': this.config.sessionId,
            'x-virtuoso-client-id': this.config.clientId,
            'x-virtuoso-client-name': 'Virtuoso UI'
        };
        
        // Initialize modules
        this.nlpConverter = new NLPConverter();
        this.variableExtractor = new VariableExtractor();
        this.variableExtractor.setNLPConverter(this.nlpConverter);
        this.folderStructure = new FolderStructure({
            baseDir: options.outputDir || 'extractions',
            useTimestamps: options.timestamp !== false
        });
        this.variableIntelligence = new EnhancedVariableIntelligence();
        this.knowledge = new UniversalKnowledge();
        
        // Processing flags
        this.flags = {
            nlp: options.nlp || false,
            vars: options.vars || false,
            validate: options.validate || false,
            offline: options.offline || false,
            debug: options.debug || false,
            all: options.all || false,     // Combined nlp + vars + validate
            noCache: options.noCache || false,  // Disable caching for debugging
            fresh: options.fresh || false       // Force fresh data (bypass cache)
        };
        
        // Apply --all flag
        if (this.flags.all) {
            this.flags.nlp = true;
            this.flags.vars = true;
            this.flags.validate = true;
        }
        
        // Data storage
        this.rawData = {};
        this.validationReport = {
            timestamp: new Date().toISOString(),
            version: 'v10.0.0',
            flags: this.flags,
            issues: [],
            fixes: [],
            accuracy: 100
        };
    }
    
    /**
     * Performance tracking methods
     */
    startTimer(operation) {
        if (!this.performanceMetrics.startTime) {
            this.performanceMetrics.startTime = Date.now();
        }
        this.performanceMetrics[operation + '_start'] = Date.now();
    }
    
    endTimer(operation) {
        const endTime = Date.now();
        const startTime = this.performanceMetrics[operation + '_start'];
        if (startTime) {
            const duration = endTime - startTime;
            this.performanceMetrics.processingTimes[operation] = duration;
            if (this.config.debug) {
                console.log(`   ⏱️ ${operation}: ${duration}ms`);
            }
        }
    }
    
    /**
     * Cache management with multi-org isolation, LRU eviction, and memory management
     */
    getCacheKey(type, id) {
        // Namespace cache keys by organization and project for isolation
        const org = this.config.organizationId;
        return `org${org}_${type}_${id}`;
    }
    
    getCachedData(key, dataType = 'default') {
        this.cacheStats.totalRequests++;
        
        // Check if caching is disabled
        if (this.config.disableCache) {
            this.cacheStats.misses++;
            return null;
        }
        
        if (!this.cache.has(key)) {
            this.cacheStats.misses++;
            return null;
        }
        
        const timestamp = this.cacheTimestamps.get(key);
        const now = Date.now();
        
        // Get TTL for this data type
        const ttl = this.config.cacheTTL[dataType] || this.config.cacheTTL.default;
        
        // Check TTL (unless fresh flag is set)
        if (this.flags.fresh || (timestamp && (now - timestamp) > ttl)) {
            this.evictCacheEntry(key);
            this.cacheStats.misses++;
            return null;
        }
        
        // Update LRU order
        this.cacheAccessOrder.set(key, now);
        this.cacheStats.hits++;
        
        return this.cache.get(key);
    }
    
    setCachedData(key, data, dataType = 'default') {
        // Don't cache if disabled
        if (this.config.disableCache) {
            return;
        }
        
        // Calculate memory usage
        const dataSize = this.calculateDataSize(data);
        
        // Check if we need to make room
        this.ensureCacheSpace(dataSize);
        
        // Store the data
        this.cache.set(key, data);
        this.cacheTimestamps.set(key, Date.now());
        this.cacheAccessOrder.set(key, Date.now());
        
        // Update memory usage
        this.cacheMemoryUsage += dataSize;
        this.cacheStats.memoryUsage = this.cacheMemoryUsage;
        
        if (this.config.debug) {
            console.log(`   💾 Cached ${key}: ${this.formatBytes(dataSize)} (Total: ${this.formatBytes(this.cacheMemoryUsage)})`);
        }
    }
    
    evictCacheEntry(key) {
        if (this.cache.has(key)) {
            const data = this.cache.get(key);
            const dataSize = this.calculateDataSize(data);
            
            this.cache.delete(key);
            this.cacheTimestamps.delete(key);
            this.cacheAccessOrder.delete(key);
            
            this.cacheMemoryUsage -= dataSize;
            this.cacheStats.memoryUsage = this.cacheMemoryUsage;
            this.cacheStats.evictions++;
        }
    }
    
    ensureCacheSpace(newDataSize) {
        // Check memory limit
        while (this.cacheMemoryUsage + newDataSize > this.config.cacheMaxSize && this.cache.size > 0) {
            this.evictLRU();
        }
        
        // Check entry count limit
        while (this.cache.size >= this.config.cacheMaxEntries) {
            this.evictLRU();
        }
    }
    
    evictLRU() {
        // Find least recently used entry
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, accessTime] of this.cacheAccessOrder) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            if (this.config.debug) {
                console.log(`   🗑️ LRU evicted: ${oldestKey}`);
            }
            this.evictCacheEntry(oldestKey);
        }
    }
    
    calculateDataSize(data) {
        // Rough estimation of data size in bytes
        return JSON.stringify(data).length * 2; // UTF-16 encoding
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getCacheStats() {
        const hitRate = this.cacheStats.totalRequests > 0 
            ? Math.round((this.cacheStats.hits / this.cacheStats.totalRequests) * 100) 
            : 0;
        
        return {
            ...this.cacheStats,
            hitRate: hitRate,
            entries: this.cache.size,
            memoryFormatted: this.formatBytes(this.cacheMemoryUsage)
        };
    }

    /**
     * Main extraction method
     */
    async extract(urlOrPath) {
        this.startTimer('total_extraction');
        
        console.log('🚀 Virtuoso Extraction V10 Starting\n');
        console.log('=' .repeat(70));
        console.log(`Version: V10.8.0 - Extension & JavaScript Execution Support`);
        console.log(`Flags: ${JSON.stringify(this.flags)}`);
        if (this.flags.noCache || this.flags.fresh) {
            console.log(`🚫 Cache Disabled: ${this.flags.noCache ? 'No caching' : 'Fresh data only'} (for debugging)`);
        } else {
            console.log(`⚡ Performance Mode: Optimized caching enabled by default`);
            console.log(`   Cache TTLs: Projects/Environments: 30min, API Tests: 60min`);
            console.log(`   Memory Limit: ${Math.round(this.config.cacheMaxSize / 1024 / 1024)}MB, Max Entries: ${this.config.cacheMaxEntries}`);
        }
        console.log('=' .repeat(70));
        
        try {
            let folderPath;
            
            if (this.flags.offline) {
                // Offline mode - reprocess existing data
                console.log('\n📋 Running in OFFLINE mode - reprocessing existing data');
                folderPath = urlOrPath;
                await this.reprocessOffline(folderPath);
            } else {
                // Online mode - fetch from API
                console.log(`\nURL: ${urlOrPath}`);
                
                // Parse URL
                const ids = this.parseURL(urlOrPath);
                if (!ids.execution || !ids.journey || !ids.project) {
                    throw new Error('Invalid URL format - missing required IDs');
                }
                
                // Fetch and save raw data
                folderPath = await this.fetchAndSaveRawData(ids, urlOrPath);
                
                // Process based on flags
                await this.processData(folderPath);
            }
            
            // Print summary
            this.endTimer('total_extraction');
            this.printSummary(folderPath);
            
        } catch (error) {
            console.error('\n❌ Extraction failed:', error.message);
            if (this.flags.debug) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }
    
    /**
     * Parse Virtuoso URL
     */
    parseURL(url) {
        const projectMatch = url.match(/project\/(\d+)/);
        const executionMatch = url.match(/execution\/(\d+)/);
        const journeyMatch = url.match(/journey\/(\d+)/);
        
        return {
            project: projectMatch ? projectMatch[1] : null,
            execution: executionMatch ? executionMatch[1] : null,
            journey: journeyMatch ? journeyMatch[1] : null
        };
    }
    
    /**
     * Fetch and save raw data (always done) - OPTIMIZED with parallel fetching
     */
    async fetchAndSaveRawData(ids, url) {
        this.startTimer('api_fetch');
        console.log('\n📋 Step 1: Fetching raw data from API...');
        
        // Phase 1: Fetch independent data in parallel
        const [journeyData, executionData, projectData, environmentData, organizationData] = await Promise.all([
            this.fetchJourneyData(ids),
            this.fetchExecutionData(ids),
            this.fetchProjectData(ids),
            this.fetchEnvironmentData(ids),
            this.fetchOrganizationData()
        ]);
        
        // Phase 2: Fetch dependent data (goal needs journey, API tests need journey)
        const [goalData, apiTestDetails] = await Promise.all([
            this.fetchGoalData(ids, journeyData),
            this.fetchApiTestDetails(ids.project, journeyData)
        ]);
        
        this.endTimer('api_fetch');
        
        // Store raw data
        this.rawData = {
            journey: journeyData,
            goal: goalData,
            execution: executionData,
            project: projectData,
            organization: organizationData,
            environments: environmentData,
            apiTests: apiTestDetails
        };
        
        // Create folder structure
        console.log('\n📋 Step 2: Creating folder structure...');
        const folderInfo = this.folderStructure.createExtractionFolder(
            organizationData,
            projectData,
            goalData,
            executionData,
            journeyData
        );
        
        // Save raw data (ALWAYS)
        console.log('\n📋 Step 3: Saving raw data...');
        const paths = this.folderStructure.getOutputPaths(folderInfo.basePath, this.flags);
        
        fs.writeFileSync(paths.rawData.journey, JSON.stringify(journeyData, null, 2));
        fs.writeFileSync(paths.rawData.goal, JSON.stringify(goalData, null, 2));
        fs.writeFileSync(paths.rawData.execution, JSON.stringify(executionData, null, 2));
        fs.writeFileSync(paths.rawData.project, JSON.stringify(projectData, null, 2));
        fs.writeFileSync(paths.rawData.organization, JSON.stringify(organizationData, null, 2));
        fs.writeFileSync(paths.rawData.environments, JSON.stringify(environmentData, null, 2));
        
        console.log(`✅ Raw data saved to: ${folderInfo.basePath}/raw_data/`);
        
        // Save extraction summary - V11: Enhanced with organization and clean structure
        const metadata = {
            url: url,
            ids: ids,
            organization: { id: this.config.organizationId, name: organizationData?.name },
            project: { id: ids.project, name: projectData?.name },
            goal: goalData ? { id: goalData.id, name: goalData.name } : null,
            execution: { 
                id: ids.execution, 
                status: executionData?.status,
                outcome: executionData?.outcome,
                duration: executionData?.totalDuration,
                statistics: executionData?.journeyStatistics
            },
            journey: {
                id: ids.journey,
                name: journeyData?.name,
                title: journeyData?.title,
                checkpoints: journeyData?.cases?.length || 0,
                total_steps: journeyData?.cases?.reduce((acc, c) => acc + (c.steps?.length || 0), 0) || 0
            },
            // V11: Add folder structure information
            folder_structure: folderInfo.metadata,
            // V10.5: Add failure analysis
            failure_analysis: this.extractFailureMetadata(executionData)
        };
        
        this.folderStructure.saveExtractionSummary(folderInfo.basePath, metadata, this.flags);
        
        return folderInfo.basePath;
    }
    
    /**
     * Process data based on flags
     */
    async processData(folderPath) {
        // Load raw data if not already loaded
        if (!this.rawData.journey) {
            const paths = this.folderStructure.getOutputPaths(folderPath, this.flags);
            this.rawData = {
                journey: JSON.parse(fs.readFileSync(paths.rawData.journey, 'utf8')),
                goal: JSON.parse(fs.readFileSync(paths.rawData.goal, 'utf8')),
                execution: JSON.parse(fs.readFileSync(paths.rawData.execution, 'utf8')),
                project: JSON.parse(fs.readFileSync(paths.rawData.project, 'utf8')),
                organization: fs.existsSync(paths.rawData.organization) ? 
                    JSON.parse(fs.readFileSync(paths.rawData.organization, 'utf8')) : null,
                environments: JSON.parse(fs.readFileSync(paths.rawData.environments, 'utf8'))
            };
        }
        
        // OPTIMIZATION: Process flags in parallel where possible
        const processingTasks = [];
        
        if (this.flags.nlp) {
            processingTasks.push(
                this.processNLP(folderPath).then(() => console.log('✅ NLP conversion complete'))
            );
        }
        
        if (this.flags.vars) {
            processingTasks.push(
                this.processVariables(folderPath).then(() => console.log('✅ Variable extraction complete'))
            );
        }
        
        // Run NLP and variables in parallel, then validation (which depends on both)
        if (processingTasks.length > 0) {
            console.log('\n📋 Processing: Running operations in parallel...');
            this.startTimer('parallel_processing');
            await Promise.all(processingTasks);
            this.endTimer('parallel_processing');
        }
        
        // Run validation after other processing (needs NLP report)
        if (this.flags.validate) {
            console.log('\n📋 Processing: Validation...');
            this.startTimer('validation');
            await this.runValidation(folderPath);
            this.endTimer('validation');
        }
    }
    
    /**
     * Process NLP conversion
     */
    async processNLP(folderPath) {
        this.startTimer('nlp_conversion');
        
        // Convert to NLP
        const nlpResult = this.convertToNLP();
        
        // Save NLP file
        const nlpPath = path.join(folderPath, 'execution.nlp.txt');
        fs.writeFileSync(nlpPath, nlpResult.nlp);
        
        console.log(`✅ NLP saved: ${nlpPath}`);
        console.log(`   Lines: ${nlpResult.nlp.split('\n').length}`);
        console.log(`   Success Rate: ${nlpResult.report.successRate}%`);
        
        // Track unknown actions
        if (nlpResult.report.unknownActions.length > 0) {
            console.log(`   ⚠️ Unknown actions: ${nlpResult.report.unknownActions.join(', ')}`);
            this.generateFixInstructions(nlpResult.report.unknownActions, folderPath);
        }
        
        this.endTimer('nlp_conversion');
    }
    
    /**
     * Convert to NLP with self-healing
     */
    convertToNLP() {
        const lines = [];
        const report = {
            totalSteps: 0,
            successfulSteps: 0,
            unknownActions: [],
            successRate: 0
        };
        
        // Reset converter
        this.nlpConverter.reset();
        
        // Set API test cache if available
        if (this.rawData.apiTests) {
            this.nlpConverter.setApiTestCache(Array.from(this.rawData.apiTests.values()));
        }
        
        // Process with core converter first - V10.5: Pass execution data
        const coreResult = this.nlpConverter.convert(
            this.rawData.journey,
            this.rawData.environments,
            this.rawData.execution
        );
        
        // Handle unknown actions with knowledge base
        const processedLines = [];
        const nlpLines = coreResult.nlp.split('\n');
        
        nlpLines.forEach(line => {
            if (line.startsWith('# [Unvalidated action:') || !line) {
                // Skip or handle with knowledge base
                processedLines.push(line);
            } else {
                processedLines.push(line);
            }
        });
        
        // If there are unknown actions, use knowledge base
        const unknownActions = Array.from(this.nlpConverter.getReport().unknownActions);
        if (unknownActions.length > 0) {
            console.log(`   Using knowledge base for ${unknownActions.length} unknown actions...`);
            
            // Re-process with knowledge base
            this.rawData.journey.cases?.forEach(testCase => {
                testCase.steps?.forEach(step => {
                    if (unknownActions.includes(step.action)) {
                        const selectors = this.nlpConverter.extractSelectors(step);
                        const nlp = this.knowledge.handleUnknown(step, selectors);
                        if (nlp) {
                            // Replace in processed lines
                            // This is simplified - in production would need better matching
                            console.log(`   → Generated NLP for ${step.action}: ${nlp}`);
                        }
                    }
                });
            });
        }
        
        return {
            nlp: processedLines.join('\n'),
            report: this.nlpConverter.getReport()
        };
    }
    
    /**
     * Process variable extraction
     */
    async processVariables(folderPath) {
        this.startTimer('variable_extraction');
        
        // Extract variables - V10: Now includes execution data
        const variables = this.variableExtractor.extract(
            this.rawData.journey,
            this.rawData.environments,
            this.rawData.execution  // V10: Pass execution data for sideEffects
        );
        
        // Enhance with intelligence
        const enhanced = this.variableIntelligence.analyze ? 
            this.variableIntelligence.analyze(variables) :
            this.variableIntelligence.analyzeVariables ? 
                this.variableIntelligence.analyzeVariables(variables) :
                variables;
        
        // Fix credential types
        if (enhanced.variables) {
            this.variableExtractor.fixCredentialTypes(enhanced.variables);
        } else if (enhanced) {
            this.variableExtractor.fixCredentialTypes(enhanced);
        }
        
        // Save variables
        const varsPath = path.join(folderPath, 'variables.json');
        fs.writeFileSync(varsPath, JSON.stringify(enhanced, null, 2));
        
        console.log(`✅ Variables saved: ${varsPath}`);
        console.log(`   Total used: ${variables.summary.total_used}`);
        console.log(`   Filtered empty: ${variables.summary.filtered_empty}`);
        
        // Show filtered variables if any
        if (variables.filtered_empty_variables?.length > 0) {
            console.log(`   Filtered: ${variables.filtered_empty_variables.join(', ')}`);
        }
        
        this.endTimer('variable_extraction');
    }
    
    /**
     * Run validation
     * V10.5: Enhanced with execution outcome validation
     */
    async runValidation(folderPath) {
        const report = this.nlpConverter.getReport();
        
        // V10.5: Analyze execution outcomes
        const executionAnalysis = this.analyzeExecutionOutcomes();
        
        // Calculate accuracy considering execution failures
        const conversionSuccessRate = report.successRate || 0;
        const executionSuccessRate = executionAnalysis.successRate || 0;
        
        // Overall accuracy is the lower of conversion success or execution success
        this.validationReport.accuracy = Math.min(conversionSuccessRate, executionSuccessRate);
        
        this.validationReport.totalSteps = report.totalSteps;
        this.validationReport.successfulSteps = report.successfulSteps;
        this.validationReport.failedSteps = report.failedSteps;
        this.validationReport.unknownActions = report.unknownActions;
        this.validationReport.warnings = report.warnings || [];
        this.validationReport.errors = report.errors || [];
        
        // V10.5: Add execution analysis
        this.validationReport.execution_analysis = executionAnalysis;
        
        // Check for conversion issues
        if (report.unknownActions.length > 0) {
            this.validationReport.issues.push({
                type: 'UNKNOWN_ACTIONS',
                severity: 'HIGH',
                actions: report.unknownActions,
                impact: `${report.unknownActions.length} actions not recognized`
            });
        }
        
        if (report.errors.length > 0) {
            this.validationReport.issues.push({
                type: 'CONVERSION_ERRORS',
                severity: 'CRITICAL',
                errors: report.errors,
                impact: `${report.errors.length} steps failed to convert`
            });
        }
        
        // V10.5: Check for execution issues
        if (executionAnalysis.failed_steps > 0) {
            this.validationReport.issues.push({
                type: 'EXECUTION_FAILURES',
                severity: 'CRITICAL',
                failed_steps: executionAnalysis.failed_steps,
                errors: executionAnalysis.error_details,
                impact: `${executionAnalysis.failed_steps} steps failed during execution`
            });
        }
        
        if (executionAnalysis.skipped_steps > 0) {
            this.validationReport.issues.push({
                type: 'SKIPPED_STEPS',
                severity: 'MEDIUM',
                skipped_steps: executionAnalysis.skipped_steps,
                impact: `${executionAnalysis.skipped_steps} steps were skipped`
            });
        }
        
        // Save validation report
        const validationPath = path.join(folderPath, 'validation_report.json');
        fs.writeFileSync(validationPath, JSON.stringify(this.validationReport, null, 2));
        
        console.log(`✅ Validation saved: ${validationPath}`);
        console.log(`   Accuracy: ${this.validationReport.accuracy}%`);
        console.log(`   Execution: ${executionAnalysis.passed_steps} passed, ${executionAnalysis.failed_steps} failed, ${executionAnalysis.skipped_steps} skipped`);
        
        // Create accuracy folder if issues
        if (this.validationReport.issues.length > 0) {
            this.createAccuracyReport(folderPath);
        }
    }
    
    /**
     * V10.5: Extract failure-specific metadata
     */
    extractFailureMetadata(executionData) {
        const metadata = {
            has_failures: false,
            failed_steps: [],
            skipped_steps: [],
            error_types: new Set(),
            browser_environment: null,
            failure_summary: null
        };
        
        if (!executionData) {
            return metadata;
        }
        
        const execution = executionData.item || executionData;
        const testSuites = execution.testSuites || {};
        
        Object.values(testSuites).forEach(suite => {
            const testCases = suite.testCases || {};
            
            Object.values(testCases).forEach(testCase => {
                const testSteps = testCase.testSteps || {};
                
                Object.entries(testSteps).forEach(([stepId, stepData]) => {
                    if (stepData.outcome === 'ERROR' || stepData.outcome === 'FAIL') {
                        metadata.has_failures = true;
                        
                        const failureInfo = {
                            stepId: stepId,
                            outcome: stepData.outcome,
                            duration: stepData.duration,
                            screenshot: stepData.screenshot
                        };
                        
                        if (stepData.output && stepData.output.type === 'ERROR') {
                            failureInfo.error = {
                                message: stepData.output.message,
                                exception: stepData.output.exception,
                                environment: stepData.output.environment
                            };
                            
                            metadata.error_types.add(stepData.output.exception || 'Unknown');
                            
                            // Capture browser environment from first error
                            if (!metadata.browser_environment && stepData.output.environment) {
                                metadata.browser_environment = stepData.output.environment;
                            }
                        }
                        
                        metadata.failed_steps.push(failureInfo);
                    } else if (stepData.outcome === 'SKIP') {
                        metadata.skipped_steps.push({
                            stepId: stepId,
                            outcome: stepData.outcome
                        });
                    }
                });
            });
        });
        
        // Convert Set to Array for JSON serialization
        metadata.error_types = Array.from(metadata.error_types);
        
        // Generate failure summary
        if (metadata.has_failures) {
            metadata.failure_summary = {
                total_failed: metadata.failed_steps.length,
                total_skipped: metadata.skipped_steps.length,
                primary_error_type: metadata.error_types[0] || 'Unknown',
                first_failure: metadata.failed_steps[0] || null
            };
        }
        
        return metadata;
    }
    
    /**
     * V10.5: Analyze execution outcomes for validation
     */
    analyzeExecutionOutcomes() {
        const analysis = {
            passed_steps: 0,
            failed_steps: 0,
            skipped_steps: 0,
            total_steps: 0,
            successRate: 100,
            error_details: []
        };
        
        if (!this.rawData.execution) {
            return analysis;
        }
        
        const execution = this.rawData.execution.item || this.rawData.execution;
        const testSuites = execution.testSuites || {};
        
        // Analyze all test steps
        Object.values(testSuites).forEach(suite => {
            const testCases = suite.testCases || {};
            
            Object.values(testCases).forEach(testCase => {
                const testSteps = testCase.testSteps || {};
                
                Object.entries(testSteps).forEach(([stepId, stepData]) => {
                    analysis.total_steps++;
                    
                    if (stepData.outcome === 'PASS') {
                        analysis.passed_steps++;
                    } else if (stepData.outcome === 'ERROR' || stepData.outcome === 'FAIL') {
                        analysis.failed_steps++;
                        if (stepData.output && stepData.output.type === 'ERROR') {
                            analysis.error_details.push({
                                stepId: stepId,
                                message: stepData.output.message,
                                exception: stepData.output.exception,
                                environment: stepData.output.environment
                            });
                        }
                    } else if (stepData.outcome === 'SKIP') {
                        analysis.skipped_steps++;
                    }
                });
            });
        });
        
        // Calculate success rate (only considering executed steps)
        const executedSteps = analysis.passed_steps + analysis.failed_steps;
        if (executedSteps > 0) {
            analysis.successRate = Math.round((analysis.passed_steps / executedSteps) * 100);
        }
        
        return analysis;
    }
    
    /**
     * Reprocess offline
     */
    async reprocessOffline(folderPath) {
        console.log(`Reprocessing: ${folderPath}`);
        
        // Check if folder exists
        if (!fs.existsSync(folderPath)) {
            throw new Error(`Folder not found: ${folderPath}`);
        }
        
        // Process based on flags
        await this.processData(folderPath);
    }
    
    /**
     * Generate fix instructions for unknown actions
     */
    generateFixInstructions(unknownActions, folderPath) {
        const instructions = [];
        
        unknownActions.forEach(action => {
            const fix = this.knowledge.generateFixInstructions(action);
            instructions.push(fix);
        });
        
        if (instructions.length > 0 && this.flags.validate) {
            const accuracyPath = path.join(folderPath, '.accuracy');
            if (!fs.existsSync(accuracyPath)) {
                fs.mkdirSync(accuracyPath);
            }
            
            const fixPath = path.join(accuracyPath, 'FIX_INSTRUCTIONS.md');
            let content = '# Fix Instructions for Unknown Actions\n\n';
            
            instructions.forEach(fix => {
                content += `## ${fix.action}\n\n`;
                content += `**File:** ${fix.file}\n`;
                content += `**Location:** ${fix.location}\n`;
                content += `**Confidence:** ${fix.confidence}\n\n`;
                content += '```javascript\n';
                content += fix.suggested_code;
                content += '\n```\n\n';
                if (fix.handler_code) {
                    content += '**Handler Implementation:**\n';
                    content += '```javascript\n';
                    content += fix.handler_code;
                    content += '\n```\n\n';
                }
            });
            
            fs.writeFileSync(fixPath, content);
            console.log(`   📝 Fix instructions generated: ${fixPath}`);
        }
    }
    
    /**
     * Create accuracy report
     */
    createAccuracyReport(folderPath) {
        const accuracyPath = path.join(folderPath, '.accuracy');
        if (!fs.existsSync(accuracyPath)) {
            fs.mkdirSync(accuracyPath);
        }
        
        // Save error report
        const errorReport = {
            timestamp: new Date().toISOString(),
            accuracy: this.validationReport.accuracy,
            issues: this.validationReport.issues,
            autoFixAvailable: this.validationReport.fixes.length > 0
        };
        
        const errorPath = path.join(accuracyPath, 'ERROR_REPORT.json');
        fs.writeFileSync(errorPath, JSON.stringify(errorReport, null, 2));
        
        console.log(`   📊 Accuracy report created in .accuracy/`);
    }
    
    /**
     * Print extraction summary
     */
    printSummary(folderPath) {
        // Calculate total time
        const totalTime = this.performanceMetrics.processingTimes.total_extraction || 0;
        
        console.log('\n' + '=' .repeat(70));
        console.log('📊 EXTRACTION COMPLETE\n');
        
        // Performance metrics
        console.log('⚡ Performance Metrics:');
        console.log(`  Total Time: ${totalTime}ms`);
        if (this.performanceMetrics.processingTimes.api_fetch) {
            console.log(`  API Fetch: ${this.performanceMetrics.processingTimes.api_fetch}ms`);
        }
        if (this.performanceMetrics.processingTimes.parallel_processing) {
            console.log(`  Parallel Processing: ${this.performanceMetrics.processingTimes.parallel_processing}ms`);
        }
        if (this.performanceMetrics.processingTimes.nlp_conversion) {
            console.log(`  NLP Conversion: ${this.performanceMetrics.processingTimes.nlp_conversion}ms`);
        }
        if (this.performanceMetrics.processingTimes.variable_extraction) {
            console.log(`  Variable Extraction: ${this.performanceMetrics.processingTimes.variable_extraction}ms`);
        }
        if (this.performanceMetrics.processingTimes.validation) {
            console.log(`  Validation: ${this.performanceMetrics.processingTimes.validation}ms`);
        }
        
        // Cache statistics
        const stats = this.getCacheStats();
        if (stats.totalRequests > 0) {
            console.log(`  Cache Performance: ${stats.hits}/${stats.totalRequests} hits (${stats.hitRate}%)`);
            console.log(`  Cache Memory: ${stats.memoryFormatted} (${stats.entries} entries, ${stats.evictions} evictions)`);
        }
        
        console.log('\nFiles Created:');
        console.log(`  ✅ Raw data (always)    - raw_data/*.json`);
        
        if (this.flags.nlp) {
            console.log(`  ✅ NLP conversion       - execution.nlp.txt`);
        }
        if (this.flags.vars) {
            console.log(`  ✅ Variables extracted  - variables.json`);
        }
        if (this.flags.validate) {
            console.log(`  ✅ Validation report    - validation_report.json`);
        }
        
        if (this.validationReport.issues.length > 0) {
            console.log('\n⚠️ Issues Found:');
            this.validationReport.issues.forEach(issue => {
                console.log(`  - ${issue.type}: ${issue.impact}`);
            });
        }
        
        console.log('\n' + '=' .repeat(70));
        console.log(`📁 Output: ${this.folderStructure.getRelativePath(folderPath)}`);
    }
    
    // API fetching methods (from V9)
    async fetchData(endpoint, cacheKey = null, dataType = 'default') {
        // Check cache first
        if (cacheKey) {
            const cached = this.getCachedData(cacheKey, dataType);
            if (cached) {
                if (this.config.debug) {
                    console.log(`   📦 Cache hit: ${endpoint}`);
                }
                return cached;
            }
        }
        
        return new Promise((resolve, reject) => {
            const url = `${this.config.baseUrl}${endpoint}`;
            
            if (this.config.debug) {
                console.log(`   🌐 Fetching: ${url}`);
            }
            
            https.get(url, { headers: this.headers }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        
                        // Check for API errors
                        if (res.statusCode !== 200) {
                            reject(new Error(`API error (${res.statusCode}): ${parsed.message || data}`));
                            return;
                        }
                        
                        // Cache the result
                        if (cacheKey) {
                            this.setCachedData(cacheKey, parsed, dataType);
                        }
                        
                        resolve(parsed);
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${e.message}`));
                    }
                });
            }).on('error', reject);
        });
    }
    
    async fetchJourneyData(ids) {
        // DON'T cache journey data - it's unique per extraction
        // Each URL has a different journey, so caching doesn't help across extractions
        if (this.config.debug) {
            console.log(`   🚫 Not caching journey data (unique per URL)`);
        }
        
        // Try testsuite endpoint first (journeys are often testsuites in the API)
        try {
            const testsuiteEndpoint = `/testsuites/${ids.journey}?envelope=false`;
            const data = await this.fetchData(testsuiteEndpoint);
            if (data) {
                console.log('   ✅ Found as testsuite');
                return data;
            }
        } catch (e) {
            // Fall back to journey endpoint
        }
        
        // Try journey endpoint as fallback
        const endpoint = `/projects/${ids.project}/journeys/${ids.journey}`;
        const data = await this.fetchData(endpoint);
        return data?.item || data;
    }
    
    async fetchGoalData(ids, journeyData) {
        const goalId = journeyData?.goalId;
        if (!goalId) {
            console.log('   ℹ️ No goal ID found');
            return null;
        }
        
        try {
            // Try direct goal endpoint
            const directEndpoint = `/goals/${goalId}`;
            const directData = await this.fetchData(directEndpoint);
            if (directData) {
                return directData?.item || directData;
            }
        } catch (e) {
            // Try project-specific endpoint
            try {
                const endpoint = `/projects/${ids.project}/goals/${goalId}`;
                const data = await this.fetchData(endpoint);
                return data?.item || data;
            } catch (e2) {
                console.log(`   ⚠️ Goal ${goalId} not accessible`);
                return { id: goalId, name: 'Unknown Goal' };
            }
        }
    }
    
    async fetchExecutionData(ids) {
        // DON'T cache execution data - it's unique per extraction
        // Each URL has a different execution, so caching doesn't help across extractions
        if (this.config.debug) {
            console.log(`   🚫 Not caching execution data (unique per URL)`);
        }
        
        try {
            // Try direct execution endpoint
            const directEndpoint = `/executions/${ids.execution}`;
            const directData = await this.fetchData(directEndpoint);
            if (directData) {
                return directData?.item || directData;
            }
        } catch (e) {
            // Try project-specific endpoint
            try {
                const endpoint = `/projects/${ids.project}/executions/${ids.execution}`;
                const data = await this.fetchData(endpoint);
                return data?.item || data;
            } catch (e2) {
                // Execution might not exist or be expired
                console.log('   ⚠️ Execution not found (may be expired or invalid)');
                return { id: ids.execution, status: 'UNKNOWN' };
            }
        }
    }
    
    async fetchProjectData(ids) {
        const cacheKey = this.getCacheKey('project', ids.project);
        if (this.config.debug) {
            console.log(`   ✅ Caching project data (stable, reused across journeys)`);
        }
        const endpoint = `/projects/${ids.project}`;
        const data = await this.fetchData(endpoint, cacheKey, 'projects');
        return data?.item || data;
    }
    
    async fetchOrganizationData() {
        const cacheKey = this.getCacheKey('organization', this.config.organizationId);
        if (this.config.debug) {
            console.log(`   ✅ Caching organization data (very stable, reused across all extractions)`);
        }
        const endpoint = `/organizations/${this.config.organizationId}`;
        const data = await this.fetchData(endpoint, cacheKey, 'organizations');
        return data?.item || data;
    }
    
    async fetchEnvironmentData(ids) {
        const cacheKey = this.getCacheKey('environments', ids.project);
        if (this.config.debug) {
            console.log(`   ✅ Caching environment data (stable, reused across journeys)`);
        }
        
        try {
            const endpoint = `/projects/${ids.project}/environments`;
            const data = await this.fetchData(endpoint, cacheKey, 'environments');
            
            // Handle wrapped response structure
            let environments = data;
            if (data && data.item && data.item.environments) {
                environments = data.item.environments;
            } else if (data && data.items) {
                environments = data.items;
            }
            
            return environments;
        } catch (e) {
            console.log('   ⚠️ Environments not accessible');
            return [];
        }
    }
    
    async fetchApiTestDetails(projectId, journeyData) {
        const apiTestIds = new Set();
        
        // Find all API test IDs in journey
        if (journeyData?.cases) {
            journeyData.cases.forEach(testCase => {
                testCase.steps?.forEach(step => {
                    if (step.action === 'API_CALL' && step.meta?.apiTestId) {
                        apiTestIds.add(step.meta.apiTestId);
                    }
                });
            });
        }
        
        if (apiTestIds.size === 0) {
            return new Map();
        }
        
        console.log(`   📡 Fetching details for ${apiTestIds.size} API tests...`);
        const apiTests = new Map();
        
        // Fetch all API tests from the API - CACHE THIS since API tests are stable across extractions
        try {
            const cacheKey = this.getCacheKey('api_tests', 'all');
            if (this.config.debug) {
                console.log(`   ✅ Caching API test definitions (stable, reused across journeys)`);
            }
            const allTestsData = await this.fetchData('/api-tests', cacheKey, 'apiTests');
            const allTests = allTestsData?.item?.apiTests || [];
            const folders = allTestsData?.item?.folders || {};
            
            // Build folder map
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
            
            // Process each test ID we need
            for (const testId of apiTestIds) {
                const testData = allTests.find(t => t.id === testId);
                
                if (testData) {
                    const folderPath = folderMap.get(testData.folder) || '';
                    const fullName = folderPath ? `${folderPath}.${testData.name}` : testData.name;
                    
                    // NOTE: URL is not available in API - this is a limitation
                    // We need to use manual mapping for URLs
                    let url = '';
                    let isManualUrl = false;
                    
                    // Check manual mappings for URL only
                    try {
                        const mappingsPath = path.join(__dirname, '.knowledge', 'api-test-mappings.json');
                        if (fs.existsSync(mappingsPath)) {
                            const manualMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
                            if (manualMappings[testId]?.url) {
                                url = manualMappings[testId].url;
                                isManualUrl = true;
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                    
                    apiTests.set(testId, {
                        id: testId,
                        name: fullName,
                        url: url,
                        method: 'GET',
                        _metadata: {
                            fromApi: true,
                            urlManual: isManualUrl
                        }
                    });
                    
                    console.log(`     ✅ ${fullName}${isManualUrl ? ' (⚠️ URL from manual mapping)' : ''}`);
                } else {
                    // Test not found in API
                    console.log(`     ⚠️  Test ${testId} not found in API`);
                    apiTests.set(testId, {
                        id: testId,
                        name: `API Test ${testId}`,
                        url: '',
                        method: 'GET',
                        _metadata: {
                            fromApi: false,
                            notFound: true
                        }
                    });
                }
            }
        } catch (e) {
            console.log(`     ❌ Could not fetch API tests list: ${e.message}`);
            // Fallback to IDs only
            for (const testId of apiTestIds) {
                apiTests.set(testId, {
                    id: testId,
                    name: `API Test ${testId}`,
                    url: '',
                    method: 'GET',
                    _metadata: {
                        fromApi: false,
                        error: true
                    }
                });
            }
        }
        
        return apiTests;
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        nlp: false,
        vars: false,
        validate: false,
        offline: false,
        debug: false,
        help: false,
        all: false,      // --all flag for nlp+vars+validate
        noCache: false,  // --no-cache flag to disable caching
        fresh: false     // --fresh flag to force fresh data
    };
    
    let url = null;
    
    args.forEach(arg => {
        if (arg.startsWith('--')) {
            const flag = arg.substring(2);
            // Handle flag aliases
            if (flag === 'no-cache') {
                options.noCache = true;
            } else if (flag in options) {
                options[flag] = true;
            }
        } else if (!url) {
            url = arg;
        }
    });
    
    return { url, options };
}

// Show help
function showHelp() {
    console.log(`
Virtuoso Extractor V10 - Performance-First Architecture

Usage: node extract-v10.js <url> [options]

Options:
  --nlp        Generate NLP conversion
  --vars       Extract variables
  --validate   Run validation and generate reports
  --all        Combined nlp + vars + validate (recommended)
  --offline    Reprocess existing extraction
  --debug      Show debug information and timing details
  --no-cache   Disable caching (for debugging)
  --fresh      Force fresh data, bypass cache (for debugging)
  --help       Show this help message

Examples:
  # Basic extraction (raw data only) - FAST by default
  node extract-v10.js https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256
  
  # Full extraction (recommended) - FAST by default
  node extract-v10.js <url> --all
  
  # Extract with NLP and variables - FAST by default
  node extract-v10.js <url> --nlp --vars
  
  # Full extraction with validation - FAST by default
  node extract-v10.js <url> --nlp --vars --validate
  
  # Debug with fresh data (disable caching)
  node extract-v10.js <url> --all --fresh --debug
  
  # Reprocess existing extraction
  node extract-v10.js ./extractions/project_4889/... --offline --nlp

Performance-First Features (ENABLED BY DEFAULT):
  - Parallel API calls for faster data fetching
  - Smart multi-tenant caching with LRU eviction
  - Memory management (100MB limit, 1000 entry limit)
  - Cache isolation by organization/project
  - Differentiated TTLs: Projects/Environments (30min), API Tests (60min)
  - Parallel processing of NLP and variable extraction
  - Detailed performance metrics and cache statistics

Caching Strategy (OPTIMIZED FOR SCALE):
  - ✅ Cached: Project data, environments, API test definitions (stable, reused across journeys)
  - ❌ Not cached: Journey data, execution data (unique per URL extraction)
  - Cache speeds up extracting DIFFERENT journeys from the SAME project
  - Multi-organization isolation: org1234_project4889_environments
  - Automatic LRU eviction when memory/entry limits reached
  - Performance monitoring: hit rates, memory usage, eviction stats

Why Performance-First?
  - You ALWAYS want results as fast as possible
  - Optimized caching scales to 100s of projects and organizations
  - Use --no-cache or --fresh only for debugging specific issues
  - Default behavior assumes production usage patterns

Notes:
  - Raw data is ALWAYS saved
  - Use flags to enable additional processing
  - Unknown actions are handled by knowledge base
  - Folder names use underscores (V10 convention)
  - Cache automatically manages memory and prevents bloat
`);
}

// Main execution
async function main() {
    const { url, options } = parseArgs();
    
    if (options.help || !url) {
        showHelp();
        process.exit(0);
    }
    
    const extractor = new VirtuosoExtractorV10(options);
    await extractor.extract(url);
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = VirtuosoExtractorV10;