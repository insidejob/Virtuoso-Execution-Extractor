/**
 * Bulk Folder Structure Module
 * 
 * Handles folder organization for bulk extractions with re-execution intelligence.
 * COMPLETELY SEPARATE from individual extraction folder structure.
 * 
 * Key Features:
 * - Smart re-execution handling with configurable strategies
 * - Journey-centric organization with execution history
 * - Failure pattern clustering and unique failure storage
 * - Trend analysis and aggregation support
 * - Clear separation from individual extraction system
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BulkFolderStructure {
    constructor(config = {}) {
        this.baseDir = config.baseDir || 'bulk-extractions';
        this.strategies = {
            all: 'Keep everything (like individual extractions)',
            smart: 'Latest success + unique failures (default)',
            failures: 'Only keep failures',
            'latest-n': 'Keep last N executions of each journey',
            daily: 'Keep one per day per journey',
            changes: 'Keep when outcome changes'
        };
        this.defaultStrategy = config.strategy || 'smart';
        this.latestN = config.latestN || 5;
    }
    
    /**
     * Create bulk extraction session folder structure
     * Structure: bulk-extractions/{org-name}/{project-name}/{session-id}/
     */
    createBulkSession(organizationData, projectData, sessionId = null) {
        const orgName = this.cleanName(organizationData?.name || 'Unknown Organization');
        const projectName = this.cleanName(projectData?.name || 'Unknown Project');
        
        // Generate session ID if not provided
        if (!sessionId) {
            sessionId = `session-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
        }
        
        const sessionPath = path.join(this.baseDir, orgName, projectName, sessionId);
        this.ensureDirectoryExists(sessionPath);
        
        // Create session subdirectories
        const byJourneyPath = path.join(sessionPath, 'by-journey');
        const byDatePath = path.join(sessionPath, 'by-date');
        const aggregatesPath = path.join(sessionPath, 'aggregates');
        
        this.ensureDirectoryExists(byJourneyPath);
        this.ensureDirectoryExists(byDatePath);
        this.ensureDirectoryExists(aggregatesPath);
        
        // Create session metadata
        const sessionMetadata = {
            bulk_session: {
                id: sessionId,
                timestamp: new Date().toISOString(),
                version: 'bulk-v2.0.0',
                structure_type: 'bulk_with_reexecution_intelligence'
            },
            organization: {
                id: organizationData?.id,
                name: organizationData?.name,
                path: orgName
            },
            project: {
                id: projectData?.id,
                name: projectData?.name,
                path: projectName
            },
            folder_structure: {
                session_path: sessionPath,
                by_journey_path: byJourneyPath,
                by_date_path: byDatePath,
                aggregates_path: aggregatesPath
            },
            strategies_available: this.strategies,
            configuration: {
                default_strategy: this.defaultStrategy,
                latest_n_count: this.latestN
            }
        };
        
        const sessionMetadataPath = path.join(sessionPath, 'session-metadata.json');
        fs.writeFileSync(sessionMetadataPath, JSON.stringify(sessionMetadata, null, 2));
        
        return {
            sessionPath,
            byJourneyPath,
            byDatePath,
            aggregatesPath,
            metadata: sessionMetadata,
            sessionId
        };
    }
    
    /**
     * Store execution with intelligent re-execution handling
     */
    storeExecution(sessionInfo, executionData, extractionResult, strategy = null) {
        const currentStrategy = strategy || this.defaultStrategy;
        const journeyName = this.cleanName(executionData.journeyName || 'Unknown Journey');
        const executionId = executionData.executionId;
        const outcome = executionData.outcome || extractionResult.outcome || 'UNKNOWN';
        const timestamp = new Date().toISOString();
        const dateFolder = timestamp.split('T')[0];
        
        // 1. Store in by-journey structure with re-execution intelligence
        const journeyPath = path.join(sessionInfo.byJourneyPath, journeyName);
        this.ensureDirectoryExists(journeyPath);
        
        const journeyStorage = this.handleJourneyReexecution(
            journeyPath, 
            executionData, 
            extractionResult, 
            currentStrategy
        );
        
        // 2. Store in by-date structure for chronological analysis
        const datePath = path.join(sessionInfo.byDatePath, dateFolder);
        this.ensureDirectoryExists(datePath);
        
        const executionFolder = `${journeyName}-${executionId}`;
        const dateStoragePath = path.join(datePath, executionFolder);
        this.storeExecutionData(dateStoragePath, executionData, extractionResult);
        
        // 3. Update journey execution history
        this.updateExecutionHistory(journeyPath, executionData, extractionResult, outcome);
        
        // 4. Update journey metrics
        this.updateJourneyMetrics(journeyPath, executionData, extractionResult, outcome);
        
        return {
            journeyStorage,
            dateStoragePath,
            strategy: currentStrategy,
            outcome,
            timestamp
        };
    }
    
    /**
     * Handle journey re-execution with configurable strategies
     */
    handleJourneyReexecution(journeyPath, executionData, extractionResult, strategy) {
        const outcome = executionData.outcome || extractionResult.outcome || 'UNKNOWN';
        const isSuccess = outcome === 'PASS' || outcome === 'SUCCESS';
        const isFailure = outcome === 'FAIL' || outcome === 'ERROR';
        
        const storage = {
            strategy,
            stored: false,
            location: null,
            reason: null,
            replaced: null
        };
        
        switch (strategy) {
            case 'all':
                // Store everything like individual extractions
                storage.location = this.storeInAll(journeyPath, executionData, extractionResult);
                storage.stored = true;
                storage.reason = 'Strategy: Keep all executions';
                break;
                
            case 'smart':
                // Default: Latest success + unique failures
                storage.location = this.storeInSmart(journeyPath, executionData, extractionResult, isSuccess, isFailure);
                storage.stored = true;
                storage.reason = 'Strategy: Smart - latest success + unique failures';
                break;
                
            case 'failures':
                // Only keep failures
                if (isFailure) {
                    storage.location = this.storeInFailures(journeyPath, executionData, extractionResult);
                    storage.stored = true;
                    storage.reason = 'Strategy: Failures only - execution failed';
                } else {
                    storage.reason = 'Strategy: Failures only - execution passed, not stored';
                }
                break;
                
            case 'latest-n':
                // Keep last N executions
                storage.location = this.storeInLatestN(journeyPath, executionData, extractionResult);
                storage.stored = true;
                storage.reason = `Strategy: Latest ${this.latestN} executions`;
                break;
                
            case 'daily':
                // Keep one per day
                storage.location = this.storeInDaily(journeyPath, executionData, extractionResult);
                storage.stored = true;
                storage.reason = 'Strategy: One per day';
                break;
                
            case 'changes':
                // Keep when outcome changes
                storage.location = this.storeInChanges(journeyPath, executionData, extractionResult);
                storage.stored = storage.location !== null;
                storage.reason = storage.stored ? 'Strategy: Outcome changed' : 'Strategy: No outcome change';
                break;
                
            default:
                // Fallback to smart
                storage.location = this.storeInSmart(journeyPath, executionData, extractionResult, isSuccess, isFailure);
                storage.stored = true;
                storage.reason = `Unknown strategy '${strategy}', fallback to smart`;
        }
        
        return storage;
    }
    
    /**
     * Store in 'all' strategy - keep everything
     */
    storeInAll(journeyPath, executionData, extractionResult) {
        const executionId = executionData.executionId;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const folderName = `execution-${executionId}-${timestamp}`;
        const storagePath = path.join(journeyPath, 'all-executions', folderName);
        
        this.storeExecutionData(storagePath, executionData, extractionResult);
        return storagePath;
    }
    
    /**
     * Store in 'smart' strategy - latest success + unique failures
     */
    storeInSmart(journeyPath, executionData, extractionResult, isSuccess, isFailure) {
        const executionId = executionData.executionId;
        
        if (isSuccess) {
            // Replace latest success
            const latestSuccessPath = path.join(journeyPath, 'latest-success');
            this.replaceDirectory(latestSuccessPath);
            this.storeExecutionData(latestSuccessPath, executionData, extractionResult);
            return latestSuccessPath;
        } else if (isFailure) {
            // Store unique failures
            const failureSignature = this.generateFailureSignature(extractionResult);
            const uniqueFailuresPath = path.join(journeyPath, 'unique-failures');
            this.ensureDirectoryExists(uniqueFailuresPath);
            
            // Check if this failure pattern already exists
            const existingFailure = this.findExistingFailurePattern(uniqueFailuresPath, failureSignature);
            
            if (!existingFailure) {
                // New unique failure pattern
                const failureFolderName = `failure-${failureSignature.substring(0, 8)}-${executionId}`;
                const failureStoragePath = path.join(uniqueFailuresPath, failureFolderName);
                this.storeExecutionData(failureStoragePath, executionData, extractionResult);
                
                // Store failure signature for future matching
                const signatureFile = path.join(failureStoragePath, '.failure-signature');
                fs.writeFileSync(signatureFile, failureSignature);
                
                return failureStoragePath;
            } else {
                // Update existing failure with latest occurrence
                this.updateFailureOccurrence(existingFailure, executionData, extractionResult);
                return existingFailure;
            }
        } else {
            // Store latest unknown outcome
            const latestUnknownPath = path.join(journeyPath, 'latest-unknown');
            this.replaceDirectory(latestUnknownPath);
            this.storeExecutionData(latestUnknownPath, executionData, extractionResult);
            return latestUnknownPath;
        }
    }
    
    /**
     * Store in 'failures' strategy - only failures
     */
    storeInFailures(journeyPath, executionData, extractionResult) {
        const executionId = executionData.executionId;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const folderName = `failure-${executionId}-${timestamp}`;
        const storagePath = path.join(journeyPath, 'failures-only', folderName);
        
        this.storeExecutionData(storagePath, executionData, extractionResult);
        return storagePath;
    }
    
    /**
     * Store in 'latest-n' strategy - keep last N executions
     */
    storeInLatestN(journeyPath, executionData, extractionResult) {
        const latestNPath = path.join(journeyPath, 'latest-executions');
        this.ensureDirectoryExists(latestNPath);
        
        // Get existing executions sorted by timestamp
        const existing = this.getExistingExecutions(latestNPath);
        const executionId = executionData.executionId;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        
        // Store new execution
        const folderName = `execution-${executionId}-${timestamp}`;
        const newExecutionPath = path.join(latestNPath, folderName);
        this.storeExecutionData(newExecutionPath, executionData, extractionResult);
        
        // Clean up old executions if we exceed the limit
        const allExecutions = [...existing, { path: newExecutionPath, timestamp }];
        allExecutions.sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Newest first
        
        if (allExecutions.length > this.latestN) {
            const toDelete = allExecutions.slice(this.latestN);
            toDelete.forEach(exec => {
                if (fs.existsSync(exec.path)) {
                    fs.rmSync(exec.path, { recursive: true, force: true });
                }
            });
        }
        
        return newExecutionPath;
    }
    
    /**
     * Store in 'daily' strategy - one per day
     */
    storeInDaily(journeyPath, executionData, extractionResult) {
        const dailyPath = path.join(journeyPath, 'daily-executions');
        this.ensureDirectoryExists(dailyPath);
        
        const dateFolder = new Date().toISOString().split('T')[0];
        const dayStoragePath = path.join(dailyPath, dateFolder);
        
        // Replace any existing execution for this day
        this.replaceDirectory(dayStoragePath);
        this.storeExecutionData(dayStoragePath, executionData, extractionResult);
        
        return dayStoragePath;
    }
    
    /**
     * Store in 'changes' strategy - only when outcome changes
     */
    storeInChanges(journeyPath, executionData, extractionResult) {
        const changesPath = path.join(journeyPath, 'outcome-changes');
        const metricsPath = path.join(journeyPath, 'metrics.json');
        
        const currentOutcome = executionData.outcome || extractionResult.outcome || 'UNKNOWN';
        
        // Check previous outcome
        let previousOutcome = null;
        if (fs.existsSync(metricsPath)) {
            try {
                const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
                previousOutcome = metrics.latest_outcome;
            } catch (e) {
                // Ignore parsing errors
            }
        }
        
        // Only store if outcome changed
        if (previousOutcome && previousOutcome === currentOutcome) {
            return null; // No change, don't store
        }
        
        this.ensureDirectoryExists(changesPath);
        const executionId = executionData.executionId;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const folderName = `change-${previousOutcome || 'initial'}-to-${currentOutcome}-${executionId}-${timestamp}`;
        const changeStoragePath = path.join(changesPath, folderName);
        
        this.storeExecutionData(changeStoragePath, executionData, extractionResult);
        return changeStoragePath;
    }
    
    /**
     * Store execution data to specified path
     */
    storeExecutionData(storagePath, executionData, extractionResult) {
        this.ensureDirectoryExists(storagePath);
        
        // Store execution metadata
        const executionMetadata = {
            execution_info: {
                id: executionData.executionId,
                timestamp: new Date().toISOString(),
                bulk_extraction: true,
                strategy_applied: true
            },
            original_execution_data: executionData,
            extraction_result: {
                outcome: extractionResult.outcome,
                duration: extractionResult.duration,
                files: extractionResult.files,
                outputPath: extractionResult.outputPath
            }
        };
        
        fs.writeFileSync(
            path.join(storagePath, 'execution-metadata.json'), 
            JSON.stringify(executionMetadata, null, 2)
        );
        
        // Copy extraction result files if they exist
        if (extractionResult.files && extractionResult.outputPath) {
            this.copyExtractionFiles(extractionResult.outputPath, storagePath, extractionResult.files);
        }
    }
    
    /**
     * Update journey execution history
     */
    updateExecutionHistory(journeyPath, executionData, extractionResult, outcome) {
        const historyPath = path.join(journeyPath, 'execution-history.json');
        
        let history = { executions: [], summary: { total: 0, by_outcome: {} } };
        if (fs.existsSync(historyPath)) {
            try {
                history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            } catch (e) {
                // Reset history on parse error
            }
        }
        
        // Add new execution
        const execution = {
            execution_id: executionData.executionId,
            outcome,
            timestamp: new Date().toISOString(),
            duration: extractionResult.duration || extractionData.duration,
            goal_name: executionData.goalName,
            journey_name: executionData.journeyName,
            extraction_files: extractionResult.files || []
        };
        
        history.executions.push(execution);
        history.summary.total++;
        history.summary.by_outcome[outcome] = (history.summary.by_outcome[outcome] || 0) + 1;
        
        // Keep history manageable (last 1000 executions)
        if (history.executions.length > 1000) {
            const removed = history.executions.splice(0, history.executions.length - 1000);
            // Update summary counts for removed executions
            removed.forEach(exec => {
                if (history.summary.by_outcome[exec.outcome] > 0) {
                    history.summary.by_outcome[exec.outcome]--;
                }
            });
        }
        
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    }
    
    /**
     * Update journey metrics for trend analysis
     */
    updateJourneyMetrics(journeyPath, executionData, extractionResult, outcome) {
        const metricsPath = path.join(journeyPath, 'metrics.json');
        
        let metrics = {
            journey_info: {
                name: executionData.journeyName,
                id: executionData.journeyId
            },
            latest_outcome: outcome,
            latest_execution_id: executionData.executionId,
            latest_timestamp: new Date().toISOString(),
            totals: {
                executions: 0,
                successes: 0,
                failures: 0,
                unknowns: 0
            },
            trends: {
                success_rate: 0,
                avg_duration: 0,
                failure_patterns: {}
            }
        };
        
        if (fs.existsSync(metricsPath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
                metrics = { ...metrics, ...existing };
            } catch (e) {
                // Use fresh metrics on parse error
            }
        }
        
        // Update metrics
        metrics.latest_outcome = outcome;
        metrics.latest_execution_id = executionData.executionId;
        metrics.latest_timestamp = new Date().toISOString();
        metrics.totals.executions++;
        
        if (outcome === 'PASS' || outcome === 'SUCCESS') {
            metrics.totals.successes++;
        } else if (outcome === 'FAIL' || outcome === 'ERROR') {
            metrics.totals.failures++;
        } else {
            metrics.totals.unknowns++;
        }
        
        // Calculate trends
        metrics.trends.success_rate = metrics.totals.executions > 0 
            ? Math.round((metrics.totals.successes / metrics.totals.executions) * 100) 
            : 0;
            
        // Track failure patterns
        if (outcome === 'FAIL' || outcome === 'ERROR') {
            const failureSignature = this.generateFailureSignature(extractionResult);
            const shortSignature = failureSignature.substring(0, 8);
            metrics.trends.failure_patterns[shortSignature] = (metrics.trends.failure_patterns[shortSignature] || 0) + 1;
        }
        
        fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    }
    
    /**
     * Generate session summary with aggregation
     */
    generateSessionSummary(sessionInfo, executions) {
        const summaryPath = path.join(sessionInfo.sessionPath, 'session-summary.json');
        
        // Aggregate journey data
        const journeyAggregates = this.aggregateJourneyData(sessionInfo.byJourneyPath);
        
        // Aggregate daily data
        const dailyAggregates = this.aggregateDailyData(sessionInfo.byDatePath);
        
        // Overall session statistics
        const sessionStats = {
            total_executions: executions.length,
            unique_journeys: journeyAggregates.length,
            date_range: {
                first_execution: executions.length > 0 ? Math.min(...executions.map(e => new Date(e.timestamp).getTime())) : null,
                last_execution: executions.length > 0 ? Math.max(...executions.map(e => new Date(e.timestamp).getTime())) : null
            },
            outcomes: executions.reduce((acc, exec) => {
                const outcome = exec.outcome || 'UNKNOWN';
                acc[outcome] = (acc[outcome] || 0) + 1;
                return acc;
            }, {}),
            success_rate: executions.length > 0 
                ? Math.round((executions.filter(e => e.outcome === 'PASS' || e.outcome === 'SUCCESS').length / executions.length) * 100)
                : 0
        };
        
        const summary = {
            session_summary: {
                ...sessionInfo.metadata.bulk_session,
                completed: new Date().toISOString()
            },
            statistics: sessionStats,
            journey_aggregates: journeyAggregates,
            daily_aggregates: dailyAggregates,
            file_locations: {
                by_journey: sessionInfo.byJourneyPath,
                by_date: sessionInfo.byDatePath,
                aggregates: sessionInfo.aggregatesPath
            }
        };
        
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        
        // Also save aggregates separately for easy access
        fs.writeFileSync(
            path.join(sessionInfo.aggregatesPath, 'journey-aggregates.json'),
            JSON.stringify(journeyAggregates, null, 2)
        );
        
        fs.writeFileSync(
            path.join(sessionInfo.aggregatesPath, 'daily-aggregates.json'),
            JSON.stringify(dailyAggregates, null, 2)
        );
        
        return summary;
    }
    
    /**
     * Helper methods
     */
    
    cleanName(name) {
        if (!name) return 'Unknown';
        return name
            .trim()
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, ' ')
            .replace(/_{2,}/g, '_')
            .trim() || 'Unknown';
    }
    
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    
    replaceDirectory(dirPath) {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
        this.ensureDirectoryExists(dirPath);
    }
    
    generateFailureSignature(extractionResult) {
        // Create a signature based on error patterns for failure clustering
        const errorData = {
            outcome: extractionResult.outcome,
            errorType: extractionResult.errorType,
            errorMessage: extractionResult.errorMessage,
            failedSteps: extractionResult.failedSteps || [],
            // Normalize error messages to detect similar patterns
            normalizedError: this.normalizeErrorMessage(extractionResult.errorMessage)
        };
        
        return crypto
            .createHash('md5')
            .update(JSON.stringify(errorData))
            .digest('hex');
    }
    
    normalizeErrorMessage(message) {
        if (!message) return '';
        // Remove specific values that might differ between executions
        return message
            .replace(/\d+/g, 'N')  // Replace numbers
            .replace(/['"]\w+['"]/g, 'VALUE')  // Replace quoted values
            .toLowerCase()
            .trim();
    }
    
    findExistingFailurePattern(uniqueFailuresPath, failureSignature) {
        if (!fs.existsSync(uniqueFailuresPath)) return null;
        
        const failureFolders = fs.readdirSync(uniqueFailuresPath);
        for (const folder of failureFolders) {
            const signatureFile = path.join(uniqueFailuresPath, folder, '.failure-signature');
            if (fs.existsSync(signatureFile)) {
                try {
                    const existingSignature = fs.readFileSync(signatureFile, 'utf8').trim();
                    if (existingSignature === failureSignature) {
                        return path.join(uniqueFailuresPath, folder);
                    }
                } catch (e) {
                    // Ignore read errors
                }
            }
        }
        return null;
    }
    
    updateFailureOccurrence(existingFailurePath, executionData, extractionResult) {
        const occurrencesPath = path.join(existingFailurePath, 'occurrences.json');
        
        let occurrences = { count: 1, executions: [] };
        if (fs.existsSync(occurrencesPath)) {
            try {
                occurrences = JSON.parse(fs.readFileSync(occurrencesPath, 'utf8'));
            } catch (e) {
                // Reset on parse error
            }
        }
        
        occurrences.count++;
        occurrences.executions.push({
            execution_id: executionData.executionId,
            timestamp: new Date().toISOString(),
            outcome: extractionResult.outcome
        });
        
        // Keep last 50 occurrences
        if (occurrences.executions.length > 50) {
            occurrences.executions = occurrences.executions.slice(-50);
        }
        
        fs.writeFileSync(occurrencesPath, JSON.stringify(occurrences, null, 2));
    }
    
    getExistingExecutions(dirPath) {
        if (!fs.existsSync(dirPath)) return [];
        
        const folders = fs.readdirSync(dirPath);
        return folders
            .map(folder => {
                const folderPath = path.join(dirPath, folder);
                const stats = fs.statSync(folderPath);
                return {
                    path: folderPath,
                    timestamp: stats.mtime.toISOString()
                };
            })
            .filter(item => fs.statSync(item.path).isDirectory());
    }
    
    copyExtractionFiles(sourcePath, targetPath, files) {
        if (!fs.existsSync(sourcePath)) return;
        
        files.forEach(file => {
            const sourceFile = path.join(sourcePath, file);
            const targetFile = path.join(targetPath, file);
            
            if (fs.existsSync(sourceFile)) {
                try {
                    // Ensure target directory exists
                    this.ensureDirectoryExists(path.dirname(targetFile));
                    
                    if (fs.statSync(sourceFile).isDirectory()) {
                        // Copy directory recursively
                        fs.cpSync(sourceFile, targetFile, { recursive: true });
                    } else {
                        // Copy file
                        fs.copyFileSync(sourceFile, targetFile);
                    }
                } catch (e) {
                    console.warn(`Warning: Could not copy ${file}: ${e.message}`);
                }
            }
        });
    }
    
    aggregateJourneyData(byJourneyPath) {
        const journeys = [];
        
        if (!fs.existsSync(byJourneyPath)) return journeys;
        
        const journeyFolders = fs.readdirSync(byJourneyPath);
        
        journeyFolders.forEach(journeyFolder => {
            const journeyPath = path.join(byJourneyPath, journeyFolder);
            if (!fs.statSync(journeyPath).isDirectory()) return;
            
            const metricsPath = path.join(journeyPath, 'metrics.json');
            if (fs.existsSync(metricsPath)) {
                try {
                    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
                    journeys.push({
                        name: journeyFolder,
                        ...metrics
                    });
                } catch (e) {
                    console.warn(`Warning: Could not read metrics for journey ${journeyFolder}`);
                }
            }
        });
        
        return journeys;
    }
    
    aggregateDailyData(byDatePath) {
        const dailyData = [];
        
        if (!fs.existsSync(byDatePath)) return dailyData;
        
        const dateFolders = fs.readdirSync(byDatePath);
        
        dateFolders.forEach(dateFolder => {
            const datePath = path.join(byDatePath, dateFolder);
            if (!fs.statSync(datePath).isDirectory()) return;
            
            const executions = fs.readdirSync(datePath).filter(item => {
                return fs.statSync(path.join(datePath, item)).isDirectory();
            });
            
            const dayStats = {
                date: dateFolder,
                execution_count: executions.length,
                journeys: executions.map(exec => {
                    const parts = exec.split('-');
                    return parts.slice(0, -1).join('-'); // Remove execution ID
                })
            };
            
            // Count unique journeys for the day
            dayStats.unique_journeys = [...new Set(dayStats.journeys)].length;
            
            dailyData.push(dayStats);
        });
        
        return dailyData.sort((a, b) => a.date.localeCompare(b.date));
    }
}

module.exports = BulkFolderStructure;