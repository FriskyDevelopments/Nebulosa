// Stix Magic – Animation Studio handler
// Guided creative tool: Choose Motion → Preview Loop → Export Pack
'use strict';

/**
 * Curated motion presets.
 * Each preset has a display name, tagline, and emoji for branding.
 */
const PRESETS = {
    pulse:   { label: 'Pulse',   tagline: 'soft breathing loop',     emoji: '💗' },
    bounce:  { label: 'Bounce',  tagline: 'playful sticker energy',  emoji: '🏀' },
    glitch:  { label: 'Glitch',  tagline: 'chaotic cyber flicker',   emoji: '⚡' },
    sparkle: { label: 'Sparkle', tagline: 'magical shimmer',         emoji: '✨' },
};

/**
 * Supported export formats.
 */
const EXPORT_FORMATS = {
    tgs:  { label: 'Telegram (.tgs)',  emoji: '📱' },
    webm: { label: 'WebM',             emoji: '🎬' },
    gif:  { label: 'GIF',              emoji: '🖼' },
    webp: { label: 'WebP',             emoji: '🌐' },
};

/**
 * In-memory session: tracks which preset the user has selected.
 * Shape: { [userId]: { preset: string | null, lastTouched: number } }
 */
const SESSION_TTL_MS = 1000 * 60 * 60; // 1 hour
const SESSION_SWEEP_INTERVAL_MS = 1000 * 60 * 10; // sweep every 10 minutes (lazy)
const _sessions = new Map();
let _lastSessionSweep = Date.now();

function _cleanupExpiredSessions(now) {
    if (now - _lastSessionSweep < SESSION_SWEEP_INTERVAL_MS) {
        return;
    }
    _lastSessionSweep = now;

    for (const [userId, session] of _sessions) {
        if (!session || typeof session.lastTouched !== 'number') {
            continue;
        }
        if (now - session.lastTouched > SESSION_TTL_MS) {
            _sessions.delete(userId);
        }
    }
}

function _getSession(userId) {
    const now = Date.now();

    if (!_sessions.has(userId)) {
        _sessions.set(userId, { preset: null, lastTouched: now });
    }

    const session = _sessions.get(userId);
    if (session) {
        session.lastTouched = now;
    }

    _cleanupExpiredSessions(now);
    return session;
}

// ------------------------------------------------------------------
// Keyboard builders
// ------------------------------------------------------------------

/**
 * The three-card Animation Studio entry keyboard.
 */
function animationStudioEntryKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🎨 Choose Motion',  callback_data: 'anim:choose_motion' },
                { text: '▶️ Preview Loop',   callback_data: 'anim:preview_loop' },
                { text: '📦 Export Pack',    callback_data: 'anim:export_pack' },
            ],
            [
                { text: '« Back to Magic Center',  callback_data: 'mc:menu' },
            ],
        ],
    };
}

/**
 * Preset selection keyboard.
 */
function presetSelectionKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: `${PRESETS.pulse.emoji} Pulse — ${PRESETS.pulse.tagline}`,       callback_data: 'anim:preset:pulse' },
            ],
            [
                { text: `${PRESETS.bounce.emoji} Bounce — ${PRESETS.bounce.tagline}`,    callback_data: 'anim:preset:bounce' },
            ],
            [
                { text: `${PRESETS.glitch.emoji} Glitch — ${PRESETS.glitch.tagline}`,    callback_data: 'anim:preset:glitch' },
            ],
            [
                { text: `${PRESETS.sparkle.emoji} Sparkle — ${PRESETS.sparkle.tagline}`, callback_data: 'anim:preset:sparkle' },
            ],
            [
                { text: '« Back',            callback_data: 'anim:back_to_studio' },
            ],
        ],
    };
}

/**
 * Export format selection keyboard.
 * @param {string} preset – currently selected preset key
 */
function exportKeyboard(preset) {
    const presetLabel = PRESETS[preset] ? PRESETS[preset].label : 'selected';
    return {
        inline_keyboard: [
            [
                { text: `${EXPORT_FORMATS.tgs.emoji} ${EXPORT_FORMATS.tgs.label}`,   callback_data: `anim:export:tgs` },
                { text: `${EXPORT_FORMATS.webm.emoji} ${EXPORT_FORMATS.webm.label}`, callback_data: `anim:export:webm` },
            ],
            [
                { text: `${EXPORT_FORMATS.gif.emoji} ${EXPORT_FORMATS.gif.label}`,   callback_data: `anim:export:gif` },
                { text: `${EXPORT_FORMATS.webp.emoji} ${EXPORT_FORMATS.webp.label}`, callback_data: `anim:export:webp` },
            ],
            [
                { text: `« Change Motion`,   callback_data: 'anim:choose_motion' },
            ],
        ],
    };
}

// ------------------------------------------------------------------
// Message builders
// ------------------------------------------------------------------

function studioIntroText() {
    return (
        `🎬 *Animation Studio*\n\n` +
        `Turn static stickers into living reactions with curated motion presets, ` +
        `fast previews, and export-ready formats.\n\n` +
        `*Choose a step to get started:*\n\n` +
        `🎨 *Choose Motion* — Select a motion style for your sticker\n` +
        `▶️ *Preview Loop* — Preview your animation before export\n` +
        `📦 *Export Pack* — Generate loop-ready assets for chat platforms`
    );
}

function chooseMotionText() {
    return (
        `🎨 *Choose a motion style for your sticker*\n\n` +
        `Each preset is designed to feel native to chat — ` +
        `tight, expressive, and loop-ready.\n\n` +
        `Select a motion style below:`
    );
}

