// Stix Magic – in-memory storage layer
// Mirrors the MemStorage pattern already used in server/storage.ts but
// is kept intentionally simple for Phase 1.
'use strict';

/**
 * Draft statuses
 */
const DRAFT_STATUS = {
    DRAFT: 'draft',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SAVED: 'saved',
    PUBLISHED: 'published',
    EXPIRED: 'expired',
};

/**
 * Central in-memory store.
 *
 * In a production deployment, replace this module with one backed by a real
 * database (e.g. the existing Drizzle/PostgreSQL schema in shared/schema.ts).
 */
class MemStorage {
    constructor() {
        // Map<userId, { plan, usageResetAt, creationsUsed, drafts: Map<draftId, Draft> }>
        this._users = new Map();

        this._nextDraftId = 1;
    }

    // ------------------------------------------------------------------
    // User helpers
    // ------------------------------------------------------------------

    _ensureUser(userId) {
        if (!this._users.has(userId)) {
            this._users.set(userId, {
                plan: 'free',
                creationsUsed: 0,
                usageResetAt: new Date(),
                drafts: new Map(),
            });
        }
        return this._users.get(userId);
    }

    getUser(userId) {
        return this._ensureUser(userId);
    }

    setUserPlan(userId, plan) {
        const user = this._ensureUser(userId);
        user.plan = plan;
        user.creationsUsed = 0;
        user.usageResetAt = new Date();
    }

    // ------------------------------------------------------------------
    // Usage helpers
    // ------------------------------------------------------------------

    getUsage(userId) {
        const user = this._ensureUser(userId);
        return {
            plan: user.plan,
            creationsUsed: user.creationsUsed,
            usageResetAt: user.usageResetAt,
        };
    }

    incrementUsage(userId) {
        const user = this._ensureUser(userId);
        user.creationsUsed += 1;
    }

    resetUsage(userId) {
        const user = this._ensureUser(userId);
        user.creationsUsed = 0;
        user.usageResetAt = new Date();
    }

    // ------------------------------------------------------------------
    // Draft helpers
    // ------------------------------------------------------------------

    createDraft(userId, data) {
        const user = this._ensureUser(userId);
        const id = String(this._nextDraftId++);
        const now = new Date();

        const draft = {
            id,
            userId,
            status: DRAFT_STATUS.DRAFT,
            fileId: data.fileId || null,
            fileUniqueId: data.fileUniqueId || null,
            sourceMessageId: data.sourceMessageId || null,
            retryCount: 0,
            createdAt: now,
            updatedAt: now,
            expiresAt: data.expiresAt || null,
            // Telegram message id of the draft review message (used to edit it)
            reviewMessageId: data.reviewMessageId || null,
            chatId: data.chatId || null,
        };

        user.drafts.set(id, draft);
        return draft;
    }

    getDraft(userId, draftId) {
        const user = this._ensureUser(userId);
        return user.drafts.get(draftId) || null;
    }

    updateDraft(userId, draftId, updates) {
        const user = this._ensureUser(userId);
        const draft = user.drafts.get(draftId);
        if (!draft) return null;
        Object.assign(draft, updates, { updatedAt: new Date() });
        return draft;
    }

    deleteDraft(userId, draftId) {
        const user = this._ensureUser(userId);
        return user.drafts.delete(draftId);
    }

    listDrafts(userId, statusFilter) {
        const user = this._ensureUser(userId);
        const all = Array.from(user.drafts.values());
        if (!statusFilter) return all;
        if (Array.isArray(statusFilter)) {
            return all.filter(d => statusFilter.includes(d.status));
        }
        return all.filter(d => d.status === statusFilter);
    }

    activeDraftCount(userId) {
        return this.listDrafts(userId, [
            DRAFT_STATUS.DRAFT,
            DRAFT_STATUS.SAVED,
        ]).length;
    }

    // Iterate over all users – used by the cleanup worker
    allUsers() {
        return Array.from(this._users.keys());
    }
}

// Export a singleton instance
const storage = new MemStorage();

module.exports = { storage, DRAFT_STATUS };
