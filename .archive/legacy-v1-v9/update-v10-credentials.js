#!/usr/bin/env node

/**
 * V10 Credentials Updater
 * Updates authentication credentials in extract-v10.js
 */

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔐 V10 Credentials Updater\n');
console.log('=' .repeat(70));
console.log('\nTo get credentials:');
console.log('1. Open https://app2.virtuoso.qa in Chrome');
console.log('2. Login to your account');
console.log('3. Open DevTools (F12) → Network tab');
console.log('4. Navigate to any journey');
console.log('5. Look for API calls to api-app2.virtuoso.qa');
console.log('6. Click on any API call');
console.log('7. Go to Headers tab\n');
console.log('=' .repeat(70));

function question(prompt) {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
}

async function updateCredentials() {
    console.log('\n📝 Enter new credentials:\n');
    
    // Get token
    console.log('From authorization header (Bearer TOKEN):');
    const token = await question('Token: ');
    
    if (!token || token.length < 20) {
        console.log('❌ Invalid token. Token should be a long string.');
        process.exit(1);
    }
    
    // Get session ID
    console.log('\nFrom x-v-session-id header:');
    const sessionId = await question('Session ID: ');
    
    if (!sessionId || sessionId.length < 20) {
        console.log('❌ Invalid session ID. Session ID should be a long string.');
        process.exit(1);
    }
    
    // Get client ID (optional)
    console.log('\nFrom x-virtuoso-client-id header (press Enter to skip):');
    const clientId = await question('Client ID: ');
    
    // Read extract-v10.js
    const filePath = './extract-v10.js';
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update token
    const tokenRegex = /token: options\.token \|\| '[^']+'/;
    content = content.replace(tokenRegex, `token: options.token || '${token}'`);
    
    // Update session ID
    const sessionRegex = /sessionId: options\.sessionId \|\| '[^']+'/;
    content = content.replace(sessionRegex, `sessionId: options.sessionId || '${sessionId}'`);
    
    // Update client ID if provided
    if (clientId && clientId.trim()) {
        const clientRegex = /clientId: options\.clientId \|\| '[^']+'/;
        content = content.replace(clientRegex, `clientId: options.clientId || '${clientId}'`);
    }
    
    // Write back
    fs.writeFileSync(filePath, content);
    
    console.log('\n✅ Credentials updated successfully!\n');
    console.log('You can now run:');
    console.log(`node extract-v10.js https://app2.virtuoso.qa/#/project/4889/execution/173661/journey/612731 --nlp --vars --validate\n`);
    
    rl.close();
}

updateCredentials().catch(error => {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
});