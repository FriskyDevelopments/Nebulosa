// Stix Magic – sticker creation handler (Magic Cut flow)
'use strict';

const { canCreate, recordCreation } = require('../../services/usageService');
const { processImage } = require('../../services/stickerService');
const { createDraft, setReviewMessageId } = require('../../services/draftService');

/**
 * Build the inline keyboard for a draft review card.
 * @param {string} draftId
 */
function draftReviewKeyboard(draftId) {
    return {
        inline_keyboard: [
            [
                { text: '✅ Approve',       callback_data: `draft:approve:${draftId}` },
                { text: '🔄 Retry',         callback_data: `draft:retry:${draftId}` },
            ],
            [
                { text: '🗑 Trash',         callback_data: `draft:trash:${draftId}` },
                { text: '💾 Save for Later', callback_data: `draft:save:${draftId}` },
            ],
        ],
    };
}

/**
 * Send the "Magic is working…" indicator message.
 */
async function sendWorkingIndicator(bot, chatId) {
    return bot.sendMessage(
        chatId,
        `✨ *Magic Cut is working…*\n_Processing your image into a sticker draft…_`,
        { parse_mode: 'Markdown' }
    );
}

/**
 * Handle an incoming photo/document message – the core Magic Cut flow.
 *
 * Steps:
 *   1. Check creation limits
 *   2. Send "working" indicator
 *   3. Process image (Magic Cut)
 *   4. Create draft record
 *   5. Remove working indicator
 *   6. Send draft review card with inline buttons
 */
async function handleImageMessage(bot, message) {
    const chatId = message.chat.id;
    const userId = String(message.from.id);

    // 1 – Enforce plan limits
    const check = canCreate(userId);
    if (!check.allowed) {
        await bot.sendMessage(chatId, check.message, { parse_mode: 'Markdown' });
        return;
    }

    // 2 – "Magic is working" indicator
    let workingMsg;
    try {
        workingMsg = await sendWorkingIndicator(bot, chatId);
    } catch (err) {
        console.error('[StickerHandler] Failed to send working indicator:', err.message);
    }

    try {
        // 3 – Process image
        const { fileId, fileUniqueId } = await processImage(bot, message);

        // 4 – Record usage & create draft
        recordCreation(userId);
        const draft = createDraft(userId, {
            fileId,
            fileUniqueId,
            sourceMessageId: message.message_id,
            chatId,
        });

        // 5 – Remove working indicator
        if (workingMsg) {
            await bot.deleteMessage(chatId, workingMsg.message_id).catch(() => {});
        }

        // 6 – Send draft review card
        const reviewMsg = await bot.sendPhoto(
            chatId,
            fileId,
            {
                caption:
                    `✨ *Draft #${draft.id} ready!*\n` +
                    `Review your sticker and choose an action:`,
                parse_mode: 'Markdown',
                reply_markup: draftReviewKeyboard(draft.id),
            }
        );

        // Store the review message id so we can update the card later
        setReviewMessageId(userId, draft.id, reviewMsg.message_id);

    } catch (err) {
        console.error('[StickerHandler] Error processing image:', err.message);

        if (workingMsg) {
            await bot.deleteMessage(chatId, workingMsg.message_id).catch(() => {});
        }

        await bot.sendMessage(
            chatId,
            `❌ Magic Cut ran into a problem: _${err.message}_\n\nPlease try again.`,
            { parse_mode: 'Markdown' }
        );
    }
}

module.exports = { handleImageMessage, draftReviewKeyboard };
