// Stix Magic – sticker processing service (Magic Cut)
'use strict';

const { removeBackground } = require('@imgly/background-removal-node');
const sharp = require('sharp');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Magic Cut – processes a Telegram photo/document into a sticker-ready asset.
 *
 * Phase 2: downloads file, applies background removal, resizes to 512×512 WebP,
 * uploads to Telegram as a document, and returns the new file_id.
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

    const chatId = message.chat.id;
    let filePath = null;

    try {
        // 1. Download file from Telegram
        const tmpDir = os.tmpdir();
        filePath = await bot.downloadFile(fileId, tmpDir);

        // 2. Remove background
        const blob = await removeBackground(filePath);
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Resize and convert to 512x512 WebP
        const webpBuffer = await sharp(buffer)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp()
            .toBuffer();

        // 4. Upload to Telegram
        // Sending as a document to get a file_id for the webp image.
        // We will send it, get the file_id, and immediately delete the message.
        const sentMessage = await bot.sendDocument(
            chatId,
            webpBuffer,
            {},
            {
                filename: 'sticker.webp',
                contentType: 'image/webp'
            }
        );

        const newFileId = sentMessage.document.file_id;
        const newFileUniqueId = sentMessage.document.file_unique_id;

        // Clean up the uploaded message so it doesn't show up in chat
        await bot.deleteMessage(chatId, sentMessage.message_id).catch(err => {
            console.error('[StickerService] Failed to delete uploaded webp message:', err.message);
        });

        return { fileId: newFileId, fileUniqueId: newFileUniqueId };

    } catch (err) {
        console.error('[StickerService] Error processing image:', err);
        throw new Error('Failed to process image: ' + err.message);
    } finally {
        // Clean up the downloaded file
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (cleanupErr) {
                console.error('[StickerService] Failed to cleanup temp file:', cleanupErr.message);
            }
        }
    }
}

module.exports = { processImage };
