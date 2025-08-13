// Browser-Based Journey Data Extractor for Virtuoso
// Copy and paste this entire script into the browser console while on the journey page

(function extractJourneyData() {
    console.log('🔍 Virtuoso Journey Data Extractor');
    console.log('=' .repeat(50));
    
    // Object to store extracted data
    const journeyData = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        journey: {},
        steps: [],
        checkpoints: [],
        variables: {},
        rawData: {}
    };
    
    // Extract journey ID and metadata from URL
    const urlMatch = window.location.href.match(/project\/(\d+)\/goal\/(\d+)\/v\/(\d+)\/journey\/(\d+)/);
    if (urlMatch) {
        journeyData.journey = {
            project_id: urlMatch[1],
            goal_id: urlMatch[2],
            version: urlMatch[3],
            journey_id: urlMatch[4]
        };
    }
    
    // Method 1: Check for data in window object
    console.log('Checking window object for data...');
    const windowKeys = Object.keys(window).filter(key => 
        key.includes('journey') || 
        key.includes('test') || 
        key.includes('step') ||
        key.includes('checkpoint') ||
        key.includes('__')
    );
    
    windowKeys.forEach(key => {
        if (window[key] && typeof window[key] === 'object') {
            journeyData.rawData[key] = window[key];
            console.log(`  Found: window.${key}`);
        }
    });
    
    // Method 2: Extract from DOM elements
    console.log('\nExtracting from DOM...');
    
    // Extract steps
    const stepElements = document.querySelectorAll('[class*="step"], [data-step], [id*="step"]');
    stepElements.forEach((element, index) => {
        const step = {
            index: index + 1,
            text: element.textContent?.trim(),
            action: element.querySelector('[class*="action"]')?.textContent?.trim(),
            selector: element.querySelector('[class*="selector"]')?.textContent?.trim(),
            value: element.querySelector('[class*="value"]')?.textContent?.trim(),
            description: element.querySelector('[class*="description"]')?.textContent?.trim()
        };
        
        // Clean up empty values
        Object.keys(step).forEach(key => {
            if (!step[key]) delete step[key];
        });
        
        if (Object.keys(step).length > 1) {
            journeyData.steps.push(step);
        }
    });
    
    console.log(`  Found ${journeyData.steps.length} steps`);
    
    // Extract checkpoints
    const checkpointElements = document.querySelectorAll('[class*="checkpoint"], [data-checkpoint], [class*="assertion"]');
    checkpointElements.forEach((element, index) => {
        const checkpoint = {
            index: index + 1,
            text: element.textContent?.trim(),
            type: element.getAttribute('data-type') || element.className,
            expected: element.querySelector('[class*="expected"]')?.textContent?.trim(),
            actual: element.querySelector('[class*="actual"]')?.textContent?.trim()
        };
        
        // Clean up empty values
        Object.keys(checkpoint).forEach(key => {
            if (!checkpoint[key]) delete checkpoint[key];
        });
        
        if (Object.keys(checkpoint).length > 1) {
            journeyData.checkpoints.push(checkpoint);
        }
    });
    
    console.log(`  Found ${journeyData.checkpoints.length} checkpoints`);
    
    // Method 3: Extract from Angular scope (if using Angular)
    if (typeof angular !== 'undefined') {
        console.log('\nExtracting from Angular...');
        try {
            const scope = angular.element(document.querySelector('[ng-controller], [ng-app]')).scope();
            if (scope) {
                journeyData.rawData.angularScope = {
                    journey: scope.journey,
                    steps: scope.steps,
                    checkpoints: scope.checkpoints,
                    variables: scope.variables
                };
                console.log('  Angular scope data extracted');
            }
        } catch (e) {
            console.log('  Angular not detected or no scope found');
        }
    }
    
    // Method 4: Extract from React (if using React)
    const reactRoot = document.querySelector('#root, #app, [data-reactroot]');
    if (reactRoot && reactRoot._reactInternalFiber) {
        console.log('\nExtracting from React...');
        try {
            let fiber = reactRoot._reactInternalFiber;
            while (fiber) {
                if (fiber.memoizedProps || fiber.memoizedState) {
                    journeyData.rawData.reactProps = fiber.memoizedProps;
                    journeyData.rawData.reactState = fiber.memoizedState;
                    console.log('  React data extracted');
                    break;
                }
                fiber = fiber.child;
            }
        } catch (e) {
            console.log('  React data not accessible');
        }
    }
    
    // Method 5: Extract from Vue (if using Vue)
    if (window.Vue || document.querySelector('[data-v-]')) {
        console.log('\nExtracting from Vue...');
        try {
            const vueApp = document.querySelector('#app, [id*="app"]').__vue__;
            if (vueApp) {
                journeyData.rawData.vueData = {
                    data: vueApp.$data,
                    props: vueApp.$props,
                    store: vueApp.$store?.state
                };
                console.log('  Vue data extracted');
            }
        } catch (e) {
            console.log('  Vue data not accessible');
        }
    }
    
    // Method 6: Extract from localStorage
    console.log('\nChecking localStorage...');
    const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.includes('journey') || 
        key.includes('527286') ||
        key.includes('test') ||
        key.includes('step')
    );
    
    localStorageKeys.forEach(key => {
        try {
            journeyData.rawData[`localStorage_${key}`] = JSON.parse(localStorage.getItem(key));
            console.log(`  Found: localStorage.${key}`);
        } catch (e) {
            journeyData.rawData[`localStorage_${key}`] = localStorage.getItem(key);
        }
    });
    
    // Method 7: Extract from sessionStorage
    console.log('\nChecking sessionStorage...');
    const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('journey') || 
        key.includes('527286') ||
        key.includes('test') ||
        key.includes('step')
    );
    
    sessionStorageKeys.forEach(key => {
        try {
            journeyData.rawData[`sessionStorage_${key}`] = JSON.parse(sessionStorage.getItem(key));
            console.log(`  Found: sessionStorage.${key}`);
        } catch (e) {
            journeyData.rawData[`sessionStorage_${key}`] = sessionStorage.getItem(key);
        }
    });
    
    // Method 8: Intercept XHR/Fetch requests
    console.log('\nSetting up network interceptors...');
    console.log('  Refresh the page to capture API calls');
    
    // Intercept XHR
    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url) {
        this.addEventListener('load', function() {
            if (url.includes('journey') || url.includes('527286')) {
                console.log(`  Captured API call: ${method} ${url}`);
                try {
                    const response = JSON.parse(this.responseText);
                    journeyData.rawData[`xhr_${url}`] = response;
                } catch (e) {}
            }
        });
        return originalXHR.apply(this, arguments);
    };
    
    // Intercept Fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
            const url = args[0];
            if (url.includes('journey') || url.includes('527286')) {
                console.log(`  Captured fetch: ${url}`);
                response.clone().json().then(data => {
                    journeyData.rawData[`fetch_${url}`] = data;
                }).catch(() => {});
            }
            return response;
        });
    };
    
    // Display results
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Extraction Results:');
    console.log('=' .repeat(50));
    
    console.log('\n📋 Summary:');
    console.log(`  Journey ID: ${journeyData.journey.journey_id}`);
    console.log(`  Steps found: ${journeyData.steps.length}`);
    console.log(`  Checkpoints found: ${journeyData.checkpoints.length}`);
    console.log(`  Raw data objects: ${Object.keys(journeyData.rawData).length}`);
    
    // Create download function
    window.downloadJourneyData = function() {
        const blob = new Blob([JSON.stringify(journeyData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `journey_${journeyData.journey.journey_id}_data.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✅ Data downloaded as JSON file');
    };
    
    // Store in window for access
    window.extractedJourneyData = journeyData;
    
    console.log('\n💡 Actions:');
    console.log('  • Type: extractedJourneyData - to see all data');
    console.log('  • Type: downloadJourneyData() - to download as JSON');
    console.log('  • Type: copy(JSON.stringify(extractedJourneyData)) - to copy to clipboard');
    console.log('  • Refresh the page to capture network requests');
    
    console.log('\n✨ Additional Tips:');
    console.log('  1. Look for Export/Download buttons in the UI');
    console.log('  2. Check the Network tab in DevTools for API calls');
    console.log('  3. Try right-clicking on elements for context menus');
    
    return journeyData;
})();