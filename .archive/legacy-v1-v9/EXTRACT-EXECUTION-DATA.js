// Browser Console Script to Extract Execution Data from Virtuoso
// UPDATED FOR NEW EXECUTION: https://app2.virtuoso.qa/#/project/4889/execution/88715/journey/527218
// Previous URL: https://app2.virtuoso.qa/#/project/4889/execution/86339/journey/527257

(function extractExecutionData() {
    console.log('🚀 Virtuoso Execution Data Extractor');
    console.log('=' .repeat(50));
    
    // Extract execution details from URL
    const url = window.location.href;
    const executionMatch = url.match(/execution\/(\d+)/);
    const journeyMatch = url.match(/journey\/(\d+)/);
    const projectMatch = url.match(/project\/(\d+)/);
    
    const executionData = {
        url: url,
        timestamp: new Date().toISOString(),
        executionId: executionMatch ? executionMatch[1] : null,
        journeyId: journeyMatch ? journeyMatch[1] : null,
        projectId: projectMatch ? projectMatch[1] : null,
        execution: {
            summary: {},
            checkpoints: [],
            steps: [],
            failures: [],
            performance: {},
            artifacts: {}
        },
        rawData: {}
    };
    
    console.log(`📋 Execution ID: ${executionData.executionId}`);
    console.log(`📋 Journey ID: ${executionData.journeyId}`);
    console.log(`📋 Project ID: ${executionData.projectId}`);
    
    // Method 1: Extract from DOM
    console.log('\n🔍 Extracting from DOM...');
    
    // Look for execution status
    const statusElements = document.querySelectorAll('[class*="status"], [class*="Status"], [data-status]');
    statusElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && (text.toLowerCase().includes('pass') || text.toLowerCase().includes('fail'))) {
            executionData.execution.summary.status = text;
            console.log(`  Status: ${text}`);
        }
    });
    
    // Look for execution duration
    const durationElements = document.querySelectorAll('[class*="duration"], [class*="time"], [class*="Duration"]');
    durationElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.match(/\d+/)) {
            executionData.execution.summary.duration = text;
            console.log(`  Duration: ${text}`);
        }
    });
    
    // Extract checkpoint results
    const checkpointElements = document.querySelectorAll('[class*="checkpoint"], [data-checkpoint], [class*="test-case"]');
    checkpointElements.forEach((el, index) => {
        const checkpoint = {
            index: index + 1,
            name: el.querySelector('[class*="name"], [class*="title"]')?.textContent?.trim(),
            status: el.querySelector('[class*="status"]')?.textContent?.trim() || 
                    el.getAttribute('data-status') ||
                    (el.className.match(/(?:passed|failed|skipped)/i) || [])[0],
            duration: el.querySelector('[class*="duration"]')?.textContent?.trim(),
            text: el.textContent?.trim().substring(0, 200)
        };
        
        // Look for steps within checkpoint
        const stepElements = el.querySelectorAll('[class*="step"], [data-step]');
        checkpoint.steps = [];
        
        stepElements.forEach(stepEl => {
            const step = {
                action: stepEl.querySelector('[class*="action"]')?.textContent?.trim(),
                status: stepEl.querySelector('[class*="status"]')?.textContent?.trim(),
                duration: stepEl.querySelector('[class*="duration"]')?.textContent?.trim(),
                text: stepEl.textContent?.trim().substring(0, 100)
            };
            checkpoint.steps.push(step);
        });
        
        if (checkpoint.name || checkpoint.text) {
            executionData.execution.checkpoints.push(checkpoint);
        }
    });
    
    console.log(`  Found ${executionData.execution.checkpoints.length} checkpoints`);
    
    // Extract individual step results
    const stepElements = document.querySelectorAll('[class*="step"], [data-step], [class*="test-step"]');
    stepElements.forEach((el, index) => {
        const step = {
            index: index + 1,
            action: el.querySelector('[class*="action"]')?.textContent?.trim() ||
                    el.getAttribute('data-action'),
            selector: el.querySelector('[class*="selector"]')?.textContent?.trim(),
            value: el.querySelector('[class*="value"]')?.textContent?.trim(),
            status: el.querySelector('[class*="status"]')?.textContent?.trim() ||
                    el.getAttribute('data-status') ||
                    (el.className.match(/(?:passed|failed|skipped)/i) || [])[0],
            duration: el.querySelector('[class*="duration"], [class*="time"]')?.textContent?.trim(),
            error: el.querySelector('[class*="error"], [class*="failure"]')?.textContent?.trim(),
            text: el.textContent?.trim().substring(0, 150)
        };
        
        // Clean up empty values
        Object.keys(step).forEach(key => {
            if (!step[key]) delete step[key];
        });
        
        if (Object.keys(step).length > 2) {
            executionData.execution.steps.push(step);
        }
    });
    
    console.log(`  Found ${executionData.execution.steps.length} steps`);
    
    // Extract failure information
    const failureElements = document.querySelectorAll('[class*="failure"], [class*="error"], [class*="failed"]');
    failureElements.forEach(el => {
        const failure = {
            type: el.getAttribute('data-error-type') || 'Unknown',
            message: el.querySelector('[class*="message"]')?.textContent?.trim(),
            selector: el.querySelector('[class*="selector"]')?.textContent?.trim(),
            suggestion: el.querySelector('[class*="suggestion"], [class*="fix"]')?.textContent?.trim(),
            text: el.textContent?.trim().substring(0, 200)
        };
        
        if (failure.message || failure.text) {
            executionData.execution.failures.push(failure);
        }
    });
    
    console.log(`  Found ${executionData.execution.failures.length} failures`);
    
    // Look for screenshots
    const screenshotElements = document.querySelectorAll('img[src*="screenshot"], img[class*="screenshot"], [data-screenshot]');
    executionData.execution.artifacts.screenshots = [];
    screenshotElements.forEach(el => {
        const src = el.src || el.getAttribute('data-screenshot');
        if (src) {
            executionData.execution.artifacts.screenshots.push(src);
        }
    });
    
    console.log(`  Found ${executionData.execution.artifacts.screenshots.length} screenshots`);
    
    // Method 2: Check window object for execution data
    console.log('\n🔍 Checking window object...');
    const windowKeys = Object.keys(window).filter(key => 
        key.toLowerCase().includes('execution') || 
        key.toLowerCase().includes('test') || 
        key.toLowerCase().includes('result') ||
        key.toLowerCase().includes('journey') ||
        key.includes('__')
    );
    
    windowKeys.forEach(key => {
        if (window[key] && typeof window[key] === 'object') {
            executionData.rawData[key] = window[key];
            console.log(`  Found: window.${key}`);
        }
    });
    
    // Method 3: Check for React/Angular/Vue state
    console.log('\n🔍 Checking framework state...');
    
    // React
    const reactRoot = document.querySelector('#root, #app, [data-reactroot]');
    if (reactRoot && reactRoot._reactInternalFiber) {
        try {
            let fiber = reactRoot._reactInternalFiber;
            while (fiber) {
                if (fiber.memoizedProps?.execution || fiber.memoizedState?.execution) {
                    executionData.rawData.reactExecution = fiber.memoizedProps?.execution || fiber.memoizedState?.execution;
                    console.log('  Found React execution data');
                    break;
                }
                fiber = fiber.child;
            }
        } catch (e) {}
    }
    
    // Angular
    if (typeof angular !== 'undefined') {
        try {
            const scope = angular.element(document.querySelector('[ng-controller], [ng-app]')).scope();
            if (scope?.execution || scope?.testResults) {
                executionData.rawData.angularExecution = scope.execution || scope.testResults;
                console.log('  Found Angular execution data');
            }
        } catch (e) {}
    }
    
    // Vue
    if (window.Vue || document.querySelector('[data-v-]')) {
        try {
            const vueApp = document.querySelector('#app, [id*="app"]').__vue__;
            if (vueApp?.$data?.execution || vueApp?.$store?.state?.execution) {
                executionData.rawData.vueExecution = vueApp.$data.execution || vueApp.$store.state.execution;
                console.log('  Found Vue execution data');
            }
        } catch (e) {}
    }
    
    // Method 4: Intercept network requests
    console.log('\n🔄 Setting up network interceptors...');
    
    // Store original fetch
    const originalFetch = window.fetch;
    window.capturedExecutionCalls = [];
    
    // Intercept fetch
    window.fetch = function(...args) {
        const url = args[0];
        
        // Look for execution-related API calls - UPDATED FOR NEW IDs
        if (url.includes('execution') || url.includes('88715') || url.includes('527218') ||
            url.includes('86339') || url.includes('527257') || // Keep old IDs for comparison
            url.includes('results') || url.includes('failures') || url.includes('analysis')) {
            
            console.log(`📡 Captured API call: ${url}`);
            
            return originalFetch.apply(this, args).then(response => {
                response.clone().json().then(data => {
                    window.capturedExecutionCalls.push({
                        url: url,
                        method: args[1]?.method || 'GET',
                        data: data,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Auto-extract execution data
                    if (data.execution || data.checkpoints || data.steps || data.results) {
                        console.log('✅ EXECUTION DATA CAPTURED!');
                        Object.assign(executionData.execution, data);
                    }
                }).catch(() => {});
                return response;
            });
        }
        
        return originalFetch.apply(this, args);
    };
    
    // Intercept XHR
    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url) {
        if (url.includes('execution') || url.includes('88715') || url.includes('86339')) {
            console.log(`📡 Captured XHR: ${method} ${url}`);
            this.addEventListener('load', function() {
                try {
                    const data = JSON.parse(this.responseText);
                    window.capturedExecutionCalls.push({ url, method, data });
                } catch(e) {}
            });
        }
        return originalXHR.apply(this, arguments);
    };
    
    // Method 5: Look for performance metrics
    console.log('\n📊 Extracting performance metrics...');
    
    const performanceElements = document.querySelectorAll('[class*="metric"], [class*="performance"], [data-metric]');
    performanceElements.forEach(el => {
        const metric = {
            name: el.querySelector('[class*="name"]')?.textContent?.trim(),
            value: el.querySelector('[class*="value"]')?.textContent?.trim(),
            text: el.textContent?.trim()
        };
        
        if (metric.name || metric.value) {
            if (!executionData.execution.performance.metrics) {
                executionData.execution.performance.metrics = [];
            }
            executionData.execution.performance.metrics.push(metric);
        }
    });
    
    // Create download function
    window.downloadExecutionData = function() {
        const blob = new Blob([JSON.stringify(executionData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `execution_${executionData.executionId}_data.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✅ Execution data downloaded');
    };
    
    // Store in window for access
    window.extractedExecutionData = executionData;
    
    // Display summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Extraction Summary:');
    console.log('=' .repeat(50));
    console.log(`Execution ID: ${executionData.executionId}`);
    console.log(`Journey ID: ${executionData.journeyId}`);
    console.log(`Status: ${executionData.execution.summary.status || 'Unknown'}`);
    console.log(`Checkpoints: ${executionData.execution.checkpoints.length}`);
    console.log(`Steps: ${executionData.execution.steps.length}`);
    console.log(`Failures: ${executionData.execution.failures.length}`);
    console.log(`Screenshots: ${executionData.execution.artifacts.screenshots?.length || 0}`);
    
    console.log('\n💡 Actions:');
    console.log('  • Type: extractedExecutionData - to see all data');
    console.log('  • Type: downloadExecutionData() - to download as JSON');
    console.log('  • Type: copy(JSON.stringify(extractedExecutionData)) - to copy');
    console.log('  • Refresh the page to capture API calls');
    console.log('  • Type: window.capturedExecutionCalls - to see captured API data');
    
    console.log('\n🔥 Pro Tips:');
    console.log('  1. Click through different tabs (Timeline, Logs, etc.) to load more data');
    console.log('  2. Open browser Network tab to see actual API responses');
    console.log('  3. Look for "Show More" or "Details" buttons to expand data');
    
    // Auto-click elements to load more data
    setTimeout(() => {
        console.log('\n🤖 Auto-expanding collapsed sections...');
        
        // Try to click expand buttons
        const expandButtons = document.querySelectorAll('[class*="expand"], [class*="toggle"], [aria-expanded="false"]');
        expandButtons.forEach(btn => {
            try {
                btn.click();
                console.log('  Expanded section');
            } catch(e) {}
        });
        
        // Try to load failure details
        const failureButtons = document.querySelectorAll('[class*="failure"] button, [class*="error"] button');
        failureButtons.forEach(btn => {
            try {
                btn.click();
                console.log('  Loaded failure details');
            } catch(e) {}
        });
    }, 1000);
    
    return executionData;
})();