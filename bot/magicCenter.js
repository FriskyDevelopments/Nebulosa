// Stix Magic – Magic Center menu
// The main navigation hub presented to users via /start or /menu.
'use strict';

const { usageSummary } = require('../services/usageService');
const { handleDraftsCommand, handleTrashCommand } = require('./handlers/draftHandler');
const { handleCatalogCommand, handleMyStickerCommand } = require('./handlers/catalogHandler');
const { sendAnimationStudio } = require('./handlers/animationHandler');

const MAGIC_CENTER_TEXT =
    `✨ *Welcome to Stix Magic!*\n\n` +
    `Your Telegram-first sticker creation studio.\n` +
    `Choose what you'd like to do:`;

/**
 * Inline keyboard for the Magic Center hub.
 */
function magicCenterKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🎨 Create Sticker',    callback_data: 'mc:create' },
                { text: '📦 Draft Vault',        callback_data: 'mc:drafts' },
            ],
            [
                { text: '🎬 Animation Studio',  callback_data: 'mc:animate' },
                { text: '🗂 Catalog',            callback_data: 'mc:catalog' },
            ],
            [
                { text: '🌟 My Stickers',        callback_data: 'mc:mystickers' },
                { text: '📊 Plans',              callback_data: 'mc:plans' },
            ],
            [
                { text: '🗑 Trash',              callback_data: 'mc:trash' },
            ],
        ],
    };
}

/**
 * Send (or edit) the Magic Center message in a chat.
 */
async function sendMagicCenter(bot, chatId, messageId) {
    const opts = {
        parse_mode: 'Markdown',
        reply_markup: magicCenterKeyboard(),
    };

    if (messageId) {
        return bot.editMessageText(MAGIC_CENTER_TEXT, {
            chat_id: chatId,
            message_id: messageId,
            ...opts,
        });
    }
    return bot.sendMessage(chatId, MAGIC_CENTER_TEXT, opts);
}

/**
 * Handle Magic Center callback queries (mc:*).
 */
async function handleMagicCenterCallback(bot, query) {
    const chatId = query.message.chat.id;
    const userId = String(query.from.id);
    const action = query.data; // e.g. 'mc:create'

    // Synthesise a minimal message object so handler functions can be called directly
    const fakeMsg = { chat: { id: chatId }, from: query.from };

    await bot.answerCallbackQuery(query.id);

    switch (action) {
        case 'mc:animate':
            await sendAnimationStudio(bot, chatId, query.message.message_id);
            break;

        case 'mc:menu':
            await sendMagicCenter(bot, chatId, query.message.message_id);
            break;

        case 'mc:create':
            await bot.sendMessage(
                chatId,
                `✂️ *Magic Cut ready!*\n\nSend me a photo and I'll turn it into a sticker draft.`,
                { parse_mode: 'Markdown' }
            );
            break;

        case 'mc:drafts':
            await handleDraftsCommand(bot, fakeMsg);
            break;

        case 'mc:catalog':
            await handleCatalogCommand(bot, fakeMsg);
            break;

        case 'mc:mystickers':
            await handleMyStickerCommand(bot, fakeMsg);
            break;

        case 'mc:trash':
            await handleTrashCommand(bot, fakeMsg);
            break;

        case 'mc:plans': {
            const summary = usageSummary(userId);
            await bot.sendMessage(
                chatId,
                `${summary}\n\n🔗 Upgrade at stixmagic.com/plans`,
                { parse_mode: 'Markdown' }
            );
            break;
        }

        default:
            break;
    }
}

module.exports = { sendMagicCenter, handleMagicCenterCallback };
