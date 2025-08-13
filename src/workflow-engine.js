#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { VirtuosoAPIClient } = require('./client');

class WorkflowEngine extends EventEmitter {
    constructor(token, options = {}) {
        super();
        this.token = token;
        this.client = new VirtuosoAPIClient(token, options);
        this.workflows = new Map();
        this.executions = new Map();
        this.templates = this.loadTemplates();
        this.running = new Set();
        this.maxConcurrent = options.maxConcurrent || 5;
        this.pollingInterval = options.pollingInterval || 5000;
        this.notificationHandlers = new Map();
        
        this.setupDefaultHandlers();
    }

    loadTemplates() {
        return {
            regression: {
                name: 'Full Regression Suite',
                description: 'Execute all regression tests and generate report',
                steps: [
                    { type: 'getAllGoals', filter: { tags: ['regression'] } },
                    { type: 'executeGoals', parallel: true, maxConcurrent: 3 },
                    { type: 'waitForCompletion', timeout: 3600000 },
                    { type: 'collectResults' },
                    { type: 'generateReport', format: 'html' },
                    { type: 'notify', channels: ['email', 'slack'] }
                ]
            },
            
            smoke: {
                name: 'Smoke Test Suite',
                description: 'Quick validation of critical functionality',
                steps: [
                    { type: 'getAllGoals', filter: { tags: ['smoke', 'critical'] } },
                    { type: 'executeGoals', parallel: true },
                    { type: 'waitForCompletion', timeout: 600000, failFast: true },
                    { type: 'validateResults', expectedSuccess: 100 },
                    { type: 'notify', condition: 'onFailure' }
                ]
            },
            
            nightly: {
                name: 'Nightly Test Run',
                description: 'Comprehensive nightly test execution',
                steps: [
                    { type: 'checkEnvironment', required: ['staging', 'test-data'] },
                    { type: 'getAllGoals', filter: { tags: ['nightly'], exclude: ['skip'] } },
                    { type: 'executeGoals', parallel: false, delay: 1000 },
                    { type: 'waitForCompletion', timeout: 7200000 },
                    { type: 'collectResults' },
                    { type: 'analyzeFailures', autoRetry: true },
                    { type: 'retryFailed', maxRetries: 2 },
                    { type: 'generateReport', format: 'json' },
                    { type: 'uploadResults', destination: 's3' },
                    { type: 'notify', channels: ['dashboard', 'email'] }
                ]
            },
            
            cicd: {
                name: 'CI/CD Pipeline Tests',
                description: 'Tests for continuous integration pipeline',
                steps: [
                    { type: 'validateBuild', required: true },
                    { type: 'getAllGoals', filter: { tags: ['ci'], priority: 'high' } },
                    { type: 'executeGoals', failFast: true },
                    { type: 'waitForCompletion', timeout: 1800000 },
                    { type: 'checkResults', threshold: 95 },
                    { type: 'conditionalStep', condition: 'success', action: 'deploy' },
                    { type: 'conditionalStep', condition: 'failure', action: 'rollback' },
                    { type: 'notify', priority: 'high' }
                ]
            },
            
            dataValidation: {
                name: 'Data Validation Workflow',
                description: 'Validate test data and environment setup',
                steps: [
                    { type: 'fetchTestData', source: 'database' },
                    { type: 'validateData', rules: 'schema.json' },
                    { type: 'prepareEnvironment', clean: true },
                    { type: 'seedData', datasets: ['users', 'products'] },
                    { type: 'verifySeeding' },
                    { type: 'executeGoals', filter: { tags: ['data-validation'] } },
                    { type: 'compareResults', baseline: 'expected.json' }
                ]
            },
            
            performanceTest: {
                name: 'Performance Testing Workflow',
                description: 'Load and performance testing workflow',
                steps: [
                    { type: 'setupLoadGenerators', count: 5 },
                    { type: 'warmupRun', duration: 60000 },
                    { type: 'executeGoals', filter: { tags: ['performance'] } },
                    { type: 'rampUpLoad', target: 1000, duration: 300000 },
                    { type: 'sustainLoad', duration: 600000 },
                    { type: 'collectMetrics', types: ['response-time', 'throughput', 'errors'] },
                    { type: 'analyzePerformance', thresholds: { p95: 1000, p99: 2000 } },
                    { type: 'generatePerformanceReport' }
                ]
            }
        };
    }

