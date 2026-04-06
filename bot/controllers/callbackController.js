'use strict';

const { handleMagicCenterCallback } = require('../magicCenter');
const { handleDraftCallback } = require('../handlers/draftHandler');
const { handleAnimationCallback } = require('../handlers/animationHandler');

function setupCallbackRoutes(bot) {
    // Callback queries (inline button presses)
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
}

module.exports = { setupCallbackRoutes };
