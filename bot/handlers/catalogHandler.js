// Stix Magic – catalog / My Stickers handler
'use strict';

const { listDrafts, DRAFT_STATUS } = require('../../services/draftService');

/**
 * /catalog – browse approved stickers.
 */
async function handleCatalogCommand(bot, message) {
    const chatId = message.chat.id;
    const userId = String(message.from.id);

    const approved = listDrafts(userId, DRAFT_STATUS.APPROVED);

    if (approved.length === 0) {
        await bot.sendMessage(
            chatId,
            `🗂 *Catalog is empty.*\n\nApprove a draft to add stickers here.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    await bot.sendMessage(
        chatId,
        `🗂 *Catalog* – ${approved.length} approved sticker${approved.length !== 1 ? 's' : ''}`,
        { parse_mode: 'Markdown' }
    );

    // Send each approved sticker so the user can see their collection
    for (const draft of approved) {
        await bot.sendPhoto(chatId, draft.fileId, {
            caption: `#${draft.id} – approved ${draft.updatedAt.toDateString()}`,
        }).catch(err => console.error('[CatalogHandler] Failed to send photo:', err.message));
    }
}

/**
 * /mystickers – alias for catalog with a personal framing.
 */
async function handleMyStickerCommand(bot, message) {
    const chatId = message.chat.id;
    const userId = String(message.from.id);

    const approved = listDrafts(userId, DRAFT_STATUS.APPROVED);
    const published = listDrafts(userId, DRAFT_STATUS.PUBLISHED);
    const total = approved.length + published.length;

    if (total === 0) {
        await bot.sendMessage(
            chatId,
            `🌟 *My Stickers*\n\nYou haven't approved any stickers yet.\nSend a photo to get started!`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    await bot.sendMessage(
        chatId,
        `🌟 *My Stickers*\n• Approved (ready): ${approved.length}\n• Published: ${published.length}`,
        { parse_mode: 'Markdown' }
    );
}

module.exports = { handleCatalogCommand, handleMyStickerCommand };
