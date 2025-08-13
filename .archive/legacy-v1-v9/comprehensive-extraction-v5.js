#!/usr/bin/env node

/**
 * Comprehensive Extraction v5 - With Robust Validation & Error Reporting
 * 
 * Major Improvements:
 * - Comprehensive action type coverage (30+ actions)
 * - Validation system with error tracking
 * - Data quality checks
 * - Conversion success reporting
 * - Graceful failure handling
 * - Debug mode for troubleshooting
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class ComprehensiveExtractorV5 {
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
            unsupportedActions: new Set(),
            missingSelectors: [],
            dataQualityIssues: [],
            validationSummary: {}
        };
        
        this.currentCheckpoint = null;
        this.currentStep = null;
    }
    
    async extract(url) {
        console.log('🚀 Comprehensive Extraction v5 Starting\n');
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
            
            // Step 3: Validate data quality
            console.log('\n📋 Step 3: Validating data quality...');
            const validationResult = this.validateAllData(journeyData, executionData, environmentData);
            if (validationResult.critical) {
                console.error('❌ Critical validation errors found:');
                validationResult.errors.forEach(err => console.error(`  - ${err}`));
                if (!this.config.debug) {
                    throw new Error('Critical data validation failed. Run with --debug for details.');
                }
            }
            console.log(`✅ Data validation: ${validationResult.errors.length} issues found`);
            
            // Step 4: Create folder structure
            console.log('\n📋 Step 4: Creating folder structure...');
            const folderPath = this.createFolderStructure(ids, journeyData, executionData, goalData, projectData);
            console.log(`✅ Created: ${folderPath}`);
            
            // Step 5: Convert to NLP with comprehensive error tracking
            console.log('\n📋 Step 5: Converting to NLP (v5 with full validation)...');
            const nlp = this.convertToNLP(journeyData);
            const nlpPath = path.join(folderPath, 'execution.nlp.txt');
            fs.writeFileSync(nlpPath, nlp);
            console.log(`✅ Saved NLP: ${nlpPath}`);
            console.log(`   Lines: ${nlp.split('\n').length}`);
            console.log(`   Success Rate: ${this.getSuccessRate()}%`);
            
            // Step 6: Extract variables
            console.log('\n📋 Step 6: Extracting variables...');
            const variables = this.extractVariables(journeyData, executionData, environmentData);
            const varsPath = path.join(folderPath, 'variables-used.json');
            fs.writeFileSync(varsPath, JSON.stringify(variables, null, 2));
            console.log(`✅ Saved variables: ${varsPath}`);
            console.log(`   Used: ${variables.summary.total_used} variables`);
            
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
            
            // Step 8: Create conversion report
            console.log('\n📋 Step 8: Creating conversion report...');
            const reportPath = path.join(folderPath, 'conversion-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(this.conversionReport, null, 2));
            console.log(`✅ Saved conversion report: ${reportPath}`);
            
            // Step 9: Create metadata
            console.log('\n📋 Step 9: Creating metadata...');
            const metadata = this.createMetadata(ids, journeyData, executionData, goalData, projectData);
            const metaPath = path.join(folderPath, 'metadata.json');
            fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
            console.log(`✅ Saved metadata: ${metaPath}`);
            
            // Step 10: Create summary
            console.log('\n📋 Step 10: Creating extraction summary...');
            const summary = this.createSummaryReport(folderPath, nlp, variables, metadata);
            const summaryPath = path.join(folderPath, 'EXTRACTION-SUMMARY.md');
            fs.writeFileSync(summaryPath, summary);
            console.log(`✅ Saved summary: ${summaryPath}`);
            
            // Display conversion statistics
            this.displayConversionStats();
            
            return {
                success: true,
                path: folderPath,
                stats: {
                    successRate: this.getSuccessRate(),
                    errors: this.conversionReport.errors.length,
                    warnings: this.conversionReport.warnings.length
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
    
    validateAllData(journeyData, executionData, environmentData) {
        const errors = [];
        const warnings = [];
        let critical = false;
        
        // Validate journey data
        if (!journeyData) {
            errors.push('Journey data is missing');
            critical = true;
        } else {
            if (!journeyData.cases || journeyData.cases.length === 0) {
                errors.push('No test cases found in journey');
                critical = true;
            } else {
                journeyData.cases.forEach((testCase, index) => {
                    if (!testCase.steps || testCase.steps.length === 0) {
                        warnings.push(`Test case ${index + 1} "${testCase.title}" has no steps`);
                    }
                });
            }
        }
        
        // Validate execution data
        if (!executionData?.item) {
            warnings.push('Execution data incomplete');
        }
        
        // Store validation results
        this.conversionReport.dataQualityIssues = [...errors, ...warnings];
        this.conversionReport.validationSummary = {
            errors: errors.length,
            warnings: warnings.length,
            critical
        };
        
        return { errors, warnings, critical };
    }
    
    validateStep(step, stepIndex) {
        const issues = [];
        
        if (!step.action) {
            issues.push({
                type: 'error',
                message: `Step ${stepIndex}: Missing action`,
                stepId: step.id
            });
        }
        
        if (step.action && !this.isActionSupported(step.action)) {
            this.conversionReport.unsupportedActions.add(step.action);
            issues.push({
                type: 'warning',
                message: `Step ${stepIndex}: Unsupported action "${step.action}"`,
                stepId: step.id
            });
        }
        
        if (step.element && !step.element.target && this.requiresElement(step.action)) {
            issues.push({
                type: 'warning',
                message: `Step ${stepIndex}: Missing element target for ${step.action}`,
                stepId: step.id
            });
        }
        
        return issues;
    }
    
    isActionSupported(action) {
        const supportedActions = [
            // Navigation & Browser Control
            'NAVIGATE', 'REFRESH', 'RELOAD', 'BACK', 'FORWARD', 'CLOSE_TAB', 'CLOSE_WINDOW',
            
            // Input Actions
            'WRITE', 'TYPE', 'CLEAR_FIELD', 'CLEAR', 'APPEND_TEXT',
            
            // Click & Mouse Actions
            'CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK', 'MOUSE', 'HOVER', 'MOUSE_HOVER',
            'DRAG', 'DROP', 'CONTEXT_CLICK',
            
            // Selection
            'PICK', 'SELECT', 'CHECK', 'UNCHECK', 'TOGGLE', 'RADIO',
            
            // Wait Actions
            'WAIT_FOR_ELEMENT', 'WAIT_FOR_TEXT', 'WAIT_FOR_URL', 'WAIT_FOR_VISIBLE',
            'WAIT_FOR_NOT_VISIBLE', 'WAIT', 'PAUSE', 'SLEEP',
            
            // Assertions & Verifications
            'ASSERT_EXISTS', 'ASSERT', 'ASSERT_NOT_EXISTS', 'ASSERT_TEXT', 'ASSERT_VALUE',
            'ASSERT_ATTRIBUTE', 'ASSERT_URL', 'ASSERT_TITLE',
            'VERIFY', 'VERIFY_TEXT', 'VERIFY_ELEMENT_COUNT', 'VERIFY_ATTRIBUTE',
            'VERIFY_URL', 'VERIFY_TITLE', 'VERIFY_CSS',
            
            // Scroll Actions
            'SCROLL', 'SCROLL_TO', 'SCROLL_BY',
            
            // File & Media
            'UPLOAD', 'ATTACH_FILE', 'SCREENSHOT', 'RECORD_VIDEO',
            
            // Frame & Window Management
            'SWITCH_FRAME', 'SWITCH_TAB', 'SWITCH_WINDOW', 'RESIZE', 'MAXIMIZE', 'MINIMIZE',
            
            // Keyboard
            'PRESS_KEY', 'KEYBOARD', 'KEY_COMBINATION', 'TYPE_KEYS',
            
            // Alerts - Virtuoso uses DISMISS with meta
            'DISMISS',
            
            // Data & Variables
            'STORE', 'CAPTURE', 'SAVE_VALUE', 'SET_VARIABLE', 'GET_VARIABLE',
            'EXTRACT_DATA', 'GET_TEXT', 'GET_VALUE', 'GET_ATTRIBUTE',
            
            // API & Backend
            'API_REQUEST', 'API_RESPONSE', 'API_CALL', 'DATABASE_QUERY',
            
            // Storage & Cookies
            'COOKIE_SET', 'COOKIE_GET', 'COOKIE_DELETE', 'CLEAR_COOKIES',
            'LOCAL_STORAGE_SET', 'LOCAL_STORAGE_GET', 'LOCAL_STORAGE_CLEAR',
            'SESSION_STORAGE_SET', 'SESSION_STORAGE_GET', 'SESSION_STORAGE_CLEAR',
            
            // Form Actions
            'SUBMIT', 'FOCUS', 'BLUR',
            
            // Control Flow
            'IF', 'ELSE', 'ENDIF', 'LOOP', 'FOR', 'WHILE', 'BREAK', 'CONTINUE',
            
            // Mobile/Touch
            'SWIPE', 'TAP', 'PINCH', 'ROTATE',
            
            // Other
            'EXECUTE_SCRIPT', 'EXECUTE_JAVASCRIPT', 'LOG', 'COMMENT'
        ];
        return supportedActions.includes(action);
    }
    
    requiresElement(action) {
        const elementActions = [
            'CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK', 'WRITE', 'HOVER',
            'DRAG', 'ASSERT_EXISTS', 'WAIT_FOR_ELEMENT', 'SCROLL_TO'
        ];
        return elementActions.includes(action);
    }
    
    // === Conversion Methods ===
    
    convertToNLP(journeyData) {
        const lines = [];
        this.checkpointNumberMap.clear();
        this.nextCheckpointNumber = 1;
        
        if (!journeyData.cases) {
            this.logError('No test cases found in journey data', 'critical');
            return '# ERROR: No test cases found';
        }
        
        journeyData.cases.forEach((testCase, caseIndex) => {
            this.currentCheckpoint = testCase.title;
            
            // Get checkpoint number (reuse if title already seen)
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
                    this.currentStep = `${caseIndex}-${stepIndex}`;
                    this.conversionReport.totalSteps++;
                    
                    // Validate step
                    const validationIssues = this.validateStep(step, stepIndex);
                    validationIssues.forEach(issue => {
                        if (issue.type === 'error') {
                            this.conversionReport.errors.push(issue);
                        } else {
                            this.conversionReport.warnings.push(issue);
                        }
                    });
                    
                    try {
                        const nlpLine = this.stepToNLP(step);
                        if (nlpLine) {
                            lines.push(nlpLine);
                            this.conversionReport.successfulSteps++;
                        }
                    } catch (error) {
                        this.conversionReport.failedSteps++;
                        const errorMsg = `[ERROR: Failed to convert step ${stepIndex} - ${error.message}]`;
                        lines.push(errorMsg);
                        this.logError(`Step conversion failed: ${error.message}`, 'error', step);
                    }
                });
            } else {
                lines.push('  # WARNING: No steps in this checkpoint');
                this.logWarning(`Checkpoint "${testCase.title}" has no steps`);
            }
            
            lines.push('');
        });
        
        return lines.join('\n').trim();
    }
    
    stepToNLP(step) {
        const selectors = this.extractSelectors(step);
        const variable = step.variable ? `$${step.variable}` : step.value;
        
        switch (step.action) {
            // === Navigation ===
            case 'NAVIGATE':
                return `Navigate to "${variable}"`;
            
            // === Input Actions ===
            case 'WRITE':
            case 'TYPE':
                if (selectors.hint) {
                    return `Write ${variable} in field "${selectors.hint}"`;
                }
                return `Write ${variable}`;
            
            case 'CLEAR_FIELD':
            case 'CLEAR':
                return `Clear the field ${this.getSelectorDescription(selectors)}`;
            
            case 'APPEND_TEXT':
                return `Append ${variable} to field ${this.getSelectorDescription(selectors)}`;
            
            // === Click Actions ===
            case 'CLICK':
                return `Click on ${this.getSelectorDescription(selectors)}`;
            
            case 'DOUBLE_CLICK':
                return `Double-click on ${this.getSelectorDescription(selectors)}`;
            
            case 'RIGHT_CLICK':
                return `Right-click on ${this.getSelectorDescription(selectors)}`;
            
            // === Mouse Actions ===
            case 'MOUSE':
                return this.handleMouseAction(step, selectors);
            
            case 'HOVER':
            case 'MOUSE_HOVER':
                return `Hover over ${this.getSelectorDescription(selectors)}`;
            
            case 'DRAG':
                const dragTarget = step.meta?.targetSelector || step.meta?.target || 'the drop location';
                return `Drag ${this.getSelectorDescription(selectors)} to ${dragTarget}`;
            
            case 'DROP':
                return `Drop on ${this.getSelectorDescription(selectors)}`;
            
            // === Selection Actions ===
            case 'PICK':
            case 'SELECT':
                const selectValue = variable || step.value || 'option';
                if (selectors.hint) {
                    return `Pick "${selectValue}" from dropdown "${selectors.hint}"`;
                }
                return `Select "${selectValue}"`;
            
            // === Wait Actions ===
            case 'WAIT_FOR_ELEMENT':
                return `Wait for ${this.getSelectorDescription(selectors)}`;
            
            case 'WAIT_FOR_TEXT':
                return `Wait for text "${variable}"`;
            
            case 'WAIT_FOR_URL':
                return `Wait for URL containing "${variable}"`;
            
            case 'WAIT_FOR_VISIBLE':
                return `Wait for ${this.getSelectorDescription(selectors)} to be visible`;
            
            // === Assertions ===
            case 'ASSERT_EXISTS':
            case 'ASSERT':
                return this.handleAssertAction(step, selectors);
            
            // === Scroll Actions ===
            case 'SCROLL':
            case 'SCROLL_TO':
                return `Scroll to ${this.getSelectorDescription(selectors)}`;
            
            case 'SCROLL_BY':
                const pixels = step.meta?.pixels || step.value || '100';
                return `Scroll by ${pixels} pixels`;
            
            // === File Actions ===
            case 'UPLOAD':
            case 'ATTACH_FILE':
                return `Upload file "${variable}" to ${this.getSelectorDescription(selectors)}`;
            
            // === Frame/Window Actions ===
            case 'SWITCH_FRAME':
                return `Switch to frame ${this.getSelectorDescription(selectors)}`;
            
            case 'SWITCH_TAB':
                return `Switch to tab ${variable || step.meta?.tabIndex || 'next'}`;
            
            case 'SWITCH_WINDOW':
                return `Switch to window "${variable}"`;
            
            // === Keyboard Actions ===
            case 'PRESS_KEY':
            case 'KEYBOARD':
                const key = step.meta?.key || variable;
                return `Press key "${key}"`;
            
            case 'KEY_COMBINATION':
                const combo = step.meta?.combination || variable;
                return `Press key combination "${combo}"`;
            
            // === Alert/Dialog Actions (Virtuoso uses DISMISS) ===
            case 'DISMISS':
                const dialogType = step.meta?.type?.toLowerCase() || 'alert';
                const dialogAction = step.meta?.action || step.meta?.kind || 'dismiss';
                
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
            
            // === Storage Actions ===
            case 'STORE':
            case 'CAPTURE':
            case 'SAVE_VALUE':
                return `Store value from ${this.getSelectorDescription(selectors)} as $${step.variable}`;
            
            // === Browser Control ===
            case 'REFRESH':
            case 'RELOAD':
                return 'Refresh the page';
            
            case 'BACK':
                return 'Navigate back';
            
            case 'FORWARD':
                return 'Navigate forward';
            
            case 'CLOSE_TAB':
                return 'Close current tab';
            
            case 'CLOSE_WINDOW':
                return 'Close window';
            
            case 'RESIZE':
                const width = step.meta?.width || step.value?.width || 1280;
                const height = step.meta?.height || step.value?.height || 720;
                return `Resize window to ${width}x${height}`;
            
            case 'MAXIMIZE':
                return 'Maximize window';
            
            case 'MINIMIZE':
                return 'Minimize window';
            
            // === Advanced Verification ===
            case 'VERIFY':
            case 'VERIFY_TEXT':
                return `Verify text "${variable}" in ${this.getSelectorDescription(selectors)}`;
            
            case 'VERIFY_ELEMENT_COUNT':
                const count = step.meta?.count || variable;
                return `Verify ${count} elements match ${this.getSelectorDescription(selectors)}`;
            
            case 'VERIFY_ATTRIBUTE':
                const attr = step.meta?.attribute || 'value';
                return `Verify attribute "${attr}" equals "${variable}" on ${this.getSelectorDescription(selectors)}`;
            
            case 'VERIFY_URL':
                return `Verify URL contains "${variable}"`;
            
            case 'VERIFY_TITLE':
                return `Verify page title is "${variable}"`;
            
            case 'VERIFY_CSS':
                const prop = step.meta?.property || 'display';
                return `Verify CSS property "${prop}" equals "${variable}" on ${this.getSelectorDescription(selectors)}`;
            
            // === Additional Assertions ===
            case 'ASSERT_NOT_EXISTS':
                return `Assert ${this.getSelectorDescription(selectors)} does not exist on the page`;
            
            case 'ASSERT_TEXT':
                return `Assert text "${variable}" in ${this.getSelectorDescription(selectors)}`;
            
            case 'ASSERT_VALUE':
                return `Assert value "${variable}" in ${this.getSelectorDescription(selectors)}`;
            
            case 'ASSERT_ATTRIBUTE':
                const assertAttr = step.meta?.attribute || 'value';
                return `Assert attribute "${assertAttr}" equals "${variable}"`;
            
            case 'ASSERT_URL':
                return `Assert URL contains "${variable}"`;
            
            case 'ASSERT_TITLE':
                return `Assert page title is "${variable}"`;
            
            // === Form Actions ===
            case 'SUBMIT':
                return `Submit form ${this.getSelectorDescription(selectors)}`;
            
            case 'FOCUS':
                return `Focus on ${this.getSelectorDescription(selectors)}`;
            
            case 'BLUR':
                return `Remove focus from ${this.getSelectorDescription(selectors)}`;
            
            case 'CHECK':
                return `Check checkbox ${this.getSelectorDescription(selectors)}`;
            
            case 'UNCHECK':
                return `Uncheck checkbox ${this.getSelectorDescription(selectors)}`;
            
            case 'TOGGLE':
                return `Toggle ${this.getSelectorDescription(selectors)}`;
            
            case 'RADIO':
                return `Select radio button ${this.getSelectorDescription(selectors)}`;
            
            // === Screenshots & Media ===
            case 'SCREENSHOT':
                const filename = step.meta?.filename || step.value || variable || 'screenshot';
                return `Take screenshot "${filename}"`;
            
            case 'RECORD_VIDEO':
                return `${step.meta?.action === 'stop' ? 'Stop' : 'Start'} video recording`;
            
            // === Data Extraction ===
            case 'GET_TEXT':
                return `Get text from ${this.getSelectorDescription(selectors)}`;
            
            case 'GET_VALUE':
                return `Get value from ${this.getSelectorDescription(selectors)}`;
            
            case 'GET_ATTRIBUTE':
                const getAttribute = step.meta?.attribute || 'value';
                return `Get attribute "${getAttribute}" from ${this.getSelectorDescription(selectors)}`;
            
            case 'EXTRACT_DATA':
                return `Extract data from ${this.getSelectorDescription(selectors)}`;
            
            case 'SET_VARIABLE':
                return `Set variable $${step.variable} to "${variable}"`;
            
            case 'GET_VARIABLE':
                return `Get variable $${step.variable}`;
            
            // === API & Backend ===
            case 'API_REQUEST':
            case 'API_CALL':
                const method = step.meta?.method || 'GET';
                const endpoint = step.meta?.endpoint || variable;
                return `Make ${method} request to "${endpoint}"`;
            
            case 'API_RESPONSE':
                return `Validate API response ${step.meta?.validation || ''}`;
            
            case 'DATABASE_QUERY':
                return `Execute database query: "${variable}"`;
            
            // === Cookie & Storage Management ===
            case 'COOKIE_SET':
                return `Set cookie "${step.meta?.name || variable}"`;
            
            case 'COOKIE_GET':
                return `Get cookie "${step.meta?.name || variable}"`;
            
            case 'COOKIE_DELETE':
                return `Delete cookie "${step.meta?.name || variable}"`;
            
            case 'CLEAR_COOKIES':
                return 'Clear all cookies';
            
            case 'LOCAL_STORAGE_SET':
                return `Set local storage "${step.meta?.key || variable}"`;
            
            case 'LOCAL_STORAGE_GET':
                return `Get local storage "${step.meta?.key || variable}"`;
            
            case 'LOCAL_STORAGE_CLEAR':
                return 'Clear local storage';
            
            case 'SESSION_STORAGE_SET':
                return `Set session storage "${step.meta?.key || variable}"`;
            
            case 'SESSION_STORAGE_GET':
                return `Get session storage "${step.meta?.key || variable}"`;
            
            case 'SESSION_STORAGE_CLEAR':
                return 'Clear session storage';
            
            // === Script Execution ===
            case 'EXECUTE_SCRIPT':
            case 'EXECUTE_JAVASCRIPT':
                const script = typeof variable === 'string' ? variable : String(variable || '');
                return `Execute JavaScript: "${script.substring(0, 50)}${script.length > 50 ? '...' : ''}"`;
            
            // === Wait Actions ===
            case 'WAIT':
            case 'PAUSE':
            case 'SLEEP':
                const duration = step.meta?.duration || variable || '1000';
                return `Wait for ${duration}ms`;
            
            case 'WAIT_FOR_NOT_VISIBLE':
                return `Wait for ${this.getSelectorDescription(selectors)} to be hidden`;
            
            // === Control Flow ===
            case 'IF':
                return `If ${step.meta?.condition || variable}`;
            
            case 'ELSE':
                return 'Else';
            
            case 'ENDIF':
                return 'End if';
            
            case 'LOOP':
            case 'FOR':
            case 'WHILE':
                return `Loop ${step.meta?.times || variable} times`;
            
            case 'BREAK':
                return 'Break loop';
            
            case 'CONTINUE':
                return 'Continue loop';
            
            // === Mobile/Touch Actions ===
            case 'SWIPE':
                const direction = step.meta?.direction || 'up';
                return `Swipe ${direction} on ${this.getSelectorDescription(selectors)}`;
            
            case 'TAP':
                return `Tap on ${this.getSelectorDescription(selectors)}`;
            
            case 'PINCH':
                const pinchType = step.meta?.type || 'in';
                return `Pinch ${pinchType} on ${this.getSelectorDescription(selectors)}`;
            
            case 'ROTATE':
                const degrees = step.meta?.degrees || '90';
                return `Rotate ${degrees} degrees`;
            
            // === Other ===
            case 'LOG':
                return `Log: "${variable}"`;
            
            case 'COMMENT':
                return `# ${variable}`;
            
            case 'TYPE_KEYS':
                return `Type keys "${variable}"`;
            
            case 'CONTEXT_CLICK':
                return `Right-click on ${this.getSelectorDescription(selectors)}`;
            
            // === Unknown/Unsupported ===
            default:
                this.logWarning(`Unknown action type: ${step.action}`);
                return `# [Unsupported action: ${step.action}] ${variable || ''}`.trim();
        }
    }
    
    handleMouseAction(step, selectors) {
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
            case 'OVER':
                return `Hover over ${mouseTarget}`;
            case 'ENTER':
                return `Mouse enter ${mouseTarget}`;
            case 'LEAVE':
                return `Mouse leave ${mouseTarget}`;
            case 'DOWN':
                return `Mouse down on ${mouseTarget}`;
            case 'UP':
                return `Mouse up on ${mouseTarget}`;
            case 'MOVE':
                const x = step.meta?.x || step.meta?.coordinates?.x || '0';
                const y = step.meta?.y || step.meta?.coordinates?.y || '0';
                return `Move mouse to ${mouseTarget} at (${x}, ${y})`;
            case 'DRAG':
                return `Drag ${mouseTarget}`;
            case 'DROP':
                return `Drop on ${mouseTarget}`;
            default:
                const action = mouseAction.toLowerCase().replace('_', '-');
                const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
                return `${capitalizedAction} on ${mouseTarget}`;
        }
    }
    
    handleAssertAction(step, selectors) {
        // Check for large text content
        if (selectors.text && selectors.text.length > 100) {
            const assertTarget = this.getSelectorDescription({
                ...selectors,
                text: null // Ignore text for large content
            });
            return `Look for element ${assertTarget} on the page`;
        }
        
        // Handle variable references
        if (selectors.guessVariable) {
            return `Look for element $${selectors.guessVariable} on the page`;
        }
        
        // Use appropriate selector
        const assertTarget = this.getSelectorDescription(selectors);
        return `Look for element ${assertTarget} on the page`;
    }
    
    extractSelectors(step) {
        const selectors = {
            hint: null,
            guessVariable: null,
            xpath: null,
            xpathId: null,
            xpathText: null,
            xpathAttribute: null,
            css: null,
            id: null,
            jsPath: null,
            text: null,
            className: null,
            tagName: null,
            linkText: null
        };
        
        // Handle element aliases
        if (step.element?.alias && this.elementAliases.has(step.element.alias)) {
            try {
                const aliasDefinition = this.elementAliases.get(step.element.alias);
                const aliasSelectors = this.extractSelectorsFromAlias(aliasDefinition);
                Object.assign(selectors, aliasSelectors);
            } catch (error) {
                this.logWarning(`Failed to resolve alias ${step.element.alias}: ${error.message}`);
            }
        }
        
        if (step.element?.target?.selectors) {
            step.element.target.selectors.forEach(selector => {
                try {
                    this.processSelectorType(selector, selectors);
                } catch (error) {
                    this.logWarning(`Failed to process selector: ${error.message}`);
                }
            });
        }
        
        // Extract text if available
        if (step.element?.target?.text) {
            selectors.text = step.element.target.text;
        }
        
        return selectors;
    }
    
    processSelectorType(selector, selectors) {
        switch (selector.type) {
            case 'GUESS':
                if (selector.value) {
                    try {
                        const guessData = JSON.parse(selector.value);
                        selectors.hint = guessData.clue || null;
                        selectors.guessVariable = guessData.variable || null;
                    } catch (e) {
                        // If not JSON, use as hint directly
                        selectors.hint = selector.value;
                    }
                }
                break;
            case 'XPATH':
                selectors.xpath = selector.value;
                break;
            case 'XPATH_ID':
                selectors.xpathId = selector.value;
                break;
            case 'XPATH_TEXT':
                selectors.xpathText = selector.value;
                break;
            case 'XPATH_ATTRIBUTE':
                selectors.xpathAttribute = selector.value;
                break;
            case 'CSS':
            case 'CSS_SELECTOR':
                selectors.css = selector.value;
                break;
            case 'ID':
                selectors.id = selector.value;
                break;
            case 'JS_PATH':
                selectors.jsPath = selector.value;
                break;
            case 'CLASS_NAME':
                selectors.className = selector.value;
                break;
            case 'TAG_NAME':
                selectors.tagName = selector.value;
                break;
            case 'LINK_TEXT':
                selectors.linkText = selector.value;
                break;
            case 'TEXT_CONTENT':
                selectors.text = selector.value;
                break;
            default:
                this.logDebug(`Unknown selector type: ${selector.type}`);
        }
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
        // Priority order
        if (selectors.hint) {
            return `"${this.sanitizeText(selectors.hint)}"`;
        }
        
        if (selectors.text && selectors.text.length <= 100) {
            return `"${this.sanitizeText(selectors.text)}"`;
        }
        
        if (selectors.id) {
            return `"${selectors.id}"`;
        }
        
        if (selectors.linkText) {
            return `link "${selectors.linkText}"`;
        }
        
        if (selectors.xpathId) {
            return `"${selectors.xpathId}"`;
        }
        
        if (selectors.xpathText) {
            return `"${selectors.xpathText}"`;
        }
        
        if (selectors.xpathAttribute) {
            return `"${selectors.xpathAttribute}"`;
        }
        
        if (selectors.xpath) {
            return `"${selectors.xpath}"`;
        }
        
        if (selectors.css) {
            return `"${selectors.css}"`;
        }
        
        if (selectors.className) {
            return `class "${selectors.className}"`;
        }
        
        if (selectors.tagName) {
            return `<${selectors.tagName}> element`;
        }
        
        if (selectors.jsPath) {
            return `"${selectors.jsPath}"`;
        }
        
        // No selectors found - log error
        this.conversionReport.missingSelectors.push({
            checkpoint: this.currentCheckpoint,
            step: this.currentStep
        });
        this.logError('No selectors found for element', 'warning');
        return '[ERROR: No selector found - needs investigation]';
    }
    
    sanitizeText(text) {
        if (!text) return '';
        
        // Remove line breaks and excessive whitespace
        return text
            .replace(/[\n\r]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 200); // Limit length
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
                        // Check for direct variable usage
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
                        
                        // Check for variables in text content
                        if (step.value) {
                            const foundVars = this.findVariablesInText(step.value);
                            foundVars.forEach(varName => {
                                if (!usedVars.has(varName)) {
                                    usedVars.set(varName, {
                                        name: varName,
                                        usage: []
                                    });
                                }
                                usedVars.get(varName).usage.push({
                                    checkpoint: testCase.title,
                                    step: stepIndex + 1,
                                    action: step.action,
                                    context: 'Text content'
                                });
                            });
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
    
    findVariablesInText(text) {
        const variablePatterns = [
            /\$\{([^}]+)\}/g,  // ${varName}
            /\$([a-zA-Z_][a-zA-Z0-9_]*)/g,  // $varName
            /{{([^}]+)}}/g     // {{varName}}
        ];
        
        const found = new Set();
        variablePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                found.add(match[1]);
            }
        });
        
        return Array.from(found);
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
    
    displayConversionStats() {
        console.log('\n' + '=' .repeat(70));
        console.log('📊 CONVERSION STATISTICS\n');
        console.log(`Total Steps: ${this.conversionReport.totalSteps}`);
        console.log(`Successful: ${this.conversionReport.successfulSteps} (${this.getSuccessRate()}%)`);
        console.log(`Failed: ${this.conversionReport.failedSteps}`);
        console.log(`Warnings: ${this.conversionReport.warnings.length}`);
        console.log(`Errors: ${this.conversionReport.errors.length}`);
        
        if (this.conversionReport.unsupportedActions.size > 0) {
            console.log(`\nUnsupported Actions Found:`);
            Array.from(this.conversionReport.unsupportedActions).forEach(action => {
                console.log(`  - ${action}`);
            });
        }
        
        if (this.conversionReport.missingSelectors.length > 0) {
            console.log(`\nSteps with Missing Selectors: ${this.conversionReport.missingSelectors.length}`);
        }
        
        console.log('=' .repeat(70));
    }
    
    // === Logging Methods ===
    
    logError(message, severity = 'error', context = null) {
        const error = {
            message,
            severity,
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
    
    logWarning(message, context = null) {
        const warning = {
            message,
            checkpoint: this.currentCheckpoint,
            step: this.currentStep,
            timestamp: new Date().toISOString()
        };
        
        if (context) {
            warning.context = context;
        }
        
        this.conversionReport.warnings.push(warning);
        
        if (this.config.debug) {
            console.warn(`⚠️  ${message}`);
        }
    }
    
    logDebug(message) {
        if (this.config.debug) {
            console.log(`🔍 ${message}`);
        }
    }
    
    // === Metadata & Reporting ===
    
    createMetadata(ids, journeyData, executionData, goalData, projectData) {
        return {
            extraction: {
                timestamp: new Date().toISOString(),
                url: `https://app2.virtuoso.qa/#/project/${ids.project}/execution/${ids.execution}/journey/${ids.journey}`,
                wrapper_version: '5.0.0',
                token_used: this.config.token.substring(0, 10) + '...'
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
                status: executionData?.item?.executionStatus || 'Unknown',
                started: executionData?.item?.createdAt,
                completed: executionData?.item?.updatedAt
            },
            journey: {
                id: ids.journey,
                name: journeyData.name,
                title: journeyData.title,
                checkpoints: journeyData.cases?.length || 0,
                total_steps: journeyData.cases?.reduce((sum, c) => sum + (c.steps?.length || 0), 0) || 0,
                element_aliases: this.elementAliases.size
            },
            conversion: {
                success_rate: this.getSuccessRate(),
                total_steps: this.conversionReport.totalSteps,
                successful_steps: this.conversionReport.successfulSteps,
                failed_steps: this.conversionReport.failedSteps,
                warnings: this.conversionReport.warnings.length,
                errors: this.conversionReport.errors.length,
                unsupported_actions: Array.from(this.conversionReport.unsupportedActions)
            },
            improvements: {
                v5: [
                    'Comprehensive action type coverage (30+ actions)',
                    'Robust validation and error tracking',
                    'Data quality checks',
                    'Conversion success reporting',
                    'Graceful failure handling',
                    'Debug mode for troubleshooting'
                ]
            }
        };
    }
    
    createSummaryReport(folderPath, nlp, variables, metadata) {
        const lines = [];
        
        lines.push('# 📊 Extraction Summary Report v5');
        lines.push('');
        lines.push(`**Generated**: ${metadata.extraction.timestamp}`);
        lines.push(`**Location**: ${folderPath}`);
        lines.push('');
        
        lines.push('## 📋 Source Information');
        lines.push(`- **Project**: ${metadata.project.name} (ID: ${metadata.project.id})`);
        lines.push(`- **Goal**: ${metadata.goal.name} (ID: ${metadata.goal.id})`);
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
        
        lines.push('## 🎯 Conversion Quality');
        lines.push(`- **Success Rate**: ${metadata.conversion.success_rate}%`);
        lines.push(`- **Successful Steps**: ${metadata.conversion.successful_steps}/${metadata.conversion.total_steps}`);
        lines.push(`- **Failed Steps**: ${metadata.conversion.failed_steps}`);
        lines.push(`- **Warnings**: ${metadata.conversion.warnings}`);
        lines.push(`- **Errors**: ${metadata.conversion.errors}`);
        
        if (metadata.conversion.unsupported_actions.length > 0) {
            lines.push(`- **Unsupported Actions**: ${metadata.conversion.unsupported_actions.join(', ')}`);
        }
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
        
        lines.push('## ✅ v5 Features');
        metadata.improvements.v5.forEach(improvement => {
            lines.push(`- ${improvement}`);
        });
        lines.push('');
        
        lines.push('## 📁 Files Generated');
        lines.push('```');
        lines.push('.');
        lines.push('├── execution.nlp.txt           # NLP conversion');
        lines.push('├── variables-used.json         # Variable extraction');
        lines.push('├── conversion-report.json      # Detailed conversion report');
        lines.push('├── metadata.json               # Extraction metadata');
        lines.push('├── EXTRACTION-SUMMARY.md       # This file');
        lines.push('└── raw-data/                   # Raw API responses');
        lines.push('```');
        
        return lines.join('\n');
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
        console.log('Usage: node comprehensive-extraction-v5.js <URL> [--debug]');
        console.log('Example: node comprehensive-extraction-v5.js "https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256"');
        console.log('Debug mode: Add --debug flag for detailed logging');
        process.exit(1);
    }
    
    const url = args[0];
    const debug = args.includes('--debug');
    
    const extractor = new ComprehensiveExtractorV5({ debug });
    extractor.extract(url).then(result => {
        if (result.success) {
            console.log('\n✅ Extraction completed successfully!');
            console.log(`📁 Output: ${result.path}`);
            console.log(`📊 Success Rate: ${result.stats.successRate}%`);
            if (result.stats.errors > 0 || result.stats.warnings > 0) {
                console.log(`⚠️  Issues: ${result.stats.errors} errors, ${result.stats.warnings} warnings`);
                console.log('   Check conversion-report.json for details');
            }
        } else {
            console.log('\n❌ Extraction failed');
            console.log('   Run with --debug flag for more information');
            process.exit(1);
        }
    });
}