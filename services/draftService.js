// Stix Magic – draft lifecycle service
'use strict';

const { storage, DRAFT_STATUS } = require('../models/storage');
const { PLANS } = require('../config/limits');

/**
 * Create a new draft for a user after a sticker has been processed.
 *
 * @param {string|number} userId
 * @param {object} opts
 * @param {string}  opts.fileId           – Telegram file_id of the processed sticker
 * @param {string}  opts.fileUniqueId     – Telegram file_unique_id
 * @param {number}  [opts.sourceMessageId] – Original message id that triggered creation
 * @param {number}  [opts.chatId]          – Chat the draft belongs to
 * @param {number}  [opts.reviewMessageId] – Message id of the review card
 * @returns {object} The newly created draft record
 */
function createDraft(userId, opts) {
    const plan = storage.getUser(userId).plan;
    const planCfg = PLANS[plan] || PLANS.free;
    const expiresAt = new Date(
        Date.now() + planCfg.draftExpiryHours * 60 * 60 * 1000
    );

    return storage.createDraft(userId, { ...opts, expiresAt });
}

/**
 * Approve a draft – mark it as approved (ready to be published to a pack).
 */
function approveDraft(userId, draftId) {
    return storage.updateDraft(userId, draftId, { status: DRAFT_STATUS.APPROVED });
}

/**
 * Retry a draft – create a new draft derived from the same source, and mark
 * the old one as rejected.
 */
function retryDraft(userId, draftId) {
    const original = storage.getDraft(userId, draftId);
    if (!original) return null;

    // Mark the old draft as rejected so it doesn't count against the vault
    storage.updateDraft(userId, draftId, { status: DRAFT_STATUS.REJECTED });

    // Return the original so the caller can re-trigger Magic Cut
    return original;
}

/**
 * Trash a draft – mark as rejected.
 */
function trashDraft(userId, draftId) {
    return storage.updateDraft(userId, draftId, { status: DRAFT_STATUS.REJECTED });
}

/**
 * Save a draft for later – keeps it in the vault without publishing.
 */
function saveDraftForLater(userId, draftId) {
    return storage.updateDraft(userId, draftId, { status: DRAFT_STATUS.SAVED });
}

/**
 * Attach the Telegram review message id to an existing draft.
 */
function setReviewMessageId(userId, draftId, reviewMessageId) {
    return storage.updateDraft(userId, draftId, { reviewMessageId });
}

/**
 * List drafts for a user, optionally filtered by status.
 */
function listDrafts(userId, statusFilter) {
    return storage.listDrafts(userId, statusFilter);
}

/**
 * Get a single draft.
 */
function getDraft(userId, draftId) {
    return storage.getDraft(userId, draftId);
}

module.exports = {
    createDraft,
    approveDraft,
    retryDraft,
    trashDraft,
    saveDraftForLater,
    setReviewMessageId,
    listDrafts,
    getDraft,
    DRAFT_STATUS,
};
