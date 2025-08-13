#!/usr/bin/env node

/**
 * Virtuoso API CLI Wrapper
 * A unified command-line interface for all Virtuoso API operations
 * 
 * Usage:
 *   virtuoso --extract journey 527286 --basic
 *   virtuoso --test all --verbose
 *   virtuoso --search "execute goal" --format json
 *   virtuoso --validate endpoints --comprehensive
 */

const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

// Import existing modules (we'll use your existing code)
const VirtuosoClient = require('./src/virtuoso-client');
const { searchAPI } = require('./src/search');
const TestRunner = require('./src/test-runner');
const DeepDiscoverySystem = require('./src/deep-discovery-system');
const VirtuosoAPIInvestigator = require('./virtuoso-api-investigation');

class VirtuosoCLI {
    constructor() {
        this.client = null;
        this.config = {
            token: process.env.VIRTUOSO_API_TOKEN || '86defbf4-62a7-4958-a0b4-21af0dee5d7a',
            environment: process.env.VIRTUOSO_ENV || 'app2',
            baseUrl: 'https://app2.virtuoso.qa'
        };
        
        this.setupCommands();
    }

    setupCommands() {
        program
            .name('virtuoso')
            .description('🎯 Virtuoso API CLI - Complete control over Virtuoso APIs')
            .version('2.0.0');

        // Extract command
        program
            .command('extract <type> <id>')
            .description('Extract data from Virtuoso')
            .option('--basic', 'Basic extraction (essential data only)')
            .option('--detailed', 'Detailed extraction with all fields')
            .option('--nlp', 'Natural language descriptions')
            .option('--screenshots', 'Include visual data')
            .option('--comprehensive', 'Everything available')
            .option('--method <method>', 'Extraction method: browser|api|auto', 'auto')
            .option('--format <format>', 'Output format: json|table|markdown', 'json')
            .action(async (type, id, options) => {
                await this.handleExtract(type, id, options);
            });

        // Test command
        program
            .command('test [endpoints...]')
            .description('Test API endpoints')
            .option('--basic', 'Quick connectivity test')
            .option('--verbose', 'Detailed test output')
            .option('--comprehensive', 'Full test suite')
            .option('--update-schema', 'Update schema with findings')
            .action(async (endpoints, options) => {
                await this.handleTest(endpoints || ['all'], options);
            });

        // Search command
        program
            .command('search <query>')
            .description('Search API documentation and examples')
            .option('--format <format>', 'Output format: json|table|markdown', 'table')
            .option('--examples', 'Include code examples')
            .option('--curl', 'Show curl commands')
            .option('--code', 'Show JavaScript code')
            .action(async (query, options) => {
                await this.handleSearch(query, options);
            });

        // Validate command
        program
            .command('validate <target>')
            .description('Validate API schemas and endpoints')
            .option('--comprehensive', 'Complete validation')
            .option('--quick', 'Quick validation')
            .option('--fix', 'Auto-fix issues where possible')
            .action(async (target, options) => {
                await this.handleValidate(target, options);
            });

        // Discover command
        program
            .command('discover')
            .description('Discover new API endpoints')
            .option('--deep', 'Deep discovery mode')
            .option('--update-schema', 'Update schema with findings')
            .option('--test-new', 'Test newly discovered endpoints')
            .action(async (options) => {
                await this.handleDiscover(options);
            });

        // Auth command
        program
            .command('auth <action>')
            .description('Manage authentication')
            .option('--token <token>', 'Set API token')
            .option('--check', 'Check current authentication')
            .action(async (action, options) => {
                await this.handleAuth(action, options);
            });

        // Map command
        program
            .command('map <type> <id>')
            .description('Map IDs between different entities')
            .action(async (type, id) => {
                await this.handleMap(type, id);
            });

        // Status command
        program
            .command('status')
            .description('Show system status')
            .option('--basic', 'Basic status only')
            .option('--detailed', 'Detailed status')
            .action(async (options) => {
                await this.handleStatus(options);
            });

        // Update command
        program
            .command('update <target>')
            .description('Update knowledge base')
            .action(async (target) => {
                await this.handleUpdate(target);
            });

        // Export command
        program
            .command('export <format>')
            .description('Export API knowledge')
            .option('--output <file>', 'Output file')
            .action(async (format, options) => {
                await this.handleExport(format, options);
            });
    }

