#!/usr/bin/env node

// Test OAuth Callback Endpoints
const axios = require('axios');

async function testCallbackEndpoints() {
    console.log('🔧 TESTING OAUTH CALLBACK ENDPOINTS');
    console.log('===================================\n');
    
    const baseUrl = 'http://localhost:3000';
    const endpoints = [
        '/oauth/callback',
        '/auth/zoom/callback',
        '/health',
        '/'
    ];
    
    console.log('📊 Testing local server endpoints...\n');
    
    for (const endpoint of endpoints) {
        try {
            const url = `${baseUrl}${endpoint}`;
            console.log(`🔗 Testing: ${url}`);
            
            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: function (status) {
                    return status < 500; // Accept any status under 500
                }
            });
            
            console.log(`   ✅ Status: ${response.status}`);
            console.log(`   📝 Response: ${response.data.substring ? response.data.substring(0, 100) + '...' : 'JSON Response'}`);
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log(`   ❌ Server not running on ${baseUrl}`);
            } else if (error.response) {
                console.log(`   ⚠️  Status: ${error.response.status}`);
                console.log(`   📝 Error: ${error.response.statusText}`);
            } else {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        
        console.log('');
    }
    
    console.log('🎯 OAUTH URL VALIDATION');
    console.log('=======================');
    
    const oauthUrl = 'https://zoom.us/oauth/authorize?response_type=code&client_id=vGVyI0IRv6si45iKO_qIw&redirect_uri=https%3A%2F%2Fnebulosa-production.railway.app%2Fauth%2Fzoom%2Fcallback&state=test&scope=meeting%3Aread+meeting%3Awrite+user%3Aread';
    
    console.log('✅ Fixed OAuth URL:');
    console.log(oauthUrl);
    console.log('');
    console.log('📝 This URL should be tested in a browser to verify the 4700 error is fixed.');
    console.log('🔐 Make sure the redirect URI is added to your Zoom app settings!');
}

testCallbackEndpoints().catch(console.error);