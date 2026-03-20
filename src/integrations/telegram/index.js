/**
 * Telegram bot integration.
 * Manages the bot lifecycle and command routing.
 */
'use strict';

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../core/config');
const { withContext } = require('../../core/logger');

const log = withContext({ module: 'telegram' });

let bot = null;

/**
 * Initialises the Telegram bot.
 * Uses webhooks in production, polling in development.
 * @returns {TelegramBot}
 */
function initBot() {
  if (!config.telegram.botToken) {
    log.warn('TELEGRAM_BOT_TOKEN not set – Telegram integration disabled');
    return null;
  }

  const useWebhook = config.env === 'production' && config.telegram.webhookUrl;

  if (useWebhook) {
    bot = new TelegramBot(config.telegram.botToken);
    bot.setWebHook(`${config.telegram.webhookUrl}/integrations/telegram/webhook`);
    log.info('Telegram bot started (webhook mode)');
  } else {
    bot = new TelegramBot(config.telegram.botToken, { polling: true });
    log.info('Telegram bot started (polling mode)');
  }

  registerCommands(bot);
  return bot;
}

/**
 * Registers all bot command handlers.
 * @param {TelegramBot} instance
 */
function registerCommands(instance) {
  instance.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await instance.sendMessage(chatId,
      '👋 Welcome to *Stix Magic*!\n\nUse /help to see available commands.',
      { parse_mode: 'Markdown' }
    );
  });

  instance.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    await instance.sendMessage(chatId,
      '*Available Commands*\n\n' +
      '/start – Welcome message\n' +
      '/help – Show this help\n' +
      '/status – Platform status\n',
      { parse_mode: 'Markdown' }
    );
  });

  instance.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    await instance.sendMessage(chatId, '✅ Platform is operational.');
  });

  instance.on('polling_error', (err) => {
    log.error('Telegram polling error', { error: err.message });
  });
}

/**
 * Processes a webhook update from Telegram (used in webhook mode).
 * @param {object} update
 */
async function processWebhookUpdate(update) {
  if (!bot) {
    throw new Error('Telegram bot not initialised');
  }
  bot.processUpdate(update);
}

/**
 * Sends a message to a specific chat.
 * @param {string|number} chatId
 * @param {string} text
 * @param {object} [options]
 */
async function sendMessage(chatId, text, options = {}) {
  if (!bot) {
    log.warn('Attempted to send Telegram message but bot is not initialised');
    return;
  }
  return bot.sendMessage(chatId, text, options);
}

function getBot() {
  return bot;
}

module.exports = { initBot, processWebhookUpdate, sendMessage, getBot };
