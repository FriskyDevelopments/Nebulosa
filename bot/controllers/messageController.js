'use strict';

const { handleImageMessage } = require('../handlers/stickerHandler');

function setupMessageRoutes(bot) {
    // Incoming photos & documents → Magic Cut flow
    bot.on('photo', async (msg) => {
        await handleImageMessage(bot, msg);
    });

    bot.on('document', async (msg) => {
        // Only process image documents
        if (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('image/')) {
            await handleImageMessage(bot, msg);
        }
    });
}

module.exports = { setupMessageRoutes };
