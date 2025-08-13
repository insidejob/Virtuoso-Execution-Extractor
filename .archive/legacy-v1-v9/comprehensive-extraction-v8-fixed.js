#!/usr/bin/env node

/**
 * Comprehensive Extraction v8 - FIXED VARIABLE EXTRACTION
 * 
 * Fixes the critical bug where GUESS variables (like $signaturebox) were missed
 * if they weren't in dataAttributeValues.
 * 
 * Key Fix:
 * - Properly extracts ALL variables from GUESS selectors
 * - Treats them as standalone variables if not data attributes
 * - Captures edge cases like mouse clicking on environment variables
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const VariableIntelligence = require('./variable-intelligence');

class FixedVirtuosoExtractor {
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
        
        // Variable Intelligence
        this.variableIntelligence = new VariableIntelligence();
    }
    
    async extract(url) {
        console.log('🚀 Fixed Virtuoso Extraction v8 Starting\n');
        console.log('✅ Includes complete variable extraction (including GUESS variables)\n');
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
            
            // Store raw data
            this.rawData = {
                journey: journeyData,
                goal: goalData,
                execution: executionData,
                project: projectData,
                environments: environmentData
            };
            
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
            console.log('\n📋 Step 5: Converting to NLP...');
            const nlpResult = this.convertToNLP(journeyData, environmentData);
            const nlpPath = path.join(folderPath, 'execution.nlp.txt');
            fs.writeFileSync(nlpPath, nlpResult.nlp);
            console.log(`✅ Saved NLP: ${nlpPath}`);
            console.log(`   Lines: ${nlpResult.nlp.split('\n').length}`);
            console.log(`   Success Rate: ${Math.round((this.conversionReport.successfulSteps / this.conversionReport.totalSteps) * 100)}%`);
            
            // Step 6: Extract variables (FIXED)
            console.log('\n📋 Step 6: Extracting variables (with GUESS variable fix)...');
            const variables = this.extractVariablesFixed(journeyData, environmentData);
            const variablesPath = path.join(folderPath, 'variables-used.json');
            fs.writeFileSync(variablesPath, JSON.stringify(variables, null, 2));
            console.log(`✅ Saved variables: ${variablesPath}`);
            console.log(`   Total variables: ${variables.summary.total_used}`);
            
            // Check if signaturebox was captured
            if (variables.variables['$signaturebox']) {
                console.log(`   ✅ Successfully captured $signaturebox variable!`);
            }
            
            // Step 7: Enhanced variable analysis
            console.log('\n📋 Step 7: Performing intelligent variable analysis...');
            const enhancedVariables = this.variableIntelligence.analyzeAllVariables(
                variables,
                journeyData,
                environmentData
            );
            const enhancedPath = path.join(folderPath, 'variables-enhanced.json');
            fs.writeFileSync(enhancedPath, JSON.stringify(enhancedVariables, null, 2));
            console.log(`✅ Saved enhanced analysis: ${enhancedPath}`);
            
            // Generate variable report
            const report = this.generateVariableReport(enhancedVariables);
            const reportPath = path.join(folderPath, 'variables-report.md');
            fs.writeFileSync(reportPath, report);
            console.log(`📄 Saved variable report: ${reportPath}`);
            
            // Step 8: Save raw data
            console.log('\n📋 Step 8: Saving raw JSON data...');
            const rawDataPath = path.join(folderPath, 'raw-data');
            if (!fs.existsSync(rawDataPath)) {
                fs.mkdirSync(rawDataPath, { recursive: true });
            }
            
            for (const [filename, data] of Object.entries(this.rawData)) {
                if (data) {
                    const filePath = path.join(rawDataPath, `${filename}.json`);
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                    console.log(`  ✅ Saved: raw-data/${filename}.json`);
                }
            }
            
            // Step 9: Create validation report
            console.log('\n📋 Step 9: Creating validation report...');
            const validationPath = path.join(folderPath, 'validation-report.json');
            const validationReport = {
                ...this.conversionReport,
                unknownActions: Array.from(this.conversionReport.unknownActions),
                validatedActions: Array.from(this.conversionReport.validatedActions),
                successRate: Math.round((this.conversionReport.successfulSteps / this.conversionReport.totalSteps) * 100),
                variableExtractionFixed: true,
                capturedGuessVariables: Object.keys(variables.variables).filter(v => 
                    variables.variables[v].source === 'GUESS_SELECTOR'
                )
            };
            fs.writeFileSync(validationPath, JSON.stringify(validationReport, null, 2));
            console.log(`✅ Saved validation report: ${validationPath}`);
            
            // Step 10: Create metadata
            console.log('\n📋 Step 10: Creating metadata...');
            const metadata = this.createMetadata(ids, journeyData, executionData, goalData, projectData, validationReport);
            const metadataPath = path.join(folderPath, 'metadata.json');
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`✅ Saved metadata: ${metadataPath}`);
            
            // Print summary
            this.printSummary(folderPath, validationReport, enhancedVariables);
            
            return {
                success: true,
                folderPath,
                report: validationReport,
                metadata,
                variables: enhancedVariables
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
                            if (res.statusCode === 404) {
                                resolve(null); // Return null for 404s
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
        const endpoint = `/testsuites/${ids.journey}?envelope=false`;
        const data = await this.fetchData(endpoint);
        if (data) {
            console.log(`  ✅ Journey: ${data.title || data.name}`);
        }
        return data;
    }
    
    async fetchGoalData(ids, journeyData) {
        if (!journeyData) return null;
        const goalId = journeyData.goalId;
        if (!goalId) {
            console.log('  ⚠️  No goal ID found');
            return null;
        }
        
        console.log(`  → Fetching goal data for ID ${goalId}...`);
        const endpoint = `/goals/${goalId}`;
        const data = await this.fetchData(endpoint);
        if (data) {
            console.log(`  ✅ Goal: ${data.name}`);
        }
        return data;
    }
    
    async fetchExecutionData(ids) {
        console.log('  → Fetching execution data...');
        const endpoint = `/executions/${ids.execution}`;
        const data = await this.fetchData(endpoint);
        if (data) {
            console.log(`  ✅ Execution: ${data.id}`);
        }
        return data;
    }
    
    async fetchProjectData(ids) {
        console.log('  → Fetching project data...');
        const endpoint = `/projects/${ids.project}`;
        const data = await this.fetchData(endpoint);
        if (data) {
            console.log(`  ✅ Project: ${data.name}`);
        }
        return data;
    }
    
    async fetchEnvironmentData(ids) {
        console.log('  → Fetching environment data...');
        const endpoint = `/projects/${ids.project}/environments`;
        const data = await this.fetchData(endpoint);
        if (data && Array.isArray(data)) {
            console.log(`  ✅ Environments: ${data.length} found`);
        }
        return data;
    }
    
    async fetchApiTestDetails(journeyData) {
        if (!journeyData) return;
        
        // Scan for API_CALL actions and fetch their details
        const apiTestIds = new Set();
        
        journeyData.cases?.forEach(testCase => {
            testCase.steps?.forEach(step => {
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
                    if (apiTest) {
                        this.apiTestCache.set(apiTestId, apiTest);
                        console.log(`    ✅ API Test ${apiTestId}: ${apiTest.name || 'Unnamed'}`);
                    }
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
        
        if (!journeyData) {
            issues.errors.push('No journey data found');
            issues.critical = true;
        } else if (!journeyData.cases || journeyData.cases.length === 0) {
            issues.errors.push('No test cases found');
            issues.critical = true;
        }
        
        return issues;
    }
    
    createFolderStructure(ids, journeyData, executionData, goalData, projectData) {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const executionId = ids.execution;
        const journeyName = this.sanitizeFolderName(journeyData?.title || journeyData?.name || 'unnamed-journey');
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
        
        if (!journeyData || !journeyData.cases) {
            return { nlp: '', report: this.conversionReport };
        }
        
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
            testCase.steps?.forEach((step, stepIndex) => {
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
            case 'NAVIGATE':
                const url = step.meta?.url || step.value || variable;
                return `Navigate to "${url}"`;
            
            case 'WRITE':
            case 'TYPE':
                if (selectors.hint) {
                    return `Write ${variable} in field "${selectors.hint}"`;
                }
                return `Write ${variable}`;
            
            case 'CLICK':
                return `Click on ${this.getSelectorDescription(selectors)}`;
            
            case 'ASSERT_EXISTS':
            case 'ASSERT':
                return `Look for element ${this.getSelectorDescription(selectors)} on the page`;
            
            case 'MOUSE':
                return this.convertMouseAction(step, selectors);
            
            case 'ASSERT_NOT_EXISTS':
                const notExistsTarget = this.getSelectorDescription(selectors);
                return `Assert ${notExistsTarget} does not exist`;
            
            case 'ASSERT_EQUALS':
                const equalsTarget = this.getSelectorDescription(selectors);
                const expectedValue = step.value || '';
                return `Assert ${equalsTarget} equals "${expectedValue}"`;
            
            case 'ASSERT_NOT_EQUALS':
                const notEqualsTarget = this.getSelectorDescription(selectors);
                const notExpectedValue = step.value || '';
                return `Assert ${notEqualsTarget} does not equal "${notExpectedValue}"`;
            
            case 'ASSERT_VARIABLE':
                return this.convertVariableAssertion(step);
            
            case 'API_CALL':
                const apiTestId = step.meta?.apiTestId;
                const apiTest = this.apiTestCache.get(apiTestId);
                
                if (apiTest) {
                    const method = apiTest.method || 'GET';
                    const url = apiTest.url || apiTest.name || `API Test ${apiTestId}`;
                    
                    const inputVars = step.meta?.inputVariables;
                    if (inputVars && Object.keys(inputVars).length > 0) {
                        const varList = Object.entries(inputVars)
                            .map(([key, val]) => `${key}=$${val}`)
                            .join(', ');
                        return `Make ${method} API call to "${url}" with ${varList}`;
                    }
                    
                    return `Make ${method} API call to "${url}"`;
                }
                
                return `Make API call (Test ID: ${apiTestId})`;
            
            case 'STORE':
            case 'SAVE':
                const storeVar = step.variable ? `$${step.variable}` : '';
                const storeValue = step.value || this.getSelectorDescription(selectors);
                return `Store "${storeValue}" as ${storeVar}`;
            
            case 'ENVIRONMENT':
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
            
            default:
                // Track unknown actions
                this.conversionReport.unknownActions.add(step.action);
                this.conversionReport.warnings.push({
                    checkpoint: this.currentCheckpoint,
                    step: this.currentStep,
                    action: step.action,
                    message: `Unvalidated action type: ${step.action}`
                });
                
                return `# [Unvalidated action: ${step.action}] ${variable}`;
        }
    }
    
    convertVariableAssertion(step) {
        const variable = step.variable ? `$${step.variable}` : '';
        const value = step.value || '';
        const expression = step.expression || '';
        const assertType = step.meta?.type || 'EQUALS';
        
        if (expression) {
            switch (assertType) {
                case 'EQUALS':
                    return `Assert expression "${expression}" equals "${value}"`;
                default:
                    return `Assert expression "${expression}" ${assertType.toLowerCase().replace('_', ' ')} "${value}"`;
            }
        }
        
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
            default:
                return `Assert variable ${variable} ${assertType.toLowerCase().replace('_', ' ')} "${value}"`;
        }
    }
    
    convertMouseAction(step, selectors) {
        const mouseAction = step.meta?.action || 'CLICK';
        let mouseTarget;
        
        // Check for GUESS variable (FIX: properly handle signaturebox)
        if (selectors.guessVariable) {
            mouseTarget = `$${selectors.guessVariable}`;
        } else if (step.variable) {
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
            default:
                return `Mouse ${mouseAction.toLowerCase()} on ${mouseTarget}`;
        }
    }
    
    extractSelectors(step) {
        const selectors = {
            hint: null,
            guessVariable: null, // FIXED: Added guessVariable
            xpath: null,
            css: null,
            id: null,
            text: null
        };
        
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
                            selectors.hint = guess.clue || null;
                            // FIXED: Extract variable from GUESS
                            if (guess.variable) {
                                selectors.guessVariable = guess.variable;
                            }
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
        // Check for GUESS variable FIRST
        if (selectors.guessVariable) {
            return `$${selectors.guessVariable}`;
        }
        
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
    
    /**
     * FIXED: Extract all variables including GUESS variables
     */
    extractVariablesFixed(journeyData, environmentData) {
        const usedVars = new Map();
        const dataAttributeVars = new Map();
        const guessVars = new Map(); // NEW: Track GUESS variables separately
        
        // Extract dataAttributeValues
        if (journeyData?.dataAttributeValues) {
            Object.entries(journeyData.dataAttributeValues).forEach(([key, value]) => {
                dataAttributeVars.set(key, {
                    value: value || '',
                    type: 'DATA_ATTRIBUTE',
                    source: 'dataAttributeValues',
                    usage: []
                });
            });
        }
        
        // Find used variables in journey steps
        if (journeyData?.cases) {
            journeyData.cases.forEach((testCase) => {
                testCase.steps?.forEach((step, stepIndex) => {
                    // Regular variables used in steps
                    if (step.variable) {
                        if (!usedVars.has(step.variable)) {
                            usedVars.set(step.variable, {
                                value: step.value || 'Not set',
                                type: 'LOCAL',
                                source: 'step',
                                usage: []
                            });
                        }
                        
                        const selectors = this.extractSelectors(step);
                        usedVars.get(step.variable).usage.push({
                            checkpoint: testCase.title || testCase.name,
                            step: stepIndex + 1,
                            action: step.action,
                            field: selectors.hint || null
                        });
                    }
                    
                    // FIXED: Extract GUESS variables properly
                    const selectors = this.extractSelectors(step);
                    if (selectors.guessVariable) {
                        const varName = selectors.guessVariable;
                        
                        // Check if it's a data attribute
                        if (dataAttributeVars.has(varName)) {
                            // It's a data attribute - add usage
                            dataAttributeVars.get(varName).usage.push({
                                checkpoint: testCase.title || testCase.name,
                                step: stepIndex + 1,
                                action: step.action,
                                context: 'Element selector'
                            });
                        } else {
                            // NEW: It's a standalone GUESS variable (like signaturebox)
                            if (!guessVars.has(varName)) {
                                guessVars.set(varName, {
                                    value: 'Element selector variable',
                                    type: 'SELECTOR_VARIABLE',
                                    source: 'GUESS_SELECTOR',
                                    usage: []
                                });
                            }
                            
                            guessVars.get(varName).usage.push({
                                checkpoint: testCase.title || testCase.name,
                                step: stepIndex + 1,
                                action: step.action,
                                context: `${step.action} target selector`
                            });
                        }
                    }
                });
            });
        }
        
        // Check environment data for variable values
        const envVarNames = new Set();
        if (environmentData && Array.isArray(environmentData)) {
            environmentData.forEach(env => {
                if (env.variables) {
                    Object.keys(env.variables).forEach(varName => {
                        envVarNames.add(varName);
                    });
                }
            });
        }
        
        // Update variable types based on environment data
        guessVars.forEach((varInfo, varName) => {
            if (envVarNames.has(varName)) {
                varInfo.type = 'ENVIRONMENT';
                varInfo.source = 'Environment variable (used in GUESS selector)';
                
                // Try to get the actual value
                for (const env of (environmentData || [])) {
                    if (env.variables && env.variables[varName]) {
                        varInfo.value = env.variables[varName];
                        break;
                    }
                }
            }
        });
        
        // Build final result combining all variable sources
        const result = {
            summary: {
                total_used: 0,
                total_available: dataAttributeVars.size + envVarNames.size
            },
            variables: {}
        };
        
        // Add used regular variables
        usedVars.forEach((varInfo, varName) => {
            result.variables[`$${varName}`] = varInfo;
            result.summary.total_used++;
        });
        
        // Add used data attribute variables
        dataAttributeVars.forEach((varInfo, varName) => {
            if (varInfo.usage.length > 0) {
                result.variables[`$${varName}`] = varInfo;
                result.summary.total_used++;
            }
        });
        
        // ADD GUESS VARIABLES (This was missing!)
        guessVars.forEach((varInfo, varName) => {
            result.variables[`$${varName}`] = varInfo;
            result.summary.total_used++;
            
            // Log for debugging
            if (this.config.debug || varName === 'signaturebox') {
                console.log(`   → Found GUESS variable: $${varName} (${varInfo.type})`);
            }
        });
        
        return result;
    }
    
    generateVariableReport(analysis) {
        const journeyName = this.rawData.journey?.title || 'Journey';
        const projectName = this.rawData.project?.name || 'Project';
        
        let report = `# Variable Analysis Report\n\n`;
        report += `**Project:** ${projectName}\n`;
        report += `**Journey:** ${journeyName}\n`;
        report += `**Date:** ${new Date().toISOString()}\n\n`;
        
        // Summary
        report += `## Summary\n\n`;
        report += `- **Total Variables:** ${analysis.summary.total}\n`;
        report += `- **Categories:** `;
        report += Object.entries(analysis.summary.byCategory)
            .filter(([_, count]) => count > 0)
            .map(([cat, count]) => `${cat} (${count})`)
            .join(', ');
        report += `\n`;
        report += `- **Data Types:** `;
        report += Object.entries(analysis.summary.byDataType)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => `${type} (${count})`)
            .join(', ');
        report += `\n\n`;
        
        // Variable Details Table
        report += `## Variable Details\n\n`;
        report += `| Variable | Category | Type | Format | Value | Description |\n`;
        report += `|----------|----------|------|--------|-------|-------------|\n`;
        
        for (const [varName, v] of Object.entries(analysis.variables)) {
            const value = v.currentValue === '********' ? '\\*\\*\\*\\*\\*\\*\\*\\*' : 
                          v.currentValue || 'Not set';
            report += `| ${varName} | ${v.category} | ${v.dataType.primary} | ${v.dataType.format} | ${value} | ${v.description} |\n`;
        }
        
        // Special note for GUESS variables
        const guessVars = Object.entries(analysis.variables)
            .filter(([_, v]) => v.source?.type === 'GUESS_SELECTOR' || v.source?.location?.includes('GUESS'));
        
        if (guessVars.length > 0) {
            report += `\n## Element Selector Variables\n\n`;
            report += `These variables are used as dynamic element selectors (edge case: environment variables for UI elements):\n\n`;
            for (const [varName, v] of guessVars) {
                report += `- **${varName}**: ${v.description}\n`;
            }
        }
        
        return report;
    }
    
    createMetadata(ids, journeyData, executionData, goalData, projectData, report) {
        return {
            extraction: {
                timestamp: new Date().toISOString(),
                url: `https://app2.virtuoso.qa/#/project/${ids.project}/execution/${ids.execution}/journey/${ids.journey}`,
                wrapper_version: '8.0.0-fixed',
                approach: 'Complete with fixed GUESS variable extraction'
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
                name: journeyData?.name || 'Unknown',
                title: journeyData?.title || 'Unknown',
                checkpoints: journeyData?.cases?.length || 0,
                total_steps: journeyData?.cases?.reduce((acc, c) => acc + (c.steps?.length || 0), 0) || 0
            },
            validation: {
                approach: 'Fixed variable extraction including GUESS selectors',
                validated_actions: report.validatedActions,
                unknown_actions: report.unknownActions,
                success_rate: report.successRate,
                guess_variables_captured: report.capturedGuessVariables || []
            }
        };
    }
    
    printSummary(folderPath, report, variables) {
        console.log('\n' + '=' .repeat(70));
        console.log('📊 EXTRACTION SUMMARY\n');
        console.log(`Total Steps: ${report.totalSteps}`);
        console.log(`Successful: ${report.successfulSteps} (${report.successRate}%)`);
        console.log(`Failed: ${report.failedSteps}`);
        
        if (report.capturedGuessVariables && report.capturedGuessVariables.length > 0) {
            console.log(`\n✅ Captured GUESS Variables:`);
            report.capturedGuessVariables.forEach(v => {
                console.log(`  - ${v}`);
            });
        }
        
        if (variables.summary) {
            console.log(`\n📊 Variable Analysis:`);
            console.log(`Total Variables: ${variables.summary.total}`);
            Object.entries(variables.summary.byCategory).forEach(([cat, count]) => {
                if (count > 0) {
                    console.log(`  ${cat}: ${count}`);
                }
            });
        }
        
        console.log('\n' + '=' .repeat(70));
        console.log('✅ Extraction completed successfully!');
        console.log(`📁 Output: ${folderPath}`);
        
        // Special message if signaturebox was captured
        if (report.capturedGuessVariables?.includes('$signaturebox')) {
            console.log('\n🎯 SUCCESS: $signaturebox variable properly captured!');
        }
    }
}

// Main execution
const url = process.argv[2];

if (!url) {
    console.log('Usage: node comprehensive-extraction-v8-fixed.js <url>');
    console.log('\nExample:');
    console.log('node comprehensive-extraction-v8-fixed.js https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256');
    console.log('\nKey Fix in v8:');
    console.log('- Properly extracts GUESS variables like $signaturebox');
    console.log('- Handles edge case of environment variables used as element selectors');
    console.log('- Complete variable intelligence analysis');
    process.exit(1);
}

const extractor = new FixedVirtuosoExtractor();
extractor.extract(url);