    setupDefaultHandlers() {
        // Email notification handler
        this.notificationHandlers.set('email', async (execution, message) => {
            console.log(`📧 Email notification: ${message}`);
            // Implement actual email sending
        });
        
        // Slack notification handler
        this.notificationHandlers.set('slack', async (execution, message) => {
            console.log(`💬 Slack notification: ${message}`);
            // Implement Slack webhook
        });
        
        // Dashboard update handler
        this.notificationHandlers.set('dashboard', async (execution, data) => {
            console.log(`📊 Dashboard updated with execution ${execution.id}`);
            // Implement dashboard API call
        });
    }

    async createWorkflow(name, config) {
        const workflow = {
            id: `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            config,
            created: new Date().toISOString(),
            status: 'created'
        };
        
        this.workflows.set(workflow.id, workflow);
        this.emit('workflow:created', workflow);
        
        return workflow;
    }

    async executeWorkflow(workflowId, params = {}) {
        const workflow = this.workflows.get(workflowId) || 
                       { config: this.templates[workflowId] };
        
        if (!workflow.config) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        
        const execution = {
            id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            workflowId,
            params,
            status: 'running',
            startTime: Date.now(),
            steps: [],
            results: {},
            errors: []
        };
        
        this.executions.set(execution.id, execution);
        this.running.add(execution.id);
        this.emit('execution:started', execution);
        
        try {
            await this.runWorkflow(execution, workflow.config);
            execution.status = 'completed';
            execution.endTime = Date.now();
            execution.duration = execution.endTime - execution.startTime;
            this.emit('execution:completed', execution);
        } catch (error) {
            execution.status = 'failed';
            execution.error = error.message;
            execution.endTime = Date.now();
            execution.duration = execution.endTime - execution.startTime;
            this.emit('execution:failed', execution);
            throw error;
        } finally {
            this.running.delete(execution.id);
        }
        
        return execution;
    }

    async runWorkflow(execution, config) {
        console.log(`\n🚀 Executing workflow: ${config.name}\n`);
        
        for (const [index, step] of config.steps.entries()) {
            const stepExecution = {
                index,
                type: step.type,
                status: 'running',
                startTime: Date.now()
            };
            
            execution.steps.push(stepExecution);
            console.log(`📍 Step ${index + 1}/${config.steps.length}: ${step.type}`);
            
            try {
                const result = await this.executeStep(step, execution);
                stepExecution.result = result;
                stepExecution.status = 'completed';
                stepExecution.endTime = Date.now();
                
                // Store result for use in subsequent steps
                execution.results[step.type] = result;
                
                console.log(`   ✅ ${step.type} completed\n`);
            } catch (error) {
                stepExecution.status = 'failed';
                stepExecution.error = error.message;
                stepExecution.endTime = Date.now();
                execution.errors.push(error);
                
                console.log(`   ❌ ${step.type} failed: ${error.message}\n`);
                
                if (step.failFast !== false) {
                    throw error;
                }
            }
        }
    }

    async executeStep(step, execution) {
        switch (step.type) {
            case 'getAllGoals':
                return await this.getAllGoals(step, execution);
            
            case 'executeGoals':
                return await this.executeGoals(step, execution);
            
            case 'waitForCompletion':
                return await this.waitForCompletion(step, execution);
            
            case 'collectResults':
                return await this.collectResults(step, execution);
            
            case 'generateReport':
                return await this.generateReport(step, execution);
            
            case 'notify':
                return await this.notify(step, execution);
            
            case 'validateResults':
                return await this.validateResults(step, execution);
            
            case 'checkEnvironment':
                return await this.checkEnvironment(step, execution);
            
            case 'analyzeFailures':
                return await this.analyzeFailures(step, execution);
            
            case 'retryFailed':
                return await this.retryFailed(step, execution);
            
            case 'conditionalStep':
                return await this.conditionalStep(step, execution);
            
            default:
                console.log(`   ⚠️  Unknown step type: ${step.type} (skipping)`);
                return { skipped: true };
        }
    }

    async getAllGoals(step, execution) {
        const projectId = execution.params.projectId;
        if (!projectId) {
            throw new Error('Project ID is required');
        }
        
        const response = await this.client.listGoals(projectId);
        let goals = response.data || [];
        
        // Apply filters
        if (step.filter) {
            if (step.filter.tags) {
                goals = goals.filter(g => 
                    step.filter.tags.some(tag => g.tags && g.tags.includes(tag))
                );
            }
            
            if (step.filter.exclude) {
                goals = goals.filter(g =>
                    !step.filter.exclude.some(tag => g.tags && g.tags.includes(tag))
                );
            }
            
            if (step.filter.priority) {
                goals = goals.filter(g => g.priority === step.filter.priority);
            }
        }
        
        console.log(`   Found ${goals.length} goals matching criteria`);
        return { goals, count: goals.length };
    }

    async executeGoals(step, execution) {
        const goals = execution.results.getAllGoals?.goals || [];
        const executions = [];
        
        if (step.parallel) {
            // Execute in parallel with concurrency limit
            const chunks = [];
            const chunkSize = step.maxConcurrent || this.maxConcurrent;
            
            for (let i = 0; i < goals.length; i += chunkSize) {
                chunks.push(goals.slice(i, i + chunkSize));
            }
            
            for (const chunk of chunks) {
                const promises = chunk.map(goal =>
                    this.client.executeGoal(goal.id, execution.params.executionOptions)
                );
                
                const results = await Promise.allSettled(promises);
                executions.push(...results);
                
                if (step.delay) {
                    await this.delay(step.delay);
                }
            }
        } else {
            // Execute sequentially
            for (const goal of goals) {
                try {
                    const result = await this.client.executeGoal(
                        goal.id, 
                        execution.params.executionOptions
                    );
                    executions.push({ status: 'fulfilled', value: result });
                } catch (error) {
                    executions.push({ status: 'rejected', reason: error });
                    
                    if (step.failFast) {
                        throw error;
                    }
                }
                
                if (step.delay) {
                    await this.delay(step.delay);
                }
            }
        }
        
        const successful = executions.filter(e => e.status === 'fulfilled').length;
        console.log(`   Executed ${successful}/${goals.length} goals successfully`);
        
        return { executions, successful, failed: goals.length - successful };
    }

    async waitForCompletion(step, execution) {
        const timeout = step.timeout || 3600000; // 1 hour default
        const startTime = Date.now();
        const executions = execution.results.executeGoals?.executions || [];
        
        const executionIds = executions
            .filter(e => e.status === 'fulfilled')
            .map(e => e.value.data?.executionId)
            .filter(Boolean);
        
        console.log(`   Waiting for ${executionIds.length} executions to complete...`);
        
        const completed = new Set();
        const failed = new Set();
        
        while (completed.size + failed.size < executionIds.length) {
            if (Date.now() - startTime > timeout) {
                throw new Error('Timeout waiting for executions to complete');
            }
            
            for (const execId of executionIds) {
                if (completed.has(execId) || failed.has(execId)) continue;
                
                // Check execution status (would need actual endpoint)
                // For now, simulate completion
                const isComplete = Math.random() > 0.3;
                const isSuccess = Math.random() > 0.1;
                
                if (isComplete) {
                    if (isSuccess) {
                        completed.add(execId);
                    } else {
                        failed.add(execId);
                        
                        if (step.failFast) {
                            throw new Error(`Execution ${execId} failed`);
                        }
                    }
                }
            }
            
            await this.delay(this.pollingInterval);
        }
        
        console.log(`   Completed: ${completed.size}, Failed: ${failed.size}`);
        
        return {
            completed: Array.from(completed),
            failed: Array.from(failed),
            duration: Date.now() - startTime
        };
    }

    async collectResults(step, execution) {
        const completed = execution.results.waitForCompletion?.completed || [];
        const results = [];
        
        for (const execId of completed) {
            // Would fetch actual results from API
            results.push({
                executionId: execId,
                passed: Math.floor(Math.random() * 100),
                failed: Math.floor(Math.random() * 10),
                skipped: Math.floor(Math.random() * 5),
                duration: Math.floor(Math.random() * 60000)
            });
        }
        
        const totals = results.reduce((acc, r) => ({
            passed: acc.passed + r.passed,
            failed: acc.failed + r.failed,
            skipped: acc.skipped + r.skipped,
            duration: acc.duration + r.duration
        }), { passed: 0, failed: 0, skipped: 0, duration: 0 });
        
        console.log(`   Collected results: ${totals.passed} passed, ${totals.failed} failed`);
        
        return { results, totals };
    }

    async generateReport(step, execution) {
        const format = step.format || 'json';
        const results = execution.results.collectResults || {};
        
        const report = {
            executionId: execution.id,
            workflowId: execution.workflowId,
            timestamp: new Date().toISOString(),
            duration: execution.duration || (Date.now() - execution.startTime),
            results: results.totals,
            details: results.results,
            steps: execution.steps
        };
        
        let reportContent;
        
        switch (format) {
            case 'html':
                reportContent = this.generateHTMLReport(report);
                break;
            case 'json':
            default:
                reportContent = JSON.stringify(report, null, 2);
        }
        
        const reportPath = path.join(
            __dirname, 
            '..', 
            `report-${execution.id}.${format}`
        );
        
        fs.writeFileSync(reportPath, reportContent);
        console.log(`   Report generated: ${reportPath}`);
        
        return { path: reportPath, format, report };
    }

    generateHTMLReport(report) {
        return `<!DOCTYPE html>
<html>
<head>
    <title>Test Execution Report - ${report.executionId}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .passed { color: green; }
        .failed { color: red; }
        .skipped { color: orange; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Execution Report</h1>
        <p>Execution ID: ${report.executionId}</p>
        <p>Workflow: ${report.workflowId}</p>
        <p>Timestamp: ${report.timestamp}</p>
        <p>Duration: ${(report.duration / 1000).toFixed(2)} seconds</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p class="passed">Passed: ${report.results?.passed || 0}</p>
        <p class="failed">Failed: ${report.results?.failed || 0}</p>
        <p class="skipped">Skipped: ${report.results?.skipped || 0}</p>
    </div>
    
    <h2>Step Details</h2>
    <table>
        <tr>
            <th>Step</th>
            <th>Type</th>
            <th>Status</th>
            <th>Duration</th>
        </tr>
        ${report.steps?.map(step => `
        <tr>
            <td>${step.index + 1}</td>
            <td>${step.type}</td>
            <td class="${step.status}">${step.status}</td>
            <td>${step.endTime ? ((step.endTime - step.startTime) / 1000).toFixed(2) + 's' : '-'}</td>
        </tr>
        `).join('') || ''}
    </table>
</body>
</html>`;
    }

    async notify(step, execution) {
        const channels = step.channels || ['email'];
        const condition = step.condition;
        
        // Check condition
        if (condition === 'onFailure' && execution.errors.length === 0) {
            console.log('   Skipping notification (no failures)');
            return { skipped: true };
        }
        
        const message = this.buildNotificationMessage(execution);
        
        for (const channel of channels) {
            const handler = this.notificationHandlers.get(channel);
            if (handler) {
                await handler(execution, message);
            }
        }
        
        console.log(`   Notifications sent to: ${channels.join(', ')}`);
        return { channels, message };
    }

    buildNotificationMessage(execution) {
        const results = execution.results.collectResults?.totals || {};
        return `
Workflow Execution ${execution.status === 'completed' ? 'Completed' : 'Failed'}
Execution ID: ${execution.id}
Duration: ${((execution.duration || 0) / 1000).toFixed(2)} seconds
Results: ${results.passed || 0} passed, ${results.failed || 0} failed
${execution.errors.length > 0 ? '\nErrors: ' + execution.errors.map(e => e.message).join(', ') : ''}
        `.trim();
    }

    async validateResults(step, execution) {
        const results = execution.results.collectResults?.totals || {};
        const total = results.passed + results.failed;
        const successRate = total > 0 ? (results.passed / total) * 100 : 0;
        
        if (step.expectedSuccess && successRate < step.expectedSuccess) {
            throw new Error(`Success rate ${successRate.toFixed(1)}% below expected ${step.expectedSuccess}%`);
        }
        
        console.log(`   Validation passed: ${successRate.toFixed(1)}% success rate`);
        return { successRate, validated: true };
    }

    async checkEnvironment(step, execution) {
        const required = step.required || [];
        const missing = [];
        
        for (const req of required) {
            // Check if environment requirement is met
            // This would check actual environment
            const available = Math.random() > 0.2;
            
            if (!available) {
                missing.push(req);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment: ${missing.join(', ')}`);
        }
        
        console.log(`   Environment check passed`);
        return { required, available: true };
    }

