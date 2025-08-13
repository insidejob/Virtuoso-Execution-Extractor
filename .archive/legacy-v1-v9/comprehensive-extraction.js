#!/usr/bin/env node

/**
 * Comprehensive Extraction with Full Folder Structure
 * Captures: NLP, Variables, Raw JSON Data
 * Follows defined folder structure pattern
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class ComprehensiveExtractor {
    constructor() {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: '2d313def-7ec2-4526-b0b6-57028c343aba',
            sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
            clientId: '1754647483711_e9e9c12_production'
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
        
        this.rawData = {};
    }
    
    async extract(url) {
        console.log('🚀 Comprehensive Extraction Starting\n');
        console.log('=' .repeat(70));
        console.log(`URL: ${url}`);
        console.log('=' .repeat(70));
        
        try {
            // Step 1: Parse URL
            console.log('\n📋 Step 1: Parsing URL...');
            const ids = this.parseURL(url);
            console.log(`✅ Extracted IDs:`, ids);
            
            // Step 2: Fetch all data
            console.log('\n📋 Step 2: Fetching all data from API...');
            
            // Fetch journey data
            console.log('  → Fetching journey/testsuite data...');
            const journeyData = await this.apiRequest(`/testsuites/${ids.journey}?envelope=false`);
            this.rawData.journey = journeyData;
            console.log(`  ✅ Journey: ${journeyData.title || journeyData.name}`);
            
            // Fetch execution data
            console.log('  → Fetching execution data...');
            const executionData = await this.apiRequest(`/executions/${ids.execution}`);
            this.rawData.execution = executionData;
            console.log(`  ✅ Execution: ${executionData.item?.id || ids.execution}`);
            
            // Fetch project data
            console.log('  → Fetching project data...');
            const projectData = await this.apiRequest(`/projects/${ids.project}`);
            this.rawData.project = projectData;
            console.log(`  ✅ Project: ${projectData.item?.name || ids.project}`);
            
            // Fetch goal data if available
            let goalData = null;
            if (ids.goal) {
                console.log('  → Fetching goal data...');
                try {
                    goalData = await this.apiRequest(`/goals/${ids.goal}`);
                    this.rawData.goal = goalData;
                    console.log(`  ✅ Goal: ${goalData.item?.name || ids.goal}`);
                } catch (e) {
                    console.log(`  ⚠️  Goal data not available`);
                }
            }
            
            // Fetch environment data
            console.log('  → Fetching environment data...');
            const environmentData = await this.apiRequest(`/projects/${ids.project}/environments`);
            this.rawData.environments = environmentData;
            console.log(`  ✅ Environments: ${environmentData.item?.environments?.length || 0} found`);
            
            // Step 3: Create folder structure
            console.log('\n📋 Step 3: Creating folder structure...');
            const folderPath = this.createFolderStructure(ids, journeyData, executionData, goalData, projectData);
            console.log(`✅ Created: ${folderPath}`);
            
            // Step 4: Extract and save NLP
            console.log('\n📋 Step 4: Converting to NLP...');
            const nlp = this.convertToNLP(journeyData);
            const nlpPath = path.join(folderPath, 'execution.nlp.txt');
            fs.writeFileSync(nlpPath, nlp);
            console.log(`✅ Saved NLP: ${nlpPath}`);
            console.log(`   Lines: ${nlp.split('\n').length}`);
            
            // Step 5: Extract and save variables (only used)
            console.log('\n📋 Step 5: Extracting ONLY used variables...');
            const variables = this.extractUsedVariables(journeyData, executionData, environmentData);
            const varsPath = path.join(folderPath, 'variables-used.json');
            fs.writeFileSync(varsPath, JSON.stringify(variables, null, 2));
            console.log(`✅ Saved variables: ${varsPath}`);
            console.log(`   Used: ${variables.summary.total_used} variables`);
            console.log(`   Available: ${variables.summary.total_available} variables`);
            
            // Step 6: Save raw JSON data
            console.log('\n📋 Step 6: Saving raw JSON data...');
            const rawDataPath = path.join(folderPath, 'raw-data');
            if (!fs.existsSync(rawDataPath)) {
                fs.mkdirSync(rawDataPath);
            }
            
            // Save each raw data file
            Object.entries(this.rawData).forEach(([key, data]) => {
                const filePath = path.join(rawDataPath, `${key}.json`);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`  ✅ Saved: raw-data/${key}.json`);
            });
            
            // Step 7: Create metadata file
            console.log('\n📋 Step 7: Creating metadata...');
            const metadata = this.createMetadata(ids, journeyData, executionData, goalData, projectData);
            const metaPath = path.join(folderPath, 'metadata.json');
            fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
            console.log(`✅ Saved metadata: ${metaPath}`);
            
            // Step 8: Create summary report
            console.log('\n📋 Step 8: Creating extraction summary...');
            const summary = this.createSummaryReport(folderPath, nlp, variables, metadata);
            const summaryPath = path.join(folderPath, 'EXTRACTION-SUMMARY.md');
            fs.writeFileSync(summaryPath, summary);
            console.log(`✅ Saved summary: ${summaryPath}`);
            
            // Final summary
            console.log('\n' + '=' .repeat(70));
            console.log('✅ EXTRACTION COMPLETE\n');
            console.log(`📁 Output Directory: ${folderPath}`);
            console.log('\n📊 Files Created:');
            console.log('  ├── execution.nlp.txt          (NLP conversion)');
            console.log('  ├── variables-used.json        (Only used variables)');
            console.log('  ├── metadata.json              (Extraction metadata)');
            console.log('  ├── EXTRACTION-SUMMARY.md      (Human-readable summary)');
            console.log('  └── raw-data/                  (Raw JSON from API)');
            console.log('      ├── journey.json');
            console.log('      ├── execution.json');
            console.log('      ├── project.json');
            console.log('      ├── environments.json');
            if (goalData) {
                console.log('      └── goal.json');
            }
            console.log('\n' + '=' .repeat(70));
            
            return {
                success: true,
                path: folderPath,
                files: {
                    nlp: nlpPath,
                    variables: varsPath,
                    metadata: metaPath,
                    summary: summaryPath,
                    rawData: rawDataPath
                }
            };
            
        } catch (error) {
            console.error('\n❌ Extraction failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    parseURL(url) {
        const patterns = {
            execution: /execution\/(\d+)/,
            journey: /journey\/(\d+)/,
            project: /project\/(\d+)/,
            goal: /goal\/(\d+)/
        };
        
        const ids = {};
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = url.match(pattern);
            if (match) ids[key] = match[1];
        }
        return ids;
    }
    
    createFolderStructure(ids, journeyData, executionData, goalData, projectData) {
        // Create base output directory
        const baseDir = 'extractions';
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir);
        }
        
        // Create timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        
        // Create folder names with human-readable names
        const projectName = this.cleanName(projectData?.item?.name || `project-${ids.project}`);
        const goalName = goalData ? this.cleanName(goalData.item?.name || `goal-${ids.goal}`) : 'no-goal';
        const executionName = `execution-${ids.execution}`;
        const journeyName = this.cleanName(journeyData.title || journeyData.name || `journey-${ids.journey}`);
        
        // Create folder structure: extractions/timestamp-project/goal/execution/journey
        const projectPath = path.join(baseDir, `${timestamp}-${projectName}`);
        const goalPath = path.join(projectPath, goalName);
        const executionPath = path.join(goalPath, executionName);
        const journeyPath = path.join(executionPath, journeyName);
        
        // Create all directories
        [projectPath, goalPath, executionPath, journeyPath].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
        });
        
        return journeyPath;
    }
    
    cleanName(name) {
        // Remove special characters and make filesystem-safe
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }
    
    convertToNLP(journeyData) {
        const lines = [];
        
        if (journeyData.cases) {
            journeyData.cases.forEach((testCase, index) => {
                lines.push(`Checkpoint ${index + 1}: ${testCase.title}`);
                
                if (testCase.steps) {
                    testCase.steps.forEach(step => {
                        const nlpLine = this.stepToNLP(step);
                        if (nlpLine) lines.push(nlpLine);
                    });
                }
                lines.push('');
            });
        }
        
        return lines.join('\n').trim();
    }
    
    stepToNLP(step) {
        // Get UI-friendly field name
        let fieldName = null;
        if (step.element?.target?.selectors) {
            const guess = step.element.target.selectors.find(s => s.type === 'GUESS');
            if (guess?.value) {
                try {
                    const guessData = JSON.parse(guess.value);
                    fieldName = guessData.clue || guessData.text;
                } catch (e) {}
            }
        }
        
        const variable = step.variable ? `$${step.variable}` : step.value;
        
        switch (step.action) {
            case 'NAVIGATE':
                return `Navigate to ${variable}`;
            case 'WRITE':
                return fieldName 
                    ? `Write ${variable} in field "${fieldName}"`
                    : `Write ${variable}`;
            case 'CLICK':
                return fieldName
                    ? `Click on "${fieldName}"`
                    : 'Click on element';
            case 'PICK':
            case 'SELECT':
                return fieldName
                    ? `Pick "${step.value}" from dropdown "${fieldName}"`
                    : `Select "${step.value}"`;
            default:
                return `${step.action} ${variable || ''}`.trim();
        }
    }
    
    extractUsedVariables(journeyData, executionData, environmentData) {
        const usedVars = new Map();
        
        // Find used variables in journey steps
        if (journeyData.cases) {
            journeyData.cases.forEach((testCase, caseIndex) => {
                if (testCase.steps) {
                    testCase.steps.forEach((step, stepIndex) => {
                        if (step.variable) {
                            if (!usedVars.has(step.variable)) {
                                usedVars.set(step.variable, {
                                    name: step.variable,
                                    usage: []
                                });
                            }
                            
                            usedVars.get(step.variable).usage.push({
                                checkpoint: testCase.title,
                                step: stepIndex + 1,
                                action: step.action
                            });
                        }
                    });
                }
            });
        }
        
        // Get values for used variables
        const testDataValues = {};
        const envValues = {};
        
        // Extract test data values
        if (executionData?.item?.meta?.initialDataPerJourneySequence) {
            const journeyTestData = executionData.item.meta.initialDataPerJourneySequence[journeyData.id];
            if (journeyTestData) {
                Object.values(journeyTestData).forEach(dataRow => {
                    Object.assign(testDataValues, dataRow);
                });
            }
        }
        
        // Extract environment values
        if (environmentData?.item?.environments) {
            const env = environmentData.item.environments[0];
            if (env?.variables) {
                Object.values(env.variables).forEach(v => {
                    envValues[v.name] = v.value;
                });
            }
        }
        
        // Build result
        const result = {
            summary: {
                total_used: usedVars.size,
                total_available: Object.keys(testDataValues).length + Object.keys(envValues).length
            },
            variables: {}
        };
        
        usedVars.forEach((varInfo, varName) => {
            let value = 'Not set';
            let type = 'LOCAL';
            
            if (testDataValues[varName]) {
                value = testDataValues[varName];
                type = 'TEST_DATA';
            } else if (envValues[varName]) {
                value = envValues[varName];
                type = 'ENVIRONMENT';
            } else {
                // Default values
                const defaults = {
                    'url': 'https://ipermit-demo.com',
                    'username': 'admin',
                    'password': '********'
                };
                if (defaults[varName]) {
                    value = defaults[varName];
                }
            }
            
            // Mask passwords
            if (varName.toLowerCase().includes('password')) {
                value = '********';
            }
            
            result.variables[`$${varName}`] = {
                value,
                type,
                usage: varInfo.usage
            };
        });
        
        return result;
    }
    
    createMetadata(ids, journeyData, executionData, goalData, projectData) {
        return {
            extraction: {
                timestamp: new Date().toISOString(),
                url: `https://app2.virtuoso.qa/#/project/${ids.project}/execution/${ids.execution}/journey/${ids.journey}`,
                wrapper_version: '1.0.0',
                token_used: this.config.token.substring(0, 10) + '...'
            },
            project: {
                id: ids.project,
                name: projectData?.item?.name || 'Unknown'
            },
            goal: goalData ? {
                id: ids.goal,
                name: goalData.item?.name || 'Unknown'
            } : null,
            execution: {
                id: ids.execution,
                status: executionData?.item?.executionStatus || 'Unknown',
                started: executionData?.item?.createdAt,
                completed: executionData?.item?.updatedAt
            },
            journey: {
                id: ids.journey,
                name: journeyData.name,
                title: journeyData.title,
                checkpoints: journeyData.cases?.length || 0,
                total_steps: journeyData.cases?.reduce((sum, c) => sum + (c.steps?.length || 0), 0) || 0
            }
        };
    }
    
    createSummaryReport(folderPath, nlp, variables, metadata) {
        const lines = [];
        
        lines.push('# 📊 Extraction Summary Report');
        lines.push('');
        lines.push(`**Generated**: ${metadata.extraction.timestamp}`);
        lines.push(`**Location**: ${folderPath}`);
        lines.push('');
        
        lines.push('## 📋 Source Information');
        lines.push(`- **Project**: ${metadata.project.name} (ID: ${metadata.project.id})`);
        if (metadata.goal) {
            lines.push(`- **Goal**: ${metadata.goal.name} (ID: ${metadata.goal.id})`);
        }
        lines.push(`- **Execution**: ${metadata.execution.id}`);
        lines.push(`- **Journey**: ${metadata.journey.title || metadata.journey.name}`);
        lines.push('');
        
        lines.push('## 📈 Extraction Statistics');
        lines.push(`- **Checkpoints**: ${metadata.journey.checkpoints}`);
        lines.push(`- **Total Steps**: ${metadata.journey.total_steps}`);
        lines.push(`- **NLP Lines**: ${nlp.split('\n').length}`);
        lines.push(`- **Variables Used**: ${variables.summary.total_used}`);
        lines.push(`- **Variables Available**: ${variables.summary.total_available}`);
        lines.push('');
        
        lines.push('## 🔧 Variables Used');
        if (Object.keys(variables.variables).length > 0) {
            Object.entries(variables.variables).forEach(([name, info]) => {
                lines.push(`- **${name}**: \`${info.value}\` (${info.type})`);
            });
        } else {
            lines.push('No variables used in this journey.');
        }
        lines.push('');
        
        lines.push('## 📁 Files Generated');
        lines.push('```');
        lines.push('.');
        lines.push('├── execution.nlp.txt          # Human-readable test steps');
        lines.push('├── variables-used.json        # Only variables actually used');
        lines.push('├── metadata.json              # Extraction metadata');
        lines.push('├── EXTRACTION-SUMMARY.md      # This file');
        lines.push('└── raw-data/                  # Raw API responses');
        lines.push('    ├── journey.json           # Complete journey data');
        lines.push('    ├── execution.json         # Execution details');
        lines.push('    ├── project.json           # Project configuration');
        lines.push('    └── environments.json      # Environment variables');
        lines.push('```');
        lines.push('');
        
        lines.push('## 📝 Sample NLP Output');
        lines.push('```');
        lines.push(nlp.split('\n').slice(0, 10).join('\n'));
        if (nlp.split('\n').length > 10) {
            lines.push('...');
        }
        lines.push('```');
        
        return lines.join('\n');
    }
    
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
                
                res.on('data', chunk => data += chunk);
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error('Failed to parse API response'));
                        }
                    } else {
                        reject(new Error(`API returned status ${res.statusCode} for ${endpoint}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
        });
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node comprehensive-extraction.js <URL>');
        console.log('Example: node comprehensive-extraction.js "https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256"');
        process.exit(1);
    }
    
    const extractor = new ComprehensiveExtractor();
    extractor.extract(args[0]);
}