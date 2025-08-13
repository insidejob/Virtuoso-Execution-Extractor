#!/usr/bin/env node

/**
 * Fix NLP conversion to match UI output exactly
 * The issue: We're using technical names instead of UI labels
 */

const fs = require('fs');

class FixedNLPConverter {
    constructor() {
        this.testsuiteData = null;
    }

    loadTestSuite(filename) {
        console.log(`📁 Loading: ${filename}`);
        this.testsuiteData = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        return this.testsuiteData;
    }

    convertToExactNLP(testsuite) {
        const nlpLines = [];
        
        if (testsuite.cases) {
            testsuite.cases.forEach((testCase, index) => {
                // Format checkpoint header
                const checkpointName = `Checkpoint ${testCase.name.replace('TC', '')}`;
                nlpLines.push(`${checkpointName}: ${testCase.title}`);
                
                // Process steps
                if (testCase.steps) {
                    testCase.steps.forEach(step => {
                        const nlpCommand = this.convertStepToUIFormat(step, testCase);
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

    convertStepToUIFormat(step, testCase) {
        switch(step.action) {
            case 'NAVIGATE':
                // Variables should have $ prefix
                const url = step.variable ? `$${step.variable}` : step.value || '$url';
                return `Navigate to ${url}`;
                
            case 'WRITE':
                // Use variable with $ or actual value
                const writeValue = step.variable ? `$${step.variable}` : `"${step.value || ''}"`;
                const fieldName = this.getUIFieldName(step);
                return `Write ${writeValue} in field "${fieldName}"`;
                
            case 'CLICK':
                const clickTarget = this.getUIElementName(step);
                return `Click on "${clickTarget}"`;
                
            case 'SELECT':
            case 'PICK':
                const selectValue = step.value || step.variable;
                const dropdown = this.getDropdownContext(step);
                return `Pick "${selectValue}" from dropdown "${dropdown}"`;
                
            case 'WAIT_FOR_ELEMENT':
                const waitElement = this.getUIElementName(step);
                return `Look for element "${waitElement}" on page`;
                
            default:
                // For unknown actions, try to format generically
                if (step.meta?.kind) {
                    return this.convertByMetaKind(step);
                }
                return null;
        }
    }

    getUIFieldName(step) {
        // Try to extract the proper UI label
        if (step.element?.target?.selectors) {
            // Check for GUESS selector which often has the UI label
            const guessSelector = step.element.target.selectors.find(s => s.type === 'GUESS');
            if (guessSelector) {
                try {
                    const guess = JSON.parse(guessSelector.value);
                    if (guess.clue) {
                        return guess.clue;
                    }
                } catch {}
            }
            
            // Check for ID selector and format it nicely
            const idSelector = step.element.target.selectors.find(s => s.type === 'ID');
            if (idSelector) {
                // Convert camelCase/snake_case to Title Case
                return this.formatFieldName(idSelector.value);
            }
        }
        
        // Fallback to variable name formatting
        if (step.variable) {
            return this.formatFieldName(step.variable);
        }
        
        return 'field';
    }

    getUIElementName(step) {
        if (step.element?.target?.selectors) {
            // Check for GUESS selector
            const guessSelector = step.element.target.selectors.find(s => s.type === 'GUESS');
            if (guessSelector) {
                try {
                    const guess = JSON.parse(guessSelector.value);
                    if (guess.clue) {
                        return guess.clue;
                    }
                } catch {}
            }
            
            // Check for readable text
            if (step.element.target.text) {
                return step.element.target.text;
            }
            
            // Check for ID and format it
            const idSelector = step.element.target.selectors.find(s => s.type === 'ID');
            if (idSelector) {
                // Convert technical IDs to readable names
                const id = idSelector.value;
                if (id === 'add-question-button') return 'Add';
                if (id === 'save-button') return 'Save';
                if (id.includes('login')) return 'Login';
                if (id.includes('submit')) return 'Submit';
                
                return this.formatFieldName(id);
            }
            
            // Check CSS classes for clues
            if (step.element.target.classes?.length > 0) {
                // Look for meaningful class names
                const meaningfulClass = step.element.target.classes.find(c => 
                    !c.includes('ng-') && !c.includes('ui-') && c.length > 2
                );
                if (meaningfulClass) {
                    return this.formatFieldName(meaningfulClass);
                }
            }
        }
        
        return 'element';
    }

    getDropdownContext(step) {
        // For dropdowns, we need to show the options available
        // This would come from the element's context or metadata
        
        // Check if we have dropdown options in metadata
        if (step.meta?.options) {
            return step.meta.options.join('');
        }
        
        // Try to build from element info
        if (step.element?.target?.selectors) {
            const guessSelector = step.element.target.selectors.find(s => s.type === 'GUESS');
            if (guessSelector) {
                try {
                    const guess = JSON.parse(guessSelector.value);
                    if (guess.options) {
                        return `Please Select...${guess.options.join('')}`;
                    }
                } catch {}
            }
        }
        
        // Default context based on the value being selected
        if (step.value) {
            if (step.value === 'Electrical') {
                return 'Please Select...ElectricalMechanical/ProcessInstrumentInhibits/Overrides';
            }
            if (step.value === 'Fire') {
                return 'Please Select...General WorkPrecautionsFireHazard and Controls ChecklistCBRE CompetenceCBRE CommunicationPPE ChecklistSafety ChecklistPPEQualifications / Compet';
            }
            if (step.value === 'Yes / No') {
                return 'Please Select...Yes / NoTextMulti LineYes / No / NADropdownYes / No / TextMulti TextYes No Toggle';
            }
        }
        
        return 'dropdown';
    }

    formatFieldName(name) {
        if (!name) return 'field';
        
        // Special cases mapping
        const mappings = {
            'username': 'Username',
            'password': 'Password',
            'questionText': 'Question',
            'orderId': 'Order',
            'activityName': 'Activity Name',
            'url': 'URL'
        };
        
        if (mappings[name]) {
            return mappings[name];
        }
        
        // Convert camelCase to Title Case
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    convertByMetaKind(step) {
        const kind = step.meta.kind;
        
        switch(kind) {
            case 'NAVIGATE':
                return `Navigate to ${step.variable ? '$' + step.variable : step.value}`;
            case 'WRITE':
                const value = step.variable ? '$' + step.variable : `"${step.value}"`;
                return `Write ${value} in field "${this.getUIFieldName(step)}"`;
            case 'CLICK':
                return `Click on "${this.getUIElementName(step)}"`;
            case 'SELECT':
                return `Pick "${step.value}" from dropdown "${this.getDropdownContext(step)}"`;
            default:
                return null;
        }
    }

    analyzeAndFix() {
        console.log('🔧 Fixing NLP Conversion to Match UI');
        console.log('=' .repeat(50));
        
        // Load the testsuite data
        const testsuite = this.loadTestSuite('testsuite-527211.json');
        
        // First, let's examine the actual structure
        console.log('\n📊 Analyzing TestSuite Structure:');
        console.log(`   Name: ${testsuite.name}`);
        console.log(`   Title: ${testsuite.title}`);
        console.log(`   Cases: ${testsuite.cases.length}`);
        
        // Look at the actual checkpoint names and steps
        testsuite.cases.forEach((testCase, i) => {
            console.log(`\n   Checkpoint ${i + 1}: ${testCase.name} - ${testCase.title}`);
            console.log(`   Steps: ${testCase.steps.length}`);
            
            // Analyze first step of each to understand the data
            if (testCase.steps[0]) {
                const step = testCase.steps[0];
                console.log(`     First step: ${step.action}`);
                if (step.variable) console.log(`     Variable: ${step.variable}`);
                if (step.element?.target?.selectors) {
                    const guess = step.element.target.selectors.find(s => s.type === 'GUESS');
                    if (guess) {
                        try {
                            const g = JSON.parse(guess.value);
                            console.log(`     UI Label: ${g.clue}`);
                        } catch {}
                    }
                }
            }
        });
        
        // Convert to exact NLP format
        console.log('\n📝 Converting to Exact UI Format:');
        const nlpLines = this.convertToExactNLP(testsuite);
        
        // Save the fixed version
        const filename = 'testsuite-527211-fixed-nlp.txt';
        fs.writeFileSync(filename, nlpLines.join('\n'));
        console.log(`\n💾 Fixed NLP saved to: ${filename}`);
        
        // Display the output
        console.log('\n📄 Fixed NLP Output:');
        console.log('-' .repeat(50));
        nlpLines.forEach(line => console.log(line));
        
        return nlpLines;
    }
}

// Main execution
function main() {
    const converter = new FixedNLPConverter();
    converter.analyzeAndFix();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Fixed NLP conversion complete!');
}

if (require.main === module) {
    main();
}

module.exports = FixedNLPConverter;