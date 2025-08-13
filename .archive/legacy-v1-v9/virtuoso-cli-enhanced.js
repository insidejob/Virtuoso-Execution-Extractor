#!/usr/bin/env node

/**
 * Virtuoso CLI Enhanced - Complete Test Data Extraction Suite
 * Supports NLP conversion, screenshots, variables, and more
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const ScreenshotExtractor = require('./virtuoso-screenshot-extractor');
const VariablesEnhancedExtractor = require('./virtuoso-variables-enhanced');

class VirtuosoCLIEnhanced {
    constructor() {
        // Parse command line arguments
        this.args = process.argv.slice(2);
        this.url = this.args[0];
        this.flags = {
            nlp: this.args.includes('--nlp'),
            screenshots: this.args.includes('--screenshots'),
            variables: this.args.includes('--variables'),
            verbose: this.args.includes('--verbose'),
            basic: this.args.includes('--basic'),
            json: this.args.includes('--json'),
            all: this.args.includes('--all'), // Extract everything
            output: this.getOutputFile(),
            help: this.args.includes('--help') || this.args.includes('-h')
        };
        
        // Configuration
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: process.env.VIRTUOSO_TOKEN || '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
            sessionId: process.env.VIRTUOSO_SESSION || 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
            clientId: process.env.VIRTUOSO_CLIENT || '1754647483711_e9e9c12_production'
        };
        
        this.extractedData = null;
        this.results = {
            nlp: null,
            screenshots: null,
            variables: null
        };
    }
    
    getOutputFile() {
        const outputIndex = this.args.indexOf('--output');
        if (outputIndex > -1 && this.args[outputIndex + 1]) {
            return this.args[outputIndex + 1];
        }
        return null;
    }
    
    showHelp() {
        console.log(`
Virtuoso CLI Enhanced - Complete Test Data Extraction Suite
===========================================================

Usage:
  virtuoso-cli <URL> [options]

URL Format:
  https://app2.virtuoso.qa/#/project/{projectId}/execution/{executionId}/journey/{journeyId}
  https://app2.virtuoso.qa/#/project/{projectId}/goal/{goalId}/v/{versionId}/journey/{journeyId}

Core Options:
  --nlp              Convert test steps to NLP format
  --screenshots      Extract and download all screenshots
  --variables        Extract variables with values and context
  --all              Extract everything (NLP + screenshots + variables)

Output Options:
  --basic            Basic output only (no details)
  --verbose          Verbose output with detailed information
  --json             Output as JSON format
  --output <file>    Save output to file/directory
  --help, -h         Show this help

Environment Variables:
  VIRTUOSO_TOKEN     API token (required)
  VIRTUOSO_SESSION   Session ID (required)
  VIRTUOSO_CLIENT    Client ID (optional)

Examples:
  # Extract everything
  virtuoso-cli <URL> --all

  # Convert to NLP format
  virtuoso-cli <URL> --nlp

  # Extract screenshots with documentation
  virtuoso-cli <URL> --screenshots

  # Extract variables with context
  virtuoso-cli <URL> --variables

  # Multiple extractions
  virtuoso-cli <URL> --nlp --screenshots --variables

  # Save NLP to file
  virtuoso-cli <URL> --nlp --output test.nlp.txt

  # Verbose mode with all extractions
  virtuoso-cli <URL> --all --verbose

Output Structure:
  When using --screenshots:
    virtuoso-exports/
    ├── {goal-name}/
    │   └── {execution-date-name}/
    │       └── {journey-name}/
    │           ├── screenshots/
    │           │   ├── step-001-navigate-during-pass.png
    │           │   ├── step-002-write-during-pass.png
    │           │   └── ...
    │           ├── screenshot-context.md
    │           └── manifest.json

  When using --variables:
    - Console output: Formatted variable report
    - JSON output: Complete variable analysis
    - Markdown output: Documentation-ready format
        `);
    }
    
    parseURL() {
        if (!this.url) {
            console.error('❌ Error: No URL provided');
            this.showHelp();
            process.exit(1);
        }
        
        if (this.flags.verbose) {
            console.log(`📍 Parsing URL: ${this.url}`);
        }
        
        // Extract IDs from URL
        const patterns = {
            execution: /execution\/(\d+)/,
            journey: /journey\/(\d+)/,
            project: /project\/(\d+)/,
            goal: /goal\/(\d+)/,
            version: /v\/(\d+)/
        };
        
        const ids = {};
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = this.url.match(pattern);
            if (match) {
                ids[key] = match[1];
            }
        }
        
        if (!ids.journey) {
            console.error('❌ Error: Could not extract journey/testsuite ID from URL');
            process.exit(1);
        }
        
        if (this.flags.verbose) {
            console.log('📊 Extracted IDs:', ids);
        }
        
        return ids;
    }
    
    async fetchData(ids) {
        const endpoint = `/testsuites/${ids.journey}?envelope=false`;
        const url = `${this.config.baseUrl}${endpoint}`;
        
        if (this.flags.verbose) {
            console.log(`\n📡 Fetching journey data from API...`);
            console.log(`   URL: ${url}`);
        } else if (!this.flags.json) {
            console.log('⏳ Fetching data...');
        }
        
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'authorization': `Bearer ${this.config.token}`,
                    'origin': 'https://app2.virtuoso.qa',
                    'referer': 'https://app2.virtuoso.qa/',
                    'x-v-session-id': this.config.sessionId,
                    'x-virtuoso-client-id': this.config.clientId,
                    'x-virtuoso-client-name': 'Virtuoso UI'
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const jsonData = JSON.parse(data);
                            if (this.flags.verbose) {
                                console.log(`   ✅ Success! Retrieved ${jsonData.name || 'data'}`);
                            }
                            resolve(jsonData);
                        } catch (e) {
                            reject(new Error('Failed to parse API response'));
                        }
                    } else if (res.statusCode === 401) {
                        reject(new Error('Authentication failed - check token and session'));
                    } else {
                        reject(new Error(`API returned status ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.end();
        });
    }
    
    convertToNLP(data) {
        const nlpLines = [];
        
        if (data.cases) {
            data.cases.forEach((testCase, index) => {
                // Format checkpoint header
                const checkpointNum = testCase.name.replace('TC', '');
                nlpLines.push(`Checkpoint ${checkpointNum}: ${testCase.title}`);
                
                // Process steps
                if (testCase.steps) {
                    testCase.steps.forEach(step => {
                        const nlpCommand = this.stepToNLP(step);
                        if (nlpCommand) {
                            nlpLines.push(nlpCommand);
                        }
                    });
                }
                
                nlpLines.push(''); // Empty line between checkpoints
            });
        }
        
        return nlpLines;
    }
    
    stepToNLP(step) {
        switch(step.action) {
            case 'NAVIGATE':
                return `Navigate to ${step.variable ? '$' + step.variable : step.value || '$url'}`;
                
            case 'WRITE':
                const writeValue = step.variable ? '$' + step.variable : `"${step.value || ''}"`;
                const fieldName = this.extractFieldName(step);
                return `Write ${writeValue} in field "${fieldName}"`;
                
            case 'CLICK':
                const clickTarget = this.extractElementName(step);
                return `Click on "${clickTarget}"`;
                
            case 'SELECT':
            case 'PICK':
                const selectValue = step.value || step.variable;
                const dropdown = this.extractDropdownContext(step);
                return `Pick "${selectValue}" from dropdown "${dropdown}"`;
                
            case 'WAIT_FOR_ELEMENT':
                const waitElement = this.extractElementName(step);
                return `Look for element "${waitElement}" on page`;
                
            default:
                if (this.flags.verbose) {
                    console.log(`   ⚠️  Unknown action: ${step.action}`);
                }
                return null;
        }
    }
    
    extractFieldName(step) {
        if (step.element?.target?.selectors) {
            const guessSelector = step.element.target.selectors.find(s => s.type === 'GUESS');
            if (guessSelector) {
                try {
                    const guess = JSON.parse(guessSelector.value);
                    if (guess.clue) return guess.clue;
                } catch {}
            }
            
            const idSelector = step.element.target.selectors.find(s => s.type === 'ID');
            if (idSelector) {
                return this.formatName(idSelector.value);
            }
        }
        
        if (step.variable) {
            return this.formatName(step.variable);
        }
        
        return 'field';
    }
    
    extractElementName(step) {
        if (step.element?.target?.selectors) {
            const guessSelector = step.element.target.selectors.find(s => s.type === 'GUESS');
            if (guessSelector) {
                try {
                    const guess = JSON.parse(guessSelector.value);
                    if (guess.clue) return guess.clue;
                } catch {}
            }
            
            if (step.element.target.text) {
                return step.element.target.text.trim();
            }
            
            const idSelector = step.element.target.selectors.find(s => s.type === 'ID');
            if (idSelector) {
                const id = idSelector.value;
                if (id.includes('login')) return 'Login';
                if (id.includes('save')) return 'Save';
                if (id.includes('add')) return 'Add';
                if (id.includes('submit')) return 'Submit';
                return this.formatName(id);
            }
        }
        
        return 'element';
    }
    
    extractDropdownContext(step) {
        if (step.value === 'Electrical') {
            return 'Please Select...ElectricalMechanical/ProcessInstrumentInhibits/Overrides';
        }
        if (step.value === 'Yes / No') {
            return 'Please Select...Yes / NoTextMulti LineYes / No / NADropdownYes / No / TextMulti TextYes No Toggle';
        }
        return 'dropdown';
    }
    
    formatName(name) {
        const mappings = {
            'username': 'Username',
            'password': 'Password',
            'questionText': 'Question',
            'orderId': 'Order'
        };
        
        return mappings[name] || name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }
    
    async extractScreenshots(ids) {
        console.log('\n📸 Extracting screenshots...');
        
        const extractor = new ScreenshotExtractor({
            token: this.config.token,
            sessionId: this.config.sessionId,
            clientId: this.config.clientId,
            outputDir: this.flags.output || './virtuoso-exports'
        });
        
        try {
            const result = await extractor.extract(ids, {
                verbose: this.flags.verbose
            });
            
            this.results.screenshots = result;
            return result;
        } catch (error) {
            console.error('❌ Screenshot extraction failed:', error.message);
            if (this.flags.verbose) {
                console.error(error.stack);
            }
            return null;
        }
    }
    
    async extractVariables(ids) {
        console.log('\n🔧 Extracting variables with type categorization...');
        
        const extractor = new VariablesEnhancedExtractor({
            token: this.config.token,
            sessionId: this.config.sessionId,
            clientId: this.config.clientId
        });
        
        try {
            const report = await extractor.extract(ids, {
                verbose: this.flags.verbose
            });
            
            this.results.variables = report;
            
            // Output based on format preference
            if (!this.flags.json) {
                console.log('\n' + report.text);
            }
            
            return report;
        } catch (error) {
            console.error('❌ Variables extraction failed:', error.message);
            if (this.flags.verbose) {
                console.error(error.stack);
            }
            return null;
        }
    }
    
    outputResults() {
        // Handle different output scenarios
        if (this.flags.json) {
            const output = {
                journey: {
                    id: this.extractedData.id,
                    name: this.extractedData.name,
                    title: this.extractedData.title
                }
            };
            
            if (this.results.nlp) {
                output.nlp = this.results.nlp;
            }
            
            if (this.results.screenshots) {
                output.screenshots = this.results.screenshots;
            }
            
            if (this.results.variables) {
                output.variables = JSON.parse(this.results.variables.json);
            }
            
            console.log(JSON.stringify(output, null, 2));
            
        } else if (this.flags.nlp && this.results.nlp) {
            // NLP output
            const nlpText = this.results.nlp.join('\n');
            
            if (this.flags.output && !this.flags.screenshots) {
                fs.writeFileSync(this.flags.output, nlpText);
                console.log(`\n✅ NLP output saved to: ${this.flags.output}`);
            } else {
                console.log(nlpText);
            }
        } else if (!this.flags.screenshots && !this.flags.variables) {
            // Default readable output
            const lines = [];
            lines.push(`\nTestSuite: ${this.extractedData.name} - ${this.extractedData.title}`);
            lines.push('=' .repeat(50));
            
            if (this.extractedData.cases) {
                this.extractedData.cases.forEach((testCase, i) => {
                    lines.push(`\nCheckpoint ${i + 1}: ${testCase.name} - ${testCase.title}`);
                    lines.push(`Steps: ${testCase.steps?.length || 0}`);
                });
            }
            
            console.log(lines.join('\n'));
        }
        
        // Summary if multiple extractions
        if ((this.flags.nlp || this.flags.screenshots || this.flags.variables) && !this.flags.json) {
            console.log('\n' + '='.repeat(50));
            console.log('✅ Extraction Complete!');
            console.log('='.repeat(50));
            
            if (this.results.nlp) {
                console.log(`📝 NLP: ${this.results.nlp.length - 1} lines generated`);
            }
            
            if (this.results.screenshots) {
                console.log(`📸 Screenshots: ${this.results.screenshots.count} saved to ${this.results.screenshots.path}`);
            }
            
            if (this.results.variables) {
                const varCount = this.results.variables.summary?.total || this.results.variables.summary?.totalVariables || 0;
                console.log(`🔧 Variables: ${varCount} extracted`);
            }
        }
    }
    
    async run() {
        try {
            // Show help if requested
            if (this.flags.help) {
                this.showHelp();
                return;
            }
            
            // Check for required environment variables
            if (!this.config.token || this.config.token === '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf') {
                console.warn('⚠️  Warning: Using default token. Set VIRTUOSO_TOKEN environment variable.');
                console.warn('   Run: ./setup-virtuoso-cli.sh to configure');
            }
            
            // Parse URL
            const ids = this.parseURL();
            
            // Fetch base journey data
            this.extractedData = await this.fetchData(ids);
            
            // Handle --all flag
            if (this.flags.all) {
                this.flags.nlp = true;
                this.flags.screenshots = true;
                this.flags.variables = true;
            }
            
            // Process extractions based on flags
            if (this.flags.nlp) {
                if (this.flags.verbose) {
                    console.log('\n📝 Converting to NLP format...');
                }
                this.results.nlp = this.convertToNLP(this.extractedData);
            }
            
            if (this.flags.screenshots) {
                await this.extractScreenshots(ids);
            }
            
            if (this.flags.variables) {
                await this.extractVariables(ids);
            }
            
            // Output results
            this.outputResults();
            
        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            if (this.flags.verbose) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }
}

// Main execution
if (require.main === module) {
    const cli = new VirtuosoCLIEnhanced();
    cli.run();
}

module.exports = VirtuosoCLIEnhanced;