function previewLoopText(preset) {
    if (!preset) {
        return (
            `▶️ *Preview your animation before export*\n\n` +
            `You haven't chosen a motion style yet.\n\n` +
            `Go to *Choose Motion* first, then return here to preview your loop.`
        );
    }
    const p = PRESETS[preset];
    return (
        `▶️ *Preview Loop — ${p.emoji} ${p.label}*\n\n` +
        `Motion style: *${p.label}* (${p.tagline})\n\n` +
        `Send a sticker or image to preview it with the *${p.label}* effect applied.\n` +
        `The loop will play at standard Telegram animation speed.`
    );
}

function exportPackText(preset) {
    if (!preset) {
        return (
            `📦 *Generate loop-ready assets for chat platforms*\n\n` +
            `You haven't chosen a motion style yet.\n\n` +
            `Go to *Choose Motion* first, then return here to export your pack.`
        );
    }
    const p = PRESETS[preset];
    return (
        `📦 *Export Pack — ${p.emoji} ${p.label}*\n\n` +
        `Motion style: *${p.label}* (${p.tagline})\n\n` +
        `Select your export format below:\n\n` +
        `📱 *Telegram (.tgs)* — Native animated sticker\n` +
        `🎬 *WebM* — Web-compatible loop\n` +
        `🖼 *GIF* — Universal animated image\n` +
        `🌐 *WebP* — Lightweight lossless loop`
    );
}

// ------------------------------------------------------------------
// Entry point: show Animation Studio
// ------------------------------------------------------------------

/**
 * Send (or edit) the Animation Studio hub message.
 */
async function sendAnimationStudio(bot, chatId, messageId) {
    const opts = {
        parse_mode: 'Markdown',
        reply_markup: animationStudioEntryKeyboard(),
    };

    if (messageId) {
        return bot.editMessageText(studioIntroText(), {
            chat_id: chatId,
            message_id: messageId,
            ...opts,
        });
    }
    return bot.sendMessage(chatId, studioIntroText(), opts);
}

// ------------------------------------------------------------------
// Callback handler
// ------------------------------------------------------------------

/**
 * Handle all Animation Studio callback queries (anim:*).
 */
async function handleAnimationCallback(bot, query) {
    const chatId  = query.message.chat.id;
    const msgId   = query.message.message_id;
    const userId  = String(query.from.id);
    const session = _getSession(userId);
    const action  = query.data; // e.g. 'anim:choose_motion'

    await bot.answerCallbackQuery(query.id);

    // anim:preset:<key>
    if (action.startsWith('anim:preset:')) {
        const presetKey = action.split(':')[2];
        if (!PRESETS[presetKey]) {
            await bot.sendMessage(chatId, `⚠️ Unknown motion preset.`);
            return;
        }
        session.preset = presetKey;
        const p = PRESETS[presetKey];
        await bot.editMessageText(
            `${p.emoji} *${p.label} selected* — ${p.tagline}\n\n` +
            `Your motion style is locked in. Use *Preview Loop* to see it in action, ` +
            `or *Export Pack* to generate your assets.`,
            {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: animationStudioEntryKeyboard(),
            }
        );
        return;
    }

    // anim:export:<format>
    if (action.startsWith('anim:export:')) {
        const format = action.split(':')[2];
        const fmt = EXPORT_FORMATS[format];
        if (!fmt) {
            await bot.sendMessage(chatId, `⚠️ Unknown export format.`);
            return;
        }
        const preset  = session.preset;
        const presetLabel = preset ? PRESETS[preset].label : 'None';
        await bot.editMessageText(
            `📦 *Export ready* — ${fmt.emoji} ${fmt.label}\n\n` +
            `Motion style: *${presetLabel}*\n\n` +
            `Send a sticker or image and I'll generate a loop-ready *${fmt.label}* ` +
            `file with the *${presetLabel}* effect applied.`,
            {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '« Back to Studio', callback_data: 'anim:back_to_studio' }],
                    ],
                },
            }
        );
        return;
    }

    switch (action) {
        case 'anim:choose_motion':
            await bot.editMessageText(chooseMotionText(), {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: presetSelectionKeyboard(),
            });
            break;

        case 'anim:preview_loop':
            await bot.editMessageText(previewLoopText(session.preset), {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: session.preset
                    ? {
                        inline_keyboard: [
                            [{ text: '📦 Export Pack',    callback_data: 'anim:export_pack' }],
                            [{ text: '« Change Motion',   callback_data: 'anim:choose_motion' }],
                        ],
                    }
                    : {
                        inline_keyboard: [
                            [{ text: '🎨 Choose Motion first', callback_data: 'anim:choose_motion' }],
                            [{ text: '« Back to Studio',       callback_data: 'anim:back_to_studio' }],
                        ],
                    },
            });
            break;

        case 'anim:export_pack':
            await bot.editMessageText(exportPackText(session.preset), {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: session.preset
                    ? exportKeyboard(session.preset)
                    : {
                        inline_keyboard: [
                            [{ text: '🎨 Choose Motion first', callback_data: 'anim:choose_motion' }],
                            [{ text: '« Back to Studio',       callback_data: 'anim:back_to_studio' }],
                        ],
                    },
            });
            break;

        case 'anim:back_to_studio':
            await bot.editMessageText(studioIntroText(), {
                chat_id: chatId,
                message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: animationStudioEntryKeyboard(),
            });
            break;

        default:
            break;
    }
}

module.exports = {
    PRESETS,
    EXPORT_FORMATS,
    sendAnimationStudio,
    handleAnimationCallback,
};
