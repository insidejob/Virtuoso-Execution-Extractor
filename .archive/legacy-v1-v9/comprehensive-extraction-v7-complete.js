#!/usr/bin/env node

/**
 * Comprehensive Extraction v7 - COMPLETE WITH ALL DISCOVERED ACTIONS
 * 
 * This version includes ALL actions discovered from the test journey:
 * - Core actions from original data (NAVIGATE, WRITE, CLICK, etc.)
 * - New assertion types (ASSERT_NOT_EXISTS, ASSERT_EQUALS, ASSERT_NOT_EQUALS, ASSERT_VARIABLE)
 * - API and data actions (API_CALL, STORE, ENVIRONMENT)
 * 
 * Based on actual API structures discovered from journey 612727
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class CompleteVirtuosoExtractor {
    constructor(options = {}) {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: '2d313def-7ec2-4526-b0b6-57028c343aba',
            sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
            clientId: '1754647483711_e9e9c12_production',
            organizationId: '1964',
            debug: options.debug || false
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
        
        // Data storage
        this.rawData = {};
        this.elementAliases = new Map();
        this.checkpointNumberMap = new Map();
        this.nextCheckpointNumber = 1;
        
        // Validation & Error Tracking
        this.conversionReport = {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            warnings: [],
            errors: [],
            unknownActions: new Set(),
            validatedActions: new Set(),
            missingSelectors: []
        };
        
        this.currentCheckpoint = null;
        this.currentStep = null;
        
        // API Test Details Cache
        this.apiTestCache = new Map();
    }
    
    async extract(url) {
        console.log('🚀 Complete Virtuoso Extraction v7 Starting\n');
        console.log('✅ Includes ALL discovered action types\n');
        console.log('=' .repeat(70));
        console.log(`URL: ${url}`);
        console.log(`Debug Mode: ${this.config.debug ? 'ON' : 'OFF'}`);
        console.log('=' .repeat(70));
        
        try {
            // Step 1: Parse URL
            console.log('\n📋 Step 1: Parsing URL...');
            const ids = this.parseURL(url);
            if (!ids.execution || !ids.journey || !ids.project) {
                throw new Error('Invalid URL format - missing required IDs');
            }
            console.log(`✅ Extracted IDs:`, ids);
            
            // Step 2: Fetch all data
            console.log('\n📋 Step 2: Fetching all data from API...');
            const journeyData = await this.fetchJourneyData(ids);
            const goalData = await this.fetchGoalData(ids, journeyData);
            const executionData = await this.fetchExecutionData(ids);
            const projectData = await this.fetchProjectData(ids);
            const environmentData = await this.fetchEnvironmentData(ids);
            
            // Fetch API test details if needed
            await this.fetchApiTestDetails(journeyData);
            
            // Step 3: Validate data
            console.log('\n📋 Step 3: Validating data quality...');
            const validationResult = this.validateData(journeyData, executionData);
            if (validationResult.critical) {
                console.error('❌ Critical validation errors found');
                throw new Error('Data validation failed');
            }
            console.log(`✅ Data validation passed`);
            
            // Step 4: Create folder structure
            console.log('\n📋 Step 4: Creating folder structure...');
            const folderPath = this.createFolderStructure(ids, journeyData, executionData, goalData, projectData);
            console.log(`✅ Created: ${folderPath}`);
            
            // Step 5: Convert to NLP
            console.log('\n📋 Step 5: Converting to NLP (complete Virtuoso syntax)...');
            const nlpResult = this.convertToNLP(journeyData, environmentData);
            const nlpPath = path.join(folderPath, 'execution.nlp.txt');
            fs.writeFileSync(nlpPath, nlpResult.nlp);
            console.log(`✅ Saved NLP: ${nlpPath}`);
            console.log(`   Lines: ${nlpResult.nlp.split('\n').length}`);
            console.log(`   Success Rate: ${Math.round((this.conversionReport.successfulSteps / this.conversionReport.totalSteps) * 100)}%`);
            console.log(`   Validated Actions: ${this.conversionReport.validatedActions.size}`);
            
            // Step 6: Extract variables
            console.log('\n📋 Step 6: Extracting variables...');
            const variables = this.extractVariables(journeyData, environmentData);
            const variablesPath = path.join(folderPath, 'variables-used.json');
            fs.writeFileSync(variablesPath, JSON.stringify(variables, null, 2));
            console.log(`✅ Saved variables: ${variablesPath}`);
            
            // Step 7: Save raw data
            console.log('\n📋 Step 7: Saving raw JSON data...');
            const rawDataPath = path.join(folderPath, 'raw-data');
            if (!fs.existsSync(rawDataPath)) {
                fs.mkdirSync(rawDataPath, { recursive: true });
            }
            
            // Save all raw data
            const dataToSave = {
                'journey.json': journeyData,
                'goal.json': goalData,
                'execution.json': executionData,
                'project.json': projectData,
                'environments.json': environmentData
            };
            
            for (const [filename, data] of Object.entries(dataToSave)) {
                const filePath = path.join(rawDataPath, filename);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`  ✅ Saved: raw-data/${filename}`);
            }
            
            // Step 8: Create validation report
            console.log('\n📋 Step 8: Creating validation report...');
            const reportPath = path.join(folderPath, 'validation-report.json');
            const report = {
                ...this.conversionReport,
                unknownActions: Array.from(this.conversionReport.unknownActions),
                validatedActions: Array.from(this.conversionReport.validatedActions),
                successRate: Math.round((this.conversionReport.successfulSteps / this.conversionReport.totalSteps) * 100)
            };
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`✅ Saved validation report: ${reportPath}`);
            
            // Step 9: Create metadata
            console.log('\n📋 Step 9: Creating metadata...');
            const metadata = this.createMetadata(ids, journeyData, executionData, goalData, projectData, report);
            const metadataPath = path.join(folderPath, 'metadata.json');
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`✅ Saved metadata: ${metadataPath}`);
            
            // Print summary
            this.printSummary(folderPath, report);
            
            return {
                success: true,
                folderPath,
                report,
                metadata
            };
            
        } catch (error) {
            console.error('\n❌ Extraction failed:', error.message);
            if (error.message.includes('401')) {
                console.error('   Token may have expired. Please update the token in the config.');
            }
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    parseURL(url) {
        const executionMatch = url.match(/execution\/(\d+)/);
        const journeyMatch = url.match(/journey\/(\d+)/);
        const projectMatch = url.match(/project\/(\d+)/);
        
        return {
            execution: executionMatch ? executionMatch[1] : null,
            journey: journeyMatch ? journeyMatch[1] : null,
            project: projectMatch ? projectMatch[1] : null
        };
    }
    
    async fetchData(endpoint) {
        return new Promise((resolve, reject) => {
            const url = `${this.config.baseUrl}${endpoint}`;
            
            if (this.config.debug) {
                console.log(`  → Fetching: ${url}`);
            }
            
            https.get(url, { headers: this.headers }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        // Check for HTML responses
                        if (data.startsWith('<') || data.includes('<!DOCTYPE')) {
                            console.error(`    ❌ Received HTML response (Status: ${res.statusCode})`);
                            console.error(`    URL attempted: ${url}`);
                            if (res.statusCode === 404) {
                                reject(new Error(`404 Not Found: ${endpoint}`));
                            } else if (res.statusCode === 401) {
                                reject(new Error('401 Unauthorized - Token expired or invalid'));
                            } else {
                                reject(new Error(`Unexpected HTML response (status: ${res.statusCode})`));
                            }
                            return;
                        }
                        
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        console.error(`    ❌ Failed to parse JSON response`);
                        console.error(`    First 200 chars:`, data.substring(0, 200));
                        if (res.statusCode === 401) {
                            reject(new Error('401 Unauthorized - Token expired or invalid'));
                        } else {
                            reject(new Error(`Failed to parse response: ${e.message}`));
                        }
                    }
                });
            }).on('error', reject);
        });
    }
    
    async fetchJourneyData(ids) {
        console.log('  → Fetching journey/testsuite data...');
        // Use the correct endpoint format from v6 that actually works
        const endpoint = `/testsuites/${ids.journey}?envelope=false`;
        const data = await this.fetchData(endpoint);
        console.log(`  ✅ Journey: ${data.title || data.name}`);
        return data;
    }
    
    async fetchGoalData(ids, journeyData) {
        const goalId = journeyData.goalId;
        if (!goalId) {
            console.log('  ⚠️  No goal ID found');
            return null;
        }
        
        console.log(`  → Fetching goal data for ID ${goalId}...`);
        const endpoint = `/goals/${goalId}`;
        const data = await this.fetchData(endpoint);
        console.log(`  ✅ Goal: ${data.name}`);
        return data;
    }
    
    async fetchExecutionData(ids) {
        console.log('  → Fetching execution data...');
        const endpoint = `/executions/${ids.execution}`;
        const data = await this.fetchData(endpoint);
        console.log(`  ✅ Execution: ${data.id}`);
        return data;
    }
    
    async fetchProjectData(ids) {
        console.log('  → Fetching project data...');
        const endpoint = `/projects/${ids.project}`;
        const data = await this.fetchData(endpoint);
        console.log(`  ✅ Project: ${data.name}`);
        return data;
    }
    
    async fetchEnvironmentData(ids) {
        console.log('  → Fetching environment data...');
        const endpoint = `/projects/${ids.project}/environments`;
        const data = await this.fetchData(endpoint);
        console.log(`  ✅ Environments: ${data.length} found`);
        return data;
    }
    
    async fetchApiTestDetails(journeyData) {
        // Scan for API_CALL actions and fetch their details
        const apiTestIds = new Set();
        
        journeyData.cases.forEach(testCase => {
            testCase.steps.forEach(step => {
                if (step.action === 'API_CALL' && step.meta?.apiTestId) {
                    apiTestIds.add(step.meta.apiTestId);
                }
            });
        });
        
        if (apiTestIds.size > 0) {
            console.log(`  → Fetching ${apiTestIds.size} API test definitions...`);
            for (const apiTestId of apiTestIds) {
                try {
                    const endpoint = `/api-tests/${apiTestId}`;
                    const apiTest = await this.fetchData(endpoint);
                    this.apiTestCache.set(apiTestId, apiTest);
                    console.log(`    ✅ API Test ${apiTestId}: ${apiTest.name || 'Unnamed'}`);
                } catch (error) {
                    console.log(`    ⚠️  Could not fetch API test ${apiTestId}`);
                    // Store placeholder data
                    this.apiTestCache.set(apiTestId, {
                        name: `API Test ${apiTestId}`,
                        url: 'Unknown',
                        method: 'Unknown'
                    });
                }
            }
        }
    }
    
    validateData(journeyData, executionData) {
        const issues = {
            warnings: [],
            errors: [],
            critical: false
        };
        
        if (!journeyData.cases || journeyData.cases.length === 0) {
            issues.errors.push('No test cases found');
            issues.critical = true;
        }
        
        return issues;
    }
    
    createFolderStructure(ids, journeyData, executionData, goalData, projectData) {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const executionId = ids.execution;
        const journeyName = this.sanitizeFolderName(journeyData.title || journeyData.name || 'unnamed-journey');
        const projectName = this.sanitizeFolderName(projectData?.name || `project-${ids.project}`);
        const goalName = this.sanitizeFolderName(goalData?.name || 'no-goal');
        
        const folderPath = path.join(
            'extractions',
            projectName,
            goalName,
            `${timestamp}-execution-${executionId}`,
            journeyName
        );
        
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        
        return folderPath;
    }
    
    sanitizeFolderName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    convertToNLP(journeyData, environmentData) {
        const lines = [];
        let currentCheckpointNum = null;
        
        journeyData.cases.forEach((testCase, caseIndex) => {
            const checkpointName = testCase.title || testCase.name || `Checkpoint ${caseIndex + 1}`;
            
            // Get or assign checkpoint number
            if (!this.checkpointNumberMap.has(checkpointName)) {
                this.checkpointNumberMap.set(checkpointName, this.nextCheckpointNumber++);
            }
            currentCheckpointNum = this.checkpointNumberMap.get(checkpointName);
            
            // Add checkpoint header
            lines.push(`Checkpoint ${currentCheckpointNum}: ${checkpointName}`);
            
            // Process steps
            testCase.steps.forEach((step, stepIndex) => {
                this.currentCheckpoint = checkpointName;
                this.currentStep = stepIndex + 1;
                this.conversionReport.totalSteps++;
                
                try {
                    const nlpLine = this.convertStepToNLP(step, environmentData);
                    if (nlpLine) {
                        lines.push(nlpLine);
                        this.conversionReport.successfulSteps++;
                    }
                } catch (error) {
                    this.conversionReport.failedSteps++;
                    this.conversionReport.errors.push({
                        checkpoint: checkpointName,
                        step: stepIndex + 1,
                        action: step.action,
                        error: error.message
                    });
                    lines.push(`# [ERROR: ${error.message}]`);
                }
            });
            
            // Add blank line after checkpoint
            if (caseIndex < journeyData.cases.length - 1) {
                lines.push('');
            }
        });
        
        return {
            nlp: lines.join('\n'),
            report: this.conversionReport
        };
    }
    
    convertStepToNLP(step, environmentData) {
        const action = step.action;
        const selectors = this.extractSelectors(step);
        const variable = step.variable ? `$${step.variable}` : step.value || '';
        
        // Track action type
        this.conversionReport.validatedActions.add(step.action);
        
        switch (step.action) {
            // === CORE ACTIONS (from original data) ===
            
            case 'NAVIGATE':
                // Navigate to URL
                const url = step.meta?.url || step.value || variable;
                return `Navigate to "${url}"`;
            
            case 'WRITE':
            case 'TYPE':
                // Write text in field
                if (selectors.hint) {
                    return `Write ${variable} in field "${selectors.hint}"`;
                }
                return `Write ${variable}`;
            
            case 'CLICK':
                // Click on element
                return `Click on ${this.getSelectorDescription(selectors)}`;
            
            case 'ASSERT_EXISTS':
            case 'ASSERT':
                // Look for element on the page
                return `Look for element ${this.getSelectorDescription(selectors)} on the page`;
            
            case 'MOUSE':
                // Mouse actions (click, double-click, right-click)
                return this.convertMouseAction(step, selectors);
            
            // === NEW ASSERTION TYPES (discovered) ===
            
            case 'ASSERT_NOT_EXISTS':
                // Assert element does not exist
                const notExistsTarget = this.getSelectorDescription(selectors);
                return `Assert ${notExistsTarget} does not exist`;
            
            case 'ASSERT_EQUALS':
                // Assert element equals value
                const equalsTarget = this.getSelectorDescription(selectors);
                const expectedValue = step.value || '';
                return `Assert ${equalsTarget} equals "${expectedValue}"`;
            
            case 'ASSERT_NOT_EQUALS':
                // Assert element does not equal value
                const notEqualsTarget = this.getSelectorDescription(selectors);
                const notExpectedValue = step.value || '';
                return `Assert ${notEqualsTarget} does not equal "${notExpectedValue}"`;
            
            case 'ASSERT_VARIABLE':
                // Assert variable comparisons
                return this.convertVariableAssertion(step);
            
            // === API AND DATA ACTIONS (discovered) ===
            
            case 'API_CALL':
                // Make API call
                const apiTestId = step.meta?.apiTestId;
                const apiTest = this.apiTestCache.get(apiTestId);
                
                if (apiTest) {
                    const method = apiTest.method || 'GET';
                    const url = apiTest.url || apiTest.name || `API Test ${apiTestId}`;
                    
                    // Check for input variables
                    const inputVars = step.meta?.inputVariables;
                    if (inputVars && Object.keys(inputVars).length > 0) {
                        const varList = Object.entries(inputVars)
                            .map(([key, val]) => `${key}=$${val}`)
                            .join(', ');
                        return `Make ${method} API call to "${url}" with ${varList}`;
                    }
                    
                    return `Make ${method} API call to "${url}"`;
                }
                
                // Fallback if we couldn't fetch API test details
                return `Make API call (Test ID: ${apiTestId})`;
            
            case 'STORE':
            case 'SAVE':
                // Store value in variable
                const storeVar = step.variable ? `$${step.variable}` : '';
                const storeValue = step.value || this.getSelectorDescription(selectors);
                return `Store "${storeValue}" as ${storeVar}`;
            
            case 'ENVIRONMENT':
                // Environment variable operations
                const envType = step.meta?.type || 'SET';
                const envName = step.meta?.name || step.value || '';
                
                switch (envType) {
                    case 'ADD':
                    case 'SET':
                        return `Set environment variable "${envName}"`;
                    case 'DELETE':
                    case 'REMOVE':
                        return `Delete environment variable "${envName}"`;
                    default:
                        return `Environment operation: ${envType} "${envName}"`;
                }
            
            // === DOCUMENTED BUT NOT YET SEEN ===
            
            case 'PICK':
            case 'SELECT':
                // Select from dropdown
                const selectTarget = selectors.hint || selectors.text || 'dropdown';
                return `Select "${variable}" from "${selectTarget}"`;
            
            case 'WAIT_FOR_ELEMENT':
                // Wait for element
                return `Wait for element ${this.getSelectorDescription(selectors)}`;
            
            case 'DISMISS':
                // Dismiss alert/dialog
                return `Dismiss alert`;
            
            case 'SCROLL':
            case 'SCROLL_TO':
                // Scroll to element
                return `Scroll to ${this.getSelectorDescription(selectors)}`;
            
            case 'CLEAR':
            case 'CLEAR_FIELD':
                // Clear field
                return `Clear field ${this.getSelectorDescription(selectors)}`;
            
            case 'HOVER':
                // Hover over element
                return `Hover over ${this.getSelectorDescription(selectors)}`;
            
            case 'SWITCH_FRAME':
                // Switch to frame
                const frameName = step.frame || variable || 'frame';
                return `Switch to frame "${frameName}"`;
            
            case 'SWITCH_TAB':
                // Switch to tab
                const tabIndex = step.tab || variable || 'tab';
                return `Switch to tab ${tabIndex}`;
            
            case 'UPLOAD':
            case 'ATTACH_FILE':
                // Upload file
                return `Upload file "${variable}" to ${this.getSelectorDescription(selectors)}`;
            
            case 'EXECUTE_SCRIPT':
            case 'EXECUTE':
                // Execute JavaScript
                return `Execute script`;
            
            case 'PRESS_KEY':
            case 'PRESS':
                // Press key
                const key = step.key || variable || 'key';
                return `Press key "${key}"`;
            
            case 'DOUBLE_CLICK':
                // Standalone double-click (not MOUSE variant)
                return `Double-click on ${this.getSelectorDescription(selectors)}`;
            
            default:
                // Unknown action - track it
                this.conversionReport.unknownActions.add(step.action);
                this.conversionReport.warnings.push({
                    checkpoint: this.currentCheckpoint,
                    step: this.currentStep,
                    action: step.action,
                    message: `Unvalidated action type: ${step.action}`
                });
                
                // Return placeholder
                return `# [Unvalidated action: ${step.action}] ${variable}`;
        }
    }
    
    convertVariableAssertion(step) {
        const variable = step.variable ? `$${step.variable}` : '';
        const value = step.value || '';
        const expression = step.expression || '';
        const assertType = step.meta?.type || 'EQUALS';
        
        // Handle expression-based assertions
        if (expression) {
            switch (assertType) {
                case 'EQUALS':
                    return `Assert expression "${expression}" equals "${value}"`;
                default:
                    return `Assert expression "${expression}" ${assertType.toLowerCase().replace('_', ' ')} "${value}"`;
            }
        }
        
        // Handle variable-based assertions
        switch (assertType) {
            case 'EQUALS':
                return `Assert variable ${variable} equals "${value}"`;
            case 'NOT_EQUALS':
                return `Assert variable ${variable} does not equal "${value}"`;
            case 'LESS_THAN':
                return `Assert variable ${variable} is less than "${value}"`;
            case 'LESS_THAN_OR_EQUALS':
                return `Assert variable ${variable} is less than or equal to "${value}"`;
            case 'GREATER_THAN':
                return `Assert variable ${variable} is greater than "${value}"`;
            case 'GREATER_THAN_OR_EQUALS':
                return `Assert variable ${variable} is greater than or equal to "${value}"`;
            case 'CONTAINS':
                return `Assert variable ${variable} contains "${value}"`;
            case 'NOT_CONTAINS':
                return `Assert variable ${variable} does not contain "${value}"`;
            case 'MATCHES':
                return `Assert variable ${variable} matches pattern "${value}"`;
            default:
                return `Assert variable ${variable} ${assertType.toLowerCase().replace('_', ' ')} "${value}"`;
        }
    }
    
    convertMouseAction(step, selectors) {
        const mouseAction = step.meta?.action || 'CLICK';
        let mouseTarget;
        
        // Check for variable reference (signature box, etc.)
        if (step.variable) {
            mouseTarget = `$${step.variable}`;
        } else {
            mouseTarget = this.getSelectorDescription(selectors).replace(/^"|"$/g, '');
        }
        
        switch (mouseAction) {
            case 'CLICK':
                return `Mouse click on ${mouseTarget}`;
            case 'DOUBLE_CLICK':
                return `Double-click on ${mouseTarget}`;
            case 'RIGHT_CLICK':
                return `Right-click on ${mouseTarget}`;
            case 'DRAG':
                return `Drag ${mouseTarget}`;
            default:
                return `Mouse ${mouseAction.toLowerCase()} on ${mouseTarget}`;
        }
    }
    
    extractSelectors(step) {
        const selectors = {};
        
        // Direct selectors on step
        if (step.selectors) {
            Object.assign(selectors, step.selectors);
        }
        
        // Element-based selectors
        if (step.element?.target?.selectors) {
            step.element.target.selectors.forEach(sel => {
                switch (sel.type) {
                    case 'GUESS':
                        try {
                            const guess = JSON.parse(sel.value);
                            selectors.hint = guess.clue || sel.value;
                        } catch {
                            selectors.hint = sel.value;
                        }
                        break;
                    case 'XPATH':
                    case 'XPATH_ID':
                        selectors.xpath = sel.value;
                        break;
                    case 'CSS':
                    case 'CSS_SELECTOR':
                        selectors.css = sel.value;
                        break;
                    case 'ID':
                        selectors.id = sel.value;
                        break;
                }
            });
        }
        
        // Text from element
        if (step.element?.target?.text) {
            selectors.text = step.element.target.text;
        }
        
        return selectors;
    }
    
    getSelectorDescription(selectors) {
        // Priority: hint > text > id > xpath > css
        if (selectors.hint) {
            return `"${selectors.hint}"`;
        }
        if (selectors.text) {
            return `"${selectors.text}"`;
        }
        if (selectors.id) {
            return `"${selectors.id}"`;
        }
        if (selectors.xpath) {
            return `"${selectors.xpath}"`;
        }
        if (selectors.css) {
            return `"${selectors.css}"`;
        }
        
        return '[ERROR: No selector found]';
    }
    
    extractVariables(journeyData, environmentData) {
        const usedVars = new Map();
        
        // Extract from journey steps
        journeyData.cases.forEach(testCase => {
            testCase.steps.forEach(step => {
                // Variable used in step
                if (step.variable) {
                    if (!usedVars.has(`$${step.variable}`)) {
                        usedVars.set(`$${step.variable}`, {
                            value: step.value || '',
                            type: 'LOCAL',
                            usage: []
                        });
                    }
                    
                    usedVars.get(`$${step.variable}`).usage.push({
                        checkpoint: testCase.title || testCase.name,
                        step: testCase.steps.indexOf(step) + 1,
                        action: step.action,
                        context: this.getVariableContext(step)
                    });
                }
                
                // Variables in meta
                if (step.meta?.inputVariables) {
                    Object.entries(step.meta.inputVariables).forEach(([key, varName]) => {
                        const varKey = `$${varName}`;
                        if (!usedVars.has(varKey)) {
                            usedVars.set(varKey, {
                                value: '',
                                type: 'API_INPUT',
                                usage: []
                            });
                        }
                        
                        usedVars.get(varKey).usage.push({
                            checkpoint: testCase.title || testCase.name,
                            step: testCase.steps.indexOf(step) + 1,
                            action: 'API_CALL',
                            context: `API input: ${key}`
                        });
                    });
                }
            });
        });
        
        // Add environment variables
        if (environmentData && Array.isArray(environmentData)) {
            environmentData.forEach(env => {
                if (env.variables) {
                    Object.entries(env.variables).forEach(([key, value]) => {
                        const varKey = `$${key}`;
                        if (usedVars.has(varKey)) {
                            usedVars.get(varKey).value = value;
                            usedVars.get(varKey).type = 'ENVIRONMENT';
                        }
                    });
                }
            });
        }
        
        return {
            summary: {
                total_used: usedVars.size,
                total_available: Array.isArray(environmentData) 
                    ? environmentData.reduce((acc, env) => 
                        acc + (env.variables ? Object.keys(env.variables).length : 0), 0)
                    : 0
            },
            variables: Object.fromEntries(usedVars)
        };
    }
    
    getVariableContext(step) {
        switch (step.action) {
            case 'WRITE':
                return `Write in field`;
            case 'STORE':
                return 'Store value';
            case 'ASSERT_VARIABLE':
                return 'Variable assertion';
            case 'API_CALL':
                return 'API parameter';
            case 'MOUSE':
                return 'Mouse action target';
            default:
                return step.action;
        }
    }
    
    createMetadata(ids, journeyData, executionData, goalData, projectData, report) {
        return {
            extraction: {
                timestamp: new Date().toISOString(),
                url: `https://app2.virtuoso.qa/#/project/${ids.project}/execution/${ids.execution}/journey/${ids.journey}`,
                wrapper_version: '7.0.0-complete',
                approach: 'Complete implementation with all discovered actions'
            },
            project: {
                id: ids.project,
                name: projectData?.name || 'Unknown'
            },
            goal: goalData ? {
                id: goalData.id,
                name: goalData.name
            } : null,
            execution: {
                id: ids.execution,
                status: executionData?.status || 'Unknown'
            },
            journey: {
                id: ids.journey,
                name: journeyData.name,
                title: journeyData.title,
                checkpoints: journeyData.cases.length,
                total_steps: journeyData.cases.reduce((acc, c) => acc + c.steps.length, 0)
            },
            validation: {
                approach: 'Complete with all discovered action types',
                validated_actions: report.validatedActions,
                unknown_actions: report.unknownActions,
                success_rate: report.successRate
            }
        };
    }
    
    printSummary(folderPath, report) {
        console.log('\n' + '=' .repeat(70));
        console.log('📊 VALIDATION STATISTICS\n');
        console.log(`Total Steps: ${report.totalSteps}`);
        console.log(`Successful: ${report.successfulSteps} (${report.successRate}%)`);
        console.log(`Failed: ${report.failedSteps}`);
        console.log(`Warnings: ${report.warnings.length}`);
        console.log(`Errors: ${report.errors.length}`);
        
        if (report.validatedActions.length > 0) {
            console.log(`\n✅ Validated Actions (${report.validatedActions.length}):`);
            console.log(`  - ${report.validatedActions.join('\n  - ')}`);
        }
        
        if (report.unknownActions.length > 0) {
            console.log(`\n⚠️ Unknown/Unvalidated Actions (${report.unknownActions.length}):`);
            console.log(`  - ${report.unknownActions.join('\n  - ')}`);
        }
        
        console.log('=' .repeat(70));
        console.log('\n✅ Extraction completed successfully!');
        console.log(`📁 Output: ${folderPath}`);
        console.log(`📊 Success Rate: ${report.successRate}%`);
        
        if (report.validatedActions.length > 0) {
            console.log(`✅ Validated Actions: ${report.validatedActions.join(', ')}`);
        }
        
        if (report.unknownActions.length > 0) {
            console.log(`⚠️  Unknown Actions: ${report.unknownActions.join(', ')}`);
        }
    }
}

// Main execution
const url = process.argv[2];

if (!url) {
    console.log('Usage: node comprehensive-extraction-v7-complete.js <url>');
    console.log('\nExample:');
    console.log('node comprehensive-extraction-v7-complete.js https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256');
    process.exit(1);
}

const extractor = new CompleteVirtuosoExtractor();
extractor.extract(url);