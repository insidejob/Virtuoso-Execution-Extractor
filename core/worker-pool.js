/**
 * Worker Pool - High Performance Parallel Processing
 * 
 * Manages a pool of parallel workers for bulk extraction:
 * - Queue-based job distribution
 * - Rate limiting protection
 * - Error retry mechanism
 * - Memory management
 * - Progress tracking
 */

const VirtuosoExtractorV10 = require('../extract-v10');
const path = require('path');
const fs = require('fs');

class WorkerPool {
    constructor(workerCount, options) {
        this.workerCount = Math.min(workerCount, 20); // Cap at 20 workers
        this.options = options;
        
        // Job queue and tracking
        this.jobQueue = [];
        this.activeJobs = new Map();
        this.completedJobs = [];
        this.failedJobs = [];
        
        // Workers
        this.workers = [];
        this.availableWorkers = [];
        
        // Rate limiting
        this.rateLimiter = {
            requests: [],
            maxPerSecond: options.rateLimit || 50,
            window: 1000 // 1 second
        };
        
        // Progress tracking
        this.progress = {
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0,
            startTime: Date.now()
        };
        
        // Initialize workers
        this.initializeWorkers();
    }
    
    initializeWorkers() {
        console.log(`   🔧 Initializing ${this.workerCount} workers...`);
        
        for (let i = 0; i < this.workerCount; i++) {
            const worker = new ExtractionWorker(i, {
                sharedCache: this.options.sharedCache,
                config: this.options.config,
                extractorOptions: this.options.extractorOptions,
                sessionDir: this.options.sessionDir,
                onComplete: this.onWorkerComplete.bind(this),
                onError: this.onWorkerError.bind(this),
                onProgress: this.onWorkerProgress.bind(this)
            });
            
            this.workers.push(worker);
            this.availableWorkers.push(worker);
        }
        
        console.log(`   ✅ Worker pool initialized with ${this.workerCount} workers`);
    }
    
    /**
     * Process a list of executions in parallel
     */
    async processExecutions(executionList) {
        console.log(`   📋 Queuing ${executionList.length} executions for parallel processing...`);
        
        this.progress.total = executionList.length;
        this.progress.startTime = Date.now();
        
        // Add all executions to job queue
        this.jobQueue.push(...executionList.map((execution, index) => ({
            id: `job_${index}`,
            execution,
            attempts: 0,
            maxAttempts: this.options.extractorOptions?.retries || 3,
            queuedAt: Date.now()
        })));
        
        // Start processing
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
            
            // Start initial jobs
            this.scheduleNextJobs();
            
            // Monitor progress
            this.progressInterval = setInterval(() => {
                this.updateProgress();
                
                // Check if all jobs are complete
                if (this.isComplete()) {
                    this.cleanup();
                    resolve(this.getResults());
                }
            }, 1000);
        });
    }
    
    scheduleNextJobs() {
        while (this.availableWorkers.length > 0 && this.jobQueue.length > 0) {
            const worker = this.availableWorkers.pop();
            const job = this.jobQueue.shift();
            
            // Apply rate limiting
            if (!this.checkRateLimit()) {
                // Put job back and worker back, wait for rate limit
                this.jobQueue.unshift(job);
                this.availableWorkers.push(worker);
                setTimeout(() => this.scheduleNextJobs(), 100);
                return;
            }
            
            // Start the job
            this.activeJobs.set(job.id, {
                job,
                worker,
                startTime: Date.now()
            });
            
            worker.processExecution(job);
        }
    }
    
    checkRateLimit() {
        const now = Date.now();
        const windowStart = now - this.rateLimiter.window;
        
        // Remove old requests
        this.rateLimiter.requests = this.rateLimiter.requests.filter(time => time > windowStart);
        
        // Check if we can make a new request
        if (this.rateLimiter.requests.length < this.rateLimiter.maxPerSecond) {
            this.rateLimiter.requests.push(now);
            return true;
        }
        
        return false;
    }
    
    onWorkerComplete(workerId, job, result) {
        const activeJob = this.activeJobs.get(job.id);
        if (!activeJob) return;
        
        // Update progress
        this.progress.processed++;
        this.progress.successful++;
        
        // Store result
        this.completedJobs.push({
            job,
            result,
            duration: Date.now() - activeJob.startTime
        });
        
        // Clean up
        this.activeJobs.delete(job.id);
        this.availableWorkers.push(activeJob.worker);
        
        // Call callback
        if (this.options.onComplete) {
            this.options.onComplete(job.execution, result);
        }
        
        // Schedule next job
        this.scheduleNextJobs();
    }
    
    onWorkerError(workerId, job, error) {
        const activeJob = this.activeJobs.get(job.id);
        if (!activeJob) return;
        
        job.attempts++;
        
        // Check if we should retry
        if (job.attempts < job.maxAttempts) {
            console.log(`   ⚠️  Worker ${workerId} failed job ${job.id} (attempt ${job.attempts}/${job.maxAttempts}): ${error.message}`);
            
            // Put job back in queue for retry
            job.retryAt = Date.now() + (job.attempts * 1000); // Exponential backoff
            this.jobQueue.push(job);
            
        } else {
            console.log(`   ❌ Worker ${workerId} permanently failed job ${job.id}: ${error.message}`);
            
            // Update progress
            this.progress.processed++;
            this.progress.failed++;
            
            // Store failure
            this.failedJobs.push({
                job,
                error: error.message,
                attempts: job.attempts,
                duration: Date.now() - activeJob.startTime
            });
            
            // Call callback
            if (this.options.onError) {
                this.options.onError(job.execution, error);
            }
        }
        
        // Clean up
        this.activeJobs.delete(job.id);
        this.availableWorkers.push(activeJob.worker);
        
        // Schedule next job
        this.scheduleNextJobs();
    }
    
    onWorkerProgress(workerId, progress) {
        // Optional: aggregate worker progress
    }
    
    updateProgress() {
        const elapsed = Date.now() - this.progress.startTime;
        const rate = this.progress.processed / (elapsed / 1000);
        const eta = this.progress.total > this.progress.processed ? 
            Math.round((this.progress.total - this.progress.processed) / rate) : 0;
        
        const percentage = Math.round((this.progress.processed / this.progress.total) * 100);
        const progressBar = this.generateProgressBar(percentage);
        
        console.log(`[${progressBar}] ${this.progress.processed}/${this.progress.total} (${percentage}%) | ETA: ${eta}s | Speed: ${Math.round(rate)}/sec | Active: ${this.activeJobs.size}`);
        
        // Call callback
        if (this.options.onProgress) {
            this.options.onProgress(this.progress);
        }
    }
    
    generateProgressBar(percentage, width = 20) {
        const filled = Math.round(width * percentage / 100);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
    
    isComplete() {
        return this.progress.processed >= this.progress.total && this.activeJobs.size === 0;
    }
    
    getResults() {
        return {
            total: this.progress.total,
            successful: this.completedJobs,
            failed: this.failedJobs,
            duration: Date.now() - this.progress.startTime,
            averageTime: this.completedJobs.length > 0 ? 
                Math.round(this.completedJobs.reduce((acc, job) => acc + job.duration, 0) / this.completedJobs.length) : 0
        };
    }
    
    cleanup() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
    }
}

