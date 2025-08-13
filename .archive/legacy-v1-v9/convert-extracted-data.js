#!/usr/bin/env node

/**
 * Convert the extracted Virtuoso data to NLP format
 * Using the data from the WORKING API extraction
 */

const fs = require('fs');
const EnhancedVirtuosoNLPConverter = require('./ENHANCED-NLP-CONVERTER');

class VirtuosoDataProcessor {
    constructor() {
        this.converter = new EnhancedVirtuosoNLPConverter();
    }

    loadTestSuite(filename) {
        console.log(`📁 Loading: ${filename}`);
        const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        
        console.log(`✅ Loaded TestSuite: ${data.name} - ${data.title}`);
        console.log(`   ID: ${data.id}`);
        console.log(`   Cases (Checkpoints): ${data.cases?.length || 0}`);
        
        return data;
    }

    transformToCheckpointFormat(testsuite) {
        // Transform from testsuite format to checkpoint format for NLP converter
        const transformed = {
            executionId: testsuite.id,
            journeyId: testsuite.id,
            name: testsuite.name,
            title: testsuite.title,
            checkpoints: []
        };

        if (testsuite.cases) {
            transformed.checkpoints = testsuite.cases.map(testCase => {
                const checkpoint = {
                    name: `${testCase.name}: ${testCase.title}`,
                    steps: []
                };

                if (testCase.steps) {
                    checkpoint.steps = testCase.steps.map(step => {
                        // Transform step to NLP-compatible format
                        const nlpStep = {
                            action: step.action,
                            id: step.id,
                            optional: step.optional,
                            skip: step.skip
                        };

                        // Map action types
                        switch(step.action) {
                            case 'NAVIGATE':
                                nlpStep.action = 'navigate';
                                nlpStep.target = step.value || step.variable;
                                nlpStep.url = step.value || step.variable;
                                break;
                                
                            case 'WRITE':
                                nlpStep.action = 'write';
                                nlpStep.value = step.value || step.variable;
                                if (step.element?.target?.selectors) {
                                    // Try to find the best selector
                                    const selector = this.findBestSelector(step.element.target.selectors);
                                    nlpStep.selector = selector;
                                }
                                break;
                                
                            case 'CLICK':
                                nlpStep.action = 'click';
                                if (step.element?.target?.selectors) {
                                    const selector = this.findBestSelector(step.element.target.selectors);
                                    nlpStep.selector = selector;
                                }
                                break;
                                
                            case 'WAIT_FOR_ELEMENT':
                                nlpStep.action = 'wait_for_element';
                                if (step.element?.target?.selectors) {
                                    const selector = this.findBestSelector(step.element.target.selectors);
                                    nlpStep.selector = selector;
                                }
                                break;
                                
                            case 'SELECT':
                                nlpStep.action = 'select';
                                nlpStep.value = step.value || step.variable;
                                if (step.element?.target?.selectors) {
                                    const selector = this.findBestSelector(step.element.target.selectors);
                                    nlpStep.selector = selector;
                                }
                                break;
                                
                            default:
                                // Keep original action for unknown types
                                nlpStep.value = step.value;
                                nlpStep.variable = step.variable;
                                if (step.element) {
                                    nlpStep.element = step.element;
                                }
                        }

                        // Add metadata if available
                        if (step.meta) {
                            nlpStep.meta = step.meta;
                        }

                        return nlpStep;
                    });
                }

                return checkpoint;
            });
        }

        return transformed;
    }

    findBestSelector(selectors) {
        if (!selectors || selectors.length === 0) return 'element';
        
        // Priority order: ID > GUESS > CSS > XPATH
        const priorityOrder = ['ID', 'GUESS', 'CSS_SELECTOR', 'XPATH'];
        
        for (const type of priorityOrder) {
            const selector = selectors.find(s => s.type === type);
            if (selector) {
                if (type === 'ID') {
                    return selector.value;
                } else if (type === 'GUESS') {
                    try {
                        const guess = JSON.parse(selector.value);
                        return guess.clue || 'element';
                    } catch {
                        return selector.value;
                    }
                } else {
                    return selector.value;
                }
            }
        }
        
        // Fallback to first selector
        return selectors[0].value || 'element';
    }

    convertToNLP(data) {
        console.log('\n📝 Converting to NLP Format');
        console.log('=' .repeat(50));
        
        const nlpCommands = this.converter.convertToNLP(data, {
            includeTimings: false,
            includeCheckpoints: true
        });
        
        return nlpCommands;
    }

    processAll() {
        console.log('🚀 Virtuoso Data to NLP Converter');
        console.log('=' .repeat(50));
        
        // Process TestSuite 527211
        console.log('\n📋 Processing TestSuite 527211');
        const testsuite211 = this.loadTestSuite('testsuite-527211.json');
        const transformed211 = this.transformToCheckpointFormat(testsuite211);
        
        // Save transformed data
        fs.writeFileSync('testsuite-527211-transformed.json', JSON.stringify(transformed211, null, 2));
        console.log('💾 Transformed data saved: testsuite-527211-transformed.json');
        
        // Convert to NLP
        const nlp211 = this.convertToNLP(transformed211);
        fs.writeFileSync('testsuite-527211-nlp.txt', nlp211.join('\n'));
        console.log('💾 NLP output saved: testsuite-527211-nlp.txt');
        
        // Display NLP
        console.log('\n📄 NLP Output:');
        console.log('-' .repeat(50));
        nlp211.forEach(line => console.log(line));
        
        // Process TestSuite 527218 if exists
        if (fs.existsSync('testsuites.json')) {
            console.log('\n\n📋 Processing TestSuite 527218');
            const testsuite218 = this.loadTestSuite('testsuites.json');
            const transformed218 = this.transformToCheckpointFormat(testsuite218);
            
            fs.writeFileSync('testsuite-527218-transformed.json', JSON.stringify(transformed218, null, 2));
            console.log('💾 Transformed data saved: testsuite-527218-transformed.json');
            
            const nlp218 = this.convertToNLP(transformed218);
            fs.writeFileSync('testsuite-527218-nlp.txt', nlp218.join('\n'));
            console.log('💾 NLP output saved: testsuite-527218-nlp.txt');
        }
        
        // Process execution data if exists
        if (fs.existsSync('executions.json')) {
            console.log('\n📋 Processing Execution 88715');
            const execution = JSON.parse(fs.readFileSync('executions.json', 'utf-8'));
            console.log(`   Status: ${execution.status}`);
            console.log(`   Duration: ${((execution.endDate - execution.startDate) / 1000).toFixed(2)}s`);
            
            // Check if execution has test results
            if (execution.suiteResults) {
                console.log(`   Suite Results: ${execution.suiteResults.length}`);
            }
        }
        
        console.log('\n' + '=' .repeat(50));
        console.log('✅ Conversion Complete!');
        console.log('=' .repeat(50));
        console.log('\nGenerated Files:');
        console.log('  • testsuite-527211-nlp.txt - NLP commands');
        console.log('  • testsuite-527211-transformed.json - Structured data');
        if (fs.existsSync('testsuite-527218-nlp.txt')) {
            console.log('  • testsuite-527218-nlp.txt - NLP commands');
        }
    }
}

// Main execution
function main() {
    const processor = new VirtuosoDataProcessor();
    processor.processAll();
}

if (require.main === module) {
    main();
}

module.exports = VirtuosoDataProcessor;