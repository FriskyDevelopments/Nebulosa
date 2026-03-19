#!/usr/bin/env node

// Test OAuth 4700 Error Fix
require('dotenv').config();
const crypto = require('crypto');

console.log('🔧 TESTING ZOOM OAUTH 4700 ERROR FIX');
console.log('===================================\n');

function testOAuthConfiguration() {
    console.log('📋 Environment Configuration:');
    
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const redirectUri = process.env.ZOOM_REDIRECT_URI;
    
    console.log(`• ZOOM_CLIENT_ID: ${clientId || 'MISSING'}`);
    console.log(`• ZOOM_CLIENT_SECRET: ${clientSecret ? 'SET (' + clientSecret.substring(0, 8) + '...)' : 'MISSING'}`);
    console.log(`• ZOOM_REDIRECT_URI: ${redirectUri || 'MISSING'}`);
    console.log('');
    
    if (!clientId || !clientSecret || !redirectUri) {
        console.log('❌ CONFIGURATION ERROR: Missing required environment variables');
        return false;
    }
    
    return { clientId, clientSecret, redirectUri };
}

function generateTestOAuthURL(config) {
    console.log('🔗 Generating OAuth URL for testing:');
    
    const state = crypto.randomBytes(16).toString('hex');
    const scopes = 'meeting:read meeting:write meeting:update user:read user:read:email';
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        state: state,
        scope: scopes
    });
    
    const oauthUrl = `https://zoom.us/oauth/authorize?${params.toString()}`;
    
    console.log(`• State: ${state}`);
    console.log(`• Scopes: ${scopes}`);
    console.log(`• Redirect URI: ${config.redirectUri}`);
    console.log('');
    console.log('🔗 Test OAuth URL:');
    console.log(oauthUrl);
    console.log('');
    
    return oauthUrl;
}

function provideFinalInstructions(redirectUri) {
    console.log('📝 INSTRUCTIONS TO FIX 4700 ERROR:');
    console.log('=====================================');
    console.log('');
    console.log('1. 🔐 Go to Zoom Marketplace:');
    console.log('   → Visit: https://marketplace.zoom.us/develop/apps');
    console.log('   → Sign in with your Zoom account');
    console.log('');
    console.log('2. 🔍 Find your app:');
    console.log('   → Look for app with Client ID: vGVyI0IRv6si45iKO_qIw');
    console.log('   → Click on the app name to edit');
    console.log('');
    console.log('3. ⚙️ Navigate to OAuth settings:');
    console.log('   → Look for "OAuth", "Features" → "OAuth", or "App Credentials"');
    console.log('   → Find the "Redirect URL for OAuth" or "Whitelist URL" section');
    console.log('');
    console.log('4. ➕ Add the redirect URI:');
    console.log(`   → Add this EXACT URL: ${redirectUri}`);
    console.log('   → Click "Add" or "+" button');
    console.log('   → Click "Save" or "Update"');
    console.log('');
    console.log('5. ⏰ Wait for propagation:');
    console.log('   → Wait 2-5 minutes for changes to take effect');
    console.log('   → Test the OAuth URL generated above');
    console.log('');
    console.log('✅ SUCCESS INDICATORS:');
    console.log('• No 4700 error when clicking OAuth URL');
    console.log('• Zoom shows login/authorization page');
    console.log('• Successful redirect to callback URL');
    console.log('');
}

async function runTest() {
    console.log('🎯 Starting OAuth 4700 Error Fix Test...\n');
    
    // Test configuration
    const config = testOAuthConfiguration();
    if (!config) {
        process.exit(1);
    }
    
    // Generate test URL
    const oauthUrl = generateTestOAuthURL(config);
    
    // Provide fix instructions
    provideFinalInstructions(config.redirectUri);
    
    console.log('🚀 NEXT STEPS:');
    console.log('==============');
    console.log('1. Follow the instructions above to add the redirect URI to your Zoom app');
    console.log('2. Test the generated OAuth URL in your browser');
    console.log('3. If successful, the /zoomlogin command in Telegram should work');
    console.log('4. Start the bot with: npm start');
    console.log('');
    console.log('💡 The bot now supports both callback URLs for compatibility:');
    console.log('   • /oauth/callback (legacy)');
    console.log('   • /auth/zoom/callback (new, matches error message)');
}

runTest().catch(console.error);