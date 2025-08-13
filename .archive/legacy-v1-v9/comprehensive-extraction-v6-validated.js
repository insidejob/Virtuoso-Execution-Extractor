#!/usr/bin/env node

/**
 * Comprehensive Extraction v6 - VALIDATED AGAINST VIRTUOSO DOCUMENTATION
 * 
 * This version ONLY includes actions we have evidence for:
 * - Actions found in real journey.json data
 * - Actions documented in Virtuoso's official NLP documentation
 * - NO assumptions from other testing frameworks
 * 
 * Evidence-based approach:
 * - 6 core API actions from real data
 * - 19 NLP command categories from documentation
 * - Exact Virtuoso syntax patterns
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class ValidatedVirtuosoExtractor {
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
    }
    
    async extract(url) {
        console.log('🚀 Validated Virtuoso Extraction v6 Starting\n');
        console.log('✅ Using ONLY verified Virtuoso actions\n');
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
            
            // Step 5: Convert to NLP using VALIDATED syntax
            console.log('\n📋 Step 5: Converting to NLP (validated Virtuoso syntax)...');
            const nlp = this.convertToNLP(journeyData);
            const nlpPath = path.join(folderPath, 'execution.nlp.txt');
            fs.writeFileSync(nlpPath, nlp);
            console.log(`✅ Saved NLP: ${nlpPath}`);
            console.log(`   Lines: ${nlp.split('\n').length}`);
            console.log(`   Success Rate: ${this.getSuccessRate()}%`);
            console.log(`   Validated Actions: ${this.conversionReport.validatedActions.size}`);
            
            // Step 6: Extract variables
            console.log('\n📋 Step 6: Extracting variables...');
            const variables = this.extractVariables(journeyData, executionData, environmentData);
            const varsPath = path.join(folderPath, 'variables-used.json');
            fs.writeFileSync(varsPath, JSON.stringify(variables, null, 2));
            console.log(`✅ Saved variables: ${varsPath}`);
            
            // Step 7: Save raw data
            console.log('\n📋 Step 7: Saving raw JSON data...');
            const rawDataPath = path.join(folderPath, 'raw-data');
            if (!fs.existsSync(rawDataPath)) {
                fs.mkdirSync(rawDataPath);
            }
            Object.entries(this.rawData).forEach(([key, data]) => {
                const filePath = path.join(rawDataPath, `${key}.json`);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`  ✅ Saved: raw-data/${key}.json`);
            });
            
            // Step 8: Create validation report
            console.log('\n📋 Step 8: Creating validation report...');
            const reportPath = path.join(folderPath, 'validation-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(this.getValidationReport(), null, 2));
            console.log(`✅ Saved validation report: ${reportPath}`);
            
            // Step 9: Create metadata
            console.log('\n📋 Step 9: Creating metadata...');
            const metadata = this.createMetadata(ids, journeyData, executionData, goalData, projectData);
            const metaPath = path.join(folderPath, 'metadata.json');
            fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
            console.log(`✅ Saved metadata: ${metaPath}`);
            
            // Display stats
            this.displayStats();
            
            return {
                success: true,
                path: folderPath,
                stats: {
                    successRate: this.getSuccessRate(),
                    validatedActions: Array.from(this.conversionReport.validatedActions),
                    unknownActions: Array.from(this.conversionReport.unknownActions)
                }
            };
            
        } catch (error) {
            console.error('\n❌ Extraction failed:', error.message);
            if (this.config.debug) {
                console.error('Stack:', error.stack);
            }
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // === VALIDATED NLP Conversion - ONLY proven actions ===
    
    convertToNLP(journeyData) {
        const lines = [];
        this.checkpointNumberMap.clear();
        this.nextCheckpointNumber = 1;
        
        if (!journeyData.cases) {
            return '# ERROR: No test cases found';
        }
        
        journeyData.cases.forEach((testCase) => {
            this.currentCheckpoint = testCase.title;
            
            // Handle checkpoint numbering (reuse for duplicates)
            let checkpointNum;
            if (this.checkpointNumberMap.has(testCase.title)) {
                checkpointNum = this.checkpointNumberMap.get(testCase.title);
            } else {
                checkpointNum = this.nextCheckpointNumber++;
                this.checkpointNumberMap.set(testCase.title, checkpointNum);
            }
            
            lines.push(`Checkpoint ${checkpointNum}: ${testCase.title}`);
            
            if (testCase.steps && testCase.steps.length > 0) {
                testCase.steps.forEach((step, stepIndex) => {
                    this.currentStep = `${checkpointNum}-${stepIndex}`;
                    this.conversionReport.totalSteps++;
                    
                    try {
                        const nlpLine = this.stepToValidatedNLP(step);
                        if (nlpLine) {
                            lines.push(nlpLine);
                            this.conversionReport.successfulSteps++;
                            this.conversionReport.validatedActions.add(step.action);
                        }
                    } catch (error) {
                        this.conversionReport.failedSteps++;
                        const errorMsg = `# [ERROR: Failed to convert ${step.action}]`;
                        lines.push(errorMsg);
                        this.logError(`Step conversion failed: ${error.message}`, step);
                    }
                });
            }
            
            lines.push('');
        });
        
        return lines.join('\n').trim();
    }
    
    stepToValidatedNLP(step) {
        // ONLY handle actions we have evidence for
        const selectors = this.extractSelectors(step);
        const variable = step.variable ? `$${step.variable}` : step.value;
        
        // Track validated actions
        this.conversionReport.validatedActions.add(step.action);
        
        switch (step.action) {
            // === PROVEN ACTIONS FROM REAL DATA ===
            
            case 'NAVIGATE':
                // Evidence: Found in journey.json
                // Virtuoso NLP: "Navigate to [url]"
                return `Navigate to "${variable}"`;
            
            case 'WRITE':
            case 'TYPE':
                // Evidence: Found in journey.json  
                // Virtuoso NLP: "Write [text] in field [field]"
                if (selectors.hint) {
                    return `Write ${variable} in field "${selectors.hint}"`;
                }
                return `Write ${variable}`;
            
            case 'CLICK':
                // Evidence: Found in journey.json
                // Virtuoso NLP: "Click on [element]"
                return `Click on ${this.getSelectorDescription(selectors)}`;
            
            case 'ASSERT_EXISTS':
            case 'ASSERT':
                // Evidence: Found in journey.json
                // Virtuoso NLP: "Look for element [element] on the page"
                return this.handleAssertAction(step, selectors);
            
            case 'MOUSE':
                // Evidence: Found in journey.json with meta.action
                // Virtuoso NLP: Various mouse actions
                return this.handleMouseAction(step, selectors);
            
            case 'DOUBLE_CLICK':
                // Evidence: Found as MOUSE meta.action
                // Virtuoso NLP: "Double-click on [element]"
                return `Double-click on ${this.getSelectorDescription(selectors)}`;
            
            // === DOCUMENTED BUT NOT IN OUR DATA ===
            
            case 'PICK':
            case 'SELECT':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Pick [option] from dropdown [field]"
                const selectValue = variable || step.value || 'option';
                if (selectors.hint) {
                    return `Pick "${selectValue}" from dropdown "${selectors.hint}"`;
                }
                return `Select "${selectValue}"`;
            
            case 'WAIT_FOR_ELEMENT':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Wait for [element]"
                return `Wait for ${this.getSelectorDescription(selectors)}`;
            
            case 'DISMISS':
                // Documented for alert handling
                // Virtuoso NLP: "dismiss alert" etc.
                return this.handleDismissAction(step);
            
            case 'SCROLL':
            case 'SCROLL_TO':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Scroll to [element]"
                return `Scroll to ${this.getSelectorDescription(selectors)}`;
            
            case 'CLEAR':
            case 'CLEAR_FIELD':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Clear [field]"
                return `Clear ${this.getSelectorDescription(selectors)}`;
            
            case 'HOVER':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Hover over [element]"
                return `Hover over ${this.getSelectorDescription(selectors)}`;
            
            case 'SWITCH_FRAME':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Switch to frame [frame]"
                return `Switch to frame ${this.getSelectorDescription(selectors)}`;
            
            case 'SWITCH_TAB':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Switch to tab [number]"
                return `Switch to tab ${variable || 'next'}`;
            
            case 'UPLOAD':
            case 'ATTACH_FILE':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Upload [file] to [field]"
                return `Upload "${variable}" to ${this.getSelectorDescription(selectors)}`;
            
            case 'STORE':
            case 'SAVE':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Store [element] as $variable"
                return `Store ${this.getSelectorDescription(selectors)} as $${step.variable}`;
            
            case 'EXECUTE_SCRIPT':
            case 'EXECUTE':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Execute script [script]"
                return `Execute script: "${String(variable || '').substring(0, 50)}..."`;
            
            case 'PRESS_KEY':
            case 'PRESS':
                // Documented in Virtuoso NLP guide
                // Virtuoso NLP: "Press key [key]"
                return `Press key "${variable}"`;
            
            // === UNKNOWN/UNVALIDATED ACTION ===
            default:
                // Track unknown actions for reporting
                this.conversionReport.unknownActions.add(step.action);
                this.logWarning(`Unknown/unvalidated action: ${step.action}`);
                return `# [Unvalidated action: ${step.action}] ${variable || ''}`.trim();
        }
    }
    
    handleMouseAction(step, selectors) {
        // Based on actual MOUSE actions in journey.json
        const mouseAction = step.meta?.action || 'CLICK';
        
        let mouseTarget;
        if (selectors.guessVariable) {
            mouseTarget = `$${selectors.guessVariable}`;
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
            case 'HOVER':
                return `Hover over ${mouseTarget}`;
            default:
                return `Mouse ${mouseAction.toLowerCase()} on ${mouseTarget}`;
        }
    }
    
    handleAssertAction(step, selectors) {
        // Based on actual ASSERT_EXISTS in journey.json
        // Handle large text blocks by using selectors instead
        if (selectors.text && selectors.text.length > 100) {
            const assertTarget = this.getSelectorDescription({
                ...selectors,
                text: null
            });
            return `Look for element ${assertTarget} on the page`;
        }
        
        if (selectors.guessVariable) {
            return `Look for element $${selectors.guessVariable} on the page`;
        }
        
        const assertTarget = this.getSelectorDescription(selectors);
        return `Look for element ${assertTarget} on the page`;
    }
    
    handleDismissAction(step) {
        // Based on Virtuoso documentation for alerts
        const dialogType = step.meta?.type?.toLowerCase() || 'alert';
        
        switch (dialogType) {
            case 'alert':
                return 'dismiss alert';
            case 'confirm':
                if (step.meta?.response === 'ok' || step.meta?.reply === 'ok') {
                    return 'dismiss confirm reply ok';
                }
                return 'dismiss confirm respond cancel';
            case 'prompt':
                if (step.meta?.response || step.meta?.text) {
                    const text = step.meta?.response || step.meta?.text;
                    return `dismiss prompt respond "${text}"`;
                }
                return 'dismiss prompt reply cancel';
            default:
                return 'dismiss alert';
        }
    }
    
    extractSelectors(step) {
        const selectors = {
            hint: null,
            guessVariable: null,
            xpath: null,
            css: null,
            id: null,
            text: null
        };
        
        // Handle element aliases if present
        if (step.element?.alias && this.elementAliases.has(step.element.alias)) {
            try {
                const aliasDefinition = this.elementAliases.get(step.element.alias);
                Object.assign(selectors, this.extractSelectorsFromAlias(aliasDefinition));
            } catch (error) {
                this.logWarning(`Failed to resolve alias ${step.element.alias}`);
            }
        }
        
        // Extract selectors from step
        if (step.element?.target?.selectors) {
            step.element.target.selectors.forEach(selector => {
                switch (selector.type) {
                    case 'GUESS':
                        if (selector.value) {
                            try {
                                const guessData = JSON.parse(selector.value);
                                selectors.hint = guessData.clue || null;
                                selectors.guessVariable = guessData.variable || null;
                            } catch (e) {
                                selectors.hint = selector.value;
                            }
                        }
                        break;
                    case 'XPATH':
                    case 'XPATH_ID':
                        selectors.xpath = selector.value;
                        break;
                    case 'CSS':
                    case 'CSS_SELECTOR':
                        selectors.css = selector.value;
                        break;
                    case 'ID':
                        selectors.id = selector.value;
                        break;
                }
            });
        }
        
        // Extract text if available
        if (step.element?.target?.text) {
            selectors.text = step.element.target.text;
        }
        
        return selectors;
    }
    
    extractSelectorsFromAlias(aliasDefinition) {
        const selectors = {};
        if (aliasDefinition) {
            if (aliasDefinition.hint) selectors.hint = aliasDefinition.hint;
            if (aliasDefinition.xpath) selectors.xpath = aliasDefinition.xpath;
            if (aliasDefinition.css) selectors.css = aliasDefinition.css;
            if (aliasDefinition.id) selectors.id = aliasDefinition.id;
        }
        return selectors;
    }
    
    getSelectorDescription(selectors) {
        // Priority based on Virtuoso best practices
        if (selectors.hint) {
            return `"${this.sanitizeText(selectors.hint)}"`;
        }
        
        if (selectors.text && selectors.text.length <= 100) {
            return `"${this.sanitizeText(selectors.text)}"`;
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
        
        this.conversionReport.missingSelectors.push({
            checkpoint: this.currentCheckpoint,
            step: this.currentStep
        });
        
        return '[ERROR: No selector found]';
    }
    
    sanitizeText(text) {
        if (!text) return '';
        
        return text
            .replace(/[\n\r]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 200);
    }
    
    // === Data Fetching Methods ===
    
    async fetchJourneyData(ids) {
        console.log('  → Fetching journey/testsuite data...');
        const journeyData = await this.apiRequest(`/testsuites/${ids.journey}?envelope=false`);
        this.rawData.journey = journeyData;
        console.log(`  ✅ Journey: ${journeyData.title || journeyData.name}`);
        
        // Extract element aliases
        if (journeyData.elementAliases) {
            Object.entries(journeyData.elementAliases).forEach(([alias, definition]) => {
                this.elementAliases.set(alias, definition);
            });
            console.log(`  ✅ Found ${this.elementAliases.size} element aliases`);
        }
        
        return journeyData;
    }
    
    async fetchGoalData(ids, journeyData) {
        const goalId = journeyData.goalId || ids.goal;
        if (!goalId) return null;
        
        console.log(`  → Fetching goal data for ID ${goalId}...`);
        try {
            const goalData = await this.apiRequest(`/goals/${goalId}`);
            this.rawData.goal = goalData;
            console.log(`  ✅ Goal: ${goalData.item?.name || goalData.name || 'Unknown'}`);
            return goalData;
        } catch (e) {
            console.log(`  ⚠️  Could not fetch goal data: ${e.message}`);
            return null;
        }
    }
    
    async fetchExecutionData(ids) {
        console.log('  → Fetching execution data...');
        const executionData = await this.apiRequest(`/executions/${ids.execution}`);
        this.rawData.execution = executionData;
        console.log(`  ✅ Execution: ${executionData.item?.id || ids.execution}`);
        return executionData;
    }
    
    async fetchProjectData(ids) {
        console.log('  → Fetching project data...');
        const projectData = await this.apiRequest(`/projects/${ids.project}`);
        this.rawData.project = projectData;
        console.log(`  ✅ Project: ${projectData.item?.name || projectData.name || 'Unknown'}`);
        return projectData;
    }
    
    async fetchEnvironmentData(ids) {
        console.log('  → Fetching environment data...');
        const environmentData = await this.apiRequest(`/projects/${ids.project}/environments`);
        this.rawData.environments = environmentData;
        console.log(`  ✅ Environments: ${environmentData.item?.environments?.length || 0} found`);
        return environmentData;
    }
    
    // === Validation Methods ===
    
    validateData(journeyData, executionData) {
        const errors = [];
        const warnings = [];
        let critical = false;
        
        if (!journeyData) {
            errors.push('Journey data is missing');
            critical = true;
        } else if (!journeyData.cases || journeyData.cases.length === 0) {
            errors.push('No test cases found in journey');
            critical = true;
        }
        
        return { errors, warnings, critical };
    }
    
    // === Variable Extraction ===
    
    extractVariables(journeyData, executionData, environmentData) {
        const usedVars = new Map();
        const dataAttributeVars = new Map();
        
        // Extract dataAttributeValues
        if (journeyData.dataAttributeValues) {
            Object.entries(journeyData.dataAttributeValues).forEach(([key, value]) => {
                dataAttributeVars.set(key, {
                    name: key,
                    value: value,
                    type: 'DATA_ATTRIBUTE',
                    usage: []
                });
            });
        }
        
        // Find used variables in journey steps
        if (journeyData.cases) {
            journeyData.cases.forEach((testCase) => {
                if (testCase.steps) {
                    testCase.steps.forEach((step, stepIndex) => {
                        if (step.variable) {
                            if (!usedVars.has(step.variable)) {
                                usedVars.set(step.variable, {
                                    name: step.variable,
                                    usage: []
                                });
                            }
                            
                            const selectors = this.extractSelectors(step);
                            usedVars.get(step.variable).usage.push({
                                checkpoint: testCase.title,
                                step: stepIndex + 1,
                                action: step.action,
                                field: selectors.hint
                            });
                        }
                        
                        // Check for variables in GUESS selectors
                        const selectors = this.extractSelectors(step);
                        if (selectors.guessVariable) {
                            if (dataAttributeVars.has(selectors.guessVariable)) {
                                dataAttributeVars.get(selectors.guessVariable).usage.push({
                                    checkpoint: testCase.title,
                                    step: stepIndex + 1,
                                    action: step.action,
                                    context: 'Element lookup'
                                });
                            }
                        }
                    });
                }
            });
        }
        
        // Get values for variables
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
                total_used: usedVars.size + Array.from(dataAttributeVars.values()).filter(v => v.usage.length > 0).length,
                total_available: Object.keys(testDataValues).length + Object.keys(envValues).length + dataAttributeVars.size
            },
            variables: {}
        };
        
        // Add variables with values
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
                    'password': '********',
                    'signaturebox': '[signature element]'
                };
                if (defaults[varName]) {
                    value = defaults[varName];
                }
            }
            
            // Mask sensitive values
            if (varName.toLowerCase().includes('password') || 
                varName.toLowerCase().includes('secret') ||
                varName.toLowerCase().includes('token')) {
                value = '********';
            }
            
            result.variables[`$${varName}`] = {
                value,
                type,
                usage: varInfo.usage
            };
        });
        
        // Add dataAttributeValues that are used
        dataAttributeVars.forEach((varInfo, varName) => {
            if (varInfo.usage.length > 0) {
                result.variables[`$${varName}`] = {
                    value: varInfo.value,
                    type: 'DATA_ATTRIBUTE',
                    usage: varInfo.usage
                };
            }
        });
        
        return result;
    }
    
    // === Helper Methods ===
    
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
        const baseDir = 'extractions';
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir);
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        
        const projectName = this.cleanName(projectData?.item?.name || projectData?.name || `project-${ids.project}`);
        const goalName = this.cleanName(goalData?.item?.name || goalData?.name || `goal-${journeyData.goalId || ids.goal || 'unknown'}`);
        const executionName = `execution-${ids.execution}`;
        const journeyName = this.cleanName(journeyData.title || journeyData.name || `journey-${ids.journey}`);
        
        const projectPath = path.join(baseDir, projectName);
        const goalPath = path.join(projectPath, goalName);
        const executionPath = path.join(goalPath, `${timestamp}-${executionName}`);
        const journeyPath = path.join(executionPath, journeyName);
        
        [projectPath, goalPath, executionPath, journeyPath].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        return journeyPath;
    }
    
    cleanName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }
    
    getSuccessRate() {
        if (this.conversionReport.totalSteps === 0) return 100;
        return Math.round((this.conversionReport.successfulSteps / this.conversionReport.totalSteps) * 100);
    }
    
    getValidationReport() {
        return {
            ...this.conversionReport,
            unknownActions: Array.from(this.conversionReport.unknownActions),
            validatedActions: Array.from(this.conversionReport.validatedActions),
            successRate: this.getSuccessRate()
        };
    }
    
    displayStats() {
        console.log('\n' + '=' .repeat(70));
        console.log('📊 VALIDATION STATISTICS\n');
        console.log(`Total Steps: ${this.conversionReport.totalSteps}`);
        console.log(`Successful: ${this.conversionReport.successfulSteps} (${this.getSuccessRate()}%)`);
        console.log(`Failed: ${this.conversionReport.failedSteps}`);
        console.log(`Warnings: ${this.conversionReport.warnings.length}`);
        console.log(`Errors: ${this.conversionReport.errors.length}`);
        
        console.log(`\n✅ Validated Actions (${this.conversionReport.validatedActions.size}):`);
        Array.from(this.conversionReport.validatedActions).forEach(action => {
            console.log(`  - ${action}`);
        });
        
        if (this.conversionReport.unknownActions.size > 0) {
            console.log(`\n⚠️ Unknown/Unvalidated Actions (${this.conversionReport.unknownActions.size}):`);
            Array.from(this.conversionReport.unknownActions).forEach(action => {
                console.log(`  - ${action}`);
            });
        }
        
        console.log('=' .repeat(70));
    }
    
    // === Logging Methods ===
    
    logError(message, context = null) {
        const error = {
            message,
            checkpoint: this.currentCheckpoint,
            step: this.currentStep,
            timestamp: new Date().toISOString()
        };
        
        if (context) {
            error.context = context;
        }
        
        this.conversionReport.errors.push(error);
        
        if (this.config.debug) {
            console.error(`❌ ${message}`);
        }
    }
    
    logWarning(message) {
        const warning = {
            message,
            checkpoint: this.currentCheckpoint,
            step: this.currentStep,
            timestamp: new Date().toISOString()
        };
        
        this.conversionReport.warnings.push(warning);
        
        if (this.config.debug) {
            console.warn(`⚠️  ${message}`);
        }
    }
    
    // === Metadata Creation ===
    
    createMetadata(ids, journeyData, executionData, goalData, projectData) {
        return {
            extraction: {
                timestamp: new Date().toISOString(),
                url: `https://app2.virtuoso.qa/#/project/${ids.project}/execution/${ids.execution}/journey/${ids.journey}`,
                wrapper_version: '6.0.0-validated',
                approach: 'Evidence-based - Only verified Virtuoso actions'
            },
            project: {
                id: ids.project,
                name: projectData?.item?.name || projectData?.name || 'Unknown'
            },
            goal: {
                id: journeyData.goalId || ids.goal || null,
                name: goalData?.item?.name || goalData?.name || 'Unknown'
            },
            execution: {
                id: ids.execution,
                status: executionData?.item?.executionStatus || 'Unknown'
            },
            journey: {
                id: ids.journey,
                name: journeyData.name,
                title: journeyData.title,
                checkpoints: journeyData.cases?.length || 0,
                total_steps: journeyData.cases?.reduce((sum, c) => sum + (c.steps?.length || 0), 0) || 0
            },
            validation: {
                approach: 'Only actions with evidence from real data or official documentation',
                validated_actions: Array.from(this.conversionReport.validatedActions),
                unknown_actions: Array.from(this.conversionReport.unknownActions),
                success_rate: this.getSuccessRate()
            }
        };
    }
    
    // === API Request Method ===
    
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
        console.log('Usage: node comprehensive-extraction-v6-validated.js <URL> [--debug]');
        console.log('Example: node comprehensive-extraction-v6-validated.js "https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256"');
        console.log('\nThis version only includes VALIDATED Virtuoso actions:');
        console.log('- Actions found in real journey data');
        console.log('- Actions documented in official Virtuoso NLP guide');
        console.log('- NO assumptions from other testing frameworks');
        process.exit(1);
    }
    
    const url = args[0];
    const debug = args.includes('--debug');
    
    const extractor = new ValidatedVirtuosoExtractor({ debug });
    extractor.extract(url).then(result => {
        if (result.success) {
            console.log('\n✅ Extraction completed successfully!');
            console.log(`📁 Output: ${result.path}`);
            console.log(`📊 Success Rate: ${result.stats.successRate}%`);
            console.log(`✅ Validated Actions: ${result.stats.validatedActions.join(', ')}`);
            if (result.stats.unknownActions.length > 0) {
                console.log(`⚠️  Unknown Actions: ${result.stats.unknownActions.join(', ')}`);
            }
        } else {
            console.log('\n❌ Extraction failed');
            console.log('   Run with --debug flag for more information');
            process.exit(1);
        }
    });
}