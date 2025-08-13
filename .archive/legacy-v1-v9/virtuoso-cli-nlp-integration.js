#!/usr/bin/env node

/**
 * Virtuoso CLI with NLP Integration
 * Example of how --nlp flag integrates with the CLI wrapper
 */

const VirtuosoNLPConverter = require('./API-TO-NLP-CONVERTER');

// Example integration into the CLI wrapper's handleExtract method
class VirtuosoCLINLP {
    constructor() {
        this.nlpConverter = new VirtuosoNLPConverter();
    }

    /**
     * Enhanced extract method with NLP support
     */
    async handleExtract(type, id, options) {
        console.log('🔍 Extracting data...');
        
        // Fetch the data (journey or execution)
        const data = await this.fetchData(type, id);
        
        // Check if NLP conversion is requested
        if (options.nlp) {
            console.log('📝 Converting to NLP syntax...\n');
            return this.convertToNLP(data, options);
        }
        
        // Otherwise return raw data
        return this.outputData(data, options.format || 'json');
    }

    /**
     * Convert API data to NLP format
     */
    convertToNLP(data, options) {
        const nlpCommands = this.nlpConverter.convertToNLP(data, options.timings);
        
        if (options.format === 'markdown') {
            return this.formatAsMarkdown(nlpCommands);
        } else {
            return nlpCommands.join('\n');
        }
    }

    /**
     * Format NLP commands as markdown
     */
    formatAsMarkdown(nlpCommands) {
        let markdown = '# Virtuoso Test Steps (NLP Format)\n\n';
        markdown += '```virtuoso\n';
        markdown += nlpCommands.join('\n');
        markdown += '\n```\n';
        return markdown;
    }

    /**
     * Simulate data fetching
     */
    async fetchData(type, id) {
        // In real implementation, this would call the API
        // For demo, return sample data
        return {
            checkpoints: [
                {
                    name: "Navigate to URL",
                    steps: [
                        {
                            action: "navigate",
                            target: "https://mobile-pretest.dev.iamtechapps.com/#/login",
                            duration: 2071
                        }
                    ]
                },
                {
                    name: "Login",
                    steps: [
                        {
                            action: "write",
                            selector: "Username",
                            value: "$username",
                            duration: 731
                        },
                        {
                            action: "write",
                            selector: "Password",
                            value: "$password",
                            duration: 678
                        },
                        {
                            action: "click",
                            selector: "Login",
                            duration: 4344
                        }
                    ]
                }
            ]
        };
    }

    outputData(data, format) {
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }
        return data;
    }
}

// Example CLI commands with NLP flag
const examples = [
    {
        command: 'virtuoso extract journey 527286 --nlp',
        description: 'Extract journey and convert to NLP syntax',
        output: `Navigate to "https://mobile-pretest.dev.iamtechapps.com/#/login"
Write $username in field "Username"
Write $password in field "Password"
Click on "Login"`
    },
    {
        command: 'virtuoso extract execution 86339 --nlp --timings',
        description: 'Extract execution with NLP syntax and timings',
        output: `Navigate to "https://mobile-pretest.dev.iamtechapps.com/#/login" // 2.071s
Write $username in field "Username" // 0.731s
Write $password in field "Password" // 0.678s
Click on "Login" // 4.344s`
    },
    {
        command: 'virtuoso extract journey 527286 --nlp --format markdown',
        description: 'Extract as markdown with NLP syntax',
        output: `# Virtuoso Test Steps (NLP Format)

\`\`\`virtuoso
Navigate to "https://mobile-pretest.dev.iamtechapps.com/#/login"
Write $username in field "Username"
Write $password in field "Password"
Click on "Login"
\`\`\``
    }
];

// Demo the functionality
if (require.main === module) {
    console.log('🚀 Virtuoso CLI with NLP Integration Demo\n');
    console.log('=' .repeat(60));
    
    const cli = new VirtuosoCLINLP();
    
    async function runDemo() {
        // Example 1: Basic NLP extraction
        console.log('\n📌 Example 1: Basic NLP Extraction');
        console.log('Command: virtuoso extract journey 527286 --nlp\n');
        
        const result1 = await cli.handleExtract('journey', '527286', { nlp: true });
        console.log(result1);
        
        // Example 2: With timings
        console.log('\n' + '=' .repeat(60));
        console.log('\n📌 Example 2: NLP with Timings');
        console.log('Command: virtuoso extract execution 86339 --nlp --timings\n');
        
        const result2 = await cli.handleExtract('execution', '86339', { nlp: true, timings: true });
        console.log(result2);
        
        // Example 3: Markdown format
        console.log('\n' + '=' .repeat(60));
        console.log('\n📌 Example 3: NLP as Markdown');
        console.log('Command: virtuoso extract journey 527286 --nlp --format markdown\n');
        
        const result3 = await cli.handleExtract('journey', '527286', { nlp: true, format: 'markdown' });
        console.log(result3);
        
        // Show available commands
        console.log('\n' + '=' .repeat(60));
        console.log('\n📚 Available NLP Commands:\n');
        
        examples.forEach(example => {
            console.log(`Command: ${example.command}`);
            console.log(`Purpose: ${example.description}`);
            console.log('---');
        });
        
        console.log('\n✅ NLP integration ready for use in CLI wrapper!');
    }
    
    runDemo().catch(console.error);
}

module.exports = VirtuosoCLINLP;