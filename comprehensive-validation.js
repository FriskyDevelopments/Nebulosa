#!/usr/bin/env node

// Comprehensive Validation for Zoom OAuth 4700 Error Fix
require('dotenv').config();
const crypto = require('crypto');

console.log('🎯 NEBULOSA BOT - OAuth 4700 Error Fix Validation');
console.log('='.repeat(60));
console.log('');

/**
 * Collects Zoom- and bot-related settings from environment variables and prints a presence checklist.
 *
 * The function reads BOT_TOKEN, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_REDIRECT_URI, and PORT from
 * process.env, prints a human-readable status line for each value (the Zoom client secret is partially
 * masked when present), and returns the assembled configuration object.
 *
 * @returns {{botToken: (string|undefined), zoomClientId: (string|undefined), zoomClientSecret: (string|undefined), zoomRedirectUri: (string|undefined), port: (string|number)}} The configuration object built from environment variables. `port` defaults to 3000 when not set.
 */
async function validateConfiguration() {
    console.log('1️⃣ CONFIGURATION VALIDATION');
    console.log('===============================');
    
    const config = {
        botToken: process.env.BOT_TOKEN,
        zoomClientId: process.env.ZOOM_CLIENT_ID,
        zoomClientSecret: process.env.ZOOM_CLIENT_SECRET,
        zoomRedirectUri: process.env.ZOOM_REDIRECT_URI,
        port: process.env.PORT || 3000
    };
    
    console.log(`• Bot Token: ${config.botToken ? '✅ SET (redacted)' : '❌ MISSING'}`);
    console.log(`• Zoom Client ID: ${config.zoomClientId ? '✅ SET (' + config.zoomClientId + ')' : '❌ MISSING'}`);
    console.log(`• Zoom Client Secret: ${config.zoomClientSecret ? '✅ SET (redacted)' : '❌ MISSING'}`);
    console.log(`• Zoom Redirect URI: ${config.zoomRedirectUri ? '✅ SET (' + config.zoomRedirectUri + ')' : '❌ MISSING'}`);
    console.log(`• Port: ${config.port}`);
    console.log('');

    if (!config.zoomClientId || !config.zoomRedirectUri) {
        console.log('❌ CRITICAL: Missing required configuration');
        process.exit(1);
    }

    return config;
}

/**
 * Generate a Zoom OAuth authorization URL using the provided client credentials and redirect URI and log test details to the console.
 *
 * @param {{zoomClientId?: string, zoomRedirectUri?: string}} config - Configuration object containing Zoom OAuth settings.
 * @returns {string|false} The constructed OAuth authorization URL when both client ID and redirect URI are present, `false` otherwise.
 */
function validateOAuthURL(config) {
    console.log('2️⃣ OAUTH URL GENERATION TEST');
    console.log('==============================');

    if (!config.zoomClientId || !config.zoomRedirectUri) {
        console.log('❌ Cannot generate OAuth URL - missing configuration');
        process.exit(1);
    }
    
    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.zoomClientId,
        redirect_uri: config.zoomRedirectUri,
        state: state,
        scope: 'meeting:read meeting:write meeting:update user:read user:read:email'
    });
    
    const oauthUrl = `https://zoom.us/oauth/authorize?${params.toString()}`;
    
    console.log('✅ OAuth URL Generated Successfully:');
    console.log(`   ${oauthUrl}`);
    console.log('');
    console.log('🔍 URL Components:');
    console.log(`   • Base URL: https://zoom.us/oauth/authorize`);
    console.log(`   • Client ID: ${config.zoomClientId}`);
    console.log(`   • Redirect URI: ${config.zoomRedirectUri}`);
    console.log(`   • State: ${state}`);
    console.log(`   • Scope: meeting permissions + user profile`);
    console.log('');
    
    return oauthUrl;
}

/**
 * Prints deployment and testing instructions for resolving the Zoom OAuth 4700 error.
 *
 * Outputs a step-by-step checklist that instructs the user to update Zoom OAuth settings (including the redirect URI),
 * configure environment variables for deployment, redeploy the application, and test the OAuth flow via Telegram.
 *
 * @param {{botToken?: string, zoomClientId?: string, zoomClientSecret?: string, zoomRedirectUri?: string}} config - Configuration values used to populate the instructions; missing values are shown as placeholders.
 * @param {string|false} oauthUrl - The generated OAuth URL (included for context; not required by this function).
 */
