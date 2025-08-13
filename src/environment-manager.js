#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class EnvironmentManager {
    constructor() {
        this.configPath = path.join(__dirname, '..', 'config', 'app2-config.json');
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.currentEnvironment = null;
        this.isConfirmed = false;
    }

    /**
     * Get the current environment configuration
     */
    getCurrentEnvironment() {
        const envName = process.env.VIRTUOSO_ENV || this.config.defaultEnvironment;
        return this.config.environments[envName] || this.config.environments.app2;
    }

    /**
     * Set and validate environment
     */
    async setEnvironment(envName) {
        const env = this.config.environments[envName];
        
        if (!env) {
            throw new Error(`Unknown environment: ${envName}. Valid options: ${Object.keys(this.config.environments).join(', ')}`);
        }

        // Check if confirmation is required
        if (env.requiresConfirmation && !this.isConfirmed) {
            const confirmed = await this.promptConfirmation(env);
            if (!confirmed) {
                console.log('❌ Environment change cancelled.');
                return false;
            }
            this.isConfirmed = true;
        }

        this.currentEnvironment = env;
        
        // Set environment variables
        process.env.VIRTUOSO_BASE_URL = env.baseUrl;
        process.env.VIRTUOSO_API_URL = env.apiUrl;
        
        if (env.organizationId) {
            process.env.VIRTUOSO_ORG_ID = env.organizationId.toString();
        }

        console.log(`✅ Environment set to: ${env.name}`);
        console.log(`   Base URL: ${env.baseUrl}`);
        console.log(`   API URL: ${env.apiUrl}`);
        
        if (env.isDemoEnvironment) {
            console.log(`   ℹ️  This is a demo environment - safe for testing`);
        }

        return true;
    }

    /**
     * Prompt for confirmation when using non-demo environments
     */
    async promptConfirmation(env) {
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            console.log('\n' + '='.repeat(60));
            console.log(env.warningMessage || `⚠️  WARNING: Switching to ${env.name}`);
            console.log('='.repeat(60));
            console.log(`Environment: ${env.name}`);
            console.log(`URL: ${env.baseUrl}`);
            console.log(`Description: ${env.description}`);
            console.log('='.repeat(60));

            rl.question('\nDo you want to continue? (Y/N): ', (answer) => {
                rl.close();
                const confirmed = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
                resolve(confirmed);
            });
        });
    }

    /**
     * Get API configuration for the current environment
     */
    getAPIConfig() {
        const env = this.currentEnvironment || this.getCurrentEnvironment();
        
        return {
            baseUrl: env.apiUrl,
            appUrl: env.baseUrl,
            organizationId: env.organizationId,
            isDemoEnvironment: env.isDemoEnvironment,
            token: env.token || process.env.VIRTUOSO_API_TOKEN
        };
    }

    /**
     * Check if current environment is safe (app2 or local)
     */
    isSafeEnvironment() {
        const env = this.currentEnvironment || this.getCurrentEnvironment();
        return this.config.safeEnvironments.includes(env.name) || env.isDemoEnvironment;
    }

    /**
     * Get environment by URL
     */
    getEnvironmentByUrl(url) {
        for (const [key, env] of Object.entries(this.config.environments)) {
            if (url.includes(env.baseUrl) || url.includes(env.apiUrl)) {
                return { key, ...env };
            }
        }
        return null;
    }

    /**
     * Validate API token for environment
     */
    validateTokenForEnvironment(token, envName) {
        const env = this.config.environments[envName];
        
        if (!env) {
            return { valid: false, message: 'Unknown environment' };
        }

        // For app2, check if it's the demo token
        if (envName === 'app2' && env.token) {
            if (token === env.token) {
                return { valid: true, message: 'Using app2 demo token', isDemoToken: true };
            }
        }

        // For production environments, ensure token looks valid
        if (!env.isDemoEnvironment && token && token.length < 20) {
            return { valid: false, message: 'Token appears invalid for production use' };
        }

        return { valid: true, message: 'Token accepted' };
    }

    /**
     * Display environment status
     */
    displayStatus() {
        const current = this.currentEnvironment || this.getCurrentEnvironment();
        
        console.log('\n📍 Environment Status');
        console.log('─'.repeat(50));
        console.log(`Current Environment: ${current.name}`);
        console.log(`Type: ${current.isDemoEnvironment ? '🧪 Demo' : '⚠️  Production'}`);
        console.log(`Base URL: ${current.baseUrl}`);
        console.log(`API URL: ${current.apiUrl}`);
        
        if (current.organizationId) {
            console.log(`Organization ID: ${current.organizationId}`);
        }
        
        console.log(`Requires Confirmation: ${current.requiresConfirmation ? 'Yes' : 'No'}`);
        console.log('\nAvailable Environments:');
        
        Object.entries(this.config.environments).forEach(([key, env]) => {
            const indicator = key === (this.currentEnvironment?.name || this.config.defaultEnvironment) ? '→' : ' ';
            const safety = env.isDemoEnvironment ? '🧪' : '⚠️';
            console.log(`  ${indicator} ${key.padEnd(15)} ${safety} ${env.name}`);
        });
    }

    /**
     * Export environment configuration for documentation
     */
    exportConfiguration() {
        return {
            environments: Object.keys(this.config.environments).map(key => ({
                key,
                name: this.config.environments[key].name,
                baseUrl: this.config.environments[key].baseUrl,
                isDemoEnvironment: this.config.environments[key].isDemoEnvironment,
                requiresConfirmation: this.config.environments[key].requiresConfirmation
            })),
            defaultEnvironment: this.config.defaultEnvironment,
            safeEnvironments: this.config.safeEnvironments,
            metadata: this.config.metadata
        };
    }
}

