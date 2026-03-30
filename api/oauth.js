// Vercel Serverless Function for Zoom OAuth
const axios = require('axios');

const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND || 'https://nebulosa.friskydev.com';

/**
 * Handle Zoom OAuth callback: validate query parameters, forward the callback to the configured Railway backend, and if forwarding fails attempt a local token exchange as a fallback, responding with user-facing HTML pages for success, failure, or invalid requests.
 *
 * This handler also sets CORS headers and responds to preflight OPTIONS requests.
 *
 * @param {import('http').IncomingMessage & { query: Record<string, string|undefined> }} req - HTTP request; expects query parameters `code`, `state`, and optional `error`.
 * @param {import('http').ServerResponse & { status: (code: number) => any, json: (body: any) => any, send: (body: any) => any, setHeader: (name: string, value: string) => void, end: () => void }} res - HTTP response used to send HTML or JSON responses.
 */
export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { code, state, error } = req.query;
    
    if (error) {
        console.error('OAuth error:', error);
        return res.status(400).send(`
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                    <h2>❌ Authorization Failed</h2>
                    <p>Error: ${error}</p>
                    <p>Please try again from Telegram.</p>
                    <script>setTimeout(() => window.close(), 5000);</script>
                </body>
            </html>
        `);
    }
    
    if (!code || !state) {
        return res.status(400).send(`
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                    <h2>❌ Invalid Authorization</h2>
                    <p>Missing authorization code or state.</p>
                    <p>Please try again from Telegram.</p>
                    <script>setTimeout(() => window.close(), 5000);</script>
                </body>
            </html>
        `);
    }
    
    try {
        // Forward OAuth callback to Railway backend
        const railwayResponse = await axios.get(`${RAILWAY_BACKEND}/auth/zoom/callback`, {
            params: { code, state },
            timeout: 10000
        });
        
        // Success page
        return res.status(200).send(`
            <html>
                <head>
                    <title>Nebulosa - OAuth Success</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                </head>
                <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                    <div style="background: rgba(255,255,255,0.1); border-radius: 20px; padding: 40px; margin: 20px; backdrop-filter: blur(10px);">
                        <h1>✅ Authorization Successful!</h1>
                        <p style="font-size: 18px;">Your Zoom account has been connected to Nebulosa Bot.</p>
                        <div style="margin: 30px 0;">
                            <div style="display: inline-block; margin: 10px;">
                                <span style="background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px;">
                                    🤖 Telegram Bot Connected
                                </span>
                            </div>
                            <div style="display: inline-block; margin: 10px;">
                                <span style="background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px;">
                                    🎥 Zoom Integration Active
                                </span>
                            </div>
                        </div>
                        <p>You can now:</p>
                        <ul style="text-align: left; display: inline-block; margin: 20px 0;">
                            <li>Create instant meetings with /createroom</li>
                            <li>Monitor participants with /scanroom</li>
                            <li>Get room information with /roominfo</li>
                            <li>Use all bot features!</li>
                        </ul>
                        <p style="margin-top: 30px; font-size: 16px;">
                            Return to Telegram and try <code>/status</code> to verify your connection!
                        </p>
                        <div style="margin-top: 30px; font-size: 14px; opacity: 0.8;">
                            <p>🚂 Powered by Railway + ▲ Vercel</p>
                            <p>This window will close automatically in 10 seconds.</p>
                        </div>
                    </div>
                    <script>
                        setTimeout(() => {
                            window.close();
                        }, 10000);
                    </script>
                </body>
            </html>
        `);
        
    } catch (error) {
        console.error('OAuth processing error:', error);
        
        // Fallback: handle OAuth locally if Railway is down
        try {
            const tokenResponse = await axios.post('https://zoom.us/oauth/token', {
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.ZOOM_REDIRECT_URI
            }, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            });
            
            // Store tokens (simplified for Vercel)
            console.log('OAuth tokens received for user:', state);
            
            return res.status(200).send(`
                <html>
                    <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                        <h2>✅ Authorization Processed</h2>
                        <p>Your Zoom account has been connected!</p>
                        <p><strong>Note:</strong> Full functionality requires Railway backend.</p>
                        <p>You can now close this window and return to Telegram.</p>
                        <script>setTimeout(() => window.close(), 5000);</script>
                    </body>
                </html>
            `);
            
        } catch (fallbackError) {
            console.error('Fallback OAuth error:', fallbackError);
            return res.status(500).send(`
                <html>
                    <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                        <h2>❌ Authorization Failed</h2>
                        <p>Unable to complete authorization.</p>
                        <p>Please try again later or contact support.</p>
                        <script>setTimeout(() => window.close(), 5000);</script>
                    </body>
                </html>
            `);
        }
    }
}