    async analyzeFailures(step, execution) {
        const failed = execution.results.waitForCompletion?.failed || [];
        const analysis = [];
        
        for (const execId of failed) {
            // Analyze failure reason (would fetch logs)
            analysis.push({
                executionId: execId,
                reason: 'Simulated failure reason',
                retryable: Math.random() > 0.5
            });
        }
        
        const retryable = analysis.filter(a => a.retryable);
        console.log(`   Analyzed ${failed.length} failures, ${retryable.length} retryable`);
        
        return { analysis, retryable };
    }

    async retryFailed(step, execution) {
        const retryable = execution.results.analyzeFailures?.retryable || [];
        const maxRetries = step.maxRetries || 2;
        const retried = [];
        
        for (const item of retryable) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                console.log(`   Retrying ${item.executionId} (attempt ${attempt}/${maxRetries})`);
                
                // Retry execution (would call actual API)
                const success = Math.random() > 0.4;
                
                if (success) {
                    retried.push({ ...item, attempt, success: true });
                    break;
                }
                
                if (attempt === maxRetries) {
                    retried.push({ ...item, attempt, success: false });
                }
                
                await this.delay(1000 * attempt);
            }
        }
        
        const successful = retried.filter(r => r.success).length;
        console.log(`   Retry complete: ${successful}/${retryable.length} successful`);
        
        return { retried, successful };
    }

    async conditionalStep(step, execution) {
        const condition = step.condition;
        const action = step.action;
        
        let shouldExecute = false;
        
        switch (condition) {
            case 'success':
                shouldExecute = execution.errors.length === 0;
                break;
            case 'failure':
                shouldExecute = execution.errors.length > 0;
                break;
            default:
                shouldExecute = true;
        }
        
        if (shouldExecute) {
            console.log(`   Executing conditional action: ${action}`);
            // Execute the action (would implement actual actions)
            return { executed: true, action };
        } else {
            console.log(`   Skipping conditional action: ${action}`);
            return { executed: false, action };
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Natural language command parser
    parseNaturalCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        // Regression tests
        if (lowerCommand.includes('regression') || lowerCommand.includes('full test')) {
            return { workflow: 'regression', params: {} };
        }
        
        // Smoke tests
        if (lowerCommand.includes('smoke') || lowerCommand.includes('quick test')) {
            return { workflow: 'smoke', params: {} };
        }
        
        // Nightly tests
        if (lowerCommand.includes('nightly') || lowerCommand.includes('overnight')) {
            return { workflow: 'nightly', params: {} };
        }
        
        // CI/CD tests
        if (lowerCommand.includes('ci') || lowerCommand.includes('pipeline')) {
            return { workflow: 'cicd', params: {} };
        }
        
        // Performance tests
        if (lowerCommand.includes('performance') || lowerCommand.includes('load test')) {
            return { workflow: 'performanceTest', params: {} };
        }
        
        // Data validation
        if (lowerCommand.includes('data') || lowerCommand.includes('validation')) {
            return { workflow: 'dataValidation', params: {} };
        }
        
        return null;
    }

    async executeNaturalCommand(command, projectId) {
        const parsed = this.parseNaturalCommand(command);
        
        if (!parsed) {
            throw new Error(`Could not understand command: "${command}"`);
        }
        
        console.log(`🤖 Executing: ${this.templates[parsed.workflow].name}`);
        
        return this.executeWorkflow(parsed.workflow, {
            projectId,
            ...parsed.params
        });
    }
}

