// Stix Magic – bot setup and wiring
'use strict';

const TelegramBot = require('node-telegram-bot-api');
const { setupCommandRoutes } = require('./controllers/commandController');
const { setupMessageRoutes } = require('./controllers/messageController');
const { setupCallbackRoutes } = require('./controllers/callbackController');

/**
 * Create and configure the Stix Magic Telegram bot.
 *
 * @param {string} token       – Telegram Bot API token
 * @param {object} [options]   – Forwarded to TelegramBot constructor
 * @returns {TelegramBot}
 */
function createBot(token, options = {}) {
    const bot = new TelegramBot(token, options);

    // Set up routing
    setupCommandRoutes(bot);
    setupMessageRoutes(bot);
    setupCallbackRoutes(bot);

    return bot;
}

module.exports = { createBot };
