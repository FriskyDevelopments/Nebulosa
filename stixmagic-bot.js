// Stix Magic – main entry point
'use strict';

const express = require('express');
require('dotenv').config();

const { createBot } = require('./bot/index');
const { start: startCleanupWorker } = require('./workers/cleanupWorker');

// ------------------------------------------------------------------
// Validate required environment variables
// ------------------------------------------------------------------
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN environment variable is required.');
    process.exit(1);
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const WEBHOOK_URL = process.env.WEBHOOK_URL; // optional; use polling if absent

if (WEBHOOK_URL) {
    try {
        const parsedWebhookUrl = new URL(WEBHOOK_URL);
        if (!['http:', 'https:'].includes(parsedWebhookUrl.protocol)) {
            throw new Error('WEBHOOK_URL must start with http:// or https://');
        }
    } catch (error) {
        console.error(`❌ Invalid WEBHOOK_URL: ${error.message}`);
        process.exit(1);
    }
}

// ------------------------------------------------------------------
// Express health-check server
// ------------------------------------------------------------------
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Stix Magic', version: '1.0.0' });
});

// ------------------------------------------------------------------
// Start bot (webhook mode if WEBHOOK_URL is set, polling otherwise)
// ------------------------------------------------------------------
let bot;
if (WEBHOOK_URL) {
    bot = createBot(BOT_TOKEN, { webHook: true });

    app.post('/webhook', (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });

    bot.setWebHook(`${WEBHOOK_URL}/webhook`)
        .then(() => console.log(`✅ Webhook set: ${WEBHOOK_URL}/webhook`))
        .catch(err => console.error('❌ Webhook error:', err.message));
} else {
    bot = createBot(BOT_TOKEN, { polling: true });
    console.log('🤖 Stix Magic bot started in polling mode');
}

// ------------------------------------------------------------------
// Start cleanup worker
// ------------------------------------------------------------------
startCleanupWorker();

// ------------------------------------------------------------------
// Start HTTP server
// ------------------------------------------------------------------
const server = app.listen(PORT, () => {
    console.log(`🌟 Stix Magic server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log('   Domain: set your production domain via WEBHOOK_URL');
});

async function shutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

    try {
        if (bot && typeof bot.stopPolling === 'function') {
            await bot.stopPolling();
            console.log('✅ Telegram polling stopped');
        }

        if (bot && WEBHOOK_URL && typeof bot.deleteWebHook === 'function') {
            await bot.deleteWebHook();
            console.log('✅ Telegram webhook removed');
        }
    } catch (error) {
        console.error('❌ Error while stopping bot:', error.message);
    }

    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10_000).unref();
}

process.on('SIGINT', () => {
    shutdown('SIGINT');
});

process.on('SIGTERM', () => {
    shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});