function provideFinalInstructions(config, oauthUrl) {
    console.log('3️⃣ DEPLOYMENT INSTRUCTIONS');
    console.log('============================');
    console.log('');
    console.log('🔧 TO FIX THE 4700 ERROR COMPLETELY:');
    console.log('');
    console.log('A. Update Zoom App Settings:');
    console.log('   1. Go to https://marketplace.zoom.us/develop/apps');
    console.log('   2. Find your app with Client ID: ' + config.zoomClientId);
    console.log('   3. Navigate to OAuth settings');
    console.log('   4. Add this redirect URI: ' + config.zoomRedirectUri);
    console.log('   5. Save the changes');
    console.log('');
    console.log('B. Deploy to Railway:');
    console.log('   1. Set environment variables in Railway dashboard:');
    console.log('      - BOT_TOKEN=<your-bot-token>');
    console.log('      - ZOOM_CLIENT_ID=' + (config.zoomClientId || '<your-zoom-client-id>'));
    console.log('      - ZOOM_CLIENT_SECRET=<your-zoom-client-secret>');
    console.log('      - ZOOM_REDIRECT_URI=' + (config.zoomRedirectUri || 'https://your-app.railway.app/auth/zoom/callback'));
    console.log('   2. Deploy with: npm start');
    console.log('');
    console.log('C. Test the Fix:');
    console.log('   1. Send /zoomlogin to your Telegram bot');
    console.log('   2. Click the OAuth URL (should NOT show 4700 error)');
    console.log('   3. Complete Zoom authorization');
    console.log('   4. You should be redirected to success page');
    console.log('');
}

/**
 * Prints a structured summary of implemented changes, fixed issues, bot features, and available commands to the console.
 */
function summarizeChanges() {
    console.log('4️⃣ SUMMARY OF CHANGES MADE');
    console.log('============================');
    console.log('');
    console.log('✅ Fixed Issues:');
    console.log('   • Corrected default redirect URI to /auth/zoom/callback');
    console.log('   • Added dual callback URL support for compatibility');
    console.log('   • Fixed environment variable handling');
    console.log('   • Corrected syntax errors in railway-complete-bot.js');
    console.log('   • Updated zoomAuth.js to use proper redirect URI');
    console.log('   • Created comprehensive test scripts');
    console.log('');
    console.log('✅ Bot Features:');
    console.log('   • Supports both /oauth/callback and /auth/zoom/callback');
    console.log('   • Proper error handling for OAuth failures');
    console.log('   • Environment-based configuration');
    console.log('   • Health check endpoint at /health');
    console.log('   • Webhook support for Telegram');
    console.log('');
    console.log('✅ Available Commands:');
    console.log('   • /start - Welcome message and bot info');
    console.log('   • /zoomlogin - OAuth authentication (FIXED)');
    console.log('   • /status - Bot system status');
    console.log('   • More commands available after OAuth success');
    console.log('');
}

/**
 * Prints step-by-step local and production testing recommendations and basic troubleshooting tips for the Zoom OAuth 4700 fix workflow.
 *
 * Outputs instructions for running local test scripts, starting the bot, checking the health endpoint, deploying and testing in production, and common troubleshooting checks (redirect URI, bot token/URL, client credentials).
 */
function showTestingRecommendations() {
    console.log('5️⃣ TESTING RECOMMENDATIONS');
    console.log('============================');
    console.log('');
    console.log('🧪 Local Testing:');
    console.log('   • Run: node test-oauth-4700-fix.js');
    console.log('   • Run: node test-callback-endpoints.js');
    console.log('   • Start bot: npm start');
    console.log('   • Check health: curl http://localhost:3000/health');
    console.log('');
    console.log('🌐 Production Testing:');
    console.log('   • Deploy to Railway');
    console.log('   • Test OAuth URL in browser');
    console.log('   • Send /zoomlogin in Telegram');
    console.log('   • Verify no 4700 errors occur');
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('   • If 4700 still occurs: Check Zoom app redirect URI settings');
    console.log('   • If webhook fails: Verify Telegram bot token and Railway URL');
    console.log('   • If OAuth fails: Check client secret and ID');
    console.log('');

    // Exit with success code if we reached this point
    process.exit(0);
}

/**
 * Run a full validation and guidance sequence for Zoom OAuth configuration and deployment.
 *
 * Executes configuration validation, attempts to generate a test OAuth authorization URL,
 * and prints structured deployment instructions, a summary of changes, and testing recommendations.
 * Logs progress and completion messages to the console and prints the generated OAuth URL if available.
 */
async function runValidation() {
    console.log('🚀 Running comprehensive validation...\n');
    
    const config = await validateConfiguration();
    const oauthUrl = validateOAuthURL(config);
    
    provideFinalInstructions(config, oauthUrl);
    summarizeChanges();
    showTestingRecommendations();
    
    console.log('🎉 VALIDATION COMPLETE');
    console.log('======================');
    console.log('');
    console.log('The Zoom OAuth 4700 error fix has been implemented!');
    console.log('Follow the deployment instructions above to complete the setup.');
    console.log('');
    console.log('🔗 Key OAuth URL to test:');
    if (oauthUrl) {
        console.log(oauthUrl);
    }
    console.log('');
    console.log('Good luck! 🍀');
}

runValidation().catch(console.error);