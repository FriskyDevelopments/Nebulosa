// Vercel Serverless Function for Telegram Bot
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Initialize bot instance
let bot = null;
const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND ||
    (process.env.APP_DOMAIN ?
        (process.env.APP_DOMAIN.startsWith('http') ? process.env.APP_DOMAIN : `https://${process.env.APP_DOMAIN}`)
        : 'https://nebulosa.friskydev.com');

/**
 * Lazily initializes and returns the module-scoped Telegram bot instance.
 * @returns {TelegramBot|null} The initialized Telegram bot instance, or `null` if the bot token is missing and initialization did not occur.
 */
function initBot() {
    if (!bot && process.env.BOT_TOKEN) {
        bot = new TelegramBot(process.env.BOT_TOKEN);
        console.log('🤖 Vercel bot instance initialized');
    }
    return bot;
}

// Sync with Railway backend
async function syncWithRailway(endpoint, data) {
    try {
        const response = await axios.post(`${RAILWAY_BACKEND}/sync/${endpoint}`, data, {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        console.error('Railway sync error:', error.message);
        return null;
    }
}

export default async function handler(req, res) {
    // Handle CORS for preview deployments
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const botInstance = initBot();
        
        if (!botInstance) {
            return res.status(500).json({ 
                error: 'Bot not initialized',
                message: 'BOT_TOKEN missing'
            });
        }
        
        // Handle webhook from Telegram
        if (req.method === 'POST' && req.body) {
            const update = req.body;
            
            // Process message
            if (update.message) {
                const chatId = update.message.chat.id;
                const userId = update.message.from.id;
                const text = update.message.text;
                
                // Sync with Railway for processing
                const railwayResponse = await syncWithRailway('message', {
                    chatId,
                    userId,
                    text,
                    update
                });
                
                // If Railway is down, handle basic commands locally
                if (!railwayResponse && text?.startsWith('/')) {
                    await handleBasicCommand(botInstance, chatId, text);
                }
            }
            
            return res.status(200).json({ ok: true });
        }
        
        // Handle GET requests (health check, info)
        if (req.method === 'GET') {
            const botInfo = await botInstance.getMe();
            
            return res.status(200).json({
                status: 'healthy',
                platform: 'vercel',
                bot: botInfo,
                railway_backend: RAILWAY_BACKEND,
                timestamp: new Date().toISOString()
            });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('Vercel bot error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}

// Basic command handler for when Railway is unavailable
async function handleBasicCommand(bot, chatId, text) {
    const command = text.split(' ')[0];
    
    switch (command) {
        case '/start':
            await bot.sendMessage(chatId, 
                '🤖 Nebulosa Bot (Vercel)\n\n' +
                'Running on serverless infrastructure!\n' +
                'Main backend: Railway\n' +
                'Preview/API: Vercel\n\n' +
                'Some features may be limited in serverless mode.'
            );
            break;
            
        case '/health':
            await bot.sendMessage(chatId,
                '✅ Vercel Function: Healthy\n' +
                `🚂 Railway Backend: Checking...\n` +
                '⚡ Serverless: Active'
            );
            break;
            
        default:
            await bot.sendMessage(chatId,
                '⚠️ Limited functionality in serverless mode.\n' +
                'Full features available via Railway backend.'
            );
    }
}