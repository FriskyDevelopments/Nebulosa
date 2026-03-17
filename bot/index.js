// Stix Magic – bot setup and wiring
'use strict';

const TelegramBot = require('node-telegram-bot-api');
const { sendMagicCenter, handleMagicCenterCallback } = require('./magicCenter');
const { handleImageMessage } = require('./handlers/stickerHandler');
const { handleDraftCallback, handleDraftsCommand, handleTrashCommand } = require('./handlers/draftHandler');
const { handleCatalogCommand, handleMyStickerCommand } = require('./handlers/catalogHandler');
const { sendAnimationStudio, handleAnimationCallback } = require('./handlers/animationHandler');
const { usageSummary } = require('../services/usageService');

/**
 * Create and configure the Stix Magic Telegram bot.
 *
 * @param {string} token       – Telegram Bot API token
 * @param {object} [options]   – Forwarded to TelegramBot constructor
 * @returns {TelegramBot}
 */
function createBot(token, options = {}) {
    const bot = new TelegramBot(token, options);

    // ------------------------------------------------------------------
    // /start  →  Magic Center
    // ------------------------------------------------------------------
    bot.onText(/^\/start/, async (msg) => {
        await sendMagicCenter(bot, msg.chat.id);
    });

    // ------------------------------------------------------------------
    // /menu   →  Magic Center (alias)
    // ------------------------------------------------------------------
    bot.onText(/^\/menu/, async (msg) => {
        await sendMagicCenter(bot, msg.chat.id);
    });

    // ------------------------------------------------------------------
    // /animate  →  Animation Studio
    // ------------------------------------------------------------------
    bot.onText(/^\/animate/, async (msg) => {
        await sendAnimationStudio(bot, msg.chat.id);
    });

    // ------------------------------------------------------------------
    // /drafts →  Draft Vault
    // ------------------------------------------------------------------
    bot.onText(/^\/drafts/, async (msg) => {
        await handleDraftsCommand(bot, msg);
    });

    // ------------------------------------------------------------------
    // /trash  →  Trash bin
    // ------------------------------------------------------------------
    bot.onText(/^\/trash/, async (msg) => {
        await handleTrashCommand(bot, msg);
    });

    // ------------------------------------------------------------------
    // /catalog
    // ------------------------------------------------------------------
    bot.onText(/^\/catalog/, async (msg) => {
        await handleCatalogCommand(bot, msg);
    });

    // ------------------------------------------------------------------
    // /mystickers
    // ------------------------------------------------------------------
    bot.onText(/^\/mystickers/, async (msg) => {
        await handleMyStickerCommand(bot, msg);
    });

    // ------------------------------------------------------------------
    // /plans  →  Usage summary
    // ------------------------------------------------------------------
    bot.onText(/^\/plans/, async (msg) => {
        const userId = String(msg.from.id);
        const summary = usageSummary(userId);
        await bot.sendMessage(
            msg.chat.id,
            `${summary}\n\n🔗 Upgrade at stixmagic.com/plans`,
            { parse_mode: 'Markdown' }
        );
    });

    // ------------------------------------------------------------------
    // /help
    // ------------------------------------------------------------------
    bot.onText(/^\/help/, async (msg) => {
        await bot.sendMessage(
            msg.chat.id,
            `✨ *Stix Magic Help*\n\n` +
            `*Commands:*\n` +
            `/start – Magic Center\n` +
            `/animate – Animation Studio\n` +
            `/drafts – Draft Vault\n` +
            `/catalog – Approved stickers\n` +
            `/mystickers – My sticker collection\n` +
            `/trash – Trashed drafts\n` +
            `/plans – Usage & plan info\n` +
            `/help – This message\n\n` +
            `*Create a sticker:*\n` +
            `Simply send a photo and Magic Cut will turn it into a sticker draft.\n\n` +
            `*Animation Studio:*\n` +
            `Choose a motion style for your sticker, preview your animation, ` +
            `and export loop-ready assets for Telegram, WebM, GIF, or WebP.`,
            { parse_mode: 'Markdown' }
        );
    });

    // ------------------------------------------------------------------
    // Incoming photos & documents → Magic Cut flow
    // ------------------------------------------------------------------
    bot.on('photo', async (msg) => {
        await handleImageMessage(bot, msg);
    });

    bot.on('document', async (msg) => {
        // Only process image documents
        if (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('image/')) {
            await handleImageMessage(bot, msg);
        }
    });

    // ------------------------------------------------------------------
    // Callback queries (inline button presses)
    // ------------------------------------------------------------------
    bot.on('callback_query', async (query) => {
        const data = query.data || '';

        if (data.startsWith('mc:')) {
            await handleMagicCenterCallback(bot, query);
        } else if (data.startsWith('draft:')) {
            await handleDraftCallback(bot, query);
        } else if (data.startsWith('anim:')) {
            await handleAnimationCallback(bot, query);
        } else {
            await bot.answerCallbackQuery(query.id);
        }
    });

    return bot;
}

module.exports = { createBot };