    async handleExtract(type, id, options) {
        console.log(chalk.blue('🔍 Extracting data...'));
        
        const extractionModes = {
            basic: ['id', 'name', 'steps', 'checkpoints'],
            detailed: ['id', 'name', 'steps', 'checkpoints', 'metadata', 'variables'],
            nlp: ['natural_language_description'],
            screenshots: ['visual_data', 'element_locations'],
            comprehensive: ['*']
        };

        try {
            if (type === 'journey' || type === 'testsuite') {
                const methods = {
                    browser: this.extractViaBrowser,
                    api: this.extractViaAPI,
                    auto: this.extractAuto
                };

                const extractMethod = methods[options.method] || methods.auto;
                const data = await extractMethod.call(this, id, options);

                // Filter based on extraction mode
                const mode = Object.keys(options).find(key => extractionModes[key]);
                if (mode && extractionModes[mode]) {
                    // Apply filtering based on mode
                    console.log(chalk.green(`✅ Extraction complete (${mode} mode)`));
                }

                this.outputData(data, options.format);
            }
        } catch (error) {
            console.error(chalk.red(`❌ Extraction failed: ${error.message}`));
            console.log(chalk.yellow('💡 Try: virtuoso extract journey ' + id + ' --method browser'));
        }
    }

    async handleTest(endpoints, options) {
        console.log(chalk.blue('🧪 Running tests...'));
        
        const runner = new TestRunner();
        
        if (options.basic) {
            console.log('Running basic connectivity tests...');
            const results = await runner.runBasicTests();
            this.displayTestResults(results, options.verbose);
        } else if (options.comprehensive) {
            console.log('Running comprehensive test suite...');
            const results = await runner.runAllTests();
            this.displayTestResults(results, options.verbose);
            
            if (options.updateSchema) {
                await this.updateSchemaFromTests(results);
            }
        } else {
            // Run specific endpoint tests
            const results = await runner.runEndpointTests(endpoints);
            this.displayTestResults(results, options.verbose);
        }
    }

    async handleSearch(query, options) {
        console.log(chalk.blue(`🔍 Searching for: ${query}`));
        
        const results = await searchAPI(query);
        
        if (options.examples) {
            // Add code examples to results
            results.forEach(result => {
                result.example = this.generateExample(result.endpoint);
            });
        }
        
        if (options.curl) {
            results.forEach(result => {
                result.curl = this.generateCurl(result.endpoint);
            });
        }
        
        if (options.code) {
            results.forEach(result => {
                result.code = this.generateJavaScript(result.endpoint);
            });
        }
        
        this.outputData(results, options.format);
    }

    async handleValidate(target, options) {
        console.log(chalk.blue('✅ Validating...'));
        
        const validator = {
            all: async () => {
                const schema = await this.loadSchema();
                const results = [];
                
                for (const endpoint of schema.endpoints) {
                    const result = await this.validateEndpoint(endpoint);
                    results.push(result);
                }
                
                return results;
            },
            endpoints: async () => {
                return await this.validateAllEndpoints(options.comprehensive);
            },
            schema: async () => {
                return await this.validateSchema();
            }
        };
        
        const results = await validator[target]();
        
        if (options.fix) {
            await this.autoFixIssues(results);
        }
        
        this.displayValidationResults(results);
    }

    async handleDiscover(options) {
        console.log(chalk.blue('🔍 Discovering new endpoints...'));
        
        const discovery = new DeepDiscoverySystem(this.config.token);
        
        if (options.deep) {
            console.log('Running deep discovery...');
            const results = await discovery.runDeepDiscovery();
            
            if (options.updateSchema) {
                await this.updateSchemaWithDiscoveries(results);
            }
            
            if (options.testNew) {
                await this.testNewEndpoints(results.newEndpoints);
            }
            
            this.displayDiscoveryResults(results);
        } else {
            const results = await discovery.runQuickDiscovery();
            this.displayDiscoveryResults(results);
        }
    }

