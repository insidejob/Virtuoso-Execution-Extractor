#!/usr/bin/env node

/**
 * Virtuoso Screenshot Extractor
 * Extracts and downloads all screenshots from test executions
 * Organizes them in a human-readable folder structure
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

class ScreenshotExtractor {
    constructor(config) {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: config.token || process.env.VIRTUOSO_TOKEN,
            sessionId: config.sessionId || process.env.VIRTUOSO_SESSION,
            clientId: config.clientId || process.env.VIRTUOSO_CLIENT || '1754647483711_e9e9c12_production',
            outputDir: config.outputDir || './virtuoso-exports'
        };
        
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
     * Main extraction method
     * @param {Object} ids - Contains project, execution, journey IDs
     * @param {Object} options - Extraction options
     */
    async extract(ids, options = {}) {
        console.log('📸 Starting screenshot extraction...\n');
        
        try {
            // Step 1: Get execution details for folder names
            const executionData = await this.getExecutionDetails(ids);
            const journeyData = await this.getJourneyDetails(ids.journey);
            const goalData = await this.getGoalDetails(journeyData.goalId);
            
            // Step 2: Create folder structure with readable names
            const folderStructure = this.createFolderStructure(
                goalData,
                executionData,
                journeyData
            );
            
            // Step 3: Get screenshots from execution
            const screenshots = await this.getScreenshots(ids);
            
            // Step 4: Download all screenshots
            await this.downloadScreenshots(screenshots, folderStructure);
            
            // Step 5: Generate documentation
            await this.generateDocumentation(
                screenshots,
                folderStructure,
                executionData,
                journeyData
            );
            
            console.log(`\n✅ Successfully extracted ${screenshots.length} screenshots`);
            console.log(`📁 Saved to: ${folderStructure.screenshotDir}`);
            
            return {
                count: screenshots.length,
                path: folderStructure.screenshotDir,
                documentation: path.join(folderStructure.journeyDir, 'screenshot-context.md')
            };
            
        } catch (error) {
            console.error('❌ Screenshot extraction failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Get execution details including name and status
     */
    async getExecutionDetails(ids) {
        const endpoint = `/executions/${ids.execution}`;
        const data = await this.apiRequest(endpoint);
        
        return {
            id: data.id,
            name: data.name || `Execution-${data.id}`,
            status: data.status,
            startTime: data.startedAt,
            endTime: data.finishedAt,
            environment: data.environment,
            browser: data.browser
        };
    }
    
    /**
     * Get journey/testsuite details including name
     */
    async getJourneyDetails(journeyId) {
        const endpoint = `/testsuites/${journeyId}?envelope=false`;
        const data = await this.apiRequest(endpoint);
        
        return {
            id: data.id,
            name: data.name,
            title: data.title,
            goalId: data.goalId,
            checkpoints: data.cases ? data.cases.length : 0
        };
    }
    
    /**
     * Get goal details including name
     */
    async getGoalDetails(goalId) {
        const endpoint = `/goals/${goalId}`;
        const data = await this.apiRequest(endpoint);
        
        return {
            id: data.id,
            name: data.name || `Goal-${data.id}`,
            description: data.description
        };
    }
    
    /**
     * Get screenshots from execution results
     */
    async getScreenshots(ids) {
        // Get execution results which contain screenshots
        const endpoint = `/executions/${ids.execution}/journeyExecutions/${ids.journey}/testsuiteExecutions`;
        const data = await this.apiRequest(endpoint);
        
        const screenshots = [];
        let stepCounter = 0;
        
        // Extract screenshots from each checkpoint execution
        if (data && data.executions) {
            for (const execution of data.executions) {
                if (execution.stepExecutions) {
                    for (const step of execution.stepExecutions) {
                        stepCounter++;
                        
                        // Check for screenshot URLs in step
                        if (step.screenshotUrl) {
                            screenshots.push({
                                stepNumber: stepCounter,
                                checkpointName: execution.checkpointName,
                                action: step.action,
                                description: this.getStepDescription(step),
                                url: step.screenshotUrl,
                                timestamp: step.timestamp,
                                status: step.status
                            });
                        }
                        
                        // Also check for before/after screenshots
                        if (step.beforeScreenshot) {
                            screenshots.push({
                                stepNumber: stepCounter,
                                checkpointName: execution.checkpointName,
                                action: step.action,
                                description: `Before: ${this.getStepDescription(step)}`,
                                url: step.beforeScreenshot,
                                timestamp: step.timestamp,
                                status: step.status,
                                type: 'before'
                            });
                        }
                        
                        if (step.afterScreenshot) {
                            screenshots.push({
                                stepNumber: stepCounter,
                                checkpointName: execution.checkpointName,
                                action: step.action,
                                description: `After: ${this.getStepDescription(step)}`,
                                url: step.afterScreenshot,
                                timestamp: step.timestamp,
                                status: step.status,
                                type: 'after'
                            });
                        }
                    }
                }
            }
        }
        
        // If no screenshots in execution results, try step results endpoint
        if (screenshots.length === 0) {
            console.log('⚠️  No screenshots found in execution results, trying alternative endpoint...');
            
            // Try getting individual step results
            const stepsEndpoint = `/executions/${ids.execution}/steps`;
            const stepsData = await this.apiRequest(stepsEndpoint);
            
            if (stepsData && stepsData.steps) {
                for (const step of stepsData.steps) {
                    if (step.screenshot || step.screenshotUrl) {
                        screenshots.push({
                            stepNumber: step.order || screenshots.length + 1,
                            checkpointName: step.checkpointName || 'Unknown',
                            action: step.action,
                            description: this.getStepDescription(step),
                            url: step.screenshot || step.screenshotUrl,
                            timestamp: step.executedAt,
                            status: step.status
                        });
                    }
                }
            }
        }
        
        console.log(`📊 Found ${screenshots.length} screenshots to extract`);
        return screenshots;
    }
    
    /**
     * Create folder structure with readable names
     */
    createFolderStructure(goalData, executionData, journeyData) {
        // Clean names for folder creation
        const cleanName = (name) => {
            return name
                .replace(/[^a-z0-9\s-]/gi, '') // Remove special chars
                .replace(/\s+/g, '-')           // Replace spaces with hyphens
                .toLowerCase()
                .substring(0, 50);              // Limit length
        };
        
        const timestamp = new Date(executionData.startTime || Date.now())
            .toISOString()
            .split('T')[0];
        
        // Create human-readable folder names
        const goalFolder = `${cleanName(goalData.name)}-goal-${goalData.id}`;
        const executionFolder = `${timestamp}-${cleanName(executionData.name)}-exec-${executionData.id}`;
        const journeyFolder = `${cleanName(journeyData.title || journeyData.name)}-journey-${journeyData.id}`;
        
        // Build full paths
        const paths = {
            baseDir: this.config.outputDir,
            goalDir: path.join(this.config.outputDir, goalFolder),
            executionDir: path.join(this.config.outputDir, goalFolder, executionFolder),
            journeyDir: path.join(this.config.outputDir, goalFolder, executionFolder, journeyFolder),
            screenshotDir: path.join(this.config.outputDir, goalFolder, executionFolder, journeyFolder, 'screenshots')
        };
        
        // Create directories
        Object.values(paths).forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        console.log('📁 Created folder structure:');
        console.log(`   Goal: ${goalFolder}`);
        console.log(`   Execution: ${executionFolder}`);
        console.log(`   Journey: ${journeyFolder}`);
        
        return paths;
    }
    
    /**
     * Download all screenshots
     */
    async downloadScreenshots(screenshots, folderStructure) {
        console.log('\n⬇️  Downloading screenshots...');
        
        for (let i = 0; i < screenshots.length; i++) {
            const screenshot = screenshots[i];
            const filename = this.generateFilename(screenshot, i + 1);
            const filepath = path.join(folderStructure.screenshotDir, filename);
            
            try {
                await this.downloadFile(screenshot.url, filepath);
                console.log(`   ✓ ${filename}`);
                screenshot.localPath = filepath;
                screenshot.filename = filename;
            } catch (error) {
                console.error(`   ✗ Failed to download ${filename}: ${error.message}`);
            }
        }
    }
    
    /**
     * Generate filename for screenshot
     */
    generateFilename(screenshot, index) {
        const paddedIndex = String(index).padStart(3, '0');
        const action = screenshot.action.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const status = screenshot.status === 'PASSED' ? 'pass' : 'fail';
        const type = screenshot.type || 'during';
        
        return `step-${paddedIndex}-${action}-${type}-${status}.png`;
    }
    
    /**
     * Download a single file
     */
    async downloadFile(url, filepath) {
        return new Promise((resolve, reject) => {
            // Handle relative URLs
            if (!url.startsWith('http')) {
                url = `https://app2.virtuoso.qa${url}`;
            }
            
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: this.headers
            };
            
            const file = fs.createWriteStream(filepath);
            
            https.get(options, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
                
                file.on('error', (err) => {
                    fs.unlink(filepath, () => {}); // Delete partial file
                    reject(err);
                });
            }).on('error', reject);
        });
    }
    
    /**
     * Generate documentation for screenshots
     */
    async generateDocumentation(screenshots, folderStructure, executionData, journeyData) {
        console.log('\n📝 Generating documentation...');
        
        const doc = [];
        
        // Header
        doc.push('# Screenshot Documentation');
        doc.push(`Generated: ${new Date().toISOString()}\n`);
        
        // Execution details
        doc.push('## Execution Details');
        doc.push(`- **Journey**: ${journeyData.title || journeyData.name}`);
        doc.push(`- **Execution**: ${executionData.name}`);
        doc.push(`- **Status**: ${executionData.status}`);
        doc.push(`- **Environment**: ${executionData.environment || 'Default'}`);
        doc.push(`- **Browser**: ${executionData.browser || 'Chrome'}`);
        doc.push(`- **Start Time**: ${executionData.startTime}`);
        doc.push(`- **End Time**: ${executionData.endTime}\n`);
        
        // Screenshot index
        doc.push('## Screenshots');
        doc.push(`Total: ${screenshots.length} screenshots captured\n`);
        
        // Group by checkpoint
        const byCheckpoint = {};
        screenshots.forEach(s => {
            if (!byCheckpoint[s.checkpointName]) {
                byCheckpoint[s.checkpointName] = [];
            }
            byCheckpoint[s.checkpointName].push(s);
        });
        
        // Document each checkpoint
        Object.entries(byCheckpoint).forEach(([checkpoint, shots]) => {
            doc.push(`### ${checkpoint}`);
            doc.push('');
            
            shots.forEach(shot => {
                const status = shot.status === 'PASSED' ? '✅' : '❌';
                doc.push(`#### Step ${shot.stepNumber}: ${shot.action} ${status}`);
                doc.push(`- **Description**: ${shot.description}`);
                doc.push(`- **File**: ${shot.filename || 'Not downloaded'}`);
                doc.push(`- **Timestamp**: ${shot.timestamp}`);
                if (shot.type) {
                    doc.push(`- **Type**: ${shot.type}`);
                }
                doc.push('');
            });
        });
        
        // Write documentation
        const docPath = path.join(folderStructure.journeyDir, 'screenshot-context.md');
        fs.writeFileSync(docPath, doc.join('\n'));
        
        // Also create a JSON manifest
        const manifest = {
            execution: executionData,
            journey: journeyData,
            screenshots: screenshots.map(s => ({
                ...s,
                url: undefined // Remove URL from manifest
            })),
            generated: new Date().toISOString()
        };
        
        const manifestPath = path.join(folderStructure.journeyDir, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log('   ✓ Documentation saved to screenshot-context.md');
        console.log('   ✓ Manifest saved to manifest.json');
    }
    
    /**
     * Get human-readable step description
     */
    getStepDescription(step) {
        switch(step.action) {
            case 'NAVIGATE':
                return `Navigate to ${step.value || step.url || 'URL'}`;
            case 'WRITE':
                return `Write "${step.value || step.variable || 'text'}" in ${step.target || 'field'}`;
            case 'CLICK':
                return `Click on ${step.target || step.element || 'element'}`;
            case 'SELECT':
            case 'PICK':
                return `Select "${step.value}" from dropdown`;
            case 'WAIT_FOR_ELEMENT':
                return `Wait for ${step.target || 'element'} to appear`;
            case 'VERIFY':
                return `Verify ${step.assertion || 'condition'}`;
            default:
                return step.description || step.action;
        }
    }
    
    /**
     * Make API request
     */
    async apiRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const url = `${this.config.baseUrl}${endpoint}`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: this.headers
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error('Failed to parse API response'));
                        }
                    } else {
                        reject(new Error(`API returned status ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
        });
    }
}

module.exports = ScreenshotExtractor;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node virtuoso-screenshot-extractor.js <executionId> <journeyId> [projectId]');
        process.exit(1);
    }
    
    const ids = {
        execution: args[0],
        journey: args[1],
        project: args[2] || '4889'
    };
    
    const extractor = new ScreenshotExtractor({
        token: process.env.VIRTUOSO_TOKEN,
        sessionId: process.env.VIRTUOSO_SESSION
    });
    
    extractor.extract(ids).catch(console.error);
}