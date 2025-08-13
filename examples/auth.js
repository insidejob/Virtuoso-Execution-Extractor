const { VirtuosoAPIClient } = require('../src/client');

// Example: Authentication and basic API usage
async function authenticationExample() {
    // Get token from environment variable or replace with your actual token
    const token = process.env.VIRTUOSO_API_TOKEN || 'YOUR_API_TOKEN_HERE';
    
    // Initialize client
    const client = new VirtuosoAPIClient(token, {
        baseUrl: 'https://api.virtuoso.qa/api',
        timeout: 30000,
        retryAttempts: 3
    });
    
    try {
        // Test authentication by getting user details
        console.log('🔐 Testing authentication...\n');
        const userResponse = await client.getUser();
        
        console.log('✅ Authentication successful!');
        console.log('User Details:', userResponse.data);
        
        return client;
    } catch (error) {
        console.error('❌ Authentication failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        throw error;
    }
}

// Example: Different token types
function tokenTypesExample() {
    console.log('📚 Virtuoso API Token Types:\n');
    
    console.log('1. ALL Token:');
    console.log('   - Full system access');
    console.log('   - Can read and write all resources');
    console.log('   - Use for: Complete automation, CI/CD pipelines\n');
    
    console.log('2. BRIDGE Token:');
    console.log('   - Read access for organizations');
    console.log('   - Manage access for bridge instances');
    console.log('   - Use for: Limited access scenarios, read-only monitoring\n');
    
    console.log('🔒 Security Best Practices:');
    console.log('   - Never commit tokens to version control');
    console.log('   - Use environment variables for token storage');
    console.log('   - Rotate tokens regularly');
    console.log('   - Use dedicated machine accounts');
    console.log('   - Apply principle of least privilege');
}

// Example: Setting up authentication headers for custom requests
function customHeadersExample() {
    const token = 'YOUR_TOKEN';
    
    // Bearer token header
    const authHeader = {
        'Authorization': `Bearer ${token}`
    };
    
    // Custom headers with auth
    const customHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value'
    };
    
    console.log('📋 Authentication Headers:');
    console.log('Standard:', authHeader);
    console.log('With custom headers:', customHeaders);
    
    return customHeaders;
}

// Example: Environment-based authentication
async function environmentBasedAuth() {
    const environment = process.env.VIRTUOSO_ENV || 'development';
    
    // Different tokens for different environments
    const tokens = {
        development: process.env.VIRTUOSO_DEV_TOKEN,
        staging: process.env.VIRTUOSO_STAGING_TOKEN,
        production: process.env.VIRTUOSO_PROD_TOKEN
    };
    
    const baseUrls = {
        development: 'https://api-dev.virtuoso.qa/api',
        staging: 'https://api-staging.virtuoso.qa/api',
        production: 'https://api.virtuoso.qa/api'
    };
    
    const token = tokens[environment];
    if (!token) {
        throw new Error(`No token configured for environment: ${environment}`);
    }
    
    const client = new VirtuosoAPIClient(token, {
        baseUrl: baseUrls[environment]
    });
    
    console.log(`🌍 Connected to ${environment} environment`);
    console.log(`Base URL: ${baseUrls[environment]}`);
    
    return client;
}

// Run examples if executed directly
if (require.main === module) {
    console.log('🚀 Virtuoso API Authentication Examples\n');
    console.log('=' .repeat(60) + '\n');
    
    // Show token types
    tokenTypesExample();
    console.log('\n' + '=' .repeat(60) + '\n');
    
    // Show custom headers
    customHeadersExample();
    console.log('\n' + '=' .repeat(60) + '\n');
    
    // Test authentication if token is available
    if (process.env.VIRTUOSO_API_TOKEN) {
        authenticationExample()
            .then(() => console.log('\n✅ All authentication examples completed!'))
            .catch(error => console.error('\n❌ Error:', error.message));
    } else {
        console.log('\n⚠️  Set VIRTUOSO_API_TOKEN environment variable to test authentication');
        console.log('Example: export VIRTUOSO_API_TOKEN="your-token-here"');
    }
}

module.exports = {
    authenticationExample,
    tokenTypesExample,
    customHeadersExample,
    environmentBasedAuth
};