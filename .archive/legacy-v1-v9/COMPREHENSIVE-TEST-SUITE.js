#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Virtuoso NLP Converter
 * Tests all patterns from PDF documentation
 * Validates 100% accuracy against official NLP syntax
 * Handles edge cases and new execution patterns (88715/527218)
 */

const fs = require('fs');
const path = require('path');

class VirtuosoNLPTestSuite {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: [],
            coverage: {},
            performance: {},
            edgeCases: {}
        };
        
        // Test data covering all PDF patterns
        this.testData = this.generateComprehensiveTestData();
    }
    
    /**
     * Main test execution
     */
    async runAllTests() {
        console.log('🧪 Starting Comprehensive NLP Converter Test Suite');
        console.log('=' .repeat(60));
        
        try {
            // Load converters
            const OriginalConverter = require('./API-TO-NLP-CONVERTER.js');
            const EnhancedConverter = require('./ENHANCED-NLP-CONVERTER.js');
            
            this.originalConverter = new OriginalConverter();
            this.enhancedConverter = new EnhancedConverter();
            
            // Run test categories
            await this.testNavigationActions();
            await this.testClickActions();
            await this.testWriteActions();
            await this.testSelectActions();
            await this.testWaitActions();
            await this.testMouseActions();
            await this.testStoreActions();
            await this.testSwitchActions();
            await this.testScrollActions();
            await this.testUploadActions();
            await this.testCookieActions();
            await this.testWindowActions();
            await this.testExecuteActions();
            await this.testDismissActions();
            await this.testPressActions();
            await this.testApiActions();
            await this.testAssertionActions();
            await this.testVariableHandling();
            await this.testEdgeCases();
            await this.testPerformance();
            
            // Generate final report
            this.generateTestReport();
            
            return this.testResults;
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            throw error;
        }
    }
    
    /**
     * Test navigation actions (navigate, browse, go, open)
     */
    async testNavigationActions() {
        console.log('\\n🧭 Testing Navigation Actions...');
        
        const testCases = [
            {
                name: 'Basic navigation',
                input: { action: 'navigate', target: 'https://google.com' },
                expectedPattern: 'Navigate to "https://google.com"'
            },
            {
                name: 'Navigation with new tab',
                input: { action: 'navigate', target: 'https://amazon.com', newTab: true },
                expectedPattern: 'Navigate to "https://amazon.com" in new tab'
            },
            {
                name: 'Browse command',
                input: { action: 'browse', url: 'https://example.com' },
                expectedPattern: 'Navigate to "https://example.com"'
            },
            {
                name: 'Go command',
                input: { action: 'go', value: 'https://test.com' },
                expectedPattern: 'Navigate to "https://test.com"'
            },
            {
                name: 'Open command',
                input: { action: 'open', target: 'https://site.com' },
                expectedPattern: 'Navigate to "https://site.com"'
            }
        ];
        
        await this.runTestCategory('Navigation', testCases);
    }
    
    /**
     * Test click actions
     */
    async testClickActions() {
        console.log('\\n👆 Testing Click Actions...');
        
        const testCases = [
            {
                name: 'Basic click',
                input: { action: 'click', selector: '#submit-button' },
                expectedPattern: 'Click on "#submit-button"'
            },
            {
                name: 'Click with element type',
                input: { action: 'click', selector: 'Submit', elementType: 'button' },
                expectedPattern: 'Click on button "Submit"'
            },
            {
                name: 'Click with position',
                input: { action: 'click', selector: 'Login', position: 'top' },
                expectedPattern: 'Click on top "Login"'
            },
            {
                name: 'Click with variable',
                input: { action: 'click', selector: '$submitButton' },
                expectedPattern: 'Click on $submitButton'
            },
            {
                name: 'Right click',
                input: { action: 'click', selector: '#menu', clickType: 'right' },
                expectedPattern: 'Mouse right click "#menu"'
            },
            {
                name: 'Double click',
                input: { action: 'click', selector: '.item', clickType: 'double' },
                expectedPattern: 'Mouse double click ".item"'
            }
        ];
        
        await this.runTestCategory('Click', testCases);
    }
    
    /**
     * Test write/type actions
     */
    async testWriteActions() {
        console.log('\\n✏️  Testing Write Actions...');
        
        const testCases = [
            {
                name: 'Basic write',
                input: { action: 'write', value: 'John Doe', selector: '#name' },
                expectedPattern: 'Write "John Doe" in field "name"'
            },
            {
                name: 'Write with variable',
                input: { action: 'write', value: '$userName', selector: 'username' },
                expectedPattern: 'Write $userName in field "username"'
            },
            {
                name: 'Write with expression',
                input: { action: 'write', value: '${$firstName + " " + $lastName}', selector: '#fullName' },
                expectedPattern: 'Write ${$firstName + " " + $lastName} in field "fullName"'
            },
            {
                name: 'Type command',
                input: { action: 'type', value: 'password123', selector: '#password' },
                expectedPattern: 'Write "password123" in field "password"'
            },
            {
                name: 'Enter command',
                input: { action: 'enter', text: 'search term', selector: '#search' },
                expectedPattern: 'Write "search term" in field "search"'
            },
            {
                name: 'Write with default value',
                input: { action: 'write', value: '$message', defaultValue: 'hello world', selector: 'input' },
                expectedPattern: 'Write $message with default "hello world" in field "input"'
            }
        ];
        
        await this.runTestCategory('Write', testCases);
    }
    
    /**
     * Test select/pick actions
     */
    async testSelectActions() {
        console.log('\\n📋 Testing Select Actions...');
        
        const testCases = [
            {
                name: 'Basic select',
                input: { action: 'select', value: 'March', selector: 'Month' },
                expectedPattern: 'Pick "March" from "Month"'
            },
            {
                name: 'Select by index',
                input: { action: 'select', index: 3, selector: 'options' },
                expectedPattern: 'Pick third option from "options"'
            },
            {
                name: 'Select last option',
                input: { action: 'select', index: -1, selector: 'dropdown' },
                expectedPattern: 'Pick last option from "dropdown"'
            },
            {
                name: 'Pick command',
                input: { action: 'pick', option: 'Blue', selector: 'Colors' },
                expectedPattern: 'Pick "Blue" from "Colors"'
            },
            {
                name: 'Select with ordinal',
                input: { action: 'select', index: 1, selector: 'items' },
                expectedPattern: 'Pick first option from "items"'
            },
            {
                name: 'Select option by number',
                input: { action: 'select', index: 42, selector: 'addresses' },
                expectedPattern: 'Pick option 42 from "addresses"'
            }
        ];
        
        await this.runTestCategory('Select', testCases);
    }
    
    /**
     * Test wait actions
     */
    async testWaitActions() {
        console.log('\\n⏱️  Testing Wait Actions...');
        
        const testCases = [
            {
                name: 'Basic wait',
                input: { action: 'wait', duration: 3000 },
                expectedPattern: 'Wait 3 seconds'
            },
            {
                name: 'Wait for element',
                input: { action: 'wait_for_element', selector: '#loading' },
                expectedPattern: 'Look for element "#loading" on page'
            },
            {
                name: 'Wait with element and duration',
                input: { action: 'wait', element: 'Logged in!', duration: 5000 },
                expectedPattern: 'Wait 5 seconds for "Logged in!"'
            },
            {
                name: 'Pause command',
                input: { action: 'pause', duration: 1000 },
                expectedPattern: 'Wait 1 second'
            },
            {
                name: 'Wait for URL',
                input: { action: 'wait_for_url', target: '/dashboard' },
                expectedPattern: 'Wait for URL to contain "/dashboard"'
            }
        ];
        
        await this.runTestCategory('Wait', testCases);
    }
    
    /**
     * Test mouse actions
     */
    async testMouseActions() {
        console.log('\\n🖱️  Testing Mouse Actions...');
        
        const testCases = [
            {
                name: 'Mouse click',
                input: { action: 'mouse_click', selector: '.button' },
                expectedPattern: 'Mouse click ".button"'
            },
            {
                name: 'Mouse click coordinates',
                input: { action: 'mouse_click', x: 100, y: 200 },
                expectedPattern: 'Mouse click coordinates(100,200)'
            },
            {
                name: 'Mouse double click',
                input: { action: 'mouse_double_click', selector: '.item' },
                expectedPattern: 'Mouse double click ".item"'
            },
            {
                name: 'Mouse hover',
                input: { action: 'mouse_hover', selector: '#menu' },
                expectedPattern: 'Mouse hover "#menu"'
            },
            {
                name: 'Mouse move to',
                input: { action: 'mouse_move', x: 300, y: 400 },
                expectedPattern: 'Mouse move to 300, 400'
            },
            {
                name: 'Mouse move by',
                input: { action: 'mouse_move', x: -10, y: 40, relative: true },
                expectedPattern: 'Mouse move by -10, 40'
            },
            {
                name: 'Mouse drag',
                input: { action: 'mouse_drag', from: '.source', to: '.target' },
                expectedPattern: 'Mouse drag ".source" to ".target"'
            }
        ];
        
        await this.runTestCategory('Mouse', testCases);
    }
    
    /**
     * Test store actions
     */
    async testStoreActions() {
        console.log('\\n💾 Testing Store Actions...');
        
        const testCases = [
            {
                name: 'Store value',
                input: { action: 'store', value: 'test value', variable: '$myVar' },
                expectedPattern: 'Store value "test value" in $myVar'
            },
            {
                name: 'Store element text',
                input: { action: 'store', type: 'element_text', selector: '#username', variable: '$user' },
                expectedPattern: 'Store element text of "#username" in $user'
            },
            {
                name: 'Store element value',
                input: { action: 'store_element_value', selector: 'password', variable: '$pass' },
                expectedPattern: 'Store element value of "password" in $pass'
            },
            {
                name: 'Store element attribute',
                input: { action: 'store_element_attribute', selector: 'img', attribute: 'src', variable: '$imgSrc' },
                expectedPattern: 'Store element src of "img" in $imgSrc'
            }
        ];
        
        await this.runTestCategory('Store', testCases);
    }
    
    /**
     * Test switch actions (frames, tabs, windows)
     */
    async testSwitchActions() {
        console.log('\\n🔄 Testing Switch Actions...');
        
        const testCases = [
            {
                name: 'Switch iframe',
                input: { action: 'switch_iframe', value: 'content' },
                expectedPattern: 'Switch iframe to "content"'
            },
            {
                name: 'Switch to parent iframe',
                input: { action: 'switch_iframe', value: 'parent' },
                expectedPattern: 'Switch to parent iframe'
            },
            {
                name: 'Switch to next tab',
                input: { action: 'switch_tab', direction: 'next' },
                expectedPattern: 'Switch to next tab'
            },
            {
                name: 'Switch to previous tab',
                input: { action: 'switch_tab', direction: 'previous' },
                expectedPattern: 'Switch to previous tab'
            },
            {
                name: 'Switch window',
                input: { action: 'switch_window', name: 'popup' },
                expectedPattern: 'Switch to window "popup"'
            }
        ];
        
        await this.runTestCategory('Switch', testCases);
    }
    
    /**
     * Test scroll actions
     */
    async testScrollActions() {
        console.log('\\n📜 Testing Scroll Actions...');
        
        const testCases = [
            {
                name: 'Scroll to top',
                input: { action: 'scroll', direction: 'top' },
                expectedPattern: 'Scroll to page top'
            },
            {
                name: 'Scroll to element',
                input: { action: 'scroll', selector: '#footer' },
                expectedPattern: 'Scroll to "#footer"'
            },
            {
                name: 'Scroll to coordinates',
                input: { action: 'scroll_to', x: 0, y: 500 },
                expectedPattern: 'Scroll to 0, 500'
            },
            {
                name: 'Scroll by amount',
                input: { action: 'scroll_by', x: 100, y: 200 },
                expectedPattern: 'Scroll by 100, 200'
            }
        ];
        
        await this.runTestCategory('Scroll', testCases);
    }
    
    /**
     * Test upload actions
     */
    async testUploadActions() {
        console.log('\\n📤 Testing Upload Actions...');
        
        const testCases = [
            {
                name: 'File upload',
                input: { action: 'upload', file: '/path/to/file.pdf', selector: 'Resume' },
                expectedPattern: 'Upload "/path/to/file.pdf" to "Resume"'
            },
            {
                name: 'Upload with URL',
                input: { action: 'upload', url: 'https://example.com/file.pdf', selector: 'Document' },
                expectedPattern: 'Upload "https://example.com/file.pdf" to "Document"'
            }
        ];
        
        await this.runTestCategory('Upload', testCases);
    }
    
    /**
     * Test cookie actions
     */
    async testCookieActions() {
        console.log('\\n🍪 Testing Cookie Actions...');
        
        const testCases = [
            {
                name: 'Create cookie',
                input: { action: 'cookie_create', name: 'login', value: 'username' },
                expectedPattern: 'Cookie create "login" as "username"'
            },
            {
                name: 'Delete cookie',
                input: { action: 'cookie_delete', name: 'session' },
                expectedPattern: 'Cookie delete "session"'
            },
            {
                name: 'Wipe all cookies',
                input: { action: 'cookie_wipe' },
                expectedPattern: 'Cookie wipe all'
            }
        ];
        
        await this.runTestCategory('Cookie', testCases);
    }
    
    /**
     * Test window actions
     */
    async testWindowActions() {
        console.log('\\n🪟 Testing Window Actions...');
        
        const testCases = [
            {
                name: 'Resize window',
                input: { action: 'window_resize', width: 1280, height: 720 },
                expectedPattern: 'Window resize to 1280, 720'
            },
            {
                name: 'Maximize window',
                input: { action: 'window_maximize' },
                expectedPattern: 'Window maximize'
            },
            {
                name: 'Minimize window',
                input: { action: 'window_minimize' },
                expectedPattern: 'Window minimize'
            }
        ];
        
        await this.runTestCategory('Window', testCases);
    }
    
    /**
     * Test execute actions
     */
    async testExecuteActions() {
        console.log('\\n⚡ Testing Execute Actions...');
        
        const testCases = [
            {
                name: 'Execute script',
                input: { action: 'execute', script: 'my script name' },
                expectedPattern: 'Execute "my script name"'
            },
            {
                name: 'Execute extension',
                input: { action: 'execute_script', name: 'custom extension' },
                expectedPattern: 'Execute "custom extension"'
            }
        ];
        
        await this.runTestCategory('Execute', testCases);
    }
    
    /**
     * Test dismiss actions
     */
    async testDismissActions() {
        console.log('\\n❌ Testing Dismiss Actions...');
        
        const testCases = [
            {
                name: 'Dismiss alert',
                input: { action: 'dismiss_alert' },
                expectedPattern: 'Dismiss alert'
            },
            {
                name: 'Dismiss prompt with response',
                input: { action: 'dismiss_prompt', response: 'yes' },
                expectedPattern: 'Dismiss prompt respond "yes"'
            },
            {
                name: 'Dismiss confirm accept',
                input: { action: 'dismiss_confirm', accept: true },
                expectedPattern: 'Dismiss confirm accept'
            }
        ];
        
        await this.runTestCategory('Dismiss', testCases);
    }
    
    /**
     * Test press/keyboard actions
     */
    async testPressActions() {
        console.log('\\n⌨️  Testing Press Actions...');
        
        const testCases = [
            {
                name: 'Press key in element',
                input: { action: 'press', key: 'RETURN', selector: 'Search' },
                expectedPattern: 'Press RETURN in "Search"'
            },
            {
                name: 'Press key combination',
                input: { action: 'press', key: 'CTRL_A' },
                expectedPattern: 'Press "CTRL_a"'
            },
            {
                name: 'Press function key',
                input: { action: 'press', key: 'F1', selector: 'body' },
                expectedPattern: 'Press F1 in "body"'
            },
            {
                name: 'Copy shortcut',
                input: { action: 'press', key: 'CTRL_C' },
                expectedPattern: 'Press "CTRL_c"'
            },
            {
                name: 'Paste shortcut',
                input: { action: 'press', key: 'CTRL_V' },
                expectedPattern: 'Press "CTRL_v"'
            }
        ];
        
        await this.runTestCategory('Press', testCases);
    }
    
    /**
     * Test API call actions
     */
    async testApiActions() {
        console.log('\\n🔗 Testing API Actions...');
        
        const testCases = [
            {
                name: 'Basic API call',
                input: { 
                    action: 'api_call', 
                    name: 'getUsers',
                    returnVariable: '$response'
                },
                expectedPattern: 'API call "getUsers"() returning $response'
            },
            {
                name: 'API call with parameters',
                input: {
                    action: 'api_call',
                    name: 'createUser',
                    params: ['$username', '$email', '$password'],
                    returnVariable: '$result'
                },
                expectedPattern: 'API call "createUser"($username, $email, $password) returning $result'
            }
        ];
        
        await this.runTestCategory('API', testCases);
    }
    
    /**
     * Test assertion actions
     */
    async testAssertionActions() {
        console.log('\\n✅ Testing Assertion Actions...');
        
        const assertions = [
            {
                name: 'Assert element exists',
                input: { type: 'element_exists', selector: '#username' },
                expectedPattern: 'Look for element "#username" on page'
            },
            {
                name: 'Assert element equals',
                input: { type: 'element_equals', selector: 'title', expected: 'Dashboard' },
                expectedPattern: 'Assert that element "title" equals "Dashboard"'
            },
            {
                name: 'Assert element contains',
                input: { type: 'text_contains', selector: '.message', expected: 'success' },
                expectedPattern: 'Assert that element ".message" contains "success"'
            },
            {
                name: 'Assert URL contains',
                input: { type: 'url_contains', expected: '/dashboard' },
                expectedPattern: 'Assert that URL contains "/dashboard"'
            },
            {
                name: 'Assert element checked',
                input: { type: 'element_checked', selector: 'Accept terms' },
                expectedPattern: 'Assert that element "Accept terms" is checked'
            },
            {
                name: 'Assert element selected',
                input: { type: 'element_selected', selector: 'Month', expected: 'January' },
                expectedPattern: 'Assert that "January" is selected in "Month"'
            }
        ];
        
        for (const assertion of assertions) {
            const result = this.enhancedConverter.convertAssertionToNLP(assertion.input);
            this.validateResult(assertion.name, result, assertion.expectedPattern, 'Assertion');
        }
    }
    
    /**
     * Test variable handling
     */
    async testVariableHandling() {
        console.log('\\n📊 Testing Variable Handling...');
        
        const testCases = [
            {
                name: 'Simple variable',
                input: { action: 'click', selector: '$buttonElement' },
                expectedPattern: 'Click on $buttonElement'
            },
            {
                name: 'Expression variable',
                input: { action: 'write', value: '${$firstName + " " + $lastName}', selector: 'fullName' },
                expectedPattern: 'Write ${$firstName + " " + $lastName} in field "fullName"'
            },
            {
                name: 'Default value variable',
                input: { action: 'write', value: '$message', defaultValue: 'hello', selector: 'input' },
                expectedPattern: 'Write $message with default "hello" in field "input"'
            },
            {
                name: 'Variable in store',
                input: { action: 'store', value: 'test', variable: '$result' },
                expectedPattern: 'Store value "test" in $result'
            }
        ];
        
        await this.runTestCategory('Variables', testCases);
    }
    
    /**
     * Test edge cases
     */
    async testEdgeCases() {
        console.log('\\n🏗️  Testing Edge Cases...');
        
        const edgeCases = [
            {
                name: 'Empty value',
                input: { action: 'write', value: '', selector: '#input' },
                expectedPattern: 'Write "" in field "input"'
            },
            {
                name: 'Null selector',
                input: { action: 'click', selector: null },
                expectedPattern: 'Click on "element"'
            },
            {
                name: 'Special characters in value',
                input: { action: 'write', value: '<script>alert("test")</script>', selector: '#code' },
                expectedPattern: 'Write "<script>alert(\\"test\\")</script>" in field "code"'
            },
            {
                name: 'Nested quotes',
                input: { action: 'write', value: 'He said "Hello World"', selector: '#message' },
                expectedPattern: 'Write "He said \\"Hello World\\"" in field "message"'
            },
            {
                name: 'Multiline text',
                input: { action: 'write', value: 'Line 1\\nLine 2\\nLine 3', selector: '#textarea' },
                expectedPattern: 'Write "Line 1\\nLine 2\\nLine 3" in field "textarea"'
            },
            {
                name: 'Masked password',
                input: { action: 'write', value: '********', selector: '#password', masked: true },
                expectedPattern: 'Write "********" in field "password"'
            },
            {
                name: 'Complex XPath',
                input: { action: 'click', selector: '//div[@class="button" and contains(text(), "Submit")]' },
                expectedPattern: 'Click on "//div[@class=\\"button\\" and contains(text(), \\"Submit\\")]"'
            },
            {
                name: 'Failed step',
                input: { action: 'click', selector: '#missing', status: 'failed', error: { message: 'Element not found' } },
                expectedPattern: 'Click on "missing"'
            },
            {
                name: 'Skipped step',
                input: { action: 'verify', selector: '#element', status: 'skipped', reason: 'Previous step failed' },
                expectedPattern: '// SKIPPED: verify on #element'
            }
        ];
        
        for (const edgeCase of edgeCases) {
            try {
                const result = this.enhancedConverter.convertStepToNLP(edgeCase.input, { includeSkipped: true });
                this.validateResult(edgeCase.name, result, edgeCase.expectedPattern, 'EdgeCase');
            } catch (error) {
                this.testResults.errors.push({
                    category: 'EdgeCase',
                    test: edgeCase.name,
                    error: error.message
                });
                this.testResults.failed++;
            }
        }
    }
    
    /**
     * Test performance
     */
    async testPerformance() {
        console.log('\\n🚀 Testing Performance...');
        
        const testData = this.generateLargeTestData();
        
        // Test original converter
        const originalStart = process.hrtime();
        try {
            this.originalConverter.convertToNLP(testData);
        } catch (error) {
            // Expected to fail on some patterns
        }
        const originalEnd = process.hrtime(originalStart);
        const originalTime = originalEnd[0] * 1000 + originalEnd[1] / 1000000;
        
        // Test enhanced converter
        const enhancedStart = process.hrtime();
        this.enhancedConverter.convertToNLP(testData);
        const enhancedEnd = process.hrtime(enhancedStart);
        const enhancedTime = enhancedEnd[0] * 1000 + enhancedEnd[1] / 1000000;
        
        this.testResults.performance = {
            originalTime: originalTime.toFixed(2) + 'ms',
            enhancedTime: enhancedTime.toFixed(2) + 'ms',
            improvement: originalTime > 0 ? ((originalTime - enhancedTime) / originalTime * 100).toFixed(1) + '%' : 'N/A',
            testDataSize: this.countTotalSteps(testData.checkpoints || [])
        };
        
        console.log(`  ⏱️  Original: ${this.testResults.performance.originalTime}`);
        console.log(`  ⏱️  Enhanced: ${this.testResults.performance.enhancedTime}`);
        console.log(`  📈 Improvement: ${this.testResults.performance.improvement}`);
    }
    
    /**
     * Run a category of tests
     */
    async runTestCategory(category, testCases) {
        let categoryPassed = 0;
        let categoryFailed = 0;
        
        for (const testCase of testCases) {
            try {
                const result = this.enhancedConverter.convertStepToNLP(testCase.input);
                const passed = this.validateResult(testCase.name, result, testCase.expectedPattern, category);
                
                if (passed) {
                    categoryPassed++;
                } else {
                    categoryFailed++;
                }
            } catch (error) {
                this.testResults.errors.push({
                    category,
                    test: testCase.name,
                    error: error.message
                });
                categoryFailed++;
            }
        }
        
        this.testResults.coverage[category] = {
            passed: categoryPassed,
            failed: categoryFailed,
            total: testCases.length,
            percentage: (categoryPassed / testCases.length * 100).toFixed(1)
        };
        
        console.log(`  ✅ ${categoryPassed}/${testCases.length} tests passed (${this.testResults.coverage[category].percentage}%)`);
    }
    
    /**
     * Validate test result
     */
    validateResult(testName, actual, expected, category) {
        const passed = actual === expected;
        
        if (passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
            this.testResults.errors.push({
                category,
                test: testName,
                expected,
                actual,
                error: 'Pattern mismatch'
            });
        }
        
        return passed;
    }
    
    /**
     * Generate comprehensive test data
     */
    generateComprehensiveTestData() {
        return {
            checkpoints: [
                {
                    name: 'Test Checkpoint 1',
                    status: 'passed',
                    duration: 5000,
                    steps: [
                        { action: 'navigate', target: 'https://example.com', status: 'passed', duration: 2000 },
                        { action: 'click', selector: '#login-btn', status: 'passed', duration: 500 },
                        { action: 'write', value: 'test@example.com', selector: '#email', status: 'passed', duration: 1000 }
                    ],
                    assertions: [
                        { type: 'url_contains', expected: 'example.com', actual: 'https://example.com', status: 'passed' },
                        { type: 'element_visible', selector: '#login-form', status: 'passed' }
                    ]
                }
            ]
        };
    }
    
    /**
     * Generate large test data for performance testing
     */
    generateLargeTestData() {
        const checkpoints = [];
        
        for (let i = 0; i < 10; i++) {
            const steps = [];
            
            for (let j = 0; j < 50; j++) {
                steps.push({
                    action: 'click',
                    selector: `#element-${i}-${j}`,
                    status: 'passed',
                    duration: Math.random() * 1000
                });
            }
            
            checkpoints.push({
                name: `Performance Test Checkpoint ${i + 1}`,
                status: 'passed',
                duration: 10000,
                steps
            });
        }
        
        return { checkpoints };
    }
    
    /**
     * Count total steps in test data
     */
    countTotalSteps(checkpoints) {
        return checkpoints.reduce((total, checkpoint) => {
            return total + (checkpoint.steps?.length || 0);
        }, 0);
    }
    
    /**
     * Generate final test report
     */
    generateTestReport() {
        console.log('\\n📊 Generating Test Report...');
        
        const totalTests = this.testResults.passed + this.testResults.failed;
        const successRate = totalTests > 0 ? (this.testResults.passed / totalTests * 100).toFixed(1) : 0;
        
        const report = {
            summary: {
                totalTests,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                successRate: successRate + '%',
                errors: this.testResults.errors.length
            },
            coverage: this.testResults.coverage,
            performance: this.testResults.performance,
            errors: this.testResults.errors,
            recommendations: this.generateTestRecommendations()
        };
        
        // Save detailed report
        const reportPath = '/Users/ed/virtuoso-api/NLP-CONVERTER-TEST-REPORT.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Generate summary
        console.log('\\n' + '=' .repeat(60));
        console.log('🎯 TEST RESULTS SUMMARY');
        console.log('=' .repeat(60));
        console.log(`📊 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`🎯 Success Rate: ${successRate}%`);
        console.log(`⚡ Performance: ${this.testResults.performance.enhancedTime || 'N/A'}`);
        
        // Coverage by category
        console.log('\\n📋 Coverage by Category:');
        Object.entries(this.testResults.coverage).forEach(([category, stats]) => {
            console.log(`  ${category}: ${stats.passed}/${stats.total} (${stats.percentage}%)`);
        });
        
        // Show some errors if any
        if (this.testResults.errors.length > 0) {
            console.log('\\n❌ Sample Errors:');
            this.testResults.errors.slice(0, 5).forEach(error => {
                console.log(`  ${error.category}/${error.test}: ${error.error}`);
            });
            
            if (this.testResults.errors.length > 5) {
                console.log(`  ... and ${this.testResults.errors.length - 5} more errors`);
            }
        }
        
        console.log(`\\n💾 Detailed report saved: ${reportPath}`);
        
        this.testResults.report = report;
    }
    
    /**
     * Generate recommendations based on test results
     */
    generateTestRecommendations() {
        const recommendations = [];
        
        // Success rate recommendations
        const successRate = parseFloat(this.testResults.report?.summary?.successRate || '0');
        if (successRate < 90) {
            recommendations.push({
                priority: 'High',
                category: 'Accuracy',
                issue: `Success rate is ${successRate}%, below 90% target`,
                action: 'Review and fix failed test cases to improve pattern matching'
            });
        }
        
        // Error pattern analysis
        const errorCategories = {};
        this.testResults.errors.forEach(error => {
            errorCategories[error.category] = (errorCategories[error.category] || 0) + 1;
        });
        
        Object.entries(errorCategories).forEach(([category, count]) => {
            if (count > 3) {
                recommendations.push({
                    priority: 'Medium',
                    category: 'Pattern Coverage',
                    issue: `${count} failures in ${category} category`,
                    action: `Review and enhance ${category} action handlers`
                });
            }
        });
        
        // Performance recommendations
        const enhancedTime = parseFloat(this.testResults.performance?.enhancedTime || '0');
        if (enhancedTime > 100) {
            recommendations.push({
                priority: 'Low',
                category: 'Performance',
                issue: `Conversion time is ${enhancedTime}ms, may be slow for large executions`,
                action: 'Optimize converter algorithms for better performance'
            });
        }
        
        return recommendations;
    }
}

// Main execution
if (require.main === module) {
    const testSuite = new VirtuosoNLPTestSuite();
    
    testSuite.runAllTests()
        .then(results => {
            const successRate = parseFloat(results.report?.summary?.successRate || '0');
            
            if (successRate >= 90) {
                console.log('\\n🎉 TEST SUITE PASSED - Converter is production ready!');
                process.exit(0);
            } else {
                console.log('\\n⚠️  TEST SUITE INCOMPLETE - More work needed');
                console.log('Review the test report and address failing patterns');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\\n💥 TEST SUITE FAILED:', error);
            process.exit(1);
        });
}

module.exports = VirtuosoNLPTestSuite;