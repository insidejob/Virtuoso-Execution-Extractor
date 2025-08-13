#!/usr/bin/env node

/**
 * API Structure Discovery Tool
 * 
 * Use this to fetch journey data and discover how Virtuoso represents
 * different action types in the API that we haven't seen yet.
 * 
 * Instructions:
 * 1. Create test journeys in Virtuoso using the missing commands
 * 2. Run this script with the journey URL
 * 3. It will extract and analyze the API structure
 */

const https = require('https');
const fs = require('fs');

class APIStructureDiscovery {
    constructor() {
        this.config = {
            baseUrl: 'https://api-app2.virtuoso.qa/api',
            token: '2d313def-7ec2-4526-b0b6-57028c343aba',
            sessionId: 'DAI6BvoHbseAgJ-DzBOnRil0T_G5iB01ucmmK1gj',
            clientId: '1754647483711_e9e9c12_production',
            organizationId: '1964'
        };
        
        this.headers = {
            'accept': 'application/json, text/plain, */*',
            'authorization': `Bearer ${this.config.token}`,
            'origin': 'https://app2.virtuoso.qa',
            'referer': 'https://app2.virtuoso.qa/',
            'x-v-session-id': this.config.sessionId,
            'x-virtuoso-client-id': this.config.clientId,
            'x-virtuoso-client-name': 'Virtuoso UI'
        };
        
        // Track discovered action types
        this.discoveredActions = new Map();
    }
    
    parseURL(url) {
        const projectMatch = url.match(/project\/(\d+)/);
        const executionMatch = url.match(/execution\/(\d+)/);
        const journeyMatch = url.match(/journey\/(\d+)/);
        
        return {
            project: projectMatch ? projectMatch[1] : null,
            execution: executionMatch ? executionMatch[1] : null,
            journey: journeyMatch ? journeyMatch[1] : null
        };
    }
    
