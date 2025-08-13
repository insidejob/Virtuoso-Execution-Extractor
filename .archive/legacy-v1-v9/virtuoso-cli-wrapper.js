#!/usr/bin/env node

/**
 * Virtuoso CLI Wrapper
 * Parses execution/journey URLs and extracts data with optional NLP conversion
 * 
 * Usage:
 *   virtuoso-cli https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218
 *   virtuoso-cli https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218 --nlp
 *   virtuoso-cli https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218 --nlp --verbose
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class VirtuosoCLI {
    constructor() {
        // Parse command line arguments
        this.args = process.argv.slice(2);
        this.url = this.args[0];
        this.flags = {
            nlp: this.args.includes('--nlp'),
            verbose: this.args.includes('--verbose'),
            basic: this.args.includes('--basic'),
            screenshots: this.args.includes('--screenshots'),
            json: this.args.includes('--json'),
            output: this.getOutputFile(),
            help: this.args.includes('--help') || this.args.includes('-h')
        };
        
        // Configuration (should be in environment variables or config file)
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: process.env.VIRTUOSO_TOKEN || '2a289d87-2eb9-41a0-9441-1fb3c39d6eaf',
            sessionId: process.env.VIRTUOSO_SESSION || 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
            clientId: process.env.VIRTUOSO_CLIENT || '1754647483711_e9e9c12_production'
        };
        
        this.extractedData = null;
        this.nlpOutput = null;
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
Virtuoso CLI Wrapper - Extract and Convert Test Data
=====================================================

Usage:
  virtuoso-cli <URL> [options]

URL Format:
  https://app2.virtuoso.qa/#/project/{projectId}/execution/{executionId}/journey/{journeyId}
  https://app2.virtuoso.qa/#/project/{projectId}/goal/{goalId}/v/{versionId}/journey/{journeyId}

Options:
  --nlp              Convert output to NLP format
  --basic            Basic output only (no details)
  --verbose          Verbose output with timings
  --screenshots      Include screenshot URLs
  --json             Output as JSON
  --output <file>    Save output to file
  --help, -h         Show this help

Environment Variables:
  VIRTUOSO_TOKEN     API token (required)
  VIRTUOSO_SESSION   Session ID (required)
  VIRTUOSO_CLIENT    Client ID

Examples:
  # Extract execution data
  virtuoso-cli https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218

  # Extract and convert to NLP
  virtuoso-cli https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218 --nlp

  # Save NLP output to file
  virtuoso-cli https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218 --nlp --output output.txt

  # Verbose NLP with timings
  virtuoso-cli https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218 --nlp --verbose
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
        
        // Extract IDs from URL using regex
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
            console.log(`\n📡 Fetching data from API...`);
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
        // Extract UI-friendly field name from step data
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
                // Map common IDs to UI names
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
        // Build dropdown context (simplified for now)
        if (step.value === 'Electrical') {
            return 'Please Select...ElectricalMechanical/ProcessInstrumentInhibits/Overrides';
        }
        if (step.value === 'Yes / No') {
            return 'Please Select...Yes / NoTextMulti LineYes / No / NADropdownYes / No / TextMulti TextYes No Toggle';
        }
        return 'dropdown';
    }
    
    formatName(name) {
        // Convert technical names to UI-friendly format
        const mappings = {
            'username': 'Username',
            'password': 'Password',
            'questionText': 'Question',
            'orderId': 'Order'
        };
        
        return mappings[name] || name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }
    
    outputResults() {
        let output;
        
        if (this.flags.nlp && this.nlpOutput) {
            // NLP output
            output = this.nlpOutput.join('\n');
        } else if (this.flags.json) {
            // JSON output
            output = JSON.stringify(this.extractedData, null, 2);
        } else if (this.flags.basic) {
            // Basic output
            const summary = {
                name: this.extractedData.name,
                title: this.extractedData.title,
                checkpoints: this.extractedData.cases?.length || 0,
                totalSteps: this.extractedData.cases?.reduce((sum, c) => sum + (c.steps?.length || 0), 0) || 0
            };
            output = JSON.stringify(summary, null, 2);
        } else {
            // Default readable output
            output = this.formatReadableOutput();
        }
        
        // Save to file or print to console
        if (this.flags.output) {
            fs.writeFileSync(this.flags.output, output);
            console.log(`\n✅ Output saved to: ${this.flags.output}`);
        } else {
            console.log(output);
        }
    }
    
    formatReadableOutput() {
        const lines = [];
        lines.push(`\nTestSuite: ${this.extractedData.name} - ${this.extractedData.title}`);
        lines.push('=' .repeat(50));
        
        if (this.extractedData.cases) {
            this.extractedData.cases.forEach((testCase, i) => {
                lines.push(`\nCheckpoint ${i + 1}: ${testCase.name} - ${testCase.title}`);
                lines.push(`Steps: ${testCase.steps?.length || 0}`);
            });
        }
        
        return lines.join('\n');
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
            }
            
            // Parse URL
            const ids = this.parseURL();
            
            // Fetch data
            this.extractedData = await this.fetchData(ids);
            
            // Convert to NLP if flag is set
            if (this.flags.nlp) {
                if (this.flags.verbose) {
                    console.log('\n📝 Converting to NLP format...');
                }
                this.nlpOutput = this.convertToNLP(this.extractedData);
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
    const cli = new VirtuosoCLI();
    cli.run();
}

module.exports = VirtuosoCLI;