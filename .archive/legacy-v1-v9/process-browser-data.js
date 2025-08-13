#!/usr/bin/env node

/**
 * Terminal wrapper for browser extraction
 * Processes browser-extracted data and converts to NLP
 */

const fs = require('fs');
const path = require('path');
const EnhancedVirtuosoNLPConverter = require('./ENHANCED-NLP-CONVERTER');

// Check for input file
const inputFile = process.argv[2];

if (!inputFile) {
    console.log(`
Usage: node process-browser-data.js <browser_data.json>

After extracting data from browser:
1. Download the JSON file using downloadExecutionData()
2. Run: node process-browser-data.js execution_88715_browser_data.json
`);
    process.exit(1);
}

// Load and process data
try {
    const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    
    console.log('\n📊 Processing Browser-Extracted Data');
    console.log('=' .repeat(50));
    console.log(`Execution: ${rawData.executionId}`);
    console.log(`Journey: ${rawData.journeyId}`);
    console.log(`Checkpoints: ${rawData.checkpoints?.length || 0}`);
    console.log(`Steps: ${rawData.steps?.length || 0}`);
    
    // Structure for NLP conversion
    const structuredData = {
        executionId: rawData.executionId,
        journeyId: rawData.journeyId,
        checkpoints: rawData.checkpoints || []
    };
    
    // If no checkpoints but have steps, create one
    if (structuredData.checkpoints.length === 0 && rawData.steps?.length > 0) {
        structuredData.checkpoints = [{
            name: 'Extracted Steps',
            steps: rawData.steps
        }];
    }
    
    // Save structured data
    const structuredFile = inputFile.replace('.json', '_structured.json');
    fs.writeFileSync(structuredFile, JSON.stringify(structuredData, null, 2));
    console.log(`\n💾 Structured data saved to: ${structuredFile}`);
    
    // Convert to NLP
    const converter = new EnhancedVirtuosoNLPConverter();
    const nlpCommands = converter.convertToNLP(structuredData, {
        includeTimings: true,
        includeCheckpoints: true
    });
    
    // Save NLP output
    const nlpFile = inputFile.replace('.json', '_nlp.txt');
    fs.writeFileSync(nlpFile, nlpCommands.join('\n'));
    console.log(`💾 NLP output saved to: ${nlpFile}`);
    
    // Display NLP
    console.log('\n📝 NLP Conversion:');
    console.log('=' .repeat(50));
    nlpCommands.forEach(line => console.log(line));
    
} catch (error) {
    console.error('❌ Error processing data:', error.message);
    process.exit(1);
}
