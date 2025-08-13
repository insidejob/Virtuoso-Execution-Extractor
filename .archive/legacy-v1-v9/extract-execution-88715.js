// Browser Console Script to Extract Execution 88715 Data
// Run this while on: https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218

(function extractExecution88715() {
    console.log('🚀 Extracting Execution 88715 / Journey 527218');
    console.log('=' .repeat(50));
    
    const executionData = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        executionId: 88715,
        journeyId: 527218,
        projectId: 4889,
        checkpoints: [],
        steps: [],
        rawData: {},
        potentialNewPatterns: []
    };
    
    // Look for different action types we haven't seen before
    const actionTypesToWatch = [
        'hover', 'drag', 'drop', 'upload', 'api', 'execute',
        'switch', 'iframe', 'scroll', 'cookie', 'window',
        'press', 'dismiss', 'select', 'pick', 'store',
        'assert', 'verify', 'validate', 'check'
    ];
    
    console.log('🔍 Scanning for new action patterns...\n');
    
    // Extract steps from DOM
    const stepElements = document.querySelectorAll('[class*="step"], [data-step], [class*="test-step"], [class*="action"]');
    
    stepElements.forEach((element, index) => {
        const stepText = element.textContent?.trim();
        if (!stepText) return;
        
        // Check for new patterns
        actionTypesToWatch.forEach(actionType => {
            if (stepText.toLowerCase().includes(actionType)) {
                executionData.potentialNewPatterns.push({
                    pattern: actionType,
                    text: stepText.substring(0, 200),
                    element: element.className
                });
            }
        });
        
        // Extract step data
        const step = {
            index: index + 1,
            text: stepText,
            action: element.querySelector('[class*="action"]')?.textContent?.trim(),
            selector: element.querySelector('[class*="selector"]')?.textContent?.trim(),
            value: element.querySelector('[class*="value"]')?.textContent?.trim(),
            status: element.querySelector('[class*="status"]')?.textContent?.trim(),
            duration: element.querySelector('[class*="duration"]')?.textContent?.trim()
        };
        
        // Clean up empty values
        Object.keys(step).forEach(key => {
            if (!step[key]) delete step[key];
        });
        
        if (Object.keys(step).length > 2) {
            executionData.steps.push(step);
            
            // Log interesting patterns
            if (step.text) {
                // Check for patterns we might not handle yet
                if (step.text.includes('Pick ') && step.text.includes(' from ')) {
                    console.log('📌 Found SELECT/PICK pattern:', step.text);
                }
                if (step.text.includes('Press ') && step.text.includes('_')) {
                    console.log('📌 Found KEYBOARD COMBO pattern:', step.text);
                }
                if (step.text.includes('Mouse ') && !step.text.includes('click')) {
                    console.log('📌 Found SPECIAL MOUSE pattern:', step.text);
                }
                if (step.text.includes('Store ')) {
                    console.log('📌 Found STORE pattern:', step.text);
                }
                if (step.text.includes('Assert ') || step.text.includes('Verify ')) {
                    console.log('📌 Found ASSERTION pattern:', step.text);
                }
                if (step.text.includes('API call ')) {
                    console.log('📌 Found API CALL pattern:', step.text);
                }
                if (step.text.includes('Execute ')) {
                    console.log('📌 Found EXECUTE pattern:', step.text);
                }
                if (step.text.includes('Upload ')) {
                    console.log('📌 Found UPLOAD pattern:', step.text);
                }
                if (step.text.includes('Switch ') || step.text.includes('iframe')) {
                    console.log('📌 Found SWITCH/IFRAME pattern:', step.text);
                }
                if (step.text.includes('Scroll ')) {
                    console.log('📌 Found SCROLL pattern:', step.text);
                }
                if (step.text.includes('Cookie ')) {
                    console.log('📌 Found COOKIE pattern:', step.text);
                }
                if (step.text.includes('Window ')) {
                    console.log('📌 Found WINDOW pattern:', step.text);
                }
                if (step.text.includes('Dismiss ')) {
                    console.log('📌 Found DISMISS pattern:', step.text);
                }
                if (step.text.includes('Wait ')) {
                    console.log('📌 Found WAIT pattern:', step.text);
                }
                if (step.text.includes('Pause ')) {
                    console.log('📌 Found PAUSE pattern:', step.text);
                }
            }
        }
    });
    
    console.log(`\n📊 Found ${executionData.steps.length} steps`);
    console.log(`🔍 Found ${executionData.potentialNewPatterns.length} potential new patterns\n`);
    
    // Extract checkpoints
    const checkpointElements = document.querySelectorAll('[class*="checkpoint"], [data-checkpoint], [class*="test-case"]');
    
    checkpointElements.forEach((element, index) => {
        const checkpoint = {
            index: index + 1,
            name: element.querySelector('[class*="name"], [class*="title"]')?.textContent?.trim(),
            status: element.querySelector('[class*="status"]')?.textContent?.trim(),
            duration: element.querySelector('[class*="duration"]')?.textContent?.trim(),
            text: element.textContent?.trim().substring(0, 500)
        };
        
        // Clean up empty values
        Object.keys(checkpoint).forEach(key => {
            if (!checkpoint[key]) delete checkpoint[key];
        });
        
        if (Object.keys(checkpoint).length > 1) {
            executionData.checkpoints.push(checkpoint);
        }
    });
    
    console.log(`📊 Found ${executionData.checkpoints.length} checkpoints\n`);
    
    // Set up network interceptor to capture API responses
    const originalFetch = window.fetch;
    window.capturedAPICalls = [];
    
    window.fetch = function(...args) {
        const url = args[0];
        
        if (url.includes('88715') || url.includes('527218') || 
            url.includes('execution') || url.includes('journey')) {
            
            console.log(`📡 Captured API call: ${url}`);
            
            return originalFetch.apply(this, args).then(response => {
                response.clone().json().then(data => {
                    window.capturedAPICalls.push({
                        url: url,
                        data: data,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Check for new action types in API response
                    if (data.steps || data.checkpoints || data.actions) {
                        const steps = data.steps || data.actions || [];
                        steps.forEach(step => {
                            if (step.action && !['navigate', 'click', 'write', 'type', 'wait_for_element'].includes(step.action)) {
                                console.log(`🆕 New action type found: ${step.action}`);
                                executionData.potentialNewPatterns.push({
                                    source: 'api',
                                    action: step.action,
                                    data: step
                                });
                            }
                        });
                    }
                }).catch(() => {});
                return response;
            });
        }
        
        return originalFetch.apply(this, args);
    };
    
    // Check for data in window object
    Object.keys(window).forEach(key => {
        if (key.includes('88715') || key.includes('527218') || 
            key.toLowerCase().includes('execution') || key.toLowerCase().includes('journey')) {
            executionData.rawData[key] = window[key];
            console.log(`📦 Found window.${key}`);
        }
    });
    
    // Create analysis function
    window.analyzeExecution88715 = function() {
        console.log('\n' + '=' .repeat(50));
        console.log('📋 Execution 88715 Analysis Report');
        console.log('=' .repeat(50) + '\n');
        
        console.log('Unique Patterns Found:');
        const uniquePatterns = new Set();
        executionData.potentialNewPatterns.forEach(p => {
            uniquePatterns.add(p.pattern || p.action);
        });
        
        uniquePatterns.forEach(pattern => {
            console.log(`  • ${pattern}`);
        });
        
        console.log('\n💡 Actions to validate in converter:');
        console.log('  1. Check if all patterns have NLP mappings');
        console.log('  2. Verify selector handling for new types');
        console.log('  3. Test variable preservation');
        console.log('  4. Validate timing conversion');
        
        return executionData;
    };
    
    // Create download function
    window.downloadExecution88715 = function() {
        const blob = new Blob([JSON.stringify(executionData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'execution_88715_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✅ Execution 88715 data downloaded');
    };
    
    // Store in window
    window.execution88715Data = executionData;
    
    console.log('\n💡 Next Steps:');
    console.log('  1. Type: analyzeExecution88715() - for pattern analysis');
    console.log('  2. Type: downloadExecution88715() - to save data');
    console.log('  3. Refresh page to capture API calls');
    console.log('  4. Type: window.capturedAPICalls - to see API data');
    console.log('\n🔄 Refresh the page now to capture all API calls!');
    
    return executionData;
})();