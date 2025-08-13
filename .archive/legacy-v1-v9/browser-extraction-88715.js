
// Virtuoso Execution 88715 Browser Extraction Script
// Generated: 2025-08-10T22:05:24.786Z

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
                        const seconds = step.text.match(/(\d+) second/)?.[1];
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
                        const match = step.text.match(/Store (.+) in (\$\w+)/);
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
                        const match = step.text.match(/API call "([^"]+)".*returning (\$\w+)/);
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
                data[`window_${key}`] = window[key];
                console.log(`📦 Found window.${key}`);
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
                console.log(`📡 Intercepted: ${url}`);
                
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
        console.log('\n📊 Extraction Summary:');
        console.log(`  Checkpoints: ${data.checkpoints.length}`);
        console.log(`  Total Steps: ${data.steps.length}`);
        console.log(`  Window Data: ${Object.keys(data).filter(k => k.startsWith('window_')).length}`);
        
        if (window.capturedAPICalls?.length > 0) {
            console.log(`  API Calls: ${window.capturedAPICalls.length}`);
        }
        
        console.log('\n💡 Next Steps:');
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
