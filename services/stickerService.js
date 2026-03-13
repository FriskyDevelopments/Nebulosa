// Stix Magic – sticker processing service (Magic Cut)
'use strict';

/**
 * Magic Cut – processes a Telegram photo/document into a sticker-ready asset.
 *
 * Phase 1: returns the received file_id directly as the "processed" result.
 * Future phases can plug in background-removal, resizing, and format conversion
 * (e.g. WebP 512×512) here.
 *
 * @param {object} bot      – node-telegram-bot-api instance
 * @param {object} message  – Telegram Message object containing the image
 * @returns {Promise<{fileId: string, fileUniqueId: string}>}
 */
async function processImage(bot, message) {
    let fileId, fileUniqueId;

    if (message.photo && message.photo.length > 0) {
        // Pick the largest available photo
        const best = message.photo[message.photo.length - 1];
        fileId = best.file_id;
        fileUniqueId = best.file_unique_id;
    } else if (message.document) {
        fileId = message.document.file_id;
        fileUniqueId = message.document.file_unique_id;
    } else if (message.sticker) {
        fileId = message.sticker.file_id;
        fileUniqueId = message.sticker.file_unique_id;
    } else {
        throw new Error('No supported media found in message');
    }

    // TODO Phase 2: download file, apply background removal & resize to 512×512 WebP
    // const filePath = await bot.downloadFile(fileId, '/tmp');
    // const processed = await removeBackground(filePath);
    // const webp = await convertToWebP(processed);
    // fileId = await uploadToTelegram(bot, webp);

    return { fileId, fileUniqueId };
}

module.exports = { processImage };