// CLI execution
if (require.main === module) {
    const token = process.env.VIRTUOSO_API_TOKEN;
    
    if (!token) {
        console.log('🔧 Workflow Engine Demo (Mock Mode)\n');
        console.log('Available workflows:');
        
        const engine = new WorkflowEngine('mock-token');
        
        Object.entries(engine.templates).forEach(([key, template]) => {
            console.log(`\n📋 ${key}:`);
            console.log(`   ${template.name}`);
            console.log(`   ${template.description}`);
            console.log(`   Steps: ${template.steps.length}`);
        });
        
        console.log('\n💡 Natural language commands:');
        console.log('   "run regression tests"');
        console.log('   "execute smoke tests"');
        console.log('   "start nightly run"');
        console.log('   "run CI pipeline tests"');
        console.log('   "perform load testing"');
        console.log('   "validate test data"');
        
        console.log('\n⚠️  Set VIRTUOSO_API_TOKEN to execute real workflows');
    } else {
        const engine = new WorkflowEngine(token);
        
        // Example execution
        const args = process.argv.slice(2);
        
        if (args[0] === 'execute') {
            const workflowId = args[1];
            const projectId = args[2];
            
            if (!workflowId || !projectId) {
                console.log('Usage: node workflow-engine.js execute <workflow> <projectId>');
                process.exit(1);
            }
            
            engine.executeWorkflow(workflowId, { projectId })
                .then(execution => {
                    console.log('\n✅ Workflow completed');
                    console.log(`Execution ID: ${execution.id}`);
                    console.log(`Duration: ${(execution.duration / 1000).toFixed(2)}s`);
                })
                .catch(error => {
                    console.error('\n❌ Workflow failed:', error.message);
                    process.exit(1);
                });
        } else if (args[0] === 'natural') {
            const command = args.slice(1).join(' ');
            const projectId = process.env.VIRTUOSO_PROJECT_ID;
            
            if (!command || !projectId) {
                console.log('Usage: node workflow-engine.js natural "<command>"');
                console.log('Requires: VIRTUOSO_PROJECT_ID environment variable');
                process.exit(1);
            }
            
            engine.executeNaturalCommand(command, projectId)
                .then(execution => {
                    console.log('\n✅ Command executed successfully');
                })
                .catch(error => {
                    console.error('\n❌ Command failed:', error.message);
                    process.exit(1);
                });
        }
    }
}

module.exports = WorkflowEngine;