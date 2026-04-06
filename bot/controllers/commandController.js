'use strict';

const { sendMagicCenter } = require('../magicCenter');
const { handleDraftsCommand, handleTrashCommand } = require('../handlers/draftHandler');
const { handleCatalogCommand, handleMyStickerCommand } = require('../handlers/catalogHandler');
const { sendAnimationStudio } = require('../handlers/animationHandler');
const { usageSummary } = require('../../services/usageService');

function setupCommandRoutes(bot) {
    // /start  →  Magic Center
    bot.onText(/^\/start/, async (msg) => {
        await sendMagicCenter(bot, msg.chat.id);
    });

    // /menu   →  Magic Center (alias)
    bot.onText(/^\/menu/, async (msg) => {
        await sendMagicCenter(bot, msg.chat.id);
    });

    // /animate  →  Animation Studio
    bot.onText(/^\/animate/, async (msg) => {
        await sendAnimationStudio(bot, msg.chat.id);
    });

    // /drafts →  Draft Vault
    bot.onText(/^\/drafts/, async (msg) => {
        await handleDraftsCommand(bot, msg);
    });

    // /trash  →  Trash bin
    bot.onText(/^\/trash/, async (msg) => {
        await handleTrashCommand(bot, msg);
    });

    // /catalog
    bot.onText(/^\/catalog/, async (msg) => {
        await handleCatalogCommand(bot, msg);
    });

    // /mystickers
    bot.onText(/^\/mystickers/, async (msg) => {
        await handleMyStickerCommand(bot, msg);
    });

    // /plans  →  Usage summary
    bot.onText(/^\/plans/, async (msg) => {
        const userId = String(msg.from.id);
        const summary = usageSummary(userId);
        await bot.sendMessage(
            msg.chat.id,
            `${summary}\n\n🔗 Upgrade at stixmagic.com/plans`,
            { parse_mode: 'Markdown' }
        );
    });

    // /help
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
            `and select an export format (Telegram, WebM, GIF, or WebP).`,
            { parse_mode: 'Markdown' }
        );
    });
}

module.exports = { setupCommandRoutes };
