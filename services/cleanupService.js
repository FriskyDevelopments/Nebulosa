// Stix Magic – draft cleanup service
'use strict';

const { storage, DRAFT_STATUS } = require('../models/storage');
const { PLANS } = require('../config/limits');

/**
 * Expire drafts whose expiresAt timestamp has passed and are still in
 * DRAFT or SAVED status.
 *
 * Returns the number of drafts expired.
 */
function expireStaleDrafts() {
    const now = new Date();
    let count = 0;

    for (const userId of storage.allUsers()) {
        const pending = storage.listDrafts(userId, [
            DRAFT_STATUS.DRAFT,
            DRAFT_STATUS.SAVED,
        ]);

        for (const draft of pending) {
            if (draft.expiresAt && draft.expiresAt <= now) {
                storage.updateDraft(userId, draft.id, {
                    status: DRAFT_STATUS.EXPIRED,
                });
                count++;
            }
        }
    }

    return count;
}

/**
 * Permanently delete REJECTED (trashed) drafts whose trash retention period
 * has elapsed.
 *
 * Returns the number of drafts deleted.
 */
function purgeExpiredTrash() {
    const now = new Date();
    let count = 0;

    for (const userId of storage.allUsers()) {
        const user = storage.getUser(userId);
        const planCfg = PLANS[user.plan] || PLANS.free;
        const trashExpiryMs = planCfg.trashExpiryHours * 60 * 60 * 1000;

        const rejected = storage.listDrafts(userId, [
            DRAFT_STATUS.REJECTED,
            DRAFT_STATUS.EXPIRED,
        ]);

        for (const draft of rejected) {
            const age = now - draft.updatedAt;
            if (age >= trashExpiryMs) {
                storage.deleteDraft(userId, draft.id);
                count++;
            }
        }
    }

    return count;
}

/**
 * Run a full cleanup cycle: expire stale drafts then purge old trash.
 *
 * @returns {{ expired: number, purged: number }}
 */
function runCleanup() {
    const expired = expireStaleDrafts();
    const purged = purgeExpiredTrash();
    return { expired, purged };
}

module.exports = { runCleanup, expireStaleDrafts, purgeExpiredTrash };