    async fetchData(endpoint) {
        return new Promise((resolve, reject) => {
            const url = `${this.config.baseUrl}${endpoint}`;
            
            https.get(url, { headers: this.headers }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        // Check if we got HTML instead of JSON
                        if (data.startsWith('<') || data.includes('<!DOCTYPE')) {
                            console.error('❌ Received HTML response instead of JSON');
                            console.error('   This usually means authentication failed or wrong endpoint');
                            console.error('   Status:', res.statusCode);
                            if (res.statusCode === 401) {
                                reject(new Error('Authentication failed - token may be expired'));
                            } else {
                                reject(new Error(`Unexpected HTML response (status: ${res.statusCode})`));
                            }
                            return;
                        }
                        resolve(JSON.parse(data));
                    } catch (e) {
                        console.error('Raw response:', data.substring(0, 500));
                        reject(new Error(`Failed to parse response: ${e.message}`));
                    }
                });
            }).on('error', reject);
        });
    }
    
    analyzeStep(step, checkpointName) {
        const actionType = step.action;
        
        // Store unique action structures
        if (!this.discoveredActions.has(actionType)) {
            this.discoveredActions.set(actionType, []);
        }
        
        const actionData = {
            checkpoint: checkpointName,
            structure: {
                action: step.action,
                ...(step.variable && { variable: '[present]' }),
                ...(step.selectors && { selectors: Object.keys(step.selectors) }),
                ...(step.meta && { meta: step.meta }),
                ...(step.target && { target: '[present]' }),
                ...(step.expected && { expected: '[present]' }),
                ...(step.operator && { operator: step.operator }),
                ...(step.value && { value: '[present]' }),
                ...(step.timeout && { timeout: step.timeout }),
                ...(step.frame && { frame: '[present]' }),
                ...(step.tab && { tab: '[present]' }),
                ...(step.script && { script: '[present]' }),
                ...(step.key && { key: '[present]' }),
                ...(step.cookie && { cookie: '[present]' }),
                ...(step.headers && { headers: '[present]' }),
                ...(step.body && { body: '[present]' }),
                ...(step.method && { method: step.method }),
                ...(step.comment && { comment: '[present]' })
            },
            fullStep: step
        };
        
        // Check if this structure is unique
        const existing = this.discoveredActions.get(actionType);
        const structureStr = JSON.stringify(actionData.structure);
        
        if (!existing.some(item => JSON.stringify(item.structure) === structureStr)) {
            existing.push(actionData);
        }
    }
    
    async discover(url) {
        console.log('🔍 API Structure Discovery Tool\n');
        console.log('=' .repeat(70));
        
        const ids = this.parseURL(url);
        if (!ids.journey) {
            console.error('❌ Invalid URL - must contain journey ID');
            return;
        }
        
        console.log(`📋 Fetching journey ${ids.journey}...\n`);
        
        try {
            // Fetch journey data
            const endpoint = `/journeys/${ids.journey}/suite?organizationId=${this.config.organizationId}`;
            const journeyData = await this.fetchData(endpoint);
            
            // Analyze all steps
            journeyData.cases.forEach(testCase => {
                testCase.steps.forEach(step => {
                    this.analyzeStep(step, testCase.checkpoint?.name || 'Unknown');
                });
            });
            
            // Output discoveries
            console.log('🎯 DISCOVERED ACTION STRUCTURES:\n');
            console.log('=' .repeat(70));
            
            // Group by known vs unknown
            const knownActions = ['NAVIGATE', 'WRITE', 'CLICK', 'ASSERT_EXISTS', 'MOUSE'];
            const newActions = [];
            const knownWithNewStructure = [];
            
            this.discoveredActions.forEach((structures, action) => {
                if (knownActions.includes(action)) {
                    // Check if structure is different than expected
                    const hasNewFields = structures.some(s => {
                        const keys = Object.keys(s.structure);
                        return keys.some(k => !['action', 'variable', 'selectors', 'meta'].includes(k));
                    });
                    
                    if (hasNewFields) {
                        knownWithNewStructure.push({ action, structures });
                    }
                } else {
                    newActions.push({ action, structures });
                }
            });
            
            // Report new actions
            if (newActions.length > 0) {
                console.log('\n🆕 NEW ACTION TYPES DISCOVERED:\n');
                newActions.forEach(({ action, structures }) => {
                    console.log(`\n### ${action} (${structures.length} variant${structures.length > 1 ? 's' : ''})`);
                    structures.forEach((s, i) => {
                        console.log(`\nVariant ${i + 1}:`);
                        console.log('Structure:', JSON.stringify(s.structure, null, 2));
                        console.log('Full Example:', JSON.stringify(s.fullStep, null, 2));
                    });
                });
            }
            
            // Report known actions with new fields
            if (knownWithNewStructure.length > 0) {
                console.log('\n⚠️ KNOWN ACTIONS WITH NEW FIELDS:\n');
                knownWithNewStructure.forEach(({ action, structures }) => {
                    console.log(`\n### ${action}`);
                    structures.forEach((s, i) => {
                        console.log(`\nVariant ${i + 1}:`);
                        console.log('Structure:', JSON.stringify(s.structure, null, 2));
                        console.log('Full Example:', JSON.stringify(s.fullStep, null, 2));
                    });
                });
            }
            
            // Save to file
            const output = {
                url,
                timestamp: new Date().toISOString(),
                discoveries: Object.fromEntries(this.discoveredActions),
                summary: {
                    totalActionTypes: this.discoveredActions.size,
                    newActionTypes: newActions.map(a => a.action),
                    knownWithNewFields: knownWithNewStructure.map(a => a.action)
                }
            };
            
            const filename = `discovery-${ids.journey}-${Date.now()}.json`;
            fs.writeFileSync(filename, JSON.stringify(output, null, 2));
            console.log(`\n✅ Full discovery saved to: ${filename}`);
            
            // Provide usage instructions
            if (newActions.length > 0) {
                console.log('\n📝 NEXT STEPS:');
                console.log('1. Review the discovered structures above');
                console.log('2. Update comprehensive-extraction-v6-validated.js with:');
                newActions.forEach(({ action }) => {
                    console.log(`   - Add case '${action}': handler`);
                });
                console.log('3. Test extraction with this journey');
            }
            
        } catch (error) {
            console.error('❌ Discovery failed:', error.message);
            if (error.message.includes('401')) {
                console.error('   Token may have expired. Please update the token.');
            }
        }
    }
}

// Usage
const url = process.argv[2];
if (!url) {
    console.log('Usage: node discover-api-structures.js <journey-url>');
    console.log('\nExample:');
    console.log('node discover-api-structures.js https://app2.virtuoso.qa/#/project/4889/execution/86332/journey/527256');
    console.log('\nInstructions:');
    console.log('1. Create a test journey in Virtuoso using commands like:');
    console.log('   - Assert equals, Assert not exists, Assert greater than');
    console.log('   - Set cookie, Delete cookie');
    console.log('   - Make API call');
    console.log('   - Resize window');
    console.log('2. Run this script with the journey URL');
    console.log('3. Review the discovered API structures');
    process.exit(1);
}

const discovery = new APIStructureDiscovery();
discovery.discover(url);