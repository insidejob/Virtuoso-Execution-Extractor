#!/usr/bin/env node

/**
 * Terminal-Based Browser Extraction Orchestrator
 * Since API token doesn't work, this provides terminal commands
 * to extract data via browser console
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║     Virtuoso Execution 88715 - Terminal Extraction Guide     ║
╚══════════════════════════════════════════════════════════════╝

🔴 API Authentication Failed - Using Browser Extraction Method

The API token provided is for UI access only, not API access.
We'll extract the data through the browser console instead.

══════════════════════════════════════════════════════════════
`);

// Generate the browser extraction script
const browserScript = `
// Virtuoso Execution 88715 Browser Extraction Script
// Generated: ${new Date().toISOString()}

(async function extractExecution88715() {
    console.log('🚀 Starting Execution 88715 Extraction');
    console.log('=' .repeat(50));
    
    const data = {
        executionId: 88715,
        journeyId: 527218,
        projectId: 4889,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        checkpoints: [],
        steps: [],
        extractedFrom: 'browser'
    };
    
    // Extract from DOM
    const extractFromDOM = () => {
        // Look for checkpoints
        document.querySelectorAll('[class*="checkpoint"], [data-checkpoint]').forEach((el, i) => {
            const checkpoint = {
                index: i + 1,
                name: el.querySelector('[class*="name"]')?.textContent?.trim(),
                status: el.querySelector('[class*="status"]')?.textContent?.trim(),
                steps: []
            };
            
            // Extract steps within checkpoint
            el.querySelectorAll('[class*="step"], [data-step]').forEach((stepEl, j) => {
                const step = {
                    index: j + 1,
                    text: stepEl.textContent?.trim(),
                    action: stepEl.querySelector('[class*="action"]')?.textContent?.trim(),
                    selector: stepEl.querySelector('[class*="selector"]')?.textContent?.trim(),
                    value: stepEl.querySelector('[class*="value"]')?.textContent?.trim(),
                    status: stepEl.querySelector('[class*="status"]')?.textContent?.trim(),
                    duration: stepEl.querySelector('[class*="duration"]')?.textContent?.trim()
                };
                
                // Parse NLP text if available
                if (step.text) {
                    // Navigation
                    if (step.text.includes('Navigate to')) {
                        step.action = 'navigate';
                        step.target = step.text.match(/Navigate to "([^"]+)"/)?.[1];
                    }
                    // Click
                    else if (step.text.includes('Click on')) {
                        step.action = 'click';
                        step.selector = step.text.match(/Click on "([^"]+)"/)?.[1];
                    }
                    // Write
                    else if (step.text.includes('Write')) {
                        step.action = 'write';
                        const match = step.text.match(/Write "([^"]+)" in field "([^"]+)"/);
                        if (match) {
                            step.value = match[1];
                            step.selector = match[2];
                        }
                    }
                    // Wait
                    else if (step.text.includes('Wait')) {
                        step.action = 'wait';
                        const seconds = step.text.match(/(\\d+) second/)?.[1];
                        if (seconds) {
                            step.duration = parseInt(seconds) * 1000;
                        }
                    }
                    // Look for element
                    else if (step.text.includes('Look for element')) {
                        step.action = 'wait_for_element';
                        step.selector = step.text.match(/Look for element "([^"]+)"/)?.[1];
                    }
                    // Pick/Select
                    else if (step.text.includes('Pick')) {
                        step.action = 'select';
                        const match = step.text.match(/Pick "([^"]+)" from "([^"]+)"/);
                        if (match) {
                            step.value = match[1];
                            step.selector = match[2];
                        }
                    }
                    // Store
                    else if (step.text.includes('Store')) {
                        step.action = 'store';
                        const match = step.text.match(/Store (.+) in (\\$\\w+)/);
                        if (match) {
                            step.type = match[1];
                            step.variable = match[2];
                        }
                    }
                    // Mouse actions
                    else if (step.text.includes('Mouse')) {
                        if (step.text.includes('hover')) step.action = 'mouse_hover';
                        else if (step.text.includes('drag')) step.action = 'mouse_drag';
                        else if (step.text.includes('double click')) step.action = 'mouse_double_click';
                        else if (step.text.includes('right click')) step.action = 'mouse_right_click';
                    }
                    // Keyboard
                    else if (step.text.includes('Press')) {
                        step.action = 'press';
                        step.key = step.text.match(/Press "([^"]+)"/)?.[1];
                    }
                    // API call
                    else if (step.text.includes('API call')) {
                        step.action = 'api_call';
                        const match = step.text.match(/API call "([^"]+)".*returning (\\$\\w+)/);
                        if (match) {
                            step.name = match[1];
                            step.variable = match[2];
                        }
                    }
                }
                
                checkpoint.steps.push(step);
                data.steps.push(step);
            });
            
            data.checkpoints.push(checkpoint);
        });
        
        // If no checkpoints found, try direct step extraction
        if (data.checkpoints.length === 0) {
            document.querySelectorAll('[class*="step"], [data-step], [class*="test-step"]').forEach((stepEl, i) => {
                const step = {
                    index: i + 1,
                    text: stepEl.textContent?.trim(),
                    element: stepEl.className
                };
                data.steps.push(step);
            });
        }
    };
    
    // Extract from window object
    const extractFromWindow = () => {
        // Check for execution data in window
        Object.keys(window).forEach(key => {
            if (key.toLowerCase().includes('execution') || 
                key.toLowerCase().includes('journey') ||
                key.includes('88715') || 
                key.includes('527218')) {
                data[\`window_\${key}\`] = window[key];
                console.log(\`📦 Found window.\${key}\`);
            }
        });
    };
    
    // Intercept API calls
    const interceptAPICalls = () => {
        const originalFetch = window.fetch;
        window.capturedAPICalls = [];
        
        window.fetch = function(...args) {
            const url = args[0];
            
            if (url.includes('88715') || url.includes('527218')) {
                console.log(\`📡 Intercepted: \${url}\`);
                
                return originalFetch.apply(this, args).then(response => {
                    response.clone().json().then(data => {
                        window.capturedAPICalls.push({
                            url: url,
                            data: data,
                            timestamp: new Date().toISOString()
                        });
                        
                        // Auto-structure if it's execution data
                        if (data.checkpoints) {
                            window.executionCheckpoints = data.checkpoints;
                        }
                        if (data.steps) {
                            window.executionSteps = data.steps;
                        }
                    }).catch(() => {});
                    return response;
                });
            }
            
            return originalFetch.apply(this, args);
        };
        
        console.log('✅ API interceptor installed');
        console.log('🔄 Please refresh the page to capture API calls');
    };
    
    // Run extraction
    extractFromDOM();
    extractFromWindow();
    interceptAPICalls();
    
    // Create download function
    window.downloadExecutionData = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'execution_88715_browser_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✅ Data downloaded');
        return data;
    };
    
    // Analysis function
    window.analyzeExecution = () => {
        console.log('\\n📊 Extraction Summary:');
        console.log(\`  Checkpoints: \${data.checkpoints.length}\`);
        console.log(\`  Total Steps: \${data.steps.length}\`);
        console.log(\`  Window Data: \${Object.keys(data).filter(k => k.startsWith('window_')).length}\`);
        
        if (window.capturedAPICalls?.length > 0) {
            console.log(\`  API Calls: \${window.capturedAPICalls.length}\`);
        }
        
        console.log('\\n💡 Next Steps:');
        console.log('  1. downloadExecutionData() - Download extracted data');
        console.log('  2. Refresh page to capture API calls');
        console.log('  3. window.capturedAPICalls - View intercepted data');
        
        return data;
    };
    
    // Auto-analyze
    setTimeout(() => {
        window.analyzeExecution();
    }, 2000);
    
    return data;
})();
`;

// Save browser script
fs.writeFileSync('browser-extraction-88715.js', browserScript);

// Create structured wrapper
const terminalWrapper = `#!/usr/bin/env node

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
    console.log(\`
Usage: node process-browser-data.js <browser_data.json>

After extracting data from browser:
1. Download the JSON file using downloadExecutionData()
2. Run: node process-browser-data.js execution_88715_browser_data.json
\`);
    process.exit(1);
}

// Load and process data
try {
    const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    
    console.log('\\n📊 Processing Browser-Extracted Data');
    console.log('=' .repeat(50));
    console.log(\`Execution: \${rawData.executionId}\`);
    console.log(\`Journey: \${rawData.journeyId}\`);
    console.log(\`Checkpoints: \${rawData.checkpoints?.length || 0}\`);
    console.log(\`Steps: \${rawData.steps?.length || 0}\`);
    
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
    console.log(\`\\n💾 Structured data saved to: \${structuredFile}\`);
    
    // Convert to NLP
    const converter = new EnhancedVirtuosoNLPConverter();
    const nlpCommands = converter.convertToNLP(structuredData, {
        includeTimings: true,
        includeCheckpoints: true
    });
    
    // Save NLP output
    const nlpFile = inputFile.replace('.json', '_nlp.txt');
    fs.writeFileSync(nlpFile, nlpCommands.join('\\n'));
    console.log(\`💾 NLP output saved to: \${nlpFile}\`);
    
    // Display NLP
    console.log('\\n📝 NLP Conversion:');
    console.log('=' .repeat(50));
    nlpCommands.forEach(line => console.log(line));
    
} catch (error) {
    console.error('❌ Error processing data:', error.message);
    process.exit(1);
}
`;

fs.writeFileSync('process-browser-data.js', terminalWrapper);

// Instructions
console.log(`
📋 STEP-BY-STEP INSTRUCTIONS:
══════════════════════════════════════════════════════════════

1️⃣  OPEN BROWSER:
   Open Chrome/Firefox and navigate to:
   https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218

2️⃣  OPEN CONSOLE:
   Press F12 or right-click → "Inspect" → Console tab

3️⃣  COPY EXTRACTION SCRIPT:
   Copy ALL contents from:
   ${path.resolve('browser-extraction-88715.js')}

4️⃣  PASTE & RUN:
   Paste the script into browser console and press Enter

5️⃣  REFRESH PAGE:
   After script loads, refresh the page to capture API calls

6️⃣  DOWNLOAD DATA:
   In console, type: downloadExecutionData()
   This saves: execution_88715_browser_data.json

7️⃣  PROCESS IN TERMINAL:
   Come back to terminal and run:
   node process-browser-data.js execution_88715_browser_data.json

══════════════════════════════════════════════════════════════

🎯 ALTERNATIVE: Quick Copy Command
──────────────────────────────────────────────────────────────

Run this to copy the browser script to clipboard:
`);

// Platform-specific clipboard commands
if (process.platform === 'darwin') {
    console.log(`   pbcopy < browser-extraction-88715.js`);
} else if (process.platform === 'linux') {
    console.log(`   xclip -selection clipboard < browser-extraction-88715.js`);
} else {
    console.log(`   type browser-extraction-88715.js | clip`);
}

console.log(`
Then paste directly into browser console.

══════════════════════════════════════════════════════════════

📊 WHAT DATA WILL BE EXTRACTED:
──────────────────────────────────────────────────────────────

✅ Checkpoints and their steps
✅ Step actions, selectors, and values
✅ Step durations and status
✅ NLP text representations
✅ API responses (after refresh)
✅ Window object data
✅ Test execution metadata

══════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING:
──────────────────────────────────────────────────────────────

If extraction fails:
1. Make sure you're logged into app2.virtuoso.qa
2. Verify the URL is correct (execution 88715)
3. Check browser console for errors
4. Try refreshing and re-running script

══════════════════════════════════════════════════════════════

✨ Files Created:
• browser-extraction-88715.js - Browser console script
• process-browser-data.js - Terminal processing script

Ready to extract! Follow steps 1-7 above.
`);