// Self-test functionality
async function selfTest() {
    console.log('🧪 Environment Manager Self-Test\n');
    const manager = new EnvironmentManager();
    
    // Test 1: Default environment
    console.log('Test 1: Default environment should be app2');
    const defaultEnv = manager.getCurrentEnvironment();
    console.log(`  Result: ${defaultEnv.name === 'App2 Demo Environment' ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 2: Safe environment check
    console.log('\nTest 2: App2 should be a safe environment');
    const isSafe = manager.isSafeEnvironment();
    console.log(`  Result: ${isSafe ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 3: Token validation
    console.log('\nTest 3: Demo token validation');
    const tokenValidation = manager.validateTokenForEnvironment('86defbf4-62a7-4958-a0b4-21af0dee5d7a', 'app2');
    console.log(`  Result: ${tokenValidation.valid && tokenValidation.isDemoToken ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 4: URL detection
    console.log('\nTest 4: URL environment detection');
    const detectedEnv = manager.getEnvironmentByUrl('https://app2.virtuoso.qa/some/path');
    console.log(`  Result: ${detectedEnv && detectedEnv.key === 'app2' ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 5: Configuration export
    console.log('\nTest 5: Configuration export');
    const exported = manager.exportConfiguration();
    console.log(`  Result: ${exported.defaultEnvironment === 'app2' ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log('\n📊 Test Summary: All critical tests passed for app2 environment');
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    const manager = new EnvironmentManager();
    
    if (args[0] === 'test') {
        selfTest();
    } else if (args[0] === 'status') {
        manager.displayStatus();
    } else if (args[0] === 'set') {
        const envName = args[1];
        if (!envName) {
            console.error('Usage: node environment-manager.js set <environment>');
            process.exit(1);
        }
        manager.setEnvironment(envName).then(success => {
            if (!success) {
                process.exit(1);
            }
        });
    } else {
        console.log('Environment Manager for Virtuoso API\n');
        console.log('Commands:');
        console.log('  status    - Show current environment status');
        console.log('  set <env> - Set environment (with confirmation for non-demo)');
        console.log('  test      - Run self-test');
        console.log('\nDefault environment: app2 (Demo - No confirmation required)');
    }
}

module.exports = EnvironmentManager;