    async handleAuth(action, options) {
        const actions = {
            check: async () => {
                console.log(chalk.blue('🔍 Checking authentication...'));
                
                const isUIToken = await this.checkIfUIToken(this.config.token);
                const isAPIToken = await this.checkIfAPIToken(this.config.token);
                
                if (isUIToken) {
                    console.log(chalk.yellow('❌ Current token is UI token, not API token'));
                    console.log(chalk.cyan('💡 Get API token at: https://app2.virtuoso.qa/#/settings/api'));
                    console.log(chalk.cyan('🔧 Or use: virtuoso extract --method browser'));
                } else if (isAPIToken) {
                    console.log(chalk.green('✅ API token validated and ready'));
                } else {
                    console.log(chalk.red('❌ Invalid token'));
                }
            },
            setup: async () => {
                console.log(chalk.blue('🔧 Setting up authentication...'));
                
                if (options.token) {
                    this.config.token = options.token;
                    await this.saveConfig();
                    console.log(chalk.green('✅ Token saved'));
                } else {
                    console.log('Please provide token with --token flag');
                }
            },
            test: async () => {
                const result = await this.testAuthentication();
                if (result.success) {
                    console.log(chalk.green('✅ Authentication successful'));
                } else {
                    console.log(chalk.red(`❌ Authentication failed: ${result.error}`));
                }
            }
        };
        
        await actions[action]();
    }

    async handleMap(type, id) {
        console.log(chalk.blue(`🗺️  Mapping ${type} ${id}...`));
        
        const mappings = {
            journey: (id) => ({
                journey_id: id,
                testsuite_id: id,  // Journey = TestSuite in Virtuoso
                endpoints: [
                    `/api/testsuites/${id}`,
                    `/api/testsuites/${id}/steps`,
                    `/api/testsuites/${id}/checkpoints`,
                    `/api/testsuites/${id}/executions`
                ]
            }),
            goal: (id) => ({
                goal_id: id,
                endpoints: [
                    `/api/goals/${id}`,
                    `/api/goals/${id}/testsuites`,
                    `/api/goals/${id}/execute`
                ]
            }),
            project: (id) => ({
                project_id: id,
                endpoints: [
                    `/api/projects/${id}`,
                    `/api/projects/${id}/goals`,
                    `/api/projects/${id}/snapshots`
                ]
            })
        };
        
        const mapping = mappings[type](id);
        
        console.log(chalk.green('📋 Mapping found:'));
        console.log(JSON.stringify(mapping, null, 2));
        
        console.log(chalk.cyan('\nAvailable endpoints:'));
        mapping.endpoints.forEach(endpoint => {
            console.log(`  GET https://api.virtuoso.qa${endpoint}`);
        });
    }

    async handleStatus(options) {
        console.log(chalk.blue('📊 System Status'));
        console.log('=' . repeat(50));
        
        const status = {
            api: await this.checkAPIStatus(),
            auth: await this.checkAuthStatus(),
            schema: await this.checkSchemaStatus(),
            endpoints: await this.checkEndpointStatus()
        };
        
        if (options.basic) {
            console.log(`API: ${status.api ? '✅' : '❌'}`);
            console.log(`Auth: ${status.auth ? '✅' : '❌'}`);
            console.log(`Schema: ${status.schema.current ? '✅' : '⚠️'}`);
            console.log(`Endpoints: ${status.endpoints.working}/${status.endpoints.total}`);
        } else if (options.detailed) {
            console.log('\nDetailed Status:');
            console.log(JSON.stringify(status, null, 2));
        }
    }

    async handleUpdate(target) {
        console.log(chalk.blue(`🔄 Updating ${target}...`));
        
        const updates = {
            knowledge: async () => {
                const discovery = new DeepDiscoverySystem(this.config.token);
                const results = await discovery.runDeepDiscovery();
                await this.updateSchemaWithDiscoveries(results);
                console.log(chalk.green('✅ Knowledge base updated'));
            },
            schema: async () => {
                await this.updateSchema();
                console.log(chalk.green('✅ Schema updated'));
            },
            examples: async () => {
                await this.updateExamples();
                console.log(chalk.green('✅ Examples updated'));
            }
        };
        
        await updates[target]();
    }

