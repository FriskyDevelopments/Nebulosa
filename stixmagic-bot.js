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
app.listen(PORT, () => {
    console.log(`🌟 Stix Magic server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Domain: stixmagic.com`);
});
