// COPY THIS ENTIRE SCRIPT AND PASTE IN BROWSER CONSOLE
// While on: https://app2.virtuoso.qa/#/project/4889/goal/8519/v/28737/journey/527286

(function() {
    console.log('🎯 Capturing Virtuoso API Calls...\n');
    
    const apiCalls = [];
    
    // Intercept fetch to capture TestSuite API calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        
        // Look for TestSuite/Journey API patterns
        if (url.includes('testsuites/527286') || 
            url.includes('testsuite') ||
            url.includes('journey/527286') ||
            url.includes('steps') ||
            url.includes('checkpoints')) {
            
            console.log('📡 API Call Detected:', url);
            
            return originalFetch.apply(this, args).then(response => {
                response.clone().json().then(data => {
                    apiCalls.push({
                        url: url,
                        method: args[1]?.method || 'GET',
                        data: data
                    });
                    
                    // Auto-extract if it's the journey data
                    if (data.steps || data.checkpoints || data.testSuite) {
                        console.log('✅ JOURNEY DATA FOUND!');
                        console.log(data);
                        window.journeyData = data;
                    }
                }).catch(() => {});
                return response;
            });
        }
        
        return originalFetch.apply(this, args);
    };
    
    // Also intercept XHR
    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url) {
        if (url.includes('testsuite') || url.includes('527286')) {
            console.log('📡 XHR API Call:', method, url);
            this.addEventListener('load', function() {
                try {
                    const data = JSON.parse(this.responseText);
                    apiCalls.push({ url, method, data });
                    if (data.steps || data.checkpoints) {
                        window.journeyData = data;
                        console.log('✅ Data captured!', data);
                    }
                } catch(e) {}
            });
        }
        return originalXHR.apply(this, arguments);
    };
    
    console.log('🔄 NOW REFRESH THE PAGE (F5) to capture all API calls');
    console.log('📋 After refresh, type: journeyData');
    
    window.showAPICalls = () => console.table(apiCalls);
    window.downloadData = () => {
        const blob = new Blob([JSON.stringify(window.journeyData || apiCalls, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'journey_527286_data.json';
        a.click();
    };
    
    console.log('\n💡 Commands:');
    console.log('  showAPICalls() - See all captured API calls');
    console.log('  downloadData() - Download the data');
})();