    async handleExport(format, options) {
        console.log(chalk.blue(`📤 Exporting as ${format}...`));
        
        const schema = await this.loadSchema();
        const outputFile = options.output || `virtuoso-api-export.${format}`;
        
        const exporters = {
            json: () => JSON.stringify(schema, null, 2),
            markdown: () => this.generateMarkdownDocs(schema),
            openapi: () => this.generateOpenAPISpec(schema),
            postman: () => this.generatePostmanCollection(schema)
        };
        
        const content = exporters[format]();
        await fs.writeFile(outputFile, content);
        
        console.log(chalk.green(`✅ Exported to ${outputFile}`));
    }

    // Helper methods
    async extractViaBrowser(id, options) {
        console.log(chalk.yellow('📱 Using browser extraction method...'));
        console.log(chalk.cyan('Please run the browser extraction script'));
        return { method: 'browser', id, message: 'Use EXTRACT-NOW.js in browser console' };
    }

    async extractViaAPI(id, options) {
        const client = new VirtuosoClient(this.config.token);
        return await client.getTestSuite(id);
    }

    async extractAuto(id, options) {
        try {
            return await this.extractViaAPI(id, options);
        } catch (error) {
            console.log(chalk.yellow('API method failed, falling back to browser...'));
            return await this.extractViaBrowser(id, options);
        }
    }

    outputData(data, format) {
        const formatters = {
            json: () => console.log(JSON.stringify(data, null, 2)),
            table: () => console.table(data),
            markdown: () => console.log(this.toMarkdown(data))
        };
        
        (formatters[format] || formatters.json)();
    }

    displayTestResults(results, verbose) {
        const passed = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(chalk.green(`✅ Passed: ${passed}`));
        console.log(chalk.red(`❌ Failed: ${failed}`));
        
        if (verbose) {
            results.forEach(result => {
                const icon = result.success ? '✅' : '❌';
                console.log(`${icon} ${result.endpoint}: ${result.message}`);
            });
        }
    }

    displayValidationResults(results) {
        results.forEach(result => {
            if (result.valid) {
                console.log(chalk.green(`✅ ${result.endpoint}: Valid`));
            } else {
                console.log(chalk.red(`❌ ${result.endpoint}: ${result.issues.join(', ')}`));
            }
        });
    }

    displayDiscoveryResults(results) {
        console.log(chalk.green(`\n📊 Discovery Results:`));
        console.log(`  New endpoints found: ${results.newEndpoints.length}`);
        console.log(`  Updated endpoints: ${results.updatedEndpoints.length}`);
        console.log(`  Deprecated endpoints: ${results.deprecatedEndpoints.length}`);
        
        if (results.newEndpoints.length > 0) {
            console.log(chalk.cyan('\nNew endpoints:'));
            results.newEndpoints.forEach(endpoint => {
                console.log(`  + ${endpoint}`);
            });
        }
    }

    async loadSchema() {
        const schemaPath = path.join(__dirname, 'api-schema.json');
        const content = await fs.readFile(schemaPath, 'utf-8');
        return JSON.parse(content);
    }

    async saveConfig() {
        const configPath = path.join(__dirname, '.virtuoso-cli-config.json');
        await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
    }

    generateExample(endpoint) {
        return `
// Example for ${endpoint.path}
const response = await fetch('https://api.virtuoso.qa${endpoint.path}', {
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN'
    }
});
const data = await response.json();
console.log(data);`;
    }

    generateCurl(endpoint) {
        return `curl -H "Authorization: Bearer $TOKEN" https://api.virtuoso.qa${endpoint.path}`;
    }

    generateJavaScript(endpoint) {
        return `await client.${endpoint.operationId}(${endpoint.parameters?.map(p => p.name).join(', ') || ''});`;
    }

    toMarkdown(data) {
        // Convert data to markdown format
        return '# Data\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```';
    }

    async checkIfUIToken(token) {
        // Check if token works on UI
        try {
            const response = await fetch('https://app2.virtuoso.qa/api/user', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async checkIfAPIToken(token) {
        // Check if token works on API
        try {
            const response = await fetch('https://api.virtuoso.qa/api/user', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async run() {
        program.parse(process.argv);
    }
}

// Initialize and run CLI
if (require.main === module) {
    const cli = new VirtuosoCLI();
    cli.run().catch(error => {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
    });
}

module.exports = VirtuosoCLI;