/**
 * Individual Worker - Wraps VirtuosoExtractorV10 for parallel execution
 */
class ExtractionWorker {
    constructor(id, options) {
        this.id = id;
        this.options = options;
        this.busy = false;
        this.totalProcessed = 0;
    }
    
    async processExecution(job) {
        this.busy = true;
        const startTime = Date.now();
        
        try {
            // Create an optimized extractor instance with shared cache
            const extractor = new VirtuosoExtractorV10({
                // Pass through extractor options
                ...this.options.extractorOptions,
                // Use shared cache to avoid redundant API calls
                outputDir: this.options.sessionDir,
                debug: false // Disable debug for workers to reduce noise
            });
            
            // Inject shared cache data to avoid re-fetching
            this.injectSharedCache(extractor);
            
            // Build URL for extraction
            const url = this.buildExecutionURL(job.execution);
            
            // Perform extraction
            await extractor.extract(url);
            
            this.totalProcessed++;
            
            const result = {
                executionId: job.execution.executionId,
                duration: Date.now() - startTime,
                outputPath: extractor.folderStructure.getRelativePath(extractor.rawData.basePath || ''),
                files: this.getGeneratedFiles(extractor),
                worker: this.id
            };
            
            this.options.onComplete(this.id, job, result);
            
        } catch (error) {
            this.options.onError(this.id, job, error);
        }
        
        this.busy = false;
    }
    
    injectSharedCache(extractor) {
        // Pre-populate the extractor's cache with shared data
        if (this.options.sharedCache) {
            const cache = this.options.sharedCache;
            
            // Inject cached data to avoid redundant API calls
            if (cache.project) {
                const projectKey = extractor.getCacheKey('project', this.options.extractorOptions.project);
                extractor.setCachedData(projectKey, cache.project, 'projects');
            }
            
            if (cache.organization) {
                const orgKey = extractor.getCacheKey('organization', this.options.config.organizationId);
                extractor.setCachedData(orgKey, cache.organization, 'organizations');
            }
            
            if (cache.environments) {
                const envKey = extractor.getCacheKey('environments', this.options.extractorOptions.project);
                extractor.setCachedData(envKey, cache.environments, 'environments');
            }
            
            if (cache.apiTests) {
                const apiKey = extractor.getCacheKey('api_tests', 'all');
                extractor.setCachedData(apiKey, { item: { apiTests: Array.from(cache.apiTests.values()) } }, 'apiTests');
            }
        }
    }
    
    buildExecutionURL(execution) {
        // Build the URL format expected by VirtuosoExtractorV10
        const projectId = execution.projectId || this.options.extractorOptions.project;
        const executionId = execution.executionId;
        const journeyId = execution.journeyId || 'unknown';
        
        return `https://app2.virtuoso.qa/#/project/${projectId}/execution/${executionId}/journey/${journeyId}`;
    }
    
    getGeneratedFiles(extractor) {
        const files = ['raw_data'];
        
        if (this.options.extractorOptions.nlp) {
            files.push('execution.nlp.txt');
        }
        
        if (this.options.extractorOptions.vars) {
            files.push('variables.json');
        }
        
        if (this.options.extractorOptions.validate) {
            files.push('validation_report.json');
        }
        
        return files;
    }
}

module.exports = WorkerPool;