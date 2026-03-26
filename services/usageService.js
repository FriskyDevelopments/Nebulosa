// Stix Magic – usage tracking & plan enforcement service
'use strict';

const { PLANS } = require('../config/limits');
const { storage } = require('../models/storage');

/**
 * Returns true when the user's usage period has lapsed and resets the counter.
 */
function _maybeResetPeriod(userId) {
    const { plan, usageResetAt } = storage.getUsage(userId);
    const planCfg = PLANS[plan] || PLANS.free;
    const periodMs = planCfg.periodDays * 24 * 60 * 60 * 1000;
    const now = new Date();

    if (now.getTime() - usageResetAt.getTime() > periodMs) {
        storage.resetUsage(userId);
        return true;
    }
    return false;
}

/**
 * Check whether a user is allowed to create a new sticker.
 *
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
function canCreate(userId) {
    _maybeResetPeriod(userId);

    const { plan, creationsUsed } = storage.getUsage(userId);
    const planCfg = PLANS[plan] || PLANS.free;

    if (creationsUsed >= planCfg.creationsPerPeriod) {
        return {
            allowed: false,
            reason: `limit_creations`,
            message:
                `✨ You've reached your ${planCfg.label} plan limit of ` +
                `${planCfg.creationsPerPeriod} creation(s) per ` +
                `${planCfg.periodDays === 1 ? 'day' : 'month'}.\n\n` +
                `Upgrade your plan at stixmagic.com to create more stickers!`,
        };
    }

    const activeDrafts = storage.activeDraftCount(userId);
    if (activeDrafts >= planCfg.maxDrafts) {
        return {
            allowed: false,
            reason: `limit_drafts`,
            message:
                `📦 Your Draft Vault is full (${planCfg.maxDrafts} drafts).\n\n` +
                `Please review and act on existing drafts before creating new ones, ` +
                `or upgrade your plan at stixmagic.com.`,
        };
    }

    return { allowed: true };
}

/**
 * Record a creation against the user's quota.
 */
function recordCreation(userId) {
    _maybeResetPeriod(userId);
    storage.incrementUsage(userId);
}

/**
 * Return a human-readable summary of the user's current usage.
 */
function usageSummary(userId) {
    _maybeResetPeriod(userId);

    const { plan, creationsUsed, usageResetAt } = storage.getUsage(userId);
    const planCfg = PLANS[plan] || PLANS.free;
    const resetDate = new Date(
        usageResetAt.getTime() + planCfg.periodDays * 24 * 60 * 60 * 1000
    );
    const activeDrafts = storage.activeDraftCount(userId);
    const maxDrafts = planCfg.maxDrafts === Infinity ? '∞' : planCfg.maxDrafts;

    return (
        `📊 *Your Usage – ${planCfg.label} Plan*\n` +
        `• Creations: ${creationsUsed} / ${planCfg.creationsPerPeriod}\n` +
        `• Drafts: ${activeDrafts} / ${maxDrafts}\n` +
        `• Resets: ${resetDate.toDateString()}`
    );
}

module.exports = { canCreate, recordCreation, usageSummary };
